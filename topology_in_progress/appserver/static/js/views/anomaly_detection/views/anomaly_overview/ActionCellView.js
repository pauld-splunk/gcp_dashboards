define([
    'jquery',
    'underscore',
    'backbone',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'app/views/anomaly_detection/views/AlertViewWrapper',
    'views/shared/delegates/Popdown',
    'contrib/text!app/views/anomaly_detection/templates/ActionCellTemplate.html',
    'app/views/anomaly_detection/Config',
    'app/utils/Util',
    'app/utils/HelpLinks',
    'moment'
], function ($, _, Backbone, mvc, TableView, AlertView, PopdownView, ActionCellTemplate, SystemConfig, appUtils, HelpLinks, moment) {
    // "Action" column cell render for jobs table in anomaly overview page
    var link = appUtils.buildLinkNode(HelpLinks.AWS_ANOMALY_DETECTION);
    const ALERT = 'alert';
    const JOB = 'job';
    const SCHEDULE_TYPE = {
        'hourly': 1,
        'daily': 2,
        'weekly': 3,
        'monthly': 4
    };
    const SCHEDULE_DELTA = {
        'hourly': {unit: 'hours', value: 1},
        'daily': {unit: 'days', value: 1},
        'weekly': {unit: 'days', value: 7},
        'monthly': {unit: 'months', value: 1}
    };

    return TableView.BaseCellRenderer.extend({
        initialize: function (options) {
            this.models = options.models;
            this.children = options.children;
            this.callback = options.callback;
            this.children.alert = new AlertView();
            this.scheduleCheckerMap = {};
            this._formatScheduleTimeCheckerData();
            this.listenTo(this.children.info, 'createAlert', this.createAlert.bind(this));
        },

        _formatScheduleTimeCheckerData: function () {
            var scheduleCheckerSearch = mvc.Components.get('scheduleCheckerSearch');
            var scheduleCheckerResultModel = scheduleCheckerSearch.data('results', {output_mode: 'json', count: 0});
            scheduleCheckerResultModel.on('data', (function () {
                this.scheduleCheckerMap = {};
                var results = scheduleCheckerResultModel.data().results;
                results.forEach((function (value) {
                    var type = value['is_alert'] === '1' ? ALERT : JOB;
                    if (!(value[SystemConfig.JOB_ID] in this.scheduleCheckerMap)) {
                        this.scheduleCheckerMap[value[SystemConfig.JOB_ID]] = {};
                    }
                    var earliest = 'earliest_time' in value ? value['earliest_time'] : 0;
                    var latest = 'latest_time' in value ? value['latest_time'] : 0;
                    var day = 'day' in value ? value['day'] : 0;
                    this.scheduleCheckerMap[value[SystemConfig.JOB_ID]][type] = {
                        'run_time': value['run_time'],
                        'earliest_time': earliest,
                        'latest_time': latest,
                        'day': day
                    };
                }).bind(this));
            }).bind(this));
        },

        canRender: function (cell) {
            return cell.field === 'Action';
        },

        render: function ($td, cell) {
            var job = this.models.tableModel.getJobWithId(cell.value);
            this._calEarliestLatest(job);
            this._calTrain(job);
            this._calDrilldownLink(job);
            var content = this._calAlertValidation(job);

            $td.addClass('actions');
            $td.append(_.template(ActionCellTemplate)({
                hasAlert: !_.isEmpty(job[SystemConfig.JOB_ALERT_ID]),
                isEnable: (job[SystemConfig.JOB_MODE] & SystemConfig.ENABLE_MODE) > 0,
                isScheduleError: !_.isEmpty(content),
                tooltipContent: content,
                linkNode: link
            }));
            if (!_.isEmpty(content)) {
                // enable schedule checker hint tooltip
                $td.find('.schedule-tooltip').tooltip({container: 'body'});
            }
            // popup
            new PopdownView({
                el: $td.find('.shared-alertcontrols-editmenu'),
                attachDialogTo: 'body'
            });
            // events
            $td.find('a.openInLink').click(this.openInSearch.bind(this, job));
            $td.find('a.edit-job').click(this.editJob.bind(this, job));
            $td.find('a.disable-job').click(this.changeJobStatus.bind(this, job));
            $td.find('a.enable-job').click(this.changeJobStatus.bind(this, job));
            $td.find('a.delete-job').click(this.deleteJob.bind(this, job));
            $td.find('a.create-alert').click(this.createAlert.bind(this, job));
            $td.find('a.edit-alert').click(this.editAlert.bind(this, job));
            $td.find('a.delete-alert').click(this.deleteAlert.bind(this, job));
        },

        _calEarliestLatest: function (job) {
            var schedule = job[SystemConfig.JOB_SCHEDULE];
            var train = job[SystemConfig.JOB_TRAIN];
            switch (schedule) {
                case 'Hourly':
                    job['earliest'] = '-h@h-' + train;
                    job['latest'] = '@h';
                    break;
                case 'Daily':
                    job['earliest'] = '-d@d-' + train;
                    job['latest'] = '@d';
                    break;
                case 'Weekly':
                    job['earliest'] = '-7d@d-' + train;
                    job['latest'] = '@d';
                    break;
                default:
                    job['earliest'] = '-m@d-' + train;
                    job['latest'] = '@d';
                    break;
            }
        },

        _calTrain: function (job) {
            var train = job[SystemConfig.JOB_TRAIN];
            job['trainUnit'] = train.slice(-1);
            job['trainNum'] = train.slice(0, -1);
        },

        _calDrilldownLink: function (job) {
            var data = [
                'earliest=' + job['earliest'],
                'latest=' + job['latest'],
                'display.general.type=' + 'visualizations',
                'display.page.search.mode=' + 'smart',
                'display.page.search.tab=' + 'visualizations',
                'display.visualizations.type=' + 'custom',
                'display.visualizations.custom.type=' + 'splunk_app_aws.anomaly_detection_viz',
                'q=' + encodeURIComponent((job[SystemConfig.JOB_SEARCH].trimLeft().charAt(0) === '|' ? '' : 'search ') + job[SystemConfig.JOB_SEARCH])
            ];
            job['drilldownLink'] = 'search?' + data.join('&');
        },

        _calAlertValidation: function (job) {
            var jobId = job[SystemConfig.JOB_ID];
            if (_.isEmpty(job[SystemConfig.JOB_ALERT_ID])) {
                // no alert associated
                return null;
            }
            var alert = this.models.tableModel.getAlertWithId(job[SystemConfig.JOB_ALERT_ID]);
            if(_.isNull(alert)) {
                // alert has been deleted by accident
                return null;
            }
            var alertScheduleType = alert.cron.get('cronType');
            var jobScheduleType = job[SystemConfig.JOB_SCHEDULE];
            if (alertScheduleType === 'custom') {
                alertScheduleType = this._calScheduleType(alert.cron);
                if (alertScheduleType === 'custom') {
                    // still custom cron, not handle it
                    return null;
                }
            }
            // alert's schedule period is larger than job's
            if (SCHEDULE_TYPE[jobScheduleType.toLowerCase()] < SCHEDULE_TYPE[alertScheduleType]) {
                return null;
            }
            // alert's schedule period is smaller than job's
            if (SCHEDULE_TYPE[jobScheduleType.toLowerCase()] > SCHEDULE_TYPE[alertScheduleType]) {
                return `The job is scheduled to run ${jobScheduleType.toLowerCase()} while alert is scheduled to run ${alertScheduleType}. 
                Set the alert to run at an interval equal to or larger than the job's interval.`;
            }

            if (!(jobId in this.scheduleCheckerMap)) {
                // job and alert haven't run yet
                return null;
            }
            if (!(ALERT in this.scheduleCheckerMap[jobId] && JOB in this.scheduleCheckerMap[jobId])) {
                // alert or job hasn't run yet
                return null;
            }

            // alert's schedule period is same as job's, but alert's running time is earlier than job's
            var alertRunTime = moment(parseInt(this.scheduleCheckerMap[jobId][ALERT]['run_time']) * 1000);
            var jobRunTime = moment(parseInt(this.scheduleCheckerMap[jobId][JOB]['run_time']) * 1000);

            // alert should after last job run time
            var isAfter = true;
            if (jobScheduleType === 'hourly') {
                if (alertRunTime.isBefore(jobRunTime)) {
                    isAfter = false;
                }
            } else {
                var alertRunDay = this.scheduleCheckerMap[jobId][ALERT]['day'];
                var jobRunDay = this.scheduleCheckerMap[jobId][JOB]['day'];
                // alert and job has been updated
                if (alertRunDay === jobRunDay && alertRunTime.isBefore(jobRunTime)) {
                    isAfter = false;
                }
                // current day's alert has been updated but current day's job hasn't run yet
                if(alertRunDay > jobRunDay) {
                    // get last day's alert run time
                    alertRunTime.subtract(SCHEDULE_DELTA[jobScheduleType.toLowerCase()].value, SCHEDULE_DELTA[jobScheduleType.toLowerCase()].unit);
                    isAfter = false;
                }
            }
            if (!isAfter) {
                return `The alert is scheduled to run at an earlier time (${alertRunTime.format('YYYY-MM-DD HH:mm:ss')}) than the job (${jobRunTime.format('YYYY-MM-DD HH:mm:ss')}) 
                and therefore may fail to pick up the results returned by the latest job run. Schedule the alert to run at a later time than the job.`
            }

            // alert's search time range doesn't cover job's search time range
            var alertSearchEarliest = moment(parseInt(this.scheduleCheckerMap[jobId][ALERT]['earliest_time']) * 1000);
            var alertSearchLatest = moment(parseInt(this.scheduleCheckerMap[jobId][ALERT]['latest_time']) * 1000);
            var jobSearchLatest = moment(parseInt(this.scheduleCheckerMap[jobId][JOB]['latest_time']) * 1000);
            var jobSearchEarliest = moment(parseInt(this.scheduleCheckerMap[jobId][JOB]['latest_time']) * 1000);
            // Job needs more time to calculate normal range in anomaly detection, so use search latest time to
            // calculate search earliest time
            jobSearchEarliest.subtract(SCHEDULE_DELTA[jobScheduleType.toLowerCase()].value, SCHEDULE_DELTA[jobScheduleType.toLowerCase()].unit);
            if (alertSearchEarliest.isAfter(jobSearchEarliest) || alertSearchLatest.isBefore(jobSearchLatest)) {
                return `The alert's search time range (${alertSearchEarliest.format('YYYY-MM-DD HH:mm:ss')} ~ ${alertSearchLatest.format('YYYY-MM-DD HH:mm:ss')}) 
                doesn't cover the job's (${jobSearchEarliest.format('YYYY-MM-DD HH:mm:ss')} ~ ${jobSearchLatest.format('YYYY-MM-DD HH:mm:ss')}) 
                and therefore may fail to pick up the results returned by the latest job run. Configure the alert's earliest and latest time to cover the job.`
            }

            return null;
        },

        _calScheduleType: function (cron) {
            var minute = cron.get('minute'),
                hour = cron.get('hour'),
                dayOfMonth = cron.get('dayOfMonth'),
                month = cron.get('month'),
                dayOfWeek = cron.get('dayOfWeek');
            if (month !== '*') {
                return 'custom';
            }

            if (dayOfWeek === '*' && dayOfMonth === '*' && hour === '*') {
                return 'hourly';
            }

            if (dayOfWeek === '*' && dayOfMonth === '*') {
                return 'daily';
            }

            if (dayOfWeek !== '*' && dayOfMonth === '*') {
                return 'weekly';
            }

            if (dayOfMonth !== '*') {
                return 'weekly';
            }
            return 'custom';
        },

        openInSearch: function (job) {
            window.open(job['drilldownLink']);
        },

        editJob: function (job) {
            this.models.input.set(job);
            var mode = job[SystemConfig.JOB_MODE] | SystemConfig.EDIT_MODE;
            this.children.job.show(this.models.tableModel.get('tags'), mode);
        },

        changeJobStatus: function (job, e) {
            var content = e.target.className === 'disable-job' ? 'Disable' : 'Enable';
            var mode = job[SystemConfig.JOB_MODE] ^ SystemConfig.ENABLE_MODE;
            this.children.info.showJobModeChangeConfirm(content, job[SystemConfig.JOB_ID], job[SystemConfig.JOB_NAME], mode);
        },

        deleteJob: function (job) {
            var alert = null;
            if (!_.isEmpty(job[SystemConfig.JOB_ALERT_ID])) {
                alert = this.models.tableModel.getAlertWithId(job[SystemConfig.JOB_ALERT_ID]);
            }
            this.children.info.showJobDeleteConfirm(job[SystemConfig.JOB_ID], job[SystemConfig.JOB_NAME], alert);
        },

        createAlert: function (job) {
            if(_.isString(job)) {
                // alert has been delete by accident, called by infoView
                job = this.models.tableModel.getJobWithName(job);
            }
            this.children.alert.showCreateAlert(job[SystemConfig.JOB_ID], job[SystemConfig.JOB_NAME],
                job[SystemConfig.JOB_SCHEDULE], job[SystemConfig.JOB_SEARCH], function (alert) {
                    var content = {};
                    content[SystemConfig.JOB_ALERT_ID] = alert.id;
                    $.when(this.models.job.updateStanza(job[SystemConfig.JOB_ID], content)).then((function () {
                            this.callback.jobUpdate();
                        }).bind(this),
                        (function () {
                            this.children.info.showFail('job', 'update');
                        }).bind(this));
                }, this);
        },

        editAlert: function (job) {
            var alert = null;
            if (!_.isEmpty(job[SystemConfig.JOB_ALERT_ID])) {
                alert = this.models.tableModel.getAlertWithId(job[SystemConfig.JOB_ALERT_ID]);
            }
            if (_.isNull(alert) || _.isUndefined(alert)) {
                this.children.info.showAlertLoadFail(job[SystemConfig.JOB_NAME]);
            } else {
                this.children.alert.showEditAlert(alert, function (alert) {
                    this.callback.jobUpdate();
                }, this);
            }
        },

        deleteAlert: function (job) {
            var alert = null;
            if (!_.isEmpty(job[SystemConfig.JOB_ALERT_ID])) {
                alert = this.models.tableModel.getAlertWithId(job[SystemConfig.JOB_ALERT_ID]);
            }
            this.children.info.showAlertDeleteConfirm(job[SystemConfig.JOB_ID], job[SystemConfig.JOB_NAME], alert);
        }
    });
});
