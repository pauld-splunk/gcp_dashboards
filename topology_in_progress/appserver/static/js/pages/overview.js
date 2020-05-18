define([
    'underscore',
    'jquery',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'splunkjs/mvc/simpleform/formutils',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function (_, $, SearchManager, mvc, utils, FormUtils) {
    'use strict';

    mvc.setFilter('account2CloudFrontDataModel', function(inputValue) {
        let regexMatch = inputValue.match(/aws_account_id=\"(.*?)\"/);
        if (regexMatch.length === 2) {
            let accountID = regexMatch[1];
            return `where CloudFront_Access_Log.account_id=${accountID}`;
        }
        return '';
    });

    let tokenModel = mvc.Components.getInstance("default");
    let currencySearch = new SearchManager({
        id: _.uniqueId(),
        search: '`aws-cloudwatch-billing($accountId$, "*")` | \`aws-cloudwatch-dimension-rex("Currency", "Currency")\` | dedup Currency | fields Currency',
        earliest_time: "@mon",
        latest_time: "now",
        app: utils.getPageInfo().app,
    }, {tokens: true});

    let currencies = [];
    let currencyResults = currencySearch.data("results");

    currencyResults.on('data', (results) => {
        try {
            currencies = results.data().rows.map(row => row[0]);

            if (currencies.indexOf('USD') > -1) {
                tokenModel.set("currency", 'USD');
            } else if (currencies.length > 0) {
                tokenModel.set("currency", currencies[0]);
            }

            FormUtils.submitForm({replaceState: true});
        } catch(err) {
        }
    });
});
