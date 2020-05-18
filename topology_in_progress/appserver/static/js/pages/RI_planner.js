define([
    'jquery',
    'splunkjs/mvc',
    'app/models/RIPlannerModel',
    'app/views/insights/RI_planner/RIPlannerFiltersView',
    'app/views/insights/table/TableView',
    'app/views/insights/RI_planner/RIPlannerController',
    'app/views/insights/RI_planner/RIPlannerConfig',
    'appcss/pages/insights/RI_planner.pcss',
    'bootstrap.tab',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function ($, mvc, RIPlannerModel, RIPlannerFiltersView, TableView, RIPlannerController, Config) {
    'use strict';
    const SUBMIT_BUTTON = '.form-submit > button';

    let model = new RIPlannerModel();
    new RIPlannerFiltersView({
        model: model
    });
    let tableView = new TableView({
        el: $('#container'),
        model: model,
        Config: Config.TABLE
    }).render();
    let controller = new RIPlannerController(model);

    // by default, sort by yearly saving
    model.on('change:rowsReady', ()=>{
        if (model.get('rowsReady')) {
            tableView.headView.toggleSortIcon(Config.TABLE.YEARLY_SAVING_INDEX);
        }
    });
    // user submit filters
    $(`${SUBMIT_BUTTON}:not(disabled)`).click(()=> {
        // reset sort
        tableView.headView.resetSortIcons();
        // empty model rows
        model.emptyRows();
        // clear table
        tableView.bodyView.removeViews();
        // generate table results
        controller.generateResults();
    });

});