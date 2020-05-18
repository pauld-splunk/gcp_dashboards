/**
 * Created by frank on 2016-03-17
 */

define([
    'jquery',
    'underscore',
    'backbone',
    'app/views/topology/TopologyConfig'
], function($, _, Backbone, TopologyConfig){

    const DATE_FORMAT = 'mm/dd/yy';

    return Backbone.View.extend({
        template: '\
            <div class="settings-title">Time Range</div> \
            <div class="settings-row"> \
                <label for="settings-startTime">Start day : </label><input type="text" id="settings-startTime"/> \
            </div> \
            <div class="settings-row"> \
                <label for="settings-endTime">End day : </label><input type="text" id="settings-endTime"/> \
            </div> \
            <div class="settings-buttons"> \
                <div id="settings-cancel-btn">Cancel</div> \
                <div id="settings-ok-btn">OK</div> \
            </div> \
            <div id="settings-error"> \
            </div> \
        ',

        constructor: function (options){
            Backbone.View.apply(this, arguments);

            // view listen to models
            this.listenTo(this.model, 'change:timeRange', this._fillDatepickers);

            // model invalid event
            this.model.on('invalid', (model, error) => {
                $('.settings-row input').addClass('error-input');
                this.$el.find('#settings-error').text(error).show();
            });
        },

        events: {
            'change input': '_setDatepickerLimit',
            'click #settings-ok-btn': '_changeTimeRange'
        },

        render: function(){
            this.$el.html(this.template);

            // init datepickers
            this._initDatepickers();

            return this;
        },

        _initDatepickers: function(){
            var startTime = (new Date().getTime() / 1000 - TopologyConfig.topologyChartConfig.playbackConfig.maxTimeRange) * 1000;

            this.$el.find('#settings-startTime, #settings-endTime').datepicker({
                dateFormat: DATE_FORMAT,
                minDate: new Date(startTime)
            });

            this._fillDatepickers();
        },

        _changeTimeRange: function(){
            var startStr = this.$el.find('#settings-startTime').val(),
                endStr = this.$el.find('#settings-endTime').val(),
                startTime = ($.datepicker.parseDate(DATE_FORMAT, startStr).getTime()) / 1000,
                endTime = ($.datepicker.parseDate(DATE_FORMAT, endStr).getTime() + 86399000) / 1000;

            this.model.unset('current', {silent: true});

            this.model.set({
                timeRange: {
                    start: startTime,
                    end: endTime
                },
                current: startTime,
                isFirstRender: true,
                playing: false
            }, {
                validate: true
            });
        },

        _fillDatepickers: function(){
            var start = this.model.get('timeRange').start,
                end = this.model.get('timeRange').end,
                startDate = new Date(start * 1000),
                endDate = new Date(end * 1000),
                startStr = $.datepicker.formatDate(DATE_FORMAT, startDate),
                endStr = $.datepicker.formatDate(DATE_FORMAT, endDate);

            this.$el.find('#settings-startTime').val(startStr);
            this.$el.find('#settings-endTime').val(endStr);
            this.$el.find('input').removeClass('error-input');
            this.$el.find('#settings-error').hide();

            this._setDatepickerLimit();
        },

        _setDatepickerLimit: function(){
            var maxDate = $.datepicker.parseDate(DATE_FORMAT, this.$el.find('#settings-endTime').val()),
                minDate = $.datepicker.parseDate(DATE_FORMAT, this.$el.find('#settings-startTime').val());

            this.$el.find('#settings-startTime').datepicker('option', 'maxDate', maxDate);

            this.$el.find('#settings-endTime').datepicker('option', 'minDate', minDate);
        },

        resetFields: function(){
            this._fillDatepickers();
        }
    });

});