define([
    'jquery',
    'app/views/topology/TopologyView',
    'app/views/topology/panels/TimePicker',
    'app/views/dashboard/TokenHelper',
    'appcss/pages/topology/bootstrap.pcss',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function ($, TopologyView, TimePicker, TokenHelper) {

    // Create and Render
    new TimePicker({ el: $('#timerange'), managerid: 'timeRangeSearch'});
    new TopologyView({ managerid: 'topologySearch', el: $('#topology')}).render();

    TokenHelper.createLocalStorageToken('localVpc', 'form.vpc', (value) => value ? value : TokenForwarder.NO_CHANGE);

    TokenHelper.resetTokenValue('accountId', 'form.vpc', '*');
    TokenHelper.resetTokenValue('region', 'form.vpc', '*');
});
