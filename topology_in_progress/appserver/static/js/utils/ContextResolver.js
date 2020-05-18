define([
    'jquery',
    'underscore',
    'splunkjs/mvc/utils',
    'util/splunkd_utils'
], function ($, _, utils, splunkd_utils) {

    var dfd = $.Deferred();

    var DEFAULT_OWNER = 'nobody';

    var app = utils.getPageInfo().app;
    var owner = DEFAULT_OWNER;

    // get user context
    var url=splunkd_utils.fullpath("saas-aws/splunk_app_aws_current_context", {
        app: app,
        sharing: 'app'
    });

    $.get(`${url}?output_mode=json`).done(function(user_context) {
        var roles = user_context.entry[0].content['roles'],
            capabilities = user_context.entry[0].content['capabilities'],
            is_admin = user_context.entry[0].content['is_admin'];
            is_aws_admin = user_context.entry[0].content['is_aws_admin'];

        dfd.resolve({
            app: app,
            roles: roles,
            capabilities: capabilities,
            is_admin: is_admin,
            is_aws_admin: is_aws_admin
        });
    }).fail(function() {
        dfd.reject();
    });

    return {
        getContext: function (successFn, FailFn) {
            dfd.done(successFn);
            dfd.fail(FailFn);
        }
    };
});
