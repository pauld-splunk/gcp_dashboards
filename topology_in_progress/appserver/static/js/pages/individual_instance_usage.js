define([
    'app/views/dashboard/TokenHelper',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function (TokenHelper) {

    TokenHelper.resetTokenValue('region', 'form.instances', undefined);
});