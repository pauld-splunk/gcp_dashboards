define([
    'jquery',
    'underscore',
    'moment'
], function ($, _, moment) {
    return {
        chart: {
            animation: false,
            height: 200
        },
        legend: {
            align: 'right',
            layout: 'vertical',
            verticalAlign: 'middle',
            symbolRadius: 0
        },
        loading: {
            labelStyle: {
                fontWeight: 'normal',
                color: '#a6a6a6',
                fontSize: '13px'
            },
            style: {
                opacity: 1,
                backgroundColor: 'white'
            }
        },
        tooltip: {
            useHTML: true,
            formatter: function () {
                var template = _.template('<table>' +
                    '<tr><td>_time</td><td align="right" width="75%"><%=time %></td></tr>' +
                    '<tr><td style="color: <%=color %>"><%=name %></td><td align="right" width="75%"><%=value %></td></tr>' +
                    '</table>');
                var timeFormat = 'YYYY-MM-DD HH:mm:ss';
                return template({
                    time: moment(this.x).format(timeFormat),
                    name: this.series.name,
                    color: this.series.color,
                    value: this.y
                });
            },
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            borderColor: 'black',
            style: {
                color: 'white'
            }
        },
        title: {
            text: ''
        },
        yAxis: {
            title: ''
        },
        credits: {
            enabled: false
        },
        xAxis: {
            title: '',
            type: 'datatime',
            minRange: 1000,
            labels: {
                formatter: function () {
                    return moment(this.value).format(this.chart.timeformat);
                }
            },
            tickPositioner: function () {
                var incrementStep = 5,
                    positions = [],
                    tick = this.min,
                    increment = Math.ceil((this.max - this.min) / incrementStep);

                if (this.min !== null && this.max !== null) {
                    for (tick; tick <= this.max; tick += increment) {
                        positions.push(tick);
                    }
                }
                return positions;
            }
        },
        plotOptions: {
            area: {
                lineWidth: 1
            },
            series: {
                fillOpacity: 0.75,
                marker: {
                    enabled: false, symbol: 'square'
                },
                point: {
                    events: {
                        mouseOver: function () {
                            var curSeries = this.series,
                                collections = this.series.chart.series,
                                groups = ['group', 'markerGroup'];
                            _.each(collections, function (series) {
                                if (series !== curSeries) {
                                    _.each(groups, function (group) {
                                        series[group].animate({
                                            opacity: 0.1
                                        }, {
                                            duration: 150
                                        });
                                    });
                                }
                            });
                        },
                        mouseOut: function () {
                            var curSeries = this.series,
                                collections = this.series.chart.series,
                                groups = ['group', 'markerGroup'];
                            _.each(collections, function (series) {
                                if (series !== curSeries) {
                                    _.each(groups, function (group) {
                                        series[group].animate({
                                            opacity: 1
                                        }, {
                                            duration: 50
                                        });
                                    });
                                }
                            });
                        }
                    }
                }
            }
        }
    }
});
