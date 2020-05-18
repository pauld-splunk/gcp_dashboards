define([
    'jquery',
    'app/views/insights/RI_planner/draggable_chart_components/DraggableChartHelper',
    'app/views/insights/RI_planner/RIPlannerHelper',
    'app/views/insights/RI_planner/RIPlannerConfig',
    'splunk-highcharts-no-conflict-loader!contrib/highcharts-4.0.4/highcharts'
], function ($, ChartHelper, RIPlannerHelper, Config, Highcharts) {
    let helper = ChartHelper.getInstance();
    
    Highcharts.Chart.prototype.callbacks.push(function (chart) {
        let dragPoint,
            dragY,
            dragPlotY,
            data,
            series,
            isClick;

        function mouseDown(e) {
            let originalEvent = e.originalEvent || e,
                hoverPoint = chart.hoverPoint;
            if (originalEvent.target.getAttribute('class') === null) { //path
                if (hoverPoint) {
                    let options = hoverPoint.series.options;
                    if (options.drag && hoverPoint.drag !== false) {
                        dragPoint = hoverPoint;
                        dragY = e.pageY;
                        dragPlotY = dragPoint.plotY + (chart.plotHeight - (dragPoint.yBottom || chart.plotHeight));
                        data = dragPoint.series.data.map(p => {
                            return p.y;
                        });
                        helper.dragStart(RIPlannerHelper.timeToIndex(dragPoint.x), dragPoint.y);
                        series = dragPoint.series;
                        chart.series.forEach(s => {
                            s.options.inDrag = true;
                        });
                        isClick = true;
                    }
                }
            }
        }

        function mouseMove(e) {
            e.preventDefault();
            if (dragPoint) {
                isClick = false;
                var pageY = e.pageY,
                    deltaY = dragY - pageY,
                    newPlotY = dragPlotY - deltaY,
                    newY = Math.max(series.yAxis.toValue(newPlotY, true), 0),
                    curPoint = {
                        x: dragPoint.x,
                        y: newY
                    },
                    kdTree = series.kdTree;
                dragPoint.update(curPoint, false);
                if (series.halo) {
                    series.halo = series.halo.destroy();
                }
                if (chart.tooltip) {
                    chart.tooltip.refresh(dragPoint);
                }
                let updatePoints = helper.dragInProgress(data, newY);
                updatePoints.forEach(p => {
                    series.data[p.x].update({x: series.data[p.x].category, y: p.y}, false);
                });
                series.redraw();
                series.kdTree = kdTree;
            }
        }

        function drop(e) {
            if (dragPoint) {
                chart.series.forEach(s => {
                    s.options.inDrag = false;
                });
                if (isClick && dragPoint.options.selected) { // double click to not choose
                    dragPoint.update({marker: {enabled: false}});
                    dragPoint.options.selected = false;
                    helper.deleteAnchor(RIPlannerHelper.timeToIndex(dragPoint.x));
                } else {
                    dragPoint.update({marker: {enabled: true, radius: 6}});
                    dragPoint.options.selected = true;
                    if (isClick) { // double click to choose
                        helper.addAnchor(RIPlannerHelper.timeToIndex(dragPoint.x));
                    } else { // drag
                        $(`#${Config.CHART_CONTAINER_ID}`).trigger(Config.EVENT.DRAG_POINT);
                    }
                }
                dragPoint = dragY = undefined;
            }
        }

        Highcharts.addEvent(chart.container, 'mousedown', mouseDown);
        Highcharts.addEvent(chart.container, 'mousemove', mouseMove);
        Highcharts.addEvent(chart.container, 'mouseup', drop);
        Highcharts.addEvent(chart.container, 'mouseleave', drop);
    });

    return Highcharts;
});