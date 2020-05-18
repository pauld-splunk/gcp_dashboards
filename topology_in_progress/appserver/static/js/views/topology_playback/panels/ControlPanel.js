/**
 * Created by frank on 2016-02-17
 */

define([
    'jquery',
    'underscore',
    'backbone',
    'app/libs/d3.min',
    'app/views/topology_playback/utils/PlayBackControlUtil',
    'app/views/topology_playback/utils/KeyFrameUtil',
    'app/views/topology/TopologyConfig',
    'app/views/topology_playback/panels/SettingsPanel',
    'app/views/topology_playback/utils/AnimationLocker'
], function($, _, Backbone, d3, PlayBackControlUtil, KeyFrameUtil, TopologyConfig, SettingsPanel, AnimationLocker){

    const MINUTE_UNIT = 60, HOUR_UNIT = 3600, DAY_UNIT = 86400; // (unit: s)

    const COLUMN_BORDER = 1, COLUMN_CHART_MARGIN = 20;

    return Backbone.View.extend({
        template: '\
            <div id="playback-settings"></div> \
            <div class="buttons-control"> \
                <div class="settings-control"> \
                    <div id="time-range-setting">Settings</div> \
                    <div id="time-range-refresh"></div> \
                </div> \
                <div class="play-control"> \
                    <div id="play-stop-btn" class="control-btn stop"></div> \
                </div> \
            </div> \
            <div class="progress-control"> \
                <div class="progress-label-area"></div> \
                <svg></svg> \
                <div id="progress-title-tooltip"><p class="smallFont"></p></div> \
                <div id="progress-tooltip-start"><p class="smallFont"></p></div> \
                <div id="progress-tooltip-end"><p class="smallFont"></p></div> \
                <div id="progress-cursor"></div> \
                <div id="progress-time-range"></div> \
            </div> \
        ',

        constructor: function (options){
            Backbone.View.apply(this, arguments);

            // create views
            this.settingsPanel = new SettingsPanel({
                model: this.model
            });

            // view listen to models
            this.listenTo(this.model, 'change:playing', this._onPlayStatusChange);
            this.listenTo(this.model, 'change:current', this._onCurrentFrameChange);
            this.listenTo(this.model, 'change:timeRange', this.renderProgressChart);

            // listen to lock status
            this.listenTo(AnimationLocker, 'change', this._onLockChange);
        },

        render: function(){
            this.$el.html(this.template);
            this.$el.find('#playback-settings').append(this.settingsPanel.render().$el);

            return this;
        },

        events: {
            'click .play': '_play',
            'click .stop': '_stop',
            'click .progress-control>svg': '_changeCursor',
            'mousedown .progress-control>svg': '_onTimeRangeDragStart',
            'mousemove .progress-control': '_onTimeRangeDragging',
            'mouseup .progress-control': '_onTimeRangeDragStop',
            'click #time-range-refresh': '_resetTimeRange',
            'click #time-range-setting': '_toggleSettingsPanel',
            'click #settings-cancel-btn': '_hideSettingPanel'
        },


        /******************
         * event handlers *
        *******************/

        _play: function(){
            // wait until render completes
            if(AnimationLocker.lock(this)){
                this.model.set('playing', true);
            }
        },

        _stop: function(){
            this.model.set('playing', false);
        },

        _changeCursor: function(evt){
            // if user changed cursor last time, needs to wait till render completes
            if(!AnimationLocker.lock(this)){
                $('#progress-time-range').removeAttr('dragStart');
                return;
            }

            if($('#progress-time-range').attr('dragging')){
                return;
            }

            $('#progress-time-range').removeAttr('dragStart');

            var cursorLeft = evt.clientX,
                progressLeft = $('.progress-control>svg').offset().left,
                progressWidth = $('.progress-control>svg').width() - this.columnWidth,
                start = this.model.get('timeRange').start,
                end = this.model.get('timeRange').end,
                newCurrent = (cursorLeft - progressLeft) * (end - start) / progressWidth + start;

            this.model.set({
                current: newCurrent,
                isFirstRender: true,
                playing: false
            });
        },

        _onTimeRangeDragStart: function(evt){
            if(this._isTimeRangeDragStart(evt)){
                var left = evt.clientX - $('.progress-control>svg').offset().left + COLUMN_CHART_MARGIN;

                $('#progress-time-range').css({
                    left: left + 'px',
                    width: '0px'
                }).attr('dragStart', 'dragStart').removeAttr('dragging');
            }
        },

        _onTimeRangeDragging: function(evt){
            if(this._isTimeRangeDragging(evt)){
                // when dragging, stop playing
                this.model.set('playing', false);

                var dragElement = $('#progress-time-range');
                dragElement.show().attr('dragging', 'dragging').css('width', evt.clientX - dragElement.offset().left + 'px');

                var startTooltipElement = $('#progress-tooltip-start'),
                    endTooltipElement = $('#progress-tooltip-end'),
                    startTooltipText = $('#progress-tooltip-start>p'),
                    endTooltipText = $('#progress-tooltip-end>p');

                var timeRange = this._calculateTimeRange();
                this._validateTimeRange(timeRange);

                var startDate = new Date(timeRange.start * 1000),
                    endDate = new Date(timeRange.end * 1000),
                    startDateTooltip = PlayBackControlUtil.convertTimeToTooltips(startDate, this.model.get('step')).fullTooltip,
                    endDateTooltip = PlayBackControlUtil.convertTimeToTooltips(endDate, this.model.get('step')).fullTooltip;

                startTooltipText.text(startDateTooltip);
                endTooltipText.text(endDateTooltip);

                startTooltipElement.css('left', parseInt(dragElement.css('left')) - startTooltipElement.width() / 2 + 'px').show();
                endTooltipElement.css('left', parseInt(dragElement.css('left')) + dragElement.width() - startTooltipElement.width() / 2 + 'px').show();
            }
        },

        _onTimeRangeDragStop: function(evt){
            if(this._isTimeRangeDragStop(evt)){
                var dragElement = $('#progress-time-range');
                dragElement.removeAttr('dragStart');

                var timeRange = this._calculateTimeRange();

                if(this._validateTimeRange(timeRange)){
                    // set model
                    this.model.set({
                        playing: false,
                        timeRange: timeRange,
                        current: timeRange.start,
                        isFirstRender: true
                    });
                }

                dragElement.hide();

                $('#progress-tooltip-start, #progress-tooltip-end').hide();
            }
        },

        _calculateTimeRange: function(){
            var dragElement = $('#progress-time-range'),
                progressElement = $('.progress-control>svg');

            // calculate time range
            var start = this.model.get('timeRange').start,
                end = this.model.get('timeRange').end,
                newStart = start + (end - start) * (dragElement.offset().left - progressElement.offset().left) / (progressElement.width() - this.columnWidth),
                newEnd = start + (end - start) * (dragElement.width() + dragElement.offset().left - progressElement.offset().left) / (progressElement.width() - this.columnWidth);

            return {
                start: newStart,
                end: newEnd
            };
        },

        _validateTimeRange: function(timeRange){
            if((timeRange.end - timeRange.start) < 86400){
                this.$el.find('#progress-time-range, #progress-tooltip-start, #progress-tooltip-end').addClass('error');
                return false;
            }
            else{
                this.$el.find('#progress-time-range, #progress-tooltip-start, #progress-tooltip-end').removeClass('error');
                return true;
            }
        },

        _isTimeRangeDragging: function(evt){
            var progressElement = $('.progress-control'),
                dragElement = $('#progress-time-range');

            return AnimationLocker.lock(this)
                && dragElement.attr('dragStart')
                && evt.clientX >= dragElement.offset().left
                && evt.clientX <= (progressElement.offset().left + progressElement.width() - this.columnWidth);
        },

        _isTimeRangeDragStop: function(evt){
            var progressElement = $('.progress-control'),
                dragElement = $('#progress-time-range');

            return AnimationLocker.lock(this)
                && dragElement.attr('dragStart')
                && dragElement.attr('dragging')
                && evt.clientX >= dragElement.offset().left
                && evt.clientX <= (progressElement.offset().left + progressElement.width() - this.columnWidth);
        },

        _isTimeRangeDragStart: function(evt){
            var progressElement = $('.progress-control'),
                dragElement = $('#progress-time-range');

            return AnimationLocker.lock(this)
                && !dragElement.attr('dragStart')
                && evt.clientX >= progressElement.offset().left
                && evt.clientX <= (progressElement.offset().left + progressElement.width() - this.columnWidth);
        },

        _resetTimeRange: function(){
            var startTime = parseInt(sessionStorage['playback-startTime']),
                endTime = parseInt(sessionStorage['playback-endTime']);

            // after rendering progress panel, update current attribute to place the cursor
            // reset model
            this.model.unset('current', {silent: true});
            this.model.set({
                timeRange: {
                    start: startTime,
                    end: endTime
                },
                current: startTime,
                isFirstRender: true,
                playing: false
            });
        },

        _toggleSettingsPanel: function(){
            this.$el.find('#playback-settings').toggle();
            this.settingsPanel.resetFields();
        },

        _hideSettingPanel: function(){
            this.$el.find('#playback-settings').hide();
        },


        /*************************
         * model change handlers *
        **************************/

        _onLockChange: function(){
            if(AnimationLocker.canLock(this)){
                this.$el.find('.play, .progress-control').removeClass('lock-disabled');
            }
            else{
                this.$el.find('.play, .progress-control').addClass('lock-disabled');
            }
        },

        _onPlayStatusChange: function() {
            var isPlay = this.model.get('playing'),
                playBtn = $('#play-stop-btn');

            if(isPlay){
                playBtn.removeClass('play').addClass('stop');
            }
            else{
                playBtn.removeClass('stop').addClass('play');
            }
        },

        renderProgressChart: function(){
            var progressWidth = this.$el.width() - this.$el.find('.buttons-control').outerWidth() - COLUMN_CHART_MARGIN,
                progressHeight = this.$el.height() - this.$el.find('.progress-label-area').height(),
                startTime = this.model.get('timeRange').start,
                endTime = this.model.get('timeRange').end,
                timeRange = endTime - startTime,
                minColumnWidth = TopologyConfig.topologyChartConfig.playbackConfig.minColumnWidth,
                maxColumnHeight = progressHeight,
                keyFrameCountList = this.model.get('keyFrameCountList');

            // compute key frame unit, based on the minimum width of columns in chart
            var unit = DAY_UNIT;

            // if less than 7 days, use hour or minute
            if(timeRange < 7 * DAY_UNIT){
                var unitArr = [MINUTE_UNIT, HOUR_UNIT];

                for(var i = 0; i < unitArr.length; i++){
                    if(progressWidth / (timeRange / unitArr[i]) >= minColumnWidth){
                        unit = unitArr[i];
                        break;
                    }
                }
            }

            // set step in control model
            this.model.set('step', unit);

            // column width
            this.columnWidth = progressWidth / ((timeRange / unit) + 1);

            if(unit !== MINUTE_UNIT){
                keyFrameCountList = this._convertUnitInFrames(keyFrameCountList);
            }

            // get max count and subList from start-time to end-time
            var maxCount = 0,
                dataList = [];
            for(var i=0; i<keyFrameCountList.length; i++){
                if(keyFrameCountList[i].time >= endTime){
                    break;
                }
                if(keyFrameCountList[i].time >= startTime){
                    dataList.push(keyFrameCountList[i]);
                    if(keyFrameCountList[i].count > maxCount){
                        maxCount = keyFrameCountList[i].count;
                    }
                }
            }

            // insert columns
            d3.select('.progress-control>svg>g').remove();

            d3.select('.progress-control>svg')
                .attr({
                    width: progressWidth,
                    height: progressHeight
                })
                .style('margin-left', `${COLUMN_CHART_MARGIN}px`)
                .append('g')
                .selectAll('rect')
                .data(dataList)
                .enter()
                .append('rect')
                .attr('width', this.columnWidth - 2 * COLUMN_BORDER)
                .attr('height', d => maxColumnHeight * d.count / maxCount)
                .attr('y', d => progressHeight - maxColumnHeight * d.count / maxCount  - COLUMN_BORDER)
                .attr('x', d => (d.time - startTime) * (progressWidth - this.columnWidth) / timeRange);

            var timelineArea = this.$el.find('.progress-label-area'),
                timelineLabels = PlayBackControlUtil.generateTimelineLabels(startTime, endTime);

            timelineArea.empty();

            _.each(timelineLabels, (item) => {
                if(item.time < startTime || item.time > endTime){
                    return;
                }

                var time = item.time,
                    label = item.label,
                    left = (time - startTime) * (progressWidth - this.columnWidth) / timeRange + COLUMN_CHART_MARGIN;

                var label = $(`<div>${label}</div>`);

                timelineArea.append(label);

                // set position of label
                label.css('left', `${left}px`);
            });
        },

        _convertUnitInFrames(keyFrameCountList){
            var newCountMap = {},
                unit = this.model.get('step');

            for(var i=0; i<keyFrameCountList.length; i++){
                var time = PlayBackControlUtil.convertTimeInUnit(keyFrameCountList[i].time, unit);
                newCountMap[time] = newCountMap[time] ? newCountMap[time] + keyFrameCountList[i].count : keyFrameCountList[i].count;
            }

            var timeList = Object.keys(newCountMap).sort(),
                newKeyFrameCountList = [];

            for(var i=0; i<timeList.length; i++){
                newKeyFrameCountList.push({
                    time: timeList[i],
                    count: newCountMap[timeList[i]]
                });
            }

            return newKeyFrameCountList;
        },

        _onCurrentFrameChange: function(){
            var current = this.model.get('current'),
                progressWidth = $('.progress-control>svg').width() - this.columnWidth,
                start = this.model.get('timeRange').start,
                end = this.model.get('timeRange').end;

            $('#progress-cursor, #progress-title-tooltip').css('left', Math.max((current - start) * progressWidth / (end - start) - this.columnWidth / 2 - COLUMN_BORDER * 2 + COLUMN_CHART_MARGIN, COLUMN_CHART_MARGIN));

            this._showTooltips();
        },

        _showTooltips: function(){
            var current = this.model.get('current'),
                step = this.model.get('step'),
                currentDate = new Date((current - step) * 1000); // the tooltip of current cursor needs to be the previous one

            var tooltips = PlayBackControlUtil.convertTimeToTooltips(currentDate, step);

            $('#progress-title-tooltip>p').text(tooltips.simpleTooltip);

            var fullTooltip = tooltips.fullTooltip;

            // check if contains time
            if(fullTooltip.indexOf(':') === -1){
                fullTooltip = `23:59, ${fullTooltip}`;
            }
            $('#playback-title-tooltip').text(fullTooltip);
        }
    });
});