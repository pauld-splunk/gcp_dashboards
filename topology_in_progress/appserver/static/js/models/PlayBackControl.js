/**
 * Created by frank on 2016-02-17
 */

define(['backbone'], function(Backbone){
    var now = new Date().getTime() / 1000;

    return Backbone.Model.extend({
        defaults: {
            interval: 1500, // frame interval (ms)
            timeRange: {
                start: 0, // start time of movie (unit: s)
                end: now // end time of movie (unit: s)
            },
            step: 0, // period of each frame, one day by default (unit: s)
            current: 0, // current cursor of time in the movie (unit: s)
            playing: false, // play or stop
            keyFrameList: [], // key frames in play back, list of times. Unit is minute
            keyFrameCountList: [], // key frames in play back (has data), list of "{time: xxx, count: xxx}". Unit is minute.
            isFirstRender: false, // first render enables playback to render animation of force chart
            needReflow: false  // need re-flow topology layout
        },

        validate: function(attrs, options){
            if((attrs.timeRange.start + 86399) > attrs.timeRange.end){
                return 'Start time cannot exceed end time.';
            }
            if((attrs.timeRange.end - attrs.timeRange.start) >= 86400 * 365){
                return 'The time range cannot exceed one year.';
            }
        }
    });
});