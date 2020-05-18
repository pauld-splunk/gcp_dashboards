define([
    'underscore',
    'jquery',
    'views/Base',
    'app/views/anomaly_detection/views/custom_viz/ChartParams',
    'app/views/anomaly_detection/Config',
    'app/views/anomaly_detection/views/custom_viz/HighchartsExtension'
], function (_, $, BaseView, ChartParams, Config, Highcharts) {
    var axisRelatedSelector = '.highcharts-grid, .highcharts-legend, .highcharts-axis, ' +
        '.highcharts-axis-labels.highcharts-yaxis-labels, .highcharts-axis-labels.highcharts-xaxis-labels, ' +
        '.highcharts-series-group';
    return BaseView.extend({
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            ChartParams.chart.renderTo = this.$el.selector.slice(1);
            this.chart = new Highcharts.Chart(ChartParams);
        },
        render: function () {
            this.chart.reflow();
            return this;
        },
        hideLoading: function () {
            this.chart.hideLoading();
            $(axisRelatedSelector).attr('display', '');
        },
        showLoading: function () {
            this.chart.showLoading('Waiting for data...');
            $(axisRelatedSelector).attr('display', 'none');
        },
        updateParams: function (config, namespace) {
            // y title update
            var title = config[namespace + 'y_title'];
            if (this.ytitle !== title) {
                this.chart.yAxis[0].setTitle({text: title});
            }
            this.ytitle = title;
            // x title update
            title = config[namespace + 'x_title'];
            if (this.xtitle !== title) {
                this.chart.yAxis[0].setTitle({text: title});
            }
            this.xtitle = title;
        },
        updateSeries: function (series, start, end, span) {
            while (this.chart.series.length > 0) { // remove old series
                this.chart.series[0].remove(false);
            }
            var that = this;
            _.each(series, function (s) {
                if(start === end) {
                    s.data[0] = {y: s.data[0], marker: {enabled: true, symbol: 'square', radius: 5}};
                }
                that.chart.addSeries($.extend(s, {
                    pointStart: start,
                    pointInterval: span
                }), false);
            });
            if(start === end){
                end = start + span;
            }
            // change time format of x axis according to span
            if (span < Config.MILLI_SEC_IN_DAY) {
                this.chart.timeformat = Config.HOURLY_TIME_FORMAT;
            }else{
                this.chart.timeformat = Config.DAILY_TIME_FORMAT;
            }
            this.chart.xAxis[0].update({minRange: span, min: start, max: end}, true);
        }
    });
});
