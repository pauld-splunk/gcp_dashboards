define([
    'jquery',
    'underscore',
    'app/utils/SearchUtil'
], function($, _, SearchUtil){

    return {
        collectConfigData: function(callback) {
            var configData = {};

            // set Accounts
            var accountDfd = $.Deferred();

            SearchUtil.search('| inputlookup all_account_ids').then((lookupData) => {
                var accounts = {
                    'count': lookupData.length,
                    'details': _.map(lookupData, account => ({
                        'name': account['name'],
                        'account_id': account['account_id']
                    }))
                };

                configData['accounts'] = accounts;

                accountDfd.resolve();
            });


            // set Inputs
            var inputDfd = $.Deferred();

            SearchUtil.search('`aws-input-summary` | fields input_type, input_account, input_region, input_index, input_interval, input_sourcetype', {
                'earliest_time': '-1d'
            }).then((resultData) => {
                var inputs = {};

                resultData.forEach(data => {
                    var serviceName = data['input_type'];

                    inputs[serviceName] = inputs[serviceName] || {};

                    inputs[serviceName].count = inputs[serviceName].count || 0;
                    inputs[serviceName].count += 1;

                    inputs[serviceName].details = inputs[serviceName].details || [];
                    inputs[serviceName].details.push({
                        'account': data['input_account'],
                        'regions': data['input_region'],
                        'index': data['input_index'],
                        'interval': data['input_interval'],
                        'sourcetype': data['input_sourcetype']
                    });
                });

                configData['inputs'] = inputs;

                inputDfd.resolve();
            });

            $.when(accountDfd, inputDfd).then(() => {
                callback(configData);
            });
        }
    };
});