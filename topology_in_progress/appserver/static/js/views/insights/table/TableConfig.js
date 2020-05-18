define([], function () {
    return {
        PAGE_SIZE: 10,
        LOADING_IMAGE: '../../../static/app/splunk_app_aws/img/loading.gif',
        CLASS: {
            SORT_ICON: 'icon-sort',
            SORT_ICON_ASC: 'icon-sort-asc',
            SORT_ICON_DESC: 'icon-sort-desc',
            EXPAND_ICON_RIGHT: 'icon-expand-right',
            EXPAND_ICON_DOWN: 'icon-expand-down',
            EXPAND_HEAD: 'col-info',
            HIDE: 'hide',
            TOGGLE: 'toggle-element',
            FIX: 'fix-element',
            INDEX: 'table-index',
            TOGGLE_CONTROLLER: 'toggle-controller',
            TOOLTIP: 'table-tooltip',
            LINK: 'table-link',
            DRILLDOWN: 'table-drilldown',
            HIGHLIGHT: 'table-highlight',
            CLICK: 'table-click',
            EXPAND_TOGGLE: 'expands row-expansion-toggle',
            EXPAND_ROW: 'expanded-row',
            EXPAND_CONTENT: 'expanded-content-row',
            PROGRESS: 'table-progress',
            PAGINATOR: 'table-paginator'
        },
        EVENT: {
            TOGGLE: 'toggle',
            SORT: 'sort',
            DRILLDOWN: 'drilldown',
            MOUSE: 'mouse',
            EXPAND: 'expand'
        },
        DRILLDOWN_TYPE: {
            LINK: 'link',
            CHART: 'chart'
        },
        HTML_CONTENT: 'content'
    }
});