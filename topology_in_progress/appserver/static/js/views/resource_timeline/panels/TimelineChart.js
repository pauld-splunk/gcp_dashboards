/**
 * Created by frank on 2016-09-05
 */

define([
    'underscore',
    'backbone',
    'jquery',
    'splunkjs/mvc',
    'app/utils/DialogManager',
    'app/views/dashboard/MessageView',
    'app/views/resource_timeline/TimelineConstants'
], function(_, Backbone, $, mvc, DialogManager, MessageView, TimelineConstants) {

    var tokenModel = mvc.Components.getInstance('default');

    const SQS_CUSTOM_EVENTS_FORMAT = {
        "title": "Your Title.",
        "description": "Your Description.",
        "resourceId": "AWS Resource ID",
        "accountId": "AWS Account ID",
        "region": "AWS Region"
    };

    return Backbone.View.extend({

        constructor: function (options){
            Backbone.View.apply(this, arguments);

            this.model = options.model;

            this.listenTo(this.model, 'change:events', this.render);
            this.listenTo(this.model, 'change:warningMessage', this.renderWarningMessage);
            this.listenTo(this.model, 'change:loading', this.loading);

            $('body').on('click', '#sqs-custom-events-example', () => {
                DialogManager.showConfirmDialog({
                    title: 'SQS Custom Events Format',
                    content: `<pre>${JSON.stringify(SQS_CUSTOM_EVENTS_FORMAT, null, 2)}</pre>`
                })
            });
        },

        template: '<div id="timeline-chart-panel"></div><div id="timeline-chart-tips"></div>',

        events: {
            'mouseover .timeline-color-text': '_onColorTextHover',
            'mouseout .timeline-color-text': '_onColorTextBlur'
        },

        loading: function() {
            if (this.model.get('loading')) {
                this.$el.html(`<img class='timeline-tooltip' width='40px' height='40px' src='${TimelineConstants.LOADING_IMAGE}'/>`);
            }
        },

        renderWarningMessage: function() {
            this.$el.html(`<p class='timeline-tooltip'>${this.model.get('warningMessage')}</p>`);
            return this;
        },

        renderColorTips: function() {
            var colorTipsHTML = '';

            this.resources.forEach((resourceId, index) => {
                colorTipsHTML += `<div data-resource='${resourceId}' class='timeline-color-text'>${resourceId}</div><div style='background:${TimelineConstants.SPLUNK_COLOR_LIST[index % TimelineConstants.SPLUNK_COLOR_LIST.length]}' class='timeline-color-block'></div>`;
            });

            this.$('#timeline-chart-tips').html(`<div>${colorTipsHTML}</div>`);
        },

        render: function(){
            // show tooltips
            MessageView.clearAllMessages('info');
            MessageView.setMessage('resourceTimeline',`This timeline chart will show historical events of specified service(s). The maximum event count is ${TimelineConstants.MAX_COUNT}.`, undefined, 'info');

            if (tokenModel.get('services') && tokenModel.get('services').indexOf(TimelineConstants.SQS_CUSTOM_EVENTS) !== -1) {
                MessageView.setMessage('sqsCustomEventsTip', 'For SQS Custom Events, the timeline chart will only show those of the specific JSON format that pre-defined. <a href="javascript:;" id="sqs-custom-events-example">Here is an example.</a>', undefined, 'info');
            }

            var eventsData = this.model.get('events'),
                timelineEvents = [];

            if (eventsData.length === 0) {
                this.$el.html('<p class="timeline-tooltip">No data</p>');
                return this;
            }

            this.$el.html(this.template);

            // get resource tokens
            this.resources = tokenModel.get('form.resources');

            if (!_.isArray(this.resources)) {
                this.resources = [this.resources];
            }

            // if it is elb, then need to extract elb names
            if ([TimelineConstants.RESOURCE_TYPE_CLB, TimelineConstants.RESOURCE_TYPE_ALB, TimelineConstants.RESOURCE_TYPE_KP].indexOf(tokenModel.get('resourceType')) !== -1) {
                this.resources = _.map(this.resources, (resource) => resource.split('#')[0]);
            }

            // transform events to timeline json data
            eventsData.forEach((event) => {
                // show icon is there is one
                var media = {},
                    serviceThumbNail = '';
                if (TimelineConstants.ICONS[event.service]) {
                    media = {
                        media: {
                            thumbnail: TimelineConstants.ICONS[event.service]
                        }
                    };
                    serviceThumbNail = `<img src="${TimelineConstants.ICONS[event.service]}" width="30" height="30"/>`;
                }

                timelineEvents.push($.extend({
                    start_date: event.date,
                    end_date: event.date,
                    text: {
                        headline: this._getTimeLineHeader(event),
                        text: `\
                            <table class='timeline-content-table'> \
                                <tr> \
                                    <th>Service: </th><td>${serviceThumbNail}${TimelineConstants.SERVICE_READABLE_NAMES[event.service]}</td> \
                                </tr> \
                                <tr> \
                                    <th>Account ID: </th><td>${event.accountId}</td> \
                                </tr> \
                                <tr> \
                                    <th>Region: </th><td>${event.region}</td> \
                                </tr> \
                            </table> \
                            <table class='timeline-content-div'>${this._getTimeLineDetails(event)}</table> `
                    },
                    nav_background: this._getNavBackgroundColor(event)
                }, media));
            });

            // render timeline chart
            new TL.Timeline('timeline-chart-panel', {
                events: timelineEvents
            }, {
                start_at_slide: 0
            });

            // render color tips
            if (!_.isEqual(this.resources, ['*'])) {
                this.renderColorTips();
            }

            return this;
        },

        _getTimeLineHeader: function(event) {
            var resourceType = tokenModel.get('resourceType');

            if (event.service === TimelineConstants.CLOUDTRAIL_SERVICE) {
                if (resourceType === TimelineConstants.RESOURCE_TYPE_IAM_USER) {
                    return `${event.changeType.split(/(?=[A-Z])/).join(' ')} By ${event.userName}`;
                }

                return `${event.changeType.split(/(?=[A-Z])/).join(' ')} ${event.resourceId}`;
            }
            else if (event.service === TimelineConstants.INSPECTOR_SERVICE) {
                return `Inspector Finding for ${event.resourceId}`;
            }
            else if (event.service === TimelineConstants.CONFIG_RULE_SERVICE) {
                return `Non-compliant Resource ${event.resourceId}`;
            }
            else if (event.service === TimelineConstants.PERSONAL_HEALTH_SERVICE) {
                return `AWS Personal Health for ${event.resourceId}`;
            }
            else if (event.service === TimelineConstants.SQS_CUSTOM_EVENTS) {
                return event.title;
            }
            else {
                return `${TimelineConstants.CHANGE_TYPE_READABLE_NAMES[event.changeType] || event.changeType} ${event.resourceId}`;
            }
        },

        _getTimeLineDetails: function(event) {
            var whiteList = TimelineConstants.CHANGE_PROPERTIES_WHITE_LIST[event.service],
                detailsHTML = '';

            if (whiteList) {
                for (var attribute in whiteList) {
                    if (!_.isUndefined(event.changeProperties[attribute])) {
                        var propertyText = (whiteList[attribute].makeText ? whiteList[attribute].makeText(event.changeProperties[attribute]) : event.changeProperties[attribute]);
                        detailsHTML += `<tr><th>${whiteList[attribute].label}:</th><td>${propertyText}</td></tr>`;
                    }
                }
            }

            return detailsHTML;
        },

        _getNavBackgroundColor: function(event) {
            var resourceId = event.resourceId,
                index = this.resources.indexOf(resourceId);

            if (index === -1) {
                return TimelineConstants.SPLUNK_COLOR_LIST[0];
            }

            return TimelineConstants.SPLUNK_COLOR_LIST[index % TimelineConstants.SPLUNK_COLOR_LIST.length];
        },

        _onColorTextHover: function(event) {
            var ele = $(event.target),
                resourceId = ele.attr('data-resource'),
                resourceType = tokenModel.get('resourceType');

            if (resourceType === TimelineConstants.RESOURCE_TYPE_IAM_USER) {
                var tempArr = resourceId.split('/');
                resourceId = tempArr[tempArr.length - 1];
            }

            // set opacity for color tips
            this.$('.timeline-color-text, .timeline-color-block').css('opacity', 0.1);
            ele.css('opacity', 1).next('.timeline-color-block').css('opacity', 1);

            // set opacity for timeline cursors
            this.$('.tl-timemarker-content-container').removeClass('hover').addClass('blur');
            this.$(`.tl-timemarker[id*="${resourceId}"] .tl-timemarker-content-container`).removeClass('blur').addClass('hover');
        },

        _onColorTextBlur: function() {
            this.$('.timeline-color-text, .timeline-color-block').css('opacity', 1);
            this.$('.tl-timemarker-content-container').removeClass('hover').removeClass('blur');
        }
    });
});