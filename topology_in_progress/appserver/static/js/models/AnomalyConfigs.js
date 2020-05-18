define([
        'jquery',
        'underscore',
        'backbone',
        'splunkjs/mvc',
        'app/views/anomaly_detection/Config'
    ], function ($, _, Backbone, mvc, SystemConfig) {
        var service = mvc.createService({owner: 'nobody', app: 'splunk_app_aws'});
        // GET/CREATE/UPDATE/DELETE stanza from anomalyconfigs.conf.
        return Backbone.Model.extend({
            defaults: {
                success: false,
                configs: {},
                tags: [],
                usedNames: []
            },
            initialize: function () {
                Backbone.Model.prototype.initialize.apply(this, arguments);
            },
            fetchData: function () {
                if (this.get('success')) {
                    // avoid fetching multiple times
                    this.trigger('loadSuccess');
                    return;
                }
                var request = service.request(
                    'configs/conf-anomalyconfigs',
                    'GET',
                    {fillcontents: 1}
                );
                request.done(function (response) {
                    var data = JSON.parse(response);
                    var configs = {};
                    var tags = [];
                    var names = [];
                    _.each(data.entry, function (e) {
                        if (_.isEmpty(e.name)) {
                            return;
                        }
                        configs[e.name] = e.content;
                        configs[e.name][SystemConfig.JOB_ID] = e.name;
                        if (SystemConfig.JOB_TAGS in configs[e.name] && !_.isEmpty(configs[e.name][SystemConfig.JOB_TAGS])) {
                            tags = _.union(tags, configs[e.name][SystemConfig.JOB_TAGS].split(','));
                        }
                        if (SystemConfig.JOB_NAME in configs[e.name] && !_.isEmpty(configs[e.name][SystemConfig.JOB_NAME])) {
                            names.push(configs[e.name][SystemConfig.JOB_NAME]);
                        }
                    });
                    tags.sort();
                    this.set({configs: configs, tags: tags, success: true, usedNames: names});
                    this.trigger('loadSuccess');
                }.bind(this));
                request.fail(function (xhr, status, error) {
                    this.trigger('loadFail', error);
                }.bind(this));
            },
            getNameWithSearch: function (search) {
                var configs = this.get('configs');
                var keys = Object.keys(configs);
                for (var i = 0; i < keys.length; i++) {
                    var curConfig = configs[keys[i]];
                    if (SystemConfig.JOB_NAME in curConfig && SystemConfig.JOB_SEARCH in curConfig && curConfig[SystemConfig.JOB_SEARCH] === search) {
                        return curConfig[SystemConfig.JOB_NAME];
                    }
                }
                return '';
            },
            getJobWithName: function (name) {
                var configs = this.get('configs');
                var keys = Object.keys(configs);
                for (var i = 0; i < keys.length; i++) {
                    var curConfig = configs[keys[i]];
                   if (SystemConfig.JOB_NAME in curConfig && curConfig[SystemConfig.JOB_NAME] === name) {
                        return curConfig;
                    }
                }
                return null;
            },
            createStanza: function (stanzaObj) {
                var jobId = this._generateUUID();
                var content = $.extend({name: jobId}, stanzaObj);
                var request = service.request(
                    'configs/conf-anomalyconfigs',
                    'POST',
                    null, //query
                    content);
                var deferred = $.Deferred();
                request.done(function (response) {
                    this.set('success', false);
                    deferred.resolve(jobId);
                }.bind(this));
                request.fail(function (xhr, status, error) {
                    deferred.reject();
                }.bind(this));
                return deferred.promise();
            },
            updateStanza: function (stanzaName, stanzaObj) {
                var request = service.request(
                    'configs/conf-anomalyconfigs/' + stanzaName,
                    'POST',
                    null, //query
                    stanzaObj);
                var deferred = $.Deferred();
                request.done(function (response) {
                    this.set('success', false);
                    deferred.resolve();
                }.bind(this));
                request.fail(function (xhr, status, error) {
                    deferred.reject();
                }.bind(this));
                return deferred.promise();
            },
            deleteStanza: function (stanzaName) {
                var request = service.request(
                    'configs/conf-anomalyconfigs/' + stanzaName,
                    'DELETE'
                );
                var deferred = $.Deferred();
                request.done(function (response) {
                    deferred.resolve();
                }.bind(this));
                request.fail(function (xhr, status, error) {
                    deferred.reject();
                }.bind(this));
                return deferred.promise();
            },
            _generateUUID: function () {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            }
        });
    }
);

