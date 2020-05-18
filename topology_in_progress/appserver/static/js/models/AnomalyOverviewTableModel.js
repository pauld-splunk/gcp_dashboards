define([
    'underscore',
    'jquery',
    'app/models/BaseModel',
    'models/search/Alert',
    'app/views/anomaly_detection/Config'
], function (_, $, BaseModel, AlertModel, SystemConfig) {
    // Parse result of "jobSearch" search manager and fetch alerts of jobs in anomaly overview page
    return BaseModel.extend({
        defaults: {
            tags: [],
            alerts: []
        },
        initialize: function () {
            BaseModel.prototype.initialize.apply(this, arguments);
            this._formatData();
        },
        _formatData: function () {
            var jobSearch = this.get('jobSearch');
            var jobResultModel = jobSearch.data('results', {output_mode: 'json', count: 0});
            jobResultModel.on('data', (function () {
                var results = jobResultModel.data().results;
                var tags = [];
                var alerts = [];
                var jobs = [];
                var name2id = [];
                results.forEach(function (value) {
                    if (SystemConfig.JOB_TAGS in value && !_.isEmpty(value[SystemConfig.JOB_TAGS])) {
                        tags = _.union(tags, value[SystemConfig.JOB_TAGS].split(','));
                    }
                    if (SystemConfig.JOB_ALERT_ID in value && !_.isEmpty(value[SystemConfig.JOB_ALERT_ID]) && !_.isEmpty(value[SystemConfig.JOB_ALERT_ID])) {
                        alerts.push(value[SystemConfig.JOB_ALERT_ID]);
                    }
                    if (SystemConfig.JOB_ID in value) {
                        jobs[value[SystemConfig.JOB_ID]] = value;
                        name2id[value[SystemConfig.JOB_NAME]] = value[SystemConfig.JOB_ID];
                    }
                });
                this.set({
                    tags: tags.sort(),
                    alertIds: alerts,
                    jobs: jobs,
                    name2id: name2id
                });
                this._loadAlerts();
            }).bind(this));
        },
        _loadAlerts: function () {
            var alertIds = this.get('alertIds');
            var alerts = this.get('alerts');
            alertIds.forEach((function (id) {
                if (!(id in alerts)) {
                    // only fetch once
                    var alert = new AlertModel();
                    alert.set('id', id);
                    alert.fetch({
                        success: function (model, response) {
                            alerts[id] = alert;
                            this.set('alerts', alerts);
                        }.bind(this),
                        error: function (model, response) {
                        }.bind(this)
                    });
                }
            }).bind(this));
        },
        getJobWithName: function (name) {
            var jobs = this.get('jobs');
            var name2id = this.get('name2id');
            if (name in name2id && name2id[name] in jobs) {
                return jobs[name2id[name]];
            } else {
                return null;
            }
        },
        getJobWithId: function (id) {
            var jobs = this.get('jobs');
            if (id in jobs) {
                return jobs[id];
            } else {
                return null;
            }
        },
        getAlertWithId: function (id) {
            var alerts = this.get('alerts');
            if (id in alerts) {
                return alerts[id];
            } else {
                return null;
            }
        }
    });
});