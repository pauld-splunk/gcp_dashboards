define([
    'underscore',
    'jquery',
    'backbone',
    'splunkjs/mvc',
    'views/Base',
    'app/views/topology/TopologyConfig',
    'app/collections/Recommendations',
    'app/collections/RecommActions',
    'app/models/RecommAction',
    'splunkjs/ready!',
    'splunkjs/mvc/simplexml/ready!'
], (_, $, Backbone, mvc, BaseView, TopologyConfig, RecommendationsCollection, RecommActionsCollection, RecommAction) => {
    'use strict';

    const FEEDBACK_IGNORE = 'ignore';
    const FEEDBACK_UNREAD = 'unread';
    const FEEDBACK_READ = 'read';
    const FEEDBACK_ACTION = 'action';

    const FEEDBACK_SORT = {
        'unread': 3,
        'read': 2,
        'action': 1,
        'ignore': -1
    };

    let Recommendation = BaseView.extend({

        events: {
            'click #recomm-header': 'onClick',
            'click .recomm-item': 'onItemClick',
            'click #recomm-ignore-all': 'onIgnoreAll',
            'mouseover .recomm-item': 'onItemMouseover',
            'mouseout .recomm-item': 'onItemMouseout',
            'keydown #recomm-autocomplete': 'onAutocomplete',
            'autocompleteselect #recomm-autocomplete': 'onAutocompleteSelect',
        },

        initialize(params) {
            BaseView.prototype.initialize.apply(this, arguments);

            this.model = new Backbone.Model();
            this.model.viewModel = params.viewModel;
            this.autocompleteData = [];
            
            // RecommendationsCollection is a Read-Only collection
            this.recommendations = new RecommendationsCollection();

            // RecommActionsCollection is a Write-Only collection
            this.recommActions = new RecommActionsCollection();

            let recommDeffered = this.recommendations.fetch({data: {count: -1}});
            let recommActionDeffered = this.recommActions.fetch({data: {count: -1}});

            $.when(recommDeffered, recommActionDeffered).then(() => {
                this.updateRecommActions();                
            }, (result) => {
                // Scientific computing App does not exist
                if (result.responseText.indexOf('ML lib does not exist') >= 0) {
                    this.model.viewModel.set('recommendationDependencyError', true);
                    this.model.viewModel.set('hasMLLib', false);
                }

                // ML is not supported in Splunk Light or Splunk Light-Free
                else if (result.responseText.indexOf('Not supported in Splunk Light') >= 0) {
                    $('.recommZone').hide();
                }
            });

            this.listenTo(this.recommActions, 'add', this.updateRecommActions);
            this.listenTo(this.model.viewModel, 'change:viewUpdated', this.renderItems);
            this.listenTo(this.model.viewModel, 'change:selected', this.renderItems);
            this.listenTo(this.model.viewModel, 'change:takeAction', (model, value) => {
                this._updateRecommAction(value, FEEDBACK_ACTION);
                this.model.viewModel.set('takeAction', null, {
                    silent: true
                });
            });
            this.listenTo(this.model.viewModel, 'change:ignore', (model, value) => {
                this._updateRecommAction(value, FEEDBACK_IGNORE);
                this.model.viewModel.set('selected', null);
                this.model.viewModel.set('ignore', null, {
                    silent: true
                });
            });

            this.listenTo(this.model.viewModel, 'change:recommendation', (model, value) => {
                if (value) {
                    this.$el.show();
                } else {
                    this.$el.hide();
                }
            });
        },

        updateRecommActions() {
            this.recommActions.forEach(model => {
                let content = model.entry.content;
                let recommId = content.get('recomm_id');
                let recommItem = this.recommendations.findWhere({'_key': recommId});
                if (recommItem) {
                    recommItem.set('feedback', content.get('feedback'));
                }
            });

            this.renderItems();
        },

        // (re)Render all recommendation items
        // @TODO currently re-render will clean everything and append the whole list, it is better to only apply change to updated items
        renderItems() {
            let $recommList = $('#recomm-list');
            $recommList.empty();

            let filterTypes = this.model.viewModel.get('filterTypes');
            let selected = this.model.viewModel.get('selected');
            let id = selected ? selected.id : null;
            this.autocompleteData = [];

            let validItems = this.recommendations.filter(model => {
                let id = model.get('resource_id');
                let type = model.get('resource_type');
                if (!filterTypes[type]) {
                    return false;
                }

                return id in TopologyConfig.nodeData;
            }).sort((a, b) => {
                let orderA = FEEDBACK_SORT[(a.get('feedback') || FEEDBACK_UNREAD)];
                let orderB = FEEDBACK_SORT[(b.get('feedback') || FEEDBACK_UNREAD)];

                if (orderA > orderB) {
                    return -1;
                } else if (orderA < orderB) {
                    return 1;
                } else {
                    let dimensionA = a.get('ml_dimension');
                    let dimensionB = b.get('ml_dimension');
                    if (dimensionA !== dimensionB) {
                        return dimensionA.localeCompare(dimensionB);
                    }

                    let actionA = a.get('ml_action');
                    let actionB = b.get('ml_action');

                    if (actionA !== actionB) {
                        return actionA.localeCompare(actionB);
                    } else {
                        let priorityA = a.get('ml_priority');
                        let priorityB = b.get('ml_priority');

                        if (priorityA > priorityB) {
                            return -1;
                        } else if (priorityA < priorityB) {
                            return 1;
                        } else {
                            return 0;
                        }
                    }
                }
            });

            let recommsHtml = validItems
                .map(model => {
                    let key = model.get('_key');
                    let resourceId = model.get('resource_id');
                    let feedback = model.get('feedback') || FEEDBACK_UNREAD;
                    let action = model.get('ml_action');
                    let active = (id === resourceId ? 'active' : '');

                    this.autocompleteData.push({
                        label: `${action} ${resourceId}`,
                        value: resourceId
                    });

                    return `<div data-id=${key} data-resource="${resourceId}" class="recomm-item ${feedback} ${active}"><span class="recomm-item-action">${action}</span> ${resourceId}</div>`;
                })
                .join('');

            let count = validItems.filter(model => !model.get('feedback')).length;

            $recommList.append(recommsHtml);
            $('#recomm-autocomplete').autocomplete('destroy');
            $('#recomm-autocomplete').autocomplete({source: this.autocompleteData});

            // if the active item is out of screen, scroll down the list.
            let $activeItem = this.$el.find('.recomm-item.active');
            if ($activeItem.length > 0) {
                let topDiff = $activeItem.offset().top - $recommList.offset().top ;
                if (topDiff - $recommList.height() - 30 > 0) {
                    $recommList.scrollTop(topDiff);
                }
            }

            this.model.viewModel.set('recommendationCount', count ? count : 0);
        },

        render() {
            $('#recomm-autocomplete').autocomplete('destroy');
            this.$el.html(_.template(this.template));
            $('#recomm-autocomplete').autocomplete({source: this.autocompleteData});
            return this;
        },

        onItemClick(event) {
            let $item = $(event.currentTarget);
            let id = $item.data('id');
            let resourceId = $item.data('resource');
            let actionCollections = this.recommActions;
            if ($item.hasClass('unread')) {
                this._updateRecommAction(id, FEEDBACK_READ);
            }

            let selected = this.model.viewModel.get('selected');
            if (!selected || selected.id !== resourceId) {
                let recomm = this.recommendations.findWhere({'_key': id});
                this._setRegion(recomm);
                this.model.viewModel.set('selected', {
                    id: resourceId,
                    recommendation: recomm
                });
            } else {
                this.model.viewModel.set('selected', null);
            }
        },

        onIgnoreAll() {
            this.recommendations.forEach(recomm => {
                this._updateRecommAction(recomm.get('_key'), FEEDBACK_IGNORE);
            });
        },

        onItemMouseover(event) {
            let selected = this.model.viewModel.get('selected');
            if (selected) {
                return;
            }
            let $item = $(event.currentTarget);
            let resourceId = $item.data('resource');
            this.model.viewModel.set('hoverResource', {
                id: resourceId,
                focus: true
            });
        },

        onItemMouseout() {
            let selected = this.model.viewModel.get('selected');
            if (selected) {
                return;
            }

            this.model.viewModel.set('hoverResource', null);
        },

        onAutocomplete(event) {
            if (event.keyCode === 13) {
                let search = $(event.target).val();
                this._autocompleteCallback(search);
            }
        },

        onAutocompleteSelect(event, ui) {
            let search = ui.item.value;
            this._autocompleteCallback(search);
        },

        _autocompleteCallback(search) {
            let $item = $('#recomm-list').find(`[data-resource="${search}"]`);
            if ($item.length > 0) {
                $item.click();
            }
        },

        // This is actually update or create
        // If there is no corresponding Remmendation, then create one.
        _updateRecommAction(recommId, feedback) {
            let self = this;
            let action = _.find(this.recommActions.models, (model) => model.entry.content.get('recomm_id') === recommId);

            if (action) {
                if (action.entry.content.get('feedback') === feedback) {
                    return;
                }
                action.entry.content.set('feedback', feedback);
                action.entry.content.set('timestamp', Date.now());
                action.save({}, {
                    success: function() {
                        self.updateRecommActions();
                    },
                    error: function() {
                        self.updateRecommActions();
                        console.log('something wrong');
                    }
                });
            } else {
                let recommAction = new RecommAction();
                recommAction.entry.content.set('name', recommId);
                recommAction.entry.content.set('recomm_id', recommId);
                recommAction.entry.content.set('feedback', feedback);
                recommAction.entry.content.set('timestamp', Date.now());

                recommAction.save({}, {
                    success: function(model, response) {
                        recommAction.id = model.get('id');

                        // unset name to make sure another feedback will be 'update' instead of 'create'
                        recommAction.entry.content.unset('name');
                        self.recommActions.add(recommAction, {merge: true});
                    },
                    error: function() {
                        self.recommActions.add(recommAction, {merge: true});
                        console.log('something wrong');
                    }
                });
            }
        },

        // region is needed when showing the command.
        _setRegion(recomm) {
            let id = recomm.get('resource_id');
            let detailed = TopologyConfig.nodeData[id];
            if (!detailed) {
                return;
            }

            recomm.set('region', detailed.resourceRegion);
        },

        displayMessage() {
            return this;
        },

        template: '\
            <div id="recomm-header"> \
                <h3>Insights</h3> \
                <a id="recomm-ignore-all" href="#" class="btn">Ignore all</a> \
            </div> \
            <div> \
                <input id="recomm-autocomplete" type="text" placeholder="Search" /> \
            </div> \
            <div id="recomm-list"> \
            </div> \
        '
    });

    return Recommendation;
});