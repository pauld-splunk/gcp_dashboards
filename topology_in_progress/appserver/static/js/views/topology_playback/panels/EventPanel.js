/**
 * Created by frank on 2016-03-17
 */

define([
    'jquery',
    'underscore',
    'backbone',
    'app/views/topology_playback/utils/PlayBackControlUtil'
], function($, _, Backbone, PlayBackControlUtil){

    const DATE_FORMAT = 'mm/dd/yy';

    const MARGIN_TOP = 100;

    return Backbone.View.extend({
        template: '',

        constructor: function (options){
            Backbone.View.apply(this, arguments);

            // view listen to models
            this.listenTo(this.model.data, 'change:eventList', this._onEventListChanged);
            this.listenTo(this.model.control, 'change:isFirstRender', this._onFirstRender);
            this.listenTo(this.model.control, 'change:playing', this._toggleClickable);
       },

        render: function(){
            this.$el.html(this.template);
            return this;
        },

        _onEventListChanged: function(){
            // if it is first rendered, do not need to re-render event list
            if(this.model.control.get('isFirstRender')){
                return;
            }

            var eventList = this.model.data.get('eventList'),
                current = this.model.control.get('current'),
                step = this.model.control.get('step'),
                currentDate = new Date((current - step) * 1000),
                html = `<div>${PlayBackControlUtil.convertTimeToTooltips(currentDate, step).fullTooltip} ( ${eventList.length} event${(eventList.length>1 && "s") || ""} )</div>`;

            for(var i=0; i<eventList.length; i++){
                var event = eventList[i],
                    time = this._convertTimeToString(new Date(event.time * 1000));

                html += `<div class="event-time">${time}</div><div class="event-account">${event.account}</div><div class="event-type">${event.type}</div><div class="event-details" data-id="${event.id}">${event.details}</div><div style="clear:both;"></div>`;
            }
            this.$el.show().html(html);

            this._setListHeight();
        },

        _onFirstRender: function(){
            if(this.model.control.get('isFirstRender')){
                this.$el.empty().hide();
            }
        },

        _setListHeight: function(){
            this.$el.css('margin-top', `${MARGIN_TOP}px`).outerHeight($('#movie-panel').height() - $('#control-panel').outerHeight() - MARGIN_TOP);
        },

        _convertTimeToString: function(date){
            var hour = date.getUTCHours() <= 9 ? '0' + date.getUTCHours() : date.getUTCHours(),
                minute = date.getUTCMinutes() <= 9 ? '0' + date.getUTCMinutes() : date.getUTCMinutes();

            return `${hour}:${minute}`;
        },

        _toggleClickable: function(){
            if (this.model.control.get('playing')){
                this.$el.find('.event-details').removeClass('clickable');
            } else {
                this.$el.find('.event-details').addClass('clickable');
            }
        }
    });

});