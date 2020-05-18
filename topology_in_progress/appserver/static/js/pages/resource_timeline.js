/**
 * Created by frank on 2016-09-05
 */

define([
    'jquery',
    'app/views/resource_timeline/panels/TimelineChart',
    'app/views/resource_timeline/TimelineDataBuilder',
    'app/models/TimelineModel',
    'app/libs/timeline',
    'appcss/pages/resource_timeline/bootstrap.pcss',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function($, TimelineChart, TimelineDataBuilder, TimelineModel) {

    var model = new TimelineModel();

    var timelineChart = new TimelineChart({
        el: $('#timeline-chart'),
        model: model
    });

    var dataBuilder = new TimelineDataBuilder(model);

    $('.splunk-submit-button>.btn').on('click', () => {
        $('#timeline-chart').show();
        dataBuilder.build();
    });
});