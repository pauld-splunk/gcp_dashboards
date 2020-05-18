define([
    'jquery',
    'underscore',
    'api/SplunkVisualizationBase',
    'app/views/anomaly_detection/utils/DataHelper',
    'app/views/anomaly_detection/views/custom_viz/ChartView',
    'app/views/anomaly_detection/views/custom_viz/ProcessController',
    'splunkjs/mvc',
    'app/views/anomaly_detection/Config'
], function ($,
             _,
             SplunkVisualizationBase,
             DataHelper,
             ChartView,
             MasterDialog,
             mvc,
             SystemConfig) {
    var tokens = {},
        seg = window.location.search.replace(/^\?/, '').split('&'),
        segLen = seg.length;
    for (var i = 0; i < segLen; i++) {
        if (_.isEmpty(seg[i])) {
            continue;
        }
        var segArr = seg[i].split('=');
        tokens[segArr[0]] = segArr[1];
    }
    return SplunkVisualizationBase.extend({
        initialize: function () {
            this.$el = $(this.el);
            this.$el.html('<a id="schedule_job_button" class="btn" style="margin-right:10px; float:right">Schedule job</a><div id="anomaly_chart"></div>');
            this.dataHelper = new DataHelper();
        },

        getInitialDataParams: function () {
            return ({
                outputMode: SplunkVisualizationBase.COLUMN_MAJOR_OUTPUT_MODE,
                count: 1000
            });
        },

        setupView: function () {
            this.chartView = new ChartView({
                el: $('#anomaly_chart')
            }).render();
            this.masterDialog = new MasterDialog();
            this.masterDialog.render().appendTo($('body'));
            $('#schedule_job_button:not(disabled)').click((function () {
                this.masterDialog.fetchJobs();
            }).bind(this));
        },

        formatData: function (data, config) {
            // Empty data check
            if (data.columns.length < 1 || data.columns[0].length < 1) {
                return {};
            }
            // Not finished search
            if (!data.meta.done) {
                return {};
            }
            // Field validation
            try {
                this.dataHelper.isFieldValid(data.fields);
            } catch (err) {
                throw new SplunkVisualizationBase.VisualizationError(err);
            }

            var results = {};
            var mode = SystemConfig.HIGHLIGHT_MODE;
            if (_.isEmpty(tokens.time) || _.isEmpty(tokens.field)) {
                mode = this.dataHelper.getMode(data.fields);
            }

            $('#schedule_job_button').removeClass('disabled');
            if (mode === SystemConfig.HIGHLIGHT_MODE) {
                $('#schedule_job_button').addClass('disabled');
                var time = parseInt(tokens.time) * SystemConfig.MILLI_SEC_IN_SEC;
                results = this.dataHelper.wrapHighlightResults(data.fields, data.columns, config, this.getPropertyNamespaceInfo().propertyNamespace, time, tokens.field);
            } else if (mode === SystemConfig.DETECT_MODE) {
                results = this.dataHelper.wrapDetectResults(data.fields, data.columns, config, this.getPropertyNamespaceInfo().propertyNamespace);
            } else {
                results = this.dataHelper.wrapDisplayResults(data.fields, data.columns, config, this.getPropertyNamespaceInfo().propertyNamespace);
            }
            if (_.isEmpty(results.series)) {
                throw new SplunkVisualizationBase.VisualizationError(
                    'This visualization only supports numbers. Please fill null or check type.'
                );
            }
            results.mode = mode;
            return results;
        },

        updateView: function (data, config) {
            if (_.isEmpty(data)) {
                this.chartView.showLoading();
            } else {
                var namespace = this.getPropertyNamespaceInfo().propertyNamespace;
                this.chartView.hideLoading();
                this.chartView.updateParams(config, namespace);
                this.chartView.updateSeries(data.series, data.start, data.end, data.span);
                var params = {
                    trainNum: data.trainNum,
                    trainUnit: data.trainUnit
                };
                params[SystemConfig.JOB_SEARCH] = this._events.drilldown[0].context.model.config.get('search');
                this.masterDialog.setJobParams(params, data.mode);
            }
        }
    });
});
