define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/simplesplunkview',
    'splunkjs/mvc/simplexml/ready!'
], function($, _, mvc, SimpleSplunkView) {
    'use strict';

    const TOTAL_FIELD = '_total_field', TOTAL_NAME = '_total_name', TOTAL_PREFIX = '_total_prefix';

    // Custom view to annotate a single value element with a total indicator
    var SingleValueRenderer = SimpleSplunkView.extend({
        // Override fetch settings
        outputMode: 'json',
        returnCount: 2,
        // Default options
        options: {
        },

        displayMessage() {
            // Don't display messages
        },

        createView() {
            return true;
        },

        updateView(viz, data) {
            var total = 0,
                name = 'events',
                prefix = 'out of',
                hide = '',
                data = data[0];

            this.$el.empty();

            if (!_.isUndefined(data[TOTAL_FIELD])) {
                total = data[TOTAL_FIELD];
            } else {
                hide = "display: none";
            }
            if (!_.isUndefined(data[TOTAL_NAME])) {
                name = data[TOTAL_NAME];
            }
            if (!_.isUndefined(data[TOTAL_PREFIX])) {
                prefix = data[TOTAL_PREFIX];
            }

            var template = _.template(this.template, {
                prefix: prefix,
                total: total,
                name: name,
                hide: hide
            });

            // Render the HTML
            this.$el.html(template);
        },

        template: '\
            <div class="single-total" style="<%- hide %>" title="Total value: <%- total %>">\
                <%- prefix %> <b><%- total %></b> <%- name %>\
            </div>\
        '
    });

    return SingleValueRenderer;
});
