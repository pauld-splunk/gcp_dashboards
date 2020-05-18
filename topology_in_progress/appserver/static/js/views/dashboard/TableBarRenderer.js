// To use:
//   * Add cell.percentage option to simplexml.
//   * <option name="cell.percentage">Percentage</option>
// Use:
//   * Show a horizontal bar filled in for values 1-100 (such as percentage)
//   * Overlays number atop the bar
define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/simplexml/ready!'
], function($, _, mvc, TableView) {
    'use strict';

    const FIELDS = ['Percentage'];

    var TableBarRenderer = TableView.BaseCellRenderer.extend({
        initialize(options) {
            this.fields = FIELDS;
            TableView.BaseCellRenderer.prototype.initialize.apply(this, arguments);
        },
        canRender(cell) {
            return this.fields.indexOf(cell.field) > -1;
        },
        render($td, cell) {
            var percent = Math.min(Math.max(parseFloat(cell.value), 0), 100);
            if (isNaN(percent)) {
                $td.html('N/A');
                return;
            } else {
                $td.addClass('data-bar-cell').html(_.template(this.template, {
                    percent: percent,
                    cellValue: String(cell.value)
                }));
            }
            
        },
        template: '\
            <div class="data-bar-wrapper">\
                <div class="data-bar" style="width:<%- percent %>%">\
                    <div class="data-bar-custom-text">\
                        <span class="data-bar-badge"><%- cellValue %></span>\
                    </div>\
                </div>\
            </div>\
        '
    });

    return TableBarRenderer;
});