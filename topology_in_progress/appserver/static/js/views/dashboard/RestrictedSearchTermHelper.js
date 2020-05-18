define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'util/splunkd_utils',
    'splunkjs/mvc/utils',
    'splunkjs/mvc/simplexml/ready!'
], function ($, _, mvc, splunkd_utils, utils) {
    const APP_NAME = utils.getPageInfo().app;

    const PAGE_NAME = utils.getPageInfo().page;

    const PAGE_TERM_MAP = {
        'cloudfront_access_logs': {
            prefix: 'CloudFront_Access_Log.',
            field: 'account_id', // field name contained in the restricted search terms which will be replaced by prefix + field
            token: 'cloudfront_datamodel_restrictions' // token name used in the dashboard
        },
        's3_access_logs': {
            prefix : 'S3_Access_Log.',
            field: 'account_id',
            token: 's3_datamodel_restrictions'
        }
    };

    var tokenModel = mvc.Components.getInstance("submitted");

    return {
        setRestrictedSearchTermToken: function() {
            var pageTerm = PAGE_TERM_MAP[PAGE_NAME];
            if (pageTerm) {
                var url=splunkd_utils.fullpath("saas-aws/splunk_app_aws_search_restrictions", {
                    app: APP_NAME,
                    sharing: 'app'
                });

                $.ajax({
                    url: `${url}?output_mode=json&field=${pageTerm.field}&prefix=${pageTerm.prefix}`,
                    type: 'get',
                    success: (result) => {
                        var restrictions = result.entry[0].content.search_restrictions;
                        tokenModel.set(pageTerm.token, restrictions);
                    }
                });
            }
        }
    }
});