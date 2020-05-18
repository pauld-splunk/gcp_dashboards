awsJsonp([3],{

/***/ "views/shared/map/Master":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*
	 * The master view for visualizing maps (marker maps and choropleth maps).
	 *
	 * Unlike other visualizations renderers, this view just acts as a wrapper for the raw mapping library code,
	 * but does not do any "rendering".
	 *
	 * It provides the common API expected in the Splunk UI, and translates the models and events it receives
	 * into the corresponding property updates to the mapping library API.
	 */

	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var $ = __webpack_require__("shim/jquery");
	    var SplunkI18N = __webpack_require__("stubs/i18n");
	    var _ = __webpack_require__("require/underscore");
	    var SplunkUtil = __webpack_require__("shim/splunk.util");
	    var sprintf = SplunkUtil.sprintf;
	    var Color = __webpack_require__("contrib/jg_lib/graphics/Color");
	    var FunctionUtil = __webpack_require__("contrib/jg_lib/utils/FunctionUtil");
	    var BaseModel = __webpack_require__("models/Base");
	    var ExternalLegend = __webpack_require__("splunk/charting/ExternalLegend");
	    var Map = __webpack_require__("splunk/mapping/Map");
	    var ChoroplethLayer = __webpack_require__("splunk/mapping/layers/ChoroplethLayer");
	    var PieMarkerLayer = __webpack_require__("splunk/mapping/layers/PieMarkerLayer");
	    var LatLonBoundsParser = __webpack_require__("splunk/mapping/parsers/LatLonBoundsParser");
	    var LatLonParser = __webpack_require__("splunk/mapping/parsers/LatLonParser");
	    var ColorCodes = __webpack_require__("splunk/palettes/ColorCodes");
	    var FieldColorPalette = __webpack_require__("splunk/palettes/FieldColorPalette");
	    var ListColorPalette = __webpack_require__("splunk/palettes/ListColorPalette");
	    var ArrayParser = __webpack_require__("splunk/parsers/ArrayParser");
	    var BooleanParser = __webpack_require__("splunk/parsers/BooleanParser");
	    var ColorParser = __webpack_require__("splunk/parsers/ColorParser");
	    var NumberParser = __webpack_require__("splunk/parsers/NumberParser");
	    var ObjectParser = __webpack_require__("splunk/parsers/ObjectParser");
	    var StringParser = __webpack_require__("splunk/parsers/StringParser");
	    var GeoJsonUtils = __webpack_require__("splunk/mapping/utils/GeoJsonUtils");
	    var VisualizationBase = __webpack_require__("views/shared/viz/Base");
	    var console = __webpack_require__("util/console");
	    var ResetZoomControl = __webpack_require__("splunk/mapping/controls/ResetZoomControl");
	    var NumericAxis = __webpack_require__("splunk/mapping/axis/NumericAxis");
	    var NumericLegend = __webpack_require__("splunk/mapping/controls/NumericalLegend");
	    var GeneralUtils = __webpack_require__("util/general_utils");
	    var CategoricalVisualLegend = __webpack_require__("splunk/mapping/controls/CategoricalVisualLegend");

	    var css = __webpack_require__("views/shared/map/Master.pcss");

	    var _DEFAULT_DATA_PARAMS = {
	        output_mode: 'json_cols',
	        show_metadata: true,
	        show_empty_fields: 'True',
	        offset: 0
	    };

	    var _DEFAULT_PROPERTY_VALUES = {
	        "fieldColors": "",
	        "seriesColors": "[" + ColorCodes.toPrefixed(ColorCodes.CATEGORICAL, "0x").join(",") + "]",
	        "data.maxClusters": "100",
	        "showTiles": "1",
	        "tileLayer.tileOpacity": "1",
	        "tileLayer.url": "/splunkd/__raw/services/mbtiles/splunk-tiles/{z}/{x}/{y}",
	        "tileLayer.subdomains": "[a,b,c]",
	        "tileLayer.minZoom": "0",
	        "tileLayer.maxZoom": "7",
	        "tileLayer.invertY": "false",
	        "tileLayer.attribution": "",
	        "map.scrollZoom" : 0,
	        "map.panning": true,
	        "markerLayer.markerOpacity": "1",
	        "markerLayer.markerMinSize": "10",
	        "markerLayer.markerMaxSize": "50",
	        "drilldown": "all",
	        "choroplethLayer.colorMode": "auto",
	        "choroplethLayer.maximumColor": "0xDB5800",
	        "choroplethLayer.minimumColor": "0x2F25BA",
	        "choroplethLayer.neutralPoint": "0",
	        "choroplethLayer.shapeOpacity": "0.75",
	        "choroplethLayer.colorBins": "5",
	        "choroplethLayer.showBorder": "1",
	        "layerType": "marker"
	    };

	    var _R_PROPERTY_PREFIX = /^display\.visualizations\.mapping\./;

	    return VisualizationBase.extend({

	        // Public Properties

	        moduleId: module.id,

	        // Private Properties

	        _map: null,
	        _markerLayer: null,
	        _choroplethLayer: null,
	        _externalLegend: null,
	        _fieldColorPalette: null,
	        _seriesColorPalette: null,
	        _choroplethColorPalette: null,

	        // This property will track the user-specified color mode for the choropleth visualization,
	        // It will equal either an explicit color mode (sequential/divergent/categorical) or "auto",
	        // the latter meaning that the color mode should be auto-detected from the data.
	        _choroplethColorMode: null,

	        // This property will track the color mode that has been auto-detected by inspecting the data set.
	        // Its value will only affect the choropleth visualization if the user-specified "choroplethLayer.colorMode" is "auto".
	        _choroplethAutoDetectedColorMode: 'sequential',

	        _choroplethMinimumColor: Color.fromNumber(0x000000),
	        _choroplethNeutralColor: Color.fromNumber(0xffffff),
	        _choroplethMaximumColor: Color.fromNumber(0x000000),
	        _choroplethNullColor: Color.fromNumber(0xD1D1D1),
	        _numericLegend: null,
	        _numericAxis: null,
	        _propertyValues: null,
	        _booleanParser: null,
	        _numberParser: null,
	        _stringParser: null,
	        _colorParser: null,
	        _numberArrayParser: null,
	        _stringArrayParser: null,
	        _colorArrayParser: null,
	        _numberObjectParser: null,
	        _colorObjectParser: null,
	        _latLonParser: null,
	        _latLonBoundsParser: null,
	        _maxClusters: 100,
	        _isPrinting: false,
	        _prePrintCenter: null,
	        _prePrintZoom: 0,
	        _drilldown: "all",
	        _layerType: null,

	        // Constructor

	        initialize: function(options) {
	            if (!this.model.config) {
	                this.model.config = new BaseModel();
	            }
	            VisualizationBase.prototype.initialize.apply(this, arguments);
	            this.options = options || {};
	            this.$el.width(this.options.width || "100%");
	            this.$el.height(this.options.height || "100%");

	            this._map_boundsChanged = FunctionUtil.bind(this._map_boundsChanged, this);
	            this._map_mapClicked = FunctionUtil.bind(this._map_mapClicked, this);

	            this._propertyValues = {};

	            this._booleanParser = BooleanParser.getInstance();
	            this._numberParser = NumberParser.getInstance();
	            this._stringParser = StringParser.getInstance();
	            this._colorParser = ColorParser.getInstance();
	            this._numberArrayParser = ArrayParser.getInstance(this._numberParser);
	            this._stringArrayParser = ArrayParser.getInstance(this._stringParser);
	            this._colorArrayParser = ArrayParser.getInstance(this._colorParser);
	            this._numberObjectParser = ObjectParser.getInstance(this._numberParser);
	            this._colorObjectParser = ObjectParser.getInstance(this._colorParser);
	            this._latLonParser = LatLonParser.getInstance();
	            this._latLonBoundsParser = LatLonBoundsParser.getInstance();

	            this._seriesColorPalette = new ListColorPalette();
	            this._fieldColorPalette = new FieldColorPalette(null, this._seriesColorPalette);


	            this._externalLegend = new ExternalLegend();
	            this._categoricalVisualLegend = new CategoricalVisualLegend();

	            this._externalLegend.connect();

	            // currently we create both markerLayer and choroplethLayer, because it helps _setMapProperty() to
	            // keep current logic valid. We add or remove one of these two layers to the map based on the 'layerType' property.
	            // TODO: optimize the logic, to make sure we just create either markerLayer or choroplethLayer

	            this._markerLayer = new PieMarkerLayer();
	            this._markerLayer.set("legend", this._externalLegend);
	            this._markerLayer.set("markerColorPalette", this._fieldColorPalette);

	            this._numericAxis = new NumericAxis();
	            this._numericLegend = new NumericLegend();

	            this._choroplethColorPalette = new ListColorPalette(null, true);
	            this._updateChoroplethColorPalette();

	            this._choroplethLayer = new ChoroplethLayer();
	            this._choroplethLayer.set("colorPalette", this._choroplethColorPalette);

	            this._numericLegend.set("axis", this._numericAxis);
	            this._categoricalVisualLegend.set("colorPalette", this._fieldColorPalette);
	            this._categoricalVisualLegend.set("legend", this._externalLegend);
	            this._choroplethLayer.set("legend", this._externalLegend);

	            this._numericLegend.set('colorPalette', this._choroplethColorPalette);

	            this._map = new Map();
	            this._updateDataBounds();

	            this._map.formatNumber = this._formatNumber;
	            this._map.formatDegrees = this._formatDegrees;
	            var originalZoom = this.model.config.get('display.visualizations.mapping.map.zoom');
	            var originalCenter = this.model.config.get('display.visualizations.mapping.map.center');
	            this._map.on("boundsChanged", this._map_boundsChanged.bind(this));
	            this._map.on("mapClicked", this._map_mapClicked);
	            this._map.appendTo(this.$el);
	            this._map.fitWorld(true);
	            this._reset_zoom = new ResetZoomControl({originalZoom: originalZoom, originalCenter: originalCenter});
	            this._map.addControl(this._reset_zoom);

	            this.$el.find(".leaflet-top").css("z-index","50");

	            this.$el.on('mouseenter', '.legend-elem', function(e) {
	                var fieldName = $(e.currentTarget).data().fieldName;
	                this._choroplethLayer.set("selectedField", "" + fieldName);
	                this._numericLegend.set("selectedField", "" + fieldName);
	                this._categoricalVisualLegend.set("selectedField", "" + fieldName);
	            }.bind(this));

	            this.$el.on('mouseleave', '.legend-elem', function(e) {
	                this._choroplethLayer.set("selectedField", null);
	                this._numericLegend.set("selectedField", null);
	                this._categoricalVisualLegend.set("selectedField", null);
	            }.bind(this));
	        },

	        // Public Methods

	        getCenter: function() {
	            return this._map.get("center").normalize();
	        },

	        getZoom: function() {
	            return this._map.get("zoom");
	        },

	        getLatLonBounds: function() {
	            return this._map.getLatLonBounds().normalize();
	        },

	        getScrollWheelZoom: function() {
	            return this._map.leafletMap.scrollWheelZoom._enabled;
	        },

	        getPostProcessSearch: function() {
	            var bounds = this._map.getLatLonBounds().normalize();
	            if (this._layerType === "marker") {
	                return "geofilter south=" + bounds.s + " west=" + bounds.w + " north=" + bounds.n + " east=" + bounds.e + " maxclusters=" + this._maxClusters;
	            }
	            return 'geomfilter min_y=' + bounds.s + ' min_x=' + bounds.w + ' max_y=' + bounds.n + ' max_x=' + bounds.e;
	        },

	        getMaxClusters: function() {
	            if (this._layerType === "marker") {
	                return this._maxClusters;
	            } else {
	                return 2000;
	            }
	        },

	        // Since this view is only providing wrapper functionality, the formatData routine
	        // does not return anything like in other visualizations.  Instead, it processes
	        // the raw data and communicates it downstream in the form of mapping API calls.
	        formatData: function() {
	            var extractedData = null;
	            if (this.model.searchData.has('rows'))
	                extractedData = this._extractRowData(this.model.searchData);
	            else
	                extractedData = this._extractColumnData(this.model.searchData);

	            console.debug('Updating map data to', extractedData);
	            var values = [];

	            this._layerType = this.model.config.get('display.visualizations.mapping.type');
	            if ((this._layerType === "marker") && this._markerLayer) {
	                this._markerLayer.set("data", extractedData ? extractedData.data : null);
	                this._markerLayer.set("fields", extractedData ? this._filterFields(extractedData.fields) : null);
	            } else if ((this._layerType === "choropleth") && this._choroplethLayer) {
	                if (!_(extractedData.fields).contains('geom')) {
	                    this._choroplethLayer.set("featureIdFieldName", null);
	                    this._choroplethLayer.set("data", null);
	                    this._choroplethLayer.set("fields", null);
	                    return;
	                }
	                var featureIdField = extractedData.data[0]['_featureIdField'];
	                var filteredFields;
	                if (featureIdField) {
	                    filteredFields = _.union([featureIdField], this._filterFields(extractedData.fields));
	                }

	                if (filteredFields && filteredFields.length > 1) {
	                    var fieldToExtract = filteredFields[1];
	                    for(var j = 0; j < extractedData.data.length; j++) {
	                        values.push(extractedData.data[j][fieldToExtract]);
	                    }
	                    if (values.length > 0) {
	                        this._choroplethAutoDetectedColorMode = GeneralUtils.valuesAreNumeric(values) ? 'sequential' : 'categorical';
	                    }
	                    // Set the value of the auto-detected color mode on the config model to be read by the viz editor.
	                    this.model.config.set({ autoDetectedColorMode: this._choroplethAutoDetectedColorMode }, {'transient': true});

	                    // If the user-selected color mode is "auto", update the state of the choropleth visualization to match the
	                    // to match the auto-detected color mode.
	                    if (this._choroplethColorMode === 'auto') {
	                        this._updateChoroplethToMatchColorMode();
	                    }
	                }
	                this._choroplethLayer.set("featureIdFieldName", filteredFields ? filteredFields[0] : null);
	                this._choroplethLayer.set("data", extractedData ? extractedData.data : null);
	                this._choroplethLayer.set("fields", extractedData ? filteredFields : null);
	            } else {
	                console.log("cannot update layer data because of incorrect layerType, OR the _layerType hasn't been initialized!");
	            }
	        },

	        // Since this view is only providing wrapper functionality, the updateView routine
	        // does not explicitly render anything like in other visualizations.  Instead, it processes
	        // the raw configuration attributes and communicates them downstream in the form of mapping API calls.
	        updateView: function(data, props, async) {
	            // Kind of weird, but we need to represent this to upstream consumers as an update
	            // that never completes.  The reason is that the wrapper functionality of this view means
	            // that a call to updateView might not result in any rendered updates, or a call to formatData
	            // can cause a rendering update without ever going through updateView.
	            //
	            // Notification of updates is instead handled by the "rendered" event listeners created in
	            // the "type" change handler in _setMapProperty.
	            var done = async();
	            var curValues = this._propertyValues;
	            var newValues = {};
	            var p;

	            // set null values for all existing properties
	            // if they are not overridden by either the default or state properties, they will be cleared
	            for (p in curValues) {
	                if (curValues.hasOwnProperty(p))
	                    newValues[p] = null;
	            }

	            // copy default property values
	            var defaultValues = _DEFAULT_PROPERTY_VALUES;
	            for (p in defaultValues) {
	                if (defaultValues.hasOwnProperty(p))
	                    newValues[p] = defaultValues[p];
	            }

	            // copy non-empty state property values
	            var stateValues = this.model.config ? this.model.config.toJSON() : {};
	            var stateValue;
	            for (p in stateValues) {
	                if (stateValues.hasOwnProperty(p) && _R_PROPERTY_PREFIX.test(p)) {
	                    stateValue = stateValues[p];
	                    if ((stateValue != null) && (stateValue !== ""))
	                        newValues[p.replace(_R_PROPERTY_PREFIX, "")] = stateValue;
	                }
	            }

	            // apply map viewport properties in order
	            // zoom must be first for Leaflet to do the right thing
	            if (newValues.hasOwnProperty("map.zoom")) {
	                this._setMapProperty("map.zoom", newValues["map.zoom"]);
	                this._reset_zoom.setOriginalZoom(newValues["map.zoom"]);
	            }
	            if (newValues.hasOwnProperty("map.center")) {
	                this._setMapProperty("map.center", newValues["map.center"]);
	                this._reset_zoom.setOriginalCenter(newValues["map.center"]);
	            }
	            if (newValues.hasOwnProperty("map.fitBounds"))
	                this._setMapProperty("map.fitBounds", newValues["map.fitBounds"]);

	            // The color mode will affect how other properties should be processed,
	            // so set it first to make sure everything happens in the right order.
	            var newColorMode = newValues['choroplethLayer.colorMode'];
	            if (newColorMode === 'auto' || newColorMode === 'sequential'
	                    || newColorMode === 'divergent' || newColorMode === 'categorical') {
	                this._choroplethColorMode = newColorMode;
	            } else {
	                delete newValues['choroplethLayer.colorMode'];
	            }

	            // If the active color mode is not divergent, send null values for any properties
	            // that are specific to that color mode.
	            if (this._getComputedColorMode() !== 'divergent') {
	                newValues['choroplethLayer.minimumColor'] = null;
	                newValues['choroplethLayer.neutralPoint'] = null;
	            }

	            // apply remaining properties
	            // the viewport properties haven't changed, so they will be ignored by _setMapProperty
	            for (p in newValues) {
	                if (newValues.hasOwnProperty(p))
	                    this._setMapProperty(p, newValues[p]);
	            }
	        },

	        onAddedToDocument: function() {
	            this._map.updateSize();
	        },

	        remove: function() {
	            this._map.off("boundsChanged", this._map_boundsChanged);
	            this._map.off("mapClicked", this._map_mapClicked);
	            this._map.dispose();
	            this._markerLayer.off("rendered", this._onDataLayerRendered, this);
	            this._choroplethLayer.off("rendered", this._onDataLayerRendered, this);

	            this._externalLegend.close();

	            return VisualizationBase.prototype.remove.apply(this, arguments);
	        },

	        onShow: function() {
	            this._map.updateSize();
	            this._map.validate();
	            VisualizationBase.prototype.onShow.call(this);
	        },

	        // Private Methods


	        _updateDataBounds: function() {
	            var model = this.model.config;
	            if (!model)
	                return;

	            var bounds = this._map.getLatLonBounds().normalize();
	            model.set({ "display.visualizations.mapping.data.bounds": this._latLonBoundsParser.valueToString(bounds) });
	        },

	        _needsPropertyUpdate: function(changedProperties) {
	            if (!changedProperties)
	                return false;

	            for (var p in changedProperties) {
	                if (changedProperties.hasOwnProperty(p) && (p !== "display.visualizations.mapping.data.bounds"))
	                    return true;
	            }

	            return false;
	        },

	        _extractRowData: function(model) {
	            var extractedData = {};

	            var fields = this._getNormalizedFieldNames(model);
	            var rows = model.get("rows");
	            if (fields && rows) {
	                var numFields = fields.length;
	                var numRows = rows.length;
	                var numEntries;
	                var row;
	                var obj;
	                var i;
	                var j;

	                extractedData.fields = fields.concat();
	                extractedData.data = [];
	                for (i = 0; i < numRows; i++) {
	                    row = rows[i];
	                    numEntries = Math.min(row.length, numFields);
	                    obj = {};
	                    for (j = 0; j < numEntries; j++)
	                        obj[fields[j]] = row[j];
	                    extractedData.data.push(obj);
	                }
	            }

	            return extractedData;
	        },

	        _extractColumnData: function(model) {
	            var extractedData = {};

	            var fields = this._getNormalizedFieldNames(model);
	            var columns = model.get("columns");
	            if (fields && columns) {
	                var numColumns = Math.min(fields.length, columns.length);
	                var numRows = (numColumns > 0) ? columns[0].length : 0;
	                var obj;
	                var i;
	                var j;

	                for (i = 1; i < numColumns; i++)
	                    numRows = Math.min(numRows, columns[i].length);

	                extractedData.fields = fields.slice(0, numColumns);
	                extractedData.data = [];
	                for (i = 0; i < numRows; i++) {
	                    obj = {};
	                    for (j = 0; j < numColumns; j++)
	                        obj[fields[j]] = columns[j][i];
	                    extractedData.data.push(obj);
	                }
	            }

	            return extractedData;
	        },

	        /*
	         * Depending on how the data was fetched, fields can either be a list of string field names,
	         * or a list of dictionaries that include the name as well as other metadata.  This method
	         * will normalize to a list of string field names.
	         */

	        _getNormalizedFieldNames: function(model) {
	            return _(model.get("fields")).map(function(field) {
	                return _.isString(field) ? field : field.name;
	            });
	        },

	        _filterFields: function(fields) {
	            if (!fields)
	                return null;

	            var filteredFields = [];
	            var field;
	            for (var i = 0, l = fields.length; i < l; i++) {
	                field = fields[i];
	                if (field && (field.charAt(0) !== "_"))
	                    filteredFields.push(field);
	            }
	            return filteredFields;
	        },

	        _setMapProperty: function(propertyName, propertyValue) {
	            propertyValue = (propertyValue != null) ? String(propertyValue) : null;
	            if (this._propertyValues[propertyName] == propertyValue)
	                return;

	            if (propertyValue != null)
	                this._propertyValues[propertyName] = propertyValue;
	            else
	                delete this._propertyValues[propertyName];

	            switch (propertyName) {
	                // global properties
	                case "fieldColors":
	                    var fieldColors = _.extend({ NULL: this._choroplethNullColor }, this._colorObjectParser.stringToValue(propertyValue));
	                    this._fieldColorPalette.set("fieldColors", fieldColors);
	                    break;
	                case "seriesColors":
	                    this._seriesColorPalette.set("colors", this._colorArrayParser.stringToValue(propertyValue));
	                    break;

	                // data properties
	                case "data.maxClusters":
	                    var maxClusters = this._numberParser.stringToValue(propertyValue);
	                    this._maxClusters = (maxClusters < Infinity) ? Math.max(Math.floor(maxClusters), 64) : 100;
	                    this._updateDataParams();
	                    break;

	                // map properties
	                case "map.center":
	                    var center = this._latLonParser.stringToValue(propertyValue);
	                    if (center)
	                        this._map.set("center", center);
	                    break;
	                case "map.zoom":
	                    var zoom = this._numberParser.stringToValue(propertyValue);
	                    if (!isNaN(zoom))
	                        this._map.set("zoom", zoom);
	                    break;
	                case "map.fitBounds":
	                    var fitBounds = this._latLonBoundsParser.stringToValue(propertyValue);
	                    if (fitBounds)
	                        this._map.fitBounds(fitBounds);
	                    break;
	                case "map.scrollZoom":
	                    var scrollWheelZoom = this._booleanParser.stringToValue(propertyValue);
	                    if (scrollWheelZoom) {
	                        this._map.leafletMap.scrollWheelZoom.enable();
	                    } else {
	                        this._map.leafletMap.scrollWheelZoom.disable();
	                    }
	                    break;
	                case "map.panning":
	                    var panning = this._booleanParser.stringToValue(propertyValue);
	                    if (panning) {
	                        this._map.leafletMap.dragging.enable();
	                    } else {
	                        this._map.leafletMap.dragging.disable();
	                    }
	                    break;
	                case "drilldown":
	                    this._drilldown = this._stringParser.stringToValue(propertyValue);
	                    break;

	                // tileLayer properties
	                case "showTiles":
	                    this._map.set("showTiles", this._booleanParser.stringToValue(propertyValue));
	                    break;
	                case "tileLayer.tileOpacity":
	                    this._map.set("tileOpacity", this._numberParser.stringToValue(propertyValue));
	                    break;
	                case "tileLayer.url":
	                    this._map.set("tileURL", this._resolveURL(propertyValue));
	                    break;
	                case "tileLayer.subdomains":
	                    this._map.set("tileSubdomains", this._stringArrayParser.stringToValue(propertyValue));
	                    break;
	                case "tileLayer.minZoom":
	                    this._map.set("tileMinZoom", this._numberParser.stringToValue(propertyValue));
	                    break;
	                case "tileLayer.maxZoom":
	                    this._map.set("tileMaxZoom", this._numberParser.stringToValue(propertyValue));
	                    break;
	                case "tileLayer.invertY":
	                    this._map.set("tileInvertY", this._booleanParser.stringToValue(propertyValue));
	                    break;
	                case "tileLayer.attribution":
	                    this._map.set("tileAttribution", this._stringParser.stringToValue(propertyValue));
	                    break;
	                // markerLayer properties
	                case "markerLayer.markerOpacity":
	                    this._markerLayer.set("markerOpacity", this._numberParser.stringToValue(propertyValue));
	                    break;
	                case "markerLayer.markerMinSize":
	                    this._markerLayer.set("markerMinSize", this._numberParser.stringToValue(propertyValue));
	                    break;
	                case "markerLayer.markerMaxSize":
	                    this._markerLayer.set("markerMaxSize", this._numberParser.stringToValue(propertyValue));
	                    break;

	                // choroplethLayer properties
	                case "choroplethLayer.colorMode":
	                    var computedColorMode = this._getComputedColorMode();
	                    if (computedColorMode === 'sequential' || computedColorMode === 'divergent') {
	                        this._updateChoroplethColorPalette();
	                    }
	                    this._updateChoroplethToMatchColorMode();
	                    break;
	                case "choroplethLayer.maximumColor":
	                    this._choroplethMaximumColor = this._colorParser.stringToValue(propertyValue);
	                    this._updateChoroplethColorPalette();
	                    break;
	                case "choroplethLayer.minimumColor":
	                    this._choroplethMinimumColor = this._colorParser.stringToValue(propertyValue);
	                    this._updateChoroplethColorPalette();
	                    break;
	                case "choroplethLayer.colorBins":
	                    var numBins = this._numberParser.stringToValue(propertyValue);
	                    this._choroplethLayer.set("bins", numBins);
	                    this._numericLegend.set("bins", numBins);
	                    break;
	                case "choroplethLayer.neutralPoint":
	                    var neutralPoint = propertyValue != null ? this._numberParser.stringToValue(propertyValue) : NaN;
	                    this._choroplethLayer.set("neutralPoint", neutralPoint);
	                    this._numericLegend.set("neutralPoint", neutralPoint);
	                    break;
	                case "choroplethLayer.shapeOpacity":
	                    this._choroplethLayer.set("shapeOpacity", this._numberParser.stringToValue(propertyValue));
	                    break;
	                case "choroplethLayer.showBorder":
	                    var show = this._booleanParser.stringToValue(propertyValue);
	                    this._choroplethLayer.set("borderWidth", show ? 1 : 0);
	                    break;

	                // legend properties
	                case "legend.placement":
	                    var isVisible = propertyValue !== 'none';
	                    this._numericLegend.set('isVisible', isVisible);
	                    this._categoricalVisualLegend.set('isVisible', isVisible);
	                    break;

	                // layerType property
	                case "type":
	                    if (propertyValue === "marker") {
	                        this._map.removeLayer(this._choroplethLayer);
	                        this._choroplethLayer.off("rendered", this._onDataLayerRendered, this);
	                        this._map.addLayer(this._markerLayer);
	                        this._markerLayer.on("rendered", this._onDataLayerRendered, this);
	                        this._map.removeControl(this._numericLegend);
	                        this._map.removeControl(this._categoricalVisualLegend);
	                        this._updateDataParams();
	                    } else if (propertyValue === "choropleth") {
	                        this._map.removeLayer(this._markerLayer);
	                        this._markerLayer.off("rendered", this._onDataLayerRendered, this);
	                        this._map.addLayer(this._choroplethLayer);
	                        this._choroplethLayer.on("rendered", this._onDataLayerRendered, this);
	                        this._updateChoroplethToMatchColorMode();
	                        this._updateDataParams();
	                    } else {
	                        console.log("cannot initialize customize layer because of incorrect _layerType!");
	                    }
	                    break;
	            }
	        },

	        _updateChoroplethColorPalette: function() {
	            if (this._getComputedColorMode() === 'divergent') {
	                this._choroplethColorPalette.set(
	                    'colors',
	                    [this._choroplethMinimumColor, this._choroplethNeutralColor, this._choroplethMaximumColor]
	                );
	            } else {
	                this._choroplethColorPalette.set('colors', [this._choroplethNeutralColor, this._choroplethMaximumColor]);
	            }
	        },

	        _updateChoroplethToMatchColorMode: function() {
	            var colorMode = this._getComputedColorMode();
	            if (colorMode === 'categorical') {
	                this._map.isCategorical = true;
	                this._choroplethLayer.set("axis", null);
	                this._choroplethLayer.set("legend", this._externalLegend);
	                this._choroplethLayer.set("colorPalette", this._fieldColorPalette);
	                this._map.removeControl(this._numericLegend);
	                this._map.addControl(this._categoricalVisualLegend);
	            } else {
	                this._map.isCategorical = false;
	                this._choroplethLayer.set("legend", null);
	                this._choroplethLayer.set("axis", this._numericAxis);
	                this._choroplethLayer.set("colorPalette", this._choroplethColorPalette);
	                this._map.removeControl(this._categoricalVisualLegend);
	                this._map.addControl(this._numericLegend);
	            }
	        },

	        _getComputedColorMode: function() {
	            return (this._choroplethColorMode === 'auto') ?
	                this._choroplethAutoDetectedColorMode : this._choroplethColorMode;
	        },

	        _resolveURL: function(propertyValue) {
	            var propertyValue2 = propertyValue ? SplunkUtil.trim(propertyValue) : propertyValue;
	            if (propertyValue2 && (propertyValue2.charAt(0) === "/")) {
	                var hadTrailingSlash = (propertyValue2.charAt(propertyValue2.length - 1) === "/");
	                propertyValue2 = SplunkUtil.make_url(propertyValue2);
	                var hasTrailingSlash = (propertyValue2.charAt(propertyValue2.length - 1) === "/");
	                if (hasTrailingSlash != hadTrailingSlash)
	                    propertyValue2 = hadTrailingSlash ? propertyValue2 + "/" : propertyValue2.substring(0, propertyValue2.length - 1);
	                propertyValue = propertyValue2;
	            }
	            return propertyValue;
	        },

	        _formatNumber: function(num) {
	            var pos = Math.abs(num);
	            if ((pos > 0) && ((pos < 1e-3) || (pos >= 1e9)))
	                return SplunkI18N.format_scientific(num, "##0E0");
	            return SplunkI18N.format_decimal(num);
	        },

	        _formatDegrees: function(degrees, orientation) {
	            var deg = Math.abs(degrees);
	            var degInt = Math.floor(deg);
	            var degStr = ("" + degInt);
	            var min = (deg - degInt) * 60;
	            var minInt = Math.floor(min);
	            var minStr = (minInt < 10) ? ("0" + minInt) : ("" + minInt);
	            var sec = (min - minInt) * 60;
	            var secInt = Math.floor(sec);
	            var secStr = (secInt < 10) ? ("0" + secInt) : ("" + secInt);

	            var dirStr = "";
	            if (degrees > 0)
	                dirStr = (orientation === "ns") ? _("N").t() : _("E").t();
	            else if (degrees < 0)
	                dirStr = (orientation === "ns") ? _("S").t() : _("W").t();

	            if (secInt > 0)
	                return sprintf("%(degrees)s\u00B0%(minutes)s'%(seconds)s\"%(direction)s", { degrees: degStr, minutes: minStr, seconds: secStr, direction: dirStr });
	            if (minInt > 0)
	                return sprintf("%(degrees)s\u00B0%(minutes)s'%(direction)s", { degrees: degStr, minutes: minStr, direction: dirStr });
	            return sprintf("%(degrees)s\u00B0%(direction)s", { degrees: degStr, direction: dirStr });
	        },

	        onConfigChange: function(changedAttributes) {
	            var updateNeeded = _(changedAttributes).chain().keys()
	                .any(function(key) {
	                    return key.indexOf('display.visualizations.mapping.') === 0;
	                })
	                .value();

	            if (!updateNeeded) {
	                return;
	            }

	            if (changedAttributes.hasOwnProperty('display.visualizations.mapping.type')) {
	                this.invalidate('formatDataPass');
	            }
	            this.invalidate('updateViewPass');
	        },

	        // The wrapper role of this view means that the formatData routine can cause a re-render
	        // of the underlying mapping library without having to run the updateView routine,
	        // and vice versa.  By returning false here, the two routines become completely
	        // independent operations, instead of updateView automatically running whenever
	        // formatData runs.
	        _shouldUpdateViewOnDataChange: function() {
	            return false;
	        },

	        _map_boundsChanged: function(e) {
	            if (this._isPrinting)
	                return;
	            this._updateDataBounds();
	            this._updateDataParams();
	            this.model.config.set({
	                currentMapZoom: this.getZoom(),
	                currentMapCenter: this.getCenter().clone()
	            }, {'transient': true});
	            this.trigger("boundsChanged", {});
	        },

	        _map_mapClicked: function(e) {
	            if (this._isPrinting || this._drilldown === "none")
	                return;

	            this.trigger(
	                "drilldown",
	                { data: e.data, fields: e.fields, altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, type: "geoviz" }
	            );
	        },

	        onPrintStart: function(e) {
	            if (this._isPrinting)
	                return;

	            this._isPrinting = true;

	            this._prePrintCenter = this._map.get("center");
	            this._prePrintZoom = this._map.get("zoom");

	            this._map.updateSize();
	            this._map.validate();
	        },

	        onPrintEnd: function(e) {
	            if (!this._isPrinting)
	                return;

	            this._map.set("center", this._prePrintCenter);
	            this._map.set("zoom", this._prePrintZoom);

	            this._prePrintCenter = null;
	            this._prePrintZoom = 0;
	            this._isPrinting = false;
	        },

	        _onDataLayerRendered: function() {
	            this._map.off('tilesLoaded.change', this._handleTileLoadOnce, this);
	            if (this._map.get('tilesLoaded')) {
	                this._onViewUpdated();
	            } else {
	                this._map.on('tilesLoaded.change', this._handleTileLoadOnce, this);
	            }
	        },

	        _handleTileLoadOnce: function () {
	            this._onViewUpdated();
	            this._map.off('tilesLoaded.change', this._handleTileLoadOnce, this);
	        },

	        _updateDataParams: function() {
	            this._layerType = this.model.config.get('display.visualizations.mapping.type');
	            if (!this._layerType) {
	                return;
	            }
	            this.model.searchDataParams.set(_.extend({}, _DEFAULT_DATA_PARAMS, {
	                search: this.getPostProcessSearch(),
	                count: this.getMaxClusters()
	            }));
	        }

	    }, {
	        DEFAULT_PROPERTY_VALUES: _DEFAULT_PROPERTY_VALUES
	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ 32:
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(9)();
	// imports


	// module
	exports.push([module.id, "/* required styles */\n\n.leaflet-map-pane,\n.leaflet-tile,\n.leaflet-marker-icon,\n.leaflet-marker-shadow,\n.leaflet-tile-pane,\n.leaflet-overlay-pane,\n.leaflet-shadow-pane,\n.leaflet-marker-pane,\n.leaflet-popup-pane,\n.leaflet-overlay-pane svg,\n.leaflet-zoom-box,\n.leaflet-image-layer,\n.leaflet-layer { /* TODO optimize classes */\n\tposition: absolute;\n\t}\n.leaflet-container {\n\toverflow: hidden;\n\toutline: 0;\n\t}\n.leaflet-tile,\n.leaflet-marker-icon,\n.leaflet-marker-shadow {\n\t-moz-user-select: none;\n\t-webkit-user-select: none;\n\tuser-select: none;\n\t}\n.leaflet-marker-icon,\n.leaflet-marker-shadow {\n\tdisplay: block;\n\t}\n.leaflet-clickable {\n\tcursor: pointer;\n\t}\n.leaflet-dragging, .leaflet-dragging .leaflet-clickable {\n\tcursor: move;\n\t}\n.leaflet-container img {\n    /* map is broken in FF if you have max-width: 100% on tiles */\n\tmax-width: none !important;\n\t}\n.leaflet-container img.leaflet-image-layer {\n    /* stupid Android 2 doesn't understand \"max-width: none\" properly */\n    max-width: 15000px !important;\n    }\n\n.leaflet-tile-pane { z-index: 2; }\n.leaflet-objects-pane { z-index: 3; }\n.leaflet-overlay-pane { z-index: 4; }\n.leaflet-shadow-pane { z-index: 5; }\n.leaflet-marker-pane { z-index: 6; }\n.leaflet-popup-pane { z-index: 7; }\n\n.leaflet-tile {\n    filter: inherit;\n    visibility: hidden;\n\t}\n.leaflet-tile-loaded {\n\tvisibility: inherit;\n\t}\n\n.leaflet-zoom-box {\n    width: 0;\n    height: 0;\n    }\n\n/* Leaflet controls */\n\n.leaflet-control {\n\tposition: relative;\n\tz-index: 7;\n\tpointer-events: auto;\n\t}\n.leaflet-top,\n.leaflet-bottom {\n\tposition: absolute;\n\tz-index: 1000;\n\tpointer-events: none;\n\t}\n.leaflet-top {\n\ttop: 0;\n\t}\n.leaflet-right {\n\tright: 0;\n\t}\n.leaflet-bottom {\n\tbottom: 0;\n\t}\n.leaflet-left {\n\tleft: 0;\n\t}\n.leaflet-control {\n\tfloat: left;\n\tclear: both;\n\t}\n.leaflet-right .leaflet-control {\n\tfloat: right;\n\t}\n.leaflet-top .leaflet-control {\n\tmargin-top: 10px;\n\t}\n.leaflet-bottom .leaflet-control {\n\tmargin-bottom: 10px;\n\t}\n.leaflet-left .leaflet-control {\n\tmargin-left: 10px;\n\t}\n.leaflet-right .leaflet-control {\n\tmargin-right: 10px;\n\t}\n\n.leaflet-control-zoom {\n\t-moz-border-radius: 7px;\n\t-webkit-border-radius: 7px;\n\tborder-radius: 7px;\n\t}\n.leaflet-control-zoom {\n\tpadding: 5px;\n\tbackground: rgba(0, 0, 0, 0.25);\n\t}\n.leaflet-control-zoom a {\n\tbackground-color: rgba(255, 255, 255, 0.75);\n\t}\n.leaflet-control-zoom a, .leaflet-control-layers a {\n\tbackground-position: 50% 50%;\n\tbackground-repeat: no-repeat;\n\tdisplay: block;\n\t}\n.leaflet-control-zoom a {\n\t-moz-border-radius: 4px;\n\t-webkit-border-radius: 4px;\n\tborder-radius: 4px;\n\twidth: 19px;\n\theight: 19px;\n\t}\n.leaflet-control-zoom a:hover {\n\tbackground-color: #fff;\n\t}\n.leaflet-touch .leaflet-control-zoom a {\n\twidth: 27px;\n\theight: 27px;\n\t}\n.leaflet-control-zoom-in {\n\tbackground-image: url(" + __webpack_require__("contrib/leaflet/images/zoom-in.png") + ");\n\tmargin-bottom: 5px;\n\t}\n.leaflet-control-zoom-out {\n\tbackground-image: url(" + __webpack_require__("contrib/leaflet/images/zoom-out.png") + ");\n\t}\n\n.leaflet-control-layers {\n\tbox-shadow: 0 1px 7px #999;\n\tbackground: #f8f8f9;\n\t-moz-border-radius: 8px;\n\t-webkit-border-radius: 8px;\n\tborder-radius: 8px;\n\t}\n.leaflet-control-layers a {\n\tbackground-image: url(" + __webpack_require__("contrib/leaflet/images/layers.png") + ");\n\twidth: 36px;\n\theight: 36px;\n\t}\n.leaflet-touch .leaflet-control-layers a {\n\twidth: 44px;\n\theight: 44px;\n\t}\n.leaflet-control-layers .leaflet-control-layers-list,\n.leaflet-control-layers-expanded .leaflet-control-layers-toggle {\n\tdisplay: none;\n\t}\n.leaflet-control-layers-expanded .leaflet-control-layers-list {\n\tdisplay: block;\n\tposition: relative;\n\t}\n.leaflet-control-layers-expanded {\n\tpadding: 6px 10px 6px 6px;\n\tfont: 12px/1.5 \"Helvetica Neue\", Arial, Helvetica, sans-serif;\n\tcolor: #333;\n\tbackground: #fff;\n\t}\n.leaflet-control-layers input {\n\tmargin-top: 2px;\n\tposition: relative;\n\ttop: 1px;\n\t}\n.leaflet-control-layers label {\n\tdisplay: block;\n\t}\n.leaflet-control-layers-separator {\n\theight: 0;\n\tborder-top: 1px solid #ddd;\n\tmargin: 5px -10px 5px -6px;\n\t}\n\n.leaflet-container .leaflet-control-attribution {\n\tbackground-color: rgba(255, 255, 255, 0.7);\n\tbox-shadow: 0 0 5px #bbb;\n\tmargin: 0;\n    }\n\n.leaflet-control-attribution,\n.leaflet-control-scale-line {\n\tpadding: 0 5px;\n\tcolor: #333;\n\t}\n\n.leaflet-container .leaflet-control-attribution,\n.leaflet-container .leaflet-control-scale {\n\tfont: 11px/1.5 \"Helvetica Neue\", Arial, Helvetica, sans-serif;\n\t}\n\n.leaflet-left .leaflet-control-scale {\n\tmargin-left: 5px;\n\t}\n.leaflet-bottom .leaflet-control-scale {\n\tmargin-bottom: 5px;\n\t}\n\n.leaflet-control-scale-line {\n\tborder: 2px solid #777;\n\tborder-top: none;\n\tcolor: black;\n\tline-height: 1;\n\tfont-size: 10px;\n\tpadding-bottom: 2px;\n\ttext-shadow: 1px 1px 1px #fff;\n\tbackground-color: rgba(255, 255, 255, 0.5);\n\t}\n.leaflet-control-scale-line:not(:first-child) {\n\tborder-top: 2px solid #777;\n\tpadding-top: 1px;\n\tborder-bottom: none;\n\tmargin-top: -2px;\n\t}\n.leaflet-control-scale-line:not(:first-child):not(:last-child) {\n\tborder-bottom: 2px solid #777;\n\t}\n\n.leaflet-touch .leaflet-control-attribution, .leaflet-touch .leaflet-control-layers {\n\tbox-shadow: none;\n\t}\n.leaflet-touch .leaflet-control-layers {\n\tborder: 5px solid #bbb;\n\t}\n\n\n/* Zoom and fade animations */\n\n.leaflet-fade-anim .leaflet-tile, .leaflet-fade-anim .leaflet-popup {\n\topacity: 0;\n\n\t-webkit-transition: opacity 0.2s linear;\n\t-moz-transition: opacity 0.2s linear;\n\t-o-transition: opacity 0.2s linear;\n\ttransition: opacity 0.2s linear;\n\t}\n.leaflet-fade-anim .leaflet-tile-loaded, .leaflet-fade-anim .leaflet-map-pane .leaflet-popup {\n\topacity: 1;\n\t}\n\n.leaflet-zoom-anim .leaflet-zoom-animated {\n\t-webkit-transition: -webkit-transform 0.25s cubic-bezier(0.25,0.1,0.25,0.75);\n\t-moz-transition: -moz-transform 0.25s cubic-bezier(0.25,0.1,0.25,0.75);\n\t-o-transition: -o-transform 0.25s cubic-bezier(0.25,0.1,0.25,0.75);\n\ttransition: transform 0.25s cubic-bezier(0.25,0.1,0.25,0.75);\n\t}\n\n.leaflet-zoom-anim .leaflet-tile,\n.leaflet-pan-anim .leaflet-tile,\n.leaflet-touching .leaflet-zoom-animated {\n    -webkit-transition: none;\n    -moz-transition: none;\n    -o-transition: none;\n    transition: none;\n    }\n\n.leaflet-zoom-anim .leaflet-zoom-hide {\n\tvisibility: hidden;\n\t}\n\n\n/* Popup layout */\n\n.leaflet-popup {\n\tposition: absolute;\n\ttext-align: center;\n\t}\n.leaflet-popup-content-wrapper {\n\tpadding: 1px;\n\ttext-align: left;\n\t}\n.leaflet-popup-content {\n\tmargin: 14px 20px;\n\t}\n.leaflet-popup-tip-container {\n\tmargin: 0 auto;\n\twidth: 40px;\n\theight: 20px;\n\tposition: relative;\n\toverflow: hidden;\n\t}\n.leaflet-popup-tip {\n\twidth: 15px;\n\theight: 15px;\n\tpadding: 1px;\n\n\tmargin: -8px auto 0;\n\n\t-moz-transform: rotate(45deg);\n\t-webkit-transform: rotate(45deg);\n\t-ms-transform: rotate(45deg);\n\t-o-transform: rotate(45deg);\n\ttransform: rotate(45deg);\n\t}\n.leaflet-container a.leaflet-popup-close-button {\n\tposition: absolute;\n\ttop: 0;\n\tright: 0;\n\tpadding: 4px 5px 0 0;\n\ttext-align: center;\n\twidth: 18px;\n\theight: 14px;\n\tfont: 16px/14px Tahoma, Verdana, sans-serif;\n\tcolor: #c3c3c3;\n\ttext-decoration: none;\n\tfont-weight: bold;\n\t}\n.leaflet-container a.leaflet-popup-close-button:hover {\n\tcolor: #999;\n\t}\n.leaflet-popup-content p {\n\tmargin: 18px 0;\n\t}\n.leaflet-popup-scrolled {\n\toverflow: auto;\n\tborder-bottom: 1px solid #ddd;\n\tborder-top: 1px solid #ddd;\n\t}\n\n\n/* Visual appearance */\n\n.leaflet-container {\n\tbackground: #ddd;\n\t}\n.leaflet-container a {\n\tcolor: #0078A8;\n\t}\n.leaflet-container a.leaflet-active {\n    outline: 2px solid orange;\n    }\n.leaflet-zoom-box {\n\tborder: 2px dotted #05f;\n\tbackground: white;\n\topacity: 0.5;\n\t}\n.leaflet-div-icon {\n    background: #fff;\n    border: 1px solid #666;\n    }\n.leaflet-editing-icon {\n    border-radius: 2px;\n    }\n.leaflet-popup-content-wrapper, .leaflet-popup-tip {\n\tbackground: white;\n\n\tbox-shadow: 0 3px 10px #888;\n\t-moz-box-shadow: 0 3px 10px #888;\n\t-webkit-box-shadow: 0 3px 14px #999;\n\t}\n.leaflet-popup-content-wrapper {\n\t-moz-border-radius: 20px;\n\t-webkit-border-radius: 20px;\n\tborder-radius: 20px;\n\t}\n.leaflet-popup-content {\n\tfont: 12px/1.4 \"Helvetica Neue\", Arial, Helvetica, sans-serif;\n\t}\n", ""]);

	// exports


/***/ }),

/***/ 33:
/***/ (function(module, exports) {

	/*** IMPORTS FROM imports-loader ***/
	(function() {

	/*
	 Copyright (c) 2010-2012, CloudMade, Vladimir Agafonkin
	 Leaflet is an open-source JavaScript library for mobile-friendly interactive maps.
	 http://leaflet.cloudmade.com
	*/
	(function(e,t){var n,r;typeof exports!=t+""?n=exports:(r=e.L,n={},n.noConflict=function(){return e.L=r,this},e.L=n),n.version="0.4.5",n.Util={extend:function(e){var t=Array.prototype.slice.call(arguments,1);for(var n=0,r=t.length,i;n<r;n++){i=t[n]||{};for(var s in i)i.hasOwnProperty(s)&&(e[s]=i[s])}return e},bind:function(e,t){var n=arguments.length>2?Array.prototype.slice.call(arguments,2):null;return function(){return e.apply(t,n||arguments)}},stamp:function(){var e=0,t="_leaflet_id";return function(n){return n[t]=n[t]||++e,n[t]}}(),limitExecByInterval:function(e,t,n){var r,i;return function s(){var o=arguments;if(r){i=!0;return}r=!0,setTimeout(function(){r=!1,i&&(s.apply(n,o),i=!1)},t),e.apply(n,o)}},falseFn:function(){return!1},formatNum:function(e,t){var n=Math.pow(10,t||5);return Math.round(e*n)/n},splitWords:function(e){return e.replace(/^\s+|\s+$/g,"").split(/\s+/)},setOptions:function(e,t){return e.options=n.Util.extend({},e.options,t),e.options},getParamString:function(e){var t=[];for(var n in e)e.hasOwnProperty(n)&&t.push(n+"="+e[n]);return"?"+t.join("&")},template:function(e,t){return e.replace(/\{ *([\w_]+) *\}/g,function(e,n){var r=t[n];if(!t.hasOwnProperty(n))throw Error("No value provided for variable "+e);return r})},emptyImageUrl:"data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="},function(){function t(t){var n,r,i=["webkit","moz","o","ms"];for(n=0;n<i.length&&!r;n++)r=e[i[n]+t];return r}function r(t){return e.setTimeout(t,1e3/60)}var i=e.requestAnimationFrame||t("RequestAnimationFrame")||r,s=e.cancelAnimationFrame||t("CancelAnimationFrame")||t("CancelRequestAnimationFrame")||function(t){e.clearTimeout(t)};n.Util.requestAnimFrame=function(t,s,o,u){t=n.Util.bind(t,s);if(!o||i!==r)return i.call(e,t,u);t()},n.Util.cancelAnimFrame=function(t){t&&s.call(e,t)}}(),n.Class=function(){},n.Class.extend=function(e){var t=function(){this.initialize&&this.initialize.apply(this,arguments)},r=function(){};r.prototype=this.prototype;var i=new r;i.constructor=t,t.prototype=i;for(var s in this)this.hasOwnProperty(s)&&s!=="prototype"&&(t[s]=this[s]);return e.statics&&(n.Util.extend(t,e.statics),delete e.statics),e.includes&&(n.Util.extend.apply(null,[i].concat(e.includes)),delete e.includes),e.options&&i.options&&(e.options=n.Util.extend({},i.options,e.options)),n.Util.extend(i,e),t},n.Class.include=function(e){n.Util.extend(this.prototype,e)},n.Class.mergeOptions=function(e){n.Util.extend(this.prototype.options,e)};var i="_leaflet_events";n.Mixin={},n.Mixin.Events={addEventListener:function(e,t,r){var s=this[i]=this[i]||{},o,u,a;if(typeof e=="object"){for(o in e)e.hasOwnProperty(o)&&this.addEventListener(o,e[o],t);return this}e=n.Util.splitWords(e);for(u=0,a=e.length;u<a;u++)s[e[u]]=s[e[u]]||[],s[e[u]].push({action:t,context:r||this});return this},hasEventListeners:function(e){return i in this&&e in this[i]&&this[i][e].length>0},removeEventListener:function(e,t,r){var s=this[i],o,u,a,f,l;if(typeof e=="object"){for(o in e)e.hasOwnProperty(o)&&this.removeEventListener(o,e[o],t);return this}e=n.Util.splitWords(e);for(u=0,a=e.length;u<a;u++)if(this.hasEventListeners(e[u])){f=s[e[u]];for(l=f.length-1;l>=0;l--)(!t||f[l].action===t)&&(!r||f[l].context===r)&&f.splice(l,1)}return this},fireEvent:function(e,t){if(!this.hasEventListeners(e))return this;var r=n.Util.extend({type:e,target:this},t),s=this[i][e].slice();for(var o=0,u=s.length;o<u;o++)s[o].action.call(s[o].context||this,r);return this}},n.Mixin.Events.on=n.Mixin.Events.addEventListener,n.Mixin.Events.off=n.Mixin.Events.removeEventListener,n.Mixin.Events.fire=n.Mixin.Events.fireEvent,function(){var r=navigator.userAgent.toLowerCase(),i=!!e.ActiveXObject,s=i&&!e.XMLHttpRequest,o=r.indexOf("webkit")!==-1,u=r.indexOf("gecko")!==-1,a=r.indexOf("chrome")!==-1,f=e.opera,l=r.indexOf("android")!==-1,c=r.search("android [23]")!==-1,h=typeof orientation!=t+""?!0:!1,p=document.documentElement,d=i&&"transition"in p.style,v=o&&"WebKitCSSMatrix"in e&&"m11"in new e.WebKitCSSMatrix,m=u&&"MozPerspective"in p.style,g=f&&"OTransition"in p.style,y=!e.L_NO_TOUCH&&function(){var e="ontouchstart";if(e in p)return!0;var t=document.createElement("div"),n=!1;return t.setAttribute?(t.setAttribute(e,"return;"),typeof t[e]=="function"&&(n=!0),t.removeAttribute(e),t=null,n):!1}(),b="devicePixelRatio"in e&&e.devicePixelRatio>1||"matchMedia"in e&&e.matchMedia("(min-resolution:144dpi)").matches;n.Browser={ua:r,ie:i,ie6:s,webkit:o,gecko:u,opera:f,android:l,android23:c,chrome:a,ie3d:d,webkit3d:v,gecko3d:m,opera3d:g,any3d:!e.L_DISABLE_3D&&(d||v||m||g),mobile:h,mobileWebkit:h&&o,mobileWebkit3d:h&&v,mobileOpera:h&&f,touch:y,retina:b}}(),n.Point=function(e,t,n){this.x=n?Math.round(e):e,this.y=n?Math.round(t):t},n.Point.prototype={add:function(e){return this.clone()._add(n.point(e))},_add:function(e){return this.x+=e.x,this.y+=e.y,this},subtract:function(e){return this.clone()._subtract(n.point(e))},_subtract:function(e){return this.x-=e.x,this.y-=e.y,this},divideBy:function(e,t){return new n.Point(this.x/e,this.y/e,t)},multiplyBy:function(e,t){return new n.Point(this.x*e,this.y*e,t)},distanceTo:function(e){e=n.point(e);var t=e.x-this.x,r=e.y-this.y;return Math.sqrt(t*t+r*r)},round:function(){return this.clone()._round()},_round:function(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this},floor:function(){return this.clone()._floor()},_floor:function(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this},clone:function(){return new n.Point(this.x,this.y)},toString:function(){return"Point("+n.Util.formatNum(this.x)+", "+n.Util.formatNum(this.y)+")"}},n.point=function(e,t,r){return e instanceof n.Point?e:e instanceof Array?new n.Point(e[0],e[1]):isNaN(e)?e:new n.Point(e,t,r)},n.Bounds=n.Class.extend({initialize:function(e,t){if(!e)return;var n=t?[e,t]:e;for(var r=0,i=n.length;r<i;r++)this.extend(n[r])},extend:function(e){return e=n.point(e),!this.min&&!this.max?(this.min=e.clone(),this.max=e.clone()):(this.min.x=Math.min(e.x,this.min.x),this.max.x=Math.max(e.x,this.max.x),this.min.y=Math.min(e.y,this.min.y),this.max.y=Math.max(e.y,this.max.y)),this},getCenter:function(e){return new n.Point((this.min.x+this.max.x)/2,(this.min.y+this.max.y)/2,e)},getBottomLeft:function(){return new n.Point(this.min.x,this.max.y)},getTopRight:function(){return new n.Point(this.max.x,this.min.y)},contains:function(e){var t,r;return typeof e[0]=="number"||e instanceof n.Point?e=n.point(e):e=n.bounds(e),e instanceof n.Bounds?(t=e.min,r=e.max):t=r=e,t.x>=this.min.x&&r.x<=this.max.x&&t.y>=this.min.y&&r.y<=this.max.y},intersects:function(e){e=n.bounds(e);var t=this.min,r=this.max,i=e.min,s=e.max,o=s.x>=t.x&&i.x<=r.x,u=s.y>=t.y&&i.y<=r.y;return o&&u}}),n.bounds=function(e,t){return!e||e instanceof n.Bounds?e:new n.Bounds(e,t)},n.Transformation=n.Class.extend({initialize:function(e,t,n,r){this._a=e,this._b=t,this._c=n,this._d=r},transform:function(e,t){return this._transform(e.clone(),t)},_transform:function(e,t){return t=t||1,e.x=t*(this._a*e.x+this._b),e.y=t*(this._c*e.y+this._d),e},untransform:function(e,t){return t=t||1,new n.Point((e.x/t-this._b)/this._a,(e.y/t-this._d)/this._c)}}),n.DomUtil={get:function(e){return typeof e=="string"?document.getElementById(e):e},getStyle:function(e,t){var n=e.style[t];!n&&e.currentStyle&&(n=e.currentStyle[t]);if(!n||n==="auto"){var r=document.defaultView.getComputedStyle(e,null);n=r?r[t]:null}return n==="auto"?null:n},getViewportOffset:function(e){var t=0,r=0,i=e,s=document.body;do{t+=i.offsetTop||0,r+=i.offsetLeft||0;if(i.offsetParent===s&&n.DomUtil.getStyle(i,"position")==="absolute")break;if(n.DomUtil.getStyle(i,"position")==="fixed"){t+=s.scrollTop||0,r+=s.scrollLeft||0;break}i=i.offsetParent}while(i);i=e;do{if(i===s)break;t-=i.scrollTop||0,r-=i.scrollLeft||0,i=i.parentNode}while(i);return new n.Point(r,t)},create:function(e,t,n){var r=document.createElement(e);return r.className=t,n&&n.appendChild(r),r},disableTextSelection:function(){document.selection&&document.selection.empty&&document.selection.empty(),this._onselectstart||(this._onselectstart=document.onselectstart,document.onselectstart=n.Util.falseFn)},enableTextSelection:function(){document.onselectstart=this._onselectstart,this._onselectstart=null},hasClass:function(e,t){return e.className.length>0&&RegExp("(^|\\s)"+t+"(\\s|$)").test(e.className)},addClass:function(e,t){n.DomUtil.hasClass(e,t)||(e.className+=(e.className?" ":"")+t)},removeClass:function(e,t){function n(e,n){return n===t?"":e}e.className=e.className.replace(/(\S+)\s*/g,n).replace(/(^\s+|\s+$)/,"")},setOpacity:function(e,t){if("opacity"in e.style)e.style.opacity=t;else if(n.Browser.ie){var r=!1,i="DXImageTransform.Microsoft.Alpha";try{r=e.filters.item(i)}catch(s){}t=Math.round(t*100),r?(r.Enabled=t!==100,r.Opacity=t):e.style.filter+=" progid:"+i+"(opacity="+t+")"}},testProp:function(e){var t=document.documentElement.style;for(var n=0;n<e.length;n++)if(e[n]in t)return e[n];return!1},getTranslateString:function(e){var t=n.Browser.webkit3d,r="translate"+(t?"3d":"")+"(",i=(t?",0":"")+")";return r+e.x+"px,"+e.y+"px"+i},getScaleString:function(e,t){var r=n.DomUtil.getTranslateString(t.add(t.multiplyBy(-1*e))),i=" scale("+e+") ";return r+i},setPosition:function(e,t,r){e._leaflet_pos=t,!r&&n.Browser.any3d?(e.style[n.DomUtil.TRANSFORM]=n.DomUtil.getTranslateString(t),n.Browser.mobileWebkit3d&&(e.style.WebkitBackfaceVisibility="hidden")):(e.style.left=t.x+"px",e.style.top=t.y+"px")},getPosition:function(e){return e._leaflet_pos}},n.Util.extend(n.DomUtil,{TRANSITION:n.DomUtil.testProp(["transition","webkitTransition","OTransition","MozTransition","msTransition"]),TRANSFORM:n.DomUtil.testProp(["transform","WebkitTransform","OTransform","MozTransform","msTransform"])}),n.LatLng=function(e,t,n){var r=parseFloat(e),i=parseFloat(t);if(isNaN(r)||isNaN(i))throw Error("Invalid LatLng object: ("+e+", "+t+")");n!==!0&&(r=Math.max(Math.min(r,90),-90),i=(i+180)%360+(i<-180||i===180?180:-180)),this.lat=r,this.lng=i},n.Util.extend(n.LatLng,{DEG_TO_RAD:Math.PI/180,RAD_TO_DEG:180/Math.PI,MAX_MARGIN:1e-9}),n.LatLng.prototype={equals:function(e){if(!e)return!1;e=n.latLng(e);var t=Math.max(Math.abs(this.lat-e.lat),Math.abs(this.lng-e.lng));return t<=n.LatLng.MAX_MARGIN},toString:function(){return"LatLng("+n.Util.formatNum(this.lat)+", "+n.Util.formatNum(this.lng)+")"},distanceTo:function(e){e=n.latLng(e);var t=6378137,r=n.LatLng.DEG_TO_RAD,i=(e.lat-this.lat)*r,s=(e.lng-this.lng)*r,o=this.lat*r,u=e.lat*r,a=Math.sin(i/2),f=Math.sin(s/2),l=a*a+f*f*Math.cos(o)*Math.cos(u);return t*2*Math.atan2(Math.sqrt(l),Math.sqrt(1-l))}},n.latLng=function(e,t,r){return e instanceof n.LatLng?e:e instanceof Array?new n.LatLng(e[0],e[1]):isNaN(e)?e:new n.LatLng(e,t,r)},n.LatLngBounds=n.Class.extend({initialize:function(e,t){if(!e)return;var n=t?[e,t]:e;for(var r=0,i=n.length;r<i;r++)this.extend(n[r])},extend:function(e){return typeof e[0]=="number"||e instanceof n.LatLng?e=n.latLng(e):e=n.latLngBounds(e),e instanceof n.LatLng?!this._southWest&&!this._northEast?(this._southWest=new n.LatLng(e.lat,e.lng,!0),this._northEast=new n.LatLng(e.lat,e.lng,!0)):(this._southWest.lat=Math.min(e.lat,this._southWest.lat),this._southWest.lng=Math.min(e.lng,this._southWest.lng),this._northEast.lat=Math.max(e.lat,this._northEast.lat),this._northEast.lng=Math.max(e.lng,this._northEast.lng)):e instanceof n.LatLngBounds&&(this.extend(e._southWest),this.extend(e._northEast)),this},pad:function(e){var t=this._southWest,r=this._northEast,i=Math.abs(t.lat-r.lat)*e,s=Math.abs(t.lng-r.lng)*e;return new n.LatLngBounds(new n.LatLng(t.lat-i,t.lng-s),new n.LatLng(r.lat+i,r.lng+s))},getCenter:function(){return new n.LatLng((this._southWest.lat+this._northEast.lat)/2,(this._southWest.lng+this._northEast.lng)/2)},getSouthWest:function(){return this._southWest},getNorthEast:function(){return this._northEast},getNorthWest:function(){return new n.LatLng(this._northEast.lat,this._southWest.lng,!0)},getSouthEast:function(){return new n.LatLng(this._southWest.lat,this._northEast.lng,!0)},contains:function(e){typeof e[0]=="number"||e instanceof n.LatLng?e=n.latLng(e):e=n.latLngBounds(e);var t=this._southWest,r=this._northEast,i,s;return e instanceof n.LatLngBounds?(i=e.getSouthWest(),s=e.getNorthEast()):i=s=e,i.lat>=t.lat&&s.lat<=r.lat&&i.lng>=t.lng&&s.lng<=r.lng},intersects:function(e){e=n.latLngBounds(e);var t=this._southWest,r=this._northEast,i=e.getSouthWest(),s=e.getNorthEast(),o=s.lat>=t.lat&&i.lat<=r.lat,u=s.lng>=t.lng&&i.lng<=r.lng;return o&&u},toBBoxString:function(){var e=this._southWest,t=this._northEast;return[e.lng,e.lat,t.lng,t.lat].join(",")},equals:function(e){return e?(e=n.latLngBounds(e),this._southWest.equals(e.getSouthWest())&&this._northEast.equals(e.getNorthEast())):!1}}),n.latLngBounds=function(e,t){return!e||e instanceof n.LatLngBounds?e:new n.LatLngBounds(e,t)},n.Projection={},n.Projection.SphericalMercator={MAX_LATITUDE:85.0511287798,project:function(e){var t=n.LatLng.DEG_TO_RAD,r=this.MAX_LATITUDE,i=Math.max(Math.min(r,e.lat),-r),s=e.lng*t,o=i*t;return o=Math.log(Math.tan(Math.PI/4+o/2)),new n.Point(s,o)},unproject:function(e){var t=n.LatLng.RAD_TO_DEG,r=e.x*t,i=(2*Math.atan(Math.exp(e.y))-Math.PI/2)*t;return new n.LatLng(i,r,!0)}},n.Projection.LonLat={project:function(e){return new n.Point(e.lng,e.lat)},unproject:function(e){return new n.LatLng(e.y,e.x,!0)}},n.CRS={latLngToPoint:function(e,t){var n=this.projection.project(e),r=this.scale(t);return this.transformation._transform(n,r)},pointToLatLng:function(e,t){var n=this.scale(t),r=this.transformation.untransform(e,n);return this.projection.unproject(r)},project:function(e){return this.projection.project(e)},scale:function(e){return 256*Math.pow(2,e)}},n.CRS.EPSG3857=n.Util.extend({},n.CRS,{code:"EPSG:3857",projection:n.Projection.SphericalMercator,transformation:new n.Transformation(.5/Math.PI,.5,-0.5/Math.PI,.5),project:function(e){var t=this.projection.project(e),n=6378137;return t.multiplyBy(n)}}),n.CRS.EPSG900913=n.Util.extend({},n.CRS.EPSG3857,{code:"EPSG:900913"}),n.CRS.EPSG4326=n.Util.extend({},n.CRS,{code:"EPSG:4326",projection:n.Projection.LonLat,transformation:new n.Transformation(1/360,.5,-1/360,.5)}),n.Map=n.Class.extend({includes:n.Mixin.Events,options:{crs:n.CRS.EPSG3857,fadeAnimation:n.DomUtil.TRANSITION&&!n.Browser.android23,trackResize:!0,markerZoomAnimation:n.DomUtil.TRANSITION&&n.Browser.any3d},initialize:function(e,r){r=n.Util.setOptions(this,r),this._initContainer(e),this._initLayout(),this._initHooks(),this._initEvents(),r.maxBounds&&this.setMaxBounds(r.maxBounds),r.center&&r.zoom!==t&&this.setView(n.latLng(r.center),r.zoom,!0),this._initLayers(r.layers)},setView:function(e,t){return this._resetView(n.latLng(e),this._limitZoom(t)),this},setZoom:function(e){return this.setView(this.getCenter(),e)},zoomIn:function(){return this.setZoom(this._zoom+1)},zoomOut:function(){return this.setZoom(this._zoom-1)},fitBounds:function(e){var t=this.getBoundsZoom(e);return this.setView(n.latLngBounds(e).getCenter(),t)},fitWorld:function(){var e=new n.LatLng(-60,-170),t=new n.LatLng(85,179);return this.fitBounds(new n.LatLngBounds(e,t))},panTo:function(e){return this.setView(e,this._zoom)},panBy:function(e){return this.fire("movestart"),this._rawPanBy(n.point(e)),this.fire("move"),this.fire("moveend")},setMaxBounds:function(e){e=n.latLngBounds(e),this.options.maxBounds=e;if(!e)return this._boundsMinZoom=null,this;var t=this.getBoundsZoom(e,!0);return this._boundsMinZoom=t,this._loaded&&(this._zoom<t?this.setView(e.getCenter(),t):this.panInsideBounds(e)),this},panInsideBounds:function(e){e=n.latLngBounds(e);var t=this.getBounds(),r=this.project(t.getSouthWest()),i=this.project(t.getNorthEast()),s=this.project(e.getSouthWest()),o=this.project(e.getNorthEast()),u=0,a=0;return i.y<o.y&&(a=o.y-i.y),i.x>o.x&&(u=o.x-i.x),r.y>s.y&&(a=s.y-r.y),r.x<s.x&&(u=s.x-r.x),this.panBy(new n.Point(u,a,!0))},addLayer:function(e){var t=n.Util.stamp(e);if(this._layers[t])return this;this._layers[t]=e,e.options&&!isNaN(e.options.maxZoom)&&(this._layersMaxZoom=Math.max(this._layersMaxZoom||0,e.options.maxZoom)),e.options&&!isNaN(e.options.minZoom)&&(this._layersMinZoom=Math.min(this._layersMinZoom||Infinity,e.options.minZoom)),this.options.zoomAnimation&&n.TileLayer&&e instanceof n.TileLayer&&(this._tileLayersNum++,this._tileLayersToLoad++,e.on("load",this._onTileLayerLoad,this));var r=function(){e.onAdd(this),this.fire("layeradd",{layer:e})};return this._loaded?r.call(this):this.on("load",r,this),this},removeLayer:function(e){var t=n.Util.stamp(e);if(!this._layers[t])return;return e.onRemove(this),delete this._layers[t],this.options.zoomAnimation&&n.TileLayer&&e instanceof n.TileLayer&&(this._tileLayersNum--,this._tileLayersToLoad--,e.off("load",this._onTileLayerLoad,this)),this.fire("layerremove",{layer:e})},hasLayer:function(e){var t=n.Util.stamp(e);return this._layers.hasOwnProperty(t)},invalidateSize:function(e){var t=this.getSize();this._sizeChanged=!0,this.options.maxBounds&&this.setMaxBounds(this.options.maxBounds);if(!this._loaded)return this;var r=t.subtract(this.getSize()).divideBy(2,!0);return e===!0?this.panBy(r):(this._rawPanBy(r),this.fire("move"),clearTimeout(this._sizeTimer),this._sizeTimer=setTimeout(n.Util.bind(this.fire,this,"moveend"),200)),this},addHandler:function(e,t){if(!t)return;return this[e]=new t(this),this.options[e]&&this[e].enable(),this},getCenter:function(){return this.layerPointToLatLng(this._getCenterLayerPoint())},getZoom:function(){return this._zoom},getBounds:function(){var e=this.getPixelBounds(),t=this.unproject(e.getBottomLeft()),r=this.unproject(e.getTopRight());return new n.LatLngBounds(t,r)},getMinZoom:function(){var e=this.options.minZoom||0,t=this._layersMinZoom||0,n=this._boundsMinZoom||0;return Math.max(e,t,n)},getMaxZoom:function(){var e=this.options.maxZoom===t?Infinity:this.options.maxZoom,n=this._layersMaxZoom===t?Infinity:this._layersMaxZoom;return Math.min(e,n)},getBoundsZoom:function(e,t){e=n.latLngBounds(e);var r=this.getSize(),i=this.options.minZoom||0,s=this.getMaxZoom(),o=e.getNorthEast(),u=e.getSouthWest(),a,f,l,c=!0;t&&i--;do i++,f=this.project(o,i),l=this.project(u,i),a=new n.Point(Math.abs(f.x-l.x),Math.abs(l.y-f.y)),t?c=a.x<r.x||a.y<r.y:c=a.x<=r.x&&a.y<=r.y;while(c&&i<=s);return c&&t?null:t?i:i-1},getSize:function(){if(!this._size||this._sizeChanged)this._size=new n.Point(this._container.clientWidth,this._container.clientHeight),this._sizeChanged=!1;return this._size},getPixelBounds:function(){var e=this._getTopLeftPoint();return new n.Bounds(e,e.add(this.getSize()))},getPixelOrigin:function(){return this._initialTopLeftPoint},getPanes:function(){return this._panes},getContainer:function(){return this._container},getZoomScale:function(e){var t=this.options.crs;return t.scale(e)/t.scale(this._zoom)},getScaleZoom:function(e){return this._zoom+Math.log(e)/Math.LN2},project:function(e,r){return r=r===t?this._zoom:r,this.options.crs.latLngToPoint(n.latLng(e),r)},unproject:function(e,r){return r=r===t?this._zoom:r,this.options.crs.pointToLatLng(n.point(e),r)},layerPointToLatLng:function(e){var t=n.point(e).add(this._initialTopLeftPoint);return this.unproject(t)},latLngToLayerPoint:function(e){var t=this.project(n.latLng(e))._round();return t._subtract(this._initialTopLeftPoint)},containerPointToLayerPoint:function(e){return n.point(e).subtract(this._getMapPanePos())},layerPointToContainerPoint:function(e){return n.point(e).add(this._getMapPanePos())},containerPointToLatLng:function(e){var t=this.containerPointToLayerPoint(n.point(e));return this.layerPointToLatLng(t)},latLngToContainerPoint:function(e){return this.layerPointToContainerPoint(this.latLngToLayerPoint(n.latLng(e)))},mouseEventToContainerPoint:function(e){return n.DomEvent.getMousePosition(e,this._container)},mouseEventToLayerPoint:function(e){return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e))},mouseEventToLatLng:function(e){return this.layerPointToLatLng(this.mouseEventToLayerPoint(e))},_initContainer:function(e){var t=this._container=n.DomUtil.get(e);if(t._leaflet)throw Error("Map container is already initialized.");t._leaflet=!0},_initLayout:function(){var e=this._container;e.innerHTML="",n.DomUtil.addClass(e,"leaflet-container"),n.Browser.touch&&n.DomUtil.addClass(e,"leaflet-touch"),this.options.fadeAnimation&&n.DomUtil.addClass(e,"leaflet-fade-anim");var t=n.DomUtil.getStyle(e,"position");t!=="absolute"&&t!=="relative"&&t!=="fixed"&&(e.style.position="relative"),this._initPanes(),this._initControlPos&&this._initControlPos()},_initPanes:function(){var e=this._panes={};this._mapPane=e.mapPane=this._createPane("leaflet-map-pane",this._container),this._tilePane=e.tilePane=this._createPane("leaflet-tile-pane",this._mapPane),this._objectsPane=e.objectsPane=this._createPane("leaflet-objects-pane",this._mapPane),e.shadowPane=this._createPane("leaflet-shadow-pane"),e.overlayPane=this._createPane("leaflet-overlay-pane"),e.markerPane=this._createPane("leaflet-marker-pane"),e.popupPane=this._createPane("leaflet-popup-pane");var t=" leaflet-zoom-hide";this.options.markerZoomAnimation||(n.DomUtil.addClass(e.markerPane,t),n.DomUtil.addClass(e.shadowPane,t),n.DomUtil.addClass(e.popupPane,t))},_createPane:function(e,t){return n.DomUtil.create("div",e,t||this._objectsPane)},_initializers:[],_initHooks:function(){var e,t;for(e=0,t=this._initializers.length;e<t;e++)this._initializers[e].call(this)},_initLayers:function(e){e=e?e instanceof Array?e:[e]:[],this._layers={},this._tileLayersNum=0;var t,n;for(t=0,n=e.length;t<n;t++)this.addLayer(e[t])},_resetView:function(e,t,r,i){var s=this._zoom!==t;i||(this.fire("movestart"),s&&this.fire("zoomstart")),this._zoom=t,this._initialTopLeftPoint=this._getNewTopLeftPoint(e),r?this._initialTopLeftPoint._add(this._getMapPanePos()):n.DomUtil.setPosition(this._mapPane,new n.Point(0,0)),this._tileLayersToLoad=this._tileLayersNum,this.fire("viewreset",{hard:!r}),this.fire("move"),(s||i)&&this.fire("zoomend"),this.fire("moveend",{hard:!r}),this._loaded||(this._loaded=!0,this.fire("load"))},_rawPanBy:function(e){n.DomUtil.setPosition(this._mapPane,this._getMapPanePos().subtract(e))},_initEvents:function(){if(!n.DomEvent)return;n.DomEvent.on(this._container,"click",this._onMouseClick,this);var t=["dblclick","mousedown","mouseup","mouseenter","mouseleave","mousemove","contextmenu"],r,i;for(r=0,i=t.length;r<i;r++)n.DomEvent.on(this._container,t[r],this._fireMouseEvent,this);this.options.trackResize&&n.DomEvent.on(e,"resize",this._onResize,this)},_onResize:function(){n.Util.cancelAnimFrame(this._resizeRequest),this._resizeRequest=n.Util.requestAnimFrame(this.invalidateSize,this,!1,this._container)},_onMouseClick:function(e){if(!this._loaded||this.dragging&&this.dragging.moved())return;this.fire("preclick"),this._fireMouseEvent(e)},_fireMouseEvent:function(e){if(!this._loaded)return;var t=e.type;t=t==="mouseenter"?"mouseover":t==="mouseleave"?"mouseout":t;if(!this.hasEventListeners(t))return;t==="contextmenu"&&n.DomEvent.preventDefault(e);var r=this.mouseEventToContainerPoint(e),i=this.containerPointToLayerPoint(r),s=this.layerPointToLatLng(i);this.fire(t,{latlng:s,layerPoint:i,containerPoint:r,originalEvent:e})},_onTileLayerLoad:function(){this._tileLayersToLoad--,this._tileLayersNum&&!this._tileLayersToLoad&&this._tileBg&&(clearTimeout(this._clearTileBgTimer),this._clearTileBgTimer=setTimeout(n.Util.bind(this._clearTileBg,this),500))},_getMapPanePos:function(){return n.DomUtil.getPosition(this._mapPane)},_getTopLeftPoint:function(){if(!this._loaded)throw Error("Set map center and zoom first.");return this._initialTopLeftPoint.subtract(this._getMapPanePos())},_getNewTopLeftPoint:function(e,t){var n=this.getSize().divideBy(2);return this.project(e,t)._subtract(n)._round()},_latLngToNewLayerPoint:function(e,t,n){var r=this._getNewTopLeftPoint(n,t).add(this._getMapPanePos());return this.project(e,t)._subtract(r)},_getCenterLayerPoint:function(){return this.containerPointToLayerPoint(this.getSize().divideBy(2))},_getCenterOffset:function(e){return this.latLngToLayerPoint(e).subtract(this._getCenterLayerPoint())},_limitZoom:function(e){var t=this.getMinZoom(),n=this.getMaxZoom();return Math.max(t,Math.min(n,e))}}),n.Map.addInitHook=function(e){var t=Array.prototype.slice.call(arguments,1),n=typeof e=="function"?e:function(){this[e].apply(this,t)};this.prototype._initializers.push(n)},n.map=function(e,t){return new n.Map(e,t)},n.Projection.Mercator={MAX_LATITUDE:85.0840591556,R_MINOR:6356752.3142,R_MAJOR:6378137,project:function(e){var t=n.LatLng.DEG_TO_RAD,r=this.MAX_LATITUDE,i=Math.max(Math.min(r,e.lat),-r),s=this.R_MAJOR,o=this.R_MINOR,u=e.lng*t*s,a=i*t,f=o/s,l=Math.sqrt(1-f*f),c=l*Math.sin(a);c=Math.pow((1-c)/(1+c),l*.5);var h=Math.tan(.5*(Math.PI*.5-a))/c;return a=-o*Math.log(h),new n.Point(u,a)},unproject:function(e){var t=n.LatLng.RAD_TO_DEG,r=this.R_MAJOR,i=this.R_MINOR,s=e.x*t/r,o=i/r,u=Math.sqrt(1-o*o),a=Math.exp(-e.y/i),f=Math.PI/2-2*Math.atan(a),l=15,c=1e-7,h=l,p=.1,d;while(Math.abs(p)>c&&--h>0)d=u*Math.sin(f),p=Math.PI/2-2*Math.atan(a*Math.pow((1-d)/(1+d),.5*u))-f,f+=p;return new n.LatLng(f*t,s,!0)}},n.CRS.EPSG3395=n.Util.extend({},n.CRS,{code:"EPSG:3395",projection:n.Projection.Mercator,transformation:function(){var e=n.Projection.Mercator,t=e.R_MAJOR,r=e.R_MINOR;return new n.Transformation(.5/(Math.PI*t),.5,-0.5/(Math.PI*r),.5)}()}),n.TileLayer=n.Class.extend({includes:n.Mixin.Events,options:{minZoom:0,maxZoom:18,tileSize:256,subdomains:"abc",errorTileUrl:"",attribution:"",zoomOffset:0,opacity:1,unloadInvisibleTiles:n.Browser.mobile,updateWhenIdle:n.Browser.mobile},initialize:function(e,t){t=n.Util.setOptions(this,t),t.detectRetina&&n.Browser.retina&&t.maxZoom>0&&(t.tileSize=Math.floor(t.tileSize/2),t.zoomOffset++,t.minZoom>0&&t.minZoom--,this.options.maxZoom--),this._url=e;var r=this.options.subdomains;typeof r=="string"&&(this.options.subdomains=r.split(""))},onAdd:function(e){this._map=e,this._initContainer(),this._createTileProto(),e.on({viewreset:this._resetCallback,moveend:this._update},this),this.options.updateWhenIdle||(this._limitedUpdate=n.Util.limitExecByInterval(this._update,150,this),e.on("move",this._limitedUpdate,this)),this._reset(),this._update()},addTo:function(e){return e.addLayer(this),this},onRemove:function(e){e._panes.tilePane.removeChild(this._container),e.off({viewreset:this._resetCallback,moveend:this._update},this),this.options.updateWhenIdle||e.off("move",this._limitedUpdate,this),this._container=null,this._map=null},bringToFront:function(){var e=this._map._panes.tilePane;return this._container&&(e.appendChild(this._container),this._setAutoZIndex(e,Math.max)),this},bringToBack:function(){var e=this._map._panes.tilePane;return this._container&&(e.insertBefore(this._container,e.firstChild),this._setAutoZIndex(e,Math.min)),this},getAttribution:function(){return this.options.attribution},setOpacity:function(e){return this.options.opacity=e,this._map&&this._updateOpacity(),this},setZIndex:function(e){return this.options.zIndex=e,this._updateZIndex(),this},setUrl:function(e,t){return this._url=e,t||this.redraw(),this},redraw:function(){return this._map&&(this._map._panes.tilePane.empty=!1,this._reset(!0),this._update()),this},_updateZIndex:function(){this._container&&this.options.zIndex!==t&&(this._container.style.zIndex=this.options.zIndex)},_setAutoZIndex:function(e,t){var n=e.getElementsByClassName("leaflet-layer"),r=-t(Infinity,-Infinity),i;for(var s=0,o=n.length;s<o;s++)n[s]!==this._container&&(i=parseInt(n[s].style.zIndex,10),isNaN(i)||(r=t(r,i)));this._container.style.zIndex=isFinite(r)?r+t(1,-1):""},_updateOpacity:function(){n.DomUtil.setOpacity(this._container,this.options.opacity);var e,t=this._tiles;if(n.Browser.webkit)for(e in t)t.hasOwnProperty(e)&&(t[e].style.webkitTransform+=" translate(0,0)")},_initContainer:function(){var e=this._map._panes.tilePane;if(!this._container||e.empty)this._container=n.DomUtil.create("div","leaflet-layer"),this._updateZIndex(),e.appendChild(this._container),this.options.opacity<1&&this._updateOpacity()},_resetCallback:function(e){this._reset(e.hard)},_reset:function(e){var t,n=this._tiles;for(t in n)n.hasOwnProperty(t)&&this.fire("tileunload",{tile:n[t]});this._tiles={},this._tilesToLoad=0,this.options.reuseTiles&&(this._unusedTiles=[]),e&&this._container&&(this._container.innerHTML=""),this._initContainer()},_update:function(e){if(this._map._panTransition&&this._map._panTransition._inProgress)return;var t=this._map.getPixelBounds(),r=this._map.getZoom(),i=this.options.tileSize;if(r>this.options.maxZoom||r<this.options.minZoom)return;var s=new n.Point(Math.floor(t.min.x/i),Math.floor(t.min.y/i)),o=new n.Point(Math.floor(t.max.x/i),Math.floor(t.max.y/i)),u=new n.Bounds(s,o);this._addTilesFromCenterOut(u),(this.options.unloadInvisibleTiles||this.options.reuseTiles)&&this._removeOtherTiles(u)},_addTilesFromCenterOut:function(e){var t=[],r=e.getCenter(),i,s,o;for(i=e.min.y;i<=e.max.y;i++)for(s=e.min.x;s<=e.max.x;s++)o=new n.Point(s,i),this._tileShouldBeLoaded(o)&&t.push(o);var u=t.length;if(u===0)return;t.sort(function(e,t){return e.distanceTo(r)-t.distanceTo(r)});var a=document.createDocumentFragment();this._tilesToLoad||this.fire("loading"),this._tilesToLoad+=u;for(s=0;s<u;s++)this._addTile(t[s],a);this._container.appendChild(a)},_tileShouldBeLoaded:function(e){if(e.x+":"+e.y in this._tiles)return!1;if(!this.options.continuousWorld){var t=this._getWrapTileNum();if(this.options.noWrap&&(e.x<0||e.x>=t)||e.y<0||e.y>=t)return!1}return!0},_removeOtherTiles:function(e){var t,n,r,i;for(i in this._tiles)this._tiles.hasOwnProperty(i)&&(t=i.split(":"),n=parseInt(t[0],10),r=parseInt(t[1],10),(n<e.min.x||n>e.max.x||r<e.min.y||r>e.max.y)&&this._removeTile(i))},_removeTile:function(e){var t=this._tiles[e];this.fire("tileunload",{tile:t,url:t.src}),this.options.reuseTiles?(n.DomUtil.removeClass(t,"leaflet-tile-loaded"),this._unusedTiles.push(t)):t.parentNode===this._container&&this._container.removeChild(t),n.Browser.android||(t.src=n.Util.emptyImageUrl),delete this._tiles[e]},_addTile:function(e,t){var r=this._getTilePos(e),i=this._getTile();n.DomUtil.setPosition(i,r,n.Browser.chrome||n.Browser.android23),this._tiles[e.x+":"+e.y]=i,this._loadTile(i,e),i.parentNode!==this._container&&t.appendChild(i)},_getZoomForUrl:function(){var e=this.options,t=this._map.getZoom();return e.zoomReverse&&(t=e.maxZoom-t),t+e.zoomOffset},_getTilePos:function(e){var t=this._map.getPixelOrigin(),n=this.options.tileSize;return e.multiplyBy(n).subtract(t)},getTileUrl:function(e){return this._adjustTilePoint(e),n.Util.template(this._url,n.Util.extend({s:this._getSubdomain(e),z:this._getZoomForUrl(),x:e.x,y:e.y},this.options))},_getWrapTileNum:function(){return Math.pow(2,this._getZoomForUrl())},_adjustTilePoint:function(e){var t=this._getWrapTileNum();!this.options.continuousWorld&&!this.options.noWrap&&(e.x=(e.x%t+t)%t),this.options.tms&&(e.y=t-e.y-1)},_getSubdomain:function(e){var t=(e.x+e.y)%this.options.subdomains.length;return this.options.subdomains[t]},_createTileProto:function(){var e=this._tileImg=n.DomUtil.create("img","leaflet-tile");e.galleryimg="no";var t=this.options.tileSize;e.style.width=t+"px",e.style.height=t+"px"},_getTile:function(){if(this.options.reuseTiles&&this._unusedTiles.length>0){var e=this._unusedTiles.pop();return this._resetTile(e),e}return this._createTile()},_resetTile:function(e){},_createTile:function(){var e=this._tileImg.cloneNode(!1);return e.onselectstart=e.onmousemove=n.Util.falseFn,e},_loadTile:function(e,t){e._layer=this,e.onload=this._tileOnLoad,e.onerror=this._tileOnError,e.src=this.getTileUrl(t)},_tileLoaded:function(){this._tilesToLoad--,this._tilesToLoad||this.fire("load")},_tileOnLoad:function(e){var t=this._layer;this.src!==n.Util.emptyImageUrl&&(n.DomUtil.addClass(this,"leaflet-tile-loaded"),t.fire("tileload",{tile:this,url:this.src})),t._tileLoaded()},_tileOnError:function(e){var t=this._layer;t.fire("tileerror",{tile:this,url:this.src});var n=t.options.errorTileUrl;n&&(this.src=n),t._tileLoaded()}}),n.tileLayer=function(e,t){return new n.TileLayer(e,t)},n.TileLayer.WMS=n.TileLayer.extend({defaultWmsParams:{service:"WMS",request:"GetMap",version:"1.1.1",layers:"",styles:"",format:"image/jpeg",transparent:!1},initialize:function(e,t){this._url=e;var r=n.Util.extend({},this.defaultWmsParams);t.detectRetina&&n.Browser.retina?r.width=r.height=this.options.tileSize*2:r.width=r.height=this.options.tileSize;for(var i in t)this.options.hasOwnProperty(i)||(r[i]=t[i]);this.wmsParams=r,n.Util.setOptions(this,t)},onAdd:function(e){var t=parseFloat(this.wmsParams.version)>=1.3?"crs":"srs";this.wmsParams[t]=e.options.crs.code,n.TileLayer.prototype.onAdd.call(this,e)},getTileUrl:function(e,t){var r=this._map,i=r.options.crs,s=this.options.tileSize,o=e.multiplyBy(s),u=o.add(new n.Point(s,s)),a=i.project(r.unproject(o,t)),f=i.project(r.unproject(u,t)),l=[a.x,f.y,f.x,a.y].join(","),c=n.Util.template(this._url,{s:this._getSubdomain(e)});return c+n.Util.getParamString(this.wmsParams)+"&bbox="+l},setParams:function(e,t){return n.Util.extend(this.wmsParams,e),t||this.redraw(),this}}),n.tileLayer.wms=function(e,t){return new n.TileLayer.WMS(e,t)},n.TileLayer.Canvas=n.TileLayer.extend({options:{async:!1},initialize:function(e){n.Util.setOptions(this,e)},redraw:function(){var e,t=this._tiles;for(e in t)t.hasOwnProperty(e)&&this._redrawTile(t[e])},_redrawTile:function(e){this.drawTile(e,e._tilePoint,e._zoom)},_createTileProto:function(){var e=this._canvasProto=n.DomUtil.create("canvas","leaflet-tile"),t=this.options.tileSize;e.width=t,e.height=t},_createTile:function(){var e=this._canvasProto.cloneNode(!1);return e.onselectstart=e.onmousemove=n.Util.falseFn,e},_loadTile:function(e,t,n){e._layer=this,e._tilePoint=t,e._zoom=n,this.drawTile(e,t,n),this.options.async||this.tileDrawn(e)},drawTile:function(e,t,n){},tileDrawn:function(e){this._tileOnLoad.call(e)}}),n.tileLayer.canvas=function(e){return new n.TileLayer.Canvas(e)},n.ImageOverlay=n.Class.extend({includes:n.Mixin.Events,options:{opacity:1},initialize:function(e,t,r){this._url=e,this._bounds=n.latLngBounds(t),n.Util.setOptions(this,r)},onAdd:function(e){this._map=e,this._image||this._initImage(),e._panes.overlayPane.appendChild(this._image),e.on("viewreset",this._reset,this),e.options.zoomAnimation&&n.Browser.any3d&&e.on("zoomanim",this._animateZoom,this),this._reset()},onRemove:function(e){e.getPanes().overlayPane.removeChild(this._image),e.off("viewreset",this._reset,this),e.options.zoomAnimation&&e.off("zoomanim",this._animateZoom,this)},addTo:function(e){return e.addLayer(this),this},setOpacity:function(e){return this.options.opacity=e,this._updateOpacity(),this},bringToFront:function(){return this._image&&this._map._panes.overlayPane.appendChild(this._image),this},bringToBack:function(){var e=this._map._panes.overlayPane;return this._image&&e.insertBefore(this._image,e.firstChild),this},_initImage:function(){this._image=n.DomUtil.create("img","leaflet-image-layer"),this._map.options.zoomAnimation&&n.Browser.any3d?n.DomUtil.addClass(this._image,"leaflet-zoom-animated"):n.DomUtil.addClass(this._image,"leaflet-zoom-hide"),this._updateOpacity(),n.Util.extend(this._image,{galleryimg:"no",onselectstart:n.Util.falseFn,onmousemove:n.Util.falseFn,onload:n.Util.bind(this._onImageLoad,this),src:this._url})},_animateZoom:function(e){var t=this._map,r=this._image,i=t.getZoomScale(e.zoom),s=this._bounds.getNorthWest(),o=this._bounds.getSouthEast(),u=t._latLngToNewLayerPoint(s,e.zoom,e.center),a=t._latLngToNewLayerPoint(o,e.zoom,e.center).subtract(u),f=t.latLngToLayerPoint(o).subtract(t.latLngToLayerPoint(s)),l=u.add(a.subtract(f).divideBy(2));r.style[n.DomUtil.TRANSFORM]=n.DomUtil.getTranslateString(l)+" scale("+i+") "},_reset:function(){var e=this._image,t=this._map.latLngToLayerPoint(this._bounds.getNorthWest()),r=this._map.latLngToLayerPoint(this._bounds.getSouthEast()).subtract(t);n.DomUtil.setPosition(e,t),e.style.width=r.x+"px",e.style.height=r.y+"px"},_onImageLoad:function(){this.fire("load")},_updateOpacity:function(){n.DomUtil.setOpacity(this._image,this.options.opacity)}}),n.imageOverlay=function(e,t,r){return new n.ImageOverlay(e,t,r)},n.Icon=n.Class.extend({options:{className:""},initialize:function(e){n.Util.setOptions(this,e)},createIcon:function(){return this._createIcon("icon")},createShadow:function(){return this._createIcon("shadow")},_createIcon:function(e){var t=this._getIconUrl(e);if(!t){if(e==="icon")throw Error("iconUrl not set in Icon options (see the docs).");return null}var n=this._createImg(t);return this._setIconStyles(n,e),n},_setIconStyles:function(e,t){var r=this.options,i=n.point(r[t+"Size"]),s;t==="shadow"?s=n.point(r.shadowAnchor||r.iconAnchor):s=n.point(r.iconAnchor),!s&&i&&(s=i.divideBy(2,!0)),e.className="leaflet-marker-"+t+" "+r.className,s&&(e.style.marginLeft=-s.x+"px",e.style.marginTop=-s.y+"px"),i&&(e.style.width=i.x+"px",e.style.height=i.y+"px")},_createImg:function(e){var t;return n.Browser.ie6?(t=document.createElement("div"),t.style.filter='progid:DXImageTransform.Microsoft.AlphaImageLoader(src="'+e+'")'):(t=document.createElement("img"),t.src=e),t},_getIconUrl:function(e){return this.options[e+"Url"]}}),n.icon=function(e){return new n.Icon(e)},n.Icon.Default=n.Icon.extend({options:{iconSize:new n.Point(25,41),iconAnchor:new n.Point(13,41),popupAnchor:new n.Point(1,-34),shadowSize:new n.Point(41,41)},_getIconUrl:function(e){var t=e+"Url";if(this.options[t])return this.options[t];var r=n.Icon.Default.imagePath;if(!r)throw Error("Couldn't autodetect L.Icon.Default.imagePath, set it manually.");return r+"/marker-"+e+".png"}}),n.Icon.Default.imagePath=function(){var e=document.getElementsByTagName("script"),t=/\/?leaflet[\-\._]?([\w\-\._]*)\.js\??/,n,r,i,s;for(n=0,r=e.length;n<r;n++){i=e[n].src,s=i.match(t);if(s)return i.split(t)[0]+"/images"}}(),n.Marker=n.Class.extend({includes:n.Mixin.Events,options:{icon:new n.Icon.Default,title:"",clickable:!0,draggable:!1,zIndexOffset:0,opacity:1},initialize:function(e,t){n.Util.setOptions(this,t),this._latlng=n.latLng(e)},onAdd:function(e){this._map=e,e.on("viewreset",this.update,this),this._initIcon(),this.update(),e.options.zoomAnimation&&e.options.markerZoomAnimation&&e.on("zoomanim",this._animateZoom,this)},addTo:function(e){return e.addLayer(this),this},onRemove:function(e){this._removeIcon(),this.closePopup&&this.closePopup(),e.off({viewreset:this.update,zoomanim:this._animateZoom},this),this._map=null},getLatLng:function(){return this._latlng},setLatLng:function(e){this._latlng=n.latLng(e),this.update(),this._popup&&this._popup.setLatLng(e)},setZIndexOffset:function(e){this.options.zIndexOffset=e,this.update()},setIcon:function(e){this._map&&this._removeIcon(),this.options.icon=e,this._map&&(this._initIcon(),this.update())},update:function(){if(!this._icon)return;var e=this._map.latLngToLayerPoint(this._latlng).round();this._setPos(e)},_initIcon:function(){var e=this.options,t=this._map,r=t.options.zoomAnimation&&t.options.markerZoomAnimation,i=r?"leaflet-zoom-animated":"leaflet-zoom-hide",s=!1;this._icon||(this._icon=e.icon.createIcon(),e.title&&(this._icon.title=e.title),this._initInteraction(),s=this.options.opacity<1,n.DomUtil.addClass(this._icon,i)),this._shadow||(this._shadow=e.icon.createShadow(),this._shadow&&(n.DomUtil.addClass(this._shadow,i),s=this.options.opacity<1)),s&&this._updateOpacity();var o=this._map._panes;o.markerPane.appendChild(this._icon),this._shadow&&o.shadowPane.appendChild(this._shadow)},_removeIcon:function(){var e=this._map._panes;e.markerPane.removeChild(this._icon),this._shadow&&e.shadowPane.removeChild(this._shadow),this._icon=this._shadow=null},_setPos:function(e){n.DomUtil.setPosition(this._icon,e),this._shadow&&n.DomUtil.setPosition(this._shadow,e),this._icon.style.zIndex=e.y+this.options.zIndexOffset},_animateZoom:function(e){var t=this._map._latLngToNewLayerPoint(this._latlng,e.zoom,e.center);this._setPos(t)},_initInteraction:function(){if(!this.options.clickable)return;var e=this._icon,t=["dblclick","mousedown","mouseover","mouseout"];n.DomUtil.addClass(e,"leaflet-clickable"),n.DomEvent.on(e,"click",this._onMouseClick,this);for(var r=0;r<t.length;r++)n.DomEvent.on(e,t[r],this._fireMouseEvent,this);n.Handler.MarkerDrag&&(this.dragging=new n.Handler.MarkerDrag(this),this.options.draggable&&this.dragging.enable())},_onMouseClick:function(e){n.DomEvent.stopPropagation(e);if(this.dragging&&this.dragging.moved())return;if(this._map.dragging&&this._map.dragging.moved())return;this.fire(e.type,{originalEvent:e})},_fireMouseEvent:function(e){this.fire(e.type,{originalEvent:e}),e.type!=="mousedown"&&n.DomEvent.stopPropagation(e)},setOpacity:function(e){this.options.opacity=e,this._map&&this._updateOpacity()},_updateOpacity:function(){n.DomUtil.setOpacity(this._icon,this.options.opacity),this._shadow&&n.DomUtil.setOpacity(this._shadow,this.options.opacity)}}),n.marker=function(e,t){return new n.Marker(e,t)},n.DivIcon=n.Icon.extend({options:{iconSize:new n.Point(12,12),className:"leaflet-div-icon"},createIcon:function(){var e=document.createElement("div"),t=this.options;return t.html&&(e.innerHTML=t.html),t.bgPos&&(e.style.backgroundPosition=-t.bgPos.x+"px "+ -t.bgPos.y+"px"),this._setIconStyles(e,"icon"),e},createShadow:function(){return null}}),n.divIcon=function(e){return new n.DivIcon(e)},n.Map.mergeOptions({closePopupOnClick:!0}),n.Popup=n.Class.extend({includes:n.Mixin.Events,options:{minWidth:50,maxWidth:300,maxHeight:null,autoPan:!0,closeButton:!0,offset:new n.Point(0,6),autoPanPadding:new n.Point(5,5),className:""},initialize:function(e,t){n.Util.setOptions(this,e),this._source=t},onAdd:function(e){this._map=e,this._container||this._initLayout(),this._updateContent();var t=e.options.fadeAnimation;t&&n.DomUtil.setOpacity(this._container,0),e._panes.popupPane.appendChild(this._container),e.on("viewreset",this._updatePosition,this),n.Browser.any3d&&e.on("zoomanim",this._zoomAnimation,this),e.options.closePopupOnClick&&e.on("preclick",this._close,this),this._update(),t&&n.DomUtil.setOpacity(this._container,1)},addTo:function(e){return e.addLayer(this),this},openOn:function(e){return e.openPopup(this),this},onRemove:function(e){e._panes.popupPane.removeChild(this._container),n.Util.falseFn(this._container.offsetWidth),e.off({viewreset:this._updatePosition,preclick:this._close,zoomanim:this._zoomAnimation},this),e.options.fadeAnimation&&n.DomUtil.setOpacity(this._container,0),this._map=null},setLatLng:function(e){return this._latlng=n.latLng(e),this._update(),this},setContent:function(e){return this._content=e,this._update(),this},_close:function(){var e=this._map;e&&(e._popup=null,e.removeLayer(this).fire("popupclose",{popup:this}))},_initLayout:function(){var e="leaflet-popup",t=this._container=n.DomUtil.create("div",e+" "+this.options.className+" leaflet-zoom-animated"),r;this.options.closeButton&&(r=this._closeButton=n.DomUtil.create("a",e+"-close-button",t),r.href="#close",r.innerHTML="&#215;",n.DomEvent.on(r,"click",this._onCloseButtonClick,this));var i=this._wrapper=n.DomUtil.create("div",e+"-content-wrapper",t);n.DomEvent.disableClickPropagation(i),this._contentNode=n.DomUtil.create("div",e+"-content",i),n.DomEvent.on(this._contentNode,"mousewheel",n.DomEvent.stopPropagation),this._tipContainer=n.DomUtil.create("div",e+"-tip-container",t),this._tip=n.DomUtil.create("div",e+"-tip",this._tipContainer)},_update:function(){if(!this._map)return;this._container.style.visibility="hidden",this._updateContent(),this._updateLayout(),this._updatePosition(),this._container.style.visibility="",this._adjustPan()},_updateContent:function(){if(!this._content)return;if(typeof this._content=="string")this._contentNode.innerHTML=this._content;else{while(this._contentNode.hasChildNodes())this._contentNode.removeChild(this._contentNode.firstChild);this._contentNode.appendChild(this._content)}this.fire("contentupdate")},_updateLayout:function(){var e=this._contentNode,t=e.style;t.width="",t.whiteSpace="nowrap";var r=e.offsetWidth;r=Math.min(r,this.options.maxWidth),r=Math.max(r,this.options.minWidth),t.width=r+1+"px",t.whiteSpace="",t.height="";var i=e.offsetHeight,s=this.options.maxHeight,o="leaflet-popup-scrolled";s&&i>s?(t.height=s+"px",n.DomUtil.addClass(e,o)):n.DomUtil.removeClass(e,o),this._containerWidth=this._container.offsetWidth},_updatePosition:function(){var e=this._map.latLngToLayerPoint(this._latlng),t=n.Browser.any3d,r=this.options.offset;t&&n.DomUtil.setPosition(this._container,e),this._containerBottom=-r.y-(t?0:e.y),this._containerLeft=-Math.round(this._containerWidth/2)+r.x+(t?0:e.x),this._container.style.bottom=this._containerBottom+"px",this._container.style.left=this._containerLeft+"px"},_zoomAnimation:function(e){var t=this._map._latLngToNewLayerPoint(this._latlng,e.zoom,e.center);n.DomUtil.setPosition(this._container,t)},_adjustPan:function(){if(!this.options.autoPan)return;var e=this._map,t=this._container.offsetHeight,r=this._containerWidth,i=new n.Point(this._containerLeft,-t-this._containerBottom);n.Browser.any3d&&i._add(n.DomUtil.getPosition(this._container));var s=e.layerPointToContainerPoint(i),o=this.options.autoPanPadding,u=e.getSize(),a=0,f=0;s.x<0&&(a=s.x-o.x),s.x+r>u.x&&(a=s.x+r-u.x+o.x),s.y<0&&(f=s.y-o.y),s.y+t>u.y&&(f=s.y+t-u.y+o.y),(a||f)&&e.panBy(new n.Point(a,f))},_onCloseButtonClick:function(e){this._close(),n.DomEvent.stop(e)}}),n.popup=function(e,t){return new n.Popup(e,t)},n.Marker.include({openPopup:function(){return this._popup&&this._map&&(this._popup.setLatLng(this._latlng),this._map.openPopup(this._popup)),this},closePopup:function(){return this._popup&&this._popup._close(),this},bindPopup:function(e,t){var r=n.point(this.options.icon.options.popupAnchor)||new n.Point(0,0);return r=r.add(n.Popup.prototype.options.offset),t&&t.offset&&(r=r.add(t.offset)),t=n.Util.extend({offset:r},t),this._popup||this.on("click",this.openPopup,this),this._popup=(new n.Popup(t,this)).setContent(e),this},unbindPopup:function(){return this._popup&&(this._popup=null,this.off("click",this.openPopup)),this}}),n.Map.include({openPopup:function(e){return this.closePopup(),this._popup=e,this.addLayer(e).fire("popupopen",{popup:this._popup})},closePopup:function(){return this._popup&&this._popup._close(),this}}),n.LayerGroup=n.Class.extend({initialize:function(e){this._layers={};var t,n;if(e)for(t=0,n=e.length;t<n;t++)this.addLayer(e[t])},addLayer:function(e){var t=n.Util.stamp(e);return this._layers[t]=e,this._map&&this._map.addLayer(e),this},removeLayer:function(e){var t=n.Util.stamp(e);return delete this._layers[t],this._map&&this._map.removeLayer(e),this},clearLayers:function(){return this.eachLayer(this.removeLayer,this),this},invoke:function(e){var t=Array.prototype.slice.call(arguments,1),n,r;for(n in this._layers)this._layers.hasOwnProperty(n)&&(r=this._layers[n],r[e]&&r[e].apply(r,t));return this},onAdd:function(e){this._map=e,this.eachLayer(e.addLayer,e)},onRemove:function(e){this.eachLayer(e.removeLayer,e),this._map=null},addTo:function(e){return e.addLayer(this),this},eachLayer:function(e,t){for(var n in this._layers)this._layers.hasOwnProperty(n)&&e.call(t,this._layers[n])}}),n.layerGroup=function(e){return new n.LayerGroup(e)},n.FeatureGroup=n.LayerGroup.extend({includes:n.Mixin.Events,addLayer:function(e){return this._layers[n.Util.stamp(e)]?this:(e.on("click dblclick mouseover mouseout mousemove contextmenu",this._propagateEvent,this),n.LayerGroup.prototype.addLayer.call(this,e),this._popupContent&&e.bindPopup&&e.bindPopup(this._popupContent),this)},removeLayer:function(e){return e.off("click dblclick mouseover mouseout mousemove contextmenu",this._propagateEvent,this),n.LayerGroup.prototype.removeLayer.call(this,e),this._popupContent?this.invoke("unbindPopup"):this},bindPopup:function(e){return this._popupContent=e,this.invoke("bindPopup",e)},setStyle:function(e){return this.invoke("setStyle",e)},bringToFront:function(){return this.invoke("bringToFront")},bringToBack:function(){return this.invoke("bringToBack")},getBounds:function(){var e=new n.LatLngBounds;return this.eachLayer(function(t){e.extend(t instanceof n.Marker?t.getLatLng():t.getBounds())},this),e},_propagateEvent:function(e){e.layer=e.target,e.target=this,this.fire(e.type,e)}}),n.featureGroup=function(e){return new n.FeatureGroup(e)},n.Path=n.Class.extend({includes:[n.Mixin.Events],statics:{CLIP_PADDING:n.Browser.mobile?Math.max(0,Math.min(.5,(1280/Math.max(e.innerWidth,e.innerHeight)-1)/2)):.5},options:{stroke:!0,color:"#0033ff",dashArray:null,weight:5,opacity:.5,fill:!1,fillColor:null,fillOpacity:.2,clickable:!0},initialize:function(e){n.Util.setOptions(this,e)},onAdd:function(e){this._map=e,this._container||(this._initElements(),this._initEvents()),this.projectLatlngs(),this._updatePath(),this._container&&this._map._pathRoot.appendChild(this._container),e.on({viewreset:this.projectLatlngs,moveend:this._updatePath},this)},addTo:function(e){return e.addLayer(this),this},onRemove:function(e){e._pathRoot.removeChild(this._container),this._map=null,n.Browser.vml&&(this._container=null,this._stroke=null,this._fill=null),e.off({viewreset:this.projectLatlngs,moveend:this._updatePath},this)},projectLatlngs:function(){},setStyle:function(e){return n.Util.setOptions(this,e),this._container&&this._updateStyle(),this},redraw:function(){return this._map&&(this.projectLatlngs(),this._updatePath()),this}}),n.Map.include({_updatePathViewport:function(){var e=n.Path.CLIP_PADDING,t=this.getSize(),r=n.DomUtil.getPosition(this._mapPane),i=r.multiplyBy(-1)._subtract(t.multiplyBy(e)),s=i.add(t.multiplyBy(1+e*2));this._pathViewport=new n.Bounds(i,s)}}),n.Path.SVG_NS="http://www.w3.org/2000/svg",n.Browser.svg=!!document.createElementNS&&!!document.createElementNS(n.Path.SVG_NS,"svg").createSVGRect,n.Path=n.Path.extend({statics:{SVG:n.Browser.svg},bringToFront:function(){return this._container&&this._map._pathRoot.appendChild(this._container),this},bringToBack:function(){if(this._container){var e=this._map._pathRoot;e.insertBefore(this._container,e.firstChild)}return this},getPathString:function(){},_createElement:function(e){return document.createElementNS(n.Path.SVG_NS,e)},_initElements:function(){this._map._initPathRoot(),this._initPath(),this._initStyle()},_initPath:function(){this._container=this._createElement("g"),this._path=this._createElement("path"),this._container.appendChild(this._path)},_initStyle:function(){this.options.stroke&&(this._path.setAttribute("stroke-linejoin","round"),this._path.setAttribute("stroke-linecap","round")),this.options.fill&&this._path.setAttribute("fill-rule","evenodd"),this._updateStyle()},_updateStyle:function(){this.options.stroke?(this._path.setAttribute("stroke",this.options.color),this._path.setAttribute("stroke-opacity",this.options.opacity),this._path.setAttribute("stroke-width",this.options.weight),this.options.dashArray?this._path.setAttribute("stroke-dasharray",this.options.dashArray):this._path.removeAttribute("stroke-dasharray")):this._path.setAttribute("stroke","none"),this.options.fill?(this._path.setAttribute("fill",this.options.fillColor||this.options.color),this._path.setAttribute("fill-opacity",this.options.fillOpacity)):this._path.setAttribute("fill","none")},_updatePath:function(){var e=this.getPathString();e||(e="M0 0"),this._path.setAttribute("d",e)},_initEvents:function(){if(this.options.clickable){(n.Browser.svg||!n.Browser.vml)&&this._path.setAttribute("class","leaflet-clickable"),n.DomEvent.on(this._container,"click",this._onMouseClick,this);var e=["dblclick","mousedown","mouseover","mouseout","mousemove","contextmenu"];for(var t=0;t<e.length;t++)n.DomEvent.on(this._container,e[t],this._fireMouseEvent,this)}},_onMouseClick:function(e){if(this._map.dragging&&this._map.dragging.moved())return;this._fireMouseEvent(e),n.DomEvent.stopPropagation(e)},_fireMouseEvent:function(e){if(!this.hasEventListeners(e.type))return;e.type==="contextmenu"&&n.DomEvent.preventDefault(e);var t=this._map,r=t.mouseEventToContainerPoint(e),i=t.containerPointToLayerPoint(r),s=t.layerPointToLatLng(i);this.fire(e.type,{latlng:s,layerPoint:i,containerPoint:r,originalEvent:e})}}),n.Map.include({_initPathRoot:function(){this._pathRoot||(this._pathRoot=n.Path.prototype._createElement("svg"),this._panes.overlayPane.appendChild(this._pathRoot),this.options.zoomAnimation&&n.Browser.any3d?(this._pathRoot.setAttribute("class"," leaflet-zoom-animated"),this.on({zoomanim:this._animatePathZoom,zoomend:this._endPathZoom})):this._pathRoot.setAttribute("class"," leaflet-zoom-hide"),this.on("moveend",this._updateSvgViewport),this._updateSvgViewport())},_animatePathZoom:function(e){var t=this.getZoomScale(e.zoom),r=this._getCenterOffset(e.center).divideBy(1-1/t),i=this.containerPointToLayerPoint(this.getSize().multiplyBy(-n.Path.CLIP_PADDING)),s=i.add(r).round();this._pathRoot.style[n.DomUtil.TRANSFORM]=n.DomUtil.getTranslateString(s.multiplyBy(-1).add(n.DomUtil.getPosition(this._pathRoot)).multiplyBy(t).add(s))+" scale("+t+") ",this._pathZooming=!0},_endPathZoom:function(){this._pathZooming=!1},_updateSvgViewport:function(){if(this._pathZooming)return;this._updatePathViewport();var e=this._pathViewport,t=e.min,r=e.max,i=r.x-t.x,s=r.y-t.y,o=this._pathRoot,u=this._panes.overlayPane;n.Browser.mobileWebkit&&u.removeChild(o),n.DomUtil.setPosition(o,t),o.setAttribute("width",i),o.setAttribute("height",s),o.setAttribute("viewBox",[t.x,t.y,i,s].join(" ")),n.Browser.mobileWebkit&&u.appendChild(o)}}),n.Path.include({bindPopup:function(e,t){if(!this._popup||this._popup.options!==t)this._popup=new n.Popup(t,this);return this._popup.setContent(e),this._openPopupAdded||(this.on("click",this._openPopup,this),this._openPopupAdded=!0),this},openPopup:function(e){return this._popup&&(e=e||this._latlng||this._latlngs[Math.floor(this._latlngs.length/2)],this._openPopup({latlng:e})),this},_openPopup:function(e){this._popup.setLatLng(e.latlng),this._map.openPopup(this._popup)}}),n.Browser.vml=function(){try{var e=document.createElement("div");e.innerHTML='<v:shape adj="1"/>';var t=e.firstChild;return t.style.behavior="url(#default#VML)",t&&typeof t.adj=="object"}catch(n){return!1}}(),n.Path=n.Browser.svg||!n.Browser.vml?n.Path:n.Path.extend({statics:{VML:!0,CLIP_PADDING:.02},_createElement:function(){try{return document.namespaces.add("lvml","urn:schemas-microsoft-com:vml"),function(e){return document.createElement("<lvml:"+e+' class="lvml">')}}catch(e){return function(e){return document.createElement("<"+e+' xmlns="urn:schemas-microsoft.com:vml" class="lvml">')}}}(),_initPath:function(){var e=this._container=this._createElement("shape");n.DomUtil.addClass(e,"leaflet-vml-shape"),this.options.clickable&&n.DomUtil.addClass(e,"leaflet-clickable"),e.coordsize="1 1",this._path=this._createElement("path"),e.appendChild(this._path),this._map._pathRoot.appendChild(e)},_initStyle:function(){this._updateStyle()},_updateStyle:function(){var e=this._stroke,t=this._fill,n=this.options,r=this._container;r.stroked=n.stroke,r.filled=n.fill,n.stroke?(e||(e=this._stroke=this._createElement("stroke"),e.endcap="round",r.appendChild(e)),e.weight=n.weight+"px",e.color=n.color,e.opacity=n.opacity,n.dashArray?e.dashStyle=n.dashArray.replace(/ *, */g," "):e.dashStyle=""):e&&(r.removeChild(e),this._stroke=null),n.fill?(t||(t=this._fill=this._createElement("fill"),r.appendChild(t)),t.color=n.fillColor||n.color,t.opacity=n.fillOpacity):t&&(r.removeChild(t),this._fill=null)},_updatePath:function(){var e=this._container.style;e.display="none",this._path.v=this.getPathString()+" ",e.display=""}}),n.Map.include(n.Browser.svg||!n.Browser.vml?{}:{_initPathRoot:function(){if(this._pathRoot)return;var e=this._pathRoot=document.createElement("div");e.className="leaflet-vml-container",this._panes.overlayPane.appendChild(e),this.on("moveend",this._updatePathViewport),this._updatePathViewport()}}),n.Browser.canvas=function(){return!!document.createElement("canvas").getContext}(),n.Path=n.Path.SVG&&!e.L_PREFER_CANVAS||!n.Browser.canvas?n.Path:n.Path.extend({statics:{CANVAS:!0,SVG:!1},redraw:function(){return this._map&&(this.projectLatlngs(),this._requestUpdate()),this},setStyle:function(e){return n.Util.setOptions(this,e),this._map&&(this._updateStyle(),this._requestUpdate()),this},onRemove:function(e){e.off("viewreset",this.projectLatlngs,this).off("moveend",this._updatePath,this),this._requestUpdate(),this._map=null},_requestUpdate:function(){this._map&&(n.Util.cancelAnimFrame(this._fireMapMoveEnd),this._updateRequest=n.Util.requestAnimFrame(this._fireMapMoveEnd,this._map))},_fireMapMoveEnd:function(){this.fire("moveend")},_initElements:function(){this._map._initPathRoot(),this._ctx=this._map._canvasCtx},_updateStyle:function(){var e=this.options;e.stroke&&(this._ctx.lineWidth=e.weight,this._ctx.strokeStyle=e.color),e.fill&&(this._ctx.fillStyle=e.fillColor||e.color)},_drawPath:function(){var e,t,r,i,s,o;this._ctx.beginPath();for(e=0,r=this._parts.length;e<r;e++){for(t=0,i=this._parts[e].length;t<i;t++)s=this._parts[e][t],o=(t===0?"move":"line")+"To",this._ctx[o](s.x,s.y);this instanceof n.Polygon&&this._ctx.closePath()}},_checkIfEmpty:function(){return!this._parts.length},_updatePath:function(){if(this._checkIfEmpty())return;var e=this._ctx,t=this.options;this._drawPath(),e.save(),this._updateStyle(),t.fill&&(t.fillOpacity<1&&(e.globalAlpha=t.fillOpacity),e.fill()),t.stroke&&(t.opacity<1&&(e.globalAlpha=t.opacity),e.stroke()),e.restore()},_initEvents:function(){this.options.clickable&&this._map.on("click",this._onClick,this)},_onClick:function(e){this._containsPoint(e.layerPoint)&&this.fire("click",e)}}),n.Map.include(n.Path.SVG&&!e.L_PREFER_CANVAS||!n.Browser.canvas?{}:{_initPathRoot:function(){var e=this._pathRoot,t;e||(e=this._pathRoot=document.createElement("canvas"),e.style.position="absolute",t=this._canvasCtx=e.getContext("2d"),t.lineCap="round",t.lineJoin="round",this._panes.overlayPane.appendChild(e),this.options.zoomAnimation&&(this._pathRoot.className="leaflet-zoom-animated",this.on("zoomanim",this._animatePathZoom),this.on("zoomend",this._endPathZoom)),this.on("moveend",this._updateCanvasViewport),this._updateCanvasViewport())},_updateCanvasViewport:function(){if(this._pathZooming)return;this._updatePathViewport();var e=this._pathViewport,t=e.min,r=e.max.subtract(t),i=this._pathRoot;n.DomUtil.setPosition(i,t),i.width=r.x,i.height=r.y,i.getContext("2d").translate(-t.x,-t.y)}}),n.LineUtil={simplify:function(e,t){if(!t||!e.length)return e.slice();var n=t*t;return e=this._reducePoints(e,n),e=this._simplifyDP(e,n),e},pointToSegmentDistance:function(e,t,n){return Math.sqrt(this._sqClosestPointOnSegment(e,t,n,!0))},closestPointOnSegment:function(e,t,n){return this._sqClosestPointOnSegment(e,t,n)},_simplifyDP:function(e,n){var r=e.length,i=typeof Uint8Array!=t+""?Uint8Array:Array,s=new i(r);s[0]=s[r-1]=1,this._simplifyDPStep(e,s,n,0,r-1);var o,u=[];for(o=0;o<r;o++)s[o]&&u.push(e[o]);return u},_simplifyDPStep:function(e,t,n,r,i){var s=0,o,u,a;for(u=r+1;u<=i-1;u++)a=this._sqClosestPointOnSegment(e[u],e[r],e[i],!0),a>s&&(o=u,s=a);s>n&&(t[o]=1,this._simplifyDPStep(e,t,n,r,o),this._simplifyDPStep(e,t,n,o,i))},_reducePoints:function(e,t){var n=[e[0]];for(var r=1,i=0,s=e.length;r<s;r++)this._sqDist(e[r],e[i])>t&&(n.push(e[r]),i=r);return i<s-1&&n.push(e[s-1]),n},clipSegment:function(e,t,n,r){var i=n.min,s=n.max,o=r?this._lastCode:this._getBitCode(e,n),u=this._getBitCode(t,n);this._lastCode=u;for(;;){if(!(o|u))return[e,t];if(o&u)return!1;var a=o||u,f=this._getEdgeIntersection(e,t,a,n),l=this._getBitCode(f,n);a===o?(e=f,o=l):(t=f,u=l)}},_getEdgeIntersection:function(e,t,r,i){var s=t.x-e.x,o=t.y-e.y,u=i.min,a=i.max;if(r&8)return new n.Point(e.x+s*(a.y-e.y)/o,a.y);if(r&4)return new n.Point(e.x+s*(u.y-e.y)/o,u.y);if(r&2)return new n.Point(a.x,e.y+o*(a.x-e.x)/s);if(r&1)return new n.Point(u.x,e.y+o*(u.x-e.x)/s)},_getBitCode:function(e,t){var n=0;return e.x<t.min.x?n|=1:e.x>t.max.x&&(n|=2),e.y<t.min.y?n|=4:e.y>t.max.y&&(n|=8),n},_sqDist:function(e,t){var n=t.x-e.x,r=t.y-e.y;return n*n+r*r},_sqClosestPointOnSegment:function(e,t,r,i){var s=t.x,o=t.y,u=r.x-s,a=r.y-o,f=u*u+a*a,l;return f>0&&(l=((e.x-s)*u+(e.y-o)*a)/f,l>1?(s=r.x,o=r.y):l>0&&(s+=u*l,o+=a*l)),u=e.x-s,a=e.y-o,i?u*u+a*a:new n.Point(s,o)}},n.Polyline=n.Path.extend({initialize:function(e,t){n.Path.prototype.initialize.call(this,t),this._latlngs=this._convertLatLngs(e),n.Handler.PolyEdit&&(this.editing=new n.Handler.PolyEdit(this),this.options.editable&&this.editing.enable())},options:{smoothFactor:1,noClip:!1},projectLatlngs:function(){this._originalPoints=[];for(var e=0,t=this._latlngs.length;e<t;e++)this._originalPoints[e]=this._map.latLngToLayerPoint(this._latlngs[e])},getPathString:function(){for(var e=0,t=this._parts.length,n="";e<t;e++)n+=this._getPathPartStr(this._parts[e]);return n},getLatLngs:function(){return this._latlngs},setLatLngs:function(e){return this._latlngs=this._convertLatLngs(e),this.redraw()},addLatLng:function(e){return this._latlngs.push(n.latLng(e)),this.redraw()},spliceLatLngs:function(e,t){var n=[].splice.apply(this._latlngs,arguments);return this._convertLatLngs(this._latlngs),this.redraw(),n},closestLayerPoint:function(e){var t=Infinity,r=this._parts,i,s,o=null;for(var u=0,a=r.length;u<a;u++){var f=r[u];for(var l=1,c=f.length;l<c;l++){i=f[l-1],s=f[l];var h=n.LineUtil._sqClosestPointOnSegment(e,i,s,!0);h<t&&(t=h,o=n.LineUtil._sqClosestPointOnSegment(e,i,s))}}return o&&(o.distance=Math.sqrt(t)),o},getBounds:function(){var e=new n.LatLngBounds,t=this.getLatLngs();for(var r=0,i=t.length;r<i;r++)e.extend(t[r]);return e},onAdd:function(e){n.Path.prototype.onAdd.call(this,e),this.editing&&this.editing.enabled()&&this.editing.addHooks()},onRemove:function(e){this.editing&&this.editing.enabled()&&this.editing.removeHooks(),n.Path.prototype.onRemove.call(this,e)},_convertLatLngs:function(e){var t,r;for(t=0,r=e.length;t<r;t++){if(e[t]instanceof Array&&typeof e[t][0]!="number")return;e[t]=n.latLng(e[t])}return e},_initEvents:function(){n.Path.prototype._initEvents.call(this)},_getPathPartStr:function(e){var t=n.Path.VML;for(var r=0,i=e.length,s="",o;r<i;r++)o=e[r],t&&o._round(),s+=(r?"L":"M")+o.x+" "+o.y;return s},_clipPoints:function(){var e=this._originalPoints,t=e.length,r,i,s;if(this.options.noClip){this._parts=[e];return}this._parts=[];var o=this._parts,u=this._map._pathViewport,a=n.LineUtil;for(r=0,i=0;r<t-1;r++){s=a.clipSegment(e[r],e[r+1],u,r);if(!s)continue;o[i]=o[i]||[],o[i].push(s[0]);if(s[1]!==e[r+1]||r===t-2)o[i].push(s[1]),i++}},_simplifyPoints:function(){var e=this._parts,t=n.LineUtil;for(var r=0,i=e.length;r<i;r++)e[r]=t.simplify(e[r],this.options.smoothFactor)},_updatePath:function(){if(!this._map)return;this._clipPoints(),this._simplifyPoints(),n.Path.prototype._updatePath.call(this)}}),n.polyline=function(e,t){return new n.Polyline(e,t)},n.PolyUtil={},n.PolyUtil.clipPolygon=function(e,t){var r=t.min,i=t.max,s,o=[1,4,2,8],u,a,f,l,c,h,p,d,v=n.LineUtil;for(u=0,h=e.length;u<h;u++)e[u]._code=v._getBitCode(e[u],t);for(f=0;f<4;f++){p=o[f],s=[];for(u=0,h=e.length,a=h-1;u<h;a=u++)l=e[u],c=e[a],l._code&p?c._code&p||(d=v._getEdgeIntersection(c,l,p,t),d._code=v._getBitCode(d,t),s.push(d)):(c._code&p&&(d=v._getEdgeIntersection(c,l,p,t),d._code=v._getBitCode(d,t),s.push(d)),s.push(l));e=s}return e},n.Polygon=n.Polyline.extend({options:{fill:!0},initialize:function(e,t){n.Polyline.prototype.initialize.call(this,e,t),e&&e[0]instanceof Array&&typeof e[0][0]!="number"&&(this._latlngs=this._convertLatLngs(e[0]),this._holes=e.slice(1))},projectLatlngs:function(){n.Polyline.prototype.projectLatlngs.call(this),this._holePoints=[];if(!this._holes)return;for(var e=0,t=this._holes.length,r;e<t;e++){this._holePoints[e]=[];for(var i=0,s=this._holes[e].length;i<s;i++)this._holePoints[e][i]=this._map.latLngToLayerPoint(this._holes[e][i])}},_clipPoints:function(){var e=this._originalPoints,t=[];this._parts=[e].concat(this._holePoints);if(this.options.noClip)return;for(var r=0,i=this._parts.length;r<i;r++){var s=n.PolyUtil.clipPolygon(this._parts[r],this._map._pathViewport);if(!s.length)continue;t.push(s)}this._parts=t},_getPathPartStr:function(e){var t=n.Polyline.prototype._getPathPartStr.call(this,e);return t+(n.Browser.svg?"z":"x")}}),n.polygon=function(e,t){return new n.Polygon(e,t)},function(){function e(e){return n.FeatureGroup.extend({initialize:function(e,t){this._layers={},this._options=t,this.setLatLngs(e)},setLatLngs:function(t){var n=0,r=t.length;this.eachLayer(function(e){n<r?e.setLatLngs(t[n++]):this.removeLayer(e)},this);while(n<r)this.addLayer(new e(t[n++],this._options));return this}})}n.MultiPolyline=e(n.Polyline),n.MultiPolygon=e(n.Polygon),n.multiPolyline=function(e,t){return new n.MultiPolyline(e,t)},n.multiPolygon=function(e,t){return new n.MultiPolygon(e,t)}}(),n.Rectangle=n.Polygon.extend({initialize:function(e,t){n.Polygon.prototype.initialize.call(this,this._boundsToLatLngs(e),t)},setBounds:function(e){this.setLatLngs(this._boundsToLatLngs(e))},_boundsToLatLngs:function(e){return e=n.latLngBounds(e),[e.getSouthWest(),e.getNorthWest(),e.getNorthEast(),e.getSouthEast(),e.getSouthWest()]}}),n.rectangle=function(e,t){return new n.Rectangle(e,t)},n.Circle=n.Path.extend({initialize:function(e,t,r){n.Path.prototype.initialize.call(this,r),this._latlng=n.latLng(e),this._mRadius=t},options:{fill:!0},setLatLng:function(e){return this._latlng=n.latLng(e),this.redraw()},setRadius:function(e){return this._mRadius=e,this.redraw()},projectLatlngs:function(){var e=this._getLngRadius(),t=new n.LatLng(this._latlng.lat,this._latlng.lng-e,!0),r=this._map.latLngToLayerPoint(t);this._point=this._map.latLngToLayerPoint(this._latlng),this._radius=Math.max(Math.round(this._point.x-r.x),1)},getBounds:function(){var e=this._map,t=this._radius*Math.cos(Math.PI/4),r=e.project(this._latlng),i=new n.Point(r.x-t,r.y+t),s=new n.Point(r.x+t,r.y-t),o=e.unproject(i),u=e.unproject(s);return new n.LatLngBounds(o,u)},getLatLng:function(){return this._latlng},getPathString:function(){var e=this._point,t=this._radius;return this._checkIfEmpty()?"":n.Browser.svg?"M"+e.x+","+(e.y-t)+"A"+t+","+t+",0,1,1,"+(e.x-.1)+","+(e.y-t)+" z":(e._round(),t=Math.round(t),"AL "+e.x+","+e.y+" "+t+","+t+" 0,"+23592600)},getRadius:function(){return this._mRadius},_getLngRadius:function(){var e=40075017,t=e*Math.cos(n.LatLng.DEG_TO_RAD*this._latlng.lat);return this._mRadius/t*360},_checkIfEmpty:function(){if(!this._map)return!1;var e=this._map._pathViewport,t=this._radius,n=this._point;return n.x-t>e.max.x||n.y-t>e.max.y||n.x+t<e.min.x||n.y+t<e.min.y}}),n.circle=function(e,t,r){return new n.Circle(e,t,r)},n.CircleMarker=n.Circle.extend({options:{radius:10,weight:2},initialize:function(e,t){n.Circle.prototype.initialize.call(this,e,null,t),this._radius=this.options.radius},projectLatlngs:function(){this._point=this._map.latLngToLayerPoint(this._latlng)},setRadius:function(e){return this._radius=e,this.redraw()}}),n.circleMarker=function(e,t){return new n.CircleMarker(e,t)},n.Polyline.include(n.Path.CANVAS?{_containsPoint:function(e,t){var r,i,s,o,u,a,f,l=this.options.weight/2;n.Browser.touch&&(l+=10);for(r=0,o=this._parts.length;r<o;r++){f=this._parts[r];for(i=0,u=f.length,s=u-1;i<u;s=i++){if(!t&&i===0)continue;a=n.LineUtil.pointToSegmentDistance(e,f[s],f[i]);if(a<=l)return!0}}return!1}}:{}),n.Polygon.include(n.Path.CANVAS?{_containsPoint:function(e){var t=!1,r,i,s,o,u,a,f,l;if(n.Polyline.prototype._containsPoint.call(this,e,!0))return!0;for(o=0,f=this._parts.length;o<f;o++){r=this._parts[o];for(u=0,l=r.length,a=l-1;u<l;a=u++)i=r[u],s=r[a],i.y>e.y!=s.y>e.y&&e.x<(s.x-i.x)*(e.y-i.y)/(s.y-i.y)+i.x&&(t=!t)}return t}}:{}),n.Circle.include(n.Path.CANVAS?{_drawPath:function(){var e=this._point;this._ctx.beginPath(),this._ctx.arc(e.x,e.y,this._radius,0,Math.PI*2,!1)},_containsPoint:function(e){var t=this._point,n=this.options.stroke?this.options.weight/2:0;return e.distanceTo(t)<=this._radius+n}}:{}),n.GeoJSON=n.FeatureGroup.extend({initialize:function(e,t){n.Util.setOptions(this,t),this._layers={},e&&this.addData(e)},addData:function(e){var t=e instanceof Array?e:e.features,r,i;if(t){for(r=0,i=t.length;r<i;r++)this.addData(t[r]);return this}var s=this.options;if(s.filter&&!s.filter(e))return;var o=n.GeoJSON.geometryToLayer(e,s.pointToLayer);return o.feature=e,this.resetStyle(o),s.onEachFeature&&s.onEachFeature(e,o),this.addLayer(o)},resetStyle:function(e){var t=this.options.style;t&&this._setLayerStyle(e,t)},setStyle:function(e){this.eachLayer(function(t){this._setLayerStyle(t,e)},this)},_setLayerStyle:function(e,t){typeof t=="function"&&(t=t(e.feature)),e.setStyle&&e.setStyle(t)}}),n.Util.extend(n.GeoJSON,{geometryToLayer:function(e,t){var r=e.type==="Feature"?e.geometry:e,i=r.coordinates,s=[],o,u,a,f,l;switch(r.type){case"Point":return o=this.coordsToLatLng(i),t?t(e,o):new n.Marker(o);case"MultiPoint":for(a=0,f=i.length;a<f;a++)o=this.coordsToLatLng(i[a]),l=t?t(e,o):new n.Marker(o),s.push(l);return new n.FeatureGroup(s);case"LineString":return u=this.coordsToLatLngs(i),new n.Polyline(u);case"Polygon":return u=this.coordsToLatLngs(i,1),new n.Polygon(u);case"MultiLineString":return u=this.coordsToLatLngs(i,1),new n.MultiPolyline(u);case"MultiPolygon":return u=this.coordsToLatLngs(i,2),new n.MultiPolygon(u);case"GeometryCollection":for(a=0,f=r.geometries.length;a<f;a++)l=this.geometryToLayer(r.geometries[a],t),s.push(l);return new n.FeatureGroup(s);default:throw Error("Invalid GeoJSON object.")}},coordsToLatLng:function(e,t){var r=parseFloat(e[t?0:1]),i=parseFloat(e[t?1:0]);return new n.LatLng(r,i,!0)},coordsToLatLngs:function(e,t,n){var r,i=[],s,o;for(s=0,o=e.length;s<o;s++)r=t?this.coordsToLatLngs(e[s],t-1,n):this.coordsToLatLng(e[s],n),i.push(r);return i}}),n.geoJson=function(e,t){return new n.GeoJSON(e,t)},n.DomEvent={addListener:function(e,t,r,i){var s=n.Util.stamp(r),o="_leaflet_"+t+s,u,a,f;return e[o]?this:(u=function(t){return r.call(i||e,t||n.DomEvent._getEvent())},n.Browser.touch&&t==="dblclick"&&this.addDoubleTapListener?this.addDoubleTapListener(e,u,s):("addEventListener"in e?t==="mousewheel"?(e.addEventListener("DOMMouseScroll",u,!1),e.addEventListener(t,u,!1)):t==="mouseenter"||t==="mouseleave"?(a=u,f=t==="mouseenter"?"mouseover":"mouseout",u=function(t){if(!n.DomEvent._checkMouse(e,t))return;return a(t)},e.addEventListener(f,u,!1)):e.addEventListener(t,u,!1):"attachEvent"in e&&e.attachEvent("on"+t,u),e[o]=u,this))},removeListener:function(e,t,r){var i=n.Util.stamp(r),s="_leaflet_"+t+i,o=e[s];if(!o)return;return n.Browser.touch&&t==="dblclick"&&this.removeDoubleTapListener?this.removeDoubleTapListener(e,i):"removeEventListener"in e?t==="mousewheel"?(e.removeEventListener("DOMMouseScroll",o,!1),e.removeEventListener(t,o,!1)):t==="mouseenter"||t==="mouseleave"?e.removeEventListener(t==="mouseenter"?"mouseover":"mouseout",o,!1):e.removeEventListener(t,o,!1):"detachEvent"in e&&e.detachEvent("on"+t,o),e[s]=null,this},stopPropagation:function(e){return e.stopPropagation?e.stopPropagation():e.cancelBubble=!0,this},disableClickPropagation:function(e){var t=n.DomEvent.stopPropagation;return n.DomEvent.addListener(e,n.Draggable.START,t).addListener(e,"click",t).addListener(e,"dblclick",t)},preventDefault:function(e){return e.preventDefault?e.preventDefault():e.returnValue=!1,this},stop:function(e){return n.DomEvent.preventDefault(e).stopPropagation(e)},getMousePosition:function(e,t){var r=document.body,i=document.documentElement,s=e.pageX?e.pageX:e.clientX+r.scrollLeft+i.scrollLeft,o=e.pageY?e.pageY:e.clientY+r.scrollTop+i.scrollTop,u=new n.Point(s,o);return t?u._subtract(n.DomUtil.getViewportOffset(t)):u},getWheelDelta:function(e){var t=0;return e.wheelDelta&&(t=e.wheelDelta/120),e.detail&&(t=-e.detail/3),t},_checkMouse:function(e,t){var n=t.relatedTarget;if(!n)return!0;try{while(n&&n!==e)n=n.parentNode}catch(r){return!1}return n!==e},_getEvent:function(){var t=e.event;if(!t){var n=arguments.callee.caller;while(n){t=n.arguments[0];if(t&&e.Event===t.constructor)break;n=n.caller}}return t}},n.DomEvent.on=n.DomEvent.addListener,n.DomEvent.off=n.DomEvent.removeListener,n.Draggable=n.Class.extend({includes:n.Mixin.Events,statics:{START:n.Browser.touch?"touchstart":"mousedown",END:n.Browser.touch?"touchend":"mouseup",MOVE:n.Browser.touch?"touchmove":"mousemove",TAP_TOLERANCE:15},initialize:function(e,t){this._element=e,this._dragStartTarget=t||e},enable:function(){if(this._enabled)return;n.DomEvent.on(this._dragStartTarget,n.Draggable.START,this._onDown,this),this._enabled=!0},disable:function(){if(!this._enabled)return;n.DomEvent.off(this._dragStartTarget,n.Draggable.START,this._onDown),this._enabled=!1,this._moved=!1},_onDown:function(e){if(!n.Browser.touch&&e.shiftKey||e.which!==1&&e.button!==1&&!e.touches)return;this._simulateClick=!0;if(e.touches&&e.touches.length>1){this._simulateClick=!1;return}var t=e.touches&&e.touches.length===1?e.touches[0]:e,r=t.target;n.DomEvent.preventDefault(e),n.Browser.touch&&r.tagName.toLowerCase()==="a"&&n.DomUtil.addClass(r,"leaflet-active"),this._moved=!1;if(this._moving)return;this._startPos=this._newPos=n.DomUtil.getPosition(this._element),this._startPoint=new n.Point(t.clientX,t.clientY),n.DomEvent.on(document,n.Draggable.MOVE,this._onMove,this),n.DomEvent.on(document,n.Draggable.END,this._onUp,this)},_onMove:function(e){if(e.touches&&e.touches.length>1)return;var t=e.touches&&e.touches.length===1?e.touches[0]:e,r=new n.Point(t.clientX,t.clientY),i=r.subtract(this._startPoint);if(!i.x&&!i.y)return;n.DomEvent.preventDefault(e),this._moved||(this.fire("dragstart"),this._moved=!0,n.Browser.touch||(n.DomUtil.disableTextSelection(),this._setMovingCursor())),this._newPos=this._startPos.add(i),this._moving=!0,n.Util.cancelAnimFrame(this._animRequest),this._animRequest=n.Util.requestAnimFrame(this._updatePosition,this,!0,this._dragStartTarget)},_updatePosition:function(){this.fire("predrag"),n.DomUtil.setPosition(this._element,this._newPos),this.fire("drag")},_onUp:function(e){if(this._simulateClick&&e.changedTouches){var t=e.changedTouches[0],r=t.target,i=this._newPos&&this._newPos.distanceTo(this._startPos)||0;r.tagName.toLowerCase()==="a"&&n.DomUtil.removeClass(r,"leaflet-active"),i<n.Draggable.TAP_TOLERANCE&&this._simulateEvent("click",t)}n.Browser.touch||(n.DomUtil.enableTextSelection(),this._restoreCursor()),n.DomEvent.off(document,n.Draggable.MOVE,this._onMove),n.DomEvent.off(document,n.Draggable.END,this._onUp),this._moved&&(n.Util.cancelAnimFrame(this._animRequest),this.fire("dragend")),this._moving=!1},_setMovingCursor:function(){n.DomUtil.addClass(document.body,"leaflet-dragging")},_restoreCursor:function(){n.DomUtil.removeClass(document.body,"leaflet-dragging")},_simulateEvent:function(t,n){var r=document.createEvent("MouseEvents");r.initMouseEvent(t,!0,!0,e,1,n.screenX,n.screenY,n.clientX,n.clientY,!1,!1,!1,!1,0,null),n.target.dispatchEvent(r)}}),n.Handler=n.Class.extend({initialize:function(e){this._map=e},enable:function(){if(this._enabled)return;this._enabled=!0,this.addHooks()},disable:function(){if(!this._enabled)return;this._enabled=!1,this.removeHooks()},enabled:function(){return!!this._enabled}}),n.Map.mergeOptions({dragging:!0,inertia:!n.Browser.android23,inertiaDeceleration:3e3,inertiaMaxSpeed:1500,inertiaThreshold:n.Browser.touch?32:14,worldCopyJump:!0}),n.Map.Drag=n.Handler.extend({addHooks:function(){if(!this._draggable){this._draggable=new n.Draggable(this._map._mapPane,this._map._container),this._draggable.on({dragstart:this._onDragStart,drag:this._onDrag,dragend:this._onDragEnd},this);var e=this._map.options;e.worldCopyJump&&(this._draggable.on("predrag",this._onPreDrag,this),this._map.on("viewreset",this._onViewReset,this))}this._draggable.enable()},removeHooks:function(){this._draggable.disable()},moved:function(){return this._draggable&&this._draggable._moved},_onDragStart:function(){var e=this._map;e.fire("movestart").fire("dragstart"),e._panTransition&&e._panTransition._onTransitionEnd(!0),e.options.inertia&&(this._positions=[],this._times=[])},_onDrag:function(){if(this._map.options.inertia){var e=this._lastTime=+(new Date),t=this._lastPos=this._draggable._newPos;this._positions.push(t),this._times.push(e),e-this._times[0]>200&&(this._positions.shift(),this._times.shift())}this._map.fire("move").fire("drag")},_onViewReset:function(){var e=this._map.getSize().divideBy(2),t=this._map.latLngToLayerPoint(new n.LatLng(0,0));this._initialWorldOffset=t.subtract(e).x,this._worldWidth=this._map.project(new n.LatLng(0,180)).x},_onPreDrag:function(){var e=this._map,t=this._worldWidth,n=Math.round(t/2),r=this._initialWorldOffset,i=this._draggable._newPos.x,s=(i-n+r)%t+n-r,o=(i+n+r)%t-n-r,u=Math.abs(s+r)<Math.abs(o+r)?s:o;this._draggable._newPos.x=u},_onDragEnd:function(){var e=this._map,r=e.options,i=+(new Date)-this._lastTime,s=!r.inertia||i>r.inertiaThreshold||this._positions[0]===t;if(s)e.fire("moveend");else{var o=this._lastPos.subtract(this._positions[0]),u=(this._lastTime+i-this._times[0])/1e3,a=o.multiplyBy(.58/u),f=a.distanceTo(new n.Point(0,0)),l=Math.min(r.inertiaMaxSpeed,f),c=a.multiplyBy(l/f),h=l/r.inertiaDeceleration,p=c.multiplyBy(-h/2).round(),d={duration:h,easing:"ease-out"};n.Util.requestAnimFrame(n.Util.bind(function(){this._map.panBy(p,d)},this))}e.fire("dragend"),r.maxBounds&&n.Util.requestAnimFrame(this._panInsideMaxBounds,e,!0,e._container)},_panInsideMaxBounds:function(){this.panInsideBounds(this.options.maxBounds)}}),n.Map.addInitHook("addHandler","dragging",n.Map.Drag),n.Map.mergeOptions({doubleClickZoom:!0}),n.Map.DoubleClickZoom=n.Handler.extend({addHooks:function(){this._map.on("dblclick",this._onDoubleClick)},removeHooks:function(){this._map.off("dblclick",this._onDoubleClick)},_onDoubleClick:function(e){this.setView(e.latlng,this._zoom+1)}}),n.Map.addInitHook("addHandler","doubleClickZoom",n.Map.DoubleClickZoom),n.Map.mergeOptions({scrollWheelZoom:!n.Browser.touch}),n.Map.ScrollWheelZoom=n.Handler.extend({addHooks:function(){n.DomEvent.on(this._map._container,"mousewheel",this._onWheelScroll,this),this._delta=0},removeHooks:function(){n.DomEvent.off(this._map._container,"mousewheel",this._onWheelScroll)},_onWheelScroll:function(e){var t=n.DomEvent.getWheelDelta(e);this._delta+=t,this._lastMousePos=this._map.mouseEventToContainerPoint(e),clearTimeout(this._timer),this._timer=setTimeout(n.Util.bind(this._performZoom,this),40),n.DomEvent.preventDefault(e)},_performZoom:function(){var e=this._map,t=Math.round(this._delta),n=e.getZoom();t=Math.max(Math.min(t,4),-4),t=e._limitZoom(n+t)-n,this._delta=0;if(!t)return;var r=n+t,i=this._getCenterForScrollWheelZoom(this._lastMousePos,r);e.setView(i,r)},_getCenterForScrollWheelZoom:function(e,t){var n=this._map,r=n.getZoomScale(t),i=n.getSize().divideBy(2),s=e.subtract(i).multiplyBy(1-1/r),o=n._getTopLeftPoint().add(i).add(s);return n.unproject(o)}}),n.Map.addInitHook("addHandler","scrollWheelZoom",n.Map.ScrollWheelZoom),n.Util.extend(n.DomEvent,{addDoubleTapListener:function(e,t,n){function l(e){if(e.touches.length!==1)return;var t=Date.now(),n=t-(r||t);o=e.touches[0],i=n>0&&n<=s,r=t}function c(e){i&&(o.type="dblclick",t(o),r=null)}var r,i=!1,s=250,o,u="_leaflet_",a="touchstart",f="touchend";return e[u+a+n]=l,e[u+f+n]=c,e.addEventListener(a,l,!1),e.addEventListener(f,c,!1),this},removeDoubleTapListener:function(e,t){var n="_leaflet_";return e.removeEventListener(e,e[n+"touchstart"+t],!1),e.removeEventListener(e,e[n+"touchend"+t],!1),this}}),n.Map.mergeOptions({touchZoom:n.Browser.touch&&!n.Browser.android23}),n.Map.TouchZoom=n.Handler.extend({addHooks:function(){n.DomEvent.on(this._map._container,"touchstart",this._onTouchStart,this)},removeHooks:function(){n.DomEvent.off(this._map._container,"touchstart",this._onTouchStart,this)},_onTouchStart:function(e){var t=this._map;if(!e.touches||e.touches.length!==2||t._animatingZoom||this._zooming)return;var r=t.mouseEventToLayerPoint(e.touches[0]),i=t.mouseEventToLayerPoint(e.touches[1]),s=t._getCenterLayerPoint();this._startCenter=r.add(i).divideBy(2,!0),this._startDist=r.distanceTo(i),this._moved=!1,this._zooming=!0,this._centerOffset=s.subtract(this._startCenter),n.DomEvent.on(document,"touchmove",this._onTouchMove,this).on(document,"touchend",this._onTouchEnd,this),n.DomEvent.preventDefault(e)},_onTouchMove:function(e){if(!e.touches||e.touches.length!==2)return;var t=this._map,r=t.mouseEventToLayerPoint(e.touches[0]),i=t.mouseEventToLayerPoint(e.touches[1]);this._scale=r.distanceTo(i)/this._startDist,this._delta=r.add(i).divideBy(2,!0).subtract(this._startCenter);if(this._scale===1)return;this._moved||(n.DomUtil.addClass(t._mapPane,"leaflet-zoom-anim leaflet-touching"),t.fire("movestart").fire("zoomstart")._prepareTileBg(),this._moved=!0),n.Util.cancelAnimFrame(this._animRequest),this._animRequest=n.Util.requestAnimFrame(this._updateOnMove,this,!0,this._map._container),n.DomEvent.preventDefault(e)},_updateOnMove:function(){var e=this._map,t=this._getScaleOrigin(),r=e.layerPointToLatLng(t);e.fire("zoomanim",{center:r,zoom:e.getScaleZoom(this._scale)}),e._tileBg.style[n.DomUtil.TRANSFORM]=n.DomUtil.getTranslateString(this._delta)+" "+n.DomUtil.getScaleString(this._scale,this._startCenter)},_onTouchEnd:function(e){if(!this._moved||!this._zooming)return;var t=this._map;this._zooming=!1,n.DomUtil.removeClass(t._mapPane,"leaflet-touching"),n.DomEvent.off(document,"touchmove",this._onTouchMove).off(document,"touchend",this._onTouchEnd);var r=this._getScaleOrigin(),i=t.layerPointToLatLng(r),s=t.getZoom(),o=t.getScaleZoom(this._scale)-s,u=o>0?Math.ceil(o):Math.floor(o),a=t._limitZoom(s+u);t.fire("zoomanim",{center:i,zoom:a}),t._runAnimation(i,a,t.getZoomScale(a)/this._scale,r,!0)},_getScaleOrigin:function(){var e=this._centerOffset.subtract(this._delta).divideBy(this._scale);return this._startCenter.add(e)}}),n.Map.addInitHook("addHandler","touchZoom",n.Map.TouchZoom),n.Map.mergeOptions({boxZoom:!0}),n.Map.BoxZoom=n.Handler.extend({initialize:function(e){this._map=e,this._container=e._container,this._pane=e._panes.overlayPane},addHooks:function(){n.DomEvent.on(this._container,"mousedown",this._onMouseDown,this)},removeHooks:function(){n.DomEvent.off(this._container,"mousedown",this._onMouseDown)},_onMouseDown:function(e){if(!e.shiftKey||e.which!==1&&e.button!==1)return!1;n.DomUtil.disableTextSelection(),this._startLayerPoint=this._map.mouseEventToLayerPoint(e),this._box=n.DomUtil.create("div","leaflet-zoom-box",this._pane),n.DomUtil.setPosition(this._box,this._startLayerPoint),this._container.style.cursor="crosshair",n.DomEvent.on(document,"mousemove",this._onMouseMove,this).on(document,"mouseup",this._onMouseUp,this).preventDefault(e),this._map.fire("boxzoomstart")},_onMouseMove:function(e){var t=this._startLayerPoint,r=this._box,i=this._map.mouseEventToLayerPoint(e),s=i.subtract(t),o=new n.Point(Math.min(i.x,t.x),Math.min(i.y,t.y));n.DomUtil.setPosition(r,o),r.style.width=Math.abs(s.x)-4+"px",r.style.height=Math.abs(s.y)-4+"px"},_onMouseUp:function(e){this._pane.removeChild(this._box),this._container.style.cursor="",n.DomUtil.enableTextSelection(),n.DomEvent.off(document,"mousemove",this._onMouseMove).off(document,"mouseup",this._onMouseUp);var t=this._map,r=t.mouseEventToLayerPoint(e),i=new n.LatLngBounds(t.layerPointToLatLng(this._startLayerPoint),t.layerPointToLatLng(r));t.fitBounds(i),t.fire("boxzoomend",{boxZoomBounds:i})}}),n.Map.addInitHook("addHandler","boxZoom",n.Map.BoxZoom),n.Map.mergeOptions({keyboard:!0,keyboardPanOffset:80,keyboardZoomOffset:1}),n.Map.Keyboard=n.Handler.extend({keyCodes:{left:[37],right:[39],down:[40],up:[38],zoomIn:[187,107,61],zoomOut:[189,109]},initialize:function(e){this._map=e,this._setPanOffset(e.options.keyboardPanOffset),this._setZoomOffset(e.options.keyboardZoomOffset)},addHooks:function(){var e=this._map._container;e.tabIndex===-1&&(e.tabIndex="0"),n.DomEvent.addListener(e,"focus",this._onFocus,this).addListener(e,"blur",this._onBlur,this).addListener(e,"mousedown",this._onMouseDown,this),this._map.on("focus",this._addHooks,this).on("blur",this._removeHooks,this)},removeHooks:function(){this._removeHooks();var e=this._map._container;n.DomEvent.removeListener(e,"focus",this._onFocus,this).removeListener(e,"blur",this._onBlur,this).removeListener(e,"mousedown",this._onMouseDown,this),this._map.off("focus",this._addHooks,this).off("blur",this._removeHooks,this)},_onMouseDown:function(){this._focused||this._map._container.focus()},_onFocus:function(){this._focused=!0,this._map.fire("focus")},_onBlur:function(){this._focused=!1,this._map.fire("blur")},_setPanOffset:function(e){var t=this._panKeys={},n=this.keyCodes,r,i;for(r=0,i=n.left.length;r<i;r++)t[n.left[r]]=[-1*e,0];for(r=0,i=n.right.length;r<i;r++)t[n.right[r]]=[e,0];for(r=0,i=n.down.length;r<i;r++)t[n.down[r]]=[0,e];for(r=0,i=n.up.length;r<i;r++)t[n.up[r]]=[0,-1*e]},_setZoomOffset:function(e){var t=this._zoomKeys={},n=this.keyCodes,r,i;for(r=0,i=n.zoomIn.length;r<i;r++)t[n.zoomIn[r]]=e;for(r=0,i=n.zoomOut.length;r<i;r++)t[n.zoomOut[r]]=-e},_addHooks:function(){n.DomEvent.addListener(document,"keydown",this._onKeyDown,this)},_removeHooks:function(){n.DomEvent.removeListener(document,"keydown",this._onKeyDown,this)},_onKeyDown:function(e){var t=e.keyCode;if(this._panKeys.hasOwnProperty(t))this._map.panBy(this._panKeys[t]);else{if(!this._zoomKeys.hasOwnProperty(t))return;this._map.setZoom(this._map.getZoom()+this._zoomKeys[t])}n.DomEvent.stop(e)}}),n.Map.addInitHook("addHandler","keyboard",n.Map.Keyboard),n.Handler.MarkerDrag=n.Handler.extend({initialize:function(e){this._marker=e},addHooks:function(){var e=this._marker._icon;this._draggable||(this._draggable=(new n.Draggable(e,e)).on("dragstart",this._onDragStart,this).on("drag",this._onDrag,this).on("dragend",this._onDragEnd,this)),this._draggable.enable()},removeHooks:function(){this._draggable.disable()},moved:function(){return this._draggable&&this._draggable._moved},_onDragStart:function(e){this._marker.closePopup().fire("movestart").fire("dragstart")},_onDrag:function(e){var t=n.DomUtil.getPosition(this._marker._icon);this._marker._shadow&&n.DomUtil.setPosition(this._marker._shadow,t),this._marker._latlng=this._marker._map.layerPointToLatLng(t),this._marker.fire("move").fire("drag")},_onDragEnd:function(){this._marker.fire("moveend").fire("dragend")}}),n.Handler.PolyEdit=n.Handler.extend({options:{icon:new n.DivIcon({iconSize:new n.Point(8,8),className:"leaflet-div-icon leaflet-editing-icon"})},initialize:function(e,t){this._poly=e,n.Util.setOptions(this,t)},addHooks:function(){this._poly._map&&(this._markerGroup||this._initMarkers(),this._poly._map.addLayer(this._markerGroup))},removeHooks:function(){this._poly._map&&(this._poly._map.removeLayer(this._markerGroup),delete this._markerGroup,delete this._markers)},updateMarkers:function(){this._markerGroup.clearLayers(),this._initMarkers()},_initMarkers:function(){this._markerGroup||(this._markerGroup=new n.LayerGroup),this._markers=[];var e=this._poly._latlngs,t,r,i,s;for(t=0,i=e.length;t<i;t++)s=this._createMarker(e[t],t),s.on("click",this._onMarkerClick,this),this._markers.push(s);var o,u;for(t=0,r=i-1;t<i;r=t++){if(t===0&&!(n.Polygon&&this._poly instanceof n.Polygon))continue;o=this._markers[r],u=this._markers[t],this._createMiddleMarker(o,u),this._updatePrevNext(o,u)}},_createMarker:function(e,t){var r=new n.Marker(e,{draggable:!0,icon:this.options.icon});return r._origLatLng=e,r._index=t,r.on("drag",this._onMarkerDrag,this),r.on("dragend",this._fireEdit,this),this._markerGroup.addLayer(r),r},_fireEdit:function(){this._poly.fire("edit")},_onMarkerDrag:function(e){var t=e.target;n.Util.extend(t._origLatLng,t._latlng),t._middleLeft&&t._middleLeft.setLatLng(this._getMiddleLatLng(t._prev,t)),t._middleRight&&t._middleRight.setLatLng(this._getMiddleLatLng(t,t._next)),this._poly.redraw()},_onMarkerClick:function(e){if(this._poly._latlngs.length<3)return;var t=e.target,n=t._index;t._prev&&t._next&&(this._createMiddleMarker(t._prev,t._next),this._updatePrevNext(t._prev,t._next)),this._markerGroup.removeLayer(t),t._middleLeft&&this._markerGroup.removeLayer(t._middleLeft),t._middleRight&&this._markerGroup.removeLayer(t._middleRight),this._markers.splice(n,1),this._poly.spliceLatLngs(n,1),this._updateIndexes(n,-1),this._poly.fire("edit")},_updateIndexes:function(e,t){this._markerGroup.eachLayer(function(n){n._index>e&&(n._index+=t)})},_createMiddleMarker:function(e,t){var n=this._getMiddleLatLng(e,t),r=this._createMarker(n),i,s,o;r.setOpacity(.6),e._middleRight=t._middleLeft=r,s=function(){var s=t._index;r._index=s,r.off("click",i).on("click",this._onMarkerClick,this),n.lat=r.getLatLng().lat,n.lng=r.getLatLng().lng,this._poly.spliceLatLngs(s,0,n),this._markers.splice(s,0,r),r.setOpacity(1),this._updateIndexes(s,1),t._index++,this._updatePrevNext(e,r),this._updatePrevNext(r,t)},o=function(){r.off("dragstart",s,this),r.off("dragend",o,this),this._createMiddleMarker(e,r),this._createMiddleMarker(r,t)},i=function(){s.call(this),o.call(this),this._poly.fire("edit")},r.on("click",i,this).on("dragstart",s,this).on("dragend",o,this),this._markerGroup.addLayer(r)},_updatePrevNext:function(e,t){e._next=t,t._prev=e},_getMiddleLatLng:function(e,t){var n=this._poly._map,r=n.latLngToLayerPoint(e.getLatLng()),i=n.latLngToLayerPoint(t.getLatLng());return n.layerPointToLatLng(r._add(i).divideBy(2))}}),n.Control=n.Class.extend({options:{position:"topright"},initialize:function(e){n.Util.setOptions(this,e)},getPosition:function(){return this.options.position},setPosition:function(e){var t=this._map;return t&&t.removeControl(this),this.options.position=e,t&&t.addControl(this),this},addTo:function(e){this._map=e;var t=this._container=this.onAdd(e),r=this.getPosition(),i=e._controlCorners[r];return n.DomUtil.addClass(t,"leaflet-control"),r.indexOf("bottom")!==-1?i.insertBefore(t,i.firstChild):i.appendChild(t),this},removeFrom:function(e){var t=this.getPosition(),n=e._controlCorners[t];return n.removeChild(this._container),this._map=null,this.onRemove&&this.onRemove(e),this}}),n.control=function(e){return new n.Control(e)},n.Map.include({addControl:function(e){return e.addTo(this),this},removeControl:function(e){return e.removeFrom(this),this},_initControlPos:function(){function i(i,s){var o=t+i+" "+t+s;e[i+s]=n.DomUtil.create("div",o,r)}var e=this._controlCorners={},t="leaflet-",r=this._controlContainer=n.DomUtil.create("div",t+"control-container",this._container);i("top","left"),i("top","right"),i("bottom","left"),i("bottom","right")}}),n.Control.Zoom=n.Control.extend({options:{position:"topleft"},onAdd:function(e){var t="leaflet-control-zoom",r=n.DomUtil.create("div",t);return this._createButton("Zoom in",t+"-in",r,e.zoomIn,e),this._createButton("Zoom out",t+"-out",r,e.zoomOut,e),r},_createButton:function(e,t,r,i,s){var o=n.DomUtil.create("a",t,r);return o.href="#",o.title=e,n.DomEvent.on(o,"click",n.DomEvent.stopPropagation).on(o,"click",n.DomEvent.preventDefault).on(o,"click",i,s).on(o,"dblclick",n.DomEvent.stopPropagation),o}}),n.Map.mergeOptions({zoomControl:!0}),n.Map.addInitHook(function(){this.options.zoomControl&&(this.zoomControl=new n.Control.Zoom,this.addControl(this.zoomControl))}),n.control.zoom=function(e){return new n.Control.Zoom(e)},n.Control.Attribution=n.Control.extend({options:{position:"bottomright",prefix:'Powered by <a href="http://leaflet.cloudmade.com">Leaflet</a>'},initialize:function(e){n.Util.setOptions(this,e),this._attributions={}},onAdd:function(e){return this._container=n.DomUtil.create("div","leaflet-control-attribution"),n.DomEvent.disableClickPropagation(this._container),e.on("layeradd",this._onLayerAdd,this).on("layerremove",this._onLayerRemove,this),this._update(),this._container},onRemove:function(e){e.off("layeradd",this._onLayerAdd).off("layerremove",this._onLayerRemove)},setPrefix:function(e){return this.options.prefix=e,this._update(),this},addAttribution:function(e){if(!e)return;return this._attributions[e]||(this._attributions[e]=0),this._attributions[e]++,this._update(),this},removeAttribution:function(e){if(!e)return;return this._attributions[e]--,this._update(),this},_update:function(){if(!this._map)return;var e=[];for(var t in this._attributions)this._attributions.hasOwnProperty(t)&&this._attributions[t]&&e.push(t);var n=[];this.options.prefix&&n.push(this.options.prefix),e.length&&n.push(e.join(", ")),this._container.innerHTML=n.join(" &#8212; ")},_onLayerAdd:function(e){e.layer.getAttribution&&this.addAttribution(e.layer.getAttribution())},_onLayerRemove:function(e){e.layer.getAttribution&&this.removeAttribution(e.layer.getAttribution())}}),n.Map.mergeOptions({attributionControl:!0}),n.Map.addInitHook(function(){this.options.attributionControl&&(this.attributionControl=(new n.Control.Attribution).addTo(this))}),n.control.attribution=function(e){return new n.Control.Attribution(e)},n.Control.Scale=n.Control.extend({options:{position:"bottomleft",maxWidth:100,metric:!0,imperial:!0,updateWhenIdle:!1},onAdd:function(e){this._map=e;var t="leaflet-control-scale",r=n.DomUtil.create("div",t),i=this.options;return this._addScales(i,t,r),e.on(i.updateWhenIdle?"moveend":"move",this._update,this),this._update(),r},onRemove:function(e){e.off(this.options.updateWhenIdle?"moveend":"move",this._update,this)},_addScales:function(e,t,r){e.metric&&(this._mScale=n.DomUtil.create("div",t+"-line",r)),e.imperial&&(this._iScale=n.DomUtil.create("div",t+"-line",r))},_update:function(){var e=this._map.getBounds(),t=e.getCenter().lat,n=6378137*Math.PI*Math.cos(t*Math.PI/180),r=n*(e.getNorthEast().lng-e.getSouthWest().lng)/180,i=this._map.getSize(),s=this.options,o=0;i.x>0&&(o=r*(s.maxWidth/i.x)),this._updateScales(s,o)},_updateScales:function(e,t){e.metric&&t&&this._updateMetric(t),e.imperial&&t&&this._updateImperial(t)},_updateMetric:function(e){var t=this._getRoundNum(e);this._mScale.style.width=this._getScaleWidth(t/e)+"px",this._mScale.innerHTML=t<1e3?t+" m":t/1e3+" km"},_updateImperial:function(e){var t=e*3.2808399,n=this._iScale,r,i,s;t>5280?(r=t/5280,i=this._getRoundNum(r),n.style.width=this._getScaleWidth(i/r)+"px",n.innerHTML=i+" mi"):(s=this._getRoundNum(t),n.style.width=this._getScaleWidth(s/t)+"px",n.innerHTML=s+" ft")},_getScaleWidth:function(e){return Math.round(this.options.maxWidth*e)-10},_getRoundNum:function(e){var t=Math.pow(10,(Math.floor(e)+"").length-1),n=e/t;return n=n>=10?10:n>=5?5:n>=3?3:n>=2?2:1,t*n}}),n.control.scale=function(e){return new n.Control.Scale(e)},n.Control.Layers=n.Control.extend({options:{collapsed:!0,position:"topright",autoZIndex:!0},initialize:function(e,t,r){n.Util.setOptions(this,r),this._layers={},this._lastZIndex=0;for(var i in e)e.hasOwnProperty(i)&&this._addLayer(e[i],i);for(i in t)t.hasOwnProperty(i)&&this._addLayer(t[i],i,!0)},onAdd:function(e){return this._initLayout(),this._update(),this._container},addBaseLayer:function(e,t){return this._addLayer(e,t),this._update(),this},addOverlay:function(e,t){return this._addLayer(e,t,!0),this._update(),this},removeLayer:function(e){var t=n.Util.stamp(e);return delete this._layers[t],this._update(),this},_initLayout:function(){var e="leaflet-control-layers",t=this._container=n.DomUtil.create("div",e);n.Browser.touch?n.DomEvent.on(t,"click",n.DomEvent.stopPropagation):n.DomEvent.disableClickPropagation(t);var r=this._form=n.DomUtil.create("form",e+"-list");if(this.options.collapsed){n.DomEvent.on(t,"mouseover",this._expand,this).on(t,"mouseout",this._collapse,this);var i=this._layersLink=n.DomUtil.create("a",e+"-toggle",t);i.href="#",i.title="Layers",n.Browser.touch?n.DomEvent.on(i,"click",n.DomEvent.stopPropagation).on(i,"click",n.DomEvent.preventDefault).on(i,"click",this._expand,this):n.DomEvent.on(i,"focus",this._expand,this),this._map.on("movestart",this._collapse,this)}else this._expand();this._baseLayersList=n.DomUtil.create("div",e+"-base",r),this._separator=n.DomUtil.create("div",e+"-separator",r),this._overlaysList=n.DomUtil.create("div",e+"-overlays",r),t.appendChild(r)},_addLayer:function(e,t,r){var i=n.Util.stamp(e);this._layers[i]={layer:e,name:t,overlay:r},this.options.autoZIndex&&e.setZIndex&&(this._lastZIndex++,e.setZIndex(this._lastZIndex))},_update:function(){if(!this._container)return;this._baseLayersList.innerHTML="",this._overlaysList.innerHTML="";var e=!1,t=!1;for(var n in this._layers)if(this._layers.hasOwnProperty(n)){var r=this._layers[n];this._addItem(r),t=t||r.overlay,e=e||!r.overlay}this._separator.style.display=t&&e?"":"none"},_createRadioElement:function(e,t){var n='<input type="radio" name="'+e+'"';t&&(n+=' checked="checked"'),n+="/>";var r=document.createElement("div");return r.innerHTML=n,r.firstChild},_addItem:function(e){var t=document.createElement("label"),r,i=this._map.hasLayer(e.layer);e.overlay?(r=document.createElement("input"),r.type="checkbox",r.defaultChecked=i):r=this._createRadioElement("leaflet-base-layers",i),r.layerId=n.Util.stamp(e.layer),n.DomEvent.on(r,"click",this._onInputClick,this);var s=document.createTextNode(" "+e.name);t.appendChild(r),t.appendChild(s);var o=e.overlay?this._overlaysList:this._baseLayersList;o.appendChild(t)},_onInputClick:function(){var e,t,n,r=this._form.getElementsByTagName("input"),i=r.length;for(e=0;e<i;e++)t=r[e],n=this._layers[t.layerId],t.checked?this._map.addLayer(n.layer,!n.overlay):this._map.removeLayer(n.layer)},_expand:function(){n.DomUtil.addClass(this._container,"leaflet-control-layers-expanded")},_collapse:function(){this._container.className=this._container.className.replace(" leaflet-control-layers-expanded","")}}),n.control.layers=function(e,t,r){return new n.Control.Layers(e,t,r)},n.Transition=n.Class.extend({includes:n.Mixin.Events,statics:{CUSTOM_PROPS_SETTERS:{position:n.DomUtil.setPosition},implemented:function(){return n.Transition.NATIVE||n.Transition.TIMER}},options:{easing:"ease",duration:.5},_setProperty:function(e,t){var r=n.Transition.CUSTOM_PROPS_SETTERS;e in r?r[e](this._el,t):this._el.style[e]=t}}),n.Transition=n.Transition.extend({statics:function(){var e=n.DomUtil.TRANSITION,t=e==="webkitTransition"||e==="OTransition"?e+"End":"transitionend";return{NATIVE:!!e,TRANSITION:e,PROPERTY:e+"Property",DURATION:e+"Duration",EASING:e+"TimingFunction",END:t,CUSTOM_PROPS_PROPERTIES:{position:n.Browser.any3d?n.DomUtil.TRANSFORM:"top, left"}}}(),options:{fakeStepInterval:100},initialize:function(e,t){this._el=e,n.Util.setOptions(this,t),n.DomEvent.on(e,n.Transition.END,this._onTransitionEnd,this),this._onFakeStep=n.Util.bind(this._onFakeStep,this)},run:function(e){var t,r=[],i=n.Transition.CUSTOM_PROPS_PROPERTIES;for(t in e)e.hasOwnProperty(t)&&(t=i[t]?i[t]:t,t=this._dasherize(t),r.push(t));this._el.style[n.Transition.DURATION]=this.options.duration+"s",this._el.style[n.Transition.EASING]=this.options.easing,this._el.style[n.Transition.PROPERTY]="all";for(t in e)e.hasOwnProperty(t)&&this._setProperty(t,e[t]);n.Util.falseFn(this._el.offsetWidth),this._inProgress=!0,n.Browser.mobileWebkit&&(this.backupEventFire=setTimeout(n.Util.bind(this._onBackupFireEnd,this),this.options.duration*1.2*1e3)),n.Transition.NATIVE?(clearInterval(this._timer),this._timer=setInterval(this._onFakeStep,this.options.fakeStepInterval)):this._onTransitionEnd()},_dasherize:function(){function t(e){return"-"+e.toLowerCase()}var e=/([A-Z])/g;return function(n){return n.replace(e,t)}}(),_onFakeStep:function(){this.fire("step")},_onTransitionEnd:function(e){this._inProgress&&(this._inProgress=!1,clearInterval(this._timer),this._el.style[n.Transition.TRANSITION]="",clearTimeout(this.backupEventFire),delete this.backupEventFire,this.fire("step"),e&&e.type&&this.fire("end"))},_onBackupFireEnd:function(){var e=document.createEvent("Event");e.initEvent(n.Transition.END,!0,!1),this._el.dispatchEvent(e)}}),n.Transition=n.Transition.NATIVE?n.Transition:n.Transition.extend({statics:{getTime:Date.now||function(){return+(new Date)},TIMER:!0,EASINGS:{linear:function(e){return e},"ease-out":function(e){return e*(2-e)}},CUSTOM_PROPS_GETTERS:{position:n.DomUtil.getPosition},UNIT_RE:/^[\d\.]+(\D*)$/},options:{fps:50},initialize:function(e,t){this._el=e,n.Util.extend(this.options,t),this._easing=n.Transition.EASINGS[this.options.easing]||n.Transition.EASINGS["ease-out"],this._step=n.Util.bind(this._step,this),this._interval=Math.round(1e3/this.options.fps)},run:function(e){this._props={};var t=n.Transition.CUSTOM_PROPS_GETTERS,r=n.Transition.UNIT_RE;this.fire("start");for(var i in e)if(e.hasOwnProperty(i)){var s={};if(i in t)s.from=t[i](this._el);else{var o=this._el.style[i].match(r);s.from=parseFloat(o[0]),s.unit=o[1]}s.to=e[i],this._props[i]=s}clearInterval(this._timer),this._timer=setInterval(this._step,this._interval),this._startTime=n.Transition.getTime()},_step:function(){var e=n.Transition.getTime(),t=e-this._startTime,r=this.options.duration*1e3;t<r?this._runFrame(this._easing(t/r)):(this._runFrame(1),this._complete())},_runFrame:function(e){var t=n.Transition.CUSTOM_PROPS_SETTERS,r,i,s;for(r in this._props)this._props.hasOwnProperty(r)&&(i=this._props[r],r in t?(s=i.to.subtract(i.from).multiplyBy(e).add(i.from),t[r](this._el,s)):this._el.style[r]=(i.to-i.from)*e+i.from+i.unit);this.fire("step")},_complete:function(){clearInterval(this._timer),this.fire("end")}}),n.Map.include(!n.Transition||!n.Transition.implemented()?{}:{setView:function(e,t,n){t=this._limitZoom(t);var r=this._zoom!==t;if(this._loaded&&!n&&this._layers){var i=r?this._zoomToIfClose&&this._zoomToIfClose(e,t):this._panByIfClose(e);if(i)return clearTimeout(this._sizeTimer),this}return this._resetView(e,t),this},panBy:function(e,t){return e=n.point(e),!e.x&&!e.y?this:(this._panTransition||(this._panTransition=new n.Transition(this._mapPane),this._panTransition.on({step:this._onPanTransitionStep,end:this._onPanTransitionEnd},this)),n.Util.setOptions(this._panTransition,n.Util.extend({duration:.25},t)),this.fire("movestart"),n.DomUtil.addClass(this._mapPane,"leaflet-pan-anim"),this._panTransition.run({position:n.DomUtil.getPosition(this._mapPane).subtract(e)}),this)},_onPanTransitionStep:function(){this.fire("move")},_onPanTransitionEnd:function(){n.DomUtil.removeClass(this._mapPane,"leaflet-pan-anim"),this.fire("moveend")},_panByIfClose:function(e){var t=this._getCenterOffset(e)._floor();return this._offsetIsWithinView(t)?(this.panBy(t),!0):!1},_offsetIsWithinView:function(e,t){var n=t||1,r=this.getSize();return Math.abs(e.x)<=r.x*n&&Math.abs(e.y)<=r.y*n}}),n.Map.mergeOptions({zoomAnimation:n.DomUtil.TRANSITION&&!n.Browser.android23&&!n.Browser.mobileOpera}),n.DomUtil.TRANSITION&&n.Map.addInitHook(function(){n.DomEvent.on(this._mapPane,n.Transition.END,this._catchTransitionEnd,this)}),n.Map.include(n.DomUtil.TRANSITION?{_zoomToIfClose:function(e,t){if(this._animatingZoom)return!0;if(!this.options.zoomAnimation)return!1;var r=this.getZoomScale(t),i=this._getCenterOffset(e).divideBy(1-1/r);if(!this._offsetIsWithinView(i,1))return!1;n.DomUtil.addClass(this._mapPane,"leaflet-zoom-anim"),this.fire("movestart").fire("zoomstart"),this.fire("zoomanim",{center:e,zoom:t});var s=this._getCenterLayerPoint().add(i);return this._prepareTileBg(),this._runAnimation(e,t,r,s),!0},_catchTransitionEnd:function(e){this._animatingZoom&&this._onZoomTransitionEnd()},_runAnimation:function(e,t,r,i,s){this._animateToCenter=e,this._animateToZoom=t,this._animatingZoom=!0;var o=n.DomUtil.TRANSFORM,u=this._tileBg;clearTimeout(this._clearTileBgTimer),n.Util.falseFn(u.offsetWidth);var a=n.DomUtil.getScaleString(r,i),f=u.style[o];u.style[o]=s?f+" "+a:a+" "+f},_prepareTileBg:function(){var e=this._tilePane,t=this._tileBg;if(t&&this._getLoadedTilesPercentage(t)>.5&&this._getLoadedTilesPercentage(e)<.5){e.style.visibility="hidden",e.empty=!0,this._stopLoadingImages(e);return}t||(t=this._tileBg=this._createPane("leaflet-tile-pane",this._mapPane),t.style.zIndex=1),t.style[n.DomUtil.TRANSFORM]="",t.style.visibility="hidden",t.empty=!0,e.empty=!1,this._tilePane=this._panes.tilePane=t;var r=this._tileBg=e;n.DomUtil.addClass(r,"leaflet-zoom-animated"),this._stopLoadingImages(r)},_getLoadedTilesPercentage:function(e){var t=e.getElementsByTagName("img"),n,r,i=0;for(n=0,r=t.length;n<r;n++)t[n].complete&&i++;return i/r},_stopLoadingImages:function(e){var t=Array.prototype.slice.call(e.getElementsByTagName("img")),r,i,s;for(r=0,i=t.length;r<i;r++)s=t[r],s.complete||(s.onload=n.Util.falseFn,s.onerror=n.Util.falseFn,s.src=n.Util.emptyImageUrl,s.parentNode.removeChild(s))},_onZoomTransitionEnd:function(){this._restoreTileFront(),n.Util.falseFn(this._tileBg.offsetWidth),this._resetView(this._animateToCenter,this._animateToZoom,!0,!0),n.DomUtil.removeClass(this._mapPane,"leaflet-zoom-anim"),this._animatingZoom=!1},_restoreTileFront:function(){this._tilePane.innerHTML="",this._tilePane.style.visibility="",this._tilePane.style.zIndex=2,this._tileBg.style.zIndex=1},_clearTileBg:function(){!this._animatingZoom&&!this.touchZoom._zooming&&(this._tileBg.innerHTML="")}}:{}),n.Map.include({_defaultLocateOptions:{watch:!1,setView:!1,maxZoom:Infinity,timeout:1e4,maximumAge:0,enableHighAccuracy:!1},locate:function(e){e=this._locationOptions=n.Util.extend(this._defaultLocateOptions,e);if(!navigator.geolocation)return this._handleGeolocationError({code:0,message:"Geolocation not supported."}),this;var t=n.Util.bind(this._handleGeolocationResponse,this),r=n.Util.bind(this._handleGeolocationError,this);return e.watch?this._locationWatchId=navigator.geolocation.watchPosition(t,r,e):navigator.geolocation.getCurrentPosition(t,r,e),this},stopLocate:function(){return navigator.geolocation&&navigator.geolocation.clearWatch(this._locationWatchId),this},_handleGeolocationError:function(e){var t=e.code,n=e.message||(t===1?"permission denied":t===2?"position unavailable":"timeout");this._locationOptions.setView&&!this._loaded&&this.fitWorld(),this.fire("locationerror",{code:t,message:"Geolocation error: "+n+"."})},_handleGeolocationResponse:function(e){var t=180*e.coords.accuracy/4e7,r=t*2,i=e.coords.latitude,s=e.coords.longitude,o=new n.LatLng(i,s),u=new n.LatLng(i-t,s-r),a=new n.LatLng(i+t,s+r),f=new n.LatLngBounds(u,a),l=this._locationOptions;if(l.setView){var c=Math.min(this.getBoundsZoom(f),l.maxZoom);this.setView(o,c)}this.fire("locationfound",{latlng:o,bounds:f,accuracy:e.coords.accuracy})}})})(this);
	}.call(window));

/***/ }),

/***/ "splunk/charting/Legend":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var ChainedEvent = __webpack_require__("contrib/jg_lib/events/ChainedEvent");
	    var Event = __webpack_require__("contrib/jg_lib/events/Event");
	    var EventData = __webpack_require__("contrib/jg_lib/events/EventData");
	    var MEventTarget = __webpack_require__("contrib/jg_lib/events/MEventTarget");
	    var MListenerTarget = __webpack_require__("contrib/jg_lib/events/MListenerTarget");
	    var MObservableTarget = __webpack_require__("contrib/jg_lib/events/MObservableTarget");
	    var MPropertyTarget = __webpack_require__("contrib/jg_lib/properties/MPropertyTarget");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var ArrayUtil = __webpack_require__("contrib/jg_lib/utils/ArrayUtil");
	    var Map = __webpack_require__("contrib/jg_lib/utils/Map");

	    return Class(module.id, Object, function(Legend, base) {

	        Class.mixin(this, MEventTarget, MListenerTarget, MObservableTarget, MPropertyTarget);

	        // Public Events

	        this.settingLabels = new Event("settingLabels", EventData);
	        this.labelIndexMapChanged = new ChainedEvent("labelIndexMapChanged", this.change);

	        // Public Properties

	        this.labels = new ObservableProperty("labels", Array, [])
	            .readFilter(function(value) {
	                return value.concat();
	            })
	            .writeFilter(function(value) {
	                return value ? value.concat() : [];
	            })
	            .onChange(function(e) {
	                this._updateLabelMap();
	            });

	        this.actualLabels = new ObservableProperty("actualLabels", Array, [])
	            .readOnly(true)
	            .readFilter(function(value) {
	                return value.concat();
	            });

	        // Private Properties

	        this._targetMap = null;
	        this._targetList = null;
	        this._labelMap = null;
	        this._labelList = null;
	        this._isSettingLabels = false;

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this);

	            this._targetMap = new Map();
	            this._targetList = [];
	            this._labelMap = {};
	            this._labelList = [];
	        };

	        // Public Methods

	        this.register = function(target) {
	            if (target == null) {
	                throw new Error("Parameter target must be non-null.");
	            }

	            var targetData = this._targetMap.get(target);
	            if (targetData) {
	                return;
	            }

	            targetData = { labels: null };
	            this._targetMap.set(target, targetData);
	            this._targetList.push(targetData);
	        };

	        this.unregister = function(target) {
	            if (target == null) {
	                throw new Error("Parameter target must be non-null.");
	            }

	            var targetData = this._targetMap.get(target);
	            if (!targetData) {
	                return;
	            }

	            var targetIndex = ArrayUtil.indexOf(this._targetList, targetData);
	            if (targetIndex >= 0) {
	                this._targetList.splice(targetIndex, 1);
	            }
	            this._targetMap.del(target);

	            this._updateLabelMap();
	        };

	        this.setLabels = function(target, labels) {
	            if (target == null) {
	                throw new Error("Parameter target must be non-null.");
	            }
	            if ((labels != null) && !Class.isArray(labels)) {
	                throw new Error("Parameter labels must be of type Array.");
	            }

	            var targetData = this._targetMap.get(target);
	            if (!targetData) {
	                return;
	            }

	            targetData.labels = labels ? labels.concat() : null;

	            this.notifySettingLabels();
	        };

	        this.getLabelIndex = function(label) {
	            if (label == null) {
	                throw new Error("Parameter label must be non-null.");
	            }
	            if (!Class.isString(label)) {
	                throw new Error("Parameter label must be of type String.");
	            }

	            var index = this.getLabelIndexOverride(label);
	            if (index < 0) {
	                var labelIndex = this._labelMap[label];
	                index = (labelIndex != null) ? labelIndex : -1;
	            }
	            return index;
	        };

	        this.getNumLabels = function() {
	            var value = this.getNumLabelsOverride();
	            if (value < 0) {
	                value = this._labelList.length;
	            }
	            return value;
	        };

	        this.notifySettingLabels = function() {
	            if (this._isSettingLabels) {
	                return;
	            }

	            try {
	                this._isSettingLabels = true;
	                this.fire(this.settingLabels, new EventData());
	                this._updateLabelMap();
	            } finally {
	                this._isSettingLabels = false;
	            }
	        };

	        this.notifyLabelIndexMapChanged = function() {
	            this.fire(this.labelIndexMapChanged, new EventData());
	        };

	        // Protected Methods

	        this.getNumLabelsOverride = function() {
	            return -1;
	        };

	        this.getLabelIndexOverride = function(label) {
	            return -1;
	        };

	        this.updateLabelsOverride = function(labels) {
	            return false;
	        };

	        // Private Methods

	        this._updateLabelMap = function() {
	            var currentLabelList = this._labelList;
	            var changed = false;

	            var labelMap = {};
	            var labelList = [];

	            var targetList = this._targetList;
	            var targetData;
	            var targetLabels;
	            var targetLabel;

	            var i;
	            var j;
	            var l;
	            var m;

	            targetLabels = this.getInternal("labels");
	            for (i = 0, l = targetLabels.length; i < l; i++) {
	                targetLabel = String(targetLabels[i]);
	                if (labelMap[targetLabel] == null) {
	                    labelMap[targetLabel] = labelList.length;
	                    labelList.push(targetLabel);
	                }
	            }

	            for (i = 0, l = targetList.length; i < l; i++) {
	                targetData = targetList[i];
	                targetLabels = targetData.labels;
	                if (targetLabels) {
	                    for (j = 0, m = targetLabels.length; j < m; j++) {
	                        targetLabel = String(targetLabels[j]);
	                        if (labelMap[targetLabel] == null) {
	                            labelMap[targetLabel] = labelList.length;
	                            labelList.push(targetLabel);
	                        }
	                    }
	                }
	            }

	            if (labelList.length != currentLabelList.length) {
	                changed = true;
	            } else {
	                for (i = 0, l = labelList.length; i < l; i++) {
	                    if (labelList[i] !== currentLabelList[i]) {
	                        changed = true;
	                        break;
	                    }
	                }
	            }

	            if (changed) {
	                this._labelMap = labelMap;
	                this._labelList = labelList;

	                this.setInternal("actualLabels", labelList.concat());

	                if (!this.updateLabelsOverride(labelList.concat())) {
	                    this.notifyLabelIndexMapChanged();
	                }
	            }
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/events/MListenerTarget":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Event = __webpack_require__("contrib/jg_lib/events/Event");
		var MEventTarget = __webpack_require__("contrib/jg_lib/events/MEventTarget");
		var Class = __webpack_require__("contrib/jg_lib/Class");
		var TrieMap = __webpack_require__("contrib/jg_lib/utils/TrieMap");
		var WeakMap = __webpack_require__("contrib/jg_lib/utils/WeakMap");

		return Class(module.id, function(MListenerTarget)
		{

			// Private Static Properties

			var _listeningMaps = new WeakMap();

			// Private Static Methods

			var _getListeningMap = function(target, create)
			{
				var listeningMap = _listeningMaps.get(target);
				if (!listeningMap)
				{
					if (create === false)
						return null;

					listeningMap = new TrieMap();
					_listeningMaps.set(target, listeningMap);
				}

				return listeningMap;
			};

			var _delListeningMap = function(target)
			{
				_listeningMaps.del(target);
			};

			// Public Properties

			this.isListenerTarget = true;

			// Public Methods

			this.listenOn = function(target, event, listener, scope, priority)
			{
				if (target == null)
					throw new Error("Parameter target must be non-null.");
				if (!target.isEventTarget)
					throw new Error("Parameter target must have mixin " + Class.getName(MEventTarget) + ".");

				event = Event.resolve(target, event);

				if (listener == null)
					throw new Error("Parameter listener must be non-null.");
				if (!Class.isFunction(listener))
					throw new Error("Parameter listener must be of type Function.");
				if ((priority != null) && !Class.isNumber(priority))
					throw new Error("Parameter priority must be of type Number.");

				if (scope == null)
					scope = this;

				var listeningMap = _getListeningMap(this);
				var listeningKeys = [ target, event, listener, scope ];
				listeningMap.set(listeningKeys, listeningKeys);

				target.on(event, listener, scope, priority);

				return this;
			};

			this.listenOff = function(target, event, listener, scope)
			{
				var listeningKeys = null;

				if (scope != null)
				{
					if (target == null)
						throw new Error("Parameter target must be non-null.");
					if (!target.isEventTarget)
						throw new Error("Parameter target must have mixin " + Class.getName(MEventTarget) + ".");

					event = Event.resolve(target, event);

					if (listener == null)
						throw new Error("Parameter listener must be non-null.");
					if (!Class.isFunction(listener))
						throw new Error("Parameter listener must be of type Function.");

					listeningKeys = [ target, event, listener, scope ];
				}
				else if (listener != null)
				{
					if (target == null)
						throw new Error("Parameter target must be non-null.");
					if (!target.isEventTarget)
						throw new Error("Parameter target must have mixin " + Class.getName(MEventTarget) + ".");

					event = Event.resolve(target, event);

					if (!Class.isFunction(listener))
						throw new Error("Parameter listener must be of type Function.");

					listeningKeys = [ target, event, listener, this ];
				}
				else if (event != null)
				{
					if (target == null)
						throw new Error("Parameter target must be non-null.");
					if (!target.isEventTarget)
						throw new Error("Parameter target must have mixin " + Class.getName(MEventTarget) + ".");

					event = Event.resolve(target, event);

					listeningKeys = [ target, event ];
				}
				else if (target != null)
				{
					if (!target.isEventTarget)
						throw new Error("Parameter target must have mixin " + Class.getName(MEventTarget) + ".");

					listeningKeys = [ target ];
				}

				var listeningMap = _getListeningMap(this, false);
				if (!listeningMap)
					return this;

				var listeningList = listeningMap.values(listeningKeys);
				listeningMap.clear(listeningKeys);
				if (listeningMap.size() === 0)
					_delListeningMap(this);

				for (var i = 0, l = listeningList.length; i < l; i++)
				{
					listeningKeys = listeningList[i];
					listeningKeys[0].off(listeningKeys[1], listeningKeys[2], listeningKeys[3]);
				}

				return this;
			};

			this.isListening = function(target, event)
			{
				var listeningKeys = null;

				if (event != null)
				{
					if (target == null)
						throw new Error("Parameter target must be non-null.");
					if (!target.isEventTarget)
						throw new Error("Parameter target must have mixin " + Class.getName(MEventTarget) + ".");

					event = Event.resolve(target, event);

					listeningKeys = [ target, event ];
				}
				else if (target != null)
				{
					if (!target.isEventTarget)
						throw new Error("Parameter target must have mixin " + Class.getName(MEventTarget) + ".");

					listeningKeys = [ target ];
				}

				var listeningMap = _getListeningMap(this, false);
				if (!listeningMap)
					return false;

				return (listeningMap.size(listeningKeys) > 0);
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/events/MObservableTarget":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Event = __webpack_require__("contrib/jg_lib/events/Event");
		var EventData = __webpack_require__("contrib/jg_lib/events/EventData");
		var Class = __webpack_require__("contrib/jg_lib/Class");

		return Class(module.id, function(MObservableTarget)
		{

			// Public Properties

			this.isObservableTarget = true;

			// Public Events

			this.change = new Event("change", EventData);

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/properties/MPropertyTarget":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Property = __webpack_require__("contrib/jg_lib/properties/Property");
		var Class = __webpack_require__("contrib/jg_lib/Class");

		return Class(module.id, function(MPropertyTarget)
		{

			// Public Properties

			this.isPropertyTarget = true;

			// Public Methods

			this.get = function(property)
			{
				property = Property.resolve(this, property);

				return property.get(this);
			};

			this.set = function(property, value)
			{
				property = Property.resolve(this, property);

				if (property.readOnly())
					throw new Error("Property \"" + property.name() + "\" is read-only.");
				if (!property.isValidType(value))
					throw new Error("Value assigned to property \"" + property.name() + "\" must be of type " + property.getTypeName() + ".");

				property.set(this, value);

				return this;
			};

			// Protected Methods

			this.getInternal = function(property)
			{
				property = Property.resolve(this, property);

				return property.getInternal(this);
			};

			this.setInternal = function(property, value)
			{
				property = Property.resolve(this, property);

				if (!property.isValidType(value))
					throw new Error("Value assigned to property \"" + property.name() + "\" must be of type " + property.getTypeName() + ".");

				property.setInternal(this, value);

				return this;
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/properties/Property":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Class = __webpack_require__("contrib/jg_lib/Class");
		var Map = __webpack_require__("contrib/jg_lib/utils/Map");
		var ObjectUtil = __webpack_require__("contrib/jg_lib/utils/ObjectUtil");
		var UID = __webpack_require__("contrib/jg_lib/utils/UID");
		var WeakMap = __webpack_require__("contrib/jg_lib/utils/WeakMap");

		return Class(module.id, Object, function(Property, base)
		{

			// Private Static Constants

			var _DEBUG_KEY = "__DEBUG_PROPERTIES__";

			// Public Static Properties

			Property.debug = false;

			// Private Static Properties

			var _contextMaps = new WeakMap();

			// Public Static Methods

			Property.resolve = function(target, property, strict)
			{
				if (target == null)
					throw new Error("Parameter target must be non-null.");
				if (property == null)
					throw new Error("Parameter property must be non-null.");

				if (property instanceof Property)
					return property;

				if (!Class.isString(property))
					throw new Error("Parameter property must be of type String or " + Class.getName(Property) + ".");

				var propertyName = property;
				if (propertyName.indexOf(".") < 0)
				{
					property = target[propertyName];
				}
				else
				{
					var propertyPath = propertyName.split(".");
					property = target;
					for (var i = 0, l = propertyPath.length; i < l; i++)
					{
						property = property[propertyPath[i]];
						if (property == null)
							break;
					}
				}

				if ((property != null) && (property instanceof Property))
					return property;

				if (strict !== false)
					throw new Error("Unknown property \"" + propertyName + "\".");

				return null;
			};

			// Private Static Methods

			var _debug = function(context)
			{
				var target = context.target;
				var debugMap = ObjectUtil.get(target, _DEBUG_KEY);
				if (!debugMap)
					debugMap = target[_DEBUG_KEY] = {};

				var property = context.property;
				var debugPropertyKey = property.name() + " #" + UID.get(property);
				debugMap[debugPropertyKey] = context.value;
			};

			// Private Properties

			this._name = null;
			this._type = null;
			this._typeChecker = null;
			this._nullValue = null;
			this._defaultValue = null;
			this._readOnly = false;
			this._getter = null;
			this._setter = null;
			this._readFilter = null;
			this._writeFilter = null;
			this._onRead = null;
			this._onWrite = null;

			// Constructor

			this.constructor = function(name, type, defaultValue)
			{
				if (name == null)
					throw new Error("Parameter name must be non-null.");
				if (!Class.isString(name))
					throw new Error("Parameter name must be of type String.");
				if ((type != null) && !Class.isFunction(type))
					throw new Error("Parameter type must be of type Function.");

				this._name = name;
				this._type = type || null;
				this._typeChecker = type ? Class.getTypeChecker(type) : null;

				if (type === Number)
					this._nullValue = NaN;
				else if (type === Boolean)
					this._nullValue = false;
				else
					this._nullValue = null;

				if (defaultValue == null)
					defaultValue = this._nullValue;

				if (!this.isValidType(defaultValue))
					throw new Error("Parameter defaultValue must be of type " + this.getTypeName() + ".");

				this._defaultValue = defaultValue;
			};

			// Public Accessor Methods

			this.name = function()
			{
				return this._name;
			};

			this.type = function()
			{
				return this._type;
			};

			this.defaultValue = function()
			{
				return this._defaultValue;
			};

			this.readOnly = function(value)
			{
				if (!arguments.length)
					return this._readOnly;

				if ((value != null) && !Class.isBoolean(value))
					throw new Error("Parameter readOnly must be of type Boolean.");

				this._readOnly = (value === true);

				return this;
			};

			this.getter = function(value)
			{
				if (!arguments.length)
					return this._getter;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter getter must be of type Function.");

				this._getter = value || null;

				return this;
			};

			this.setter = function(value)
			{
				if (!arguments.length)
					return this._setter;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter setter must be of type Function.");

				this._setter = value || null;

				return this;
			};

			this.readFilter = function(value)
			{
				if (!arguments.length)
					return this._readFilter;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter readFilter must be of type Function.");

				this._readFilter = value || null;

				return this;
			};

			this.writeFilter = function(value)
			{
				if (!arguments.length)
					return this._writeFilter;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter writeFilter must be of type Function.");

				this._writeFilter = value || null;

				return this;
			};

			this.onRead = function(value)
			{
				if (!arguments.length)
					return this._onRead;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter onRead must be of type Function.");

				this._onRead = value || null;

				return this;
			};

			this.onWrite = function(value)
			{
				if (!arguments.length)
					return this._onWrite;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter onWrite must be of type Function.");

				this._onWrite = value || null;

				return this;
			};

			// Public Methods

			this.get = function(target)
			{
				if (this._onRead)
					this._onRead.call(target);

				var value = this.getInternal(target);

				if (this._readFilter)
				{
					var filterValue = this._readFilter.call(target, value);
					if (filterValue !== value)
					{
						if (!this.isValidType(filterValue))
							throw new Error("Value returned from readFilter for property \"" + this.name() + "\" must be of type " + this.getTypeName() + ".");

						value = filterValue;
					}
				}

				if (value == null)
					value = this._nullValue;

				return value;
			};

			this.set = function(target, value)
			{
				if (value == null)
					value = this._nullValue;

				if (this._writeFilter)
				{
					var filterValue = this._writeFilter.call(target, value);
					if (filterValue !== value)
					{
						if (!this.isValidType(filterValue))
							throw new Error("Value returned from writeFilter for property \"" + this.name() + "\" must be of type " + this.getTypeName() + ".");

						value = filterValue;
					}
				}

				if (!this.setInternal(target, value))
					return;

				if (this._onWrite)
					this._onWrite.call(target);
			};

			this.getInternal = function(target)
			{
				if (this._getter)
				{
					var value = this._getter.call(target);
					if (!this.isValidType(value))
						throw new Error("Value returned from getter for property \"" + this.name() + "\" must be of type " + this.getTypeName() + ".");

					return value;
				}

				var context = this.getContext(target, false);
				if (context)
					return this.readValue(context);

				return this._defaultValue;
			};

			this.setInternal = function(target, value)
			{
				if (this._getter)
				{
					if (this._setter)
						this._setter.call(target, value);

					return true;
				}

				var context = this.getContext(target);
				if (context.isWriting)
					return false;

				try
				{
					context.isWriting = true;

					if (this.needsWrite(context, value))
					{
						if (this._setter)
							this._setter.call(target, value);

						this.writeValue(context, value);
					}
				}
				finally
				{
					context.isWriting = false;
				}

				return true;
			};

			this.getTypeName = function()
			{
				return this._type ? (Class.getName(this._type) || (this._name + ".type")) : "*";
			};

			this.isValidType = function(value)
			{
				return ((value == null) || !this._typeChecker || this._typeChecker(value));
			};

			// Protected Methods

			this.getContext = function(target, create)
			{
				var contextMap = _contextMaps.get(target);
				if (!contextMap)
				{
					if (create === false)
						return null;

					contextMap = new Map();
					_contextMaps.set(target, contextMap);
				}

				var context = contextMap.get(this);
				if (!context)
				{
					if (create === false)
						return null;

					context = { target: target, property: this };
					contextMap.set(this, context);

					this.setupContext(context);
				}

				return context;
			};

			this.delContext = function(target)
			{
				var contextMap = _contextMaps.get(target);
				if (!contextMap)
					return;

				var context = contextMap.get(this);
				if (!context)
					return;

				contextMap.del(this);
				if (contextMap.size() === 0)
					_contextMaps.del(target);

				this.teardownContext(context);
			};

			this.setupContext = function(context)
			{
				context.value = this._defaultValue;
				context.isWriting = false;
			};

			this.teardownContext = function(context)
			{
				context.value = null;
			};

			this.readValue = function(context)
			{
				return context.value;
			};

			this.writeValue = function(context, value)
			{
				context.value = value;

				if (Property.debug)
					_debug(context);
			};

			this.needsWrite = function(context, value)
			{
				return true;
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/properties/ObservableProperty":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var MObservableProperty = __webpack_require__("contrib/jg_lib/properties/MObservableProperty");
		var Property = __webpack_require__("contrib/jg_lib/properties/Property");
		var Class = __webpack_require__("contrib/jg_lib/Class");

		return Class(module.id, Property, function(ObservableProperty, base)
		{

			Class.mixin(this, MObservableProperty);

			// Constructor

			this.constructor = function(name, type, defaultValue)
			{
				base.constructor.call(this, name, type, defaultValue);

				this.initChangeEvent();
			};

			// Protected Methods

			this.setupContext = function(context)
			{
				base.setupContext.call(this, context);

				this.setupDependencySupport(context);
			};

			this.teardownContext = function(context)
			{
				this.teardownDependencySupport(context);

				base.teardownContext.call(this, context);
			};

			this.writeValue = function(context, value)
			{
				var oldValue = context.value;

				this.teardownDependencyChangeHandler(context);

				base.writeValue.call(this, context, value);

				if ((value != null) && value.isEventTarget && value.isObservableTarget && (value !== this.defaultValue()))
					this.setupDependencyChangeHandler(context, [ { target: value, event: value.change } ]);

				this.notifyChange(context, oldValue, value);
			};

			this.needsWrite = function(context, value)
			{
				return this.hasChange(context, context.value, value);
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/properties/MObservableProperty":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var PropertyEventData = __webpack_require__("contrib/jg_lib/properties/PropertyEventData");
		var Class = __webpack_require__("contrib/jg_lib/Class");
		var ChainedEvent = __webpack_require__("contrib/jg_lib/events/ChainedEvent");
		var MObservableTarget = __webpack_require__("contrib/jg_lib/events/MObservableTarget");
		var ErrorUtil = __webpack_require__("contrib/jg_lib/utils/ErrorUtil");
		var FunctionUtil = __webpack_require__("contrib/jg_lib/utils/FunctionUtil");
		var Set = __webpack_require__("contrib/jg_lib/utils/Set");

		return Class(module.id, function(MObservableProperty)
		{

			// Public Events

			this.change = null;

			// Public Properties

			this.isObservableProperty = true;

			// Private Properties

			this._changeComparator = null;
			this._onChange = null;

			// Public Accessor Methods

			this.changeComparator = function(value)
			{
				if (!arguments.length)
					return this._changeComparator;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter changeComparator must be of type Function.");

				this._changeComparator = value || null;

				return this;
			};

			this.onChange = function(value)
			{
				if (!arguments.length)
					return this._onChange;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter onChange must be of type Function.");

				this._onChange = value || null;

				return this;
			};

			// Protected Methods

			this.initChangeEvent = function()
			{
				this.change = new PropertyChangeEvent(this);
			};

			this.setupDependencySupport = function(context)
			{
				context._dependencyList = null;
				context._dependencyChangingSet = null;
				context._dependencyChangeHandler = null;
			};

			this.teardownDependencySupport = function(context)
			{
				this.teardownDependencyChangeHandler(context);

				context._dependencyChangingSet = null;
				context._dependencyChangeHandler = null;
			};

			this.setupDependencyChangeHandler = function(context, dependencyList)
			{
				if (context._dependencyList || (dependencyList.length === 0))
					return;

				var target = context.target;
				if (!target.isEventTarget || !target.isListenerTarget)
					return;

				dependencyList = context._dependencyList = dependencyList.concat();

				if (!context._dependencyChangingSet)
					context._dependencyChangingSet = new Set();

				var dependencyChangeHandler = context._dependencyChangeHandler;
				if (!dependencyChangeHandler)
					dependencyChangeHandler = context._dependencyChangeHandler = FunctionUtil.bind(this.dependencyChangeHandler, this, context);

				var dependencyInfo;
				for (var i = 0, l = dependencyList.length; i < l; i++)
				{
					dependencyInfo = dependencyList[i];
					target.listenOn(dependencyInfo.target, dependencyInfo.event, dependencyChangeHandler, this, -Infinity);
				}
			};

			this.teardownDependencyChangeHandler = function(context)
			{
				var dependencyList = context._dependencyList;
				if (!dependencyList)
					return;

				var target = context.target;
				var dependencyChangeHandler = context._dependencyChangeHandler;
				var dependencyInfo;
				for (var i = dependencyList.length - 1; i >= 0; i--)
				{
					dependencyInfo = dependencyList[i];
					target.listenOff(dependencyInfo.target, dependencyInfo.event, dependencyChangeHandler, this);
				}

				context._dependencyList = null;
			};

			this.dependencyChangeHandler = function(context, eventData)
			{
				if (context.isWriting || eventData.isPropagationStopped())
					return;

				var dependencyChangingSet = context._dependencyChangingSet;
				if (dependencyChangingSet.has(eventData))
					return;

				try
				{
					dependencyChangingSet.add(eventData);

					context.target.fire(this.change, eventData);
				}
				finally
				{
					dependencyChangingSet.del(eventData);
				}
			};

			this.notifyChange = function(context, oldValue, newValue)
			{
				var target = context.target;
				if (target.isEventTarget)
					target.fire(this.change, new PropertyEventData(this, oldValue, newValue));
			};

			this.hasChange = function(context, oldValue, newValue)
			{
				if (this._changeComparator)
					return this._changeComparator.call(context.target, oldValue, newValue) ? true : false;

				// default comparison that handles NaN
				return ((oldValue !== newValue) && ((oldValue === oldValue) || (newValue === newValue)));
			};

			// Private Nested Classes

			var PropertyChangeEvent = Class(ChainedEvent, function(PropertyChangeEvent, base)
			{

				// Private Properties

				this._property = null;

				// Constructor

				this.constructor = function(property)
				{
					base.constructor.call(this, property.name() + ".change", MObservableTarget.change);

					this._property = property;
				};

				// Public Methods

				this.notifyListeners = function(target, eventData)
				{
					// manually invoke the property onChange handler to avoid the performance and
					// memory overhead of adding it as an actual listener

					var onChange = this._property._onChange;
					if (onChange)
					{
						var originalCurrentEvent = eventData.currentEvent;
						var originalCurrentTarget = eventData.currentTarget;

						eventData.currentEvent = this;
						eventData.currentTarget = target;

						try
						{
							onChange.call(target, eventData);
						}
						catch (e)
						{
							ErrorUtil.nonBlockingThrow(e);
						}

						eventData.currentEvent = originalCurrentEvent;
						eventData.currentTarget = originalCurrentTarget;

						if (eventData.isImmediatePropagationStopped())
							return;
					}

					base.notifyListeners.call(this, target, eventData);
				};

			});

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/properties/PropertyEventData":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Class = __webpack_require__("contrib/jg_lib/Class");
		var EventData = __webpack_require__("contrib/jg_lib/events/EventData");

		return Class(module.id, EventData, function(PropertyEventData, base)
		{

			// Public Properties

			this.property = null;
			this.oldValue = null;
			this.newValue = null;

			// Constructor

			this.constructor = function(property, oldValue, newValue)
			{
				this.property = property;
				this.oldValue = oldValue;
				this.newValue = newValue;
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/Map":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var $ = __webpack_require__("shim/jquery");
	    var _ = __webpack_require__("require/underscore");
	    var Leaflet = __webpack_require__("shim/leaflet");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Pass = __webpack_require__("contrib/jg_lib/async/Pass");
	    var ChainedEvent = __webpack_require__("contrib/jg_lib/events/ChainedEvent");
	    var Event = __webpack_require__("contrib/jg_lib/events/Event");
	    var EventData = __webpack_require__("contrib/jg_lib/events/EventData");
	    var ObservableArrayProperty = __webpack_require__("contrib/jg_lib/properties/ObservableArrayProperty");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var Property = __webpack_require__("contrib/jg_lib/properties/Property");
	    var ArrayUtil = __webpack_require__("contrib/jg_lib/utils/ArrayUtil");
	    var FunctionUtil = __webpack_require__("contrib/jg_lib/utils/FunctionUtil");
	    var NumberUtil = __webpack_require__("contrib/jg_lib/utils/NumberUtil");
	    var StringUtil = __webpack_require__("contrib/jg_lib/utils/StringUtil");
	    var GenericEventData = __webpack_require__("splunk/events/GenericEventData");
	    var LatLon = __webpack_require__("splunk/mapping/LatLon");
	    var LatLonBounds = __webpack_require__("splunk/mapping/LatLonBounds");
	    var ControlBase = __webpack_require__("splunk/mapping/controls/ControlBase");
	    var LayerBase = __webpack_require__("splunk/mapping/layers/LayerBase");
	    var VizBase = __webpack_require__("splunk/viz/VizBase");
	    var HTMLCleaner = __webpack_require__("util/htmlcleaner");

	    __webpack_require__("shim/jquery.resize");

	    return Class(module.id, VizBase, function(Map, base) {

	        // Public Passes

	        this.updateLeafletMapSizePass = new Pass("updateLeafletMapSize", 0.001);
	        this.updateTilesPass = new Pass("updateTiles", 0.002);

	        // Public Events

	        this.boundsChanged = new ChainedEvent("boundsChanged", this.change);
	        this.mapClicked = new Event("mapClicked", GenericEventData);

	        // Public Properties

	        this.center = new Property("center", LatLon)
	            .getter(function() {
	                return LatLon.fromLeaflet(this.leafletMap.getCenter());
	            })
	            .setter(function(value) {
	                value = (value && value.isFinite()) ? value.clone() : new LatLon();

	                this.validate();
	                this.leafletMap.setView(value.toLeaflet(), this.leafletMap.getZoom(), true);

	                this._checkBoundsChanged();

	                // set a second time on a delay since Leaflet is a POS and doesn't set the
	                // center properly if zoom, minZoom, or maxZoom are also set at the same time
	                clearTimeout(this._setCenterTimeout);
	                this._setCenterTimeout = setTimeout(FunctionUtil.bind(function() {
	                    this.leafletMap.setView(value.toLeaflet(), this.leafletMap.getZoom(), true);
	                    this._checkBoundsChanged();
	                }, this), 500);
	            });

	        this.zoom = new Property("zoom", Number)
	            .getter(function() {
	                return this.leafletMap.getZoom();
	            })
	            .setter(function(value) {
	                value = ((value >= 0) && (value < Infinity)) ? value : 0;

	                this.validate();
	                this.leafletMap.setView(this.leafletMap.getCenter(), value, true);

	                this._checkBoundsChanged();
	            });

	        this.tileURL = new ObservableProperty("tileURL", String, null)
	            .onChange(function(e) {
	                this.invalidate("updateTilesPass");
	            });

	        this.tileSubdomains = new ObservableArrayProperty("tileSubdomains", String, [ "a", "b", "c" ])
	            .onChange(function(e) {
	                this.invalidate("updateTilesPass");
	            });

	        this.tileMinZoom = new ObservableProperty("tileMinZoom", Number, 0)
	            .writeFilter(function(value) {
	                return ((value >= 0) && (value < Infinity)) ? Math.floor(value) : 0;
	            })
	            .onChange(function(e) {
	                this.invalidate("updateTilesPass");
	            });

	        this.tileMaxZoom = new ObservableProperty("tileMaxZoom", Number, Infinity)
	            .writeFilter(function(value) {
	                return ((value >= 0) && (value < Infinity)) ? Math.floor(value) : Infinity;
	            })
	            .onChange(function(e) {
	                this.invalidate("updateTilesPass");
	            });

	        this.tileInvertY = new ObservableProperty("tileInvertY", Boolean, false)
	            .onChange(function(e) {
	                this.invalidate("updateTilesPass");
	            });

	        this.tileOpacity = new ObservableProperty("tileOpacity", Number, 1)
	            .writeFilter(function(value) {
	                return ((value > 0) && (value < Infinity)) ? Math.min(value, 1) : 0;
	            })
	            .onChange(function(e) {
	                this.invalidate("updateTilesPass");
	            });

	        this.tileAttribution = new ObservableProperty("tileAttribution", String, null)
	            .onChange(function(e) {
	                this.invalidate("updateTilesPass");
	            });

	        this.showTiles = new ObservableProperty("showTiles", Boolean, true)
	            .onChange(function(e) {
	                this.invalidate("updateTilesPass");
	            });

	        this.tilesLoaded = new ObservableProperty("tilesLoaded", Boolean, false)
	            .readOnly(true);

	        this.leafletMap = null;
	        this.formatNumber = null;
	        this.formatDegrees = null;
	        this.isCategorical = false;

	        // Private Properties

	        this._tooltip = null;
	        this._tooltipMetadata = null;
	        this._tileLayer = null;
	        this._layers = null;
	        this._controls = null;
	        this._width = 0;
	        this._height = 0;
	        this._bounds = null;
	        this._setCenterTimeout = 0;
	        this._clicks = 0;
	        this._doubleClickTimeout = null;

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this);

	            this.addStyleClass("splunk-mapping-Map");

	            this.setStyle({ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "none" });

	            this.updateSize = FunctionUtil.bind(this.updateSize, this);
	            this._leafletMap_moveend = FunctionUtil.bind(this._leafletMap_moveend, this);
	            this._leafletMap_zoomend = FunctionUtil.bind(this._leafletMap_zoomend, this);
	            this._self_mouseOver = FunctionUtil.bind(this._self_mouseOver, this);
	            this._self_mouseOut = FunctionUtil.bind(this._self_mouseOut, this);
	            this._self_mouseMove = FunctionUtil.bind(this._self_mouseMove, this);
	            this._self_click = FunctionUtil.bind(this._self_click, this);
	            this._self_dbl_click = FunctionUtil.bind(this._self_dbl_click, this);

	            this.leafletMap = new Leaflet.Map(this.element, { center: new Leaflet.LatLng(0, 0), zoom: 0, trackResize: false, worldCopyJump: false });
	            this.leafletMap.attributionControl.setPrefix("");
	            this.leafletMap.on("moveend", this._leafletMap_moveend);
	            this.leafletMap.on("zoomend", this._leafletMap_zoomend);

	            this._tooltip = new LeafletTooltip();

	            this._layers = [];
	            this._controls = [];

	            this.$element.bind("mouseover", this._self_mouseOver);
	            this.$element.bind("mouseout", this._self_mouseOut);
	            this.$element.bind("mousemove", this._self_mouseMove);
	            this.$element.bind("click", this._self_click);
	            this.$element.bind("dblclick", this._self_dbl_click);
	        };

	        // Public Methods

	        this.updateLeafletMapSize = function() {
	            if (this.isValid("updateLeafletMapSizePass")) {
	                return;
	            }

	            this.leafletMap.invalidateSize();
	            // hack to force immediate redraw
	            clearTimeout(this.leafletMap._sizeTimer);
	            this.leafletMap.fire("moveend");

	            this.markValid("updateLeafletMapSizePass");
	        };

	        this.updateTiles = function() {
	            if (this.isValid("updateTilesPass")) {
	                return;
	            }

	            var leafletMap = this.leafletMap;

	            var tileLayer = this._tileLayer;
	            if (tileLayer) {
	                tileLayer.off('load');
	                tileLayer.off('unload');
	                leafletMap.removeLayer(tileLayer);
	                this._tileLayer = null;
	            }

	            var tileOptions = {};
	            tileOptions.opacity = this.getInternal("tileOpacity");
	            tileOptions.subdomains = this.getInternal("tileSubdomains");
	            tileOptions.minZoom = this.getInternal("tileMinZoom");
	            tileOptions.maxZoom = Math.max(this.getInternal("tileMinZoom"), this.getInternal("tileMaxZoom"));
	            tileOptions.tms = this.getInternal("tileInvertY");
	            tileOptions.attribution = this.getInternal("tileAttribution");

	            var tileURL = this.getInternal("showTiles") ? this.getInternal("tileURL") : null;
	            if (tileURL) {
	                tileLayer = this._tileLayer = new Leaflet.TileLayer(tileURL, tileOptions);
	                tileLayer.on('load', function() {
	                    this.setInternal('tilesLoaded', true);
	                }, this);
	                tileLayer.on('unload', function () {
	                    this.setInternal('tilesLoaded', false);
	                }, this);
	                leafletMap.addLayer(tileLayer, true);
	            }

	            // hack to adjust maxZoom on leafletMap
	            leafletMap.options.minZoom = tileOptions.minZoom;
	            leafletMap.options.maxZoom = tileOptions.maxZoom;
	            leafletMap.setZoom(leafletMap.getZoom());

	            this.markValid("updateTilesPass");

	            this._checkBoundsChanged();
	        };

	        this.addLayer = function(layer) {
	            if (layer == null) {
	                throw new Error("Parameter layer must be non-null.");
	            }
	            if (!(layer instanceof LayerBase)) {
	                throw new Error("Parameter layer must be of type " + Class.getName(LayerBase) + ".");
	            }

	            var layers = this._layers;
	            if (ArrayUtil.indexOf(layers, layer) >= 0) {
	                return;
	            }

	            layers.push(layer);
	            this.leafletMap.addLayer(layer.leafletLayer);
	            layer.onAddedToMap(this);
	        };

	        this.removeLayer = function(layer) {
	            if (layer == null) {
	                throw new Error("Parameter layer must be non-null.");
	            }
	            if (!(layer instanceof LayerBase)) {
	                throw new Error("Parameter layer must be of type " + Class.getName(LayerBase) + ".");
	            }

	            var layers = this._layers;
	            var index = ArrayUtil.indexOf(layers, layer);
	            if (index < 0) {
	                return;
	            }

	            layer.onRemovedFromMap(this);
	            this.leafletMap.removeLayer(layer.leafletLayer);
	            layers.splice(index, 1);
	        };

	        this.addControl = function(control) {
	            if (control === null) {
	                throw new Error("Parameter control must be non-null.");
	            }
	            if (!(control instanceof ControlBase)) {
	                throw new Error("Parameter control must be of type " + Class.getName(ControlBase) + ".");
	            }

	            var controls = this._controls;
	            if (ArrayUtil.indexOf(controls, control) >= 0) {
	                return;
	            }

	            controls.push(control);
	            this.leafletMap.addControl(control.leafletControl);
	            control.onAddedToMap(this);
	        };

	        this.removeControl = function(control) {
	            if (control === null) {
	                throw new Error("Parameter control must be non-null.");
	            }
	            if (!(control instanceof ControlBase)) {
	                throw new Error("Parameter control must be of type " + Class.getName(ControlBase) + ".");
	            }

	            var controls = this._controls;
	            var index = ArrayUtil.indexOf(controls, control);
	            if (index < 0) {
	                return;
	            }

	            control.onRemovedFromMap(this);
	            this.leafletMap.removeControl(control.leafletControl);
	            controls.splice(index, 1);
	        };

	        this.fitWorld = function(viewportInside) {
	            if ((viewportInside != null) && !Class.isBoolean(viewportInside)) {
	                throw new Error("Parameter viewportInside must be of type Boolean.");
	            }

	            this.fitBounds(new LatLonBounds(-60, -180, 85, 180), viewportInside);
	        };

	        this.fitBounds = function(latLonBounds, viewportInside) {
	            if (latLonBounds == null) {
	                throw new Error("Parameter latLonBounds must be non-null.");
	            }
	            if (!(latLonBounds instanceof LatLonBounds)) {
	                throw new Error("Parameter latLonBounds must be of type " + Class.getName(LatLonBounds) + ".");
	            }
	            if ((viewportInside != null) && !Class.isBoolean(viewportInside)) {
	                throw new Error("Parameter viewportInside must be of type Boolean.");
	            }

	            latLonBounds = latLonBounds.isFinite() ? latLonBounds : new LatLonBounds(-60, -180, 85, 180);
	            viewportInside = (viewportInside === true);

	            // clear center timeout hack so it doesn't conflict with the center we set here
	            clearTimeout(this._setCenterTimeout);

	            // compute zoom
	            var zoom = this.leafletMap.getBoundsZoom(latLonBounds.toLeaflet(), viewportInside);

	            // must set zoom first so that Leaflet conversion methods are accurate when computing the center
	            this.leafletMap.setView(this.leafletMap.getCenter(), zoom, true);

	            // compute center
	            var tl = this.leafletMap.latLngToLayerPoint(latLonBounds.getNW().toLeaflet());
	            var br = this.leafletMap.latLngToLayerPoint(latLonBounds.getSE().toLeaflet());
	            var centerPoint = new Leaflet.Point((tl.x + br.x) / 2, (tl.y + br.y) / 2);
	            var center = this.leafletMap.layerPointToLatLng(centerPoint);

	            // set center and zoom
	            this.leafletMap.setView(center, zoom, true);

	            this._checkBoundsChanged();
	        };

	        this.getLatLonBounds = function() {
	            return LatLonBounds.fromLeaflet(this.leafletMap.getBounds());
	        };

	        this.updateSize = function() {
	            var width = this.$element.width();
	            var height = this.$element.height();
	            if ((width === this._width) && (height === this._height)) {
	                return;
	            }

	            // HACK: The host architecture has no facilities in place for managing logic
	            // that may be dependent on component visibility. Therefore, we must manually
	            // verify that $element and its parent DOM tree are visible and able to return
	            // valid dimensions before continuing with the resize operation.
	            // This check should be removed if and when the host architecture supports the
	            // required visibility hooks.
	            // Addresses SPL-65769, SPL-76312, and SPL-76487.
	            if (!this.$element.is(":visible")) {
	                return;
	            }

	            this._width = width;
	            this._height = height;

	            this.leafletMap.invalidateSize();
	            this.invalidate("updateLeafletMapSizePass");

	            this._checkBoundsChanged();
	        };

	        this.dispose = function() {
	            clearTimeout(this._setCenterTimeout);

	            var layers = this._layers.concat();
	            for (var i = layers.length - 1; i >= 0; i--) {
	                this.removeLayer(layers[i]);
	            }

	            var controls = this._controls.concat();
	            for (var j = controls.length - 1; j >=0; j--) {
	                this.removeControl(controls[j]);
	            }

	            this.$element.off("elementResize");

	            base.dispose.call(this);
	        };

	        // Protected Methods

	        this.onAppend = function() {
	            this.updateSize();
	            // updateSize is bound to "this" in the constructor
	            this.$element.on("elementResize", this.updateSize);
	        };

	        // Private Methods

	        this._checkBoundsChanged = function() {
	            var oldBounds = this._bounds;
	            var newBounds = this.getLatLonBounds();
	            if (oldBounds && oldBounds.equals(newBounds)) {
	                return;
	            }

	            this._bounds = newBounds;
	            this.fire("boundsChanged", new EventData());
	        };

	        this._checkBoundsDefault = function(bounds) {
	            if (bounds.e === 0) {
	                return false;
	            } else if (bounds.w === 0) {
	                return false;
	            } else if (bounds.n === 0) {
	                return false;
	            } else if (bounds.s === 0) {
	                return false;
	            }
	            return true;
	        };

	        this._updateTooltip = function(element) {
	            var tooltip = this._tooltip;
	            var metadata = this._getMetadataFromElement(element);
	            if (metadata && (metadata !== this._tooltipMetadata)) {
	                this._tooltipMetadata = metadata;

	                var data = metadata.data;
	                var fields = metadata.fields;
	                var sliceList = metadata.sliceList;
	                var tooltipFields = metadata.tooltipFields;
	                var tooltipLatLng = metadata.tooltipLatLng;
	                var tooltipOffsetRadius = metadata.tooltipOffsetRadius;
	                if (data && (fields || tooltipFields) && tooltipLatLng) {
	                    var content = "";
	                    var field;
	                    var slice;
	                    var i, l;

	                    content += "<table style=\"border: 0 none; border-spacing: 0; border-collapse: collapse;\">";
	                    if (sliceList) {
	                        for (i = 0, l = Math.min(fields.length, 2); i < l; i++) {
	                            field = fields[i];
	                            content += "<tr>";
	                            content += "<td style=\"padding: 0; text-align: left; white-space: nowrap; color: #333333;\">" + StringUtil.escapeHTML(field) + ":&nbsp;&nbsp;</td><td style=\"padding: 0; text-align: right; white-space: nowrap;\">" + StringUtil.escapeHTML(this._formatDegrees(data[field], (i === 0) ? "ns" : "ew")) + "</td>";
	                            content += "</tr>";
	                        }
	                        for (i = 0, l = sliceList.length; i < l; i++) {
	                            slice = sliceList[i];
	                            content += "<tr>";
	                            content += "<td style=\"padding: 0; text-align: left; white-space: nowrap; color: " + ("#" + (slice.series.color | 0x1000000).toString(16).substring(1)) + ";\">" + StringUtil.escapeHTML(slice.series.name) + ":&nbsp;&nbsp;</td><td style=\"padding: 0; text-align: right; white-space: nowrap;\">" + StringUtil.escapeHTML(this._formatNumber(slice.value)) + "</td>";
	                            content += "</tr>";
	                        }
	                    } else if (tooltipFields) {
	                        // TODO [sff] this is getting to the point where we should unify this code to work based on some sort
	                        // of abstract tooltip data structure (and move the styles to LESS).  Will fold that work into SPL-96198.
	                        for (i = 0, l = tooltipFields.length; i < l; i++) {
	                            field = tooltipFields[i];
	                            var fieldContent = data[field];
	                            if (field === metadata.valueFieldName && !this.isCategorical && !isNaN(parseFloat(fieldContent))) {
	                                fieldContent = this._formatNumber(fieldContent);
	                            } else {
	                                fieldContent = StringUtil.escapeHTML(fieldContent);
	                            }
	                            content += "<tr>";
	                            content += "<td style=\"padding: 0; text-align: left; white-space: nowrap; color: #333333;\">" + StringUtil.escapeHTML(field) + ":&nbsp;&nbsp;</td><td style=\"padding: 0; text-align: right; white-space: nowrap;\">" + fieldContent + "</td>";
	                            content += "</tr>";
	                        }
	                    } else {
	                        for (i = 0, l = fields.length; i < l; i += 2) {
	                            field = fields[i];
	                            content += "<tr>";
	                            content += "<td style=\"padding: 0; text-align: left; white-space: nowrap; color: #333333;\">" + StringUtil.escapeHTML(field) + ":&nbsp;&nbsp;</td><td style=\"padding: 0; text-align: right; white-space: nowrap;\">" + StringUtil.escapeHTML(data[field]) + "</td>";
	                            content += "</tr>";
	                        }
	                    }
	                    content += "</table>";

	                    tooltip.setLatLng(tooltipLatLng);
	                    tooltip.setOffsetRadius(tooltipOffsetRadius);
	                    tooltip.setContent(content);

	                    this.leafletMap.openPopup(tooltip);
	                } else {
	                    this.leafletMap.closePopup();
	                }
	            } else if (!metadata && this._tooltipMetadata) {
	                var isTooltip = $.contains(this._tooltip._container, element);
	                // if the element is not a part of the tooltip then close the tooltip
	                if (!isTooltip || this._tooltip === element) {
	                    this._tooltipMetadata = null;
	                    this.leafletMap.closePopup();
	                }
	            }
	        };

	        this._getMetadataFromElement = function(element) {
	            while (element) {
	                if (element[LayerBase.METADATA_KEY]) {
	                    return element[LayerBase.METADATA_KEY];
	                }
	                element = element.parentNode;
	            }
	            return null;
	        };

	        this._formatNumber = function(num) {
	            var format = this.formatNumber;
	            if (typeof format === "function") {
	                return format(Number(num));
	            }

	            return String(num);
	        };

	        this._formatDegrees = function(degrees, orientation) {
	            var format = this.formatDegrees;
	            if (typeof format === "function") {
	                return format(Number(degrees), orientation);
	            }

	            return String(degrees);
	        };

	        this._leafletMap_moveend = function(e) {
	            this._checkBoundsChanged();
	        };

	        this._leafletMap_zoomend = function(e) {
	            this._checkBoundsChanged();
	        };

	        this._self_mouseOver = function(e) {
	            this._updateTooltip(e.target);
	        };

	        this._self_mouseOut = function(e) {
	            this._updateTooltip(e.relatedTarget);
	        };

	        this._self_mouseMove = function(e) {
	            this._updateTooltip(e.target);
	        };

	        this._self_dbl_click = function(e) {
	            clearTimeout(this._doubleClickTimeout);
	        };

	        this._self_click = function(e) {
	            if (this.leafletMap.dragging && this.leafletMap.dragging.moved()) {
	                return;
	            }

	            var metadata = this._getMetadataFromElement(e.target);
	            if (!metadata || !metadata.data || !metadata.fields) {
	                return;
	            }

	            e.preventDefault();

	            var data = {};
	            for (var p in metadata.data) {
	                data[p] = metadata.data[p];
	            }

	            var fields = metadata.fields.concat();

	            clearTimeout(this._doubleClickTimeout);
	            this._doubleClickTimeout = setTimeout(function() {
	                this.fire("mapClicked", new GenericEventData({ data: data, fields: fields, altKey: e.altKey, ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey, jQueryEvent: e, originalEvent: e.originalEvent }));
	            }.bind(this), 500);
	        };

	        // Private Nested Classes

	        var LeafletTooltip = Leaflet.Popup.extend({

	            options: {
	                paddingX: 5,
	                paddingY: 5
	            },

	            _offsetRadius: 0,

	            initialize: function(options) {
	                options = Leaflet.Util.extend(options || {}, { maxWidth: Infinity, maxHeight: Infinity, autoPan: false, closeButton: false });
	                Leaflet.Popup.prototype.initialize.call(this, options);
	            },

	            setOffsetRadius: function(offsetRadius) {
	                this._offsetRadius = offsetRadius;
	                this._update();
	                return this;
	            },

	            _initLayout: function() {
	                Leaflet.Popup.prototype._initLayout.call(this);

	                // hide tip
	                this._tipContainer.style.display = "none";

	                // disable mouse/pointer events on browsers that support it
	                this._container.style.pointerEvents = "none";
	            },

	            _updatePosition: function() {
	                var map = this._map;
	                var mapTL = map.containerPointToLayerPoint(new Leaflet.Point(0, 0));
	                var mapBR = map.containerPointToLayerPoint(map.getSize());
	                var mapLeft = mapTL.x;
	                var mapTop = mapTL.y;
	                var mapRight = mapBR.x;
	                var mapBottom = mapBR.y;

	                var container = this._container;
	                var containerWidth = container.offsetWidth;
	                var containerHeight = container.offsetHeight;

	                var is3d = Leaflet.Browser.any3d;
	                var offsetRadius = this._offsetRadius;
	                var paddingX = this.options.paddingX;
	                var paddingY = this.options.paddingY;

	                var centerPoint = map.latLngToLayerPoint(this._latlng);
	                var offsetX = (centerPoint.x > ((mapLeft + mapRight) / 2)) ? (-containerWidth - offsetRadius - paddingX) : offsetRadius + paddingX;
	                var offsetY = NumberUtil.maxMin(centerPoint.y - containerHeight / 2, mapBottom - containerHeight - paddingY, mapTop + paddingY) - centerPoint.y;

	                if (is3d)
	                    Leaflet.DomUtil.setPosition(container, centerPoint);

	                var x = offsetX + (is3d ? 0 : centerPoint.x);
	                var y = offsetY + (is3d ? 0 : centerPoint.y);

	                container.style.left = Math.round(x) + "px";
	                container.style.top = Math.round(y) + "px";
	            }

	        });

	        // override Leaflet.Control.Attribution so that the attribution container is hidden when there is no text
	        Leaflet.Control.Attribution.include({

	            _update: function () {
	                if (!this._map) {
	                    return;
	                }

	                var attribs = [];

	                for (var i in this._attributions) {
	                    if (this._attributions.hasOwnProperty(i) && this._attributions[i]) {
	                        attribs.push(i);
	                    }
	                }

	                var prefixAndAttribs = [];

	                if (this.options.prefix) {
	                    prefixAndAttribs.push(this.options.prefix);
	                }
	                if (attribs.length) {
	                    prefixAndAttribs.push(attribs.join(", "));
	                }

	                var text = HTMLCleaner.clean(prefixAndAttribs.join(" &#8212; "));

	                this._container.innerHTML = text;
	                this._container.style.display = text ? "" : "none";
	            }

	        });

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "shim/leaflet":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("contrib/leaflet/leaflet.css"),
	       __webpack_require__(33)], __WEBPACK_AMD_DEFINE_RESULT__ = function(css, leaflet) {
	    // SPL-98647: monkey patch the getParamString method to avoid an XSS vulnerability in our
	    // version of Leaflet.
	    // See https://github.com/Leaflet/Leaflet/pull/1317/files
	    if (leaflet && leaflet.Util) {
	        leaflet.Util.getParamString = function(obj, existingUrl) {
	            var params = [];
	            for(var i in obj) {
	                if (obj.hasOwnProperty(i)) {
	                    params.push(encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]));
	                }
	            }
	            return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
	        };
	    }

	    return leaflet;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/leaflet/leaflet.css":
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(32);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(11)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!./../../../../../node_modules/css-loader/index.js!./leaflet.css", function() {
				var newContent = require("!!./../../../../../node_modules/css-loader/index.js!./leaflet.css");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),

/***/ 34:
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(9)();
	// imports


	// module
	exports.push([module.id, "/*  Splunk: Variables */\n/*  ================================================== */\n/*  Variables to customize the look and feel of Bootstrap (splunk version) */\n\n/*  STATIC PATHS */\n/*  ------------------------- */\n\n\n/*  COLOR PALETTE */\n/*  ------------------------- */\n\n/*  Enterprise */\n\n/*  Light */\n\n/*  Grayscale - DO NOT USE DIRECTLY WHENEVER POSSIBLE!!! Use text, border or table variables instead. */\n\n/*  Accent colors */ /* sky */\n\n\n/*  TYPOGRAPHY */\n/*  ------------------------- */ /*  18px; */ /*  Lite listing pages */ /*  empty to use BS default, $baseFontFamily */    /*  instead of browser default, bold */ /*  empty to use BS default, $textColor */\n\n\n/*  SCAFFOLDING */\n/*  ------------------------- */ /*  aliases: $tableBorderColor $tableBorderColorVertical */\n/*  also see: $interactiveBorderColor */      /* For containers without a wrapper */  /* For for containers with a wrapper, like popdown */ /*  44px */  /*  26px  */   /*  22px */\n\n\n/*  Horizontal forms & lists */\n/*  ------------------------- */\n\n\n/*  Z-INDEX */\n/*  ------------------------- */\n/*  If a variable does not suit your purpose, set a value relatively such as, $zindexModal +1 */ /*  Splunk Lite */ /*  Splunk Lite */ /*  Sidebar Component */ /*  Sidebar Component */ /*  timerange popdown needs to be above modal + backdrop */ /*  top interactive element */ /*  top interactive element */ /*  top uninteractive */ /*  top uninteractive */\n\n\n/*  TABLES */\n/*  ------------------------- */ /*  overall background-color */ /*  for hover */ /*  for striping */ /*  for striping */ /*  table and cell border */ /*  table and cell border */ /*  table and cell border */\n\n\n/*  FORMS */\n/*  ------------------------- */ /*  base line-height + 8px vertical padding + 2px top/bottom border */ /*  This is generally overridden. */\n\n\n/*  BASE INTERACTIVE */\n/*  -------------------------- */\n/*  text */\n/*  background */\n/*  borders */ /* these can't be different without breaking button groups. */\n/*  shadow */\n\n\n/*  BASE INTERACTIVE ERROR */\n/*  -------------------------- */\n/*  text */\n/*  background */\n/*  borders */\n\n/*  PRIMARY BUTTONS */\n/*  -------------------------- */\n/*  text */\n/*  background */\n/*  borders */\n/*  shadow */\n\n\n/*  PILL BUTTONS */\n/*  -------------------------- */\n/*  text */\n/*  background */\n\n\n/*  BUTTONS */\n/*  ------------------------- */\n/*  Used in non-standard buttons - Legacy Bootstrap classes only */\n\n\n/*  COMPONENT VARIABLES */\n/*  -------------------------------------------------- */\n\n/*  Navbar */\n/*  ------------------------- */ /* Fixes issue for escaped Dashboards. */\n\n/*  Inverted navbar */\n\n\n/*  Tooltips and popovers */\n/*  ------------------------- */\n\n\n/*  GRID */\n/*  -------------------------- */\n/*  Default 940px grid */\n/*  Fluid grid */\n\n/*  1200px min */\n\n/*  768px-979px */\n\n\n/*  Fluid grid */\n/*  ------------------------- */\n\n/*  1200px min */\n\n/*  768px-979px */\n\n\n/*  Responsive Variables */\n\n\n/*  SELECTORS FOR CUSTOMIZING SPECIFIC LOCALES */\n/*  -------------------------- */\n\n\n/*  BUILD COMMENT */\n/*  -------------------------- */\n/*  Hide the Build Comment. The make file sets this to true */\n\n/*  LEGACY BUILD */\n/*  -------------------------- */\n/*  This is set to true when building the less for splunk components. */\n\n/*  Splunk: Mixins */\n/*  ================== */\n/*  Snippets of reusable CSS to develop faster and keep code readable */\n\n/*  Splunk: Mixins */\n/*  ================== */\n/*  Snippets of reusable CSS to develop faster and keep code readable */\n\n\n/*  Mixins */\n/*  -------------------------------------------------- */\n\n\n/*  UTILITY MIXINS */\n/*  -------------------------------------------------- */\n\n/*  Link */\n/*  ------------------ */\n\n\n/*  Clearfix */\n/*  -------- */\n/*  For clearing floats like a boss h5bp.com/q */\n\n/*  Webkit-style focus */\n/*  ------------------ */\n\n/*  Center-align a block level element */\n/*  ---------------------------------- */\n\n/*  Sizing shortcuts */\n/*  ------------------------- */\n\n/*  Placeholder text */\n/*  ------------------------- */\n\n/*  Text overflow */\n/*  ------------------------- */\n/*  Requires inline-block or block for proper styling */\n\n/*  CSS image replacement */\n/*  ------------------------- */\n/*  Source: https://github.com/h5bp/html5-boilerplate/commit/aa0396eae757 */\n\n\n/*  FONTS */\n/*  -------------------------------------------------- */\n\n\n/*  FORMS */\n/*  -------------------------------------------------- */\n\n/*  Block level inputs */\n\n/*  Mixin for form field states */\n\n\n/*  CSS3 PROPERTIES */\n/*  -------------------------------------------------- */\n\n\n/*  Single Side Border Radius */\n\n\n/*  Transformations */\n\n\n\n/*  Resize anything */\n\n/*  CSS3 Content Columns */\n\n/*  Optional hyphenation */\n\n\n\n\n/*  BACKGROUNDS */\n/*  -------------------------------------------------- */\n\n/*  Gradient Bar Colors for buttons and alerts */\n\n/*  Gradients */\n\n/*  Reset filters for IE */\n\n\n\n/*  COMPONENT MIXINS */\n/*  -------------------------------------------------- */\n\n/*  Horizontal dividers */\n/*  ------------------------- */\n/*  Dividers (basically an hr) within dropdowns and nav lists */\n\n/*  Button backgrounds */\n/*  ------------------ */\n\n/*  Navbar vertical align */\n/*  ------------------------- */\n/*  Vertically center elements in the navbar. */\n/*  Example: an element has a height of 30px, so write out `.navbarVerticalAlign(30px);` to calculate the appropriate top margin. */\n\n\n\n/*  Disable highlighting text */\n/*  ------------------------- */\n\n/*  Printing */\n/*  ------------------ */\n\n\n/*  Popdown */\n/*  ------------------ *//*  .popdown-dialog */\n\n/*  popdown body */\n\n\n\n/* Flex\n/*  ------------- */\n\n/*  Full Page Layout */\n/*  ------------- */\n\n\n\n\n/*  Grid System */\n/*  ----------- */\n\n/*  Centered container element */\n\n/*  Table columns */\n\n/*  Make a Grid */\n/*  Use .makeRow and .makeColumn to assign semantic layouts grid system behavior */\n\n/*  The Grid */\n\n/*  Interactive */\n/*  -------------------------------------------------- */\n/*  These are by any element that can be clicked, such as buttons, menus and table headings. */\n\n/*  Hover state */\n\n/*  Interactive Error */\n/*  These are by any interactive element that is is in an error state */\n\n/*  primary */\n\n/*  primary hover state */\n\n/* Overlays (Modal, Popdown, Search Assistant) */\n\n/*  Focus States */\n/*  ----------------------------- */\n\n/*  Text entry boxes change their border color and glow */\n\n/*  Clickable buttons change their border color and glow */\n\n/*  Block elements change the background color */\n/*  Block elements change the background color and spread via box-shadow */\n\n/*  Docking Elements */\n/*  ------------------ */\n\n/*  Webkit-style focus */\n/*  ------------------ */\n\n/*  Draggable Handle */\n\n.leaflet-reset-zoom-icon {\n\tpadding-top: 2px;\n\tdisplay: block;\n\tmargin: auto;\n}\n\n@media print {\n\t.leaflet-reset-zoom {\n\t\tdisplay: none;\n\t}\n\n}\n\n.leaflet-control-zoom-in:focus, .leaflet-control-zoom-out:focus{\n\tbox-shadow: 0 0 0 2px rgba(61, 171, 255, 0.12);\n\tbackground-color: rgba(61, 171, 255, 0.12);\n\toutline: 0;\n}", "", {"version":3,"sources":["/./bower_components/SplunkWebCore/search_mrsparkle/exposed/pcss/base/variables-lite.pcss","/./bower_components/SplunkWebCore/search_mrsparkle/exposed/pcss/base/mixins-lite.pcss","/./bower_components/SplunkWebCore/search_mrsparkle/exposed/pcss/base/mixins-shared.pcss","/./bower_components/SplunkWebCore/search_mrsparkle/exposed/js/views/shared/map/Master.pcss"],"names":[],"mappings":"AAAA,wBAAwB;AACxB,yDAAyD;AACzD,6EAA6E;;AAI7E,mBAAmB;AACnB,gCAAgC;;;AAMhC,oBAAoB;AACpB,gCAAgC;;AAEhC,iBAAiB;;AAIjB,YAAY;;AAIZ,wGAAwG;;AAWxG,oBAAoB,CACa,SAAS;;;AAe1C,iBAAiB;AACjB,gCAAgC,CAIF,YAAY,CAiBf,yBAAyB,CAEnB,+CAA+C,IAC/C,uCAAuC,CACvC,0CAA0C;;;AAM3E,kBAAkB;AAClB,gCAAgC,CAGC,2DAA2D;AAC5F,wCAAwC,MAGN,sCAAsC,EACvC,qDAAqD,CAWnD,WAAW,EACX,YAAY,GACd,WAAW;;;AAK5C,+BAA+B;AAC/B,gCAAgC;;;AAIhC,cAAc;AACd,gCAAgC;AAChC,gGAAgG,CAMhE,kBAAkB,CAClB,kBAAkB,CAClB,wBAAwB,CACxB,wBAAwB,CAGxB,2DAA2D,CAC3D,8BAA8B,CAC9B,8BAA8B,CAC9B,wBAAwB,CACxB,wBAAwB;;;AAGxD,aAAa;AACb,gCAAgC,CAEiB,+BAA+B,CACnC,gBAAgB,CACnB,mBAAmB,CACF,mBAAmB,CAEpC,4BAA4B,CACf,4BAA4B,CACzC,4BAA4B;;;AAItE,YAAY;AACZ,gCAAgC,CAC8B,sEAAsE,CAGjF,oCAAoC;;;AAsBvF,uBAAuB;AACvB,iCAAiC;AACjC,WAAW;AAEX,iBAAiB;AAQjB,cAAc,CAOyC,8DAA8D;AACrH,aAAa;;;AAMb,6BAA6B;AAC7B,iCAAiC;AACjC,WAAW;AAEX,iBAAiB;AAOjB,cAAc;;AAUd,sBAAsB;AACtB,iCAAiC;AACjC,WAAW;AAEX,iBAAiB;AAOjB,cAAc;AAOd,aAAa;;;AAMb,mBAAmB;AACnB,iCAAiC;AACjC,WAAW;AAGX,iBAAiB;;;AAKjB,cAAc;AACd,gCAAgC;AAChC,mEAAmE;;;AAQnE,0BAA0B;AAC1B,yDAAyD;;AAEzD,aAAa;AACb,gCAAgC,CAMQ,yCAAyC;;AAcjF,sBAAsB;;;AAoBtB,4BAA4B;AAC5B,gCAAgC;;;AAOhC,WAAW;AACX,iCAAiC;AACjC,yBAAyB;AAKzB,iBAAiB;;AAIjB,iBAAiB;;AAKjB,kBAAkB;;;AAMlB,iBAAiB;AACjB,gCAAgC;;AAIhC,iBAAiB;;AAIjB,kBAAkB;;;AAKlB,2BAA2B;;;AAI3B,iDAAiD;AACjD,iCAAiC;;;AAIjC,oBAAoB;AACpB,iCAAiC;AACjC,8DAA8D;;AAG9D,mBAAmB;AACnB,iCAAiC;AACjC,wEAAwE;;ACpXxE,qBAAqB;AACrB,yBAAyB;AACzB,wEAAwE;;ACFxE,qBAAqB;AACrB,yBAAyB;AACzB,wEAAwE;;;AAGxE,aAAa;AACb,yDAAyD;;;AAGzD,qBAAqB;AACrB,yDAAyD;;AAEzD,WAAW;AACX,yBAAyB;;;AAgBzB,eAAe;AACf,eAAe;AACf,iDAAiD;;AAgBjD,yBAAyB;AACzB,yBAAyB;;AASzB,yCAAyC;AACzC,yCAAyC;;AAOzC,uBAAuB;AACvB,gCAAgC;;AAShC,uBAAuB;AACvB,gCAAgC;;AAOhC,oBAAoB;AACpB,gCAAgC;AAChC,wDAAwD;;AAOxD,4BAA4B;AAC5B,gCAAgC;AAChC,4EAA4E;;;AAU5E,YAAY;AACZ,yDAAyD;;;AA+BzD,YAAY;AACZ,yDAAyD;;AAEzD,yBAAyB;;AAQzB,kCAAkC;;;AAqClC,sBAAsB;AACtB,yDAAyD;;;AAGzD,gCAAgC;;;AAmBhC,sBAAsB;;;;AAiBtB,sBAAsB;;AAMtB,2BAA2B;;AAM3B,2BAA2B;;;;;AAS3B,kBAAkB;AAClB,yDAAyD;;AAEzD,iDAAiD;;AAQjD,gBAAgB;;AA2ChB,2BAA2B;;;;AAO3B,uBAAuB;AACvB,yDAAyD;;AAEzD,0BAA0B;AAC1B,gCAAgC;AAChC,gEAAgE;;AAQhE,yBAAyB;AACzB,yBAAyB;;AAazB,4BAA4B;AAC5B,gCAAgC;AAChC,gDAAgD;AAChD,oIAAoI;;;;AAOpI,gCAAgC;AAChC,gCAAgC;;AAMhC,eAAe;AACf,yBAAyB;;;AAmDzB,cAAc;AACd,yBAAyB,sBA+GF;;AAEvB,mBAAmB;;;;AAUnB;oBACoB;;AA0BpB,uBAAuB;AACvB,oBAAoB;;;;;AAoEpB,kBAAkB;AAClB,kBAAkB;;AAElB,iCAAiC;;AAOjC,oBAAoB;;AAOpB,kBAAkB;AAClB,mFAAmF;;AAWnF,eAAe;;ADroBf,kBAAkB;AAClB,yDAAyD;AACzD,+FAA+F;;AAW/F,kBAAkB;;AAUlB,wBAAwB;AACxB,wEAAwE;;AASxE,cAAc;;AAWd,0BAA0B;;AAO1B,iDAAiD;;AAKjD,mBAAmB;AACnB,oCAAoC;;AAEpC,0DAA0D;;AAM1D,2DAA2D;;AAS3D,iDAAiD;AAOjD,2EAA2E;;AAO3E,uBAAuB;AACvB,yBAAyB;;AAKzB,yBAAyB;AACzB,yBAAyB;;AASzB,uBAAuB;;AE9GvB;CACC,iBAAiB;CACjB,eAAe;CACf,aAAa;CACb;;AAED;CACC;EACC,cAAc;EACd;;CAED;;AAED;CF4EC,+CAAgD;CAChD,2CAA4C;CAC5C,WAAW;CE5EX","file":"Master.pcss","sourcesContent":["/*  Splunk: Variables */\n/*  ================================================== */\n/*  Variables to customize the look and feel of Bootstrap (splunk version) */\n\n$theme: lite;\n\n/*  STATIC PATHS */\n/*  ------------------------- */\n$staticPath:        /static;\n$staticImagePath:   /static/img;\n$staticFontPath:    /static/fonts;\n\n\n/*  COLOR PALETTE */\n/*  ------------------------- */\n\n/*  Enterprise */\n$splunkGray: \t         #97999B;\n$splunkGreen:            #65A637;\n\n/*  Light */\n$splunkLiteOrange:       #F58220;\n$splunkLiteBlack:        #333;\n\n/*  Grayscale - DO NOT USE DIRECTLY WHENEVER POSSIBLE!!! Use text, border or table variables instead. */\n$black:                 #000;\n$grayDarker:            #222;\n$grayDark:              #333;\n$gray:                  #555;\n$grayLight:             #999;\n$grayLightMedium:       #ccc;\n$grayLighter:           #eee;\n$offWhite:              #f3f3f3;\n$white:                 #fff;\n\n/*  Accent colors */\n$blue:                  #1e93c6; /* sky */\n$blueDark:              #3863a0;\n$green:                 #a2cc3e;\n$red:                   #d6563c;\n$yellow:                #f2b827;\n$yellowLight:           color($yellow l(+28%));\n$yellowLighter:         color($yellow l(+38%));\n$orange:                #ed8440;\n$pink:                  #cc5068;\n$purple:                #6a5c9e;\n$teal:                  #11a88b;\n\n$focusColor:            #52A8EC;\n\n\n/*  TYPOGRAPHY */\n/*  ------------------------- */\n$baseFontSizeLarge:     16px;\n$baseFontSize:          12px;\n$baseFontSizeSmall:     11px;\n$baseLineHeight:        16px; /*  18px; */\n\n$fontSizeLarge:         calc($baseFontSize * 1.25);\n$fontSizeSmall:         calc($baseFontSize * 0.85);\n$fontSizeMini:          calc($baseFontSize * 0.75);\n\n$serifFontFamily:       Georgia, \"Times New Roman\", Times, serif;\n$sansFontFamily:        \"Ubuntu\", \"Roboto\", \"Droid\", \"Helvetica Neue\", Helvetica, Arial, sans-serif;\n$monoFontFamily:        'Droid Sans Mono', 'Consolas', 'Monaco', 'Courier New', Courier, monospace;\n$baseFontFamily:        $sansFontFamily;\n\n$textColor:             #333;\n$textGrayDark:          #666;\n$textGray:              #999;\n$textDisabledColor:     #bbb;\n$placeholderText:       $textGray;\n\n$textTileColor:     \t#ccc; /*  Lite listing pages */\n\n$headingsFontFamily:    inherit; /*  empty to use BS default, $baseFontFamily */\n$headingsFontWeight:    bold;    /*  instead of browser default, bold */\n$headingsColor:         inherit; /*  empty to use BS default, $textColor */\n\n$linkColor:            #0095cf;\n$linkColorHover:       color($linkColor l(-20%));\n\n\n/*  SCAFFOLDING */\n/*  ------------------------- */\n$borderDarkColor: \t\t#999;\n$borderColor: \t\t\t#ccc;\n$borderLightColor: \t    #d5d5d5; /*  aliases: $tableBorderColor $tableBorderColorVertical */\n/*  also see: $interactiveBorderColor */\n\n$baseBorderRadius: \t\t\t 2px;\n$containerBorderRadius: \t 0;      /* For containers without a wrapper */\n$containerOuterBorderRadius: 0;  /* For for containers with a wrapper, like popdown */\n$containerInnerBorderRadius: 0;\n$borderRadiusLarge:          6px;\n$borderRadiusSmall:          3px;\n\n$bodyBackgroundColor:   \t       $offWhite;\n$containerBackgroundColor:         $white;\n$containerBackgroundGradientStart: $white;\n\n$sideNavWidth:          300px;\n\n$paddingLarge:          11px 19px; /*  44px */\n$paddingSmall:          2px 10px;  /*  26px  */\n$paddingMini:           0 6px;   /*  22px */\n\n$hrBorder:              $grayLighter;\n\n\n/*  Horizontal forms & lists */\n/*  ------------------------- */\n$horizontalComponentOffset:       180px;\n\n\n/*  Z-INDEX */\n/*  ------------------------- */\n/*  If a variable does not suit your purpose, set a value relatively such as, $zindexModal +1 */\n$zindexHeaderTable:       406;\n$zindexDropdown:          1000;\n$zindexPopover:           1010;\n$zindexTooltip:           1020;\n$zindexFixedNavbar:       1030;\n$zindexSideNavBackdrop:   1032; /*  Splunk Lite */\n$zindexSideNav:           1034; /*  Splunk Lite */\n$zindexSideBarBackdrop:   1036; /*  Sidebar Component */\n$zindexSideBar:           1038; /*  Sidebar Component */\n$zindexModalBackdrop:     1040;\n$zindexModal:             1050;\n$zindexPopdown:           1060; /*  timerange popdown needs to be above modal + backdrop */\n$zindexTooltip:           1070; /*  top interactive element */\n$zindexDatePicker:        1070; /*  top interactive element */\n$zindexModalNoConnection: 1080; /*  top uninteractive */\n$zindexModalDisconnect:   1090; /*  top uninteractive */\n\n\n/*  TABLES */\n/*  ------------------------- */\n\n$tableBackground:                   transparent; /*  overall background-color */\n$tableBackgroundHover:              #e4e4e4; /*  for hover */\n$tableBackgroundAccent:             #eee; /*  for striping */\n$tableBackgroundAccentHover:        $tableBackgroundHover; /*  for striping */\n$tableBackgroundFocus:\t\t\t\tcolor($focusColor a(12%) s(100%));\n$tableBorder:                       #333; /*  table and cell border */\n$tableBorderVertical:               $borderLightColor; /*  table and cell border */\n$tableSortIconColor:                #bbb; /*  table and cell border */\n$tableTextDisabledColor:            #7C7C7C;\n\n\n/*  FORMS */\n/*  ------------------------- */\n$inputHeight:                   calc($baseLineHeight + 10px); /*  base line-height + 8px vertical padding + 2px top/bottom border */\n$inputBackground:               $white;\n$inputBorder:                   $borderColor;\n$inputBorderRadius:             $baseBorderRadius; /*  This is generally overridden. */\n$inputDisabledBackground:       $grayLighter;\n\n$formActionsBackground:         $offWhite;\n\n$warningText:             \t\tcolor($yellow l(-10%));\n$warningBackground:       \t\t$yellowLighter;\n$warningBorder:           \t\tcolor($yellow l(-10%));\n\n$errorText:               \t\t$red;\n$errorBackground:         \t\tcolor($red l(+40%));\n$errorBorder:             \t\t$red;\n\n$successText:             \t\t$green;\n$successBackground:       \t\tcolor($green l(+40%));\n$successBorder:           \t\t$green;\n\n$infoText:                \t\t#3a87ad;\n$infoBackground:          \t\t#d9edf7;\n$infoBorder:              \t\tcolor($infoBackground h(-10) l(-7%));\n\n\n/*  BASE INTERACTIVE */\n/*  -------------------------- */\n/*  text */\n$interactiveColor:                  $white;\n/*  background */\n$interactiveBackgroundColor:        $interactiveColor;\n$interactiveDisabledBackgroundColor:#ccc;\n$interactiveGradientStartColor:     $interactiveColor;;\n$interactiveGradientEndColor:       $interactiveColor;\n$interactiveBackgroundColorHover:   #efefef;\n$interactiveGradientStartColorHover:$interactiveBackgroundColorHover;\n$interactiveGradientEndColorHover:  $interactiveBackgroundColorHover;\n/*  borders */\n$interactiveBorderColor:            $splunkLiteBlack;\n$interactiveBorderTopColor:         $splunkLiteBlack;\n$interactiveBorderBottomColor:      $splunkLiteBlack;\n$interactiveBorderColorHover:       color($interactiveBorderColor l(+3%));\n$interactiveBorderTopColorHover:    $splunkLiteBlack;\n$interactiveBorderBottomColorHover: $splunkLiteBlack;\n$interactiveBorderRadius:           $baseBorderRadius; /* these can't be different without breaking button groups. */\n/*  shadow */\n$interactiveBoxShadow:              none;\n$interactiveBoxShadowHover:         none;\n$interactiveBoxShadowActive:        inset 0px 2px 2px rgba(0, 0, 0, 0.125);\n\n\n/*  BASE INTERACTIVE ERROR */\n/*  -------------------------- */\n/*  text */\n$interactiveErrorTextColor:              $errorText;\n/*  background */\n$interactiveErrorBackgroundColor:        color($errorBackground blend($red 20%));\n$interactiveErrorGradientStartColor:     $interactiveErrorBackgroundColor;\n$interactiveErrorGradientEndColor:       color($errorBackground blend($red 40%));\n$interactiveErrorBackgroundColorHover:   color($errorBackground blend($red 10%));\n$interactiveErrorGradientStartColorHover:$interactiveErrorBackgroundColorHover;\n$interactiveErrorGradientEndColorHover:  color($errorBackground blend($red 30%));\n/*  borders */\n$interactiveErrorBorderColor:            color($errorBackground blend($red 80%) s(-30%));\n$interactiveErrorBorderTopColor:         $interactiveErrorBorderColor;\n$interactiveErrorBorderBottomColor:      $interactiveErrorBorderColor;\n$interactiveErrorBorderColorHover:       color($errorBackground blend($red 75%) s(-30%));\n$interactiveErrorBorderTopColorHover:    $interactiveErrorBorderColorHover;\n$interactiveErrorBorderBottomColorHover: $interactiveErrorBorderColorHover;\n\n$btnBoxShadowFocus:\t\t\t\t\t0 0 8px color($focusColor a(60%));\n\n/*  PRIMARY BUTTONS */\n/*  -------------------------- */\n/*  text */\n$primaryTextColor:                  $white;\n/*  background */\n$primaryBackgroundColor:            $splunkLiteBlack;\n$primaryGradientStartColor:         $splunkLiteBlack;\n$primaryGradientEndColor:           $splunkLiteBlack;\n$primaryBackgroundColorHover:       #464646;\n$primaryGradientStartColorHover:    $primaryBackgroundColorHover;\n$primaryGradientEndColorHover:      $primaryBackgroundColorHover;\n/*  borders */\n$primaryBorderColor:                $splunkLiteBlack;\n$primaryBorderTopColor:             $splunkLiteBlack;\n$primaryBorderBottomColor:          $splunkLiteBlack;\n$primaryBorderColorHover:           #464646;\n$primaryBorderTopColorHover:        #464646;\n$primaryBorderBottomColorHover:     #464646;\n/*  shadow */\n$primaryBoxShadow:              \tnone;\n$primaryBoxShadowHover:         \tnone;\n$primaryBoxShadowActive:    \t\tinset 0px -2px 2px rgba(255, 255, 255, 0.125);\n\n\n/*  PILL BUTTONS */\n/*  -------------------------- */\n/*  text */\n$pillTextColor:                     $linkColor;\n$pillTextColorHover:                $linkColorHover;\n/*  background */\n$pillBackgroundColorHover:          #ddd;\n$pillBackgroundColorFocus:          color($focusColor a(12%) s(100%));\n\n\n/*  BUTTONS */\n/*  ------------------------- */\n/*  Used in non-standard buttons - Legacy Bootstrap classes only */\n$btnSuccessBackground:              #62c462;\n$btnSuccessBackgroundHighlight:     #51a351;\n\n$btnDangerBackground:               #ee5f5b;\n$btnDangerBackgroundHighlight:      #bd362f;\n\n\n/*  COMPONENT VARIABLES */\n/*  -------------------------------------------------- */\n\n/*  Navbar */\n/*  ------------------------- */\n\n$navbarCollapseWidth:             979px;\n$navbarCollapseDesktopWidth:      calc($navbarCollapseWidth + 1px);\n\n$navbarHeight:                    40px;\n$navbarHeightLite:                40px; /* Fixes issue for escaped Dashboards. */\n$navbarBackgroundHighlight:       #ffffff;\n$navbarBackground:                $splunkLiteBlack;\n$navbarBorder:                    color($navbarBackground l(-12%));\n\n$navbarText:                      #777;\n$navbarLinkColor:                 #777;\n$navbarLinkColorHover:            $grayDark;\n$navbarLinkColorActive:           $gray;\n$navbarLinkBackgroundHover:       transparent;\n$navbarLinkBackgroundActive:      color($navbarBackground l(-5%));\n\n$navbarBrandColor:                $navbarLinkColor;\n\n/*  Inverted navbar */\n$navbarInverseBackground:                #111111;\n$navbarInverseBackgroundHighlight:       #222222;\n$navbarInverseBorder:                    #252525;\n\n$navbarInverseText:                      $grayLight;\n$navbarInverseLinkColor:                 $grayLight;\n$navbarInverseLinkColorHover:            $white;\n$navbarInverseLinkColorActive:           $navbarInverseLinkColorHover;\n$navbarInverseLinkBackgroundHover:       transparent;\n$navbarInverseLinkBackgroundActive:      $navbarInverseBackground;\n\n$navbarInverseSearchBackground:          color($navbarInverseBackground l(+25%));\n$navbarInverseSearchBackgroundFocus:     $white;\n$navbarInverseSearchBorder:              $navbarInverseBackground;\n$navbarInverseSearchPlaceholderColor:    #ccc;\n\n$navbarInverseBrandColor:                $navbarInverseLinkColor;\n\n\n/*  Tooltips and popovers */\n/*  ------------------------- */\n$tooltipColor:            #fff;\n$tooltipBackground:       rgba(0,0,0,0.9);\n$tooltipArrowWidth:       5px;\n$tooltipArrowColor:       $tooltipBackground;\n\n\n/*  GRID */\n/*  -------------------------- */\n/*  Default 940px grid */\n$gridColumns:             12;\n$gridColumnWidth:         60px;\n$gridGutterWidth:         20px;\n$gridRowWidth:            calc(($gridColumns * $gridColumnWidth) + ($gridGutterWidth * ($gridColumns - 1)));\n/*  Fluid grid */\n$fluidGridColumnWidth:    6.382978723%;\n$fluidGridGutterWidth:    2.127659574%;\n\n/*  1200px min */\n$gridColumnWidth1200:     70px;\n$gridGutterWidth1200:     30px;\n$gridRowWidth1200:        calc(($gridColumns * $gridColumnWidth1200) + ($gridGutterWidth1200 * ($gridColumns - 1)));\n\n/*  768px-979px */\n$gridColumnWidth768:      42px;\n$gridGutterWidth768:      20px;\n$gridRowWidth768:         calc(($gridColumns * $gridColumnWidth768) + ($gridGutterWidth768 * ($gridColumns - 1)));\n\n\n/*  Fluid grid */\n/*  ------------------------- */\n$fluidGridColumnWidth:    6.382978723%;\n$fluidGridGutterWidth:    2.127659574%;\n\n/*  1200px min */\n$fluidGridColumnWidth1200:     calc($gridColumnWidth1200 / $gridRowWidth1200);\n$fluidGridGutterWidth1200:     calc($gridGutterWidth1200 / $gridRowWidth1200);\n\n/*  768px-979px */\n$fluidGridColumnWidth768:      percentage(100% * $gridColumnWidth768 / $gridRowWidth768);\n$fluidGridGutterWidth768:      calc(100% * $gridGutterWidth768 / $gridRowWidth768);\n\n\n/*  Responsive Variables */\n$responsive-screen-height: 700px;\n\n\n/*  SELECTORS FOR CUSTOMIZING SPECIFIC LOCALES */\n/*  -------------------------- */\n$wideTextLocaleSelector: body.locale-de;\n\n\n/*  BUILD COMMENT */\n/*  -------------------------- */\n/*  Hide the Build Comment. The make file sets this to true */\n$buildComment: false;\n\n/*  LEGACY BUILD */\n/*  -------------------------- */\n/*  This is set to true when building the less for splunk components. */\n$version5AndEarlier: false;\n","/*  Splunk: Mixins */\n/*  ================== */\n/*  Snippets of reusable CSS to develop faster and keep code readable */\n\n@import \"mixins-shared.pcss\";\n\n/*  Interactive */\n/*  -------------------------------------------------- */\n/*  These are by any element that can be clicked, such as buttons, menus and table headings. */\n@define-mixin interactive  {\n\tbackground: $interactiveBackgroundColor;\n\tborder: 1px solid $interactiveBorderColor;\n\n\tcolor: $textColor;\n\tbox-shadow: none;\n\ttext-shadow: none;\n\tborder-radius: $interactiveBorderRadius;\n}\n\n/*  Hover state */\n@define-mixin interactive-hover  {\n\tbackground: $interactiveBackgroundColorHover;\n\tborder-color: $interactiveBorderColorHover;\n\tborder-top-color: $interactiveBorderTopColorHover;\n\tborder-bottom-color: $interactiveBorderBottomColorHover;\n\tbackground-position: 0 0;\n    text-decoration:none;\n}\n\n/*  Interactive Error */\n/*  These are by any interactive element that is is in an error state */\n@define-mixin interactive-error  {\n\tborder-color: $interactiveErrorBorderColor;\n\tcolor: $interactiveErrorTextColor;\n}\n@define-mixin interactive-error-hover  {\n\n}\n\n/*  primary */\n@define-mixin interactive-primary  {\n\tbackground: $splunkLiteBlack;\n\tborder: 1px solid $splunkLiteBlack;\n\n\tcolor: $white;\n\tbox-shadow: none;\n\ttext-shadow: none;\n\tborder-radius: $interactiveBorderRadius;\n}\n\n/*  primary hover state */\n@define-mixin interactive-primary-hover  {\n\tbackground-color: $primaryBackgroundColorHover;\n\tcolor: $primaryTextColor;\n    text-decoration:none;\n}\n\n/* Overlays (Modal, Popdown, Search Assistant) */\n@define-mixin overlay-box-shadow  {\n\tbox-shadow: 0 3px 7px rgba(0,0,0,0.3);\n}\n\n/*  Focus States */\n/*  ----------------------------- */\n\n/*  Text entry boxes change their border color and glow */\n@define-mixin focus-field  {\n\tborder-color: color($focusColor a(80%));\n\toutline: 0;\n}\n\n/*  Clickable buttons change their border color and glow */\n@define-mixin focus-button  {\n\t@mixin focus-field;\n\tbackground-position: 0;  /*  bootstrap tries to animate this on hover & focus */\n\tbackground-color:$white;\n\tborder-collapse: separate; /* Fix IE9 Issue with box-shadow */\n\tbox-shadow: none;\n}\n\n/*  Block elements change the background color */\n@define-mixin focus-pill  {\n\toutline: 0;\n\ttext-decoration: none;\n\tbackground: $pillBackgroundColorFocus;\n\tbox-shadow: none; /* override default focus-link() */\n}\n/*  Block elements change the background color and spread via box-shadow */\n@define-mixin focus-link  {\n\tbox-shadow: 0 0 0 2px $pillBackgroundColorFocus;\n\tbackground-color: $pillBackgroundColorFocus;\n\toutline: 0;\n}\n\n/*  Docking Elements */\n/*  ------------------ */\n@define-mixin affix-top-shadow {\n\tbox-shadow: 0 4px 8px rgba(0,0,0,0.11)\n}\n\n/*  Webkit-style focus */\n/*  ------------------ */\n@define-mixin tab-focus  {\n\t/*  Default */\n\toutline: thin dotted $grayDark;\n\t/*  Webkit */\n\toutline: 3px auto -webkit-focus-ring-color;\n\toutline-offset: -2px;\n}\n\n/*  Draggable Handle */\n@define-mixin draggable-handle-background  {\n\tbackground: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAG0lEQVQIW2M0Njb+f/bsWUYYzciABuAyOFUAAKKMEAXhn6ySAAAAAElFTkSuQmCC) repeat;\n\topacity: 0.5;\n\tcursor: move;\n}\n","/*  Splunk: Mixins */\n/*  ================== */\n/*  Snippets of reusable CSS to develop faster and keep code readable */\n\n\n/*  Mixins */\n/*  -------------------------------------------------- */\n\n\n/*  UTILITY MIXINS */\n/*  -------------------------------------------------- */\n\n/*  Link */\n/*  ------------------ */\n@define-mixin link {\n    color: $linkColor;\n    text-decoration: none;\n    cursor: pointer;\n\n    &:hover {\n      color: $linkColorHover;\n      text-decoration: underline;\n    }\n    &:focus {\n      @mixin focus-link;\n    }\n}\n\n\n/*  Clearfix */\n/*  -------- */\n/*  For clearing floats like a boss h5bp.com/q */\n\n@define-mixin clearfix {\n    &:before,\n    &:after {\n        display: table;\n        content: \"\";\n        /*  Fixes Opera/contenteditable bug: */\n        /*  http://nicolasgallagher.com/micro-clearfix-hack/#comment-36952 */\n        line-height: 0;\n    }\n    &:after {\n        clear: both;\n    }\n}\n\n/*  Webkit-style focus */\n/*  ------------------ */\n@define-mixin tab-focus {\n  /*  Default */\n  outline: thin dotted #333;\n  /*  Webkit */\n  outline: 5px auto -webkit-focus-ring-color;\n  outline-offset: -2px;\n}\n\n/*  Center-align a block level element */\n/*  ---------------------------------- */\n@define-mixin center-block  {\n  display: block;\n  margin-left: auto;\n  margin-right: auto;\n}\n\n/*  Sizing shortcuts */\n/*  ------------------------- */\n@define-mixin size $height, $width {\n  width: $width;\n  height: $height;\n}\n@define-mixin square $size {\n  @mixin size $size, $size;\n}\n\n/*  Placeholder text */\n/*  ------------------------- */\n@define-mixin placeholder $color: $placeholderText {\n  &::placeholder {\n    color: $color;\n  }\n}\n\n/*  Text overflow */\n/*  ------------------------- */\n/*  Requires inline-block or block for proper styling */\n@define-mixin text-overflow  {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n/*  CSS image replacement */\n/*  ------------------------- */\n/*  Source: https://github.com/h5bp/html5-boilerplate/commit/aa0396eae757 */\n@define-mixin hide-text {\n  font: 0/0 a;\n  color: transparent;\n  text-shadow: none;\n  background-color: transparent;\n  border: 0;\n}\n\n\n/*  FONTS */\n/*  -------------------------------------------------- */\n\n\n@define-mixin font-family-serif  {\n  font-family: $serifFontFamily;\n}\n@define-mixin font-family-sans-serif  {\n  font-family: $sansFontFamily;\n}\n@define-mixin font-family-monospace  {\n  font-family: $monoFontFamily;\n}\n@define-mixin font-shorthand $size: $baseFontSize, $weight: normal, $lineHeight: $baseLineHeight {\n    font-size: $size;\n    font-weight: $weight;\n    line-height: $lineHeight;\n}\n@define-mixin font-serif $size: $baseFontSize, $weight: normal, $lineHeight: $baseLineHeight {\n    @mixin font-family-serif;\n    @mixin font-shorthand $size, $weight, $lineHeight;\n}\n@define-mixin font-sans-serif $size: $baseFontSize, $weight: normal, $lineHeight: $baseLineHeight {\n    @mixin font-family-serif;\n    @mixin font-shorthand $size, $weight, $lineHeight;\n}\n@define-mixin font-monospace $size: $baseFontSize, $weight: normal, $lineHeight: $baseLineHeight {\n    @mixin font-family-monospace;\n    @mixin font-shorthand $size, $weight, $lineHeight;\n}\n\n\n/*  FORMS */\n/*  -------------------------------------------------- */\n\n/*  Block level inputs */\n@define-mixin input-block-level {\n  display: block;\n  width: 100%;\n  min-height: $inputHeight; /*  Make inputs at least the height of their button counterpart (base line-height + padding + border) */\n  box-sizing: border-box; /*  Makes inputs behave like true block-level elements */\n}\n\n/*  Mixin for form field states */\n@define-mixin formFieldState $textColor: #555, $borderColor: #ccc, $backgroundColor: #f5f5f5 {\n  /*  Set the text color */\n  .control-label,\n  .help-block,\n  .help-inline {\n    color: $textColor;\n  }\n  /*  Style inputs accordingly */\n  .checkbox,\n  .radio,\n  input,\n  select,\n  textarea {\n    color: $textColor;\n  }\n  input,\n  select,\n  textarea {\n    border-color: $borderColor;\n    box-shadow: inset 0 1px 1px rgba(0,0,0,.075); /*  Redeclare so transitions work */\n    &:focus {\n      border-color: color($borderColor l(-10%));\n      $shadow: inset 0 1px 1px rgba(0,0,0,.075), 0 0 6px color($borderColor l(+20%));\n      box-shadow: $shadow;\n    }\n  }\n  /*  Give a small background color for input-prepend/-append */\n  .input-prepend .add-on,\n  .input-append .add-on {\n    color: $textColor;\n    background-color: $backgroundColor;\n    border-color: $textColor;\n  }\n}\n\n\n/*  CSS3 PROPERTIES */\n/*  -------------------------------------------------- */\n\n\n/*  Single Side Border Radius */\n@define-mixin border-top-radius $radius {\n  border-top-right-radius: $radius;\n  border-top-left-radius: $radius;\n}\n@define-mixin border-right-radius $radius {\n  border-top-right-radius: $radius;\n  border-bottom-right-radius: $radius;\n}\n@define-mixin border-bottom-radius $radius {\n  border-bottom-right-radius: $radius;\n  border-bottom-left-radius: $radius;\n}\n@define-mixin border-left-radius $radius {\n  border-top-left-radius: $radius;\n  border-bottom-left-radius: $radius;\n}\n\n\n/*  Transformations */\n@define-mixin rotate $degrees {\n    transform: rotate($degrees);\n}\n@define-mixin scale $ratio {\n    transform: scale($ratio);\n}\n@define-mixin translate $x, $y {\n    transform: translate($x, $y);\n}\n@define-mixin skew $x, $y {\n    transform: skew($x, $y);\n    backface-visibility: hidden; /*  See https://github.com/twitter/bootstrap/issues/5319 */\n}\n\n\n\n/*  Resize anything */\n@define-mixin resizable $direction {\n  resize: $direction; /*  Options: horizontal, vertical, both */\n  overflow: auto; /*  Safari fix */\n}\n\n/*  CSS3 Content Columns */\n@define-mixin content-columns $columnCount, $columnGap: $gridGutterWidth {\n    column-count: $columnCount;\n    column-gap: $columnGap;\n}\n\n/*  Optional hyphenation */\n@define-mixin hyphens $mode: auto {\n    word-wrap: break-word;\n    hyphens: $mode;\n}\n\n\n\n\n/*  BACKGROUNDS */\n/*  -------------------------------------------------- */\n\n/*  Gradient Bar Colors for buttons and alerts */\n@define-mixin gradientBar $primaryColor, $secondaryColor, $textColor: #fff, $textShadow: 0 -1px 0 rgba(0,0,0,.25) {\n  color: $textColor;\n  text-shadow: $textShadow;\n  @mixin gradient-vertical $primaryColor, $secondaryColor;\n  border-color: rgba(0,0,0,.1) rgba(0,0,0,.1) rgba(0,0,0,.25);\n}\n\n/*  Gradients */\n@define-mixin gradient-horizontal $startColor: #555, $endColor: #333 {\n    background-color: $endColor;\n    background-image: linear-gradient(to right, $startColor, $endColor); /*  Standard, IE10 */\n    background-repeat: repeat-x;\n}\n@define-mixin gradient-vertical $startColor: #555, $endColor: #333 {\n    background-color: color($startColor blend($endColor 40%));\n    background-image: linear-gradient(to bottom, $startColor, $endColor); /*  Standard, IE10 */\n    background-repeat: repeat-x;\n}\n@define-mixin gradient-directional $startColor: #555, $endColor: #333, $deg: 45deg {\n    background-color: $endColor;\n    background-repeat: repeat-x;\n    background-image: linear-gradient($deg, $startColor, $endColor); /*  Standard, IE10 */\n}\n@define-mixin gradient-horizontal-three-colors $startColor: #00b3ee, $midColor: #7a43b6, $colorStop: 50%, $endColor: #c3325f {\n    background-color: color($midColor blend($endColor 30%));\n    background-image: linear-gradient(to right, $startColor, $midColor $colorStop, $endColor);\n    background-repeat: no-repeat;\n}\n@define-mixin gradient-vertical-three-colors $startColor: #00b3ee, $midColor: #7a43b6, $colorStop: 50%, $endColor: #c3325f {\n    background-color: color($midColor blend($endColor 30%));\n    background-image: linear-gradient($startColor, $midColor $colorStop, $endColor);\n    background-repeat: no-repeat;\n}\n@define-mixin gradient-radial $innerColor: #555, $outerColor: #333 {\n    background-color: $outerColor;\n    background-repeat: no-repeat;\n}\n@define-mixin gradient-striped $color: #555, $angle: 45deg {\n    background-color: $color;\n    background-image: linear-gradient($angle, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent);\n}\n@define-mixin gradient-vertical-two-color-stops $startColor: $interactiveGradientStartColor, $colorStop: 50%, $endColor: $interactiveGradientEndColor, $endColorStop: 100% {\n\tbackground-color: color($startColor blend($endColor 20%)); /* Old browsers */\n\tbackground-image: linear-gradient(to bottom, $startColor $colorStop, $endColor $endColorStop); /* W3C */\n}\n@define-mixin gradient-horizontal-two-color-stops $startColor, $colorStop, $endColor, $IE9ImageFallback {\n    background: $endColor $IE9ImageFallback left top repeat-y;\n    background: linear-gradient(to right, $startColor calc($colorStop - 1), transparent $colorStop ), $endColor; /*  w3c */\n}\n\n/*  Reset filters for IE */\n@define-mixin reset-filter  {\n  filter: e(%(\"progid:DXImageTransform.Microsoft.gradient(enabled = false)\"));\n}\n\n\n\n/*  COMPONENT MIXINS */\n/*  -------------------------------------------------- */\n\n/*  Horizontal dividers */\n/*  ------------------------- */\n/*  Dividers (basically an hr) within dropdowns and nav lists */\n@define-mixin nav-divider $color: $borderColor {\n  height: 1px;\n  margin: calc(($baseLineHeight / 2) - 1px) 1px; /*  8px 1px */\n  overflow: hidden;\n  background-color: $color;\n}\n\n/*  Button backgrounds */\n/*  ------------------ */\n@define-mixin buttonBackground $startColor, $endColor, $textColor: #fff, $textShadow: 0 -1px 0 rgba(0,0,0,.25) {\n  /*  gradientBar will set the background to a pleasing blend of these, to support IE<=9 */\n  @mixin gradientBar $startColor, $endColor, $textColor, $textShadow;\n  @mixin reset-filter;\n\n  /*  in these cases the gradient won't cover the background, so we override */\n  &:hover, &:focus, &:active, &.active, &.disabled, &[disabled] {\n    color: $textColor;\n    background-color: $endColor;\n  }\n}\n\n/*  Navbar vertical align */\n/*  ------------------------- */\n/*  Vertically center elements in the navbar. */\n/*  Example: an element has a height of 30px, so write out `.navbarVerticalAlign(30px);` to calculate the appropriate top margin. */\n@define-mixin navbarVerticalAlign $elementHeight {\n  margin-top: calc(($navbarHeight - $elementHeight) / 2);\n}\n\n\n\n/*  Disable highlighting text */\n/*  ------------------------- */\n@define-mixin disable-text-highlight  {\n\t-webkit-touch-callout: none;\n\tuser-select: none;\n}\n\n/*  Printing */\n/*  ------------------ */\n@define-mixin print-width-100-percent {\n\tmax-width: 100% !important;\n\twidth: 100% !important;\n\toverflow: hidden !important;\n}\n\n@define-mixin print-hide  {\n\tdisplay: none !important;\n}\n\n@define-mixin print-no-background {\n\tbackground: none !important;\n}\n\n@define-mixin print-wrap-all {\n\tword-break: break-all !important;\n\tword-wrap: break-word !important;\n\toverflow-wrap: break-word !important;\n\twhite-space: normal !important;\n}\n\n@define-mixin print-table {\n    table {\n        @mixin print-width-100-percent;\n        table-layout: auto !important;\n    }\n\n    .scrolling-table-wrapper, .results-wrapper, .results-table, .events-viewer-wrapper {\n        @mixin print-width-100-percent;\n    }\n\n    td,\n    th {\n        @mixin print-no-background;\n        @mixin print-wrap-all;\n        width: auto !important;\n        page-break-inside:auto;\n    }\n\n    .table-chrome .sorts:after {\n        content: '';\n    }\n\n    .header-table-docked,\n    .table-scroll-bar-docked {\n        @mixin print-hide;\n    }\n}\n\n\n/*  Popdown */\n/*  ------------------ */\n@define-mixin popdown-dialog {\n\tbackground-color: $interactiveColor;\n\tborder: 1px solid $interactiveBorderColor;\n\t/* border-bottom-color: $interactiveBorderBottomColor; */\n\t/* border-top-color: $interactiveBorderTopColor; */\n\n\t/*  remove gradient for IE to fix clipping */\n\t@mixin reset-filter;\n\n\tbox-shadow: 1px 2px 5px rgba(0,0,0,0.2);\n\n\tborder-radius: $containerOuterBorderRadius;\n\n\ttop:100%;\n\tleft: 50%;\n\tmargin: 8px 0 0 -103px;\n\n\tdisplay:none;\n\tposition:absolute;\n\tz-index: $zindexPopdown;\n\t/*  placement of arrow */\n\n\twhite-space: normal; /* prevent inheriting nowrap from btn-group */\n\n\t.arrow {\n\t\twidth: 0;\n\t\theight: 0;\n\t\tborder-left: 8px solid transparent;\n\t\tborder-right: 8px solid transparent;\n\n\t\tborder-bottom: 8px solid $interactiveBorderTopColor;\n\t\tposition: absolute;\n\t\ttop: -8px;\n\t\tleft: 50%;\n\t\tmargin-left: -4px;\n\n\t\t/*  generated arrow */\n\t\t&:before {\n\t\t\tcontent: \"\";\n\t\t\tdisplay: block;\n\t\t\twidth: 0;\n\t\t\theight: 0;\n\t\t\tborder-left: 8px solid transparent;\n\t\t\tborder-right: 8px solid transparent;\n\n\t\t\tborder-bottom: 8px solid $white;\n\t\t\tposition: absolute;\n\t\t\ttop: 1px;\n\t\t\tleft:0;\n\t\t\tmargin-left: -8px;\n\t\t}\n\t}\n\n\t&.up {\n\t\tmargin-top: 0;\n\n\t\t/*  placement of arrow */\n\t\t> .arrow {\n\t\t\tborder-top: 8px solid $interactiveBorderBottomColor;\n\t\t\tborder-bottom: none;\n\t\t\ttop: auto;\n\t\t\tbottom: -8px;\n\n\t\t\t&:before {\n\t\t\t\tborder-top: 8px solid $white;\n\t\t\t\tborder-bottom: none;\n\t\t\t\tposition: absolute;\n\t\t\t\ttop: auto;\n\t\t\t\tbottom: 1px;\n\t\t\t}\n\t\t}\n\t}\n\t&.right { /* point left */\n\t\tmargin-left: 5px;\n\t\tmargin-top: 0;\n\n\t\t/*  placement of arrow */\n\t\t.arrow {\n\t\t\tborder-right: 8px solid $interactiveBorderBottomColor;\n\t\t\tborder-top: 8px solid transparent;\n\t\t\tborder-bottom: 8px solid transparent;\n\t\t\tborder-left: none;\n\t\t\ttop: 50%;\n\t\t\tleft: -8px;\n\t\t\tmargin: -8px 0 0 0 ;\n\n\t\t\t&:before {\n\t\t\t\tborder-right: 8px solid $white;\n\t\t\t\tborder-top: 8px solid transparent;\n\t\t\t\tborder-bottom: 8px solid transparent;\n\t\t\t\tborder-left: none;\n\n\t\t\t\tposition: absolute;\n\t\t\t\ttop: 0;\n\t\t\t\tleft: 1px;\n\t\t\t\tmargin: -8px 0 0 0 ;\n\t\t\t}\n\t\t}\n\t}\n\n\n\t/*  position of arrow when floated right */\n\t&.pull-right .arrow {\n\t\tleft: auto;\n\t\tright: 8px;\n\t}\n\t/*  open state */\n\t&.open {\n\t\tdisplay:block;\n\t}\n}/*  .popdown-dialog */\n\n/*  popdown body */\n@define-mixin popdown-dialog-body {\n\tmargin: 0;\n\tborder-radius: $containerInnerBorderRadius;\n\tbackground-color: $white;\n\t@mixin clearfix;\n}\n\n\n\n/* Flex\n/*  ------------- */\n\n@define-mixin display-flex $direction: row {\n    display: flex;\n    flex-direction: $direction;\n}\n\n@define-mixin flex-fit-or-fill {\n    /* IE10, IE11 */\n    -ms-flex-positive: 0; /*Not sure why IE10 requires the broken out values.*/\n    -ms-flex-negative: 1;\n    -ms-flex-preferred-size: auto;\n    -ms-flex: 0 1 auto; //Shrink if you are too big.\n\n    /* Firefox, maybe MS Edge */\n    flex: 1 0 0px; /* Just fill the space. *\n\n    /* Chrome and Safari */\n    -webkit-flex: 0 1 auto; /* Shrink if you are too big. */\n\n    /* Temp Chrome bug. This can be removed when fixed in Chrome 48.\n    /* https://code.google.com/p/chromium/issues/detail?id=546034#c6 */\n    min-height: 0;\n    min-width: 0;\n}\n\n/*  Full Page Layout */\n/*  ------------- */\n@define-mixin application-layout $leftColWidth: 400px {\n    html {\n        height: 100% !important;\n    }\n\n    body {\n        height: 100% !important;\n    }\n\n    .shared-page {\n        height: 100% !important;\n    }\n\n    .layoutCol {\n        overflow: hidden;\n        position: absolute;\n        top: 0;\n        bottom: 0;\n    }\n\n    .layoutRow {\n        overflow: hidden;\n        position: absolute;\n        left: 0;\n        right: 0;\n    }\n\n    .scroll-x {\n        overflow-x: auto;\n        -webkit-overflow-scrolling: touch;\n    }\n\n    .scroll-y {\n        overflow-y: auto;\n        -webkit-overflow-scrolling: touch;\n    }\n\n    /* Pane configuration */\n    .main-section-body {\n        position: absolute;\n        left: 0;\n        right: 0;\n        bottom: 0px;\n        top: 25px; /* this makes room for splunkbar. */\n        min-height:0px !important;\n    }\n\n    .layoutBodyColumns {\n        bottom: 0px;\n        background-color: $white;\n        overflow: auto;\n    }\n\n    .layoutColLeft {\n        width: $leftColWidth;\n    }\n\n    .layoutColRight {\n        right: 0px;\n        left: $leftColWidth; /* left equals width of layoutColLeft */\n    }\n\n}\n\n\n\n\n/*  Grid System */\n/*  ----------- */\n\n/*  Centered container element */\n@define-mixin container-fixed  {\n  margin-right: auto;\n  margin-left: auto;\n  @mixin clearfix;\n}\n\n/*  Table columns */\n@define-mixin tableColumns $columnSpan: 1 {\n  float: none; /*  undo default grid column styles */\n  width: calc((($gridColumnWidth) * $columnSpan) + ($gridGutterWidth * ($columnSpan - 1px)) - 16px); /*  16 is total padding on left and right of table cells */\n  margin-left: 0; /*  undo default grid column styles */\n}\n\n/*  Make a Grid */\n/*  Use .makeRow and .makeColumn to assign semantic layouts grid system behavior */\n@define-mixin makeRow  {\n  margin-left: calc($gridGutterWidth * -1);\n  @mixin clearfix;\n}\n@define-mixin makeColumn $columns: 1, $offset: 0 {\n  float: left;\n  margin-left: calc(($gridColumnWidth * $offset) + ($gridGutterWidth * ($offset - 1px)) + ($gridGutterWidth * 2));\n  width: calc(($gridColumnWidth * $columns) + ($gridGutterWidth * ($columns - 1)));\n}\n\n/*  The Grid */\n\n\n@define-mixin grid-core-span $gridColumns {\n    width: calc(($gridColumnWidth * $gridColumns) + ($gridGutterWidth * ($gridColumns - 1)));\n}\n\n@define-mixin grid-core-offset ($gridColumns) {\n    margin-left: calc(($gridColumnWidth * $gridColumns) + ($gridGutterWidth * ($gridColumns + 1)));\n}\n\n@define-mixin grid-core ($gridColumnWidth, $gridGutterWidth) {\n    @for $index from 1 to 12 {\n        .span$(index) {\n            @mixin grid-core-span $index;\n            float: left;\n            min-height: 1px; /*  prevent collapsing columns */\n            margin-left: $gridGutterWidth;\n        }\n    }\n\n    @for $index from 1 to 12 {\n        .offset$(index) {\n            @mixin grid-core-offset $index;\n        }\n    }\n\n    .row {\n      margin-left: calc($gridGutterWidth * -1);\n      @mixin clearfix;\n    }\n\n    /*  Set the container width, and override it for fixed navbars in media queries */\n    .container,\n    .navbar-static-top .container,\n    .navbar-fixed-top .container,\n    .navbar-fixed-bottom .container {\n        @mixin grid-core-span $gridColumns;\n    }\n}\n\n@define-mixin grid-fluid-span $index {\n       width: calc(($fluidGridColumnWidth * $index) + ($fluidGridGutterWidth * ($index - 1)));\n}\n\n@define-mixin grid-fluid-offset $index {\n    margin-left: calc(($fluidGridColumnWidth * $index) + ($fluidGridGutterWidth * ($index - 1)) + ($fluidGridGutterWidth * 2));\n}\n\n@define-mixin grid-fluid-offsetFirstChild $index {\n  margin-left: calc(($fluidGridColumnWidth * $index) + ($fluidGridGutterWidth * ($index - 1)) + ($fluidGridGutterWidth));\n}\n\n@define-mixin grid-fluid $fluidGridColumnWidth, $fluidGridGutterWidth {\n    .row-fluid {\n        width: 100%;\n        @mixin clearfix;\n\n        @for $index from 1 to 12 {\n            .span$(index) {\n                @mixin input-block-level;\n                @mixin grid-fluid-span $index;\n\n                float: left;\n                margin-left: $fluidGridGutterWidth;\n\n                &:first-child {\n                    margin-left: 0;\n                }\n            }\n        }\n\n        @for $index from 1 to 12 {\n            .offset$(index) {\n                @mixin grid-fluid-offset $index;\n            }\n        }\n\n        /*  Space grid-sized controls properly if multiple per line */\n        .controls-row [class*=\"span\"] + [class*=\"span\"] {\n            margin-left: $fluidGridGutterWidth;\n        }\n    }\n}\n\n@define-mixin grid-input-span $columns {\n  width: calc((($gridColumnWidth) * $columns) + ($gridGutterWidth * ($columns - 1)) - 14px);\n}\n\n\n@define-mixin grid-input $gridColumnWidth, $gridGutterWidth {\n    @for $index from 1 to 12 {\n        .span$(index) {\n            @mixin grid-input-span $index;\n        }\n    }\n\n    input,\n    textarea,\n    .uneditable-input {\n      margin-left: 0; /*  override margin-left from core grid system */\n    }\n\n    /*  Space grid-sized controls properly if multiple per line */\n    .controls-row [class*=\"span\"] + [class*=\"span\"] {\n      margin-left: $gridGutterWidth;\n    }\n}\n",".leaflet-reset-zoom-icon {\n\tpadding-top: 2px;\n\tdisplay: block;\n\tmargin: auto;\n}\n\n@media print {\n\t.leaflet-reset-zoom {\n\t\tdisplay: none;\n\t}\n\n}\n\n.leaflet-control-zoom-in:focus, .leaflet-control-zoom-out:focus{\n\t@mixin focus-link;\n}"],"sourceRoot":"webpack://"}]);

	// exports


/***/ }),

/***/ "contrib/leaflet/images/zoom-in.png":
/***/ (function(module, exports) {

	module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAMAAADXT/YiAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkUwRTZCRkI3NjQzNzExRTBBQUI3RTAwMUU2MTZDRkQ5IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkUwRTZCRkI4NjQzNzExRTBBQUI3RTAwMUU2MTZDRkQ5Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RTBFNkJGQjU2NDM3MTFFMEFBQjdFMDAxRTYxNkNGRDkiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RTBFNkJGQjY2NDM3MTFFMEFBQjdFMDAxRTYxNkNGRDkiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7cwPMXAAAABlBMVEUAAAD///+l2Z/dAAAAAnRSTlP/AOW3MEoAAAAZSURBVHjaYmBkZGRgYACR2Fj4AV69AAEGAAauACW68QgkAAAAAElFTkSuQmCC"

/***/ }),

/***/ "contrib/leaflet/images/zoom-out.png":
/***/ (function(module, exports) {

	module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAkAAAAJCAMAAADXT/YiAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkU5MjRDMEQ5NjQzNzExRTBCM0JDQkU2MzVGQTBCNjRDIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkU5MjRDMERBNjQzNzExRTBCM0JDQkU2MzVGQTBCNjRDIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RTkyNEMwRDc2NDM3MTFFMEIzQkNCRTYzNUZBMEI2NEMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RTkyNEMwRDg2NDM3MTFFMEIzQkNCRTYzNUZBMEI2NEMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7uh53jAAAABlBMVEUAAAD///+l2Z/dAAAAAnRSTlP/AOW3MEoAAAAVSURBVHjaYmCEAQZsLPwAr16AAAMACdgAN9MxY1IAAAAASUVORK5CYII="

/***/ }),

/***/ "contrib/leaflet/images/layers.png":
/***/ (function(module, exports) {

	module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAAKT2lDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjanVNnVFPpFj333vRCS4iAlEtvUhUIIFJCi4AUkSYqIQkQSoghodkVUcERRUUEG8igiAOOjoCMFVEsDIoK2AfkIaKOg6OIisr74Xuja9a89+bN/rXXPues852zzwfACAyWSDNRNYAMqUIeEeCDx8TG4eQuQIEKJHAAEAizZCFz/SMBAPh+PDwrIsAHvgABeNMLCADATZvAMByH/w/qQplcAYCEAcB0kThLCIAUAEB6jkKmAEBGAYCdmCZTAKAEAGDLY2LjAFAtAGAnf+bTAICd+Jl7AQBblCEVAaCRACATZYhEAGg7AKzPVopFAFgwABRmS8Q5ANgtADBJV2ZIALC3AMDOEAuyAAgMADBRiIUpAAR7AGDIIyN4AISZABRG8lc88SuuEOcqAAB4mbI8uSQ5RYFbCC1xB1dXLh4ozkkXKxQ2YQJhmkAuwnmZGTKBNA/g88wAAKCRFRHgg/P9eM4Ors7ONo62Dl8t6r8G/yJiYuP+5c+rcEAAAOF0ftH+LC+zGoA7BoBt/qIl7gRoXgugdfeLZrIPQLUAoOnaV/Nw+H48PEWhkLnZ2eXk5NhKxEJbYcpXff5nwl/AV/1s+X48/Pf14L7iJIEyXYFHBPjgwsz0TKUcz5IJhGLc5o9H/LcL//wd0yLESWK5WCoU41EScY5EmozzMqUiiUKSKcUl0v9k4t8s+wM+3zUAsGo+AXuRLahdYwP2SycQWHTA4vcAAPK7b8HUKAgDgGiD4c93/+8//UegJQCAZkmScQAAXkQkLlTKsz/HCAAARKCBKrBBG/TBGCzABhzBBdzBC/xgNoRCJMTCQhBCCmSAHHJgKayCQiiGzbAdKmAv1EAdNMBRaIaTcA4uwlW4Dj1wD/phCJ7BKLyBCQRByAgTYSHaiAFiilgjjggXmYX4IcFIBBKLJCDJiBRRIkuRNUgxUopUIFVIHfI9cgI5h1xGupE7yAAygvyGvEcxlIGyUT3UDLVDuag3GoRGogvQZHQxmo8WoJvQcrQaPYw2oefQq2gP2o8+Q8cwwOgYBzPEbDAuxsNCsTgsCZNjy7EirAyrxhqwVqwDu4n1Y8+xdwQSgUXACTYEd0IgYR5BSFhMWE7YSKggHCQ0EdoJNwkDhFHCJyKTqEu0JroR+cQYYjIxh1hILCPWEo8TLxB7iEPENyQSiUMyJ7mQAkmxpFTSEtJG0m5SI+ksqZs0SBojk8naZGuyBzmULCAryIXkneTD5DPkG+Qh8lsKnWJAcaT4U+IoUspqShnlEOU05QZlmDJBVaOaUt2ooVQRNY9aQq2htlKvUYeoEzR1mjnNgxZJS6WtopXTGmgXaPdpr+h0uhHdlR5Ol9BX0svpR+iX6AP0dwwNhhWDx4hnKBmbGAcYZxl3GK+YTKYZ04sZx1QwNzHrmOeZD5lvVVgqtip8FZHKCpVKlSaVGyovVKmqpqreqgtV81XLVI+pXlN9rkZVM1PjqQnUlqtVqp1Q61MbU2epO6iHqmeob1Q/pH5Z/YkGWcNMw09DpFGgsV/jvMYgC2MZs3gsIWsNq4Z1gTXEJrHN2Xx2KruY/R27iz2qqaE5QzNKM1ezUvOUZj8H45hx+Jx0TgnnKKeX836K3hTvKeIpG6Y0TLkxZVxrqpaXllirSKtRq0frvTau7aedpr1Fu1n7gQ5Bx0onXCdHZ4/OBZ3nU9lT3acKpxZNPTr1ri6qa6UbobtEd79up+6Ynr5egJ5Mb6feeb3n+hx9L/1U/W36p/VHDFgGswwkBtsMzhg8xTVxbzwdL8fb8VFDXcNAQ6VhlWGX4YSRudE8o9VGjUYPjGnGXOMk423GbcajJgYmISZLTepN7ppSTbmmKaY7TDtMx83MzaLN1pk1mz0x1zLnm+eb15vft2BaeFostqi2uGVJsuRaplnutrxuhVo5WaVYVVpds0atna0l1rutu6cRp7lOk06rntZnw7Dxtsm2qbcZsOXYBtuutm22fWFnYhdnt8Wuw+6TvZN9un2N/T0HDYfZDqsdWh1+c7RyFDpWOt6azpzuP33F9JbpL2dYzxDP2DPjthPLKcRpnVOb00dnF2e5c4PziIuJS4LLLpc+Lpsbxt3IveRKdPVxXeF60vWdm7Obwu2o26/uNu5p7ofcn8w0nymeWTNz0MPIQ+BR5dE/C5+VMGvfrH5PQ0+BZ7XnIy9jL5FXrdewt6V3qvdh7xc+9j5yn+M+4zw33jLeWV/MN8C3yLfLT8Nvnl+F30N/I/9k/3r/0QCngCUBZwOJgUGBWwL7+Hp8Ib+OPzrbZfay2e1BjKC5QRVBj4KtguXBrSFoyOyQrSH355jOkc5pDoVQfujW0Adh5mGLw34MJ4WHhVeGP45wiFga0TGXNXfR3ENz30T6RJZE3ptnMU85ry1KNSo+qi5qPNo3ujS6P8YuZlnM1VidWElsSxw5LiquNm5svt/87fOH4p3iC+N7F5gvyF1weaHOwvSFpxapLhIsOpZATIhOOJTwQRAqqBaMJfITdyWOCnnCHcJnIi/RNtGI2ENcKh5O8kgqTXqS7JG8NXkkxTOlLOW5hCepkLxMDUzdmzqeFpp2IG0yPTq9MYOSkZBxQqohTZO2Z+pn5mZ2y6xlhbL+xW6Lty8elQfJa7OQrAVZLQq2QqboVFoo1yoHsmdlV2a/zYnKOZarnivN7cyzytuQN5zvn//tEsIS4ZK2pYZLVy0dWOa9rGo5sjxxedsK4xUFK4ZWBqw8uIq2Km3VT6vtV5eufr0mek1rgV7ByoLBtQFr6wtVCuWFfevc1+1dT1gvWd+1YfqGnRs+FYmKrhTbF5cVf9go3HjlG4dvyr+Z3JS0qavEuWTPZtJm6ebeLZ5bDpaql+aXDm4N2dq0Dd9WtO319kXbL5fNKNu7g7ZDuaO/PLi8ZafJzs07P1SkVPRU+lQ27tLdtWHX+G7R7ht7vPY07NXbW7z3/T7JvttVAVVN1WbVZftJ+7P3P66Jqun4lvttXa1ObXHtxwPSA/0HIw6217nU1R3SPVRSj9Yr60cOxx++/p3vdy0NNg1VjZzG4iNwRHnk6fcJ3/ceDTradox7rOEH0x92HWcdL2pCmvKaRptTmvtbYlu6T8w+0dbq3nr8R9sfD5w0PFl5SvNUyWna6YLTk2fyz4ydlZ19fi753GDborZ752PO32oPb++6EHTh0kX/i+c7vDvOXPK4dPKy2+UTV7hXmq86X23qdOo8/pPTT8e7nLuarrlca7nuer21e2b36RueN87d9L158Rb/1tWeOT3dvfN6b/fF9/XfFt1+cif9zsu72Xcn7q28T7xf9EDtQdlD3YfVP1v+3Njv3H9qwHeg89HcR/cGhYPP/pH1jw9DBY+Zj8uGDYbrnjg+OTniP3L96fynQ89kzyaeF/6i/suuFxYvfvjV69fO0ZjRoZfyl5O/bXyl/erA6xmv28bCxh6+yXgzMV70VvvtwXfcdx3vo98PT+R8IH8o/2j5sfVT0Kf7kxmTk/8EA5jz/GMzLdsAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAABJRJREFUeNqklk9IG1kcx78zk8mMhGRiYqKxJsE0CKVsWXtYFoqnHrSHWo899FLoSRYs6KE3ocUiJaFbkP4BqR4UqrCw6UFtaU+lKCsoeLGENJI/mubfmElIM5P5t5c1u7Mpaay/23uPeZ/33nz4vkfouo526vr16+jt7cWNGzdmASASidw7OjpCtVpFO3MQ7YLevn17lWGYVw6HowsAeJ4vSJJ0c3Fx8X2hUEC9Xm8J/C5obW3NQdP0a47jrvh8PlitVgBApVJBMpmEIAgfZVkeff78OV8ul6EoyulBa2trsyzLTnq9XpPT6YTZbDaM1+t1FItFpFIpRRTF8PLy8r1sNouvX7827e6boEgkcpWm6Vdut7vL4/Ggo6MDBEF8czG6rqNWqyGTySCXyxVkWb45Pz//nud5KIrSABpAKysr3Waz+Q+O46709fXBYrHAZDI17QJA0+4URUG1WkU6nYYgCB9VVR2dm5vjq9UqVFX9F7S6uhpiGGbi3LlzJofDAZqmDROpqgpRFEFRVKPNsmyjfVKyLIPneRweHiqSJD1ZWFiYKhaLIF68eDFCUdSSz+dzejwesCxrOCZd1xsKMwxjAEmSBIIgYLFYmr4RRRGZTAbJZLKoquotkyRJdLlcJkVRBAD09PQ0JqvVahBFESzLwmQyQVEUg1UEQUBRFGSzWbAsi46OjsYivnz5gmg0ilKpRNpsNrpxdI8ePfq9VCr9FggEKK/XC5IkQdM0WJYFSZItZdA0DaIoQpZlaJqGVCqFeDyu2u32uYWFhbuyLBtlePny5U+pVGqb53nmwoUL6O/vb6zypDRNAwCQJGnor9VqODg4wP7+PhwOh9Tb2/vzzMzMJ03ToOv6t2Wo1+vY2NiArusIBoPo6uoCSZJQVbUB0DQNFEVB0zQUCgXEYjEQBIGRkRGYzeaGDBMTE1MAWsuws7ODDx8+oLOzE16vF52dnQbQ8fExUqkUjo+PMTQ0hMuXL/+YDIFAAE6nE1tbW9je3obf74fH4wEAZDIZJBIJ+P1+jI2NgeM4SJJ0dhny+TzevHkDQRAAABzHYXh4GC6Xq6UMDx8+vNuUDO3IsLe3BwC4dOnSd2WYnJz81JR135Ph/1H03+hpJcOdO3fal8HlcsHv98NqtTbGdF1HpVJBIpFAPp8/mwwXL15EMBjEu3fvsLm5CZ/PZ5AhmUwiEAjg9u3bYBjm9DKcP38edrvdkAbZbBbr6+solUoAALvdjmvXrqG7u9uQEqVSCZ8/f24tw+PHj7sFQXitquovAwMD8Pv9YFnW8E92d3cBAIODg4Z+URSRSCQQjUZBUdRfHMeNTk9PZ1tefKFQaCSfzy9ZrVbnwMAA3G53SxlyuRyi0SgqlUrR5XLdun///saprvIHDx6EisXihM/nMwUCAdhsNoMM5XIZ8XgcyWRScTqdT549ezb1Q28GAJidne0WBOFPSZJ+DQaD6OvrAwCk02nEYjEwDLPFcdxYOBzOngTumZ5bMzMzI7lcbknTNOc/6V10u923wuHwRivAqUE2mw0URWF8fDwEAE+fPp1SVRXt1t8DAKzuGCketP3pAAAAAElFTkSuQmCC"

/***/ }),

/***/ "splunk/charting/ExternalLegend":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var SplunkLegend = __webpack_require__("shim/splunk.legend");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var FunctionUtil = __webpack_require__("contrib/jg_lib/utils/FunctionUtil");
	    var Legend = __webpack_require__("splunk/charting/Legend");

	    return Class(module.id, Legend, function(ExternalLegend, base) {

	        // Private Static Properties

	        var _instanceCount = 0;

	        // Private Properties

	        this._id = null;
	        this._isConnected = false;
	        this._cachedExternalNumLabels = -1;
	        this._cachedExternalLabelMap = null;

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this);

	            this._external_setLabels = FunctionUtil.bind(this._external_setLabels, this);
	            this._external_labelIndexMapChanged = FunctionUtil.bind(this._external_labelIndexMapChanged, this);

	            this._id = "splunk-charting-ExternalLegend-" + (++_instanceCount);
	        };

	        // Public Methods

	        this.connect = function() {
	            this.close();

	            SplunkLegend.register(this._id);
	            SplunkLegend.addEventListener("setLabels", this._external_setLabels);
	            SplunkLegend.addEventListener("labelIndexMapChanged", this._external_labelIndexMapChanged);

	            this._isConnected = true;
	        };

	        this.close = function() {
	            if (!this._isConnected) {
	                return;
	            }

	            this._isConnected = false;

	            SplunkLegend.removeEventListener("labelIndexMapChanged", this._external_labelIndexMapChanged);
	            SplunkLegend.removeEventListener("setLabels", this._external_setLabels);
	            SplunkLegend.unregister(this._id);
	        };

	        this.isConnected = function() {
	            return this._isConnected;
	        };

	        // Protected Methods

	        this.getNumLabelsOverride = function() {
	            if (this._isConnected) {
	                var value = this._cachedExternalNumLabels;
	                if (value < 0) {
	                    value = this._cachedExternalNumLabels = SplunkLegend.numLabels();
	                }
	                return value;
	            }

	            return -1;
	        };

	        this.getLabelIndexOverride = function(label) {
	            if (this._isConnected) {
	                var labelMap = this._cachedExternalLabelMap;
	                if (!labelMap) {
	                    labelMap = this._cachedExternalLabelMap = {};
	                }
	                var index = labelMap[label];
	                if (index == null) {
	                    index = labelMap[label] = SplunkLegend.getLabelIndex(label);
	                }
	                return index;
	            }

	            return -1;
	        };

	        this.updateLabelsOverride = function(labels) {
	            if (this._isConnected) {
	                this._cachedExternalNumLabels = -1;
	                this._cachedExternalLabelMap = null;
	                SplunkLegend.setLabels(this._id, labels);
	                return true;
	            }

	            return false;
	        };

	        // Private Methods

	        this._external_setLabels = function() {
	            this.notifySettingLabels();
	        };

	        this._external_labelIndexMapChanged = function() {
	            this._cachedExternalNumLabels = -1;
	            this._cachedExternalLabelMap = null;

	            this.notifyLabelIndexMapChanged();
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/properties/ObservableArrayProperty":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var ArrayProperty = __webpack_require__("contrib/jg_lib/properties/ArrayProperty");
		var MObservableProperty = __webpack_require__("contrib/jg_lib/properties/MObservableProperty");
		var Class = __webpack_require__("contrib/jg_lib/Class");
		var Set = __webpack_require__("contrib/jg_lib/utils/Set");

		return Class(module.id, ArrayProperty, function(ObservableArrayProperty, base)
		{

			Class.mixin(this, MObservableProperty);

			// Private Properties

			this._defaultValueSet = null;
			this._itemChangeComparator = null;

			// Constructor

			this.constructor = function(name, itemType, defaultValue)
			{
				base.constructor.call(this, name, itemType, defaultValue);

				var defaultValueSet = this._defaultValueSet = new Set();
				if (defaultValue)
				{
					for (var i = 0, l = defaultValue.length; i < l; i++)
						defaultValueSet.add(defaultValue[i]);
				}

				this.initChangeEvent();
			};

			// Public Accessor Methods

			this.itemChangeComparator = function(value)
			{
				if (!arguments.length)
					return this._itemChangeComparator;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter itemChangeComparator must be of type Function.");

				this._itemChangeComparator = value || null;

				return this;
			};

			// Protected Methods

			this.setupContext = function(context)
			{
				base.setupContext.call(this, context);

				this.setupDependencySupport(context);
			};

			this.teardownContext = function(context)
			{
				this.teardownDependencySupport(context);

				base.teardownContext.call(this, context);
			};

			this.writeValue = function(context, value)
			{
				var oldValue = context.value;

				this.teardownDependencyChangeHandler(context);

				base.writeValue.call(this, context, value);

				if ((value != null) && (value.length > 0))
				{
					var dependencyList = [];
					var defaultValueSet = this._defaultValueSet;
					var itemValue;
					for (var i = 0, l = value.length; i < l; i++)
					{
						itemValue = value[i];
						if ((itemValue != null) && itemValue.isEventTarget && itemValue.isObservableTarget && !defaultValueSet.has(itemValue))
							dependencyList.push({ target: itemValue, event: itemValue.change });
					}
					if (dependencyList.length > 0)
						this.setupDependencyChangeHandler(context, dependencyList);
				}

				this.notifyChange(context, oldValue, value);
			};

			this.needsWrite = function(context, value)
			{
				return this.hasChange(context, context.value, value);
			};

			this.hasChange = function(context, oldValue, newValue)
			{
				var changeComparator = this.changeComparator();
				if (changeComparator)
					return changeComparator.call(context.target, oldValue, newValue) ? true : false;

				if (oldValue === newValue)
					return false;

				if ((oldValue == null) || (newValue == null))
					return true;

				var length = oldValue.length;
				if (length !== newValue.length)
					return true;

				for (var i = 0; i < length; i++)
				{
					if (this.hasItemChange(context, oldValue[i], newValue[i]))
						return true;
				}

				return false;
			};

			this.hasItemChange = function(context, oldValue, newValue)
			{
				if (this._itemChangeComparator)
					return this._itemChangeComparator.call(context.target, oldValue, newValue) ? true : false;

				// default comparison that handles NaN
				return ((oldValue !== newValue) && ((oldValue === oldValue) || (newValue === newValue)));
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/properties/ArrayProperty":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Property = __webpack_require__("contrib/jg_lib/properties/Property");
		var Class = __webpack_require__("contrib/jg_lib/Class");

		return Class(module.id, Property, function(ArrayProperty, base)
		{

			// Private Properties

			this._itemType = null;
			this._itemTypeChecker = null;
			this._itemNullValue = null;
			this._allowNull = false;
			this._itemReadFilter = null;
			this._itemWriteFilter = null;

			// Constructor

			this.constructor = function(name, itemType, defaultValue)
			{
				if ((itemType != null) && !Class.isFunction(itemType))
					throw new Error("Parameter itemType must be of type Function.");

				this._itemType = itemType || null;
				this._itemTypeChecker = itemType ? Class.getTypeChecker(itemType) : null;

				if (itemType === Number)
					this._itemNullValue = NaN;
				else if (itemType === Boolean)
					this._itemNullValue = false;
				else
					this._itemNullValue = null;

				if (defaultValue == null)
					defaultValue = [];

				// base constructor must be called after initializing _itemType so that defaultValue can be type checked
				base.constructor.call(this, name, Array, defaultValue);
			};

			// Public Accessor Methods

			this.itemType = function()
			{
				return this._itemType;
			};

			this.allowNull = function(value)
			{
				if (!arguments.length)
					return this._allowNull;

				if ((value != null) && !Class.isBoolean(value))
					throw new Error("Parameter allowNull must be of type Boolean.");

				this._allowNull = (value === true);

				return this;
			};

			this.itemReadFilter = function(value)
			{
				if (!arguments.length)
					return this._itemReadFilter;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter itemReadFilter must be of type Function.");

				this._itemReadFilter = value || null;

				return this;
			};

			this.itemWriteFilter = function(value)
			{
				if (!arguments.length)
					return this._itemWriteFilter;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter itemWriteFilter must be of type Function.");

				this._itemWriteFilter = value || null;

				return this;
			};

			// Public Methods

			this.get = function(target)
			{
				var value = base.get.call(this, target);

				var length = value ? value.length : 0;
				var itemNullValue = this._itemNullValue;
				var itemReadFilter = this._itemReadFilter;
				var itemValueList = [];
				var itemValue;
				var itemFilterValue;

				for (var i = 0; i < length; i++)
				{
					itemValue = value[i];

					if (itemReadFilter)
					{
						itemFilterValue = itemReadFilter.call(target, itemValue);
						if (itemFilterValue !== itemValue)
						{
							if (!this.isValidItemType(itemFilterValue))
								throw new Error("Value returned from itemReadFilter for property \"" + this.name() + "\" must be of type " + this.getItemTypeName() + ".");

							itemValue = itemFilterValue;
						}
					}

					if (itemValue == null)
						itemValue = itemNullValue;

					itemValueList.push(itemValue);
				}

				return itemValueList;
			};

			this.set = function(target, value)
			{
				var length = value ? value.length : 0;
				var allowNull = this._allowNull;
				var itemNullValue = this._itemNullValue;
				var itemWriteFilter = this._itemWriteFilter;
				var itemValueList = [];
				var itemValue;
				var itemFilterValue;

				for (var i = 0; i < length; i++)
				{
					itemValue = value[i];

					if (itemValue == null)
					{
						if (!allowNull)
							continue;

						itemValue = itemNullValue;
					}

					if (itemWriteFilter)
					{
						itemFilterValue = itemWriteFilter.call(target, itemValue);
						if (itemFilterValue !== itemValue)
						{
							if (!this.isValidItemType(itemFilterValue))
								throw new Error("Value returned from itemWriteFilter for property \"" + this.name() + "\" must be of type " + this.getItemTypeName() + ".");

							itemValue = itemFilterValue;
						}
					}

					itemValueList.push(itemValue);
				}

				base.set.call(this, target, itemValueList);
			};

			this.getTypeName = function()
			{
				return "Array<" + this.getItemTypeName() + ">";
			};

			this.getItemTypeName = function()
			{
				return this._itemType ? (Class.getName(this._itemType) || (this.name() + ".itemType")) : "*";
			};

			this.isValidType = function(value)
			{
				if (value == null)
					return true;

				if (!Class.isArray(value))
					return false;

				for (var i = 0, l = value.length; i < l; i++)
				{
					if (!this.isValidItemType(value[i]))
						return false;
				}

				return true;
			};

			this.isValidItemType = function(value)
			{
				return ((value == null) || !this._itemTypeChecker || this._itemTypeChecker(value));
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/utils/StringUtil":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Class = __webpack_require__("contrib/jg_lib/Class");

		return Class(module.id, function(StringUtil)
		{

			// Private Static Constants

			var _R_TRIM = /^[\s\xA0\u2028\u2029\uFEFF]+|[\s\xA0\u2028\u2029\uFEFF]+$/g;
			var _R_UNESCAPE_HTML = /&(?:(#x[a-fA-F0-9]+)|(#[0-9]+)|([a-z]+));/g;
			var _R_UNESCAPE_JS = /\\(?:(u[a-fA-F0-9]{4})|(x[a-fA-F0-9]{2})|([1-7][0-7]{0,2}|[0-7]{2,3})|([\w\W]))/g;
			var _R_AMP = /&/g;
			var _R_LT = /</g;
			var _R_GT = />/g;
			var _R_QUOT = /"/g;
			var _R_APOS = /'/g;
			var _R_BACKSLASH = /\\/g;
			var _R_NEWLINE = /[\n]/g;
			var _R_RETURN = /[\r]/g;
			var _R_TAB = /[\t]/g;
			var _R_VTAB = /[\v]/g;
			var _R_FEED = /[\f]/g;
			var _R_BACKSPACE = /[\b]/g;
			var _R_LINESEP = /[\u2028]/g;
			var _R_PARASEP = /[\u2029]/g;

			var _UNESCAPE_HTML_MAP =
			{
				"amp": "&",
				"lt": "<",
				"gt": ">",
				"quot": "\"",
				"apos": "'",
				"nbsp": "\u00A0",
				"ensp": "\u2002",
				"emsp": "\u2003",
				"thinsp": "\u2009",
				"zwnj": "\u200C",
				"zwj": "\u200D",
				"lrm": "\u200E",
				"rlm": "\u200F"
			};

			var _UNESCAPE_JS_MAP =
			{
				"b": "\b",
				"f": "\f",
				"n": "\n",
				"r": "\r",
				"t": "\t",
				"v": "\v",
				"0": "\0"
			};

			// Public Static Methods

			StringUtil.trim = function(str)
			{
				if (str == null)
					return str;

				return ("" + str).replace(_R_TRIM, "");
			};

			StringUtil.escapeHTML = function(str)
			{
				if (str == null)
					return str;

				return ("" + str)
					.replace(_R_AMP, "&amp;")
					.replace(_R_LT, "&lt;")
					.replace(_R_GT, "&gt;")
					.replace(_R_QUOT, "&quot;")
					.replace(_R_APOS, "&#39;");
			};

			StringUtil.unescapeHTML = function(str)
			{
				if (str == null)
					return str;

				return ("" + str).replace(_R_UNESCAPE_HTML, function(match)
				{
					// named character escape
					var esc = arguments[3];
					if (esc)
						return _UNESCAPE_HTML_MAP.hasOwnProperty(esc) ? _UNESCAPE_HTML_MAP[esc] : match;

					// decimal escape code
					esc = arguments[2];
					if (esc)
						return StringUtil.fromCodePoint(parseInt(esc.substring(1), 10));

					// hex escape code
					esc = arguments[1];
					if (esc)
						return StringUtil.fromCodePoint(parseInt(esc.substring(2), 16));

					return match;
				});
			};

			StringUtil.escapeJS = function(str)
			{
				if (str == null)
					return str;

				return ("" + str)
					.replace(_R_BACKSLASH, "\\\\")
					.replace(_R_QUOT, "\\\"")
					.replace(_R_APOS, "\\'")
					.replace(_R_NEWLINE, "\\n")
					.replace(_R_RETURN, "\\r")
					.replace(_R_TAB, "\\t")
					.replace(_R_VTAB, "\\v")
					.replace(_R_FEED, "\\f")
					.replace(_R_BACKSPACE, "\\b")
					.replace(_R_LINESEP, "\\u2028")
					.replace(_R_PARASEP, "\\u2029");
			};

			StringUtil.unescapeJS = function(str)
			{
				if (str == null)
					return str;

				return ("" + str).replace(_R_UNESCAPE_JS, function(match)
				{
					// single character escape
					var esc = arguments[4];
					if (esc)
						return _UNESCAPE_JS_MAP.hasOwnProperty(esc) ? _UNESCAPE_JS_MAP[esc] : esc;

					// octal escape code
					esc = arguments[3];
					if (esc)
						return StringUtil.fromCodePoint(parseInt(esc, 8));

					// hex or unicode escape code
					esc = arguments[2] || arguments[1];
					if (esc)
						return StringUtil.fromCodePoint(parseInt(esc.substring(1), 16));

					return match;
				});
			};

			StringUtil.fromCodePoint = function(codePoint)
			{
				// algorithm borrowed from punycode.js by Mathias Bynens

				var str = "";

				for (var i = 0, l = arguments.length; i < l; i++)
				{
					codePoint = +arguments[i];
					if (codePoint > 0xFFFF)
					{
						codePoint -= 0x10000;
						str += String.fromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
						codePoint = 0xDC00 | codePoint & 0x3FF;
					}
					str += String.fromCharCode(codePoint);
				}

				return str;
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/events/GenericEventData":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var EventData = __webpack_require__("contrib/jg_lib/events/EventData");
	    var ObjectUtil = __webpack_require__("contrib/jg_lib/utils/ObjectUtil");

	    return Class(module.id, EventData, function(GenericEventData, base) {

	        // Constructor

	        this.constructor = function(attributes) {
	            if (attributes != null) {
	                for (var a in attributes) {
	                    if (ObjectUtil.has(attributes, a) && !(a in this)) {
	                        this[a] = attributes[a];
	                    }
	                }
	            }
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/LatLon":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Leaflet = __webpack_require__("shim/leaflet");
	    var Class = __webpack_require__("contrib/jg_lib/Class");

	    return Class(module.id, Object, function(LatLon, base) {

	        // Public Static Methods

	        LatLon.fromLeaflet = function(latLng) {
	            return new LatLon(latLng.lat, latLng.lng);
	        };

	        // Public Properties

	        this.lat = 0;
	        this.lon = 0;

	        // Constructor

	        this.constructor = function(lat, lon) {
	            this.lat = (lat != null) ? +lat : 0;
	            this.lon = (lon != null) ? +lon : 0;
	        };

	        // Public Methods

	        this.normalize = function(center) {
	            var lat = +this.lat;
	            if (lat < -90) {
	                lat = -90;
	            } else if (lat > 90) {
	                lat = 90;
	            }

	            var centerLon = center ? center.lon : 0;
	            var lon = (this.lon - centerLon) % 360;
	            if (lon < -180) {
	                lon += 360;
	            } else if (lon > 180) {
	                lon -= 360;
	            }
	            lon += centerLon;

	            return new LatLon(lat, lon);
	        };

	        this.isFinite = function() {
	            return (((this.lat - this.lat) === 0) &&
	                    ((this.lon - this.lon) === 0));
	        };

	        this.equals = function(latLon) {
	            return ((this.lat == latLon.lat) &&
	                    (this.lon == latLon.lon));
	        };

	        this.clone = function() {
	            return new LatLon(this.lat, this.lon);
	        };

	        this.toString = function() {
	            return "(" + (+this.lat) + "," + (+this.lon) + ")";
	        };

	        this.toLeaflet = function() {
	            // Leaflet.LatLng wraps the coordinates passed to the constructor
	            // we must assign the values manually to avoid this

	            var latLng = new Leaflet.LatLng(0, 0);
	            latLng.lat = +this.lat;
	            latLng.lng = +this.lon;
	            return latLng;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/LatLonBounds":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Leaflet = __webpack_require__("shim/leaflet");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var LatLon = __webpack_require__("splunk/mapping/LatLon");

	    return Class(module.id, Object, function(LatLonBounds, base) {

	        // Public Static Methods

	        LatLonBounds.fromLeaflet = function(latLngBounds) {
	            var sw = latLngBounds.getSouthWest();
	            var ne = latLngBounds.getNorthEast();
	            return new LatLonBounds(sw.lat, sw.lng, ne.lat, ne.lng);
	        };

	        // Public Properties

	        this.s = 0;
	        this.w = 0;
	        this.n = 0;
	        this.e = 0;

	        // Constructor

	        this.constructor = function(s, w, n, e) {
	            this.s = (s != null) ? +s : 0;
	            this.w = (w != null) ? +w : 0;
	            this.n = (n != null) ? +n : 0;
	            this.e = (e != null) ? +e : 0;
	        };

	        // Public Methods

	        this.getSW = function() {
	            return new LatLon(this.s, this.w);
	        };

	        this.getSE = function() {
	            return new LatLon(this.s, this.e);
	        };

	        this.getNW = function() {
	            return new LatLon(this.n, this.w);
	        };

	        this.getNE = function() {
	            return new LatLon(this.n, this.e);
	        };

	        this.getCenter = function() {
	            return new LatLon(((+this.s) + (+this.n)) / 2, ((+this.w) + (+this.e)) / 2);
	        };

	        this.expand = function(latLon) {
	            var lat = +latLon.lat;
	            var lon = +latLon.lon;
	            var s = +this.s;
	            var w = +this.w;
	            var n = +this.n;
	            var e = +this.e;

	            if (lat < s) {
	                this.s = lat;
	            }
	            if (lat > n) {
	                this.n = lat;
	            }
	            if (lon < w) {
	                this.w = lon;
	            }
	            if (lon > e) {
	                this.e = lon;
	            }
	        };

	        this.contains = function(latLon) {
	            var lat = +latLon.lat;
	            var lon = +latLon.lon;
	            var s = +this.s;
	            var w = +this.w;
	            var n = +this.n;
	            var e = +this.e;

	            return ((lat >= s) &&
	                    (lat <= n) &&
	                    (lon >= w) &&
	                    (lon <= e));
	        };

	        this.normalize = function(center) {
	            var s = +this.s;
	            if (s < -90) {
	                s = -90;
	            } else if (s > 90) {
	                s = 90;
	            }

	            var n = +this.n;
	            if (n < s) {
	                n = s;
	            } else if (n > 90) {
	                n = 90;
	            }

	            var centerLon = center ? center.lon : 0;
	            var w = (this.w - centerLon);
	            var e = (this.e - centerLon);
	            if ((e - w) >= 360) {
	                w = -180;
	                e = 180;
	            } else {
	                w %= 360;
	                if (w < -180) {
	                    w += 360;
	                } else if (w > 180) {
	                    w -= 360;
	                }

	                e %= 360;
	                if (e < -180) {
	                    e += 360;
	                } else if (e > 180) {
	                    e -= 360;
	                }

	                if (e < w) {
	                    if (e > -w) {
	                        w -= 360;
	                    } else {
	                        e += 360;
	                    }
	                }
	            }
	            w += centerLon;
	            e += centerLon;

	            return new LatLonBounds(s, w, n, e);
	        };

	        this.isFinite = function() {
	            return (((this.s - this.s) === 0) &&
	                    ((this.w - this.w) === 0) &&
	                    ((this.n - this.n) === 0) &&
	                    ((this.e - this.e) === 0));
	        };

	        this.equals = function(bounds) {
	            return ((this.s == bounds.s) &&
	                    (this.w == bounds.w) &&
	                    (this.n == bounds.n) &&
	                    (this.e == bounds.e));
	        };

	        this.clone = function() {
	            return new LatLonBounds(this.s, this.w, this.n, this.e);
	        };

	        this.toString = function() {
	            return "(" + (+this.s) + "," + (+this.w) + "," + (+this.n) + "," + (+this.e) + ")";
	        };

	        this.toLeaflet = function() {
	            // Leaflet.LatLng wraps the coordinates passed to the constructor
	            // we must assign the values manually to avoid this

	            var sw = new Leaflet.LatLng(0, 0);
	            sw.lat = +this.s;
	            sw.lng = +this.w;

	            var ne = new Leaflet.LatLng(0, 0);
	            ne.lat = +this.n;
	            ne.lng = +this.e;

	            return new Leaflet.LatLngBounds(sw, ne);
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/controls/ControlBase":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var MPassTarget = __webpack_require__("contrib/jg_lib/async/MPassTarget");
	    var MEventTarget = __webpack_require__("contrib/jg_lib/events/MEventTarget");
	    var MListenerTarget = __webpack_require__("contrib/jg_lib/events/MListenerTarget");
	    var MObservableTarget = __webpack_require__("contrib/jg_lib/events/MObservableTarget");
	    var MPropertyTarget = __webpack_require__("contrib/jg_lib/properties/MPropertyTarget");
	    var MRenderTarget = __webpack_require__("splunk/viz/MRenderTarget");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");

	    return Class(module.id, Object, function(ControlBase, base) {

	        Class.mixin(this, MEventTarget, MListenerTarget, MObservableTarget, MPropertyTarget, MPassTarget, MRenderTarget);

	        // Public properties

	        this.isVisible = new ObservableProperty('isVisible', Boolean, true)
	            .onChange(function(e) {
	                this.invalidate('renderPass');
	            });

	        // Constructor

	        this.constructor = function() {
	            this.leafletControl = this.createLeafletControl();
	            if (!this.leafletControl) {
	                throw new Error("Value returned from createLeafletControl() must be non-null.");
	            }
	        };

	        // Public Methods

	        this.render = function() {
	        };

	        // Protected Methods

	        this.createLeafletControl = function() {
	            throw new Error("Must implement method createLeafletControl.");
	        };

	        this.onAddedToMap = function(map) {
	            this.map = map;
	        };

	        this.onRemovedFromMap = function(map) {
	            this.map = null;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/viz/MRenderTarget":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Pass = __webpack_require__("contrib/jg_lib/async/Pass");

	    return Class(module.id, function(MRenderTarget) {

	        // Public Passes

	        this.renderPass = new Pass("render", 3, "topDown");

	        // Public Methods

	        this.render = function() {
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/layers/LayerBase":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var MPassTarget = __webpack_require__("contrib/jg_lib/async/MPassTarget");
	    var MEventTarget = __webpack_require__("contrib/jg_lib/events/MEventTarget");
	    var MListenerTarget = __webpack_require__("contrib/jg_lib/events/MListenerTarget");
	    var MObservableTarget = __webpack_require__("contrib/jg_lib/events/MObservableTarget");
	    var MPropertyTarget = __webpack_require__("contrib/jg_lib/properties/MPropertyTarget");
	    var Property = __webpack_require__("contrib/jg_lib/properties/Property");
	    var FunctionUtil = __webpack_require__("contrib/jg_lib/utils/FunctionUtil");
	    var MRenderTarget = __webpack_require__("splunk/viz/MRenderTarget");

	    return Class(module.id, Object, function(LayerBase, base) {

	        Class.mixin(this, MEventTarget, MListenerTarget, MObservableTarget, MPropertyTarget, MPassTarget, MRenderTarget);

	        // Public Static Constants

	        LayerBase.METADATA_KEY = "__splunk_mapping_layers_LayerBase_metadata";

	        // Public Properties

	        this.map = new Property("map", Object, null)
	            .readOnly(true);

	        this.leafletLayer = null;

	        // Constructor

	        this.constructor = function() {
	            this._map_boundsChanged = FunctionUtil.bind(this._map_boundsChanged, this);

	            this.leafletLayer = this.createLeafletLayer();
	            if (!this.leafletLayer) {
	                throw new Error("Value returned from createLeafletLayer() must be non-null.");
	            }
	        };

	        // Public Methods

	        this.render = function() {
	            if (this.isValid("renderPass")) {
	                return;
	            }

	            var map = this.getInternal("map");
	            if (map) {
	                this.renderOverride(map);
	            }

	            this.markValid("renderPass");
	        };

	        // Protected Methods

	        this.createLeafletLayer = function() {
	            throw new Error("Must implement method createLeafletLayer.");
	        };

	        this.renderOverride = function(map) {
	        };

	        this.onAddedToMap = function(map) {
	            this.setInternal("map", map);

	            map.on("boundsChanged", this._map_boundsChanged);

	            this.invalidate("renderPass");
	        };

	        this.onRemovedFromMap = function(map) {
	            map.off("boundsChanged", this._map_boundsChanged);

	            this.setInternal("map", null);
	        };

	        // Private Methods

	        this._map_boundsChanged = function(e) {
	            this.invalidate("renderPass");
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/viz/VizBase":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var $ = __webpack_require__("shim/jquery");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var MPassTarget = __webpack_require__("contrib/jg_lib/async/MPassTarget");
	    var MEventTarget = __webpack_require__("contrib/jg_lib/events/MEventTarget");
	    var MListenerTarget = __webpack_require__("contrib/jg_lib/events/MListenerTarget");
	    var MObservableTarget = __webpack_require__("contrib/jg_lib/events/MObservableTarget");
	    var MPropertyTarget = __webpack_require__("contrib/jg_lib/properties/MPropertyTarget");
	    var Property = __webpack_require__("contrib/jg_lib/properties/Property");

	    return Class(module.id, Object, function(VizBase, base) {

	        Class.mixin(this, MEventTarget, MListenerTarget, MObservableTarget, MPropertyTarget, MPassTarget);

	        // Private Static Constants

	        var _INSTANCE_KEY = "__splunk_viz_VizBase_instance";

	        // Private Static Properties

	        var _instanceCount = 0;

	        // Public Static Methods

	        VizBase.getInstance = function(element) {
	            if (element == null) {
	                return null;
	            }

	            element = $(element);
	            if (element.length == 0) {
	                return null;
	            }

	            element = element[0];

	            var instance = element[_INSTANCE_KEY];
	            return (instance instanceof VizBase) ? instance : null;
	        };

	        // Public Properties

	        this.id = new Property("id", String, null)
	            .readOnly(true);

	        this.element = null;
	        this.$element = null;

	        // Constructor

	        this.constructor = function(html) {
	            if ((html != null) && !Class.isString(html)) {
	                throw new Error("Parameter html must be of type String.");
	            }

	            var query = $(html ? html : "<div></div>");
	            if (query.length == 0) {
	                throw new Error("Parameter html must be valid markup.");
	            }

	            var id = "splunk-viz-VizBase-" + (++_instanceCount);

	            this.element = query[0];
	            //this.element[_INSTANCE_KEY] = this;
	            //this.element.id = id;

	            this.$element = $(this.element);

	            this.setInternal("id", id);

	            this.addStyleClass("splunk-viz-VizBase");
	        };

	        // Public Methods

	        this.addStyleClass = function(styleClass) {
	            this.$element.addClass(styleClass);
	        };

	        this.removeStyleClass = function(styleClass) {
	            this.$element.removeClass(styleClass);
	        };

	        this.setStyle = function(style) {
	            this.$element.css(style);
	        };

	        this.appendTo = function(parentElement) {
	            if (parentElement == null) {
	                throw new Error("Parameter parentElement must be non-null.");
	            }

	            if (parentElement instanceof VizBase) {
	                parentElement = parentElement.element;
	            }

	            parentElement = $(parentElement);
	            if (parentElement.length == 0) {
	                return;
	            }

	            parentElement = parentElement[0];

	            var oldParent = this.element.parentNode;
	            if (oldParent && (oldParent !== parentElement)) {
	                this.onRemove();
	            }

	            parentElement.appendChild(this.element);

	            if (oldParent !== parentElement) {
	                this.onAppend();
	            }
	        };

	        this.replace = function(element) {
	            if (element == null) {
	                throw new Error("Parameter element must be non-null.");
	            }

	            if (element instanceof VizBase) {
	                element = element.element;
	            }

	            element = $(element);
	            if (element.length == 0) {
	                return;
	            }

	            element = element[0];

	            var parentElement = element.parentNode;
	            if (parentElement == null) {
	                return;
	            }

	            var oldParent = this.element.parentNode;
	            if (oldParent && (oldParent !== parentElement)) {
	                this.onRemove();
	            }

	            parentElement.replaceChild(this.element, element);

	            if (oldParent !== parentElement) {
	                this.onAppend();
	            }
	        };

	        this.remove = function() {
	            var element = this.element;
	            var parentElement = element.parentNode;
	            if (!parentElement) {
	                return;
	            }

	            this.onRemove();

	            parentElement.removeChild(element);
	        };

	        this.dispose = function() {
	            this.remove();

	            this.listenOff();
	            this.off();
	            this.markValid();

	            // ensure all jquery data and events are removed
	            this.$element.remove();
	        };

	        this.getValidateDepth = function() {
	            var depth = 0;
	            var parentNode = this.element.parentNode;
	            while (parentNode) {
	                depth++;
	                parentNode = parentNode.parentNode;
	            }
	            return depth;
	        };

	        // Protected Methods

	        this.onAppend = function() {
	        };

	        this.onRemove = function() {
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/layers/ChoroplethLayer":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var _ = __webpack_require__("require/underscore");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Pass = __webpack_require__("contrib/jg_lib/async/Pass");
	    var Event = __webpack_require__("contrib/jg_lib/events/Event");
	    var EventData = __webpack_require__("contrib/jg_lib/events/EventData");
	    var Rectangle = __webpack_require__("contrib/jg_lib/geom/Rectangle");
	    var Color = __webpack_require__("contrib/jg_lib/graphics/Color");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var NumberUtil = __webpack_require__("contrib/jg_lib/utils/NumberUtil");
	    var ObjectUtil = __webpack_require__("contrib/jg_lib/utils/ObjectUtil");
	    var LatLon = __webpack_require__("splunk/mapping/LatLon");
	    var LatLonBounds = __webpack_require__("splunk/mapping/LatLonBounds");
	    var BaseAxis = __webpack_require__("splunk/mapping/axis/BaseAxis");
	    var LayerBase = __webpack_require__("splunk/mapping/layers/LayerBase");
	    var VectorLayerBase = __webpack_require__("splunk/mapping/layers/VectorLayerBase");
	    var ColorPalette = __webpack_require__("splunk/palettes/ColorPalette");
	    var ListColorPalette = __webpack_require__("splunk/palettes/ListColorPalette");
	    var DataUtil = __webpack_require__("splunk/utils/DataUtil");
	    var Path = __webpack_require__("splunk/vectors/Path");
	    var MDataTarget = __webpack_require__("splunk/viz/MDataTarget");

	    return Class(module.id, VectorLayerBase, function(ChoroplethLayer, base) {

	        Class.mixin(this, MDataTarget);

	        // Private Static Constants

	        var _NULL_POLYGON_COLOR = 0xd1d1d1;

	        // Public Passes

	        this.computeContainedRangePass = new Pass("computeContainedRange", 0.111);

	        // Public Events

	        this.rendered = new Event("rendered", EventData);

	        // Public Properties

	        this.axis = new ObservableProperty("axis", BaseAxis, null)
	            .onChange(function(e) {
	                if (e.target === this) {
	                    if (e.oldValue) {
	                        e.oldValue.unregister(this);
	                    }
	                    if (e.newValue) {
	                        e.newValue.register(this);
	                    }
	                    this.invalidate("processDataPass");
	                    this.invalidate("computeContainedRangePass");
	                } else if (e.property && (e.property === e.target.preliminaryMinimum || e.property === e.target.preliminaryMaximum)) {
	                    this.invalidate("computeContainedRangePass");
	                } else if (e.property && (e.property === e.target.extendedMinimum || e.property === e.target.extendedMaximum)) {
	                    this.invalidate("renderDataPass");
	                } else if (e.property && (e.property === e.target.actualMinimum || e.property === e.target.actualMaximum)) {
	                    this.invalidate("renderPass");
	                }
	            });

	        this.bins = new ObservableProperty("bins", Number, 5)
	            .writeFilter(function(value) {
	                return !isNaN(value) ? Math.min(Math.max(Math.floor(value), 1), 9) : 5;
	            })
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.neutralPoint = new ObservableProperty("neutralPoint", Number, NaN)
	            .writeFilter(function(value) {
	                return ((value > -Infinity) && (value < Infinity)) ? value : NaN;
	            })
	            .onChange(function(e) {
	                this.invalidate("computeContainedRangePass");
	            });

	        this.colorPalette = new ObservableProperty("colorPalette", ColorPalette, null)
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.shapeOpacity = new ObservableProperty("shapeOpacity", Number, 0.75)
	            .writeFilter(function(value) {
	                if (isNaN(value)) {
	                    return 0.75;
	                }
	                return (value >= 0) ? Math.min(value, 1) : 0;
	            })
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.borderColor = new ObservableProperty("borderColor", Color, Color.fromNumber(0xE9E9E9))
	            .readFilter(function(value) {
	                return value.clone();
	            })
	            .writeFilter(function(value) {
	                return value ? value.clone().normalize() : Color.fromNumber(0xE9E9E9);
	            })
	            .changeComparator(function(oldValue, newValue) {
	                return !oldValue.equals(newValue);
	            })
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.borderOpacity = new ObservableProperty("borderOpacity", Number, 0.75)
	            .writeFilter(function(value) {
	                if (isNaN(value)) {
	                    return 0.75;
	                }
	                return (value >= 0) ? Math.min(value, 1) : 0;
	            })
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.borderWidth = new ObservableProperty("borderWidth", Number, 1)
	            .writeFilter(function(value) {
	                return (value < Infinity) ? Math.max(value, 0) : 0;
	            })
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.showDensity = new ObservableProperty("showDensity", Boolean, false)
	            .onChange(function(e) {
	                this.invalidate("processDataPass");
	            });

	        this.wrapX = new ObservableProperty("wrapX", Boolean, true)
	            .onChange(function(e) {
	                this.invalidate("renderPass");
	            });

	        this.wrapY = new ObservableProperty("wrapY", Boolean, false)
	            .onChange(function(e) {
	                this.invalidate("renderPass");
	            });

	        this.featureIdFieldName = new ObservableProperty("featureIdFieldName", String, "")
	            .onChange(function(e) {
	                this.invalidate("processDataPass");
	            });

	        this.selectedField = new ObservableProperty("selectedField", String, null)
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        // Private Properties

	        this._colorPalette = null;
	        this._polygonMap = null;
	        this._polygonList = null;
	        this._labelValues = [];

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this);

	            this._polygonMap = {};
	            this._polygonList = [];
	        };

	        // Public Methods

	        this.getLatLonBounds = function(center) {
	            if ((center != null) && !(center instanceof LatLon)) {
	                throw new Error("Parameter center must be of type " + Class.getName(LatLon) + ".");
	            }

	            this.validate();

	            var bounds = new LatLonBounds(Infinity, Infinity, -Infinity, -Infinity);

	            var polygonList = this._polygonList;
	            var polygon;
	            var polygonBounds;
	            for (var i = 0, l = polygonList.length; i < l; i++) {
	                polygon = polygonList[i];
	                polygonBounds = polygon.getLatLonBounds();
	                bounds.expand(polygonBounds.getSW().normalize(center));
	                bounds.expand(polygonBounds.getNE().normalize(center));
	            }

	            return bounds.isFinite() ? bounds : null;
	        };

	        // Protected Methods

	        this.processDataOverride = function(data, fields) {
	            this.invalidate("renderPass");

	            var oldPolygonMap = this._polygonMap;
	            var newPolygonMap = this._polygonMap = {};
	            var polygonList = this._polygonList = [];
	            var i, l, p;

	            var numRows = data.length;
	            var numFields = fields.length;
	            var counts = [];
	            var axis = this.getInternal("axis");
	            if ((numRows > 0) && (numFields > 1)) {
	                var showDensity = this.getInternal("showDensity");
	                var vectorContainer = this.vectorContainer;

	                // We want to decouple the feature name from the ordering of the fields, this gives us the
	                // flexibility to render without feature names (e.g. from the output of geostats) and to support
	                // user-specified feature id field names
	                var fieldName = this.getInternal("featureIdFieldName");
	                var fieldsWithoutFeatureId = fieldName ? _(fields).without(fieldName) : fields;
	                var fieldCount = fieldsWithoutFeatureId[0];
	                var fieldGeom = fieldsWithoutFeatureId[1];
	                var fieldArea = (showDensity && (fieldsWithoutFeatureId.length > 2)) ? fieldsWithoutFeatureId[2] : null;
	                var obj;
	                var polygonId;
	                var valueGeom;
	                var valueCount;
	                var valueArea;

	                var polygon;

	                // create or reuse polygons
	                for (i = 0; i < numRows; i++) {
	                    obj = data[i];
	                    if (obj == null) {
	                        continue;
	                    }

	                    valueGeom = obj[fieldGeom];
	                    polygonId = fieldName ? obj[fieldName] : valueGeom;
	                    valueCount = (obj[fieldCount] != null) ? obj[fieldCount] : "NULL";
	                    counts.push(valueCount);
	                    valueArea = fieldArea ? DataUtil.parseNumber(obj[fieldArea]) : 0;

	                    polygon = oldPolygonMap[polygonId];
	                    // The geometry definition for a given polygon can change either due to clipping or smoothing by the back end.
	                    // If the GeoJSON has changed since the polygon was created, destroy it and create a new one.
	                    if (polygon && polygon.geom !== valueGeom) {
	                        polygon.dispose();
	                        polygon = null;
	                        delete oldPolygonMap[polygonId];
	                    }
	                    if (!polygon) {
	                        polygon = MultiPolygon.fromJSON(valueGeom);
	                        if (!polygon) {
	                            continue;
	                        }

	                        polygon.appendTo(vectorContainer);
	                    }

	                    delete oldPolygonMap[polygonId];
	                    newPolygonMap[polygonId] = polygon;
	                    polygonList.push(polygon);

	                    polygon.data = obj;
	                    polygon.count = valueCount;
	                    polygon.geom = valueGeom;
	                    polygon.fields = fields;
	                    polygon.tooltipFields = fieldName ? [fieldName, fieldCount] : [fieldCount];
	                    polygon.valueFieldName = fieldCount;
	                }

	                if (axis) {
	                    this._labelValues = null;
	                    axis.provideContainedValues(this, counts);
	                } else {
	                    this._labelValues = counts;
	                }
	            }

	            // dispose unused polygons
	            for (p in oldPolygonMap) {
	                if (ObjectUtil.has(oldPolygonMap, p)) {
	                    oldPolygonMap[p].dispose();
	                }
	            }
	        };

	        this.computeContainedRange = function() {
	            var axis = this.get("axis");
	            if (!axis) {
	                return;
	            }

	            var preliminaryMinimum = axis.get("preliminaryMinimum");
	            var preliminaryMaximum = axis.get("preliminaryMaximum");
	            if (!_.isFinite(preliminaryMinimum) || !_.isFinite(preliminaryMaximum)) {
	                axis.provideContainedRange(this, NaN, NaN);
	                return;
	            }

	            var neutralPoint = this.getInternal("neutralPoint");
	            if (_.isNaN(neutralPoint) || (preliminaryMaximum === preliminaryMinimum && preliminaryMinimum === neutralPoint)) {
	                axis.provideContainedRange(this, NaN, NaN);
	                return;
	            }

	            var maxDataDifferenceFromNeutral = Math.max(neutralPoint - preliminaryMinimum, preliminaryMaximum - neutralPoint);
	            axis.provideContainedRange(this, neutralPoint - maxDataDifferenceFromNeutral, neutralPoint + maxDataDifferenceFromNeutral);
	        };

	        this.updateLegendLabelsOverride = function(data, fields) {
	            if (!this.getInternal("axis")) {
	                return this._labelValues;
	            } else {
	                return null;
	            }
	        };

	        this.renderDataOverride = function(data, fields, legend) {
	            var axis = this.getInternal("axis");
	            if (!axis && !legend) {
	                return;
	            }

	            var shapeOpacity = this.getInternal("shapeOpacity");
	            var borderColor = this.getInternal("borderColor");
	            var borderOpacity = this.getInternal("borderOpacity");
	            var borderWidth = this.getInternal("borderWidth");

	            var colorPalette = this.getInternal("colorPalette");
	            var polygonList = this._polygonList;
	            if (axis) {
	                var extendedMin = axis.get("extendedMinimum");
	                var extendedMax = axis.get("extendedMaximum");
	            }

	            var bins;
	            var numericBins = this.getInternal("bins");
	            var selectedField = this.get("selectedField");

	            if (axis) {
	                bins = numericBins;
	            } else {
	                bins = legend.getNumLabels();
	            }

	            var paletteSpan = Math.max(bins - 1, 0);
	            var paletteRatio;

	            var polygon, polygonCount, polygonBin, polygonSelectedCount, polygonSelectedBin;
	            for (var i = 0, l = polygonList.length; i < l; i++) {
	                polygon = polygonList[i];
	                if (!colorPalette) {
	                    polygon.fillColor(0x000000);
	                } else {
	                    if (axis) {
	                        polygonCount = axis.valueToAbsolute(polygon.count);
	                        polygonBin = Math.floor((polygonCount - extendedMin) / ((extendedMax - extendedMin) / bins));
	                        paletteRatio = (paletteSpan > 0) ? (polygonBin / paletteSpan) : 0;

	                        if (selectedField) {
	                            polygonSelectedCount = axis.valueToAbsolute(selectedField);
	                            polygonSelectedBin = Math.floor((polygonSelectedCount - extendedMin) / ((extendedMax - extendedMin) / bins));
	                            if (polygonBin === polygonSelectedBin) {
	                                polygon.fillColor((colorPalette.getItem(paletteRatio, paletteSpan, String(polygonCount)) || new Color()).toNumber());
	                            } else {
	                                polygon.fillColor(_NULL_POLYGON_COLOR);
	                            }
	                        } else {
	                            if (isNaN(polygonCount)) {
	                                polygon.fillColor(_NULL_POLYGON_COLOR);
	                            } else {
	                                polygon.fillColor((colorPalette.getItem(paletteRatio, paletteSpan, String(polygonCount)) || new Color()).toNumber());
	                            }
	                        }
	                    } else {
	                        if (selectedField) {
	                            polygonCount = polygon.count;
	                            if (polygonCount === selectedField) {
	                                polygonBin = legend.getLabelIndex(polygonCount);
	                                paletteRatio = (paletteSpan > 0) ? (polygonBin / paletteSpan) : 0;
	                                polygon.fillColor((colorPalette.getItem(paletteRatio, paletteSpan, String(polygonCount)) || new Color()).toNumber());
	                            } else {
	                                polygon.fillColor(_NULL_POLYGON_COLOR);
	                            }
	                        } else {
	                            polygonCount = polygon.count;
	                            polygonBin = legend.getLabelIndex(polygonCount);
	                            paletteRatio = (paletteSpan > 0) ? (polygonBin / paletteSpan) : 0;
	                            polygon.fillColor((colorPalette.getItem(paletteRatio, paletteSpan, String(polygonCount)) || new Color()).toNumber());
	                        }
	                    }
	                }
	                polygon.fillOpacity(shapeOpacity);

	                if (borderWidth > 0) {
	                    polygon.strokeColor(borderColor.toNumber());
	                    polygon.strokeOpacity(borderOpacity);
	                    polygon.strokeWidth(borderWidth);
	                } else {
	                    polygon.strokeColor(NaN);
	                    polygon.strokeOpacity(NaN);
	                    polygon.strokeWidth(NaN);
	                }
	            }
	            // If the renderPass is about to run, don't trigger a rendered event since it will happen there.
	            if (this.isValid('renderPass')) {
	                this.fire('rendered', new EventData());
	            }
	        };

	        this.renderOverride = function(map) {
	            var axis = this.getInternal("axis");
	            base.renderOverride.call(this, map);

	            var leafletMap = map.leafletMap;
	            var centerLatLng = leafletMap.getCenter();

	            var wrapX = this.getInternal("wrapX");
	            var wrapY = this.getInternal("wrapY");
	            var vectorBounds = this.vectorBounds;
	            var minX = vectorBounds.minX;
	            var minY = vectorBounds.minY;
	            var maxX = vectorBounds.maxX;
	            var maxY = vectorBounds.maxY;

	            var polygonList = this._polygonList;
	            var polygon;
	            var polygonPixelBounds;
	            var polygonCenter;
	            var polygonLatLng;
	            var polygonLatLngWrapped;
	            var polygonPoint;
	            var polygonPointWrapped;
	            var polygonOffsetX;
	            var polygonOffsetY;

	            for (var i = 0, l = polygonList.length; i < l; i++) {
	                var count = polygonList[i].count;
	                if (axis) {
	                    count = axis.absoluteToRelative(count);
	                } else {
	                    count = 0;
	                }

	                polygon = polygonList[i];
	                polygon.render(leafletMap);

	                polygonPixelBounds = polygon.getPixelBounds();
	                polygonCenter = polygon.getLatLonBounds().getCenter();
	                polygonLatLng = polygonCenter.toLeaflet();
	                polygonLatLngWrapped = polygonCenter.toLeaflet();

	                if (wrapX) {
	                    polygonLatLngWrapped.lng -= centerLatLng.lng;
	                    polygonLatLngWrapped.lng %= 360;
	                    if (polygonLatLngWrapped.lng > 180) {
	                        polygonLatLngWrapped.lng -= 360;
	                    } else if (polygonLatLngWrapped.lng < -180) {
	                        polygonLatLngWrapped.lng += 360;
	                    }
	                    polygonLatLngWrapped.lng += centerLatLng.lng;
	                }

	                if (wrapY) {
	                    polygonLatLngWrapped.lat -= centerLatLng.lat;
	                    polygonLatLngWrapped.lat %= 180;
	                    if (polygonLatLngWrapped.lat > 90) {
	                        polygonLatLngWrapped.lat -= 180;
	                    } else if (polygonLatLngWrapped.lat < -90) {
	                        polygonLatLngWrapped.lat += 180;
	                    }
	                    polygonLatLngWrapped.lat += centerLatLng.lat;
	                }

	                polygon.tooltipLatLng = polygonLatLngWrapped;

	                polygonPoint = leafletMap.latLngToLayerPoint(polygonLatLng);
	                polygonPointWrapped = leafletMap.latLngToLayerPoint(polygonLatLngWrapped);
	                polygonOffsetX = polygonPointWrapped.x - polygonPoint.x;
	                polygonOffsetY = polygonPointWrapped.y - polygonPoint.y;

	                polygon.translate(polygonOffsetX, polygonOffsetY);
	                if (((polygonOffsetX + polygonPixelBounds.x + polygonPixelBounds.width) < minX) ||
	                    ((polygonOffsetX + polygonPixelBounds.x) > maxX) ||
	                    ((polygonOffsetY + polygonPixelBounds.y + polygonPixelBounds.height) < minY) ||
	                    ((polygonOffsetY + polygonPixelBounds.y) > maxY) || (count < 0) || (count > 1)) {
	                    polygon.display("none");
	                } else {
	                    polygon.display(null);
	                }
	            }
	            this.fire('rendered', new EventData());
	        };

	        // Private Nested Classes

	        var MultiPolygon = Class(Path, function(MultiPolygon, base) {

	            // Public Static Methods

	            MultiPolygon.fromJSON = function(json) {
	                if (json == null) {
	                    return null;
	                }

	                if (typeof json === "string") {
	                    json = JSON.parse(json);
	                }

	                if (!json || (json.type !== "MultiPolygon")) {
	                    return null;
	                }

	                var coordinates = json.coordinates;
	                if (!coordinates) {
	                    return null;
	                }

	                coordinates = _processCoordinates(coordinates);
	                if (!coordinates) {
	                    return null;
	                }

	                _normalizeCoordinates(coordinates);

	                return new MultiPolygon(coordinates);
	            };

	            // Private Static Methods

	            var _processCoordinates = function(coordinates, processed, path) {
	                if (!coordinates) {
	                    return null;
	                }

	                var length = coordinates.length;
	                if (!length) {
	                    return null;
	                }

	                if (!processed) {
	                    processed = [];
	                }

	                if ((length === 2) && (typeof coordinates[0] === "number") && (typeof coordinates[1] === "number")) {
	                    // GeoJSON coordinate order is longitude, latitude
	                    if (!path) {
	                        processed.push([new LatLon(coordinates[1], coordinates[0])]);
	                    } else {
	                        path.push(new LatLon(coordinates[1], coordinates[0]));
	                    }
	                } else {
	                    path = [];
	                    for (var i = 0; i < length; i++) {
	                        _processCoordinates(coordinates[i], processed, path);
	                    }
	                    if (path.length > 0) {
	                        processed.push(path);
	                    }
	                }

	                return (processed.length > 0) ? processed : null;
	            };

	            var _normalizeCoordinates = function(coordinates) {
	                var length = coordinates.length;
	                var path;
	                var latLon;
	                var ci, cl;
	                var pi, pl;

	                var lonSum = 0;
	                var lonCount = 0;

	                for (ci = 0; ci < length; ci++) {
	                    path = coordinates[ci];
	                    for (pi = 0, pl = path.length; pi < pl; pi++) {
	                        latLon = path[pi];
	                        lonSum += latLon.lon;
	                        lonCount++;
	                    }
	                }

	                var lonAvg = lonSum / lonCount;

	                for (ci = 0; ci < length; ci++) {
	                    path = coordinates[ci];
	                    latLon = path[0];
	                    if ((latLon.lon - lonAvg) > 180) {
	                        for (pi = 0, pl = path.length; pi < pl; pi++) {
	                            latLon = path[pi];
	                            latLon.lon -= 360;
	                        }
	                    } else if ((latLon.lon - lonAvg) < -180) {
	                        for (pi = 0, pl = path.length; pi < pl; pi++) {
	                            latLon = path[pi];
	                            latLon.lon += 360;
	                        }
	                    }
	                }
	            };

	            // Public Properties

	            this.magnitude = 0;
	            this.scale = 0;
	            this.data = null;
	            this.fields = null;
	            this.tooltipFields = null;
	            this.tooltipLatLng = null;
	            this.tooltipOffsetRadius = 0;

	            // Private Properties

	            this._coordinates = null;
	            this._bounds = null;
	            this._boundsPixels = new Rectangle(NaN, NaN, NaN, NaN);

	            // Constructor

	            this.constructor = function(coordinates) {
	                if (coordinates == null) {
	                    throw new Error("Parameter coordinates must be non-null.");
	                }

	                base.constructor.call(this);

	                this._coordinates = coordinates;

	                this.element[LayerBase.METADATA_KEY] = this;
	            };

	            // Public Methods

	            this.getLatLonBounds = function() {
	                var bounds = this._bounds;
	                if (!bounds) {
	                    bounds = this._bounds = new LatLonBounds(Infinity, Infinity, -Infinity, -Infinity);

	                    var coordinates = this._coordinates;
	                    var path;
	                    var ci, cl;
	                    var pi, pl;

	                    for (ci = 0, cl = coordinates.length; ci < cl; ci++) {
	                        path = coordinates[ci];
	                        for (pi = 0, pl = path.length; pi < pl; pi++) {
	                            bounds.expand(path[pi]);
	                        }
	                    }
	                }
	                return bounds;
	            };

	            this.getPixelBounds = function() {
	                return this._boundsPixels;
	            };

	            this.render = function(leafletMap) {
	                var coordinates = this._coordinates;
	                var bounds = this.getLatLonBounds();
	                var pointPixelsNW = leafletMap.latLngToLayerPoint(bounds.getNW().toLeaflet());
	                var pointPixelsSE = leafletMap.latLngToLayerPoint(bounds.getSE().toLeaflet());
	                var boundsPixels = new Rectangle(pointPixelsNW.x, pointPixelsNW.y, pointPixelsSE.x - pointPixelsNW.x, pointPixelsSE.y - pointPixelsNW.y);
	                if (boundsPixels.equals(this._boundsPixels)) {
	                    return;
	                }

	                this._boundsPixels = boundsPixels;

	                var path;
	                var point0;
	                var pointI;
	                var ci, cl;
	                var pi, pl;

	                this.beginPath();
	                for (ci = 0, cl = coordinates.length; ci < cl; ci++) {
	                    path = coordinates[ci];
	                    point0 = leafletMap.latLngToLayerPoint(path[0].toLeaflet());
	                    this.moveTo(point0.x, point0.y);
	                    for (pi = 1, pl = path.length; pi < pl; pi++) {
	                        pointI = leafletMap.latLngToLayerPoint(path[pi].toLeaflet());
	                        this.lineTo(pointI.x, pointI.y);
	                    }
	                    this.lineTo(point0.x, point0.y);
	                }
	                this.endPath();
	            };

	            this.dispose = function() {
	                this.element[LayerBase.METADATA_KEY] = null;

	                base.dispose.call(this);
	            };

	        });

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/geom/Rectangle":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Class = __webpack_require__("contrib/jg_lib/Class");
		var NumberUtil = __webpack_require__("contrib/jg_lib/utils/NumberUtil");

		return Class(module.id, Object, function(Rectangle, base)
		{

			// Private Static Constants

			var _R_PAREN_CONTENTS = /^\s*\(?([^\)]+)\)?\s*$/;

			// Public Static Methods

			Rectangle.interpolate = function(rectangle1, rectangle2, ratio)
			{
				var x = NumberUtil.interpolate(rectangle1.x, rectangle2.x, ratio);
				var y = NumberUtil.interpolate(rectangle1.y, rectangle2.y, ratio);
				var width = NumberUtil.interpolate(rectangle1.width, rectangle2.width, ratio);
				var height = NumberUtil.interpolate(rectangle1.height, rectangle2.height, ratio);

				return new Rectangle(x, y, width, height);
			};

			Rectangle.fromArray = function(arr)
			{
				var length = arr.length;
				var x = (length > 0) ? arr[0] : 0;
				var y = (length > 1) ? arr[1] : 0;
				var width = (length > 2) ? arr[2] : 0;
				var height = (length > 3) ? arr[3] : 0;

				return new Rectangle(x, y, width, height);
			};

			Rectangle.fromString = function(str)
			{
				var match = ("" + str).match(_R_PAREN_CONTENTS);
				if (match)
					return Rectangle.fromArray(match[1].split(","));

				return new Rectangle();
			};

			// Public Properties

			this.x = 0;
			this.y = 0;
			this.width = 0;
			this.height = 0;

			// Constructor

			this.constructor = function(x, y, width, height)
			{
				this.x = (x != null) ? +x : 0;
				this.y = (y != null) ? +y : 0;
				this.width = (width != null) ? +width : 0;
				this.height = (height != null) ? +height : 0;
			};

			// Public Methods

			this.hasNaN = function()
			{
				return (isNaN(this.x) ||
				        isNaN(this.y) ||
				        isNaN(this.width) ||
				        isNaN(this.height));
			};

			this.hasInfinity = function()
			{
				return ((this.x == Infinity) || (this.x == -Infinity) ||
				        (this.y == Infinity) || (this.y == -Infinity) ||
				        (this.width == Infinity) || (this.width == -Infinity) ||
				        (this.height == Infinity) || (this.height == -Infinity));
			};

			this.isFinite = function()
			{
				return (((this.x - this.x) === 0) &&
				        ((this.y - this.y) === 0) &&
				        ((this.width - this.width) === 0) &&
				        ((this.height - this.height) === 0));
			};

			this.approxEquals = function(rectangle, threshold)
			{
				return (NumberUtil.approxEqual(this.x, rectangle.x, threshold) &&
				        NumberUtil.approxEqual(this.y, rectangle.y, threshold) &&
				        NumberUtil.approxEqual(this.width, rectangle.width, threshold) &&
				        NumberUtil.approxEqual(this.height, rectangle.height, threshold));
			};

			this.equals = function(rectangle)
			{
				return ((this.x == rectangle.x) &&
				        (this.y == rectangle.y) &&
				        (this.width == rectangle.width) &&
				        (this.height == rectangle.height));
			};

			this.clone = function()
			{
				return new Rectangle(this.x, this.y, this.width, this.height);
			};

			this.toArray = function()
			{
				return [ +this.x, +this.y, +this.width, +this.height ];
			};

			this.toString = function()
			{
				return "(" + (+this.x) + "," + (+this.y) + "," + (+this.width) + "," + (+this.height) + ")";
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/axis/BaseAxis":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var MPassTarget = __webpack_require__("contrib/jg_lib/async/MPassTarget");
	    var Pass = __webpack_require__("contrib/jg_lib/async/Pass");
	    var ChainedEvent = __webpack_require__("contrib/jg_lib/events/ChainedEvent");
	    var EventData = __webpack_require__("contrib/jg_lib/events/EventData");
	    var MEventTarget = __webpack_require__("contrib/jg_lib/events/MEventTarget");
	    var MListenerTarget = __webpack_require__("contrib/jg_lib/events/MListenerTarget");
	    var MObservableTarget = __webpack_require__("contrib/jg_lib/events/MObservableTarget");
	    var MPropertyTarget = __webpack_require__("contrib/jg_lib/properties/MPropertyTarget");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var Map = __webpack_require__("contrib/jg_lib/utils/Map");

	    return Class(module.id, Object, function(BaseAxis, base) {

	        Class.mixin(this, MEventTarget, MListenerTarget, MObservableTarget, MPropertyTarget, MPassTarget);

	        // Public Passes

	        this.processContainedValuesPass = new Pass("processContainedValues", 0.11);
	        this.processContainedRangePass = new Pass("processContainedRange", 0.12);
	        this.processExtendedRangePass = new Pass("processExtendedRange", 0.13);
	        this.processActualRangePass = new Pass("processActualRange", 0.14);

	        // Public Events

	        this.absoluteMapChanged = new ChainedEvent("absoluteMapChanged", this.change);
	        this.relativeMapChanged = new ChainedEvent("relativeMapChanged", this.change);

	        // Public Properties

	        this.minimum = new ObservableProperty("minimum", Number, NaN)
	            .writeFilter(function(value) {
	                return ((value > -Infinity) && (value < Infinity)) ? value : NaN;
	            })
	            .onChange(function(e) {
	                    this.invalidate("processActualRangePass");
	            });

	        this.maximum = new ObservableProperty("maximum", Number, NaN)
	            .writeFilter(function(value) {
	                return ((value > -Infinity) && (value < Infinity)) ? value : NaN;
	            })
	            .onChange(function(e) {
	                this.invalidate("processActualRangePass");
	            });

	        this.preliminaryMinimum = new ObservableProperty("preliminaryMinimum", Number, Infinity)
	            .readOnly(true);

	        this.preliminaryMaximum = new ObservableProperty("preliminaryMaximum", Number, -Infinity)
	            .readOnly(true);

	        this.containedMinimum = new ObservableProperty("containedMinimum", Number,Infinity)
	            .readOnly(true);

	        this.containedMaximum = new ObservableProperty("containedMaximum", Number, -Infinity)
	            .readOnly(true);

	        this.extendedMinimum = new ObservableProperty("extendedMinimum", Number, Infinity)
	            .readOnly(true);

	        this.extendedMaximum = new ObservableProperty("extendedMaximum", Number, -Infinity)
	            .readOnly(true);

	        this.actualMinimum = new ObservableProperty("actualMinimum", Number, Infinity)
	            .readOnly(true);

	        this.actualMaximum = new ObservableProperty("actualMaximum", Number, -Infinity)
	            .readOnly(true);

	        // Private Properties

	        this._vizStore = null;
	        this._actualMaximum = 0;
	        this._actualMinimum = 0;

	        // Constructor

	        this.constructor = function() {
	            this._vizStore = new Map();
	        };

	        // Public Methods

	        this.register = function(key) {
	            if (!this._vizStore.has(key)) {
	                this._vizStore.set(key, {values: [], extendedRange: {absolute1: NaN, absolute2: NaN}, containedRange: {absolute1: NaN, absolute2: NaN}});
	            }
	        };

	        this.unregister = function(key) {
	            if (this._vizStore.has(key)) {
	                this._vizStore.del(key);
	                this.invalidate(this.processContainedRangePass);
	            }
	        };

	        this.provideContainedValues = function(key, values) {
	            var viz = this._vizStore.get(key);
	            if (viz) {
	                //store copy of values, create copy using slice
	                viz.values = values.slice();
	                this._vizStore.set(key, viz);
	                this.invalidate(this.processContainedValuesPass);
	            }
	        };

	        this.provideContainedRange = function(key, min, max) {
	            var viz = this._vizStore.get(key);
	            if (min > max) {
	                var tempMax = max;
	                max = min;
	                min = tempMax;
	            }
	            if (viz) {
	                viz.containedRange.absolute1 = min;
	                viz.containedRange.absolute2 = max;
	                this.invalidate(this.processContainedRangePass);
	            }
	        };

	        this.provideExtendedRange = function(key, min, max) {
	            var viz = this._vizStore.get(key);
	            if (min > max) {
	                var tempMax = max;
	                max = min;
	                min = tempMax;
	            }
	            if (viz) {
	                viz.extendedRange.absolute1 = min;
	                viz.extendedRange.absolute2 = max;
	                this.invalidate(this.processExtendedRangePass);
	            }
	        };

	        this.processContainedValues = function() {
	            var i,
	                visualizations = this._vizStore.values(),
	                values = [],
	                preliminaryMinimum = Infinity,
	                preliminaryMaximum = -Infinity;

	            for (i = 0; i < visualizations.length; i++) {
	                values = values.concat(visualizations[i].values);
	            }
	            values = this.processValues(values);
	            for (i = 0; i < values.length; i++) {
	                var currentValue = this.valueToAbsolute(values[i]);
	                if (currentValue < preliminaryMinimum) {
	                    preliminaryMinimum = currentValue;
	                }
	                if (currentValue  > preliminaryMaximum) {
	                    preliminaryMaximum = currentValue;
	                }
	            }
	            this.setInternal("preliminaryMinimum", preliminaryMinimum);
	            this.setInternal("preliminaryMaximum", preliminaryMaximum);
	            this.invalidate("processContainedRangePass");
	        };

	        this.processContainedRange = function() {
	            var previousComputedMinimum = this.getInternal("preliminaryMinimum"),
	                previousComputedMaximum = this.getInternal("preliminaryMaximum"),
	                values = this._vizStore.values();
	            for (var i = 0; i < values.length; i++) {
	                if (values[i].containedRange.absolute1 < previousComputedMinimum) {
	                    previousComputedMinimum = values[i].containedRange.absolute1;
	                }
	                if (values[i].containedRange.absolute2 > previousComputedMaximum) {
	                    previousComputedMaximum = values[i].containedRange.absolute2;
	                }
	            }
	            this.setInternal("containedMaximum", previousComputedMaximum);
	            this.setInternal("containedMinimum", previousComputedMinimum);
	            this.invalidate("processExtendedRangePass");
	        };

	        this.processExtendedRange = function() {
	            var previousContainedMinimum = this.getInternal("containedMinimum"),
	                previousContainedMaximum = this.getInternal("containedMaximum"),
	                values = this._vizStore.values();

	            for (var i = 0; i < values.length; i++) {
	                if (values[i].extendedRange.absolute1 < previousContainedMinimum) {
	                    previousContainedMinimum = values[i].extendedRange.absolute1;
	                }
	                if (values[i].extendedRange.absolute2 > previousContainedMaximum) {
	                    previousContainedMaximum = values[i].extendedRange.absolute2;
	                }
	            }

	            this.setInternal("extendedMinimum", previousContainedMinimum);
	            this.setInternal("extendedMaximum", previousContainedMaximum);
	            this.invalidate("processActualRangePass");
	        };

	        this.processActualRange = function() {
	            var minimum = this.getInternal("minimum"),
	                maximum = this.getInternal("maximum"),
	                previousMin = this._actualMinimum,
	                previousMax = this._actualMaximum;
	            if (isNaN(minimum)) {
	                minimum = this.getInternal("extendedMinimum");
	            }
	            if (isNaN(maximum)) {
	                maximum = this.getInternal("extendedMaximum");
	            }
	            this._actualMinimum = minimum;
	            this._actualMaximum = maximum;

	            this.setInternal("actualMaximum", maximum);
	            this.setInternal("actualMinimum", minimum);

	            if (this._actualMaximum !== previousMax || this._actualMinimum !== previousMin) {
	                this.fire("relativeMapChanged", new EventData());
	            }
	        };

	        this.valueToAbsolute = function(value) {
	            throw new Error("Must implement valueToAbsolute method");
	        };

	        this.absoluteToValue = function(absolute) {
	            throw new Error("Must implement absoluteToValue method");
	        };

	        this.absoluteToRelative = function(absVal) {
	            if (this._actualMaximum === this._actualMinimum) {
	                return 0;
	            }
	            return (absVal - this._actualMinimum)/(this._actualMaximum - this._actualMinimum);
	        };

	        this.relativeToAbsolute = function(relativeVal) {
	            return relativeVal * (this._actualMaximum - this._actualMinimum) + this._actualMinimum;
	        };

	        // Protected Methods

	        this.processValues = function(values) {
	            throw new Error("Must implement processValues mehod");
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/layers/VectorLayerBase":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Leaflet = __webpack_require__("shim/leaflet");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Rectangle = __webpack_require__("contrib/jg_lib/geom/Rectangle");
	    var FunctionUtil = __webpack_require__("contrib/jg_lib/utils/FunctionUtil");
	    var LayerBase = __webpack_require__("splunk/mapping/layers/LayerBase");
	    var Group = __webpack_require__("splunk/vectors/Group");
	    var Viewport = __webpack_require__("splunk/vectors/Viewport");

	    return Class(module.id, LayerBase, function(VectorLayerBase, base) {

	        // Public Properties

	        this.vectorContainer = null;
	        this.vectorBounds = null;

	        // Private Properties

	        this._isZooming = false;

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this);

	            this._leafletMap_move = FunctionUtil.bind(this._leafletMap_move, this);
	            this._leafletMap_zoomstart = FunctionUtil.bind(this._leafletMap_zoomstart, this);
	            this._leafletMap_zoomend = FunctionUtil.bind(this._leafletMap_zoomend, this);

	            this.vectorContainer = this.leafletLayer.vectorContainer;
	            this.vectorBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
	        };

	        // Protected Methods

	        this.createLeafletLayer = function() {
	            return new LeafletVectorLayer();
	        };

	        this.renderOverride = function(map) {
	            if (!this._isZooming) {
	                this.vectorContainer.display(null);
	            }
	        };

	        this.onAddedToMap = function(map) {
	            base.onAddedToMap.call(this, map);

	            var leafletMap = map.leafletMap;
	            if (this.vectorContainer.hasSVG) {
	                leafletMap.on("move", this._leafletMap_move);
	            } else {
	                leafletMap.on("moveend", this._leafletMap_move);
	            }
	            leafletMap.on("viewreset", this._leafletMap_move);
	            leafletMap.on("zoomstart", this._leafletMap_zoomstart);
	            leafletMap.on("zoomend", this._leafletMap_zoomend);

	            this.vectorBounds = leafletMap._vectorLayerBounds;

	            this.vectorContainer.display("none");
	        };

	        this.onRemovedFromMap = function(map) {
	            var leafletMap = map.leafletMap;
	            if (this.vectorContainer.hasSVG) {
	                leafletMap.off("move", this._leafletMap_move);
	            } else {
	                leafletMap.off("moveend", this._leafletMap_move);
	            }
	            leafletMap.off("viewreset", this._leafletMap_move);
	            leafletMap.off("zoomstart", this._leafletMap_zoomstart);
	            leafletMap.off("zoomend", this._leafletMap_zoomend);

	            this.vectorBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

	            base.onRemovedFromMap.call(this, map);
	        };

	        // Private Methods

	        this._leafletMap_move = function(e) {
	            this.invalidate("renderPass");
	        };

	        this._leafletMap_zoomstart = function(e) {
	            this._isZooming = true;

	            this.vectorContainer.display("none");
	        };

	        this._leafletMap_zoomend = function(e) {
	            this._isZooming = false;

	            this.invalidate("renderPass");
	        };

	        // Private Nested Classes

	        var LeafletVectorLayer = Leaflet.Class.extend({

	            includes: [Leaflet.Mixin.Events],

	            options: {
	                clickable: true
	            },

	            vectorContainer: null,

	            initialize: function (options) {
	                Leaflet.Util.setOptions(this, options);

	                this.vectorContainer = new Group();
	            },

	            onAdd: function (map) {
	                this._map = map;

	                map._initVectorLayerViewport();

	                this.vectorContainer.appendTo(map._vectorLayerViewport);
	            },

	            onRemove: function (map) {
	                this._map = null;

	                this.vectorContainer.remove();
	            }

	        });

	        Leaflet.Map.include({

	            _initVectorLayerViewport: function () {
	                if (this._vectorLayerRoot) {
	                    return;
	                }

	                var root = this._vectorLayerRoot = document.createElement("div");
	                root.style.position = "absolute";
	                this._panes.overlayPane.appendChild(root);

	                var viewport = this._vectorLayerViewport = new Viewport();
	                viewport.appendTo(root);

	                this._vectorLayerBounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

	                if (viewport.hasSVG) {
	                    this.on("move", this._updateVectorLayerBounds);
	                } else {
	                    this.on("moveend", this._updateVectorLayerBounds);
	                }
	                this._updateVectorLayerBounds();
	            },

	            _updateVectorLayerBounds: function () {
	                var root = this._vectorLayerRoot,
	                    viewport = this._vectorLayerViewport,
	                    bounds = this._vectorLayerBounds,
	                    padding = viewport.hasSVG ? 0 : 0.5,
	                    size = this.getSize(),
	                    panePos = Leaflet.DomUtil.getPosition(this._mapPane),
	                    min = panePos.multiplyBy(-1)._subtract(size.multiplyBy(padding)),
	                    max = min.add(size.multiplyBy(1 + padding * 2)),
	                    width = max.x - min.x,
	                    height = max.y - min.y;

	                bounds.minX = min.x;
	                bounds.minY = min.y;
	                bounds.maxX = max.x;
	                bounds.maxY = max.y;

	                Leaflet.DomUtil.setPosition(root, min);
	                viewport.width(width);
	                viewport.height(height);
	                viewport.viewBox(new Rectangle(min.x, min.y, width, height));
	            }

	        });

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/vectors/Group":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var VectorElement = __webpack_require__("splunk/vectors/VectorElement");

	    return Class(module.id, VectorElement, function(Group, base) {

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this);
	        };

	        // Private Nested Classes

	        var SVGGroup = Class(function(SVGGroup) {

	            // Constructor

	            this.constructor = function() {
	                base.constructor.call(this, "g");
	            };

	        });

	        var VMLGroup = Class(function(VMLGroup) {

	            // Constructor

	            this.constructor = function() {
	                base.constructor.call(this, "group");

	                this.element.style.width = "1px";
	                this.element.style.height = "1px";
	                this.element.coordsize = "1,1";
	            };

	        });

	        VectorElement.mixin(this, SVGGroup, VMLGroup);

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/utils/FunctionUtil":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Class = __webpack_require__("contrib/jg_lib/Class");

		return Class(module.id, function(FunctionUtil)
		{

			// Private Static Properties

			var _slice = Array.prototype.slice;

			// Public Static Methods

			FunctionUtil.bind = function(func, scope)
			{
				if (arguments.length < 3)
					return function() { return func.apply(scope, arguments); };

				var args = _slice.call(arguments, 2);
				return function() { return func.apply(scope, args.concat(_slice.call(arguments))); };
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/vectors/Viewport":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Rectangle = __webpack_require__("contrib/jg_lib/geom/Rectangle");
	    var VectorElement = __webpack_require__("splunk/vectors/VectorElement");
	    var VectorUtils = __webpack_require__("splunk/vectors/VectorUtils");

	    return Class(module.id, VectorElement, function(Viewport, base) {

	        // Constructor

	        this.constructor = function(width, height, viewBox, preserveAspectRatio) {
	            base.constructor.call(this);
	        };

	        // Public Methods

	        this.width = function(value) {
	            return this;
	        };

	        this.height = function(value) {
	            return this;
	        };

	        this.viewBox = function(value) {
	            return this;
	        };

	        this.preserveAspectRatio = function(value) {
	            return this;
	        };

	        this.toSVGString = function() {
	            return "";
	        };

	        // Private Nested Classes

	        var SVGViewport = Class(function(SVGViewport) {

	            // Constructor

	            this.constructor = function(width, height, viewBox, preserveAspectRatio) {
	                base.constructor.call(this, "svg");

	                this.width((width != null) ? width : 0);
	                this.height((height != null) ? height : 0);
	                if (viewBox != null) {
	                    this.viewBox(viewBox);
	                }
	                if (preserveAspectRatio != null) {
	                    this.preserveAspectRatio(preserveAspectRatio);
	                }
	            };

	            // Public Methods

	            this.appendTo = function(parentElement) {
	                if (parentElement == null) {
	                    throw new Error("Parameter parentElement must be non-null.");
	                }
	                if (parentElement.appendChild == null) {
	                    throw new Error("Parameter parentElement must be a DOM node.");
	                }

	                parentElement.appendChild(this.element);

	                return this;
	            };

	            this.width = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this.element.setAttribute("width", Math.max(value, 0));
	                } else {
	                    this.element.setAttribute("width", 0);
	                }

	                return this;
	            };

	            this.height = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this.element.setAttribute("height", Math.max(value, 0));
	                } else {
	                    this.element.setAttribute("height", 0);
	                }

	                return this;
	            };

	            this.viewBox = function(value) {
	                if (value && (value instanceof Rectangle) && value.isFinite()) {
	                    this.element.setAttribute("viewBox", value.x + " " + value.y + " " + value.width + " " + value.height);
	                } else {
	                    this.element.removeAttribute("viewBox");
	                }

	                return this;
	            };

	            this.preserveAspectRatio = function(value) {
	                if (value) {
	                    this.element.setAttribute("preserveAspectRatio", value);
	                } else {
	                    this.element.removeAttribute("preserveAspectRatio");
	                }

	                return this;
	            };

	            this.toSVGString = function() {
	                return VectorUtils.toSVGString(this.element);
	            };

	        });

	        var VMLViewport = Class(function(VMLViewport) {

	            // Private Properties

	            this._containerElement = null;
	            this._width = 0;
	            this._height = 0;
	            this._viewBox = null;

	            // Constructor

	            this.constructor = function(width, height, viewBox, preserveAspectRatio) {
	                base.constructor.call(this, "group");

	                this._containerElement = document.createElement("div");
	                this._containerElement.style.position = "relative";
	                this._containerElement.style.overflow = "hidden";
	                this._containerElement.appendChild(this.element);

	                this.width((width != null) ? width : 0);
	                this.height((height != null) ? height : 0);
	                if (viewBox != null) {
	                    this.viewBox(viewBox);
	                }
	                if (preserveAspectRatio != null) {
	                    this.preserveAspectRatio(preserveAspectRatio);
	                }
	            };

	            // Public Methods

	            this.appendTo = function(parentElement) {
	                if (parentElement == null) {
	                    throw new Error("Parameter parentElement must be non-null.");
	                }
	                if (parentElement.appendChild == null) {
	                    throw new Error("Parameter parentElement must be a DOM node.");
	                }

	                parentElement.appendChild(this._containerElement);

	                return this;
	            };

	            this.remove = function() {
	                if (this._containerElement.parentNode) {
	                    this._containerElement.parentNode.removeChild(this._containerElement);
	                }

	                return this;
	            };

	            this.dispose = function() {
	                base.dispose.call(this);

	                this._containerElement = null;
	            };

	            this.display = function(value) {
	                this._containerElement.style.display = value ? value : "";

	                return this;
	            };

	            this.visibility = function(value) {
	                this._containerElement.style.visibility = value ? value : "";

	                return this;
	            };

	            this.translate = function(x, y) {
	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? x : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? y : 0;

	                this._containerElement.style.left = (x != 0) ? x + "px" : "";
	                this._containerElement.style.top = (y != 0) ? y + "px" : "";

	                return this;
	            };

	            this.width = function(value) {
	                this._width = ((value != null) && (value < Infinity)) ? Math.max(value, 0) : 0;
	                this._updateView();

	                return this;
	            };

	            this.height = function(value) {
	                this._height = ((value != null) && (value < Infinity)) ? Math.max(value, 0) : 0;
	                this._updateView();

	                return this;
	            };

	            this.viewBox = function(value) {
	                this._viewBox = (value && (value instanceof Rectangle) && value.isFinite()) ? value.clone() : null;
	                this._updateView();

	                return this;
	            };

	            this.preserveAspectRatio = function(value) {
	                return this;
	            };

	            // Private Methods

	            this._updateView = function() {
	                var width = Math.round(this._width);
	                var height = Math.round(this._height);
	                var viewBox = this._viewBox;
	                var viewX = viewBox ? Math.round(viewBox.x) : 0;
	                var viewY = viewBox ? Math.round(viewBox.y) : 0;
	                var viewWidth = viewBox ? Math.round(Math.max(viewBox.width, 1)) : width;
	                var viewHeight = viewBox ? Math.round(Math.max(viewBox.height, 1)) : height;

	                var element = this.element;
	                var style = element.style;
	                var containerStyle = this._containerElement.style;

	                style.display = "none";  // prevent premature rendering

	                element.coordorigin = viewX + "," + viewY;
	                element.coordsize = viewWidth + "," + viewHeight;

	                style.width = width + "px";
	                style.height = height + "px";

	                containerStyle.width = width + "px";
	                containerStyle.height = height + "px";

	                style.display = "";  // enable rendering
	            };

	        });

	        VectorElement.mixin(this, SVGViewport, VMLViewport);

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/vectors/VectorUtils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");

	    return Class(module.id, function(VectorUtils) {

	        // Public Static Methods

	        VectorUtils.toSVGString = function(element) {
	            // svg elements don't have innerHTML attribute...
	            // clone svg element and place in container div so we can use innerHTML of the container
	            var clonedElement = element.cloneNode(true);
	            var containerElement = document.createElement("div");
	            containerElement.appendChild(clonedElement);

	            // get svg string using innerHTML
	            var svgString = containerElement.innerHTML;

	            // fix or add xlink namespace on href attributes
	            svgString = svgString.replace(/xlink:href=|href=/g, "x:href=");

	            // properly close image tags
	            svgString = svgString.replace(/<image([\S\s]*?)\s*\/?>\s*(<\/image>)?/g, "<image$1></image>");

	            // add xmlns attributes to root svg tag
	            svgString = svgString.replace(/^<svg/, "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:x=\"http://www.w3.org/1999/xlink\"");

	            // clear element references
	            clonedElement = null;
	            containerElement = null;

	            return svgString;
	        };

	        VectorUtils.concatSVGStrings = function(/*...*/) {
	            var concatString = "";
	            var svgString;
	            var viewBoxMatch;
	            var viewBox;
	            var width = 0;
	            var height = 0;

	            for (var i = 0, l = arguments.length; i < l; i++) {
	                svgString = arguments[i];

	                // read and parse viewBox attribute from root svg tag
	                viewBoxMatch = svgString.match(/^<svg[^>]*viewBox=\"([^ ]+) ([^ ]+) ([^ ]+) ([^\"]+)\"[^>]*>/);
	                if (viewBoxMatch && (viewBoxMatch.length == 5)) {
	                    viewBox = {
	                        x: Number(viewBoxMatch[1]),
	                        y: Number(viewBoxMatch[2]),
	                        width: Number(viewBoxMatch[3]),
	                        height: Number(viewBoxMatch[4])
	                    };

	                    // expand width and height to include viewBox
	                    width = Math.max(width, viewBox.width);
	                    height = Math.max(height, viewBox.height);
	                } else {
	                    viewBox = null;
	                }

	                // replace root svg tag with g tag, including translate transform if needed
	                if (viewBox && ((viewBox.x != 0) || (viewBox.y != 0))) {
	                    svgString = svgString.replace(/^<svg[^>]*>/, "<g transform=\"translate(" + (-viewBox.x) + ", " + (-viewBox.y) + ")\">");
	                } else {
	                    svgString = svgString.replace(/^<svg[^>]*>/, "<g>");
	                }
	                svgString = svgString.replace(/<\/svg>$/, "</g>");

	                concatString += svgString;
	            }

	            // generate new root svg tag around concatString
	            svgString = "<svg";
	            svgString += " xmlns=\"http://www.w3.org/2000/svg\"";
	            svgString += " xmlns:x=\"http://www.w3.org/1999/xlink\"";
	            svgString += " width=\"" + width + "\"";
	            svgString += " height=\"" + height + "\"";
	            svgString += " viewBox=\"0 0 " + width + " " + height + "\"";
	            svgString += ">";
	            svgString += concatString;
	            svgString += "</svg>";

	            return svgString;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/palettes/ColorPalette":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Color = __webpack_require__("contrib/jg_lib/graphics/Color");
	    var Palette = __webpack_require__("splunk/palettes/Palette");

	    return Class(module.id, Palette, function(ColorPalette, base) {

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this, Color);
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/palettes/Palette":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var MEventTarget = __webpack_require__("contrib/jg_lib/events/MEventTarget");
	    var MListenerTarget = __webpack_require__("contrib/jg_lib/events/MListenerTarget");
	    var MObservableTarget = __webpack_require__("contrib/jg_lib/events/MObservableTarget");
	    var MPropertyTarget = __webpack_require__("contrib/jg_lib/properties/MPropertyTarget");
	    var Property = __webpack_require__("contrib/jg_lib/properties/Property");
	    var NumberUtil = __webpack_require__("contrib/jg_lib/utils/NumberUtil");

	    return Class(module.id, Object, function(Palette, base) {

	        Class.mixin(this, MEventTarget, MListenerTarget, MObservableTarget, MPropertyTarget);

	        // Private Properties

	        this._itemType = null;
	        this._itemTypeChecker = null;
	        this._itemNullValue = null;
	        this._cachedProperties = null;
	        this._hasChangeListener = false;

	        // Constructor

	        this.constructor = function(itemType) {
	            if (itemType == null) {
	                throw new Error("Parameter itemType must be non-null.");
	            } else if (!Class.isFunction(itemType)) {
	                throw new Error("Parameter itemType must be of type Function.");
	            }

	            this._itemType = itemType;
	            this._itemTypeChecker = Class.getTypeChecker(itemType);

	            if (itemType === Number) {
	                this._itemNullValue = NaN;
	            } else if (itemType === Boolean) {
	                this._itemNullValue = false;
	            } else {
	                this._itemNullValue = null;
	            }
	        };

	        // Public Accessor Methods

	        this.itemType = function() {
	            return this._itemType;
	        };

	        // Public Methods

	        this.dispose = function() {
	            this.listenOff();
	            this.off();

	            this._cachedProperties = null;
	        };

	        this.getItem = function(ratio, span, value) {
	            if (ratio == null) {
	                throw new Error("Parameter ratio must be non-null.");
	            }

	            ratio = +ratio;
	            ratio = (ratio <= Infinity) ? NumberUtil.minMax(ratio, 0, 1) : 0;

	            span = (span != null) ? +span : NaN;
	            span = ((span >= 0) && (span < Infinity)) ? Math.floor(span) : NaN;

	            if (!this._cachedProperties) {
	                if (!this._hasChangeListener) {
	                    this.on("change", this._selfChange, this, Infinity);
	                    this._hasChangeListener = true;
	                }
	                this._cachedProperties = this._getProperties();
	                this.extendProperties(this._cachedProperties);
	            }

	            var item = this.getItemOverride(this._cachedProperties, ratio, span, value);
	            if (item == null) {
	                item = this._itemNullValue;
	            } else if (!this._itemTypeChecker(item)) {
	                throw new Error("Value returned from getItemOverride must be of type " + (Class.getName(this._itemType) || "itemType") + ".");
	            }

	            return item;
	        };

	        // Protected Methods

	        this.extendProperties = function(properties) {
	        };

	        this.getItemOverride = function(properties, ratio, span, value) {
	            return null;
	        };

	        // Private Methods

	        this._getProperties = function() {
	            var properties = {};
	            var property;
	            for (var p in this) {
	                property = this[p];
	                if (property instanceof Property) {
	                    properties[p] = this.getInternal(property);
	                }
	            }
	            return properties;
	        };

	        this._selfChange = function(e) {
	            this._cachedProperties = null;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/palettes/ListColorPalette":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Color = __webpack_require__("contrib/jg_lib/graphics/Color");
	    var ObservableArrayProperty = __webpack_require__("contrib/jg_lib/properties/ObservableArrayProperty");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var ColorPalette = __webpack_require__("splunk/palettes/ColorPalette");

	    return Class(module.id, ColorPalette, function(ListColorPalette, base) {

	        // Public Properties

	        this.colors = new ObservableArrayProperty("colors", Color, [])
	            .itemReadFilter(function(value) {
	                return value.clone();
	            })
	            .itemWriteFilter(function(value) {
	                return value ? value.clone().normalize() : new Color();
	            })
	            .itemChangeComparator(function(oldValue, newValue) {
	                return !oldValue.equals(newValue);
	            });

	        this.interpolate = new ObservableProperty("interpolate", Boolean, false);

	        // Constructor

	        this.constructor = function(colors, interpolate) {
	            base.constructor.call(this);

	            if (colors != null) {
	                this.set("colors", colors);
	            }
	            if (interpolate != null) {
	                this.set("interpolate", interpolate);
	            }
	        };

	        // Protected Methods

	        this.getItemOverride = function(properties, ratio, span, value) {
	            var colors = properties.colors;
	            var numColors = colors.length;
	            if (numColors === 0) {
	                return null;
	            }

	            var index;
	            if (span >= 0) {
	                index = Math.round(span * ratio);
	            } else {
	                span = numColors - 1;
	                index = span * ratio;
	            }

	            if (!properties.interpolate) {
	                index = Math.round(index);
	                return colors[index % numColors].clone();
	            }

	            ratio = (span > 0) ? (numColors - 1) * (index / span) : 0;
	            var index1 = Math.floor(ratio);
	            var index2 = Math.min(index1 + 1, numColors - 1);
	            ratio -= index1;

	            return Color.interpolate(colors[index1], colors[index2], ratio);
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/utils/DataUtil":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var StringUtil = __webpack_require__("contrib/jg_lib/utils/StringUtil");

	    return Class(module.id, function(DataUtil) {

	        // Public Static Methods

	        DataUtil.parseNumber = function(value) {
	            if (value == null) {
	                return NaN;
	            }

	            switch (typeof value) {
	                case "number":
	                    return value;
	                case "string":
	                    value = StringUtil.trim(value);
	                    return value ? Number(value) : NaN;
	                case "boolean":
	                    return value ? 1 : 0;
	            }

	            return NaN;
	        };

	        DataUtil.parseBoolean = function(value) {
	            if (value == null) {
	                return false;
	            }

	            switch (typeof value) {
	                case "boolean":
	                    return value;
	                case "string":
	                    value = StringUtil.trim(value.toLowerCase());
	                    return ((value === "true") || (value === "t") || (value === "yes") || (value === "y") || (Number(value) > 0));
	                case "number":
	                    return (value > 0);
	            }

	            return false;
	        };

	        DataUtil.parseString = function(value) {
	            if (value == null) {
	                return null;
	            }

	            return String(value);
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/vectors/Path":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Shape = __webpack_require__("splunk/vectors/Shape");
	    var VectorElement = __webpack_require__("splunk/vectors/VectorElement");

	    return Class(module.id, Shape, function(Path, base) {

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this);
	        };

	        // Public Methods

	        this.beginPath = function() {
	            return this;
	        };

	        this.endPath = function() {
	            return this;
	        };

	        this.moveTo = function(x, y) {
	            return this;
	        };

	        this.lineTo = function(x, y) {
	            return this;
	        };

	        this.curveTo = function(cx, cy, x, y) {
	            return this;
	        };

	        // Private Nested Classes

	        var SVGPath = Class(function(SVGPath) {

	            // Private Properties

	            this._penX = 0;
	            this._penY = 0;
	            this._startX = 0;
	            this._startY = 0;
	            this._pathData = null;
	            this._lastCommand = null;

	            // Constructor

	            this.constructor = function() {
	                base.constructor.call(this, "path");
	            };

	            // Public Methods

	            this.beginPath = function() {
	                if (this._pathData != null) {
	                    this.endPath();
	                }

	                this._pathData = "";

	                return this;
	            };

	            this.endPath = function() {
	                if (this._pathData == null) {
	                    return this;
	                }

	                if (this._pathData) {
	                    if ((this._lastCommand !== "M") && (this._penX === this._startX) && (this._penY === this._startY)) {
	                        this._pathData += " Z";
	                    }
	                    this.element.setAttribute("d", this._pathData.substring(1));
	                } else {
	                    this.element.removeAttribute("d");
	                }

	                this._penX = 0;
	                this._penY = 0;
	                this._startX = 0;
	                this._startY = 0;
	                this._pathData = null;
	                this._lastCommand = null;

	                return this;
	            };

	            this.moveTo = function(x, y) {
	                if (this._pathData == null) {
	                    return this;
	                }

	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? x : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? y : 0;

	                if (this._pathData && (this._lastCommand !== "M") && (this._penX === this._startX) && (this._penY === this._startY)) {
	                    this._pathData += " Z";
	                }

	                if (this._lastCommand !== "M") {
	                    this._lastCommand = "M";
	                }

	                this._penX = x;
	                this._penY = y;
	                this._startX = x;
	                this._startY = y;
	                this._pathData += " M" + x + "," + y;

	                return this;
	            };

	            this.lineTo = function(x, y) {
	                if (this._pathData == null) {
	                    return this;
	                }

	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? x : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? y : 0;

	                if (!this._lastCommand) {
	                    this.moveTo(0, 0);
	                }

	                if (this._lastCommand !== "L") {
	                    this._lastCommand = "L";
	                    this._pathData += " L";
	                } else {
	                    this._pathData += " ";
	                }

	                this._penX = x;
	                this._penY = y;
	                this._pathData += x + "," + y;

	                return this;
	            };

	            this.curveTo = function(cx, cy, x, y) {
	                if (this._pathData == null) {
	                    return this;
	                }

	                cx = ((cx != null) && (cx > -Infinity) && (cx < Infinity)) ? cx : 0;
	                cy = ((cy != null) && (cy > -Infinity) && (cy < Infinity)) ? cy : 0;
	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? x : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? y : 0;

	                if (!this._lastCommand) {
	                    this.moveTo(0, 0);
	                }

	                if (this._lastCommand !== "Q") {
	                    this._lastCommand = "Q";
	                    this._pathData += " Q";
	                } else {
	                    this._pathData += " ";
	                }

	                this._penX = x;
	                this._penY = y;
	                this._pathData += cx + "," + cy + " " + x + "," + y;

	                return this;
	            };

	        });

	        var VMLPath = Class(function(VMLPath) {

	            // Private Static Constants

	            var _RES = 64;

	            // Private Properties

	            this._pathElement = null;
	            this._penX = 0;
	            this._penY = 0;
	            this._startX = 0;
	            this._startY = 0;
	            this._pathData = null;
	            this._lastCommand = null;

	            // Constructor

	            this.constructor = function() {
	                base.constructor.call(this, "shape");

	                this._pathElement = this.createElement("path");

	                this.element.style.width = "1px";
	                this.element.style.height = "1px";
	                this.element.coordsize = _RES + "," + _RES;
	                this.element.appendChild(this._pathElement);
	            };

	            // Public Methods

	            this.dispose = function() {
	                base.dispose.call(this);

	                this._pathElement = null;
	            };

	            this.beginPath = function() {
	                if (this._pathData != null) {
	                    this.endPath();
	                }

	                this._pathData = "";

	                return this;
	            };

	            this.endPath = function() {
	                if (this._pathData == null) {
	                    return this;
	                }

	                if (this._pathData) {
	                    if ((this._lastCommand !== "m") && (this._penX === this._startX) && (this._penY === this._startY)) {
	                        this._pathData += " x";
	                    }
	                    this._pathElement.v = this._pathData.substring(1);
	                } else {
	                    this._pathElement.v = " ";
	                }

	                this._penX = 0;
	                this._penY = 0;
	                this._startX = 0;
	                this._startY = 0;
	                this._pathData = null;
	                this._lastCommand = null;

	                return this;
	            };

	            this.moveTo = function(x, y) {
	                if (this._pathData == null) {
	                    return this;
	                }

	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? Math.round(x * _RES) : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? Math.round(y * _RES) : 0;

	                if (this._pathData && (this._lastCommand !== "M") && (this._penX === this._startX) && (this._penY === this._startY)) {
	                    this._pathData += " x";
	                }

	                if (this._lastCommand !== "m") {
	                    this._lastCommand = "m";
	                }

	                this._penX = x;
	                this._penY = y;
	                this._startX = x;
	                this._startY = y;
	                this._pathData += " m " + x + "," + y;

	                return this;
	            };

	            this.lineTo = function(x, y) {
	                if (this._pathData == null) {
	                    return this;
	                }

	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? Math.round(x * _RES) : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? Math.round(y * _RES) : 0;

	                if (!this._lastCommand) {
	                    this.moveTo(0, 0);
	                }

	                if (this._lastCommand !== "l") {
	                    this._lastCommand = "l";
	                    this._pathData += " l ";
	                } else {
	                    this._pathData += ", ";
	                }

	                this._penX = x;
	                this._penY = y;
	                this._pathData += x + "," + y;

	                return this;
	            };

	            this.curveTo = function(cx, cy, x, y) {
	                if (this._pathData == null) {
	                    return this;
	                }

	                cx = ((cx != null) && (cx > -Infinity) && (cx < Infinity)) ? Math.round(cx * _RES) : 0;
	                cy = ((cy != null) && (cy > -Infinity) && (cy < Infinity)) ? Math.round(cy * _RES) : 0;
	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? Math.round(x * _RES) : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? Math.round(y * _RES) : 0;

	                if (!this._lastCommand) {
	                    this.moveTo(0, 0);
	                }

	                if (this._lastCommand !== "qb") {
	                    this._lastCommand = "qb";
	                }

	                this._penX = x;
	                this._penY = y;
	                this._pathData += " qb " + cx + "," + cy + " l " + x + "," + y;

	                return this;
	            };

	        });

	        VectorElement.mixin(this, SVGPath, VMLPath);

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/vectors/Shape":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var NumberUtil = __webpack_require__("contrib/jg_lib/utils/NumberUtil");
	    var VectorElement = __webpack_require__("splunk/vectors/VectorElement");

	    return Class(module.id, VectorElement, function(Shape, base) {

	        // Constructor

	        this.constructor = function(tagName) {
	            base.constructor.call(this, tagName);
	        };

	        // Public Methods

	        this.fillColor = function(value) {
	            return this;
	        };

	        this.fillOpacity = function(value) {
	            return this;
	        };

	        this.strokeColor = function(value) {
	            return this;
	        };

	        this.strokeOpacity = function(value) {
	            return this;
	        };

	        this.strokeWidth = function(value) {
	            return this;
	        };

	        this.strokeLineCap = function(value) {
	            return this;
	        };

	        this.strokeLineJoin = function(value) {
	            return this;
	        };

	        this.strokeMiterLimit = function(value) {
	            return this;
	        };

	        // Private Nested Classes

	        var SVGShape = Class(function(SVGShape) {

	            // Constructor

	            this.constructor = function(tagName) {
	                base.constructor.call(this, tagName);

	                this.fillColor(NaN);
	                this.strokeColor(NaN);
	                this.strokeLineCap("none");
	                this.strokeLineJoin("miter");
	            };

	            // Public Methods

	            this.fillColor = function(value) {
	                if ((value != null) && !isNaN(value)) {
	                    value = NumberUtil.minMax(Math.floor(value), 0x000000, 0xFFFFFF);
	                    this.element.setAttribute("fill", "#" + (value | 0x1000000).toString(16).substring(1));
	                } else {
	                    this.element.setAttribute("fill", "none");
	                }

	                return this;
	            };

	            this.fillOpacity = function(value) {
	                if ((value != null) && !isNaN(value)) {
	                    this.element.setAttribute("fill-opacity", NumberUtil.minMax(value, 0, 1));
	                } else {
	                    this.element.removeAttribute("fill-opacity");
	                }

	                return this;
	            };

	            this.strokeColor = function(value) {
	                if ((value != null) && !isNaN(value)) {
	                    value = NumberUtil.minMax(Math.floor(value), 0x000000, 0xFFFFFF);
	                    this.element.setAttribute("stroke", "#" + (value | 0x1000000).toString(16).substring(1));
	                } else {
	                    this.element.removeAttribute("stroke");
	                }

	                return this;
	            };

	            this.strokeOpacity = function(value) {
	                if ((value != null) && !isNaN(value)) {
	                    this.element.setAttribute("stroke-opacity", NumberUtil.minMax(value, 0, 1));
	                } else {
	                    this.element.removeAttribute("stroke-opacity");
	                }

	                return this;
	            };

	            this.strokeWidth = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this.element.setAttribute("stroke-width", Math.max(value, 1));
	                } else {
	                    this.element.removeAttribute("stroke-width");
	                }

	                return this;
	            };

	            this.strokeLineCap = function(value) {
	                if (value === "round") {
	                    this.element.setAttribute("stroke-linecap", "round");
	                } else if (value === "square") {
	                    this.element.setAttribute("stroke-linecap", "square");
	                } else {  // none
	                    this.element.removeAttribute("stroke-linecap");
	                }

	                return this;
	            };

	            this.strokeLineJoin = function(value) {
	                if (value === "round") {
	                    this.element.setAttribute("stroke-linejoin", "round");
	                } else if (value === "bevel") {
	                    this.element.setAttribute("stroke-linejoin", "bevel");
	                } else {  // miter
	                    this.element.removeAttribute("stroke-linejoin");
	                }

	                return this;
	            };

	            this.strokeMiterLimit = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this.element.setAttribute("stroke-miterlimit", Math.max(value, 1));
	                } else {
	                    this.element.removeAttribute("stroke-miterlimit");
	                }

	                return this;
	            };

	        });

	        var VMLShape = Class(function(VMLShape) {

	            // Private Properties

	            this._fillElement = null;
	            this._strokeElement = null;

	            // Constructor

	            this.constructor = function(tagName) {
	                base.constructor.call(this, tagName);

	                this._fillElement = this.createElement("fill");
	                this._strokeElement = this.createElement("stroke");

	                this.element.appendChild(this._fillElement);
	                this.element.appendChild(this._strokeElement);

	                this.fillColor(NaN);
	                this.strokeColor(NaN);
	                this.strokeLineCap("none");
	                this.strokeLineJoin("miter");
	            };

	            // Public Methods

	            this.dispose = function() {
	                base.dispose.call(this);

	                this._fillElement = null;
	                this._strokeElement = null;
	            };

	            this.fillColor = function(value) {
	                if ((value != null) && !isNaN(value)) {
	                    value = NumberUtil.minMax(Math.floor(value), 0x000000, 0xFFFFFF);
	                    this._fillElement.on = true;
	                    this._fillElement.color = "#" + (value | 0x1000000).toString(16).substring(1);
	                } else {
	                    this._fillElement.on = false;
	                    this._fillElement.color = "#000000";
	                }

	                return this;
	            };

	            this.fillOpacity = function(value) {
	                if ((value != null) && !isNaN(value)) {
	                    this._fillElement.opacity = NumberUtil.minMax(value, 0, 1);
	                } else {
	                    this._fillElement.opacity = 1;
	                }

	                return this;
	            };

	            this.strokeColor = function(value) {
	                if ((value != null) && !isNaN(value)) {
	                    value = NumberUtil.minMax(Math.floor(value), 0x000000, 0xFFFFFF);
	                    this._strokeElement.on = true;
	                    this._strokeElement.color = "#" + (value | 0x1000000).toString(16).substring(1);
	                } else {
	                    this._strokeElement.on = false;
	                    this._strokeElement.color = "#000000";
	                }

	                return this;
	            };

	            this.strokeOpacity = function(value) {
	                if ((value != null) && !isNaN(value)) {
	                    this._strokeElement.opacity = NumberUtil.minMax(value, 0, 1);
	                } else {
	                    this._strokeElement.opacity = 1;
	                }

	                return this;
	            };

	            this.strokeWidth = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this._strokeElement.weight = Math.max(value, 1) + "px";
	                } else {
	                    this._strokeElement.weight = "1px";
	                }

	                return this;
	            };

	            this.strokeLineCap = function(value) {
	                if (value === "round") {
	                    this._strokeElement.endcap = "round";
	                } else if (value === "square") {
	                    this._strokeElement.endcap = "square";
	                } else {  // none
	                    this._strokeElement.endcap = "flat";
	                }

	                return this;
	            };

	            this.strokeLineJoin = function(value) {
	                if (value === "round") {
	                    this._strokeElement.joinstyle = "round";
	                } else if (value === "bevel") {
	                    this._strokeElement.joinstyle = "bevel";
	                } else {  // miter
	                    this._strokeElement.joinstyle = "miter";
	                }

	                return this;
	            };

	            this.strokeMiterLimit = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this._strokeElement.miterlimit = Math.max(value, 1);
	                } else {
	                    this._strokeElement.miterlimit = 4;
	                }

	                return this;
	            };

	        });

	        VectorElement.mixin(this, SVGShape, VMLShape);

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/viz/MDataTarget":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Pass = __webpack_require__("contrib/jg_lib/async/Pass");
	    var ObservableArrayProperty = __webpack_require__("contrib/jg_lib/properties/ObservableArrayProperty");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var Legend = __webpack_require__("splunk/charting/Legend");

	    return Class(module.id, function(MDataTarget) {

	        // Public Passes

	        this.processDataPass = new Pass("processData", 0.1);
	        this.updateLegendLabelsPass = new Pass("updateLegendLabels", 0.2);
	        this.renderDataPass = new Pass("renderData", 0.3);

	        // Public Properties

	        this.data = new ObservableProperty("data", Array, null)
	            .onChange(function(e) {
	                this.invalidate("processDataPass");
	            });

	        this.fields = new ObservableArrayProperty("fields", String, null)
	            .onChange(function(e) {
	                this.invalidate("processDataPass");
	            });

	        this.legend = new ObservableProperty("legend", Legend, null)
	            .onChange(function(e) {
	                if (e.target === this) {
	                    var oldLegend = e.oldValue;
	                    var newLegend = e.newValue;

	                    if (oldLegend) {
	                        oldLegend.off("settingLabels", this._legend_settingLabels, this);
	                        oldLegend.unregister(this);
	                    }

	                    if (newLegend) {
	                        newLegend.register(this);
	                        newLegend.on("settingLabels", this._legend_settingLabels, this);
	                    }

	                    this.invalidate("updateLegendLabelsPass");
	                    return;
	                }

	                if (e.event === e.target.labelIndexMapChanged) {
	                    this.invalidate("renderDataPass");
	                    return;
	                }
	            });

	        // Private Properties

	        this._cachedData = null;
	        this._cachedFields = null;
	        this._cachedLegend = null;

	        // Public Methods

	        this.processData = function() {
	            if (this.isValid("processDataPass")) {
	                return;
	            }

	            this.invalidate("updateLegendLabelsPass");

	            var data = this._cachedData = this.getInternal("data") || [];
	            var fields = this._cachedFields = this.getInternal("fields") || [];

	            this.processDataOverride(data, fields);

	            this.markValid("processDataPass");
	        };

	        this.updateLegendLabels = function() {
	            if (this.isValid("updateLegendLabelsPass")) {
	                return;
	            }

	            this.invalidate("renderDataPass");

	            var legend = this._cachedLegend = this.getInternal("legend");
	            var labels = null;

	            if (legend) {
	                labels = this.updateLegendLabelsOverride(this._cachedData, this._cachedFields);
	            }

	            this.markValid("updateLegendLabelsPass");

	            // this must run last to avoid recursion
	            if (legend) {
	                legend.setLabels(this, labels);
	            }
	        };

	        this.renderData = function() {
	            if (this.isValid("renderDataPass")) {
	                return;
	            }

	            this.renderDataOverride(this._cachedData, this._cachedFields, this._cachedLegend);

	            this.markValid("renderDataPass");
	        };

	        // Protected Methods

	        this.processDataOverride = function(data, fields) {
	        };

	        this.updateLegendLabelsOverride = function(data, fields) {
	            return null;
	        };

	        this.renderDataOverride = function(data, fields, legend) {
	        };

	        // Private Methods

	        this._legend_settingLabels = function(e) {
	            this.validate("updateLegendLabelsPass");
	            this.updateLegendLabels();
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/layers/PieMarkerLayer":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Leaflet = __webpack_require__("shim/leaflet");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Event = __webpack_require__("contrib/jg_lib/events/Event");
	    var EventData = __webpack_require__("contrib/jg_lib/events/EventData");
	    var Color = __webpack_require__("contrib/jg_lib/graphics/Color");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var NumberUtil = __webpack_require__("contrib/jg_lib/utils/NumberUtil");
	    var LatLon = __webpack_require__("splunk/mapping/LatLon");
	    var LatLonBounds = __webpack_require__("splunk/mapping/LatLonBounds");
	    var LayerBase = __webpack_require__("splunk/mapping/layers/LayerBase");
	    var VectorLayerBase = __webpack_require__("splunk/mapping/layers/VectorLayerBase");
	    var ColorPalette = __webpack_require__("splunk/palettes/ColorPalette");
	    var ListColorPalette = __webpack_require__("splunk/palettes/ListColorPalette");
	    var DataUtil = __webpack_require__("splunk/utils/DataUtil");
	    var Group = __webpack_require__("splunk/vectors/Group");
	    var Wedge = __webpack_require__("splunk/vectors/Wedge");
	    var MDataTarget = __webpack_require__("splunk/viz/MDataTarget");

	    return Class(module.id, VectorLayerBase, function(PieMarkerLayer, base) {

	        Class.mixin(this, MDataTarget);

	        // Public Events

	        this.rendered = new Event("rendered", EventData);

	        // Public Properties

	        this.markerColorPalette = new ObservableProperty("markerColorPalette", ColorPalette, new ListColorPalette([ Color.fromNumber(0x00CC00), Color.fromNumber(0xCCCC00), Color.fromNumber(0xCC0000) ], true))
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.markerOpacity = new ObservableProperty("markerOpacity", Number, 1)
	            .writeFilter(function(value) {
	                if (isNaN(value)) {
	                    return 1;
	                }
	                return ((value >= 0) && (value <= Infinity)) ? Math.min(value, 1) : 0;
	            })
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.markerMinSize = new ObservableProperty("markerMinSize", Number, 10)
	            .writeFilter(function(value) {
	                return ((value >= 0) && (value < Infinity)) ? value : 0;
	            })
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.markerMaxSize = new ObservableProperty("markerMaxSize", Number, 50)
	            .writeFilter(function(value) {
	                return ((value >= 0) && (value < Infinity)) ? value : 0;
	            })
	            .onChange(function(e) {
	                this.invalidate("renderDataPass");
	            });

	        this.wrapX = new ObservableProperty("wrapX", Boolean, true)
	            .onChange(function(e) {
	                this.invalidate("renderPass");
	            });

	        this.wrapY = new ObservableProperty("wrapY", Boolean, false)
	            .onChange(function(e) {
	                this.invalidate("renderPass");
	            });

	        // Private Properties

	        this._seriesList = null;
	        this._markerList = null;

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this);

	            this._seriesList = [];
	            this._markerList = [];
	        };

	        // Public Methods

	        this.getLatLonBounds = function(center) {
	            if ((center != null) && !(center instanceof LatLon)) {
	                throw new Error("Parameter center must be of type " + Class.getName(LatLon) + ".");
	            }

	            this.validate();

	            var bounds = new LatLonBounds(Infinity, Infinity, -Infinity, -Infinity);

	            var markerList = this._markerList;
	            for (var i = 0, l = markerList.length; i < l; i++) {
	                bounds.expand(markerList[i].latLon.normalize(center));
	            }

	            return bounds.isFinite() ? bounds : null;
	        };

	        // Protected Methods

	        this.processDataOverride = function(data, fields) {
	            var seriesList = this._seriesList;
	            var numSeries = 0;
	            var series;

	            var markerList = this._markerList;
	            var numMarkers = 0;
	            var marker;

	            var sliceList;
	            var numSlices;
	            var slice;

	            var i;
	            var j;

	            var numRows = data.length;
	            var numFields = fields.length;
	            if ((numRows > 0) && (numFields > 2)) {
	                var vectorContainer = this.vectorContainer;

	                var fieldLat = fields[0];
	                var fieldLon = fields[1];
	                var fieldSeries;

	                var obj;
	                var valueLat;
	                var valueLon;
	                var valueSeries;

	                var magMin = Infinity;
	                var magMax = -Infinity;
	                var magSpan = 0;
	                var mag;

	                var sum;
	                var angle1;
	                var angle2;

	                // create or reuse series
	                for (i = 2; i < numFields; i++) {
	                    fieldSeries = fields[i];
	                    if (numSeries < seriesList.length) {
	                        series = seriesList[numSeries];
	                    } else {
	                        series = new Series();
	                        seriesList.push(series);
	                    }

	                    series.name = fieldSeries;

	                    numSeries++;
	                }

	                // create or reuse markers
	                for (i = 0; i < numRows; i++) {
	                    obj = data[i];
	                    if (obj == null) {
	                        continue;
	                    }

	                    valueLat = DataUtil.parseNumber(obj[fieldLat]);
	                    valueLon = DataUtil.parseNumber(obj[fieldLon]);
	                    if (isNaN(valueLat) || isNaN(valueLon)) {
	                        continue;
	                    }

	                    if (numMarkers < markerList.length) {
	                        marker = markerList[numMarkers];
	                    } else {
	                        marker = new PieMarker();
	                        marker.appendTo(vectorContainer);
	                        markerList.push(marker);
	                    }

	                    // create or reuse slices and compute marker magnitude
	                    sliceList = marker.sliceList;
	                    numSlices = 0;
	                    mag = 0;
	                    for (j = 0; j < numSeries; j++) {
	                        series = seriesList[j];

	                        valueSeries = DataUtil.parseNumber(obj[series.name]);
	                        if (isNaN(valueSeries) || (valueSeries <= 0)) {
	                            continue;
	                        }

	                        if (numSlices < sliceList.length) {
	                            slice = sliceList[numSlices];
	                        } else {
	                            slice = new PieSlice();
	                            slice.appendTo(marker);
	                            sliceList.push(slice);
	                        }

	                        slice.series = series;
	                        slice.value = valueSeries;

	                        mag += valueSeries;

	                        numSlices++;
	                    }

	                    if (numSlices === 0) {
	                        continue;
	                    }

	                    // record marker attributes
	                    marker.latLon = new LatLon(valueLat, valueLon);
	                    marker.data = obj;
	                    marker.fields = fields;
	                    marker.magnitude = mag;

	                    // update magnitude min and max
	                    if (mag < magMin) {
	                        magMin = mag;
	                    }
	                    if (mag > magMax) {
	                        magMax = mag;
	                    }

	                    // compute slice angles
	                    sum = 0;
	                    angle1 = 0;
	                    angle2 = 0;
	                    for (j = 0; j < numSlices; j++) {
	                        slice = sliceList[j];

	                        sum += slice.value;
	                        angle1 = angle2;
	                        angle2 = 360 * (sum / mag);

	                        slice.startAngle = angle1 - 90;
	                        slice.arcAngle = angle2 - angle1;
	                    }

	                    // dispose unused slices
	                    for (j = sliceList.length - 1; j >= numSlices; j--) {
	                        slice = sliceList.pop();
	                        slice.dispose();
	                    }

	                    numMarkers++;
	                }

	                // compute marker scales
	                magSpan = magMax - magMin;
	                for (i = 0; i < numMarkers; i++) {
	                    marker = markerList[i];
	                    marker.scale = (magSpan > 0) ? NumberUtil.minMax((marker.magnitude - magMin) / magSpan, 0, 1) : (1 / numMarkers);
	                }
	            }

	            // dispose unused markers
	            for (i = markerList.length - 1; i >= numMarkers; i--) {
	                marker = markerList.pop();
	                marker.dispose();
	            }

	            // dispose unused series
	            for (i = seriesList.length - 1; i >= numSeries; i--) {
	                seriesList.pop();
	            }
	        };

	        this.updateLegendLabelsOverride = function(data, fields) {
	            var seriesList = this._seriesList;
	            var numSeries = seriesList.length;
	            var labels = (numSeries > 0) ? new Array(numSeries) : null;
	            for (var i = 0; i < numSeries; i++) {
	                labels[i] = seriesList[i].name;
	            }
	            return labels;
	        };

	        this.renderDataOverride = function(data, fields, legend) {
	            this.invalidate("renderPass");

	            var seriesList = this._seriesList;
	            var numSeries = seriesList.length;
	            var series;
	            var seriesIndex;
	            var seriesCount;

	            var markerColorPalette = this.getInternal("markerColorPalette");
	            var markerOpacity = this.getInternal("markerOpacity");
	            var markerMinSize = this.getInternal("markerMinSize");
	            var markerMaxSize = this.getInternal("markerMaxSize");
	            var markerList = this._markerList;
	            var numMarkers = markerList.length;
	            var marker;

	            var sliceList;
	            var numSlices;
	            var slice;

	            var i;
	            var j;

	            var paletteSpan;
	            var paletteRatio;

	            // assign series colors
	            seriesCount = legend ? legend.getNumLabels() : numSeries;
	            paletteSpan = Math.max(seriesCount - 1, 0);
	            for (i = 0; i < numSeries; i++) {
	                series = seriesList[i];
	                seriesIndex = legend ? legend.getLabelIndex(series.name) : i;
	                paletteRatio = (paletteSpan > 0) ? (seriesIndex / paletteSpan) : 0;
	                series.color = markerColorPalette ? (markerColorPalette.getItem(paletteRatio, paletteSpan, series.name) || new Color()).toNumber() : 0x000000;
	            }

	            // render pie slices
	            for (i = 0; i < numMarkers; i++) {
	                marker = markerList[i];
	                sliceList = marker.sliceList;
	                numSlices = sliceList.length;

	                marker.radius = Math.round(NumberUtil.interpolate(markerMinSize, markerMaxSize, marker.scale)) / 2;
	                marker.tooltipOffsetRadius = marker.radius;
	                marker.display("none");  // fixes vml flicker

	                for (j = 0; j < numSlices; j++) {
	                    slice = sliceList[j];
	                    slice.fillColor(slice.series.color);
	                    slice.fillOpacity(markerOpacity);
	                    slice.draw(0, 0, marker.radius, marker.radius, slice.startAngle, slice.arcAngle);
	                }
	            }
	        };

	        this.renderOverride = function(map) {
	            base.renderOverride.call(this, map);

	            var leafletMap = map.leafletMap;
	            var centerLatLng = leafletMap.getCenter();

	            var wrapX = this.getInternal("wrapX");
	            var wrapY = this.getInternal("wrapY");

	            var vectorBounds = this.vectorBounds;
	            var minX = vectorBounds.minX;
	            var minY = vectorBounds.minY;
	            var maxX = vectorBounds.maxX;
	            var maxY = vectorBounds.maxY;

	            var markerList = this._markerList;
	            var marker;
	            var markerLatLng;
	            var markerPoint;

	            for (var i = 0, l = markerList.length; i < l; i++) {
	                marker = markerList[i];
	                markerLatLng = marker.latLon.toLeaflet();

	                if (wrapX) {
	                    markerLatLng.lng -= centerLatLng.lng;
	                    markerLatLng.lng %= 360;
	                    if (markerLatLng.lng > 180) {
	                        markerLatLng.lng -= 360;
	                    } else if (markerLatLng.lng < -180) {
	                        markerLatLng.lng += 360;
	                    }
	                    markerLatLng.lng += centerLatLng.lng;
	                }

	                if (wrapY) {
	                    markerLatLng.lat -= centerLatLng.lat;
	                    markerLatLng.lat %= 180;
	                    if (markerLatLng.lat > 90) {
	                        markerLatLng.lat -= 180;
	                    } else if (markerLatLng.lat < -90) {
	                        markerLatLng.lat += 180;
	                    }
	                    markerLatLng.lat += centerLatLng.lat;
	                }

	                marker.tooltipLatLng = markerLatLng;

	                markerPoint = leafletMap.latLngToLayerPoint(markerLatLng);

	                marker.translate(markerPoint.x, markerPoint.y);
	                if (((markerPoint.x + marker.radius) < minX) || ((markerPoint.x - marker.radius) > maxX) ||
	                    ((markerPoint.y + marker.radius) < minY) || ((markerPoint.y - marker.radius) > maxY)) {
	                    marker.display("none");
	                } else {
	                    marker.display(null);
	                }
	            }

	            this.fire("rendered", new EventData());
	        };

	        // Private Nested Classes

	        var Series = Class(Object, function(Series, base) {

	            // Public Properties

	            this.name = null;
	            this.color = 0x000000;

	            // Constructor

	            this.constructor = function() {
	                // noop
	            };

	        });

	        var PieMarker = Class(Group, function(PieMarker, base) {

	            // Public Properties

	            this.sliceList = null;
	            this.latLon = null;
	            this.data = null;
	            this.fields = null;
	            this.magnitude = 0;
	            this.scale = 0;
	            this.radius = 0;
	            this.tooltipLatLng = null;
	            this.tooltipOffsetRadius = 0;

	            // Constructor

	            this.constructor = function() {
	                base.constructor.call(this);

	                this.element[LayerBase.METADATA_KEY] = this;

	                this.sliceList = [];
	            };

	            // Public Methods

	            this.dispose = function() {
	                var sliceList = this.sliceList;
	                for (var i = sliceList.length - 1; i >= 0; i--) {
	                    sliceList[i].dispose();
	                }

	                this.element[LayerBase.METADATA_KEY] = null;

	                base.dispose.call(this);
	            };

	        });

	        var PieSlice = Class(Wedge, function(PieSlice, base) {

	            // Public Properties

	            this.series = null;
	            this.value = 0;
	            this.startAngle = 0;
	            this.arcAngle = 0;

	            // Constructor

	            this.constructor = function() {
	                base.constructor.call(this);
	            };

	        });

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/vectors/Wedge":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var NumberUtil = __webpack_require__("contrib/jg_lib/utils/NumberUtil");
	    var Shape = __webpack_require__("splunk/vectors/Shape");
	    var VectorElement = __webpack_require__("splunk/vectors/VectorElement");

	    return Class(module.id, Shape, function(Wedge, base) {

	        // Constructor

	        this.constructor = function() {
	            base.constructor.call(this);
	        };

	        // Public Methods

	        this.draw = function(x, y, radiusX, radiusY, startAngle, arcAngle) {
	            return this;
	        };

	        // Private Nested Classes

	        var SVGWedge = Class(function(SVGWedge) {

	            // Constructor

	            this.constructor = function() {
	                base.constructor.call(this, "path");
	            };

	            // Public Methods

	            this.draw = function(x, y, radiusX, radiusY, startAngle, arcAngle) {
	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? x : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? y : 0;
	                radiusX = ((radiusX != null) && (radiusX < Infinity)) ? Math.max(radiusX, 0) : 0;
	                radiusY = ((radiusY != null) && (radiusY < Infinity)) ? Math.max(radiusY, 0) : 0;
	                startAngle = ((startAngle != null) && (startAngle > -Infinity) && (startAngle < Infinity)) ? startAngle : 0;
	                arcAngle = ((arcAngle != null) && (arcAngle != null) && !isNaN(arcAngle)) ? NumberUtil.minMax(arcAngle, -360, 360) : 0;

	                if ((radiusX == 0) || (radiusY == 0) || (arcAngle == 0)) {
	                    this.element.removeAttribute("d");
	                    return this;
	                }

	                var a1 = (startAngle / 180) * Math.PI;
	                var x1 = x + Math.cos(a1) * radiusX;
	                var y1 = y + Math.sin(a1) * radiusY;
	                var a2 = ((startAngle + arcAngle / 2) / 180) * Math.PI;
	                var x2 = x + Math.cos(a2) * radiusX;
	                var y2 = y + Math.sin(a2) * radiusY;
	                var a3 = ((startAngle + arcAngle) / 180) * Math.PI;
	                var x3 = x + Math.cos(a3) * radiusX;
	                var y3 = y + Math.sin(a3) * radiusY;

	                var sweepFlag = (arcAngle < 0) ? 0 : 1;

	                var pathData = "";
	                if ((arcAngle > -360) && (arcAngle < 360)) {
	                    pathData += "M" + x + "," + y;
	                    pathData += " L" + x1 + "," + y1;
	                } else {
	                    pathData += "M" + x1 + "," + y1;
	                }
	                pathData += " A" + radiusX + "," + radiusY + " 0 0 " + sweepFlag + " " + x2 + "," + y2;
	                pathData += " " + radiusX + "," + radiusY + " 0 0 " + sweepFlag + " " + x3 + "," + y3;
	                pathData += " Z";

	                this.element.setAttribute("d", pathData);

	                return this;
	            };

	        });

	        var VMLWedge = Class(function(VMLWedge) {

	            // Private Static Constants

	            var _RES = 64;

	            // Private Properties

	            this._pathElement = null;

	            // Constructor

	            this.constructor = function() {
	                base.constructor.call(this, "shape");

	                this._pathElement = this.createElement("path");

	                this.element.style.width = "1px";
	                this.element.style.height = "1px";
	                this.element.coordsize = _RES + "," + _RES;
	                this.element.appendChild(this._pathElement);
	            };

	            // Public Methods

	            this.dispose = function() {
	                base.dispose.call(this);

	                this._pathElement = null;
	            };

	            this.draw = function(x, y, radiusX, radiusY, startAngle, arcAngle) {
	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? x : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? y : 0;
	                radiusX = ((radiusX != null) && (radiusX < Infinity)) ? Math.max(radiusX, 0) : 0;
	                radiusY = ((radiusY != null) && (radiusY < Infinity)) ? Math.max(radiusY, 0) : 0;
	                startAngle = ((startAngle != null) && (startAngle > -Infinity) && (startAngle < Infinity)) ? startAngle : 0;
	                arcAngle = ((arcAngle != null) && (arcAngle != null) && !isNaN(arcAngle)) ? NumberUtil.minMax(arcAngle, -360, 360) : 0;

	                if ((radiusX == 0) || (radiusY == 0) || (arcAngle == 0)) {
	                    this._pathElement.v = " ";
	                    return this;
	                }

	                var a1 = (startAngle / 180) * Math.PI;
	                var x1 = x + Math.cos(a1) * radiusX;
	                var y1 = y + Math.sin(a1) * radiusY;
	                var a2 = ((startAngle + arcAngle / 2) / 180) * Math.PI;
	                var x2 = x + Math.cos(a2) * radiusX;
	                var y2 = y + Math.sin(a2) * radiusY;
	                var a3 = ((startAngle + arcAngle) / 180) * Math.PI;
	                var x3 = x + Math.cos(a3) * radiusX;
	                var y3 = y + Math.sin(a3) * radiusY;

	                var left = Math.round((x - radiusX) * _RES);
	                var top = Math.round((y - radiusY) * _RES);
	                var right = Math.round((x + radiusX) * _RES);
	                var bottom = Math.round((y + radiusY) * _RES);

	                x = Math.round(x * _RES);
	                y = Math.round(y * _RES);
	                x1 = Math.round(x1 * _RES);
	                y1 = Math.round(y1 * _RES);
	                x2 = Math.round(x2 * _RES);
	                y2 = Math.round(y2 * _RES);
	                x3 = Math.round(x3 * _RES);
	                y3 = Math.round(y3 * _RES);

	                var pathData = "";
	                if ((arcAngle > -360) && (arcAngle < 360)) {
	                    pathData += "m " + x + "," + y;
	                    pathData += " l " + x1 + "," + y1;
	                } else {
	                    pathData += "m " + x1 + "," + y1;
	                }
	                pathData += (arcAngle < 0) ? " at" : " wa";
	                pathData += " " + left + "," + top + "," + right + "," + bottom + ", " + x1 + "," + y1 + ", " + x2 + "," + y2;
	                pathData += ", " + left + "," + top + "," + right + "," + bottom + ", " + x2 + "," + y2 + ", " + x3 + "," + y3;
	                pathData += " x";

	                this._pathElement.v = pathData;

	                return this;
	            };

	        });

	        VectorElement.mixin(this, SVGWedge, VMLWedge);

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/parsers/LatLonBoundsParser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var LatLonBounds = __webpack_require__("splunk/mapping/LatLonBounds");
	    var NumberParser = __webpack_require__("splunk/parsers/NumberParser");
	    var Parser = __webpack_require__("splunk/parsers/Parser");
	    var ParseUtils = __webpack_require__("splunk/parsers/ParseUtils");

	    return Class(module.id, Parser, function(LatLonBoundsParser, base) {

	        // Private Static Properties

	        var _instance = null;

	        // Public Static Methods

	        LatLonBoundsParser.getInstance = function() {
	            if (!_instance) {
	                _instance = new LatLonBoundsParser();
	            }
	            return _instance;
	        };

	        // Protected Properties

	        this.numberParser = null;

	        // Constructor

	        this.constructor = function() {
	            this.numberParser = NumberParser.getInstance();
	        };

	        // Public Methods

	        this.stringToValue = function(str) {
	            var values = ParseUtils.prepareTuple(str);
	            if (!values) {
	                return null;
	            }

	            var latLonBounds = new LatLonBounds();

	            var numValues = values.length;
	            if (numValues > 0) {
	                latLonBounds.s = this.numberParser.stringToValue(values[0]);
	            }
	            if (numValues > 1) {
	                latLonBounds.w = this.numberParser.stringToValue(values[1]);
	            }
	            if (numValues > 2) {
	                latLonBounds.n = this.numberParser.stringToValue(values[2]);
	            }
	            if (numValues > 3) {
	                latLonBounds.e = this.numberParser.stringToValue(values[3]);
	            }

	            return latLonBounds;
	        };

	        this.valueToString = function(value) {
	            var latLonBounds = (value instanceof LatLonBounds) ? value : null;
	            if (!latLonBounds) {
	                return null;
	            }

	            var str = "";

	            str += this.numberParser.valueToString(latLonBounds.s) + ",";
	            str += this.numberParser.valueToString(latLonBounds.w) + ",";
	            str += this.numberParser.valueToString(latLonBounds.n) + ",";
	            str += this.numberParser.valueToString(latLonBounds.e);

	            return "(" + str + ")";
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/parsers/NumberParser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Parser = __webpack_require__("splunk/parsers/Parser");
	    var ParseUtils = __webpack_require__("splunk/parsers/ParseUtils");

	    return Class(module.id, Parser, function(NumberParser, base) {

	        // Private Static Properties

	        var _instance = null;

	        // Public Static Methods

	        NumberParser.getInstance = function() {
	            if (!_instance) {
	                _instance = new NumberParser();
	            }
	            return _instance;
	        };

	        // Public Methods

	        this.stringToValue = function(str) {
	            str = ParseUtils.trimWhiteSpace(str);
	            return str ? Number(str) : NaN;
	        };

	        this.valueToString = function(value) {
	            return ((value != null) && Class.isNumber(value)) ? String(value) : String(NaN);
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/parsers/Parser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var ObjectUtil = __webpack_require__("contrib/jg_lib/utils/ObjectUtil");
	    var ParseUtils = __webpack_require__("splunk/parsers/ParseUtils");

	    return Class(module.id, Object, function(Parser, base) {

	        // Constructor

	        this.constructor = function() {
	            // noop
	        };

	        // Public Methods

	        this.deserialize = function(attributes) {
	            if (attributes == null) {
	                throw new Error("Parameter attributes must be non-null.");
	            }

	            var str = ObjectUtil.get(attributes, "");
	            str = !ParseUtils.isEmpty(str) ? ("" + str) : null;

	            return this.stringToValue(str);
	        };

	        this.serialize = function(value) {
	            var str = this.valueToString(value);
	            return !ParseUtils.isEmpty(str) ? { "": str } : null;
	        };

	        this.hasNestedFormat = function() {
	            return false;
	        };

	        this.stringToValue = function(str) {
	            return null;
	        };

	        this.valueToString = function(value) {
	            return null;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/parsers/ParseUtils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");

	    return Class(module.id, function(ParseUtils) {

	        // Private Static Constants

	        var _UNESCAPE_PATTERN = /\\([.\n\r]?)/g;
	        var _ESCAPE_SLASH_PATTERN = /\\/g;
	        var _ESCAPE_QUOTE_PATTERN = /"/g;
	        var _TRIM_PATTERN = /^[\s\xA0\u2028\u2029\uFEFF]+|[\s\xA0\u2028\u2029\uFEFF]+$/g;

	        // Public Static Methods

	        ParseUtils.prepareArray = function(str) {
	            str = ParseUtils.trimWhiteSpace(str);
	            if (!str) {
	                return null;
	            }

	            var length = str.length;
	            if (length < 2) {
	                return null;
	            }

	            if (str.charAt(0) != "[") {
	                return null;
	            }

	            if (str.charAt(length - 1) != "]") {
	                return null;
	            }

	            str = str.substring(1, length - 1);
	            length = str.length;

	            var arr = [];
	            var index = -1;
	            var value;

	            while (index < length) {
	                index++;
	                value = _readUntil(str, index, ",");
	                index += value.length;

	                value = ParseUtils.trimWhiteSpace(value);
	                if (value || (index < length) || (arr.length > 0)) {
	                    arr.push(ParseUtils.unescapeString(value));
	                }
	            }

	            return arr;
	        };

	        ParseUtils.prepareObject = function(str) {
	            str = ParseUtils.trimWhiteSpace(str);
	            if (!str) {
	                return null;
	            }

	            var length = str.length;
	            if (length < 2) {
	                return null;
	            }

	            if (str.charAt(0) != "{") {
	                return null;
	            }

	            if (str.charAt(length - 1) != "}") {
	                return null;
	            }

	            str = str.substring(1, length - 1);
	            length = str.length;

	            var obj = {};
	            var index = 0;
	            var key;
	            var value;

	            while (index < length) {
	                key = _readUntil(str, index, ":");
	                index += key.length + 1;

	                if (index > length) {
	                    break;
	                }

	                value = _readUntil(str, index, ",");
	                index += value.length + 1;

	                key = ParseUtils.unescapeString(key);
	                if (key) {
	                    obj[key] = ParseUtils.unescapeString(value);
	                }
	            }

	            return obj;
	        };

	        ParseUtils.prepareTuple = function(str) {
	            str = ParseUtils.trimWhiteSpace(str);
	            if (!str) {
	                return null;
	            }

	            var length = str.length;
	            if (length < 2) {
	                return null;
	            }

	            if (str.charAt(0) != "(") {
	                return null;
	            }

	            if (str.charAt(length - 1) != ")") {
	                return null;
	            }

	            str = str.substring(1, length - 1);
	            length = str.length;

	            var arr = [];
	            var index = -1;
	            var value;

	            while (index < length) {
	                index++;
	                value = _readUntil(str, index, ",");
	                index += value.length;

	                value = ParseUtils.trimWhiteSpace(value);
	                if (value || (index < length) || (arr.length > 0)) {
	                    arr.push(ParseUtils.unescapeString(value));
	                }
	            }

	            return arr;
	        };

	        ParseUtils.unescapeString = function(str) {
	            str = ParseUtils.trimWhiteSpace(str);
	            if (!str) {
	                return str;
	            }

	            var length = str.length;
	            if (length < 2) {
	                return str;
	            }

	            if (str.charAt(0) != "\"") {
	                return str;
	            }

	            if (str.charAt(length - 1) != "\"") {
	                return str;
	            }

	            str = str.substring(1, length - 1);
	            if (!str) {
	                return str;
	            }

	            str = str.replace(_UNESCAPE_PATTERN, "$1");

	            return str;
	        };

	        ParseUtils.escapeString = function(str) {
	            if ((str == null) || !Class.isString(str)) {
	                return null;
	            }

	            // two simple replace calls are faster than str.replace(/([\\"])/g, "\\$1")
	            str = str.replace(_ESCAPE_SLASH_PATTERN, "\\\\");
	            str = str.replace(_ESCAPE_QUOTE_PATTERN, "\\\"");

	            return "\"" + str + "\"";
	        };

	        ParseUtils.trimWhiteSpace = function(str) {
	            if ((str == null) || !Class.isString(str)) {
	                return null;
	            }

	            if (!str) {
	                return str;
	            }

	            return str.replace(_TRIM_PATTERN, "");
	        };

	        ParseUtils.isEmpty = function(str) {
	            return ((str == null) || (str === ""));
	        };

	        // Private Static Methods

	        var _readUntil = function(str, startIndex, endChar) {
	            var substr = "";

	            var index = startIndex;
	            var length = str.length;
	            var ch;
	            var isQuote = false;
	            var nestLevel = 0;
	            var nestBeginChar;
	            var nestEndChar;

	            while (index < length) {
	                ch = str.charAt(index);
	                if (isQuote) {
	                    if (ch == "\"") {
	                        isQuote = false;
	                    } else if (ch == "\\") {
	                        substr += ch;
	                        index++;
	                        ch = str.charAt(index);
	                    }
	                } else if (nestLevel > 0) {
	                    if (ch == nestEndChar) {
	                        nestLevel--;
	                    } else if (ch == nestBeginChar) {
	                        nestLevel++;
	                    } else if (ch == "\"") {
	                        isQuote = true;
	                    }
	                } else if (ch != endChar) {
	                    if (ch == "[") {
	                        nestLevel = 1;
	                        nestBeginChar = "[";
	                        nestEndChar = "]";
	                    } else if (ch == "{") {
	                        nestLevel = 1;
	                        nestBeginChar = "{";
	                        nestEndChar = "}";
	                    } else if (ch == "(") {
	                        nestLevel = 1;
	                        nestBeginChar = "(";
	                        nestEndChar = ")";
	                    } else if (ch == "\"") {
	                        isQuote = true;
	                    }
	                } else {
	                    break;
	                }

	                substr += ch;
	                index++;
	            }

	            return substr;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/parsers/LatLonParser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var LatLon = __webpack_require__("splunk/mapping/LatLon");
	    var NumberParser = __webpack_require__("splunk/parsers/NumberParser");
	    var Parser = __webpack_require__("splunk/parsers/Parser");
	    var ParseUtils = __webpack_require__("splunk/parsers/ParseUtils");

	    return Class(module.id, Parser, function(LatLonParser, base) {

	        // Private Static Properties

	        var _instance = null;

	        // Public Static Methods

	        LatLonParser.getInstance = function() {
	            if (!_instance) {
	                _instance = new LatLonParser();
	            }
	            return _instance;
	        };

	        // Protected Properties

	        this.numberParser = null;

	        // Constructor

	        this.constructor = function() {
	            this.numberParser = NumberParser.getInstance();
	        };

	        // Public Methods

	        this.stringToValue = function(str) {
	            var values = ParseUtils.prepareTuple(str);
	            if (!values) {
	                return null;
	            }

	            var latLon = new LatLon();

	            var numValues = values.length;
	            if (numValues > 0) {
	                latLon.lat = this.numberParser.stringToValue(values[0]);
	            }
	            if (numValues > 1) {
	                latLon.lon = this.numberParser.stringToValue(values[1]);
	            }

	            return latLon;
	        };

	        this.valueToString = function(value) {
	            var latLon = (value instanceof LatLon) ? value : null;
	            if (!latLon) {
	                return null;
	            }

	            var str = "";

	            str += this.numberParser.valueToString(latLon.lat) + ",";
	            str += this.numberParser.valueToString(latLon.lon);

	            return "(" + str + ")";
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/palettes/FieldColorPalette":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Color = __webpack_require__("contrib/jg_lib/graphics/Color");
	    var ObservableObjectProperty = __webpack_require__("contrib/jg_lib/properties/ObservableObjectProperty");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var ObjectUtil = __webpack_require__("contrib/jg_lib/utils/ObjectUtil");
	    var ColorPalette = __webpack_require__("splunk/palettes/ColorPalette");

	    return Class(module.id, ColorPalette, function(FieldColorPalette, base) {

	        // Public Properties

	        this.fieldColors = new ObservableObjectProperty("fieldColors", Color, {})
	            .itemReadFilter(function(value) {
	                return value.clone();
	            })
	            .itemWriteFilter(function(value) {
	                return value ? value.clone().normalize() : new Color();
	            })
	            .itemChangeComparator(function(oldValue, newValue) {
	                return !oldValue.equals(newValue);
	            });

	        this.defaultColorPalette = new ObservableProperty("defaultColorPalette", ColorPalette, null);

	        // Constructor

	        this.constructor = function(fieldColors, defaultColorPalette) {
	            base.constructor.call(this);

	            if (fieldColors != null) {
	                this.set("fieldColors", fieldColors);
	            }
	            if (defaultColorPalette != null) {
	                this.set("defaultColorPalette", defaultColorPalette);
	            }
	        };

	        // Protected Methods

	        this.getItemOverride = function(properties, ratio, span, value) {
	            if (value != null) {
	                var color = ObjectUtil.get(properties.fieldColors, "" + value);
	                if (color) {
	                    return color.clone();
	                }
	            }

	            var defaultColorPalette = properties.defaultColorPalette;
	            if (defaultColorPalette) {
	                return defaultColorPalette.getItem(ratio, span, value);
	            }

	            return null;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/properties/ObservableObjectProperty":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var MObservableProperty = __webpack_require__("contrib/jg_lib/properties/MObservableProperty");
		var ObjectProperty = __webpack_require__("contrib/jg_lib/properties/ObjectProperty");
		var Class = __webpack_require__("contrib/jg_lib/Class");
		var ObjectUtil = __webpack_require__("contrib/jg_lib/utils/ObjectUtil");
		var Set = __webpack_require__("contrib/jg_lib/utils/Set");

		return Class(module.id, ObjectProperty, function(ObservableObjectProperty, base)
		{

			Class.mixin(this, MObservableProperty);

			// Private Properties

			this._defaultValueSet = null;
			this._itemChangeComparator = null;

			// Constructor

			this.constructor = function(name, itemType, defaultValue)
			{
				base.constructor.call(this, name, itemType, defaultValue);

				var defaultValueSet = this._defaultValueSet = new Set();
				if (defaultValue)
				{
					for (var p in defaultValue)
					{
						if (ObjectUtil.has(defaultValue, p))
							defaultValueSet.add(defaultValue[p]);
					}
				}

				this.initChangeEvent();
			};

			// Public Accessor Methods

			this.itemChangeComparator = function(value)
			{
				if (!arguments.length)
					return this._itemChangeComparator;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter itemChangeComparator must be of type Function.");

				this._itemChangeComparator = value || null;

				return this;
			};

			// Protected Methods

			this.setupContext = function(context)
			{
				base.setupContext.call(this, context);

				this.setupDependencySupport(context);
			};

			this.teardownContext = function(context)
			{
				this.teardownDependencySupport(context);

				base.teardownContext.call(this, context);
			};

			this.writeValue = function(context, value)
			{
				var oldValue = context.value;

				this.teardownDependencyChangeHandler(context);

				base.writeValue.call(this, context, value);

				if (value != null)
				{
					var dependencyList = [];
					var defaultValueSet = this._defaultValueSet;
					var itemValue;
					for (var p in value)
					{
						if (ObjectUtil.has(value, p))
						{
							itemValue = value[p];
							if ((itemValue != null) && itemValue.isEventTarget && itemValue.isObservableTarget && !defaultValueSet.has(itemValue))
								dependencyList.push({ target: itemValue, event: itemValue.change });
						}
					}
					if (dependencyList.length > 0)
						this.setupDependencyChangeHandler(context, dependencyList);
				}

				this.notifyChange(context, oldValue, value);
			};

			this.needsWrite = function(context, value)
			{
				return this.hasChange(context, context.value, value);
			};

			this.hasChange = function(context, oldValue, newValue)
			{
				var changeComparator = this.changeComparator();
				if (changeComparator)
					return changeComparator.call(context.target, oldValue, newValue) ? true : false;

				if (oldValue === newValue)
					return false;

				if ((oldValue == null) || (newValue == null))
					return true;

				var p;
				for (p in oldValue)
				{
					if (ObjectUtil.has(oldValue, p) && (!ObjectUtil.has(newValue, p) || this.hasItemChange(context, oldValue[p], newValue[p])))
						return true;
				}
				for (p in newValue)
				{
					if (ObjectUtil.has(newValue, p) && !ObjectUtil.has(oldValue, p))
						return true;
				}

				return false;
			};

			this.hasItemChange = function(context, oldValue, newValue)
			{
				if (this._itemChangeComparator)
					return this._itemChangeComparator.call(context.target, oldValue, newValue) ? true : false;

				// default comparison that handles NaN
				return ((oldValue !== newValue) && ((oldValue === oldValue) || (newValue === newValue)));
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/jg_lib/properties/ObjectProperty":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * Copyright (c) 2007-2016 Jason Gatt
	 * 
	 * Released under the MIT license:
	 * http://opensource.org/licenses/MIT
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module)
	{

		var Property = __webpack_require__("contrib/jg_lib/properties/Property");
		var Class = __webpack_require__("contrib/jg_lib/Class");
		var ObjectUtil = __webpack_require__("contrib/jg_lib/utils/ObjectUtil");

		return Class(module.id, Property, function(ObjectProperty, base)
		{

			// Private Properties

			this._itemType = null;
			this._itemTypeChecker = null;
			this._itemNullValue = null;
			this._allowNull = false;
			this._itemReadFilter = null;
			this._itemWriteFilter = null;

			// Constructor

			this.constructor = function(name, itemType, defaultValue)
			{
				if ((itemType != null) && !Class.isFunction(itemType))
					throw new Error("Parameter itemType must be of type Function.");

				this._itemType = itemType || null;
				this._itemTypeChecker = itemType ? Class.getTypeChecker(itemType) : null;

				if (itemType === Number)
					this._itemNullValue = NaN;
				else if (itemType === Boolean)
					this._itemNullValue = false;
				else
					this._itemNullValue = null;

				if (defaultValue == null)
					defaultValue = {};

				// base constructor must be called after initializing _itemType so that defaultValue can be type checked
				base.constructor.call(this, name, Object, defaultValue);
			};

			// Public Accessor Methods

			this.itemType = function()
			{
				return this._itemType;
			};

			this.allowNull = function(value)
			{
				if (!arguments.length)
					return this._allowNull;

				if ((value != null) && !Class.isBoolean(value))
					throw new Error("Parameter allowNull must be of type Boolean.");

				this._allowNull = (value === true);

				return this;
			};

			this.itemReadFilter = function(value)
			{
				if (!arguments.length)
					return this._itemReadFilter;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter itemReadFilter must be of type Function.");

				this._itemReadFilter = value || null;

				return this;
			};

			this.itemWriteFilter = function(value)
			{
				if (!arguments.length)
					return this._itemWriteFilter;

				if ((value != null) && !Class.isFunction(value))
					throw new Error("Parameter itemWriteFilter must be of type Function.");

				this._itemWriteFilter = value || null;

				return this;
			};

			// Public Methods

			this.get = function(target)
			{
				var value = base.get.call(this, target);

				var itemNullValue = this._itemNullValue;
				var itemReadFilter = this._itemReadFilter;
				var itemValueMap = {};
				var itemValue;
				var itemFilterValue;

				for (var p in value)
				{
					if (!ObjectUtil.has(value, p))
						continue;

					itemValue = value[p];

					if (itemReadFilter)
					{
						itemFilterValue = itemReadFilter.call(target, itemValue);
						if (itemFilterValue !== itemValue)
						{
							if (!this.isValidItemType(itemFilterValue))
								throw new Error("Value returned from itemReadFilter for property \"" + this.name() + "\" must be of type " + this.getItemTypeName() + ".");

							itemValue = itemFilterValue;
						}
					}

					if (itemValue == null)
						itemValue = itemNullValue;

					itemValueMap[p] = itemValue;
				}

				return itemValueMap;
			};

			this.set = function(target, value)
			{
				var allowNull = this._allowNull;
				var itemNullValue = this._itemNullValue;
				var itemWriteFilter = this._itemWriteFilter;
				var itemValueMap = {};
				var itemValue;
				var itemFilterValue;

				for (var p in value)
				{
					if (!ObjectUtil.has(value, p))
						continue;

					itemValue = value[p];

					if (itemValue == null)
					{
						if (!allowNull)
							continue;

						itemValue = itemNullValue;
					}

					if (itemWriteFilter)
					{
						itemFilterValue = itemWriteFilter.call(target, itemValue);
						if (itemFilterValue !== itemValue)
						{
							if (!this.isValidItemType(itemFilterValue))
								throw new Error("Value returned from itemWriteFilter for property \"" + this.name() + "\" must be of type " + this.getItemTypeName() + ".");

							itemValue = itemFilterValue;
						}
					}

					itemValueMap[p] = itemValue;
				}

				base.set.call(this, target, itemValueMap);
			};

			this.getTypeName = function()
			{
				return "Object<" + this.getItemTypeName() + ">";
			};

			this.getItemTypeName = function()
			{
				return this._itemType ? (Class.getName(this._itemType) || (this.name() + ".itemType")) : "*";
			};

			this.isValidType = function(value)
			{
				if (value == null)
					return true;

				if (!Class.isObject(value))
					return false;

				for (var p in value)
				{
					if (ObjectUtil.has(value, p) && !this.isValidItemType(value[p]))
						return false;
				}

				return true;
			};

			this.isValidItemType = function(value)
			{
				return ((value == null) || !this._itemTypeChecker || this._itemTypeChecker(value));
			};

		});

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/parsers/ArrayParser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Map = __webpack_require__("contrib/jg_lib/utils/Map");
	    var ObjectUtil = __webpack_require__("contrib/jg_lib/utils/ObjectUtil");
	    var Parser = __webpack_require__("splunk/parsers/Parser");
	    var ParseUtils = __webpack_require__("splunk/parsers/ParseUtils");
	    var StringParser = __webpack_require__("splunk/parsers/StringParser");

	    return Class(module.id, Parser, function(ArrayParser, base) {

	        // Private Static Constants

	        var _R_INDEX = /^(0|[1-9][0-9]*)(?:\.|$)/;

	        // Private Static Properties

	        var _instances = new Map();

	        // Public Static Methods

	        ArrayParser.getInstance = function(elementParser) {
	            var instance = _instances.get(elementParser);
	            if (!instance) {
	                instance = new ArrayParser(elementParser);
	                _instances.set(elementParser, instance);
	            }
	            return instance;
	        };

	        // Private Static Methods

	        var _extractIndexAttributes = function(attributes) {
	            var indexAttributesMap = {};
	            var indexAttributes;
	            var index;
	            var match;

	            for (var attr in attributes) {
	                if (ObjectUtil.has(attributes, attr) && !ParseUtils.isEmpty(attributes[attr])) {
	                    match = attr.match(_R_INDEX);
	                    if (match) {
	                        index = match[1];
	                        indexAttributes = ObjectUtil.get(indexAttributesMap, index);
	                        if (!indexAttributes) {
	                            indexAttributes = indexAttributesMap[index] = {};
	                        }
	                        indexAttributes[attr.substring(match[0].length)] = attributes[attr];
	                    }
	                }
	            }

	            var indexAttributesList = ObjectUtil.pairs(indexAttributesMap);
	            if (!indexAttributesList.length) {
	                return null;
	            }

	            indexAttributesList.sort(_indexPairComparator);
	            for (var i = 0, l = indexAttributesList.length; i < l; i++) {
	                indexAttributesList[i] = indexAttributesList[i][1];
	            }

	            return indexAttributesList;
	        };

	        var _mergeIndexAttributes = function(attributes, index, indexAttributes) {
	            index = "" + index;
	            for (var attr in indexAttributes) {
	                if (ObjectUtil.has(indexAttributes, attr) && !ParseUtils.isEmpty(indexAttributes[attr])) {
	                    attributes[index + (attr ? ("." + attr) : "")] = indexAttributes[attr];
	                }
	            }
	        };

	        var _indexPairComparator = function(pair1, pair2) {
	            return pair1[0] - pair2[0];
	        };

	        // Protected Properties

	        this.elementParser = null;

	        // Constructor

	        this.constructor = function(elementParser) {
	            if (elementParser == null) {
	                throw new Error("Parameter elementParser must be non-null.");
	            }
	            if (!(elementParser instanceof Parser)) {
	                throw new Error("Parameter elementParser must be of type " + Class.getName(Parser) + ".");
	            }

	            this.elementParser = elementParser;
	        };

	        // Public Methods

	        this.deserialize = function(attributes) {
	            if (!this.hasNestedFormat()) {
	                return base.deserialize.call(this, attributes);
	            }

	            if (attributes == null) {
	                throw new Error("Parameter attributes must be non-null.");
	            }

	            var indexAttributes = _extractIndexAttributes(attributes);
	            if (!indexAttributes) {
	                return null;
	            }

	            var arr = [];

	            var elementParser = this.elementParser;
	            for (var i = 0, l = indexAttributes.length; i < l; i++) {
	                arr.push(elementParser.deserialize(indexAttributes[i]));
	            }

	            return arr;
	        };

	        this.serialize = function(value) {
	            if (!this.hasNestedFormat()) {
	                return base.serialize.call(this, value);
	            }

	            if ((value == null) || !Class.isArray(value) || !value.length) {
	                return null;
	            }

	            var attributes = {};

	            var elementParser = this.elementParser;
	            var indexAttributes;
	            var index = 0;
	            for (var i = 0, l = value.length; i < l; i++) {
	                indexAttributes = elementParser.serialize(value[i]);
	                if (indexAttributes) {
	                    _mergeIndexAttributes(attributes, index, indexAttributes);
	                    index++;
	                }
	            }

	            return attributes;
	        };

	        this.hasNestedFormat = function() {
	            return this.elementParser.hasNestedFormat();
	        };

	        this.stringToValue = function(str) {
	            var arr = ParseUtils.prepareArray(str);
	            if (!arr) {
	                return null;
	            }

	            var elementParser = this.elementParser;
	            for (var i = 0, l = arr.length; i < l; i++) {
	                arr[i] = elementParser.stringToValue(arr[i]);
	            }

	            return arr;
	        };

	        this.valueToString = function(value) {
	            var arr = ((value != null) && Class.isArray(value)) ? value : null;
	            if (!arr) {
	                return null;
	            }

	            var str = "";

	            var elementParser = this.elementParser;
	            var elementValue;
	            for (var i = 0, l = arr.length; i < l; i++) {
	                elementValue = arr[i];
	                if (str) {
	                    str += ",";
	                }
	                if (elementParser instanceof StringParser) {
	                    str += ParseUtils.escapeString(elementParser.valueToString(elementValue));
	                } else {
	                    str += elementParser.valueToString(elementValue);
	                }
	            }

	            return "[" + str + "]";
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/parsers/StringParser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Parser = __webpack_require__("splunk/parsers/Parser");

	    return Class(module.id, Parser, function(StringParser, base) {

	        // Private Static Properties

	        var _instance = null;

	        // Public Static Methods

	        StringParser.getInstance = function() {
	            if (!_instance) {
	                _instance = new StringParser();
	            }
	            return _instance;
	        };

	        // Public Methods

	        this.stringToValue = function(str) {
	            return ((str != null) && Class.isString(str)) ? str : null;
	        };

	        this.valueToString = function(value) {
	            return ((value != null) && Class.isString(value)) ? value : null;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/parsers/BooleanParser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Parser = __webpack_require__("splunk/parsers/Parser");
	    var ParseUtils = __webpack_require__("splunk/parsers/ParseUtils");

	    return Class(module.id, Parser, function(BooleanParser, base) {

	        // Private Static Properties

	        var _instance = null;

	        // Public Static Methods

	        BooleanParser.getInstance = function() {
	            if (!_instance) {
	                _instance = new BooleanParser();
	            }
	            return _instance;
	        };

	        // Public Methods

	        this.stringToValue = function(str) {
	            str = ParseUtils.trimWhiteSpace(str);
	            if (str) {
	                str = str.toLowerCase();
	            }
	            return ((str === "true") || (str === "t") || (str === "1"));
	        };

	        this.valueToString = function(value) {
	            return (value === true) ? "true" : "false";
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/parsers/ColorParser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Color = __webpack_require__("contrib/jg_lib/graphics/Color");
	    var Parser = __webpack_require__("splunk/parsers/Parser");
	    var ParseUtils = __webpack_require__("splunk/parsers/ParseUtils");

	    return Class(module.id, Parser, function(ColorParser, base) {

	        // Private Static Properties

	        var _instance = null;

	        // Public Static Methods

	        ColorParser.getInstance = function() {
	            if (!_instance) {
	                _instance = new ColorParser();
	            }
	            return _instance;
	        };

	        // Public Methods

	        this.stringToValue = function(str) {
	            str = ParseUtils.trimWhiteSpace(str);
	            return str ? Color.fromString(str) : null;
	        };

	        this.valueToString = function(value) {
	            return (value instanceof Color) ? value.toString((value.a < 1) ? "rgba" : "hex") : null;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/parsers/ObjectParser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Map = __webpack_require__("contrib/jg_lib/utils/Map");
	    var ObjectUtil = __webpack_require__("contrib/jg_lib/utils/ObjectUtil");
	    var Parser = __webpack_require__("splunk/parsers/Parser");
	    var ParseUtils = __webpack_require__("splunk/parsers/ParseUtils");
	    var StringParser = __webpack_require__("splunk/parsers/StringParser");

	    return Class(module.id, Parser, function(ObjectParser, base) {

	        // Private Static Properties

	        var _instances = new Map();

	        // Public Static Methods

	        ObjectParser.getInstance = function(elementParser) {
	            var instance = _instances.get(elementParser);
	            if (!instance) {
	                instance = new ObjectParser(elementParser);
	                _instances.set(elementParser, instance);
	            }
	            return instance;
	        };

	        // Protected Properties

	        this.elementParser = null;

	        // Constructor

	        this.constructor = function(elementParser) {
	            if (elementParser == null) {
	                throw new Error("Parameter elementParser must be non-null.");
	            }
	            if (!(elementParser instanceof Parser)) {
	                throw new Error("Parameter elementParser must be of type " + Class.getName(Parser) + ".");
	            }

	            this.elementParser = elementParser;
	        };

	        // Public Methods

	        this.stringToValue = function(str) {
	            var obj = ParseUtils.prepareObject(str);
	            if (!obj) {
	                return null;
	            }

	            var elementParser = this.elementParser;
	            for (var key in obj) {
	                if (ObjectUtil.has(obj, key)) {
	                    obj[key] = elementParser.stringToValue(obj[key]);
	                }
	            }

	            return obj;
	        };

	        this.valueToString = function(value) {
	            var obj = ((value != null) && Class.isObject(value)) ? value : null;
	            if (!obj) {
	                return null;
	            }

	            var str = "";

	            var elementParser = this.elementParser;
	            for (var key in obj) {
	                if (ObjectUtil.has(obj, key)) {
	                    if (str) {
	                        str += ",";
	                    }
	                    str += ParseUtils.escapeString(key) + ":";
	                    if (elementParser instanceof StringParser) {
	                        str += ParseUtils.escapeString(elementParser.valueToString(obj[key]));
	                    } else {
	                        str += elementParser.valueToString(obj[key]);
	                    }
	                }
	            }

	            return "{" + str + "}";
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/utils/GeoJsonUtils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");

	    return Class(module.id, function(GeoJsonUtils) {

	        // Public Static Methods

	        GeoJsonUtils.createFromBoundingBox = function(s, w, n, e) {
	            s = Number(s);
	            w = Number(w);
	            n = Number(n);
	            e = Number(e);
	            return ({
	                'type': 'MultiPolygon',
	                'coordinates': [
	                    [
	                        [
	                            [w, s],
	                            [e, s],
	                            [e, n],
	                            [w, n]
	                        ]
	                    ]
	                ]
	            });
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/controls/ResetZoomControl":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var $ = __webpack_require__("shim/jquery");
	    var _ = __webpack_require__("require/underscore");
	    var Leaflet = __webpack_require__("shim/leaflet");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var LatLon = __webpack_require__("splunk/mapping/LatLon");
	    var ControlBase = __webpack_require__("splunk/mapping/controls/ControlBase");
	    var Rect = __webpack_require__("splunk/vectors/Rect");
	    var Text = __webpack_require__("splunk/vectors/Text");
	    var Viewport = __webpack_require__("splunk/vectors/Viewport");

	    return Class(module.id, ControlBase, function(ResetZoomControl, base) {

	        // Constructor

	        this.constructor = function(options) {
	            this.leafletOptions = options;
	            base.constructor.call(this);
	        };

	        // Public Methods

	        this.setOriginalZoom = function(originalZoom) {
	            this.leafletControl.originalZoom = parseInt(originalZoom, 10);
	        };

	        this.setOriginalCenter = function(originalCenter) {
	            originalCenter = originalCenter.replace('(', '');
	            originalCenter = originalCenter.replace(')', '');
	            var latLonArr = originalCenter.split(',');
	            var lat = parseFloat(latLonArr[0]);
	            var lon = parseFloat(latLonArr[1]);
	            this.leafletControl.originalCenter = new LatLon(lat, lon);
	        };

	        // Protected Methods

	        this.createLeafletControl = function() {
	            return new LeafletResetZoom(this.leafletOptions);
	        };

	        this.onAddedToMap = function(map) {
	            base.onAddedToMap.call(this, map);
	            this.leafletControl.setMap(map);
	        };

	        // Private Nested Classes

	        var LeafletResetZoom = Leaflet.Control.extend({

	            options: {
	                position: 'topleft'
	            },

	            linkTemplate: '<a class="leaflet-reset-zoom" href="#" title="<%= resetZoomText %>" style="width: 15px; height:15px; padding: 2px; "> <svg version="1.1"\
	                    id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"\
	                    width="15px" height="15px" viewBox="0 0 15 15" enable-background="new 0 0 15 15" xml:space="preserve">\
	                    <g>\
	                        <ellipse fill="#333333" cx="7.586" cy="7.287" rx="2.313" ry="2.33"/>\
	                        <path fill="#333333" d="M7.586,13.525c-3.384,0-6.136-2.753-6.136-6.136s2.753-6.136,6.136-6.136c3.385,0,6.136,2.753,6.136,6.136\
	                            S10.969,13.525,7.586,13.525z M7.586,2.712c-2.579,0-4.677,2.098-4.677,4.677s2.098,4.677,4.677,4.677\
	                            c2.58,0,4.677-2.098,4.677-4.677S10.165,2.712,7.586,2.712z"/>\
	                        <rect y="6.429" fill="#333333" width="2.143" height="2.143"/>\
	                        <rect x="12.857" y="6.429" fill="#333333" width="2.143" height="2.143"/>\
	                        <rect x="6.429" y="12.857" fill="#333333" width="2.143" height="2.143"/>\
	                        <rect x="6.429" fill="#333333" width="2.143" height="2.143"/>\
	                    </g>\
	                </svg></a>',

	            initialize: function(options) {
	                this._button = {};
	                this.setButton();
	                var mouseOverText = _('Reset to original position and zoom').t();
	                this.linkTemplate = _.template(this.linkTemplate);
	                this.linkTemplate = this.linkTemplate({resetZoomText: mouseOverText});

	                this.originalZoom = options.originalZoom ? parseInt(options.originalZoom, 10) : 2;
	                if (options.originalCenter) {
	                    this.originalCenter = options.originalCenter.replace('(','');
	                    this.originalCenter = this.originalCenter.replace(')','');
	                    var latLonArr = this.originalCenter.split(',');
	                    var lat = parseFloat(latLonArr[0]);
	                    var lon = parseFloat(latLonArr[1]);
	                    this.originalCenter = new LatLon(lat, lon);
	                } else {
	                    this.originalZoom = 2;
	                }
	            },

	            onAdd: function(map) {
	                this._map = map;
	                var container = Leaflet.DomUtil.create('div', 'leaflet-reset-zoom leaflet-control-zoom');
	                this._container = container;
	                this._update();
	                return this._container;
	            },

	            setButton: function() {
	                var button = {
	                    'text': _('Reset Zoom').t()
	                };
	                this._button = button;
	                this._update();
	            },

	            _update: function() {
	                if (!this._map) {
	                    return;
	                }
	                this._container.innerHTML = '';
	                this._makeButton(this._button);
	            },

	            _makeButton: function(button) {
	                 var newButton = Leaflet.DomUtil.create('div', 'leaflet-reset-zoom', this._container);

	                 if (button.text !== '') {
	                     $(newButton).append(this.linkTemplate);
	                 }
	                $(newButton).find('a').on('focus', function() {
	                    $(this).css('background-color', 'rgba(212, 221, 254, 0.75)');
	                });

	                $(newButton).find('a').on('focusout', function() {
	                    $(this).css('background-color', 'rgba(255, 255, 255, 0.75');
	                });

	                $(newButton).on('click', function(e) {
	                    e.stopPropagation();
	                    e.preventDefault();
	                    this.map.set('center', this.originalCenter);
	                    this.map.set('zoom', this.originalZoom);
	                }.bind(this));
	                $(newButton).dblclick(function(e){
	                    e.stopPropagation();
	                });
	            },

	            setMap: function(map) {
	                this.map = map;
	            }

	        });

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/vectors/Rect":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Shape = __webpack_require__("splunk/vectors/Shape");
	    var VectorElement = __webpack_require__("splunk/vectors/VectorElement");

	    return Class(module.id, Shape, function(Rect, base) {

	        // Constructor

	        this.constructor = function(x, y, width, height) {
	            base.constructor.call(this);
	        };

	        // Public Methods

	        this.x = function(value) {
	            return this;
	        };

	        this.y = function(value) {
	            return this;
	        };

	        this.width = function(value) {
	            return this;
	        };

	        this.height = function(value) {
	            return this;
	        };

	        // Private Nested Classes

	        var SVGRect = Class(function(SVGRect) {

	            // Constructor

	            this.constructor = function(x, y, width, height) {
	                base.constructor.call(this, "rect");

	                if (x != null) {
	                    this.x(x);
	                }
	                if (y != null) {
	                    this.y(y);
	                }
	                if (width != null) {
	                    this.width(width);
	                }
	                if (height != null) {
	                    this.height(height);
	                }
	            };

	            // Public Methods

	            this.x = function(value) {
	                if ((value != null) && (value > -Infinity) && (value < Infinity)) {
	                    this.element.setAttribute("x", value);
	                } else {
	                    this.element.removeAttribute("x");
	                }

	                return this;
	            };

	            this.y = function(value) {
	                if ((value != null) && (value > -Infinity) && (value < Infinity)) {
	                    this.element.setAttribute("y", value);
	                } else {
	                    this.element.removeAttribute("y");
	                }

	                return this;
	            };

	            this.width = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this.element.setAttribute("width", Math.max(value, 0));
	                } else {
	                    this.element.removeAttribute("width");
	                }

	                return this;
	            };

	            this.height = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this.element.setAttribute("height", Math.max(value, 0));
	                } else {
	                    this.element.removeAttribute("height");
	                }

	                return this;
	            };

	        });

	        var VMLRect = Class(function(VMLRect) {

	            // Constructor

	            this.constructor = function(x, y, width, height) {
	                base.constructor.call(this, "rect");

	                if (x != null) {
	                    this.x(x);
	                }
	                if (y != null) {
	                    this.y(y);
	                }
	                if (width != null) {
	                    this.width(width);
	                }
	                if (height != null) {
	                    this.height(height);
	                }
	            };

	            // Public Methods

	            this.x = function(value) {
	                if ((value != null) && (value > -Infinity) && (value < Infinity)) {
	                    this.element.style.left = Math.round(value) + "px";
	                } else {
	                    this.element.style.left = "";
	                }

	                return this;
	            };

	            this.y = function(value) {
	                if ((value != null) && (value > -Infinity) && (value < Infinity)) {
	                    this.element.style.top = Math.round(value) + "px";
	                } else {
	                    this.element.style.top = "";
	                }

	                return this;
	            };

	            this.width = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this.element.style.width = Math.round(Math.max(value, 0)) + "px";
	                } else {
	                    this.element.style.width = "";
	                }

	                return this;
	            };

	            this.height = function(value) {
	                if ((value != null) && (value < Infinity)) {
	                    this.element.style.height = Math.round(Math.max(value, 0)) + "px";
	                } else {
	                    this.element.style.height = "";
	                }

	                return this;
	            };

	        });

	        VectorElement.mixin(this, SVGRect, VMLRect);

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/vectors/Text":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Rectangle = __webpack_require__("contrib/jg_lib/geom/Rectangle");
	    var Shape = __webpack_require__("splunk/vectors/Shape");
	    var VectorElement = __webpack_require__("splunk/vectors/VectorElement");

	    return Class(module.id, Shape, function(Text, base) {

	        // Constructor

	        this.constructor = function(x, y, text) {
	            base.constructor.call(this);
	        };

	        // Public Methods

	        this.x = function(value) {
	            return this;
	        };

	        this.y = function(value) {
	            return this;
	        };

	        this.text = function(value) {
	            return this;
	        };

	        this.alignmentBaseline = function(value) {
	            return this;
	        };

	        this.baselineShift = function(value) {
	            return this;
	        };

	        this.direction = function(value) {
	            return this;
	        };

	        this.dominantBaseline = function(value) {
	            return this;
	        };

	        this.fontFamily = function(value) {
	            return this;
	        };

	        this.fontSize = function(value) {
	            return this;
	        };

	        this.fontSizeAdjust = function(value) {
	            return this;
	        };

	        this.fontStretch = function(value) {
	            return this;
	        };

	        this.fontStyle = function(value) {
	            return this;
	        };

	        this.fontVariant = function(value) {
	            return this;
	        };

	        this.fontWeight = function(value) {
	            return this;
	        };

	        this.glyphOrientationHorizontal = function(value) {
	            return this;
	        };

	        this.glyphOrientationVertical = function(value) {
	            return this;
	        };

	        this.kerning = function(value) {
	            return this;
	        };

	        this.letterSpacing = function(value) {
	            return this;
	        };

	        this.textAnchor = function(value) {
	            return this;
	        };

	        this.textDecoration = function(value) {
	            return this;
	        };

	        this.textRendering = function(value) {
	            return this;
	        };

	        this.unicodeBidi = function(value) {
	            return this;
	        };

	        this.wordSpacing = function(value) {
	            return this;
	        };

	        this.writingMode = function(value) {
	            return this;
	        };

	        this.getBounds = function() {
	            return new Rectangle();
	        };

	        // Private Nested Classes

	        var SVGText = Class(function(SVGText) {

	            // Constructor

	            this.constructor = function(x, y, text) {
	                base.constructor.call(this, "text");

	                this.fillColor(0x000000);
	                if (x != null) {
	                    this.x(x);
	                }
	                if (y != null) {
	                    this.y(y);
	                }
	                if (text != null) {
	                    this.text(text);
	                }
	            };

	            // Public Methods

	            this.x = function(value) {
	                if ((value != null) && (value > -Infinity) && (value < Infinity)) {
	                    this.element.setAttribute("x", value);
	                } else {
	                    this.element.removeAttribute("x");
	                }

	                return this;
	            };

	            this.y = function(value) {
	                if ((value != null) && (value > -Infinity) && (value < Infinity)) {
	                    this.element.setAttribute("y", value);
	                } else {
	                    this.element.removeAttribute("y");
	                }

	                return this;
	            };

	            this.text = function(value) {
	                this.element.textContent = value ? value : "";

	                return this;
	            };

	            this.alignmentBaseline = function(value) {
	                if (value) {
	                    this.element.setAttribute("alignment-baseline", value);
	                } else {
	                    this.element.removeAttribute("alignment-baseline");
	                }

	                return this;
	            };

	            this.baselineShift = function(value) {
	                if (value) {
	                    this.element.setAttribute("baseline-shift", value);
	                } else {
	                    this.element.removeAttribute("baseline-shift");
	                }

	                return this;
	            };

	            this.direction = function(value) {
	                if (value) {
	                    this.element.setAttribute("direction", value);
	                } else {
	                    this.element.removeAttribute("direction");
	                }

	                return this;
	            };

	            this.dominantBaseline = function(value) {
	                if (value) {
	                    this.element.setAttribute("dominant-baseline", value);
	                } else {
	                    this.element.removeAttribute("dominant-baseline");
	                }

	                return this;
	            };

	            this.fontFamily = function(value) {
	                if (value) {
	                    this.element.setAttribute("font-family", value);
	                } else {
	                    this.element.removeAttribute("font-family");
	                }

	                return this;
	            };

	            this.fontSize = function(value) {
	                if (value) {
	                    this.element.setAttribute("font-size", value);
	                } else {
	                    this.element.removeAttribute("font-size");
	                }

	                return this;
	            };

	            this.fontSizeAdjust = function(value) {
	                if (value) {
	                    this.element.setAttribute("font-size-adjust", value);
	                } else {
	                    this.element.removeAttribute("font-size-adjust");
	                }

	                return this;
	            };

	            this.fontStretch = function(value) {
	                if (value) {
	                    this.element.setAttribute("font-stretch", value);
	                } else {
	                    this.element.removeAttribute("font-stretch");
	                }

	                return this;
	            };

	            this.fontStyle = function(value) {
	                if (value) {
	                    this.element.setAttribute("font-style", value);
	                } else {
	                    this.element.removeAttribute("font-style");
	                }

	                return this;
	            };

	            this.fontVariant = function(value) {
	                if (value) {
	                    this.element.setAttribute("font-variant", value);
	                } else {
	                    this.element.removeAttribute("font-variant");
	                }

	                return this;
	            };

	            this.fontWeight = function(value) {
	                if (value) {
	                    this.element.setAttribute("font-weight", value);
	                } else {
	                    this.element.removeAttribute("font-weight");
	                }

	                return this;
	            };

	            this.glyphOrientationHorizontal = function(value) {
	                if (value) {
	                    this.element.setAttribute("glyph-orientation-horizontal", value);
	                } else {
	                    this.element.removeAttribute("glyph-orientation-horizontal");
	                }

	                return this;
	            };

	            this.glyphOrientationVertical = function(value) {
	                if (value) {
	                    this.element.setAttribute("glyph-orientation-vertical", value);
	                } else {
	                    this.element.removeAttribute("glyph-orientation-vertical");
	                }

	                return this;
	            };

	            this.kerning = function(value) {
	                if (value) {
	                    this.element.setAttribute("kerning", value);
	                } else {
	                    this.element.removeAttribute("kerning");
	                }

	                return this;
	            };

	            this.letterSpacing = function(value) {
	                if (value) {
	                    this.element.setAttribute("letter-spacing", value);
	                } else {
	                    this.element.removeAttribute("letter-spacing");
	                }

	                return this;
	            };

	            this.textAnchor = function(value) {
	                if (value) {
	                    this.element.setAttribute("text-anchor", value);
	                } else {
	                    this.element.removeAttribute("text-anchor");
	                }

	                return this;
	            };

	            this.textDecoration = function(value) {
	                if (value) {
	                    this.element.setAttribute("text-decoration", value);
	                } else {
	                    this.element.removeAttribute("text-decoration");
	                }

	                return this;
	            };

	            this.textRendering = function(value) {
	                if (value) {
	                    this.element.setAttribute("text-rendering", value);
	                } else {
	                    this.element.removeAttribute("text-rendering");
	                }

	                return this;
	            };

	            this.unicodeBidi = function(value) {
	                if (value) {
	                    this.element.setAttribute("unicode-bidi", value);
	                } else {
	                    this.element.removeAttribute("unicode-bidi");
	                }

	                return this;
	            };

	            this.wordSpacing = function(value) {
	                if (value) {
	                    this.element.setAttribute("word-spacing", value);
	                } else {
	                    this.element.removeAttribute("word-spacing");
	                }

	                return this;
	            };

	            this.writingMode = function(value) {
	                if (value) {
	                    this.element.setAttribute("writing-mode", value);
	                } else {
	                    this.element.removeAttribute("writing-mode");
	                }

	                return this;
	            };

	            this.getBounds = function() {
	                try {
	                    var box = this.element.getBBox();
	                    return new Rectangle(box.x, box.y, box.width, box.height);
	                } catch (e) {
	                    return new Rectangle();
	                }
	            };

	        });

	        var VMLText = Class(function(VMLText) {
	        });

	        VectorElement.mixin(this, SVGText, VMLText);

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/axis/NumericAxis":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var BaseAxis = __webpack_require__("splunk/mapping/axis/BaseAxis");

	    return Class(module.id, BaseAxis, function(NumericAxis, base) {

	        // Public Methods

	        this.valueToAbsolute = function(value) {
	            if (value === null || value === "") {
	                return NaN;
	            }
	            var absoluteVal = Number(value);
	            if (absoluteVal > -Infinity && absoluteVal < Infinity) {
	                return absoluteVal;
	            } else {
	                return NaN;
	            }
	        };

	        this.absoluteToValue = function(absolute) {
	            return absolute;
	        };

	        // Protected Methods

	        this.processValues = function(values) {
	            var processedValues = [];
	            for (var i = 0; i < values.length; i++) {
	                var processedValue = this.valueToAbsolute(values[i]);
	                if (!isNaN(processedValue)) {
	                    processedValues.push(processedValue);
	                }
	            }
	            return processedValues;
	        };

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/controls/NumericalLegend":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var $ = __webpack_require__("shim/jquery");
	    var _ = __webpack_require__("require/underscore");
	    var i18n = __webpack_require__("stubs/i18n");
	    var Leaflet = __webpack_require__("shim/leaflet");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Pass = __webpack_require__("contrib/jg_lib/async/Pass");
	    var Color = __webpack_require__("contrib/jg_lib/graphics/Color");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var BaseAxis = __webpack_require__("splunk/mapping/axis/BaseAxis");
	    var ControlBase = __webpack_require__("splunk/mapping/controls/ControlBase");
	    var ColorPalette = __webpack_require__("splunk/palettes/ColorPalette");
	    var ListColorPalette = __webpack_require__("splunk/palettes/ListColorPalette");
	    var MathUtils = __webpack_require__("util/math_utils");
	    var svgUtil = __webpack_require__("util/svg");

	    return Class(module.id, ControlBase, function(NumericalLegend, base) {

	        // Private Static Constants

	        var _LABEL_OFFSET_LEFT = 35;
	        var _LABEL_BOTTOM_PADDING = 5;
	        var _LABEL_HEIGHT = 16;
	        var _LEGEND_LEFT_MARGIN = 12;
	        var _PIXEL_PER_CHARACTER_ESTIMATE = 7;
	        var _LEGEND_RIGHT_MARGIN = 12;
	        var _LABEL_X = 35;
	        var _SWATCH_X = 12;
	        var _SWATCH_WIDTH = 16;
	        var _SWATCH_LABEL_SPACE = _LABEL_X - _SWATCH_X - _SWATCH_WIDTH;
	        var _SWATCH_HEIGHT = 12;
	        var _LEGEND_SPACING = _LEGEND_LEFT_MARGIN + _SWATCH_WIDTH + _SWATCH_LABEL_SPACE + _LEGEND_RIGHT_MARGIN;
	        var _TEXT_HEIGHT = 10;
	        var _INITIAL_Y = 20;

	        // Public Passes

	        this.computeExtendedPass = new Pass('computeExtended', 0.121);

	        // Public Properties

	        this.axis = new ObservableProperty('axis', BaseAxis, null)
	            .onChange(function(e) {
	                if (e.target === this) {
	                    if (e.oldValue) {
	                        e.oldValue.unregister(this);
	                    }
	                    if (e.newValue) {
	                        e.newValue.register(this);
	                        this.invalidate('computeExtendedPass');
	                    }
	                    this.invalidate('renderPass');
	                } else if (e.property && (e.property === e.target.containedMinimum || e.property === e.target.containedMaximum)) {
	                        this.invalidate('computeExtendedPass');
	                } else if (e.property && (e.property === e.target.extendedMinimum || e.property === e.target.extendedMaximum)) {
	                        this.invalidate('renderPass');
	                }
	            });

	        this.bins = new ObservableProperty('bins', Number, 5)
	            .writeFilter(function(value) {
	                return !isNaN(value) ? Math.min(Math.max(Math.floor(value), 1), 9) : 5;
	            })
	            .onChange(function(e) {
	                this.invalidate('computeExtendedPass');
	                this.invalidate('renderPass');
	            });

	        this.neutralPoint = new ObservableProperty('neutralPoint', Number, NaN)
	            .writeFilter(function(value) {
	                return ((value > -Infinity) && (value < Infinity)) ? value : NaN;
	            })
	            .onChange(function(e) {
	                this.invalidate('computeExtendedPass');
	                this.invalidate('renderPass');
	            });

	        this.colorPalette = new ObservableProperty('colorPalette', ColorPalette, null)
	            .onChange(function(e) {
	                this.invalidate('renderPass');
	            });

	        this.selectedField = new ObservableProperty('selectedField', String, null)
	            .onChange(function(e) {
	                this.invalidate('renderPass');
	            });

	        // Constructor

	        this.constructor = function(options) {
	            this.leafletOptions = options ? options : {};
	            base.constructor.call(this);
	        };

	        // Public Methods

	        this.computeExtended = function() {
	            var axis = this.get('axis');
	            if (!axis) {
	                return;
	            }

	            var containedMinimum = axis.get('containedMinimum');
	            var containedMaximum = axis.get('containedMaximum');
	            if (!_.isFinite(containedMinimum) || !_.isFinite(containedMaximum)) {
	                axis.provideExtendedRange(this, NaN, NaN);
	                return;
	            }

	            var bins = this.getInternal('bins');
	            var neutralPoint = this.getInternal('neutralPoint');
	            var useNeutralPoint = !_.isNaN(neutralPoint);
	            var axisHasRange = containedMaximum > containedMinimum;
	            var containedRange = containedMaximum - containedMinimum;

	            var allowedMultipliers = [1, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9, 10];
	            var nearestPowerOfTen, extendedBinSize, bestFitMultiplier;
	            if (!axisHasRange) {
	                // If the axis has no range (e.g. only one data point), create an artificial bin size based on the
	                // nearest power of ten to the data point, unless it's a zero in which case default to 1.
	                extendedBinSize = MathUtils.nearestPowerOfTen(containedMinimum || 1);
	            } else {
	                var rawBinSize = containedRange / bins;
	                // Calculate the nearest power of ten that is less than the raw bin size.
	                nearestPowerOfTen = MathUtils.nearestPowerOfTen(rawBinSize);
	                bestFitMultiplier = _(allowedMultipliers).find(function(multiplier) {
	                    return (multiplier * nearestPowerOfTen) >= rawBinSize;
	                });
	                // Set the extended bin size to the next greatest multiple of that power of ten, starting at the raw bins size.
	                extendedBinSize = bestFitMultiplier * nearestPowerOfTen;
	            }

	            var extendedMinimum, extendedMaximum, halfRange;
	            if (!axisHasRange) {
	                // If the axis has no range (e.g. only one data point), create an artificial bin size based on the
	                // nearest power of ten to the data point, unless it's a zero in which case default to 1.
	                halfRange = extendedBinSize * (bins / 2);
	                extendedMinimum = containedMinimum - halfRange;
	                extendedMaximum = containedMinimum + halfRange;
	            } else if (!useNeutralPoint) {
	                // Set the extended min to the next lowest multiple of the nearest power of ten, then extrapolate to find the extended max.
	                extendedMinimum = Math.floor(containedMinimum / nearestPowerOfTen) * nearestPowerOfTen;
	                extendedMaximum = extendedMinimum + (bins * extendedBinSize);

	                // By shifting the minimum downward, we might have caused the contained maximum to no longer be in the range.
	                // If that is the case, increase the best fit multiplier until the maximum is contained.
	                while (extendedMaximum < containedMaximum) {
	                    bestFitMultiplier = allowedMultipliers[_(allowedMultipliers).indexOf(bestFitMultiplier) + 1] || bestFitMultiplier + 1;
	                    extendedBinSize = bestFitMultiplier * nearestPowerOfTen;
	                    extendedMaximum = extendedMinimum + (bins * extendedBinSize);
	                }
	            } else {
	                // Assume here that the choropleth layer's axis range handling routine will have placed the neutral point in the middle of the axis range,
	                // this routine needs to make sure that does not change (i.e. if the range is to be extended it should be done symmetrically).
	                halfRange = extendedBinSize * (bins / 2);
	                extendedMinimum = neutralPoint - halfRange;
	                extendedMaximum = neutralPoint + halfRange;
	            }
	            axis.provideExtendedRange(this, extendedMinimum, extendedMaximum);
	        };

	        this.render = function() {
	            var container = this.leafletControl.getContainer();
	            $(container).empty();
	            if (!this.getInternal('isVisible')) {
	                return;
	            }
	            var axis = this.get('axis');
	            if (axis) {
	                var minimum = axis.get('extendedMinimum');
	                var maximum = axis.get('extendedMaximum');
	                if (minimum !== Infinity && maximum !== -Infinity) {
	                    var bins = this.getInternal('bins');
	                    var height = _LABEL_HEIGHT*bins + _INITIAL_Y - _SWATCH_HEIGHT + _LABEL_BOTTOM_PADDING;
	                    var width = _LEGEND_LEFT_MARGIN;
	                    this.svg = svgUtil.createElement('svg').attr('height', height).attr('fill', 'rgba(0,0,0,1)');
	                    var labelsGroup = svgUtil.createElement('g')
	                        .attr('class', 'svg-labels')
	                        .attr('height', height);
	                    var colorsGroup = svgUtil.createElement('g')
	                        .attr('class', 'svg-colors');
	                    var backgroundRect = svgUtil.createElement('rect')
	                        .attr('class', 'background')
	                        .attr('height', height)
	                        .attr('fill', 'rgb(255,255,255)')
	                        .attr('fill-opacity', '0.75');

	                    // this is where you take the min and max, divide by the number of bins
	                    var binSize = (maximum - minimum)/bins;
	                    var colorPalette = this.getInternal('colorPalette');
	                    var selectedField = this.getInternal('selectedField');
	                    var y, swatchColor, swatchLabel, lower, upper;
	                    var longestLabel = '';
	                    var paletteSpan = Math.max(bins - 1, 0);
	                    var paletteRatio;
	                    for (var i = 0; i < bins; i++) {
	                        y = _INITIAL_Y + (i*_LABEL_HEIGHT);
	                        lower = MathUtils.stripFloatingPointErrors(minimum + i*binSize);
	                        upper = MathUtils.stripFloatingPointErrors(lower + binSize);
	                        swatchLabel = i18n.format_decimal(lower) + ' - ' + i18n.format_decimal(upper);
	                        if (!colorPalette) {
	                            swatchColor = new Color();
	                        } else {
	                            paletteRatio = (paletteSpan > 0) ? (i / paletteSpan) : 0;
	                            swatchColor = colorPalette.getItem(paletteRatio, paletteSpan) || new Color();
	                        }
	                        labelsGroup.append(this._drawRow({ label: swatchLabel, y: y, lower: lower}, selectedField));
	                        colorsGroup.append(this._drawColor(y - _TEXT_HEIGHT, swatchColor, lower, selectedField));
	                        if (swatchLabel.length > longestLabel.length) {
	                            longestLabel = swatchLabel;
	                        }
	                    }
	                    width += _LEGEND_SPACING + longestLabel.length*_PIXEL_PER_CHARACTER_ESTIMATE;
	                     $(this.svg).attr('width', width);
	                    $(backgroundRect).attr('width', width);
	                    this.svg.append(backgroundRect);
	                    this.svg.append(labelsGroup);
	                    this.svg.append(colorsGroup);
	                    $(container).append(this.svg);
	                    this._adjustLegend(width);
	                }
	            }
	        };

	        /*
	         * Only use for testing purposes
	         */
	        this.getContainer = function() {
	            return this.leafletControl.getContainer();
	        };

	        // Protected Methods

	        this.createLeafletControl = function() {
	            return new LeafletNumericalLegend(this.leafletOptions);
	        };

	        // Private Methods

	        /*
	         * For interoperability with the PDF renderer, all measurements must be made by
	         * calling getBBox() on a <text> element.
	         */
	        this._adjustLegend = function() {
	            var labels = $(this.svg[0]).find('.svg-label text');
	            var longestLabelElem = labels[0];
	            var longestLabelWidth = 0;
	            for (var i = 0; i < labels.length; i++) {
	                if (labels[i].getBBox().width > longestLabelWidth) {
	                    longestLabelElem = labels[i];
	                    longestLabelWidth = longestLabelElem.getBBox().width;
	                }
	            }
	            if (longestLabelElem) {
	                var newWidth = _LEGEND_SPACING + longestLabelWidth;
	                $(this.svg).attr('width', newWidth);
	                $(this.svg).find('.background').attr('width', newWidth);
	            }
	        };

	        this._drawRow = function(value, selectedField) {
	            var isUnselected = ((selectedField != null) && (selectedField !== ('' + value.lower)));
	            var labelGroup,
	                labelText;
	            labelGroup = svgUtil.createElement('g')
	                .attr('class', 'svg-label legend-label legend-elem')
	                .data('fieldName', value.lower);
	            labelText = svgUtil.createElement('text')
	                .attr({
	                    y: value.y,
	                    x: _LABEL_X
	                })
	                .attr('fill-opacity', isUnselected ? 0.3 : 1)
	                .text(value.label)
	                .css({
	                    'font-size': '12px',
	                    'font-weight': 'regular',
	                    'fill': '#333333',
	                    'padding-top': '12px',
	                    'cursor': 'default'
	                });
	            labelGroup.append(labelText);
	            return labelGroup;
	        };

	        this._drawColor = function(y, color, fieldName, selectedField) {
	            var isUnselected = ((selectedField != null) && (selectedField !== ('' + fieldName)));
	            var fillColor = color.toString('rgb');
	            var rect = svgUtil.createElement('rect')
	                .attr('height', _SWATCH_HEIGHT)
	                .attr('width', _SWATCH_WIDTH)
	                .attr('y', y)
	                .attr('x', _SWATCH_X)
	                .attr('fill', isUnselected ? 'rgb(51,51,51)' : fillColor)
	                .attr('fill-opacity', isUnselected ? 0.1 : 1)
	                .attr('class', 'legend-color legend-elem')
	                .data('fieldName', fieldName)
	                .attr('stroke', isUnselected ? 'rgb(51,51,51)' : fillColor)
	                .attr('stroke-opacity', isUnselected ? 0.1 : 1)
	                .css('cursor', 'default');

	            if (fillColor === 'rgb(255,255,255)') {
	                rect.attr('stroke', 'rgb(204,204,204)');
	            }
	            return rect;
	        };

	        // Private Nested Classes

	        var LeafletNumericalLegend = Leaflet.Control.extend({

	            options: {
	                position: 'bottomright'
	            },

	            initialize: function(options) {
	                this.container = Leaflet.DomUtil.create('div', 'legend');
	                // The pointer-events style from Leaflet's CSS needs to be overridden
	                // or the legend will ignore mouse events (SPL-105109).
	                $(this.container).css('pointer-events', 'visiblepainted');
	            },

	            onAdd: function(map) {
	                return this.container;
	            },

	            getContainer: function() {
	                return this.container;
	            }

	        });

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "splunk/mapping/controls/CategoricalVisualLegend":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var $ = __webpack_require__("shim/jquery");
	    var Leaflet = __webpack_require__("shim/leaflet");
	    var Class = __webpack_require__("contrib/jg_lib/Class");
	    var Color = __webpack_require__("contrib/jg_lib/graphics/Color");
	    var ObservableProperty = __webpack_require__("contrib/jg_lib/properties/ObservableProperty");
	    var Legend = __webpack_require__("splunk/charting/Legend");
	    var ControlBase = __webpack_require__("splunk/mapping/controls/ControlBase");
	    var ColorPalette = __webpack_require__("splunk/palettes/ColorPalette");
	    var svgUtil = __webpack_require__("util/svg");

	    return Class(module.id, ControlBase, function(CategoricalVisualLegend, base) {

	        // Private Static Constants

	        var _LABEL_HEIGHT = 16;
	        var _LABEL_BOTTOM_PADDING = 5;
	        var _LEGEND_BOTTOM_PADDING = 15;
	        var _LEGEND_LEFT_MARGIN = 12;
	        var _PIXEL_PER_CHARACTER_ESTIMATE = 7;
	        var _LEGEND_RIGHT_MARGIN = 12;
	        var _LABEL_X = 35;
	        var _SWATCH_X = 12;
	        var _SWATCH_WIDTH = 16;
	        var _SWATCH_LABEL_SPACE = _LABEL_X - _SWATCH_X - _SWATCH_WIDTH;
	        var _SWATCH_HEIGHT = 12;
	        var _LEGEND_SPACING = _LEGEND_LEFT_MARGIN + _SWATCH_WIDTH + _SWATCH_LABEL_SPACE + _LEGEND_RIGHT_MARGIN;
	        var _LABEL_OFFSET_LEFT = 50;
	        var _TEXT_HEIGHT = 10;
	        var _INITIAL_Y = 20;
	        var _LEGEND_MAX_HEIGHT = 200 - _LEGEND_BOTTOM_PADDING - _INITIAL_Y;

	        // Public Properties

	        this.colorPalette = new ObservableProperty('colorPalette', ColorPalette, null)
	            .onChange(function(e) {
	                this.invalidate('renderPass');
	            });

	        this.legend = new ObservableProperty('legend', Legend, null)
	            .onChange(function(e) {
	                this.invalidate('renderPass');
	            });

	        this.maxHeight = new ObservableProperty('maxHeight', Number, Infinity)
	            .onChange(function(e) {
	                this.invalidate('renderPass');
	            });

	        this.clip = new ObservableProperty('clip', Boolean, false)
	            .onChange(function(e) {
	                this.invalidate('renderPass');
	            });

	        this.selectedField = new ObservableProperty('selectedField', String, null)
	            .onChange(function(e) {
	                this.invalidate('renderPass');
	            });

	        // Public Methods

	        this.render = function() {
	            var container = this.leafletControl.getContainer();
	            $(container).empty();
	            if (!this.getInternal('isVisible')) {
	                return;
	            }
	            var legend = this.getInternal('legend'),
	                labels = [];
	            if (legend) {
	                labels = legend.get('actualLabels');
	            }
	            if (labels && labels.length > 0) {
	                var height = _LABEL_HEIGHT*labels.length + _INITIAL_Y - _SWATCH_HEIGHT + _LABEL_BOTTOM_PADDING;
	                height = Math.min(height, this.getInternal('maxHeight') - _INITIAL_Y - _LABEL_BOTTOM_PADDING);
	                this.svg = svgUtil.createElement('svg').attr('height', height);
	                var labelsGroup = svgUtil.createElement('g')
	                    .attr('class', 'svg-labels')
	                    .attr('height', height);
	                var colorsGroup = svgUtil.createElement('g')
	                    .attr('class', 'svg-colors');
	                var backgroundRect = svgUtil.createElement('rect')
	                    .attr('class', 'background')
	                    .attr('height', height)
	                    .attr('fill', 'rgb(255,255,255)')
	                    .attr('fill-opacity', '0.75');

	                if (this.getInternal('clip')) {
	                    this.svg.append('\
	                        <defs>\
	                            <clipPath id="choropleth-legend-clip">\
	                                <rect class="clip" x="0" y="0"></rect>\
	                            </clipPath>\
	                        </defs>');
	                    this.svg.find('.clip').attr('height', height);
	                    labelsGroup.attr('clip-path', 'url(#choropleth-legend-clip)');
	                    colorsGroup.attr('clip-path', 'url(#choropleth-legend-clip)');
	                }

	                var selectedField = this.getInternal('selectedField');
	                var width = _LEGEND_LEFT_MARGIN;
	                var longestLabel = '';
	                for (var i = 0; i < labels.length; i++) {
	                    if (i == 0) {
	                        longestLabel = labels[i];
	                    }
	                    if (labels[i].length > longestLabel.length) {
	                        longestLabel = labels[i];
	                    }
	                    var y =  _INITIAL_Y + i*(_LABEL_HEIGHT);
	                    labelsGroup.append(this._drawRow({label: labels[i], y: y}, selectedField));
	                    colorsGroup.append(this._drawColor(y - _TEXT_HEIGHT, i, labels[i], selectedField));
	                }
	                width += _LEGEND_SPACING + longestLabel.length* _PIXEL_PER_CHARACTER_ESTIMATE;
	                $(this.svg).attr('width', width);
	                $(backgroundRect).attr('width', width);
	                if (height > _LEGEND_MAX_HEIGHT) {
	                    $(container).css('overflow-y', 'scroll');
	                    $(container).css('overflow-x', 'hidden');
	                    $(container).css('height', _LEGEND_MAX_HEIGHT);
	                }
	                this.svg.append(backgroundRect);
	                this.svg.append(labelsGroup);
	                this.svg.append(colorsGroup);
	                $(container).append(this.svg);
	                this._adjustLegend();
	            }
	        };

	        /*
	         * only for testing
	         */
	        this.getContainer = function() {
	            return this.leafletControl.getContainer();
	        };

	        // Protected Methods

	        this.createLeafletControl = function() {
	            return new LeafletCategoricalLegend(this.leafletOptions);
	        };

	        // Private Methods

	        /*
	         * For interoperability with the PDF renderer, all measurements must be made by
	         * calling getBBox() on a <text> element.
	         */
	        this._adjustLegend = function() {
	            var labels = $(this.svg[0]).find('.svg-label text');
	            var longestLabelElem = labels[0];
	            var longestLabelWidth = 0;
	            for (var i = 0; i < labels.length; i++) {
	                if (labels[i].getBBox().width > longestLabelWidth) {
	                    longestLabelElem = labels[i];
	                    longestLabelWidth = longestLabelElem.getBBox().width;
	                }
	            }
	            if (longestLabelElem) {
	                var newWidth = _LEGEND_SPACING + longestLabelWidth;
	                $(this.svg).attr('width', newWidth);
	                $(this.svg).find('.background').attr('width', newWidth);
	                if (this.getInternal('clip')) {
	                    this.svg.find('.clip').attr('width', newWidth);
	                }
	            }
	        };

	        this._drawColor = function(y, i, label, selectedField) {
	            var isUnselected = ((selectedField != null) && (selectedField !== ('' + label)));
	            var legend = this.getInternal('legend');
	            if (!legend) {
	                return;
	            }
	            var colorPalette = this.getInternal('colorPalette');
	            var color = 'rgb(0,0,0)';
	            if (colorPalette) {
	                var paletteSpan = Math.max(legend.getNumLabels() - 1, 0);
	                var paletteRatio = (paletteSpan > 0) ? (legend.getLabelIndex(label) / paletteSpan) : 0;
	                color = (colorPalette.getItem(paletteRatio, paletteSpan, label) || new Color()).toString('rgb');
	            }
	            var rect = svgUtil.createElement('rect')
	                .attr('height', _SWATCH_HEIGHT)
	                .attr('width', _SWATCH_WIDTH)
	                .attr('y', y)
	                .attr('x', _SWATCH_X)
	                .attr('class', 'legend-color legend-elem')
	                .attr('stroke', isUnselected ? 'rgb(51,51,51)' : color)
	                .attr('stroke-opacity', isUnselected ? 0.1 : 1)
	                .attr('fill', isUnselected ? 'rgb(51,51,51)' : color)
	                .attr('fill-opacity', isUnselected ? 0.1 : 1)
	                .data('fieldName', label)
	                .css('cursor', 'default');
	            if (color === 'rgb(255,255,255)') {
	                rect.attr('stroke', 'rgb(204,204,204)');
	            }
	            return rect;
	        };

	        this._drawRow = function(value, selectedField) {
	            var isUnselected = ((selectedField != null) && (selectedField !== ('' + value.label)));
	            var labelGroup,
	                labelText;
	            labelGroup = svgUtil.createElement('g')
	                .attr('class', 'svg-label legend-label legend-elem')
	                .data('fieldName', value.label);
	            labelText = svgUtil.createElement('text')
	                .attr({
	                    y: value.y,
	                    x: _LABEL_X
	                })
	                .attr('fill-opacity', isUnselected ? 0.3 : 1)
	                .text(value.label)
	                .css({
	                    'font-size': '12px',
	                    'fill': '#333333',
	                    'font-weight': 'regular',
	                    'padding-top': '12px',
	                    'cursor': 'default'
	                });
	            labelGroup.append(labelText);
	            return labelGroup;
	        };

	        // Private Nested Classes

	        var LeafletCategoricalLegend = Leaflet.Control.extend({

	            options: {
	                position: 'bottomright'
	            },

	            initialize: function(options) {
	                this.container = Leaflet.DomUtil.create('div', 'legend');
	                Leaflet.DomEvent.disableClickPropagation(this.container);
	                // The pointer-events style from Leaflet's CSS needs to be overridden
	                // or the legend will ignore mouse events (SPL-105109).
	                $(this.container).css('pointer-events', 'visiblepainted');
	            },

	            onAdd: function(map) {
	                return this.container;
	            },

	            getContainer: function() {
	                return this.container;
	            }

	        });

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "views/shared/map/Master.pcss":
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(34);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(11)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!./../../../../../../node_modules/css-loader/index.js?sourceMap!./../../../../../../node_modules/postcss-loader/index.js!./Master.pcss", function() {
				var newContent = require("!!./../../../../../../node_modules/css-loader/index.js?sourceMap!./../../../../../../node_modules/postcss-loader/index.js!./Master.pcss");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),

/***/ "splunk/vectors/VectorElement":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require, exports, module) {

	    var Class = __webpack_require__("contrib/jg_lib/Class");

	    return Class(module.id, Object, function(VectorElement, base) {

	        // Private Static Constants

	        var _HAS_SVG = (typeof document.createElementNS === "function");
	        var _HAS_VML = (!_HAS_SVG && (function() {
	            try {
	                document.namespaces.add("splvml", "urn:schemas-microsoft-com:vml");

	                var styleText = ".splvml { behavior: url(#default#VML); display: inline-block; position: absolute; }";

	                var styleNode = document.createElement("style");
	                styleNode.setAttribute("type", "text/css");

	                var headNode = document.getElementsByTagName("head")[0];
	                headNode.appendChild(styleNode);

	                if (styleNode.styleSheet) {
	                    styleNode.styleSheet.cssText = styleText;
	                } else {
	                    styleNode.appendChild(document.createTextNode(styleText));
	                }

	                return true;
	            } catch (e) {
	                return false;
	            }
	        })());

	        // Public Static Methods

	        VectorElement.mixin = function(target, sourceSVG, sourceVML) {
	            if (_HAS_SVG) {
	                Class.mixin(target, sourceSVG);
	                // Class.mixin doesn't copy constructor, so do it manually
	                if ((sourceSVG.constructor !== Object) && (typeof sourceSVG.constructor === "function")) {
	                    target.constructor = sourceSVG.constructor;
	                }
	            } else if (_HAS_VML) {
	                Class.mixin(target, sourceVML);
	                // Class.mixin doesn't copy constructor, so do it manually
	                if ((sourceVML.constructor !== Object) && (typeof sourceVML.constructor === "function")) {
	                    target.constructor = sourceVML.constructor;
	                }
	            }
	        };

	        // Public Properties

	        this.hasSVG = _HAS_SVG;
	        this.hasVML = _HAS_VML;
	        this.element = null;

	        // Constructor

	        this.constructor = function(tagName) {
	            if ((tagName != null) && !Class.isString(tagName)) {
	                throw new Error("Parameter tagName must be of type String.");
	            }

	            this.element = this.createElement(tagName || null);
	        };

	        // Public Methods

	        this.appendTo = function(parentElement) {
	            if (parentElement == null) {
	                throw new Error("Parameter parentElement must be non-null.");
	            }
	            if (!(parentElement instanceof VectorElement)) {
	                throw new Error("Parameter parentElement must be of type " + Class.getName(VectorElement) + ".");
	            }

	            parentElement.element.appendChild(this.element);

	            return this;
	        };

	        this.remove = function() {
	            if (this.element.parentNode) {
	                this.element.parentNode.removeChild(this.element);
	            }

	            return this;
	        };

	        this.dispose = function() {
	            this.remove();

	            this.element = null;
	        };

	        this.display = function(value) {
	            this.element.style.display = value ? value : "";

	            return this;
	        };

	        this.visibility = function(value) {
	            this.element.style.visibility = value ? value : "";

	            return this;
	        };

	        this.translate = function(x, y) {
	            x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? x : 0;
	            y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? y : 0;

	            this.element.style.left = (x != 0) ? x + "px" : "";
	            this.element.style.top = (y != 0) ? y + "px" : "";

	            return this;
	        };

	        // Protected Methods

	        this.createElement = function(tagName) {
	            var dummy = document.createElement("div");
	            dummy.style.position = "absolute";
	            return dummy;
	        };

	        // Private Nested Classes

	        var SVGVectorElement = Class(function(SVGVectorElement) {

	            // Private Static Constants

	            var _NS_SVG = "http://www.w3.org/2000/svg";

	            // Public Methods

	            this.display = function(value) {
	                if (value) {
	                    this.element.setAttribute("display", value);
	                } else {
	                    this.element.removeAttribute("display");
	                }

	                return this;
	            };

	            this.visibility = function(value) {
	                if (value) {
	                    this.element.setAttribute("visibility", value);
	                } else {
	                    this.element.removeAttribute("visibility");
	                }

	                return this;
	            };

	            this.translate = function(x, y) {
	                x = ((x != null) && (x > -Infinity) && (x < Infinity)) ? x : 0;
	                y = ((y != null) && (y > -Infinity) && (y < Infinity)) ? y : 0;

	                if ((x != 0) || (y != 0)) {
	                    this.element.setAttribute("transform", "translate(" + x + "," + y + ")");
	                } else {
	                    this.element.removeAttribute("transform");
	                }

	                return this;
	            };

	            // Protected Methods

	            this.createElement = function(tagName) {
	                return document.createElementNS(_NS_SVG, tagName || "g");
	            };

	        });

	        var VMLVectorElement = Class(function(VMLVectorElement) {

	            // Protected Methods

	            this.createElement = function(tagName) {
	                return document.createElement("<splvml:" + (tagName || "group") + " class=\"splvml\">");
	            };

	        });

	        VectorElement.mixin(this, SVGVectorElement, VMLVectorElement);

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ })

});