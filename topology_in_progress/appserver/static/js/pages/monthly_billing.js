define([
    'underscore',
    'splunkjs/mvc',
    'app/views/dashboard/OneTimePaymentsView',
    'app/utils/LookupUtil',
    'splunkjs/mvc/simpleform/formutils',
    'app/views/dashboard/MonthSelector',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function(_, mvc, OneTimePaymentsView, LookupUtil, FormUtils, MonthSelector) {

    let tokenModel = mvc.Components.getInstance("default");

    new MonthSelector({
        from: $('#timerange-from'),
        fromTitle: 'Billing report from',
        to: $('#timerange-to'),
        submit: true,
        fromCurrentMonth: false,
        isDetailedBilling: false
    }).render();

    tokenModel.set('onetimeDetailedBilling', '');
    FormUtils.submitForm({replaceState: true});

    let oneTimePaymentsView = new OneTimePaymentsView({
        default: true,
        el: $('#oneTime')
    }).render();

    let mgr = mvc.Components.getInstance('baseSearch');

    mgr.on('search:start', () => {
        oneTimePaymentsView.loading(true);
    });

    mgr.on('search:done', () => {
        oneTimePaymentsView.loading(false);
    });

    oneTimePaymentsView.on('change', (include) => {
        lazyRefreshInvoice(include);
    });

    let lazyRefreshInvoice = _.debounce((include) => {
        tokenModel.set('onetimeDetailedBilling', include ? '' : 'count > 2');
        FormUtils.submitForm({replaceState: true});
    }, 200);

    LookupUtil.generateAccountName();
});