define([
    'underscore',
    'jquery',
    'backbone',
    'splunkjs/mvc',
    'app/models/AnomalyConfigs',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/searchmanager',
    'app/views/anomaly_detection/views/InfoView',
    'app/views/anomaly_detection/views/JobView',
    'app/views/anomaly_detection/views/anomaly_overview/ActionCellView',
    'app/views/anomaly_detection/views/anomaly_overview/DetailRender',
    'app/views/anomaly_detection/views/anomaly_overview/TagsInputView',
    'app/views/anomaly_detection/Config'
], function (_, $, Backbone, mvc, JobModel, TableView, SearchManager, InfoView, JobView, ActionCellView, DetailRender, TagsInputView, SystemConfig) {
    return TableView.extend({
        initialize: function () {
            TableView.prototype.initialize.apply(this, arguments);

            // models initialize
            this.models = {};
            this.models.input = new Backbone.Model();
            this.models.job = new JobModel();
            this.models.tableModel = this.settings.get('models').tableModel;

            // views initialize
            this.children = {};
            this.children.job = new JobView({
                models: {
                    input: this.models.input
                }
            });
            this.children.tag = new TagsInputView({
                el: $('#tags').find('input')
            });
            this.children.info = new InfoView();

            // callback initialize
            this.callback = this.settings.get('callback');

            this.addCellRenderer(new ActionCellView({
                models: {
                    input: this.models.input,
                    tableModel: this.models.tableModel,
                    job: this.models.job
                },
                children: {
                    info: this.children.info,
                    job: this.children.job
                },
                callback: this.callback
            }));
            this.addRowExpansionRenderer(new DetailRender({
                models: {
                    input: this.models.input,
                    application: this.models.application,
                    tableModel: this.models.tableModel
                }
            }));
            //events
            this.listenTo(this.children.job, 'saveJob', this._updateJobContent.bind(this));
            this.listenTo(this.children.info, 'changeJobMode', this._updateJobMode.bind(this));
            this.listenTo(this.children.info, 'deleteJob', this._deleteJob.bind(this));
            this.listenTo(this.children.info, 'deleteAlert', this._deleteAlert.bind(this));
        },
        _updateJobContent: function () {
            var id = this.models.input.get(SystemConfig.JOB_ID);
            var content = _.pick(this.models.input.toJSON(), SystemConfig.JOB_NAME, SystemConfig.JOB_DESCRIPTION, SystemConfig.JOB_PRIORITY, SystemConfig.JOB_SCHEDULE,
                SystemConfig.JOB_TRAIN, SystemConfig.JOB_TAGS);
            // update stanza
            $.when(this.models.job.updateStanza(id, content)).then((function () {
                    this.callback.allUpdate();
                    this.children.tag.startSearch();
                }).bind(this),
                (function () {
                    this.children.info.showFail('job', 'update');
                }).bind(this));
        },
        _updateJobMode: function (id, mode) {
            var content = {};
            content[SystemConfig.JOB_MODE] = mode;
            // update stanza
            $.when(this.models.job.updateStanza(id, content)).then((function () {
                    this.callback.jobUpdate();
                }).bind(this),
                (function () {
                    this.children.info.showFail('job', 'update');
                }).bind(this));
        },
        _deleteJob: function (id, alert) {
            $.when(this.models.job.deleteStanza(id)).then(
                (function () {
                    if (!_.isEmpty(alert)) {
                        this._deleteAlert(id, alert, false);
                    }
                    // update anomaly_schedule_checker.csv (delete job and alert related info) when delete job.
                    var updateSpl = _.template(SystemConfig.UPDATE_SCHEDULE_CHECKER_JOB_SPL);
                    new SearchManager({
                        search: updateSpl({jobId: id})
                    });
                    this.callback.allUpdate();
                    this.callback.scheduleCheckerUpdate();
                    this.children.tag.startSearch();
                }).bind(this),
                (function () {
                    this.children.info.showFail('job', 'delete');
                }).bind(this));
        },
        _deleteAlert: function (id, alert, updateStanza) {
            alert.destroy({wait: true});
            if (updateStanza) {
                var content = {};
                content[SystemConfig.JOB_ALERT_ID] = '';
                $.when(this.models.job.updateStanza(id, content).then((function () {
                        // update anomaly_schedule_checker.csv(delete alert related info) when delete alert.
                        var updateSpl = _.template(SystemConfig.UPDATE_SCHEDULE_CHECKER_ALERT_SPL);
                        new SearchManager({
                            search: updateSpl({jobId: id})
                        });
                        this.callback.jobUpdate();
                        this.callback.scheduleCheckerUpdate();
                    }).bind(this),
                    (function () {
                        this.children.info.showFail('job', 'update');
                    }).bind(this)));
            }
        },
        render: function () {
            TableView.prototype.render.apply(this, arguments);
            this.$el.append(this.children.info.render());
            this.$el.append(this.children.job.render());
        }
    });
});