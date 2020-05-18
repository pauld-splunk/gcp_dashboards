define([
    'jquery',
    'underscore',
    'backbone',
    'splunkjs/mvc',
    'views/Base',
    'app/views/insights/RI_planner/RIPlannerHelper',
    'app/views/insights/RI_planner/RIPlannerConfig',
    'app/views/insights/RI_planner/draggable_chart_components/RIPlannerChartParams',
    'app/views/insights/RI_planner/draggable_chart_components/DraggableChartHelper',
    'app/views/insights/RI_planner/draggable_chart_components/HighchartsDraggableExtension'
], function ($, _, Backbone, mvc, BaseView, Helper, Config, ChartParams, ChartHelper, Highcharts) {
    return BaseView.extend({
        events: {
            'click .btn': 'reset'
        },

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.model = this.options.model;
            this.tokens = mvc.Components.get('default');
            this.chartData = null;
            this.chart = new Highcharts.Chart(ChartParams.CHART);
            this.helper = ChartHelper.getInstance();
            this.predictionDay = null;
            this.dragPredictionDay = null;
            this.historyLength = 0;
            let applyFlexibility = Helper.checkSizeFlexibility(this.tokens.get('platform'), this.tokens.get('tenancy'));
            this.normalFactor = applyFlexibility ? this.tokens.get('normalFactor') : 1;
            $(`#${Config.CHART_CONTAINER_ID}`).on(Config.EVENT.DRAG_POINT, this._dragEnd.bind(this));
            this.listenTo(this.model, 'change:dailyData', this.drawChart.bind(this));
            this.listenTo(this.tokens, 'change:base', this.redrawChart.bind(this));
        },

        render: function () {
            this.$el.append(`<div class="chart-button"><a class="btn btn-primary hidden">Reset</a></div>`);
        },

        _formatData: function () {
            let dailyData = this.model.get('dailyData');
            // xAxis params
            let historyXAxisParams = {
                min: dailyData.history.start,
                max: dailyData.history.end
            };
            let predictionXAxisParams = {
                min: dailyData.history.start,
                max: dailyData.prediction.end
            };
            // series
            let historySeriesName = _.template(ChartParams.HISTORY_SERIES.name, {
                historyFrom: Helper.timeToXText(dailyData.history.start),
                historyTo: Helper.timeToXText(dailyData.history.end)
            });
            let predictionSeriesName = _.template(ChartParams.PREDICTION_SERIES.name, {
                predictionFrom: Helper.timeToXText(dailyData.prediction.start),
                predictionTo: Helper.timeToXText(dailyData.prediction.end)
            });
            let pointParams = {
                pointStart: dailyData.history.start,
                pointInterval: Config.ONE_DAY_MIS
            };
            let historyData = dailyData.history.data.slice(0).map(value => {
               return value * this.normalFactor;
            });
            let predictionData = dailyData.prediction.data.slice(0).map(value => {
               return value * this.normalFactor;
            });
            this.predictionDay = predictionData.slice();
            let historySeries = [$.extend({}, ChartParams.HISTORY_SERIES, $.extend({}, pointParams, {
                name: historySeriesName + '<br>Adjust the history time range<br>by horizontal dragging',
                data: historyData
            }))];
            this.historyLength = historyData.length;
            let predictionLength = predictionData.length;
            predictionData = Array(this.historyLength).fill(null).concat(predictionData);
            let predictionSeries = [
                $.extend({}, ChartParams.HISTORY_SERIES, $.extend({}, pointParams, {
                    name: historySeriesName,
                    data: historyData.concat(Array(predictionLength).fill(null))
                })),
                $.extend({}, ChartParams.PREDICTION_SERIES, $.extend({}, pointParams, {
                    name: predictionSeriesName,
                    data: predictionData
                }))
            ];
            this.chartData = {
                historyMask: {
                    id: 'historyMask',
                    from: dailyData.history.start,
                    to: dailyData.history.end,
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                reloadParams: {
                    start: Helper.timeToIndex(dailyData.prediction.start),
                    end: this.historyLength + predictionLength - 1
                },
                history: {
                    xAxisParams: historyXAxisParams,
                    series: historySeries
                },
                prediction: {
                    xAxisParams: predictionXAxisParams,
                    series: predictionSeries
                },
                predictionData: predictionData
            }
        },

        drawChart: function () {
            this.$('.btn').removeClass('hidden');
            this.chart.reflow();
            this.chart.setTitle(null, {text: ''}); // remove loading
            this._formatData(); // format data
            this._baseDrawChart();
        },

        reset: function () {
            if (this.tokens.get('base') === 'history') {
                this._removeMask();
            } else {
                this.chart.series[1].update({
                    data: this.chartData.predictionData.slice()
                }, true);
                // reload drag params
                this.helper.reload(this.chartData.reloadParams);
            }
            this.trigger(Config.EVENT.RESET);
        },

        _dragEnd: function () {
            let start = this.helper.startAnchor;
            let end = this.helper.endAnchor;
            for (let i = start; i <= end; i++) {
                this.dragPredictionDay[i - this.historyLength] = parseFloat(this.chart.series[1].data[i].y) / this.normalFactor;
            }
            this.trigger(Config.EVENT.DRAG_POINT, this.dragPredictionDay);
        },

        _removeMask: function () {
            this.chart.xAxis[0].removePlotBand('selectionMask');
            this.chart.xAxis[0].removePlotLine('maskLeftLine');
            this.chart.xAxis[0].removePlotLine('maskRightLine');
        },

        redrawChart: function () {
            // remove old series
            while (this.chart.series.length > 0) {
                this.chart.series[0].remove(false);
            }
            this._baseDrawChart();
        },

        _baseDrawChart: function () {
            // reload drag params
            this.helper.reload(this.chartData.reloadParams);
            let base = this.tokens.get('base');
            // redraw
            this.chart.xAxis[0].update(this.chartData[base].xAxisParams);
            this.chartData[base].series.forEach(s => {
                this.chart.addSeries($.extend(true, {}, s), false);
            });
            this.chart.redraw();
            if (base === 'prediction') {
                // remove mask
                this._removeMask();
                // mask history
                this.chart.xAxis[0].addPlotBand(this.chartData.historyMask);
                // disable time selection
                this.chart.pointer.zoomX = false;
                // reset prediction data for drag
                this.dragPredictionDay = this.predictionDay.slice();
            } else {
                // remove history mask
                this.chart.xAxis[0].removePlotBand('historyMask');
                // enable time selection
                this.chart.pointer.zoomX = true;
            }
        }
    });

});
