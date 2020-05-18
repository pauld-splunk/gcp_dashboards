define([
    'jquery',
    'underscore',
    'backbone',
    'splunkjs/mvc',
    'app/utils/LookupUtil',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function ($, _, Backbone, mvc, LookupUtil) {
    LookupUtil.generateAccountName();
});
