/**
 * Created by hshen on 10/6/16.
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'views/Base'
],function($, _, Backbone, BaseView){

    return BaseView.extend({
        tagName:"tr",
        className: 'table-body-tr',

        initialize: function(params){
            BaseView.prototype.initialize.apply(this, arguments);

            // Data to show
            this.data = params.data;

            // Re-render if showedDates or serviceType changed
            this.model = params.model;
            this.listenTo(this.model, 'change:showedDates', this.render);
            this.listenTo(this.model, 'change:serviceType', this.render);
        },

        render: function(){
            // Check if needs to show
            let serviceType = this.model.get('serviceType');
            if (serviceType === 'problematic' && this.data.type === 'nonproblematic') {
                this.$el.html('');
                return this;
            }

            // Service name
            let html = `<td>${this.data.service}</td>`;

            let showedDates = this.model.get('showedDates') || [];

            // Render status for each date
            html += showedDates.map((date) => {
                let status = this.data.status[date];

                if (_.isUndefined(status) || status.type === 'unknown') {
                    return '<td></td>';
                }

                // substring details
                let details = this.data.status[date].details;
                if (!_.isUndefined(details)) {
                    details = (details.length > 200 ? details.substring(0, 200) + '...' : details);
                }

                let service = this.data.service,
                    tooltip = _.template(this.popupTemplate, {
                        service: service,
                        region: this.data.status[date].region,
                        date: this.data.status[date].sentTime,
                        startTime: this.data.status[date].startTime,
                        endTime: this.data.status[date].endTime,
                        details: details,
                        resources: this.data.status[date].resources,
                        eventTypeCode: this.data.status[date].eventTypeCode
                    });

                tooltip = `data-toggle="tooltip" data-html="true" title="${tooltip}"`;

                let className = undefined;
                switch (status.type) {
                    case 'resolved':
                        className = 'icon-check-circle';
                        break;
                    case 'error':
                        className = 'icon-alert icon-alert-error';
                        break;
                    case 'warning':
                        className = 'icon-alert icon-alert-warning';
                        break;
                }

                return _.isUndefined(className) ? '<td></td>' : `<td><a target="_blank" href='${this._buildUrlForError(service, date)}'><i class="${className}" ${tooltip}></i></a></td>`;
            }).join('');

            this.$el.html(html);

            this.$('[data-toggle="tooltip"]').tooltip('destroy');
            this.$('[data-toggle="tooltip"]').tooltip({
                delay: {
                    "show": 300
                }
            });

            return this;
        },

        popupTemplate: `
            <label>Service:</label><p><%= service%></p><br/>
            <label>Region:</label><p><%= region%></p><br/>
            <label>Date:</label><p><%= date%></p><br/>
            <label>Start Time:</label><p><%= startTime%></p><br/>
            <% if (!_.isUndefined(endTime)) { %>
                <label>End Time:</label><p><%= endTime%></p><br/>
            <% } %>
            <% if (!_.isUndefined(resources)) { %>
                <label>Resource(s):</label><p><%= resources%></p><br/>
            <% } %>
            <label>Event Code:</label><p><%= eventTypeCode%></p>
            <% if (!_.isUndefined(details)) { %>
                <label>Details:</label><p><%- details%></p><br/>
            <% } %>
        `,

        _buildUrlForError(service, date) {
            return 'search?q=' + encodeURIComponent('search `aws-sqs-sourcetype` AND BodyJson.detail.service=' + service +
                ' AND BodyJson.time="' + date + '*"' +
                '| nomv BodyJson.resources{} ' +
                '| nomv BodyJson.detail.eventDescription{}.latestDescription '+
                '| rename BodyJson.time as time, BodyJson.region as region, BodyJson.resources{} as resources, BodyJson.detail.service as service, BodyJson.detail.eventTypeCode as eventTypeCode, BodyJson.detail.eventTypeCategory as eventTypeCategory, BodyJson.detail.startTime as startTime, BodyJson.detail.endTime as endTime, BodyJson.detail.eventDescription{}.latestDescription as details ' +
                '| table time, region, resources, service, eventTypeCode, eventTypeCategory, startTime, endTime, details') ;
        }

    })
});