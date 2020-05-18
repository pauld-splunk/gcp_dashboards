// To use:
//   * Add cell.eventName option to simplexml.
//   * <option name="cell.eventName">Event Name</option>
define([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'splunkjs/mvc/tableview',
    'app/utils/SearchUtil',
    'splunkjs/mvc/simplexml/ready!'
], function(_, $, mvc, utils, TableView, SearchUtil) {
    'use strict';

    const FIELDS = ['Event Name'];

    var TableEventNameRenderer = TableView.BaseCellRenderer.extend({
        initialize(options) {
            var self = this;
            this.valueMap = null;
            this.search = SearchUtil.search('| inputlookup all_eventName').then(function(lookupData) {
                var valueMap = {};

                _(lookupData).each(function(entry) {
                    valueMap[entry.eventName] = entry.highlight;
                });

                self.valueMap = valueMap;
            });
            this.fields = FIELDS;
            TableView.BaseCellRenderer.prototype.initialize.apply(this, arguments);
        },
        canRender(cell) {
            return this.fields.indexOf(cell.field) > -1;
        },
        render($td, cell) {
            var self = this;
            $.when(this.search).done(function() {
                $td.text(cell.value);
                var highlight = self.valueMap[cell.value];
                if (highlight !== null) {
                    $td.addClass('range-' + highlight);
                }
            });

            return this;
        }
    });

    return TableEventNameRenderer;
});
