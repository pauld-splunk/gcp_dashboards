define(
    [
        'jquery',
        'app/collections/BaseCollection',
        'app/models/Recommendation'
    ],
    function ($, SplunkDsBase, Recommendation) {
        return SplunkDsBase.extend({
            url: "saas-aws/splunk_app_aws_recommendation",
            model: Recommendation,
            initialize: function() {
                SplunkDsBase.prototype.initialize.apply(this, arguments);
            }
        });
    }
);
