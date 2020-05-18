define(
    [
        'underscore',
        'backbone',
        'models/SplunkDBase',
        'util/splunkd_utils'
    ],
    function (_, Backbone, SplunkDBase, splunkd_utils) {

        var generateUrl = function (model, options) {
            var url = _.isFunction(model.url) ? model.url() : model.url;
            if (model.id){
                url = model.id;
            }
            var app_and_owner = {};
            if (options.data) {
                app_and_owner = $.extend(app_and_owner, { //JQuery purges undefined
                    app: options.data.app || undefined,
                    owner: options.data.owner || undefined,
                    sharing: options.data.sharing || undefined
                });
            }
            url = splunkd_utils.fullpath(url, app_and_owner);
            url += '?output_mode=' + encodeURIComponent('json');
            if (options.data && options.data.target){
                url += '&target=' + encodeURIComponent(options.data.target);
            }
            if (options.data && options.data.aws_service){
                url += '&aws_service=' + encodeURIComponent(options.data.aws_service);
            }
            return url;
        };

        var filterDefaults = function (defaults) {
            delete defaults.data.app;
            delete defaults.data.owner;
            delete defaults.data.sharing;
            delete defaults.data.output_mode;
            delete defaults.data.target;
            delete defaults.data.aws_service;
            delete defaults.data.count;
        };

        var syncCreate = function (model, options) {
            var bbXHR, url,
                deferredResponse = $.Deferred(),
                defaults = {data: {}};
            defaults.url = generateUrl(model, options);

            defaults.processData = true;
            $.extend(true, defaults.data, model.whiteListAttributes());
            $.extend(true, defaults, options);
            filterDefaults(defaults);

            defaults.data = splunkd_utils.normalizeValuesForPOST(defaults.data);

            bbXHR = Backbone.sync.call(null, "create", model, defaults);
            bbXHR.done(function () {
                deferredResponse.resolve.apply(deferredResponse, arguments);
            });
            bbXHR.fail(function () {
                deferredResponse.reject.apply(deferredResponse, arguments);
            });

            return deferredResponse.promise();
        };

        var syncUpdate = function (model, options) {
            var bbXHR,
                deferredResponse = $.Deferred(),
                defaults = {data: {}};

            defaults.url = generateUrl(model, options);
            defaults.processData = true;
            var fetchOptions = $.extend(true, {}, options);
            $.extend(true, defaults.data, model.whiteListAttributes(fetchOptions));
            $.extend(true, defaults, options);

            filterDefaults(defaults);

            defaults.processData = true;
            defaults.type = 'POST';

            defaults.data = splunkd_utils.normalizeValuesForPOST(defaults.data);

            bbXHR = Backbone.sync.call(null, "update", model, defaults);
            bbXHR.done(function () {
                deferredResponse.resolve.apply(deferredResponse, arguments);
            });
            bbXHR.fail(function () {
                deferredResponse.reject.apply(deferredResponse, arguments);
            });

            return deferredResponse.promise();
        };


        var syncPatch = function (model, options) {
            var bbXHR,
                deferredResponse = $.Deferred(),
                defaults = {data: {}};

            defaults.url = generateUrl(model, options);

            $.extend(true, defaults.data, (options.attrs && model.whiteListPassedInAttributes(options.attrs)) || {});
            delete options.attrs;
            $.extend(true, defaults, options);

            filterDefaults(defaults);

            defaults.processData = true;
            defaults.type = 'POST';
            defaults.url = url;

            defaults.data = splunkd_utils.normalizeValuesForPOST(defaults.data);

            // beyond this point, patch is equivalent to update
            bbXHR = Backbone.sync.call(null, "update", model, defaults);
            bbXHR.done(function () {
                deferredResponse.resolve.apply(deferredResponse, arguments);
            });
            bbXHR.fail(function () {
                deferredResponse.reject.apply(deferredResponse, arguments);
            });
        };

        var syncDelete = function (model, options) {
            var bbXHR,
                deferredResponse = $.Deferred(),
                defaults = {data: {}};

            defaults.url = generateUrl(model, options);
            $.extend(true, defaults, options);

            filterDefaults(defaults);

            defaults.processData = true;

            bbXHR = Backbone.sync.call(this, "delete", model, defaults);
            bbXHR.done(function () {
                deferredResponse.resolve.apply(deferredResponse, arguments);
            });
            bbXHR.fail(function () {
                deferredResponse.reject.apply(deferredResponse, arguments);
            });
            return deferredResponse.promise();
        };

        return SplunkDBase.extend({
            // attributes: name, key_id, access_secret
            initialize: function () {
                SplunkDBase.prototype.initialize.apply(this, arguments);
            },
            getAttributeNames: function () {
                return [];
            },
            sync: function (method, model, options) {
                switch (method) {
                    case 'create':
                        return syncCreate.call(this, model, options);
                    case 'update':
                        return syncUpdate.call(this, model, options);
                    case 'patch':
                        return syncPatch.call(this, model, options);
                    case 'delete':
                        return syncDelete.call(this, model, options);
                    default:
                        return SplunkDBase.prototype.sync.apply(this, arguments);
                }
            },

            whiteListAttributes: function (fetchOptions) {
                var whiteListOptAndReq = this.getAttributeNames(),
                    whiteListWild = this.splunkDWhiteList.get('wildcard') || [],
                    contentAttrs = this.entry.content.filterByKeys(whiteListOptAndReq,
                        {allowEmpty: true},
                        fetchOptions);

                return _.extend(contentAttrs, this.entry.content.filterByWildcards(whiteListWild, {allowEmpty: true}, fetchOptions));
            },
            fetch: function () {
                var self = this;
                var promise = SplunkDBase.prototype.fetch.apply(this, arguments);
                promise.done(function () {
                    self._fetched = true;
                });
                return promise;
            },
            isFetched: function () {
                return this._fetched === true;
            }
        });
    }
);