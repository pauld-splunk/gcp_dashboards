define([
    'jquery',
    'underscore',
    'splunkjs/mvc/utils',
    'splunkjs/mvc/searchmanager',
], function ($, _, utils, SearchManager) {
    'use strict';

    const APPNAME = utils.getPageInfo().app;
    const COUNT = 10000;

    return {
        search(q, options, tokens) {
            options || (options = {});
            var tokensObj = tokens ? { tokens: true } : null;
            var dfd = $.Deferred();
            var mgr = new SearchManager($.extend({
                id: _.uniqueId('adhoc'),
                search: q,
                preview: false,
                app: APPNAME,
                count: COUNT,
                offset: 0
            }, options), tokensObj);

            var resultsModel;

            mgr.once('search:done', function() {
                resultsModel = mgr.data(options.data || 'results', {
                    output_mode: 'json',
                    count: COUNT
                });
                resultsModel.once('data', function() {
                    dfd.resolve(resultsModel.data().results);
                });
                resultsModel.once('error', dfd.reject);
                resultsModel.fetch();
            });

            mgr.once('search:error search:fail search:cancelled', dfd.reject);

            return dfd.always(function() {
                if (resultsModel){
                    resultsModel.destroy();
                }
                mgr.cancel();
            }).promise();
        }
    };
});
