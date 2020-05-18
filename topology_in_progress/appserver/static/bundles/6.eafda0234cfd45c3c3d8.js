awsJsonp([6],{

/***/ "splunkjs/mvc/debugger":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {
	    var _ = __webpack_require__("require/underscore");
	    var Backbone = __webpack_require__("require/backbone");
	    var BaseManager = __webpack_require__("splunkjs/mvc/basemanager");
	    var BaseSplunkView = __webpack_require__("splunkjs/mvc/basesplunkview");
	    var BaseTokenModel = __webpack_require__("splunkjs/mvc/basetokenmodel");
	    var SearchModels = __webpack_require__("splunkjs/mvc/searchmodel");
	    var console = window.console;

	    var indent = function(count) {
	        var str = '';
	        for (var i = 0; i < count; i++) { 
	            str += '    '; 
	        }
	        return str;
	    };

	    var warn = function(msg) {
	        return ("WARNING: " + msg);
	    };

	    var categoryEnum = {
	        MANAGER: 'manager',
	        VIEW: 'view',
	        NAMESPACE: 'namespace',
	        UNKNOWN: 'unknown'
	    };

	    var Debugger = Backbone.Model.extend(/** @lends splunkjs.mvc.Debugger.prototype */{
	        ready : false,

	        initialize: function() { 
	            var that = this;    

	            that.registry = that.get('registry');

	            if (!that.registry) {
	                console.log("splunk.mvc debugging interface could not find the registry");
	                return;
	            }

	            // For now this is a command-line tool, so we put information on the command line.
	            console.log("The Splunkjs debugger is running. For help, enter 'splunkjs.mvc.Debugger.help()'");
	        },

	        isReady: function() {
	            return this.ready;
	        },

	        getDebugData: function() {

	            var that = this;
	            var components = [];

	            var registeredComponentKeys = that.registry.getInstanceNames();

	            _.each(registeredComponentKeys, function(elementID) {
	                var registryElement = that.registry.getInstance(elementID);
	                var type = that._getComponentType(registryElement);
	                var category = that._getComponentCategory(registryElement);
	                var validOptions = [];
	                
	                var elementMetaData = { 
	                    'id' : elementID,
	                    'category' : category,
	                    'type': type,
	                    'warnings': []
	                };

	                // Add data to views
	                if (category === categoryEnum.VIEW) {
	                    var managerid = null;
	                    var settings = {};
	                    validOptions = that._getValidViewOptions(registryElement);

	                    // If the view has settings we inspect them for issues
	                    // JIRA: DVPL-3316
	                    if (registryElement.settings) {
	                        managerid = registryElement.settings.get('managerid') || null;
	                        settings = _.clone(registryElement.settings.attributes);
	                        
	                        _.each(_.keys(settings), function(key) {

	                            // If a setting is not known to be valid we add a warning
	                            if (!_.contains(validOptions, key)) {

	                                // Ignore unrecognized map and chart settings
	                                // JIRA: DVPL-3317
	                                var partOne = key.split('.')[0];
	                                if (!(partOne === 'mapping' || partOne === 'charting')) {
	                                    elementMetaData.warnings.push(warn(key + " is not a recognized setting."));
	                                }
	                            }
	                        });
	                    }
	                    
	                    elementMetaData.managerid = managerid;
	                    elementMetaData.settings = settings;
	                    elementMetaData.el = registryElement.el || "no element set";
	                }
	                // Add data to token namespaces
	                if (category === categoryEnum.NAMESPACE) {
	                    elementMetaData.tokens = [];

	                    // For each token in the namespace, attach the value and an empty list of 
	                    // listeners that will be populated later 
	                    _.each(registryElement.attributes, function(value, key) {
	                        var tokenData = {
	                            name: key,
	                            value : value,
	                            listenerIds: []
	                        };
	                        elementMetaData.tokens.push(tokenData);
	                    });
	                }    
	                // Add data to managers
	                if (category === categoryEnum.MANAGER) {
	                    validOptions = that._getValidManagerOptions(registryElement);
	                    
	                    if (registryElement.attributes) {
	                        var attributes = _.clone(registryElement.attributes);
	                        
	                        _.each(_.keys(attributes), function(key) {
	                            // If a setting is not known to be valid we add a warning
	                            if (!_.contains(validOptions, key)) {
	                                elementMetaData.warnings.push(warn(key + " is not a recognized attribute"));
	                            }
	                        });
	                    }
	                    
	                    elementMetaData.attributes = registryElement.attributes;
	                    elementMetaData.query = registryElement.query;
	                    elementMetaData.search = registryElement.search;
	                }

	                // Add token data to everything but namespaces
	                if (category !== categoryEnum.NAMESPACE) {
	                    elementMetaData.bindings = that._getComponentBindings(elementID);
	                }
	                components.push(elementMetaData);                
	            });
	                
	            // Now that we have our elements in place, we can check connections between them
	            // and look for other potential issues. First, separate componenet types for convenience.
	            var managers = _.where(components, {'category' : categoryEnum.MANAGER});
	            var views = _.where(components, {'category' : categoryEnum.VIEW});
	            var namespaces = _.where(components, {'category' : categoryEnum.NAMESPACE});
	            
	            // Enumerate views bound to each manager and check for issues
	            _.each(managers, function(manager) {
	                // Pluck the view ids from views where managerid is this manager's id
	                manager.viewIds = _.pluck(_.where(views, {'managerid': manager.id}), 'id');

	                // If there are no views bound to the search, push a warning
	                if (manager.viewIds.length < 1) { 
	                    manager.warnings.push(warn("no views bound to search manager."));
	                }
	            });

	            // Check for views bound to non-existent managers
	            _.each(views, function(view) {
	                if (view.managerid) {
	                    if (!_.contains(_.pluck(managers, 'id'), view.managerid)) {
	                        view.warnings.push(warn(view.managerid + " is not a registered manager."));
	                    }
	                }
	            });

	            // Find components bound to each token and attach them to token metadata
	            _.each(namespaces, function(namespace) {
	                _.each(namespace.tokens, function(token) {
	                    // Look through views and managers and find those that watch this
	                    // token's name
	                    var listeners = _.filter(_.union(managers, views), function(item) {
	                        return _.some(item.bindings, function(binding) {
	                            if (binding && binding.observes && binding.observes.length > 0) {
	                                return _.some(binding.observes, function(observes) {
	                                    return (observes.namespace === namespace.id && observes.name === token.name);        
	                                });
	                            }
	                        });
	                    });

	                    // Attach just the ids of the listeners
	                    token.listenerIds = _.pluck(listeners, 'id');
	                });
	            });

	            return components;
	        },

	        _getValidViewOptions: function(element) {
	            var options = ['id', 'name', 'managerid', 'manager', 'app', 'el', 'data'];

	            // Again we check this is valid.
	            if (element.constructor.prototype.options) {
	                options = _.union(options, _.keys(element.constructor.prototype.options));
	            }
	            return options;
	        },

	        _getValidManagerOptions: function(element) {
	            var validOptions = _.union(
	                ['app', 'id', 'owner', 'name', 'data'], 
	                _.keys(element.constructor.prototype.defaults) || [], 
	                SearchModels.SearchSettingsModel.ALLOWED_ATTRIBUTES
	            );
	            
	            return validOptions;
	        },

	        _getComponentType: function(component) {
	            var type = "Unknown type";
	            if (component.moduleId) {
	                var name = component.moduleId.split('/').pop();
	                if (name.length > 0) {
	                    type = name;
	                }                
	            }
	            return type;
	        },

	        _getComponentCategory: function(component) {
	            var category = categoryEnum.UNKNOWN;

	            if (component instanceof BaseSplunkView) {
	                category = categoryEnum.VIEW;
	            }
	            else if (component instanceof BaseManager) {
	                category = categoryEnum.MANAGER;
	            }
	            else if (component instanceof BaseTokenModel) {
	                category = categoryEnum.NAMESPACE;
	            }
	            return category;
	        },

	        _getComponentTokenBoundProperties: function(componentId) {
	            var tokenBoundProperties = [];
	            var bindings = this._getComponentBindings(componentId);
	            tokenBoundProperties = _.keys(bindings);
	            return tokenBoundProperties;
	        },

	        _getComponentBindings: function(componentId) {
	            var component = this.registry.getInstance(componentId);
	            
	            var bindings = {};
	            if (component && component.settings) {
	                bindings = _.extend(bindings, _.clone(component.settings._bindings));
	            }
	            return bindings;
	        },
	        
	        createError: function(message) {            
	            return message;
	        },

	        printViewInfo: function() {
	            var that = this;
	            var views = that.getInfoForViews();

	            console.log("Views:");
	            _.each(views, function(view) {
	                console.log(indent(1) + "ID: " + view.id);
	                console.log(indent(2) + "Type: " + view.type);
	                console.log(indent(2) + "Manager: " + view.managerid);
	                console.log(indent(2) + "Element: ", view.el);
	                console.log(indent(2) + "Settings: ");
	                _.each(_.keys(view.settings), function(key) {
	                    var tokenInfo = "";
	                    var binding = view.bindings[key];
	                    var hasTokens = binding && binding.observes && binding.observes.length > 0;
	                    if (hasTokens) {
	                        var template = JSON.stringify(binding.template);
	                        var partiallyResolvedValue = JSON.stringify(binding.computeValue(/*_retainUnmatchedTokens=*/true));
	                        tokenInfo = " [bound: " + template + ", resolved: " + partiallyResolvedValue + "]";    
	                    }
	                    console.log(indent(3) + key + ": " + JSON.stringify(view.settings[key]) + tokenInfo); 
	                });
	                if(view.warnings.length>0) {
	                    console.log(indent(2) + "WARNINGS: ");
	                    _.each(view.warnings, function(warning) {
	                        console.log(indent(3) + warning);
	                    });
	                }
	            });
	        },

	        printSearchManagerInfo: function() {
	            var that = this;
	            var managers = that.getInfoForManagers();

	            console.log("Search Managers:");
	            _.each(managers, function(manager) {
	                console.log(indent(1) + "ID: " + manager.id);
	                console.log(indent(2) + "Type: " + manager.type);
	                if (manager.attributes) {
	                    console.log(indent(2) + "Attributes: " );
	                    var propertiesToSkip = SearchModels.SearchSettingsModel.ALLOWED_ATTRIBUTES;
	                    
	                    _.each(manager.attributes, function(value, key) {
	                        if (_.contains(propertiesToSkip, key)) {
	                            return;
	                        }
	                        console.log(indent(3) + key + ": " + JSON.stringify(value)); 
	                    });
	                }
	                if (manager.settings && manager.settings.attributes) {
	                    console.log(indent(2) + "Search Properties: " );
	                    _.each(manager.settings.attributes, function(value, key) {
	                        var tokenInfo = "";
	                        var binding = manager.bindings[key];
	                        var hasTokens = binding && binding.observes && binding.observes.length > 0;
	                        if (hasTokens) {
	                            var template = JSON.stringify(binding.template);
	                            var partiallyResolvedValue = JSON.stringify(binding.computeValue(/*_retainUnmatchedTokens=*/true));
	                            tokenInfo = " [bound: " + template + ", resolved: " + partiallyResolvedValue + "]";    
	                        }
	                        console.log(indent(3) + key + ": " + JSON.stringify(value) + tokenInfo); 
	                    });
	                }
	                console.log(indent(2) + "Views bound to manager: ");
	                _.each(manager.viewIds, function(id) {
	                    console.log(indent(3) + id);
	                });
	                if (manager.warnings.length > 0) {
	                    console.log(indent(2) + "WARNINGS: ");
	                    _.each(manager.warnings, function(warning) {
	                        console.log(indent(3) + warning);
	                    });
	                }
	            });
	        },

	        printTokenNamespaceInfo: function() {
	            var that = this;
	            var namespaces = that.getInfoForNamespaces();

	            console.log("Token Namespaces:");
	            _.each(namespaces, function(namespace) {
	                console.log(indent(1) + "ID: " + namespace.id);
	                console.log(indent(2) + "Type: " + namespace.type);
	                console.log(indent(2) + "Tokens: ");
	                _.each(namespace.tokens, function(token) {
	                    console.log(indent(3) + token.name + ": ");
	                    console.log(indent(4) + "value: " + JSON.stringify(token.value));
	                    console.log(indent(4) + "listeners: " + token.listenerIds.join(', '));
	                });
	            });
	        },

	        /**
	         * Prints all component info
	         */
	        printComponentInfo: function() {
	            this.printViewInfo();
	            this.printSearchManagerInfo();
	            this.printTokenNamespaceInfo();
	        },

	        printWarnings: function() {
	            var that = this;
	            var components = that.getDebugData();
	            console.log("WARNINGS:");
	            _.each(components, function(item) {
	                if (item.warnings.length > 0 ) {
	                    console.log(indent(1), "ID: " + item.id + ": ");
	                    _.each(item.warnings, function(warning) {
	                        console.log(indent(2) + warning);
	                    });
	                }             
	            });
	        },

	        _getInfoForComponents: function(ctype) {
	            var components = this.getDebugData();
	            if (ctype !== undefined) {
	                return _.where(components, {'category': categoryEnum[ctype]});
	            }
	            return components;
	        },

	        getInfoForViews: function() { 
	            return this._getInfoForComponents('VIEW'); 
	        },

	        getInfoForManagers: function() { 
	            return this._getInfoForComponents('MANAGER'); 
	        },

	        getInfoForNamespaces: function() { 
	            return this._getInfoForComponents('NAMESPACE'); 
	        },

	        help : function() { 
	            console.log("Splunkjs Debugger Commands");
	            console.log(indent(1) + "- printWarnings(): Prints all warnings to the console.");
	            console.log(indent(1) + "- printComponentInfo(): Prints all debug info and warnings to the console by component.");
	            console.log(indent(1) + "- printViewInfo(): Prints debug info for all Splunk views.");
	            console.log(indent(1) + "- printSearchManagerInfo(): Prints debug info for all Splunk search managers.");
	            console.log(indent(1) + "- printTokenNamespaceInfo(): Prints debug info for Splunk token namespaces.");
	            console.log(indent(1) + "- getDebugData(): Returns all debug metadata for components and namespaces.");
	            console.log(indent(1) + "- getInfoForViews(): Returns debug metadata for all Splunk views.");
	            console.log(indent(1) + "- getInfoForManagers(): Returns debug metadata for all Splunk managers.");
	            console.log(indent(1) + "- getInfoForNamespaces(): Returns debug metadata for all Splunk token namespaces.");
	        }

	    });
	    
	    return Debugger;
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunkjs/mvc/basesplunkview":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {
	    var _ = __webpack_require__("require/underscore");
	    var mvc = __webpack_require__("splunkjs/mvc/mvc");
	    var console = __webpack_require__("util/console");
	    var Backbone = __webpack_require__("require/backbone");
	    var Settings = __webpack_require__("splunkjs/mvc/settings");
	    var viewloggingmixin = __webpack_require__("mixins/viewlogging");

	    /**
	     * @constructor
	     * @memberOf splunkjs.mvc
	     * @name BaseSplunkView
	     * @private
	     * @description The **BaseSplunkView** base view class is used for Splunk 
	     * views. This class is not designed to be subclassed. Extend 
	     * {@link splunkjs.mvc.SimpleSplunkView} instead.
	     * @extends splunkjs.mvc.Backbone.View
	     * @mixes viewlogging 
	     * 
	     * @param {Object} options 
	     * @param {String} options.id - The unique ID for this control.
	     * @param {String} options.el - Pre-existing &lt;div&gt; tag in which to render
	     * this view.
	     * @param {Object} options.settings -  A **Settings** model instance to 
	     * use.
	     * @param {Object} options.settingsOptions -  Initial options for this 
	     * view's **Settings** model.
	     * @param {Object} options.* - Initial attributes for this view's 
	     * **Settings** model. See the subclass documentation for details.
	     * @param {Object} settingsOptions - The initial options for this view's
	     * **Settings** model.
	     */
	    var BaseSplunkView = Backbone.View.extend(/** @lends splunkjs.mvc.BaseSplunkView.prototype */{
	        _numConfigureCalls: 0,
	        
	        /**
	         * @protected
	         * Names of options that will be excluded from this component's
	         * settings model if passed to the constructor.
	         */
	        omitFromSettings: [],
	        _uniqueIdPrefix: 'view_',

	        constructor: function(options, settingsOptions) {
	            options = options || {};
	            settingsOptions = settingsOptions || {};
	            
	            options.settingsOptions = _.extend(
	                options.settingsOptions || {},
	                settingsOptions);

	            // Internal property to track object lifetime. 
	            // With this flag we want to prevent invoking methods / code
	            // on already removed instance.
	            this._removed = false;
	            
	            // Get an ID or generate one
	            var id = options.id;
	            if (id === undefined && options.name) {
	                id = options.name;
	                console.warn("Use of 'name' to specify the ID of a Splunk model is deprecated.");
	            }

	            if (id === undefined) {
	                id = _.uniqueId(this._uniqueIdPrefix || 'view_');
	            }

	            this.name = this.id = options.name = options.id = id;

	            this.options = _.extend({}, this.options, options);

	            // Delegate to Backbone.View's constructor.
	            // NOTE: This will call initialize() as a side effect.
	            var returned = Backbone.View.prototype.constructor.apply(this, arguments);
	            if (this._numConfigureCalls == 0) {
	                // initialize() should have called configure() but did not.
	                // In this case automatically call configure().
	                this.configure();
	            }

	            // Register self in the global registry
	            mvc.Components.registerInstance(this.id, this, { replace: settingsOptions.replace });
	            
	            return returned;
	        },
	        
	        /**
	         * @protected
	         * Initializes this view's settings model based on the contents of
	         * `this.options`.
	         */
	        configure: function() {
	            this._numConfigureCalls++;
	            if (this._numConfigureCalls > 1) {
	                throw new Error('BaseSplunkView.configure() called multiple times.');
	            }
	            
	            // We may have received a Settings model instance to use instead
	            // of creating our own. If so, we just use it and return immediately.
	            var settings = this.options.settings;
	            if (settings && (settings instanceof Settings)) {
	                this.settings = settings;
	                return this;
	            }
	            
	            // Reinterpret remaining view options as settings attributes.
	            var localOmitFromSettings = (this.omitFromSettings || []).concat(
	                ['model', 'collection', 'el', 'attributes', 
	                 'className', 'tagName', 'events', 'settingsOptions']);

	            var settingsAttributes = _.omit(this.options, localOmitFromSettings);
	            var settingsOptions = this.options.settingsOptions;

	            // Now, we create our default settings model.
	            this.settings = new Settings(settingsAttributes, settingsOptions);

	            return this;
	        },
	        
	        // JIRA: Just invoke configure() from constructor() instead of
	        //       relying on subclasses to do it. (Don't forget to update
	        //       the doc comment above.) (DVPL-2436)
	        /**
	         * Initializes this view.
	         * 
	         * Subclasses are expected to override this method.
	         * 
	         * All implementations must call {@link splunkjs.mvc.configure | configure}, usually at the beginning
	         * of this method.
	         */
	        initialize: function() {
	            Backbone.View.prototype.initialize.apply(this, arguments);
	        },
	        
	        remove: function() {
	            this._removed = true;

	            this.settings.dispose();

	            // Call our super class
	            Backbone.View.prototype.remove.apply(this, arguments);
	            
	            // Remove it from the registry
	            if (mvc.Components.getInstance(this.id) === this) {
	                mvc.Components.revokeInstance(this.id);
	            }
	            
	            return this;
	        },
	        
	        dispose: function() {
	            this.remove();
	        },

	        setElement: function() {
	            // We're doing this in setElement for a few reasons:
	            // 1. It means that subclasses won't have to worry about
	            // calling our initialize class.
	            // 2. It is actually the most robust way to do this, because
	            // it means we will catch both construction of new views, as 
	            // well as later calls to setElement
	            
	            // Call our super class
	            Backbone.View.prototype.setElement.apply(this, arguments);
	            
	            // Now that we have our new $el, we can call addClass on it
	            this.$el.addClass("splunk-view");
	            if (this.className) {
	                this.$el.addClass(this.className);
	            }
	            
	            if (!this.$el.attr('id')) {
	                this.$el.attr('id', this.id);
	            }
	            
	            return this;
	        },
	        
	        bindToComponentSetting: function(settingName, fn, fnContext) {
	            this.listenTo(this.settings, "change:" + settingName, function(model, value, options) {
	                var oldComponentName = this.settings.previous(settingName);
	                var newComponentName = value;
	                
	                this.unbindFromComponent(oldComponentName, fn, fnContext);
	                this.bindToComponent(newComponentName, fn, fnContext);
	            }, this);
	            
	            var initialComponentName = this.settings.get(settingName);
	            this.bindToComponent(initialComponentName, fn, fnContext);
	        },

	        bindToComponent: function(id, fn, fnContext) {
	            // Abort if required parameters are missing
	            if (!id || !fn) {
	                return this;
	            }
	            
	            // We register on the "change:{id}" event
	            this.listenTo(mvc.Components, "change:" + id, fn, fnContext);

	            // However, it could be that the component already exists,
	            // in which case, we will invoke the callback manually
	            if (mvc.Components.has(id)) {
	                var ctx = mvc.Components.get(id);
	                _.defer(_.bind(function() {
	                    if (!this._removed) {
	                        fn.apply(fnContext, [mvc.Components, ctx, {}]);
	                    }
	                }, this));
	            }
	            
	            return this;
	        },

	        unbindFromComponent: function(id, fn, fnContext) {
	            // A component id is required
	            if (!id) {
	                return this;
	            }
	            
	            // We register on the "change:{id}" event
	            mvc.Components.off("change:" + id, fn, fnContext);
	            
	            return this;
	        }
	    });

	    _.extend(BaseSplunkView.prototype, viewloggingmixin);
	    
	    return BaseSplunkView;
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	/**
	 * Click event.
	 *
	 * @event
	 * @name splunkjs.mvc.TableView#click
	 * @property {Boolean} click:row - Fired when a row is clicked.
	 * @property {Boolean} click:chart - Fired when a cell is clicked.
	 */


/***/ }),

/***/ "splunkjs/mvc/settings":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {
	    var TokenAwareModel = __webpack_require__("splunkjs/mvc/tokenawaremodel");

	    /**
	     * @constructor
	     * @memberOf splunkjs.mvc
	     * @name Settings
	     * @description The **Settings** base input class contains the Settings model
	     * for SplunkJS components.
	     * @extends splunkjs.mvc.TokenAwareModel
	    */
	    var Settings = TokenAwareModel.extend(/** @lends splunkjs.mvc.Settings.prototype */{
	        sync: function() { return false; }
	    });
	    
	    return Settings;
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ })

});