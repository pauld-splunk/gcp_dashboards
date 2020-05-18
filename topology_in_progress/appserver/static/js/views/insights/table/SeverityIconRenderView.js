define([
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'appcss/pages/insights/severity_icon_render.pcss'
], function (_, mvc, TableView) {
    const ICONS = {
        'S3': 'alert-circle',
        'S2': 'alert',
        'S1': 'alert'
    };
    return TableView.BaseCellRenderer.extend({
        canRender: function (cell) {
            // Only use the cell renderer for the range field
            return cell.field === 'Severity';
        },
        render: function ($td, cell) {
            var icon = 'question';
            if (ICONS.hasOwnProperty('S' + cell.value)) {
                icon = ICONS['S' + cell.value];
            }
            $td.addClass('icon').html(_.template('<i class="icon-<%-icon%> <%- range %>" title="<%- range %>"></i>', {
                icon: icon,
                range: 'S' + cell.value
            }));
        }
    });

});