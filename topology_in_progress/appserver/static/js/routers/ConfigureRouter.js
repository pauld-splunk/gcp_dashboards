/**
 * Created by michael on 6/17/15.
 */
define([
        'underscore',
        'jquery',
        'backbone',
        'routers/Base',
        'uri/route',
        'contrib/text!app/views/AwsPageTemplate.html',
        'app/utils/ErrorDispatcher',
        'app/views/common/HeaderView',
        'app/views/common/ErrorView',
        'app/views/configuration/Master',
        'app/views/dashboard/LiteHelper',
        'app/models/Config'
    ],
    function (_,
              $,
              Backbone,
              BaseRouter,
              route,
              PageTemplate,
              ErrorDispatcher,
              HeaderView,
              ErrorView,
              ConfigOverviewView,
              LiteHelper,
              Config) {

        return BaseRouter.extend({
            routes: {
                ':locale/app/:app/:page(/)': '_route',
                '*root/:locale/app/:app/:page(/)': '_routeRooted'
            },

            initialize: function () {
                BaseRouter.prototype.initialize.apply(this, arguments);

                this.setPageTitle(_('AWS Configure').t());

                this.model = $.extend(this.model, {
                    application: this.model.application
                });

                this.errorView = new ErrorView();

                // bind error handler
                ErrorDispatcher.subscribe('error', this._renderError.bind(this));
                ErrorDispatcher.subscribe('warning', this._renderWarning.bind(this));

                // header view
                this.headerView = new HeaderView({
                    model: this.model
                });

                // flag that indicate whether header has been rendered
                this._structureReady = false;

                // always fetch app locals
                this.fetchAppLocals = true;

                // disable insights for lite
                this.listenToOnce(this.model.appNav, 'change:nav', function(model) {
                    LiteHelper.disableInsights(model);
                });
            },

            _renderStructure: function () {
                // render Splunk header and common header
                $('.preload').replaceWith(this.pageView.el);
                this.pageView.$('.main-section-body').append(PageTemplate);
                this.pageView.$('.app-page-header').html(this.headerView.render().el);
                this.pageView.$('.app-page-error').html(this.errorView.render().$el);
                
                // global error stop.
                if (Config.contextData.ERROR) {
                    this.errorView.showError(Config.contextData.ERROR);
                    this.pageView.$('.app-page-body').remove();
                }
            },

            _renderError: function (message, errorCode) {
                if (this._structureReady) {
                    this.errorView.showError(message);
                }
            },

            _renderWarning: function(message) {
                if (this._structureReady) {
                    this.errorView.showWarning(message);
                }
            },

            _renderBody: function () {
                // render current view into body
                this.pageView.$('.app-page-body').html(this.currentView.render().el);
            },

            _parseQueryString: function (queryString) {
                // parse query string into a JSON object
                var params = {};
                if (!_.isString(queryString)){
                    return params;
                }
                queryString = queryString.substring(queryString.indexOf('?') + 1);
                var queryParts = decodeURI(queryString).split(/&/g);
                _.each(queryParts, function (value) {
                    var parts = value.split('=');
                    if (parts.length >= 1) {
                        var val;
                        if (parts.length === 2){
                            val = parts[1];
                        }
                        params[parts[0]] = val;
                    }
                });
                return params;
            },

            /*
             THE ENTRY POINT
             */
            _route: function (locale, app, page, queryString) {                    
                BaseRouter.prototype.page.apply(this, arguments);

                var params = this._parseQueryString(queryString),
                    type = 'master'; // TODO: used in future

                this.deferreds.pageViewRendered.done(() => {
                    if (!this._structureReady) {
                        this._renderStructure();
                        this._structureReady = true;
                    }

                    if (typeof this._pages[type] === 'function') {
                        // remove currentView prevent duplicate event binding.
                        this.currentView && this.currentView.remove();
                        this._pages[type].call(this, locale, app, page, params);
                    }
                    else {
                        ErrorDispatcher.raise('Page type ' + type + ' not found');
                    }
                });
            },

            _routeRooted: function (root, locale, app, page, queryString) {
                this.model.application.set({
                    root: root
                }, {silent: true});
                this._route(locale, app, page, queryString);
            },

            _pages: {
                'master': function (locale, app, page, params) {
                    this.currentView = new ConfigOverviewView({
                        model: this.model
                    });
                    this._renderBody();
                },
            }
        });
    });
