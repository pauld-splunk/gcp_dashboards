define([
    'underscore',
    'jquery',
    'backbone',
    'splunkjs/mvc',
    'app/models/AnomalyOverviewTableModel',
    'app/views/anomaly_detection/views/anomaly_overview/RangeCellView',
    'app/views/anomaly_detection/views/anomaly_overview/JobTableView',
    'app/views/anomaly_detection/Config',
    'appcss/pages/anomaly_detection/anomaly_overview.pcss',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function (_, $, Backbone, mvc, AnomalyOverviewTableModel, RangeCellView, JobTableView, SystemConfig) {
    var jobSearch = mvc.Components.get('jobSearch');
    var anomalySearch = mvc.Components.get('anomalySearch');
    var scheduleSearch = mvc.Components.get('scheduleCheckerSearch');
    var anomalyModel = new AnomalyOverviewTableModel({
        jobSearch: jobSearch
    });

    // "Latest 100 Anomalies" Table part
    var anomaliesTable = mvc.Components.getInstance('lastAnomaliesTable');
    anomaliesTable.getVisualization(function (tableView) {
        tableView.addCellRenderer(new RangeCellView());
    });
    anomaliesTable.on('click', function (e) {
        e.preventDefault();
        var name = e.data['row.Job name'];
        var job = anomalyModel.getJobWithName(name);
        var time = new Date(e.data['row._time']).getTime() / SystemConfig.MILLI_SEC_IN_SEC;
        var type = job[SystemConfig.JOB_SCHEDULE];
        var earliest = time;
        var latest = time;
        var train = job[SystemConfig.JOB_TRAIN];
        var trainCount = parseInt(train.slice(0, -1));
        var trainUnit = train.slice(-1);
        switch (trainUnit) {
            case 's':
                earliest -= trainCount * 1.2 * SystemConfig.MILLI_SEC_IN_SEC / SystemConfig.MILLI_SEC_IN_SEC;
                latest += trainCount * 0.2 * SystemConfig.MILLI_SEC_IN_SEC / SystemConfig.MILLI_SEC_IN_SEC;
                break;
            case 'm':
                earliest -= trainCount * 1.2 * SystemConfig.MILLI_SEC_IN_MIN / SystemConfig.MILLI_SEC_IN_SEC;
                latest += trainCount * 0.2 * SystemConfig.MILLI_SEC_IN_MIN / SystemConfig.MILLI_SEC_IN_SEC;
                break;
            case 'h':
                earliest -= trainCount * 1.2 * SystemConfig.MILLI_SEC_IN_HOUR / SystemConfig.MILLI_SEC_IN_SEC;
                latest += trainCount * 0.2 * SystemConfig.MILLI_SEC_IN_HOUR / SystemConfig.MILLI_SEC_IN_SEC;
                break;
            default:
                earliest -= trainCount * 1.2 * SystemConfig.MILLI_SEC_IN_DAY / SystemConfig.MILLI_SEC_IN_SEC;
                latest += trainCount * 0.2 * SystemConfig.MILLI_SEC_IN_DAY / SystemConfig.MILLI_SEC_IN_SEC;
        }
        var data = [
            'earliest=' + earliest,
            'latest=' + latest,
            'time=' + time,
            'field=' + e.data['row.Field name'],
            'display.general.type=' + 'visualizations',
            'display.page.search.mode=' + 'smart',
            'display.page.search.tab=' + 'visualizations',
            'display.visualizations.type=' + 'custom',
            'display.visualizations.custom.type=' + 'splunk_app_aws.anomaly_detection_viz',
            'q=' + encodeURIComponent((job[SystemConfig.JOB_SEARCH].trimLeft().charAt(0) === '|'  ? '' : 'search ') + job[SystemConfig.JOB_SEARCH])
        ];
        var drilldownLink = 'search?' + data.join('&');
        window.open(drilldownLink);
    });

    // "Anomaly Detection Jobs" table part
    function allUpdate() {
        jobSearch.startSearch();
        anomalySearch.startSearch();
    }

    function jobUpdate() {
        jobSearch.startSearch();
    }
    
    function scheduleCheckerUpdate() {
        scheduleSearch.startSearch();
    }
    new JobTableView({
        managerid: 'jobTableSearch',
        pageSize: '10',
        el: $('#jobTable'),
        drilldown: 'none',
        callback: {
            allUpdate: allUpdate,
            jobUpdate: jobUpdate,
            scheduleCheckerUpdate: scheduleCheckerUpdate
        },
        models: {
            tableModel: anomalyModel
        }
    }).render();

});