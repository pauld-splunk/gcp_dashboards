/**
 * Created by frank on 2016-02-17
 */

define([
    'backbone',
    'app/models/PlayBackControl',
    'app/models/PlayBackData',
    'app/views/topology_playback/panels/ControlPanel',
    'app/views/topology_playback/panels/MoviePanel',
    'app/views/topology_playback/PlayBackDataBuilder',
    'app/views/topology_playback/utils/PlayBackControlUtil'
], function(Backbone, PlayBackControl, PlayBackData, ControlPanel, MoviePanel, PlayBackDataBuilder, PlayBackControlUtil){

    const DAY_UNIT = 86400;

    const VIEW_MARGIN = 30;

    return Backbone.View.extend({
        template:'\
            <div id="playback-wrapper"> \
                <div id="movie-panel"></div> \
                <div id="playback-title-tooltip"></div> \
                <div id="button-panel"> \
                    <div id="fullscreen-toggle" data-toggle="tooltip" data-placement="bottom" title="Full Screen"></div> \
                    <div id="event-list-toggle" data-toggle="tooltip" data-placement="bottom" title="Detailed List of Events" class="closed"></div> \
                </div> \
                <div id="control-panel"></div> \
                <div id="play-close"></div> \
            </div> \
        ',

        constructor: function (options) {
            Backbone.View.apply(this, arguments);

            // create models
            this.controlModel = this._initControlModel(options);
            this.dataModel = this._initDataModel(options);

            // create views
            this.controlPanel = new ControlPanel({
                model: this.controlModel
            });
            this.moviePanel = new MoviePanel({
                model: {
                    data: this.dataModel,
                    control: this.controlModel
                }
            });

            // create data builder
            this.dataBuilder = new PlayBackDataBuilder(this.controlModel, this.dataModel);

            // view listen to models
            this.listenTo(this.controlModel, 'change:playing', this._playNextFrame);
            this.listenTo(this.controlModel, 'change:current', this._playCurrentFrame);
            this.listenTo(this.dataModel, 'change:lastModified', this._onDataChange);
        },

        render: function(){
            this.$el.html(this.template).show();
            this.$el.find('#control-panel').append(this.controlPanel.render().$el);
            this.$el.find('#movie-panel').append(this.moviePanel.render().$el);

            // set size of playback wrapper
            this.$el.find('#playback-wrapper').css({
                width: $(window).width() - VIEW_MARGIN * 2 + 'px',
                height: $(window).height() - VIEW_MARGIN * 2 + 'px'
            });

            // bind fullscreen event
            this._bindFullScreenEvent();

            // render progress chart
            this.controlPanel.renderProgressChart();

            // render tooltips
            this.$('[data-toggle="tooltip"]').tooltip();

            // start to play
            this.controlModel.set({
                'playing': true,
                'isFirstRender': true
            });

            return this;
        },

        events: {
            'click #play-close': '_closePlayBack',
            'click #event-list-toggle': '_toggleEventList',
            'click #fullscreen-toggle': '_toggleFullScreen'
        },

        _initControlModel: function(options){
            var keyFrameList = Object.keys(options.keyFrameCountMap).sort(),
                keyFrameCountMap = options.keyFrameCountMap,
                keyFrameCountList = [];

            for(var i=0; i<keyFrameList.length; i++){
                keyFrameCountList.push({
                    time: keyFrameList[i],
                    count: keyFrameCountMap[keyFrameList[i]]
                });
            }

            // convert to day, ignore time
            var startTime = PlayBackControlUtil.convertTimeInUnit(options.start, DAY_UNIT);

            // for reset function, do cache
            sessionStorage['playback-startTime'] = startTime;
            sessionStorage['playback-endTime'] = options.end;

            return new PlayBackControl({
                timeRange: {
                    start: startTime,
                    end: options.end
                },
                current: startTime,
                keyFrameCountList: keyFrameCountList,
                keyFrameList: keyFrameList
            });
        },

        _initDataModel: function(options){
            return new PlayBackData({
                nodeData: {},
                linkData: [],
                linkHash: {},
                types: options.types
            });
        },

        _onDataChange: function(){
            // stores changed resource IDs
            var changedResourceIds = {},
                nodeData = this.dataModel.get('nodeData');
            for (let id in nodeData){
                if(typeof nodeData[id].x === 'undefined'){
                    changedResourceIds[id] = true;
                }
            }
            this.moviePanel.drawTopology(this._playNextFrame.bind(this), this.controlModel.get('interval'), changedResourceIds, this.controlModel.get('needReflow'));
        },

        _playNextFrame: function(){
            if(this.controlModel.get('playing')){
                PlayBackControlUtil.controlToNextFrame(this.controlModel);
            }
        },

        _playCurrentFrame: function(){
            this.dataBuilder.build();
        },

        _closePlayBack: function(){
            this.dataBuilder.destroy();
            this.moviePanel.hideLoading();
            this.moviePanel.remove();
            this.controlPanel.remove();
            this.stopListening();
            this.$el.unbind('click');
            this.$el.hide().empty();
        },

        _toggleEventList: function(evt){
            $(evt.target).toggleClass('closed');
            this.$el.find('#event-panel').toggle();
        },

        _toggleFullScreen: function(evt){
            var viewElement = this.$el.find('#playback-wrapper'),
                datepicker_selector = '#ui-datepicker-div';

            // expand to fullscreen
            if(viewElement.hasClass('fullscreen')){
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
                else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                }
                else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                }

                // move datpicker div back to body
                $(datepicker_selector).appendTo('body');
            }
            // unexpand
            else{
                if (viewElement[0].requestFullscreen) {
                    viewElement[0].requestFullscreen();
                }
                else if (viewElement[0].msRequestFullscreen) {
                    viewElement[0].msRequestFullscreen();
                }
                else if (viewElement[0].mozRequestFullScreen) {
                    viewElement[0].mozRequestFullScreen();
                }
                else if (viewElement[0].webkitRequestFullScreen) {
                    viewElement[0].webkitRequestFullScreen();
                }

                // move datepicker div to current element, or, it will not be shown in fullscreen
                $(datepicker_selector).appendTo('#playback-wrapper');
            }
        },

        _bindFullScreenEvent: function(){
            var viewElement = this.$el.find('#playback-wrapper');

            viewElement.on('fullscreenchange webkitfullscreenchange mozfullscreenchange msfullscreenchange', () => {
                var isFullScreen = (document.fullscreen || document.mozFullScreen || document.webkitIsFullScreen || document.msFullscreenElement);

                if(isFullScreen){
                    viewElement.attr({
                        oldWidth: viewElement.width(),
                        oldHeight: viewElement.height()
                    }).addClass('fullscreen').css({
                        width: '100%',
                        height: '100%'
                    });
                }
                else{
                    viewElement
                        .removeClass('fullscreen')
                        .width(viewElement.attr('oldWidth'))
                        .height(viewElement.attr('oldHeight'));
                }

                // reset size of svg
                d3.select('#movie-panel svg').attr({
                    width: viewElement.width(),
                    height: viewElement.height()
                });

                this.controlPanel.renderProgressChart();
            });
        }
    });
});