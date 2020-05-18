define(
    [
        'underscore',
        'app/models/BaseModel'
    ],
    function (_, BaseModel) {
        return BaseModel.extend({
            url: "saas-aws/splunk_app_aws_recomm_action",
            urlRoot: "saas-aws/splunk_app_aws_recomm_action",

            // attributes: name, key_id, secret_key
            initialize: function () {
                BaseModel.prototype.initialize.apply(this, arguments);
            },

            getAttributeNames: function() {
                return [
                    'name',
                    'recomm_id',
                    'feedback',
                    'timestamp'
                ];
            }
        });
    }
);