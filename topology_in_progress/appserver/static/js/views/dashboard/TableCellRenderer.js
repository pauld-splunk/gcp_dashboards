// To use:
//   * Add cell.cellRange option to simplexml.
//   * <option name="cell.cellRange">true</option>
define([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/simplexml/ready!'
], function(_, $, mvc, TableView) {

    const FIELDS_MAP = {
        // Change Management
        'CREATE': ['range-cell', 'range-low'],
        'UPDATE': ['range-cell', 'range-elevated'],
        'DELETE': ['range-cell', 'range-severe'],

        // Auth
        'Unauthorized': ['range-cell', 'range-unauth', 'numeric'],
        'Authorized': ['range-cell', 'range-auth', 'numeric'],

        // Error Code
        'Error Code': ['range-cell', 'range-err'],
    };

    const FIELDS_VALUE_MAP = {
        'Direction': {
            'ingress': ['range-cell', 'inbound'],
            'egress': ['range-cell', 'outbound']
        },
        'Instance State': {
            'in service': ['range-cell', 'range-low'],
            'out of service': ['range-cell', 'range-severe'],
            'healthy': ['range-cell', 'range-low'],
            'unused': ['range-cell', 'range-severe'],
            'unhealthy': ['range-cell', 'range-severe'],
            'draining': ['range-cell', 'range-severe']
        }
    };

    const FIELDS = Object.keys(FIELDS_MAP).concat(Object.keys(FIELDS_VALUE_MAP));

    var TableCellRenderer = TableView.BaseCellRenderer.extend({
        canRender(cell) {
            return FIELDS.indexOf(cell.field) > -1;
        },
        render($td, cell) {
            var field = cell.field;
            var value = cell.value;

            if (field in FIELDS_MAP) {
                FIELDS_MAP[field].forEach((cssClass) => {
                    $td.addClass(cssClass);
                });
            }

            if (field in FIELDS_VALUE_MAP) {
                var values = FIELDS_VALUE_MAP[field];
                if (value in values) {
                    values[value].forEach((cssClass) => {
                        $td.addClass(cssClass);
                    });
                }
            }

            // Update the cell content
            $td.text(value);
        }
    });

    return TableCellRenderer;
});
