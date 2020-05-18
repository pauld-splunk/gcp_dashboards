define([
    'jquery',
    'underscore',
    'splunkjs/mvc/utils',
    'splunkjs/mvc/savedsearchmanager',
    'app/utils/SearchUtil',
    'app/views/dashboard/MessageView',
    'app/utils/HelpLinks'
], function ($, _, utils, SavedSearchManager, SearchUtil, MessageView, HelpLinks) {
    'use strict';

    const app = utils.getPageInfo().app;

    function generateAccountName() {
        SearchUtil.search('| lookup account_name LinkedAccountId').then(function(lookupData) {
        }).fail(function(err){
            let sm = new SavedSearchManager({
                id:  _.uniqueId(`lookup_generator`),
                app: app,
                searchname: 'AWS Billing - Account Name'
            });

            sm.on('search:progress', function(result) {
                let progress = Math.round(result.content.doneProgress * 100);
                let body = `Looking up account names based on your Account IDs. Please wait. Progress: ${progress + "%"}.`;
                MessageView.setMessage('accountname', body, HelpLinks.AWS_DASHBOARD_ACCOUNTNAME);
            });

            sm.on('search:done', function(result) {
                let body = `Account name lookup complete. Please reload the page to refresh your dashboard.`;
                SearchUtil.search(`| rest servicesNS/nobody/${app}/apps/local/_reload splunk_server=local`);
                MessageView.setMessage('accountname', body, HelpLinks.AWS_DASHBOARD_ACCOUNTNAME);
            });
        });
    }

    // Try to run a lookup. If it does not exist, run a savedsearch to generate it.
    function tryLookup(spl, options, generatorName, lookupName, callback) {
        SearchUtil
            .search(spl, options)
            .done((data) => {
                if (!data || data.length === 0) {
                    SearchUtil.search(`| rest servicesNS/nobody/${app}/data/lookup-table-files/${lookupName} splunk_server=local`).done((result) => {
                        if (result.length === 0) {
                            let sm = new SavedSearchManager({
                                id:  _.uniqueId(`lookup_generator`),
                                app: app,
                                searchname: generatorName
                            });

                            sm.on('search:progress', function(result) {
                                let progress = Math.round(result.content.doneProgress * 100);
                                let body = `Generating lookup ${lookupName}. Please wait. Progress: ${progress + "%"}.`;
                                MessageView.setMessage('lookup_generator', body);
                            });

                            sm.on('search:done', function(result) {
                                let body = `Lookup ${lookupName} is generated. Please reload the page to refresh your dashboard.`;
                                SearchUtil.search(`| rest servicesNS/nobody/${app}/apps/local/_reload splunk_server=local`);
                                MessageView.setMessage('lookup_generator', body);
                            });
                        }
                        console.log(result);
                    })
                } else {
                    callback(data);
                }
            });
    }

    return {
        generateAccountName: generateAccountName,
        tryLookup: _.debounce(tryLookup, 100)
    }
});
