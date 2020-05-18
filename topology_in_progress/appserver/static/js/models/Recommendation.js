define(
    [
        'underscore',
        'app/models/BaseModel'
    ],
    function (_, BaseModel) {
        return BaseModel.extend({
            url: "saas-aws/splunk_app_aws_recommendation",
            urlRoot: "saas-aws/splunk_app_aws_recommendation",

            // attributes: name, key_id, secret_key
            initialize: function () {
                BaseModel.prototype.initialize.apply(this, arguments);
            },

            getAttributeNames: function() {
                return [
                    'status',
                    'action',
                    'resourceId'
                ];
            },

            parse: function(response) {
                return response.entry[0].content;
            }
        });
    }
);