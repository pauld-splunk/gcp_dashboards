define([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/simplesplunkview',
    'splunkjs/mvc/simpleform/formutils'
], (_, $, mvc, SimpleSplunkView, FormUtils) => {
    const DATE_FORMAT = 'mm/dd/yy', DAY_MILLI_SECONDS = 86400000;

    const DAILY_MACRO = '`topology-daily-snapshot-index`', MONTHLY_MACRO = '`topology-monthly-snapshot-index`', HISTORY_MACRO = '`topology-history-index`';

    const DAILY_SNAPSHOT_EXPIRED_DAYS = 186, MONTHLY_SNAPSHOT_EXPIRED_DAYS = 365;

    let tokenModel = mvc.Components.getInstance('default');

    let TimePicker = SimpleSplunkView.extend({

        events: {
            'change #timepicker': 'pickerChanged'
        },

        initialize(params) {
            this.output_mode = 'json';
            this.timepickerEle = params.el.find('#timepicker');

            this._initTokens();

            SimpleSplunkView.prototype.initialize.apply(this, arguments);
        },

        createView() {
            return {};
        },

        formatData(data) {
            let minTimestamp = parseInt(data[0].minTime) * 1000,
                maxTimestamp = Date.now();
            
            // calculate latest date from token
            let latestTimestamp = (parseInt(tokenModel.get('latest')) * 1000 || maxTimestamp);

            // set token for playback default start time
            tokenModel.set('first_snapshot_time', minTimestamp/1000);

            return {minTimestamp: minTimestamp, maxTimestamp: maxTimestamp, latestTimestamp: latestTimestamp};
        },

        updateView(viz, data) {
            let minDateString = $.datepicker.formatDate(DATE_FORMAT, new Date(data.minTimestamp));
            let maxDateString = $.datepicker.formatDate(DATE_FORMAT, new Date(data.maxTimestamp));
            let latestDateString = $.datepicker.formatDate(DATE_FORMAT, new Date(data.latestTimestamp));

            this.timepickerEle.datepicker({
                dateFormat: DATE_FORMAT,
                maxDate: maxDateString,
                minDate: minDateString
            });
            this.timepickerEle.val(latestDateString);

            this.$el.css('display', 'inline-block');

            return;
        },

        pickerChanged(model) {
            let dateInput = $(model.currentTarget).val();
            let earliest = 0, latest = 0;

            if (dateInput === '') {
                latest = Date.now();
                earliest = latest - DAY_MILLI_SECONDS;
            } else {
                earliest = $.datepicker.parseDate(DATE_FORMAT, dateInput).getTime();
                latest = earliest + DAY_MILLI_SECONDS - 1000;
            }

            this._setTokens(earliest / 1000, latest / 1000);

            FormUtils.submitForm({replaceState: true});
        },

        _initTokens() {
            tokenModel.set('earliest', '-1d');
            tokenModel.set('latest', 'now');
            tokenModel.set('topology_source_spl', `${DAILY_MACRO} OR ${HISTORY_MACRO}`);

            FormUtils.submitForm({replaceState: true});
        },

        _setTokens(earliest, latest) {
            let days_gap = (Date.now() - latest * 1000) / DAY_MILLI_SECONDS;

            // topology should be in the daily snapshot
            if(days_gap <= DAILY_SNAPSHOT_EXPIRED_DAYS) {
                tokenModel.set('earliest', earliest);
                tokenModel.set('latest', latest);
                tokenModel.set('topology_source_spl', `${DAILY_MACRO} OR ${HISTORY_MACRO}`);
            }
            // topology should be in the monthly snapshot
            else if(days_gap <= MONTHLY_SNAPSHOT_EXPIRED_DAYS){
                let date = new Date(latest * 1000),
                    currentMonth = date.getMonth();

                date.setMonth(currentMonth);
                date.setDate(1);
                tokenModel.set('earliest', date.getTime() / 1000);

                date.setMonth((currentMonth + 1) % 12);
                tokenModel.set('latest', date.getTime() / 1000);

                tokenModel.set('topology_source_spl', `${MONTHLY_MACRO}`);
            }
        },

        displayMessage() {
            return this;
        }
    });

    return TimePicker;
});