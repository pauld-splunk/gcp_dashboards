/**
 * Created by peter on 4/28/16.
 */

define([
    'underscore',
    'app/partyjs/collectors/Usage.Model',
    'app/models/Config'
], function(
    _,
    UsageModel,
    Config
){

    return {
        collectUsageData: function(callback) {
            // Get info from server if the information is staled
            var usageModel = new UsageModel({ id: 'default' });
            usageModel.fetch({
                data: _.omit(Config.contextData.CONTEXT, 'target'),
                success: function(model, response) {
                    callback(model.getValue());
                },
                error: function(model, response) {
                    console.error("Get usage information failed.");
                    console.error(response);
                }
            });
        }
    }
});