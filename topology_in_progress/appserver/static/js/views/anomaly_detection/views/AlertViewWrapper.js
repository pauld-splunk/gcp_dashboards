define([
    'underscore',
    'backbone',
    'views/Base',
    'views/shared/alertcontrols/dialogs/saveas/Master',
    'views/shared/alertcontrols/dialogs/edit/Master',
    'models/search/Report',
    'splunkjs/mvc/sharedmodels',
    'collections/shared/ModAlertActions',
    'splunk.util',
    'app/views/anomaly_detection/Config'
], function (_,
             Backbone,
             BaseView,
             CreateAlertView,
             EditAlertView,
             ReportModel,
             SharedModels,
             ModAlertActionsCollection,
             SplunkUtil,
             SystemConfig) {
    return BaseView.extend({
        //  Wrap splunk built-in "save alert" and "edit alert" code
        initialize: function () {
            this.models = {};
            this.children = {};
            this.collection = {};
            // initialize model
            this.models.user = SharedModels.get('user');
            this.models.serverInfoModel = SharedModels.get('serverInfo');
            this.models.application = SharedModels.get('app');
            // alert's "request.ui_dispatch_view" always point to search page
            this.models.application.set('page', 'search');

            // initialize collection
            this.collection.alertActionsCollection = new ModAlertActionsCollection();
            this.collection.alertActionsCollection.fetch({
                data: {
                    app: this.models.application.get('app'),
                    owner: this.models.application.get('owner'),
                    search: 'disabled!=1'
                },
                addListInTriggeredAlerts: true
            });
        },

        showCreateAlert: function (id, name, scheduleType, search, saveCallBack, context) {
            var report = new ReportModel();
            report.fetch({
                data: {
                    app: this.models.application.get('app'),
                    owner: this.models.application.get('owner')
                },
                success: function (model, response) {
                    report.entry.content.set('search', 'search index="' + SystemConfig.INDEX + '" sourcetype="'
                        + SystemConfig.SOURCE_TYPE + '" ' + SystemConfig.JOB_ID + '="' + id + '" | eval total = 0 | '
                        + 'foreach outlier_* [eval outlier_count_<<MATCHSTR>> = if(<<FIELD>>=="True", 1, 0) ,' +
                        ' total = total + outlier_count_<<MATCHSTR>>] ' +
                        '| where total>0 | anomalytable | sort - Value | table _time, "Field name", Value, info_min_time, info_max_time'
                    );
                    this.children.alertDialog = new CreateAlertView({
                        model: {
                            report: report,
                            application: this.models.application,
                            user: this.models.user,
                            serverInfo: this.models.serverInfoModel
                        },
                        onHiddenRemove: true
                    });
                    //hack message alert to enable drilldown link
                    var url = 'http://' + window.location.hostname + ':' + window.location.port;
                    var data = [
                        'earliest=$result.info_min_time$',
                        'latest=$result.info_max_time$',
                        'display.general.type=' + 'visualizations',
                        'display.page.search.mode=' + 'smart',
                        'display.page.search.tab=' + 'visualizations',
                        'display.visualizations.type=' + 'custom',
                        'display.visualizations.custom.type=' + 'splunk_app_aws.anomaly_detection_viz',
                        'q=' + encodeURIComponent((search.trimLeft().charAt(0) === '|' ? '' : 'search ') + search)
                    ];
                    var message = '### You can edit your own content here ###\n\nAnomaly detection job: '+ name +
                        '\nYou can view the detected results via link: ' + url + SplunkUtil.make_full_url('app/splunk_app_aws/search?') + data.join('&');
                    var alertModel = this.children.alertDialog.model.alert;
                    alertModel.entry.content.set({
                        'action.email.message.alert': message,
                        'action.email.inline': true
                    });

                    //hack alert's default schedule time
                    var cronModel = alertModel.cron;
                    cronModel.set({'cronType': scheduleType.toLowerCase()});
                    cronModel.setDefaults = this.setDefaults.bind(cronModel);
                    cronModel.setDefaults();

                    // hack alert's earliest and latest time
                    var setAlertEarliestLatest = this.setEarliestLatest.bind(alertModel);
                    setAlertEarliestLatest();
                    alertModel.entry.content.on('change:dispatch.earliest_time', setAlertEarliestLatest);

                    this.children.alertDialog.model.alert.entry.acl.set('can_share_app', true);
                    this.children.alertDialog.model.alert.on('saveSuccess', saveCallBack.bind(context, this.children.alertDialog.model.alert));
                    this.children.alertDialog.render().appendTo($('body')).show();
                }.bind(this)
            });
        },

        showEditAlert: function (alert, editCallBack, context) {
            this.children.alertDialog = new EditAlertView({
                model: {
                    alert: alert,
                    application: this.models.application,
                    user: this.models.user,
                    serverInfo: this.models.serverInfoModel
                },
                collection: {
                    alertActions: this.collection.alertActionsCollection
                },
                onHiddenRemove: true
            });
            //hack alert's default schedule time
            var alertModel = this.children.alertDialog.model.inmem;
            alertModel.cron.setDefaults = this.setDefaults.bind(alertModel.cron);

            // hack alert's earliest and latest time
            var setAlertEarliestLatest = this.setEarliestLatest.bind(alertModel);
            setAlertEarliestLatest();
            alertModel.entry.content.on('change:dispatch.earliest_time', setAlertEarliestLatest);

            alertModel.on('sync', editCallBack.bind(context, alert));
            this.children.alertDialog.render().appendTo($('body')).show();
        },

        setDefaults: function () {
            switch (this.get('cronType')) {
                case 'hourly':
                    this.set('minute', '15');
                    break;
                case 'daily':
                    this.set('hour', '1');
                    break;
                case 'weekly':
                    this.set({
                        dayOfWeek: '1',
                        hour: '2'
                    });
                    break;
                case 'monthly':
                    this.set({
                        dayOfMonth: '1',
                        hour: '3'
                    });
                    break;
            }
        },

        setEarliestLatest: function () {
            switch (this.cron.get('cronType')) {
                case 'hourly':
                    this.entry.content.set({
                        'dispatch.earliest_time': '-1h@h',
                        'dispatch.latest_time': '@h'
                    }, {silent: true});
                    break;
                case 'daily':
                    this.entry.content.set({
                        'dispatch.earliest_time': '-1d@d',
                        'dispatch.latest_time': '@d'
                    }, {silent: true});
                    break;
                case 'weekly':
                    this.entry.content.set({
                        'dispatch.earliest_time': '-1w@d',
                        'dispatch.latest_time': '@d'
                    }, {silent: true});
                    break;
                case 'monthly':
                    this.entry.content.set({
                        'dispatch.earliest_time': '-1mon@d',
                        'dispatch.latest_time': '@d'
                    }, {silent: true});
                    break;
                default:
                    return;
            }
        }
    });
});
