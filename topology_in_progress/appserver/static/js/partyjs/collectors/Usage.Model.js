/**
 * Created by peter on 4/27/16.
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'app/models/BaseModel',
    'splunk.util'
], function(
    $,
    _,
    Backbone,
    BaseModel
) {

    return BaseModel.extend({
        url: "saas-aws/splunk_app_aws_usage",
        urlRoot: "saas-aws/splunk_app_aws_usage",

        initialize: function(attributes, options) {
            BaseModel.prototype.initialize.call(this, attributes, options);
        },

        save: function() {
            throw Error("Usage data is read-only!");
        },

        getValue: function() {
            return {
                name: 'track_usage',
                data: JSON.parse(this.entry.content.get('value'))
            };
        }
    });
});

