define(
    [
        'jquery',
        'underscore',
        'app/collections/BaseCollection',
        'app/models/RecommAction'
    ],
    function ($, _, SplunkDsBase, RecommAction) {
        'use strict';

        return SplunkDsBase.extend({
            url: "saas-aws/splunk_app_aws_recomm_action",
            model: RecommAction,
            initialize: function () {
                SplunkDsBase.prototype.initialize.apply(this, arguments);
            },

            // Override parse to merge duplicated recommendation feedback
            parse: function(response) {
                let groups = _.groupBy(response.entry, entry => {
                    return entry.content['recomm_id'];
                });

                let entries = Object.keys(groups).map(key => {
                    let group = groups[key];

                    if (group.length === 1) {
                        return group[0];
                    } else {
                        let orderGroup = _.sortBy(group, item => item.content.timestamp);

                        return orderGroup[orderGroup.length - 1];
                    }
                });

                arguments[0].entry = entries;

                return SplunkDsBase.prototype.parse.apply(this, arguments);
            }
        });
    }
);
