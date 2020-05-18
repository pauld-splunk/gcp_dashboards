define([
    'jquery',
    'underscore',
    'backbone',
    'splunkjs/mvc/tableview',
    'app/views/anomaly_detection/Config'
], function ($, _, Backbone, TableView, SystemConfig) {
    // "Severity" column cell render for latest anomaly table in anomaly overview page
    return TableView.BaseCellRenderer.extend({
        canRender: function (cell) {
            return cell.field === 'Severity';
        },
        render: function ($td, cell) {
            $td.html('');
            var severity = parseInt(cell.value);
            if (_.isNaN(severity) || severity > 4 || severity <= -1) {
                $td.css('background-color', SystemConfig.INVALID_SEVERITY_COLOR);
                $td.attr({'data-toggle': 'tooltip', 'data-placement': 'top', 'data-html': 'true'});
                if (severity === -1) {
                    $td.attr({'data-original-title': 'No severity provided.'});
                } else {
                    $td.attr({'data-original-title': 'Invalid severity provided, it should be integer from 1 to 4.'});
                }
                $td.tooltip({container: 'body'});
            } else {
                $td.css('background-color', SystemConfig.SEVERITY_COLOR_MAP[cell.value]);
            }
        }
    });
});
