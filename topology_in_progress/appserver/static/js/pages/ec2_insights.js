define([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/tableview',
    'app/views/recommendation/RecommendationDetails',
    'app/views/dashboard/MessageView',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function (_, $, mvc, SearchManager, TableView, RecommendationDetails, MessageView) {
    'use strict';

    const SOURCE = 'ec2_insights';
    const INVALID_MINIMUM_DAYS_HINT = 'It\'s required to set positive integer instance_minimum_sample_days in recommendation.conf.';

    function displayMinimumDaysHint() {
        let minimumDaysSM = new SearchManager({
            preview: false,
            search: '| rest servicesNS/nobody/splunk_app_aws/configs/conf-recommendation fillcontents=1 splunk_server=local' +
            '| search title=ec2 | fields instance_minimum_sample_days'
        });
        minimumDaysSM.on('search:done', (properties) => {
            if (properties.content.resultCount === 0) {
                MessageView.setMessage(SOURCE, INVALID_MINIMUM_DAYS_HINT, null, 'warning');
            }
            let minimumDaysResultModel = minimumDaysSM.data('results', {output_mode: 'json'});
            minimumDaysResultModel.on('data', function () {
                var results = minimumDaysResultModel.data().results;
                let minimumDays = parseInt(results[0].instance_minimum_sample_days);
                if (_.isNaN(minimumDays) || _.isUndefined(minimumDays) || minimumDays < 0) {
                    MessageView.setMessage(SOURCE, INVALID_MINIMUM_DAYS_HINT, null, 'warning');
                } else {
                    let message = 'Insights on this dashboard are based on CloudWatch data from the past week and ' +
                        'require at least '+minimumDays+' days worth of data to be reliable.';
                    MessageView.setMessage(SOURCE, message, null, 'info');
                }
            });
        });
    }

    displayMinimumDaysHint();

    let insightsTable = mvc.Components.getInstance('insightsTable');

    var BasicRowRenderer = TableView.BaseRowExpansionRenderer.extend({

        canRender(rowData) {
            return true;
        },

        render($container, rowData) {
            let view = new RecommendationDetails.EC2DetailView({
                id: this._getValue(rowData, 'Instance ID'),
                action: this._getValue(rowData, 'Action'),
                region: this._getValue(rowData, 'Region')
            });

            $container.append(view.render().el);

            $container.find('a.external').click(function () {
                window.open($(this).attr('href'));
            });
        },

        _getValue(rowData, field) {
            let index = rowData.fields.indexOf(field);
            return rowData.cells[index].value;
        }
    });

    // Create an instance of the basic row renderer
    var tableRowRender = new BasicRowRenderer();

    insightsTable.getVisualization(function (tableView) {
        tableView.addRowExpansionRenderer(tableRowRender);
        tableView.render();
    });
});
