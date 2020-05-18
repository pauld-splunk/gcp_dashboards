define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'app/models/RIPlannerDetailModel',
    'app/views/insights/RI_planner/RIPlannerDetailDataBuilder',
    'app/views/insights/RI_planner/RIPlannerDetailHeaderView',
    'app/views/insights/RI_planner/RIPlannerDetailSingleView',
    'app/views/insights/RI_planner/RIPlannerDetailChartView',
    'app/views/insights/RI_planner/RIPlannerConfig',
    'app/views/insights/RI_planner/RIPlannerHelper',
    'app/views/dashboard/common',
    'appcss/pages/insights/RI_planner_detail.pcss',
    'splunkjs/mvc/simplexml/ready!'
], function ($, _, mvc, RIPlannerDetailModel, RIPlannerDetailDataBuilder, RIPlannerDetailHeadView, RIPlannerDetailSingleView, RIPlannerDetailChartView, Config, Helper) {
    'use strict';
    let model = new RIPlannerDetailModel();
    let tokens = mvc.Components.get('default');
    let defaultEarliest = tokens.get('earliest');
    let defaultLatest = tokens.get('latest');
    new RIPlannerDetailHeadView({
        el: $('#headerContainer'),
        model: model
    }).render();
    let singleView = new RIPlannerDetailSingleView({
        model: model
    });
    let chartView = new RIPlannerDetailChartView({
        el: `#${Config.CHART_CONTAINER_ID}`,
        model: model
    }).render();
    new RIPlannerDetailDataBuilder(model, defaultEarliest, defaultLatest);

    // filter base change, single view will re-calculate
    tokens.on('change:base', (()=> {
        model.changeSingleData(tokens.get('base'));
    }));
    // filter payment change, single view will re-calculate
    tokens.on('change:payment', singleView.formatData.bind(singleView));
    // chart reset
    chartView.on(Config.EVENT.RESET, (()=> {
        tokens.set('earliest', defaultEarliest);
        tokens.set('latest', defaultLatest);
        model.changeSingleData(tokens.get('base'));
    }));
    // chart drag
    chartView.on(Config.EVENT.DRAG_POINT, model.dragPointToModifySingleData.bind(model));
    $(`#${Config.CHART_CONTAINER_ID}`).on(Config.EVENT.SELECT_TIME, (event, start, end) => {
        // ri single view drilldown
        let startDayIndex = Helper.timeToIndex(start),
            endDayIndex = Helper.timeToIndex(end),
            startDayTime = Helper.start.getTime() + startDayIndex * Config.ONE_DAY_MIS,
            endDayTime = Helper.start.getTime() + (endDayIndex + 1) * Config.ONE_DAY_MIS - 1;
        tokens.set('earliest', startDayTime * Config.TIMESTAMP_TO_SPLUNK_TIME_COEF);
        tokens.set('latest', endDayTime * Config.TIMESTAMP_TO_SPLUNK_TIME_COEF);
        model.selectTimeToModifySingleData(startDayIndex, endDayIndex);
    });
});
