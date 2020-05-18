define([
    'jquery',
    'underscore',
    'views/Base',
    'splunkjs/mvc',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/simpleform/formutils',
    'app/views/anomaly_detection/Config',
    'select2/select2'
], function ($, _, BaseView, mvc, SearchManager, FormUtils, SystemConfig) {
    // transfer tags to filter spl
    mvc.setFilter('tag2spl', function (tags) {
        var spls = ['| eval match_count = 0'];
        var tags = _.filter(tags.split(','), function (value) {
            return !_.isEmpty(value)
        });
        tags.forEach(function (tag) {
            spls.push('match_count = match_count + if(match(' + SystemConfig.JOB_TAGS + ', "^.*' + tag + '.*$"), 1, 0)');
        });
        var spl = spls.join(',') + '| where match_count=' + tags.length;
        return spl;
    });

    var tokens = mvc.Components.getInstance('default');

    // "tags" input in anomaly overview page.
    // It will parse tags from anomalyconfigs.conf and is different from "tags" input in other page, not key-value pair.
    return BaseView.extend({
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.tags = [];
            this.tagsSM = new SearchManager({
                id: 'tagSearch',
                preview: false,
                search: '| rest servicesNS/nobody/splunk_app_aws/configs/conf-anomalyconfigs fillcontents=1 splunk_sever=local | search '
                + SystemConfig.JOB_PRIORITY + '=$priority$ ' + SystemConfig.JOB_SCHEDULE + '=$schedule$'
            }, {tokens: true});
            this.tagsSM.on('search:done', (function () {
                var resultModel = this.tagsSM.data('results', {output_mode: 'json'});
                resultModel.once('data', (function () {
                    var results = resultModel.data().results;
                    this.tags = this._formatTags(results);
                    this.render();
                }).bind(this));
            }).bind(this));
        },
        events: {
            'change': 'onChange'
        },
        render: function () {
            this.$el.select2({
                tags: this.tags,
                tokenSeparators: [','],
                maximumInputLength: 128
            });
        },
        _formatTags: function (results) {
            var tags = [];
            results.forEach(function (value) {
                if (SystemConfig.JOB_TAGS in value && !_.isEmpty(value[SystemConfig.JOB_TAGS])) {
                    tags = _.union(tags, value[SystemConfig.JOB_TAGS].split(','));
                }
            });
            return tags.sort();
        },
        startSearch: function () {
            this.tagsSM.startSearch();
        },
        onChange: function () {
            var selectedTags = this.$el.select2('data').map(function (tag) {
                return tag.text;
            });
            tokens.set('tags', selectedTags.join(','));
            FormUtils.submitForm({replaceState: true});
        }
    });
});