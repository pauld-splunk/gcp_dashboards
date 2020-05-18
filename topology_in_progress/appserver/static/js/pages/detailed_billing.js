define([
    'underscore',
    'splunkjs/mvc',
    'app/views/dashboard/OneTimePaymentsView',
    'splunkjs/mvc/tokenforwarder',
    'app/views/dashboard/MonthSelector',
    'app/utils/LookupUtil',
    'app/utils/SearchUtil',
    'splunkjs/mvc/simpleform/formutils',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function(_, mvc, OneTimePaymentsView, TokenForwarder, MonthSelector, LookupUtil, SearchUtil, FormUtils) {
    'use strict';

    new MonthSelector({
        from: $('#timerange-from'),
        fromTitle: 'Billing report from',
        to: $('#timerange-to'),
        submit: true,
        isDetailedBilling: true
    }).render();

    let tokenModel = mvc.Components.getInstance("default");

    new TokenForwarder(['$region$'], '$regionDetailedBilling$', function(regions) {
        if (regions) {
            regions = regions.split('|');
            if (regions.length === 1 && regions[0] === "*") {
                return '';
            } else {
                let regionsToken = regions
                    .map(region => `detailed_billing.AvailabilityZone="${region}*"`)
                    .join(' OR ');

                return `AND (${regionsToken})`;
            }
        } else {
            return TokenForwarder.NO_CHANGE;
        }
    });

    new TokenForwarder(['$productName$'], '$productNameDetailedBilling$', function(productName) {
        if (productName) {
            if (productName === "*") {
                return '';
            } else {
                return `AND detailed_billing.ProductName="${productName}"`;
            }
        } else {
            return TokenForwarder.NO_CHANGE;
        }
    });

    new TokenForwarder(['$operation$'], '$operationDetailedBilling$', function(operation) {
        if (operation) {
            if (operation === "*") {
                return '';
            } else {
                return `AND detailed_billing.Operation="${operation}"`;
            }
        } else {
            return TokenForwarder.NO_CHANGE;
        }
    });

    tokenModel.set('onetimeDetailedBilling', '');
    FormUtils.submitForm({replaceState: true});

    let oneTimePaymentsView = new OneTimePaymentsView({
        default: true,
        el: $('#oneTime')
    }).render();

    let mgr = mvc.Components.getInstance('invoiceSearch');
    let recentResult = '';

    mgr.on('search:start', () => {
        oneTimePaymentsView.loading(true);
        recentResult = '';
    });

    let lazyRefreshInvoice = _.debounce((include) => {
        tokenModel.set('onetimeDetailedBilling', include ? '' : recentResult);
        FormUtils.submitForm({replaceState: true});
    }, 200);

    mgr.on('search:done', () => {
        oneTimePaymentsView.loading(false);
        let resultsModel = mgr.data('results', {
            output_mode: 'json',
            count: 10000
        });
        resultsModel.once('data', () => {
            let results = resultsModel.data().results;
            if (results && results.length > 0) {
                recentResult = results
                    .map(item => 'detailed_billing.InvoiceID=' + item['detailed_billing.InvoiceID'])
                    .join(' OR ');

                recentResult = `AND (${recentResult})`;
                lazyRefreshInvoice(oneTimePaymentsView.settings.get('value'));
            }
        });
        resultsModel.fetch();
    });

    oneTimePaymentsView.on('change', (include) => {
        lazyRefreshInvoice(include);
    });

    LookupUtil.generateAccountName();
});