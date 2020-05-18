define([
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/searchmanager',
    'app/models/ELBInsightsModel',
    'app/models/SGInsightsModel',
    'app/models/IAMInsightsModel',
    'app/views/insights/table/InsightsRowExpansionView',
    'app/views/insights/table/SeverityIconRenderView',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'], function (_,
                                                mvc,
                                                utils,
                                                TableView,
                                                SearchManager,
                                                ELBInsightsModel,
                                                SGInsightsModel,
                                                IAMInsightsModel,
                                                InsightsRowExpansionView,
                                                SeverityIconRenderView) {
    let page = utils.getPageInfo().page;
    let Model = ELBInsightsModel;
    switch (page) {
        case 'sg_insights':
            Model = SGInsightsModel;
            break;
        case 'iam_insights':
            Model = IAMInsightsModel;
            break;
        default:
            break;
    }
    let baseSearch = mvc.Components.get('baseSearch');
    let rowRender = TableView.BaseRowExpansionRenderer.extend({
        initialize: function () {
            this.detailModel = new Model({
                search: baseSearch
            });
        },

        canRender: function (rowData) {
            return true;
        },

        render: function ($container, rowData) {
            this.detailModel.unsetData();

            let detailView = new InsightsRowExpansionView({
                    model: this.detailModel
                }
            );
            let id = '';
            if (page === 'sg_insights') {
                let idCell = _(rowData.cells).find(function (cell) {
                    return cell.field === 'ID';
                });
                id = idCell.value;
            } else if (page === 'elb_insights') {
                let accountCell = _(rowData.cells).find(function (cell) {
                    return cell.field === 'Account ID';
                });
                let regionCell = _(rowData.cells).find(function (cell) {
                    return cell.field === 'Region';
                });
                let nameCell = _(rowData.cells).find(function (cell) {
                    return cell.field === 'Name';
                });
                id = `${accountCell.value}_${regionCell.value}_${nameCell.value}`;
            } else {
                let accountCell = _(rowData.cells).find(function (cell) {
                    return cell.field === 'Account ID';
                });
                let userCell = _(rowData.cells).find(function (cell) {
                    return cell.field === 'User Name';
                });
                id = `${accountCell.value}_${userCell.value}`;
            }

            let insightCell = _(rowData.cells).find(function (cell) {
                return cell.field === 'Insight';
            });
            $container.append(detailView.render().el);
            this.detailModel.formatData(insightCell.value, id);
        }
    });

    let resultTable = mvc.Components.getInstance("results");
    resultTable.getVisualization(function (tableView) {
        tableView.addCellRenderer(new SeverityIconRenderView());
    });
    if (page !== 'eip_insights') {
        resultTable.getVisualization(function (tableView) {
            tableView.addRowExpansionRenderer(new rowRender());
        });
    }
    baseSearch.once('search:done', () => {
        resultTable.once('rendered', ()=> {
            $('#results th[data-sort-key="Severity"] i').addClass('desc');
        });
    });
});