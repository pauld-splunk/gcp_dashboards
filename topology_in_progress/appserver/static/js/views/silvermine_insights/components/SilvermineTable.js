/**
 * Created by hshen on 10/10/16.
 */
define([
    'underscore',
    'jquery',
    'util/moment',
    'splunkjs/mvc/simplesplunkview',
    'app/views/silvermine_insights/components/table/SilvermineRow',
    'app/views/silvermine_insights/components/table/SilvermineFooter'
], (_, $,  moment, SimpleSplunkView, SilvermineRow , SilvermineFooter) => {

    class SilvermineTable extends SimpleSplunkView {

        constructor(params){
            super(params);
        }

        initialize(params) {
            SimpleSplunkView.prototype.initialize.apply(this, arguments);

            this.output_mode = "json";

            // Show data for 15 days at max
            this.MAX_DATES_NUM = 15;

            this.model = params.model;
        }

        createView() {
            this.$el.html(_.template(this.template())());

            this._buildFooter();

            return {};
        }

        formatData(data) {
            let formattedData = {};

            $.each(data, (index, item) => {
                // Get fields from search results
                let {service, date, region, eventTypeCode, eventTypeCategory, details, time, startTime, endTime, resources} = item,
                    dateType = 'unknown';

                if (this._isResolved(eventTypeCategory, endTime)) {
                    dateType = 'resolved';
                } else if (eventTypeCategory==='issue') {
                    dateType = 'error';
                } else if (eventTypeCategory === 'accountNotification' || eventTypeCategory==='scheduledChange') {
                    dateType = 'warning';
                }

                let statusDetails = {region: region, eventTypeCode: eventTypeCode, resources: resources, details: details, type: dateType, sentTime: `${date} ${time}`, startTime: startTime, endTime: endTime};

                // Add dates to status
                if (formattedData[service]) {
                    formattedData[service].status[date] = statusDetails

                    // if there is an error in this service, an entire row will be shown when "Problematic Only"
                    if (dateType === 'error') {
                        formattedData[service].type = 'problematic';
                    }
                }
                // Create new service item
                else {
                    formattedData[service] = {};
                    formattedData[service].status = {};
                    formattedData[service].status[date] = statusDetails;
                    formattedData[service].type = dateType == 'error' ? 'problematic':'nonproblematic';
                }
            });
            return formattedData;
        }

        updateView(viz, data) {
            // Update model
            let allDates = this._getAllDatesByData(data);
            this.model.set('allDates', allDates);
            this.model.set('showedDates', this._getShowedDates(allDates));

            // Remove previous rows of the table
            this.$('tbody').empty();

            // Render new rows
            $.each(data, function(key, item){
                let row = new SilvermineRow({
                    model: this.model,
                    data: {
                        service: key,
                        type: item.type,
                        status: item.status
                    }
                });
                this.$('tbody').append(row.render().el);
            }.bind(this));

            return;
        }

        template() {
            return '<table class="silvermine-table table  table-chrome table-striped table-border">\
                        <tbody class="table-body">\
                        </tbody>\
                    </table>'
        }

        _buildFooter() {
            // Render footer of table
            let footer = new SilvermineFooter({
                model: this.model
            });
            this.$('table').append(footer.render().el);
        }

        // Get date range for search results, returns an array whose item is like 'YYYY-mm-dd'
        _getAllDatesByData(data) {
            // Get the start and end date
            let startDate = '';
            let endDate = '';
            $.each(data, function (index, item) {
                $.each(item.status, function (date, value) {
                    if (startDate === '' && endDate === '') {
                        startDate = date;
                        endDate = date;
                        return true;
                    }
                    if (date < startDate) {
                        startDate = date;
                    }
                    else if (date > endDate) {
                        endDate = date;
                    }
                });
            });

            // Get dates between the two dates
            startDate = new Date(startDate);
            endDate = new Date(endDate);
            let dateArray = [];
            let currentDate = startDate;
            while (currentDate <= endDate) {
                dateArray.push(currentDate.toISOString().substring(0, 10));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return dateArray;
        }

        // Return the last 15 dates
        _getShowedDates(allDates) {
            return allDates.slice(-this.MAX_DATES_NUM);
        }

        _isResolved(eventTypeCategory, endTime) {
            // for issues, not null endTime means "Resolved"
            if (eventTypeCategory === 'issue' && endTime) {
                return true;
            }
            // for scheduledChange events, only endTime exists and current time > endTime means "Resolved"
            else if (eventTypeCategory === 'scheduledChange' && endTime) {
                // compare UTC time: current and endTime
                let currentTimeInSec = moment().unix(),
                    endTimeInSec = moment(endTime).unix() - moment(endTime).zone() * 60;

                return currentTimeInSec > endTimeInSec;
            }
            return false;
        }
    }

    return SilvermineTable;
});
