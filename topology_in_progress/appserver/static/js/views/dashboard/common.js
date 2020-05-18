define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'util/splunkd_utils',
    'splunkjs/mvc/simplexml/element/single',
    'splunkjs/mvc/simplexml/element/table',
    'app/views/dashboard/SimpleWarningHelper',
    'app/views/dashboard/CustomIndexHelper',
//    'app/views/dashboard/LiteHelper',
    'app/views/dashboard/SourcetypeCheckerView',
    'app/views/dashboard/TagInputView',
    'app/views/dashboard/TableBarRenderer',
    'app/views/dashboard/TableEventNameRenderer',
    'app/views/dashboard/TableCellRenderer',
    'app/views/dashboard/SingleValueRenderer',
    'app/views/dashboard/TokenHelper',
    'app/views/dashboard/MacroHelper',
    'app/views/dashboard/RestrictedSearchTermHelper',
    'splunkjs/mvc/tokenforwarder',
    'app/partyjs/PartyController',
    'app/models/Config',
    'app/collections/Recommendations',
    'app/views/dashboard/MultiSelectHelper',
    'appcss/dashboards/common.pcss',
    'splunkjs/mvc/simplexml/ready!'
], function(
    $,
    _,
    mvc,
    utils,
    splunkd_utils,
    SingleElement,
    TableElement,
    SimpleWarningHelper,
    CustomIndexHelper,
//    LiteHelper,
    SourcetypeCheckerView,
    TagInputView,
    TableBarRenderer,
    TableEventNameRenderer,
    TableCellRenderer,
    SingleValueRenderer,
    TokenHelper,
    MacroHelper,
    RestrictedSearchTermHelper,
    TokenForwarder,
    PartyController,
    Config,
    Recommendations
){
    'use strict';

    TokenHelper.createLocalStorageToken('localAccountId', 'form.accountId', (accounts) => accounts ? accounts.split(',') : TokenForwarder.NO_CHANGE);
    TokenHelper.createLocalStorageToken('localRegions', 'form.region', (regions) => regions ? regions.split(',') : TokenForwarder.NO_CHANGE);
    let _tokenModel = mvc.Components.get('default');
    // set token for restricted search term
    RestrictedSearchTermHelper.setRestrictedSearchTermToken();

    let page = utils.getPageInfo().page,
        app = utils.getPageInfo().app;

    // render simple warning
    SimpleWarningHelper.showWarning();

    // set tag input view
    let $tags = $('#awstags');
    if ($tags.length > 0 ) {
        new TagInputView({
            'el': $tags
        }).render();
        let tags = _tokenModel.get('tags');
        if (!tags) {
            _tokenModel.set('tags', '');
        }
    }

    // set common renders
    Object.keys(mvc.Components.attributes).forEach((componentName) => {
        let component = mvc.Components.get(componentName);

        if (typeof component.getVisualizationType !== 'undefined') {
            let vizType = component.getVisualizationType();

            if (vizType === 'table' || vizType === 'statistics') {
                // bar renderer
                component.getVisualization(function (tableView) {
                    tableView.table.addCellRenderer(new TableBarRenderer());
                    tableView.table.render();
                });

                // event name renderer
                component.getVisualization(function (tableView) {
                    tableView.table.addCellRenderer(new TableEventNameRenderer());
                    tableView.table.render();
                });

                // table cell renderer
                component.getVisualization(function (tableView) {
                    tableView.table.addCellRenderer(new TableCellRenderer());
                    tableView.table.render();
                });
            } else if (vizType === 'single' || vizType === 'visualizations:singlevalue') {
                // single value renderer
                component.getVisualization(function (single) {
                    let $el = $('<div></div>').insertAfter(single.$el);
                    new SingleValueRenderer($.extend(single.settings.toJSON(), {
                        el: $el,
                        id: _.uniqueId('single')
                    }));
                });
            }
        }
    });

    // load config context data, check and show warnings
    Config.loadContext().done(function () {
        // track usage information
        PartyController.collectUsage();

        let url = splunkd_utils.fullpath('saas-aws/splunk_app_aws_warning_message', {
            app: app,
            sharing: 'app'
        });

        let callbackFunc = function () {
            // check sourcetype
            new SourcetypeCheckerView();

            // check custom indexes
            CustomIndexHelper.checkCustomIndex(Config.contextData.IS_AWS_ADMIN);
        };

        // if user hides messages of this page, will not do sourcetype check
        $.get(`${url}?output_mode=json`).done((data) => {
            let pages = data.entry[0].content.pages;

            if (pages.indexOf(page) === -1) {
                callbackFunc();
            }
        }).fail(() => {
            callbackFunc();
        });

    });

    // disable insights for lite
//    LiteHelper.disableInsights();

    // check ML lib
    let recommendations = new Recommendations();

    recommendations.fetch({data: {count: -1}}).success(() => {
        let submittedTokenModel = mvc.Components.getInstance("submitted");

        // set this token, so that some panels relying on it can show up.
        submittedTokenModel.set('recommendationEnabled', true);
    });

    // Start Partyjs
    PartyController.startParty();

    // override FormUtils
    let FormUtils = require('splunkjs/mvc/simpleform/formutils'),
        Dashboard = require('splunkjs/mvc/simplexml/controller');

    // override formutils
    FormUtils.onFormReady = _.once(function () {
        let dfd = $.Deferred();
        Dashboard.onReady(function () {
            let inputs = FormUtils.getFormInputs();
            if (inputs.length > 0) {
                let promises = [];
                _.each(inputs, function (input) {

                    // in 6.5, the _onReady() function of input is gone. needs to invoke onInputReady().
                    if (input._onReady) {
                        promises.push(input._onReady());
                    }
                    else if (input.onInputReady) {
                        promises.push(input.onInputReady());
                    }
                });
                $.when.apply($, promises).always(dfd.resolve);
            } else {
                dfd.resolve();
            }
        });
        return dfd.promise();
    });

    FormUtils.submitForm = _.debounce(function (options) {
        if (!FormUtils.isFormReady()) {
            FormUtils.onFormReady().then(_.bind(FormUtils.submitForm, FormUtils, {replaceState: true}));
            return;
        }
        options || (options = {});
        // submit the form
        let defaultTokenModel = mvc.Components.getInstance("default", {create: true});
        let submittedTokenModel = mvc.Components.getInstance('submitted');
        if (submittedTokenModel) {
            submittedTokenModel.set(defaultTokenModel.toJSON());
        }

        // needs urlTokenModel in the version below 6.5
        let urlTokenModel = mvc.Components.getInstance('url');
        if (urlTokenModel && urlTokenModel.saveOnlyWithPrefix) {
            urlTokenModel.saveOnlyWithPrefix('form\\.', defaultTokenModel.toJSON(), {
                replaceState: options.replaceState
            });
        }
    });
});
