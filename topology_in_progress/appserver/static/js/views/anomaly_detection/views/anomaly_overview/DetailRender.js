define([
    'jquery',
    'underscore',
    'splunkjs/mvc/sharedmodels',
    'splunkjs/mvc/tableview',
    'app/views/anomaly_detection/Config',
    'util/splunkd_utils',
    'contrib/text!app/views/anomaly_detection/templates/JobSummaryTemplate.html',
    'contrib/text!app/views/anomaly_detection/templates/AlertSummaryTemplate.html'
], function ($, _, SharedModels, TableView, SystemConfig, splunkd_utils, JobSummaryTemplate, AlertSummaryTemplate) {
    // Row expansion render for jobs table in anomaly overview page
    return TableView.BaseRowExpansionRenderer.extend({
        initialize: function (options) {
            this.models = options.models;
            this.models.application = SharedModels.get('app');
        },
        canRender: function (rowData) {
            return true;
        },
        render: function ($container, rowData) {
            $container.html('<div class="summary-info"></div>');
            $container.find('.summary-info').append(this._getSettings(rowData));
        },
        _getSettings: function (rowData) {
            var jobIdIndex = rowData.fields.indexOf('Action');
            var jobId = rowData.values[jobIdIndex];
            var job = this.models.tableModel.getJobWithId(jobId);
            return this._getJobSettings(job) + '<br>' + this._getAlertSettings(job[SystemConfig.JOB_ALERT_ID]);
        },
        _getJobSettings: function (job) {
            var jobTemplate = _.template(JobSummaryTemplate);
            return jobTemplate(job);
        },
        _capitalize: function (str) {
            if (_.isEmpty(str)) {
                return str;
            }
            return str.charAt(0).toUpperCase() + str.slice(1);
        },
        _getAlertSettings: function (id) {
            var alert = this.models.tableModel.getAlertWithId(id);
            if (!_.isEmpty(alert)) {
                var permissions = alert.entry.content.get('ui.permissions');
                var alertPermissions = permissions === splunkd_utils.USER ? 'Private' : (permissions === splunkd_utils.APP ? 'Shared in APP' : 'Shared Globally');
                var alertOwner = 'Owned by ' + this.models.application.get('owner');
                var alertType = this._capitalize(alert.entry.content.get('ui.type'));
                var scheduleString = alert.cron.getScheduleString();
                var triggerCondition = this._capitalize(alert.entry.content.get('alert_type')) + ' ' +
                    alert.entry.content.get('alert_comparator') + ' ' +
                    alert.entry.content.get('alert_threshold') + '.';
                var alertTemplate = _.template(AlertSummaryTemplate);
                return alertTemplate({
                    alertName: alert.entry.get('name'),
                    app: this.models.application.get('app'),
                    permissions: alertPermissions + '. ' + alertOwner + '.',
                    alertType: alertType + '. ' + scheduleString,
                    triggerCondition: triggerCondition
                });
            } else {
                return '';
            }
        }
    });
});
