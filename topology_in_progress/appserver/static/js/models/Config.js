/**
 * Created by peter on 6/17/15.
 * Modified by frank on 6/28/2016, change from requirejs plugin, in order to support webpack (pure).
 */

define([
    'jquery',
    'underscore',
    'app/utils/ContextResolver'
], function ($, _, ContextResolver) {

    let DEFAULT_CONTEXT = {
        APP: 'splunk_app_aws',
        OWNER: 'nobody',
        ROLES: [],
        CAPABILITIES: [],
        IS_ADMIN: false,
        IS_AWS_ADMIN: false
    };

    let SERVICE_READABLE_NAMES = {
        'config': 'AWS Config',
        'config-rule': 'Config Rules',
        'cloudwatch': 'CloudWatch',
        'cloudtrail': 'CloudTrail',
        'billing': 'Billing',
        's3': 'S3',
        'cloudwatch-logs': 'CloudWatch Logs',
        'kinesis': 'Kinesis',
        'inspector': 'Inspector',
        'description': 'Metadata'
    };

    let dfd = $.Deferred();

    return {
        contextData: DEFAULT_CONTEXT,

        loadContext: function(){
            let self = this;

            ContextResolver.getContext(function (context) {
                self.contextData = $.extend({}, DEFAULT_CONTEXT, {
                    APP: context.app,
                    OWNER: context.owner,
                    ROLES: context.roles,
                    CAPABILITIES: context.capabilities,
                    SERVICE_READABLE_NAMES: SERVICE_READABLE_NAMES,
                    IS_ADMIN: context.is_admin,
                    IS_AWS_ADMIN: context.is_aws_admin
                });

                dfd.resolve();
            });

            return dfd;
        }
    };
});