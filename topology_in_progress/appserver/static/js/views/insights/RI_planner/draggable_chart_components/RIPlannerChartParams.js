define(['jquery',
        'splunkjs/mvc',
        'moment',
        'app/views/insights/RI_planner/RIPlannerHelper',
        'app/views/insights/RI_planner/RIPlannerConfig'],
    function ($, mvc, moment, Helper, Config) {
        let tokens = mvc.Components.get('default'),
            applyFlexibility = Helper.checkSizeFlexibility(tokens.get('platform'), tokens.get('tenancy'));
        return {
            HISTORY_SERIES: {
                cursor: 'pointer',
                name: '<strong>The past year</strong><br><%= historyFrom %>-<%= historyTo %>',
                inDrag: false,
                color: '#4a90e2',
                marker: {
                    symbol: 'circle'
                }
            },
            PREDICTION_SERIES: {
                name: '<strong>The following year</strong><br><%= predictionFrom %>-<%= predictionTo %><br>' +
                'Adjust the prediction line<br>by vertical dragging points',
                inDrag: false,
                drag: true,
                color: '#f07a35',
                dashStyle: 'dash',
                marker: {
                    symbol: 'circle'
                },
                cursor: 'ns-resize'
            },
            CHART: {
                chart: {
                    renderTo: 'chartContainer',
                    animation: false,
                    height: 300,
                    zoomType: 'x',
                    events: {
                        selection: function (event) {
                            if (event.xAxis) {
                                let extremesObject = event.xAxis[0],
                                    min = new Date(Math.floor(extremesObject.min / Config.ONE_HOUR_MIS) * Config.ONE_HOUR_MIS),
                                    max = new Date(Math.ceil(extremesObject.max / Config.ONE_HOUR_MIS) * Config.ONE_HOUR_MIS),
                                    xAxis = this.xAxis[0];
                                min = Math.max(xAxis.min, min);
                                max = Math.min(xAxis.max, max);
                                // remove the plot band
                                xAxis.removePlotBand('selectionMask');
                                xAxis.addPlotBand({
                                    id: 'selectionMask',
                                    from: min,
                                    to: max,
                                    color: 'rgba(0, 0, 0, 0.05)'
                                });
                                // remove the plot lines
                                xAxis.removePlotLine('maskLeftLine');
                                xAxis.removePlotLine('maskRightLine');
                                Helper.addPlotLine(xAxis, 'maskLeftLine', Helper.timeToXText(min), min, '#4a90e2', {
                                    textAlign: 'right',
                                    y: 15,
                                    x: -5,
                                    verticalAlign: 'top'
                                });
                                Helper.addPlotLine(xAxis, 'maskRightLine', Helper.timeToXText(max), max, '#4a90e2', {
                                    textAlign: 'left',
                                    y: 15,
                                    verticalAlign: 'top'
                                });
                                $('#chartContainer').trigger('time', [min, max]);
                            }
                            return false;
                        }
                    },
                    resetZoomButton: {
                        theme: {
                            display: 'none'
                        }
                    }
                },
                yAxis: {
                    min: 0,
                    minTickleInterval: 1,
                    title: {
                        text: (applyFlexibility? 'Normalized Instances Hours in Unit':'Instances Hours in Count')
                    }
                },
                xAxis: {
                    title: {
                        text: 'Time'
                    },
                    type: 'datatime',
                    minRange: 86400000,
                    labels: {
                        formatter: function () {
                            return moment(this.value).format('MMM DD,YYYY');
                        }
                    },
                    tickPositioner: function () {
                        let incrementStep = (this.max - this.min) / 86400000 === 365 ? 5 : 6,
                            positions = [],
                            tick = this.min,
                            increment = Math.ceil((this.max - this.min) / incrementStep);

                        if (this.min !== null && this.max !== null) {
                            for (tick; tick <= this.max; tick += increment) {
                                let date = new Date(tick);
                                positions.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime());
                            }
                        }
                        return positions;
                    }
                },
                credits: {
                    enabled: false
                },
                legend: {
                    useHTML: true,
                    align: 'right',
                    verticalAlign: 'middle',
                    layout: 'vertical',
                    itemMarginTop: 15,
                    itemStyle: {
                        fontWeight: 'normal'
                    }
                },
                tooltip: {
                    backgroundColor: '#000000',
                    formatter: function () {
                        return Math.round(this.y/0.25)*0.25;
                    },
                    style: {
                        "color": "#ffffff"
                    }
                },
                title: {
                    text: 'Running instances over time',
                    align: 'left',
                    style: {
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }
                },
                subtitle: {
                    text: 'Loading...',
                    align: 'left',
                    style: {
                        fontSize: '12px'
                    }
                },
                plotOptions: {
                    line: {
                        marker: {
                            enabled: false
                        },
                        point: {
                            events: {
                                mouseOver: function (e) {
                                    if (!this.series.options.inDrag) {
                                        let xAxis = this.series.chart.xAxis[0];
                                        let categoryText = Helper.timeToXText(this.category);
                                        Helper.addPlotLine(xAxis, 'pointLine', categoryText, this.x, this.series.color, {
                                            textAlign: 'left',
                                            y: -10,
                                            verticalAlign: 'bottom'
                                        });
                                    }
                                },
                                mouseOut: function (e) {
                                    if (!this.series.options.inDrag) {
                                        let xAxis = this.series.chart.xAxis[0];
                                        xAxis.removePlotLine('pointLine');
                                    }
                                },
                                click: function (e) {
                                    if (this.series.yData[0] !== null) {
                                        // only history data can be clicked
                                        let url = 'search?q=' + tokens.get('ihSearchSPL') +
                                            ` | eval ri=${tokens.get('ri')} | rename current_ih as "Instance hour count", ri as "Optimal RI"`;
                                        url += '&earliest=' + this.category * Config.TIMESTAMP_TO_SPLUNK_TIME_COEF +
                                            '&latest=' + (this.category + Config.ONE_DAY_MIS) * Config.TIMESTAMP_TO_SPLUNK_TIME_COEF;
                                        window.open(url);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });