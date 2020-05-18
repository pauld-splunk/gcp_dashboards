/**
 * Created by hshen on 10/5/16.
 */
define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'backbone',
    'app/views/silvermine_insights/SilvermineView',
    'views/shared/controls/ControlGroup',
    'appcss/pages/silvermine_insights/bootstrap.pcss',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function ($, _, mvc, Backbone, SilvermineView, ControlGroup) {
    'use strict';

    let model = new Backbone.Model({
        serviceType: '*',  // Show all by default
        showedDates: [],     // Dates to show in the table
        allDates: []        // All dates for search results
    });

    let serviceTypeRadio =  new ControlGroup({
        el: $('#service-type-input'),
        label: _("Service Status").t(),
            controlType: 'SyntheticRadio',
            controlOptions: {
                model: model,
                modelAttribute: 'serviceType',
                items: [{label: 'All',value: '*'}, {label: 'Problematic Only',value: 'problematic'}]
            }
        }).render().el;

    $(serviceTypeRadio).parent().parent()
        .css('display', 'inline-block')
        .css('margin-right', '10px');

    // Create and Render
    new SilvermineView({ 
        managerid: 'silvermineSearch', 
        el: $('#silvermine-container'),
        model: model
    }).render();

});
