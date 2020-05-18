// A View for Tag Filter input.
define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/simpleform/formutils',
    'views/Base',
    'app/utils/SourcetypeUtil',
    'app/utils/SearchUtil',
    'app/views/dashboard/MacroHelper',
    'select2/select2'
], function(
    $,
    _,
    mvc,
    FormUtils,
    BaseView,
    SourcetypeUtil,
    SearchUtil,
    MacroHelper
) {
    'use strict';

    const STAGE_KEY = 'STAGE_KEY';
    const STAGE_OPERATOR = 'STAGE_OPERATOR';
    const STAGE_VALUE = 'STAGE_VALUE';
    const STAGE_RELATION = 'STAGE_RELATION';


    const LOOKUP_MAP = {
        Config: '| inputlookup tags_config append=t',
        Description: '| inputlookup tags_description append=t',
        Billing: '| `aws-billing-datamodel-tags`'
    };

    // The prefix is used in TokenHelper.
    const TAG_PREFIX = '$PREFIX$';

    const REGEX_LATEST = /(.*?)!?=(.*?)\s+(AND|and|OR|or)\s+/g;
    const REGEX_TERM = /(.*?)\s+(AND|and|OR|or)\s+/g;
    const REGEX_KV = /(['"])?(.*?)\1(!?=)(.*)/;
    const REGEX_VALUE = /(["']?)([^\1]*)(\1)(.*)/;

    let _tokenModel = mvc.Components.getInstance('default');
    let _inputs = [];
    let _spl = null;

    function _createToken(key, stage) {
        return {
            id: key,
            text: key,
            stage: stage
        };
    }

    const OPS = ['=', '!='].map((op) => _createToken(op, STAGE_OPERATOR));
    const RELATIONS = ['AND', 'OR'].map((rel) => _createToken(rel, STAGE_RELATION));

    let TagInputView = BaseView.extend({

        events: {
            'keydown input': 'onKeydown',
            'input input': 'onInput',
            'focus input': 'onFocus',
            'mouseleave .tag-autocomplete': '_hideAutocomplete',
            'blur input': '_hideAutocomplete',
            'click ul > li': '_onSelecting'
        },

        _loadingTemplate: _.template(
            `<li class="tag-loading">
                <span class="loading-img"></span>
                <span style="font-weight: bold;">Loading</span>
            </li>`
        ),

        _onSelecting(e) {
            let status = this._currentStatus;
            let stage = $(e.currentTarget).data('stage');
            let search = this.$('input').val();
            switch (stage) {
                case STAGE_KEY:
                    search = search.replace(new RegExp(status.key + '$'), $(e.currentTarget).text());
                break;
                case STAGE_OPERATOR:
                    search += $(e.currentTarget).text();
                break;
                case STAGE_VALUE:
                    let pos = search.lastIndexOf('=');
                    search = search.substring(0, pos + 1);
                    search += `"${$(e.currentTarget).text()}"`;
                break;
                case STAGE_RELATION:
                    search = search.replace(new RegExp(status.rel + '$'), ' ' + $(e.currentTarget).text() + ' ');
                break;
            }

            this.$('input')
                .val(search)
                .focus();

            this.onInput();

            // This has to been triggered after focus event.
            if (stage === STAGE_KEY) {
                this.$('.tag-autocomplete').hide();
            }
        },

        onKeydown(e) {
            if (e.keyCode === 38 || e.keyCode === 40) {
                const listHeight = this.$('.tag-autocomplete').height();
                const scrollTop = this.$('.tag-autocomplete').scrollTop();

                if (this.$('.tag-autocomplete > ul > li').length === 0) {
                    return;
                }

                let $currentActive = this.$('.tag-autocomplete > ul > li.active');
                let $nextActive = null;

                if (e.keyCode === 40) {
                    if ($currentActive.length === 0) {
                        $nextActive = this.$('.tag-autocomplete > ul > li').first();
                    } else {
                        $nextActive = $currentActive.next();
                    }
                } else {
                    if ($currentActive.length === 0) {
                        $nextActive = this.$('.tag-autocomplete > ul > li').last();
                    } else {
                        $nextActive = $currentActive.prev();
                    }
                }

                $currentActive.removeClass('active');

                if ($nextActive.length === 0) {
                    return;
                }

                $nextActive.addClass('active');

                let posTop = $nextActive.position().top;
                let liHeight = $nextActive.height();
                let diff = posTop + liHeight - listHeight;

                if (posTop < 0) {
                    this.$('.tag-autocomplete').scrollTop(scrollTop + posTop);
                } else if (diff > 0) {
                    this.$('.tag-autocomplete').scrollTop(scrollTop + diff + 1);
                }

                e.preventDefault();
            } else if (e.keyCode === 13) {
                let $currentActive = this.$('.tag-autocomplete > ul > li.active');

                if ($currentActive.length === 0 || !this.$('.tag-autocomplete').is(':visible')) {
                    let search = this.$('input').val();
                    let replacedSearch = '';

                    if (search.trim() !== '') {
                        let matches;
                        while ((matches = REGEX_TERM.exec(search)) !== null) {
                            let replacedTerm = this._processTerm(matches[1]);
                            replacedSearch += replacedTerm + ' ' + matches[2] + ' ';
                        }

                        replacedSearch += this._processTerm(search.replace(REGEX_TERM, ''));
                    }

                    _tokenModel.set('tags', replacedSearch);
                    FormUtils.submitForm({replaceState: true});
                } else {
                    $currentActive.trigger('click');
                }
            }
        },

        // Add $prefix$ to key for TokenHelper
        _processTerm(term) {
            let matches = REGEX_KV.exec(term);
            if (matches.length === 5) {
                matches[2] = TAG_PREFIX + matches[2];
                if (!matches[1]) {
                    matches[1] = '';
                }

                return `${matches[1]}${matches[2]}${matches[1]}${matches[3]}${matches[4]}`;
            }

            return '';
        },

        onInput() {
            let latestTerm = this.$('input').val().replace(REGEX_LATEST, '');

            let status = this._detectStatus(latestTerm);

            this._handleStatus(status);
            this._currentStatus = status;
        },

        onFocus() {
            if (!this._cachedKeys) {
                this._fetchKeys(status.key);
            } else {
                this.onInput();
            }
        },

        _hideAutocomplete() {
            _.delay(() => {
                if (!this.$('input').is(':focus')) {
                    this.$('.tag-autocomplete').hide();
                }
            }, 200);
        },

        _handleStatus(status) {
            let results = [];
            switch (status.stage) {
                case STAGE_KEY:
                    if (!this._cachedKeys) {
                        this._fetchKeys(status.key);
                    } else {
                        results = this._filterTokens(this._cachedKeys, status.key);
                        this._showAutoComplete(results);
                    }
                    break;
                case STAGE_OPERATOR:
                    results = OPS;
                    this._showAutoComplete(results);
                    break;
                case STAGE_VALUE:
                    if (this._cachedKey !== status.key) {
                        this._fetchValues(status.key, status.value);
                    } else {
                        results = this._filterTokens(this._cachedValues, status.value);
                        this._showAutoComplete(results);
                    }
                    break;
                case STAGE_RELATION:
                    results = RELATIONS;
                    this._showAutoComplete(results);
                    break;
            }
        },

        _showAutoComplete(items) {
            let html = items.map(item => {
                return `<li data-stage=${item.stage}>${item.text}</li>`;
            }).join('');

            this.$('.tag-autocomplete > ul').html(html);
            this.$('.tag-autocomplete').show();
        },

        _showLoading() {
            this.$('.tag-autocomplete > ul').html(this._loadingTemplate());
            this.$('.tag-autocomplete').show();
        },

        _fetchKeys(key) {
            this._showLoading();

            SearchUtil.search(`${_spl} | stats count by key | fields - count`).then((lookupData) => {
                this._cachedKeys = lookupData.map((data) => _createToken(data.key, STAGE_KEY));
                if (this._cachedKeys.length === 0) {
                    this._cachedKeys = null;
                }

                let results = this._filterTokens(this._cachedKeys, key);
                this._showAutoComplete(results);
            }, function(err) {
                console.log(err);
            });
        },

        _fetchValues(key, value) {
            this._showLoading();

            this._cachedKey = key;
            SearchUtil.search(`${_spl} | search key=CASE(${key}) | dedup value | fields value`).then((lookupData) => {
                this._cachedValues = lookupData.map((data) => _createToken(data.value, STAGE_VALUE));

                let results = this._filterTokens(this._cachedValues, value);
                this._showAutoComplete(results);
            }, function(err) {
                console.log(err);
            });
        },

        _filterTokens(tokens, key) {
            if (!tokens) {
                return [];
            }
            let results = tokens;
            if (key) {
                results = tokens.filter((token) => {
                    return token.text.toUpperCase().indexOf(key.toUpperCase()) > -1 &&
                        token.text !== key;
                });
            }

            return results;
        },

        _detectStatus(term) {
            let status = {
                key: null,
                op: null,
                value: null,
                rel: null,
                stage: null
            };

            if (term.indexOf('!=') > -1) {
                status.op = '!=';
            } else if (term.indexOf('=') > -1) {
                status.op = '=';
            }

            let result = term.split(status.op);
            status.key = result[0];
            if (result.length > 1) {
                let value = result[1];
                let matches = value.match(REGEX_VALUE);
                if (matches && matches.length === 5) {
                    status.value = matches[2];
                    status.rel = matches[4];
                } else {
                    status.value = value;
                }
            }

            status.stage = this._getStage(status);

            return status;
        },

        _getStage(status) {
            if (status.rel) {
                return STAGE_RELATION;
            }

            if (status.value || status.op) {
                return STAGE_VALUE;
            }

            return STAGE_KEY;
        },

        initialize() {
            this._reset();

            this.onInput = _.debounce(this.onInput, 50);
            this.listenTo(MacroHelper, 'change:sourcetype', (sourcetypes) => {
                let inputs = sourcetypes.map(sourcetype => {
                    return SourcetypeUtil.findInputBySourcetype(sourcetype);
                }).filter(item => !!item);

                if (!_.isEqual(inputs, _inputs)) {
                    _inputs = inputs;
                    _spl = this._generateSPL(_tokenModel.get('form.accountId') || '*', inputs);

                    this.$el.find('input')
                        .attr('placeholder', 'key=value AND|OR key2=value2')
                        .prop('disabled', false);
                }
            });

            _tokenModel.on('change:accountId', this._reset.bind(this));
        },

        render() {
            let prevTags = _tokenModel.get('tags');
            if (prevTags) {
                prevTags = `value="${prevTags.replace(/\$PREFIX\$/g, '').replace(/\"/g, "&quot;")}"`;
            } else {
                prevTags = '';
            }

            this.$el.html(`
                <label>Tags</label>
                <input type="text" placeholder="loading..." disabled ${prevTags} />
                <div class="tag-autocomplete"><ul></ul></div>
            `);

            this.$el.show();
        },

        _reset() {
            this._cachedKeys = null;
            this._cachedKey = null;
            this._cachedValues = null;
            this._currentStage = STAGE_KEY;
            this._currentStatus = null;
        },

        // Generate lookup SPL based on `inputs` and `accountId`
        _generateSPL(accountId, inputs) {
            let fullSPL = inputs
                .filter(input => input in LOOKUP_MAP)
                .map(input => {
                    let spl = LOOKUP_MAP[input];

                    if (['Description', 'Config'].indexOf(input) > -1) {
                        spl += accountId === '*' ? '' : ` where aws_account_id=${accountId}`;
                    }

                    return spl;
                })
                .sort((a, b) => {

                    // Make sure `aws-billing-datamodel-tags` is placed at the beginning of the spl.
                    // Otherwise the spl won't work.
                    if (a.indexOf('`aws-billing-datamodel-tags`') > -1) {
                        return -1;
                    } else if (b.indexOf('`aws-billing-datamodel-tags`') > -1) {
                        return 1;
                    }

                    return 0;
                })
                .join(' ');

            return fullSPL;
        }

    });

    return TagInputView;
});