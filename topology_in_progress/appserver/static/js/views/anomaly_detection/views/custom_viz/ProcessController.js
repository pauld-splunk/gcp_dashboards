define([
    'underscore',
    'backbone',
    'views/Base',
    'app/views/anomaly_detection/views/JobView',
    'app/views/anomaly_detection/views/InfoView',
    'app/views/anomaly_detection/views/AlertViewWrapper',
    'app/models/AnomalyConfigs',
    'models/search/Alert',
    'splunk.util',
    'app/views/anomaly_detection/Config'
], function (_,
             Backbone,
             BaseView,
             JobView,
             InfoView,
             AlertView,
             JobModel,
             AlertModel,
             SplunkUtil,
             SystemConfig) {
    // This controller will control the process after users clicking "schedule button" in anomaly_detection_viz
    return BaseView.extend({
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);

            this.models = {};
            this.children = {};

            this.models.job = new JobModel();
            this.models.input = new Backbone.Model();
            this.models.mode = SystemConfig.DETECT_MODE;
            // initialize view
            this.children.job = new JobView({
                models: {
                    input: this.models.input
                }
            });
            this.children.alert = new AlertView();
            this.children.info = new InfoView();

            // bind events
            this.listenTo(this.models.job, 'loadFail', (function () {
                this.children.info.showFail('job', 'load');
            }).bind(this));

            this.listenTo(this.models.job, 'loadSuccess', (function () {
                var name = this.models.job.getNameWithSearch(this.models.input.get(SystemConfig.JOB_SEARCH));
                this.models.input.set({usedNames: this.models.job.get('usedNames')});
                if (_.isEmpty(name)) {
                    this._showCreateJob();
                } else {
                    this.children.info.showJobEditConfirm(name);
                }
            }).bind(this));

            this.listenTo(this.children.info, 'createJob', this._showCreateJob.bind(this));
            this.listenTo(this.children.info, 'editJob', this._showEditJob.bind(this));
            this.listenTo(this.children.info, 'createAlert', this._showCreateAlert.bind(this));
            this.listenTo(this.children.info, 'editAlert', this._showEditAlert.bind(this));
            this.listenTo(this.children.job, 'saveJob', this._saveJob.bind(this));
        },
        fetchJobs: function () {
            this.models.job.fetchData();
        },
        setJobParams: function (params, mode) {
            this.models.input.set(params);
            this.models.mode = mode;
        },
        render: function () {
            this.$el.append(this.children.info.render());
            this.$el.append(this.children.job.render());
        },
        _showCreateJob: function () {
            var mode = this.models.mode;
            this.children.job.show(this.models.job.get('tags'), mode | SystemConfig.CREATE_MODE);
        },
        _showEditJob: function (name) {
            var job = this.models.job.getJobWithName(name);
            var mode = this.models.mode;
            this.models.input.set(job);
            this.children.job.show(this.models.job.get('tags'), mode | SystemConfig.EDIT_MODE);
        },
        _saveJob: function (mode) {
            var alertMode = SystemConfig.CREATE_MODE;
            if ((mode & SystemConfig.EDIT_MODE) > 0 && !_.isEmpty(this.models.input.get(SystemConfig.JOB_ALERT_ID))) {
                // alert exist
                alertMode = SystemConfig.EDIT_MODE;
            }
            var content = _.pick(this.models.input.toJSON(), SystemConfig.JOB_NAME, SystemConfig.JOB_PRIORITY, SystemConfig.JOB_SCHEDULE,
                SystemConfig.JOB_SEARCH, SystemConfig.JOB_TRAIN, SystemConfig.JOB_TAGS);
            if ((mode & SystemConfig.EDIT_MODE) > 0) {
                // update stanza
                $.when(this.models.job.updateStanza(this.models.input.get(SystemConfig.JOB_ID), content)).then((function () {
                        this.children.info.showJobSaveSuccess(mode, alertMode);
                    }).bind(this),
                    (function () {
                        this.children.info.showFail('job', 'update');
                    }).bind(this));
            } else {
                // create stanza with enabled job by default
                content[SystemConfig.JOB_MODE] = this.models.mode | SystemConfig.ENABLE_MODE;
                $.when(this.models.job.createStanza(content)).then(
                    (function (jobId) {
                        this.models.input.set(SystemConfig.JOB_ID, jobId);
                        this.children.info.showJobSaveSuccess(mode, alertMode);
                    }).bind(this),
                    (function () {
                        this.children.info.showFail('job', 'save');
                    }).bind(this));
            }
        },
        _showCreateAlert: function () {
            var callback = function () {
                var alert = arguments[0];
                var content = {};
                content[SystemConfig.JOB_ALERT_ID] = alert.id;
                this.models.job.updateStanza(this.models.input.get(SystemConfig.JOB_ID), content);
            };
            this.children.alert.showCreateAlert(this.models.input.get(SystemConfig.JOB_ID),
                this.models.input.get(SystemConfig.JOB_NAME),
                this.models.input.get(SystemConfig.JOB_SCHEDULE),
                this.models.input.get(SystemConfig.JOB_SEARCH), callback, this);
        },
        _showEditAlert: function () {
            var alert = new AlertModel();
            alert.set('id', this.models.input.get(SystemConfig.JOB_ALERT_ID));
            alert.fetch({
                success: function (model, response) {
                    this.children.alert.showEditAlert(alert, function(alert){}, this);
                }.bind(this),
                error: function (model, response) {
                    this.children.info.showAlertLoadFail(this.models.input.get(SystemConfig.JOB_NAME));
                }.bind(this)
            });
        }
    });
});
