awsJsonp([2],{

/***/ "js_charting/js_charting":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"), 
	            __webpack_require__("require/underscore"),
	            __webpack_require__("shim/highcharts"),
	            __webpack_require__("helpers/user_agent"),
	            __webpack_require__("js_charting/helpers/DataSet"),
	            __webpack_require__("js_charting/visualizations/charts/Chart"),
	            __webpack_require__("js_charting/visualizations/charts/SplitSeriesChart"),
	            __webpack_require__("js_charting/visualizations/charts/PieChart"),
	            __webpack_require__("js_charting/visualizations/charts/ScatterChart"),
	            __webpack_require__("js_charting/visualizations/charts/BubbleChart"),
	            __webpack_require__("js_charting/visualizations/gauges/RadialGauge"),
	            __webpack_require__("js_charting/visualizations/gauges/HorizontalFillerGauge"),
	            __webpack_require__("js_charting/visualizations/gauges/VerticalFillerGauge"),
	            __webpack_require__("js_charting/visualizations/gauges/HorizontalMarkerGauge"),
	            __webpack_require__("js_charting/visualizations/gauges/VerticalMarkerGauge"),
	            __webpack_require__("js_charting/util/parsing_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Highcharts,
	            userAgent,
	            DataSet,
	            Chart,
	            SplitSeriesChart,
	            PieChart,
	            ScatterChart,
	            BubbleChart,
	            RadialGauge,
	            HorizontalFillerGauge,
	            VerticalFillerGauge,
	            HorizontalMarkerGauge,
	            VerticalMarkerGauge,
	            parsingUtils
	        ) {

	    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	    // support for push-state (SPL-64487)
	    //
	    // In Firefox, a local reference to another node (e.g. <g clip-path="url(#clipPathId)">) will break whenever a push-state
	    // or replace-state action is taken (https://bugzilla.mozilla.org/show_bug.cgi?id=652991).
	    //
	    // We will hook in to the 'pushState' and 'replaceState' methods on the window.history object and fire an event to
	    // notify any listeners that they need to update all local references in their SVG.

	    if(userAgent.isFirefox()) {
	        // this local reference to the window.history is vital, otherwise it can potentially be garbage collected
	        // and our changes lost (https://bugzilla.mozilla.org/show_bug.cgi?id=593910)
	        var history = window.history;
	        _(['pushState', 'replaceState']).each(function(fnName) {
	            var original = history[fnName];
	            history[fnName] = function() {
	                original.apply(history, arguments);
	                // kind of hacky to use Highcharts as an event bus, but not sure what else to do
	                $(Highcharts).trigger('baseUriChange');
	            };
	        });
	    }

	    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	    // namespace-level methods

	    // TODO [sff] does this really need to be a public method, or could it be called under the hood from prepare()?
	    var extractChartReadyData = function(rawData) {
	        if(!rawData || !rawData.fields || !rawData.columns) {
	            throw new Error('The data object passed to extractChartReadyData did not contain fields and columns');
	        }
	        if(rawData.fields.length !== rawData.columns.length) {
	            throw new Error('The data object passed to extractChartReadyData must have the same number of fields and columns');
	        }
	        return new DataSet(rawData);
	    };

	    var createChart = function(container, properties) {
	        if(container instanceof $) {
	            container = container[0];
	        }
	        if(!_(container).isElement()) {
	            throw new Error("Invalid first argument to createChart, container must be a valid DOM element or a jQuery object");
	        }
	        properties = properties || {};
	        var chartType = properties['chart'];
	        if(chartType === 'pie') {
	            return new PieChart(container, properties);
	        }
	        if(chartType === 'scatter') {
	            return new ScatterChart(container, properties);
	        }
	        if(chartType === 'bubble') {
	            return new BubbleChart(container, properties);
	        }
	        if(chartType === 'radialGauge') {
	            return new RadialGauge(container, properties);
	        }
	        if(chartType === 'fillerGauge') {
	            return (properties['chart.orientation'] === 'x') ?
	                (new HorizontalFillerGauge(container, properties)) :
	                (new VerticalFillerGauge(container, properties));
	        }
	        if(chartType === 'markerGauge') {
	            return (properties['chart.orientation'] === 'x') ?
	                (new HorizontalMarkerGauge(container, properties)) :
	                (new VerticalMarkerGauge(container, properties));
	        }
	        // only the basic cartesian chart types (bar/column/line/area) support split-series mode
	        return (parsingUtils.normalizeBoolean(properties['layout.splitSeries'])) ?
	            (new SplitSeriesChart(container, properties)) :
	            (new Chart(container, properties));
	    };

	    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	    // public interface

	    return ({
	        extractChartReadyData: extractChartReadyData,
	        createChart: createChart
	    });

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/gauges/VerticalMarkerGauge":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("js_charting/visualizations/gauges/MarkerGauge"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/math_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            MarkerGauge,
	            langUtils,
	            mathUtils
	        ) {

	    var VerticalMarkerGauge = function(container, properties) {
	        MarkerGauge.call(this, container, properties);
	        this.verticalPadding = 10;
	    };
	    langUtils.inherit(VerticalMarkerGauge, MarkerGauge);

	    $.extend(VerticalMarkerGauge.prototype, {

	        renderGauge: function() {
	            this.markerWindowHeight = mathUtils.roundWithMin(this.height / 7, 20);
	            this.markerSideWidth = this.markerWindowHeight / 2;
	            this.markerSideCornerRad = this.markerSideWidth / 3;
	            this.bandOffsetBottom = 5 + this.markerWindowHeight / 2;
	            this.bandOffsetTop = 5 + this.markerWindowHeight / 2;
	            this.tickOffset = mathUtils.roundWithMin(this.height / 100, 3);
	            this.tickLength = mathUtils.roundWithMin(this.height / 20, 4);
	            this.tickLabelOffset = mathUtils.roundWithMin(this.height / 60, 3);
	            this.tickFontSize = mathUtils.roundWithMin(this.height / 20, 10);  // in pixels
	            this.minorTickLength = this.tickLength / 2;
	            this.backgroundCornerRad = mathUtils.roundWithMin(this.height / 60, 3);
	            this.valueFontSize = mathUtils.roundWithMin(this.height / 15, 15);  // in pixels

	            this.bandOffsetX = (!this.isShiny) ? 0 : mathUtils.roundWithMin(this.height / 60, 3);
	            MarkerGauge.prototype.renderGauge.call(this);
	        },

	        drawBackground: function() {
	            this.backgroundWidth = mathUtils.roundWithMin(this.height / 4, 50);
	            var tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.MAX_TICKS_PER_RANGE);
	            this.backgroundHeight = this.height - (2 * this.verticalPadding);
	            this.bandHeight = this.backgroundHeight - (this.bandOffsetBottom + this.bandOffsetTop);
	            this.bandWidth = (!this.isShiny) ? 30 : 10;

	            var maxLabelWidth, totalWidthNeeded,
	                maxTickValue = tickValues[tickValues.length - 1];

	            maxLabelWidth = this.predictTextWidth(this.formatValue(maxTickValue), this.tickFontSize);
	            totalWidthNeeded = this.bandOffsetX + this.bandWidth + this.tickOffset + this.tickLength + this.tickLabelOffset
	                + maxLabelWidth + this.tickLabelPaddingRight;

	            this.backgroundWidth = Math.max(this.backgroundWidth, totalWidthNeeded);

	            if(this.isShiny) {
	                this.elements.background = this.renderer.rect((this.width - this.backgroundWidth) / 2,
	                    this.verticalPadding, this.backgroundWidth, this.backgroundHeight,
	                    this.backgroundCornerRad)
	                    .attr({
	                        fill: '#edede7',
	                        stroke: 'silver',
	                        'stroke-width': 1
	                    })
	                    .add();
	            }

	            // these values depend on the adjusted background width
	            this.tickStartX = (this.width - this.backgroundWidth) / 2 + (this.bandOffsetX + this.bandWidth)
	                + this.tickOffset;
	            this.tickEndX = this.tickStartX + this.tickLength;
	            this.tickLabelStartX = this.tickEndX + this.tickLabelOffset;
	        },

	        drawBand: function() {
	            var i, startHeight, endHeight,
	                bandLeftX = ((this.width - this.backgroundWidth) / 2) + this.bandOffsetX,
	                bandBottomY = this.height - this.verticalPadding - this.bandOffsetBottom;

	            for(i = 0; i < this.ranges.length - 1; i++) {
	                startHeight = this.translateValue(this.ranges[i]);
	                endHeight = this.translateValue(this.ranges[i + 1]);
	                this.elements['colorBand' + i] = this.renderer.rect(
	                    bandLeftX, bandBottomY - endHeight,
	                    this.bandWidth, endHeight - startHeight, this.bandCornerRad
	                )
	                    .attr({
	                        fill: this.getColorByIndex(i)
	                    })
	                    .add();
	            }
	        },

	        drawMajorTick: function(height) {
	            var tickHeight = this.verticalPadding + this.backgroundHeight - (this.bandOffsetBottom + height);

	            return this.renderer.path([
	                'M', this.tickStartX, tickHeight,
	                'L', this.tickEndX, tickHeight
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.tickWidth
	                })
	                .add();
	        },

	        drawMajorTickLabel: function(height, text) {
	            var tickHeight = this.verticalPadding + this.backgroundHeight - (this.bandOffsetBottom + height);

	            return this.renderer.text(text,
	                this.tickLabelStartX, tickHeight + (this.tickFontSize / 4)
	            )
	                .attr({
	                    align: 'left'
	                })
	                .css({
	                    color: this.tickFontColor,
	                    fontSize: this.tickFontSize + 'px',
	                    lineHeight: this.tickFontSize + 'px'
	                })
	                .add();
	        },

	        drawMinorTick: function(height) {
	            var tickHeight = this.verticalPadding + this.backgroundHeight - (this.bandOffsetBottom + height);

	            return this.renderer.path([
	                'M', this.tickStartX, tickHeight,
	                'L', this.tickStartX + this.minorTickLength, tickHeight
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.minorTickWidth
	                })
	                .add();
	        },

	        drawIndicator: function(val) {
	            var markerLHSPath, markerRHSPath, markerBorderPath, markerUnderlinePath,
	                markerHeight = this.normalizedTranslateValue(val),
	                markerStartY = this.verticalPadding + this.backgroundHeight
	                    - (this.bandOffsetBottom + markerHeight),
	                markerStartX = (!this.isShiny) ? (this.width - this.backgroundWidth) / 2 - 10 : (this.width - this.backgroundWidth) / 2,
	                markerEndX = (!this.isShiny) ? markerStartX + this.bandWidth + 20 : markerStartX + this.backgroundWidth,
	                markerLineStroke = this.foregroundColor, // will be changed to red for shiny
	                markerLineWidth = 3, // wil be changed to 1 for shiny
	                markerLinePath = [
	                    'M', markerStartX, markerStartY,
	                    'L', markerEndX, markerStartY
	                ];
	            if(this.isShiny) {
	                markerLHSPath = [
	                    'M', markerStartX,
	                    markerStartY - this.markerWindowHeight / 2,
	                    'L', markerStartX - (this.markerSideWidth - this.markerSideCornerRad),
	                    markerStartY - this.markerWindowHeight / 2,
	                    'C', markerStartX - (this.markerSideWidth - this.markerSideCornerRad),
	                    markerStartY - this.markerWindowHeight / 2,
	                    markerStartX - this.markerSideWidth,
	                    markerStartY - this.markerWindowHeight / 2,
	                    markerStartX - this.markerSideWidth,
	                    markerStartY - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
	                    'L', markerStartX - this.markerSideWidth,
	                    markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
	                    'C', markerStartX - this.markerSideWidth,
	                    markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
	                    markerStartX - this.markerSideWidth,
	                    markerStartY + (this.markerWindowHeight / 2),
	                    markerStartX - (this.markerSideWidth - this.markerSideCornerRad),
	                    markerStartY + (this.markerWindowHeight / 2),
	                    'L', markerStartX,
	                    markerStartY + this.markerWindowHeight / 2,
	                    markerStartX,
	                    markerStartY - this.markerWindowHeight / 2
	                ];
	                markerRHSPath = [
	                    'M', markerEndX,
	                    markerStartY - this.markerWindowHeight / 2,
	                    'L', markerEndX + (this.markerSideWidth - this.markerSideCornerRad),
	                    markerStartY - this.markerWindowHeight / 2,
	                    'C', markerEndX + (this.markerSideWidth - this.markerSideCornerRad),
	                    markerStartY - this.markerWindowHeight / 2,
	                    markerEndX + this.markerSideWidth,
	                    markerStartY - this.markerWindowHeight / 2,
	                    markerEndX + this.markerSideWidth,
	                    markerStartY - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
	                    'L', markerEndX + this.markerSideWidth,
	                    markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
	                    'C', markerEndX + this.markerSideWidth,
	                    markerStartY + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
	                    markerEndX + this.markerSideWidth,
	                    markerStartY + (this.markerWindowHeight / 2),
	                    markerEndX + (this.markerSideWidth - this.markerSideCornerRad),
	                    markerStartY + (this.markerWindowHeight / 2),
	                    'L', markerEndX,
	                    markerStartY + this.markerWindowHeight / 2,
	                    markerEndX,
	                    markerStartY - this.markerWindowHeight / 2
	                ];
	                markerBorderPath = [
	                    'M', markerStartX,
	                    markerStartY - this.markerWindowHeight / 2,
	                    'L', markerEndX,
	                    markerStartY - this.markerWindowHeight / 2,
	                    markerEndX,
	                    markerStartY + this.markerWindowHeight / 2,
	                    markerStartX,
	                    markerStartY + this.markerWindowHeight / 2,
	                    markerStartX,
	                    markerStartY - this.markerWindowHeight / 2
	                ];
	                markerUnderlinePath = [
	                    'M', markerStartX,
	                    markerStartY + 1,
	                    'L', markerEndX,
	                    markerStartY + 1
	                ];
	                markerLineStroke = 'red';
	                markerLineWidth = 1;
	            }

	            if(this.isShiny) {
	                if(this.elements.markerLHS) {
	                    this.elements.markerLHS.destroy();
	                }
	                this.elements.markerLHS = this.renderer.path(markerLHSPath)
	                    .attr({
	                        fill: '#cccccc'
	                    })
	                    .add();
	                if(this.elements.markerRHS) {
	                    this.elements.markerRHS.destroy();
	                }
	                this.elements.markerRHS = this.renderer.path(markerRHSPath)
	                    .attr({
	                        fill: '#cccccc'
	                    })
	                    .add();
	                if(this.elements.markerWindow) {
	                    this.elements.markerWindow.destroy();
	                }
	                this.elements.markerWindow = this.renderer.rect(markerStartX,
	                    markerStartY - this.markerWindowHeight / 2, this.backgroundWidth,
	                    this.markerWindowHeight, 0)
	                    .attr({
	                        fill: 'rgba(255, 255, 255, 0.3)'
	                    })
	                    .add();
	                if(this.elements.markerBorder) {
	                    this.elements.markerBorder.destroy();
	                }
	                this.elements.markerBorder = this.renderer.path(markerBorderPath)
	                    .attr({
	                        stroke: 'white',
	                        'stroke-width': 2
	                    })
	                    .add();
	                if(this.elements.markerUnderline) {
	                    this.elements.markerUnderline.destroy();
	                }
	                this.elements.markerUnderline = this.renderer.path(markerUnderlinePath)
	                    .attr({
	                        stroke: 'white',
	                        'stroke-width': 2
	                    })
	                    .add();
	            }
	            if(this.elements.markerLine) {
	                this.elements.markerLine.destroy();
	            }
	            this.elements.markerLine = this.renderer.path(markerLinePath)
	                .attr({
	                    stroke: markerLineStroke,
	                    'stroke-width': markerLineWidth
	                })
	                .add();
	            if(this.showValue) {
	                this.drawValueDisplay(val);
	            }

	        },

	        drawValueDisplay: function(val) {
	            var valueText = this.formatValue(val),
	                markerHeight = this.normalizedTranslateValue(val),
	                valueY = this.verticalPadding + this.backgroundHeight - this.bandOffsetBottom - markerHeight;

	            if(this.elements.valueDisplay) {
	                this.elements.valueDisplay.attr({
	                    text: valueText,
	                    y: valueY + this.valueFontSize / 4
	                });
	            }
	            else {
	                this.elements.valueDisplay = this.renderer.text(
	                    valueText, (this.width - this.backgroundWidth) / 2 - this.valueOffset, valueY + this.valueFontSize / 4
	                )
	                    .css({
	                        color: 'black',
	                        fontSize: this.valueFontSize + 'px',
	                        lineHeight: this.valueFontSize + 'px',
	                        fontWeight: 'bold'
	                    })
	                    .attr({
	                        align: 'right'
	                    })
	                    .add();
	            }

	        },

	        normalizedTranslateValue: function(val) {
	            if(val < this.ranges[0]) {
	                return 0;
	            }
	            if(val > this.ranges[this.ranges.length - 1]) {
	                return this.translateValue(this.ranges[this.ranges.length - 1]);
	            }
	            return this.translateValue(val);
	        },

	        translateValue: function(val) {
	            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
	                normalizedValue = val - this.ranges[0];

	            return Math.round((normalizedValue / dataRange) * this.bandHeight);
	        }

	    });

	    return VerticalMarkerGauge;
	            
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/charts/Chart":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("shim/highcharts"),
	            __webpack_require__("js_charting/visualizations/Visualization"),
	            __webpack_require__("js_charting/components/ColorPalette"),
	            __webpack_require__("js_charting/components/axes/TimeAxis"),
	            __webpack_require__("js_charting/components/axes/CategoryAxis"),
	            __webpack_require__("js_charting/components/axes/NumericAxis"),
	            __webpack_require__("js_charting/components/Legend"),
	            __webpack_require__("js_charting/components/Tooltip"),
	            __webpack_require__("js_charting/components/SelectionWindow"),
	            __webpack_require__("js_charting/components/PanButtons"),
	            __webpack_require__("js_charting/components/ZoomOutButton"),
	            __webpack_require__("js_charting/helpers/HoverEventThrottler"),
	            __webpack_require__("js_charting/components/CartesianDataLabels"),
	            __webpack_require__("js_charting/series/series_factory"),
	            __webpack_require__("shim/splunk.util"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/testing_utils"),
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("js_charting/util/color_utils"),
	            __webpack_require__("js_charting/util/time_utils"),
	            __webpack_require__("js_charting/util/dom_utils"),
	            __webpack_require__("js_charting/util/async_utils"),
	            __webpack_require__("util/string_utils"),
	            __webpack_require__("helpers/user_agent"),
	            __webpack_require__("util/console")
	       ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	           $,
	           _,
	           Highcharts,
	           Visualization,
	           ColorPalette,
	           TimeAxis,
	           CategoryAxis,
	           NumericAxis,
	           Legend,
	           Tooltip,
	           SelectionWindow,
	           PanButtons,
	           ZoomOutButton,
	           HoverEventThrottler,
	           CartesianDataLabels,
	           seriesFactory,
	           splunkUtils,
	           langUtils,
	           testingUtils,
	           parsingUtils,
	           colorUtils,
	           timeUtils,
	           domUtils,
	           asyncUtils,
	           string_utils,
	           userAgent,
	           console
	       ) {

	    var Chart = function(container, properties) {
	        Visualization.call(this, container, properties);
	    };
	    langUtils.inherit(Chart, Visualization);

	    $.extend(Chart.prototype, {

	        HOVER_DELAY: 160,
	        EXPORT_WIDTH: 600,
	        EXPORT_HEIGHT: 400,
	        FALLBACK_HEIGHT: 250,
	        FALLBACK_WIDTH: 600,

	        PROGRESSIVE_DRAW_THRESHOLD: userAgent.isIELessThan(9) ? 100 : 1000,

	        hasLegend: true,
	        hasTooltip: true,
	        hasXAxis: true,
	        hasYAxis: true,

	        requiresExternalColors: true,
	        externalPaletteMapping: {},
	        externalPaletteSize: 0,

	        prepare: function(dataSet, properties) {
	            this.benchmark('Prepare Started');
	            var wasEmpty = this.isEmpty();
	            var hadTimeXAxis = this.hasTimeXAxis();
	            Visualization.prototype.prepare.call(this, dataSet, properties);
	            if (this.showLabels === "all" || this.showLabels === "minmax") {
	                this.initializeDataLabels();
	            }
	            this.initializeFields();
	            this.isiOS = userAgent.isiOS();
	            var isEmpty = this.isEmpty();
	            var hasTimeXAxis = this.hasTimeXAxis();
	            if(isEmpty !== wasEmpty || hadTimeXAxis !== hasTimeXAxis) {
	                this._isDirty = true;
	            }
	            if(this.shouldUpdateInPlace()) {
	                this.updateSeriesProperties();
	                this.updateAxisProperties();
	                if(!isEmpty) {
	                    this.setAllSeriesData();
	                }
	            }
	            else {
	                if(!isEmpty) {
	                    this.initializeColorPalette();
	                }
	                this.initializeSeriesList();
	                // Determine orientation based on the chart type, not the series types (SPL-86199).
	                this.axesAreInverted = this.type === 'bar';
	                if(this.hasXAxis) {
	                    this.initializeXAxisList();
	                }
	                if(this.hasYAxis) {
	                    this.initializeYAxisList();
	                }
	                if(isEmpty) {
	                    if(this.legend) {
	                        this.legend.destroy();
	                        this.legend = null;
	                    }
	                    if(this.tooltip) {
	                        this.tooltip.destroy();
	                        this.tooltip = null;
	                    }
	                }
	                else {
	                    if(this.hasLegend) {
	                        this.initializeLegend();
	                    }
	                    if(this.hasTooltip) {
	                        this.initializeTooltip();
	                    }
	                    this.setAllSeriesData();
	                    this.bindSeriesEvents();
	                }
	            }
	        },

	        initializeDataLabels: function() {
	            this.dataLabels = new CartesianDataLabels({showLabels: this.showLabels, splitSeries: this.splitSeries });
	        },

	        getFieldList: function() {
	            return _(this.seriesList).chain().invoke('getFieldList').flatten(true).compact().value();
	        },
	        
	        setExternalColorPalette: function(fieldIndexMap, paletteTotalSize) {
	            this.externalPaletteMapping = $.extend({}, fieldIndexMap);
	            this.externalPaletteSize = paletteTotalSize;
	        },

	        handleDraw: function(callback) {
	            console.debug('drawing a chart with dimensions:', { width: this.width, height: this.height });
	            console.debug('drawing a chart with properties:', this.properties);
	            console.debug('drawing a chart with data:', this.dataSet.toJSON());
	            this.benchmark('Draw Started');
	            this.applyColorPalette();
	            // if there is already a draw in progress, cancel it
	            this.cancelPendingDraw();

	            if(this.shouldUpdateInPlace()) {
	                this.redrawInPlace(callback);
	                return;
	            }

	            this.hcConfig = this.getConfig();
	            console.debug('config object to be sent to highcharts:', this.hcConfig);
	            if(this.hcChart) {
	                this.destroy();
	                this.bindSeriesEvents();
	                if(this.legend) {
	                    this.bindLegendEvents();
	                }
	            }
	            if(this.shouldProgressiveDraw()) {
	                this.hcConfig.firstRenderOverride = _(this.firstRenderOverride).bind(this);
	                this.hcConfig.renderOverride = _(this.renderOverride).bind(this);
	            }
	            var that = this;
	            new Highcharts.Chart(this.hcConfig, function(chart) {
	                that.hcChart = chart;
	                if(that.testMode) {
	                    testingUtils.initializeTestingMetaData(that, that.xFields, that.getClassName());
	                    testingUtils.createGlobalReference(that, chart);
	                }
	                // this event is actually coming from the push state listener in js_charting/js_charting.js
	                // we are just using the Highcharts object as a shared event bus
	                $(Highcharts).on('baseUriChange.' + that.id, function() {
	                    that.$container.find('[clip-path]').each(function() {
	                        // just need to unset and reset the clip-path to force a refresh with the new base URI
	                        var $this = $(this),
	                            clipPath = $this.attr('clip-path');

	                        $this.removeAttr('clip-path');
	                        $this.attr('clip-path', clipPath);
	                    });
	                });

	                that.addEventHandlers(chart);
	                that.onChartLoad(chart);
	                that.onChartLoadOrRedraw(chart);
	                if(that.hasTooltip && !that.isEmpty()) {
	                    that.enableTooltip(chart);
	                }
	                that.cacheDrawnDimensions();
	                that.benchmark('Draw Finished');
	                callback(that, that.benchmarks);
	                // DEBUGGING
	                // window.chart = that
	            });
	        },

	        redrawInPlace: function(callback) {
	            console.log('in place redraw!');
	            if(!this.hcChart) {
	                throw new Error('Cannot call redrawInPlace if chart does not already exist');
	            }

	            // redraw all series in the list
	            _(this.seriesList).invoke('redraw', false);
	            var existingChartSeries = this.hcChart.series,
	                incomingSeriesConfigs = this.getSeriesConfigList();

	            // if there are more existing series than incoming, remove the extras
	            if(existingChartSeries.length > incomingSeriesConfigs.length) {
	                _(existingChartSeries.slice(incomingSeriesConfigs.length)).invoke('remove', false);
	            }
	            // if there are more incoming series than existing, add the new ones
	            else if(existingChartSeries.length < incomingSeriesConfigs.length) {
	                _(incomingSeriesConfigs.slice(existingChartSeries.length)).each(function(seriesConfig) {
	                    this.hcChart.addSeries(seriesConfig, false, false);
	                }, this);
	            }

	            var preUpdateExtremes, postUpdateExtremes,
	                xAxis = this.xAxisList[0],
	                axisWasZoomed = xAxis.isZoomed;

	            if(axisWasZoomed) {
	                preUpdateExtremes = this.hcChart.xAxis[0].getExtremes();
	                preUpdateExtremes.max -= (xAxis.hasTickmarksBetween() ? 0 : 1);
	            }
	            else if(this.selectionWindow) {
	                preUpdateExtremes = this.selectionWindow.getExtremes();
	                preUpdateExtremes.min += (xAxis.hasTickmarksBetween() ? 1 : 0);
	            }
	            if(preUpdateExtremes) {
	                postUpdateExtremes = this.calculatePostUpdateExtremes(preUpdateExtremes);
	            }
	            // redraw the axes
	            _(this.xAxisList).invoke('redraw', false);
	            _(this.yAxisList).invoke('redraw', false);
	            if(axisWasZoomed) {
	                if(postUpdateExtremes.min === null || postUpdateExtremes.max === null) {
	                    this.hcChart.xAxis[0].zoom();
	                }
	                else {
	                    postUpdateExtremes.max += (xAxis.hasTickmarksBetween() ? 0 : 1);
	                    this.hcChart.xAxis[0].zoom(postUpdateExtremes.min, postUpdateExtremes.max);
	                }
	            }
	            else if(this.selectionWindow) {
	                if(postUpdateExtremes.max === null) {
	                    this.selectionWindow.destroy();
	                    this.selectionWindow = null;
	                }
	                else {
	                    postUpdateExtremes.min = (postUpdateExtremes.min || 0) - (xAxis.hasTickmarksBetween() ? 1 : 0);
	                    this.selectionWindow.setExtremes(postUpdateExtremes);
	                }
	            }

	            // force Highcharts to redraw
	            this.hcChart.redraw();
	            this.benchmark('Series Redraw Finished');
	            callback(this, this.benchmarks);
	        },

	        cancelPendingDraw: function() {
	            if(this.pendingDraw && this.pendingDraw.state() === 'pending') {
	                this.pendingDraw.cancel();
	                // TODO [sff] do we need to do anything with the deferred that draw() returned? currently it just stays pending
	            }
	        },

	        setSize: function(width, height) {
	            if(!this.hcChart) {
	                return;
	            }
	            var xAxis = this.hcChart.xAxis[0];
	            // SPL-80149: userMin and userMax should always be set if chart is zoomed
	            if(xAxis && this.xAxisList[0].isZoomed){
	                xAxis.userMin = xAxis.userMin || xAxis.oldUserMin;
	                xAxis.userMax = xAxis.userMax || xAxis.oldUserMax;
	            }
	            this.hcChart.setSize(width, height, false);
	            this.cacheDrawnDimensions();
	        },

	        destroy: function() {
	            this.cancelPendingDraw();
	            if(this.hcChart) {
	                this.onChartDestroy();
	                // SPL-85851, for some reason the default Highcharts destroy routine does not remove listeners added
	                // by the Pointer object, so we explicitly remove them here.
	                if(this.hcChart.pointer) {
	                    this.hcChart.pointer.reset();
	                }
	                this.hcChart.destroy();
	                this.hcChart = null;
	            }
	        },

	        getSVG: function() {
	            var chart = this.hcChart;
	            if(this.hcConfig.legend.enabled) {
	                if(this.exportMode && chart.type !== 'scatter') {
	                    $(chart.series).each(function(i, loopSeries) {
	                        if(!loopSeries.legendSymbol) {
	                            return false;
	                        }
	                        loopSeries.legendSymbol.attr({
	                            height: 8,
	                            translateY: 4
	                        });
	                    });
	                }
	                if(chart.legend.nav) {
	                    chart.legend.nav.destroy();
	                }
	            }

	            $(chart.series).each(function(i, loopSeries) {
	                // If the area has been set to zero opacity, just remove the element entirely (SPL-80429 and SPL-84442).
	                if(loopSeries.area && colorUtils.getComputedOpacity(loopSeries.area) === 0) {
	                    loopSeries.area.destroy();
	                    delete loopSeries.area;
	                }
	            });
	            var $svg = $('.highcharts-container').find('svg');
	            $svg.siblings().remove();
	            $svg.find('.highcharts-tracker').remove();

	            // SPL-65745, remove the clip path that is being applied to the legend, or it will cause labels to be hidden
	            $svg.find('.highcharts-legend g[clip-path]').each(function() {
	                $(this).removeAttr('clip-path');
	            });

	            return $svg.parent().html();
	        },

	        /////////////////////////////////////////////////////////////////////////////////////////
	        // [end of public interface]

	        processProperties: function() {
	            Visualization.prototype.processProperties.call(this);

	            // handle enabling chart/legend clicks, there are an annoying number of different ways to specify this
	            // the "drilldown" property trumps all others
	            if(this.properties.hasOwnProperty('drilldown')) {
	                this.chartClickEnabled = this.legendClickEnabled = this.properties['drilldown'] === 'all';
	            }
	            else {
	                if(this.properties.hasOwnProperty('chart.clickEnabled')) {
	                    this.chartClickEnabled = parsingUtils.normalizeBoolean(this.properties['chart.clickEnabled']);
	                }
	                else {
	                    this.chartClickEnabled = parsingUtils.normalizeBoolean(this.properties['enableChartClick']);
	                }
	                if(this.properties.hasOwnProperty('chart.legend.clickEnabled')) {
	                    this.legendClickEnabled = parsingUtils.normalizeBoolean(this.properties['chart.legend.clickEnabled']);
	                }
	                else {
	                    this.legendClickEnabled = parsingUtils.normalizeBoolean(this.properties['enableLegendClick']);
	                }
	            }

	            if(this.properties['legend.placement'] === 'none') {
	                this.hasLegend = false;
	            }

	            if(this.hasXAxis || this.hasYAxis) {
	                this.axisColorScheme = {
	                    'axis.foregroundColorSoft': this.axisColorSoft,
	                    'axis.foregroundColorSofter': this.axisColorSofter,
	                    'axis.fontColor': this.fontColor
	                };
	            }
	            if(this.properties.hasOwnProperty('legend.masterLegend') &&
	                    (!this.properties['legend.masterLegend'] || $.trim(this.properties['legend.masterLegend']) === 'null')) {
	                this.requiresExternalColors = false;
	            }
	            this.stackMode = this.properties['chart.stackMode'] || 'default';
	            this.legendLabels = parsingUtils.stringToArray(this.properties['legend.labels'] || '[]');
	            this.showHideMode = this.properties['data.fieldListMode'] === 'show_hide';
	            this.fieldHideList = _.union(
	                this.properties['fieldHideList'] || [],
	                parsingUtils.stringToArray(this.properties['data.fieldHideList']) || []
	            );
	            this.fieldShowList = parsingUtils.stringToArray(this.properties['data.fieldShowList']) || [];

	            var seriesColorsSetting = this.properties['chart.seriesColors'] || this.properties['seriesColors'];
	            this.seriesColors = parsingUtils.stringToHexArray(seriesColorsSetting) || null;
	            var fieldColorsSetting = this.properties['chart.fieldColors'] || this.properties['fieldColors'];
	            this.internalFieldColors = parsingUtils.stringToHexObject(fieldColorsSetting || '{}');

	            this.overlayFields = splunkUtils.stringToFieldList(this.properties['chart.overlayFields']);

	            this.seriesTypeMapping = {};
	            _(this.overlayFields).each(function(field) {
	                this.seriesTypeMapping[field] = 'line';
	            }, this);

	            this.yAxisMapping = {};
	            var secondYAxis = parsingUtils.normalizeBoolean(this.properties['axisY2.enabled']);
	            if(secondYAxis) {
	                var secondYAxisFields = this.properties['axisY2.fields'] ?
	                                        splunkUtils.stringToFieldList(this.properties['axisY2.fields']) : this.overlayFields;

	                _(secondYAxisFields).each(function(field) {
	                    this.yAxisMapping[field] = 1;
	                }, this);
	            }
	            this.enableAnimation = parsingUtils.normalizeBoolean(this.properties['enableAnimation'], false);
	            
	            var zoomTypes = ['x', 'y', 'xy', 'off'];
	            if(_(zoomTypes).indexOf(this.properties['zoomType']) !== -1){
	                this.zoomType = this.properties['zoomType'];
	            }
	            this.showLabels = this.properties['chart.showDataLabels'];
	            if (typeof this.showLabels === "undefined") {
	                this.showLabels = "none";
	            }

	            this.splitSeries = parsingUtils.normalizeBoolean(this.properties['layout.splitSeries'], false);
	        },

	        firstRenderOverride: function(chart) {
	            // make this reference available here for testing
	            this.hcChart = chart;

	            var adapter = window.HighchartsAdapter,
	                options = chart.options,
	                callback = chart.callback;

	            // BEGIN: copied from Highcharts source Chart#firstRender

	            // Check whether the chart is ready to render
	            if (!chart.isReadyToRender()) {
	                return;
	            }

	            // Create the container
	            chart.getContainer();

	            // Run an early event after the container and renderer are established
	            adapter.fireEvent(chart, 'init');


	            chart.resetMargins();
	            chart.setChartSize();

	            // Set the common chart properties (mainly invert) from the given series
	            chart.propFromSeries();

	            // get axes
	            chart.getAxes();

	            // Initialize the series
	            adapter.each(options.series || [], function (serieOptions) {
	                chart.initSeries(serieOptions);
	            });

	            chart.linkSeries();

	            // Run an event after axes and series are initialized, but before render. At this stage,
	            // the series data is indexed and cached in the xData and yData arrays, so we can access
	            // those before rendering. Used in Highstock.
	            adapter.fireEvent(chart, 'beforeRender');

	            // depends on inverted and on margins being set
	            chart.pointer = new Highcharts.Pointer(chart, options);

	            // MODIFIED: treat render() an asynchronous method
	            chart.render(function() {

	                // RESUME: remainder of Highcharts Chart#firstRender source code

	                // add canvas
	                chart.renderer.draw();
	                // run callbacks
	                if (callback) {
	                    callback.apply(chart, [chart]);
	                }
	                adapter.each(chart.callbacks, function (fn) {
	                    fn.apply(chart, [chart]);
	                });


	                // If the chart was rendered outside the top container, put it back in
	                chart.cloneRenderTo(true);

	                adapter.fireEvent(chart, 'load');

	                // END: Highcharts Chart#firstRender source code
	            });
	        },

	        renderOverride: function(chart, callback) {
	            var adapter = window.HighchartsAdapter,
	                axes = chart.axes,
	                renderer = chart.renderer,
	                options = chart.options;

	            // BEGIN: copied from Highcharts source Chart#render
	            var labels = options.labels,
	                credits = options.credits,
	                creditsHref;

	            // Title
	            chart.setTitle();


	            // Legend
	            chart.legend = new Highcharts.Legend(chart, options.legend);

	            chart.getStacks(); // render stacks

	            // Get margins by pre-rendering axes
	            // set axes scales
	            adapter.each(axes, function (axis) {
	                axis.setScale();
	            });

	            chart.getMargins();

	            chart.maxTicks = null; // reset for second pass
	            adapter.each(axes, function (axis) {
	                axis.setTickPositions(true); // update to reflect the new margins
	                axis.setMaxTicks();
	            });
	            chart.adjustTickAmounts();
	            chart.getMargins(); // second pass to check for new labels


	            // Draw the borders and backgrounds
	            chart.drawChartBox();


	            // Axes
	            if (chart.hasCartesianSeries) {
	                adapter.each(axes, function (axis) {
	                    axis.render();
	                });
	            }

	            // The series
	            if (!chart.seriesGroup) {
	                chart.seriesGroup = renderer.g('series-group')
	                    .attr({ zIndex: 3 })
	                    .add();
	            }

	            // MODIFIED: use an async loop to draw the series, body of iterator is the same as Highcharts source
	            this.pendingDraw = asyncUtils.asyncEach(chart.series, function(serie) {
	                serie.translate();
	                serie.setTooltipPoints();
	                serie.render();
	            });

	            this.pendingDraw.done(function() {

	                // RESUME: remainder of Highcharts Chart#render source code

	                // Labels
	                if (labels.items) {
	                    adapter.each(labels.items, function (label) {
	                        var style = adapter.extend(labels.style, label.style),
	                            x = adapter.pInt(style.left) + chart.plotLeft,
	                            y = adapter.pInt(style.top) + chart.plotTop + 12;

	                        // delete to prevent rewriting in IE
	                        delete style.left;
	                        delete style.top;

	                        renderer.text(
	                            label.html,
	                            x,
	                            y
	                        )
	                        .attr({ zIndex: 2 })
	                        .css(style)
	                        .add();

	                    });
	                }

	                // Credits
	                if (credits.enabled && !chart.credits) {
	                    creditsHref = credits.href;
	                    chart.credits = renderer.text(
	                        credits.text,
	                        0,
	                        0
	                    )
	                    .on('click', function () {
	                        if (creditsHref) {
	                            window.location.href = creditsHref;
	                        }
	                    })
	                    .attr({
	                        align: credits.position.align,
	                        zIndex: 8
	                    })
	                    .css(credits.style)
	                    .add()
	                    .align(credits.position);
	                }

	                // Set flag
	                chart.hasRendered = true;

	                // END: Highcharts Chart#render source

	                callback();
	            });
	        },

	        //////////////////////////////////////////////////////////////////////////////////////////////
	        // methods for initializing chart components

	        initializeFields: function() {
	            // TODO: this is where user settings could determine the x-axis field(s)

	            var allDataFields = this.dataSet.allDataFields();

	            this.xFields = [allDataFields[0]];

	            if(this.isRangeSeriesMode()) {
	                var rangeConfig = this.getRangeSeriesConfig();
	                _(rangeConfig).each(function(configEntry) {
	                    allDataFields = _(allDataFields).without(configEntry.lower, configEntry.upper);
	                });
	            }
	            //push overlay fields to end of yFields array so that they render in front
	            this.yFields = _(allDataFields).difference(this.xFields);

	            var fieldWhiteList = $.extend([], this.fieldShowList),
	                fieldBlackList = $.extend([], this.fieldHideList),
	                intersection = _.intersection(fieldWhiteList, fieldBlackList);

	            if(this.showHideMode) {
	                fieldBlackList = _.difference(fieldBlackList, intersection);
	            }
	            else {
	                fieldWhiteList = _.difference(fieldWhiteList, intersection);
	            }

	            this.yFields = _.difference(this.yFields, fieldBlackList);
	            if(fieldWhiteList.length > 0) {
	                this.yFields = _.intersection(this.yFields, fieldWhiteList);
	            }
	            // handle the user-specified legend labels
	            if(this.yFields.length > 0 && this.legendLabels.length > 0) {
	                this.yFields = _.union(this.legendLabels, this.yFields);
	            }

	        },

	        isEmpty: function() {
	            return (!this.yFields || this.yFields.length === 0);
	        },

	        hasTimeXAxis: function() {
	            return _(this.xFields || []).any(this.seriesIsTimeBased, this);
	        },

	        shouldProgressiveDraw: function() {
	            if(this.isEmpty()) {
	                return false;
	            }
	            var totalPoints = this.yFields.length * this.dataSet.getSeries(this.yFields[0]).length;
	            return totalPoints > this.PROGRESSIVE_DRAW_THRESHOLD;
	        },

	        shouldUpdateInPlace: function() {
	            return this.hcChart && !this.isDirty();
	        },

	        initializeColorPalette: function() {
	            this.colorPalette = new ColorPalette(this.seriesColors);
	        },

	        initializeSeriesList: function() {
	            this.seriesList = _(this.initializeSeriesPropertiesList()).map(function(properties) {
	                return seriesFactory.create(properties);
	            });
	        },

	        updateSeriesProperties: function() {
	            var propsList = this.initializeSeriesPropertiesList(),
	                reinitializeSeriesList = false;
	            
	            //compare the type of every series from seriesList with the propsList
	            //if there is at least one mismatch then re-initialize the seriesList
	            _.each(this.seriesList, function(series, i) {
	                if(propsList[i] && series.getType() != propsList[i].type) {
	                    reinitializeSeriesList = true;
	                }
	            });

	            if(!reinitializeSeriesList) {
	                // if there are more existing series that in the props list, loop through and remove the extras
	                // while updating the remaining ones
	                if(this.seriesList.length > propsList.length) {
	                    this.seriesList = _(this.seriesList).filter(function(series, i) {
	                        if(i >= propsList.length) {
	                            series.destroy();
	                            return false;
	                        }
	                        series.update(propsList[i]);
	                        return true;
	                    }, this);
	                }
	                // if there are less existing series than in the props list (or the same amount),
	                // loop through and create the new ones while updating the existing ones
	                else if(this.seriesList.length <= propsList.length) {
	                    
	                    this.seriesList = _(propsList).map(function(props, i) {
	                        if(i < this.seriesList.length) {
	                            this.seriesList[i].update(props);
	                            return this.seriesList[i];
	                        }
	                        var newSeries = seriesFactory.create(props);
	                        this.bindIndividualSeries(newSeries);
	                        return newSeries;
	                    }, this);
	                }
	            } else {
	                this.seriesList = null;
	                this._isDirty = true;
	                this.initializeSeriesList();
	            }
	        },

	        initializeSeriesPropertiesList: function() {
	            if(this.isEmpty()) {
	                return [{ type: this.type }];
	            }

	            var rangeFieldNames,
	                isRangeSeriesMode = this.isRangeSeriesMode(),
	                rangeSeriesConfig = isRangeSeriesMode ? this.getRangeSeriesConfig() : [],
	                dashStyle = this.getDashStyle();

	            if(isRangeSeriesMode) {
	                rangeFieldNames = _(rangeSeriesConfig).pluck('predicted');
	            }

	            return _(this.yFields).map(function(field) {
	                // TODO: this is where user settings could determine series type and/or axis mappings
	                var customType;
	                if(rangeFieldNames && _(rangeFieldNames).contains(field)) {
	                    customType = 'range';
	                }
	                else if(this.seriesTypeMapping.hasOwnProperty(field)) {
	                    customType = this.seriesTypeMapping[field];
	                }

	                var pointPlacement = null; 
	                if (this.hasTimeXAxis() && this.type !== 'column' && this.type !== 'bar'){
	                    pointPlacement = 'on';
	                }
	                var properties = $.extend(true, {}, this.properties, {
	                    type: customType || this.type,
	                    name: field,
	                    pointPlacement: pointPlacement,
	                    stacking: isRangeSeriesMode ? 'default' : this.stackMode,
	                    // TODO [sff] should we just deal with this in the chart click handler?
	                    clickEnabled: this.chartClickEnabled, 
	                    dashStyle: dashStyle
	                });

	                if(customType === 'range') {
	                    properties.names = _(rangeSeriesConfig).findWhere({ predicted: field });
	                }

	                // allow series to be assigned to y-axes via the 'yAxisMapping' property
	                if(this.yAxisMapping[field]) {
	                    properties.yAxis = this.yAxisMapping[field];
	                }
	                return properties;
	            }, this);
	        },

	        initializeXAxisList: function() {
	            var isEmpty = this.isEmpty();

	            // TODO: this is where user settings could specify multiple x-axes
	            // TODO: this is where the x-axis type can be inferred from the series types attached to each axis
	            this.xAxisList = _(this.xFields).map(function(field, i) {
	                var tickmarksBetween = _(this.seriesList).any(function(series) {
	                    return (series.getXAxisIndex() === i && { column: true, bar: true }.hasOwnProperty(series.getType()));
	                });
	                var axisProperties = $.extend(parsingUtils.getXAxisProperties(this.properties), this.axisColorScheme, {
	                    'axis.orientation': this.axesAreInverted ? 'vertical' : 'horizontal',
	                    'isEmpty': isEmpty
	                });
	                
	                axisProperties['axisTitle.text'] = this._getComputedXAxisTitle(axisProperties, field);
	                if(this.seriesIsTimeBased(field)) {
	                    axisProperties['axis.spanData'] = this.dataSet.getSeriesAsFloats('_span');
	                    axisProperties['axis.categories'] = this.dataSet.getSeriesAsTimestamps(field);
	                    axisProperties['axisLabels.tickmarkPlacement'] = tickmarksBetween ? 'between' : 'on';
	                    return new TimeAxis(axisProperties);
	                }
	                axisProperties['axis.categories'] = this.dataSet.getSeries(field);
	                axisProperties['axisLabels.tickmarkPlacement'] = 'between';
	                return new CategoryAxis(axisProperties);
	            }, this);
	        },

	        initializeYAxisList: function() {
	            // TODO: this is where user settings could specify multiple y-axes
	            var that = this,
	                isEmpty = this.isEmpty();
	            this.yAxisList = [];
	            var maxAxisIndex = _(this.seriesList).chain().invoke('getYAxisIndex').max().value();
	            _(maxAxisIndex + 1).times(function(i) {
	                that._initializeYAxis(i, isEmpty);         
	            });
	        },

	        _initializeYAxis: function(yAxisIndex, isEmpty) {
	            var axisProperties = this.initializeYAxisProperties(yAxisIndex, isEmpty); 
	            // FIXME: we should do something more intelligent here
	            // currently if there is only one series for an axis, use that series's name as the default title
	            axisProperties['axisTitle.text'] = this._getComputedYAxisTitle(axisProperties, yAxisIndex);

	            // log scale is not respected if the chart has stacking
	            if(this.stackMode !== 'default') {
	                axisProperties['axis.scale'] = 'linear';
	            }

	            this.yAxisList.push(new NumericAxis(axisProperties));
	        }, 

	        initializeYAxisProperties: function(yAxisIndex, isEmpty) {
	            var axisProperties = $.extend(parsingUtils.getYAxisProperties(this.properties, yAxisIndex), this.axisColorScheme, {
	                'axis.orientation': this.axesAreInverted ? 'horizontal' : 'vertical',
	                'isEmpty': isEmpty,
	                'opposite': yAxisIndex % 2 !== 0 ? true : false
	            });
	            return axisProperties; 
	        },

	        updateAxisProperties: function() {
	            // make sure the x-axis gets updated categories, if needed
	            // TODO [sff] remove assumption that there is only one x-axis
	            if(this.hasXAxis) {
	                var xAxis = this.xAxisList[0],
	                    xField = this.xFields[0];

	                // be careful here, TimeAxis subclasses CategoryAxis
	                if(xAxis.constructor === CategoryAxis) {
	                    xAxis.setCategories(this.dataSet.getSeries(xField));
	                }
	                else if(xAxis.constructor === TimeAxis) {
	                    xAxis.setCategories(
	                        this.dataSet.getSeriesAsTimestamps(xField), 
	                        this.dataSet.getSeriesAsFloats('_span')
	                    );
	                }
	                var xAxisProperties = parsingUtils.getXAxisProperties(this.properties);
	                xAxis.setTitle(this._getComputedXAxisTitle(xAxisProperties, xField));
	            }
	            //check if we need to draw two y-axis on the chart
	            if(this.hasYAxis) {
	                var maxAxisIndex = _(this.seriesList).chain().invoke('getYAxisIndex').max().value();
	                if(this.yAxisList.length < maxAxisIndex + 1) {
	                    this.initializeYAxisList();
	                    this._isDirty = true;
	                }
	            }

	            _.each(this.yAxisList, function(yAxis, i){
	                var yAxisProperties = parsingUtils.getYAxisProperties(this.properties, i);
	                yAxis.setTitle(this._getComputedYAxisTitle(yAxisProperties, i));
	            }, this);
	        },

	        _getComputedXAxisTitle: function(axisProperties, field){
	            return _.isUndefined(axisProperties['axisTitle.text']) 
	                || axisProperties['axisTitle.text'] === ''
	                ? this._getDefaultXAxisTitleFromField(field)
	                : axisProperties['axisTitle.text'];
	        },

	        _getComputedYAxisTitle: function(axisProperties, yAxisIndex){
	            return _.isUndefined(axisProperties['axisTitle.text']) 
	                || axisProperties['axisTitle.text'] === ''
	                ? this._getDefaultYAxisTitle(yAxisIndex)
	                : axisProperties['axisTitle.text'];
	        },

	        _getDefaultXAxisTitleFromField: function(field){
	            return field;
	        },

	        _getDefaultYAxisTitle: function(yAxisIndex){
	            var axisSeries = _(this.seriesList).filter(function(series) {
	                return series.getYAxisIndex() === yAxisIndex; 
	            });
	            return axisSeries.length === 1 ? axisSeries[0].getName() : undefined;
	        },

	        initializeLegend: function() {
	            var legendProps = parsingUtils.getLegendProperties(this.properties);
	            if(_(legendProps['clickEnabled']).isUndefined()) {
	                legendProps['clickEnabled'] = this.legendClickEnabled;
	            }
	            $.extend(legendProps, {
	                fontColor: this.fontColor
	            });
	            this.legend = new Legend(legendProps);
	            this.bindLegendEvents();
	        },

	        bindLegendEvents: function() {
	            var that = this,
	                properties = {
	                    highlightDelay: 125,
	                    unhighlightDelay: 50,
	                    onMouseOver: function(fieldName) {
	                        that.handleLegendMouseOver(fieldName);
	                    },
	                    onMouseOut: function(fieldName) {
	                        that.handleLegendMouseOut(fieldName);
	                    }
	                },
	                throttle = new HoverEventThrottler(properties);

	            this.legend.on('mouseover', function(e, fieldName) {
	                throttle.mouseOverHappened(fieldName);
	            });
	            this.legend.on('mouseout', function(e, fieldName) {
	                throttle.mouseOutHappened(fieldName);
	            });
	            this.legend.on('click', function(e, fieldName) {
	                that.handleLegendClick(e, fieldName);
	            });
	        },

	        initializeTooltip: function() {
	            var tooltipProps = {
	                borderColor: this.foregroundColorSoft
	            };
	            this.tooltip = new Tooltip(tooltipProps);
	        },

	        setAllSeriesData: function() {
	            _(this.seriesList).each(function(series) {
	                if(series.getType() === 'range') {
	                    this.setRangeSeriesData(series);
	                } else {
	                    this.setBasicSeriesData(series);
	                }
	            }, this);
	        },

	        setBasicSeriesData: function(series) {
	            var xInfo = this.getSeriesXInfo(series),
	                yInfo = this.getSeriesYInfo(series);

	            if(xInfo.axis instanceof NumericAxis) {
	                series.setData({
	                    x: this.formatAxisData(xInfo.axis, xInfo.fieldName),
	                    y: this.formatAxisData(yInfo.axis, yInfo.fieldName)
	                });
	            }
	            else if(xInfo.axis instanceof TimeAxis) {
	                // SPL-67612, handle the case where the last data point was a total value
	                // the axis handlers will have removed it from the timestamps, so we just have to sync the array lengths
	                var axisTimestamps = xInfo.axis.getCategories(),
	                    rawData = this.formatAxisData(yInfo.axis, yInfo.fieldName);

	                series.setData({
	                    y: rawData.slice(0, axisTimestamps.length)
	                });
	            }
	            else {
	                series.setData({
	                    y: this.formatAxisData(yInfo.axis, yInfo.fieldName)
	                });
	            }
	        },

	        setRangeSeriesData: function(series) {
	            var xInfo = this.getSeriesXInfo(series),
	                yInfo = this.getSeriesYInfo(series),
	                rangeConfig = _(this.getRangeSeriesConfig()).findWhere({ predicted: series.getName() }),
	                rangeData = {
	                    predicted: this.formatAxisData(yInfo.axis, rangeConfig.predicted),
	                    lower: this.formatAxisData(yInfo.axis, rangeConfig.lower),
	                    upper: this.formatAxisData(yInfo.axis, rangeConfig.upper)
	                };

	            if(xInfo.axis instanceof NumericAxis) {
	                rangeData.x = this.formatAxisData(xInfo.axis, xInfo.fieldName);
	            }
	            series.setData(rangeData);
	        },

	        bindSeriesEvents: function() {
	            var that = this;
	            this.throttle = new HoverEventThrottler({
	                highlightDelay: 125,
	                unhighlightDelay: 50,
	                onMouseOver: function(point, series) {
	                    that.handlePointMouseOver(point, series);
	                },
	                onMouseOut: function(point, series) {
	                    that.handlePointMouseOut(point, series);
	                }
	            });
	            _(this.seriesList).each(this.bindIndividualSeries, this);
	        },

	        bindIndividualSeries: function(series) {
	            var that = this;
	            series.on('mouseover', function(e, targetPoint, targetSeries) {
	                that.throttle.mouseOverHappened(targetPoint, targetSeries);
	            });
	            series.on('mouseout', function(e, targetPoint, targetSeries) {
	                that.throttle.mouseOutHappened(targetPoint, targetSeries);
	            });
	            series.on('click', function(e, targetPoint, targetSeries) {
	                that.handlePointClick(e, targetPoint, targetSeries);
	            });
	        },

	        handlePointClick: function(event, point, series) {
	            var rowContext = {},
	                pointIndex = point.index,
	                pointInfo = this.getSeriesPointInfo(series, point),
	                pointClickEvent = {
	                    type: 'pointClick',
	                    modifierKey: event.modifierKey,
	                    name: pointInfo.xAxisName,
	                    // 'value' will be inserted later based on the x-axis type
	                    name2: pointInfo.yAxisName,
	                    value2: pointInfo.yValue
	                };

	            if(pointInfo.xAxisIsTime) {
	                var isoTimeString = this.dataSet.getSeries(pointInfo.xAxisName)[pointIndex];
	                pointClickEvent.value = splunkUtils.getEpochTimeFromISO(isoTimeString);
	                pointClickEvent._span = this.dataSet.getSeriesAsFloats('_span')[pointIndex];
	                rowContext['row.' + pointInfo.xAxisName] = pointClickEvent.value;
	            }
	            else {
	                pointClickEvent.value = pointInfo.xValue;
	                rowContext['row.' + pointInfo.xAxisName] = pointInfo.xValue;
	            }

	            _(this.yFields).each(function(fieldName) {
	                rowContext['row.' + fieldName] = this.dataSet.getSeries(fieldName)[pointIndex];
	            }, this);
	            pointClickEvent.rowContext = rowContext;
	            this.trigger(pointClickEvent);
	        },

	        handlePointMouseOver: function(targetPoint, targetSeries) {
	            _(this.seriesList).each(function(series) {
	                if(series.matchesName(targetSeries.getName())) {
	                    series.handlePointMouseOver(targetPoint);
	                }
	                else {
	                    series.unHighlight();
	                }
	            });
	            if(this.legend) {
	                this.legend.selectField(targetSeries.getLegendKey());
	            }
	        },

	        handlePointMouseOut: function(targetPoint, targetSeries) {
	            _(this.seriesList).each(function(series) {
	                if(series.matchesName(targetSeries.getName())) {
	                    series.handlePointMouseOut(targetPoint);
	                }
	                else {
	                    series.highlight();
	                }
	            });
	            if(this.legend) {
	                this.legend.unSelectField(targetSeries.getLegendKey());
	            }
	        },

	        handleLegendClick: function(event, fieldName) {
	            var legendClickEvent = {
	                type: 'legendClick',
	                modifierKey: event.modifierKey,
	                name2: fieldName
	            };
	            this.trigger(legendClickEvent);
	        },

	        handleLegendMouseOver: function(fieldName) {
	            _(this.seriesList).each(function(series) {
	                if(series.matchesName(fieldName)) {
	                    series.handleLegendMouseOver(fieldName);
	                }
	                else {
	                    series.unHighlight();
	                }
	            });
	        },

	        handleLegendMouseOut: function(fieldName) {
	            _(this.seriesList).each(function(series) {
	                if(series.matchesName(fieldName)) {
	                    series.handleLegendMouseOut(fieldName);
	                }
	                else {
	                    series.highlight();
	                }
	            });
	        },

	        applyColorPalette: function() {
	            if(this.isEmpty()) {
	                return;
	            }
	            var colorMapping = {};
	            _(this.getFieldList()).each(function(field, i, fieldList) {
	                colorMapping[field] = this.computeFieldColor(field, i, fieldList);
	            }, this);
	            _(this.seriesList).invoke('applyColorMapping', colorMapping);
	        },


	        //////////////////////////////////////////////////////////////////////////////////
	        // methods for generating config objects from chart objects

	        getConfig: function() {
	            var that = this;
	            var config = $.extend(true, {
	                chart: {
	                    animation: this.enableAnimation
	                },
	                    plotOptions: {
	                        series: {
	                            animation: this.enableAnimation

	                        }
	                    }, 
	                    tooltip: {
	                        animation: this.enableAnimation
	                    }
	                }, this.BASE_CONFIG, {
	                    chart: this.getChartConfig(),
	                    series: this.getSeriesConfigList(),
	                    xAxis: this.getXAxisConfig(),
	                    yAxis: this.getYAxisConfig(),
	                    legend: this.getLegendConfig(),
	                    tooltip: this.getTooltipConfig(),
	                    plotOptions: this.getPlotOptionsConfig(),
	                    pointerDragStartPreHook: _(this.pointerDragStartPreHook).bind(this),
	                    pointerDragOverride: _(this.pointerDragOverride).bind(this),
	                    pointerDropPreHook: _(this.pointerDropPreHook).bind(this),
	                    pointerDropPostHook: _(this.pointerDropPostHook).bind(this),
	                    pointerPinchOverride: _(this.pointerPinchOverride).bind(this)
	                });
	            if(this.exportMode) {
	                if(this.seriesIsTimeBased(this.xFields)) {
	                    _(config.xAxis).each(function(xAxis) {
	                        var xAxisMargin;
	                        if(that.axesAreInverted) {
	                            xAxisMargin = -50;
	                        }
	                        else {
	                            var spanSeries = that.dataSet.getSeriesAsFloats('_span'),
	                                span = (spanSeries && spanSeries.length > 0) ? parseInt(spanSeries[0], 10) : 1,
	                                secsPerDay = 60 * 60 * 24,
	                                secsPerYear = secsPerDay * 365;

	                            if(span >= secsPerYear) {
	                                xAxisMargin = 15;
	                            }
	                            else if(span >= secsPerDay) {
	                                xAxisMargin = 25;
	                            }
	                            else {
	                                xAxisMargin = 35;
	                            }
	                        }
	                        xAxis.title.margin = xAxisMargin;
	                    });
	                }
	                $.extend(true, config, {
	                    plotOptions: {
	                        series: {
	                            enableMouseTracking: false,
	                            shadow: false
	                        }
	                    }
	                });

	            }
	            return config;
	        },

	        getSeriesConfigList: function() {
	            return _(this.seriesList).chain().invoke('getConfig').flatten(true).value();
	        },

	        getXAxisConfig: function() {
	            if(!this.hasXAxis) {
	                return [];
	            }
	            return _(this.xAxisList).map(function(axis, i) {
	                var config = axis.getConfig();
	                if(i > 0) {
	                    config.offset = 40;
	                }
	                return config;
	            }, this);
	        },

	        getYAxisConfig: function() {
	            if(!this.hasYAxis) {
	                return [];
	            }
	            return _(this.yAxisList).map(function(axis, i) {               
	                return axis.getConfig();
	            });
	        },

	        getLegendConfig: function() {
	            if(!this.hasLegend || !this.legend) {
	                return {};
	            }
	            return this.legend.getConfig();
	        },

	        getTooltipConfig: function() {
	            if(!this.tooltip) {
	                return {};
	            }
	            return $.extend(this.tooltip.getConfig(), {
	                // initially disable the tooltip, it will be re-enabled when the draw has completed
	                // this is to support progressive draw where some content is visible but the chart is not yet interactive
	                formatter: function() { return false; }
	            });
	        },

	        formatTooltip: function(series, hcPoint) {
	            var pointInfo = this.getSeriesPointInfo(series, hcPoint);
	            return series.getTooltipHtml(pointInfo, this.hcChart);
	        },

	        getChartConfig: function() {
	            var config = {
	                type: this.type,
	                renderTo: this.container,
	                backgroundColor: this.backgroundColor,
	                borderColor: this.backgroundColor
	            };
	            // in export mode we need to set explicit width and height
	            // we'll honor the width and height of the parent node, unless they are zero
	            if(this.exportMode) {
	                config.width = this.width || this.EXPORT_WIDTH;
	                config.height = this.height || this.EXPORT_HEIGHT;
	            } else if (!this.$container.is(':visible')) {
	                // If the container is not visible as the chart is being drawn, set some default dimensions
	                // so that the chart will resize correctly when made visible (SPL-101997)
	                config.width = this.FALLBACK_WIDTH;
	                config.height = this.FALLBACK_HEIGHT;
	            }
	            // allow zoom for column, line, area charts only
	            if(this.isZoomable()){
	                if(this.zoomType !== 'off'){
	                    config.zoomType = this.zoomType || 'x';
	                }
	            }
	            //don't align the ticks when we have multiple y-axis in the chart and at least one of the axes has either explicit min or explicit max (SPL-113709)
	            if (this.yAxisList && this.yAxisList.length > 1) {
	                var hasExplicitMinOrMax = _.find(this.yAxisList, function(yAxis) {
	                    return yAxis.hasExplicitMin || yAxis.hasExplicitMax;
	                });
	                if (hasExplicitMinOrMax) {
	                    config.alignTicks = false;
	                }
	            }
	            return config;
	        },

	        getDataLabelConfig: function() {
	            if (this.showLabels === "none" || typeof this.dataLabels === "undefined") {
	                return {
	                    enabled: false
	                };
	            }
	            var that = this;
	            var dataLabelsWithFormatter = $.extend(true, {}, this.dataLabels.getConfig(), {
	                formatter: function () {
	                    for (var i = 0; i < that.seriesList.length; i++) {
	                        var seriesId = this.series.options.id;
	                        var splunkSeriesId = that.seriesList[i].id;
	                        //To use helper, we need to identity the associated splunk series.
	                        if (seriesId === splunkSeriesId) {
	                            var pointInfo = that.getSeriesPointInfo(that.seriesList[i], this.point);
	                            if (pointInfo) {
	                                return pointInfo.yValueDisplay;
	                            }
	                        }
	                        
	                    }
	                }
	            });
	            return dataLabelsWithFormatter;
	        },

	        getPlotOptionsConfig: function() {
	            // SPL-74520, track-by-area only works well if the series do not overlap eachother,
	            // so it is disabled for a non-stacked chart or a range series chart
	            var trackByArea = this.stackMode !== 'default' && !this.isRangeSeriesMode();
	            return $.extend(true, {}, this.BASE_PLOT_OPTIONS_CONFIG, {
	                series: {
	                    cursor: this.chartClickEnabled ? 'pointer' : 'default',
	                    dataLabels: this.getDataLabelConfig()
	                },
	                area: {
	                    trackByArea: trackByArea
	                }
	            });
	        },

	        isZoomable: function() {
	            return this.type === 'area' || this.type === 'line' || this.type === 'column';
	        },

	        ////////////////////////////////////////////////////////////////////////////////////////
	        // methods for managing event handlers and effects

	        addEventHandlers: function(hcChart) {
	            var that = this,
	                $hcChart = $(hcChart);

	            domUtils.jQueryOn.call($hcChart, 'redraw', function() {
	                that.onChartRedraw(hcChart);
	                that.onChartLoadOrRedraw(hcChart);
	            });
	            if(this.hasXAxis) {
	                domUtils.jQueryOn.call($hcChart, 'selection', _(this.onChartSelection).bind(this));
	            }
	            domUtils.jQueryOn.call($hcChart, 'tooltipRefresh', function() {
	                if(that.hcChart.hoverPoint){
	                    var seriesIndex = that.hcChart.hoverPoint.series.index;
	                    // redraw hoverPoint or column in its new position if tooltip is moved and redrawn
	                    if(that.hcChart.series[seriesIndex].splSeries.type === 'column'){
	                        that.hcChart.series[seriesIndex].splSeries.unHighlight();
	                        that.hcChart.series[seriesIndex].splSeries.highlight();
	                    }else if(that.hcChart.series[seriesIndex].splSeries.type === 'line' || that.hcChart.series[seriesIndex].splSeries.type === 'area') {
	                        that.hcChart.hoverPoint.setState();
	                        that.hcChart.hoverPoint.setState('hover');
	                    }
	                }
	            });
	            domUtils.jQueryOn.call($hcChart, 'endResize', function() {
	                that.onChartResize(hcChart);
	            });
	        },

	        enableTooltip: function(hcChart) {
	            var that = this;
	            hcChart.tooltip.options.formatter = function() {
	                // need to look up the instance of Splunk.JSCharting.BaseSeries, not the HighCharts series
	                var series = this.series.splSeries;
	                return that.formatTooltip(series, this.point);
	            };
	        },

	        onChartLoad: function(chart) {
	            if(this.legend) {
	                this.legend.onChartLoad(chart);
	            }
	            if(this.dataLabels) {
	                this.dataLabels.onChartLoad(chart);
	            }
	            _(this.xAxisList).invoke('onChartLoad', chart);
	            _(this.yAxisList).invoke('onChartLoad', chart);
	            _(this.seriesList).invoke('onChartLoad', chart);
	            if(this.isZoomable()) {
	                this.triggerRangeSelectionEvent();
	            }
	        },

	        onChartRedraw: function(chart) {
	            var that = this;
	            if(this.selectionWindow) {
	                this.selectionWindow.onChartRedraw(chart);
	            }
	            else if(this.isZoomable() && !this.isiOS) {
	                var xAxis = this.xAxisList[0];
	                if(xAxis && xAxis.isZoomed) {
	                    if(!this.resetZoomButton) {
	                        this.resetZoomButton = new ZoomOutButton(this.hcChart);
	                    }
	                    if(this.panButtons) {
	                        this.panButtons.onChartRedraw(chart);
	                    }
	                    else {
	                        this.panButtons = new PanButtons(this.hcChart);
	                        this.panButtons.on('pan', function(e, rangeStartX, rangeEndX) {
	                            that.triggerRangeSelectionEvent();
	                        });
	                    }
	                }
	                else {
	                    if(this.resetZoomButton) {
	                        this.resetZoomButton.destroy();
	                        this.resetZoomButton = null;
	                    }
	                    if(this.panButtons) {
	                        this.panButtons.destroy();
	                        this.panButtons = null;
	                    }
	                }
	            }
	            if(this.isZoomable() && !this.selectionTriggeredBeforeRedraw) {
	                this.triggerRangeSelectionEvent();
	            }
	            this.selectionTriggeredBeforeRedraw = false;
	        },

	        onChartLoadOrRedraw: function(chart) {
	            if(this.legend) {
	                this.legend.onChartLoadOrRedraw(chart);
	            }
	            if (this.dataLabels) {
	                this.dataLabels.onChartLoadOrRedraw(chart);
	            }
	            _(this.xAxisList).invoke('onChartLoadOrRedraw', chart);
	            _(this.yAxisList).invoke('onChartLoadOrRedraw', chart);
	            _(this.seriesList).invoke('onChartLoadOrRedraw', chart);
	        },

	        onChartDestroy: function() {
	            $(Highcharts).off('baseUriChange.' + this.id);
	            if(this.legend) {
	                this.legend.destroy();
	            }

	            if (this.dataLabels) {
	                this.dataLabels.destroy();
	            }
	            _(this.xAxisList).invoke('destroy');
	            _(this.yAxisList).invoke('destroy');
	            _(this.seriesList).invoke('destroy');
	            if(this.selectionWindow) {
	                this.selectionWindow.destroy();
	                this.selectionWindow = null;
	            }
	            if(this.panButtons){
	                this.panButtons.destroy();
	                this.panButtons = undefined;
	            }
	        },

	        onChartSelection: function(originalEvent) {
	            var xAxis = this.xAxisList[0];
	            if(!originalEvent.resetSelection) {
	                var xAxisInfo = originalEvent.xAxis[0],
	                    normalizedExtremes = this.getNormalizedAxisExtremes(xAxisInfo.min, xAxisInfo.max);

	                // TODO [sff] maybe this should be handled elsewhere?
	                xAxisInfo.min = normalizedExtremes.min;
	                xAxisInfo.max = normalizedExtremes.max + (xAxis.hasTickmarksBetween() ? 0 : 1);
	                // This is the one place where the range selection event if triggered with explicit extremes,
	                // at this stage in the event lifecycle the new extremes have not yet been applied to the axis.
	                var rangeSelectionEvent = this.triggerRangeSelectionEvent(normalizedExtremes);
	                if(rangeSelectionEvent.isDefaultPrevented()) {
	                    originalEvent.preventDefault();
	                    // cancel a pending range reset event since we are creating a new selection window
	                    this.hasPendingRangeResetEvent = false;
	                    if(xAxis.getZoomed(xAxisInfo.min, xAxisInfo.max)){
	                        this.selectionWindow = new SelectionWindow(this.hcChart);
	                        var that = this;
	                        this.selectionWindow.on('rangeSelect', function(e, rangeStartX, rangeEndX) {
	                            that.triggerRangeSelectionEvent();
	                        });
	                    }
	                }
	                else {
	                    // Since we are triggering the event before the chart redraws, set a flag that will suppress what
	                    // would be a duplicate event trigger in onChartRedraw.
	                    this.selectionTriggeredBeforeRedraw = true;
	                }
	            }
	        },

	        onChartResize: function(chart) {
	            if(this.panButtons){
	                this.panButtons.onChartResize(chart);
	            }
	        },

	        getNormalizedAxisExtremes: function(min, max) {
	            var axis = this.xAxisList[0],
	                hcAxis = this.hcChart.xAxis[0],
	                axisMax = hcAxis.dataMax,
	                axisMin = hcAxis.dataMin,
	                normalize = function(extreme) {
	                    if(extreme > axisMax){
	                        extreme = axisMax;
	                    }
	                    if(extreme < axisMin){
	                        extreme = axisMin;
	                    }
	                    return Math.round(extreme);
	                },
	                normalizedMin = normalize(min),
	                isTouch = this.isiOS && this.hcChart.pointer.selectionMarker,
	                normalizedMax = normalize(max),
	                isTouchPan = isTouch && this.hcChart.pointer.selectionMarker.width === this.hcChart.plotWidth,
	                isTouchZoom = isTouch && this.hcChart.pointer.selectionMarker.width !== this.hcChart.plotWidth;

	            if(isTouchPan && normalizedMax > normalizedMin && normalizedMax !== axisMax){
	                // If max and min are not equal, and if the event was a touch pan, normalize the max for non-column charts.
	                // Except when panning to the end of the chart.
	                normalizedMax -= (axis.hasTickmarksBetween() ? 0 : 1);
	            }

	            if(isTouchZoom && (max - min < 1) && !axis.hasTickmarksBetween()){
	                // User is zoomed in on 1 point. Do not let them zoom in further
	                normalizedMax = normalizedMin;
	            }

	            return ({
	                min: normalizedMin,
	                max: normalizedMax
	            });
	        },

	        calculatePostUpdateExtremes: function(preUpdateExtremes) {
	            var xAxis = this.xAxisList[0],
	                updatedCategories = xAxis.getCategories();

	            if(xAxis instanceof TimeAxis) {
	                var previousCategories = xAxis.getPreviousCategories(),
	                    // The start index can be calculated by simply matching the ISO time string.
	                    newStartIndex = _(updatedCategories).indexOf(previousCategories[preUpdateExtremes.min]),
	                    // The end index is more complicated, since the end time depends also on the span between data points.
	                    // The correct thing to do is calculate the previous end time and match it to the new end times.
	                    previousEndTime = parseInt(splunkUtils.getEpochTimeFromISO(previousCategories[preUpdateExtremes.max]), 10) +
	                                    xAxis.getPreviousSpanData()[preUpdateExtremes.max],
	                    updatedSpanData = xAxis.getSpanData(),
	                    updatedEndTimes = _(updatedCategories).map(function(isoTime, i) {
	                        return parseInt(splunkUtils.getEpochTimeFromISO(isoTime), 10) + updatedSpanData[i];
	                    }),
	                    newEndIndex = _(updatedEndTimes).indexOf(previousEndTime);

	                return { min: newStartIndex > -1 ? newStartIndex : null, max: newEndIndex > -1 ? newEndIndex : null };
	            }

	            return (updatedCategories.length > preUpdateExtremes.max ?
	                preUpdateExtremes : { min: null, max: null });
	        },

	        triggerRangeSelectionEvent: function(extremes) {
	            var xAxis = this.xAxisList[0],
	                // The range is being reset if there are no explicit extremes, there is no selection window,
	                // and the axis is not zoomed.
	                isReset = !extremes && !this.selectionWindow && !xAxis.isZoomed;

	            if(!extremes) {
	                if(this.selectionWindow) {
	                    extremes = this.selectionWindow.getExtremes();
	                    extremes.min += (xAxis.hasTickmarksBetween() ? 1 : 0);
	                }
	                else {
	                    extremes = this.hcChart.xAxis[0].getExtremes();
	                    extremes.max -= (xAxis.hasTickmarksBetween() ? 0 : 1);
	                }
	            }
	            extremes = this.getNormalizedAxisExtremes(extremes.min, extremes.max);

	            var isTimeAxis = xAxis instanceof TimeAxis,
	                xSeries = isTimeAxis ? this.dataSet.getSeriesAsTimestamps(this.xFields[0]) : this.dataSet.getSeries(this.xFields[0]),
	                startXValue = xSeries[extremes.min],
	                endXValue = xSeries[extremes.max];

	            if(isTimeAxis) {
	                var spanValue = 1;
	                if(this.dataSet.hasField('_span')) {
	                    var spans = this.dataSet.getSeriesAsFloats('_span');
	                    spanValue = (spans.length > extremes.max) ? spans[extremes.max] : _(spans).last();
	                }

	                startXValue = parseInt(splunkUtils.getEpochTimeFromISO(startXValue), 10);
	                endXValue = parseInt(splunkUtils.getEpochTimeFromISO(endXValue), 10) + spanValue;
	            }

	            var e = $.Event('chartRangeSelect', {
	                startXIndex: extremes.min,
	                endXIndex: extremes.max,
	                startXValue: startXValue,
	                endXValue: endXValue,
	                isReset: !!isReset
	            });
	            this.trigger(e);
	            return e;
	        },

	        pointerDragStartPreHook: function(pointer, e) {
	            if(this.selectionWindow) {
	                var handled = this.selectionWindow.handleDragStartEvent(e);
	                if(!handled) {
	                    this.selectionWindow.destroy();
	                    this.selectionWindow = null;
	                    // note that a range reset event is pending, to be handled in pointerDropPostHook
	                    // this can potentially be cancelled if the current drag event results in creating a new selected range
	                    this.hasPendingRangeResetEvent = true;
	                }
	            }
	        },

	        pointerPinchOverride: function(pointer, e, originalFn) {
	            if(this.selectionWindow){
	                if(e.type === 'touchstart'){
	                    pointer.dragStart(e);
	                    if(!this.selectionWindow){
	                        // If selectionWindow is being redrawn in a new position, then we need to reset
	                        // some pointer properties that are normally set in Highcharts' pinch touchstart routine,
	                        // so that a new selectionMarker is drawn in Highcharts' pinch touchmove routine
	                        _.each(e.touches, function (e, i) {
	                            pointer.pinchDown[i] = { chartX: e.chartX || e.pageX, chartY: e.chartY || e.pageY };
	                        });
	                    }
	                }else if(e.type === 'touchmove'){
	                    pointer.normalize(e).chartX;
	                    this.selectionWindow.handleDragEvent(e);
	                }else if(e.type === 'touchend'){
	                    this.selectionWindow.handleDropEvent(e);
	                }
	            }else{
	                originalFn.call(pointer, e);
	            }
	        },

	        pointerDragOverride: function(pointer, e, originalFn) {
	            if(this.selectionWindow) {
	                this.selectionWindow.handleDragEvent(e);
	            }
	            else {
	                originalFn.call(pointer, e);
	                if(this.hcChart.pointer.selectionMarker) {
	                    this.hcChart.pointer.selectionMarker.attr({
	                        'stroke-width': 2,
	                        stroke: this.foregroundColorSofter
	                    });
	                }
	            }
	        },

	        pointerDropPreHook: function(pointer, e) {
	            if(this.selectionWindow) {
	                this.selectionWindow.handleDropEvent(e);
	            }
	        },

	        pointerDropPostHook: function(pointer, e) {
	            if(this.hasPendingRangeResetEvent) {
	                this.triggerRangeSelectionEvent();
	                this.hasPendingRangeResetEvent = false;
	            }
	        },

	        /////////////////////////////////////////////////////////////////////////////////////
	        // re-usable helpers

	        getSeriesXInfo: function(series) {
	            var xIndex = series.getXAxisIndex();
	            return ({
	                axis: this.xAxisList[xIndex],
	                fieldName: this.xFields[xIndex]
	            });
	        },

	        getSeriesYInfo: function(series) {
	            return ({
	                axis: this.yAxisList[series.getYAxisIndex()],
	                fieldName: series.getName()
	            });
	        },

	        getSeriesPointInfo: function(series, hcPoint) {
	            var pointIndex = hcPoint.index,
	                xInfo = this.getSeriesXInfo(series),
	                yInfo = this.getSeriesYInfo(series),
	                xSeries = this.dataSet.getSeries(xInfo.fieldName),
	                ySeries = this.dataSet.getSeries(yInfo.fieldName);

	            return ({
	                xAxisIsTime: (xInfo.axis instanceof TimeAxis),
	                xAxisName: xInfo.fieldName,
	                xValue: xSeries[pointIndex],
	                xValueDisplay: xInfo.axis.formatValue(xSeries[pointIndex]),
	                yAxisName: yInfo.fieldName,
	                yValue: ySeries[pointIndex],
	                yValueDisplay: yInfo.axis.formatValue(ySeries[pointIndex])
	            });
	        },

	        getDashStyle: function(){
	            // convert first char to upper case as HighCharts expects options to have this convention
	            var dashStyle = this.properties['lineDashStyle'];
	            if(dashStyle){
	                return string_utils.capitalize(dashStyle);
	            }
	        },

	        isRangeSeriesMode: function() {
	            var allFields = this.dataSet.allFields();
	            return (_(allFields).any(function(f) { return /^_predicted/.test(f); })
	                && _(allFields).any(function(f) { return /^_lower/.test(f); })
	                && _(allFields).any(function(f) { return /^_upper/.test(f); }));
	        },

	        getRangeSeriesConfig: function() {
	            var predictedFields = _(this.dataSet.allFields()).filter(function(f) {
	                return /^_predicted/.test(f);
	            });

	            return _(predictedFields).map(function(predictedField) {
	                var sourceField = predictedField.replace(/^_predicted/, ''),
	                    lowerField = '_lower' + sourceField,
	                    upperField = '_upper' + sourceField,
	                    predictedName = _(this.dataSet.getSeries(predictedField)).find(function(value) { return !!value; }),
	                    lowerName = _(this.dataSet.getSeries(lowerField)).find(function(value) { return !!value; }),
	                    upperName = _(this.dataSet.getSeries(upperField)).find(function(value) { return !!value; });

	                return ({
	                    predicted: predictedName,
	                    lower: lowerName,
	                    upper: upperName
	                });

	            }, this);
	        },

	        // by convention, we consider a series to be time-based if it is called _time, and there is also a _span series
	        // with the exception that if there is only one data point _span does not need to be there
	        seriesIsTimeBased: function(fieldName) {
	            return (/^_time/).test(fieldName) && (this.dataSet.getSeries(fieldName).length <= 1 || this.dataSet.hasField('_span'));
	        },

	        formatAxisData: function(axis, fieldName) {
	            if(!this.dataSet.hasField(fieldName)) {
	                return [];
	            }
	            return this.dataSet.getSeriesAsFloats(fieldName, {
	                scale: axis.isLogScale() ? 'log' : 'linear',
	                nullValueMode: this.properties['chart.nullValueMode']
	            });
	        },

	        computeFieldColor: function(field, index, fieldList) {
	            if(this.internalFieldColors.hasOwnProperty(field)) {
	                return colorUtils.colorFromHex(this.internalFieldColors[field]);
	            }
	            var useExternalPalette = !_(this.externalPaletteMapping).isEmpty(),
	                paletteIndex = useExternalPalette ? this.externalPaletteMapping[field] : index,
	                paletteSize = useExternalPalette ? this.externalPaletteSize : fieldList.length;

	            return this.colorPalette.getColorAsRgb(field, paletteIndex, paletteSize);
	        },

	        /////////////////////////////////////////////////////////////////////////////////////
	        // templates and default settings

	        BASE_CONFIG: {
	            chart: {
	                showAxes: true,
	                reflow: false,
	                selectionMarkerFill: 'rgba(0,0,0,0)',
	                spacingTop: 16
	            },
	            credits: {
	                enabled: false
	            },
	            legend: {
	                enabled: false
	            },
	            plotOptions: {
	                series: {
	                    states: {
	                        // series start out with their hover state disabled, it is enabled after draw is complete
	                        hover: {
	                            enabled: false
	                        }
	                    },
	                    events: {
	                        legendItemClick: function() {
	                            return false;
	                        }
	                    },
	                    borderWidth: 0,
	                    shadow: false,
	                    turboThreshold: 0
	                }
	            },
	            title: {
	                text: null
	            },
	            tooltip: {
	                enabled: false,
	                useHTML: true
	            }
	        },

	        BASE_PLOT_OPTIONS_CONFIG: {
	            line: {
	                stickyTracking: true,
	                states: {
	                    hover: {
	                        marker: {
	                            enabled: true,
	                            radius: 6
	                        }
	                    }
	                },
	                marker: {
	                    enabled: false,
	                    symbol: 'square'
	                }
	            },
	            area: {
	                stickyTracking: true,
	                lineWidth: 1,
	                states: {
	                    hover: {
	                        marker: {
	                            enabled: true,
	                            radius: 6
	                        }
	                    }
	                },
	                marker: {
	                    symbol: 'square',
	                    enabled: false
	                }
	            },
	            column: {
	                markers: {
	                    enabled: false
	                },
	                stickyTracking: false,
	                fillOpacity: 1,
	                trackByArea: true
	            },
	            bar: {
	                markers: {
	                    enabled: false
	                },
	                stickyTracking: false,
	                fillOpacity: 1,
	                trackByArea: true
	            }
	        }

	    });

	   return Chart;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "js_charting/components/CartesianDataLabels":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/components/DataLabels"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            DataLabels,
	            langUtils
	        ) {

	    var CartesianDataLabels = function(properties) {
	        DataLabels.call(this,properties);
	        this.showLabels = properties.showLabels;
	        this.splitSeries = properties.splitSeries;
	    };

	    langUtils.inherit(CartesianDataLabels, DataLabels);

	    CartesianDataLabels.prototype = $.extend(CartesianDataLabels.prototype, {

	        onChartLoadOrRedraw: function(chart) {
	            if (this.showLabels === "minmax") {
	                this.displayMinMax(chart.series);
	            }
	            if (this.showLabels === "all") {
	                this.removeRepeatedZeroValues(chart.series);
	            }
	        },

	        destroy: function(chart) {
	            this.off();
	        },

	        onChartLoad: function() {},

	        displayMinMax: function(series) {
	            
	            var points = _.flatten(_.pluck(series, 'points'));
	            _.each(points, function(point){
	                if (point.dataLabel && point.dataLabel.element) {
	                    point.dataLabel.element.setAttribute('display', 'none');
	                }
	            });
	            var i,
	                j,
	                sc = series.length,
	                visiblePointsPerSeries = [],
	                visiblePoints = [];

	            for (i = 0; i < sc; i++) {
	                var seriesExtremes = series[i].xAxis.getExtremes();
	                var minIndex = seriesExtremes.userMin || seriesExtremes.dataMin;
	                var maxIndex = seriesExtremes.userMax || seriesExtremes.dataMax;
	                visiblePoints = [];
	                for(j = minIndex; j <= maxIndex; j++){
	                    // We have to check if the point exists in this
	                    // series because the min and max are not per-series 
	                    // as you would expect
	                    if (series[i].points[j]) {
	                        visiblePoints.push(series[i].points[j]);
	                    }
	                }
	                visiblePointsPerSeries.push(visiblePoints);
	            }

	            if (!this.splitSeries) {
	                // if we dont split the series we don't want to show multiple extrema
	                visiblePointsPerSeries = [_.flatten(visiblePointsPerSeries)];
	            }

	            for (i = 0; i < visiblePointsPerSeries.length; i++) {
	                // we only want to find extremas for points with y values
	                // that have a dataLabel that could be shown
	                var currentVisiblePoints = _.filter(visiblePointsPerSeries[i], function(point) {
	                    return !_.isNull(point.y) && point.dataLabel;
	                });
	                var minPoint = _.min(currentVisiblePoints, function(point) {
	                    return point.y;
	                });
	                var maxPoint = _.max(currentVisiblePoints, function(point) {
	                    return point.y;
	                });

	                maxPoint.dataLabel.element.removeAttribute('display');
	                minPoint.dataLabel.element.removeAttribute('display');
	            }

	        },

	        removeRepeatedZeroValues: function(series) {
	            var points = _.flatten(_.pluck(series, 'points'));
	            _.each(points, function(point){
	                if (point.dataLabel && point.dataLabel.element) {
	                    point.dataLabel.element.removeAttribute('display');
	                }
	            });
	            var yMin = _.min(_.pluck(points, 'y'));
	            if (yMin >= 0) {
	                _.each(points, function(point){
	                    if (point.y == 0){
	                        if (point.dataLabel && point.dataLabel.element) {
	                            point.dataLabel.element.setAttribute('display', 'none');
	                        }
	                    }
	                });
	            }
	        }
	    });
	    return CartesianDataLabels;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/components/DataLabels":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("js_charting/helpers/EventMixin")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            EventMixin) {

	    var DataLabels = function(properties) {
	        this.properties = properties || {};
	        return this;
	    };

	    DataLabels.prototype = $.extend({}, EventMixin, {
	        getConfig: function() {
	            return ({
	                enabled: true
	            });
	        }
	    });
	    return DataLabels;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/helpers/EventMixin":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("shim/jquery"), __webpack_require__("js_charting/util/dom_utils")], __WEBPACK_AMD_DEFINE_RESULT__ = function($, domUtils) {

	    return ({

	        on: function(eventType, callback) {
	            domUtils.jQueryOn.call($(this), eventType, callback);
	        },

	        off: function(eventType, callback) {
	            domUtils.jQueryOff.call($(this), eventType, callback);
	        },

	        trigger: function(eventType, extraParams) {
	            $(this).trigger(eventType, extraParams);
	        }

	    });

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/util/dom_utils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("shim/jquery"), __webpack_require__("require/underscore")], __WEBPACK_AMD_DEFINE_RESULT__ = function($, _) {

	    // set up some aliases for jQuery 'on' that will work in older versions of jQuery
	    var jqOn = _($.fn.on).isFunction() ? $.fn.on : $.fn.bind;
	    var jqOff = _($.fn.off).isFunction() ? $.fn.off : $.fn.unbind;

	    // a cross-renderer way to update a legend item's text content
	    var setLegendItemText = function(legendItem, text) {
	        if(legendItem.attr('text') === text) {
	            return;
	        }
	        legendItem.added = true; // the SVG renderer needs this
	        legendItem.attr({text: text});
	    };

	    var hideTickLabel = function(tick) {
	        var label = tick.label,
	            nodeName = tick.label.element.nodeName.toLowerCase();

	        if(nodeName === 'text') {
	            label.hide();
	        }
	        else {
	            $(label.element).hide();
	        }
	    };

	    var showTickLabel = function(tick) {
	        var label = tick.label,
	            nodeName = tick.label.element.nodeName.toLowerCase();

	        if(nodeName === 'text') {
	            label.show();
	        }
	        else {
	            $(label.element).show();
	        }
	    };

	    return ({

	        jQueryOn: jqOn,
	        jQueryOff: jqOff,
	        setLegendItemText: setLegendItemText,
	        hideTickLabel: hideTickLabel,
	        showTickLabel: showTickLabel

	    });

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/util/lang_utils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {

	    // very simple inheritance helper to set up the prototype chain
	    var inherit = function(child, parent) {
	        var F = function() { };
	        F.prototype = parent.prototype;
	        child.prototype = new F();
	        child.prototype.constructor = child;
	    };

	    return ({

	        inherit: inherit

	    });

	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "shim/highcharts":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	        __webpack_require__("shim/jquery"),
	        __webpack_require__("shim/splunk"),
	        __webpack_require__("contrib/highcharts-4.0.4/runtime_patches"),
	        __webpack_require__(31)
	    ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        $,
	        Splunk,
	        runtimePatches,
	        Highcharts
	    ) {
	    
	    // The custom loader will remove Splunk's version of Highcharts from the global scope.
	    // As a safety measure in case existing external code relies on this global,
	    // it is still available as `Splunk.Highcharts`.
	    Splunk.Highcharts = Highcharts;
	    runtimePatches.applyPatches(Highcharts);
	    return Highcharts;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "contrib/highcharts-4.0.4/runtime_patches":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("require/underscore")], __WEBPACK_AMD_DEFINE_RESULT__ = function(_) {

	    var arraySlice = [].slice;

	    var patch = function(obj, patches) {
	        var proto = obj.prototype;
	        _(patches).each(function(wrapperFn, fnName) {
	            proto[fnName] = _(proto[fnName]).wrap(wrapperFn);
	        });
	    };

	    var callHook = function(hook) {
	        if(typeof hook === 'function') {
	            hook.apply(null, arraySlice.call(arguments, 1));
	        }
	    };

	    var callHookOrOriginal = function(hook, originalFn, originalObj) {
	        if(typeof hook === 'function') {
	            // for the hook, pass the original object as the first parameter
	            return hook.apply(null, arraySlice.call(arguments, 2));
	        }
	        // for the original function, apply it in the scope of the original object
	        return originalFn.apply(originalObj, arraySlice.call(arguments, 3));
	    };

	    var applyPatches = function(Highcharts) {

	        patch(Highcharts.Chart, {

	            firstRender: function(originalFn) {
	                callHookOrOriginal(this.options.firstRenderOverride, originalFn, this);
	            },

	            render: function(originalFn, callback) {
	                callHookOrOriginal(this.options.renderOverride, originalFn, this, callback);
	            }

	        });

	        patch(Highcharts.Tooltip, {

	            getAnchor: function(originalFn, points, mouseEvent) {
	                var anchor = originalFn.call(this, points, mouseEvent);
	                callHook(this.options.getAnchorPostHook, points, mouseEvent, anchor);
	                return anchor;
	            }

	        });

	        patch(Highcharts.Legend, {

	            render: function(originalFn) {
	                callHook(this.options.renderPreHook, this);
	                originalFn.call(this);
	                callHook(this.options.renderPostHook, this);
	            },

	            renderItem: function(originalFn, item) {
	                var options = this.options,
	                    allItems = this.allItems;

	                if(typeof options.renderItemsPreHook === 'function' && item === allItems[0]) {
	                    options.renderItemsPreHook(this);
	                    originalFn.call(this, item);
	                }
	                else if(typeof options.renderItemsPostHook === 'function' && item === _(allItems).last()) {
	                    originalFn.call(this, item);
	                    options.renderItemsPostHook(this);
	                }
	                else {
	                    originalFn.call(this, item);
	                }
	            }

	        });

	        patch(Highcharts.Series, {

	            drawPoints: function(originalFn) {
	                var options = this.options;
	                callHook(options.drawPointsPreHook, this);
	                originalFn.call(this);
	            },

	            plotGroup: function(originalFn, prop, name, visibility, zIndex, parent) {
	                var group = originalFn.call(this, prop, name, visibility, zIndex, parent);
	                callHook(this.options.plotGroupPostHook, this, group);
	                return group;
	            },

	            render: function(originalFn) {
	                originalFn.call(this);
	                callHook(this.options.renderPostHook, this);
	            },

	            afterAnimate: function(originalFn) {
	                originalFn.call(this);
	                callHook(this.options.afterAnimate, this);
	            },

	            destroy: function(originalFn) {
	                callHook(this.options.destroyPreHook, this);
	                originalFn.call(this);
	            }, 

	            translate: function(originalFn) {
	                originalFn.call(this);
	                callHook(this.options.translatePostHook, this);
	            }

	        });

	        var seriesTypes = Highcharts.seriesTypes;

	        // patches to certain series types to support customized rendering routines
	        // the patches to column series will affect bar series as well, since it inherits from column
	        _([seriesTypes.column, seriesTypes.scatter]).each(function(seriesConstructor) {

	            patch(seriesConstructor, {

	                drawPoints: function(originalFn) {
	                    callHookOrOriginal(this.options.drawPointsOverride, originalFn, this);
	                },

	                drawGraph: function(originalFn) {
	                    callHookOrOriginal(this.options.drawGraphOverride, originalFn, this);
	                },

	                drawTracker: function(originalFn) {
	                    callHookOrOriginal(this.options.drawTrackerOverride, originalFn, this);
	                },

	                getGraphPath: function(originalFn) {
	                    return callHookOrOriginal(this.options.getGraphPathOverride, originalFn, this);
	                }

	            });

	        });

	        patch(seriesTypes.pie, {

	            translate: function(originalFn) {
	                callHook(this.options.translatePreHook, this);
	                originalFn.call(this);
	            },

	            drawDataLabels: function(originalFn) {
	                var dataLabelOptions = this.options.dataLabels;
	                callHook(dataLabelOptions.drawDataLabelsPreHook, this);
	                originalFn.call(this);
	                callHook(dataLabelOptions.drawDataLabelsPostHook, this);
	            }

	        });

	        patch(Highcharts.Axis, {

	            getOffset: function(originalFn) {
	                callHook(this.options.getOffsetPreHook, this);
	                originalFn.call(this);
	            },

	            getSeriesExtremes: function(originalFn) {
	                originalFn.call(this);
	                callHook(this.options.getSeriesExtremesPostHook, this);
	            },

	            setTickPositions: function(originalFn, secondPass) {
	                var options = this.options;
	                callHook(options.setTickPositionsPreHook, this, secondPass);
	                originalFn.call(this, secondPass);
	                callHook(options.setTickPositionsPostHook, this, secondPass);
	            },

	            setAxisSize: function(originalFn) {
	                callHook(this.options.setSizePreHook, this);
	                originalFn.call(this);
	            }, 

	            zoom: function(originalFn, newMin, newMax) {
	                return callHookOrOriginal(this.options.zoomOverride, originalFn, this, newMin, newMax);
	            }

	        });

	        patch(Highcharts.Tick, {

	            render: function(originalFn, index, old, opacity) {
	                originalFn.call(this, index, old, opacity);
	                callHook(this.axis.options.tickRenderPostHook, this, index, old, opacity);
	            },

	            handleOverflow: function(originalFn, index, xy, old) {
	                return callHookOrOriginal(this.axis.options.tickHandleOverflowOverride, originalFn, this, index, xy, old);
	            }, 

	            getLabelSize: function(originalFn) {
	                return callHookOrOriginal(this.axis.options.getLabelSizeOverride, originalFn, this);
	            }

	        });

	        patch(Highcharts.Pointer, {

	            runPointActions: function(originalFn, e) {
	                var hoverSeries = this.chart.hoverSeries;
	                if(hoverSeries && typeof hoverSeries.options.pointActionsPreHook === 'function') {
	                    hoverSeries.options.pointActionsPreHook(hoverSeries, e);
	                }
	                originalFn.call(this, e);
	            },

	            dragStart: function(originalFn, e) {
	                callHook(this.chart.options.pointerDragStartPreHook, this, e);
	                originalFn.call(this, e);
	            },

	            drag: function(originalFn, e) {
	                return callHookOrOriginal(this.chart.options.pointerDragOverride, originalFn, this, e, originalFn);
	            },

	            drop: function(originalFn, e) {
	                // SPL-80321, due to our customizations, it's possible for the drop event of one chart to cause another
	                // chart to be destroyed while its drop event handler is still pending
	                // detect that the chart has been destroyed by its lack of an 'index' and suppress the drop handler
	                if(this.chart.hasOwnProperty('index')) {
	                    callHook(this.chart.options.pointerDropPreHook, this, e);
	                    originalFn.call(this, e);
	                    callHook(this.chart.options.pointerDropPostHook, this, e);
	                }
	            },

	            pinch: function(originalFn, e){
	                return callHookOrOriginal(this.chart.options.pointerPinchOverride, originalFn, this, e, originalFn);
	            }

	        });

	    };

	    return { applyPatches: applyPatches };

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ 31:
/***/ (function(module, exports) {

	var previousHighcharts = window.Highcharts;window.Highcharts = null;// ==ClosureCompiler==
	// @compilation_level SIMPLE_OPTIMIZATIONS

	/**
	 * @license Highcharts 4.0.4 JS v/Highstock 2.0.4 (2014-09-02)
	 *
	 * (c) 2009-2014 Torstein Honsi
	 *
	 * License: www.highcharts.com/license
	 */

	// JSLint options:
	/*global Highcharts, HighchartsAdapter, document, window, navigator, setInterval, clearInterval, clearTimeout, setTimeout, location, jQuery, $, console, each, grep */
	/*jslint ass: true, sloppy: true, forin: true, plusplus: true, nomen: true, vars: true, regexp: true, newcap: true, browser: true, continue: true, white: true */
	(function () {


	// encapsulated variables
	var UNDEFINED,
		doc = document,
		win = window,
		math = Math,
		mathRound = math.round,
		mathFloor = math.floor,
		mathCeil = math.ceil,
		mathMax = math.max,
		mathMin = math.min,
		mathAbs = math.abs,
		mathCos = math.cos,
		mathSin = math.sin,
		mathPI = math.PI,
		deg2rad = mathPI * 2 / 360,


		// some variables
		userAgent = navigator.userAgent,
		isOpera = win.opera,
		isIE = /msie/i.test(userAgent) && !isOpera,
		docMode8 = doc.documentMode === 8,
		isWebKit = /AppleWebKit/.test(userAgent),
		isFirefox = /Firefox/.test(userAgent),
		isTouchDevice = /(Mobile|Android|Windows Phone)/.test(userAgent),
		SVG_NS = 'http://www.w3.org/2000/svg',
		hasSVG = !!doc.createElementNS && !!doc.createElementNS(SVG_NS, 'svg').createSVGRect,
		hasBidiBug = isFirefox && parseInt(userAgent.split('Firefox/')[1], 10) < 4, // issue #38
		useCanVG = !hasSVG && !isIE && !!doc.createElement('canvas').getContext,
		Renderer,
		hasTouch,
		symbolSizes = {},
		idCounter = 0,
		garbageBin,
		defaultOptions,
		dateFormat, // function
		globalAnimation,
		pathAnim,
		timeUnits,
		error,
		noop = function () { return UNDEFINED; },
		charts = [],
		chartCount = 0,
		PRODUCT = 'Highcharts 4.0.4',
		VERSION = '/Highstock 2.0.4',

		// some constants for frequently used strings
		DIV = 'div',
		ABSOLUTE = 'absolute',
		RELATIVE = 'relative',
		HIDDEN = 'hidden',
		PREFIX = 'highcharts-',
		VISIBLE = 'visible',
		PX = 'px',
		NONE = 'none',
		M = 'M',
		L = 'L',
		numRegex = /^[0-9]+$/,
		NORMAL_STATE = '',
		HOVER_STATE = 'hover',
		SELECT_STATE = 'select',
		
		// Object for extending Axis
		AxisPlotLineOrBandExtension,

		// constants for attributes
		STROKE_WIDTH = 'stroke-width',

		// time methods, changed based on whether or not UTC is used
		Date,  // Allow using a different Date class
		makeTime,
		timezoneOffset,
		getMinutes,
		getHours,
		getDay,
		getDate,
		getMonth,
		getFullYear,
		setMinutes,
		setHours,
		setDate,
		setMonth,
		setFullYear,


		// lookup over the types and the associated classes
		seriesTypes = {},
		Highcharts;

	// The Highcharts namespace
	if (win.Highcharts) {
		error(16, true);
	} else {
		Highcharts = win.Highcharts = {};
	}


	/**
	 * Extend an object with the members of another
	 * @param {Object} a The object to be extended
	 * @param {Object} b The object to add to the first one
	 */
	function extend(a, b) {
		var n;
		if (!a) {
			a = {};
		}
		for (n in b) {
			a[n] = b[n];
		}
		return a;
	}
		
	/**
	 * Deep merge two or more objects and return a third object. If the first argument is
	 * true, the contents of the second object is copied into the first object.
	 * Previously this function redirected to jQuery.extend(true), but this had two limitations.
	 * First, it deep merged arrays, which lead to workarounds in Highcharts. Second,
	 * it copied properties from extended prototypes. 
	 */
	function merge() {
		var i,
			args = arguments,
			len,
			ret = {},
			doCopy = function (copy, original) {
				var value, key;

				// An object is replacing a primitive
				if (typeof copy !== 'object') {
					copy = {};
				}

				for (key in original) {
					if (original.hasOwnProperty(key)) {
						value = original[key];

						// Copy the contents of objects, but not arrays or DOM nodes
						if (value && typeof value === 'object' && Object.prototype.toString.call(value) !== '[object Array]'
								&& key !== 'renderTo' && typeof value.nodeType !== 'number') {
							copy[key] = doCopy(copy[key] || {}, value);
					
						// Primitives and arrays are copied over directly
						} else {
							copy[key] = original[key];
						}
					}
				}
				return copy;
			};

		// If first argument is true, copy into the existing object. Used in setOptions.
		if (args[0] === true) {
			ret = args[1];
			args = Array.prototype.slice.call(args, 2);
		}

		// For each argument, extend the return
		len = args.length;
		for (i = 0; i < len; i++) {
			ret = doCopy(ret, args[i]);
		}

		return ret;
	}

	/**
	 * Shortcut for parseInt
	 * @param {Object} s
	 * @param {Number} mag Magnitude
	 */
	function pInt(s, mag) {
		return parseInt(s, mag || 10);
	}

	/**
	 * Check for string
	 * @param {Object} s
	 */
	function isString(s) {
		return typeof s === 'string';
	}

	/**
	 * Check for object
	 * @param {Object} obj
	 */
	function isObject(obj) {
		return obj && typeof obj === 'object';
	}

	/**
	 * Check for array
	 * @param {Object} obj
	 */
	function isArray(obj) {
		return Object.prototype.toString.call(obj) === '[object Array]';
	}

	/**
	 * Check for number
	 * @param {Object} n
	 */
	function isNumber(n) {
		return typeof n === 'number';
	}

	function log2lin(num) {
		return math.log(num) / math.LN10;
	}
	function lin2log(num) {
		return math.pow(10, num);
	}

	/**
	 * Remove last occurence of an item from an array
	 * @param {Array} arr
	 * @param {Mixed} item
	 */
	function erase(arr, item) {
		var i = arr.length;
		while (i--) {
			if (arr[i] === item) {
				arr.splice(i, 1);
				break;
			}
		}
		//return arr;
	}

	/**
	 * Returns true if the object is not null or undefined. Like MooTools' $.defined.
	 * @param {Object} obj
	 */
	function defined(obj) {
		return obj !== UNDEFINED && obj !== null;
	}

	/**
	 * Set or get an attribute or an object of attributes. Can't use jQuery attr because
	 * it attempts to set expando properties on the SVG element, which is not allowed.
	 *
	 * @param {Object} elem The DOM element to receive the attribute(s)
	 * @param {String|Object} prop The property or an abject of key-value pairs
	 * @param {String} value The value if a single property is set
	 */
	function attr(elem, prop, value) {
		var key,
			ret;

		// if the prop is a string
		if (isString(prop)) {
			// set the value
			if (defined(value)) {
				elem.setAttribute(prop, value);

			// get the value
			} else if (elem && elem.getAttribute) { // elem not defined when printing pie demo...
				ret = elem.getAttribute(prop);
			}

		// else if prop is defined, it is a hash of key/value pairs
		} else if (defined(prop) && isObject(prop)) {
			for (key in prop) {
				elem.setAttribute(key, prop[key]);
			}
		}
		return ret;
	}
	/**
	 * Check if an element is an array, and if not, make it into an array. Like
	 * MooTools' $.splat.
	 */
	function splat(obj) {
		return isArray(obj) ? obj : [obj];
	}


	/**
	 * Return the first value that is defined. Like MooTools' $.pick.
	 */
	function pick() {
		var args = arguments,
			i,
			arg,
			length = args.length;
		for (i = 0; i < length; i++) {
			arg = args[i];
			if (arg !== UNDEFINED && arg !== null) {
				return arg;
			}
		}
	}

	/**
	 * Set CSS on a given element
	 * @param {Object} el
	 * @param {Object} styles Style object with camel case property names
	 */
	function css(el, styles) {
		if (isIE && !hasSVG) { // #2686
			if (styles && styles.opacity !== UNDEFINED) {
				styles.filter = 'alpha(opacity=' + (styles.opacity * 100) + ')';
			}
		}
		extend(el.style, styles);
	}

	/**
	 * Utility function to create element with attributes and styles
	 * @param {Object} tag
	 * @param {Object} attribs
	 * @param {Object} styles
	 * @param {Object} parent
	 * @param {Object} nopad
	 */
	function createElement(tag, attribs, styles, parent, nopad) {
		var el = doc.createElement(tag);
		if (attribs) {
			extend(el, attribs);
		}
		if (nopad) {
			css(el, {padding: 0, border: NONE, margin: 0});
		}
		if (styles) {
			css(el, styles);
		}
		if (parent) {
			parent.appendChild(el);
		}
		return el;
	}

	/**
	 * Extend a prototyped class by new members
	 * @param {Object} parent
	 * @param {Object} members
	 */
	function extendClass(parent, members) {
		var object = function () { return UNDEFINED; };
		object.prototype = new parent();
		extend(object.prototype, members);
		return object;
	}

	/**
	 * Format a number and return a string based on input settings
	 * @param {Number} number The input number to format
	 * @param {Number} decimals The amount of decimals
	 * @param {String} decPoint The decimal point, defaults to the one given in the lang options
	 * @param {String} thousandsSep The thousands separator, defaults to the one given in the lang options
	 */
	function numberFormat(number, decimals, decPoint, thousandsSep) {
		var externalFn = Highcharts.numberFormat,
			lang = defaultOptions.lang,
			// http://kevin.vanzonneveld.net/techblog/article/javascript_equivalent_for_phps_number_format/
			n = +number || 0,
			c = decimals === -1 ?
				(n.toString().split('.')[1] || '').length : // preserve decimals
				(isNaN(decimals = mathAbs(decimals)) ? 2 : decimals),
			d = decPoint === undefined ? lang.decimalPoint : decPoint,
			t = thousandsSep === undefined ? lang.thousandsSep : thousandsSep,
			s = n < 0 ? "-" : "",
			i = String(pInt(n = mathAbs(n).toFixed(c))),
			j = i.length > 3 ? i.length % 3 : 0;

		return externalFn !== numberFormat ? 
			externalFn(number, decimals, decPoint, thousandsSep) :
			(s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) +
				(c ? d + mathAbs(n - i).toFixed(c).slice(2) : ""));
	}

	/**
	 * Pad a string to a given length by adding 0 to the beginning
	 * @param {Number} number
	 * @param {Number} length
	 */
	function pad(number, length) {
		// Create an array of the remaining length +1 and join it with 0's
		return new Array((length || 2) + 1 - String(number).length).join(0) + number;
	}

	/**
	 * Wrap a method with extended functionality, preserving the original function
	 * @param {Object} obj The context object that the method belongs to 
	 * @param {String} method The name of the method to extend
	 * @param {Function} func A wrapper function callback. This function is called with the same arguments
	 * as the original function, except that the original function is unshifted and passed as the first 
	 * argument. 
	 */
	function wrap(obj, method, func) {
		var proceed = obj[method];
		obj[method] = function () {
			var args = Array.prototype.slice.call(arguments);
			args.unshift(proceed);
			return func.apply(this, args);
		};
	}

	/**
	 * Based on http://www.php.net/manual/en/function.strftime.php
	 * @param {String} format
	 * @param {Number} timestamp
	 * @param {Boolean} capitalize
	 */
	dateFormat = function (format, timestamp, capitalize) {
		if (!defined(timestamp) || isNaN(timestamp)) {
			return 'Invalid date';
		}
		format = pick(format, '%Y-%m-%d %H:%M:%S');

		var date = new Date(timestamp - timezoneOffset),
			key, // used in for constuct below
			// get the basic time values
			hours = date[getHours](),
			day = date[getDay](),
			dayOfMonth = date[getDate](),
			month = date[getMonth](),
			fullYear = date[getFullYear](),
			lang = defaultOptions.lang,
			langWeekdays = lang.weekdays,

			// List all format keys. Custom formats can be added from the outside. 
			replacements = extend({

				// Day
				'a': langWeekdays[day].substr(0, 3), // Short weekday, like 'Mon'
				'A': langWeekdays[day], // Long weekday, like 'Monday'
				'd': pad(dayOfMonth), // Two digit day of the month, 01 to 31
				'e': dayOfMonth, // Day of the month, 1 through 31

				// Week (none implemented)
				//'W': weekNumber(),

				// Month
				'b': lang.shortMonths[month], // Short month, like 'Jan'
				'B': lang.months[month], // Long month, like 'January'
				'm': pad(month + 1), // Two digit month number, 01 through 12

				// Year
				'y': fullYear.toString().substr(2, 2), // Two digits year, like 09 for 2009
				'Y': fullYear, // Four digits year, like 2009

				// Time
				'H': pad(hours), // Two digits hours in 24h format, 00 through 23
				'I': pad((hours % 12) || 12), // Two digits hours in 12h format, 00 through 11
				'l': (hours % 12) || 12, // Hours in 12h format, 1 through 12
				'M': pad(date[getMinutes]()), // Two digits minutes, 00 through 59
				'p': hours < 12 ? 'AM' : 'PM', // Upper case AM or PM
				'P': hours < 12 ? 'am' : 'pm', // Lower case AM or PM
				'S': pad(date.getSeconds()), // Two digits seconds, 00 through  59
				'L': pad(mathRound(timestamp % 1000), 3) // Milliseconds (naming from Ruby)
			}, Highcharts.dateFormats);


		// do the replaces
		for (key in replacements) {
			while (format.indexOf('%' + key) !== -1) { // regex would do it in one line, but this is faster
				format = format.replace('%' + key, typeof replacements[key] === 'function' ? replacements[key](timestamp) : replacements[key]);
			}
		}

		// Optionally capitalize the string and return
		return capitalize ? format.substr(0, 1).toUpperCase() + format.substr(1) : format;
	};

	/** 
	 * Format a single variable. Similar to sprintf, without the % prefix.
	 */
	function formatSingle(format, val) {
		var floatRegex = /f$/,
			decRegex = /\.([0-9])/,
			lang = defaultOptions.lang,
			decimals;

		if (floatRegex.test(format)) { // float
			decimals = format.match(decRegex);
			decimals = decimals ? decimals[1] : -1;
			if (val !== null) {
				val = numberFormat(
					val,
					decimals,
					lang.decimalPoint,
					format.indexOf(',') > -1 ? lang.thousandsSep : ''
				);
			}
		} else {
			val = dateFormat(format, val);
		}
		return val;
	}

	/**
	 * Format a string according to a subset of the rules of Python's String.format method.
	 */
	function format(str, ctx) {
		var splitter = '{',
			isInside = false,
			segment,
			valueAndFormat,
			path,
			i,
			len,
			ret = [],
			val,
			index;
		
		while ((index = str.indexOf(splitter)) !== -1) {
			
			segment = str.slice(0, index);
			if (isInside) { // we're on the closing bracket looking back
				
				valueAndFormat = segment.split(':');
				path = valueAndFormat.shift().split('.'); // get first and leave format
				len = path.length;
				val = ctx;

				// Assign deeper paths
				for (i = 0; i < len; i++) {
					val = val[path[i]];
				}

				// Format the replacement
				if (valueAndFormat.length) {
					val = formatSingle(valueAndFormat.join(':'), val);
				}

				// Push the result and advance the cursor
				ret.push(val);
				
			} else {
				ret.push(segment);
				
			}
			str = str.slice(index + 1); // the rest
			isInside = !isInside; // toggle
			splitter = isInside ? '}' : '{'; // now look for next matching bracket
		}
		ret.push(str);
		return ret.join('');
	}

	/**
	 * Get the magnitude of a number
	 */
	function getMagnitude(num) {
		return math.pow(10, mathFloor(math.log(num) / math.LN10));
	}

	/**
	 * Take an interval and normalize it to multiples of 1, 2, 2.5 and 5
	 * @param {Number} interval
	 * @param {Array} multiples
	 * @param {Number} magnitude
	 * @param {Object} options
	 */
	function normalizeTickInterval(interval, multiples, magnitude, allowDecimals) {
		var normalized, i;

		// round to a tenfold of 1, 2, 2.5 or 5
		magnitude = pick(magnitude, 1);
		normalized = interval / magnitude;

		// multiples for a linear scale
		if (!multiples) {
			multiples = [1, 2, 2.5, 5, 10];

			// the allowDecimals option
			if (allowDecimals === false) {
				if (magnitude === 1) {
					multiples = [1, 2, 5, 10];
				} else if (magnitude <= 0.1) {
					multiples = [1 / magnitude];
				}
			}
		}

		// normalize the interval to the nearest multiple
		for (i = 0; i < multiples.length; i++) {
			interval = multiples[i];
			if (normalized <= (multiples[i] + (multiples[i + 1] || multiples[i])) / 2) {
				break;
			}
		}

		// multiply back to the correct magnitude
		interval *= magnitude;

		return interval;
	}


	/**
	 * Utility method that sorts an object array and keeping the order of equal items.
	 * ECMA script standard does not specify the behaviour when items are equal.
	 */
	function stableSort(arr, sortFunction) {
		var length = arr.length,
			sortValue,
			i;

		// Add index to each item
		for (i = 0; i < length; i++) {
			arr[i].ss_i = i; // stable sort index
		}

		arr.sort(function (a, b) {
			sortValue = sortFunction(a, b);
			return sortValue === 0 ? a.ss_i - b.ss_i : sortValue;
		});

		// Remove index from items
		for (i = 0; i < length; i++) {
			delete arr[i].ss_i; // stable sort index
		}
	}

	/**
	 * Non-recursive method to find the lowest member of an array. Math.min raises a maximum
	 * call stack size exceeded error in Chrome when trying to apply more than 150.000 points. This
	 * method is slightly slower, but safe.
	 */
	function arrayMin(data) {
		var i = data.length,
			min = data[0];

		while (i--) {
			if (data[i] < min) {
				min = data[i];
			}
		}
		return min;
	}

	/**
	 * Non-recursive method to find the lowest member of an array. Math.min raises a maximum
	 * call stack size exceeded error in Chrome when trying to apply more than 150.000 points. This
	 * method is slightly slower, but safe.
	 */
	function arrayMax(data) {
		var i = data.length,
			max = data[0];

		while (i--) {
			if (data[i] > max) {
				max = data[i];
			}
		}
		return max;
	}

	/**
	 * Utility method that destroys any SVGElement or VMLElement that are properties on the given object.
	 * It loops all properties and invokes destroy if there is a destroy method. The property is
	 * then delete'ed.
	 * @param {Object} The object to destroy properties on
	 * @param {Object} Exception, do not destroy this property, only delete it.
	 */
	function destroyObjectProperties(obj, except) {
		var n;
		for (n in obj) {
			// If the object is non-null and destroy is defined
			if (obj[n] && obj[n] !== except && obj[n].destroy) {
				// Invoke the destroy
				obj[n].destroy();
			}

			// Delete the property from the object.
			delete obj[n];
		}
	}


	/**
	 * Discard an element by moving it to the bin and delete
	 * @param {Object} The HTML node to discard
	 */
	function discardElement(element) {
		// create a garbage bin element, not part of the DOM
		if (!garbageBin) {
			garbageBin = createElement(DIV);
		}

		// move the node and empty bin
		if (element) {
			garbageBin.appendChild(element);
		}
		garbageBin.innerHTML = '';
	}

	/**
	 * Provide error messages for debugging, with links to online explanation 
	 */
	error = function (code, stop) {
		var msg = 'Highcharts error #' + code + ': www.highcharts.com/errors/' + code;
		if (stop) {
			throw msg;
		}
		// else ...
		if (win.console) {
			console.log(msg);
		}
	};

	/**
	 * Fix JS round off float errors
	 * @param {Number} num
	 */
	function correctFloat(num) {
		return parseFloat(
			num.toPrecision(14)
		);
	}

	/**
	 * Set the global animation to either a given value, or fall back to the
	 * given chart's animation option
	 * @param {Object} animation
	 * @param {Object} chart
	 */
	function setAnimation(animation, chart) {
		globalAnimation = pick(animation, chart.animation);
	}

	/**
	 * The time unit lookup
	 */
	timeUnits = {
		millisecond: 1,
		second: 1000,
		minute: 60000,
		hour: 3600000,
		day: 24 * 3600000,
		week: 7 * 24 * 3600000,
		month: 31 * 24 * 3600000,
		year: 31556952000
	};


	/**
	 * Path interpolation algorithm used across adapters
	 */
	pathAnim = {
		/**
		 * Prepare start and end values so that the path can be animated one to one
		 */
		init: function (elem, fromD, toD) {
			fromD = fromD || '';
			var shift = elem.shift,
				bezier = fromD.indexOf('C') > -1,
				numParams = bezier ? 7 : 3,
				endLength,
				slice,
				i,
				start = fromD.split(' '),
				end = [].concat(toD), // copy
				startBaseLine,
				endBaseLine,
				sixify = function (arr) { // in splines make move points have six parameters like bezier curves
					i = arr.length;
					while (i--) {
						if (arr[i] === M) {
							arr.splice(i + 1, 0, arr[i + 1], arr[i + 2], arr[i + 1], arr[i + 2]);
						}
					}
				};

			if (bezier) {
				sixify(start);
				sixify(end);
			}

			// pull out the base lines before padding
			if (elem.isArea) {
				startBaseLine = start.splice(start.length - 6, 6);
				endBaseLine = end.splice(end.length - 6, 6);
			}

			// if shifting points, prepend a dummy point to the end path
			if (shift <= end.length / numParams && start.length === end.length) {
				while (shift--) {
					end = [].concat(end).splice(0, numParams).concat(end);
				}
			}
			elem.shift = 0; // reset for following animations

			// copy and append last point until the length matches the end length
			if (start.length) {
				endLength = end.length;
				while (start.length < endLength) {

					//bezier && sixify(start);
					slice = [].concat(start).splice(start.length - numParams, numParams);
					if (bezier) { // disable first control point
						slice[numParams - 6] = slice[numParams - 2];
						slice[numParams - 5] = slice[numParams - 1];
					}
					start = start.concat(slice);
				}
			}

			if (startBaseLine) { // append the base lines for areas
				start = start.concat(startBaseLine);
				end = end.concat(endBaseLine);
			}
			return [start, end];
		},

		/**
		 * Interpolate each value of the path and return the array
		 */
		step: function (start, end, pos, complete) {
			var ret = [],
				i = start.length,
				startVal;

			if (pos === 1) { // land on the final path without adjustment points appended in the ends
				ret = complete;

			} else if (i === end.length && pos < 1) {
				while (i--) {
					startVal = parseFloat(start[i]);
					ret[i] =
						isNaN(startVal) ? // a letter instruction like M or L
							start[i] :
							pos * (parseFloat(end[i] - startVal)) + startVal;

				}
			} else { // if animation is finished or length not matching, land on right value
				ret = end;
			}
			return ret;
		}
	};



	(function ($) {
		/**
		 * The default HighchartsAdapter for jQuery
		 */
		win.HighchartsAdapter = win.HighchartsAdapter || ($ && {
			
			/**
			 * Initialize the adapter by applying some extensions to jQuery
			 */
			init: function (pathAnim) {
				
				// extend the animate function to allow SVG animations
				var Fx = $.fx;
				
				/*jslint unparam: true*//* allow unused param x in this function */
				$.extend($.easing, {
					easeOutQuad: function (x, t, b, c, d) {
						return -c * (t /= d) * (t - 2) + b;
					}
				});
				/*jslint unparam: false*/
			
				// extend some methods to check for elem.attr, which means it is a Highcharts SVG object
				$.each(['cur', '_default', 'width', 'height', 'opacity'], function (i, fn) {
					var obj = Fx.step,
						base;
						
					// Handle different parent objects
					if (fn === 'cur') {
						obj = Fx.prototype; // 'cur', the getter, relates to Fx.prototype
					
					} else if (fn === '_default' && $.Tween) { // jQuery 1.8 model
						obj = $.Tween.propHooks[fn];
						fn = 'set';
					}
			
					// Overwrite the method
					base = obj[fn];
					if (base) { // step.width and step.height don't exist in jQuery < 1.7
			
						// create the extended function replacement
						obj[fn] = function (fx) {

							var elem;
							
							// Fx.prototype.cur does not use fx argument
							fx = i ? fx : this;

							// Don't run animations on textual properties like align (#1821)
							if (fx.prop === 'align') {
								return;
							}
			
							// shortcut
							elem = fx.elem;
			
							// Fx.prototype.cur returns the current value. The other ones are setters
							// and returning a value has no effect.
							return elem.attr ? // is SVG element wrapper
								elem.attr(fx.prop, fn === 'cur' ? UNDEFINED : fx.now) : // apply the SVG wrapper's method
								base.apply(this, arguments); // use jQuery's built-in method
						};
					}
				});

				// Extend the opacity getter, needed for fading opacity with IE9 and jQuery 1.10+
				wrap($.cssHooks.opacity, 'get', function (proceed, elem, computed) {
					return elem.attr ? (elem.opacity || 0) : proceed.call(this, elem, computed);
				});
				
				// Define the setter function for d (path definitions)
				this.addAnimSetter('d', function (fx) {
					var elem = fx.elem,
						ends;
			
					// Normally start and end should be set in state == 0, but sometimes,
					// for reasons unknown, this doesn't happen. Perhaps state == 0 is skipped
					// in these cases
					if (!fx.started) {
						ends = pathAnim.init(elem, elem.d, elem.toD);
						fx.start = ends[0];
						fx.end = ends[1];
						fx.started = true;
					}
			
					// Interpolate each value of the path
					elem.attr('d', pathAnim.step(fx.start, fx.end, fx.pos, elem.toD));
				});
				
				/**
				 * Utility for iterating over an array. Parameters are reversed compared to jQuery.
				 * @param {Array} arr
				 * @param {Function} fn
				 */
				this.each = Array.prototype.forEach ?
					function (arr, fn) { // modern browsers
						return Array.prototype.forEach.call(arr, fn);
						
					} : 
					function (arr, fn) { // legacy
						var i, 
							len = arr.length;
						for (i = 0; i < len; i++) {
							if (fn.call(arr[i], arr[i], i, arr) === false) {
								return i;
							}
						}
					};
				
				/**
				 * Register Highcharts as a plugin in the respective framework
				 */
				$.fn.highcharts = function () {
					var constr = 'Chart', // default constructor
						args = arguments,
						options,
						ret,
						chart;

					if (this[0]) {

						if (isString(args[0])) {
							constr = args[0];
							args = Array.prototype.slice.call(args, 1); 
						}
						options = args[0];

						// Create the chart
						if (options !== UNDEFINED) {
							/*jslint unused:false*/
							options.chart = options.chart || {};
							options.chart.renderTo = this[0];
							chart = new Highcharts[constr](options, args[1]);
							ret = this;
							/*jslint unused:true*/
						}

						// When called without parameters or with the return argument, get a predefined chart
						if (options === UNDEFINED) {
							ret = charts[attr(this[0], 'data-highcharts-chart')];
						}
					}
					
					return ret;
				};

			},

			/**
			 * Add an animation setter for a specific property
			 */
			addAnimSetter: function (prop, setter) {
				// jQuery 1.8 style
				if ($.Tween) {
					$.Tween.propHooks[prop] = {
						set: setter
					};
				// pre 1.8
				} else {
					$.fx.step[prop] = setter;
				}
			},
			
			/**
			 * Downloads a script and executes a callback when done.
			 * @param {String} scriptLocation
			 * @param {Function} callback
			 */
			getScript: $.getScript,
			
			/**
			 * Return the index of an item in an array, or -1 if not found
			 */
			inArray: $.inArray,
			
			/**
			 * A direct link to jQuery methods. MooTools and Prototype adapters must be implemented for each case of method.
			 * @param {Object} elem The HTML element
			 * @param {String} method Which method to run on the wrapped element
			 */
			adapterRun: function (elem, method) {
				return $(elem)[method]();
			},
		
			/**
			 * Filter an array
			 */
			grep: $.grep,
		
			/**
			 * Map an array
			 * @param {Array} arr
			 * @param {Function} fn
			 */
			map: function (arr, fn) {
				//return jQuery.map(arr, fn);
				var results = [],
					i = 0,
					len = arr.length;
				for (; i < len; i++) {
					results[i] = fn.call(arr[i], arr[i], i, arr);
				}
				return results;
		
			},
		
			/**
			 * Get the position of an element relative to the top left of the page
			 */
			offset: function (el) {
				return $(el).offset();
			},
		
			/**
			 * Add an event listener
			 * @param {Object} el A HTML element or custom object
			 * @param {String} event The event type
			 * @param {Function} fn The event handler
			 */
			addEvent: function (el, event, fn) {
				$(el).bind(event, fn);
			},
		
			/**
			 * Remove event added with addEvent
			 * @param {Object} el The object
			 * @param {String} eventType The event type. Leave blank to remove all events.
			 * @param {Function} handler The function to remove
			 */
			removeEvent: function (el, eventType, handler) {
				// workaround for jQuery issue with unbinding custom events:
				// http://forum.jQuery.com/topic/javascript-error-when-unbinding-a-custom-event-using-jQuery-1-4-2
				var func = doc.removeEventListener ? 'removeEventListener' : 'detachEvent';
				if (doc[func] && el && !el[func]) {
					el[func] = function () {};
				}
		
				$(el).unbind(eventType, handler);
			},
		
			/**
			 * Fire an event on a custom object
			 * @param {Object} el
			 * @param {String} type
			 * @param {Object} eventArguments
			 * @param {Function} defaultFunction
			 */
			fireEvent: function (el, type, eventArguments, defaultFunction) {
				var event = $.Event(type),
					detachedType = 'detached' + type,
					defaultPrevented;
		
				// Remove warnings in Chrome when accessing returnValue (#2790), layerX and layerY. Although Highcharts
				// never uses these properties, Chrome includes them in the default click event and
				// raises the warning when they are copied over in the extend statement below.
				//
				// To avoid problems in IE (see #1010) where we cannot delete the properties and avoid
				// testing if they are there (warning in chrome) the only option is to test if running IE.
				if (!isIE && eventArguments) {
					delete eventArguments.layerX;
					delete eventArguments.layerY;
					delete eventArguments.returnValue;
				}
		
				extend(event, eventArguments);
		
				// Prevent jQuery from triggering the object method that is named the
				// same as the event. For example, if the event is 'select', jQuery
				// attempts calling el.select and it goes into a loop.
				if (el[type]) {
					el[detachedType] = el[type];
					el[type] = null;
				}
		
				// Wrap preventDefault and stopPropagation in try/catch blocks in
				// order to prevent JS errors when cancelling events on non-DOM
				// objects. #615.
				/*jslint unparam: true*/
				$.each(['preventDefault', 'stopPropagation'], function (i, fn) {
					var base = event[fn];
					event[fn] = function () {
						try {
							base.call(event);
						} catch (e) {
							if (fn === 'preventDefault') {
								defaultPrevented = true;
							}
						}
					};
				});
				/*jslint unparam: false*/
		
				// trigger it
				$(el).trigger(event);
		
				// attach the method
				if (el[detachedType]) {
					el[type] = el[detachedType];
					el[detachedType] = null;
				}
		
				if (defaultFunction && !event.isDefaultPrevented() && !defaultPrevented) {
					defaultFunction(event);
				}
			},
			
			/**
			 * Extension method needed for MooTools
			 */
			washMouseEvent: function (e) {
				var ret = e.originalEvent || e;
				
				// computed by jQuery, needed by IE8
				if (ret.pageX === UNDEFINED) { // #1236
					ret.pageX = e.pageX;
					ret.pageY = e.pageY;
				}
				
				return ret;
			},
		
			/**
			 * Animate a HTML element or SVG element wrapper
			 * @param {Object} el
			 * @param {Object} params
			 * @param {Object} options jQuery-like animation options: duration, easing, callback
			 */
			animate: function (el, params, options) {
				var $el = $(el);
				if (!el.style) {
					el.style = {}; // #1881
				}
				if (params.d) {
					el.toD = params.d; // keep the array form for paths, used in $.fx.step.d
					params.d = 1; // because in jQuery, animating to an array has a different meaning
				}
		
				$el.stop();
				if (params.opacity !== UNDEFINED && el.attr) {
					params.opacity += 'px'; // force jQuery to use same logic as width and height (#2161)
				}
				el.hasAnim = 1; // #3342
				$el.animate(params, options);
		
			},
			/**
			 * Stop running animation
			 */
			stop: function (el) {
				if (el.hasAnim) { // #3342, memory leak on calling $(el) from destroy
					$(el).stop();
				}
			}
		});
	}(win.jQuery));




	// check for a custom HighchartsAdapter defined prior to this file
	var globalAdapter = win.HighchartsAdapter,
		adapter = globalAdapter || {};
		
	// Initialize the adapter
	if (globalAdapter) {
		globalAdapter.init.call(globalAdapter, pathAnim);
	}


	// Utility functions. If the HighchartsAdapter is not defined, adapter is an empty object
	// and all the utility functions will be null. In that case they are populated by the
	// default adapters below.
	var adapterRun = adapter.adapterRun,
		getScript = adapter.getScript,
		inArray = adapter.inArray,
		each = adapter.each,
		grep = adapter.grep,
		offset = adapter.offset,
		map = adapter.map,
		addEvent = adapter.addEvent,
		removeEvent = adapter.removeEvent,
		fireEvent = adapter.fireEvent,
		washMouseEvent = adapter.washMouseEvent,
		animate = adapter.animate,
		stop = adapter.stop;





	/* ****************************************************************************
	 * Handle the options                                                         *
	 *****************************************************************************/
	var

	defaultLabelOptions = {
		enabled: true,
		// rotation: 0,
		// align: 'center',
		x: 0,
		y: 15,
		/*formatter: function () {
			return this.value;
		},*/
		style: {
			color: '#606060',
			cursor: 'default',
			fontSize: '11px'
		}
	};

	defaultOptions = {
		colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c', 
			    '#8085e9', '#f15c80', '#e4d354', '#8085e8', '#8d4653', '#91e8e1'],
		symbols: ['circle', 'diamond', 'square', 'triangle', 'triangle-down'],
		lang: {
			loading: 'Loading...',
			months: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
					'August', 'September', 'October', 'November', 'December'],
			shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
			weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
			decimalPoint: '.',
			numericSymbols: ['k', 'M', 'G', 'T', 'P', 'E'], // SI prefixes used in axis labels
			resetZoom: 'Reset zoom',
			resetZoomTitle: 'Reset zoom level 1:1',
			thousandsSep: ','
		},
		global: {
			useUTC: true,
			//timezoneOffset: 0,
			canvasToolsURL: 'http://code.highcharts.com@product.cdnpath@//Highstock 2.0.4/modules/canvas-tools.js',
			VMLRadialGradientURL: 'http://code.highcharts.com@product.cdnpath@//Highstock 2.0.4/gfx/vml-radial-gradient.png'
		},
		chart: {
			//animation: true,
			//alignTicks: false,
			//reflow: true,
			//className: null,
			//events: { load, selection },
			//margin: [null],
			//marginTop: null,
			//marginRight: null,
			//marginBottom: null,
			//marginLeft: null,
			borderColor: '#4572A7',
			//borderWidth: 0,
			borderRadius: 0,
			defaultSeriesType: 'line',
			ignoreHiddenSeries: true,
			//inverted: false,
			//shadow: false,
			spacing: [10, 10, 15, 10],
			//spacingTop: 10,
			//spacingRight: 10,
			//spacingBottom: 15,
			//spacingLeft: 10,
			//style: {
			//	fontFamily: '"Lucida Grande", "Lucida Sans Unicode", Verdana, Arial, Helvetica, sans-serif', // default font
			//	fontSize: '12px'
			//},
			backgroundColor: '#FFFFFF',
			//plotBackgroundColor: null,
			plotBorderColor: '#C0C0C0',
			//plotBorderWidth: 0,
			//plotShadow: false,
			//zoomType: ''
			resetZoomButton: {
				theme: {
					zIndex: 20
				},
				position: {
					align: 'right',
					x: -10,
					//verticalAlign: 'top',
					y: 10
				}
				// relativeTo: 'plot'
			}
		},
		title: {
			text: 'Chart title',
			align: 'center',
			// floating: false,
			margin: 15,
			// x: 0,
			// verticalAlign: 'top',
			// y: null,
			style: {
				color: '#333333',
				fontSize: '18px'
			}

		},
		subtitle: {
			text: '',
			align: 'center',
			// floating: false
			// x: 0,
			// verticalAlign: 'top',
			// y: null,
			style: {
				color: '#555555'
			}
		},

		plotOptions: {
			line: { // base series options
				allowPointSelect: false,
				showCheckbox: false,
				animation: {
					duration: 1000
				},
				//connectNulls: false,
				//cursor: 'default',
				//clip: true,
				//dashStyle: null,
				//enableMouseTracking: true,
				events: {},
				//legendIndex: 0,
				//linecap: 'round',
				lineWidth: 2,
				//shadow: false,
				// stacking: null,
				marker: {
					//enabled: true,
					//symbol: null,
					lineWidth: 0,
					radius: 4,
					lineColor: '#FFFFFF',
					//fillColor: null,
					states: { // states for a single point
						hover: {
							enabled: true,
							lineWidthPlus: 1,
							radiusPlus: 2
						},
						select: {
							fillColor: '#FFFFFF',
							lineColor: '#000000',
							lineWidth: 2
						}
					}
				},
				point: {
					events: {}
				},
				dataLabels: merge(defaultLabelOptions, {
					align: 'center',
					//defer: true,
					enabled: false,
					formatter: function () {
						return this.y === null ? '' : numberFormat(this.y, -1);
					},
					verticalAlign: 'bottom', // above singular point
					y: 0
					// backgroundColor: undefined,
					// borderColor: undefined,
					// borderRadius: undefined,
					// borderWidth: undefined,
					// padding: 3,
					// shadow: false
				}),
				cropThreshold: 300, // draw points outside the plot area when the number of points is less than this
				pointRange: 0,
				//pointStart: 0,
				//pointInterval: 1,
				//showInLegend: null, // auto: true for standalone series, false for linked series
				states: { // states for the entire series
					hover: {
						//enabled: false,
						lineWidthPlus: 1,
						marker: {
							// lineWidth: base + 1,
							// radius: base + 1
						},
						halo: {
							size: 10,
							opacity: 0.25
						}
					},
					select: {
						marker: {}
					}
				},
				stickyTracking: true,
				//tooltip: {
					//pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y}</b>'
					//valueDecimals: null,
					//xDateFormat: '%A, %b %e, %Y',
					//valuePrefix: '',
					//ySuffix: ''				
				//}
				turboThreshold: 1000
				// zIndex: null
			}
		},
		labels: {
			//items: [],
			style: {
				//font: defaultFont,
				position: ABSOLUTE,
				color: '#3E576F'
			}
		},
		legend: {
			enabled: true,
			align: 'center',
			//floating: false,
			layout: 'horizontal',
			labelFormatter: function () {
				return this.name;
			},
			//borderWidth: 0,
			borderColor: '#909090',
			borderRadius: 0,
			navigation: {
				// animation: true,
				activeColor: '#274b6d',
				// arrowSize: 12
				inactiveColor: '#CCC'
				// style: {} // text styles
			},
			// margin: 20,
			// reversed: false,
			shadow: false,
			// backgroundColor: null,
			/*style: {
				padding: '5px'
			},*/
			itemStyle: {			
				color: '#333333',
				fontSize: '12px',
				fontWeight: 'bold'
			},
			itemHoverStyle: {
				//cursor: 'pointer', removed as of #601
				color: '#000'
			},
			itemHiddenStyle: {
				color: '#CCC'
			},
			itemCheckboxStyle: {
				position: ABSOLUTE,
				width: '13px', // for IE precision
				height: '13px'
			},
			// itemWidth: undefined,
			// symbolRadius: 0,
			// symbolWidth: 16,
			symbolPadding: 5,
			verticalAlign: 'bottom',
			// width: undefined,
			x: 0,
			y: 0,
			title: {
				//text: null,
				style: {
					fontWeight: 'bold'
				}
			}			
		},

		loading: {
			// hideDuration: 100,
			labelStyle: {
				fontWeight: 'bold',
				position: RELATIVE,
				top: '45%'
			},
			// showDuration: 0,
			style: {
				position: ABSOLUTE,
				backgroundColor: 'white',
				opacity: 0.5,
				textAlign: 'center'
			}
		},

		tooltip: {
			enabled: true,
			animation: hasSVG,
			//crosshairs: null,
			backgroundColor: 'rgba(249, 249, 249, .85)',
			borderWidth: 1,
			borderRadius: 3,
			dateTimeLabelFormats: { 
				millisecond: '%A, %b %e, %H:%M:%S.%L',
				second: '%A, %b %e, %H:%M:%S',
				minute: '%A, %b %e, %H:%M',
				hour: '%A, %b %e, %H:%M',
				day: '%A, %b %e, %Y',
				week: 'Week from %A, %b %e, %Y',
				month: '%B %Y',
				year: '%Y'
			},
			//formatter: defaultFormatter,
			headerFormat: '<span style="font-size: 10px">{point.key}</span><br/>',
			pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y}</b><br/>',
			shadow: true,
			//shape: 'callout',
			//shared: false,
			snap: isTouchDevice ? 25 : 10,
			style: {
				color: '#333333',
				cursor: 'default',
				fontSize: '12px',
				padding: '8px',
				whiteSpace: 'nowrap'
			}
			//xDateFormat: '%A, %b %e, %Y',
			//valueDecimals: null,
			//valuePrefix: '',
			//valueSuffix: ''
		},

		credits: {
			enabled: true,
			text: 'Highcharts.com',
			href: 'http://www.highcharts.com',
			position: {
				align: 'right',
				x: -10,
				verticalAlign: 'bottom',
				y: -5
			},
			style: {
				cursor: 'pointer',
				color: '#909090',
				fontSize: '9px'
			}
		}
	};




	// Series defaults
	var defaultPlotOptions = defaultOptions.plotOptions,
		defaultSeriesOptions = defaultPlotOptions.line;

	// set the default time methods
	setTimeMethods();



	/**
	 * Set the time methods globally based on the useUTC option. Time method can be either
	 * local time or UTC (default).
	 */
	function setTimeMethods() {
		var useUTC = defaultOptions.global.useUTC,
			GET = useUTC ? 'getUTC' : 'get',
			SET = useUTC ? 'setUTC' : 'set';


		Date = defaultOptions.global.Date || window.Date;
		timezoneOffset = ((useUTC && defaultOptions.global.timezoneOffset) || 0) * 60000;
		makeTime = useUTC ? Date.UTC : function (year, month, date, hours, minutes, seconds) {
			return new Date(
				year,
				month,
				pick(date, 1),
				pick(hours, 0),
				pick(minutes, 0),
				pick(seconds, 0)
			).getTime();
		};
		getMinutes =  GET + 'Minutes';
		getHours =    GET + 'Hours';
		getDay =      GET + 'Day';
		getDate =     GET + 'Date';
		getMonth =    GET + 'Month';
		getFullYear = GET + 'FullYear';
		setMinutes =  SET + 'Minutes';
		setHours =    SET + 'Hours';
		setDate =     SET + 'Date';
		setMonth =    SET + 'Month';
		setFullYear = SET + 'FullYear';

	}

	/**
	 * Merge the default options with custom options and return the new options structure
	 * @param {Object} options The new custom options
	 */
	function setOptions(options) {
		
		// Copy in the default options
		defaultOptions = merge(true, defaultOptions, options);
		
		// Apply UTC
		setTimeMethods();

		return defaultOptions;
	}

	/**
	 * Get the updated default options. Until 3.0.7, merely exposing defaultOptions for outside modules
	 * wasn't enough because the setOptions method created a new object.
	 */
	function getOptions() {
		return defaultOptions;
	}




	/**
	 * Handle color operations. The object methods are chainable.
	 * @param {String} input The input color in either rbga or hex format
	 */
	var rgbaRegEx = /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]?(?:\.[0-9]+)?)\s*\)/,
		hexRegEx = /#([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/,
		rgbRegEx = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/;

	var Color = function (input) {
		// declare variables
		var rgba = [], result, stops;

		/**
		 * Parse the input color to rgba array
		 * @param {String} input
		 */
		function init(input) {

			// Gradients
			if (input && input.stops) {
				stops = map(input.stops, function (stop) {
					return Color(stop[1]);
				});

			// Solid colors
			} else {
				// rgba
				result = rgbaRegEx.exec(input);
				if (result) {
					rgba = [pInt(result[1]), pInt(result[2]), pInt(result[3]), parseFloat(result[4], 10)];
				} else { 
					// hex
					result = hexRegEx.exec(input);
					if (result) {
						rgba = [pInt(result[1], 16), pInt(result[2], 16), pInt(result[3], 16), 1];
					} else {
						// rgb
						result = rgbRegEx.exec(input);
						if (result) {
							rgba = [pInt(result[1]), pInt(result[2]), pInt(result[3]), 1];
						}
					}
				}
			}		

		}
		/**
		 * Return the color a specified format
		 * @param {String} format
		 */
		function get(format) {
			var ret;

			if (stops) {
				ret = merge(input);
				ret.stops = [].concat(ret.stops);
				each(stops, function (stop, i) {
					ret.stops[i] = [ret.stops[i][0], stop.get(format)];
				});

			// it's NaN if gradient colors on a column chart
			} else if (rgba && !isNaN(rgba[0])) {
				if (format === 'rgb') {
					ret = 'rgb(' + rgba[0] + ',' + rgba[1] + ',' + rgba[2] + ')';
				} else if (format === 'a') {
					ret = rgba[3];
				} else {
					ret = 'rgba(' + rgba.join(',') + ')';
				}
			} else {
				ret = input;
			}
			return ret;
		}

		/**
		 * Brighten the color
		 * @param {Number} alpha
		 */
		function brighten(alpha) {
			if (stops) {
				each(stops, function (stop) {
					stop.brighten(alpha);
				});
			
			} else if (isNumber(alpha) && alpha !== 0) {
				var i;
				for (i = 0; i < 3; i++) {
					rgba[i] += pInt(alpha * 255);

					if (rgba[i] < 0) {
						rgba[i] = 0;
					}
					if (rgba[i] > 255) {
						rgba[i] = 255;
					}
				}
			}
			return this;
		}
		/**
		 * Set the color's opacity to a given alpha value
		 * @param {Number} alpha
		 */
		function setOpacity(alpha) {
			rgba[3] = alpha;
			return this;
		}

		// initialize: parse the input
		init(input);

		// public methods
		return {
			get: get,
			brighten: brighten,
			rgba: rgba,
			setOpacity: setOpacity
		};
	};




	/**
	 * A wrapper object for SVG elements
	 */
	function SVGElement() {}

	SVGElement.prototype = {
		
		// Default base for animation
		opacity: 1,
		// For labels, these CSS properties are applied to the <text> node directly
		textProps: ['fontSize', 'fontWeight', 'fontFamily', 'color', 
			'lineHeight', 'width', 'textDecoration', 'textShadow', 'HcTextStroke'],
		
		/**
		 * Initialize the SVG renderer
		 * @param {Object} renderer
		 * @param {String} nodeName
		 */
		init: function (renderer, nodeName) {
			var wrapper = this;
			wrapper.element = nodeName === 'span' ?
				createElement(nodeName) :
				doc.createElementNS(SVG_NS, nodeName);
			wrapper.renderer = renderer;
		},
		
		/**
		 * Animate a given attribute
		 * @param {Object} params
		 * @param {Number} options The same options as in jQuery animation
		 * @param {Function} complete Function to perform at the end of animation
		 */
		animate: function (params, options, complete) {
			var animOptions = pick(options, globalAnimation, true);
			stop(this); // stop regardless of animation actually running, or reverting to .attr (#607)
			if (animOptions) {
				animOptions = merge(animOptions, {}); //#2625
				if (complete) { // allows using a callback with the global animation without overwriting it
					animOptions.complete = complete;
				}
				animate(this, params, animOptions);
			} else {
				this.attr(params);
				if (complete) {
					complete();
				}
			}
			return this;
		},

		/**
		 * Build an SVG gradient out of a common JavaScript configuration object
		 */
		colorGradient: function (color, prop, elem) {
			var renderer = this.renderer,
				colorObject,
				gradName,
				gradAttr,
				gradients,
				gradientObject,
				stops,
				stopColor,
				stopOpacity,
				radialReference,
				n,
				id,
				key = [];

			// Apply linear or radial gradients
			if (color.linearGradient) {
				gradName = 'linearGradient';
			} else if (color.radialGradient) {
				gradName = 'radialGradient';
			}

			if (gradName) {
				gradAttr = color[gradName];
				gradients = renderer.gradients;
				stops = color.stops;
				radialReference = elem.radialReference;

				// Keep < 2.2 kompatibility
				if (isArray(gradAttr)) {
					color[gradName] = gradAttr = {
						x1: gradAttr[0],
						y1: gradAttr[1],
						x2: gradAttr[2],
						y2: gradAttr[3],
						gradientUnits: 'userSpaceOnUse'
					};
				}

				// Correct the radial gradient for the radial reference system
				if (gradName === 'radialGradient' && radialReference && !defined(gradAttr.gradientUnits)) {
					gradAttr = merge(gradAttr, {
						cx: (radialReference[0] - radialReference[2] / 2) + gradAttr.cx * radialReference[2],
						cy: (radialReference[1] - radialReference[2] / 2) + gradAttr.cy * radialReference[2],
						r: gradAttr.r * radialReference[2],
						gradientUnits: 'userSpaceOnUse'
					});
				}

				// Build the unique key to detect whether we need to create a new element (#1282)
				for (n in gradAttr) {
					if (n !== 'id') {
						key.push(n, gradAttr[n]);
					}
				}
				for (n in stops) {
					key.push(stops[n]);
				}
				key = key.join(',');

				// Check if a gradient object with the same config object is created within this renderer
				if (gradients[key]) {
					id = gradients[key].attr('id');

				} else {

					// Set the id and create the element
					gradAttr.id = id = PREFIX + idCounter++;
					gradients[key] = gradientObject = renderer.createElement(gradName)
						.attr(gradAttr)
						.add(renderer.defs);


					// The gradient needs to keep a list of stops to be able to destroy them
					gradientObject.stops = [];
					each(stops, function (stop) {
						var stopObject;
						if (stop[1].indexOf('rgba') === 0) {
							colorObject = Color(stop[1]);
							stopColor = colorObject.get('rgb');
							stopOpacity = colorObject.get('a');
						} else {
							stopColor = stop[1];
							stopOpacity = 1;
						}
						stopObject = renderer.createElement('stop').attr({
							offset: stop[0],
							'stop-color': stopColor,
							'stop-opacity': stopOpacity
						}).add(gradientObject);

						// Add the stop element to the gradient
						gradientObject.stops.push(stopObject);
					});
				}

				// Set the reference to the gradient object
				elem.setAttribute(prop, 'url(' + renderer.url + '#' + id + ')');
			} 
		},

		/**
		 * Set or get a given attribute
		 * @param {Object|String} hash
		 * @param {Mixed|Undefined} val
		 */
		attr: function (hash, val) {
			var key,
				value,
				element = this.element,
				hasSetSymbolSize,
				ret = this,
				skipAttr;

			// single key-value pair
			if (typeof hash === 'string' && val !== UNDEFINED) {
				key = hash;
				hash = {};
				hash[key] = val;
			}

			// used as a getter: first argument is a string, second is undefined
			if (typeof hash === 'string') {
				ret = (this[hash + 'Getter'] || this._defaultGetter).call(this, hash, element);
			
			// setter
			} else {

				for (key in hash) {
					value = hash[key];
					skipAttr = false;



					if (this.symbolName && /^(x|y|width|height|r|start|end|innerR|anchorX|anchorY)/.test(key)) {
						if (!hasSetSymbolSize) {
							this.symbolAttr(hash);
							hasSetSymbolSize = true;
						}
						skipAttr = true;
					}

					if (this.rotation && (key === 'x' || key === 'y')) {
						this.doTransform = true;
					}
					
					if (!skipAttr) {
						(this[key + 'Setter'] || this._defaultSetter).call(this, value, key, element);
					}

					// Let the shadow follow the main element
					if (this.shadows && /^(width|height|visibility|x|y|d|transform|cx|cy|r)$/.test(key)) {
						this.updateShadows(key, value);
					}
				}

				// Update transform. Do this outside the loop to prevent redundant updating for batch setting
				// of attributes.
				if (this.doTransform) {
					this.updateTransform();
					this.doTransform = false;
				}

			}

			return ret;
		},

		updateShadows: function (key, value) {
			var shadows = this.shadows,
				i = shadows.length;
			while (i--) {
				shadows[i].setAttribute(
					key,
					key === 'height' ?
						mathMax(value - (shadows[i].cutHeight || 0), 0) :
						key === 'd' ? this.d : value
				);
			}
		},

		/**
		 * Add a class name to an element
		 */
		addClass: function (className) {
			var element = this.element,
				currentClassName = attr(element, 'class') || '';

			if (currentClassName.indexOf(className) === -1) {
				attr(element, 'class', currentClassName + ' ' + className);
			}
			return this;
		},
		/* hasClass and removeClass are not (yet) needed
		hasClass: function (className) {
			return attr(this.element, 'class').indexOf(className) !== -1;
		},
		removeClass: function (className) {
			attr(this.element, 'class', attr(this.element, 'class').replace(className, ''));
			return this;
		},
		*/

		/**
		 * If one of the symbol size affecting parameters are changed,
		 * check all the others only once for each call to an element's
		 * .attr() method
		 * @param {Object} hash
		 */
		symbolAttr: function (hash) {
			var wrapper = this;

			each(['x', 'y', 'r', 'start', 'end', 'width', 'height', 'innerR', 'anchorX', 'anchorY'], function (key) {
				wrapper[key] = pick(hash[key], wrapper[key]);
			});

			wrapper.attr({
				d: wrapper.renderer.symbols[wrapper.symbolName](
					wrapper.x,
					wrapper.y,
					wrapper.width,
					wrapper.height,
					wrapper
				)
			});
		},

		/**
		 * Apply a clipping path to this object
		 * @param {String} id
		 */
		clip: function (clipRect) {
			return this.attr('clip-path', clipRect ? 'url(' + this.renderer.url + '#' + clipRect.id + ')' : NONE);
		},

		/**
		 * Calculate the coordinates needed for drawing a rectangle crisply and return the
		 * calculated attributes
		 * @param {Number} strokeWidth
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Number} width
		 * @param {Number} height
		 */
		crisp: function (rect) {

			var wrapper = this,
				key,
				attribs = {},
				normalizer,
				strokeWidth = rect.strokeWidth || wrapper.strokeWidth || 0;

			normalizer = mathRound(strokeWidth) % 2 / 2; // mathRound because strokeWidth can sometimes have roundoff errors

			// normalize for crisp edges
			rect.x = mathFloor(rect.x || wrapper.x || 0) + normalizer;
			rect.y = mathFloor(rect.y || wrapper.y || 0) + normalizer;
			rect.width = mathFloor((rect.width || wrapper.width || 0) - 2 * normalizer);
			rect.height = mathFloor((rect.height || wrapper.height || 0) - 2 * normalizer);
			rect.strokeWidth = strokeWidth;

			for (key in rect) {
				if (wrapper[key] !== rect[key]) { // only set attribute if changed
					wrapper[key] = attribs[key] = rect[key];
				}
			}

			return attribs;
		},

		/**
		 * Set styles for the element
		 * @param {Object} styles
		 */
		css: function (styles) {
			var elemWrapper = this,
				oldStyles = elemWrapper.styles,
				newStyles = {},
				elem = elemWrapper.element,
				textWidth,
				n,
				serializedCss = '',
				hyphenate,
				hasNew = !oldStyles;

			// convert legacy
			if (styles && styles.color) {
				styles.fill = styles.color;
			}

			// Filter out existing styles to increase performance (#2640)
			if (oldStyles) {
				for (n in styles) {
					if (styles[n] !== oldStyles[n]) {
						newStyles[n] = styles[n];
						hasNew = true;
					}
				}
			}
			if (hasNew) {
				textWidth = elemWrapper.textWidth = styles && styles.width && elem.nodeName.toLowerCase() === 'text' && pInt(styles.width);

				// Merge the new styles with the old ones
				if (oldStyles) {
					styles = extend(
						oldStyles,
						newStyles
					);
				}		

				// store object
				elemWrapper.styles = styles;

				if (textWidth && (useCanVG || (!hasSVG && elemWrapper.renderer.forExport))) {
					delete styles.width;
				}

				// serialize and set style attribute
				if (isIE && !hasSVG) {
					css(elemWrapper.element, styles);
				} else {
					/*jslint unparam: true*/
					hyphenate = function (a, b) { return '-' + b.toLowerCase(); };
					/*jslint unparam: false*/
					for (n in styles) {
						serializedCss += n.replace(/([A-Z])/g, hyphenate) + ':' + styles[n] + ';';
					}
					attr(elem, 'style', serializedCss); // #1881
				}


				// re-build text
				if (textWidth && elemWrapper.added) {
					elemWrapper.renderer.buildText(elemWrapper);
				}
			}

			return elemWrapper;
		},

		/**
		 * Add an event listener
		 * @param {String} eventType
		 * @param {Function} handler
		 */
		on: function (eventType, handler) {
			var svgElement = this,
				element = svgElement.element;
			
			// touch
			if (hasTouch && eventType === 'click') {
				element.ontouchstart = function (e) {			
					svgElement.touchEventFired = Date.now();				
					e.preventDefault();
					handler.call(element, e);
				};
				element.onclick = function (e) {												
					if (userAgent.indexOf('Android') === -1 || Date.now() - (svgElement.touchEventFired || 0) > 1100) { // #2269
						handler.call(element, e);
					}
				};			
			} else {
				// simplest possible event model for internal use
				element['on' + eventType] = handler;
			}
			return this;
		},

		/**
		 * Set the coordinates needed to draw a consistent radial gradient across
		 * pie slices regardless of positioning inside the chart. The format is
		 * [centerX, centerY, diameter] in pixels.
		 */
		setRadialReference: function (coordinates) {
			this.element.radialReference = coordinates;
			return this;
		},

		/**
		 * Move an object and its children by x and y values
		 * @param {Number} x
		 * @param {Number} y
		 */
		translate: function (x, y) {
			return this.attr({
				translateX: x,
				translateY: y
			});
		},

		/**
		 * Invert a group, rotate and flip
		 */
		invert: function () {
			var wrapper = this;
			wrapper.inverted = true;
			wrapper.updateTransform();
			return wrapper;
		},

		/**
		 * Private method to update the transform attribute based on internal
		 * properties
		 */
		updateTransform: function () {
			var wrapper = this,
				translateX = wrapper.translateX || 0,
				translateY = wrapper.translateY || 0,
				scaleX = wrapper.scaleX,
				scaleY = wrapper.scaleY,
				inverted = wrapper.inverted,
				rotation = wrapper.rotation,
				element = wrapper.element,
				transform;

			// flipping affects translate as adjustment for flipping around the group's axis
			if (inverted) {
				translateX += wrapper.attr('width');
				translateY += wrapper.attr('height');
			}

			// Apply translate. Nearly all transformed elements have translation, so instead
			// of checking for translate = 0, do it always (#1767, #1846).
			transform = ['translate(' + translateX + ',' + translateY + ')'];

			// apply rotation
			if (inverted) {
				transform.push('rotate(90) scale(-1,1)');
			} else if (rotation) { // text rotation
				transform.push('rotate(' + rotation + ' ' + (element.getAttribute('x') || 0) + ' ' + (element.getAttribute('y') || 0) + ')');
			}

			// apply scale
			if (defined(scaleX) || defined(scaleY)) {
				transform.push('scale(' + pick(scaleX, 1) + ' ' + pick(scaleY, 1) + ')');
			}

			if (transform.length) {
				element.setAttribute('transform', transform.join(' '));
			}
		},
		/**
		 * Bring the element to the front
		 */
		toFront: function () {
			var element = this.element;
			element.parentNode.appendChild(element);
			return this;
		},


		/**
		 * Break down alignment options like align, verticalAlign, x and y
		 * to x and y relative to the chart.
		 *
		 * @param {Object} alignOptions
		 * @param {Boolean} alignByTranslate
		 * @param {String[Object} box The box to align to, needs a width and height. When the
		 *        box is a string, it refers to an object in the Renderer. For example, when
		 *        box is 'spacingBox', it refers to Renderer.spacingBox which holds width, height
		 *        x and y properties.
		 *
		 */
		align: function (alignOptions, alignByTranslate, box) {
			var align,
				vAlign,
				x,
				y,
				attribs = {},
				alignTo,
				renderer = this.renderer,
				alignedObjects = renderer.alignedObjects;

			// First call on instanciate
			if (alignOptions) {
				this.alignOptions = alignOptions;
				this.alignByTranslate = alignByTranslate;
				if (!box || isString(box)) { // boxes other than renderer handle this internally
					this.alignTo = alignTo = box || 'renderer';
					erase(alignedObjects, this); // prevent duplicates, like legendGroup after resize
					alignedObjects.push(this);
					box = null; // reassign it below
				}

			// When called on resize, no arguments are supplied
			} else {
				alignOptions = this.alignOptions;
				alignByTranslate = this.alignByTranslate;
				alignTo = this.alignTo;
			}

			box = pick(box, renderer[alignTo], renderer);

			// Assign variables
			align = alignOptions.align;
			vAlign = alignOptions.verticalAlign;
			x = (box.x || 0) + (alignOptions.x || 0); // default: left align
			y = (box.y || 0) + (alignOptions.y || 0); // default: top align

			// Align
			if (align === 'right' || align === 'center') {
				x += (box.width - (alignOptions.width || 0)) /
						{ right: 1, center: 2 }[align];
			}
			attribs[alignByTranslate ? 'translateX' : 'x'] = mathRound(x);


			// Vertical align
			if (vAlign === 'bottom' || vAlign === 'middle') {
				y += (box.height - (alignOptions.height || 0)) /
						({ bottom: 1, middle: 2 }[vAlign] || 1);

			}
			attribs[alignByTranslate ? 'translateY' : 'y'] = mathRound(y);

			// Animate only if already placed
			this[this.placed ? 'animate' : 'attr'](attribs);
			this.placed = true;
			this.alignAttr = attribs;

			return this;
		},

		/**
		 * Get the bounding box (width, height, x and y) for the element
		 */
		getBBox: function () {
			var wrapper = this,
				bBox = wrapper.bBox,
				renderer = wrapper.renderer,
				width,
				height,
				rotation = wrapper.rotation,
				element = wrapper.element,
				styles = wrapper.styles,
				rad = rotation * deg2rad,
				textStr = wrapper.textStr,
				cacheKey;

			// Since numbers are monospaced, and numerical labels appear a lot in a chart,
			// we assume that a label of n characters has the same bounding box as others 
			// of the same length.
			if (textStr === '' || numRegex.test(textStr)) {
				cacheKey = 'num.' + textStr.toString().length + (styles ? ('|' + styles.fontSize + '|' + styles.fontFamily) : '');

			} //else { // This code block made demo/waterfall fail, related to buildText
				// Caching all strings reduces rendering time by 4-5%. 
				// TODO: Check how this affects places where bBox is found on the element
				//cacheKey = textStr + (styles ? ('|' + styles.fontSize + '|' + styles.fontFamily) : '');
			//}
			if (cacheKey) {
				bBox = renderer.cache[cacheKey];
			}

			// No cache found
			if (!bBox) {

				// SVG elements
				if (element.namespaceURI === SVG_NS || renderer.forExport) {
					try { // Fails in Firefox if the container has display: none.

						bBox = element.getBBox ?
							// SVG: use extend because IE9 is not allowed to change width and height in case
							// of rotation (below)
							extend({}, element.getBBox()) :
							// Canvas renderer and legacy IE in export mode
							{
								width: element.offsetWidth,
								height: element.offsetHeight
							};
					} catch (e) {}

					// If the bBox is not set, the try-catch block above failed. The other condition
					// is for Opera that returns a width of -Infinity on hidden elements.
					if (!bBox || bBox.width < 0) {
						bBox = { width: 0, height: 0 };
					}


				// VML Renderer or useHTML within SVG
				} else {

					bBox = wrapper.htmlGetBBox();

				}

				// True SVG elements as well as HTML elements in modern browsers using the .useHTML option
				// need to compensated for rotation
				if (renderer.isSVG) {
					width = bBox.width;
					height = bBox.height;

					// Workaround for wrong bounding box in IE9 and IE10 (#1101, #1505, #1669, #2568)
					if (isIE && styles && styles.fontSize === '11px' && height.toPrecision(3) === '16.9') {
						bBox.height = height = 14;
					}

					// Adjust for rotated text
					if (rotation) {
						bBox.width = mathAbs(height * mathSin(rad)) + mathAbs(width * mathCos(rad));
						bBox.height = mathAbs(height * mathCos(rad)) + mathAbs(width * mathSin(rad));
					}
				}

				// Cache it
				wrapper.bBox = bBox;
				if (cacheKey) {
					renderer.cache[cacheKey] = bBox;
				}
			}
			return bBox;
		},

		/**
		 * Show the element
		 */
		show: function (inherit) {
			// IE9-11 doesn't handle visibilty:inherit well, so we remove the attribute instead (#2881)
			if (inherit && this.element.namespaceURI === SVG_NS) {
				this.element.removeAttribute('visibility');
			} else {
				this.attr({ visibility: inherit ? 'inherit' : VISIBLE });
			}
			return this;
		},

		/**
		 * Hide the element
		 */
		hide: function () {
			return this.attr({ visibility: HIDDEN });
		},

		fadeOut: function (duration) {
			var elemWrapper = this;
			elemWrapper.animate({
				opacity: 0
			}, {
				duration: duration || 150,
				complete: function () {
					elemWrapper.attr({ y: -9999 }); // #3088, assuming we're only using this for tooltips
				}
			});
		},

		/**
		 * Add the element
		 * @param {Object|Undefined} parent Can be an element, an element wrapper or undefined
		 *    to append the element to the renderer.box.
		 */
		add: function (parent) {

			var renderer = this.renderer,
				parentWrapper = parent || renderer,
				parentNode = parentWrapper.element || renderer.box,
				childNodes,
				element = this.element,
				zIndex = this.zIndex,
				otherElement,
				otherZIndex,
				i,
				inserted;

			if (parent) {
				this.parentGroup = parent;
			}

			// mark as inverted
			this.parentInverted = parent && parent.inverted;

			// build formatted text
			if (this.textStr !== undefined) {
				renderer.buildText(this);
			}

			// mark the container as having z indexed children
			if (zIndex) {
				parentWrapper.handleZ = true;
				zIndex = pInt(zIndex);
			}

			// insert according to this and other elements' zIndex
			if (parentWrapper.handleZ) { // this element or any of its siblings has a z index
				childNodes = parentNode.childNodes;
				for (i = 0; i < childNodes.length; i++) {
					otherElement = childNodes[i];
					otherZIndex = attr(otherElement, 'zIndex');
					if (otherElement !== element && (
							// insert before the first element with a higher zIndex
							pInt(otherZIndex) > zIndex ||
							// if no zIndex given, insert before the first element with a zIndex
							(!defined(zIndex) && defined(otherZIndex))

							)) {
						parentNode.insertBefore(element, otherElement);
						inserted = true;
						break;
					}
				}
			}

			// default: append at the end
			if (!inserted) {
				parentNode.appendChild(element);
			}

			// mark as added
			this.added = true;

			// fire an event for internal hooks
			if (this.onAdd) {
				this.onAdd();
			}

			return this;
		},

		/**
		 * Removes a child either by removeChild or move to garbageBin.
		 * Issue 490; in VML removeChild results in Orphaned nodes according to sIEve, discardElement does not.
		 */
		safeRemoveChild: function (element) {
			var parentNode = element.parentNode;
			if (parentNode) {
				parentNode.removeChild(element);
			}
		},

		/**
		 * Destroy the element and element wrapper
		 */
		destroy: function () {
			var wrapper = this,
				element = wrapper.element || {},
				shadows = wrapper.shadows,
				parentToClean = wrapper.renderer.isSVG && element.nodeName === 'SPAN' && wrapper.parentGroup,
				grandParent,
				key,
				i;

			// remove events
			element.onclick = element.onmouseout = element.onmouseover = element.onmousemove = element.point = null;
			stop(wrapper); // stop running animations

			if (wrapper.clipPath) {
				wrapper.clipPath = wrapper.clipPath.destroy();
			}

			// Destroy stops in case this is a gradient object
			if (wrapper.stops) {
				for (i = 0; i < wrapper.stops.length; i++) {
					wrapper.stops[i] = wrapper.stops[i].destroy();
				}
				wrapper.stops = null;
			}

			// remove element
			wrapper.safeRemoveChild(element);

			// destroy shadows
			if (shadows) {
				each(shadows, function (shadow) {
					wrapper.safeRemoveChild(shadow);
				});
			}

			// In case of useHTML, clean up empty containers emulating SVG groups (#1960, #2393, #2697).
			while (parentToClean && parentToClean.div && parentToClean.div.childNodes.length === 0) {
				grandParent = parentToClean.parentGroup;
				wrapper.safeRemoveChild(parentToClean.div);
				delete parentToClean.div;
				parentToClean = grandParent;
			}

			// remove from alignObjects
			if (wrapper.alignTo) {
				erase(wrapper.renderer.alignedObjects, wrapper);
			}

			for (key in wrapper) {
				delete wrapper[key];
			}

			return null;
		},

		/**
		 * Add a shadow to the element. Must be done after the element is added to the DOM
		 * @param {Boolean|Object} shadowOptions
		 */
		shadow: function (shadowOptions, group, cutOff) {
			var shadows = [],
				i,
				shadow,
				element = this.element,
				strokeWidth,
				shadowWidth,
				shadowElementOpacity,

				// compensate for inverted plot area
				transform;


			if (shadowOptions) {
				shadowWidth = pick(shadowOptions.width, 3);
				shadowElementOpacity = (shadowOptions.opacity || 0.15) / shadowWidth;
				transform = this.parentInverted ?
					'(-1,-1)' :
					'(' + pick(shadowOptions.offsetX, 1) + ', ' + pick(shadowOptions.offsetY, 1) + ')';
				for (i = 1; i <= shadowWidth; i++) {
					shadow = element.cloneNode(0);
					strokeWidth = (shadowWidth * 2) + 1 - (2 * i);
					attr(shadow, {
						'isShadow': 'true',
						'stroke': shadowOptions.color || 'black',
						'stroke-opacity': shadowElementOpacity * i,
						'stroke-width': strokeWidth,
						'transform': 'translate' + transform,
						'fill': NONE
					});
					if (cutOff) {
						attr(shadow, 'height', mathMax(attr(shadow, 'height') - strokeWidth, 0));
						shadow.cutHeight = strokeWidth;
					}

					if (group) {
						group.element.appendChild(shadow);
					} else {
						element.parentNode.insertBefore(shadow, element);
					}

					shadows.push(shadow);
				}

				this.shadows = shadows;
			}
			return this;

		},

		xGetter: function (key) {
			if (this.element.nodeName === 'circle') {
				key = { x: 'cx', y: 'cy' }[key] || key;
			}
			return this._defaultGetter(key);
		},

		/** 
		 * Get the current value of an attribute or pseudo attribute, used mainly
		 * for animation.
		 */
		_defaultGetter: function (key) {
			var ret = pick(this[key], this.element ? this.element.getAttribute(key) : null, 0);

			if (/^[\-0-9\.]+$/.test(ret)) { // is numerical
				ret = parseFloat(ret);
			}
			return ret;
		},


		dSetter: function (value, key, element) {
			if (value && value.join) { // join path
				value = value.join(' ');
			}
			if (/(NaN| {2}|^$)/.test(value)) {
				value = 'M 0 0';
			}
			element.setAttribute(key, value);

			this[key] = value;
		},
		dashstyleSetter: function (value) {
			var i;
			value = value && value.toLowerCase();
			if (value) {
				value = value
					.replace('shortdashdotdot', '3,1,1,1,1,1,')
					.replace('shortdashdot', '3,1,1,1')
					.replace('shortdot', '1,1,')
					.replace('shortdash', '3,1,')
					.replace('longdash', '8,3,')
					.replace(/dot/g, '1,3,')
					.replace('dash', '4,3,')
					.replace(/,$/, '')
					.split(','); // ending comma

				i = value.length;
				while (i--) {
					value[i] = pInt(value[i]) * this['stroke-width'];
				}
				value = value.join(',')
					.replace('NaN', 'none'); // #3226
				this.element.setAttribute('stroke-dasharray', value);
			}
		},
		alignSetter: function (value) {
			this.element.setAttribute('text-anchor', { left: 'start', center: 'middle', right: 'end' }[value]);
		},
		opacitySetter: function (value, key, element) {
			this[key] = value;
			element.setAttribute(key, value);
		},
		titleSetter: function (value) {
			var titleNode = this.element.getElementsByTagName('title')[0];
			if (!titleNode) {
				titleNode = doc.createElementNS(SVG_NS, 'title');
				this.element.appendChild(titleNode);
			}
			titleNode.textContent = pick(value, '').replace(/<[^>]*>/g, ''); // #3276
		},
		textSetter: function (value) {
			if (value !== this.textStr) {
				// Delete bBox memo when the text changes
				delete this.bBox;
			
				this.textStr = value;
				if (this.added) {
					this.renderer.buildText(this);
				}
			}
		},
		fillSetter: function (value, key, element) {
			if (typeof value === 'string') {
				element.setAttribute(key, value);
			} else if (value) {
				this.colorGradient(value, key, element);
			}
		},
		zIndexSetter: function (value, key, element) {
			element.setAttribute(key, value);
			this[key] = value;
		},
		_defaultSetter: function (value, key, element) {
			element.setAttribute(key, value);
		}
	};

	// Some shared setters and getters
	SVGElement.prototype.yGetter = SVGElement.prototype.xGetter;
	SVGElement.prototype.translateXSetter = SVGElement.prototype.translateYSetter = 
			SVGElement.prototype.rotationSetter = SVGElement.prototype.verticalAlignSetter = 
			SVGElement.prototype.scaleXSetter = SVGElement.prototype.scaleYSetter = function (value, key) {
		this[key] = value;
		this.doTransform = true;
	};

	// WebKit and Batik have problems with a stroke-width of zero, so in this case we remove the 
	// stroke attribute altogether. #1270, #1369, #3065, #3072.
	SVGElement.prototype['stroke-widthSetter'] = SVGElement.prototype.strokeSetter = function (value, key, element) {
		this[key] = value;
		// Only apply the stroke attribute if the stroke width is defined and larger than 0
		if (this.stroke && this['stroke-width']) {
			this.strokeWidth = this['stroke-width'];
			SVGElement.prototype.fillSetter.call(this, this.stroke, 'stroke', element); // use prototype as instance may be overridden
			element.setAttribute('stroke-width', this['stroke-width']);
			this.hasStroke = true;
		} else if (key === 'stroke-width' && value === 0 && this.hasStroke) {
			element.removeAttribute('stroke');
			this.hasStroke = false;
		}
	};


	/**
	 * The default SVG renderer
	 */
	var SVGRenderer = function () {
		this.init.apply(this, arguments);
	};
	SVGRenderer.prototype = {
		Element: SVGElement,

		/**
		 * Initialize the SVGRenderer
		 * @param {Object} container
		 * @param {Number} width
		 * @param {Number} height
		 * @param {Boolean} forExport
		 */
		init: function (container, width, height, style, forExport) {
			var renderer = this,
				loc = location,
				boxWrapper,
				element,
				desc;

			boxWrapper = renderer.createElement('svg')
				.attr({
					version: '1.1'
				})
				.css(this.getStyle(style));
			element = boxWrapper.element;
			container.appendChild(element);

			// For browsers other than IE, add the namespace attribute (#1978)
			if (container.innerHTML.indexOf('xmlns') === -1) {
				attr(element, 'xmlns', SVG_NS);
			}

			// object properties
			renderer.isSVG = true;
			renderer.box = element;
			renderer.boxWrapper = boxWrapper;
			renderer.alignedObjects = [];

			// Page url used for internal references. #24, #672, #1070
			renderer.url = (isFirefox || isWebKit) && doc.getElementsByTagName('base').length ?
				loc.href
					.replace(/#.*?$/, '') // remove the hash
					.replace(/([\('\)])/g, '\\$1') // escape parantheses and quotes
					.replace(/ /g, '%20') : // replace spaces (needed for Safari only)
				'';

			// Add description
			desc = this.createElement('desc').add();
			desc.element.appendChild(doc.createTextNode('Created with ' + PRODUCT + ' ' + VERSION));


			renderer.defs = this.createElement('defs').add();
			renderer.forExport = forExport;
			renderer.gradients = {}; // Object where gradient SvgElements are stored
			renderer.cache = {}; // Cache for numerical bounding boxes

			renderer.setSize(width, height, false);



			// Issue 110 workaround:
			// In Firefox, if a div is positioned by percentage, its pixel position may land
			// between pixels. The container itself doesn't display this, but an SVG element
			// inside this container will be drawn at subpixel precision. In order to draw
			// sharp lines, this must be compensated for. This doesn't seem to work inside
			// iframes though (like in jsFiddle).
			var subPixelFix, rect;
			if (isFirefox && container.getBoundingClientRect) {
				renderer.subPixelFix = subPixelFix = function () {
					css(container, { left: 0, top: 0 });
					rect = container.getBoundingClientRect();
					css(container, {
						left: (mathCeil(rect.left) - rect.left) + PX,
						top: (mathCeil(rect.top) - rect.top) + PX
					});
				};

				// run the fix now
				subPixelFix();

				// run it on resize
				addEvent(win, 'resize', subPixelFix);
			}
		},

		getStyle: function (style) {
			return (this.style = extend({
				fontFamily: '"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sans-serif', // default font
				fontSize: '12px'
			}, style));
		},

		/**
		 * Detect whether the renderer is hidden. This happens when one of the parent elements
		 * has display: none. #608.
		 */
		isHidden: function () {
			return !this.boxWrapper.getBBox().width;
		},

		/**
		 * Destroys the renderer and its allocated members.
		 */
		destroy: function () {
			var renderer = this,
				rendererDefs = renderer.defs;
			renderer.box = null;
			renderer.boxWrapper = renderer.boxWrapper.destroy();

			// Call destroy on all gradient elements
			destroyObjectProperties(renderer.gradients || {});
			renderer.gradients = null;

			// Defs are null in VMLRenderer
			// Otherwise, destroy them here.
			if (rendererDefs) {
				renderer.defs = rendererDefs.destroy();
			}

			// Remove sub pixel fix handler
			// We need to check that there is a handler, otherwise all functions that are registered for event 'resize' are removed
			// See issue #982
			if (renderer.subPixelFix) {
				removeEvent(win, 'resize', renderer.subPixelFix);
			}

			renderer.alignedObjects = null;

			return null;
		},

		/**
		 * Create a wrapper for an SVG element
		 * @param {Object} nodeName
		 */
		createElement: function (nodeName) {
			var wrapper = new this.Element();
			wrapper.init(this, nodeName);
			return wrapper;
		},

		/**
		 * Dummy function for use in canvas renderer
		 */
		draw: function () {},

		/**
		 * Parse a simple HTML string into SVG tspans
		 *
		 * @param {Object} textNode The parent text SVG node
		 */
		buildText: function (wrapper) {
			var textNode = wrapper.element,
				renderer = this,
				forExport = renderer.forExport,
				textStr = pick(wrapper.textStr, '').toString(),
				hasMarkup = textStr.indexOf('<') !== -1,
				lines,
				childNodes = textNode.childNodes,
				styleRegex,
				hrefRegex,
				parentX = attr(textNode, 'x'),
				textStyles = wrapper.styles,
				width = wrapper.textWidth,
				textLineHeight = textStyles && textStyles.lineHeight,
				textStroke = textStyles && textStyles.HcTextStroke,
				i = childNodes.length,
				getLineHeight = function (tspan) {
					return textLineHeight ? 
						pInt(textLineHeight) :
						renderer.fontMetrics(
							/(px|em)$/.test(tspan && tspan.style.fontSize) ?
								tspan.style.fontSize :
								((textStyles && textStyles.fontSize) || renderer.style.fontSize || 12),
							tspan
						).h;
				};

			/// remove old text
			while (i--) {
				textNode.removeChild(childNodes[i]);
			}

			// Skip tspans, add text directly to text node. The forceTSpan is a hook 
			// used in text outline hack.
			if (!hasMarkup && !textStroke && textStr.indexOf(' ') === -1) {
				textNode.appendChild(doc.createTextNode(textStr));
				return;

			// Complex strings, add more logic
			} else {

				styleRegex = /<.*style="([^"]+)".*>/;
				hrefRegex = /<.*href="(http[^"]+)".*>/;

				if (width && !wrapper.added) {
					this.box.appendChild(textNode); // attach it to the DOM to read offset width
				}

				if (hasMarkup) {
					lines = textStr
						.replace(/<(b|strong)>/g, '<span style="font-weight:bold">')
						.replace(/<(i|em)>/g, '<span style="font-style:italic">')
						.replace(/<a/g, '<span')
						.replace(/<\/(b|strong|i|em|a)>/g, '</span>')
						.split(/<br.*?>/g);

				} else {
					lines = [textStr];
				}


				// remove empty line at end
				if (lines[lines.length - 1] === '') {
					lines.pop();
				}

				
				// build the lines
				each(lines, function (line, lineNo) {
					var spans, spanNo = 0;

					line = line.replace(/<span/g, '|||<span').replace(/<\/span>/g, '</span>|||');
					spans = line.split('|||');

					each(spans, function (span) {
						if (span !== '' || spans.length === 1) {
							var attributes = {},
								tspan = doc.createElementNS(SVG_NS, 'tspan'),
								spanStyle; // #390
							if (styleRegex.test(span)) {
								spanStyle = span.match(styleRegex)[1].replace(/(;| |^)color([ :])/, '$1fill$2');
								attr(tspan, 'style', spanStyle);
							}
							if (hrefRegex.test(span) && !forExport) { // Not for export - #1529
								attr(tspan, 'onclick', 'location.href=\"' + span.match(hrefRegex)[1] + '\"');
								css(tspan, { cursor: 'pointer' });
							}

							span = (span.replace(/<(.|\n)*?>/g, '') || ' ')
								.replace(/&lt;/g, '<')
								.replace(/&gt;/g, '>');

							// Nested tags aren't supported, and cause crash in Safari (#1596)
							if (span !== ' ') {

								// add the text node
								tspan.appendChild(doc.createTextNode(span));

								if (!spanNo) { // first span in a line, align it to the left
									if (lineNo && parentX !== null) {
										attributes.x = parentX;
									}
								} else {
									attributes.dx = 0; // #16
								}

								// add attributes
								attr(tspan, attributes);

								// Append it
								textNode.appendChild(tspan);

								// first span on subsequent line, add the line height
								if (!spanNo && lineNo) {

									// allow getting the right offset height in exporting in IE
									if (!hasSVG && forExport) {
										css(tspan, { display: 'block' });
									}

									// Set the line height based on the font size of either
									// the text element or the tspan element
									attr(
										tspan,
										'dy',
										getLineHeight(tspan)
									);
								}

								// check width and apply soft breaks
								if (width) {
									var words = span.replace(/([^\^])-/g, '$1- ').split(' '), // #1273
										hasWhiteSpace = spans.length > 1 || (words.length > 1 && textStyles.whiteSpace !== 'nowrap'),
										tooLong,
										actualWidth,
										hcHeight = textStyles.HcHeight,
										rest = [],
										dy = getLineHeight(tspan),
										softLineNo = 1,
										bBox;

									while (hasWhiteSpace && (words.length || rest.length)) {
										delete wrapper.bBox; // delete cache
										bBox = wrapper.getBBox();
										actualWidth = bBox.width;

										// Old IE cannot measure the actualWidth for SVG elements (#2314)
										if (!hasSVG && renderer.forExport) {
											actualWidth = renderer.measureSpanWidth(tspan.firstChild.data, wrapper.styles);
										}

										tooLong = actualWidth > width;
										if (!tooLong || words.length === 1) { // new line needed
											words = rest;
											rest = [];
											if (words.length) {
												softLineNo++;
												if (hcHeight && softLineNo * dy > hcHeight) {
													words = ['...'];
													wrapper.attr('title', wrapper.textStr);
												} else {

													tspan = doc.createElementNS(SVG_NS, 'tspan');
													attr(tspan, {
														dy: dy,
														x: parentX
													});
													if (spanStyle) { // #390
														attr(tspan, 'style', spanStyle);
													}
													textNode.appendChild(tspan);
												}
											}
											if (actualWidth > width) { // a single word is pressing it out
												width = actualWidth;
											}
										} else { // append to existing line tspan
											tspan.removeChild(tspan.firstChild);
											rest.unshift(words.pop());
										}
										if (words.length) {
											tspan.appendChild(doc.createTextNode(words.join(' ').replace(/- /g, '-')));
										}
									}
								}

								spanNo++;
							}
						}
					});
				});
			}
		},

		/**
		 * Create a button with preset states
		 * @param {String} text
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Function} callback
		 * @param {Object} normalState
		 * @param {Object} hoverState
		 * @param {Object} pressedState
		 */
		button: function (text, x, y, callback, normalState, hoverState, pressedState, disabledState, shape) {
			var label = this.label(text, x, y, shape, null, null, null, null, 'button'),
				curState = 0,
				stateOptions,
				stateStyle,
				normalStyle,
				hoverStyle,
				pressedStyle,
				disabledStyle,
				verticalGradient = { x1: 0, y1: 0, x2: 0, y2: 1 };

			// Normal state - prepare the attributes
			normalState = merge({
				'stroke-width': 1,
				stroke: '#CCCCCC',
				fill: {
					linearGradient: verticalGradient,
					stops: [
						[0, '#FEFEFE'],
						[1, '#F6F6F6']
					]
				},
				r: 2,
				padding: 5,
				style: {
					color: 'black'
				}
			}, normalState);
			normalStyle = normalState.style;
			delete normalState.style;

			// Hover state
			hoverState = merge(normalState, {
				stroke: '#68A',
				fill: {
					linearGradient: verticalGradient,
					stops: [
						[0, '#FFF'],
						[1, '#ACF']
					]
				}
			}, hoverState);
			hoverStyle = hoverState.style;
			delete hoverState.style;

			// Pressed state
			pressedState = merge(normalState, {
				stroke: '#68A',
				fill: {
					linearGradient: verticalGradient,
					stops: [
						[0, '#9BD'],
						[1, '#CDF']
					]
				}
			}, pressedState);
			pressedStyle = pressedState.style;
			delete pressedState.style;

			// Disabled state
			disabledState = merge(normalState, {
				style: {
					color: '#CCC'
				}
			}, disabledState);
			disabledStyle = disabledState.style;
			delete disabledState.style;

			// Add the events. IE9 and IE10 need mouseover and mouseout to funciton (#667).
			addEvent(label.element, isIE ? 'mouseover' : 'mouseenter', function () {
				if (curState !== 3) {
					label.attr(hoverState)
						.css(hoverStyle);
				}
			});
			addEvent(label.element, isIE ? 'mouseout' : 'mouseleave', function () {
				if (curState !== 3) {
					stateOptions = [normalState, hoverState, pressedState][curState];
					stateStyle = [normalStyle, hoverStyle, pressedStyle][curState];
					label.attr(stateOptions)
						.css(stateStyle);
				}
			});

			label.setState = function (state) {
				label.state = curState = state;
				if (!state) {
					label.attr(normalState)
						.css(normalStyle);
				} else if (state === 2) {
					label.attr(pressedState)
						.css(pressedStyle);
				} else if (state === 3) {
					label.attr(disabledState)
						.css(disabledStyle);
				}
			};

			return label
				.on('click', function () {
					if (curState !== 3) {
						callback.call(label);
					}
				})
				.attr(normalState)
				.css(extend({ cursor: 'default' }, normalStyle));
		},

		/**
		 * Make a straight line crisper by not spilling out to neighbour pixels
		 * @param {Array} points
		 * @param {Number} width
		 */
		crispLine: function (points, width) {
			// points format: [M, 0, 0, L, 100, 0]
			// normalize to a crisp line
			if (points[1] === points[4]) {
				// Substract due to #1129. Now bottom and left axis gridlines behave the same.
				points[1] = points[4] = mathRound(points[1]) - (width % 2 / 2);
			}
			if (points[2] === points[5]) {
				points[2] = points[5] = mathRound(points[2]) + (width % 2 / 2);
			}
			return points;
		},


		/**
		 * Draw a path
		 * @param {Array} path An SVG path in array form
		 */
		path: function (path) {
			var attr = {
				fill: NONE
			};
			if (isArray(path)) {
				attr.d = path;
			} else if (isObject(path)) { // attributes
				extend(attr, path);
			}
			return this.createElement('path').attr(attr);
		},

		/**
		 * Draw and return an SVG circle
		 * @param {Number} x The x position
		 * @param {Number} y The y position
		 * @param {Number} r The radius
		 */
		circle: function (x, y, r) {
			var attr = isObject(x) ?
				x :
				{
					x: x,
					y: y,
					r: r
				},
				wrapper = this.createElement('circle');

			wrapper.xSetter = function (value) {
				this.element.setAttribute('cx', value);
			};
			wrapper.ySetter = function (value) {
				this.element.setAttribute('cy', value);
			};
			return wrapper.attr(attr);
		},

		/**
		 * Draw and return an arc
		 * @param {Number} x X position
		 * @param {Number} y Y position
		 * @param {Number} r Radius
		 * @param {Number} innerR Inner radius like used in donut charts
		 * @param {Number} start Starting angle
		 * @param {Number} end Ending angle
		 */
		arc: function (x, y, r, innerR, start, end) {
			var arc;

			if (isObject(x)) {
				y = x.y;
				r = x.r;
				innerR = x.innerR;
				start = x.start;
				end = x.end;
				x = x.x;
			}

			// Arcs are defined as symbols for the ability to set
			// attributes in attr and animate
			arc = this.symbol('arc', x || 0, y || 0, r || 0, r || 0, {
				innerR: innerR || 0,
				start: start || 0,
				end: end || 0
			});
			arc.r = r; // #959
			return arc;
		},

		/**
		 * Draw and return a rectangle
		 * @param {Number} x Left position
		 * @param {Number} y Top position
		 * @param {Number} width
		 * @param {Number} height
		 * @param {Number} r Border corner radius
		 * @param {Number} strokeWidth A stroke width can be supplied to allow crisp drawing
		 */
		rect: function (x, y, width, height, r, strokeWidth) {

			r = isObject(x) ? x.r : r;

			var wrapper = this.createElement('rect'),
				attribs = isObject(x) ? x : x === UNDEFINED ? {} : {
					x: x,
					y: y,
					width: mathMax(width, 0),
					height: mathMax(height, 0)
				};

			if (strokeWidth !== UNDEFINED) {
				attribs.strokeWidth = strokeWidth;
				attribs = wrapper.crisp(attribs);
			}

			if (r) {
				attribs.r = r;
			}

			wrapper.rSetter = function (value) {
				attr(this.element, {
					rx: value,
					ry: value
				});
			};
			
			return wrapper.attr(attribs);
		},

		/**
		 * Resize the box and re-align all aligned elements
		 * @param {Object} width
		 * @param {Object} height
		 * @param {Boolean} animate
		 *
		 */
		setSize: function (width, height, animate) {
			var renderer = this,
				alignedObjects = renderer.alignedObjects,
				i = alignedObjects.length;

			renderer.width = width;
			renderer.height = height;

			renderer.boxWrapper[pick(animate, true) ? 'animate' : 'attr']({
				width: width,
				height: height
			});

			while (i--) {
				alignedObjects[i].align();
			}
		},

		/**
		 * Create a group
		 * @param {String} name The group will be given a class name of 'highcharts-{name}'.
		 *     This can be used for styling and scripting.
		 */
		g: function (name) {
			var elem = this.createElement('g');
			return defined(name) ? elem.attr({ 'class': PREFIX + name }) : elem;
		},

		/**
		 * Display an image
		 * @param {String} src
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Number} width
		 * @param {Number} height
		 */
		image: function (src, x, y, width, height) {
			var attribs = {
					preserveAspectRatio: NONE
				},
				elemWrapper;

			// optional properties
			if (arguments.length > 1) {
				extend(attribs, {
					x: x,
					y: y,
					width: width,
					height: height
				});
			}

			elemWrapper = this.createElement('image').attr(attribs);

			// set the href in the xlink namespace
			if (elemWrapper.element.setAttributeNS) {
				elemWrapper.element.setAttributeNS('http://www.w3.org/1999/xlink',
					'href', src);
			} else {
				// could be exporting in IE
				// using href throws "not supported" in ie7 and under, requries regex shim to fix later
				elemWrapper.element.setAttribute('hc-svg-href', src);
			}
			return elemWrapper;
		},

		/**
		 * Draw a symbol out of pre-defined shape paths from the namespace 'symbol' object.
		 *
		 * @param {Object} symbol
		 * @param {Object} x
		 * @param {Object} y
		 * @param {Object} radius
		 * @param {Object} options
		 */
		symbol: function (symbol, x, y, width, height, options) {

			var obj,

				// get the symbol definition function
				symbolFn = this.symbols[symbol],

				// check if there's a path defined for this symbol
				path = symbolFn && symbolFn(
					mathRound(x),
					mathRound(y),
					width,
					height,
					options
				),

				imageElement,
				imageRegex = /^url\((.*?)\)$/,
				imageSrc,
				imageSize,
				centerImage;

			if (path) {

				obj = this.path(path);
				// expando properties for use in animate and attr
				extend(obj, {
					symbolName: symbol,
					x: x,
					y: y,
					width: width,
					height: height
				});
				if (options) {
					extend(obj, options);
				}


			// image symbols
			} else if (imageRegex.test(symbol)) {

				// On image load, set the size and position
				centerImage = function (img, size) {
					if (img.element) { // it may be destroyed in the meantime (#1390)
						img.attr({
							width: size[0],
							height: size[1]
						});

						if (!img.alignByTranslate) { // #185
							img.translate(
								mathRound((width - size[0]) / 2), // #1378
								mathRound((height - size[1]) / 2)
							);
						}
					}
				};

				imageSrc = symbol.match(imageRegex)[1];
				imageSize = symbolSizes[imageSrc] || (options && options.width && options.height && [options.width, options.height]);

				// Ireate the image synchronously, add attribs async
				obj = this.image(imageSrc)
					.attr({
						x: x,
						y: y
					});
				obj.isImg = true;

				if (imageSize) {
					centerImage(obj, imageSize);
				} else {
					// Initialize image to be 0 size so export will still function if there's no cached sizes.
					obj.attr({ width: 0, height: 0 });

					// Create a dummy JavaScript image to get the width and height. Due to a bug in IE < 8,
					// the created element must be assigned to a variable in order to load (#292).
					imageElement = createElement('img', {
						onload: function () {
							centerImage(obj, symbolSizes[imageSrc] = [this.width, this.height]);
						},
						src: imageSrc
					});
				}
			}

			return obj;
		},

		/**
		 * An extendable collection of functions for defining symbol paths.
		 */
		symbols: {
			'circle': function (x, y, w, h) {
				var cpw = 0.166 * w;
				return [
					M, x + w / 2, y,
					'C', x + w + cpw, y, x + w + cpw, y + h, x + w / 2, y + h,
					'C', x - cpw, y + h, x - cpw, y, x + w / 2, y,
					'Z'
				];
			},

			'square': function (x, y, w, h) {
				return [
					M, x, y,
					L, x + w, y,
					x + w, y + h,
					x, y + h,
					'Z'
				];
			},

			'triangle': function (x, y, w, h) {
				return [
					M, x + w / 2, y,
					L, x + w, y + h,
					x, y + h,
					'Z'
				];
			},

			'triangle-down': function (x, y, w, h) {
				return [
					M, x, y,
					L, x + w, y,
					x + w / 2, y + h,
					'Z'
				];
			},
			'diamond': function (x, y, w, h) {
				return [
					M, x + w / 2, y,
					L, x + w, y + h / 2,
					x + w / 2, y + h,
					x, y + h / 2,
					'Z'
				];
			},
			'arc': function (x, y, w, h, options) {
				var start = options.start,
					radius = options.r || w || h,
					end = options.end - 0.001, // to prevent cos and sin of start and end from becoming equal on 360 arcs (related: #1561)
					innerRadius = options.innerR,
					open = options.open,
					cosStart = mathCos(start),
					sinStart = mathSin(start),
					cosEnd = mathCos(end),
					sinEnd = mathSin(end),
					longArc = options.end - start < mathPI ? 0 : 1;

				return [
					M,
					x + radius * cosStart,
					y + radius * sinStart,
					'A', // arcTo
					radius, // x radius
					radius, // y radius
					0, // slanting
					longArc, // long or short arc
					1, // clockwise
					x + radius * cosEnd,
					y + radius * sinEnd,
					open ? M : L,
					x + innerRadius * cosEnd,
					y + innerRadius * sinEnd,
					'A', // arcTo
					innerRadius, // x radius
					innerRadius, // y radius
					0, // slanting
					longArc, // long or short arc
					0, // clockwise
					x + innerRadius * cosStart,
					y + innerRadius * sinStart,

					open ? '' : 'Z' // close
				];
			},

			/**
			 * Callout shape used for default tooltips, also used for rounded rectangles in VML
			 */
			callout: function (x, y, w, h, options) {
				var arrowLength = 6,
					halfDistance = 6,
					r = mathMin((options && options.r) || 0, w, h),
					safeDistance = r + halfDistance,
					anchorX = options && options.anchorX,
					anchorY = options && options.anchorY,
					path,
					normalizer = mathRound(options.strokeWidth || 0) % 2 / 2; // mathRound because strokeWidth can sometimes have roundoff errors;

				x += normalizer;
				y += normalizer;
				path = [
					'M', x + r, y, 
					'L', x + w - r, y, // top side
					'C', x + w, y, x + w, y, x + w, y + r, // top-right corner
					'L', x + w, y + h - r, // right side
					'C', x + w, y + h, x + w, y + h, x + w - r, y + h, // bottom-right corner
					'L', x + r, y + h, // bottom side
					'C', x, y + h, x, y + h, x, y + h - r, // bottom-left corner
					'L', x, y + r, // left side
					'C', x, y, x, y, x + r, y // top-right corner
				];
				
				if (anchorX && anchorX > w && anchorY > y + safeDistance && anchorY < y + h - safeDistance) { // replace right side
					path.splice(13, 3,
						'L', x + w, anchorY - halfDistance, 
						x + w + arrowLength, anchorY,
						x + w, anchorY + halfDistance,
						x + w, y + h - r
					);
				} else if (anchorX && anchorX < 0 && anchorY > y + safeDistance && anchorY < y + h - safeDistance) { // replace left side
					path.splice(33, 3, 
						'L', x, anchorY + halfDistance, 
						x - arrowLength, anchorY,
						x, anchorY - halfDistance,
						x, y + r
					);
				} else if (anchorY && anchorY > h && anchorX > x + safeDistance && anchorX < x + w - safeDistance) { // replace bottom
					path.splice(23, 3,
						'L', anchorX + halfDistance, y + h,
						anchorX, y + h + arrowLength,
						anchorX - halfDistance, y + h,
						x + r, y + h
					);
				} else if (anchorY && anchorY < 0 && anchorX > x + safeDistance && anchorX < x + w - safeDistance) { // replace top
					path.splice(3, 3,
						'L', anchorX - halfDistance, y,
						anchorX, y - arrowLength,
						anchorX + halfDistance, y,
						w - r, y
					);
				}
				return path;
			}
		},

		/**
		 * Define a clipping rectangle
		 * @param {String} id
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Number} width
		 * @param {Number} height
		 */
		clipRect: function (x, y, width, height) {
			var wrapper,
				id = PREFIX + idCounter++,

				clipPath = this.createElement('clipPath').attr({
					id: id
				}).add(this.defs);

			wrapper = this.rect(x, y, width, height, 0).add(clipPath);
			wrapper.id = id;
			wrapper.clipPath = clipPath;

			return wrapper;
		},


		


		/**
		 * Add text to the SVG object
		 * @param {String} str
		 * @param {Number} x Left position
		 * @param {Number} y Top position
		 * @param {Boolean} useHTML Use HTML to render the text
		 */
		text: function (str, x, y, useHTML) {

			// declare variables
			var renderer = this,
				fakeSVG = useCanVG || (!hasSVG && renderer.forExport),
				wrapper,
				attr = {};

			if (useHTML && !renderer.forExport) {
				return renderer.html(str, x, y);
			}

			attr.x = Math.round(x || 0); // X is always needed for line-wrap logic
			if (y) {
				attr.y = Math.round(y);
			}
			if (str || str === 0) {
				attr.text = str;
			}

			wrapper = renderer.createElement('text')
				.attr(attr);

			// Prevent wrapping from creating false offsetWidths in export in legacy IE (#1079, #1063)
			if (fakeSVG) {
				wrapper.css({
					position: ABSOLUTE
				});
			}

			if (!useHTML) {
				wrapper.xSetter = function (value, key, element) {
					var tspans = element.getElementsByTagName('tspan'),
						tspan,
						parentVal = element.getAttribute(key),
						i;
					for (i = 0; i < tspans.length; i++) {
						tspan = tspans[i];
						// If the x values are equal, the tspan represents a linebreak
						if (tspan.getAttribute(key) === parentVal) {
							tspan.setAttribute(key, value);
						}
					}
					element.setAttribute(key, value);
				};
			}
			
			return wrapper;
		},

		/**
		 * Utility to return the baseline offset and total line height from the font size
		 */
		fontMetrics: function (fontSize, elem) {
			fontSize = fontSize || this.style.fontSize;
			if (elem && win.getComputedStyle) {
				elem = elem.element || elem; // SVGElement
				fontSize = win.getComputedStyle(elem, "").fontSize;
			}
			fontSize = /px/.test(fontSize) ? pInt(fontSize) : /em/.test(fontSize) ? parseFloat(fontSize) * 12 : 12;

			// Empirical values found by comparing font size and bounding box height.
			// Applies to the default font family. http://jsfiddle.net/highcharts/7xvn7/
			var lineHeight = fontSize < 24 ? fontSize + 4 : mathRound(fontSize * 1.2),
				baseline = mathRound(lineHeight * 0.8);

			return {
				h: lineHeight,
				b: baseline,
				f: fontSize
			};
		},

		/**
		 * Add a label, a text item that can hold a colored or gradient background
		 * as well as a border and shadow.
		 * @param {string} str
		 * @param {Number} x
		 * @param {Number} y
		 * @param {String} shape
		 * @param {Number} anchorX In case the shape has a pointer, like a flag, this is the
		 *    coordinates it should be pinned to
		 * @param {Number} anchorY
		 * @param {Boolean} baseline Whether to position the label relative to the text baseline,
		 *    like renderer.text, or to the upper border of the rectangle.
		 * @param {String} className Class name for the group
		 */
		label: function (str, x, y, shape, anchorX, anchorY, useHTML, baseline, className) {

			var renderer = this,
				wrapper = renderer.g(className),
				text = renderer.text('', 0, 0, useHTML)
					.attr({
						zIndex: 1
					}),
					//.add(wrapper),
				box,
				bBox,
				alignFactor = 0,
				padding = 3,
				paddingLeft = 0,
				width,
				height,
				wrapperX,
				wrapperY,
				crispAdjust = 0,
				deferredAttr = {},
				baselineOffset,
				needsBox;

			/**
			 * This function runs after the label is added to the DOM (when the bounding box is
			 * available), and after the text of the label is updated to detect the new bounding
			 * box and reflect it in the border box.
			 */
			function updateBoxSize() {
				var boxX,
					boxY,
					style = text.element.style;

				bBox = (width === undefined || height === undefined || wrapper.styles.textAlign) && text.textStr && 
					text.getBBox();
				wrapper.width = (width || bBox.width || 0) + 2 * padding + paddingLeft;
				wrapper.height = (height || bBox.height || 0) + 2 * padding;

				// update the label-scoped y offset
				baselineOffset = padding + renderer.fontMetrics(style && style.fontSize, text).b;

				
				if (needsBox) {

					// create the border box if it is not already present
					if (!box) {
						boxX = mathRound(-alignFactor * padding);
						boxY = baseline ? -baselineOffset : 0;

						wrapper.box = box = shape ?
							renderer.symbol(shape, boxX, boxY, wrapper.width, wrapper.height, deferredAttr) :
							renderer.rect(boxX, boxY, wrapper.width, wrapper.height, 0, deferredAttr[STROKE_WIDTH]);
						box.attr('fill', NONE).add(wrapper);
					}

					// apply the box attributes
					if (!box.isImg) { // #1630
						box.attr(extend({
							width: mathRound(wrapper.width),
							height: mathRound(wrapper.height)
						}, deferredAttr));
					}
					deferredAttr = null;
				}
			}

			/**
			 * This function runs after setting text or padding, but only if padding is changed
			 */
			function updateTextPadding() {
				var styles = wrapper.styles,
					textAlign = styles && styles.textAlign,
					x = paddingLeft + padding * (1 - alignFactor),
					y;

				// determin y based on the baseline
				y = baseline ? 0 : baselineOffset;

				// compensate for alignment
				if (defined(width) && bBox && (textAlign === 'center' || textAlign === 'right')) {
					x += { center: 0.5, right: 1 }[textAlign] * (width - bBox.width);
				}

				// update if anything changed
				if (x !== text.x || y !== text.y) {
					text.attr('x', x);
					if (y !== UNDEFINED) {
						text.attr('y', y);
					}
				}

				// record current values
				text.x = x;
				text.y = y;
			}

			/**
			 * Set a box attribute, or defer it if the box is not yet created
			 * @param {Object} key
			 * @param {Object} value
			 */
			function boxAttr(key, value) {
				if (box) {
					box.attr(key, value);
				} else {
					deferredAttr[key] = value;
				}
			}

			/**
			 * After the text element is added, get the desired size of the border box
			 * and add it before the text in the DOM.
			 */
			wrapper.onAdd = function () {
				text.add(wrapper);
				wrapper.attr({
					text: (str || str === 0) ? str : '', // alignment is available now // #3295: 0 not rendered if given as a value
					x: x,
					y: y
				});

				if (box && defined(anchorX)) {
					wrapper.attr({
						anchorX: anchorX,
						anchorY: anchorY
					});
				}
			};

			/*
			 * Add specific attribute setters.
			 */

			// only change local variables
			wrapper.widthSetter = function (value) {
				width = value;
			};
			wrapper.heightSetter = function (value) {
				height = value;
			};
			wrapper.paddingSetter =  function (value) {
				if (defined(value) && value !== padding) {
					padding = value;
					updateTextPadding();
				}
			};
			wrapper.paddingLeftSetter =  function (value) {
				if (defined(value) && value !== paddingLeft) {
					paddingLeft = value;
					updateTextPadding();
				}
			};


			// change local variable and prevent setting attribute on the group
			wrapper.alignSetter = function (value) {
				alignFactor = { left: 0, center: 0.5, right: 1 }[value];
			};

			// apply these to the box and the text alike
			wrapper.textSetter = function (value) {
				if (value !== UNDEFINED) {
					text.textSetter(value);
				}
				updateBoxSize();
				updateTextPadding();
			};

			// apply these to the box but not to the text
			wrapper['stroke-widthSetter'] = function (value, key) {
				if (value) {
					needsBox = true;
				}
				crispAdjust = value % 2 / 2;
				boxAttr(key, value);
			};
			wrapper.strokeSetter = wrapper.fillSetter = wrapper.rSetter = function (value, key) {
				if (key === 'fill' && value) {
					needsBox = true;
				}
				boxAttr(key, value);
			};
			wrapper.anchorXSetter = function (value, key) {
				anchorX = value;
				boxAttr(key, value + crispAdjust - wrapperX);
			};
			wrapper.anchorYSetter = function (value, key) {
				anchorY = value;
				boxAttr(key, value - wrapperY);
			};

			// rename attributes
			wrapper.xSetter = function (value) {
				wrapper.x = value; // for animation getter
				if (alignFactor) {
					value -= alignFactor * ((width || bBox.width) + padding);
				}
				wrapperX = mathRound(value);
				wrapper.attr('translateX', wrapperX);
			};
			wrapper.ySetter = function (value) {
				wrapperY = wrapper.y = mathRound(value);
				wrapper.attr('translateY', wrapperY);
			};

			// Redirect certain methods to either the box or the text
			var baseCss = wrapper.css;
			return extend(wrapper, {
				/**
				 * Pick up some properties and apply them to the text instead of the wrapper
				 */
				css: function (styles) {
					if (styles) {
						var textStyles = {};
						styles = merge(styles); // create a copy to avoid altering the original object (#537)
						each(wrapper.textProps, function (prop) {
							if (styles[prop] !== UNDEFINED) {
								textStyles[prop] = styles[prop];
								delete styles[prop];
							}
						});
						text.css(textStyles);
					}
					return baseCss.call(wrapper, styles);
				},
				/**
				 * Return the bounding box of the box, not the group
				 */
				getBBox: function () {
					return {
						width: bBox.width + 2 * padding,
						height: bBox.height + 2 * padding,
						x: bBox.x - padding,
						y: bBox.y - padding
					};
				},
				/**
				 * Apply the shadow to the box
				 */
				shadow: function (b) {
					if (box) {
						box.shadow(b);
					}
					return wrapper;
				},
				/**
				 * Destroy and release memory.
				 */
				destroy: function () {

					// Added by button implementation
					removeEvent(wrapper.element, 'mouseenter');
					removeEvent(wrapper.element, 'mouseleave');

					if (text) {
						text = text.destroy();
					}
					if (box) {
						box = box.destroy();
					}
					// Call base implementation to destroy the rest
					SVGElement.prototype.destroy.call(wrapper);

					// Release local pointers (#1298)
					wrapper = renderer = updateBoxSize = updateTextPadding = boxAttr = null;
				}
			});
		}
	}; // end SVGRenderer


	// general renderer
	Renderer = SVGRenderer;


	// extend SvgElement for useHTML option
	extend(SVGElement.prototype, {
		/**
		 * Apply CSS to HTML elements. This is used in text within SVG rendering and
		 * by the VML renderer
		 */
		htmlCss: function (styles) {
			var wrapper = this,
				element = wrapper.element,
				textWidth = styles && element.tagName === 'SPAN' && styles.width;

			if (textWidth) {
				delete styles.width;
				wrapper.textWidth = textWidth;
				wrapper.updateTransform();
			}

			wrapper.styles = extend(wrapper.styles, styles);
			css(wrapper.element, styles);

			return wrapper;
		},

		/**
		 * VML and useHTML method for calculating the bounding box based on offsets
		 * @param {Boolean} refresh Whether to force a fresh value from the DOM or to
		 * use the cached value
		 *
		 * @return {Object} A hash containing values for x, y, width and height
		 */

		htmlGetBBox: function () {
			var wrapper = this,
				element = wrapper.element,
				bBox = wrapper.bBox;

			// faking getBBox in exported SVG in legacy IE
			if (!bBox) {
				// faking getBBox in exported SVG in legacy IE (is this a duplicate of the fix for #1079?)
				if (element.nodeName === 'text') {
					element.style.position = ABSOLUTE;
				}

				bBox = wrapper.bBox = {
					x: element.offsetLeft,
					y: element.offsetTop,
					width: element.offsetWidth,
					height: element.offsetHeight
				};
			}

			return bBox;
		},

		/**
		 * VML override private method to update elements based on internal
		 * properties based on SVG transform
		 */
		htmlUpdateTransform: function () {
			// aligning non added elements is expensive
			if (!this.added) {
				this.alignOnAdd = true;
				return;
			}

			var wrapper = this,
				renderer = wrapper.renderer,
				elem = wrapper.element,
				translateX = wrapper.translateX || 0,
				translateY = wrapper.translateY || 0,
				x = wrapper.x || 0,
				y = wrapper.y || 0,
				align = wrapper.textAlign || 'left',
				alignCorrection = { left: 0, center: 0.5, right: 1 }[align],
				shadows = wrapper.shadows;

			// apply translate
			css(elem, {
				marginLeft: translateX,
				marginTop: translateY
			});
			if (shadows) { // used in labels/tooltip
				each(shadows, function (shadow) {
					css(shadow, {
						marginLeft: translateX + 1,
						marginTop: translateY + 1
					});
				});
			}

			// apply inversion
			if (wrapper.inverted) { // wrapper is a group
				each(elem.childNodes, function (child) {
					renderer.invertChild(child, elem);
				});
			}

			if (elem.tagName === 'SPAN') {

				var width,
					rotation = wrapper.rotation,
					baseline,
					textWidth = pInt(wrapper.textWidth),
					currentTextTransform = [rotation, align, elem.innerHTML, wrapper.textWidth].join(',');

				if (currentTextTransform !== wrapper.cTT) { // do the calculations and DOM access only if properties changed


					baseline = renderer.fontMetrics(elem.style.fontSize).b;

					// Renderer specific handling of span rotation
					if (defined(rotation)) {
						wrapper.setSpanRotation(rotation, alignCorrection, baseline);
					}

					width = pick(wrapper.elemWidth, elem.offsetWidth);

					// Update textWidth
					if (width > textWidth && /[ \-]/.test(elem.textContent || elem.innerText)) { // #983, #1254
						css(elem, {
							width: textWidth + PX,
							display: 'block',
							whiteSpace: 'normal'
						});
						width = textWidth;
					}

					wrapper.getSpanCorrection(width, baseline, alignCorrection, rotation, align);
				}

				// apply position with correction
				css(elem, {
					left: (x + (wrapper.xCorr || 0)) + PX,
					top: (y + (wrapper.yCorr || 0)) + PX
				});

				// force reflow in webkit to apply the left and top on useHTML element (#1249)
				if (isWebKit) {
					baseline = elem.offsetHeight; // assigned to baseline for JSLint purpose
				}

				// record current text transform
				wrapper.cTT = currentTextTransform;
			}
		},

		/**
		 * Set the rotation of an individual HTML span
		 */
		setSpanRotation: function (rotation, alignCorrection, baseline) {
			var rotationStyle = {},
				cssTransformKey = isIE ? '-ms-transform' : isWebKit ? '-webkit-transform' : isFirefox ? 'MozTransform' : isOpera ? '-o-transform' : '';

			rotationStyle[cssTransformKey] = rotationStyle.transform = 'rotate(' + rotation + 'deg)';
			rotationStyle[cssTransformKey + (isFirefox ? 'Origin' : '-origin')] = rotationStyle.transformOrigin = (alignCorrection * 100) + '% ' + baseline + 'px';
			css(this.element, rotationStyle);
		},

		/**
		 * Get the correction in X and Y positioning as the element is rotated.
		 */
		getSpanCorrection: function (width, baseline, alignCorrection) {
			this.xCorr = -width * alignCorrection;
			this.yCorr = -baseline;
		}
	});

	// Extend SvgRenderer for useHTML option.
	extend(SVGRenderer.prototype, {
		/**
		 * Create HTML text node. This is used by the VML renderer as well as the SVG
		 * renderer through the useHTML option.
		 *
		 * @param {String} str
		 * @param {Number} x
		 * @param {Number} y
		 */
		html: function (str, x, y) {
			var wrapper = this.createElement('span'),
				element = wrapper.element,
				renderer = wrapper.renderer;

			// Text setter
			wrapper.textSetter = function (value) {
				if (value !== element.innerHTML) {
					delete this.bBox;
				}
				element.innerHTML = this.textStr = value;
			};

			// Various setters which rely on update transform
			wrapper.xSetter = wrapper.ySetter = wrapper.alignSetter = wrapper.rotationSetter = function (value, key) {
				if (key === 'align') {
					key = 'textAlign'; // Do not overwrite the SVGElement.align method. Same as VML.
				}
				wrapper[key] = value;
				wrapper.htmlUpdateTransform();
			};

			// Set the default attributes
			wrapper.attr({
					text: str,
					x: mathRound(x),
					y: mathRound(y)
				})
				.css({
					position: ABSOLUTE,
					whiteSpace: 'nowrap',
					fontFamily: this.style.fontFamily,
					fontSize: this.style.fontSize
				});

			// Use the HTML specific .css method
			wrapper.css = wrapper.htmlCss;

			// This is specific for HTML within SVG
			if (renderer.isSVG) {
				wrapper.add = function (svgGroupWrapper) {

					var htmlGroup,
						container = renderer.box.parentNode,
						parentGroup,
						parents = [];

					this.parentGroup = svgGroupWrapper;

					// Create a mock group to hold the HTML elements
					if (svgGroupWrapper) {
						htmlGroup = svgGroupWrapper.div;
						if (!htmlGroup) {

							// Read the parent chain into an array and read from top down
							parentGroup = svgGroupWrapper;
							while (parentGroup) {

								parents.push(parentGroup);

								// Move up to the next parent group
								parentGroup = parentGroup.parentGroup;
							}

							// Ensure dynamically updating position when any parent is translated
							each(parents.reverse(), function (parentGroup) {
								var htmlGroupStyle;

								// Create a HTML div and append it to the parent div to emulate
								// the SVG group structure
								htmlGroup = parentGroup.div = parentGroup.div || createElement(DIV, {
									className: attr(parentGroup.element, 'class')
								}, {
									position: ABSOLUTE,
									left: (parentGroup.translateX || 0) + PX,
									top: (parentGroup.translateY || 0) + PX
								}, htmlGroup || container); // the top group is appended to container

								// Shortcut
								htmlGroupStyle = htmlGroup.style;

								// Set listeners to update the HTML div's position whenever the SVG group
								// position is changed
								extend(parentGroup, {
									translateXSetter: function (value, key) {
										htmlGroupStyle.left = value + PX;
										parentGroup[key] = value;
										parentGroup.doTransform = true;
									},
									translateYSetter: function (value, key) {
										htmlGroupStyle.top = value + PX;
										parentGroup[key] = value;
										parentGroup.doTransform = true;
									},
									visibilitySetter: function (value, key) {
										htmlGroupStyle[key] = value;
									}
								});
							});

						}
					} else {
						htmlGroup = container;
					}

					htmlGroup.appendChild(element);

					// Shared with VML:
					wrapper.added = true;
					if (wrapper.alignOnAdd) {
						wrapper.htmlUpdateTransform();
					}

					return wrapper;
				};
			}
			return wrapper;
		}
	});

	/**
	 * The Tick class
	 */
	function Tick(axis, pos, type, noLabel) {
		this.axis = axis;
		this.pos = pos;
		this.type = type || '';
		this.isNew = true;

		if (!type && !noLabel) {
			this.addLabel();
		}
	}

	Tick.prototype = {
		/**
		 * Write the tick label
		 */
		addLabel: function () {
			var tick = this,
				axis = tick.axis,
				options = axis.options,
				chart = axis.chart,
				horiz = axis.horiz,
				categories = axis.categories,
				names = axis.names,
				pos = tick.pos,
				labelOptions = options.labels,
				rotation = labelOptions.rotation,
				str,
				tickPositions = axis.tickPositions,
				width = (horiz && categories &&
					!labelOptions.step && !labelOptions.staggerLines &&
					!labelOptions.rotation &&
					chart.plotWidth / tickPositions.length) ||
					(!horiz && (chart.margin[3] || chart.chartWidth * 0.33)), // #1580, #1931
				isFirst = pos === tickPositions[0],
				isLast = pos === tickPositions[tickPositions.length - 1],
				css,
				attr,
				value = categories ?
					pick(categories[pos], names[pos], pos) :
					pos,
				label = tick.label,
				tickPositionInfo = tickPositions.info,
				dateTimeLabelFormat;

			// Set the datetime label format. If a higher rank is set for this position, use that. If not,
			// use the general format.
			if (axis.isDatetimeAxis && tickPositionInfo) {
				dateTimeLabelFormat = options.dateTimeLabelFormats[tickPositionInfo.higherRanks[pos] || tickPositionInfo.unitName];
			}
			// set properties for access in render method
			tick.isFirst = isFirst;
			tick.isLast = isLast;

			// get the string
			str = axis.labelFormatter.call({
				axis: axis,
				chart: chart,
				isFirst: isFirst,
				isLast: isLast,
				dateTimeLabelFormat: dateTimeLabelFormat,
				value: axis.isLog ? correctFloat(lin2log(value)) : value
			});

			// prepare CSS
			css = width && { width: mathMax(1, mathRound(width - 2 * (labelOptions.padding || 10))) + PX };
			
			// first call
			if (!defined(label)) {
				attr = {
					align: axis.labelAlign
				};
				if (isNumber(rotation)) {
					attr.rotation = rotation;
				}
				if (width && labelOptions.ellipsis) {
					css.HcHeight = axis.len / tickPositions.length;
				}

				tick.label = label =
					defined(str) && labelOptions.enabled ?
						chart.renderer.text(
								str,
								0,
								0,
								labelOptions.useHTML
							)
							.attr(attr)
							// without position absolute, IE export sometimes is wrong
							.css(extend(css, labelOptions.style))
							.add(axis.labelGroup) :
						null;

				// Set the tick baseline and correct for rotation (#1764)
				axis.tickBaseline = chart.renderer.fontMetrics(labelOptions.style.fontSize, label).b;
				if (rotation && axis.side === 2) {
					axis.tickBaseline *= mathCos(rotation * deg2rad);
				}


			// update
			} else if (label) {
				label.attr({
						text: str
					})
					.css(css);
			}
			tick.yOffset = label ? pick(labelOptions.y, axis.tickBaseline + (axis.side === 2 ? 8 : -(label.getBBox().height / 2))) : 0;
		},

		/**
		 * Get the offset height or width of the label
		 */
		getLabelSize: function () {
			var label = this.label,
				axis = this.axis;
			return label ?
				label.getBBox()[axis.horiz ? 'height' : 'width'] :
				0;
		},

		/**
		 * Find how far the labels extend to the right and left of the tick's x position. Used for anti-collision
		 * detection with overflow logic.
		 */
		getLabelSides: function () {
			var bBox = this.label.getBBox(),
				axis = this.axis,
				horiz = axis.horiz,
				options = axis.options,
				labelOptions = options.labels,
				size = horiz ? bBox.width : bBox.height,
				leftSide = horiz ?
					labelOptions.x - size * { left: 0, center: 0.5, right: 1 }[axis.labelAlign] :
					0,
				rightSide = horiz ?
					size + leftSide :
					size;

			return [leftSide, rightSide];
		},

		/**
		 * Handle the label overflow by adjusting the labels to the left and right edge, or
		 * hide them if they collide into the neighbour label.
		 */
		handleOverflow: function (index, xy) {
			var show = true,
				axis = this.axis,
				isFirst = this.isFirst,
				isLast = this.isLast,
				horiz = axis.horiz,
				pxPos = horiz ? xy.x : xy.y,
				reversed = axis.reversed,
				tickPositions = axis.tickPositions,
				sides = this.getLabelSides(),
				leftSide = sides[0],
				rightSide = sides[1],
				axisLeft,
				axisRight,
				neighbour,
				neighbourEdge,
				line = this.label.line,
				lineIndex = line || 0,
				labelEdge = axis.labelEdge,
				justifyLabel = axis.justifyLabels && (isFirst || isLast),
				justifyToPlot;

			// Hide it if it now overlaps the neighbour label
			if (labelEdge[lineIndex] === UNDEFINED || pxPos + leftSide > labelEdge[lineIndex]) {
				labelEdge[lineIndex] = pxPos + rightSide;

			} else if (!justifyLabel) {
				show = false;
			}

			if (justifyLabel) {
				justifyToPlot = axis.justifyToPlot;
				axisLeft = justifyToPlot ? axis.pos : 0;
				axisRight = justifyToPlot ? axisLeft + axis.len : axis.chart.chartWidth;

				// Find the firsth neighbour on the same line
				do {
					index += (isFirst ? 1 : -1);
					neighbour = axis.ticks[tickPositions[index]];
				} while (tickPositions[index] && (!neighbour || !neighbour.label || neighbour.label.line !== line)); // #3044

				neighbourEdge = neighbour && neighbour.label.xy && neighbour.label.xy.x + neighbour.getLabelSides()[isFirst ? 0 : 1];

				if ((isFirst && !reversed) || (isLast && reversed)) {
					// Is the label spilling out to the left of the plot area?
					if (pxPos + leftSide < axisLeft) {

						// Align it to plot left
						pxPos = axisLeft - leftSide;

						// Hide it if it now overlaps the neighbour label
						if (neighbour && pxPos + rightSide > neighbourEdge) {
							show = false;
						}
					}

				} else {
					// Is the label spilling out to the right of the plot area?
					if (pxPos + rightSide > axisRight) {

						// Align it to plot right
						pxPos = axisRight - rightSide;

						// Hide it if it now overlaps the neighbour label
						if (neighbour && pxPos + leftSide < neighbourEdge) {
							show = false;
						}

					}
				}

				// Set the modified x position of the label
				xy.x = pxPos;
			}
			return show;
		},

		/**
		 * Get the x and y position for ticks and labels
		 */
		getPosition: function (horiz, pos, tickmarkOffset, old) {
			var axis = this.axis,
				chart = axis.chart,
				cHeight = (old && chart.oldChartHeight) || chart.chartHeight;

			return {
				x: horiz ?
					axis.translate(pos + tickmarkOffset, null, null, old) + axis.transB :
					axis.left + axis.offset + (axis.opposite ? ((old && chart.oldChartWidth) || chart.chartWidth) - axis.right - axis.left : 0),

				y: horiz ?
					cHeight - axis.bottom + axis.offset - (axis.opposite ? axis.height : 0) :
					cHeight - axis.translate(pos + tickmarkOffset, null, null, old) - axis.transB
			};

		},

		/**
		 * Get the x, y position of the tick label
		 */
		getLabelPosition: function (x, y, label, horiz, labelOptions, tickmarkOffset, index, step) {
			var axis = this.axis,
				transA = axis.transA,
				reversed = axis.reversed,
				staggerLines = axis.staggerLines;

			x = x + labelOptions.x - (tickmarkOffset && horiz ?
				tickmarkOffset * transA * (reversed ? -1 : 1) : 0);
			y = y + this.yOffset - (tickmarkOffset && !horiz ?
				tickmarkOffset * transA * (reversed ? 1 : -1) : 0);

			// Correct for staggered labels
			if (staggerLines) {
				label.line = (index / (step || 1) % staggerLines);
				y += label.line * (axis.labelOffset / staggerLines);
			}

			return {
				x: x,
				y: y
			};
		},

		/**
		 * Extendible method to return the path of the marker
		 */
		getMarkPath: function (x, y, tickLength, tickWidth, horiz, renderer) {
			return renderer.crispLine([
					M,
					x,
					y,
					L,
					x + (horiz ? 0 : -tickLength),
					y + (horiz ? tickLength : 0)
				], tickWidth);
		},

		/**
		 * Put everything in place
		 *
		 * @param index {Number}
		 * @param old {Boolean} Use old coordinates to prepare an animation into new position
		 */
		render: function (index, old, opacity) {
			var tick = this,
				axis = tick.axis,
				options = axis.options,
				chart = axis.chart,
				renderer = chart.renderer,
				horiz = axis.horiz,
				type = tick.type,
				label = tick.label,
				pos = tick.pos,
				labelOptions = options.labels,
				gridLine = tick.gridLine,
				gridPrefix = type ? type + 'Grid' : 'grid',
				tickPrefix = type ? type + 'Tick' : 'tick',
				gridLineWidth = options[gridPrefix + 'LineWidth'],
				gridLineColor = options[gridPrefix + 'LineColor'],
				dashStyle = options[gridPrefix + 'LineDashStyle'],
				tickLength = options[tickPrefix + 'Length'],
				tickWidth = options[tickPrefix + 'Width'] || 0,
				tickColor = options[tickPrefix + 'Color'],
				tickPosition = options[tickPrefix + 'Position'],
				gridLinePath,
				mark = tick.mark,
				markPath,
				step = labelOptions.step,
				attribs,
				show = true,
				tickmarkOffset = axis.tickmarkOffset,
				xy = tick.getPosition(horiz, pos, tickmarkOffset, old),
				x = xy.x,
				y = xy.y,
				reverseCrisp = ((horiz && x === axis.pos + axis.len) || (!horiz && y === axis.pos)) ? -1 : 1; // #1480, #1687

			opacity = pick(opacity, 1);
			this.isActive = true;

			// create the grid line
			if (gridLineWidth) {
				gridLinePath = axis.getPlotLinePath(pos + tickmarkOffset, gridLineWidth * reverseCrisp, old, true);

				if (gridLine === UNDEFINED) {
					attribs = {
						stroke: gridLineColor,
						'stroke-width': gridLineWidth
					};
					if (dashStyle) {
						attribs.dashstyle = dashStyle;
					}
					if (!type) {
						attribs.zIndex = 1;
					}
					if (old) {
						attribs.opacity = 0;
					}
					tick.gridLine = gridLine =
						gridLineWidth ?
							renderer.path(gridLinePath)
								.attr(attribs).add(axis.gridGroup) :
							null;
				}

				// If the parameter 'old' is set, the current call will be followed
				// by another call, therefore do not do any animations this time
				if (!old && gridLine && gridLinePath) {
					gridLine[tick.isNew ? 'attr' : 'animate']({
						d: gridLinePath,
						opacity: opacity
					});
				}
			}

			// create the tick mark
			if (tickWidth && tickLength) {

				// negate the length
				if (tickPosition === 'inside') {
					tickLength = -tickLength;
				}
				if (axis.opposite) {
					tickLength = -tickLength;
				}

				markPath = tick.getMarkPath(x, y, tickLength, tickWidth * reverseCrisp, horiz, renderer);
				if (mark) { // updating
					mark.animate({
						d: markPath,
						opacity: opacity
					});
				} else { // first time
					tick.mark = renderer.path(
						markPath
					).attr({
						stroke: tickColor,
						'stroke-width': tickWidth,
						opacity: opacity
					}).add(axis.axisGroup);
				}
			}

			// the label is created on init - now move it into place
			if (label && !isNaN(x)) {
				label.xy = xy = tick.getLabelPosition(x, y, label, horiz, labelOptions, tickmarkOffset, index, step);

				// Apply show first and show last. If the tick is both first and last, it is
				// a single centered tick, in which case we show the label anyway (#2100).
				if ((tick.isFirst && !tick.isLast && !pick(options.showFirstLabel, 1)) ||
						(tick.isLast && !tick.isFirst && !pick(options.showLastLabel, 1))) {
					show = false;

				// Handle label overflow and show or hide accordingly
				} else if (!axis.isRadial && !labelOptions.step && !labelOptions.rotation && !old && opacity !== 0) {
					show = tick.handleOverflow(index, xy);
				}

				// apply step
				if (step && index % step) {
					// show those indices dividable by step
					show = false;
				}

				// Set the new position, and show or hide
				if (show && !isNaN(xy.y)) {
					xy.opacity = opacity;
					label[tick.isNew ? 'attr' : 'animate'](xy);
					tick.isNew = false;
				} else {
					label.attr('y', -9999); // #1338
				}
			}
		},

		/**
		 * Destructor for the tick prototype
		 */
		destroy: function () {
			destroyObjectProperties(this, this.axis);
		}
	};



	/**
	 * The object wrapper for plot lines and plot bands
	 * @param {Object} options
	 */
	Highcharts.PlotLineOrBand = function (axis, options) {
		this.axis = axis;

		if (options) {
			this.options = options;
			this.id = options.id;
		}
	};

	Highcharts.PlotLineOrBand.prototype = {
		
		/**
		 * Render the plot line or plot band. If it is already existing,
		 * move it.
		 */
		render: function () {
			var plotLine = this,
				axis = plotLine.axis,
				horiz = axis.horiz,
				halfPointRange = (axis.pointRange || 0) / 2,
				options = plotLine.options,
				optionsLabel = options.label,
				label = plotLine.label,
				width = options.width,
				to = options.to,
				from = options.from,
				isBand = defined(from) && defined(to),
				value = options.value,
				dashStyle = options.dashStyle,
				svgElem = plotLine.svgElem,
				path = [],
				addEvent,
				eventType,
				xs,
				ys,
				x,
				y,
				color = options.color,
				zIndex = options.zIndex,
				events = options.events,
				attribs = {},
				renderer = axis.chart.renderer;

			// logarithmic conversion
			if (axis.isLog) {
				from = log2lin(from);
				to = log2lin(to);
				value = log2lin(value);
			}

			// plot line
			if (width) {
				path = axis.getPlotLinePath(value, width);
				attribs = {
					stroke: color,
					'stroke-width': width
				};
				if (dashStyle) {
					attribs.dashstyle = dashStyle;
				}
			} else if (isBand) { // plot band
				
				// keep within plot area
				from = mathMax(from, axis.min - halfPointRange);
				to = mathMin(to, axis.max + halfPointRange);
				
				path = axis.getPlotBandPath(from, to, options);
				if (color) {
					attribs.fill = color;
				}
				if (options.borderWidth) {
					attribs.stroke = options.borderColor;
					attribs['stroke-width'] = options.borderWidth;
				}
			} else {
				return;
			}
			// zIndex
			if (defined(zIndex)) {
				attribs.zIndex = zIndex;
			}

			// common for lines and bands
			if (svgElem) {
				if (path) {
					svgElem.animate({
						d: path
					}, null, svgElem.onGetPath);
				} else {
					svgElem.hide();
					svgElem.onGetPath = function () {
						svgElem.show();
					};
					if (label) {
						plotLine.label = label = label.destroy();
					}
				}
			} else if (path && path.length) {
				plotLine.svgElem = svgElem = renderer.path(path)
					.attr(attribs).add();

				// events
				if (events) {
					addEvent = function (eventType) {
						svgElem.on(eventType, function (e) {
							events[eventType].apply(plotLine, [e]);
						});
					};
					for (eventType in events) {
						addEvent(eventType);
					}
				}
			}

			// the plot band/line label
			if (optionsLabel && defined(optionsLabel.text) && path && path.length && axis.width > 0 && axis.height > 0) {
				// apply defaults
				optionsLabel = merge({
					align: horiz && isBand && 'center',
					x: horiz ? !isBand && 4 : 10,
					verticalAlign : !horiz && isBand && 'middle',
					y: horiz ? isBand ? 16 : 10 : isBand ? 6 : -4,
					rotation: horiz && !isBand && 90
				}, optionsLabel);

				// add the SVG element
				if (!label) {
					attribs = {
						align: optionsLabel.textAlign || optionsLabel.align,
						rotation: optionsLabel.rotation
					};
					if (defined(zIndex)) {
						attribs.zIndex = zIndex;
					}
					plotLine.label = label = renderer.text(
							optionsLabel.text,
							0,
							0,
							optionsLabel.useHTML
						)
						.attr(attribs)
						.css(optionsLabel.style)
						.add();
				}

				// get the bounding box and align the label
				// #3000 changed to better handle choice between plotband or plotline
				xs = [path[1], path[4], (isBand ? path[6] : path[1])];
				ys = [path[2], path[5], (isBand ? path[7] : path[2])];
				x = arrayMin(xs);
				y = arrayMin(ys);

				label.align(optionsLabel, false, {
					x: x,
					y: y,
					width: arrayMax(xs) - x,
					height: arrayMax(ys) - y
				});
				label.show();

			} else if (label) { // move out of sight
				label.hide();
			}

			// chainable
			return plotLine;
		},

		/**
		 * Remove the plot line or band
		 */
		destroy: function () {
			// remove it from the lookup
			erase(this.axis.plotLinesAndBands, this);
			
			delete this.axis;
			destroyObjectProperties(this);
		}
	};

	/**
	 * Object with members for extending the Axis prototype
	 */

	AxisPlotLineOrBandExtension = {

		/**
		 * Create the path for a plot band
		 */ 
		getPlotBandPath: function (from, to) {
			var toPath = this.getPlotLinePath(to),
				path = this.getPlotLinePath(from);

			if (path && toPath) {
				path.push(
					toPath[4],
					toPath[5],
					toPath[1],
					toPath[2]
				);
			} else { // outside the axis area
				path = null;
			}
			
			return path;
		},

		addPlotBand: function (options) {
			return this.addPlotBandOrLine(options, 'plotBands');
		},
		
		addPlotLine: function (options) {
			return this.addPlotBandOrLine(options, 'plotLines');
		},

		/**
		 * Add a plot band or plot line after render time
		 *
		 * @param options {Object} The plotBand or plotLine configuration object
		 */
		addPlotBandOrLine: function (options, coll) {
			var obj = new Highcharts.PlotLineOrBand(this, options).render(),
				userOptions = this.userOptions;

			if (obj) { // #2189
				// Add it to the user options for exporting and Axis.update
				if (coll) {
					userOptions[coll] = userOptions[coll] || [];
					userOptions[coll].push(options); 
				}
				this.plotLinesAndBands.push(obj); 
			}
			
			return obj;
		},

		/**
		 * Remove a plot band or plot line from the chart by id
		 * @param {Object} id
		 */
		removePlotBandOrLine: function (id) {
			var plotLinesAndBands = this.plotLinesAndBands,
				options = this.options,
				userOptions = this.userOptions,
				i = plotLinesAndBands.length;
			while (i--) {
				if (plotLinesAndBands[i].id === id) {
					plotLinesAndBands[i].destroy();
				}
			}
			each([options.plotLines || [], userOptions.plotLines || [], options.plotBands || [], userOptions.plotBands || []], function (arr) {
				i = arr.length;
				while (i--) {
					if (arr[i].id === id) {
						erase(arr, arr[i]);
					}
				}
			});
		}
	};



	/**
	 * Create a new axis object
	 * @param {Object} chart
	 * @param {Object} options
	 */
	function Axis() {
		this.init.apply(this, arguments);
	}

	Axis.prototype = {

		/**
		 * Default options for the X axis - the Y axis has extended defaults
		 */
		defaultOptions: {
			// allowDecimals: null,
			// alternateGridColor: null,
			// categories: [],
			dateTimeLabelFormats: {
				millisecond: '%H:%M:%S.%L',
				second: '%H:%M:%S',
				minute: '%H:%M',
				hour: '%H:%M',
				day: '%e. %b',
				week: '%e. %b',
				month: '%b \'%y',
				year: '%Y'
			},
			endOnTick: false,
			gridLineColor: '#C0C0C0',
			// gridLineDashStyle: 'solid',
			// gridLineWidth: 0,
			// reversed: false,

			labels: defaultLabelOptions,
				// { step: null },
			lineColor: '#C0D0E0',
			lineWidth: 1,
			//linkedTo: null,
			//max: undefined,
			//min: undefined,
			minPadding: 0.01,
			maxPadding: 0.01,
			//minRange: null,
			minorGridLineColor: '#E0E0E0',
			// minorGridLineDashStyle: null,
			minorGridLineWidth: 1,
			minorTickColor: '#A0A0A0',
			//minorTickInterval: null,
			minorTickLength: 2,
			minorTickPosition: 'outside', // inside or outside
			//minorTickWidth: 0,
			//opposite: false,
			//offset: 0,
			//plotBands: [{
			//	events: {},
			//	zIndex: 1,
			//	labels: { align, x, verticalAlign, y, style, rotation, textAlign }
			//}],
			//plotLines: [{
			//	events: {}
			//  dashStyle: {}
			//	zIndex:
			//	labels: { align, x, verticalAlign, y, style, rotation, textAlign }
			//}],
			//reversed: false,
			// showFirstLabel: true,
			// showLastLabel: true,
			startOfWeek: 1,
			startOnTick: false,
			tickColor: '#C0D0E0',
			//tickInterval: null,
			tickLength: 10,
			tickmarkPlacement: 'between', // on or between
			tickPixelInterval: 100,
			tickPosition: 'outside',
			tickWidth: 1,
			title: {
				//text: null,
				align: 'middle', // low, middle or high
				//margin: 0 for horizontal, 10 for vertical axes,
				//rotation: 0,
				//side: 'outside',
				style: {
					color: '#707070'
				}
				//x: 0,
				//y: 0
			},
			type: 'linear' // linear, logarithmic or datetime
		},

		/**
		 * This options set extends the defaultOptions for Y axes
		 */
		defaultYAxisOptions: {
			endOnTick: true,
			gridLineWidth: 1,
			tickPixelInterval: 72,
			showLastLabel: true,
			labels: {
				x: -8,
				y: 3
			},
			lineWidth: 0,
			maxPadding: 0.05,
			minPadding: 0.05,
			startOnTick: true,
			tickWidth: 0,
			title: {
				rotation: 270,
				text: 'Values'
			},
			stackLabels: {
				enabled: false,
				//align: dynamic,
				//y: dynamic,
				//x: dynamic,
				//verticalAlign: dynamic,
				//textAlign: dynamic,
				//rotation: 0,
				formatter: function () {
					return numberFormat(this.total, -1);
				},
				style: defaultLabelOptions.style
			}
		},

		/**
		 * These options extend the defaultOptions for left axes
		 */
		defaultLeftAxisOptions: {
			labels: {
				x: -15,
				y: null
			},
			title: {
				rotation: 270
			}
		},

		/**
		 * These options extend the defaultOptions for right axes
		 */
		defaultRightAxisOptions: {
			labels: {
				x: 15,
				y: null
			},
			title: {
				rotation: 90
			}
		},

		/**
		 * These options extend the defaultOptions for bottom axes
		 */
		defaultBottomAxisOptions: {
			labels: {
				x: 0,
				y: null // based on font size
				// overflow: undefined,
				// staggerLines: null
			},
			title: {
				rotation: 0
			}
		},
		/**
		 * These options extend the defaultOptions for left axes
		 */
		defaultTopAxisOptions: {
			labels: {
				x: 0,
				y: -15
				// overflow: undefined
				// staggerLines: null
			},
			title: {
				rotation: 0
			}
		},

		/**
		 * Initialize the axis
		 */
		init: function (chart, userOptions) {


			var isXAxis = userOptions.isX,
				axis = this;

			// Flag, is the axis horizontal
			axis.horiz = chart.inverted ? !isXAxis : isXAxis;

			// Flag, isXAxis
			axis.isXAxis = isXAxis;
			axis.coll = isXAxis ? 'xAxis' : 'yAxis';

			axis.opposite = userOptions.opposite; // needed in setOptions
			axis.side = userOptions.side || (axis.horiz ?
					(axis.opposite ? 0 : 2) : // top : bottom
					(axis.opposite ? 1 : 3));  // right : left

			axis.setOptions(userOptions);


			var options = this.options,
				type = options.type,
				isDatetimeAxis = type === 'datetime';

			axis.labelFormatter = options.labels.formatter || axis.defaultLabelFormatter; // can be overwritten by dynamic format


			// Flag, stagger lines or not
			axis.userOptions = userOptions;

			//axis.axisTitleMargin = UNDEFINED,// = options.title.margin,
			axis.minPixelPadding = 0;
			//axis.ignoreMinPadding = UNDEFINED; // can be set to true by a column or bar series
			//axis.ignoreMaxPadding = UNDEFINED;

			axis.chart = chart;
			axis.reversed = options.reversed;
			axis.zoomEnabled = options.zoomEnabled !== false;

			// Initial categories
			axis.categories = options.categories || type === 'category';
			axis.names = [];

			// Elements
			//axis.axisGroup = UNDEFINED;
			//axis.gridGroup = UNDEFINED;
			//axis.axisTitle = UNDEFINED;
			//axis.axisLine = UNDEFINED;

			// Shorthand types
			axis.isLog = type === 'logarithmic';
			axis.isDatetimeAxis = isDatetimeAxis;

			// Flag, if axis is linked to another axis
			axis.isLinked = defined(options.linkedTo);
			// Linked axis.
			//axis.linkedParent = UNDEFINED;

			// Tick positions
			//axis.tickPositions = UNDEFINED; // array containing predefined positions
			// Tick intervals
			//axis.tickInterval = UNDEFINED;
			//axis.minorTickInterval = UNDEFINED;

			axis.tickmarkOffset = (axis.categories && options.tickmarkPlacement === 'between' && 
				pick(options.tickInterval, 1) === 1) ? 0.5 : 0; // #3202

			// Major ticks
			axis.ticks = {};
			axis.labelEdge = [];
			// Minor ticks
			axis.minorTicks = {};
			//axis.tickAmount = UNDEFINED;

			// List of plotLines/Bands
			axis.plotLinesAndBands = [];

			// Alternate bands
			axis.alternateBands = {};

			// Axis metrics
			//axis.left = UNDEFINED;
			//axis.top = UNDEFINED;
			//axis.width = UNDEFINED;
			//axis.height = UNDEFINED;
			//axis.bottom = UNDEFINED;
			//axis.right = UNDEFINED;
			//axis.transA = UNDEFINED;
			//axis.transB = UNDEFINED;
			//axis.oldTransA = UNDEFINED;
			axis.len = 0;
			//axis.oldMin = UNDEFINED;
			//axis.oldMax = UNDEFINED;
			//axis.oldUserMin = UNDEFINED;
			//axis.oldUserMax = UNDEFINED;
			//axis.oldAxisLength = UNDEFINED;
			axis.minRange = axis.userMinRange = options.minRange || options.maxZoom;
			axis.range = options.range;
			axis.offset = options.offset || 0;


			// Dictionary for stacks
			axis.stacks = {};
			axis.oldStacks = {};
			
			// Min and max in the data
			//axis.dataMin = UNDEFINED,
			//axis.dataMax = UNDEFINED,

			// The axis range
			axis.max = null;
			axis.min = null;

			// User set min and max
			//axis.userMin = UNDEFINED,
			//axis.userMax = UNDEFINED,

			// Crosshair options
			axis.crosshair = pick(options.crosshair, splat(chart.options.tooltip.crosshairs)[isXAxis ? 0 : 1], false);
			// Run Axis

			var eventType,
				events = axis.options.events;

			// Register
			if (inArray(axis, chart.axes) === -1) { // don't add it again on Axis.update()
				if (isXAxis && !this.isColorAxis) { // #2713
					chart.axes.splice(chart.xAxis.length, 0, axis);
				} else {
					chart.axes.push(axis);
				}

				chart[axis.coll].push(axis);
			}

			axis.series = axis.series || []; // populated by Series

			// inverted charts have reversed xAxes as default
			if (chart.inverted && isXAxis && axis.reversed === UNDEFINED) {
				axis.reversed = true;
			}

			axis.removePlotBand = axis.removePlotBandOrLine;
			axis.removePlotLine = axis.removePlotBandOrLine;


			// register event listeners
			for (eventType in events) {
				addEvent(axis, eventType, events[eventType]);
			}

			// extend logarithmic axis
			if (axis.isLog) {
				axis.val2lin = log2lin;
				axis.lin2val = lin2log;
			}
		},

		/**
		 * Merge and set options
		 */
		setOptions: function (userOptions) {
			this.options = merge(
				this.defaultOptions,
				this.isXAxis ? {} : this.defaultYAxisOptions,
				[this.defaultTopAxisOptions, this.defaultRightAxisOptions,
					this.defaultBottomAxisOptions, this.defaultLeftAxisOptions][this.side],
				merge(
					defaultOptions[this.coll], // if set in setOptions (#1053)
					userOptions
				)
			);
		},

		/**
		 * The default label formatter. The context is a special config object for the label.
		 */
		defaultLabelFormatter: function () {
			var axis = this.axis,
				value = this.value,
				categories = axis.categories,
				dateTimeLabelFormat = this.dateTimeLabelFormat,
				numericSymbols = defaultOptions.lang.numericSymbols,
				i = numericSymbols && numericSymbols.length,
				multi,
				ret,
				formatOption = axis.options.labels.format,

				// make sure the same symbol is added for all labels on a linear axis
				numericSymbolDetector = axis.isLog ? value : axis.tickInterval;

			if (formatOption) {
				ret = format(formatOption, this);

			} else if (categories) {
				ret = value;

			} else if (dateTimeLabelFormat) { // datetime axis
				ret = dateFormat(dateTimeLabelFormat, value);

			} else if (i && numericSymbolDetector >= 1000) {
				// Decide whether we should add a numeric symbol like k (thousands) or M (millions).
				// If we are to enable this in tooltip or other places as well, we can move this
				// logic to the numberFormatter and enable it by a parameter.
				while (i-- && ret === UNDEFINED) {
					multi = Math.pow(1000, i + 1);
					if (numericSymbolDetector >= multi && numericSymbols[i] !== null) {
						ret = numberFormat(value / multi, -1) + numericSymbols[i];
					}
				}
			}

			if (ret === UNDEFINED) {
				if (mathAbs(value) >= 10000) { // add thousands separators
					ret = numberFormat(value, 0);

				} else { // small numbers
					ret = numberFormat(value, -1, UNDEFINED, ''); // #2466
				}
			}

			return ret;
		},

		/**
		 * Get the minimum and maximum for the series of each axis
		 */
		getSeriesExtremes: function () {
			var axis = this,
				chart = axis.chart;

			axis.hasVisibleSeries = false;

			// Reset properties in case we're redrawing (#3353)
			axis.dataMin = axis.dataMax = axis.ignoreMinPadding = axis.ignoreMaxPadding = null;
			
			if (axis.buildStacks) {
				axis.buildStacks();
			}

			// loop through this axis' series
			each(axis.series, function (series) {

				if (series.visible || !chart.options.chart.ignoreHiddenSeries) {

					var seriesOptions = series.options,
						xData,
						threshold = seriesOptions.threshold,
						seriesDataMin,
						seriesDataMax;

					axis.hasVisibleSeries = true;

					// Validate threshold in logarithmic axes
					if (axis.isLog && threshold <= 0) {
						threshold = null;
					}

					// Get dataMin and dataMax for X axes
					if (axis.isXAxis) {
						xData = series.xData;
						if (xData.length) {
							axis.dataMin = mathMin(pick(axis.dataMin, xData[0]), arrayMin(xData));
							axis.dataMax = mathMax(pick(axis.dataMax, xData[0]), arrayMax(xData));
						}

					// Get dataMin and dataMax for Y axes, as well as handle stacking and processed data
					} else {

						// Get this particular series extremes
						series.getExtremes();
						seriesDataMax = series.dataMax;
						seriesDataMin = series.dataMin;

						// Get the dataMin and dataMax so far. If percentage is used, the min and max are
						// always 0 and 100. If seriesDataMin and seriesDataMax is null, then series
						// doesn't have active y data, we continue with nulls
						if (defined(seriesDataMin) && defined(seriesDataMax)) {
							axis.dataMin = mathMin(pick(axis.dataMin, seriesDataMin), seriesDataMin);
							axis.dataMax = mathMax(pick(axis.dataMax, seriesDataMax), seriesDataMax);
						}

						// Adjust to threshold
						if (defined(threshold)) {
							if (axis.dataMin >= threshold) {
								axis.dataMin = threshold;
								axis.ignoreMinPadding = true;
							} else if (axis.dataMax < threshold) {
								axis.dataMax = threshold;
								axis.ignoreMaxPadding = true;
							}
						}
					}
				}
			});
		},

		/**
		 * Translate from axis value to pixel position on the chart, or back
		 *
		 */
		translate: function (val, backwards, cvsCoord, old, handleLog, pointPlacement) {
			var axis = this,
				sign = 1,
				cvsOffset = 0,
				localA = old ? axis.oldTransA : axis.transA,
				localMin = old ? axis.oldMin : axis.min,
				returnValue,
				minPixelPadding = axis.minPixelPadding,
				postTranslate = (axis.options.ordinal || (axis.isLog && handleLog)) && axis.lin2val;

			if (!localA) {
				localA = axis.transA;
			}

			// In vertical axes, the canvas coordinates start from 0 at the top like in
			// SVG.
			if (cvsCoord) {
				sign *= -1; // canvas coordinates inverts the value
				cvsOffset = axis.len;
			}

			// Handle reversed axis
			if (axis.reversed) {
				sign *= -1;
				cvsOffset -= sign * (axis.sector || axis.len);
			}

			// From pixels to value
			if (backwards) { // reverse translation

				val = val * sign + cvsOffset;
				val -= minPixelPadding;
				returnValue = val / localA + localMin; // from chart pixel to value
				if (postTranslate) { // log and ordinal axes
					returnValue = axis.lin2val(returnValue);
				}

			// From value to pixels
			} else {
				if (postTranslate) { // log and ordinal axes
					val = axis.val2lin(val);
				}
				if (pointPlacement === 'between') {
					pointPlacement = 0.5;
				}
				returnValue = sign * (val - localMin) * localA + cvsOffset + (sign * minPixelPadding) +
					(isNumber(pointPlacement) ? localA * pointPlacement * axis.pointRange : 0);
			}

			return returnValue;
		},

		/**
		 * Utility method to translate an axis value to pixel position.
		 * @param {Number} value A value in terms of axis units
		 * @param {Boolean} paneCoordinates Whether to return the pixel coordinate relative to the chart
		 *        or just the axis/pane itself.
		 */
		toPixels: function (value, paneCoordinates) {
			return this.translate(value, false, !this.horiz, null, true) + (paneCoordinates ? 0 : this.pos);
		},

		/*
		 * Utility method to translate a pixel position in to an axis value
		 * @param {Number} pixel The pixel value coordinate
		 * @param {Boolean} paneCoordiantes Whether the input pixel is relative to the chart or just the
		 *        axis/pane itself.
		 */
		toValue: function (pixel, paneCoordinates) {
			return this.translate(pixel - (paneCoordinates ? 0 : this.pos), true, !this.horiz, null, true);
		},

		/**
		 * Create the path for a plot line that goes from the given value on
		 * this axis, across the plot to the opposite side
		 * @param {Number} value
		 * @param {Number} lineWidth Used for calculation crisp line
		 * @param {Number] old Use old coordinates (for resizing and rescaling)
		 */
		getPlotLinePath: function (value, lineWidth, old, force, translatedValue) {
			var axis = this,
				chart = axis.chart,
				axisLeft = axis.left,
				axisTop = axis.top,
				x1,
				y1,
				x2,
				y2,
				cHeight = (old && chart.oldChartHeight) || chart.chartHeight,
				cWidth = (old && chart.oldChartWidth) || chart.chartWidth,
				skip,
				transB = axis.transB;

			translatedValue = pick(translatedValue, axis.translate(value, null, null, old));
			x1 = x2 = mathRound(translatedValue + transB);
			y1 = y2 = mathRound(cHeight - translatedValue - transB);

			if (isNaN(translatedValue)) { // no min or max
				skip = true;

			} else if (axis.horiz) {
				y1 = axisTop;
				y2 = cHeight - axis.bottom;
				if (x1 < axisLeft || x1 > axisLeft + axis.width) {
					skip = true;
				}
			} else {
				x1 = axisLeft;
				x2 = cWidth - axis.right;

				if (y1 < axisTop || y1 > axisTop + axis.height) {
					skip = true;
				}
			}
			return skip && !force ?
				null :
				chart.renderer.crispLine([M, x1, y1, L, x2, y2], lineWidth || 1);
		},

		/**
		 * Set the tick positions of a linear axis to round values like whole tens or every five.
		 */
		getLinearTickPositions: function (tickInterval, min, max) {
			var pos,
				lastPos,
				roundedMin = correctFloat(mathFloor(min / tickInterval) * tickInterval),
				roundedMax = correctFloat(mathCeil(max / tickInterval) * tickInterval),
				tickPositions = [];

			// For single points, add a tick regardless of the relative position (#2662)
			if (min === max && isNumber(min)) {
				return [min];
			}

			// Populate the intermediate values
			pos = roundedMin;
			while (pos <= roundedMax) {

				// Place the tick on the rounded value
				tickPositions.push(pos);

				// Always add the raw tickInterval, not the corrected one.
				pos = correctFloat(pos + tickInterval);

				// If the interval is not big enough in the current min - max range to actually increase
				// the loop variable, we need to break out to prevent endless loop. Issue #619
				if (pos === lastPos) {
					break;
				}

				// Record the last value
				lastPos = pos;
			}
			return tickPositions;
		},

		/**
		 * Return the minor tick positions. For logarithmic axes, reuse the same logic
		 * as for major ticks.
		 */
		getMinorTickPositions: function () {
			var axis = this,
				options = axis.options,
				tickPositions = axis.tickPositions,
				minorTickInterval = axis.minorTickInterval,
				minorTickPositions = [],
				pos,
				i,
				len;

			if (axis.isLog) {
				len = tickPositions.length;
				for (i = 1; i < len; i++) {
					minorTickPositions = minorTickPositions.concat(
						axis.getLogTickPositions(minorTickInterval, tickPositions[i - 1], tickPositions[i], true)
					);
				}
			} else if (axis.isDatetimeAxis && options.minorTickInterval === 'auto') { // #1314
				minorTickPositions = minorTickPositions.concat(
					axis.getTimeTicks(
						axis.normalizeTimeTickInterval(minorTickInterval),
						axis.min,
						axis.max,
						options.startOfWeek
					)
				);
				if (minorTickPositions[0] < axis.min) {
					minorTickPositions.shift();
				}
			} else {
				for (pos = axis.min + (tickPositions[0] - axis.min) % minorTickInterval; pos <= axis.max; pos += minorTickInterval) {
					minorTickPositions.push(pos);
				}
			}
			return minorTickPositions;
		},

		/**
		 * Adjust the min and max for the minimum range. Keep in mind that the series data is
		 * not yet processed, so we don't have information on data cropping and grouping, or
		 * updated axis.pointRange or series.pointRange. The data can't be processed until
		 * we have finally established min and max.
		 */
		adjustForMinRange: function () {
			var axis = this,
				options = axis.options,
				min = axis.min,
				max = axis.max,
				zoomOffset,
				spaceAvailable = axis.dataMax - axis.dataMin >= axis.minRange,
				closestDataRange,
				i,
				distance,
				xData,
				loopLength,
				minArgs,
				maxArgs;

			// Set the automatic minimum range based on the closest point distance
			if (axis.isXAxis && axis.minRange === UNDEFINED && !axis.isLog) {

				if (defined(options.min) || defined(options.max)) {
					axis.minRange = null; // don't do this again

				} else {

					// Find the closest distance between raw data points, as opposed to
					// closestPointRange that applies to processed points (cropped and grouped)
					each(axis.series, function (series) {
						xData = series.xData;
						loopLength = series.xIncrement ? 1 : xData.length - 1;
						for (i = loopLength; i > 0; i--) {
							distance = xData[i] - xData[i - 1];
							if (closestDataRange === UNDEFINED || distance < closestDataRange) {
								closestDataRange = distance;
							}
						}
					});
					axis.minRange = mathMin(closestDataRange * 5, axis.dataMax - axis.dataMin);
				}
			}

			// if minRange is exceeded, adjust
			if (max - min < axis.minRange) {
				var minRange = axis.minRange;
				zoomOffset = (minRange - max + min) / 2;

				// if min and max options have been set, don't go beyond it
				minArgs = [min - zoomOffset, pick(options.min, min - zoomOffset)];
				if (spaceAvailable) { // if space is available, stay within the data range
					minArgs[2] = axis.dataMin;
				}
				min = arrayMax(minArgs);

				maxArgs = [min + minRange, pick(options.max, min + minRange)];
				if (spaceAvailable) { // if space is availabe, stay within the data range
					maxArgs[2] = axis.dataMax;
				}

				max = arrayMin(maxArgs);

				// now if the max is adjusted, adjust the min back
				if (max - min < minRange) {
					minArgs[0] = max - minRange;
					minArgs[1] = pick(options.min, max - minRange);
					min = arrayMax(minArgs);
				}
			}

			// Record modified extremes
			axis.min = min;
			axis.max = max;
		},

		/**
		 * Update translation information
		 */
		setAxisTranslation: function (saveOld) {
			var axis = this,
				range = axis.max - axis.min,
				pointRange = axis.axisPointRange || 0,
				closestPointRange,
				minPointOffset = 0,
				pointRangePadding = 0,
				linkedParent = axis.linkedParent,
				ordinalCorrection,
				hasCategories = !!axis.categories,
				transA = axis.transA;

			// Adjust translation for padding. Y axis with categories need to go through the same (#1784).
			if (axis.isXAxis || hasCategories || pointRange) {
				if (linkedParent) {
					minPointOffset = linkedParent.minPointOffset;
					pointRangePadding = linkedParent.pointRangePadding;

				} else {
					each(axis.series, function (series) {
						var seriesPointRange = hasCategories ? 1 : (axis.isXAxis ? series.pointRange : (axis.axisPointRange || 0)), // #2806
							pointPlacement = series.options.pointPlacement,
							seriesClosestPointRange = series.closestPointRange;

						if (seriesPointRange > range) { // #1446
							seriesPointRange = 0;
						}
						pointRange = mathMax(pointRange, seriesPointRange);

						// minPointOffset is the value padding to the left of the axis in order to make
						// room for points with a pointRange, typically columns. When the pointPlacement option
						// is 'between' or 'on', this padding does not apply.
						minPointOffset = mathMax(
							minPointOffset,
							isString(pointPlacement) ? 0 : seriesPointRange / 2
						);

						// Determine the total padding needed to the length of the axis to make room for the
						// pointRange. If the series' pointPlacement is 'on', no padding is added.
						pointRangePadding = mathMax(
							pointRangePadding,
							pointPlacement === 'on' ? 0 : seriesPointRange
						);

						// Set the closestPointRange
						if (!series.noSharedTooltip && defined(seriesClosestPointRange)) {
							closestPointRange = defined(closestPointRange) ?
								mathMin(closestPointRange, seriesClosestPointRange) :
								seriesClosestPointRange;
						}
					});
				}

				// Record minPointOffset and pointRangePadding
				ordinalCorrection = axis.ordinalSlope && closestPointRange ? axis.ordinalSlope / closestPointRange : 1; // #988, #1853
				axis.minPointOffset = minPointOffset = minPointOffset * ordinalCorrection;
				axis.pointRangePadding = pointRangePadding = pointRangePadding * ordinalCorrection;

				// pointRange means the width reserved for each point, like in a column chart
				axis.pointRange = mathMin(pointRange, range);

				// closestPointRange means the closest distance between points. In columns
				// it is mostly equal to pointRange, but in lines pointRange is 0 while closestPointRange
				// is some other value
				axis.closestPointRange = closestPointRange;
			}

			// Secondary values
			if (saveOld) {
				axis.oldTransA = transA;
			}
			axis.translationSlope = axis.transA = transA = axis.len / ((range + pointRangePadding) || 1);
			axis.transB = axis.horiz ? axis.left : axis.bottom; // translation addend
			axis.minPixelPadding = transA * minPointOffset;
		},

		/**
		 * Set the tick positions to round values and optionally extend the extremes
		 * to the nearest tick
		 */
		setTickPositions: function (secondPass) {
			var axis = this,
				chart = axis.chart,
				options = axis.options,
				startOnTick = options.startOnTick,
				endOnTick = options.endOnTick,
				isLog = axis.isLog,
				isDatetimeAxis = axis.isDatetimeAxis,
				isXAxis = axis.isXAxis,
				isLinked = axis.isLinked,
				tickPositioner = axis.options.tickPositioner,
				maxPadding = options.maxPadding,
				minPadding = options.minPadding,
				length,
				linkedParentExtremes,
				tickIntervalOption = options.tickInterval,
				minTickIntervalOption = options.minTickInterval,
				tickPixelIntervalOption = options.tickPixelInterval,
				tickPositions,
				keepTwoTicksOnly,
				categories = axis.categories;

			// linked axis gets the extremes from the parent axis
			if (isLinked) {
				axis.linkedParent = chart[axis.coll][options.linkedTo];
				linkedParentExtremes = axis.linkedParent.getExtremes();
				axis.min = pick(linkedParentExtremes.min, linkedParentExtremes.dataMin);
				axis.max = pick(linkedParentExtremes.max, linkedParentExtremes.dataMax);
				if (options.type !== axis.linkedParent.options.type) {
					error(11, 1); // Can't link axes of different type
				}
			} else { // initial min and max from the extreme data values
				axis.min = pick(axis.userMin, options.min, axis.dataMin);
				axis.max = pick(axis.userMax, options.max, axis.dataMax);
			}

			if (isLog) {
				if (!secondPass && mathMin(axis.min, pick(axis.dataMin, axis.min)) <= 0) { // #978
					error(10, 1); // Can't plot negative values on log axis
				}
				axis.min = correctFloat(log2lin(axis.min)); // correctFloat cures #934
				axis.max = correctFloat(log2lin(axis.max));
			}

			// handle zoomed range
			if (axis.range && defined(axis.max)) {
				axis.userMin = axis.min = mathMax(axis.min, axis.max - axis.range); // #618
				axis.userMax = axis.max;

				axis.range = null;  // don't use it when running setExtremes
			}

			// Hook for adjusting this.min and this.max. Used by bubble series.
			if (axis.beforePadding) {
				axis.beforePadding();
			}

			// adjust min and max for the minimum range
			axis.adjustForMinRange();

			// Pad the values to get clear of the chart's edges. To avoid tickInterval taking the padding
			// into account, we do this after computing tick interval (#1337).
			if (!categories && !axis.axisPointRange && !axis.usePercentage && !isLinked && defined(axis.min) && defined(axis.max)) {
				length = axis.max - axis.min;
				if (length) {
					if (!defined(options.min) && !defined(axis.userMin) && minPadding && (axis.dataMin < 0 || !axis.ignoreMinPadding)) {
						axis.min -= length * minPadding;
					}
					if (!defined(options.max) && !defined(axis.userMax)  && maxPadding && (axis.dataMax > 0 || !axis.ignoreMaxPadding)) {
						axis.max += length * maxPadding;
					}
				}
			}

			// Stay within floor and ceiling
			if (isNumber(options.floor)) {
				axis.min = mathMax(axis.min, options.floor);
			}
			if (isNumber(options.ceiling)) {
				axis.max = mathMin(axis.max, options.ceiling);
			}

			// get tickInterval
			if (axis.min === axis.max || axis.min === undefined || axis.max === undefined) {
				axis.tickInterval = 1;
			} else if (isLinked && !tickIntervalOption &&
					tickPixelIntervalOption === axis.linkedParent.options.tickPixelInterval) {
				axis.tickInterval = axis.linkedParent.tickInterval;
			} else {
				axis.tickInterval = pick(
					tickIntervalOption,
					categories ? // for categoried axis, 1 is default, for linear axis use tickPix
						1 :
						// don't let it be more than the data range
						(axis.max - axis.min) * tickPixelIntervalOption / mathMax(axis.len, tickPixelIntervalOption)
				);
				// For squished axes, set only two ticks
				if (!defined(tickIntervalOption) && axis.len < tickPixelIntervalOption && !this.isRadial &&
						!this.isLog && !categories && startOnTick && endOnTick) {
					keepTwoTicksOnly = true;
					axis.tickInterval /= 4; // tick extremes closer to the real values
				}
			}

			// Now we're finished detecting min and max, crop and group series data. This
			// is in turn needed in order to find tick positions in ordinal axes.
			if (isXAxis && !secondPass) {
				each(axis.series, function (series) {
					series.processData(axis.min !== axis.oldMin || axis.max !== axis.oldMax);
				});
			}

			// set the translation factor used in translate function
			axis.setAxisTranslation(true);

			// hook for ordinal axes and radial axes
			if (axis.beforeSetTickPositions) {
				axis.beforeSetTickPositions();
			}

			// hook for extensions, used in Highstock ordinal axes
			if (axis.postProcessTickInterval) {
				axis.tickInterval = axis.postProcessTickInterval(axis.tickInterval);
			}

			// In column-like charts, don't cramp in more ticks than there are points (#1943)
			if (axis.pointRange) {
				axis.tickInterval = mathMax(axis.pointRange, axis.tickInterval);
			}

			// Before normalizing the tick interval, handle minimum tick interval. This applies only if tickInterval is not defined.
			if (!tickIntervalOption && axis.tickInterval < minTickIntervalOption) {
				axis.tickInterval = minTickIntervalOption;
			}

			// for linear axes, get magnitude and normalize the interval
			if (!isDatetimeAxis && !isLog) { // linear
				if (!tickIntervalOption) {
					axis.tickInterval = normalizeTickInterval(
						axis.tickInterval, 
						null, 
						getMagnitude(axis.tickInterval), 
						// If the tick interval is between 1 and 5 and the axis max is in the order of
						// thousands, chances are we are dealing with years. Don't allow decimals. #3363.
						pick(options.allowDecimals, !(axis.tickInterval > 1 && axis.tickInterval < 5 && axis.max > 1000 && axis.max < 9999))
					);
				}
			}

			// get minorTickInterval
			axis.minorTickInterval = options.minorTickInterval === 'auto' && axis.tickInterval ?
					axis.tickInterval / 5 : options.minorTickInterval;

			// find the tick positions
			axis.tickPositions = tickPositions = options.tickPositions ?
				[].concat(options.tickPositions) : // Work on a copy (#1565)
				(tickPositioner && tickPositioner.apply(axis, [axis.min, axis.max]));
			if (!tickPositions) {

				// Too many ticks
				if (!axis.ordinalPositions && (axis.max - axis.min) / axis.tickInterval > mathMax(2 * axis.len, 200)) {
					error(19, true);
				}

				if (isDatetimeAxis) {
					tickPositions = axis.getTimeTicks(
						axis.normalizeTimeTickInterval(axis.tickInterval, options.units),
						axis.min,
						axis.max,
						options.startOfWeek,
						axis.ordinalPositions,
						axis.closestPointRange,
						true
					);
				} else if (isLog) {
					tickPositions = axis.getLogTickPositions(axis.tickInterval, axis.min, axis.max);
				} else {
					tickPositions = axis.getLinearTickPositions(axis.tickInterval, axis.min, axis.max);
				}

				if (keepTwoTicksOnly) {
					tickPositions.splice(1, tickPositions.length - 2);
				}

				axis.tickPositions = tickPositions;
			}

			if (!isLinked) {

				// reset min/max or remove extremes based on start/end on tick
				var roundedMin = tickPositions[0],
					roundedMax = tickPositions[tickPositions.length - 1],
					minPointOffset = axis.minPointOffset || 0,
					singlePad;

				if (startOnTick) {
					axis.min = roundedMin;
				} else if (axis.min - minPointOffset > roundedMin) {
					tickPositions.shift();
				}

				if (endOnTick) {
					axis.max = roundedMax;
				} else if (axis.max + minPointOffset < roundedMax) {
					tickPositions.pop();
				}

				// If no tick are left, set one tick in the middle (#3195) 
				if (tickPositions.length === 0 && defined(roundedMin)) {
					tickPositions.push((roundedMax + roundedMin) / 2);
				}

				// When there is only one point, or all points have the same value on this axis, then min
				// and max are equal and tickPositions.length is 0 or 1. In this case, add some padding
				// in order to center the point, but leave it with one tick. #1337.
				if (tickPositions.length === 1) {
					singlePad = mathAbs(axis.max) > 10e12 ? 1 : 0.001; // The lowest possible number to avoid extra padding on columns (#2619, #2846)
					axis.min -= singlePad;
					axis.max += singlePad;
				}
			}
		},

		/**
		 * Set the max ticks of either the x and y axis collection
		 */
		setMaxTicks: function () {

			var chart = this.chart,
				maxTicks = chart.maxTicks || {},
				tickPositions = this.tickPositions,
				key = this._maxTicksKey = [this.coll, this.pos, this.len].join('-');

			if (!this.isLinked && !this.isDatetimeAxis && tickPositions && tickPositions.length > (maxTicks[key] || 0) && this.options.alignTicks !== false) {
				maxTicks[key] = tickPositions.length;
			}
			chart.maxTicks = maxTicks;
		},

		/**
		 * When using multiple axes, adjust the number of ticks to match the highest
		 * number of ticks in that group
		 */
		adjustTickAmount: function () {
			var axis = this,
				chart = axis.chart,
				key = axis._maxTicksKey,
				tickPositions = axis.tickPositions,
				maxTicks = chart.maxTicks;

			if (maxTicks && maxTicks[key] && !axis.isDatetimeAxis && !axis.categories && !axis.isLinked &&
					axis.options.alignTicks !== false && this.min !== UNDEFINED) {
				var oldTickAmount = axis.tickAmount,
					calculatedTickAmount = tickPositions.length,
					tickAmount;

				// set the axis-level tickAmount to use below
				axis.tickAmount = tickAmount = maxTicks[key];

				if (calculatedTickAmount < tickAmount) {
					while (tickPositions.length < tickAmount) {
						tickPositions.push(correctFloat(
							tickPositions[tickPositions.length - 1] + axis.tickInterval
						));
					}
					axis.transA *= (calculatedTickAmount - 1) / (tickAmount - 1);
					axis.max = tickPositions[tickPositions.length - 1];

				}
				if (defined(oldTickAmount) && tickAmount !== oldTickAmount) {
					axis.isDirty = true;
				}
			}
		},

		/**
		 * Set the scale based on data min and max, user set min and max or options
		 *
		 */
		setScale: function () {
			var axis = this,
				stacks = axis.stacks,
				type,
				i,
				isDirtyData,
				isDirtyAxisLength;

			axis.oldMin = axis.min;
			axis.oldMax = axis.max;
			axis.oldAxisLength = axis.len;

			// set the new axisLength
			axis.setAxisSize();
			//axisLength = horiz ? axisWidth : axisHeight;
			isDirtyAxisLength = axis.len !== axis.oldAxisLength;

			// is there new data?
			each(axis.series, function (series) {
				if (series.isDirtyData || series.isDirty ||
						series.xAxis.isDirty) { // when x axis is dirty, we need new data extremes for y as well
					isDirtyData = true;
				}
			});

			// do we really need to go through all this?
			if (isDirtyAxisLength || isDirtyData || axis.isLinked || axis.forceRedraw ||
				axis.userMin !== axis.oldUserMin || axis.userMax !== axis.oldUserMax) {

				// reset stacks
				if (!axis.isXAxis) {
					for (type in stacks) {
						for (i in stacks[type]) {
							stacks[type][i].total = null;
							stacks[type][i].cum = 0;
						}
					}
				}

				axis.forceRedraw = false;

				// get data extremes if needed
				axis.getSeriesExtremes();

				// get fixed positions based on tickInterval
				axis.setTickPositions();

				// record old values to decide whether a rescale is necessary later on (#540)
				axis.oldUserMin = axis.userMin;
				axis.oldUserMax = axis.userMax;

				// Mark as dirty if it is not already set to dirty and extremes have changed. #595.
				if (!axis.isDirty) {
					axis.isDirty = isDirtyAxisLength || axis.min !== axis.oldMin || axis.max !== axis.oldMax;
				}
			} else if (!axis.isXAxis) {
				if (axis.oldStacks) {
					stacks = axis.stacks = axis.oldStacks;
				}

				// reset stacks
				for (type in stacks) {
					for (i in stacks[type]) {
						stacks[type][i].cum = stacks[type][i].total;
					}
				}
			}

			// Set the maximum tick amount
			axis.setMaxTicks();
		},

		/**
		 * Set the extremes and optionally redraw
		 * @param {Number} newMin
		 * @param {Number} newMax
		 * @param {Boolean} redraw
		 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
		 *    configuration
		 * @param {Object} eventArguments
		 *
		 */
		setExtremes: function (newMin, newMax, redraw, animation, eventArguments) {
			var axis = this,
				chart = axis.chart;

			redraw = pick(redraw, true); // defaults to true

			// Extend the arguments with min and max
			eventArguments = extend(eventArguments, {
				min: newMin,
				max: newMax
			});

			// Fire the event
			fireEvent(axis, 'setExtremes', eventArguments, function () { // the default event handler

				axis.userMin = newMin;
				axis.userMax = newMax;
				axis.eventArgs = eventArguments;

				// Mark for running afterSetExtremes
				axis.isDirtyExtremes = true;

				// redraw
				if (redraw) {
					chart.redraw(animation);
				}
			});
		},

		/**
		 * Overridable method for zooming chart. Pulled out in a separate method to allow overriding
		 * in stock charts.
		 */
		zoom: function (newMin, newMax) {
			var dataMin = this.dataMin,
				dataMax = this.dataMax,
				options = this.options;

			// Prevent pinch zooming out of range. Check for defined is for #1946. #1734.
			if (!this.allowZoomOutside) {
				if (defined(dataMin) && newMin <= mathMin(dataMin, pick(options.min, dataMin))) {
					newMin = UNDEFINED;
				}
				if (defined(dataMax) && newMax >= mathMax(dataMax, pick(options.max, dataMax))) {
					newMax = UNDEFINED;
				}
			}

			// In full view, displaying the reset zoom button is not required
			this.displayBtn = newMin !== UNDEFINED || newMax !== UNDEFINED;

			// Do it
			this.setExtremes(
				newMin,
				newMax,
				false,
				UNDEFINED,
				{ trigger: 'zoom' }
			);
			return true;
		},

		/**
		 * Update the axis metrics
		 */
		setAxisSize: function () {
			var chart = this.chart,
				options = this.options,
				offsetLeft = options.offsetLeft || 0,
				offsetRight = options.offsetRight || 0,
				horiz = this.horiz,
				width = pick(options.width, chart.plotWidth - offsetLeft + offsetRight),
				height = pick(options.height, chart.plotHeight),
				top = pick(options.top, chart.plotTop),
				left = pick(options.left, chart.plotLeft + offsetLeft),
				percentRegex = /%$/;

			// Check for percentage based input values
			if (percentRegex.test(height)) {
				height = parseInt(height, 10) / 100 * chart.plotHeight;
			}
			if (percentRegex.test(top)) {
				top = parseInt(top, 10) / 100 * chart.plotHeight + chart.plotTop;
			}

			// Expose basic values to use in Series object and navigator
			this.left = left;
			this.top = top;
			this.width = width;
			this.height = height;
			this.bottom = chart.chartHeight - height - top;
			this.right = chart.chartWidth - width - left;

			// Direction agnostic properties
			this.len = mathMax(horiz ? width : height, 0); // mathMax fixes #905
			this.pos = horiz ? left : top; // distance from SVG origin
		},

		/**
		 * Get the actual axis extremes
		 */
		getExtremes: function () {
			var axis = this,
				isLog = axis.isLog;

			return {
				min: isLog ? correctFloat(lin2log(axis.min)) : axis.min,
				max: isLog ? correctFloat(lin2log(axis.max)) : axis.max,
				dataMin: axis.dataMin,
				dataMax: axis.dataMax,
				userMin: axis.userMin,
				userMax: axis.userMax
			};
		},

		/**
		 * Get the zero plane either based on zero or on the min or max value.
		 * Used in bar and area plots
		 */
		getThreshold: function (threshold) {
			var axis = this,
				isLog = axis.isLog;

			var realMin = isLog ? lin2log(axis.min) : axis.min,
				realMax = isLog ? lin2log(axis.max) : axis.max;

			if (realMin > threshold || threshold === null) {
				threshold = realMin;
			} else if (realMax < threshold) {
				threshold = realMax;
			}

			return axis.translate(threshold, 0, 1, 0, 1);
		},

		/**
		 * Compute auto alignment for the axis label based on which side the axis is on
		 * and the given rotation for the label
		 */
		autoLabelAlign: function (rotation) {
			var ret,
				angle = (pick(rotation, 0) - (this.side * 90) + 720) % 360;

			if (angle > 15 && angle < 165) {
				ret = 'right';
			} else if (angle > 195 && angle < 345) {
				ret = 'left';
			} else {
				ret = 'center';
			}
			return ret;
		},

		/**
		 * Render the tick labels to a preliminary position to get their sizes
		 */
		getOffset: function () {
			var axis = this,
				chart = axis.chart,
				renderer = chart.renderer,
				options = axis.options,
				tickPositions = axis.tickPositions,
				ticks = axis.ticks,
				horiz = axis.horiz,
				side = axis.side,
				invertedSide = chart.inverted ? [1, 0, 3, 2][side] : side,
				hasData,
				showAxis,
				titleOffset = 0,
				titleOffsetOption,
				titleMargin = 0,
				axisTitleOptions = options.title,
				labelOptions = options.labels,
				labelOffset = 0, // reset
				labelOffsetPadded,
				axisOffset = chart.axisOffset,
				clipOffset = chart.clipOffset,
				directionFactor = [-1, 1, 1, -1][side],
				n,
				i,
				autoStaggerLines = 1,
				maxStaggerLines = pick(labelOptions.maxStaggerLines, 5),
				sortedPositions,
				lastRight,
				overlap,
				pos,
				bBox,
				x,
				w,
				lineNo,
				lineHeightCorrection;

			// For reuse in Axis.render
			axis.hasData = hasData = (axis.hasVisibleSeries || (defined(axis.min) && defined(axis.max) && !!tickPositions));
			axis.showAxis = showAxis = hasData || pick(options.showEmpty, true);

			// Set/reset staggerLines
			axis.staggerLines = axis.horiz && labelOptions.staggerLines;

			// Create the axisGroup and gridGroup elements on first iteration
			if (!axis.axisGroup) {
				axis.gridGroup = renderer.g('grid')
					.attr({ zIndex: options.gridZIndex || 1 })
					.add();
				axis.axisGroup = renderer.g('axis')
					.attr({ zIndex: options.zIndex || 2 })
					.add();
				axis.labelGroup = renderer.g('axis-labels')
					.attr({ zIndex: labelOptions.zIndex || 7 })
					.addClass(PREFIX + axis.coll.toLowerCase() + '-labels')
					.add();
			}

			if (hasData || axis.isLinked) {

				// Set the explicit or automatic label alignment
				axis.labelAlign = pick(labelOptions.align || axis.autoLabelAlign(labelOptions.rotation));

				// Generate ticks
				each(tickPositions, function (pos) {
					if (!ticks[pos]) {
						ticks[pos] = new Tick(axis, pos);
					} else {
						ticks[pos].addLabel(); // update labels depending on tick interval
					}
				});

				// Handle automatic stagger lines
				if (axis.horiz && !axis.staggerLines && maxStaggerLines && !labelOptions.rotation) {
					sortedPositions = axis.reversed ? [].concat(tickPositions).reverse() : tickPositions;
					while (autoStaggerLines < maxStaggerLines) {
						lastRight = [];
						overlap = false;

						for (i = 0; i < sortedPositions.length; i++) {
							pos = sortedPositions[i];
							bBox = ticks[pos].label && ticks[pos].label.getBBox();
							w = bBox ? bBox.width : 0;
							lineNo = i % autoStaggerLines;

							if (w) {
								x = axis.translate(pos); // don't handle log
								if (lastRight[lineNo] !== UNDEFINED && x < lastRight[lineNo]) {
									overlap = true;
								}
								lastRight[lineNo] = x + w;
							}
						}
						if (overlap) {
							autoStaggerLines++;
						} else {
							break;
						}
					}

					if (autoStaggerLines > 1) {
						axis.staggerLines = autoStaggerLines;
					}
				}


				each(tickPositions, function (pos) {
					// left side must be align: right and right side must have align: left for labels
					if (side === 0 || side === 2 || { 1: 'left', 3: 'right' }[side] === axis.labelAlign) {

						// get the highest offset
						labelOffset = mathMax(
							ticks[pos].getLabelSize(),
							labelOffset
						);
					}
				});

				if (axis.staggerLines) {
					labelOffset *= axis.staggerLines;
					axis.labelOffset = labelOffset;
				}


			} else { // doesn't have data
				for (n in ticks) {
					ticks[n].destroy();
					delete ticks[n];
				}
			}

			if (axisTitleOptions && axisTitleOptions.text && axisTitleOptions.enabled !== false) {
				if (!axis.axisTitle) {
					axis.axisTitle = renderer.text(
						axisTitleOptions.text,
						0,
						0,
						axisTitleOptions.useHTML
					)
					.attr({
						zIndex: 7,
						rotation: axisTitleOptions.rotation || 0,
						align:
							axisTitleOptions.textAlign ||
							{ low: 'left', middle: 'center', high: 'right' }[axisTitleOptions.align]
					})
					.addClass(PREFIX + this.coll.toLowerCase() + '-title')
					.css(axisTitleOptions.style)
					.add(axis.axisGroup);
					axis.axisTitle.isNew = true;
				}

				if (showAxis) {
					titleOffset = axis.axisTitle.getBBox()[horiz ? 'height' : 'width'];
					titleOffsetOption = axisTitleOptions.offset;
					titleMargin = defined(titleOffsetOption) ? 0 : pick(axisTitleOptions.margin, horiz ? 5 : 10);
				}

				// hide or show the title depending on whether showEmpty is set
				axis.axisTitle[showAxis ? 'show' : 'hide']();
			}

			// handle automatic or user set offset
			axis.offset = directionFactor * pick(options.offset, axisOffset[side]);

			lineHeightCorrection = side === 2 ? axis.tickBaseline : 0;
			labelOffsetPadded = labelOffset + titleMargin +
				(labelOffset && (directionFactor * (horiz ? pick(labelOptions.y, axis.tickBaseline + 8) : labelOptions.x) - lineHeightCorrection));
			axis.axisTitleMargin = pick(titleOffsetOption, labelOffsetPadded);

			axisOffset[side] = mathMax(
				axisOffset[side],
				axis.axisTitleMargin + titleOffset + directionFactor * axis.offset,
				labelOffsetPadded // #3027
			);
			clipOffset[invertedSide] = mathMax(clipOffset[invertedSide], mathFloor(options.lineWidth / 2) * 2);
		},

		/**
		 * Get the path for the axis line
		 */
		getLinePath: function (lineWidth) {
			var chart = this.chart,
				opposite = this.opposite,
				offset = this.offset,
				horiz = this.horiz,
				lineLeft = this.left + (opposite ? this.width : 0) + offset,
				lineTop = chart.chartHeight - this.bottom - (opposite ? this.height : 0) + offset;

			if (opposite) {
				lineWidth *= -1; // crispify the other way - #1480, #1687
			}

			return chart.renderer.crispLine([
					M,
					horiz ?
						this.left :
						lineLeft,
					horiz ?
						lineTop :
						this.top,
					L,
					horiz ?
						chart.chartWidth - this.right :
						lineLeft,
					horiz ?
						lineTop :
						chart.chartHeight - this.bottom
				], lineWidth);
		},

		/**
		 * Position the title
		 */
		getTitlePosition: function () {
			// compute anchor points for each of the title align options
			var horiz = this.horiz,
				axisLeft = this.left,
				axisTop = this.top,
				axisLength = this.len,
				axisTitleOptions = this.options.title,
				margin = horiz ? axisLeft : axisTop,
				opposite = this.opposite,
				offset = this.offset,
				fontSize = pInt(axisTitleOptions.style.fontSize || 12),

				// the position in the length direction of the axis
				alongAxis = {
					low: margin + (horiz ? 0 : axisLength),
					middle: margin + axisLength / 2,
					high: margin + (horiz ? axisLength : 0)
				}[axisTitleOptions.align],

				// the position in the perpendicular direction of the axis
				offAxis = (horiz ? axisTop + this.height : axisLeft) +
					(horiz ? 1 : -1) * // horizontal axis reverses the margin
					(opposite ? -1 : 1) * // so does opposite axes
					this.axisTitleMargin +
					(this.side === 2 ? fontSize : 0);

			return {
				x: horiz ?
					alongAxis :
					offAxis + (opposite ? this.width : 0) + offset +
						(axisTitleOptions.x || 0), // x
				y: horiz ?
					offAxis - (opposite ? this.height : 0) + offset :
					alongAxis + (axisTitleOptions.y || 0) // y
			};
		},

		/**
		 * Render the axis
		 */
		render: function () {
			var axis = this,
				horiz = axis.horiz,
				reversed = axis.reversed,
				chart = axis.chart,
				renderer = chart.renderer,
				options = axis.options,
				isLog = axis.isLog,
				isLinked = axis.isLinked,
				tickPositions = axis.tickPositions,
				sortedPositions,
				axisTitle = axis.axisTitle,			
				ticks = axis.ticks,
				minorTicks = axis.minorTicks,
				alternateBands = axis.alternateBands,
				stackLabelOptions = options.stackLabels,
				alternateGridColor = options.alternateGridColor,
				tickmarkOffset = axis.tickmarkOffset,
				lineWidth = options.lineWidth,
				linePath,
				hasRendered = chart.hasRendered,
				slideInTicks = hasRendered && defined(axis.oldMin) && !isNaN(axis.oldMin),
				hasData = axis.hasData,
				showAxis = axis.showAxis,
				from,
				overflow = options.labels.overflow,
				justifyLabels = axis.justifyLabels = horiz && overflow !== false,
				to;

			// Reset
			axis.labelEdge.length = 0;
			axis.justifyToPlot = overflow === 'justify';

			// Mark all elements inActive before we go over and mark the active ones
			each([ticks, minorTicks, alternateBands], function (coll) {
				var pos;
				for (pos in coll) {
					coll[pos].isActive = false;
				}
			});

			// If the series has data draw the ticks. Else only the line and title
			if (hasData || isLinked) {

				// minor ticks
				if (axis.minorTickInterval && !axis.categories) {
					each(axis.getMinorTickPositions(), function (pos) {
						if (!minorTicks[pos]) {
							minorTicks[pos] = new Tick(axis, pos, 'minor');
						}

						// render new ticks in old position
						if (slideInTicks && minorTicks[pos].isNew) {
							minorTicks[pos].render(null, true);
						}

						minorTicks[pos].render(null, false, 1);
					});
				}

				// Major ticks. Pull out the first item and render it last so that
				// we can get the position of the neighbour label. #808.
				if (tickPositions.length) { // #1300
					sortedPositions = tickPositions.slice();
					if ((horiz && reversed) || (!horiz && !reversed)) {
						sortedPositions.reverse();
					}
					if (justifyLabels) {
						sortedPositions = sortedPositions.slice(1).concat([sortedPositions[0]]);
					}
					each(sortedPositions, function (pos, i) {

						// Reorganize the indices
						if (justifyLabels) {
							i = (i === sortedPositions.length - 1) ? 0 : i + 1;
						}

						// linked axes need an extra check to find out if
						if (!isLinked || (pos >= axis.min && pos <= axis.max)) {

							if (!ticks[pos]) {
								ticks[pos] = new Tick(axis, pos);
							}

							// render new ticks in old position
							if (slideInTicks && ticks[pos].isNew) {
								ticks[pos].render(i, true, 0.1);
							}

							ticks[pos].render(i);
						}

					});
					// In a categorized axis, the tick marks are displayed between labels. So
					// we need to add a tick mark and grid line at the left edge of the X axis.
					if (tickmarkOffset && axis.min === 0) {
						if (!ticks[-1]) {
							ticks[-1] = new Tick(axis, -1, null, true);
						}
						ticks[-1].render(-1);
					}

				}

				// alternate grid color
				if (alternateGridColor) {
					each(tickPositions, function (pos, i) {
						if (i % 2 === 0 && pos < axis.max) {
							if (!alternateBands[pos]) {
								alternateBands[pos] = new Highcharts.PlotLineOrBand(axis);
							}
							from = pos + tickmarkOffset; // #949
							to = tickPositions[i + 1] !== UNDEFINED ? tickPositions[i + 1] + tickmarkOffset : axis.max;
							alternateBands[pos].options = {
								from: isLog ? lin2log(from) : from,
								to: isLog ? lin2log(to) : to,
								color: alternateGridColor
							};
							alternateBands[pos].render();
							alternateBands[pos].isActive = true;
						}
					});
				}

				// custom plot lines and bands
				if (!axis._addedPlotLB) { // only first time
					each((options.plotLines || []).concat(options.plotBands || []), function (plotLineOptions) {
						axis.addPlotBandOrLine(plotLineOptions);
					});
					axis._addedPlotLB = true;
				}

			} // end if hasData

			// Remove inactive ticks
			each([ticks, minorTicks, alternateBands], function (coll) {
				var pos,
					i,
					forDestruction = [],
					delay = globalAnimation ? globalAnimation.duration || 500 : 0,
					destroyInactiveItems = function () {
						i = forDestruction.length;
						while (i--) {
							// When resizing rapidly, the same items may be destroyed in different timeouts,
							// or the may be reactivated
							if (coll[forDestruction[i]] && !coll[forDestruction[i]].isActive) {
								coll[forDestruction[i]].destroy();
								delete coll[forDestruction[i]];
							}
						}

					};

				for (pos in coll) {

					if (!coll[pos].isActive) {
						// Render to zero opacity
						coll[pos].render(pos, false, 0);
						coll[pos].isActive = false;
						forDestruction.push(pos);
					}
				}

				// When the objects are finished fading out, destroy them
				if (coll === alternateBands || !chart.hasRendered || !delay) {
					destroyInactiveItems();
				} else if (delay) {
					setTimeout(destroyInactiveItems, delay);
				}
			});

			// Static items. As the axis group is cleared on subsequent calls
			// to render, these items are added outside the group.
			// axis line
			if (lineWidth) {
				linePath = axis.getLinePath(lineWidth);
				if (!axis.axisLine) {
					axis.axisLine = renderer.path(linePath)
						.attr({
							stroke: options.lineColor,
							'stroke-width': lineWidth,
							zIndex: 7
						})
						.add(axis.axisGroup);
				} else {
					axis.axisLine.animate({ d: linePath });
				}

				// show or hide the line depending on options.showEmpty
				axis.axisLine[showAxis ? 'show' : 'hide']();
			}

			if (axisTitle && showAxis) {

				axisTitle[axisTitle.isNew ? 'attr' : 'animate'](
					axis.getTitlePosition()
				);
				axisTitle.isNew = false;
			}

			// Stacked totals:
			if (stackLabelOptions && stackLabelOptions.enabled) {
				axis.renderStackTotals();
			}
			// End stacked totals

			axis.isDirty = false;
		},

		/**
		 * Redraw the axis to reflect changes in the data or axis extremes
		 */
		redraw: function () {
			
			// render the axis
			this.render();

			// move plot lines and bands
			each(this.plotLinesAndBands, function (plotLine) {
				plotLine.render();
			});

			// mark associated series as dirty and ready for redraw
			each(this.series, function (series) {
				series.isDirty = true;
			});

		},

		/**
		 * Destroys an Axis instance.
		 */
		destroy: function (keepEvents) {
			var axis = this,
				stacks = axis.stacks,
				stackKey,
				plotLinesAndBands = axis.plotLinesAndBands,
				i;

			// Remove the events
			if (!keepEvents) {
				removeEvent(axis);
			}

			// Destroy each stack total
			for (stackKey in stacks) {
				destroyObjectProperties(stacks[stackKey]);

				stacks[stackKey] = null;
			}

			// Destroy collections
			each([axis.ticks, axis.minorTicks, axis.alternateBands], function (coll) {
				destroyObjectProperties(coll);
			});
			i = plotLinesAndBands.length;
			while (i--) { // #1975
				plotLinesAndBands[i].destroy();
			}

			// Destroy local variables
			each(['stackTotalGroup', 'axisLine', 'axisTitle', 'axisGroup', 'cross', 'gridGroup', 'labelGroup'], function (prop) {
				if (axis[prop]) {
					axis[prop] = axis[prop].destroy();
				}
			});

			// Destroy crosshair
			if (this.cross) {
				this.cross.destroy();
			}
		},

		/**
		 * Draw the crosshair
		 */
		drawCrosshair: function (e, point) {
			if (!this.crosshair) { return; }// Do not draw crosshairs if you don't have too.

			if ((defined(point) || !pick(this.crosshair.snap, true)) === false) {
				this.hideCrosshair();
				return;
			}

			var path,
				options = this.crosshair,
				animation = options.animation,
				pos;

			// Get the path
			if (!pick(options.snap, true)) {
				pos = (this.horiz ? e.chartX - this.pos : this.len - e.chartY + this.pos);
			} else if (defined(point)) {
				/*jslint eqeq: true*/
				pos = (this.chart.inverted != this.horiz) ? point.plotX : this.len - point.plotY;
				/*jslint eqeq: false*/
			}

			if (this.isRadial) {
				path = this.getPlotLinePath(this.isXAxis ? point.x : pick(point.stackY, point.y));
			} else {
				path = this.getPlotLinePath(null, null, null, null, pos);
			}

			if (path === null) {
				this.hideCrosshair();
				return;
			}

			// Draw the cross
			if (this.cross) {
				this.cross
					.attr({ visibility: VISIBLE })[animation ? 'animate' : 'attr']({ d: path }, animation);
			} else {
				var attribs = {
					'stroke-width': options.width || 1,
					stroke: options.color || '#C0C0C0',
					zIndex: options.zIndex || 2
				};
				if (options.dashStyle) {
					attribs.dashstyle = options.dashStyle;
				}
				this.cross = this.chart.renderer.path(path).attr(attribs).add();
			}
		},

		/**
		 *	Hide the crosshair.
		 */
		hideCrosshair: function () {
			if (this.cross) {
				this.cross.hide();
			}
		}
	}; // end Axis

	extend(Axis.prototype, AxisPlotLineOrBandExtension);



	/**
	 * Set the tick positions to a time unit that makes sense, for example
	 * on the first of each month or on every Monday. Return an array
	 * with the time positions. Used in datetime axes as well as for grouping
	 * data on a datetime axis.
	 *
	 * @param {Object} normalizedInterval The interval in axis values (ms) and the count
	 * @param {Number} min The minimum in axis values
	 * @param {Number} max The maximum in axis values
	 * @param {Number} startOfWeek
	 */
	Axis.prototype.getTimeTicks = function (normalizedInterval, min, max, startOfWeek) {
		var tickPositions = [],
			i,
			higherRanks = {},
			useUTC = defaultOptions.global.useUTC,
			minYear, // used in months and years as a basis for Date.UTC()
			minDate = new Date(min - timezoneOffset),
			interval = normalizedInterval.unitRange,
			count = normalizedInterval.count;

		if (defined(min)) { // #1300
			if (interval >= timeUnits.second) { // second
				minDate.setMilliseconds(0);
				minDate.setSeconds(interval >= timeUnits.minute ? 0 :
					count * mathFloor(minDate.getSeconds() / count));
			}
		
			if (interval >= timeUnits.minute) { // minute
				minDate[setMinutes](interval >= timeUnits.hour ? 0 :
					count * mathFloor(minDate[getMinutes]() / count));
			}
		
			if (interval >= timeUnits.hour) { // hour
				minDate[setHours](interval >= timeUnits.day ? 0 :
					count * mathFloor(minDate[getHours]() / count));
			}
		
			if (interval >= timeUnits.day) { // day
				minDate[setDate](interval >= timeUnits.month ? 1 :
					count * mathFloor(minDate[getDate]() / count));
			}
		
			if (interval >= timeUnits.month) { // month
				minDate[setMonth](interval >= timeUnits.year ? 0 :
					count * mathFloor(minDate[getMonth]() / count));
				minYear = minDate[getFullYear]();
			}
		
			if (interval >= timeUnits.year) { // year
				minYear -= minYear % count;
				minDate[setFullYear](minYear);
			}
		
			// week is a special case that runs outside the hierarchy
			if (interval === timeUnits.week) {
				// get start of current week, independent of count
				minDate[setDate](minDate[getDate]() - minDate[getDay]() +
					pick(startOfWeek, 1));
			}
		
		
			// get tick positions
			i = 1;
			if (timezoneOffset) {
				minDate = new Date(minDate.getTime() + timezoneOffset);
			}
			minYear = minDate[getFullYear]();
			var time = minDate.getTime(),
				minMonth = minDate[getMonth](),
				minDateDate = minDate[getDate](),
				localTimezoneOffset = (timeUnits.day + 
						(useUTC ? timezoneOffset : minDate.getTimezoneOffset() * 60 * 1000)
					) % timeUnits.day; // #950, #3359
		
			// iterate and add tick positions at appropriate values
			while (time < max) {
				tickPositions.push(time);
		
				// if the interval is years, use Date.UTC to increase years
				if (interval === timeUnits.year) {
					time = makeTime(minYear + i * count, 0);
		
				// if the interval is months, use Date.UTC to increase months
				} else if (interval === timeUnits.month) {
					time = makeTime(minYear, minMonth + i * count);
		
				// if we're using global time, the interval is not fixed as it jumps
				// one hour at the DST crossover
				} else if (!useUTC && (interval === timeUnits.day || interval === timeUnits.week)) {
					time = makeTime(minYear, minMonth, minDateDate +
						i * count * (interval === timeUnits.day ? 1 : 7));
		
				// else, the interval is fixed and we use simple addition
				} else {
					time += interval * count;
				}
		
				i++;
			}
		
			// push the last time
			tickPositions.push(time);


			// mark new days if the time is dividible by day (#1649, #1760)
			each(grep(tickPositions, function (time) {
				return interval <= timeUnits.hour && time % timeUnits.day === localTimezoneOffset;
			}), function (time) {
				higherRanks[time] = 'day';
			});
		}


		// record information on the chosen unit - for dynamic label formatter
		tickPositions.info = extend(normalizedInterval, {
			higherRanks: higherRanks,
			totalRange: interval * count
		});

		return tickPositions;
	};

	/**
	 * Get a normalized tick interval for dates. Returns a configuration object with
	 * unit range (interval), count and name. Used to prepare data for getTimeTicks. 
	 * Previously this logic was part of getTimeTicks, but as getTimeTicks now runs
	 * of segments in stock charts, the normalizing logic was extracted in order to 
	 * prevent it for running over again for each segment having the same interval. 
	 * #662, #697.
	 */
	Axis.prototype.normalizeTimeTickInterval = function (tickInterval, unitsOption) {
		var units = unitsOption || [[
					'millisecond', // unit name
					[1, 2, 5, 10, 20, 25, 50, 100, 200, 500] // allowed multiples
				], [
					'second',
					[1, 2, 5, 10, 15, 30]
				], [
					'minute',
					[1, 2, 5, 10, 15, 30]
				], [
					'hour',
					[1, 2, 3, 4, 6, 8, 12]
				], [
					'day',
					[1, 2]
				], [
					'week',
					[1, 2]
				], [
					'month',
					[1, 2, 3, 4, 6]
				], [
					'year',
					null
				]],
			unit = units[units.length - 1], // default unit is years
			interval = timeUnits[unit[0]],
			multiples = unit[1],
			count,
			i;
			
		// loop through the units to find the one that best fits the tickInterval
		for (i = 0; i < units.length; i++) {
			unit = units[i];
			interval = timeUnits[unit[0]];
			multiples = unit[1];


			if (units[i + 1]) {
				// lessThan is in the middle between the highest multiple and the next unit.
				var lessThan = (interval * multiples[multiples.length - 1] +
							timeUnits[units[i + 1][0]]) / 2;

				// break and keep the current unit
				if (tickInterval <= lessThan) {
					break;
				}
			}
		}

		// prevent 2.5 years intervals, though 25, 250 etc. are allowed
		if (interval === timeUnits.year && tickInterval < 5 * interval) {
			multiples = [1, 2, 5];
		}

		// get the count
		count = normalizeTickInterval(
			tickInterval / interval, 
			multiples,
			unit[0] === 'year' ? mathMax(getMagnitude(tickInterval / interval), 1) : 1 // #1913, #2360
		);
		
		return {
			unitRange: interval,
			count: count,
			unitName: unit[0]
		};
	};

	/**
	 * The tooltip object
	 * @param {Object} chart The chart instance
	 * @param {Object} options Tooltip options
	 */
	var Tooltip = Highcharts.Tooltip = function () {
		this.init.apply(this, arguments);
	};

	Tooltip.prototype = {

		init: function (chart, options) {

			var borderWidth = options.borderWidth,
				style = options.style,
				padding = pInt(style.padding);

			// Save the chart and options
			this.chart = chart;
			this.options = options;

			// Keep track of the current series
			//this.currentSeries = UNDEFINED;

			// List of crosshairs
			this.crosshairs = [];

			// Current values of x and y when animating
			this.now = { x: 0, y: 0 };

			// The tooltip is initially hidden
			this.isHidden = true;


			// create the label
			this.label = chart.renderer.label('', 0, 0, options.shape || 'callout', null, null, options.useHTML, null, 'tooltip')
				.attr({
					padding: padding,
					fill: options.backgroundColor,
					'stroke-width': borderWidth,
					r: options.borderRadius,
					zIndex: 8
				})
				.css(style)
				.css({ padding: 0 }) // Remove it from VML, the padding is applied as an attribute instead (#1117)
				.add()
				.attr({ y: -9999 }); // #2301, #2657

			// When using canVG the shadow shows up as a gray circle
			// even if the tooltip is hidden.
			if (!useCanVG) {
				this.label.shadow(options.shadow);
			}

			// Public property for getting the shared state.
			this.shared = options.shared;
		},

		/**
		 * Destroy the tooltip and its elements.
		 */
		destroy: function () {
			// Destroy and clear local variables
			if (this.label) {
				this.label = this.label.destroy();
			}
			clearTimeout(this.hideTimer);
			clearTimeout(this.tooltipTimeout);
		},

		/**
		 * Provide a soft movement for the tooltip
		 *
		 * @param {Number} x
		 * @param {Number} y
		 * @private
		 */
		move: function (x, y, anchorX, anchorY) {
			var tooltip = this,
				now = tooltip.now,
				animate = tooltip.options.animation !== false && !tooltip.isHidden && 
					// When we get close to the target position, abort animation and land on the right place (#3056)
					(mathAbs(x - now.x) > 1 || mathAbs(y - now.y) > 1),
				skipAnchor = tooltip.followPointer || tooltip.len > 1;

			// Get intermediate values for animation
			extend(now, {
				x: animate ? (2 * now.x + x) / 3 : x,
				y: animate ? (now.y + y) / 2 : y,
				anchorX: skipAnchor ? UNDEFINED : animate ? (2 * now.anchorX + anchorX) / 3 : anchorX,
				anchorY: skipAnchor ? UNDEFINED : animate ? (now.anchorY + anchorY) / 2 : anchorY
			});

			// Move to the intermediate value
			tooltip.label.attr(now);

			
			// Run on next tick of the mouse tracker
			if (animate) {
			
				// Never allow two timeouts
				clearTimeout(this.tooltipTimeout);
				
				// Set the fixed interval ticking for the smooth tooltip
				this.tooltipTimeout = setTimeout(function () {
					// The interval function may still be running during destroy, so check that the chart is really there before calling.
					if (tooltip) {
						tooltip.move(x, y, anchorX, anchorY);
					}
				}, 32);
				
			}
		},

		/**
		 * Hide the tooltip
		 */
		hide: function (delay) {
			var tooltip = this,
				hoverPoints;
			
			clearTimeout(this.hideTimer); // disallow duplicate timers (#1728, #1766)
			if (!this.isHidden) {
				hoverPoints = this.chart.hoverPoints;

				this.hideTimer = setTimeout(function () {
					tooltip.label.fadeOut();
					tooltip.isHidden = true;
				}, pick(delay, this.options.hideDelay, 500));

				// hide previous hoverPoints and set new
				if (hoverPoints) {
					each(hoverPoints, function (point) {
						point.setState();
					});
				}

				this.chart.hoverPoints = null;
			}
		},
		
		/** 
		 * Extendable method to get the anchor position of the tooltip
		 * from a point or set of points
		 */
		getAnchor: function (points, mouseEvent) {
			var ret,
				chart = this.chart,
				inverted = chart.inverted,
				plotTop = chart.plotTop,
				plotX = 0,
				plotY = 0,
				yAxis;
			
			points = splat(points);
			
			// Pie uses a special tooltipPos
			ret = points[0].tooltipPos;
			
			// When tooltip follows mouse, relate the position to the mouse
			if (this.followPointer && mouseEvent) {
				if (mouseEvent.chartX === UNDEFINED) {
					mouseEvent = chart.pointer.normalize(mouseEvent);
				}
				ret = [
					mouseEvent.chartX - chart.plotLeft,
					mouseEvent.chartY - plotTop
				];
			}
			// When shared, use the average position
			if (!ret) {
				each(points, function (point) {
					yAxis = point.series.yAxis;
					plotX += point.plotX;
					plotY += (point.plotLow ? (point.plotLow + point.plotHigh) / 2 : point.plotY) +
						(!inverted && yAxis ? yAxis.top - plotTop : 0); // #1151
				});
				
				plotX /= points.length;
				plotY /= points.length;
				
				ret = [
					inverted ? chart.plotWidth - plotY : plotX,
					this.shared && !inverted && points.length > 1 && mouseEvent ? 
						mouseEvent.chartY - plotTop : // place shared tooltip next to the mouse (#424)
						inverted ? chart.plotHeight - plotX : plotY
				];
			}

			return map(ret, mathRound);
		},
		
		/**
		 * Place the tooltip in a chart without spilling over
		 * and not covering the point it self.
		 */
		getPosition: function (boxWidth, boxHeight, point) {
			
			var chart = this.chart,
				distance = this.distance,
				ret = {},
				swapped,
				first = ['y', chart.chartHeight, boxHeight, point.plotY + chart.plotTop],
				second = ['x', chart.chartWidth, boxWidth, point.plotX + chart.plotLeft],
				// The far side is right or bottom
				preferFarSide = point.ttBelow || (chart.inverted && !point.negative) || (!chart.inverted && point.negative),
				/**
				 * Handle the preferred dimension. When the preferred dimension is tooltip
				 * on top or bottom of the point, it will look for space there.
				 */
				firstDimension = function (dim, outerSize, innerSize, point) {
					var roomLeft = innerSize < point - distance,
						roomRight = point + distance + innerSize < outerSize,
						alignedLeft = point - distance - innerSize,
						alignedRight = point + distance;

					if (preferFarSide && roomRight) {
						ret[dim] = alignedRight;
					} else if (!preferFarSide && roomLeft) {
						ret[dim] = alignedLeft;
					} else if (roomLeft) {
						ret[dim] = alignedLeft;
					} else if (roomRight) {
						ret[dim] = alignedRight;
					} else {
						return false;
					}
				},
				/**
				 * Handle the secondary dimension. If the preferred dimension is tooltip
				 * on top or bottom of the point, the second dimension is to align the tooltip
				 * above the point, trying to align center but allowing left or right
				 * align within the chart box.
				 */
				secondDimension = function (dim, outerSize, innerSize, point) {
					// Too close to the edge, return false and swap dimensions
					if (point < distance || point > outerSize - distance) {
						return false;
					
					// Align left/top
					} else if (point < innerSize / 2) {
						ret[dim] = 1;
					// Align right/bottom
					} else if (point > outerSize - innerSize / 2) {
						ret[dim] = outerSize - innerSize - 2;
					// Align center
					} else {
						ret[dim] = point - innerSize / 2;
					}
				},
				/**
				 * Swap the dimensions 
				 */
				swap = function (count) {
					var temp = first;
					first = second;
					second = temp;
					swapped = count;
				},
				run = function () {
					if (firstDimension.apply(0, first) !== false) {
						if (secondDimension.apply(0, second) === false && !swapped) {
							swap(true);
							run();
						}
					} else if (!swapped) {
						swap(true);
						run();
					} else {
						ret.x = ret.y = 0;
					}
				};

			// Under these conditions, prefer the tooltip on the side of the point
			if (chart.inverted || this.len > 1) {
				swap();
			}
			run();

			return ret;
		
		},

		/**
		 * In case no user defined formatter is given, this will be used. Note that the context
		 * here is an object holding point, series, x, y etc.
		 */
		defaultFormatter: function (tooltip) {
			var items = this.points || splat(this),
				series = items[0].series,
				s;

			// build the header
			s = [tooltip.tooltipHeaderFormatter(items[0])];

			// build the values
			each(items, function (item) {
				series = item.series;
				s.push((series.tooltipFormatter && series.tooltipFormatter(item)) ||
					item.point.tooltipFormatter(series.tooltipOptions.pointFormat));
			});

			// footer
			s.push(tooltip.options.footerFormat || '');

			return s.join('');
		},

		/**
		 * Refresh the tooltip's text and position.
		 * @param {Object} point
		 */
		refresh: function (point, mouseEvent) {
			var tooltip = this,
				chart = tooltip.chart,
				label = tooltip.label,
				options = tooltip.options,
				x,
				y,
				anchor,
				textConfig = {},
				text,
				pointConfig = [],
				formatter = options.formatter || tooltip.defaultFormatter,
				hoverPoints = chart.hoverPoints,
				borderColor,
				shared = tooltip.shared,
				currentSeries;
				
			clearTimeout(this.hideTimer);
			
			// get the reference point coordinates (pie charts use tooltipPos)
			tooltip.followPointer = splat(point)[0].series.tooltipOptions.followPointer;
			anchor = tooltip.getAnchor(point, mouseEvent);
			x = anchor[0];
			y = anchor[1];

			// shared tooltip, array is sent over
			if (shared && !(point.series && point.series.noSharedTooltip)) {
				
				// hide previous hoverPoints and set new
				
				chart.hoverPoints = point;
				if (hoverPoints) {
					each(hoverPoints, function (point) {
						point.setState();
					});
				}

				each(point, function (item) {
					item.setState(HOVER_STATE);

					pointConfig.push(item.getLabelConfig());
				});

				textConfig = {
					x: point[0].category,
					y: point[0].y
				};
				textConfig.points = pointConfig;
				this.len = pointConfig.length;
				point = point[0];

			// single point tooltip
			} else {
				textConfig = point.getLabelConfig();
			}
			text = formatter.call(textConfig, tooltip);

			// register the current series
			currentSeries = point.series;
			this.distance = pick(currentSeries.tooltipOptions.distance, 16);

			// update the inner HTML
			if (text === false) {
				this.hide();
			} else {

				// show it
				if (tooltip.isHidden) {
					stop(label);
					label.attr('opacity', 1).show();
				}

				// update text
				label.attr({
					text: text
				});

				// set the stroke color of the box
				borderColor = options.borderColor || point.color || currentSeries.color || '#606060';
				label.attr({
					stroke: borderColor
				});
				
				tooltip.updatePosition({ plotX: x, plotY: y, negative: point.negative, ttBelow: point.ttBelow });
			
				this.isHidden = false;
			}
			fireEvent(chart, 'tooltipRefresh', {
					text: text,
					x: x + chart.plotLeft,
					y: y + chart.plotTop,
					borderColor: borderColor
				});
		},
		
		/**
		 * Find the new position and perform the move
		 */
		updatePosition: function (point) {
			var chart = this.chart,
				label = this.label, 
				pos = (this.options.positioner || this.getPosition).call(
					this,
					label.width,
					label.height,
					point
				);

			// do the move
			this.move(
				mathRound(pos.x), 
				mathRound(pos.y), 
				point.plotX + chart.plotLeft, 
				point.plotY + chart.plotTop
			);
		},


		/**
		 * Format the header of the tooltip
		 */
		tooltipHeaderFormatter: function (point) {
			var series = point.series,
				tooltipOptions = series.tooltipOptions,
				dateTimeLabelFormats = tooltipOptions.dateTimeLabelFormats,
				xDateFormat = tooltipOptions.xDateFormat,
				xAxis = series.xAxis,
				isDateTime = xAxis && xAxis.options.type === 'datetime' && isNumber(point.key),
				headerFormat = tooltipOptions.headerFormat,
				closestPointRange = xAxis && xAxis.closestPointRange,
				n;

			// Guess the best date format based on the closest point distance (#568)
			if (isDateTime && !xDateFormat) {
				if (closestPointRange) {
					for (n in timeUnits) {
						if (timeUnits[n] >= closestPointRange || 
								// If the point is placed every day at 23:59, we need to show
								// the minutes as well. This logic only works for time units less than 
								// a day, since all higher time units are dividable by those. #2637.
								(timeUnits[n] <= timeUnits.day && point.key % timeUnits[n] > 0)) {
							xDateFormat = dateTimeLabelFormats[n];
							break;
						}
					}
				} else {
					xDateFormat = dateTimeLabelFormats.day;
				}

				xDateFormat = xDateFormat || dateTimeLabelFormats.year; // #2546, 2581

			}

			// Insert the header date format if any
			if (isDateTime && xDateFormat) {
				headerFormat = headerFormat.replace('{point.key}', '{point.key:' + xDateFormat + '}');
			}

			return format(headerFormat, {
				point: point,
				series: series
			});
		}
	};



	var hoverChartIndex;

	// Global flag for touch support
	hasTouch = doc.documentElement.ontouchstart !== UNDEFINED;

	/**
	 * The mouse tracker object. All methods starting with "on" are primary DOM event handlers. 
	 * Subsequent methods should be named differently from what they are doing.
	 * @param {Object} chart The Chart instance
	 * @param {Object} options The root options object
	 */
	var Pointer = Highcharts.Pointer = function (chart, options) {
		this.init(chart, options);
	};

	Pointer.prototype = {
		/**
		 * Initialize Pointer
		 */
		init: function (chart, options) {
			
			var chartOptions = options.chart,
				chartEvents = chartOptions.events,
				zoomType = useCanVG ? '' : chartOptions.zoomType,
				inverted = chart.inverted,
				zoomX,
				zoomY;

			// Store references
			this.options = options;
			this.chart = chart;
			
			// Zoom status
			this.zoomX = zoomX = /x/.test(zoomType);
			this.zoomY = zoomY = /y/.test(zoomType);
			this.zoomHor = (zoomX && !inverted) || (zoomY && inverted);
			this.zoomVert = (zoomY && !inverted) || (zoomX && inverted);
			this.hasZoom = zoomX || zoomY;

			// Do we need to handle click on a touch device?
			this.runChartClick = chartEvents && !!chartEvents.click;

			this.pinchDown = [];
			this.lastValidTouch = {};

			if (Highcharts.Tooltip && options.tooltip.enabled) {
				chart.tooltip = new Tooltip(chart, options.tooltip);
				this.followTouchMove = options.tooltip.followTouchMove;
			}

			this.setDOMEvents();
		}, 

		/**
		 * Add crossbrowser support for chartX and chartY
		 * @param {Object} e The event object in standard browsers
		 */
		normalize: function (e, chartPosition) {
			var chartX,
				chartY,
				ePos;

			// common IE normalizing
			e = e || window.event;

			// Framework specific normalizing (#1165)
			e = washMouseEvent(e);

			// More IE normalizing, needs to go after washMouseEvent
			if (!e.target) {
				e.target = e.srcElement;
			}
			
			// iOS (#2757)
			ePos = e.touches ?  (e.touches.length ? e.touches.item(0) : e.changedTouches[0]) : e;

			// Get mouse position
			if (!chartPosition) {
				this.chartPosition = chartPosition = offset(this.chart.container);
			}

			// chartX and chartY
			if (ePos.pageX === UNDEFINED) { // IE < 9. #886.
				chartX = mathMax(e.x, e.clientX - chartPosition.left); // #2005, #2129: the second case is 
					// for IE10 quirks mode within framesets
				chartY = e.y;
			} else {
				chartX = ePos.pageX - chartPosition.left;
				chartY = ePos.pageY - chartPosition.top;
			}

			return extend(e, {
				chartX: mathRound(chartX),
				chartY: mathRound(chartY)
			});
		},

		/**
		 * Get the click position in terms of axis values.
		 *
		 * @param {Object} e A pointer event
		 */
		getCoordinates: function (e) {
			var coordinates = {
					xAxis: [],
					yAxis: []
				};

			each(this.chart.axes, function (axis) {
				coordinates[axis.isXAxis ? 'xAxis' : 'yAxis'].push({
					axis: axis,
					value: axis.toValue(e[axis.horiz ? 'chartX' : 'chartY'])
				});
			});
			return coordinates;
		},
		
		/**
		 * Return the index in the tooltipPoints array, corresponding to pixel position in 
		 * the plot area.
		 */
		getIndex: function (e) {
			var chart = this.chart;
			return chart.inverted ? 
				chart.plotHeight + chart.plotTop - e.chartY : 
				e.chartX - chart.plotLeft;
		},

		/**
		 * With line type charts with a single tracker, get the point closest to the mouse.
		 * Run Point.onMouseOver and display tooltip for the point or points.
		 */
		runPointActions: function (e) {
			var pointer = this,
				chart = pointer.chart,
				series = chart.series,
				tooltip = chart.tooltip,
				followPointer,
				point,
				points,
				hoverPoint = chart.hoverPoint,
				hoverSeries = chart.hoverSeries,
				i,
				j,
				distance = chart.chartWidth,
				index = pointer.getIndex(e),
				anchor;

			// shared tooltip
			if (tooltip && pointer.options.tooltip.shared && !(hoverSeries && hoverSeries.noSharedTooltip)) {
				points = [];

				// loop over all series and find the ones with points closest to the mouse
				i = series.length;
				for (j = 0; j < i; j++) {
					if (series[j].visible &&
							series[j].options.enableMouseTracking !== false &&
							!series[j].noSharedTooltip && series[j].singularTooltips !== true && series[j].tooltipPoints.length) {
						point = series[j].tooltipPoints[index];
						if (point && point.series) { // not a dummy point, #1544
							point._dist = mathAbs(index - point.clientX);
							distance = mathMin(distance, point._dist);
							points.push(point);
						}
					}
				}
				// remove furthest points
				i = points.length;
				while (i--) {
					if (points[i]._dist > distance) {
						points.splice(i, 1);
					}
				}
				// refresh the tooltip if necessary
				if (points.length && (points[0].clientX !== pointer.hoverX)) {
					tooltip.refresh(points, e);
					pointer.hoverX = points[0].clientX;
				}
			}

			// Separate tooltip and general mouse events
			followPointer = hoverSeries && hoverSeries.tooltipOptions.followPointer;
			if (hoverSeries && hoverSeries.tracker && !followPointer) { // #2584, #2830

				// get the point
				point = hoverSeries.tooltipPoints[index];

				// a new point is hovered, refresh the tooltip
				if (point && point !== hoverPoint) {

					// trigger the events
					point.onMouseOver(e);

				}
				
			} else if (tooltip && followPointer && !tooltip.isHidden) {
				anchor = tooltip.getAnchor([{}], e);
				tooltip.updatePosition({ plotX: anchor[0], plotY: anchor[1] });
			}

			// Start the event listener to pick up the tooltip 
			if (tooltip && !pointer._onDocumentMouseMove) {
				pointer._onDocumentMouseMove = function (e) {
					if (charts[hoverChartIndex]) {
						charts[hoverChartIndex].pointer.onDocumentMouseMove(e);
					}
				};
				addEvent(doc, 'mousemove', pointer._onDocumentMouseMove);
			}

			// Draw independent crosshairs
			each(chart.axes, function (axis) {
				axis.drawCrosshair(e, pick(point, hoverPoint));
			});
		},



		/**
		 * Reset the tracking by hiding the tooltip, the hover series state and the hover point
		 * 
		 * @param allowMove {Boolean} Instead of destroying the tooltip altogether, allow moving it if possible
		 */
		reset: function (allowMove, delay) {
			var pointer = this,
				chart = pointer.chart,
				hoverSeries = chart.hoverSeries,
				hoverPoint = chart.hoverPoint,
				tooltip = chart.tooltip,
				tooltipPoints = tooltip && tooltip.shared ? chart.hoverPoints : hoverPoint;
				
			// Narrow in allowMove
			allowMove = allowMove && tooltip && tooltipPoints;
				
			// Check if the points have moved outside the plot area, #1003
			if (allowMove && splat(tooltipPoints)[0].plotX === UNDEFINED) {
				allowMove = false;
			}	

			// Just move the tooltip, #349
			if (allowMove) {
				tooltip.refresh(tooltipPoints);
				if (hoverPoint) { // #2500
					hoverPoint.setState(hoverPoint.state, true);
				}

			// Full reset
			} else {

				if (hoverPoint) {
					hoverPoint.onMouseOut();
				}

				if (hoverSeries) {
					hoverSeries.onMouseOut();
				}

				if (tooltip) {
					tooltip.hide(delay);
				}

				if (pointer._onDocumentMouseMove) {
					removeEvent(doc, 'mousemove', pointer._onDocumentMouseMove);
					pointer._onDocumentMouseMove = null;
				}

				// Remove crosshairs
				each(chart.axes, function (axis) {
					axis.hideCrosshair();
				});
				
				pointer.hoverX = null;

			}
		},

		/**
		 * Scale series groups to a certain scale and translation
		 */
		scaleGroups: function (attribs, clip) {

			var chart = this.chart,
				seriesAttribs;

			// Scale each series
			each(chart.series, function (series) {
				seriesAttribs = attribs || series.getPlotBox(); // #1701
				if (series.xAxis && series.xAxis.zoomEnabled) {
					series.group.attr(seriesAttribs);
					if (series.markerGroup) {
						series.markerGroup.attr(seriesAttribs);
						series.markerGroup.clip(clip ? chart.clipRect : null);
					}
					if (series.dataLabelsGroup) {
						series.dataLabelsGroup.attr(seriesAttribs);
					}
				}
			});
			
			// Clip
			chart.clipRect.attr(clip || chart.clipBox);
		},

		/**
		 * Start a drag operation
		 */
		dragStart: function (e) {
			var chart = this.chart;

			// Record the start position
			chart.mouseIsDown = e.type;
			chart.cancelClick = false;
			chart.mouseDownX = this.mouseDownX = e.chartX;
			chart.mouseDownY = this.mouseDownY = e.chartY;
		},

		/**
		 * Perform a drag operation in response to a mousemove event while the mouse is down
		 */
		drag: function (e) {

			var chart = this.chart,
				chartOptions = chart.options.chart,
				chartX = e.chartX,
				chartY = e.chartY,
				zoomHor = this.zoomHor,
				zoomVert = this.zoomVert,
				plotLeft = chart.plotLeft,
				plotTop = chart.plotTop,
				plotWidth = chart.plotWidth,
				plotHeight = chart.plotHeight,
				clickedInside,
				size,
				mouseDownX = this.mouseDownX,
				mouseDownY = this.mouseDownY,
				panKey = chartOptions.panKey && e[chartOptions.panKey + 'Key'];

			// If the mouse is outside the plot area, adjust to cooordinates
			// inside to prevent the selection marker from going outside
			if (chartX < plotLeft) {
				chartX = plotLeft;
			} else if (chartX > plotLeft + plotWidth) {
				chartX = plotLeft + plotWidth;
			}

			if (chartY < plotTop) {
				chartY = plotTop;
			} else if (chartY > plotTop + plotHeight) {
				chartY = plotTop + plotHeight;
			}
			
			// determine if the mouse has moved more than 10px
			this.hasDragged = Math.sqrt(
				Math.pow(mouseDownX - chartX, 2) +
				Math.pow(mouseDownY - chartY, 2)
			);
			
			if (this.hasDragged > 10) {
				clickedInside = chart.isInsidePlot(mouseDownX - plotLeft, mouseDownY - plotTop);

				// make a selection
				if (chart.hasCartesianSeries && (this.zoomX || this.zoomY) && clickedInside && !panKey) {
					if (!this.selectionMarker) {
						this.selectionMarker = chart.renderer.rect(
							plotLeft,
							plotTop,
							zoomHor ? 1 : plotWidth,
							zoomVert ? 1 : plotHeight,
							0
						)
						.attr({
							fill: chartOptions.selectionMarkerFill || 'rgba(69,114,167,0.25)',
							zIndex: 7
						})
						.add();
					}
				}

				// adjust the width of the selection marker
				if (this.selectionMarker && zoomHor) {
					size = chartX - mouseDownX;
					this.selectionMarker.attr({
						width: mathAbs(size),
						x: (size > 0 ? 0 : size) + mouseDownX
					});
				}
				// adjust the height of the selection marker
				if (this.selectionMarker && zoomVert) {
					size = chartY - mouseDownY;
					this.selectionMarker.attr({
						height: mathAbs(size),
						y: (size > 0 ? 0 : size) + mouseDownY
					});
				}

				// panning
				if (clickedInside && !this.selectionMarker && chartOptions.panning) {
					chart.pan(e, chartOptions.panning);
				}
			}
		},

		/**
		 * On mouse up or touch end across the entire document, drop the selection.
		 */
		drop: function (e) {
			var chart = this.chart,
				hasPinched = this.hasPinched;

			if (this.selectionMarker) {
				var selectionData = {
						xAxis: [],
						yAxis: [],
						originalEvent: e.originalEvent || e
					},
					selectionBox = this.selectionMarker,
					selectionLeft = selectionBox.attr ? selectionBox.attr('x') : selectionBox.x,
					selectionTop = selectionBox.attr ? selectionBox.attr('y') : selectionBox.y,
					selectionWidth = selectionBox.attr ? selectionBox.attr('width') : selectionBox.width,
					selectionHeight = selectionBox.attr ? selectionBox.attr('height') : selectionBox.height,
					runZoom;

				// a selection has been made
				if (this.hasDragged || hasPinched) {

					// record each axis' min and max
					each(chart.axes, function (axis) {
						if (axis.zoomEnabled) {
							var horiz = axis.horiz,
								minPixelPadding = e.type === 'touchend' ? axis.minPixelPadding: 0, // #1207, #3075
								selectionMin = axis.toValue((horiz ? selectionLeft : selectionTop) + minPixelPadding),
								selectionMax = axis.toValue((horiz ? selectionLeft + selectionWidth : selectionTop + selectionHeight) - minPixelPadding);

							if (!isNaN(selectionMin) && !isNaN(selectionMax)) { // #859
								selectionData[axis.coll].push({
									axis: axis,
									min: mathMin(selectionMin, selectionMax), // for reversed axes,
									max: mathMax(selectionMin, selectionMax)
								});
								runZoom = true;
							}
						}
					});
					if (runZoom) {
						fireEvent(chart, 'selection', selectionData, function (args) { 
							chart.zoom(extend(args, hasPinched ? { animation: false } : null)); 
						});
					}

				}
				this.selectionMarker = this.selectionMarker.destroy();

				// Reset scaling preview
				if (hasPinched) {
					this.scaleGroups();
				}
			}

			// Reset all
			if (chart) { // it may be destroyed on mouse up - #877
				css(chart.container, { cursor: chart._cursor });
				chart.cancelClick = this.hasDragged > 10; // #370
				chart.mouseIsDown = this.hasDragged = this.hasPinched = false;
				this.pinchDown = [];
			}
		},

		onContainerMouseDown: function (e) {

			e = this.normalize(e);

			// issue #295, dragging not always working in Firefox
			if (e.preventDefault) {
				e.preventDefault();
			}
			
			this.dragStart(e);
		},

		

		onDocumentMouseUp: function (e) {
			if (charts[hoverChartIndex]) {
				charts[hoverChartIndex].pointer.drop(e);
			}
		},

		/**
		 * Special handler for mouse move that will hide the tooltip when the mouse leaves the plotarea.
		 * Issue #149 workaround. The mouseleave event does not always fire. 
		 */
		onDocumentMouseMove: function (e) {
			var chart = this.chart,
				chartPosition = this.chartPosition,
				hoverSeries = chart.hoverSeries;

			e = this.normalize(e, chartPosition);

			// If we're outside, hide the tooltip
			if (chartPosition && hoverSeries && !this.inClass(e.target, 'highcharts-tracker') &&
					!chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop)) {
				this.reset();
			}
		},

		/**
		 * When mouse leaves the container, hide the tooltip.
		 */
		onContainerMouseLeave: function () {
			var chart = charts[hoverChartIndex];
			if (chart) {
				chart.pointer.reset();
				chart.pointer.chartPosition = null; // also reset the chart position, used in #149 fix
			}
		},

		// The mousemove, touchmove and touchstart event handler
		onContainerMouseMove: function (e) {

			var chart = this.chart;

			hoverChartIndex = chart.index;

			e = this.normalize(e);		
			e.returnValue = false; // #2251, #3224
			
			if (chart.mouseIsDown === 'mousedown') {
				this.drag(e);
			} 
			
			// Show the tooltip and run mouse over events (#977)
			if ((this.inClass(e.target, 'highcharts-tracker') || 
					chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop)) && !chart.openMenu) {
				this.runPointActions(e);
			}
		},

		/**
		 * Utility to detect whether an element has, or has a parent with, a specific
		 * class name. Used on detection of tracker objects and on deciding whether
		 * hovering the tooltip should cause the active series to mouse out.
		 */
		inClass: function (element, className) {
			var elemClassName;
			while (element) {
				elemClassName = attr(element, 'class');
				if (elemClassName) {
					if (elemClassName.indexOf(className) !== -1) {
						return true;
					} else if (elemClassName.indexOf(PREFIX + 'container') !== -1) {
						return false;
					}
				}
				element = element.parentNode;
			}		
		},

		onTrackerMouseOut: function (e) {
			var series = this.chart.hoverSeries,
				relatedTarget = e.relatedTarget || e.toElement,
				relatedSeries = relatedTarget && relatedTarget.point && relatedTarget.point.series; // #2499
			
			if (series && !series.options.stickyTracking && !this.inClass(relatedTarget, PREFIX + 'tooltip') &&
					relatedSeries !== series) {
				series.onMouseOut();
			}
		},

		onContainerClick: function (e) {
			var chart = this.chart,
				hoverPoint = chart.hoverPoint, 
				plotLeft = chart.plotLeft,
				plotTop = chart.plotTop;
			
			e = this.normalize(e);
			e.cancelBubble = true; // IE specific

			if (!chart.cancelClick) {
				
				// On tracker click, fire the series and point events. #783, #1583
				if (hoverPoint && this.inClass(e.target, PREFIX + 'tracker')) {

					// the series click event
					fireEvent(hoverPoint.series, 'click', extend(e, {
						point: hoverPoint
					}));

					// the point click event
					if (chart.hoverPoint) { // it may be destroyed (#1844)
						hoverPoint.firePointEvent('click', e);
					}

				// When clicking outside a tracker, fire a chart event
				} else {
					extend(e, this.getCoordinates(e));

					// fire a click event in the chart
					if (chart.isInsidePlot(e.chartX - plotLeft, e.chartY - plotTop)) {
						fireEvent(chart, 'click', e);
					}
				}


			}
		},

		/**
		 * Set the JS DOM events on the container and document. This method should contain
		 * a one-to-one assignment between methods and their handlers. Any advanced logic should
		 * be moved to the handler reflecting the event's name.
		 */
		setDOMEvents: function () {

			var pointer = this,
				container = pointer.chart.container;

			container.onmousedown = function (e) {
				pointer.onContainerMouseDown(e);
			};
			container.onmousemove = function (e) {
				pointer.onContainerMouseMove(e);
			};
			container.onclick = function (e) {
				pointer.onContainerClick(e);
			};
			addEvent(container, 'mouseleave', pointer.onContainerMouseLeave);
			if (chartCount === 1) {
				addEvent(doc, 'mouseup', pointer.onDocumentMouseUp);
			}
			if (hasTouch) {
				container.ontouchstart = function (e) {
					pointer.onContainerTouchStart(e);
				};
				container.ontouchmove = function (e) {
					pointer.onContainerTouchMove(e);
				};
				if (chartCount === 1) {
					addEvent(doc, 'touchend', pointer.onDocumentTouchEnd);
				}
			}
			
		},

		/**
		 * Destroys the Pointer object and disconnects DOM events.
		 */
		destroy: function () {
			var prop;

			removeEvent(this.chart.container, 'mouseleave', this.onContainerMouseLeave);
			if (!chartCount) {
				removeEvent(doc, 'mouseup', this.onDocumentMouseUp);
				removeEvent(doc, 'touchend', this.onDocumentTouchEnd);
			}

			// memory and CPU leak
			clearInterval(this.tooltipTimeout);

			for (prop in this) {
				this[prop] = null;
			}
		}
	};




	/* Support for touch devices */
	extend(Highcharts.Pointer.prototype, {

		/**
		 * Run translation operations
		 */
		pinchTranslate: function (pinchDown, touches, transform, selectionMarker, clip, lastValidTouch) {
			if (this.zoomHor || this.pinchHor) {
				this.pinchTranslateDirection(true, pinchDown, touches, transform, selectionMarker, clip, lastValidTouch);
			}
			if (this.zoomVert || this.pinchVert) {
				this.pinchTranslateDirection(false, pinchDown, touches, transform, selectionMarker, clip, lastValidTouch);
			}
		},

		/**
		 * Run translation operations for each direction (horizontal and vertical) independently
		 */
		pinchTranslateDirection: function (horiz, pinchDown, touches, transform, selectionMarker, clip, lastValidTouch, forcedScale) {
			var chart = this.chart,
				xy = horiz ? 'x' : 'y',
				XY = horiz ? 'X' : 'Y',
				sChartXY = 'chart' + XY,
				wh = horiz ? 'width' : 'height',
				plotLeftTop = chart['plot' + (horiz ? 'Left' : 'Top')],
				selectionWH,
				selectionXY,
				clipXY,
				scale = forcedScale || 1,
				inverted = chart.inverted,
				bounds = chart.bounds[horiz ? 'h' : 'v'],
				singleTouch = pinchDown.length === 1,
				touch0Start = pinchDown[0][sChartXY],
				touch0Now = touches[0][sChartXY],
				touch1Start = !singleTouch && pinchDown[1][sChartXY],
				touch1Now = !singleTouch && touches[1][sChartXY],
				outOfBounds,
				transformScale,
				scaleKey,
				setScale = function () {
					if (!singleTouch && mathAbs(touch0Start - touch1Start) > 20) { // Don't zoom if fingers are too close on this axis
						scale = forcedScale || mathAbs(touch0Now - touch1Now) / mathAbs(touch0Start - touch1Start); 
					}
					
					clipXY = ((plotLeftTop - touch0Now) / scale) + touch0Start;
					selectionWH = chart['plot' + (horiz ? 'Width' : 'Height')] / scale;
				};

			// Set the scale, first pass
			setScale();

			selectionXY = clipXY; // the clip position (x or y) is altered if out of bounds, the selection position is not

			// Out of bounds
			if (selectionXY < bounds.min) {
				selectionXY = bounds.min;
				outOfBounds = true;
			} else if (selectionXY + selectionWH > bounds.max) {
				selectionXY = bounds.max - selectionWH;
				outOfBounds = true;
			}
			
			// Is the chart dragged off its bounds, determined by dataMin and dataMax?
			if (outOfBounds) {

				// Modify the touchNow position in order to create an elastic drag movement. This indicates
				// to the user that the chart is responsive but can't be dragged further.
				touch0Now -= 0.8 * (touch0Now - lastValidTouch[xy][0]);
				if (!singleTouch) {
					touch1Now -= 0.8 * (touch1Now - lastValidTouch[xy][1]);
				}

				// Set the scale, second pass to adapt to the modified touchNow positions
				setScale();

			} else {
				lastValidTouch[xy] = [touch0Now, touch1Now];
			}

			// Set geometry for clipping, selection and transformation
			if (!inverted) { // TODO: implement clipping for inverted charts
				clip[xy] = clipXY - plotLeftTop;
				clip[wh] = selectionWH;
			}
			scaleKey = inverted ? (horiz ? 'scaleY' : 'scaleX') : 'scale' + XY;
			transformScale = inverted ? 1 / scale : scale;

			selectionMarker[wh] = selectionWH;
			selectionMarker[xy] = selectionXY;
			transform[scaleKey] = scale;
			transform['translate' + XY] = (transformScale * plotLeftTop) + (touch0Now - (transformScale * touch0Start));
		},
		
		/**
		 * Handle touch events with two touches
		 */
		pinch: function (e) {

			var self = this,
				chart = self.chart,
				pinchDown = self.pinchDown,
				followTouchMove = self.followTouchMove,
				touches = e.touches,
				touchesLength = touches.length,
				lastValidTouch = self.lastValidTouch,
				hasZoom = self.hasZoom,
				selectionMarker = self.selectionMarker,
				transform = {},
				fireClickEvent = touchesLength === 1 && ((self.inClass(e.target, PREFIX + 'tracker') && 
					chart.runTrackerClick) || self.runChartClick),
				clip = {};

			// On touch devices, only proceed to trigger click if a handler is defined
			if ((hasZoom || followTouchMove) && !fireClickEvent) {
				e.preventDefault();
			}
			
			// Normalize each touch
			map(touches, function (e) {
				return self.normalize(e);
			});
			
			// Register the touch start position
			if (e.type === 'touchstart') {
				each(touches, function (e, i) {
					pinchDown[i] = { chartX: e.chartX, chartY: e.chartY };
				});
				lastValidTouch.x = [pinchDown[0].chartX, pinchDown[1] && pinchDown[1].chartX];
				lastValidTouch.y = [pinchDown[0].chartY, pinchDown[1] && pinchDown[1].chartY];

				// Identify the data bounds in pixels
				each(chart.axes, function (axis) {
					if (axis.zoomEnabled) {
						var bounds = chart.bounds[axis.horiz ? 'h' : 'v'],
							minPixelPadding = axis.minPixelPadding,
							min = axis.toPixels(pick(axis.options.min, axis.dataMin)),
							max = axis.toPixels(pick(axis.options.max, axis.dataMax)),
							absMin = mathMin(min, max),
							absMax = mathMax(min, max);

						// Store the bounds for use in the touchmove handler
						bounds.min = mathMin(axis.pos, absMin - minPixelPadding);
						bounds.max = mathMax(axis.pos + axis.len, absMax + minPixelPadding);
					}
				});
				self.res = true; // reset on next move
			
			// Event type is touchmove, handle panning and pinching
			} else if (pinchDown.length) { // can be 0 when releasing, if touchend fires first
				

				// Set the marker
				if (!selectionMarker) {
					self.selectionMarker = selectionMarker = extend({
						destroy: noop
					}, chart.plotBox);
				}
				
				self.pinchTranslate(pinchDown, touches, transform, selectionMarker, clip, lastValidTouch);

				self.hasPinched = hasZoom;

				// Scale and translate the groups to provide visual feedback during pinching
				self.scaleGroups(transform, clip);
				
				// Optionally move the tooltip on touchmove
				if (!hasZoom && followTouchMove && touchesLength === 1) {
					this.runPointActions(self.normalize(e));
				} else if (self.res) {
					self.res = false;
					this.reset(false, 0);
				}
			}
		},

		onContainerTouchStart: function (e) {
			var chart = this.chart;

			hoverChartIndex = chart.index;

			if (e.touches.length === 1) {

				e = this.normalize(e);

				if (chart.isInsidePlot(e.chartX - chart.plotLeft, e.chartY - chart.plotTop)) {

					// Run mouse events and display tooltip etc
					this.runPointActions(e);

					this.pinch(e);

				} else {
					// Hide the tooltip on touching outside the plot area (#1203)
					this.reset();
				}

			} else if (e.touches.length === 2) {
				this.pinch(e);
			}   
		},

		onContainerTouchMove: function (e) {
			if (e.touches.length === 1 || e.touches.length === 2) {
				this.pinch(e);
			}
		},

		onDocumentTouchEnd: function (e) {
			if (charts[hoverChartIndex]) {
				charts[hoverChartIndex].pointer.drop(e);
			}
		}

	});


	/**
	 * The overview of the chart's series
	 */
	var Legend = Highcharts.Legend = function (chart, options) {
		this.init(chart, options);
	};

	Legend.prototype = {
		
		/**
		 * Initialize the legend
		 */
		init: function (chart, options) {
			
			var legend = this,
				itemStyle = options.itemStyle,
				padding = pick(options.padding, 8),
				itemMarginTop = options.itemMarginTop || 0;
		
			this.options = options;

			if (!options.enabled) {
				return;
			}
		
			legend.itemStyle = itemStyle;
			legend.itemHiddenStyle = merge(itemStyle, options.itemHiddenStyle);
			legend.itemMarginTop = itemMarginTop;
			legend.padding = padding;
			legend.initialItemX = padding;
			legend.initialItemY = padding - 5; // 5 is the number of pixels above the text
			legend.maxItemWidth = 0;
			legend.chart = chart;
			legend.itemHeight = 0;
			legend.lastLineHeight = 0;
			legend.symbolWidth = pick(options.symbolWidth, 16);
			legend.pages = [];


			// Render it
			legend.render();

			// move checkboxes
			addEvent(legend.chart, 'endResize', function () { 
				legend.positionCheckboxes();
			});

		},

		/**
		 * Set the colors for the legend item
		 * @param {Object} item A Series or Point instance
		 * @param {Object} visible Dimmed or colored
		 */
		colorizeItem: function (item, visible) {
			var legend = this,
				options = legend.options,
				legendItem = item.legendItem,
				legendLine = item.legendLine,
				legendSymbol = item.legendSymbol,
				hiddenColor = legend.itemHiddenStyle.color,
				textColor = visible ? options.itemStyle.color : hiddenColor,
				symbolColor = visible ? (item.legendColor || item.color || '#CCC') : hiddenColor,
				markerOptions = item.options && item.options.marker,
				symbolAttr = { fill: symbolColor },
				key,
				val;
			
			if (legendItem) {
				legendItem.css({ fill: textColor, color: textColor }); // color for #1553, oldIE
			}
			if (legendLine) {
				legendLine.attr({ stroke: symbolColor });
			}
			
			if (legendSymbol) {
				
				// Apply marker options
				if (markerOptions && legendSymbol.isMarker) { // #585
					symbolAttr.stroke = symbolColor;
					markerOptions = item.convertAttribs(markerOptions);
					for (key in markerOptions) {
						val = markerOptions[key];
						if (val !== UNDEFINED) {
							symbolAttr[key] = val;
						}
					}
				}

				legendSymbol.attr(symbolAttr);
			}
		},

		/**
		 * Position the legend item
		 * @param {Object} item A Series or Point instance
		 */
		positionItem: function (item) {
			var legend = this,
				options = legend.options,
				symbolPadding = options.symbolPadding,
				ltr = !options.rtl,
				legendItemPos = item._legendItemPos,
				itemX = legendItemPos[0],
				itemY = legendItemPos[1],
				checkbox = item.checkbox;

			if (item.legendGroup) {
				item.legendGroup.translate(
					ltr ? itemX : legend.legendWidth - itemX - 2 * symbolPadding - 4,
					itemY
				);
			}

			if (checkbox) {
				checkbox.x = itemX;
				checkbox.y = itemY;
			}
		},

		/**
		 * Destroy a single legend item
		 * @param {Object} item The series or point
		 */
		destroyItem: function (item) {
			var checkbox = item.checkbox;

			// destroy SVG elements
			each(['legendItem', 'legendLine', 'legendSymbol', 'legendGroup'], function (key) {
				if (item[key]) {
					item[key] = item[key].destroy();
				}
			});

			if (checkbox) {
				discardElement(item.checkbox);
			}
		},

		/**
		 * Destroys the legend.
		 */
		destroy: function () {
			var legend = this,
				legendGroup = legend.group,
				box = legend.box;

			if (box) {
				legend.box = box.destroy();
			}

			if (legendGroup) {
				legend.group = legendGroup.destroy();
			}
		},

		/**
		 * Position the checkboxes after the width is determined
		 */
		positionCheckboxes: function (scrollOffset) {
			var alignAttr = this.group.alignAttr,
				translateY,
				clipHeight = this.clipHeight || this.legendHeight;

			if (alignAttr) {
				translateY = alignAttr.translateY;
				each(this.allItems, function (item) {
					var checkbox = item.checkbox,
						top;
					
					if (checkbox) {
						top = (translateY + checkbox.y + (scrollOffset || 0) + 3);
						css(checkbox, {
							left: (alignAttr.translateX + item.checkboxOffset + checkbox.x - 20) + PX,
							top: top + PX,
							display: top > translateY - 6 && top < translateY + clipHeight - 6 ? '' : NONE
						});
					}
				});
			}
		},
		
		/**
		 * Render the legend title on top of the legend
		 */
		renderTitle: function () {
			var options = this.options,
				padding = this.padding,
				titleOptions = options.title,
				titleHeight = 0,
				bBox;
			
			if (titleOptions.text) {
				if (!this.title) {
					this.title = this.chart.renderer.label(titleOptions.text, padding - 3, padding - 4, null, null, null, null, null, 'legend-title')
						.attr({ zIndex: 1 })
						.css(titleOptions.style)
						.add(this.group);
				}
				bBox = this.title.getBBox();
				titleHeight = bBox.height;
				this.offsetWidth = bBox.width; // #1717
				this.contentGroup.attr({ translateY: titleHeight });
			}
			this.titleHeight = titleHeight;
		},

		/**
		 * Render a single specific legend item
		 * @param {Object} item A series or point
		 */
		renderItem: function (item) {
			var legend = this,
				chart = legend.chart,
				renderer = chart.renderer,
				options = legend.options,
				horizontal = options.layout === 'horizontal',
				symbolWidth = legend.symbolWidth,
				symbolPadding = options.symbolPadding,
				itemStyle = legend.itemStyle,
				itemHiddenStyle = legend.itemHiddenStyle,
				padding = legend.padding,
				itemDistance = horizontal ? pick(options.itemDistance, 20) : 0,
				ltr = !options.rtl,
				itemHeight,
				widthOption = options.width,
				itemMarginBottom = options.itemMarginBottom || 0,
				itemMarginTop = legend.itemMarginTop,
				initialItemX = legend.initialItemX,
				bBox,
				itemWidth,
				li = item.legendItem,
				series = item.series && item.series.drawLegendSymbol ? item.series : item,
				seriesOptions = series.options,
				showCheckbox = legend.createCheckboxForItem && seriesOptions && seriesOptions.showCheckbox,
				useHTML = options.useHTML;

			if (!li) { // generate it once, later move it

				// Generate the group box
				// A group to hold the symbol and text. Text is to be appended in Legend class.
				item.legendGroup = renderer.g('legend-item')
					.attr({ zIndex: 1 })
					.add(legend.scrollGroup);

				// Generate the list item text and add it to the group
				item.legendItem = li = renderer.text(
						options.labelFormat ? format(options.labelFormat, item) : options.labelFormatter.call(item),
						ltr ? symbolWidth + symbolPadding : -symbolPadding,
						legend.baseline || 0,
						useHTML
					)
					.css(merge(item.visible ? itemStyle : itemHiddenStyle)) // merge to prevent modifying original (#1021)
					.attr({
						align: ltr ? 'left' : 'right',
						zIndex: 2
					})
					.add(item.legendGroup);

				// Get the baseline for the first item - the font size is equal for all
				if (!legend.baseline) {
					legend.baseline = renderer.fontMetrics(itemStyle.fontSize, li).f + 3 + itemMarginTop;
					li.attr('y', legend.baseline);
				}

				// Draw the legend symbol inside the group box
				series.drawLegendSymbol(legend, item);

				if (legend.setItemEvents) {
					legend.setItemEvents(item, li, useHTML, itemStyle, itemHiddenStyle);
				}			

				// Colorize the items
				legend.colorizeItem(item, item.visible);

				// add the HTML checkbox on top
				if (showCheckbox) {
					legend.createCheckboxForItem(item);				
				}
			}

			// calculate the positions for the next line
			bBox = li.getBBox();

			itemWidth = item.checkboxOffset = 
				options.itemWidth || 
				item.legendItemWidth || 
				symbolWidth + symbolPadding + bBox.width + itemDistance + (showCheckbox ? 20 : 0);
			legend.itemHeight = itemHeight = mathRound(item.legendItemHeight || bBox.height);

			// if the item exceeds the width, start a new line
			if (horizontal && legend.itemX - initialItemX + itemWidth >
					(widthOption || (chart.chartWidth - 2 * padding - initialItemX - options.x))) {
				legend.itemX = initialItemX;
				legend.itemY += itemMarginTop + legend.lastLineHeight + itemMarginBottom;
				legend.lastLineHeight = 0; // reset for next line
			}

			// If the item exceeds the height, start a new column
			/*if (!horizontal && legend.itemY + options.y + itemHeight > chart.chartHeight - spacingTop - spacingBottom) {
				legend.itemY = legend.initialItemY;
				legend.itemX += legend.maxItemWidth;
				legend.maxItemWidth = 0;
			}*/

			// Set the edge positions
			legend.maxItemWidth = mathMax(legend.maxItemWidth, itemWidth);
			legend.lastItemY = itemMarginTop + legend.itemY + itemMarginBottom;
			legend.lastLineHeight = mathMax(itemHeight, legend.lastLineHeight); // #915

			// cache the position of the newly generated or reordered items
			item._legendItemPos = [legend.itemX, legend.itemY];

			// advance
			if (horizontal) {
				legend.itemX += itemWidth;

			} else {
				legend.itemY += itemMarginTop + itemHeight + itemMarginBottom;
				legend.lastLineHeight = itemHeight;
			}

			// the width of the widest item
			legend.offsetWidth = widthOption || mathMax(
				(horizontal ? legend.itemX - initialItemX - itemDistance : itemWidth) + padding,
				legend.offsetWidth
			);
		},

		/**
		 * Get all items, which is one item per series for normal series and one item per point
		 * for pie series.
		 */
		getAllItems: function () {
			var allItems = [];
			each(this.chart.series, function (series) {
				var seriesOptions = series.options;

				// Handle showInLegend. If the series is linked to another series, defaults to false.
				if (!pick(seriesOptions.showInLegend, !defined(seriesOptions.linkedTo) ? UNDEFINED : false, true)) {
					return;
				}

				// use points or series for the legend item depending on legendType
				allItems = allItems.concat(
						series.legendItems ||
						(seriesOptions.legendType === 'point' ?
								series.data :
								series)
				);
			});
			return allItems;
		},

		/**
		 * Render the legend. This method can be called both before and after
		 * chart.render. If called after, it will only rearrange items instead
		 * of creating new ones.
		 */
		render: function () {
			var legend = this,
				chart = legend.chart,
				renderer = chart.renderer,
				legendGroup = legend.group,
				allItems,
				display,
				legendWidth,
				legendHeight,
				box = legend.box,
				options = legend.options,
				padding = legend.padding,
				legendBorderWidth = options.borderWidth,
				legendBackgroundColor = options.backgroundColor;

			legend.itemX = legend.initialItemX;
			legend.itemY = legend.initialItemY;
			legend.offsetWidth = 0;
			legend.lastItemY = 0;

			if (!legendGroup) {
				legend.group = legendGroup = renderer.g('legend')
					.attr({ zIndex: 7 }) 
					.add();
				legend.contentGroup = renderer.g()
					.attr({ zIndex: 1 }) // above background
					.add(legendGroup);
				legend.scrollGroup = renderer.g()
					.add(legend.contentGroup);
			}
			
			legend.renderTitle();

			// add each series or point
			allItems = legend.getAllItems();

			// sort by legendIndex
			stableSort(allItems, function (a, b) {
				return ((a.options && a.options.legendIndex) || 0) - ((b.options && b.options.legendIndex) || 0);
			});

			// reversed legend
			if (options.reversed) {
				allItems.reverse();
			}

			legend.allItems = allItems;
			legend.display = display = !!allItems.length;

			// render the items
			each(allItems, function (item) {
				legend.renderItem(item); 
			});

			// Draw the border
			legendWidth = options.width || legend.offsetWidth;
			legendHeight = legend.lastItemY + legend.lastLineHeight + legend.titleHeight;
			
			
			legendHeight = legend.handleOverflow(legendHeight);

			if (legendBorderWidth || legendBackgroundColor) {
				legendWidth += padding;
				legendHeight += padding;

				if (!box) {
					legend.box = box = renderer.rect(
						0,
						0,
						legendWidth,
						legendHeight,
						options.borderRadius,
						legendBorderWidth || 0
					).attr({
						stroke: options.borderColor,
						'stroke-width': legendBorderWidth || 0,
						fill: legendBackgroundColor || NONE
					})
					.add(legendGroup)
					.shadow(options.shadow);
					box.isNew = true;

				} else if (legendWidth > 0 && legendHeight > 0) {
					box[box.isNew ? 'attr' : 'animate'](
						box.crisp({ width: legendWidth, height: legendHeight })
					);
					box.isNew = false;
				}

				// hide the border if no items
				box[display ? 'show' : 'hide']();
			}
			
			legend.legendWidth = legendWidth;
			legend.legendHeight = legendHeight;

			// Now that the legend width and height are established, put the items in the 
			// final position
			each(allItems, function (item) {
				legend.positionItem(item);
			});

			// 1.x compatibility: positioning based on style
			/*var props = ['left', 'right', 'top', 'bottom'],
				prop,
				i = 4;
			while (i--) {
				prop = props[i];
				if (options.style[prop] && options.style[prop] !== 'auto') {
					options[i < 2 ? 'align' : 'verticalAlign'] = prop;
					options[i < 2 ? 'x' : 'y'] = pInt(options.style[prop]) * (i % 2 ? -1 : 1);
				}
			}*/

			if (display) {
				legendGroup.align(extend({
					width: legendWidth,
					height: legendHeight
				}, options), true, 'spacingBox');
			}

			if (!chart.isResizing) {
				this.positionCheckboxes();
			}
		},
		
		/**
		 * Set up the overflow handling by adding navigation with up and down arrows below the
		 * legend.
		 */
		handleOverflow: function (legendHeight) {
			var legend = this,
				chart = this.chart,
				renderer = chart.renderer,
				options = this.options,
				optionsY = options.y,
				alignTop = options.verticalAlign === 'top',
				spaceHeight = chart.spacingBox.height + (alignTop ? -optionsY : optionsY) - this.padding,
				maxHeight = options.maxHeight,
				clipHeight,
				clipRect = this.clipRect,
				navOptions = options.navigation,
				animation = pick(navOptions.animation, true),
				arrowSize = navOptions.arrowSize || 12,
				nav = this.nav,
				pages = this.pages,
				lastY,
				allItems = this.allItems;
				
			// Adjust the height
			if (options.layout === 'horizontal') {
				spaceHeight /= 2;
			}
			if (maxHeight) {
				spaceHeight = mathMin(spaceHeight, maxHeight);
			}
			
			// Reset the legend height and adjust the clipping rectangle
			pages.length = 0;
			if (legendHeight > spaceHeight && !options.useHTML) {

				this.clipHeight = clipHeight = mathMax(spaceHeight - 20 - this.titleHeight - this.padding, 0);
				this.currentPage = pick(this.currentPage, 1);
				this.fullHeight = legendHeight;
				
				// Fill pages with Y positions so that the top of each a legend item defines
				// the scroll top for each page (#2098)
				each(allItems, function (item, i) {
					var y = item._legendItemPos[1],
						h = mathRound(item.legendItem.getBBox().height),
						len = pages.length;
					
					if (!len || (y - pages[len - 1] > clipHeight && (lastY || y) !== pages[len - 1])) {
						pages.push(lastY || y);
						len++;
					}
					
					if (i === allItems.length - 1 && y + h - pages[len - 1] > clipHeight) {
						pages.push(y);
					}
					if (y !== lastY) {
						lastY = y;
					}
				});

				// Only apply clipping if needed. Clipping causes blurred legend in PDF export (#1787)
				if (!clipRect) {
					clipRect = legend.clipRect = renderer.clipRect(0, this.padding, 9999, 0);
					legend.contentGroup.clip(clipRect);
				}
				clipRect.attr({
					height: clipHeight
				});
				
				// Add navigation elements
				if (!nav) {
					this.nav = nav = renderer.g().attr({ zIndex: 1 }).add(this.group);
					this.up = renderer.symbol('triangle', 0, 0, arrowSize, arrowSize)
						.on('click', function () {
							legend.scroll(-1, animation);
						})
						.add(nav);
					this.pager = renderer.text('', 15, 10)
						.css(navOptions.style)
						.add(nav);
					this.down = renderer.symbol('triangle-down', 0, 0, arrowSize, arrowSize)
						.on('click', function () {
							legend.scroll(1, animation);
						})
						.add(nav);
				}
				
				// Set initial position
				legend.scroll(0);
				
				legendHeight = spaceHeight;
				
			} else if (nav) {
				clipRect.attr({
					height: chart.chartHeight
				});
				nav.hide();
				this.scrollGroup.attr({
					translateY: 1
				});
				this.clipHeight = 0; // #1379
			}
			
			return legendHeight;
		},
		
		/**
		 * Scroll the legend by a number of pages
		 * @param {Object} scrollBy
		 * @param {Object} animation
		 */
		scroll: function (scrollBy, animation) {
			var pages = this.pages,
				pageCount = pages.length,
				currentPage = this.currentPage + scrollBy,
				clipHeight = this.clipHeight,
				navOptions = this.options.navigation,
				activeColor = navOptions.activeColor,
				inactiveColor = navOptions.inactiveColor,
				pager = this.pager,
				padding = this.padding,
				scrollOffset;
			
			// When resizing while looking at the last page
			if (currentPage > pageCount) {
				currentPage = pageCount;
			}
			
			if (currentPage > 0) {
				
				if (animation !== UNDEFINED) {
					setAnimation(animation, this.chart);
				}
				
				this.nav.attr({
					translateX: padding,
					translateY: clipHeight + this.padding + 7 + this.titleHeight,
					visibility: VISIBLE
				});
				this.up.attr({
						fill: currentPage === 1 ? inactiveColor : activeColor
					})
					.css({
						cursor: currentPage === 1 ? 'default' : 'pointer'
					});
				pager.attr({
					text: currentPage + '/' + pageCount
				});
				this.down.attr({
						x: 18 + this.pager.getBBox().width, // adjust to text width
						fill: currentPage === pageCount ? inactiveColor : activeColor
					})
					.css({
						cursor: currentPage === pageCount ? 'default' : 'pointer'
					});
				
				scrollOffset = -pages[currentPage - 1] + this.initialItemY;

				this.scrollGroup.animate({
					translateY: scrollOffset
				});			
				
				this.currentPage = currentPage;
				this.positionCheckboxes(scrollOffset);
			}
				
		}
		
	};

	/*
	 * LegendSymbolMixin
	 */ 

	var LegendSymbolMixin = Highcharts.LegendSymbolMixin = {

		/**
		 * Get the series' symbol in the legend
		 * 
		 * @param {Object} legend The legend object
		 * @param {Object} item The series (this) or point
		 */
		drawRectangle: function (legend, item) {
			var symbolHeight = legend.options.symbolHeight || 12;
			
			item.legendSymbol = this.chart.renderer.rect(
				0,
				legend.baseline - 5 - (symbolHeight / 2),
				legend.symbolWidth,
				symbolHeight,
				legend.options.symbolRadius || 0
			).attr({
				zIndex: 3
			}).add(item.legendGroup);		
			
		},

		/**
		 * Get the series' symbol in the legend. This method should be overridable to create custom 
		 * symbols through Highcharts.seriesTypes[type].prototype.drawLegendSymbols.
		 * 
		 * @param {Object} legend The legend object
		 */
		drawLineMarker: function (legend) {

			var options = this.options,
				markerOptions = options.marker,
				radius,
				legendOptions = legend.options,
				legendSymbol,
				symbolWidth = legend.symbolWidth,
				renderer = this.chart.renderer,
				legendItemGroup = this.legendGroup,
				verticalCenter = legend.baseline - mathRound(renderer.fontMetrics(legendOptions.itemStyle.fontSize, this.legendItem).b * 0.3),
				attr;

			// Draw the line
			if (options.lineWidth) {
				attr = {
					'stroke-width': options.lineWidth
				};
				if (options.dashStyle) {
					attr.dashstyle = options.dashStyle;
				}
				this.legendLine = renderer.path([
					M,
					0,
					verticalCenter,
					L,
					symbolWidth,
					verticalCenter
				])
				.attr(attr)
				.add(legendItemGroup);
			}
			
			// Draw the marker
			if (markerOptions && markerOptions.enabled !== false) {
				radius = markerOptions.radius;
				this.legendSymbol = legendSymbol = renderer.symbol(
					this.symbol,
					(symbolWidth / 2) - radius,
					verticalCenter - radius,
					2 * radius,
					2 * radius
				)
				.add(legendItemGroup);
				legendSymbol.isMarker = true;
			}
		}
	};

	// Workaround for #2030, horizontal legend items not displaying in IE11 Preview,
	// and for #2580, a similar drawing flaw in Firefox 26.
	// TODO: Explore if there's a general cause for this. The problem may be related 
	// to nested group elements, as the legend item texts are within 4 group elements.
	if (/Trident\/7\.0/.test(userAgent) || isFirefox) {
		wrap(Legend.prototype, 'positionItem', function (proceed, item) {
			var legend = this,
				runPositionItem = function () { // If chart destroyed in sync, this is undefined (#2030)
					if (item._legendItemPos) {
						proceed.call(legend, item);
					}
				};

			// Do it now, for export and to get checkbox placement
			runPositionItem();
			
			// Do it after to work around the core issue
			setTimeout(runPositionItem);
		});
	}


	/**
	 * The chart class
	 * @param {Object} options
	 * @param {Function} callback Function to run when the chart has loaded
	 */
	function Chart() {
		this.init.apply(this, arguments);
	}

	Chart.prototype = {

		/**
		 * Initialize the chart
		 */
		init: function (userOptions, callback) {

			// Handle regular options
			var options,
				seriesOptions = userOptions.series; // skip merging data points to increase performance

			userOptions.series = null;
			options = merge(defaultOptions, userOptions); // do the merge
			options.series = userOptions.series = seriesOptions; // set back the series data
			this.userOptions = userOptions;

			var optionsChart = options.chart;
			
			// Create margin & spacing array
			this.margin = this.splashArray('margin', optionsChart);
			this.spacing = this.splashArray('spacing', optionsChart);

			var chartEvents = optionsChart.events;

			//this.runChartClick = chartEvents && !!chartEvents.click;
			this.bounds = { h: {}, v: {} }; // Pixel data bounds for touch zoom

			this.callback = callback;
			this.isResizing = 0;
			this.options = options;
			//chartTitleOptions = UNDEFINED;
			//chartSubtitleOptions = UNDEFINED;

			this.axes = [];
			this.series = [];
			this.hasCartesianSeries = optionsChart.showAxes;
			//this.axisOffset = UNDEFINED;
			//this.maxTicks = UNDEFINED; // handle the greatest amount of ticks on grouped axes
			//this.inverted = UNDEFINED;
			//this.loadingShown = UNDEFINED;
			//this.container = UNDEFINED;
			//this.chartWidth = UNDEFINED;
			//this.chartHeight = UNDEFINED;
			//this.marginRight = UNDEFINED;
			//this.marginBottom = UNDEFINED;
			//this.containerWidth = UNDEFINED;
			//this.containerHeight = UNDEFINED;
			//this.oldChartWidth = UNDEFINED;
			//this.oldChartHeight = UNDEFINED;

			//this.renderTo = UNDEFINED;
			//this.renderToClone = UNDEFINED;

			//this.spacingBox = UNDEFINED

			//this.legend = UNDEFINED;

			// Elements
			//this.chartBackground = UNDEFINED;
			//this.plotBackground = UNDEFINED;
			//this.plotBGImage = UNDEFINED;
			//this.plotBorder = UNDEFINED;
			//this.loadingDiv = UNDEFINED;
			//this.loadingSpan = UNDEFINED;

			var chart = this,
				eventType;

			// Add the chart to the global lookup
			chart.index = charts.length;
			charts.push(chart);
			chartCount++;

			// Set up auto resize
			if (optionsChart.reflow !== false) {
				addEvent(chart, 'load', function () {
					chart.initReflow();
				});
			}

			// Chart event handlers
			if (chartEvents) {
				for (eventType in chartEvents) {
					addEvent(chart, eventType, chartEvents[eventType]);
				}
			}

			chart.xAxis = [];
			chart.yAxis = [];

			// Expose methods and variables
			chart.animation = useCanVG ? false : pick(optionsChart.animation, true);
			chart.pointCount = chart.colorCounter = chart.symbolCounter = 0;

			chart.firstRender();
		},

		/**
		 * Initialize an individual series, called internally before render time
		 */
		initSeries: function (options) {
			var chart = this,
				optionsChart = chart.options.chart,
				type = options.type || optionsChart.type || optionsChart.defaultSeriesType,
				series,
				constr = seriesTypes[type];

			// No such series type
			if (!constr) {
				error(17, true);
			}

			series = new constr();
			series.init(this, options);
			return series;
		},

		/**
		 * Check whether a given point is within the plot area
		 *
		 * @param {Number} plotX Pixel x relative to the plot area
		 * @param {Number} plotY Pixel y relative to the plot area
		 * @param {Boolean} inverted Whether the chart is inverted
		 */
		isInsidePlot: function (plotX, plotY, inverted) {
			var x = inverted ? plotY : plotX,
				y = inverted ? plotX : plotY;
				
			return x >= 0 &&
				x <= this.plotWidth &&
				y >= 0 &&
				y <= this.plotHeight;
		},

		/**
		 * Adjust all axes tick amounts
		 */
		adjustTickAmounts: function () {
			if (this.options.chart.alignTicks !== false) {
				each(this.axes, function (axis) {
					axis.adjustTickAmount();
				});
			}
			this.maxTicks = null;
		},

		/**
		 * Redraw legend, axes or series based on updated data
		 *
		 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
		 *    configuration
		 */
		redraw: function (animation) {
			var chart = this,
				axes = chart.axes,
				series = chart.series,
				pointer = chart.pointer,
				legend = chart.legend,
				redrawLegend = chart.isDirtyLegend,
				hasStackedSeries,
				hasDirtyStacks,
				hasCartesianSeries = chart.hasCartesianSeries,
				isDirtyBox = chart.isDirtyBox, // todo: check if it has actually changed?
				seriesLength = series.length,
				i = seriesLength,
				serie,
				renderer = chart.renderer,
				isHiddenChart = renderer.isHidden(),
				afterRedraw = [];
				
			setAnimation(animation, chart);
			
			if (isHiddenChart) {
				chart.cloneRenderTo();
			}

			// Adjust title layout (reflow multiline text)
			chart.layOutTitles();

			// link stacked series
			while (i--) {
				serie = series[i];

				if (serie.options.stacking) {
					hasStackedSeries = true;
					
					if (serie.isDirty) {
						hasDirtyStacks = true;
						break;
					}
				}
			}
			if (hasDirtyStacks) { // mark others as dirty
				i = seriesLength;
				while (i--) {
					serie = series[i];
					if (serie.options.stacking) {
						serie.isDirty = true;
					}
				}
			}

			// handle updated data in the series
			each(series, function (serie) {
				if (serie.isDirty) { // prepare the data so axis can read it
					if (serie.options.legendType === 'point') {
						redrawLegend = true;
					}
				}
			});

			// handle added or removed series
			if (redrawLegend && legend.options.enabled) { // series or pie points are added or removed
				// draw legend graphics
				legend.render();

				chart.isDirtyLegend = false;
			}

			// reset stacks
			if (hasStackedSeries) {
				chart.getStacks();
			}


			if (hasCartesianSeries) {
				if (!chart.isResizing) {

					// reset maxTicks
					chart.maxTicks = null;

					// set axes scales
					each(axes, function (axis) {
						axis.setScale();
					});
				}

				chart.adjustTickAmounts();
			}

			chart.getMargins(); // #3098

			if (hasCartesianSeries) {
				// If one axis is dirty, all axes must be redrawn (#792, #2169)
				each(axes, function (axis) {
					if (axis.isDirty) {
						isDirtyBox = true;
					}
				});

				// redraw axes
				each(axes, function (axis) {
					
					// Fire 'afterSetExtremes' only if extremes are set
					if (axis.isDirtyExtremes) { // #821
						axis.isDirtyExtremes = false;
						afterRedraw.push(function () { // prevent a recursive call to chart.redraw() (#1119)
							fireEvent(axis, 'afterSetExtremes', extend(axis.eventArgs, axis.getExtremes())); // #747, #751
							delete axis.eventArgs;
						});
					}
					
					if (isDirtyBox || hasStackedSeries) {
						axis.redraw();
					}
				});
			}
			
			// the plot areas size has changed
			if (isDirtyBox) {
				chart.drawChartBox();
			}


			// redraw affected series
			each(series, function (serie) {
				if (serie.isDirty && serie.visible &&
						(!serie.isCartesian || serie.xAxis)) { // issue #153
					serie.redraw();
				}
			});

			// move tooltip or reset
			if (pointer) {
				pointer.reset(true);
			}

			// redraw if canvas
			renderer.draw();

			// fire the event
			fireEvent(chart, 'redraw'); // jQuery breaks this when calling it from addEvent. Overwrites chart.redraw
			
			if (isHiddenChart) {
				chart.cloneRenderTo(true);
			}
			
			// Fire callbacks that are put on hold until after the redraw
			each(afterRedraw, function (callback) {
				callback.call();
			});
		},

		/**
		 * Get an axis, series or point object by id.
		 * @param id {String} The id as given in the configuration options
		 */
		get: function (id) {
			var chart = this,
				axes = chart.axes,
				series = chart.series;

			var i,
				j,
				points;

			// search axes
			for (i = 0; i < axes.length; i++) {
				if (axes[i].options.id === id) {
					return axes[i];
				}
			}

			// search series
			for (i = 0; i < series.length; i++) {
				if (series[i].options.id === id) {
					return series[i];
				}
			}

			// search points
			for (i = 0; i < series.length; i++) {
				points = series[i].points || [];
				for (j = 0; j < points.length; j++) {
					if (points[j].id === id) {
						return points[j];
					}
				}
			}
			return null;
		},

		/**
		 * Create the Axis instances based on the config options
		 */
		getAxes: function () {
			var chart = this,
				options = this.options,
				xAxisOptions = options.xAxis = splat(options.xAxis || {}),
				yAxisOptions = options.yAxis = splat(options.yAxis || {}),
				optionsArray,
				axis;

			// make sure the options are arrays and add some members
			each(xAxisOptions, function (axis, i) {
				axis.index = i;
				axis.isX = true;
			});

			each(yAxisOptions, function (axis, i) {
				axis.index = i;
			});

			// concatenate all axis options into one array
			optionsArray = xAxisOptions.concat(yAxisOptions);

			each(optionsArray, function (axisOptions) {
				axis = new Axis(chart, axisOptions);
			});

			chart.adjustTickAmounts();
		},


		/**
		 * Get the currently selected points from all series
		 */
		getSelectedPoints: function () {
			var points = [];
			each(this.series, function (serie) {
				points = points.concat(grep(serie.points || [], function (point) {
					return point.selected;
				}));
			});
			return points;
		},

		/**
		 * Get the currently selected series
		 */
		getSelectedSeries: function () {
			return grep(this.series, function (serie) {
				return serie.selected;
			});
		},

		/**
		 * Generate stacks for each series and calculate stacks total values
		 */
		getStacks: function () {
			var chart = this;

			// reset stacks for each yAxis
			each(chart.yAxis, function (axis) {
				if (axis.stacks && axis.hasVisibleSeries) {
					axis.oldStacks = axis.stacks;
				}
			});

			each(chart.series, function (series) {
				if (series.options.stacking && (series.visible === true || chart.options.chart.ignoreHiddenSeries === false)) {
					series.stackKey = series.type + pick(series.options.stack, '');
				}
			});
		},	

		/**
		 * Show the title and subtitle of the chart
		 *
		 * @param titleOptions {Object} New title options
		 * @param subtitleOptions {Object} New subtitle options
		 *
		 */
		setTitle: function (titleOptions, subtitleOptions, redraw) {
			var chart = this,
				options = chart.options,
				chartTitleOptions,
				chartSubtitleOptions;

			chartTitleOptions = options.title = merge(options.title, titleOptions);
			chartSubtitleOptions = options.subtitle = merge(options.subtitle, subtitleOptions);

			// add title and subtitle
			each([
				['title', titleOptions, chartTitleOptions],
				['subtitle', subtitleOptions, chartSubtitleOptions]
			], function (arr) {
				var name = arr[0],
					title = chart[name],
					titleOptions = arr[1],
					chartTitleOptions = arr[2];

				if (title && titleOptions) {
					chart[name] = title = title.destroy(); // remove old
				}
				
				if (chartTitleOptions && chartTitleOptions.text && !title) {
					chart[name] = chart.renderer.text(
						chartTitleOptions.text,
						0,
						0,
						chartTitleOptions.useHTML
					)
					.attr({
						align: chartTitleOptions.align,
						'class': PREFIX + name,
						zIndex: chartTitleOptions.zIndex || 4
					})
					.css(chartTitleOptions.style)
					.add();
				}	
			});
			chart.layOutTitles(redraw);
		},

		/**
		 * Lay out the chart titles and cache the full offset height for use in getMargins
		 */
		layOutTitles: function (redraw) {
			var titleOffset = 0,
				title = this.title,
				subtitle = this.subtitle,
				options = this.options,
				titleOptions = options.title,
				subtitleOptions = options.subtitle,
				requiresDirtyBox,
				renderer = this.renderer,
				autoWidth = this.spacingBox.width - 44; // 44 makes room for default context button

			if (title) {
				title
					.css({ width: (titleOptions.width || autoWidth) + PX })
					.align(extend({ 
						y: renderer.fontMetrics(titleOptions.style.fontSize, title).b - 3
					}, titleOptions), false, 'spacingBox');
				
				if (!titleOptions.floating && !titleOptions.verticalAlign) {
					titleOffset = title.getBBox().height;
				}
			}
			if (subtitle) {
				subtitle
					.css({ width: (subtitleOptions.width || autoWidth) + PX })
					.align(extend({ 
						y: titleOffset + (titleOptions.margin - 13) + renderer.fontMetrics(titleOptions.style.fontSize, subtitle).b 
					}, subtitleOptions), false, 'spacingBox');
				
				if (!subtitleOptions.floating && !subtitleOptions.verticalAlign) {
					titleOffset = mathCeil(titleOffset + subtitle.getBBox().height);
				}
			}

			requiresDirtyBox = this.titleOffset !== titleOffset;				
			this.titleOffset = titleOffset; // used in getMargins

			if (!this.isDirtyBox && requiresDirtyBox) {
				this.isDirtyBox = requiresDirtyBox;
				// Redraw if necessary (#2719, #2744)		
				if (this.hasRendered && pick(redraw, true) && this.isDirtyBox) {
					this.redraw();
				}
			}
		},

		/**
		 * Get chart width and height according to options and container size
		 */
		getChartSize: function () {
			var chart = this,
				optionsChart = chart.options.chart,
				widthOption = optionsChart.width,
				heightOption = optionsChart.height,
				renderTo = chart.renderToClone || chart.renderTo;

			// get inner width and height from jQuery (#824)
			if (!defined(widthOption)) {
				chart.containerWidth = adapterRun(renderTo, 'width');
			}
			if (!defined(heightOption)) {
				chart.containerHeight = adapterRun(renderTo, 'height');
			}
			
			chart.chartWidth = mathMax(0, widthOption || chart.containerWidth || 600); // #1393, 1460
			chart.chartHeight = mathMax(0, pick(heightOption,
				// the offsetHeight of an empty container is 0 in standard browsers, but 19 in IE7:
				chart.containerHeight > 19 ? chart.containerHeight : 400));
		},

		/**
		 * Create a clone of the chart's renderTo div and place it outside the viewport to allow
		 * size computation on chart.render and chart.redraw
		 */
		cloneRenderTo: function (revert) {
			var clone = this.renderToClone,
				container = this.container;
			
			// Destroy the clone and bring the container back to the real renderTo div
			if (revert) {
				if (clone) {
					this.renderTo.appendChild(container);
					discardElement(clone);
					delete this.renderToClone;
				}
			
			// Set up the clone
			} else {
				if (container && container.parentNode === this.renderTo) {
					this.renderTo.removeChild(container); // do not clone this
				}
				this.renderToClone = clone = this.renderTo.cloneNode(0);
				css(clone, {
					position: ABSOLUTE,
					top: '-9999px',
					display: 'block' // #833
				});
				if (clone.style.setProperty) { // #2631
					clone.style.setProperty('display', 'block', 'important');
				}
				doc.body.appendChild(clone);
				if (container) {
					clone.appendChild(container);
				}
			}
		},

		/**
		 * Get the containing element, determine the size and create the inner container
		 * div to hold the chart
		 */
		getContainer: function () {
			var chart = this,
				container,
				optionsChart = chart.options.chart,
				chartWidth,
				chartHeight,
				renderTo,
				indexAttrName = 'data-highcharts-chart',
				oldChartIndex,
				containerId;

			chart.renderTo = renderTo = optionsChart.renderTo;
			containerId = PREFIX + idCounter++;

			if (isString(renderTo)) {
				chart.renderTo = renderTo = doc.getElementById(renderTo);
			}
			
			// Display an error if the renderTo is wrong
			if (!renderTo) {
				error(13, true);
			}
			
			// If the container already holds a chart, destroy it. The check for hasRendered is there
			// because web pages that are saved to disk from the browser, will preserve the data-highcharts-chart
			// attribute and the SVG contents, but not an interactive chart. So in this case,
			// charts[oldChartIndex] will point to the wrong chart if any (#2609).
			oldChartIndex = pInt(attr(renderTo, indexAttrName));
			if (!isNaN(oldChartIndex) && charts[oldChartIndex] && charts[oldChartIndex].hasRendered) {
				charts[oldChartIndex].destroy();
			}		
			
			// Make a reference to the chart from the div
			attr(renderTo, indexAttrName, chart.index);

			// remove previous chart
			renderTo.innerHTML = '';

			// If the container doesn't have an offsetWidth, it has or is a child of a node
			// that has display:none. We need to temporarily move it out to a visible
			// state to determine the size, else the legend and tooltips won't render
			// properly. The allowClone option is used in sparklines as a micro optimization,
			// saving about 1-2 ms each chart.
			if (!optionsChart.skipClone && !renderTo.offsetWidth) {
				chart.cloneRenderTo();
			}

			// get the width and height
			chart.getChartSize();
			chartWidth = chart.chartWidth;
			chartHeight = chart.chartHeight;

			// create the inner container
			chart.container = container = createElement(DIV, {
					className: PREFIX + 'container' +
						(optionsChart.className ? ' ' + optionsChart.className : ''),
					id: containerId
				}, extend({
					position: RELATIVE,
					overflow: HIDDEN, // needed for context menu (avoid scrollbars) and
						// content overflow in IE
					width: chartWidth + PX,
					height: chartHeight + PX,
					textAlign: 'left',
					lineHeight: 'normal', // #427
					zIndex: 0, // #1072
					'-webkit-tap-highlight-color': 'rgba(0,0,0,0)'
				}, optionsChart.style),
				chart.renderToClone || renderTo
			);

			// cache the cursor (#1650)
			chart._cursor = container.style.cursor;

			// Initialize the renderer
			chart.renderer =
				optionsChart.forExport ? // force SVG, used for SVG export
					new SVGRenderer(container, chartWidth, chartHeight, optionsChart.style, true) :
					new Renderer(container, chartWidth, chartHeight, optionsChart.style);

			if (useCanVG) {
				// If we need canvg library, extend and configure the renderer
				// to get the tracker for translating mouse events
				chart.renderer.create(chart, container, chartWidth, chartHeight);
			}
		},

		/**
		 * Calculate margins by rendering axis labels in a preliminary position. Title,
		 * subtitle and legend have already been rendered at this stage, but will be
		 * moved into their final positions
		 */
		getMargins: function () {
			var chart = this,
				spacing = chart.spacing,
				axisOffset,
				legend = chart.legend,
				margin = chart.margin,
				legendOptions = chart.options.legend,
				legendMargin = pick(legendOptions.margin, 20),
				legendX = legendOptions.x,
				legendY = legendOptions.y,
				align = legendOptions.align,
				verticalAlign = legendOptions.verticalAlign,
				titleOffset = chart.titleOffset;

			chart.resetMargins();
			axisOffset = chart.axisOffset;

			// Adjust for title and subtitle
			if (titleOffset && !defined(margin[0])) {
				chart.plotTop = mathMax(chart.plotTop, titleOffset + chart.options.title.margin + spacing[0]);
			}
			
			// Adjust for legend
			if (legend.display && !legendOptions.floating) {
				if (align === 'right') { // horizontal alignment handled first
					if (!defined(margin[1])) {
						chart.marginRight = mathMax(
							chart.marginRight,
							legend.legendWidth - legendX + legendMargin + spacing[1]
						);
					}
				} else if (align === 'left') {
					if (!defined(margin[3])) {
						chart.plotLeft = mathMax(
							chart.plotLeft,
							legend.legendWidth + legendX + legendMargin + spacing[3]
						);
					}

				} else if (verticalAlign === 'top') {
					if (!defined(margin[0])) {
						chart.plotTop = mathMax(
							chart.plotTop,
							legend.legendHeight + legendY + legendMargin + spacing[0]
						);
					}

				} else if (verticalAlign === 'bottom') {
					if (!defined(margin[2])) {
						chart.marginBottom = mathMax(
							chart.marginBottom,
							legend.legendHeight - legendY + legendMargin + spacing[2]
						);
					}
				}
			}

			// adjust for scroller
			if (chart.extraBottomMargin) {
				chart.marginBottom += chart.extraBottomMargin;
			}
			if (chart.extraTopMargin) {
				chart.plotTop += chart.extraTopMargin;
			}

			// pre-render axes to get labels offset width
			if (chart.hasCartesianSeries) {
				each(chart.axes, function (axis) {
					axis.getOffset();
				});
			}
			
			if (!defined(margin[3])) {
				chart.plotLeft += axisOffset[3];
			}
			if (!defined(margin[0])) {
				chart.plotTop += axisOffset[0];
			}
			if (!defined(margin[2])) {
				chart.marginBottom += axisOffset[2];
			}
			if (!defined(margin[1])) {
				chart.marginRight += axisOffset[1];
			}

			chart.setChartSize();

		},

		/**
		 * Resize the chart to its container if size is not explicitly set
		 */
		reflow: function (e) {
			var chart = this,
				optionsChart = chart.options.chart,
				renderTo = chart.renderTo,
				width = optionsChart.width || adapterRun(renderTo, 'width'),
				height = optionsChart.height || adapterRun(renderTo, 'height'),
				target = e ? e.target : win, // #805 - MooTools doesn't supply e
				doReflow = function () {
					if (chart.container) { // It may have been destroyed in the meantime (#1257)
						chart.setSize(width, height, false);
						chart.hasUserSize = null;
					}
				};
				
			// Width and height checks for display:none. Target is doc in IE8 and Opera,
			// win in Firefox, Chrome and IE9.
			if (!chart.hasUserSize && width && height && (target === win || target === doc)) {
				if (width !== chart.containerWidth || height !== chart.containerHeight) {
					clearTimeout(chart.reflowTimeout);
					if (e) { // Called from window.resize
						chart.reflowTimeout = setTimeout(doReflow, 100);
					} else { // Called directly (#2224)
						doReflow();
					}
				}
				chart.containerWidth = width;
				chart.containerHeight = height;
			}
		},

		/**
		 * Add the event handlers necessary for auto resizing
		 */
		initReflow: function () {
			var chart = this,
				reflow = function (e) {
					chart.reflow(e);
				};
				
			
			addEvent(win, 'resize', reflow);
			addEvent(chart, 'destroy', function () {
				removeEvent(win, 'resize', reflow);
			});
		},

		/**
		 * Resize the chart to a given width and height
		 * @param {Number} width
		 * @param {Number} height
		 * @param {Object|Boolean} animation
		 */
		setSize: function (width, height, animation) {
			var chart = this,
				chartWidth,
				chartHeight,
				fireEndResize;

			// Handle the isResizing counter
			chart.isResizing += 1;
			fireEndResize = function () {
				if (chart) {
					fireEvent(chart, 'endResize', null, function () {
						chart.isResizing -= 1;
					});
				}
			};

			// set the animation for the current process
			setAnimation(animation, chart);

			chart.oldChartHeight = chart.chartHeight;
			chart.oldChartWidth = chart.chartWidth;
			if (defined(width)) {
				chart.chartWidth = chartWidth = mathMax(0, mathRound(width));
				chart.hasUserSize = !!chartWidth;
			}
			if (defined(height)) {
				chart.chartHeight = chartHeight = mathMax(0, mathRound(height));
			}

			// Resize the container with the global animation applied if enabled (#2503)
			(globalAnimation ? animate : css)(chart.container, {
				width: chartWidth + PX,
				height: chartHeight + PX
			}, globalAnimation);

			chart.setChartSize(true);
			chart.renderer.setSize(chartWidth, chartHeight, animation);

			// handle axes
			chart.maxTicks = null;
			each(chart.axes, function (axis) {
				axis.isDirty = true;
				axis.setScale();
			});

			// make sure non-cartesian series are also handled
			each(chart.series, function (serie) {
				serie.isDirty = true;
			});

			chart.isDirtyLegend = true; // force legend redraw
			chart.isDirtyBox = true; // force redraw of plot and chart border

			chart.layOutTitles(); // #2857
			chart.getMargins();

			chart.redraw(animation);


			chart.oldChartHeight = null;
			fireEvent(chart, 'resize');

			// fire endResize and set isResizing back
			// If animation is disabled, fire without delay
			if (globalAnimation === false) {
				fireEndResize();
			} else { // else set a timeout with the animation duration
				setTimeout(fireEndResize, (globalAnimation && globalAnimation.duration) || 500);
			}
		},

		/**
		 * Set the public chart properties. This is done before and after the pre-render
		 * to determine margin sizes
		 */
		setChartSize: function (skipAxes) {
			var chart = this,
				inverted = chart.inverted,
				renderer = chart.renderer,
				chartWidth = chart.chartWidth,
				chartHeight = chart.chartHeight,
				optionsChart = chart.options.chart,
				spacing = chart.spacing,
				clipOffset = chart.clipOffset,
				clipX,
				clipY,
				plotLeft,
				plotTop,
				plotWidth,
				plotHeight,
				plotBorderWidth;

			chart.plotLeft = plotLeft = mathRound(chart.plotLeft);
			chart.plotTop = plotTop = mathRound(chart.plotTop);
			chart.plotWidth = plotWidth = mathMax(0, mathRound(chartWidth - plotLeft - chart.marginRight));
			chart.plotHeight = plotHeight = mathMax(0, mathRound(chartHeight - plotTop - chart.marginBottom));

			chart.plotSizeX = inverted ? plotHeight : plotWidth;
			chart.plotSizeY = inverted ? plotWidth : plotHeight;
			
			chart.plotBorderWidth = optionsChart.plotBorderWidth || 0;

			// Set boxes used for alignment
			chart.spacingBox = renderer.spacingBox = {
				x: spacing[3],
				y: spacing[0],
				width: chartWidth - spacing[3] - spacing[1],
				height: chartHeight - spacing[0] - spacing[2]
			};
			chart.plotBox = renderer.plotBox = {
				x: plotLeft,
				y: plotTop,
				width: plotWidth,
				height: plotHeight
			};

			plotBorderWidth = 2 * mathFloor(chart.plotBorderWidth / 2);
			clipX = mathCeil(mathMax(plotBorderWidth, clipOffset[3]) / 2);
			clipY = mathCeil(mathMax(plotBorderWidth, clipOffset[0]) / 2);
			chart.clipBox = {
				x: clipX, 
				y: clipY, 
				width: mathFloor(chart.plotSizeX - mathMax(plotBorderWidth, clipOffset[1]) / 2 - clipX), 
				height: mathMax(0, mathFloor(chart.plotSizeY - mathMax(plotBorderWidth, clipOffset[2]) / 2 - clipY))
			};

			if (!skipAxes) {
				each(chart.axes, function (axis) {
					axis.setAxisSize();
					axis.setAxisTranslation();
				});
			}
		},

		/**
		 * Initial margins before auto size margins are applied
		 */
		resetMargins: function () {
			var chart = this,
				spacing = chart.spacing,
				margin = chart.margin;

			chart.plotTop = pick(margin[0], spacing[0]);
			chart.marginRight = pick(margin[1], spacing[1]);
			chart.marginBottom = pick(margin[2], spacing[2]);
			chart.plotLeft = pick(margin[3], spacing[3]);
			chart.axisOffset = [0, 0, 0, 0]; // top, right, bottom, left
			chart.clipOffset = [0, 0, 0, 0];
		},

		/**
		 * Draw the borders and backgrounds for chart and plot area
		 */
		drawChartBox: function () {
			var chart = this,
				optionsChart = chart.options.chart,
				renderer = chart.renderer,
				chartWidth = chart.chartWidth,
				chartHeight = chart.chartHeight,
				chartBackground = chart.chartBackground,
				plotBackground = chart.plotBackground,
				plotBorder = chart.plotBorder,
				plotBGImage = chart.plotBGImage,
				chartBorderWidth = optionsChart.borderWidth || 0,
				chartBackgroundColor = optionsChart.backgroundColor,
				plotBackgroundColor = optionsChart.plotBackgroundColor,
				plotBackgroundImage = optionsChart.plotBackgroundImage,
				plotBorderWidth = optionsChart.plotBorderWidth || 0,
				mgn,
				bgAttr,
				plotLeft = chart.plotLeft,
				plotTop = chart.plotTop,
				plotWidth = chart.plotWidth,
				plotHeight = chart.plotHeight,
				plotBox = chart.plotBox,
				clipRect = chart.clipRect,
				clipBox = chart.clipBox;

			// Chart area
			mgn = chartBorderWidth + (optionsChart.shadow ? 8 : 0);

			if (chartBorderWidth || chartBackgroundColor) {
				if (!chartBackground) {
					
					bgAttr = {
						fill: chartBackgroundColor || NONE
					};
					if (chartBorderWidth) { // #980
						bgAttr.stroke = optionsChart.borderColor;
						bgAttr['stroke-width'] = chartBorderWidth;
					}
					chart.chartBackground = renderer.rect(mgn / 2, mgn / 2, chartWidth - mgn, chartHeight - mgn,
							optionsChart.borderRadius, chartBorderWidth)
						.attr(bgAttr)
						.addClass(PREFIX + 'background')
						.add()
						.shadow(optionsChart.shadow);

				} else { // resize
					chartBackground.animate(
						chartBackground.crisp({ width: chartWidth - mgn, height: chartHeight - mgn })
					);
				}
			}


			// Plot background
			if (plotBackgroundColor) {
				if (!plotBackground) {
					chart.plotBackground = renderer.rect(plotLeft, plotTop, plotWidth, plotHeight, 0)
						.attr({
							fill: plotBackgroundColor
						})
						.add()
						.shadow(optionsChart.plotShadow);
				} else {
					plotBackground.animate(plotBox);
				}
			}
			if (plotBackgroundImage) {
				if (!plotBGImage) {
					chart.plotBGImage = renderer.image(plotBackgroundImage, plotLeft, plotTop, plotWidth, plotHeight)
						.add();
				} else {
					plotBGImage.animate(plotBox);
				}
			}
			
			// Plot clip
			if (!clipRect) {
				chart.clipRect = renderer.clipRect(clipBox);
			} else {
				clipRect.animate({
					width: clipBox.width,
					height: clipBox.height
				});
			}

			// Plot area border
			if (plotBorderWidth) {
				if (!plotBorder) {
					chart.plotBorder = renderer.rect(plotLeft, plotTop, plotWidth, plotHeight, 0, -plotBorderWidth)
						.attr({
							stroke: optionsChart.plotBorderColor,
							'stroke-width': plotBorderWidth,
							fill: NONE,
							zIndex: 1
						})
						.add();
				} else {
					plotBorder.animate(
						plotBorder.crisp({ x: plotLeft, y: plotTop, width: plotWidth, height: plotHeight, strokeWidth: -plotBorderWidth }) //#3282 plotBorder should be negative
					);
				}
			}

			// reset
			chart.isDirtyBox = false;
		},

		/**
		 * Detect whether a certain chart property is needed based on inspecting its options
		 * and series. This mainly applies to the chart.invert property, and in extensions to 
		 * the chart.angular and chart.polar properties.
		 */
		propFromSeries: function () {
			var chart = this,
				optionsChart = chart.options.chart,
				klass,
				seriesOptions = chart.options.series,
				i,
				value;
				
				
			each(['inverted', 'angular', 'polar'], function (key) {
				
				// The default series type's class
				klass = seriesTypes[optionsChart.type || optionsChart.defaultSeriesType];
				
				// Get the value from available chart-wide properties
				value = (
					chart[key] || // 1. it is set before
					optionsChart[key] || // 2. it is set in the options
					(klass && klass.prototype[key]) // 3. it's default series class requires it
				);
		
				// 4. Check if any the chart's series require it
				i = seriesOptions && seriesOptions.length;
				while (!value && i--) {
					klass = seriesTypes[seriesOptions[i].type];
					if (klass && klass.prototype[key]) {
						value = true;
					}
				}
		
				// Set the chart property
				chart[key] = value;	
			});
			
		},

		/**
		 * Link two or more series together. This is done initially from Chart.render,
		 * and after Chart.addSeries and Series.remove.
		 */
		linkSeries: function () {
			var chart = this,
				chartSeries = chart.series;

			// Reset links
			each(chartSeries, function (series) {
				series.linkedSeries.length = 0;
			});

			// Apply new links
			each(chartSeries, function (series) {
				var linkedTo = series.options.linkedTo;
				if (isString(linkedTo)) {
					if (linkedTo === ':previous') {
						linkedTo = chart.series[series.index - 1];
					} else {
						linkedTo = chart.get(linkedTo);
					}
					if (linkedTo) {
						linkedTo.linkedSeries.push(series);
						series.linkedParent = linkedTo;
					}
				}
			});
		},

		/**
		 * Render series for the chart
		 */
		renderSeries: function () {
			each(this.series, function (serie) {
				serie.translate();
				if (serie.setTooltipPoints) {
					serie.setTooltipPoints();
				}
				serie.render();
			});
		},
			
		/**
		 * Render labels for the chart
		 */
		renderLabels: function () {
			var chart = this,
				labels = chart.options.labels;
			if (labels.items) {
				each(labels.items, function (label) {
					var style = extend(labels.style, label.style),
						x = pInt(style.left) + chart.plotLeft,
						y = pInt(style.top) + chart.plotTop + 12;

					// delete to prevent rewriting in IE
					delete style.left;
					delete style.top;

					chart.renderer.text(
						label.html,
						x,
						y
					)
					.attr({ zIndex: 2 })
					.css(style)
					.add();

				});
			}
		},

		/**
		 * Render all graphics for the chart
		 */
		render: function () {
			var chart = this,
				axes = chart.axes,
				renderer = chart.renderer,
				options = chart.options;

			// Title
			chart.setTitle();


			// Legend
			chart.legend = new Legend(chart, options.legend);

			chart.getStacks(); // render stacks

			// Get margins by pre-rendering axes
			// set axes scales
			each(axes, function (axis) {
				axis.setScale();
			});

			chart.getMargins();

			chart.maxTicks = null; // reset for second pass
			each(axes, function (axis) {
				axis.setTickPositions(true); // update to reflect the new margins
				axis.setMaxTicks();
			});
			chart.adjustTickAmounts();
			chart.getMargins(); // second pass to check for new labels


			// Draw the borders and backgrounds
			chart.drawChartBox();		


			// Axes
			if (chart.hasCartesianSeries) {
				each(axes, function (axis) {
					axis.render();
				});
			}

			// The series
			if (!chart.seriesGroup) {
				chart.seriesGroup = renderer.g('series-group')
					.attr({ zIndex: 3 })
					.add();
			}
			chart.renderSeries();

			// Labels
			chart.renderLabels();

			// Credits
			chart.showCredits(options.credits);

			// Set flag
			chart.hasRendered = true;

		},

		/**
		 * Show chart credits based on config options
		 */
		showCredits: function (credits) {
			if (credits.enabled && !this.credits) {
				this.credits = this.renderer.text(
					credits.text,
					0,
					0
				)
				.on('click', function () {
					if (credits.href) {
						location.href = credits.href;
					}
				})
				.attr({
					align: credits.position.align,
					zIndex: 8
				})
				.css(credits.style)
				.add()
				.align(credits.position);
			}
		},

		/**
		 * Clean up memory usage
		 */
		destroy: function () {
			var chart = this,
				axes = chart.axes,
				series = chart.series,
				container = chart.container,
				i,
				parentNode = container && container.parentNode;
				
			// fire the chart.destoy event
			fireEvent(chart, 'destroy');
			
			// Delete the chart from charts lookup array
			charts[chart.index] = UNDEFINED;
			chartCount--;
			chart.renderTo.removeAttribute('data-highcharts-chart');

			// remove events
			removeEvent(chart);

			// ==== Destroy collections:
			// Destroy axes
			i = axes.length;
			while (i--) {
				axes[i] = axes[i].destroy();
			}

			// Destroy each series
			i = series.length;
			while (i--) {
				series[i] = series[i].destroy();
			}

			// ==== Destroy chart properties:
			each(['title', 'subtitle', 'chartBackground', 'plotBackground', 'plotBGImage', 
					'plotBorder', 'seriesGroup', 'clipRect', 'credits', 'pointer', 'scroller', 
					'rangeSelector', 'legend', 'resetZoomButton', 'tooltip', 'renderer'], function (name) {
				var prop = chart[name];

				if (prop && prop.destroy) {
					chart[name] = prop.destroy();
				}
			});

			// remove container and all SVG
			if (container) { // can break in IE when destroyed before finished loading
				container.innerHTML = '';
				removeEvent(container);
				if (parentNode) {
					discardElement(container);
				}

			}

			// clean it all up
			for (i in chart) {
				delete chart[i];
			}

		},


		/**
		 * VML namespaces can't be added until after complete. Listening
		 * for Perini's doScroll hack is not enough.
		 */
		isReadyToRender: function () {
			var chart = this;

			// Note: in spite of JSLint's complaints, win == win.top is required
			/*jslint eqeq: true*/
			if ((!hasSVG && (win == win.top && doc.readyState !== 'complete')) || (useCanVG && !win.canvg)) {
			/*jslint eqeq: false*/
				if (useCanVG) {
					// Delay rendering until canvg library is downloaded and ready
					CanVGController.push(function () { chart.firstRender(); }, chart.options.global.canvasToolsURL);
				} else {
					doc.attachEvent('onreadystatechange', function () {
						doc.detachEvent('onreadystatechange', chart.firstRender);
						if (doc.readyState === 'complete') {
							chart.firstRender();
						}
					});
				}
				return false;
			}
			return true;
		},

		/**
		 * Prepare for first rendering after all data are loaded
		 */
		firstRender: function () {
			var chart = this,
				options = chart.options,
				callback = chart.callback;

			// Check whether the chart is ready to render
			if (!chart.isReadyToRender()) {
				return;
			}

			// Create the container
			chart.getContainer();

			// Run an early event after the container and renderer are established
			fireEvent(chart, 'init');

			
			chart.resetMargins();
			chart.setChartSize();

			// Set the common chart properties (mainly invert) from the given series
			chart.propFromSeries();

			// get axes
			chart.getAxes();

			// Initialize the series
			each(options.series || [], function (serieOptions) {
				chart.initSeries(serieOptions);
			});

			chart.linkSeries();

			// Run an event after axes and series are initialized, but before render. At this stage,
			// the series data is indexed and cached in the xData and yData arrays, so we can access
			// those before rendering. Used in Highstock. 
			fireEvent(chart, 'beforeRender'); 

			// depends on inverted and on margins being set
			if (Highcharts.Pointer) {
				chart.pointer = new Pointer(chart, options);
			}

			chart.render();

			// add canvas
			chart.renderer.draw();
			// run callbacks
			if (callback) {
				callback.apply(chart, [chart]);
			}
			each(chart.callbacks, function (fn) {
				fn.apply(chart, [chart]);
			});
			
			
			// If the chart was rendered outside the top container, put it back in
			chart.cloneRenderTo(true);
			
			fireEvent(chart, 'load');

		},

		/**
		* Creates arrays for spacing and margin from given options.
		*/
		splashArray: function (target, options) {
			var oVar = options[target],
				tArray = isObject(oVar) ? oVar : [oVar, oVar, oVar, oVar];

			return [pick(options[target + 'Top'], tArray[0]),
					pick(options[target + 'Right'], tArray[1]),
					pick(options[target + 'Bottom'], tArray[2]),
					pick(options[target + 'Left'], tArray[3])];
		}
	}; // end Chart

	// Hook for exporting module
	Chart.prototype.callbacks = [];



	var CenteredSeriesMixin = Highcharts.CenteredSeriesMixin = {
		/**
		 * Get the center of the pie based on the size and center options relative to the  
		 * plot area. Borrowed by the polar and gauge series types.
		 */
		getCenter: function () {
			
			var options = this.options,
				chart = this.chart,
				slicingRoom = 2 * (options.slicedOffset || 0),
				handleSlicingRoom,
				plotWidth = chart.plotWidth - 2 * slicingRoom,
				plotHeight = chart.plotHeight - 2 * slicingRoom,
				centerOption = options.center,
				positions = [pick(centerOption[0], '50%'), pick(centerOption[1], '50%'), options.size || '100%', options.innerSize || 0],
				smallestSize = mathMin(plotWidth, plotHeight),
				isPercent;
			
			return map(positions, function (length, i) {
				isPercent = /%$/.test(length);
				handleSlicingRoom = i < 2 || (i === 2 && isPercent);
				return (isPercent ?
					// i == 0: centerX, relative to width
					// i == 1: centerY, relative to height
					// i == 2: size, relative to smallestSize
					// i == 4: innerSize, relative to smallestSize
					[plotWidth, plotHeight, smallestSize, smallestSize][i] *
						pInt(length) / 100 :
					length) + (handleSlicingRoom ? slicingRoom : 0);
			});
		}
	};



	/**
	 * The Point object and prototype. Inheritable and used as base for PiePoint
	 */
	var Point = function () {};
	Point.prototype = {

		/**
		 * Initialize the point
		 * @param {Object} series The series object containing this point
		 * @param {Object} options The data in either number, array or object format
		 */
		init: function (series, options, x) {

			var point = this,
				colors;
			point.series = series;
			point.applyOptions(options, x);
			point.pointAttr = {};

			if (series.options.colorByPoint) {
				colors = series.options.colors || series.chart.options.colors;
				point.color = point.color || colors[series.colorCounter++];
				// loop back to zero
				if (series.colorCounter === colors.length) {
					series.colorCounter = 0;
				}
			}

			series.chart.pointCount++;
			return point;
		},
		/**
		 * Apply the options containing the x and y data and possible some extra properties.
		 * This is called on point init or from point.update.
		 *
		 * @param {Object} options
		 */
		applyOptions: function (options, x) {
			var point = this,
				series = point.series,
				pointValKey = series.options.pointValKey || series.pointValKey;

			options = Point.prototype.optionsToObject.call(this, options);

			// copy options directly to point
			extend(point, options);
			point.options = point.options ? extend(point.options, options) : options;

			// For higher dimension series types. For instance, for ranges, point.y is mapped to point.low.
			if (pointValKey) {
				point.y = point[pointValKey];
			}

			// If no x is set by now, get auto incremented value. All points must have an
			// x value, however the y value can be null to create a gap in the series
			if (point.x === UNDEFINED && series) {
				point.x = x === UNDEFINED ? series.autoIncrement() : x;
			}

			return point;
		},

		/**
		 * Transform number or array configs into objects
		 */
		optionsToObject: function (options) {
			var ret = {},
				series = this.series,
				pointArrayMap = series.pointArrayMap || ['y'],
				valueCount = pointArrayMap.length,
				firstItemType,
				i = 0,
				j = 0;

			if (typeof options === 'number' || options === null) {
				ret[pointArrayMap[0]] = options;

			} else if (isArray(options)) {
				// with leading x value
				if (options.length > valueCount) {
					firstItemType = typeof options[0];
					if (firstItemType === 'string') {
						ret.name = options[0];
					} else if (firstItemType === 'number') {
						ret.x = options[0];
					}
					i++;
				}
				while (j < valueCount) {
					ret[pointArrayMap[j++]] = options[i++];
				}
			} else if (typeof options === 'object') {
				ret = options;

				// This is the fastest way to detect if there are individual point dataLabels that need
				// to be considered in drawDataLabels. These can only occur in object configs.
				if (options.dataLabels) {
					series._hasPointLabels = true;
				}

				// Same approach as above for markers
				if (options.marker) {
					series._hasPointMarkers = true;
				}
			}
			return ret;
		},

		/**
		 * Destroy a point to clear memory. Its reference still stays in series.data.
		 */
		destroy: function () {
			var point = this,
				series = point.series,
				chart = series.chart,
				hoverPoints = chart.hoverPoints,
				prop;

			chart.pointCount--;

			if (hoverPoints) {
				point.setState();
				erase(hoverPoints, point);
				if (!hoverPoints.length) {
					chart.hoverPoints = null;
				}

			}
			if (point === chart.hoverPoint) {
				point.onMouseOut();
			}

			// remove all events
			if (point.graphic || point.dataLabel) { // removeEvent and destroyElements are performance expensive
				removeEvent(point);
				point.destroyElements();
			}

			if (point.legendItem) { // pies have legend items
				chart.legend.destroyItem(point);
			}

			for (prop in point) {
				point[prop] = null;
			}


		},

		/**
		 * Destroy SVG elements associated with the point
		 */
		destroyElements: function () {
			var point = this,
				props = ['graphic', 'dataLabel', 'dataLabelUpper', 'group', 'connector', 'shadowGroup'],
				prop,
				i = 6;
			while (i--) {
				prop = props[i];
				if (point[prop]) {
					point[prop] = point[prop].destroy();
				}
			}
		},

		/**
		 * Return the configuration hash needed for the data label and tooltip formatters
		 */
		getLabelConfig: function () {
			var point = this;
			return {
				x: point.category,
				y: point.y,
				key: point.name || point.category,
				series: point.series,
				point: point,
				percentage: point.percentage,
				total: point.total || point.stackTotal
			};
		},	

		/**
		 * Extendable method for formatting each point's tooltip line
		 *
		 * @return {String} A string to be concatenated in to the common tooltip text
		 */
		tooltipFormatter: function (pointFormat) {

			// Insert options for valueDecimals, valuePrefix, and valueSuffix
			var series = this.series,
				seriesTooltipOptions = series.tooltipOptions,
				valueDecimals = pick(seriesTooltipOptions.valueDecimals, ''),
				valuePrefix = seriesTooltipOptions.valuePrefix || '',
				valueSuffix = seriesTooltipOptions.valueSuffix || '';

			// Loop over the point array map and replace unformatted values with sprintf formatting markup
			each(series.pointArrayMap || ['y'], function (key) {
				key = '{point.' + key; // without the closing bracket
				if (valuePrefix || valueSuffix) {
					pointFormat = pointFormat.replace(key + '}', valuePrefix + key + '}' + valueSuffix);
				}
				pointFormat = pointFormat.replace(key + '}', key + ':,.' + valueDecimals + 'f}');
			});

			return format(pointFormat, {
				point: this,
				series: this.series
			});
		},

		/**
		 * Fire an event on the Point object. Must not be renamed to fireEvent, as this
		 * causes a name clash in MooTools
		 * @param {String} eventType
		 * @param {Object} eventArgs Additional event arguments
		 * @param {Function} defaultFunction Default event handler
		 */
		firePointEvent: function (eventType, eventArgs, defaultFunction) {
			var point = this,
				series = this.series,
				seriesOptions = series.options;

			// load event handlers on demand to save time on mouseover/out
			if (seriesOptions.point.events[eventType] || (point.options && point.options.events && point.options.events[eventType])) {
				this.importEvents();
			}

			// add default handler if in selection mode
			if (eventType === 'click' && seriesOptions.allowPointSelect) {
				defaultFunction = function (event) {
					// Control key is for Windows, meta (= Cmd key) for Mac, Shift for Opera
					point.select(null, event.ctrlKey || event.metaKey || event.shiftKey);
				};
			}

			fireEvent(this, eventType, eventArgs, defaultFunction);
		}
	};

	/**
	 * @classDescription The base function which all other series types inherit from. The data in the series is stored
	 * in various arrays.
	 *
	 * - First, series.options.data contains all the original config options for
	 * each point whether added by options or methods like series.addPoint.
	 * - Next, series.data contains those values converted to points, but in case the series data length
	 * exceeds the cropThreshold, or if the data is grouped, series.data doesn't contain all the points. It
	 * only contains the points that have been created on demand.
	 * - Then there's series.points that contains all currently visible point objects. In case of cropping,
	 * the cropped-away points are not part of this array. The series.points array starts at series.cropStart
	 * compared to series.data and series.options.data. If however the series data is grouped, these can't
	 * be correlated one to one.
	 * - series.xData and series.processedXData contain clean x values, equivalent to series.data and series.points.
	 * - series.yData and series.processedYData contain clean x values, equivalent to series.data and series.points.
	 *
	 * @param {Object} chart
	 * @param {Object} options
	 */
	var Series = function () {};

	Series.prototype = {

		isCartesian: true,
		type: 'line',
		pointClass: Point,
		sorted: true, // requires the data to be sorted
		requireSorting: true,
		pointAttrToOptions: { // mapping between SVG attributes and the corresponding options
			stroke: 'lineColor',
			'stroke-width': 'lineWidth',
			fill: 'fillColor',
			r: 'radius'
		},
		axisTypes: ['xAxis', 'yAxis'],
		colorCounter: 0,
		parallelArrays: ['x', 'y'], // each point's x and y values are stored in this.xData and this.yData
		init: function (chart, options) {
			var series = this,
				eventType,
				events,
				chartSeries = chart.series,
				sortByIndex = function (a, b) {
					return pick(a.options.index, a._i) - pick(b.options.index, b._i);
				};

			series.chart = chart;
			series.options = options = series.setOptions(options); // merge with plotOptions
			series.linkedSeries = [];

			// bind the axes
			series.bindAxes();

			// set some variables
			extend(series, {
				name: options.name,
				state: NORMAL_STATE,
				pointAttr: {},
				visible: options.visible !== false, // true by default
				selected: options.selected === true // false by default
			});

			// special
			if (useCanVG) {
				options.animation = false;
			}

			// register event listeners
			events = options.events;
			for (eventType in events) {
				addEvent(series, eventType, events[eventType]);
			}
			if (
				(events && events.click) ||
				(options.point && options.point.events && options.point.events.click) ||
				options.allowPointSelect
			) {
				chart.runTrackerClick = true;
			}

			series.getColor();
			series.getSymbol();

			// Set the data
			each(series.parallelArrays, function (key) {
				series[key + 'Data'] = [];
			});
			series.setData(options.data, false);

			// Mark cartesian
			if (series.isCartesian) {
				chart.hasCartesianSeries = true;
			}

			// Register it in the chart
			chartSeries.push(series);
			series._i = chartSeries.length - 1;

			// Sort series according to index option (#248, #1123, #2456)
			stableSort(chartSeries, sortByIndex);
			if (this.yAxis) {
				stableSort(this.yAxis.series, sortByIndex);
			}

			each(chartSeries, function (series, i) {
				series.index = i;
				series.name = series.name || 'Series ' + (i + 1);
			});

		},

		/**
		 * Set the xAxis and yAxis properties of cartesian series, and register the series
		 * in the axis.series array
		 */
		bindAxes: function () {
			var series = this,
				seriesOptions = series.options,
				chart = series.chart,
				axisOptions;

			each(series.axisTypes || [], function (AXIS) { // repeat for xAxis and yAxis

				each(chart[AXIS], function (axis) { // loop through the chart's axis objects
					axisOptions = axis.options;

					// apply if the series xAxis or yAxis option mathches the number of the
					// axis, or if undefined, use the first axis
					if ((seriesOptions[AXIS] === axisOptions.index) ||
							(seriesOptions[AXIS] !== UNDEFINED && seriesOptions[AXIS] === axisOptions.id) ||
							(seriesOptions[AXIS] === UNDEFINED && axisOptions.index === 0)) {

						// register this series in the axis.series lookup
						axis.series.push(series);

						// set this series.xAxis or series.yAxis reference
						series[AXIS] = axis;

						// mark dirty for redraw
						axis.isDirty = true;
					}
				});

				// The series needs an X and an Y axis
				if (!series[AXIS] && series.optionalAxis !== AXIS) {
					error(18, true);
				}

			});
		},

		/**
		 * For simple series types like line and column, the data values are held in arrays like
		 * xData and yData for quick lookup to find extremes and more. For multidimensional series
		 * like bubble and map, this can be extended with arrays like zData and valueData by
		 * adding to the series.parallelArrays array.
		 */
		updateParallelArrays: function (point, i) {
			var series = point.series,
				args = arguments,
				fn = typeof i === 'number' ?
					 // Insert the value in the given position
					function (key) {
						var val = key === 'y' && series.toYData ? series.toYData(point) : point[key];
						series[key + 'Data'][i] = val;
					} :
					// Apply the method specified in i with the following arguments as arguments
					function (key) {
						Array.prototype[i].apply(series[key + 'Data'], Array.prototype.slice.call(args, 2));
					};

			each(series.parallelArrays, fn);
		},

		/**
		 * Return an auto incremented x value based on the pointStart and pointInterval options.
		 * This is only used if an x value is not given for the point that calls autoIncrement.
		 */
		autoIncrement: function () {
			var series = this,
				options = series.options,
				xIncrement = series.xIncrement;

			xIncrement = pick(xIncrement, options.pointStart, 0);

			series.pointInterval = pick(series.pointInterval, options.pointInterval, 1);

			series.xIncrement = xIncrement + series.pointInterval;
			return xIncrement;
		},

		/**
		 * Divide the series data into segments divided by null values.
		 */
		getSegments: function () {
			var series = this,
				lastNull = -1,
				segments = [],
				i,
				points = series.points,
				pointsLength = points.length;

			if (pointsLength) { // no action required for []

				// if connect nulls, just remove null points
				if (series.options.connectNulls) {
					i = pointsLength;
					while (i--) {
						if (points[i].y === null) {
							points.splice(i, 1);
						}
					}
					if (points.length) {
						segments = [points];
					}

				// else, split on null points
				} else {
					each(points, function (point, i) {
						if (point.y === null) {
							if (i > lastNull + 1) {
								segments.push(points.slice(lastNull + 1, i));
							}
							lastNull = i;
						} else if (i === pointsLength - 1) { // last value
							segments.push(points.slice(lastNull + 1, i + 1));
						}
					});
				}
			}

			// register it
			series.segments = segments;
		},

		/**
		 * Set the series options by merging from the options tree
		 * @param {Object} itemOptions
		 */
		setOptions: function (itemOptions) {
			var chart = this.chart,
				chartOptions = chart.options,
				plotOptions = chartOptions.plotOptions,
				userOptions = chart.userOptions || {},
				userPlotOptions = userOptions.plotOptions || {},
				typeOptions = plotOptions[this.type],
				options;

			this.userOptions = itemOptions;

			options = merge(
				typeOptions,
				plotOptions.series,
				itemOptions
			);

			// The tooltip options are merged between global and series specific options
			this.tooltipOptions = merge(
				defaultOptions.tooltip,
				defaultOptions.plotOptions[this.type].tooltip,
				userOptions.tooltip,
				userPlotOptions.series && userPlotOptions.series.tooltip,
				userPlotOptions[this.type] && userPlotOptions[this.type].tooltip,
				itemOptions.tooltip
			);

			// Delete marker object if not allowed (#1125)
			if (typeOptions.marker === null) {
				delete options.marker;
			}

			return options;

		},

		getCyclic: function (prop, value, defaults) {
			var i,
				userOptions = this.userOptions,
				indexName = '_' + prop + 'Index',
				counterName = prop + 'Counter';

			if (!value) {
				if (defined(userOptions[indexName])) { // after Series.update()
					i = userOptions[indexName];
				} else {
					userOptions[indexName] = i = this.chart[counterName] % defaults.length;
					this.chart[counterName] += 1;
				}
				value = defaults[i];
			}
			this[prop] = value;
		},

		/**
		 * Get the series' color
		 */
		getColor: function () {
			if (!this.options.colorByPoint) {
				this.getCyclic('color', this.options.color || defaultPlotOptions[this.type].color, this.chart.options.colors);
			}
		},
		/**
		 * Get the series' symbol
		 */
		getSymbol: function () {
			var seriesMarkerOption = this.options.marker;

			this.getCyclic('symbol', seriesMarkerOption.symbol, this.chart.options.symbols);

			// don't substract radius in image symbols (#604)
			if (/^url/.test(this.symbol)) {
				seriesMarkerOption.radius = 0;
			}
		},

		drawLegendSymbol: LegendSymbolMixin.drawLineMarker,

		/**
		 * Replace the series data with a new set of data
		 * @param {Object} data
		 * @param {Object} redraw
		 */
		setData: function (data, redraw, animation, updatePoints) {
			var series = this,
				oldData = series.points,
				oldDataLength = (oldData && oldData.length) || 0,
				dataLength,
				options = series.options,
				chart = series.chart,
				firstPoint = null,
				xAxis = series.xAxis,
				hasCategories = xAxis && !!xAxis.categories,
				tooltipPoints = series.tooltipPoints,
				i,
				turboThreshold = options.turboThreshold,
				pt,
				xData = this.xData,
				yData = this.yData,
				pointArrayMap = series.pointArrayMap,
				valueCount = pointArrayMap && pointArrayMap.length;

			data = data || [];
			dataLength = data.length;
			redraw = pick(redraw, true);

			// If the point count is the same as is was, just run Point.update which is
			// cheaper, allows animation, and keeps references to points.
			if (updatePoints !== false && dataLength && oldDataLength === dataLength && !series.cropped && !series.hasGroupedData) {
				each(data, function (point, i) {
					oldData[i].update(point, false, null, false);
				});

			} else {

				// Reset properties
				series.xIncrement = null;
				series.pointRange = hasCategories ? 1 : options.pointRange;

				series.colorCounter = 0; // for series with colorByPoint (#1547)
				
				// Update parallel arrays
				each(this.parallelArrays, function (key) {
					series[key + 'Data'].length = 0;
				});

				// In turbo mode, only one- or twodimensional arrays of numbers are allowed. The
				// first value is tested, and we assume that all the rest are defined the same
				// way. Although the 'for' loops are similar, they are repeated inside each
				// if-else conditional for max performance.
				if (turboThreshold && dataLength > turboThreshold) {

					// find the first non-null point
					i = 0;
					while (firstPoint === null && i < dataLength) {
						firstPoint = data[i];
						i++;
					}


					if (isNumber(firstPoint)) { // assume all points are numbers
						var x = pick(options.pointStart, 0),
							pointInterval = pick(options.pointInterval, 1);

						for (i = 0; i < dataLength; i++) {
							xData[i] = x;
							yData[i] = data[i];
							x += pointInterval;
						}
						series.xIncrement = x;
					} else if (isArray(firstPoint)) { // assume all points are arrays
						if (valueCount) { // [x, low, high] or [x, o, h, l, c]
							for (i = 0; i < dataLength; i++) {
								pt = data[i];
								xData[i] = pt[0];
								yData[i] = pt.slice(1, valueCount + 1);
							}
						} else { // [x, y]
							for (i = 0; i < dataLength; i++) {
								pt = data[i];
								xData[i] = pt[0];
								yData[i] = pt[1];
							}
						}
					} else {
						error(12); // Highcharts expects configs to be numbers or arrays in turbo mode
					}
				} else {
					for (i = 0; i < dataLength; i++) {
						if (data[i] !== UNDEFINED) { // stray commas in oldIE
							pt = { series: series };
							series.pointClass.prototype.applyOptions.apply(pt, [data[i]]);
							series.updateParallelArrays(pt, i);
							if (hasCategories && pt.name) {
								xAxis.names[pt.x] = pt.name; // #2046
							}
						}
					}
				}

				// Forgetting to cast strings to numbers is a common caveat when handling CSV or JSON
				if (isString(yData[0])) {
					error(14, true);
				}

				series.data = [];
				series.options.data = data;
				//series.zData = zData;

				// destroy old points
				i = oldDataLength;
				while (i--) {
					if (oldData[i] && oldData[i].destroy) {
						oldData[i].destroy();
					}
				}
				if (tooltipPoints) { // #2594
					tooltipPoints.length = 0;
				}

				// reset minRange (#878)
				if (xAxis) {
					xAxis.minRange = xAxis.userMinRange;
				}

				// redraw
				series.isDirty = series.isDirtyData = chart.isDirtyBox = true;
				animation = false;
			}

			if (redraw) {
				chart.redraw(animation);
			}
		},

		/**
		 * Process the data by cropping away unused data points if the series is longer
		 * than the crop threshold. This saves computing time for lage series.
		 */
		processData: function (force) {
			var series = this,
				processedXData = series.xData, // copied during slice operation below
				processedYData = series.yData,
				dataLength = processedXData.length,
				croppedData,
				cropStart = 0,
				cropped,
				distance,
				closestPointRange,
				xAxis = series.xAxis,
				i, // loop variable
				options = series.options,
				cropThreshold = options.cropThreshold,
				activePointCount = 0,
				isCartesian = series.isCartesian,
				xExtremes,
				min,
				max;

			// If the series data or axes haven't changed, don't go through this. Return false to pass
			// the message on to override methods like in data grouping.
			if (isCartesian && !series.isDirty && !xAxis.isDirty && !series.yAxis.isDirty && !force) {
				return false;
			}

			if (xAxis) {
				xExtremes = xAxis.getExtremes(); // corrected for log axis (#3053)
				min = xExtremes.min;
				max = xExtremes.max;
			}

			// optionally filter out points outside the plot area
			if (isCartesian && series.sorted && (!cropThreshold || dataLength > cropThreshold || series.forceCrop)) {
				
				// it's outside current extremes
				if (processedXData[dataLength - 1] < min || processedXData[0] > max) {
					processedXData = [];
					processedYData = [];

				// only crop if it's actually spilling out
				} else if (processedXData[0] < min || processedXData[dataLength - 1] > max) {
					croppedData = this.cropData(series.xData, series.yData, min, max);
					processedXData = croppedData.xData;
					processedYData = croppedData.yData;
					cropStart = croppedData.start;
					cropped = true;
					activePointCount = processedXData.length;
				}
			}


			// Find the closest distance between processed points
			for (i = processedXData.length - 1; i >= 0; i--) {
				distance = processedXData[i] - processedXData[i - 1];
				
				if (!cropped && processedXData[i] > min && processedXData[i] < max) {
					activePointCount++;
				}
				
				if (distance > 0 && (closestPointRange === UNDEFINED || distance < closestPointRange)) {
					closestPointRange = distance;

				// Unsorted data is not supported by the line tooltip, as well as data grouping and
				// navigation in Stock charts (#725) and width calculation of columns (#1900)
				} else if (distance < 0 && series.requireSorting) {
					error(15);
				}
			}

			// Record the properties
			series.cropped = cropped; // undefined or true
			series.cropStart = cropStart;
			series.processedXData = processedXData;
			series.processedYData = processedYData;
			series.activePointCount = activePointCount;

			if (options.pointRange === null) { // null means auto, as for columns, candlesticks and OHLC
				series.pointRange = closestPointRange || 1;
			}
			series.closestPointRange = closestPointRange;

		},

		/**
		 * Iterate over xData and crop values between min and max. Returns object containing crop start/end
		 * cropped xData with corresponding part of yData, dataMin and dataMax within the cropped range
		 */
		cropData: function (xData, yData, min, max) {
			var dataLength = xData.length,
				cropStart = 0,
				cropEnd = dataLength,
				cropShoulder = pick(this.cropShoulder, 1), // line-type series need one point outside
				i;

			// iterate up to find slice start
			for (i = 0; i < dataLength; i++) {
				if (xData[i] >= min) {
					cropStart = mathMax(0, i - cropShoulder);
					break;
				}
			}

			// proceed to find slice end
			for (; i < dataLength; i++) {
				if (xData[i] > max) {
					cropEnd = i + cropShoulder;
					break;
				}
			}

			return {
				xData: xData.slice(cropStart, cropEnd),
				yData: yData.slice(cropStart, cropEnd),
				start: cropStart,
				end: cropEnd
			};
		},


		/**
		 * Generate the data point after the data has been processed by cropping away
		 * unused points and optionally grouped in Highcharts Stock.
		 */
		generatePoints: function () {
			var series = this,
				options = series.options,
				dataOptions = options.data,
				data = series.data,
				dataLength,
				processedXData = series.processedXData,
				processedYData = series.processedYData,
				pointClass = series.pointClass,
				processedDataLength = processedXData.length,
				cropStart = series.cropStart || 0,
				cursor,
				hasGroupedData = series.hasGroupedData,
				point,
				points = [],
				i;

			if (!data && !hasGroupedData) {
				var arr = [];
				arr.length = dataOptions.length;
				data = series.data = arr;
			}

			for (i = 0; i < processedDataLength; i++) {
				cursor = cropStart + i;
				if (!hasGroupedData) {
					if (data[cursor]) {
						point = data[cursor];
					} else if (dataOptions[cursor] !== UNDEFINED) { // #970
						data[cursor] = point = (new pointClass()).init(series, dataOptions[cursor], processedXData[i]);
					}
					points[i] = point;
				} else {
					// splat the y data in case of ohlc data array
					points[i] = (new pointClass()).init(series, [processedXData[i]].concat(splat(processedYData[i])));
				}
				points[i].index = cursor; // For faster access in Point.update
			}

			// Hide cropped-away points - this only runs when the number of points is above cropThreshold, or when
			// swithching view from non-grouped data to grouped data (#637)
			if (data && (processedDataLength !== (dataLength = data.length) || hasGroupedData)) {
				for (i = 0; i < dataLength; i++) {
					if (i === cropStart && !hasGroupedData) { // when has grouped data, clear all points
						i += processedDataLength;
					}
					if (data[i]) {
						data[i].destroyElements();
						data[i].plotX = UNDEFINED; // #1003
					}
				}
			}

			series.data = data;
			series.points = points;
		},

		/**
		 * Calculate Y extremes for visible data
		 */
		getExtremes: function (yData) {
			var xAxis = this.xAxis,
				yAxis = this.yAxis,
				xData = this.processedXData,
				yDataLength,
				activeYData = [],
				activeCounter = 0,
				xExtremes = xAxis.getExtremes(), // #2117, need to compensate for log X axis
				xMin = xExtremes.min,
				xMax = xExtremes.max,
				validValue,
				withinRange,
				dataMin,
				dataMax,
				x,
				y,
				i,
				j;

			yData = yData || this.stackedYData || this.processedYData;
			yDataLength = yData.length;

			for (i = 0; i < yDataLength; i++) {

				x = xData[i];
				y = yData[i];

				// For points within the visible range, including the first point outside the
				// visible range, consider y extremes
				validValue = y !== null && y !== UNDEFINED && (!yAxis.isLog || (y.length || y > 0));
				withinRange = this.getExtremesFromAll || this.cropped || ((xData[i + 1] || x) >= xMin &&
					(xData[i - 1] || x) <= xMax);

				if (validValue && withinRange) {

					j = y.length;
					if (j) { // array, like ohlc or range data
						while (j--) {
							if (y[j] !== null) {
								activeYData[activeCounter++] = y[j];
							}
						}
					} else {
						activeYData[activeCounter++] = y;
					}
				}
			}
			this.dataMin = pick(dataMin, arrayMin(activeYData));
			this.dataMax = pick(dataMax, arrayMax(activeYData));
		},

		/**
		 * Translate data points from raw data values to chart specific positioning data
		 * needed later in drawPoints, drawGraph and drawTracker.
		 */
		translate: function () {
			if (!this.processedXData) { // hidden series
				this.processData();
			}
			this.generatePoints();
			var series = this,
				options = series.options,
				stacking = options.stacking,
				xAxis = series.xAxis,
				categories = xAxis.categories,
				yAxis = series.yAxis,
				points = series.points,
				dataLength = points.length,
				hasModifyValue = !!series.modifyValue,
				i,
				pointPlacement = options.pointPlacement,
				dynamicallyPlaced = pointPlacement === 'between' || isNumber(pointPlacement),
				threshold = options.threshold;

			// Translate each point
			for (i = 0; i < dataLength; i++) {
				var point = points[i],
					xValue = point.x,
					yValue = point.y,
					yBottom = point.low,
					stack = stacking && yAxis.stacks[(series.negStacks && yValue < threshold ? '-' : '') + series.stackKey],
					pointStack,
					stackValues;

				// Discard disallowed y values for log axes
				if (yAxis.isLog && yValue <= 0) {
					point.y = yValue = null;
					error(10);
				}

				// Get the plotX translation
				point.plotX = xAxis.translate(xValue, 0, 0, 0, 1, pointPlacement, this.type === 'flags'); // Math.round fixes #591


				// Calculate the bottom y value for stacked series
				if (stacking && series.visible && stack && stack[xValue]) {

					pointStack = stack[xValue];
					stackValues = pointStack.points[series.index + ',' + i];
					yBottom = stackValues[0];
					yValue = stackValues[1];

					if (yBottom === 0) {
						yBottom = pick(threshold, yAxis.min);
					}
					if (yAxis.isLog && yBottom <= 0) { // #1200, #1232
						yBottom = null;
					}

					point.total = point.stackTotal = pointStack.total;
					point.percentage = pointStack.total && (point.y / pointStack.total * 100);
					point.stackY = yValue;

					// Place the stack label
					pointStack.setOffset(series.pointXOffset || 0, series.barW || 0);

				}

				// Set translated yBottom or remove it
				point.yBottom = defined(yBottom) ?
					yAxis.translate(yBottom, 0, 1, 0, 1) :
					null;

				// general hook, used for Highstock compare mode
				if (hasModifyValue) {
					yValue = series.modifyValue(yValue, point);
				}

				// Set the the plotY value, reset it for redraws
				point.plotY = (typeof yValue === 'number' && yValue !== Infinity) ?
					//mathRound(yAxis.translate(yValue, 0, 1, 0, 1) * 10) / 10 : // Math.round fixes #591
					yAxis.translate(yValue, 0, 1, 0, 1) :
					UNDEFINED;

				// Set client related positions for mouse tracking
				point.clientX = dynamicallyPlaced ? xAxis.translate(xValue, 0, 0, 0, 1) : point.plotX; // #1514

				point.negative = point.y < (threshold || 0);

				// some API data
				point.category = categories && categories[point.x] !== UNDEFINED ?
					categories[point.x] : point.x;

			}

			// now that we have the cropped data, build the segments
			series.getSegments();
		},

		/**
		 * Animate in the series
		 */
		animate: function (init) {
			var series = this,
				chart = series.chart,
				renderer = chart.renderer,
				clipRect,
				markerClipRect,
				animation = series.options.animation,
				clipBox = series.clipBox || chart.clipBox,
				inverted = chart.inverted,
				sharedClipKey;

			// Animation option is set to true
			if (animation && !isObject(animation)) {
				animation = defaultPlotOptions[series.type].animation;
			}
			sharedClipKey = ['_sharedClip', animation.duration, animation.easing, clipBox.height].join(',');

			// Initialize the animation. Set up the clipping rectangle.
			if (init) {

				// If a clipping rectangle with the same properties is currently present in the chart, use that.
				clipRect = chart[sharedClipKey];
				markerClipRect = chart[sharedClipKey + 'm'];
				if (!clipRect) {
					chart[sharedClipKey] = clipRect = renderer.clipRect(
						extend(clipBox, { width: 0 })
					);

					chart[sharedClipKey + 'm'] = markerClipRect = renderer.clipRect(
						-99, // include the width of the first marker
						inverted ? -chart.plotLeft : -chart.plotTop,
						99,
						inverted ? chart.chartWidth : chart.chartHeight
					);
				}
				series.group.clip(clipRect);
				series.markerGroup.clip(markerClipRect);
				series.sharedClipKey = sharedClipKey;

			// Run the animation
			} else {
				clipRect = chart[sharedClipKey];
				if (clipRect) {
					clipRect.animate({
						width: chart.plotSizeX
					}, animation);
				}
				if (chart[sharedClipKey + 'm']) {
					chart[sharedClipKey + 'm'].animate({
						width: chart.plotSizeX + 99
					}, animation);
				}

				// Delete this function to allow it only once
				series.animate = null;
	 
			}
		},

		/**
		 * This runs after animation to land on the final plot clipping
		 */
		afterAnimate: function () {
			var chart = this.chart,
				sharedClipKey = this.sharedClipKey,
				group = this.group,
				clipBox = this.clipBox;

			if (group && this.options.clip !== false) {
				if (!sharedClipKey || !clipBox) {
					group.clip(clipBox ? chart.renderer.clipRect(clipBox) : chart.clipRect);
				}
				this.markerGroup.clip(); // no clip
			}

			fireEvent(this, 'afterAnimate');

			// Remove the shared clipping rectancgle when all series are shown
			setTimeout(function () {
				if (sharedClipKey && chart[sharedClipKey]) {
					if (!clipBox) {
						chart[sharedClipKey] = chart[sharedClipKey].destroy();
					}
					if (chart[sharedClipKey + 'm']) {
						chart[sharedClipKey + 'm'] = chart[sharedClipKey + 'm'].destroy();
					}
				}
			}, 100);
		},

		/**
		 * Draw the markers
		 */
		drawPoints: function () {
			var series = this,
				pointAttr,
				points = series.points,
				chart = series.chart,
				plotX,
				plotY,
				i,
				point,
				radius,
				symbol,
				isImage,
				graphic,
				options = series.options,
				seriesMarkerOptions = options.marker,
				seriesPointAttr = series.pointAttr[''],
				pointMarkerOptions,
				hasPointMarker,
				enabled,
				isInside,
				markerGroup = series.markerGroup,
				globallyEnabled = pick(
					seriesMarkerOptions.enabled, 
					!series.requireSorting || series.activePointCount < (0.5 * series.xAxis.len / seriesMarkerOptions.radius)
				);

			if (seriesMarkerOptions.enabled !== false || series._hasPointMarkers) {

				i = points.length;
				while (i--) {
					point = points[i];
					plotX = mathFloor(point.plotX); // #1843
					plotY = point.plotY;
					graphic = point.graphic;
					pointMarkerOptions = point.marker || {};
					hasPointMarker = !!point.marker;
					enabled = (globallyEnabled && pointMarkerOptions.enabled === UNDEFINED) || pointMarkerOptions.enabled;
					isInside = chart.isInsidePlot(mathRound(plotX), plotY, chart.inverted); // #1858

					// only draw the point if y is defined
					if (enabled && plotY !== UNDEFINED && !isNaN(plotY) && point.y !== null) {

						// shortcuts
						pointAttr = point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE] || seriesPointAttr;
						radius = pointAttr.r;
						symbol = pick(pointMarkerOptions.symbol, series.symbol);
						isImage = symbol.indexOf('url') === 0;

						if (graphic) { // update
							graphic[isInside ? 'show' : 'hide'](true) // Since the marker group isn't clipped, each individual marker must be toggled
								.animate(extend({
									x: plotX - radius,
									y: plotY - radius
								}, graphic.symbolName ? { // don't apply to image symbols #507
									width: 2 * radius,
									height: 2 * radius
								} : {}));
						} else if (isInside && (radius > 0 || isImage)) {
							point.graphic = graphic = chart.renderer.symbol(
								symbol,
								plotX - radius,
								plotY - radius,
								2 * radius,
								2 * radius,
								hasPointMarker ? pointMarkerOptions : seriesMarkerOptions
							)
							.attr(pointAttr)
							.add(markerGroup);
						}

					} else if (graphic) {
						point.graphic = graphic.destroy(); // #1269
					}
				}
			}

		},

		/**
		 * Convert state properties from API naming conventions to SVG attributes
		 *
		 * @param {Object} options API options object
		 * @param {Object} base1 SVG attribute object to inherit from
		 * @param {Object} base2 Second level SVG attribute object to inherit from
		 */
		convertAttribs: function (options, base1, base2, base3) {
			var conversion = this.pointAttrToOptions,
				attr,
				option,
				obj = {};

			options = options || {};
			base1 = base1 || {};
			base2 = base2 || {};
			base3 = base3 || {};

			for (attr in conversion) {
				option = conversion[attr];
				obj[attr] = pick(options[option], base1[attr], base2[attr], base3[attr]);
			}
			return obj;
		},

		/**
		 * Get the state attributes. Each series type has its own set of attributes
		 * that are allowed to change on a point's state change. Series wide attributes are stored for
		 * all series, and additionally point specific attributes are stored for all
		 * points with individual marker options. If such options are not defined for the point,
		 * a reference to the series wide attributes is stored in point.pointAttr.
		 */
		getAttribs: function () {
			var series = this,
				seriesOptions = series.options,
				normalOptions = defaultPlotOptions[series.type].marker ? seriesOptions.marker : seriesOptions,
				stateOptions = normalOptions.states,
				stateOptionsHover = stateOptions[HOVER_STATE],
				pointStateOptionsHover,
				seriesColor = series.color,
				normalDefaults = {
					stroke: seriesColor,
					fill: seriesColor
				},
				points = series.points || [], // #927
				i,
				point,
				seriesPointAttr = [],
				pointAttr,
				pointAttrToOptions = series.pointAttrToOptions,
				hasPointSpecificOptions = series.hasPointSpecificOptions,
				negativeColor = seriesOptions.negativeColor,
				defaultLineColor = normalOptions.lineColor,
				defaultFillColor = normalOptions.fillColor,
				turboThreshold = seriesOptions.turboThreshold,
				attr,
				key;

			// series type specific modifications
			if (seriesOptions.marker) { // line, spline, area, areaspline, scatter

				// if no hover radius is given, default to normal radius + 2
				stateOptionsHover.radius = stateOptionsHover.radius || normalOptions.radius + stateOptionsHover.radiusPlus;
				stateOptionsHover.lineWidth = stateOptionsHover.lineWidth || normalOptions.lineWidth + stateOptionsHover.lineWidthPlus;

			} else { // column, bar, pie

				// if no hover color is given, brighten the normal color
				stateOptionsHover.color = stateOptionsHover.color ||
					Color(stateOptionsHover.color || seriesColor)
						.brighten(stateOptionsHover.brightness).get();
			}

			// general point attributes for the series normal state
			seriesPointAttr[NORMAL_STATE] = series.convertAttribs(normalOptions, normalDefaults);

			// HOVER_STATE and SELECT_STATE states inherit from normal state except the default radius
			each([HOVER_STATE, SELECT_STATE], function (state) {
				seriesPointAttr[state] =
						series.convertAttribs(stateOptions[state], seriesPointAttr[NORMAL_STATE]);
			});

			// set it
			series.pointAttr = seriesPointAttr;


			// Generate the point-specific attribute collections if specific point
			// options are given. If not, create a referance to the series wide point
			// attributes
			i = points.length;
			if (!turboThreshold || i < turboThreshold || hasPointSpecificOptions) {
				while (i--) {
					point = points[i];
					normalOptions = (point.options && point.options.marker) || point.options;
					if (normalOptions && normalOptions.enabled === false) {
						normalOptions.radius = 0;
					}

					if (point.negative && negativeColor) {
						point.color = point.fillColor = negativeColor;
					}

					hasPointSpecificOptions = seriesOptions.colorByPoint || point.color; // #868

					// check if the point has specific visual options
					if (point.options) {
						for (key in pointAttrToOptions) {
							if (defined(normalOptions[pointAttrToOptions[key]])) {
								hasPointSpecificOptions = true;
							}
						}
					}

					// a specific marker config object is defined for the individual point:
					// create it's own attribute collection
					if (hasPointSpecificOptions) {
						normalOptions = normalOptions || {};
						pointAttr = [];
						stateOptions = normalOptions.states || {}; // reassign for individual point
						pointStateOptionsHover = stateOptions[HOVER_STATE] = stateOptions[HOVER_STATE] || {};

						// Handle colors for column and pies
						if (!seriesOptions.marker) { // column, bar, point
							// If no hover color is given, brighten the normal color. #1619, #2579
							pointStateOptionsHover.color = pointStateOptionsHover.color || (!point.options.color && stateOptionsHover.color) ||
								Color(point.color)
									.brighten(pointStateOptionsHover.brightness || stateOptionsHover.brightness)
									.get();
						}

						// normal point state inherits series wide normal state
						attr = { color: point.color }; // #868
						if (!defaultFillColor) { // Individual point color or negative color markers (#2219)
							attr.fillColor = point.color;
						}
						if (!defaultLineColor) {
							attr.lineColor = point.color; // Bubbles take point color, line markers use white
						}
						pointAttr[NORMAL_STATE] = series.convertAttribs(extend(attr, normalOptions), seriesPointAttr[NORMAL_STATE]);

						// inherit from point normal and series hover
						pointAttr[HOVER_STATE] = series.convertAttribs(
							stateOptions[HOVER_STATE],
							seriesPointAttr[HOVER_STATE],
							pointAttr[NORMAL_STATE]
						);

						// inherit from point normal and series hover
						pointAttr[SELECT_STATE] = series.convertAttribs(
							stateOptions[SELECT_STATE],
							seriesPointAttr[SELECT_STATE],
							pointAttr[NORMAL_STATE]
						);


					// no marker config object is created: copy a reference to the series-wide
					// attribute collection
					} else {
						pointAttr = seriesPointAttr;
					}

					point.pointAttr = pointAttr;
				}
			}
		},

		/**
		 * Clear DOM objects and free up memory
		 */
		destroy: function () {
			var series = this,
				chart = series.chart,
				issue134 = /AppleWebKit\/533/.test(userAgent),
				destroy,
				i,
				data = series.data || [],
				point,
				prop,
				axis;

			// add event hook
			fireEvent(series, 'destroy');

			// remove all events
			removeEvent(series);

			// erase from axes
			each(series.axisTypes || [], function (AXIS) {
				axis = series[AXIS];
				if (axis) {
					erase(axis.series, series);
					axis.isDirty = axis.forceRedraw = true;
				}
			});

			// remove legend items
			if (series.legendItem) {
				series.chart.legend.destroyItem(series);
			}

			// destroy all points with their elements
			i = data.length;
			while (i--) {
				point = data[i];
				if (point && point.destroy) {
					point.destroy();
				}
			}
			series.points = null;

			// Clear the animation timeout if we are destroying the series during initial animation
			clearTimeout(series.animationTimeout);

			// destroy all SVGElements associated to the series
			each(['area', 'graph', 'dataLabelsGroup', 'group', 'markerGroup', 'tracker',
					'graphNeg', 'areaNeg', 'posClip', 'negClip'], function (prop) {
				if (series[prop]) {

					// issue 134 workaround
					destroy = issue134 && prop === 'group' ?
						'hide' :
						'destroy';

					series[prop][destroy]();
				}
			});

			// remove from hoverSeries
			if (chart.hoverSeries === series) {
				chart.hoverSeries = null;
			}
			erase(chart.series, series);

			// clear all members
			for (prop in series) {
				delete series[prop];
			}
		},

		/**
		 * Return the graph path of a segment
		 */
		getSegmentPath: function (segment) {
			var series = this,
				segmentPath = [],
				step = series.options.step;

			// build the segment line
			each(segment, function (point, i) {

				var plotX = point.plotX,
					plotY = point.plotY,
					lastPoint;

				if (series.getPointSpline) { // generate the spline as defined in the SplineSeries object
					segmentPath.push.apply(segmentPath, series.getPointSpline(segment, point, i));

				} else {

					// moveTo or lineTo
					segmentPath.push(i ? L : M);

					// step line?
					if (step && i) {
						lastPoint = segment[i - 1];
						if (step === 'right') {
							segmentPath.push(
								lastPoint.plotX,
								plotY
							);

						} else if (step === 'center') {
							segmentPath.push(
								(lastPoint.plotX + plotX) / 2,
								lastPoint.plotY,
								(lastPoint.plotX + plotX) / 2,
								plotY
							);

						} else {
							segmentPath.push(
								plotX,
								lastPoint.plotY
							);
						}
					}

					// normal line to next point
					segmentPath.push(
						point.plotX,
						point.plotY
					);
				}
			});

			return segmentPath;
		},

		/**
		 * Get the graph path
		 */
		getGraphPath: function () {
			var series = this,
				graphPath = [],
				segmentPath,
				singlePoints = []; // used in drawTracker

			// Divide into segments and build graph and area paths
			each(series.segments, function (segment) {

				segmentPath = series.getSegmentPath(segment);

				// add the segment to the graph, or a single point for tracking
				if (segment.length > 1) {
					graphPath = graphPath.concat(segmentPath);
				} else {
					singlePoints.push(segment[0]);
				}
			});

			// Record it for use in drawGraph and drawTracker, and return graphPath
			series.singlePoints = singlePoints;
			series.graphPath = graphPath;

			return graphPath;

		},

		/**
		 * Draw the actual graph
		 */
		drawGraph: function () {
			var series = this,
				options = this.options,
				props = [['graph', options.lineColor || this.color]],
				lineWidth = options.lineWidth,
				dashStyle =  options.dashStyle,
				roundCap = options.linecap !== 'square',
				graphPath = this.getGraphPath(),
				negativeColor = options.negativeColor;

			if (negativeColor) {
				props.push(['graphNeg', negativeColor]);
			}

			// draw the graph
			each(props, function (prop, i) {
				var graphKey = prop[0],
					graph = series[graphKey],
					attribs;

				if (graph) {
					stop(graph); // cancel running animations, #459
					graph.animate({ d: graphPath });

				} else if (lineWidth && graphPath.length) { // #1487
					attribs = {
						stroke: prop[1],
						'stroke-width': lineWidth,
						fill: NONE,
						zIndex: 1 // #1069
					};
					if (dashStyle) {
						attribs.dashstyle = dashStyle;
					} else if (roundCap) {
						attribs['stroke-linecap'] = attribs['stroke-linejoin'] = 'round';
					}

					series[graphKey] = series.chart.renderer.path(graphPath)
						.attr(attribs)
						.add(series.group)
						.shadow(!i && options.shadow);
				}
			});
		},

		/**
		 * Clip the graphs into the positive and negative coloured graphs
		 */
		clipNeg: function () {
			var options = this.options,
				chart = this.chart,
				renderer = chart.renderer,
				negativeColor = options.negativeColor || options.negativeFillColor,
				translatedThreshold,
				posAttr,
				negAttr,
				graph = this.graph,
				area = this.area,
				posClip = this.posClip,
				negClip = this.negClip,
				chartWidth = chart.chartWidth,
				chartHeight = chart.chartHeight,
				chartSizeMax = mathMax(chartWidth, chartHeight),
				yAxis = this.yAxis,
				above,
				below;

			if (negativeColor && (graph || area)) {
				translatedThreshold = mathRound(yAxis.toPixels(options.threshold || 0, true));
				if (translatedThreshold < 0) {
					chartSizeMax -= translatedThreshold; // #2534
				}
				above = {
					x: 0,
					y: 0,
					width: chartSizeMax,
					height: translatedThreshold
				};
				below = {
					x: 0,
					y: translatedThreshold,
					width: chartSizeMax,
					height: chartSizeMax
				};

				if (chart.inverted) {

					above.height = below.y = chart.plotWidth - translatedThreshold;
					if (renderer.isVML) {
						above = {
							x: chart.plotWidth - translatedThreshold - chart.plotLeft,
							y: 0,
							width: chartWidth,
							height: chartHeight
						};
						below = {
							x: translatedThreshold + chart.plotLeft - chartWidth,
							y: 0,
							width: chart.plotLeft + translatedThreshold,
							height: chartWidth
						};
					}
				}

				if (yAxis.reversed) {
					posAttr = below;
					negAttr = above;
				} else {
					posAttr = above;
					negAttr = below;
				}

				if (posClip) { // update
					posClip.animate(posAttr);
					negClip.animate(negAttr);
				} else {

					this.posClip = posClip = renderer.clipRect(posAttr);
					this.negClip = negClip = renderer.clipRect(negAttr);

					if (graph && this.graphNeg) {
						graph.clip(posClip);
						this.graphNeg.clip(negClip);
					}

					if (area) {
						area.clip(posClip);
						this.areaNeg.clip(negClip);
					}
				}
			}
		},

		/**
		 * Initialize and perform group inversion on series.group and series.markerGroup
		 */
		invertGroups: function () {
			var series = this,
				chart = series.chart;

			// Pie, go away (#1736)
			if (!series.xAxis) {
				return;
			}

			// A fixed size is needed for inversion to work
			function setInvert() {
				var size = {
					width: series.yAxis.len,
					height: series.xAxis.len
				};

				each(['group', 'markerGroup'], function (groupName) {
					if (series[groupName]) {
						series[groupName].attr(size).invert();
					}
				});
			}

			addEvent(chart, 'resize', setInvert); // do it on resize
			addEvent(series, 'destroy', function () {
				removeEvent(chart, 'resize', setInvert);
			});

			// Do it now
			setInvert(); // do it now

			// On subsequent render and redraw, just do setInvert without setting up events again
			series.invertGroups = setInvert;
		},

		/**
		 * General abstraction for creating plot groups like series.group, series.dataLabelsGroup and
		 * series.markerGroup. On subsequent calls, the group will only be adjusted to the updated plot size.
		 */
		plotGroup: function (prop, name, visibility, zIndex, parent) {
			var group = this[prop],
				isNew = !group;

			// Generate it on first call
			if (isNew) {
				this[prop] = group = this.chart.renderer.g(name)
					.attr({
						visibility: visibility,
						zIndex: zIndex || 0.1 // IE8 needs this
					})
					.add(parent);
			}
			// Place it on first and subsequent (redraw) calls
			group[isNew ? 'attr' : 'animate'](this.getPlotBox());
			return group;
		},

		/**
		 * Get the translation and scale for the plot area of this series
		 */
		getPlotBox: function () {
			var chart = this.chart,
				xAxis = this.xAxis,
				yAxis = this.yAxis;

			// Swap axes for inverted (#2339)
			if (chart.inverted) {
				xAxis = yAxis;
				yAxis = this.xAxis;
			}
			return {
				translateX: xAxis ? xAxis.left : chart.plotLeft,
				translateY: yAxis ? yAxis.top : chart.plotTop,
				scaleX: 1, // #1623
				scaleY: 1
			};
		},

		/**
		 * Render the graph and markers
		 */
		render: function () {
			var series = this,
				chart = series.chart,
				group,
				options = series.options,
				animation = options.animation,
				// Animation doesn't work in IE8 quirks when the group div is hidden,
				// and looks bad in other oldIE
				animDuration = (animation && !!series.animate && chart.renderer.isSVG && pick(animation.duration, 500)) || 0,
				visibility = series.visible ? VISIBLE : HIDDEN,
				zIndex = options.zIndex,
				hasRendered = series.hasRendered,
				chartSeriesGroup = chart.seriesGroup;

			// the group
			group = series.plotGroup(
				'group',
				'series',
				visibility,
				zIndex,
				chartSeriesGroup
			);

			series.markerGroup = series.plotGroup(
				'markerGroup',
				'markers',
				visibility,
				zIndex,
				chartSeriesGroup
			);

			// initiate the animation
			if (animDuration) {
				series.animate(true);
			}

			// cache attributes for shapes
			series.getAttribs();

			// SVGRenderer needs to know this before drawing elements (#1089, #1795)
			group.inverted = series.isCartesian ? chart.inverted : false;

			// draw the graph if any
			if (series.drawGraph) {
				series.drawGraph();
				series.clipNeg();
			}

			each(series.points, function (point) {
				if (point.redraw) {
					point.redraw();
				}
			});

			// draw the data labels (inn pies they go before the points)
			if (series.drawDataLabels) {
				series.drawDataLabels();
			}

			// draw the points
			if (series.visible) {
				series.drawPoints();
			}


			// draw the mouse tracking area
			if (series.drawTracker && series.options.enableMouseTracking !== false) {
				series.drawTracker();
			}

			// Handle inverted series and tracker groups
			if (chart.inverted) {
				series.invertGroups();
			}

			// Initial clipping, must be defined after inverting groups for VML
			if (options.clip !== false && !series.sharedClipKey && !hasRendered) {
				group.clip(chart.clipRect);
			}

			// Run the animation
			if (animDuration) {
				series.animate();
			} 

			// Call the afterAnimate function on animation complete (but don't overwrite the animation.complete option
			// which should be available to the user).
			if (!hasRendered) {
				if (animDuration) {
					series.animationTimeout = setTimeout(function () {
						series.afterAnimate();
					}, animDuration);
				} else {
					series.afterAnimate();
				}
			}

			series.isDirty = series.isDirtyData = false; // means data is in accordance with what you see
			// (See #322) series.isDirty = series.isDirtyData = false; // means data is in accordance with what you see
			series.hasRendered = true;
		},

		/**
		 * Redraw the series after an update in the axes.
		 */
		redraw: function () {
			var series = this,
				chart = series.chart,
				wasDirtyData = series.isDirtyData, // cache it here as it is set to false in render, but used after
				group = series.group,
				xAxis = series.xAxis,
				yAxis = series.yAxis;

			// reposition on resize
			if (group) {
				if (chart.inverted) {
					group.attr({
						width: chart.plotWidth,
						height: chart.plotHeight
					});
				}

				group.animate({
					translateX: pick(xAxis && xAxis.left, chart.plotLeft),
					translateY: pick(yAxis && yAxis.top, chart.plotTop)
				});
			}

			series.translate();
			if (series.setTooltipPoints) {
				series.setTooltipPoints(true);
			}
			series.render();

			if (wasDirtyData) {
				fireEvent(series, 'updatedData');
			}
		}
	}; // end Series prototype



	/**
	 * The class for stack items
	 */
	function StackItem(axis, options, isNegative, x, stackOption) {
		
		var inverted = axis.chart.inverted;

		this.axis = axis;

		// Tells if the stack is negative
		this.isNegative = isNegative;

		// Save the options to be able to style the label
		this.options = options;

		// Save the x value to be able to position the label later
		this.x = x;

		// Initialize total value
		this.total = null;

		// This will keep each points' extremes stored by series.index and point index
		this.points = {};

		// Save the stack option on the series configuration object, and whether to treat it as percent
		this.stack = stackOption;

		// The align options and text align varies on whether the stack is negative and
		// if the chart is inverted or not.
		// First test the user supplied value, then use the dynamic.
		this.alignOptions = {
			align: options.align || (inverted ? (isNegative ? 'left' : 'right') : 'center'),
			verticalAlign: options.verticalAlign || (inverted ? 'middle' : (isNegative ? 'bottom' : 'top')),
			y: pick(options.y, inverted ? 4 : (isNegative ? 14 : -6)),
			x: pick(options.x, inverted ? (isNegative ? -6 : 6) : 0)
		};

		this.textAlign = options.textAlign || (inverted ? (isNegative ? 'right' : 'left') : 'center');
	}

	StackItem.prototype = {
		destroy: function () {
			destroyObjectProperties(this, this.axis);
		},

		/**
		 * Renders the stack total label and adds it to the stack label group.
		 */
		render: function (group) {
			var options = this.options,
				formatOption = options.format,
				str = formatOption ?
					format(formatOption, this) : 
					options.formatter.call(this);  // format the text in the label

			// Change the text to reflect the new total and set visibility to hidden in case the serie is hidden
			if (this.label) {
				this.label.attr({text: str, visibility: HIDDEN});
			// Create new label
			} else {
				this.label =
					this.axis.chart.renderer.text(str, null, null, options.useHTML)		// dummy positions, actual position updated with setOffset method in columnseries
						.css(options.style)				// apply style
						.attr({
							align: this.textAlign,				// fix the text-anchor
							rotation: options.rotation,	// rotation
							visibility: HIDDEN					// hidden until setOffset is called
						})				
						.add(group);							// add to the labels-group
			}
		},

		/**
		 * Sets the offset that the stack has from the x value and repositions the label.
		 */
		setOffset: function (xOffset, xWidth) {
			var stackItem = this,
				axis = stackItem.axis,
				chart = axis.chart,
				inverted = chart.inverted,
				neg = this.isNegative,							// special treatment is needed for negative stacks
				y = axis.translate(axis.usePercentage ? 100 : this.total, 0, 0, 0, 1), // stack value translated mapped to chart coordinates
				yZero = axis.translate(0),						// stack origin
				h = mathAbs(y - yZero),							// stack height
				x = chart.xAxis[0].translate(this.x) + xOffset,	// stack x position
				plotHeight = chart.plotHeight,
				stackBox = {	// this is the box for the complete stack
					x: inverted ? (neg ? y : y - h) : x,
					y: inverted ? plotHeight - x - xWidth : (neg ? (plotHeight - y - h) : plotHeight - y),
					width: inverted ? h : xWidth,
					height: inverted ? xWidth : h
				},
				label = this.label,
				alignAttr;
			
			if (label) {
				label.align(this.alignOptions, null, stackBox);	// align the label to the box
					
				// Set visibility (#678)
				alignAttr = label.alignAttr;
				label[this.options.crop === false || chart.isInsidePlot(alignAttr.x, alignAttr.y) ? 'show' : 'hide'](true);
			}
		}
	};


	// Stacking methods defined on the Axis prototype

	/**
	 * Build the stacks from top down
	 */
	Axis.prototype.buildStacks = function () {
		var series = this.series,
			reversedStacks = pick(this.options.reversedStacks, true),
			i = series.length;
		if (!this.isXAxis) {
			this.usePercentage = false;
			while (i--) {
				series[reversedStacks ? i : series.length - i - 1].setStackedPoints();
			}
			// Loop up again to compute percent stack
			if (this.usePercentage) {
				for (i = 0; i < series.length; i++) {
					series[i].setPercentStacks();
				}
			}
		}
	};

	Axis.prototype.renderStackTotals = function () {
		var axis = this,
			chart = axis.chart,
			renderer = chart.renderer,
			stacks = axis.stacks,
			stackKey, 
			oneStack, 
			stackCategory,
			stackTotalGroup = axis.stackTotalGroup;

		// Create a separate group for the stack total labels
		if (!stackTotalGroup) {
			axis.stackTotalGroup = stackTotalGroup =
				renderer.g('stack-labels')
					.attr({
						visibility: VISIBLE,
						zIndex: 6
					})
					.add();
		}

		// plotLeft/Top will change when y axis gets wider so we need to translate the
		// stackTotalGroup at every render call. See bug #506 and #516
		stackTotalGroup.translate(chart.plotLeft, chart.plotTop);

		// Render each stack total
		for (stackKey in stacks) {
			oneStack = stacks[stackKey];
			for (stackCategory in oneStack) {
				oneStack[stackCategory].render(stackTotalGroup);
			}
		}
	};


	// Stacking methods defnied for Series prototype

	/**
	 * Adds series' points value to corresponding stack
	 */
	Series.prototype.setStackedPoints = function () {
		if (!this.options.stacking || (this.visible !== true && this.chart.options.chart.ignoreHiddenSeries !== false)) {
			return;
		}

		var series = this,
			xData = series.processedXData,
			yData = series.processedYData,
			stackedYData = [],
			yDataLength = yData.length,
			seriesOptions = series.options,
			threshold = seriesOptions.threshold,
			stackOption = seriesOptions.stack,
			stacking = seriesOptions.stacking,
			stackKey = series.stackKey,
			negKey = '-' + stackKey,
			negStacks = series.negStacks,
			yAxis = series.yAxis,
			stacks = yAxis.stacks,
			oldStacks = yAxis.oldStacks,
			isNegative,
			stack,
			other,
			key,
			pointKey,
			i,
			x,
			y;

		// loop over the non-null y values and read them into a local array
		for (i = 0; i < yDataLength; i++) {
			x = xData[i];
			y = yData[i];
			pointKey = series.index + ',' + i;

			// Read stacked values into a stack based on the x value,
			// the sign of y and the stack key. Stacking is also handled for null values (#739)
			isNegative = negStacks && y < threshold;
			key = isNegative ? negKey : stackKey;

			// Create empty object for this stack if it doesn't exist yet
			if (!stacks[key]) {
				stacks[key] = {};
			}

			// Initialize StackItem for this x
			if (!stacks[key][x]) {
				if (oldStacks[key] && oldStacks[key][x]) {
					stacks[key][x] = oldStacks[key][x];
					stacks[key][x].total = null;
				} else {
					stacks[key][x] = new StackItem(yAxis, yAxis.options.stackLabels, isNegative, x, stackOption);
				}
			}

			// If the StackItem doesn't exist, create it first
			stack = stacks[key][x];
			stack.points[pointKey] = [stack.cum || 0];

			// Add value to the stack total
			if (stacking === 'percent') {

				// Percent stacked column, totals are the same for the positive and negative stacks
				other = isNegative ? stackKey : negKey;
				if (negStacks && stacks[other] && stacks[other][x]) {
					other = stacks[other][x];
					stack.total = other.total = mathMax(other.total, stack.total) + mathAbs(y) || 0;

				// Percent stacked areas
				} else {
					stack.total = correctFloat(stack.total + (mathAbs(y) || 0));
				}
			} else {
				stack.total = correctFloat(stack.total + (y || 0));
			}

			stack.cum = (stack.cum || 0) + (y || 0);

			stack.points[pointKey].push(stack.cum);
			stackedYData[i] = stack.cum;

		}

		if (stacking === 'percent') {
			yAxis.usePercentage = true;
		}

		this.stackedYData = stackedYData; // To be used in getExtremes

		// Reset old stacks
		yAxis.oldStacks = {};
	};

	/**
	 * Iterate over all stacks and compute the absolute values to percent
	 */
	Series.prototype.setPercentStacks = function () {
		var series = this,
			stackKey = series.stackKey,
			stacks = series.yAxis.stacks,
			processedXData = series.processedXData;

		each([stackKey, '-' + stackKey], function (key) {
			var i = processedXData.length,
				x,
				stack,
				pointExtremes,
				totalFactor;

			while (i--) {
				x = processedXData[i];
				stack = stacks[key] && stacks[key][x];
				pointExtremes = stack && stack.points[series.index + ',' + i];
				if (pointExtremes) {
					totalFactor = stack.total ? 100 / stack.total : 0;
					pointExtremes[0] = correctFloat(pointExtremes[0] * totalFactor); // Y bottom value
					pointExtremes[1] = correctFloat(pointExtremes[1] * totalFactor); // Y value
					series.stackedYData[i] = pointExtremes[1];
				}
			}
		});
	};



	// Extend the Chart prototype for dynamic methods
	extend(Chart.prototype, {

		/**
		 * Add a series dynamically after  time
		 *
		 * @param {Object} options The config options
		 * @param {Boolean} redraw Whether to redraw the chart after adding. Defaults to true.
		 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
		 *    configuration
		 *
		 * @return {Object} series The newly created series object
		 */
		addSeries: function (options, redraw, animation) {
			var series,
				chart = this;

			if (options) {
				redraw = pick(redraw, true); // defaults to true

				fireEvent(chart, 'addSeries', { options: options }, function () {
					series = chart.initSeries(options);

					chart.isDirtyLegend = true; // the series array is out of sync with the display
					chart.linkSeries();
					if (redraw) {
						chart.redraw(animation);
					}
				});
			}

			return series;
		},

		/**
	     * Add an axis to the chart
	     * @param {Object} options The axis option
	     * @param {Boolean} isX Whether it is an X axis or a value axis
	     */
		addAxis: function (options, isX, redraw, animation) {
			var key = isX ? 'xAxis' : 'yAxis',
				chartOptions = this.options,
				axis;

			/*jslint unused: false*/
			axis = new Axis(this, merge(options, {
				index: this[key].length,
				isX: isX
			}));
			/*jslint unused: true*/

			// Push the new axis options to the chart options
			chartOptions[key] = splat(chartOptions[key] || {});
			chartOptions[key].push(options);

			if (pick(redraw, true)) {
				this.redraw(animation);
			}
		},

		/**
		 * Dim the chart and show a loading text or symbol
		 * @param {String} str An optional text to show in the loading label instead of the default one
		 */
		showLoading: function (str) {
			var chart = this,
				options = chart.options,
				loadingDiv = chart.loadingDiv,
				loadingOptions = options.loading,
				setLoadingSize = function () {
					if (loadingDiv) {
						css(loadingDiv, {
							left: chart.plotLeft + PX,
							top: chart.plotTop + PX,
							width: chart.plotWidth + PX,
							height: chart.plotHeight + PX
						});
					}
				};

			// create the layer at the first call
			if (!loadingDiv) {
				chart.loadingDiv = loadingDiv = createElement(DIV, {
					className: PREFIX + 'loading'
				}, extend(loadingOptions.style, {
					zIndex: 10,
					display: NONE
				}), chart.container);

				chart.loadingSpan = createElement(
					'span',
					null,
					loadingOptions.labelStyle,
					loadingDiv
				);
				addEvent(chart, 'redraw', setLoadingSize); // #1080
			}

			// update text
			chart.loadingSpan.innerHTML = str || options.lang.loading;

			// show it
			if (!chart.loadingShown) {
				css(loadingDiv, {
					opacity: 0,
					display: ''				
				});
				animate(loadingDiv, {
					opacity: loadingOptions.style.opacity
				}, {
					duration: loadingOptions.showDuration || 0
				});
				chart.loadingShown = true;
			}
			setLoadingSize();
		},

		/**
		 * Hide the loading layer
		 */
		hideLoading: function () {
			var options = this.options,
				loadingDiv = this.loadingDiv;

			if (loadingDiv) {
				animate(loadingDiv, {
					opacity: 0
				}, {
					duration: options.loading.hideDuration || 100,
					complete: function () {
						css(loadingDiv, { display: NONE });
					}
				});
			}
			this.loadingShown = false;
		}
	});

	// extend the Point prototype for dynamic methods
	extend(Point.prototype, {
		/**
		 * Update the point with new options (typically x/y data) and optionally redraw the series.
		 *
		 * @param {Object} options Point options as defined in the series.data array
		 * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
		 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
		 *    configuration
		 *
		 */
		update: function (options, redraw, animation, runEvent) {
			var point = this,
				series = point.series,
				graphic = point.graphic,
				i,
				chart = series.chart,
				seriesOptions = series.options;

			redraw = pick(redraw, true);

			function update() {

				point.applyOptions(options);

				// Update visuals
				if (isObject(options) && !isArray(options)) {
					// Defer the actual redraw until getAttribs has been called (#3260)
					point.redraw = function () {
						if (graphic) {
							if (options && options.marker && options.marker.symbol) {
								point.graphic = graphic.destroy();
							} else {
								graphic.attr(point.pointAttr[point.state || '']);
							}
						}
						if (options && options.dataLabels && point.dataLabel) { // #2468
							point.dataLabel = point.dataLabel.destroy();
						}
						point.redraw = null;
					};
				}

				// record changes in the parallel arrays
				i = point.index;
				series.updateParallelArrays(point, i);

				seriesOptions.data[i] = point.options;

				// redraw
				series.isDirty = series.isDirtyData = true;
				if (!series.fixedBox && series.hasCartesianSeries) { // #1906, #2320
					chart.isDirtyBox = true;
				}

				if (seriesOptions.legendType === 'point') { // #1831, #1885
					chart.legend.destroyItem(point);
				}
				if (redraw) {
					chart.redraw(animation);
				}
			}

			// Fire the event with a default handler of doing the update
			if (runEvent === false) { // When called from setData
				update();
			} else {
				point.firePointEvent('update', { options: options }, update);
			}
		},

		/**
		 * Remove a point and optionally redraw the series and if necessary the axes
		 * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
		 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
		 *    configuration
		 */
		remove: function (redraw, animation) {
			var point = this,
				series = point.series,
				points = series.points,
				chart = series.chart,
				i,
				data = series.data;

			setAnimation(animation, chart);
			redraw = pick(redraw, true);

			// fire the event with a default handler of removing the point
			point.firePointEvent('remove', null, function () {

				// splice all the parallel arrays
				i = inArray(point, data);
				if (data.length === points.length) {
					points.splice(i, 1);
				}
				data.splice(i, 1);
				series.options.data.splice(i, 1);
				series.updateParallelArrays(point, 'splice', i, 1);

				point.destroy();

				// redraw
				series.isDirty = true;
				series.isDirtyData = true;
				if (redraw) {
					chart.redraw();
				}
			});
		}
	});

	// Extend the series prototype for dynamic methods
	extend(Series.prototype, {
		/**
		 * Add a point dynamically after chart load time
		 * @param {Object} options Point options as given in series.data
		 * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
		 * @param {Boolean} shift If shift is true, a point is shifted off the start
		 *    of the series as one is appended to the end.
		 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
		 *    configuration
		 */
		addPoint: function (options, redraw, shift, animation) {
			var series = this,
				seriesOptions = series.options,
				data = series.data,
				graph = series.graph,
				area = series.area,
				chart = series.chart,
				names = series.xAxis && series.xAxis.names,
				currentShift = (graph && graph.shift) || 0,
				dataOptions = seriesOptions.data,
				point,
				isInTheMiddle,
				xData = series.xData,
				x,
				i;

			setAnimation(animation, chart);

			// Make graph animate sideways
			if (shift) {
				each([graph, area, series.graphNeg, series.areaNeg], function (shape) {
					if (shape) {
						shape.shift = currentShift + 1;
					}
				});
			}
			if (area) {
				area.isArea = true; // needed in animation, both with and without shift
			}

			// Optional redraw, defaults to true
			redraw = pick(redraw, true);

			// Get options and push the point to xData, yData and series.options. In series.generatePoints
			// the Point instance will be created on demand and pushed to the series.data array.
			point = { series: series };
			series.pointClass.prototype.applyOptions.apply(point, [options]);
			x = point.x;

			// Get the insertion point
			i = xData.length;
			if (series.requireSorting && x < xData[i - 1]) {
				isInTheMiddle = true;
				while (i && xData[i - 1] > x) {
					i--;
				}
			}

			series.updateParallelArrays(point, 'splice', i, 0, 0); // insert undefined item
			series.updateParallelArrays(point, i); // update it

			if (names && point.name) {
				names[x] = point.name;
			}
			dataOptions.splice(i, 0, options);

			if (isInTheMiddle) {
				series.data.splice(i, 0, null);
				series.processData();
			}

			// Generate points to be added to the legend (#1329)
			if (seriesOptions.legendType === 'point') {
				series.generatePoints();
			}

			// Shift the first point off the parallel arrays
			// todo: consider series.removePoint(i) method
			if (shift) {
				if (data[0] && data[0].remove) {
					data[0].remove(false);
				} else {
					data.shift();
					series.updateParallelArrays(point, 'shift');

					dataOptions.shift();
				}
			}

			// redraw
			series.isDirty = true;
			series.isDirtyData = true;
			if (redraw) {
				series.getAttribs(); // #1937
				chart.redraw();
			}
		},

		/**
		 * Remove a series and optionally redraw the chart
		 *
		 * @param {Boolean} redraw Whether to redraw the chart or wait for an explicit call
		 * @param {Boolean|Object} animation Whether to apply animation, and optionally animation
		 *    configuration
		 */

		remove: function (redraw, animation) {
			var series = this,
				chart = series.chart;
			redraw = pick(redraw, true);

			if (!series.isRemoving) {  /* prevent triggering native event in jQuery
					(calling the remove function from the remove event) */
				series.isRemoving = true;

				// fire the event with a default handler of removing the point
				fireEvent(series, 'remove', null, function () {


					// destroy elements
					series.destroy();


					// redraw
					chart.isDirtyLegend = chart.isDirtyBox = true;
					chart.linkSeries();

					if (redraw) {
						chart.redraw(animation);
					}
				});

			}
			series.isRemoving = false;
		},

		/**
		 * Update the series with a new set of options
		 */
		update: function (newOptions, redraw) {
			var series = this,
				chart = this.chart,
				// must use user options when changing type because this.options is merged
				// in with type specific plotOptions
				oldOptions = this.userOptions,
				oldType = this.type,
				proto = seriesTypes[oldType].prototype,
				preserve = ['group', 'markerGroup', 'dataLabelsGroup'],
				n;

			// Make sure groups are not destroyed (#3094)
			each(preserve, function (prop) {
				preserve[prop] = series[prop];
				delete series[prop];
			});

			// Do the merge, with some forced options
			newOptions = merge(oldOptions, {
				animation: false,
				index: this.index,
				pointStart: this.xData[0] // when updating after addPoint
			}, { data: this.options.data }, newOptions);

			// Destroy the series and reinsert methods from the type prototype
			this.remove(false);
			for (n in proto) { // Overwrite series-type specific methods (#2270)
				if (proto.hasOwnProperty(n)) {
					this[n] = UNDEFINED;
				}
			}
			extend(this, seriesTypes[newOptions.type || oldType].prototype);

			// Re-register groups (#3094)
			each(preserve, function (prop) {
				series[prop] = preserve[prop];
			});


			this.init(chart, newOptions);
			chart.linkSeries(); // Links are lost in this.remove (#3028)
			if (pick(redraw, true)) {
				chart.redraw(false);
			}
		}
	});

	// Extend the Axis.prototype for dynamic methods
	extend(Axis.prototype, {

		/**
		 * Update the axis with a new options structure
		 */
		update: function (newOptions, redraw) {
			var chart = this.chart;

			newOptions = chart.options[this.coll][this.options.index] = merge(this.userOptions, newOptions);

			this.destroy(true);
			this._addedPlotLB = UNDEFINED; // #1611, #2887

			this.init(chart, extend(newOptions, { events: UNDEFINED }));

			chart.isDirtyBox = true;
			if (pick(redraw, true)) {
				chart.redraw();
			}
		},

		/**
	     * Remove the axis from the chart
	     */
		remove: function (redraw) {
			var chart = this.chart,
				key = this.coll, // xAxis or yAxis
				axisSeries = this.series,
				i = axisSeries.length;

			// Remove associated series (#2687)
			while (i--) {
				if (axisSeries[i]) {
					axisSeries[i].remove(false);
				}
			}

			// Remove the axis
			erase(chart.axes, this);
			erase(chart[key], this);
			chart.options[key].splice(this.options.index, 1);
			each(chart[key], function (axis, i) { // Re-index, #1706
				axis.options.index = i;
			});
			this.destroy();
			chart.isDirtyBox = true;

			if (pick(redraw, true)) {
				chart.redraw();
			}
		},

		/**
		 * Update the axis title by options
		 */
		setTitle: function (newTitleOptions, redraw) {
			this.update({ title: newTitleOptions }, redraw);
		},

		/**
		 * Set new axis categories and optionally redraw
		 * @param {Array} categories
		 * @param {Boolean} redraw
		 */
		setCategories: function (categories, redraw) {
			this.update({ categories: categories }, redraw);
		}

	});




	/**
	 * LineSeries object
	 */
	var LineSeries = extendClass(Series);
	seriesTypes.line = LineSeries;



	/**
	 * Set the default options for area
	 */
	defaultPlotOptions.area = merge(defaultSeriesOptions, {
		threshold: 0
		// trackByArea: false,
		// lineColor: null, // overrides color, but lets fillColor be unaltered
		// fillOpacity: 0.75,
		// fillColor: null
	});

	/**
	 * AreaSeries object
	 */
	var AreaSeries = extendClass(Series, {
		type: 'area',
		/**
		 * For stacks, don't split segments on null values. Instead, draw null values with 
		 * no marker. Also insert dummy points for any X position that exists in other series
		 * in the stack.
		 */ 
		getSegments: function () {
			var series = this,
				segments = [],
				segment = [],
				keys = [],
				xAxis = this.xAxis,
				yAxis = this.yAxis,
				stack = yAxis.stacks[this.stackKey],
				pointMap = {},
				plotX,
				plotY,
				points = this.points,
				connectNulls = this.options.connectNulls,
				i,
				x;

			if (this.options.stacking && !this.cropped) { // cropped causes artefacts in Stock, and perf issue
				// Create a map where we can quickly look up the points by their X value.
				for (i = 0; i < points.length; i++) {
					pointMap[points[i].x] = points[i];
				}

				// Sort the keys (#1651)
				for (x in stack) {
					if (stack[x].total !== null) { // nulled after switching between grouping and not (#1651, #2336)
						keys.push(+x);
					}
				}
				keys.sort(function (a, b) {
					return a - b;
				});

				each(keys, function (x) {
					var y = 0,
						stackPoint;

					if (connectNulls && (!pointMap[x] || pointMap[x].y === null)) { // #1836
						return;

					// The point exists, push it to the segment
					} else if (pointMap[x]) {
						segment.push(pointMap[x]);

					// There is no point for this X value in this series, so we 
					// insert a dummy point in order for the areas to be drawn
					// correctly.
					} else {

						// Loop down the stack to find the series below this one that has
						// a value (#1991)
						for (i = series.index; i <= yAxis.series.length; i++) {
							stackPoint = stack[x].points[i + ',' + x];
							if (stackPoint) {
								y = stackPoint[1];
								break;
							}
						}

						plotX = xAxis.translate(x);
						plotY = yAxis.toPixels(y, true);
						segment.push({ 
							y: null, 
							plotX: plotX,
							clientX: plotX, 
							plotY: plotY, 
							yBottom: plotY,
							onMouseOver: noop
						});
					}
				});

				if (segment.length) {
					segments.push(segment);
				}

			} else {
				Series.prototype.getSegments.call(this);
				segments = this.segments;
			}

			this.segments = segments;
		},
		
		/**
		 * Extend the base Series getSegmentPath method by adding the path for the area.
		 * This path is pushed to the series.areaPath property.
		 */
		getSegmentPath: function (segment) {
			
			var segmentPath = Series.prototype.getSegmentPath.call(this, segment), // call base method
				areaSegmentPath = [].concat(segmentPath), // work on a copy for the area path
				i,
				options = this.options,
				segLength = segmentPath.length,
				translatedThreshold = this.yAxis.getThreshold(options.threshold), // #2181
				yBottom;
			
			if (segLength === 3) { // for animation from 1 to two points
				areaSegmentPath.push(L, segmentPath[1], segmentPath[2]);
			}
			if (options.stacking && !this.closedStacks) {
				
				// Follow stack back. Todo: implement areaspline. A general solution could be to 
				// reverse the entire graphPath of the previous series, though may be hard with
				// splines and with series with different extremes
				for (i = segment.length - 1; i >= 0; i--) {

					yBottom = pick(segment[i].yBottom, translatedThreshold);
				
					// step line?
					if (i < segment.length - 1 && options.step) {
						areaSegmentPath.push(segment[i + 1].plotX, yBottom);
					}
					
					areaSegmentPath.push(segment[i].plotX, yBottom);
				}

			} else { // follow zero line back
				this.closeSegment(areaSegmentPath, segment, translatedThreshold);
			}
			this.areaPath = this.areaPath.concat(areaSegmentPath);
			return segmentPath;
		},
		
		/**
		 * Extendable method to close the segment path of an area. This is overridden in polar 
		 * charts.
		 */
		closeSegment: function (path, segment, translatedThreshold) {
			path.push(
				L,
				segment[segment.length - 1].plotX,
				translatedThreshold,
				L,
				segment[0].plotX,
				translatedThreshold
			);
		},
		
		/**
		 * Draw the graph and the underlying area. This method calls the Series base
		 * function and adds the area. The areaPath is calculated in the getSegmentPath
		 * method called from Series.prototype.drawGraph.
		 */
		drawGraph: function () {
			
			// Define or reset areaPath
			this.areaPath = [];
			
			// Call the base method
			Series.prototype.drawGraph.apply(this);
			
			// Define local variables
			var series = this,
				areaPath = this.areaPath,
				options = this.options,
				negativeColor = options.negativeColor,
				negativeFillColor = options.negativeFillColor,
				props = [['area', this.color, options.fillColor]]; // area name, main color, fill color
			
			if (negativeColor || negativeFillColor) {
				props.push(['areaNeg', negativeColor, negativeFillColor]);
			}
			
			each(props, function (prop) {
				var areaKey = prop[0],
					area = series[areaKey];
					
				// Create or update the area
				if (area) { // update
					area.animate({ d: areaPath });
		
				} else { // create
					series[areaKey] = series.chart.renderer.path(areaPath)
						.attr({
							fill: pick(
								prop[2],
								Color(prop[1]).setOpacity(pick(options.fillOpacity, 0.75)).get()
							),
							zIndex: 0 // #1069
						}).add(series.group);
				}
			});
		},

		drawLegendSymbol: LegendSymbolMixin.drawRectangle
	});

	seriesTypes.area = AreaSeries;


	/**
	 * Set the default options for column
	 */
	defaultPlotOptions.column = merge(defaultSeriesOptions, {
		borderColor: '#FFFFFF',
		//borderWidth: 1,
		borderRadius: 0,
		//colorByPoint: undefined,
		groupPadding: 0.2,
		//grouping: true,
		marker: null, // point options are specified in the base options
		pointPadding: 0.1,
		//pointWidth: null,
		minPointLength: 0,
		cropThreshold: 50, // when there are more points, they will not animate out of the chart on xAxis.setExtremes
		pointRange: null, // null means auto, meaning 1 in a categorized axis and least distance between points if not categories
		states: {
			hover: {
				brightness: 0.1,
				shadow: false,
				halo: false
			},
			select: {
				color: '#C0C0C0',
				borderColor: '#000000',
				shadow: false
			}
		},
		dataLabels: {
			align: null, // auto
			verticalAlign: null, // auto
			y: null
		},
		stickyTracking: false,
		tooltip: {
			distance: 6
		},
		threshold: 0
	});

	/**
	 * ColumnSeries object
	 */
	var ColumnSeries = extendClass(Series, {
		type: 'column',
		pointAttrToOptions: { // mapping between SVG attributes and the corresponding options
			stroke: 'borderColor',
			fill: 'color',
			r: 'borderRadius'
		},
		cropShoulder: 0,
		trackerGroups: ['group', 'dataLabelsGroup'],
		negStacks: true, // use separate negative stacks, unlike area stacks where a negative 
			// point is substracted from previous (#1910)
		
		/**
		 * Initialize the series
		 */
		init: function () {
			Series.prototype.init.apply(this, arguments);

			var series = this,
				chart = series.chart;

			// if the series is added dynamically, force redraw of other
			// series affected by a new column
			if (chart.hasRendered) {
				each(chart.series, function (otherSeries) {
					if (otherSeries.type === series.type) {
						otherSeries.isDirty = true;
					}
				});
			}
		},

		/**
		 * Return the width and x offset of the columns adjusted for grouping, groupPadding, pointPadding,
		 * pointWidth etc. 
		 */
		getColumnMetrics: function () {

			var series = this,
				options = series.options,
				xAxis = series.xAxis,
				yAxis = series.yAxis,
				reversedXAxis = xAxis.reversed,
				stackKey,
				stackGroups = {},
				columnIndex,
				columnCount = 0;

			// Get the total number of column type series.
			// This is called on every series. Consider moving this logic to a
			// chart.orderStacks() function and call it on init, addSeries and removeSeries
			if (options.grouping === false) {
				columnCount = 1;
			} else {
				each(series.chart.series, function (otherSeries) {
					var otherOptions = otherSeries.options,
						otherYAxis = otherSeries.yAxis;
					if (otherSeries.type === series.type && otherSeries.visible &&
							yAxis.len === otherYAxis.len && yAxis.pos === otherYAxis.pos) {  // #642, #2086
						if (otherOptions.stacking) {
							stackKey = otherSeries.stackKey;
							if (stackGroups[stackKey] === UNDEFINED) {
								stackGroups[stackKey] = columnCount++;
							}
							columnIndex = stackGroups[stackKey];
						} else if (otherOptions.grouping !== false) { // #1162
							columnIndex = columnCount++;
						}
						otherSeries.columnIndex = columnIndex;
					}
				});
			}

			var categoryWidth = mathMin(
					mathAbs(xAxis.transA) * (xAxis.ordinalSlope || options.pointRange || xAxis.closestPointRange || xAxis.tickInterval || 1), // #2610
					xAxis.len // #1535
				),
				groupPadding = categoryWidth * options.groupPadding,
				groupWidth = categoryWidth - 2 * groupPadding,
				pointOffsetWidth = groupWidth / columnCount,
				optionPointWidth = options.pointWidth,
				pointPadding = defined(optionPointWidth) ? (pointOffsetWidth - optionPointWidth) / 2 :
					pointOffsetWidth * options.pointPadding,
				pointWidth = pick(optionPointWidth, pointOffsetWidth - 2 * pointPadding), // exact point width, used in polar charts
				colIndex = (reversedXAxis ? 
					columnCount - (series.columnIndex || 0) : // #1251
					series.columnIndex) || 0,
				pointXOffset = pointPadding + (groupPadding + colIndex *
					pointOffsetWidth - (categoryWidth / 2)) *
					(reversedXAxis ? -1 : 1);

			// Save it for reading in linked series (Error bars particularly)
			return (series.columnMetrics = { 
				width: pointWidth, 
				offset: pointXOffset 
			});
				
		},

		/**
		 * Translate each point to the plot area coordinate system and find shape positions
		 */
		translate: function () {
			var series = this,
				chart = series.chart,
				options = series.options,
				borderWidth = series.borderWidth = pick(
					options.borderWidth, 
					series.activePointCount > 0.5 * series.xAxis.len ? 0 : 1
				),
				yAxis = series.yAxis,
				threshold = options.threshold,
				translatedThreshold = series.translatedThreshold = yAxis.getThreshold(threshold),
				minPointLength = pick(options.minPointLength, 5),
				metrics = series.getColumnMetrics(),
				pointWidth = metrics.width,
				seriesBarW = series.barW = mathMax(pointWidth, 1 + 2 * borderWidth), // postprocessed for border width
				pointXOffset = series.pointXOffset = metrics.offset,
				xCrisp = -(borderWidth % 2 ? 0.5 : 0),
				yCrisp = borderWidth % 2 ? 0.5 : 1;

			if (chart.renderer.isVML && chart.inverted) {
				yCrisp += 1;
			}

			// When the pointPadding is 0, we want the columns to be packed tightly, so we allow individual
			// columns to have individual sizes. When pointPadding is greater, we strive for equal-width
			// columns (#2694).
			if (options.pointPadding) {
				seriesBarW = mathCeil(seriesBarW);
			}

			Series.prototype.translate.apply(series);

			// Record the new values
			each(series.points, function (point) {
				var yBottom = pick(point.yBottom, translatedThreshold),
					plotY = mathMin(mathMax(-999 - yBottom, point.plotY), yAxis.len + 999 + yBottom), // Don't draw too far outside plot area (#1303, #2241)
					barX = point.plotX + pointXOffset,
					barW = seriesBarW,
					barY = mathMin(plotY, yBottom),
					right,
					bottom,
					fromTop,
					barH = mathMax(plotY, yBottom) - barY;

				// Handle options.minPointLength
				if (mathAbs(barH) < minPointLength) {
					if (minPointLength) {
						barH = minPointLength;
						barY =
							mathRound(mathAbs(barY - translatedThreshold) > minPointLength ? // stacked
								yBottom - minPointLength : // keep position
								translatedThreshold - (yAxis.translate(point.y, 0, 1, 0, 1) <= translatedThreshold ? minPointLength : 0)); // use exact yAxis.translation (#1485)
					}
				}

				// Cache for access in polar
				point.barX = barX;
				point.pointWidth = pointWidth;

				// Fix the tooltip on center of grouped columns (#1216, #424)
				point.tooltipPos = chart.inverted ? 
					[yAxis.len - plotY, series.xAxis.len - barX - barW / 2] : 
					[barX + barW / 2, plotY + yAxis.pos - chart.plotTop];

				// Round off to obtain crisp edges and avoid overlapping with neighbours (#2694)
				right = mathRound(barX + barW) + xCrisp;
				barX = mathRound(barX) + xCrisp;
				barW = right - barX;

				fromTop = mathAbs(barY) < 0.5;
				bottom = mathRound(barY + barH) + yCrisp;
				barY = mathRound(barY) + yCrisp;
				barH = bottom - barY;

				// Top edges are exceptions
				if (fromTop) {
					barY -= 1;
					barH += 1;
				}

				// Register shape type and arguments to be used in drawPoints
				point.shapeType = 'rect';
				point.shapeArgs = {
					x: barX,
					y: barY,
					width: barW,
					height: barH
				};

			});

		},

		getSymbol: noop,
		
		/**
		 * Use a solid rectangle like the area series types
		 */
		drawLegendSymbol: LegendSymbolMixin.drawRectangle,
		
		
		/**
		 * Columns have no graph
		 */
		drawGraph: noop,

		/**
		 * Draw the columns. For bars, the series.group is rotated, so the same coordinates
		 * apply for columns and bars. This method is inherited by scatter series.
		 *
		 */
		drawPoints: function () {
			var series = this,
				chart = this.chart,
				options = series.options,
				renderer = chart.renderer,
				animationLimit = options.animationLimit || 250,
				shapeArgs,
				pointAttr;

			// draw the columns
			each(series.points, function (point) {
				var plotY = point.plotY,
					graphic = point.graphic,
					borderAttr;

				if (plotY !== UNDEFINED && !isNaN(plotY) && point.y !== null) {
					shapeArgs = point.shapeArgs;

					borderAttr = defined(series.borderWidth) ? {
						'stroke-width': series.borderWidth
					} : {};

					pointAttr = point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE] || series.pointAttr[NORMAL_STATE];
					
					if (graphic) { // update
						stop(graphic);
						graphic.attr(borderAttr)[chart.pointCount < animationLimit ? 'animate' : 'attr'](merge(shapeArgs));

					} else {
						point.graphic = graphic = renderer[point.shapeType](shapeArgs)
							.attr(pointAttr)
							.attr(borderAttr)
							.add(series.group)
							.shadow(options.shadow, null, options.stacking && !options.borderRadius);
					}

				} else if (graphic) {
					point.graphic = graphic.destroy(); // #1269
				}
			});
		},

		/**
		 * Animate the column heights one by one from zero
		 * @param {Boolean} init Whether to initialize the animation or run it
		 */
		animate: function (init) {
			var series = this,
				yAxis = this.yAxis,
				options = series.options,
				inverted = this.chart.inverted,
				attr = {},
				translatedThreshold;

			if (hasSVG) { // VML is too slow anyway
				if (init) {
					attr.scaleY = 0.001;
					translatedThreshold = mathMin(yAxis.pos + yAxis.len, mathMax(yAxis.pos, yAxis.toPixels(options.threshold)));
					if (inverted) {
						attr.translateX = translatedThreshold - yAxis.len;
					} else {
						attr.translateY = translatedThreshold;
					}
					series.group.attr(attr);

				} else { // run the animation
					
					attr.scaleY = 1;
					attr[inverted ? 'translateX' : 'translateY'] = yAxis.pos;
					series.group.animate(attr, series.options.animation);

					// delete this function to allow it only once
					series.animate = null;
				}
			}
		},
		
		/**
		 * Remove this series from the chart
		 */
		remove: function () {
			var series = this,
				chart = series.chart;

			// column and bar series affects other series of the same type
			// as they are either stacked or grouped
			if (chart.hasRendered) {
				each(chart.series, function (otherSeries) {
					if (otherSeries.type === series.type) {
						otherSeries.isDirty = true;
					}
				});
			}

			Series.prototype.remove.apply(series, arguments);
		}
	});
	seriesTypes.column = ColumnSeries;


	/**
	 * Set the default options for bar
	 */
	defaultPlotOptions.bar = merge(defaultPlotOptions.column);
	/**
	 * The Bar series class
	 */
	var BarSeries = extendClass(ColumnSeries, {
		type: 'bar',
		inverted: true
	});
	seriesTypes.bar = BarSeries;



	/**
	 * Set the default options for scatter
	 */
	defaultPlotOptions.scatter = merge(defaultSeriesOptions, {
		lineWidth: 0,
		tooltip: {
			headerFormat: '<span style="color:{series.color}">\u25CF</span> <span style="font-size: 10px;"> {series.name}</span><br/>',
			pointFormat: 'x: <b>{point.x}</b><br/>y: <b>{point.y}</b><br/>'
		},
		stickyTracking: false
	});

	/**
	 * The scatter series class
	 */
	var ScatterSeries = extendClass(Series, {
		type: 'scatter',
		sorted: false,
		requireSorting: false,
		noSharedTooltip: true,
		trackerGroups: ['markerGroup', 'dataLabelsGroup'],
		takeOrdinalPosition: false, // #2342
		singularTooltips: true,
		drawGraph: function () {
			if (this.options.lineWidth) {
				Series.prototype.drawGraph.call(this);
			}
		}
	});

	seriesTypes.scatter = ScatterSeries;



	/**
	 * Set the default options for pie
	 */
	defaultPlotOptions.pie = merge(defaultSeriesOptions, {
		borderColor: '#FFFFFF',
		borderWidth: 1,
		center: [null, null],
		clip: false,
		colorByPoint: true, // always true for pies
		dataLabels: {
			// align: null,
			// connectorWidth: 1,
			// connectorColor: point.color,
			// connectorPadding: 5,
			distance: 30,
			enabled: true,
			formatter: function () { // #2945
				return this.point.name;
			}
			// softConnector: true,
			//y: 0
		},
		ignoreHiddenPoint: true,
		//innerSize: 0,
		legendType: 'point',
		marker: null, // point options are specified in the base options
		size: null,
		showInLegend: false,
		slicedOffset: 10,
		states: {
			hover: {
				brightness: 0.1,
				shadow: false
			}
		},
		stickyTracking: false,
		tooltip: {
			followPointer: true
		}
	});

	/**
	 * Extended point object for pies
	 */
	var PiePoint = extendClass(Point, {
		/**
		 * Initiate the pie slice
		 */
		init: function () {

			Point.prototype.init.apply(this, arguments);

			var point = this,
				toggleSlice;

			// Disallow negative values (#1530)
			if (point.y < 0) {
				point.y = null;
			}

			//visible: options.visible !== false,
			extend(point, {
				visible: point.visible !== false,
				name: pick(point.name, 'Slice')
			});

			// add event listener for select
			toggleSlice = function (e) {
				point.slice(e.type === 'select');
			};
			addEvent(point, 'select', toggleSlice);
			addEvent(point, 'unselect', toggleSlice);

			return point;
		},

		/**
		 * Toggle the visibility of the pie slice
		 * @param {Boolean} vis Whether to show the slice or not. If undefined, the
		 *    visibility is toggled
		 */
		setVisible: function (vis) {
			var point = this,
				series = point.series,
				chart = series.chart;

			// if called without an argument, toggle visibility
			point.visible = point.options.visible = vis = vis === UNDEFINED ? !point.visible : vis;
			series.options.data[inArray(point, series.data)] = point.options; // update userOptions.data

			// Show and hide associated elements
			each(['graphic', 'dataLabel', 'connector', 'shadowGroup'], function (key) {
				if (point[key]) {
					point[key][vis ? 'show' : 'hide'](true);
				}
			});

			if (point.legendItem) {
				chart.legend.colorizeItem(point, vis);
			}
			
			// Handle ignore hidden slices
			if (!series.isDirty && series.options.ignoreHiddenPoint) {
				series.isDirty = true;
				chart.redraw();
			}
		},

		/**
		 * Set or toggle whether the slice is cut out from the pie
		 * @param {Boolean} sliced When undefined, the slice state is toggled
		 * @param {Boolean} redraw Whether to redraw the chart. True by default.
		 */
		slice: function (sliced, redraw, animation) {
			var point = this,
				series = point.series,
				chart = series.chart,
				translation;

			setAnimation(animation, chart);

			// redraw is true by default
			redraw = pick(redraw, true);

			// if called without an argument, toggle
			point.sliced = point.options.sliced = sliced = defined(sliced) ? sliced : !point.sliced;
			series.options.data[inArray(point, series.data)] = point.options; // update userOptions.data

			translation = sliced ? point.slicedTranslation : {
				translateX: 0,
				translateY: 0
			};

			point.graphic.animate(translation);
			
			if (point.shadowGroup) {
				point.shadowGroup.animate(translation);
			}

		},

		haloPath: function (size) {
			var shapeArgs = this.shapeArgs,
				chart = this.series.chart;

			return this.sliced || !this.visible ? [] : this.series.chart.renderer.symbols.arc(chart.plotLeft + shapeArgs.x, chart.plotTop + shapeArgs.y, shapeArgs.r + size, shapeArgs.r + size, {
				innerR: this.shapeArgs.r,
				start: shapeArgs.start,
				end: shapeArgs.end
			});
		}
	});

	/**
	 * The Pie series class
	 */
	var PieSeries = {
		type: 'pie',
		isCartesian: false,
		pointClass: PiePoint,
		requireSorting: false,
		noSharedTooltip: true,
		trackerGroups: ['group', 'dataLabelsGroup'],
		axisTypes: [],
		pointAttrToOptions: { // mapping between SVG attributes and the corresponding options
			stroke: 'borderColor',
			'stroke-width': 'borderWidth',
			fill: 'color'
		},
		singularTooltips: true,

		/**
		 * Pies have one color each point
		 */
		getColor: noop,

		/**
		 * Animate the pies in
		 */
		animate: function (init) {
			var series = this,
				points = series.points,
				startAngleRad = series.startAngleRad;

			if (!init) {
				each(points, function (point) {
					var graphic = point.graphic,
						args = point.shapeArgs;

					if (graphic) {
						// start values
						graphic.attr({
							r: series.center[3] / 2, // animate from inner radius (#779)
							start: startAngleRad,
							end: startAngleRad
						});

						// animate
						graphic.animate({
							r: args.r,
							start: args.start,
							end: args.end
						}, series.options.animation);
					}
				});

				// delete this function to allow it only once
				series.animate = null;
			}
		},

		/**
		 * Extend the basic setData method by running processData and generatePoints immediately,
		 * in order to access the points from the legend.
		 */
		setData: function (data, redraw, animation, updatePoints) {
			Series.prototype.setData.call(this, data, false, animation, updatePoints);
			this.processData();
			this.generatePoints();
			if (pick(redraw, true)) {
				this.chart.redraw(animation);
			} 
		},

		/**
		 * Extend the generatePoints method by adding total and percentage properties to each point
		 */
		generatePoints: function () {
			var i,
				total = 0,
				points,
				len,
				point,
				ignoreHiddenPoint = this.options.ignoreHiddenPoint;

			Series.prototype.generatePoints.call(this);

			// Populate local vars
			points = this.points;
			len = points.length;
			
			// Get the total sum
			for (i = 0; i < len; i++) {
				point = points[i];
				total += (ignoreHiddenPoint && !point.visible) ? 0 : point.y;
			}
			this.total = total;

			// Set each point's properties
			for (i = 0; i < len; i++) {
				point = points[i];
				point.percentage = total > 0 ? (point.y / total) * 100 : 0;
				point.total = total;
			}
			
		},
		
		/**
		 * Do translation for pie slices
		 */
		translate: function (positions) {
			this.generatePoints();
			
			var series = this,
				cumulative = 0,
				precision = 1000, // issue #172
				options = series.options,
				slicedOffset = options.slicedOffset,
				connectorOffset = slicedOffset + options.borderWidth,
				start,
				end,
				angle,
				startAngle = options.startAngle || 0,
				startAngleRad = series.startAngleRad = mathPI / 180 * (startAngle - 90),
				endAngleRad = series.endAngleRad = mathPI / 180 * ((pick(options.endAngle, startAngle + 360)) - 90),
				circ = endAngleRad - startAngleRad, //2 * mathPI,
				points = series.points,
				radiusX, // the x component of the radius vector for a given point
				radiusY,
				labelDistance = options.dataLabels.distance,
				ignoreHiddenPoint = options.ignoreHiddenPoint,
				i,
				len = points.length,
				point;

			// Get positions - either an integer or a percentage string must be given.
			// If positions are passed as a parameter, we're in a recursive loop for adjusting
			// space for data labels.
			if (!positions) {
				series.center = positions = series.getCenter();
			}

			// utility for getting the x value from a given y, used for anticollision logic in data labels
			series.getX = function (y, left) {

				angle = math.asin(mathMin((y - positions[1]) / (positions[2] / 2 + labelDistance), 1));

				return positions[0] +
					(left ? -1 : 1) *
					(mathCos(angle) * (positions[2] / 2 + labelDistance));
			};

			// Calculate the geometry for each point
			for (i = 0; i < len; i++) {
				
				point = points[i];
				
				// set start and end angle
				start = startAngleRad + (cumulative * circ);
				if (!ignoreHiddenPoint || point.visible) {
					cumulative += point.percentage / 100;
				}
				end = startAngleRad + (cumulative * circ);

				// set the shape
				point.shapeType = 'arc';
				point.shapeArgs = {
					x: positions[0],
					y: positions[1],
					r: positions[2] / 2,
					innerR: positions[3] / 2,
					start: mathRound(start * precision) / precision,
					end: mathRound(end * precision) / precision
				};

				// The angle must stay within -90 and 270 (#2645)
				angle = (end + start) / 2;
				if (angle > 1.5 * mathPI) {
					angle -= 2 * mathPI;
				} else if (angle < -mathPI / 2) {
					angle += 2 * mathPI;
				}

				// Center for the sliced out slice
				point.slicedTranslation = {
					translateX: mathRound(mathCos(angle) * slicedOffset),
					translateY: mathRound(mathSin(angle) * slicedOffset)
				};

				// set the anchor point for tooltips
				radiusX = mathCos(angle) * positions[2] / 2;
				radiusY = mathSin(angle) * positions[2] / 2;
				point.tooltipPos = [
					positions[0] + radiusX * 0.7,
					positions[1] + radiusY * 0.7
				];
				
				point.half = angle < -mathPI / 2 || angle > mathPI / 2 ? 1 : 0;
				point.angle = angle;

				// set the anchor point for data labels
				connectorOffset = mathMin(connectorOffset, labelDistance / 2); // #1678
				point.labelPos = [
					positions[0] + radiusX + mathCos(angle) * labelDistance, // first break of connector
					positions[1] + radiusY + mathSin(angle) * labelDistance, // a/a
					positions[0] + radiusX + mathCos(angle) * connectorOffset, // second break, right outside pie
					positions[1] + radiusY + mathSin(angle) * connectorOffset, // a/a
					positions[0] + radiusX, // landing point for connector
					positions[1] + radiusY, // a/a
					labelDistance < 0 ? // alignment
						'center' :
						point.half ? 'right' : 'left', // alignment
					angle // center angle
				];

			}
		},
		
		drawGraph: null,

		/**
		 * Draw the data points
		 */
		drawPoints: function () {
			var series = this,
				chart = series.chart,
				renderer = chart.renderer,
				groupTranslation,
				//center,
				graphic,
				//group,
				shadow = series.options.shadow,
				shadowGroup,
				shapeArgs;

			if (shadow && !series.shadowGroup) {
				series.shadowGroup = renderer.g('shadow')
					.add(series.group);
			}

			// draw the slices
			each(series.points, function (point) {
				graphic = point.graphic;
				shapeArgs = point.shapeArgs;
				shadowGroup = point.shadowGroup;

				// put the shadow behind all points
				if (shadow && !shadowGroup) {
					shadowGroup = point.shadowGroup = renderer.g('shadow')
						.add(series.shadowGroup);
				}

				// if the point is sliced, use special translation, else use plot area traslation
				groupTranslation = point.sliced ? point.slicedTranslation : {
					translateX: 0,
					translateY: 0
				};

				//group.translate(groupTranslation[0], groupTranslation[1]);
				if (shadowGroup) {
					shadowGroup.attr(groupTranslation);
				}

				// draw the slice
				if (graphic) {
					graphic.animate(extend(shapeArgs, groupTranslation));
				} else {
					point.graphic = graphic = renderer[point.shapeType](shapeArgs)
						.setRadialReference(series.center)
						.attr(
							point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE]
						)
						.attr({ 
							'stroke-linejoin': 'round'
							//zIndex: 1 // #2722 (reversed)
						})
						.attr(groupTranslation)
						.add(series.group)
						.shadow(shadow, shadowGroup);	
				}

				// detect point specific visibility (#2430)
				if (point.visible !== undefined) {
					point.setVisible(point.visible);
				}

			});

		},

		/**
		 * Utility for sorting data labels
		 */
		sortByAngle: function (points, sign) {
			points.sort(function (a, b) {
				return a.angle !== undefined && (b.angle - a.angle) * sign;
			});
		},		

		/**
		 * Use a simple symbol from LegendSymbolMixin
		 */
		drawLegendSymbol: LegendSymbolMixin.drawRectangle,

		/**
		 * Use the getCenter method from drawLegendSymbol
		 */
		getCenter: CenteredSeriesMixin.getCenter,

		/**
		 * Pies don't have point marker symbols
		 */
		getSymbol: noop

	};
	PieSeries = extendClass(Series, PieSeries);
	seriesTypes.pie = PieSeries;



	/**
	 * Draw the data labels
	 */
	Series.prototype.drawDataLabels = function () {

		var series = this,
			seriesOptions = series.options,
			cursor = seriesOptions.cursor,
			options = seriesOptions.dataLabels,
			points = series.points,
			pointOptions,
			generalOptions,
			hasRendered = series.hasRendered || 0,
			str,
			dataLabelsGroup;

		if (options.enabled || series._hasPointLabels) {

			// Process default alignment of data labels for columns
			if (series.dlProcessOptions) {
				series.dlProcessOptions(options);
			}

			// Create a separate group for the data labels to avoid rotation
			dataLabelsGroup = series.plotGroup(
				'dataLabelsGroup',
				'data-labels',
				options.defer ? HIDDEN : VISIBLE,
				options.zIndex || 6
			);

			if (pick(options.defer, true)) {
				dataLabelsGroup.attr({ opacity: +hasRendered }); // #3300
				if (!hasRendered) {
					addEvent(series, 'afterAnimate', function () {
						if (series.visible) { // #3023, #3024
							dataLabelsGroup.show();
						}
						dataLabelsGroup[seriesOptions.animation ? 'animate' : 'attr']({ opacity: 1 }, { duration: 200 });
					});
				}
			}

			// Make the labels for each point
			generalOptions = options;
			each(points, function (point) {

				var enabled,
					dataLabel = point.dataLabel,
					labelConfig,
					attr,
					name,
					rotation,
					connector = point.connector,
					isNew = true;

				// Determine if each data label is enabled
				pointOptions = point.options && point.options.dataLabels;
				enabled = pick(pointOptions && pointOptions.enabled, generalOptions.enabled); // #2282


				// If the point is outside the plot area, destroy it. #678, #820
				if (dataLabel && !enabled) {
					point.dataLabel = dataLabel.destroy();

				// Individual labels are disabled if the are explicitly disabled
				// in the point options, or if they fall outside the plot area.
				} else if (enabled) {

					// Create individual options structure that can be extended without
					// affecting others
					options = merge(generalOptions, pointOptions);

					rotation = options.rotation;

					// Get the string
					labelConfig = point.getLabelConfig();
					str = options.format ?
						format(options.format, labelConfig) :
						options.formatter.call(labelConfig, options);

					// Determine the color
					options.style.color = pick(options.color, options.style.color, series.color, 'black');


					// update existing label
					if (dataLabel) {

						if (defined(str)) {
							dataLabel
								.attr({
									text: str
								});
							isNew = false;

						} else { // #1437 - the label is shown conditionally
							point.dataLabel = dataLabel = dataLabel.destroy();
							if (connector) {
								point.connector = connector.destroy();
							}
						}

					// create new label
					} else if (defined(str)) {
						attr = {
							//align: align,
							fill: options.backgroundColor,
							stroke: options.borderColor,
							'stroke-width': options.borderWidth,
							r: options.borderRadius || 0,
							rotation: rotation,
							padding: options.padding,
							zIndex: 1
						};
						// Remove unused attributes (#947)
						for (name in attr) {
							if (attr[name] === UNDEFINED) {
								delete attr[name];
							}
						}

						dataLabel = point.dataLabel = series.chart.renderer[rotation ? 'text' : 'label']( // labels don't support rotation
							str,
							0,
							-999,
							null,
							null,
							null,
							options.useHTML
						)
						.attr(attr)
						.css(extend(options.style, cursor && { cursor: cursor }))
						.add(dataLabelsGroup)
						.shadow(options.shadow);

					}

					if (dataLabel) {
						// Now the data label is created and placed at 0,0, so we need to align it
						series.alignDataLabel(point, dataLabel, options, null, isNew);
					}
				}
			});
		}
	};

	/**
	 * Align each individual data label
	 */
	Series.prototype.alignDataLabel = function (point, dataLabel, options, alignTo, isNew) {
		var chart = this.chart,
			inverted = chart.inverted,
			plotX = pick(point.plotX, -999),
			plotY = pick(point.plotY, -999),
			bBox = dataLabel.getBBox(),
			// Math.round for rounding errors (#2683), alignTo to allow column labels (#2700)
			visible = this.visible && (point.series.forceDL || chart.isInsidePlot(plotX, mathRound(plotY), inverted) ||
				(alignTo && chart.isInsidePlot(plotX, inverted ? alignTo.x + 1 : alignTo.y + alignTo.height - 1, inverted))),
			alignAttr; // the final position;

		if (visible) {

			// The alignment box is a singular point
			alignTo = extend({
				x: inverted ? chart.plotWidth - plotY : plotX,
				y: mathRound(inverted ? chart.plotHeight - plotX : plotY),
				width: 0,
				height: 0
			}, alignTo);

			// Add the text size for alignment calculation
			extend(options, {
				width: bBox.width,
				height: bBox.height
			});

			// Allow a hook for changing alignment in the last moment, then do the alignment
			if (options.rotation) { // Fancy box alignment isn't supported for rotated text
				dataLabel[isNew ? 'attr' : 'animate']({
						x: alignTo.x + options.x + alignTo.width / 2,
						y: alignTo.y + options.y + alignTo.height / 2
					})
					.attr({ // #3003
						align: options.align
					});
			} else {
				dataLabel.align(options, null, alignTo);
				alignAttr = dataLabel.alignAttr;

				// Handle justify or crop
				if (pick(options.overflow, 'justify') === 'justify') {
					this.justifyDataLabel(dataLabel, options, alignAttr, bBox, alignTo, isNew);

				} else if (pick(options.crop, true)) {
					// Now check that the data label is within the plot area
					visible = chart.isInsidePlot(alignAttr.x, alignAttr.y) && chart.isInsidePlot(alignAttr.x + bBox.width, alignAttr.y + bBox.height);

				}
			}
		}

		// Show or hide based on the final aligned position
		if (!visible) {
			dataLabel.attr({ y: -999 });
			dataLabel.placed = false; // don't animate back in
		}

	};

	/**
	 * If data labels fall partly outside the plot area, align them back in, in a way that
	 * doesn't hide the point.
	 */
	Series.prototype.justifyDataLabel = function (dataLabel, options, alignAttr, bBox, alignTo, isNew) {
		var chart = this.chart,
			align = options.align,
			verticalAlign = options.verticalAlign,
			off,
			justified;

		// Off left
		off = alignAttr.x;
		if (off < 0) {
			if (align === 'right') {
				options.align = 'left';
			} else {
				options.x = -off;
			}
			justified = true;
		}

		// Off right
		off = alignAttr.x + bBox.width;
		if (off > chart.plotWidth) {
			if (align === 'left') {
				options.align = 'right';
			} else {
				options.x = chart.plotWidth - off;
			}
			justified = true;
		}

		// Off top
		off = alignAttr.y;
		if (off < 0) {
			if (verticalAlign === 'bottom') {
				options.verticalAlign = 'top';
			} else {
				options.y = -off;
			}
			justified = true;
		}

		// Off bottom
		off = alignAttr.y + bBox.height;
		if (off > chart.plotHeight) {
			if (verticalAlign === 'top') {
				options.verticalAlign = 'bottom';
			} else {
				options.y = chart.plotHeight - off;
			}
			justified = true;
		}

		if (justified) {
			dataLabel.placed = !isNew;
			dataLabel.align(options, null, alignTo);
		}
	};

	/**
	 * Override the base drawDataLabels method by pie specific functionality
	 */
	if (seriesTypes.pie) {
		seriesTypes.pie.prototype.drawDataLabels = function () {
			var series = this,
				data = series.data,
				point,
				chart = series.chart,
				options = series.options.dataLabels,
				connectorPadding = pick(options.connectorPadding, 10),
				connectorWidth = pick(options.connectorWidth, 1),
				plotWidth = chart.plotWidth,
				plotHeight = chart.plotHeight,
				connector,
				connectorPath,
				softConnector = pick(options.softConnector, true),
				distanceOption = options.distance,
				seriesCenter = series.center,
				radius = seriesCenter[2] / 2,
				centerY = seriesCenter[1],
				outside = distanceOption > 0,
				dataLabel,
				dataLabelWidth,
				labelPos,
				labelHeight,
				halves = [// divide the points into right and left halves for anti collision
					[], // right
					[]  // left
				],
				x,
				y,
				visibility,
				rankArr,
				i,
				j,
				overflow = [0, 0, 0, 0], // top, right, bottom, left
				sort = function (a, b) {
					return b.y - a.y;
				};

			// get out if not enabled
			if (!series.visible || (!options.enabled && !series._hasPointLabels)) {
				return;
			}

			// run parent method
			Series.prototype.drawDataLabels.apply(series);

			// arrange points for detection collision
			each(data, function (point) {
				if (point.dataLabel && point.visible) { // #407, #2510
					halves[point.half].push(point);
				}
			});

			/* Loop over the points in each half, starting from the top and bottom
			 * of the pie to detect overlapping labels.
			 */
			i = 2;
			while (i--) {

				var slots = [],
					slotsLength,
					usedSlots = [],
					points = halves[i],
					pos,
					bottom,
					length = points.length,
					slotIndex;

				if (!length) {
					continue;
				}

				// Sort by angle
				series.sortByAngle(points, i - 0.5);

				// Assume equal label heights on either hemisphere (#2630)
				j = labelHeight = 0;
				while (!labelHeight && points[j]) { // #1569
					labelHeight = points[j] && points[j].dataLabel && (points[j].dataLabel.getBBox().height || 21); // 21 is for #968
					j++;
				}

				// Only do anti-collision when we are outside the pie and have connectors (#856)
				if (distanceOption > 0) {

					// Build the slots
					bottom = mathMin(centerY + radius + distanceOption, chart.plotHeight);
					for (pos = mathMax(0, centerY - radius - distanceOption); pos <= bottom; pos += labelHeight) {
						slots.push(pos);
					}
					slotsLength = slots.length;


					/* Visualize the slots
					if (!series.slotElements) {
						series.slotElements = [];
					}
					if (i === 1) {
						series.slotElements.forEach(function (elem) {
							elem.destroy();
						});
						series.slotElements.length = 0;
					}
						
					slots.forEach(function (pos, no) {
						var slotX = series.getX(pos, i) + chart.plotLeft - (i ? 100 : 0),
							slotY = pos + chart.plotTop;
						
						if (!isNaN(slotX)) {
							series.slotElements.push(chart.renderer.rect(slotX, slotY - 7, 100, labelHeight, 1)
								.attr({
									'stroke-width': 1,
									stroke: 'silver',
									fill: 'rgba(0,0,255,0.1)'
								})
								.add());
							series.slotElements.push(chart.renderer.text('Slot '+ no, slotX, slotY + 4)
								.attr({
									fill: 'silver'
								}).add());
						}
					});
					// */

					// if there are more values than available slots, remove lowest values
					if (length > slotsLength) {
						// create an array for sorting and ranking the points within each quarter
						rankArr = [].concat(points);
						rankArr.sort(sort);
						j = length;
						while (j--) {
							rankArr[j].rank = j;
						}
						j = length;
						while (j--) {
							if (points[j].rank >= slotsLength) {
								points.splice(j, 1);
							}
						}
						length = points.length;
					}

					// The label goes to the nearest open slot, but not closer to the edge than
					// the label's index.
					for (j = 0; j < length; j++) {

						point = points[j];
						labelPos = point.labelPos;

						var closest = 9999,
							distance,
							slotI;

						// find the closest slot index
						for (slotI = 0; slotI < slotsLength; slotI++) {
							distance = mathAbs(slots[slotI] - labelPos[1]);
							if (distance < closest) {
								closest = distance;
								slotIndex = slotI;
							}
						}

						// if that slot index is closer to the edges of the slots, move it
						// to the closest appropriate slot
						if (slotIndex < j && slots[j] !== null) { // cluster at the top
							slotIndex = j;
						} else if (slotsLength  < length - j + slotIndex && slots[j] !== null) { // cluster at the bottom
							slotIndex = slotsLength - length + j;
							while (slots[slotIndex] === null) { // make sure it is not taken
								slotIndex++;
							}
						} else {
							// Slot is taken, find next free slot below. In the next run, the next slice will find the
							// slot above these, because it is the closest one
							while (slots[slotIndex] === null) { // make sure it is not taken
								slotIndex++;
							}
						}

						usedSlots.push({ i: slotIndex, y: slots[slotIndex] });
						slots[slotIndex] = null; // mark as taken
					}
					// sort them in order to fill in from the top
					usedSlots.sort(sort);
				}

				// now the used slots are sorted, fill them up sequentially
				for (j = 0; j < length; j++) {

					var slot, naturalY;

					point = points[j];
					labelPos = point.labelPos;
					dataLabel = point.dataLabel;
					visibility = point.visible === false ? HIDDEN : VISIBLE;
					naturalY = labelPos[1];

					if (distanceOption > 0) {
						slot = usedSlots.pop();
						slotIndex = slot.i;

						// if the slot next to currrent slot is free, the y value is allowed
						// to fall back to the natural position
						y = slot.y;
						if ((naturalY > y && slots[slotIndex + 1] !== null) ||
								(naturalY < y &&  slots[slotIndex - 1] !== null)) {
							y = mathMin(mathMax(0, naturalY), chart.plotHeight);
						}

					} else {
						y = naturalY;
					}

					// get the x - use the natural x position for first and last slot, to prevent the top
					// and botton slice connectors from touching each other on either side
					x = options.justify ?
						seriesCenter[0] + (i ? -1 : 1) * (radius + distanceOption) :
						series.getX(y === centerY - radius - distanceOption || y === centerY + radius + distanceOption ? naturalY : y, i);


					// Record the placement and visibility
					dataLabel._attr = {
						visibility: visibility,
						align: labelPos[6]
					};
					dataLabel._pos = {
						x: x + options.x +
							({ left: connectorPadding, right: -connectorPadding }[labelPos[6]] || 0),
						y: y + options.y - 10 // 10 is for the baseline (label vs text)
					};
					dataLabel.connX = x;
					dataLabel.connY = y;


					// Detect overflowing data labels
					if (this.options.size === null) {
						dataLabelWidth = dataLabel.width;
						// Overflow left
						if (x - dataLabelWidth < connectorPadding) {
							overflow[3] = mathMax(mathRound(dataLabelWidth - x + connectorPadding), overflow[3]);

						// Overflow right
						} else if (x + dataLabelWidth > plotWidth - connectorPadding) {
							overflow[1] = mathMax(mathRound(x + dataLabelWidth - plotWidth + connectorPadding), overflow[1]);
						}

						// Overflow top
						if (y - labelHeight / 2 < 0) {
							overflow[0] = mathMax(mathRound(-y + labelHeight / 2), overflow[0]);

						// Overflow left
						} else if (y + labelHeight / 2 > plotHeight) {
							overflow[2] = mathMax(mathRound(y + labelHeight / 2 - plotHeight), overflow[2]);
						}
					}
				} // for each point
			} // for each half

			// Do not apply the final placement and draw the connectors until we have verified
			// that labels are not spilling over.
			if (arrayMax(overflow) === 0 || this.verifyDataLabelOverflow(overflow)) {

				// Place the labels in the final position
				this.placeDataLabels();

				// Draw the connectors
				if (outside && connectorWidth) {
					each(this.points, function (point) {
						connector = point.connector;
						labelPos = point.labelPos;
						dataLabel = point.dataLabel;

						if (dataLabel && dataLabel._pos) {
							visibility = dataLabel._attr.visibility;
							x = dataLabel.connX;
							y = dataLabel.connY;
							connectorPath = softConnector ? [
								M,
								x + (labelPos[6] === 'left' ? 5 : -5), y, // end of the string at the label
								'C',
								x, y, // first break, next to the label
								2 * labelPos[2] - labelPos[4], 2 * labelPos[3] - labelPos[5],
								labelPos[2], labelPos[3], // second break
								L,
								labelPos[4], labelPos[5] // base
							] : [
								M,
								x + (labelPos[6] === 'left' ? 5 : -5), y, // end of the string at the label
								L,
								labelPos[2], labelPos[3], // second break
								L,
								labelPos[4], labelPos[5] // base
							];

							if (connector) {
								connector.animate({ d: connectorPath });
								connector.attr('visibility', visibility);

							} else {
								point.connector = connector = series.chart.renderer.path(connectorPath).attr({
									'stroke-width': connectorWidth,
									stroke: options.connectorColor || point.color || '#606060',
									visibility: visibility
									//zIndex: 0 // #2722 (reversed)
								})
								.add(series.dataLabelsGroup);
							}
						} else if (connector) {
							point.connector = connector.destroy();
						}
					});
				}
			}
		};
		/**
		 * Perform the final placement of the data labels after we have verified that they
		 * fall within the plot area.
		 */
		seriesTypes.pie.prototype.placeDataLabels = function () {
			each(this.points, function (point) {
				var dataLabel = point.dataLabel,
					_pos;

				if (dataLabel) {
					_pos = dataLabel._pos;
					if (_pos) {
						dataLabel.attr(dataLabel._attr);
						dataLabel[dataLabel.moved ? 'animate' : 'attr'](_pos);
						dataLabel.moved = true;
					} else if (dataLabel) {
						dataLabel.attr({ y: -999 });
					}
				}
			});
		};

		seriesTypes.pie.prototype.alignDataLabel =  noop;

		/**
		 * Verify whether the data labels are allowed to draw, or we should run more translation and data
		 * label positioning to keep them inside the plot area. Returns true when data labels are ready
		 * to draw.
		 */
		seriesTypes.pie.prototype.verifyDataLabelOverflow = function (overflow) {

			var center = this.center,
				options = this.options,
				centerOption = options.center,
				minSize = options.minSize || 80,
				newSize = minSize,
				ret;

			// Handle horizontal size and center
			if (centerOption[0] !== null) { // Fixed center
				newSize = mathMax(center[2] - mathMax(overflow[1], overflow[3]), minSize);

			} else { // Auto center
				newSize = mathMax(
					center[2] - overflow[1] - overflow[3], // horizontal overflow
					minSize
				);
				center[0] += (overflow[3] - overflow[1]) / 2; // horizontal center
			}

			// Handle vertical size and center
			if (centerOption[1] !== null) { // Fixed center
				newSize = mathMax(mathMin(newSize, center[2] - mathMax(overflow[0], overflow[2])), minSize);

			} else { // Auto center
				newSize = mathMax(
					mathMin(
						newSize,
						center[2] - overflow[0] - overflow[2] // vertical overflow
					),
					minSize
				);
				center[1] += (overflow[0] - overflow[2]) / 2; // vertical center
			}

			// If the size must be decreased, we need to run translate and drawDataLabels again
			if (newSize < center[2]) {
				center[2] = newSize;
				this.translate(center);
				each(this.points, function (point) {
					if (point.dataLabel) {
						point.dataLabel._pos = null; // reset
					}
				});

				if (this.drawDataLabels) {
					this.drawDataLabels();
				}
			// Else, return true to indicate that the pie and its labels is within the plot area
			} else {
				ret = true;
			}
			return ret;
		};
	}

	if (seriesTypes.column) {

		/**
		 * Override the basic data label alignment by adjusting for the position of the column
		 */
		seriesTypes.column.prototype.alignDataLabel = function (point, dataLabel, options,  alignTo, isNew) {
			var chart = this.chart,
				inverted = chart.inverted,
				dlBox = point.dlBox || point.shapeArgs, // data label box for alignment
				below = point.below || (point.plotY > pick(this.translatedThreshold, chart.plotSizeY)),
				inside = pick(options.inside, !!this.options.stacking); // draw it inside the box?

			// Align to the column itself, or the top of it
			if (dlBox) { // Area range uses this method but not alignTo
				alignTo = merge(dlBox);

				if (inverted) {
					alignTo = {
						x: chart.plotWidth - alignTo.y - alignTo.height,
						y: chart.plotHeight - alignTo.x - alignTo.width,
						width: alignTo.height,
						height: alignTo.width
					};
				}

				// Compute the alignment box
				if (!inside) {
					if (inverted) {
						alignTo.x += below ? 0 : alignTo.width;
						alignTo.width = 0;
					} else {
						alignTo.y += below ? alignTo.height : 0;
						alignTo.height = 0;
					}
				}
			}


			// When alignment is undefined (typically columns and bars), display the individual
			// point below or above the point depending on the threshold
			options.align = pick(
				options.align,
				!inverted || inside ? 'center' : below ? 'right' : 'left'
			);
			options.verticalAlign = pick(
				options.verticalAlign,
				inverted || inside ? 'middle' : below ? 'top' : 'bottom'
			);

			// Call the parent method
			Series.prototype.alignDataLabel.call(this, point, dataLabel, options, alignTo, isNew);
		};
	}





	/**
	 * TrackerMixin for points and graphs
	 */

	var TrackerMixin = Highcharts.TrackerMixin = {

		drawTrackerPoint: function () {
			var series = this,
				chart = series.chart,
				pointer = chart.pointer,
				cursor = series.options.cursor,
				css = cursor && { cursor: cursor },
				onMouseOver = function (e) {
					var target = e.target,
					point;

					if (chart.hoverSeries !== series) {
						series.onMouseOver();
					}

					while (target && !point) {
						point = target.point;
						target = target.parentNode;
					}

					if (point !== UNDEFINED && point !== chart.hoverPoint) { // undefined on graph in scatterchart
						point.onMouseOver(e);
					}
				};

			// Add reference to the point
			each(series.points, function (point) {
				if (point.graphic) {
					point.graphic.element.point = point;
				}
				if (point.dataLabel) {
					point.dataLabel.element.point = point;
				}
			});

			// Add the event listeners, we need to do this only once
			if (!series._hasTracking) {
				each(series.trackerGroups, function (key) {
					if (series[key]) { // we don't always have dataLabelsGroup
						series[key]
							.addClass(PREFIX + 'tracker')
							.on('mouseover', onMouseOver)
							.on('mouseout', function (e) { pointer.onTrackerMouseOut(e); })
							.css(css);
						if (hasTouch) {
							series[key].on('touchstart', onMouseOver);
						}
					}
				});
				series._hasTracking = true;
			}
		},

		/**
		 * Draw the tracker object that sits above all data labels and markers to
		 * track mouse events on the graph or points. For the line type charts
		 * the tracker uses the same graphPath, but with a greater stroke width
		 * for better control.
		 */
		drawTrackerGraph: function () {
			var series = this,
				options = series.options,
				trackByArea = options.trackByArea,
				trackerPath = [].concat(trackByArea ? series.areaPath : series.graphPath),
				trackerPathLength = trackerPath.length,
				chart = series.chart,
				pointer = chart.pointer,
				renderer = chart.renderer,
				snap = chart.options.tooltip.snap,
				tracker = series.tracker,
				cursor = options.cursor,
				css = cursor && { cursor: cursor },
				singlePoints = series.singlePoints,
				singlePoint,
				i,
				onMouseOver = function () {
					if (chart.hoverSeries !== series) {
						series.onMouseOver();
					}
				},
				/*
				 * Empirical lowest possible opacities for TRACKER_FILL for an element to stay invisible but clickable
				 * IE6: 0.002
				 * IE7: 0.002
				 * IE8: 0.002
				 * IE9: 0.00000000001 (unlimited)
				 * IE10: 0.0001 (exporting only)
				 * FF: 0.00000000001 (unlimited)
				 * Chrome: 0.000001
				 * Safari: 0.000001
				 * Opera: 0.00000000001 (unlimited)
				 */
				TRACKER_FILL = 'rgba(192,192,192,' + (hasSVG ? 0.0001 : 0.002) + ')';

			// Extend end points. A better way would be to use round linecaps,
			// but those are not clickable in VML.
			if (trackerPathLength && !trackByArea) {
				i = trackerPathLength + 1;
				while (i--) {
					if (trackerPath[i] === M) { // extend left side
						trackerPath.splice(i + 1, 0, trackerPath[i + 1] - snap, trackerPath[i + 2], L);
					}
					if ((i && trackerPath[i] === M) || i === trackerPathLength) { // extend right side
						trackerPath.splice(i, 0, L, trackerPath[i - 2] + snap, trackerPath[i - 1]);
					}
				}
			}

			// handle single points
			for (i = 0; i < singlePoints.length; i++) {
				singlePoint = singlePoints[i];
				trackerPath.push(M, singlePoint.plotX - snap, singlePoint.plotY,
				L, singlePoint.plotX + snap, singlePoint.plotY);
			}

			// draw the tracker
			if (tracker) {
				tracker.attr({ d: trackerPath });
			} else { // create

				series.tracker = renderer.path(trackerPath)
				.attr({
					'stroke-linejoin': 'round', // #1225
					visibility: series.visible ? VISIBLE : HIDDEN,
					stroke: TRACKER_FILL,
					fill: trackByArea ? TRACKER_FILL : NONE,
					'stroke-width' : options.lineWidth + (trackByArea ? 0 : 2 * snap),
					zIndex: 2
				})
				.add(series.group);

				// The tracker is added to the series group, which is clipped, but is covered
				// by the marker group. So the marker group also needs to capture events.
				each([series.tracker, series.markerGroup], function (tracker) {
					tracker.addClass(PREFIX + 'tracker')
						.on('mouseover', onMouseOver)
						.on('mouseout', function (e) { pointer.onTrackerMouseOut(e); })
						.css(css);

					if (hasTouch) {
						tracker.on('touchstart', onMouseOver);
					}
				});
			}
		}
	};
	/* End TrackerMixin */


	/**
	 * Add tracking event listener to the series group, so the point graphics
	 * themselves act as trackers
	 */ 

	if (seriesTypes.column) {
		ColumnSeries.prototype.drawTracker = TrackerMixin.drawTrackerPoint;	
	}

	if (seriesTypes.pie) {
		seriesTypes.pie.prototype.drawTracker = TrackerMixin.drawTrackerPoint;
	}

	if (seriesTypes.scatter) {
		ScatterSeries.prototype.drawTracker = TrackerMixin.drawTrackerPoint;
	}

	/* 
	 * Extend Legend for item events 
	 */ 
	extend(Legend.prototype, {

		setItemEvents: function (item, legendItem, useHTML, itemStyle, itemHiddenStyle) {
		var legend = this;
		// Set the events on the item group, or in case of useHTML, the item itself (#1249)
		(useHTML ? legendItem : item.legendGroup).on('mouseover', function () {
				item.setState(HOVER_STATE);
				legendItem.css(legend.options.itemHoverStyle);
			})
			.on('mouseout', function () {
				legendItem.css(item.visible ? itemStyle : itemHiddenStyle);
				item.setState();
			})
			.on('click', function (event) {
				var strLegendItemClick = 'legendItemClick',
					fnLegendItemClick = function () {
						item.setVisible();
					};
					
				// Pass over the click/touch event. #4.
				event = {
					browserEvent: event
				};

				// click the name or symbol
				if (item.firePointEvent) { // point
					item.firePointEvent(strLegendItemClick, event, fnLegendItemClick);
				} else {
					fireEvent(item, strLegendItemClick, event, fnLegendItemClick);
				}
			});
		},

		createCheckboxForItem: function (item) {
			var legend = this;

			item.checkbox = createElement('input', {
				type: 'checkbox',
				checked: item.selected,
				defaultChecked: item.selected // required by IE7
			}, legend.options.itemCheckboxStyle, legend.chart.container);

			addEvent(item.checkbox, 'click', function (event) {
				var target = event.target;
				fireEvent(item, 'checkboxClick', {
						checked: target.checked
					},
					function () {
						item.select();
					}
				);
			});
		}	
	});

	/* 
	 * Add pointer cursor to legend itemstyle in defaultOptions
	 */
	defaultOptions.legend.itemStyle.cursor = 'pointer';


	/* 
	 * Extend the Chart object with interaction
	 */

	extend(Chart.prototype, {
		/**
		 * Display the zoom button
		 */
		showResetZoom: function () {
			var chart = this,
				lang = defaultOptions.lang,
				btnOptions = chart.options.chart.resetZoomButton,
				theme = btnOptions.theme,
				states = theme.states,
				alignTo = btnOptions.relativeTo === 'chart' ? null : 'plotBox';
				
			this.resetZoomButton = chart.renderer.button(lang.resetZoom, null, null, function () { chart.zoomOut(); }, theme, states && states.hover)
				.attr({
					align: btnOptions.position.align,
					title: lang.resetZoomTitle
				})
				.add()
				.align(btnOptions.position, false, alignTo);
				
		},

		/**
		 * Zoom out to 1:1
		 */
		zoomOut: function () {
			var chart = this;
			fireEvent(chart, 'selection', { resetSelection: true }, function () { 
				chart.zoom();
			});
		},

		/**
		 * Zoom into a given portion of the chart given by axis coordinates
		 * @param {Object} event
		 */
		zoom: function (event) {
			var chart = this,
				hasZoomed,
				pointer = chart.pointer,
				displayButton = false,
				resetZoomButton;

			// If zoom is called with no arguments, reset the axes
			if (!event || event.resetSelection) {
				each(chart.axes, function (axis) {
					hasZoomed = axis.zoom();
				});
			} else { // else, zoom in on all axes
				each(event.xAxis.concat(event.yAxis), function (axisData) {
					var axis = axisData.axis,
						isXAxis = axis.isXAxis;

					// don't zoom more than minRange
					if (pointer[isXAxis ? 'zoomX' : 'zoomY'] || pointer[isXAxis ? 'pinchX' : 'pinchY']) {
						hasZoomed = axis.zoom(axisData.min, axisData.max);
						if (axis.displayBtn) {
							displayButton = true;
						}
					}
				});
			}
			
			// Show or hide the Reset zoom button
			resetZoomButton = chart.resetZoomButton;
			if (displayButton && !resetZoomButton) {
				chart.showResetZoom();
			} else if (!displayButton && isObject(resetZoomButton)) {
				chart.resetZoomButton = resetZoomButton.destroy();
			}
			

			// Redraw
			if (hasZoomed) {
				chart.redraw(
					pick(chart.options.chart.animation, event && event.animation, chart.pointCount < 100) // animation
				);
			}
		},

		/**
		 * Pan the chart by dragging the mouse across the pane. This function is called
		 * on mouse move, and the distance to pan is computed from chartX compared to
		 * the first chartX position in the dragging operation.
		 */
		pan: function (e, panning) {

			var chart = this,
				hoverPoints = chart.hoverPoints,
				doRedraw;

			// remove active points for shared tooltip
			if (hoverPoints) {
				each(hoverPoints, function (point) {
					point.setState();
				});
			}

			each(panning === 'xy' ? [1, 0] : [1], function (isX) { // xy is used in maps
				var mousePos = e[isX ? 'chartX' : 'chartY'],
					axis = chart[isX ? 'xAxis' : 'yAxis'][0],
					startPos = chart[isX ? 'mouseDownX' : 'mouseDownY'],
					halfPointRange = (axis.pointRange || 0) / 2,
					extremes = axis.getExtremes(),
					newMin = axis.toValue(startPos - mousePos, true) + halfPointRange,
					newMax = axis.toValue(startPos + chart[isX ? 'plotWidth' : 'plotHeight'] - mousePos, true) - halfPointRange;

				if (axis.series.length && newMin > mathMin(extremes.dataMin, extremes.min) && newMax < mathMax(extremes.dataMax, extremes.max)) {
					axis.setExtremes(newMin, newMax, false, false, { trigger: 'pan' });
					doRedraw = true;
				}

				chart[isX ? 'mouseDownX' : 'mouseDownY'] = mousePos; // set new reference for next run
			});

			if (doRedraw) {
				chart.redraw(false);
			}
			css(chart.container, { cursor: 'move' });
		}
	});

	/*
	 * Extend the Point object with interaction
	 */
	extend(Point.prototype, {
		/**
		 * Toggle the selection status of a point
		 * @param {Boolean} selected Whether to select or unselect the point.
		 * @param {Boolean} accumulate Whether to add to the previous selection. By default,
		 *		 this happens if the control key (Cmd on Mac) was pressed during clicking.
		 */
		select: function (selected, accumulate) {
			var point = this,
				series = point.series,
				chart = series.chart;

			selected = pick(selected, !point.selected);

			// fire the event with the defalut handler
			point.firePointEvent(selected ? 'select' : 'unselect', { accumulate: accumulate }, function () {
				point.selected = point.options.selected = selected;
				series.options.data[inArray(point, series.data)] = point.options;

				point.setState(selected && SELECT_STATE);

				// unselect all other points unless Ctrl or Cmd + click
				if (!accumulate) {
					each(chart.getSelectedPoints(), function (loopPoint) {
						if (loopPoint.selected && loopPoint !== point) {
							loopPoint.selected = loopPoint.options.selected = false;
							series.options.data[inArray(loopPoint, series.data)] = loopPoint.options;
							loopPoint.setState(NORMAL_STATE);
								loopPoint.firePointEvent('unselect');
						}
					});
				}
			});
		},

		/**
		 * Runs on mouse over the point
		 */
		onMouseOver: function (e) {
			var point = this,
				series = point.series,
				chart = series.chart,
				tooltip = chart.tooltip,
				hoverPoint = chart.hoverPoint;

			// set normal state to previous series
			if (hoverPoint && hoverPoint !== point) {
				hoverPoint.onMouseOut();
			}

			// trigger the event
			point.firePointEvent('mouseOver');

			// update the tooltip
			if (tooltip && (!tooltip.shared || series.noSharedTooltip)) {
				tooltip.refresh(point, e);
			}

			// hover this
			point.setState(HOVER_STATE);
			chart.hoverPoint = point;
		},

		/**
		 * Runs on mouse out from the point
		 */
		onMouseOut: function () {
			var chart = this.series.chart,
				hoverPoints = chart.hoverPoints;

			this.firePointEvent('mouseOut');

			if (!hoverPoints || inArray(this, hoverPoints) === -1) { // #887, #2240
				this.setState();
				chart.hoverPoint = null;
			}
		},

		/**
		 * Import events from the series' and point's options. Only do it on
		 * demand, to save processing time on hovering.
		 */
		importEvents: function () {
			if (!this.hasImportedEvents) {
				var point = this,
					options = merge(point.series.options.point, point.options),
					events = options.events,
					eventType;

				point.events = events;

				for (eventType in events) {
					addEvent(point, eventType, events[eventType]);
				}
				this.hasImportedEvents = true;

			}
		},

		/**
		 * Set the point's state
		 * @param {String} state
		 */
		setState: function (state, move) {
			var point = this,
				plotX = point.plotX,
				plotY = point.plotY,
				series = point.series,
				stateOptions = series.options.states,
				markerOptions = defaultPlotOptions[series.type].marker && series.options.marker,
				normalDisabled = markerOptions && !markerOptions.enabled,
				markerStateOptions = markerOptions && markerOptions.states[state],
				stateDisabled = markerStateOptions && markerStateOptions.enabled === false,
				stateMarkerGraphic = series.stateMarkerGraphic,
				pointMarker = point.marker || {},
				chart = series.chart,
				radius,
				halo = series.halo,
				haloOptions,
				newSymbol,
				pointAttr;

			state = state || NORMAL_STATE; // empty string
			pointAttr = point.pointAttr[state] || series.pointAttr[state];

			if (
					// already has this state
					(state === point.state && !move) ||
					// selected points don't respond to hover
					(point.selected && state !== SELECT_STATE) ||
					// series' state options is disabled
					(stateOptions[state] && stateOptions[state].enabled === false) ||
					// general point marker's state options is disabled
					(state && (stateDisabled || (normalDisabled && markerStateOptions.enabled === false))) ||
					// individual point marker's state options is disabled
					(state && pointMarker.states && pointMarker.states[state] && pointMarker.states[state].enabled === false) // #1610

				) {
				return;
			}

			// apply hover styles to the existing point
			if (point.graphic) {
				radius = markerOptions && point.graphic.symbolName && pointAttr.r;
				point.graphic.attr(merge(
					pointAttr,
					radius ? { // new symbol attributes (#507, #612)
						x: plotX - radius,
						y: plotY - radius,
						width: 2 * radius,
						height: 2 * radius
					} : {}
				));

				// Zooming in from a range with no markers to a range with markers
				if (stateMarkerGraphic) {
					stateMarkerGraphic.hide();
				}
			} else {
				// if a graphic is not applied to each point in the normal state, create a shared
				// graphic for the hover state
				if (state && markerStateOptions) {
					radius = markerStateOptions.radius;
					newSymbol = pointMarker.symbol || series.symbol;

					// If the point has another symbol than the previous one, throw away the
					// state marker graphic and force a new one (#1459)
					if (stateMarkerGraphic && stateMarkerGraphic.currentSymbol !== newSymbol) {
						stateMarkerGraphic = stateMarkerGraphic.destroy();
					}

					// Add a new state marker graphic
					if (!stateMarkerGraphic) {
						if (newSymbol) {
							series.stateMarkerGraphic = stateMarkerGraphic = chart.renderer.symbol(
								newSymbol,
								plotX - radius,
								plotY - radius,
								2 * radius,
								2 * radius
							)
							.attr(pointAttr)
							.add(series.markerGroup);
							stateMarkerGraphic.currentSymbol = newSymbol;
						}

					// Move the existing graphic
					} else {
						stateMarkerGraphic[move ? 'animate' : 'attr']({ // #1054
							x: plotX - radius,
							y: plotY - radius
						});
					}
				}

				if (stateMarkerGraphic) {
					stateMarkerGraphic[state && chart.isInsidePlot(plotX, plotY, chart.inverted) ? 'show' : 'hide'](); // #2450
				}
			}

			// Show me your halo
			haloOptions = stateOptions[state] && stateOptions[state].halo;
			if (haloOptions && haloOptions.size) {
				if (!halo) {
					series.halo = halo = chart.renderer.path()
						.add(series.seriesGroup);
				}
				halo.attr(extend({
					fill: Color(point.color || series.color).setOpacity(haloOptions.opacity).get()
				}, haloOptions.attributes))[move ? 'animate' : 'attr']({
					d: point.haloPath(haloOptions.size)
				});
			} else if (halo) {
				halo.attr({ d: [] });
			}

			point.state = state;
		},

		haloPath: function (size) {
			var series = this.series,
				chart = series.chart,
				plotBox = series.getPlotBox(),
				inverted = chart.inverted;

			return chart.renderer.symbols.circle(
				plotBox.translateX + (inverted ? series.yAxis.len - this.plotY : this.plotX) - size, 
				plotBox.translateY + (inverted ? series.xAxis.len - this.plotX : this.plotY) - size, 
				size * 2, 
				size * 2
			);
		}
	});

	/*
	 * Extend the Series object with interaction
	 */

	extend(Series.prototype, {
		/**
		 * Series mouse over handler
		 */
		onMouseOver: function () {
			var series = this,
				chart = series.chart,
				hoverSeries = chart.hoverSeries;

			// set normal state to previous series
			if (hoverSeries && hoverSeries !== series) {
				hoverSeries.onMouseOut();
			}

			// trigger the event, but to save processing time,
			// only if defined
			if (series.options.events.mouseOver) {
				fireEvent(series, 'mouseOver');
			}

			// hover this
			series.setState(HOVER_STATE);
			chart.hoverSeries = series;
		},

		/**
		 * Series mouse out handler
		 */
		onMouseOut: function () {
			// trigger the event only if listeners exist
			var series = this,
				options = series.options,
				chart = series.chart,
				tooltip = chart.tooltip,
				hoverPoint = chart.hoverPoint;

			// trigger mouse out on the point, which must be in this series
			if (hoverPoint) {
				hoverPoint.onMouseOut();
			}

			// fire the mouse out event
			if (series && options.events.mouseOut) {
				fireEvent(series, 'mouseOut');
			}


			// hide the tooltip
			if (tooltip && !options.stickyTracking && (!tooltip.shared || series.noSharedTooltip)) {
				tooltip.hide();
			}

			// set normal state
			series.setState();
			chart.hoverSeries = null;
		},

		/**
		 * Set the state of the graph
		 */
		setState: function (state) {
			var series = this,
				options = series.options,
				graph = series.graph,
				graphNeg = series.graphNeg,
				stateOptions = options.states,
				lineWidth = options.lineWidth,
				attribs;

			state = state || NORMAL_STATE;

			if (series.state !== state) {
				series.state = state;

				if (stateOptions[state] && stateOptions[state].enabled === false) {
					return;
				}

				if (state) {
					lineWidth = stateOptions[state].lineWidth || lineWidth + (stateOptions[state].lineWidthPlus || 0);
				}

				if (graph && !graph.dashstyle) { // hover is turned off for dashed lines in VML
					attribs = {
						'stroke-width': lineWidth
					};
					// use attr because animate will cause any other animation on the graph to stop
					graph.attr(attribs);
					if (graphNeg) {
						graphNeg.attr(attribs);
					}
				}
			}
		},

		/**
		 * Set the visibility of the graph
		 *
		 * @param vis {Boolean} True to show the series, false to hide. If UNDEFINED,
		 *				the visibility is toggled.
		 */
		setVisible: function (vis, redraw) {
			var series = this,
				chart = series.chart,
				legendItem = series.legendItem,
				showOrHide,
				ignoreHiddenSeries = chart.options.chart.ignoreHiddenSeries,
				oldVisibility = series.visible;

			// if called without an argument, toggle visibility
			series.visible = vis = series.userOptions.visible = vis === UNDEFINED ? !oldVisibility : vis;
			showOrHide = vis ? 'show' : 'hide';

			// show or hide elements
			each(['group', 'dataLabelsGroup', 'markerGroup', 'tracker'], function (key) {
				if (series[key]) {
					series[key][showOrHide]();
				}
			});


			// hide tooltip (#1361)
			if (chart.hoverSeries === series) {
				series.onMouseOut();
			}


			if (legendItem) {
				chart.legend.colorizeItem(series, vis);
			}


			// rescale or adapt to resized chart
			series.isDirty = true;
			// in a stack, all other series are affected
			if (series.options.stacking) {
				each(chart.series, function (otherSeries) {
					if (otherSeries.options.stacking && otherSeries.visible) {
						otherSeries.isDirty = true;
					}
				});
			}

			// show or hide linked series
			each(series.linkedSeries, function (otherSeries) {
				otherSeries.setVisible(vis, false);
			});

			if (ignoreHiddenSeries) {
				chart.isDirtyBox = true;
			}
			if (redraw !== false) {
				chart.redraw();
			}

			fireEvent(series, showOrHide);
		},

		/**
		 * Memorize tooltip texts and positions
		 */
		setTooltipPoints: function (renew) {
			var series = this,
				points = [],
				pointsLength,
				low,
				high,
				xAxis = series.xAxis,
				xExtremes = xAxis && xAxis.getExtremes(),
				axisLength = xAxis ? (xAxis.tooltipLen || xAxis.len) : series.chart.plotSizeX, // tooltipLen and tooltipPosName used in polar
				point,
				pointX,
				nextPoint,
				i,
				tooltipPoints = []; // a lookup array for each pixel in the x dimension

			// don't waste resources if tracker is disabled
			if (series.options.enableMouseTracking === false || series.singularTooltips) {
				return;
			}

			// renew
			if (renew) {
				series.tooltipPoints = null;
			}

			// concat segments to overcome null values
			each(series.segments || series.points, function (segment) {
				points = points.concat(segment);
			});

			// Reverse the points in case the X axis is reversed
			if (xAxis && xAxis.reversed) {
				points = points.reverse();
			}

			// Polar needs additional shaping
			if (series.orderTooltipPoints) {
				series.orderTooltipPoints(points);
			}

			// Assign each pixel position to the nearest point
			pointsLength = points.length;
			for (i = 0; i < pointsLength; i++) {
				point = points[i];
				pointX = point.x;
				if (pointX >= xExtremes.min && pointX <= xExtremes.max) { // #1149
					nextPoint = points[i + 1];

					// Set this range's low to the last range's high plus one
					low = high === UNDEFINED ? 0 : high + 1;
					// Now find the new high
					high = points[i + 1] ?
						mathMin(mathMax(0, mathFloor( // #2070
							(point.clientX + (nextPoint ? (nextPoint.wrappedClientX || nextPoint.clientX) : axisLength)) / 2
						)), axisLength) :
						axisLength;

					while (low >= 0 && low <= high) {
						tooltipPoints[low++] = point;
					}
				}
			}
			series.tooltipPoints = tooltipPoints;
		},

		/**
		 * Show the graph
		 */
		show: function () {
			this.setVisible(true);
		},

		/**
		 * Hide the graph
		 */
		hide: function () {
			this.setVisible(false);
		},


		/**
		 * Set the selected state of the graph
		 *
		 * @param selected {Boolean} True to select the series, false to unselect. If
		 *				UNDEFINED, the selection state is toggled.
		 */
		select: function (selected) {
			var series = this;
			// if called without an argument, toggle
			series.selected = selected = (selected === UNDEFINED) ? !series.selected : selected;

			if (series.checkbox) {
				series.checkbox.checked = selected;
			}

			fireEvent(series, selected ? 'select' : 'unselect');
		},

		drawTracker: TrackerMixin.drawTrackerGraph
	});

	/* ****************************************************************************
	 * Start Bubble series code											          *
	 *****************************************************************************/

	// 1 - set default options
	defaultPlotOptions.bubble = merge(defaultPlotOptions.scatter, {
		dataLabels: {
			formatter: function () { // #2945
				return this.point.z;
			},
			inside: true,
			style: {
				color: 'white',
				textShadow: '0px 0px 3px black'
			},
			verticalAlign: 'middle'
		},
		// displayNegative: true,
		marker: {
			// fillOpacity: 0.5,
			lineColor: null, // inherit from series.color
			lineWidth: 1
		},
		minSize: 8,
		maxSize: '20%',
		// negativeColor: null,
		// sizeBy: 'area'
		states: {
			hover: {
				halo: {
					size: 5
				}
			}
		},
		tooltip: {
			pointFormat: '({point.x}, {point.y}), Size: {point.z}'
		},
		turboThreshold: 0,
		zThreshold: 0
	});

	var BubblePoint = extendClass(Point, {
		haloPath: function () {
			return Point.prototype.haloPath.call(this, this.shapeArgs.r + this.series.options.states.hover.halo.size);
		}
	});

	// 2 - Create the series object
	seriesTypes.bubble = extendClass(seriesTypes.scatter, {
		type: 'bubble',
		pointClass: BubblePoint,
		pointArrayMap: ['y', 'z'],
		parallelArrays: ['x', 'y', 'z'],
		trackerGroups: ['group', 'dataLabelsGroup'],
		bubblePadding: true,
		
		/**
		 * Mapping between SVG attributes and the corresponding options
		 */
		pointAttrToOptions: { 
			stroke: 'lineColor',
			'stroke-width': 'lineWidth',
			fill: 'fillColor'
		},
		
		/**
		 * Apply the fillOpacity to all fill positions
		 */
		applyOpacity: function (fill) {
			var markerOptions = this.options.marker,
				fillOpacity = pick(markerOptions.fillOpacity, 0.5);
			
			// When called from Legend.colorizeItem, the fill isn't predefined
			fill = fill || markerOptions.fillColor || this.color; 
			
			if (fillOpacity !== 1) {
				fill = Color(fill).setOpacity(fillOpacity).get('rgba');
			}
			return fill;
		},
		
		/**
		 * Extend the convertAttribs method by applying opacity to the fill
		 */
		convertAttribs: function () {
			var obj = Series.prototype.convertAttribs.apply(this, arguments);
			
			obj.fill = this.applyOpacity(obj.fill);
			
			return obj;
		},

		/**
		 * Get the radius for each point based on the minSize, maxSize and each point's Z value. This
		 * must be done prior to Series.translate because the axis needs to add padding in 
		 * accordance with the point sizes.
		 */
		getRadii: function (zMin, zMax, minSize, maxSize) {
			var len,
				i,
				pos,
				zData = this.zData,
				radii = [],
				sizeByArea = this.options.sizeBy !== 'width',
				zRange;
			
			// Set the shape type and arguments to be picked up in drawPoints
			for (i = 0, len = zData.length; i < len; i++) {
				zRange = zMax - zMin;
				pos = zRange > 0 ? // relative size, a number between 0 and 1
					(zData[i] - zMin) / (zMax - zMin) : 
					0.5;
				if (sizeByArea && pos >= 0) {
					pos = Math.sqrt(pos);
				}
				radii.push(math.ceil(minSize + pos * (maxSize - minSize)) / 2);
			}
			this.radii = radii;
		},
		
		/**
		 * Perform animation on the bubbles
		 */
		animate: function (init) {
			var animation = this.options.animation;
			
			if (!init) { // run the animation
				each(this.points, function (point) {
					var graphic = point.graphic,
						shapeArgs = point.shapeArgs;

					if (graphic && shapeArgs) {
						// start values
						graphic.attr('r', 1);

						// animate
						graphic.animate({
							r: shapeArgs.r
						}, animation);
					}
				});

				// delete this function to allow it only once
				this.animate = null;
			}
		},
		
		/**
		 * Extend the base translate method to handle bubble size
		 */
		translate: function () {
			
			var i,
				data = this.data,
				point,
				radius,
				radii = this.radii;
			
			// Run the parent method
			seriesTypes.scatter.prototype.translate.call(this);
			
			// Set the shape type and arguments to be picked up in drawPoints
			i = data.length;
			
			while (i--) {
				point = data[i];
				radius = radii ? radii[i] : 0; // #1737

				// Flag for negativeColor to be applied in Series.js
				point.negative = point.z < (this.options.zThreshold || 0);
				
				if (radius >= this.minPxSize / 2) {
					// Shape arguments
					point.shapeType = 'circle';
					point.shapeArgs = {
						x: point.plotX,
						y: point.plotY,
						r: radius
					};
					
					// Alignment box for the data label
					point.dlBox = {
						x: point.plotX - radius,
						y: point.plotY - radius,
						width: 2 * radius,
						height: 2 * radius
					};
				} else { // below zThreshold
					point.shapeArgs = point.plotY = point.dlBox = UNDEFINED; // #1691
				}
			}
		},
		
		/**
		 * Get the series' symbol in the legend
		 * 
		 * @param {Object} legend The legend object
		 * @param {Object} item The series (this) or point
		 */
		drawLegendSymbol: function (legend, item) {
			var radius = pInt(legend.itemStyle.fontSize) / 2;
			
			item.legendSymbol = this.chart.renderer.circle(
				radius,
				legend.baseline - radius,
				radius
			).attr({
				zIndex: 3
			}).add(item.legendGroup);
			item.legendSymbol.isMarker = true;	
			
		},
		
		drawPoints: seriesTypes.column.prototype.drawPoints,
		alignDataLabel: seriesTypes.column.prototype.alignDataLabel
	});

	/**
	 * Add logic to pad each axis with the amount of pixels
	 * necessary to avoid the bubbles to overflow.
	 */
	Axis.prototype.beforePadding = function () {
		var axis = this,
			axisLength = this.len,
			chart = this.chart,
			pxMin = 0, 
			pxMax = axisLength,
			isXAxis = this.isXAxis,
			dataKey = isXAxis ? 'xData' : 'yData',
			min = this.min,
			extremes = {},
			smallestSize = math.min(chart.plotWidth, chart.plotHeight),
			zMin = Number.MAX_VALUE,
			zMax = -Number.MAX_VALUE,
			range = this.max - min,
			transA = axisLength / range,
			activeSeries = [];

		// Handle padding on the second pass, or on redraw
		if (this.tickPositions) {
			each(this.series, function (series) {

				var seriesOptions = series.options,
					zData;

				if (series.bubblePadding && (series.visible || !chart.options.chart.ignoreHiddenSeries)) {

					// Correction for #1673
					axis.allowZoomOutside = true;

					// Cache it
					activeSeries.push(series);

					if (isXAxis) { // because X axis is evaluated first
					
						// For each series, translate the size extremes to pixel values
						each(['minSize', 'maxSize'], function (prop) {
							var length = seriesOptions[prop],
								isPercent = /%$/.test(length);
							
							length = pInt(length);
							extremes[prop] = isPercent ?
								smallestSize * length / 100 :
								length;
							
						});
						series.minPxSize = extremes.minSize;
						
						// Find the min and max Z
						zData = series.zData;
						if (zData.length) { // #1735
							zMin = pick(seriesOptions.zMin, math.min(
								zMin,
								math.max(
									arrayMin(zData), 
									seriesOptions.displayNegative === false ? seriesOptions.zThreshold : -Number.MAX_VALUE
								)
							));
							zMax = pick(seriesOptions.zMax, math.max(zMax, arrayMax(zData)));
						}
					}
				}
			});

			each(activeSeries, function (series) {

				var data = series[dataKey],
					i = data.length,
					radius;

				if (isXAxis) {
					series.getRadii(zMin, zMax, extremes.minSize, extremes.maxSize);
				}
				
				if (range > 0) {
					while (i--) {
						if (typeof data[i] === 'number') {
							radius = series.radii[i];
							pxMin = Math.min(((data[i] - min) * transA) - radius, pxMin);
							pxMax = Math.max(((data[i] - min) * transA) + radius, pxMax);
						}
					}
				}
			});
			
			if (activeSeries.length && range > 0 && pick(this.options.min, this.userMin) === UNDEFINED && pick(this.options.max, this.userMax) === UNDEFINED) {
				pxMax -= axisLength;
				transA *= (axisLength + pxMin - pxMax) / axisLength;
				this.min += pxMin / transA;
				this.max += pxMax / transA;
			}
		}
	};

	/* ****************************************************************************
	 * End Bubble series code                                                     *
	 *****************************************************************************/



	// global variables
	extend(Highcharts, {
		
		// Constructors
		Axis: Axis,
		Chart: Chart,
		Color: Color,
		Point: Point,
		Tick: Tick,	
		Renderer: Renderer,
		Series: Series,
		SVGElement: SVGElement,
		SVGRenderer: SVGRenderer,
		
		// Various
		arrayMin: arrayMin,
		arrayMax: arrayMax,
		charts: charts,
		dateFormat: dateFormat,
		format: format,
		pathAnim: pathAnim,
		getOptions: getOptions,
		hasBidiBug: hasBidiBug,
		isTouchDevice: isTouchDevice,
		numberFormat: numberFormat,
		seriesTypes: seriesTypes,
		setOptions: setOptions,
		addEvent: addEvent,
		removeEvent: removeEvent,
		createElement: createElement,
		discardElement: discardElement,
		css: css,
		each: each,
		extend: extend,
		map: map,
		merge: merge,
		pick: pick,
		splat: splat,
		extendClass: extendClass,
		pInt: pInt,
		wrap: wrap,
		svg: hasSVG,
		canvas: useCanVG,
		vml: !hasSVG && !useCanVG,
		product: PRODUCT,
		version: VERSION
	});



	}());


	module.exports = window.Highcharts;window.Highcharts = previousHighcharts;

/***/ }),

/***/ "js_charting/visualizations/Visualization":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/helpers/EventMixin"),
	            __webpack_require__("js_charting/util/color_utils"),
	            __webpack_require__("js_charting/util/parsing_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            EventMixin, 
	            colorUtils,
	            parsingUtils
	        ) {

	    var Visualization = function(container, properties) {
	        this.container = container;
	        this.$container = $(container);
	        this.properties = $.extend(true, {}, properties);
	        this.id = _.uniqueId('viz_');
	        this._isDirty = false;
	        this.updateDimensions();
	        this.lastDrawnWidth = null;
	        this.lastDrawnHeight = null;
	        // used for performance profiling
	        this.benchmarks = [];
	    };

	    Visualization.prototype = $.extend({}, EventMixin, {

	        requiresExternalColors: false,

	        getWidth: function() {
	            return this.$container.width();
	        },

	        getHeight: function() {
	            return this.$container.height();
	        },

	        getCurrentDisplayProperties: function() {
	            return this.properties;
	        },

	        isDirty: function() {
	            return this._isDirty;
	        },

	        // To be called before a draw or resize, updates local values of the container width and height.
	        updateDimensions: function() {
	            this.width = this.getWidth();
	            this.height = this.getHeight();
	        },

	        // To be called after a successful draw or resize, caches the most recent drawn dimensions
	        // to be used in resize() below.
	        cacheDrawnDimensions: function() {
	            this.lastDrawnWidth = this.width;
	            this.lastDrawnHeight = this.height;
	        },

	        getClassName: function() {
	            return (this.type + '-chart');
	        },

	        prepare: function(dataSet, properties) {
	            var oldProperties = $.extend(true, {}, this.properties);
	            // properties is an optional parameter, will layer on top of
	            // the properties passed to the constructor
	            if(properties) {
	                $.extend(true, this.properties, properties);
	                if(!_.isEqual(this.properties, oldProperties)) {
	                    this._isDirty = true;
	                }
	            }
	            this.dataSet = dataSet;
	            this.updateDimensions();
	            this.processProperties();
	        },

	        draw: function(callback) {
	            var that = this,
	                dfd = $.Deferred();

	            this.handleDraw(function() {
	                that._isDirty = false;
	                if(callback) {
	                    callback.apply(null, arguments);
	                }
	                dfd.resolve.apply(dfd, arguments);
	            });
	            return dfd;
	        },

	        prepareAndDraw: function(dataSet, properties, callback) {
	            this.prepare(dataSet, properties);
	            return this.draw(callback);
	        },

	        requiresExternalColorPalette: function() {
	            return this.requiresExternalColors;
	        },

	        processProperties: function() {
	            this.type = this.properties.chart || 'column';

	            // set up the color skinning
	            this.backgroundColor = this.properties['chart.backgroundColor']
	                || this.properties.backgroundColor || 'rgb(255, 255, 255)';
	            this.foregroundColor = this.properties['chart.foregroundColor']
	                || this.properties.foregroundColor || 'rgb(0, 0, 0)';
	            this.fontColor = this.properties['chart.fontColor'] || this.properties.fontColor || '#555555';
	            this.foregroundColorSoft = colorUtils.addAlphaToColor(this.foregroundColor, 0.25);
	            this.foregroundColorSofter = colorUtils.addAlphaToColor(this.foregroundColor, 0.15);
	            if (this.properties['chart.foregroundColor'] || this.properties.foregroundColor) {
	                this.axisColorSoft = this.foregroundColorSoft;
	                this.axisColorSofter = this.foregroundColorSofter;
	            }
	            else {
	                this.axisColorSoft = '#d9dce0';
	                this.axisColorSofter = '#ebedef'; 
	            }

	            // handle special modes
	            this.testMode = (parsingUtils.normalizeBoolean(this.properties['chart.testMode'])
	                || parsingUtils.normalizeBoolean(this.properties.testMode));
	            this.exportMode = (parsingUtils.normalizeBoolean(this.properties['chart.exportMode'])
	                || parsingUtils.normalizeBoolean(this.properties.exportMode));
	        },

	        resize: function() {
	            this.updateDimensions();
	            if(!this.width || !this.height || (this.width === this.lastDrawnWidth && this.height === this.lastDrawnHeight)) {
	                return;
	            }
	            this.setSize(this.width, this.height);
	        },

	        // stub methods to be overridden by sub-classes
	        handleDraw: function(callback) { },
	        destroy: function() { },
	        getSVG: function() { },

	        // this method is a no-op if we're not in test mode, otherwise adds an entry to the list of benchmarks
	        benchmark: function(name) {
	            if(!this.testMode) {
	                return;
	            }
	            if(this.benchmarks.length === 0) {
	                this.benchmarks.push([name, (new Date()).getTime()]);
	            }
	            else {
	                var lastTimestamp = _(this.benchmarks).reduce(function(time, mark) { return time + mark[1]; }, 0);
	                this.benchmarks.push([name, (new Date()).getTime() - lastTimestamp]);
	            }
	        }

	    });

	    return Visualization;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/util/color_utils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("shim/jquery"), __webpack_require__("require/underscore"), __webpack_require__("shim/splunk.util")], __WEBPACK_AMD_DEFINE_RESULT__ = function($, _, splunkUtils) {

	    // converts a hex number to its css-friendly counterpart, with optional alpha transparency field
	    // returns null if the input is cannot be parsed to a valid number or if the number is out of range
	    var colorFromHex = function(hexNum, alpha) {
	        if(typeof hexNum !== 'number') {
	            hexNum = parseInt(hexNum, 16);
	        }
	        if(_(hexNum).isNaN() || hexNum < 0x000000 || hexNum > 0xffffff) {
	            return null;
	        }
	        var r = (hexNum & 0xff0000) >> 16,
	            g = (hexNum & 0x00ff00) >> 8,
	            b = hexNum & 0x0000ff;

	        return ((alpha === undefined) ? ('rgb(' + r + ',' + g + ',' + b + ')')
	            : ('rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'));
	    };

	    // converts an rgba value to rgb by stripping out the alpha.  willl return the unchanged parameter
	    // if an rgb value is passed rather than rgba
	    var stripOutAlpha = function(color){
	        var rgb       = color.split(','),
	            thirdChar = rgb[0].charAt(3);

	        if(thirdChar === 'a'){
	            rgb[0] = rgb[0].replace('rgba','rgb');
	            rgb[(rgb.length -1)] = ')';
	            rgb = rgb.join();
	            rgb = rgb.replace(',)',')');
	            return rgb;
	        }
	        return color;
	    };

	    // coverts a color string in either hex (must be long form) or rgb format into its corresponding hex number
	    // returns zero if the color string can't be parsed as either format
	    // TODO: either add support for short form or emit an error
	    var hexFromColor = function(color) {
	        var normalizedColor = splunkUtils.normalizeColor(color);
	        return (normalizedColor) ? parseInt(normalizedColor.replace('#', '0x'), 16) : 0;
	    };

	    // given a color string (in long-form hex or rgb form) or a hex number,
	    // formats the color as an rgba string with the given alpha transparency
	    // TODO: currently fails somewhat silently if an un-parseable or out-of-range input is given
	    var addAlphaToColor = function(color, alpha) {
	        var colorAsHex = (typeof color === 'number') ? color : hexFromColor(color);
	        return colorFromHex(colorAsHex, alpha);
	    };

	    // calculate the luminance of a color based on its hex value
	    // returns zero if the input is cannot be parsed to a valid number or if the number is out of range
	    // equation for luminance found at http://en.wikipedia.org/wiki/Luma_(video)
	    var getLuminance = function(hexNum) {
	        if(typeof hexNum !== "number") {
	            hexNum = parseInt(hexNum, 16);
	        }
	        if(isNaN(hexNum) || hexNum < 0x000000 || hexNum > 0xffffff) {
	            return 0;
	        }
	        var r = (hexNum & 0xff0000) >> 16,
	            g = (hexNum & 0x00ff00) >> 8,
	            b = hexNum & 0x0000ff;

	        return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
	    };

	    // compute the user-visible fill opacity of an SVG element
	    // an opacity defined as part of the 'fill' color with rgba(...) syntax will take precedence over the 'fill-opacity'
	    var getComputedOpacity = function(element) {
	        var fill = $.trim(element.attr('fill')),
	            enforceValidOpacity = function(opacityStr) {
	                var parsed = parseFloat(opacityStr);
	                return (parsed >= 0 && parsed <= 1) ? parsed : 1;
	            };


	        if (!/^rgba/.test(fill)) {
	            return enforceValidOpacity(element.attr('fill-opacity'));
	        }
	        var rgba = fill.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
	        return rgba && rgba.length > 4 ? enforceValidOpacity(rgba[4]) : 1;
	    };

	    return ({

	        colorFromHex: colorFromHex,
	        stripOutAlpha: stripOutAlpha,
	        hexFromColor: hexFromColor,
	        addAlphaToColor: addAlphaToColor,
	        getLuminance: getLuminance,
	        getComputedOpacity: getComputedOpacity

	    });

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/util/parsing_utils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("require/underscore"), __webpack_require__("shim/splunk.util"), __webpack_require__("js_charting/util/color_utils")], __WEBPACK_AMD_DEFINE_RESULT__ = function(_, splunkUtils, colorUtils) {

	    // normalize a boolean, a default state can optionally be defined for when the value is undefined
	    var normalizeBoolean = function(value, defaultState) {
	        if(_(value).isUndefined()) {
	            return !!defaultState;
	        }
	        return splunkUtils.normalizeBoolean(value);
	    };

	    // translates a JSON-style serialized map in to a primitive object
	    // cannot handle nested objects
	    // value strings should be un-quoted or double-quoted and will be stripped of leading/trailing whitespace
	    // will not cast to numbers or booleans
	    var stringToObject = function(str) {
	        if(!str) {
	            return false;
	        }
	        var i, propList, loopKv, loopKey,
	            map = {};

	        str = trimWhitespace(str);
	        var strLen = str.length;
	        if(str.charAt(0) !== '{' || str.charAt(strLen - 1) !== '}') {
	            return false;
	        }

	        if(/^\{\s*\}$/.test(str)) {
	            return {};
	        }
	        str = str.substr(1, strLen - 2);
	        propList = escapeSafeSplit(str, ',');
	        for(i = 0; i < propList.length; i++) {
	            loopKv = escapeSafeSplit(propList[i], ':');
	            loopKey = trimWhitespace(loopKv[0]);
	            if(loopKey[0] === '"') {
	                loopKey = loopKey.substring(1);
	            }
	            if(_(loopKey).last() === '"') {
	                loopKey = loopKey.substring(0, loopKey.length - 1);
	            }
	            loopKey = unescapeChars(loopKey, ['{', '}', '[', ']', '(', ')', ',', ':', '"']);
	            map[loopKey] = trimWhitespace(loopKv[1]);
	        }
	        return map;
	    };

	    // translates a JSON-style serialized list in to a primitive array
	    // cannot handle nested arrays
	    var stringToArray = function(str) {
	        if(!str) {
	            return false;
	        }
	        str = trimWhitespace(str);
	        var strLen = str.length;

	        if(str.charAt(0) !== '[' || str.charAt(strLen - 1) !== ']') {
	            return false;
	        }
	        if(/^\[\s*\]$/.test(str)) {
	            return [];
	        }
	        str = str.substr(1, strLen - 2);
	        return splunkUtils.stringToFieldList(str);
	    };

	    // TODO: replace with $.trim
	    var trimWhitespace = function(str) {
	        return str.replace(/^\s*/, '').replace(/\s*$/, '');
	    };

	    var escapeSafeSplit = function(str, delimiter, escapeChar) {
	        escapeChar = escapeChar || '\\';
	        var unescapedPieces = str.split(delimiter),
	        // the escaped pieces list initially contains the first element of the unescaped pieces list
	        // we use shift() to also remove that element from the unescaped pieces
	            escapedPieces = [unescapedPieces.shift()];

	        // now loop over the remaining unescaped pieces
	        // if the last escaped piece ends in an escape character, perform a concatenation to undo the split
	        // otherwise append the new piece to the escaped pieces list
	        _(unescapedPieces).each(function(piece) {
	            var lastEscapedPiece = _(escapedPieces).last();
	            if(_(lastEscapedPiece).last() === escapeChar) {
	                escapedPieces[escapedPieces.length - 1] += (delimiter + piece);
	            }
	            else {
	                escapedPieces.push(piece);
	            }
	        });
	        return escapedPieces;
	    };

	    var unescapeChars = function(str, charList) {
	        _(charList).each(function(chr) {
	            // looks weird, but the first four slashes add a single escaped '\' to the regex
	            // and the next two escape the character itself within the regex
	            var regex = new RegExp('\\\\\\' + chr, 'g');
	            str = str.replace(regex, chr);
	        });
	        return str;
	    };

	    // this will be improved to do some SVG-specific escaping
	    var escapeHtml = function(input){
	        return splunkUtils.escapeHtml(input);
	    };

	    var escapeSVG = function(input) {
	        return ("" + input).replace(/</g, '&lt;').replace(/>/g, '&gt;');
	    };

	    var looseParseColor = function(colorStr) {
	        if (_.isNumber(colorStr)) {
	            return colorStr;
	        }
	        if (colorStr.substring(0, 1) === '#') {
	            return colorUtils.hexFromColor(colorStr);
	        }
	        // For legacy reasons, assume that any string is a hex number representation,
	        // regardless of whether it starts with a '0x' (SPL-124191)
	        return parseInt(colorStr, 16);
	    };

	    var stringToHexArray = function(colorStr) {
	        var i, hexColor, colors;
	        
	        try {
	            colors = JSON.parse(colorStr);
	        } catch(e) {
	            colors = stringToArray(colorStr);
	        }

	        if(!colors) {
	            return false;
	        }
	        for(i = 0; i < colors.length; i++) {
	            hexColor = looseParseColor(colors[i]);
	            if(isNaN(hexColor)) {
	                return false;
	            }
	            colors[i] = hexColor;
	        }
	        return colors;
	    };

	    var stringToHexObject = function(colorStr) {
	        var parsedInput;
	        try {
	            parsedInput = JSON.parse(colorStr);
	        } catch(e) {
	            parsedInput = stringToObject(colorStr);
	        }
	        if (!parsedInput) {
	            return false;
	        }
	        var hexObject = {};
	        _(parsedInput).each(function(color, key) {
	            hexObject[key] = looseParseColor(color) || 0;
	        });
	        return hexObject;
	    };

	    // a simple utility method for comparing arrays, assumes one-dimensional arrays of primitives,
	    // performs strict comparisons
	    var arraysAreEquivalent = function(array1, array2) {
	        // make sure these are actually arrays
	        if(!(array1 instanceof Array) || !(array2 instanceof Array)) {
	            return false;
	        }
	        if(array1 === array2) {
	            // true if they are the same object
	            return true;
	        }
	        if(array1.length !== array2.length) {
	            // false if they are different lengths
	            return false;
	        }
	        // false if any of their elements don't match
	        for(var i = 0; i < array1.length; i++) {
	            if(array1[i] !== array2[i]) {
	                return false;
	            }
	        }
	        return true;
	    };

	    var getLegendProperties = function(properties) {
	        var remapped = {},
	            legendProps = filterPropsByRegex(properties, /legend[.]/);

	        _(legendProps).each(function(value, key) {
	            remapped[key.replace(/^legend[.]/, '')] = value;
	        });
	        return remapped;
	    };

	    // returns a map of properties that apply either to the x-axis or to x-axis labels
	    // all axis-related keys are renamed to 'axis' and all axis-label-related keys are renamed to 'axisLabels'
	    var getXAxisProperties = function(properties) {
	        var key, newKey,
	            remapped = {},
	            axisProps = filterPropsByRegex(properties, /(axisX|primaryAxis|axisLabelsX|axisTitleX|gridLinesX)/);
	        for(key in axisProps) {
	            if(axisProps.hasOwnProperty(key)) {
	                if(!xAxisKeyIsTrumped(key, properties)) {
	                    newKey = key.replace(/(axisX|primaryAxis)/, "axis");
	                    newKey = newKey.replace(/axisLabelsX/, "axisLabels");
	                    newKey = newKey.replace(/axisTitleX/, "axisTitle");
	                    newKey = newKey.replace(/gridLinesX/, "gridLines");
	                    remapped[newKey] = axisProps[key];
	                }
	            }
	        }
	        return remapped;
	    };

	    // checks if the given x-axis key is deprecated, and if so returns true if that key's
	    // non-deprecated counterpart is set in the properties map, otherwise returns false
	    var xAxisKeyIsTrumped = function(key, properties) {
	        if(!(/primaryAxis/.test(key))) {
	            return false;
	        }
	        if(/primaryAxisTitle/.test(key)) {
	            return properties[key.replace(/primaryAxisTitle/, "axisTitleX")];
	        }
	        return properties[key.replace(/primaryAxis/, "axisX")];
	    };

	    // returns a map of properties that apply either to the y-axis or to y-axis labels
	    // all axis-related keys are renamed to 'axis' and all axis-label-related keys are renamed to 'axisLabels'
	    var getYAxisProperties = function(properties, axisIndex) {
	        var key, newKey,
	            remapped = {},
	            axisProps, 
	            initGridLinesValue;
	        axisIndex = (properties && splunkUtils.normalizeBoolean(properties['layout.splitSeries']) ? 0 : axisIndex) || 0;
	        if(axisIndex === 0) {
	            axisProps = filterPropsByRegex(properties, /(axisY[^2]|secondaryAxis|axisLabelsY(?!2.*|\.majorLabelStyle\.rotation|\.majorLabelStyle\.overflowMode)|axisTitleY[^2]|gridLinesY[^2])/); 
	        } else if (axisIndex === 1) {
	            axisProps = filterPropsByRegex(properties, /(axisY2(?!\.enabled)|axisLabelsY2(?!\.majorLabelStyle\.rotation|\.majorLabelStyle\.overflowMode)|axisTitleY2|gridLinesY2)/); 
	            initGridLinesValue = splunkUtils.normalizeBoolean(axisProps['gridLinesY2.showMajorLines']); 
	            if(!axisProps['axisY2.scale'] || axisProps['axisY2.scale'] === 'inherit'){
	                axisProps['axisY2.scale'] = properties ? (properties['axisY.scale'] || 'linear') : 'linear'; 
	            }
	            if(typeof initGridLinesValue !== 'boolean'){
	                axisProps['gridLinesY2.showMajorLines'] = 0; 
	            }
	            axisProps['axisLabelsY2.extendsAxisRange'] = properties ? (properties['axisLabelsY.extendsAxisRange'] || true) : true;
	        } else {
	            throw new Error('Axis index must be 0 or 1'); 
	        }

	        for(key in axisProps) {
	            if(axisProps.hasOwnProperty(key)) {
	                if(!yAxisKeyIsTrumped(key, properties)) {
	                    newKey = key.replace(/(axisY2|axisY|secondaryAxis)/, "axis");
	                    newKey = newKey.replace(/axisLabelsY2|axisLabelsY/, "axisLabels");
	                    newKey = newKey.replace(/axisTitleY2|axisTitleY/, "axisTitle");
	                    newKey = newKey.replace(/gridLinesY2|gridLinesY/, "gridLines");
	                    remapped[newKey] = axisProps[key];
	                }
	            }
	        }
	        return remapped;
	    };

	    // checks if the given y-axis key is deprecated, and if so returns true if that key's
	    // non-deprecated counterpart is set in the properties map, otherwise returns false
	    var yAxisKeyIsTrumped = function(key, properties) {
	        if(!(/secondaryAxis/.test(key))) {
	            return false;
	        }
	        if(/secondaryAxisTitle/.test(key)) {
	            return properties[key.replace(/secondaryAxisTitle/, "axisTitleY")];
	        }
	        return properties[key.replace(/secondaryAxis/, "axisY")];
	    };

	    // uses the given regex to filter out any properties whose key doesn't match
	    // will return an empty object if the props input is not a map
	    var filterPropsByRegex = function(props, regex) {
	        if(!(regex instanceof RegExp)) {
	            return props;
	        }
	        var key,
	            filtered = {};

	        for(key in props) {
	            if(props.hasOwnProperty(key) && regex.test(key)) {
	                filtered[key] = props[key];
	            }
	        }
	        return filtered;
	    };

	    // gets axis label rotation
	    var getRotation = function(rotationProperty){
	        var PERMITTED_ROTATIONS = [-90, -45, 0, 45, 90],
	            DEFAULT_ROTATION = 0, 
	            labelRotation;
	        labelRotation = parseInt(rotationProperty, 10); 
	        if(_.indexOf(PERMITTED_ROTATIONS, labelRotation) === -1){
	            return DEFAULT_ROTATION; 
	        }
	        return labelRotation;
	    };

	    return ({

	        normalizeBoolean: normalizeBoolean,
	        stringToObject: stringToObject,
	        stringToArray: stringToArray,
	        trimWhitespace: trimWhitespace,
	        escapeSafeSplit: escapeSafeSplit,
	        unescapeChars: unescapeChars,
	        escapeHtml: escapeHtml,
	        escapeSVG: escapeSVG,
	        stringToHexArray: stringToHexArray,
	        stringToHexObject: stringToHexObject,
	        arraysAreEquivalent: arraysAreEquivalent,
	        getLegendProperties: getLegendProperties,
	        getXAxisProperties: getXAxisProperties,
	        xAxisKeyIsTrumped: xAxisKeyIsTrumped,
	        getYAxisProperties: getYAxisProperties,
	        yAxisKeyIsTrumped: yAxisKeyIsTrumped,
	        filterPropsByRegex: filterPropsByRegex,
	        getRotation: getRotation

	    });

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/components/ColorPalette":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("js_charting/util/color_utils"),
	            __webpack_require__("util/color_utils"),
	            __webpack_require__("splunk/palettes/ColorCodes")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            parsingUtils,
	            colorUtils,
	            splunkColorUtils,
	            ColorCodes
	        ) {

	    var ColorPalette = function(colors, useInterpolation) {
	        this.setColors(colors);
	        this.useInterpolation = parsingUtils.normalizeBoolean(useInterpolation, false);
	    };

	    ColorPalette.prototype = {

	        setColors: function(colors) {
	            this.colors = colors || this.BASE_COLORS;
	        },

	        getColor: function(field, index, count) {
	            var p, index1, index2,
	                numColors = this.colors.length;

	            if(numColors === 0) {
	                return 0x000000;
	            }
	            if(index < 0) {
	                index = 0;
	            }
	            if(!this.useInterpolation) {
	                return this.colors[index % numColors];
	            }
	            if (count < 1) {
	                count = 1;
	            }
	            if (index > count) {
	                index = count;
	            }
	            p = (count === 1) ? 0 : (numColors - 1) * (index / (count - 1));
	            index1 = Math.floor(p);
	            index2 = Math.min(index1 + 1, numColors - 1);
	            p -= index1;

	            return splunkColorUtils.interpolateColors(this.colors[index1], this.colors[index2], p);
	        },

	        getColorAsRgb: function(field, index, count) {
	            var hexColor = this.getColor(field, index, count);
	            return colorUtils.colorFromHex(hexColor);
	        },

	        BASE_COLORS: ColorCodes.toNumbers(ColorCodes.CATEGORICAL)

	    };

	    return ColorPalette;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/components/axes/TimeAxis":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/components/axes/Axis"),
	            __webpack_require__("js_charting/components/axes/CategoryAxis"),
	            __webpack_require__("js_charting/helpers/Formatter"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("util/time"),
	            __webpack_require__("js_charting/util/time_utils"),
	            __webpack_require__("js_charting/util/dom_utils"), 
	            __webpack_require__("js_charting/util/parsing_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Axis,
	            CategoryAxis,
	            Formatter,
	            langUtils,
	            splunkTimeUtils,
	            timeUtils,
	            domUtils, 
	            parsingUtils
	        ) {

	    var TimeAxis = function(properties) {
	        CategoryAxis.call(this, properties);
	        var NO_ROTATION_LABEL_CUTOFF = 6,
	            NEG45_ROTATION_LABEL_CUTOFF = 10,
	            ROTATION_LABEL_CUTOFF = 15;

	        this.numLabelCutoff = (this.labelRotation === 0) ? NO_ROTATION_LABEL_CUTOFF : (this.labelRotation === -45) ? NEG45_ROTATION_LABEL_CUTOFF : ROTATION_LABEL_CUTOFF;
	        this.spanData = properties['axis.spanData'];
	        
	        this.tickLabelPadding = (this.isVertical) ? 2 : 3;
	    };
	    langUtils.inherit(TimeAxis, CategoryAxis);

	    $.extend(TimeAxis.prototype, {

	        getConfig: function() {
	            var config = CategoryAxis.prototype.getConfig.call(this);
	            $.extend(true, config, {
	                showLastLabel: true,
	                labels: {
	                    maxStaggerLines: 1
	                }
	            });
	            return config;
	        },

	        setCategories: function(categories, spanData) {
	            this.previousSpanData = this.spanData;
	            this.spanData = spanData;
	            CategoryAxis.prototype.setCategories.call(this, categories);
	        },

	        getSpanData: function() {
	            return this.spanData;
	        },

	        getPreviousSpanData: function() {
	            return this.previousSpanData || [];
	        },

	        formatLabel: function(info) {
	            return info;
	        },

	        formatValue: function(value) {
	            return timeUtils.formatIsoStringAsTooltip(value, this.pointSpan) || _('Invalid timestamp').t();
	        },

	        /**
	         * @author sfishel
	         *
	         * Before the getOffset routine runs, align the axis labels to the right of each tick
	         */

	        getOffsetPreHook: function(axis) {
	            var options = axis.options,
	                chart = axis.chart,
	                axisLength = (this.isVertical) ? chart.plotHeight : chart.plotWidth,
	                extremes = axis.getExtremes(),
	                numCategories = Math.round(extremes.max - extremes.min + (this.hasTickmarksBetween() ? 1 : 0)),
	                labelFontSize = parseInt((options.labels.style.fontSize.split('px'))[0], 10) || 0,
	                tickSpacing = (numCategories > 1) ? (axisLength / numCategories) : axisLength + (this.tickLabelPadding * 2),
	                xDelta = 0, yDelta = 0,
	                paddingValue;

	            options.adjustedTickSpacing = tickSpacing;
	            if(this.isVertical) {
	                yDelta = (tickSpacing / 2) + (labelFontSize / 3);
	                xDelta = - (options.tickLength + 4);
	            }
	            else {
	                if(this.labelRotation === -45){
	                    options.labels.align = 'right';
	                    xDelta = labelFontSize / 2;
	                    yDelta = labelFontSize / 2 + options.tickLength + 4;
	                    if(axis.tickPositions.length === 1){
	                        xDelta -= 50;
	                    }
	                }
	                else if(this.labelRotation === 45){
	                    options.labels.align = 'left';
	                    paddingValue = 4 * this.tickLabelPadding;
	                    xDelta = - labelFontSize / 2;
	                    yDelta = labelFontSize / 2 + options.tickLength + 4;
	                }
	                else if(this.labelRotation === -90){
	                    options.labels.align = 'right';
	                    xDelta = labelFontSize / 3;
	                    yDelta = options.tickLength + 4;
	                }
	                else if(this.labelRotation === 90){
	                    options.labels.align = 'left';
	                    xDelta = - labelFontSize / 2;
	                    yDelta = options.tickLength + 4;
	                }
	                else{
	                    options.labels.align = 'left';
	                    xDelta = 0;
	                    yDelta = labelFontSize + options.tickLength + 2;
	                }

	                // Bar vs Line
	                if(options.tickmarkPlacement !== 'on') {
	                    //display 1 column axis label correctly
	                    if(numCategories === 1){ 
	                        xDelta = -((tickSpacing / 2) + xDelta);
	                    }else{
	                        xDelta = (tickSpacing / 2) + xDelta;
	                    }
	                    
	                }
	            }
	            options.labels.x = xDelta;
	            options.labels.y = yDelta;
	        },

	        // The setTickPositionsPostHook will customize the look for a time axis, so our only job here is to make sure we
	        // don't let Highcharts generate the "too many ticks" error (SPL-82620 and SPL-83727).
	        tickPositioner: function(axis, min, max) {
	            // The only edge case here is when the min and max are the same (either there is only one point of data or
	            // the chart has been zoomed to a single point), in which case let Highcharts do its default behavior.
	            if(min === max) {
	                return null;
	            }
	            return [min, max];
	        },

	        tickRenderPostHook: function(tick, index, old, opacity) {
	            // For the 90 degree label rotation case multi-line labels will end up overflowing to the left of the tick mark.
	            // Translate the label to the right by the difference between its width and the pre-existing x-offset.
	            // Do this before calling super so that collision detection will be accurate.
	            if(tick.label && this.labelRotation === 90) {
	                var lineHeight = parseInt(tick.axis.options.labels.style.lineHeight || 14, 0);
	                tick.label.translate(tick.labelBBox.width - (lineHeight - this.tickLabelPadding), 0);
	            }
	            CategoryAxis.prototype.tickRenderPostHook.call(this, tick, index, old, opacity);
	        },

	        /**
	         * @author sfishel
	         *
	         * Make adjustments to the tick positions to label only the appropriate times
	         */

	        setTickPositionsPostHook: function(axis, secondPass) {
	            var options = axis.options,
	                extremes = axis.getExtremes(),
	                extremesMin = Math.round(extremes.min),
	                extremesMax = Math.round(extremes.max),
	                numCategories = Math.round(extremesMax - extremesMin + (this.hasTickmarksBetween() ? 1 : 0)),
	                timeCategoryInfo = timeUtils.convertTimeToCategories(
	                    this.originalCategories.slice(extremesMin, extremesMin + numCategories),
	                    this.numLabelCutoff
	                ),
	                categories = timeCategoryInfo.categories;

	            this.granularity = timeCategoryInfo.granularity;
	            this.pointSpan = timeUtils.getPointSpan(this.originalCategories);

	            axis.tickPositions = [];
	            _(categories).each(function(category, i) {
	                if(category !== ' ') {
	                    var insertionIndex = extremesMin + i;
	                    if(options.tickmarkPlacement === 'between' && numCategories !== 1) {
	                        insertionIndex--;
	                    }
	                    options.categories[insertionIndex] = category;
	                    axis.tickPositions.push(insertionIndex);
	                }
	            }, this);
	            // adjust the axis label CSS so that soft-wrapping will not occur
	            options.labels.style.whiteSpace = 'nowrap';
	        },

	        /**
	         * @author sfishel
	         *
	         * Use the handleOverflow override hook to handle any collisions among the axis labels
	         */

	        tickHandleOverflowOverride: function(tick, index, xy, old) {
	            // ignore the -1 tick for the purposes of detecting collisions and overflows, since it is not visible
	            // also ignore old ticks, which are being rendered in the wrong place in preparation for animation
	            if(index === -1 || old) {
	                return true;
	            }
	            // use the first tick as an indicator that we're starting a new render routine and reset the collisionDetected flag
	            // can't do the regular collision detection because the first tick isn't there yet
	            if(index === 0) {
	                this.collisionDetected = false;
	                this.lastTickFits = true;
	                return true;
	            }
	            this.collisionDetected = this.collisionDetected || this.tickOverlapsPrevious(tick, index, xy);
	            if(tick.isLast) {
	                this.lastTickFits = CategoryAxis.prototype.tickHandleOverflowOverride.call(this, tick, index, xy);
	                this.resolveCollisionDetection(tick.axis, this.collisionDetected, this.lastTickFits);
	                return this.lastTickFits;
	            }
	            return true;
	        },

	        tickOverlapsPrevious: function(tick, index, xy) {
	            var axis = tick.axis,
	                // assume this won't be called with the first tick
	                previous = axis.ticks[axis.tickPositions[index - 1]],
	                previousXY;

	            if(!previous){
	                return false;
	            }
	            previousXY = previous.getPosition(axis.horiz, previous.pos, axis.tickmarkOffset);
	            // check for the vertical axis case
	            if(this.isVertical) {
	                var previousBottom = previousXY.y + this.getTickLabelExtremesY(previous)[1];
	                return (xy.y - axis.options.labels.y < previousBottom + this.tickLabelPadding);
	            }

	            // otherwise handle the horizontal axis case
	            var previousRight = previousXY.x + this.getTickLabelExtremesX(previous)[1];
	            if(tick.label.rotation === -90) {
	                return (xy.x - (axis.options.labels.x / 2) < previousRight);
	            }
	            return xy.x < previousRight;
	        },

	        tickOverlapsNext: function(tick, index, xy) {
	            var axis = tick.axis,
	                // assume this won't be called with the last tick
	                next = axis.ticks[axis.tickPositions[index + 1]], 
	                nextXY;

	            if(!next) {
	                return false;
	            }
	            nextXY = next.getPosition(axis.horiz, next.pos, axis.tickmarkOffset);

	            // check for the vertical axis case
	            if(this.isVertical) {
	                var myBottom = xy.y + this.getTickLabelExtremesY(tick)[1];
	                return (myBottom > nextXY.y);
	            }

	            // otherwise handle the horizontal case
	            var myRight = xy.x + this.getTickLabelExtremesX(tick)[1];
	            return (myRight > nextXY.x);
	        },

	        resolveCollisionDetection: function(axis, hasCollisions, lastLabelFits) {
	            var tickPositions = axis.tickPositions,
	                collisionTickPositions = tickPositions.slice(1),
	                ticks = axis.ticks,
	                rawLabels = this.originalCategories,
	                labelGranularity = this.granularity,
	                positionOffset = this.hasTickmarksBetween() ? 1 : 0;

	            if(hasCollisions) {
	                _(collisionTickPositions).each(function(pos, i) {
	                    i++; // do this because we sliced out the first tick
	                    var tick = ticks[pos];
	                    if(i % 2 === 0) {
	                        var bdTime = splunkTimeUtils.extractBdTime(rawLabels[tick.pos + positionOffset]),
	                            prevTick = ticks[tickPositions[i - 2]],
	                            prevBdTime = splunkTimeUtils.extractBdTime(rawLabels[prevTick.pos + positionOffset]),
	                            newLabel = (timeUtils.formatBdTimeAsAxisLabel(bdTime, prevBdTime, labelGranularity) || ['']).join('<br/>');

	                        tick.label.attr({ text: newLabel });
	                    }
	                    else {
	                        tick.label.hide();
	                        if(tick.mark) {
	                            tick.mark.hide();
	                        }
	                    }
	                });
	            }
	            else {
	                _(collisionTickPositions).each(function(pos, i) {
	                    i++; // do this because we sliced out the first tick
	                    var tick = ticks[pos];
	                    tick.label.show();
	                    if(tick.mark) {
	                        tick.mark.show();
	                    }
	                    if(i % 2 === 0) {
	                        var bdTime = splunkTimeUtils.extractBdTime(rawLabels[pos + positionOffset]),
	                            prevTick = ticks[tickPositions[i - 1]],
	                            prevBdTime = splunkTimeUtils.extractBdTime(rawLabels[prevTick.pos + positionOffset]),
	                            newLabel = (timeUtils.formatBdTimeAsAxisLabel(bdTime, prevBdTime, labelGranularity) || ['']).join('<br/>');

	                        tick.label.attr({ text: newLabel });
	                    }
	                });
	            }
	            if(!lastLabelFits && (!hasCollisions || tickPositions.length % 2 !== 0)) {
	                axis.ticks[_(tickPositions).last()].label.hide();
	            }
	        },

	        // have to make some adjustments to get the correct answer when tickmarkPlacement = between
	        getTickLabelExtremesX: function(tick) {
	            var extremes = CategoryAxis.prototype.getTickLabelExtremesX.call(this, tick),
	                axisOptions = tick.axis.options;
	            if(this.hasTickmarksBetween() && tick.label.rotation === 0) {
	                return _(extremes).map(function(extreme) { return extreme - (axisOptions.adjustedTickSpacing / 2); });
	            }
	            // FIXME: hacky solution: when rotation is -90 and -45, the multiline overflow can overlap not just the nearest label to the right
	            // but the nearest two labels to the right - and collision detection only hides the nearest label to the right, 
	            // leaving the second label to the right still overlapping. For now, we simplistically pretend the first label is wider
	            // than it is, to force an increase in tickSpacing (instead of re-checking for collisions after the first label is fully rendered, 
	            // at which point we can increase the NEG45_ROTATION_LABEL_CUTOFF to ROTATION_LABEL_CUTOFF).
	            if(tick.isFirst){
	                if(tick.label.rotation === -90 || tick.label.rotation === -45 || tick.label.rotation === 90){
	                    extremes[1] = tick.labelBBox.width;
	                }
	            }
	            return extremes;
	        },

	        // inheritance gets a little weird here, the TimeAxis wants to go back to the base Axis behavior for this method
	        getTickLabelExtremesY: function(tick) {
	            return Axis.prototype.getTickLabelExtremesY.apply(this, arguments);
	        }

	    });

	    return TimeAxis;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "js_charting/components/axes/Axis":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/helpers/Formatter"),
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("js_charting/util/dom_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Formatter,
	            parsingUtils,
	            domUtils
	        ) {

	    var AxisBase = function(properties) {
	        this.properties = properties || {};
	        this.id = _.uniqueId('axis_');
	        this.isVertical = this.properties['axis.orientation'] === 'vertical';
	        this.isZoomed = false;
	        this._titleIsDirty = false;
	        if(!this.labelRotation){
	            this.labelRotation = this.isVertical 
	                ? 0 
	                : parsingUtils.getRotation(this.properties['axisLabels.majorLabelStyle.rotation']);
	        }
	    };

	    AxisBase.prototype = {

	        getZoomed: function(newMin, newMax){
	            var axis = this.hcAxis;
	            return (newMin !== undefined && newMin > axis.dataMin) 
	                    || (newMax !== undefined && newMax < (axis.options.tickmarkPlacement === 'between' ? axis.dataMax : axis.dataMax + 1));
	        },

	        clone: function() {
	            return (new this.constructor($.extend(true, {}, this.properties)));
	        },

	        getConfig: function() {
	            var titleText = null,
	                that = this;
	            if(!this.properties['isEmpty'] 
	                && this.properties['axisTitle.visibility'] !== 'collapsed' 
	                && !!this.properties['axisTitle.text'] 
	                && !(/^\s+$/.test(this.properties['axisTitle.text']))) 
	            {
	                titleText = parsingUtils.escapeSVG(this.properties['axisTitle.text']);
	            }
	            return $.extend(true, this.getOrientationDependentConfig(), {
	                id: this.id,
	                labels: {
	                    enabled: (this.properties['axisLabels.majorLabelVisibility'] !== 'hide'),
	                    formatter: function() {
	                        var formatInfo = this;
	                        return that.formatLabel(formatInfo);
	                    },
	                    style: {
	                        color: this.properties['axis.fontColor'] || '#000000'
	                    }
	                },
	                title: {
	                    style: {
	                        color: this.properties['axis.fontColor'] || '#000000',
	                        fontSize: '12px',
	                        // Hack to make sure we can render literal '<' and '>'
	                        HcTextStroke: true
	                    },
	                    text: titleText
	                },
	                opposite: this.properties['opposite'],

	                lineColor: this.properties['axis.foregroundColorSoft'] || '#d9dce0',
	                lineWidth: (this.properties['axisLabels.axisVisibility'] === 'hide') ? 0 : 1,
	                gridLineColor: this.properties['axis.foregroundColorSofter'] || '#ebedef',

	                tickLength: parseInt(this.properties['axisLabels.majorTickSize'], 10) || 6,
	                tickColor: this.properties['axis.foregroundColorSoft'] || '#d9dce0',
	                tickWidth: (this.properties['axisLabels.majorTickVisibility'] === 'hide') ? 0 : 1 ,
	                tickRenderPostHook: _(this.tickRenderPostHook).bind(this),
	                tickHandleOverflowOverride: _(this.tickHandleOverflowOverride).bind(this),
	                getOffsetPreHook: _(this.getOffsetPreHook).bind(this), 
	                zoomOverride: _(this.zoomOverride).bind(this),
	                getLabelSizeOverride: _(this.getLabelSizeOverride).bind(this)
	            });
	        },

	        zoomOverride: function(axis, newMin, newMax) {
	            axis.displayBtn = false;
	            if (axis.dataMin && newMin <= axis.dataMin) {
	                newMin = undefined;
	            }
	            if (axis.dataMax && ((axis.options.tickmarkPlacement === 'between' && newMax >= axis.dataMax)
	                    || (axis.options.tickmarkPlacement === 'on' && newMax > axis.dataMax))){
	               newMax = undefined;
	            }
	            this.isZoomed = this.getZoomed(newMin, newMax);
	            axis.setExtremes(
	                newMin,
	                newMax,
	                false, 
	                undefined, 
	                { trigger: 'zoom' }
	            );
	            return true;
	        },

	        getOrientationDependentConfig: function() {
	            if(this.isVertical) {
	                return $.extend(true, {}, this.BASE_VERT_CONFIG, this.getVerticalConfig());
	            }
	            return $.extend(true, {}, this.BASE_HORIZ_CONFIG, this.getHorizontalConfig());
	        },

	        onChartLoad: function() {},
	        redraw: function(redrawChart) {
	            if(!this.hcAxis) {
	                throw new Error('cannot redraw an axis that has not been drawn yet');
	            }
	            if(this.titleIsDirty()) {
	                this.hcAxis.setTitle({text: this.properties['axisTitle.text']}, redrawChart);
	            }
	        },

	        titleIsDirty: function() {
	            return this._titleIsDirty;
	        },

	        setTitle: function(title) {
	            this.previousAxisTitle = this.properties['axisTitle.text'];
	            this.properties['axisTitle.text'] = title;

	            if(!_.isEqual(this.properties['axisTitle.text'], this.previousAxisTitle)) {
	                this._titleIsDirty = true;
	            }
	        },

	        onChartLoadOrRedraw: function(chart) {
	            this.hcAxis = chart.get(this.id);
	            this.initializeTicks();
	            this._titleIsDirty = false;
	        },

	        // convert the ticks to an array in ascending order by 'pos'
	        initializeTicks: function() {
	            var key,
	                ticks = this.hcAxis.ticks,
	                tickArray = [];

	            for(key in ticks) {
	                if(ticks.hasOwnProperty(key)) {
	                    tickArray.push(ticks[key]);
	                }
	            }
	            tickArray.sort(function(t1, t2) {
	                return (t1.pos - t2.pos);
	            });
	            this.ticks = tickArray;
	        },

	        tickRenderPostHook: function(tick, index, old, opacity) {
	            // Highcharts renders with zero opacity to remove old ticks
	            if(!tick.label || opacity === 0) {
	                return;
	            }
	            if(!tick.handleOverflow(index, tick.label.xy, old)) {
	                domUtils.hideTickLabel(tick);
	            }
	            else {
	                domUtils.showTickLabel(tick);
	            }
	        },

	        getOffsetPreHook: function(axis) {
	            if(axis.userOptions.title.text) {
	                var chart = axis.chart,
	                    formatter = new Formatter(chart.renderer),
	                    axisTitle = axis.userOptions.title.text,
	                    fontSize = 12,
	                    elidedTitle;

	                if(axis.horiz) {
	                    elidedTitle = formatter.ellipsize(axisTitle, chart.chartWidth - 100, fontSize, { fontWeight: 'bold' });
	                } 
	                else {
	                    elidedTitle = formatter.ellipsize(axisTitle, chart.chartHeight - 100, fontSize, { fontWeight: 'bold' });
	                }
	                
	                axis.options.title.text = elidedTitle;
	                if(axis.axisTitle) {
	                    axis.axisTitle.attr({ text: elidedTitle });
	                }

	                formatter.destroy();
	            }
	        },

	        tickHandleOverflowOverride: function(tick, index, xy) {
	            if(tick.isFirst) {
	                return this.handleFirstTickOverflow(tick, index, xy);
	            }
	            var axis = tick.axis,
	                axisOptions = axis.options,
	                numTicks = axis.tickPositions.length - (axisOptions.tickmarkPlacement === 'between' ? 0 : 1),
	                labelStep = axisOptions.labels.step || 1;

	            // take the label step into account when identifying the last visible label
	            if(tick.isLast || index === (numTicks - (numTicks % labelStep))) {
	                return this.handleLastTickOverflow(tick, index, xy);
	            }
	            return true;
	        },

	        handleFirstTickOverflow: function(tick, index, xy) {
	            // if the axis is horizontal or reversed, the first label is oriented such that it can't overflow
	            var axis = tick.axis;
	            if(axis.horiz || axis.reversed) {
	                return true;
	            }
	            var labelBottom = this.getTickLabelExtremesY(tick)[1],
	                axisBottom = axis.top + axis.len;

	            return (xy.y + labelBottom <= axisBottom);
	        },

	        handleLastTickOverflow: function(tick, index, xy) {
	            var axis = tick.axis;
	            // if the axis is vertical and not reversed, the last label is oriented such that it can't overflow
	            if(!axis.horiz && !axis.reversed) {
	                return true;
	            }
	            // handle the horizontal axis case
	            if(axis.horiz) {
	                var axisRight = axis.left + axis.len,
	                    labelRight = this.getTickLabelExtremesX(tick)[1];

	                return (xy.x + labelRight <= axisRight);
	            }

	            // handle the reversed vertical axis case
	            var labelBottom = this.getTickLabelExtremesY(tick)[1],
	                axisBottom = axis.top + axis.len;

	            return (xy.y + labelBottom <= axisBottom);
	        },

	        getTickLabelExtremesX: function(tick) {
	            return tick.getLabelSides();
	        },

	        getTickLabelExtremesY: function(tick) {
	            var labelTop = -(tick.axis.options.labels.y / 2);
	            return [labelTop, labelTop + tick.labelBBox.height];
	        },

	        // An override of the Highcharts routine for determining a label size perpendicular to its axis,
	        // which is used to set axis margins.
	        getLabelSizeOverride: function(tick) {
	            if (!tick.label) {
	                return 0;
	            }
	            var isHoriz = this.properties['axis.orientation'] === 'horizontal';
	            tick.labelBBox = tick.label.getBBox();
	            // If this is the last visible tick of a horizontal axis of an area/line chart, then
	            // the tick label is not visible (only the tick mark is rendered) so we return 0.
	            if (isHoriz && this.properties['axisLabels.tickmarkPlacement'] === 'on' && tick.isLast && !tick.isFirst) {
	                return 0;
	            }
	            return tick.labelBBox[isHoriz ? 'height' : 'width'];
	        },

	        destroy: function() {
	            this.hcAxis = null;
	        },

	        getVerticalConfig: function() { return {}; },
	        getHorizontalConfig: function() { 
	            return {    
	                labels: {
	                    rotation: this.labelRotation
	                }
	            };
	        },

	        BASE_HORIZ_CONFIG: {
	            title: {
	                margin: 6
	            },
	            labels: {
	                y: 15
	            }
	        },

	        BASE_VERT_CONFIG: {
	        title: {
	                margin: 6
	            }
	        }

	    };

	    return AxisBase;
	    
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "js_charting/helpers/Formatter":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	        __webpack_require__("shim/jquery"),
	        __webpack_require__("require/underscore"),
	        __webpack_require__("js_charting/util/dom_utils"), 
	        __webpack_require__("js_charting/helpers/font_data/widths/helvetica")
	    ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        $,
	        _,
	        domUtils, 
	        helveticaWidths
	    ) {

	    var Formatter = function(renderer) {
	        this.renderer = renderer;
	        this.charWidths = helveticaWidths;  // char width hash
	        this.DEFAULT_CHAR_WIDTH = 1000; // width of widest char in char set 
	        this.ELLIPSIS_WIDTH = 834;  // per Adobe font format specifications - width of 3 periods
	        this.ELLIPSIS = "...";
	        this.PX_TO_PT_RATIO = {};   // memoized hash of a px:pt ratio for each font size  
	        this.boldFontScale = 1.0555; // approximated bold:normal font ratio
	        this.KERNING_FACTOR = 0.006;    // approximated value to compensate for width estimation algorithm's lack of kerning predictions
	    };

	    Formatter.prototype = {
	        /*
	            Font Units of Measurement:
	            "All measurements in AFM, AMFM, and ACFM ﬁles are given in terms of 
	            units equal to 1/1000 of the scale factor (point size) of the font being used. To 
	            compute actual sizes in a document (in points; with 72 points = 1 inch), these 
	            amounts should be multiplied by (scale factor of font) / 1000." - Adobe specifications 
	            // So: 
	             // Point width = AFM width * (fontSize / 1000)
	        */

	        // Memoizes or returns actual:predicted widths ratio 
	        _getPxScale: function(fontSize, css){
	            var chars = "foo",  // arbitrary string 
	                pxScale; 
	            // Currently, the only css property supported is 'font-weight: bold'
	            if(css && css['font-weight'] && css['font-weight'] === 'bold'){
	                pxScale = this.PX_TO_PT_RATIO[fontSize]['bold'];
	                if(!pxScale){
	                    pxScale = this._calculatePxScale(chars, fontSize, css);
	                    this.PX_TO_PT_RATIO[fontSize]['bold'] = pxScale;
	                }
	                return pxScale;
	            }else{
	                pxScale = this.PX_TO_PT_RATIO[fontSize];
	                if(!pxScale){
	                    pxScale = this._calculatePxScale(chars, fontSize);
	                    this.PX_TO_PT_RATIO[fontSize] = pxScale; 
	                }
	                return pxScale;
	            }
	        }, 

	        // Renders text to get actual width and predicts text using widths hash to return ratio of actual:predicted
	        _calculatePxScale: function(chars, fontSize, css){
	            var pxWidth = this.getTextBBox(chars, fontSize, css).width;
	            var widthInAFM = this._widthOfString(chars, css); 
	            var ptWidth = widthInAFM * fontSize / 1000; 
	            return pxWidth / ptWidth; 
	        }, 

	        // Returns width of string in AFM units 
	        _widthOfString: function(str, css){
	            var fontScale = 1; 
	            if(css && css['font-weight'] && css['font-weight'] === 'bold'){
	                fontScale = this.boldFontScale;
	            }
	            if(!str || str === ""){
	                return 0;
	            }
	            var width = 0, 
	                strLen = str.length; 
	            for(var i = 0; i < strLen; i++){
	                // if char is not found (e.g. non-English char), return default width 
	                width += this.charWidths[str.charCodeAt(i)] || this.DEFAULT_CHAR_WIDTH; 
	            }
	            return width * fontScale;
	        },

	        ellipsize: function(str, maxWidthInPixels, fontSize, css, ellipsisPlacement){
	            if(_(str).isArray()) {
	                str = str.join(',');
	            }
	            str = $.trim(str);
	            var strLen = str.length; 
	            if(!str || str === ""){
	                return "";
	            }
	            if(strLen <= 3 || !fontSize || isNaN(fontSize) || fontSize <= 0){
	                return str; 
	            }
	            if(!maxWidthInPixels || isNaN(maxWidthInPixels) || maxWidthInPixels <= 0){
	                return this.ELLIPSIS;
	            }
	            var kerningFactor = this.KERNING_FACTOR * fontSize * strLen, // must account for lack of kerning prediction in AFM width estimation in our px usage
	                maxWidthInPoints = (maxWidthInPixels + kerningFactor) / this._getPxScale(fontSize), // do not pass css to _getPxScale() as maxWidth is independent of css
	                strWidth = this._widthOfString(str, css),   // predict string width in AFM
	                maxWidth = maxWidthInPoints * 1000 / fontSize,  // convert max pt width to AFM
	                excessWidth = strWidth - maxWidth,
	                widthCounter = 0,
	                concatText = "", 
	                i, strLenMinusOne, strMiddle; 
	            if(excessWidth > 0){
	                var maxCharsWidth = maxWidth - this.ELLIPSIS_WIDTH; // how many chars and an ellipsis fit within max width 
	                switch(ellipsisPlacement){
	                    case 'end':
	                        for(i = 0; i < strLen; i++){
	                            widthCounter += this.charWidths[str.charCodeAt(i)] || this.DEFAULT_CHAR_WIDTH;
	                            if(widthCounter > maxCharsWidth){
	                                return concatText + this.ELLIPSIS;
	                            }
	                            concatText += str[i];
	                        }
	                        break;
	                    case 'start':
	                        strLenMinusOne = strLen - 1; 
	                        for(i = strLenMinusOne; i >= 0; i--){
	                            widthCounter += this.charWidths[str.charCodeAt(i)] || this.DEFAULT_CHAR_WIDTH;
	                            if(widthCounter > maxCharsWidth){
	                                return this.ELLIPSIS + concatText;
	                            }
	                            concatText = str[i].concat(concatText);
	                        }
	                        break;
	                    default:
	                        // default to middle ellipsization 
	                        strMiddle = Math.floor(str.length/2);
	                        for(i = 0; i <= strMiddle; i++){
	                            // try including leftmost unexamined char 
	                            widthCounter += this.charWidths[str.charCodeAt(i)] || this.DEFAULT_CHAR_WIDTH; 
	                            if(widthCounter > maxCharsWidth){
	                                // char does not fit - drop it and insert ellipsis in its place 
	                                return (str.substring(0, i) + this.ELLIPSIS + str.substring(strLen - i, strLen));
	                            }else if(widthCounter === maxCharsWidth){
	                                // char fits but no more chars will - insert ellipsis in middle, after this char 
	                                return (str.substring(0, i + 1) + this.ELLIPSIS + str.substring(strLen - i, strLen));
	                            }
	                            // try including rightmost unexamined char
	                            widthCounter += this.charWidths[str.charCodeAt(strLen - i - 1)] || this.DEFAULT_CHAR_WIDTH; 
	                            if(widthCounter > maxCharsWidth){
	                                // char does not fit - drop it and insert ellipsis in its place 
	                                return (str.substring(0, i + 1) + this.ELLIPSIS + str.substring(strLen - i, strLen));
	                            }else if(widthCounter === maxCharsWidth){
	                                // char fits but no more chars will - insert ellipsis in middle, before this char 
	                                return (str.substring(0, i + 1) + this.ELLIPSIS + str.substring(strLen - i - 1, strLen));
	                            }
	                        }
	                        break; 
	                }
	            }else{
	                // no need to ellipsize
	                return str;
	            }
	        },

	        // NOTE: it is up to caller to test that the entire string does not already fit
	        // even if it does, this method will do log N work and may or may not truncate the last character
	        trimStringToWidth: function(text, width, fontSize, css) {
	            var that = this,
	                binaryFindEndIndex = function(start, end) {
	                    var testIndex;
	                    while(end > start + 1) {
	                        testIndex = Math.floor((start + end) / 2);
	                        if(that.predictTextWidth(text.substr(0, testIndex), fontSize, css) > width) {
	                            end = testIndex;
	                        }
	                        else {
	                            start = testIndex;
	                        }
	                    }
	                    return start;
	                },
	                endIndex = binaryFindEndIndex(0, text.length);

	            return text.substr(0, endIndex);
	        },

	        reverseString: function(str) {
	            return str.split("").reverse().join("");
	        },

	        //Returns width of string in px units
	        predictTextWidth: function(str, fontSize, css) {
	            if(_(str).isArray()) {
	                str = str.join(',');
	            }
	            if(!str || str === "" || !fontSize || isNaN(fontSize)){
	                return 0;
	            }
	            // split lines by break tag, trimming leading and trailing whitespaces 
	            var multilineArray = str.split(/\s*<br\s*\/?>\s*/),
	                multilineArrayLen = multilineArray.length; 
	            if(multilineArrayLen > 1){
	                // if multiple lines are passed (<br> || <br/> || <br />) then return width of widest line 
	                var maxWidth = 0; 
	                for(var i = 0; i < multilineArrayLen; i++){
	                    if(multilineArray[i] && multilineArray[i] !== ""){
	                        var thisLineWidth = this._predictLineWidth(multilineArray[i], fontSize, css); 
	                        if(thisLineWidth > maxWidth){
	                            maxWidth = thisLineWidth; 
	                        } 
	                    }
	                }
	                return maxWidth; 
	            }else{
	                // single line string 
	                var width = this._predictLineWidth($.trim(str), fontSize, css);
	                return width; 
	            }
	        },

	        _predictLineWidth: function(str, fontSize, css){
	            // predict string width by adding each char's width from the AFM char hash 
	            var widthInAFM = this._widthOfString(str, css); 
	            // convert AFM width to point units
	            var widthInPt = widthInAFM * fontSize / 1000; 
	            // convert point width to pixel units 
	            var widthInPx = widthInPt * (this._getPxScale(fontSize)); 
	            return widthInPx - (this.KERNING_FACTOR * fontSize * str.length); 
	        },

	        predictTextHeight: function(text, fontSize, css) {
	            if(_(text).isArray()) {
	                text = text.join(',');
	            }
	            if(!fontSize || !text) {
	                return 0;
	            }
	            var bBox = (this.getTextBBox(text, fontSize, css));
	            return (bBox) ? bBox.height : 0;
	        },

	        getTextBBox: function(text, fontSize, css) {
	            // fontSize is required; css is any other styling that determines size (italics, bold, etc.)
	            css = $.extend(css, {
	                fontSize: fontSize + 'px'
	            });

	            if(isNaN(parseFloat(fontSize, 10))) {
	                return undefined;
	            }
	            if(this.textPredicter) {
	                this.textPredicter.destroy();
	            }
	            this.textPredicter = this.renderer.text(text, 0, 0)
	                .attr({
	                    visibility: 'hidden'
	                })
	                .css(css)
	                .add();

	            return this.textPredicter.getBBox();
	        },

	        adjustLabels: function(originalLabels, width, minFont, maxFont, ellipsisMode) {
	            var i, fontSize, shouldEllipsize,
	                labels = $.extend(true, [], originalLabels),
	                maxWidths = this.getMaxWidthForFontRange(labels, minFont, maxFont);

	            // adjust font and try to fit longest
	            if(maxWidths[maxFont] <= width) {
	                shouldEllipsize = false;
	                fontSize = maxFont;
	            }
	            else {
	                shouldEllipsize = true;
	                for(fontSize = maxFont - 1; fontSize > minFont; fontSize--) {
	                    if(maxWidths[fontSize] <= width) {
	                        shouldEllipsize = false;
	                        break;
	                    }
	                }
	            }

	            if(shouldEllipsize && ellipsisMode !== 'none') {
	                for(i = 0; i < labels.length; i++) {
	                    labels[i] = this.ellipsize(labels[i], width, fontSize, {}, ellipsisMode);
	                }
	            }
	            return {
	                labels: labels,
	                fontSize: fontSize,
	                areEllipsized: shouldEllipsize,
	                longestWidth: maxWidths[fontSize]
	            };
	        },

	        getMaxWidthForFontRange: function(labels, minFont, maxFont) {
	            var longestLabelIndex,
	                fontSizeToWidthMap = {};

	            // find the longest label
	            fontSizeToWidthMap[minFont] = 0;
	            for(var i = 0; i < labels.length; i++) {
	                var labelLength = this.predictTextWidth(labels[i] || '', minFont);
	                if(labelLength > fontSizeToWidthMap[minFont]) {
	                    longestLabelIndex = i;
	                    fontSizeToWidthMap[minFont] = labelLength;
	                }
	            }
	            // fill in the widths for the rest of the font sizes
	            for(var fontSize = minFont + 1; fontSize <= maxFont; fontSize++) {
	                fontSizeToWidthMap[fontSize] = this.predictTextWidth(labels[longestLabelIndex] || '', fontSize);
	            }
	            return fontSizeToWidthMap;
	        },

	        bBoxesOverlap: function(bBox1, bBox2, marginX, marginY) {
	            marginX = marginX || 0;
	            marginY = marginY || 0;
	            var box1Left = bBox1.x - marginX,
	                box2Left = bBox2.x - marginX,
	                box1Right = bBox1.x + bBox1.width + 2 * marginX,
	                box2Right = bBox2.x + bBox2.width + 2 * marginX,
	                box1Top = bBox1.y - marginY,
	                box2Top = bBox2.y - marginY,
	                box1Bottom = bBox1.y + bBox1.height + 2 * marginY,
	                box2Bottom = bBox2.y + bBox2.height + 2 * marginY;

	            return ((box1Left < box2Right) && (box1Right > box2Left)
	                && (box1Top < box2Bottom) && (box1Bottom > box2Top));
	        },

	        destroy: function() {
	            if(this.textPredicter) {
	                this.textPredicter.destroy();
	                this.textPredicter = false;
	            }
	        }

	    };

	    return Formatter;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/helpers/font_data/widths/helvetica":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;//Character Widths Hash in format:
	// // {unicode of char : width of char in points} //name of char
	//note to self: extraction command: cat charset_encodings | awk '{ print $2 " : " $5 ", //" $8 }'
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function(){

		var widthsHash = {
			32 : 278, //space
			33 : 278, //exclam
			34 : 355, //quotedbl
			35 : 556, //numbersign
			36 : 556, //dollar
			37 : 889, //percent
			38 : 667, //ampersand
			39 : 222, //quoteright
			40 : 333, //parenleft
			41 : 333, //parenright
			42 : 389, //asterisk
			43 : 584, //plus
			44 : 278, //comma
			45 : 333, //hyphen
			46 : 278, //period
			47 : 278, //slash
			48 : 556, //zero
			49 : 556, //one
			50 : 556, //two
			51 : 556, //three
			52 : 556, //four
			53 : 556, //five
			54 : 556, //six
			55 : 556, //seven
			56 : 556, //eight
			57 : 556, //nine
			58 : 278, //colon
			59 : 278, //semicolon
			60 : 584, //less
			61 : 584, //equal
			62 : 584, //greater
			63 : 556, //question
			64 : 1015, //at
			65 : 667, //A
			66 : 667, //B
			67 : 722, //C
			68 : 722, //D
			69 : 667, //E
			70 : 611, //F
			71 : 778, //G
			72 : 722, //H
			73 : 278, //I
			74 : 500, //J
			75 : 667, //K
			76 : 556, //L
			77 : 833, //M
			78 : 722, //N
			79 : 778, //O
			80 : 667, //P
			81 : 778, //Q
			82 : 722, //R
			83 : 667, //S
			84 : 611, //T
			85 : 722, //U
			86 : 667, //V
			87 : 944, //W
			88 : 667, //X
			89 : 667, //Y
			90 : 611, //Z
			91 : 278, //bracketleft
			92 : 278, //backslash
			93 : 278, //bracketright
			94 : 469, //asciicircum
			95 : 556, //underscore
			96 : 222, //quoteleft
			97 : 556, //a
			98 : 556, //b
			99 : 500, //c
			100 : 556, //d
			101 : 556, //e
			102 : 278, //f
			103 : 556, //g
			104 : 556, //h
			105 : 222, //i
			106 : 222, //j
			107 : 500, //k
			108 : 222, //l
			109 : 833, //m
			110 : 556, //n
			111 : 556, //o
			112 : 556, //p
			113 : 556, //q
			114 : 333, //r
			115 : 500, //s
			116 : 278, //t
			117 : 556, //u
			118 : 500, //v
			119 : 722, //w
			120 : 500, //x
			121 : 500, //y
			122 : 500, //z
			123 : 334, //braceleft
			124 : 260, //bar
			125 : 334, //braceright
			126 : 584, //asciitilde
			161 : 333, //exclamdown
			162 : 556, //cent
			163 : 556, //sterling
			164 : 167, //fraction
			165 : 556, //yen
			166 : 556, //florin
			167 : 556, //section
			168 : 556, //currency
			169 : 191, //quotesingle
			170 : 333, //quotedblleft
			171 : 556, //guillemotleft
			172 : 333, //guilsinglleft
			173 : 333, //guilsinglright
			174 : 500, //fi
			175 : 500, //fl
			177 : 556, //endash
			178 : 556, //dagger
			179 : 556, //daggerdbl
			180 : 278, //periodcentered
			182 : 537, //paragraph
			183 : 350, //bullet
			184 : 222, //quotesinglbase
			185 : 333, //quotedblbase
			186 : 333, //quotedblright
			187 : 556, //guillemotright
			188 : 1000, //ellipsis
			189 : 1000, //perthousand
			191 : 611, //questiondown
			193 : 333, //grave
			194 : 333, //acute
			195 : 333, //circumflex
			196 : 333, //tilde
			197 : 333, //macron
			198 : 333, //breve
			199 : 333, //dotaccent
			200 : 333, //dieresis
			202 : 333, //ring
			203 : 333, //cedilla
			205 : 333, //hungarumlaut
			206 : 333, //ogonek
			207 : 333, //caron
			208 : 1000, //emdash
			225 : 1000, //AE
			227 : 370, //ordfeminine
			232 : 556, //Lslash
			233 : 778, //Oslash
			234 : 1000, //OE
			235 : 365, //ordmasculine
			241 : 889, //ae
			245 : 278, //dotlessi
			248 : 222, //lslash
			249 : 611, //oslash
			250 : 944, //oe
			251 : 611 //germandbls
		};

		return widthsHash; 
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)); 


/***/ }),

/***/ "js_charting/components/axes/CategoryAxis":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/components/axes/Axis"),
	            __webpack_require__("js_charting/helpers/Formatter"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("helpers/user_agent")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Axis,
	            Formatter,
	            langUtils,
	            parsingUtils,
	            userAgent
	        ) {

	    var CategoryAxis = function(properties) {
	        Axis.call(this, properties);
	        properties = properties || {};
	        // the property is exposed for testing only
	        this.skipLabelsToAvoidCollisions = parsingUtils.normalizeBoolean(properties['axis.skipLabelsToAvoidCollisions']);
	        this.ellipsize = properties['axisLabels.majorLabelStyle.overflowMode'] === 'ellipsisMiddle';
	        this.properties['axis.categories'] = this.processCategories(properties['axis.categories']);
	        this._categoriesAreDirty = false;
	        this.isiOS = userAgent.isiOS();
	    };
	    langUtils.inherit(CategoryAxis, Axis);

	    $.extend(CategoryAxis.prototype, {

	        DEFAULT_FONT_SIZE: 12,
	        MIN_FONT_SIZE: 9,

	        getConfig: function() {
	            var that = this,
	                config = Axis.prototype.getConfig.apply(this, arguments),
	                hideAxis = parsingUtils.normalizeBoolean(this.properties['axisLabels.hideCategories']);

	            $.extend(true, config, {
	                categories: this.properties['axis.categories'].slice(0),
	                labels: {
	                    formatter: function() {
	                        return that.formatLabel(this.value);
	                    },
	                    enabled: config.labels.enabled && !hideAxis,
	                    maxStaggerLines: 2,
	                    style: {
	                        // Hack to make sure we can render literal '<' and '>'
	                        HcTextStroke: true
	                    }
	                },
	                startOnTick: !this.hasTickmarksBetween(),
	                showLastLabel: this.hasTickmarksBetween(),
	                tickWidth: hideAxis ? 0 : config.tickWidth,
	                tickmarkPlacement: this.properties['axisLabels.tickmarkPlacement'],
	                tickPositioner: function(min, max) {
	                    // will be called by Highcharts in the scope of the Highcharts axis object
	                    return that.tickPositioner(this, min, max);
	                },
	                gridLineWidth: parsingUtils.normalizeBoolean(this.properties['gridLines.showMajorLines']) ? 1 : 0,
	                setTickPositionsPreHook: _(this.setTickPositionsPreHook).bind(this),
	                setTickPositionsPostHook: _(this.setTickPositionsPostHook).bind(this)
	            });

	            return config;
	        },

	        getVerticalConfig: function() {
	            var config = Axis.prototype.getVerticalConfig.call(this);
	            return $.extend(true, config, {
	                labels: {
	                    align: 'right',
	                    x: -7
	                }
	            });
	        },

	        getHorizontalConfig: function() {
	            var config = Axis.prototype.getHorizontalConfig.call(this);
	            var minRange;
	            if(this.isiOS && this.hasTickmarksBetween() && this.originalCategories.length > 1){
	                minRange = 1;
	            }
	            return $.extend(true, config, {
	                labels: {
	                    align: 'center'
	                },
	                endOnTick: !this.hasTickmarksBetween(),
	                showLastLabel: false,
	                startOnTick: true,
	                minRange: minRange || -1
	            });
	        },

	        processCategories: function(categories) {
	            this.originalCategories = categories;
	            return categories.slice(0);
	        },

	        getCategories: function() {
	            return this.properties['axis.categories'];
	        },

	        getPreviousCategories: function() {
	            return this.previousCategories || [];
	        },

	        categoriesAreDirty: function() {
	            return this._categoriesAreDirty;
	        },

	        setCategories: function(categories) {
	            this.previousCategories = this.properties['axis.categories'];
	            this.properties['axis.categories'] = this.processCategories(categories);

	            if(!_.isEqual(this.properties['axis.categories'], this.previousCategories)) {
	                this._categoriesAreDirty = true;
	            }
	        },

	        redraw: function(redrawChart) {
	            Axis.prototype.redraw.apply(this, arguments);
	            
	            if(this.categoriesAreDirty()) {
	                this.hcAxis.setCategories(this.properties['axis.categories'].slice(0), redrawChart);
	            }  

	            if(this.isiOS && this.hasTickmarksBetween()) {
	                var axisConfig = this.getConfig();
	                this.hcAxis['minRange'] = axisConfig['minRange'];
	            }
	        },

	        onChartLoadOrRedraw: function() {
	            Axis.prototype.onChartLoadOrRedraw.apply(this, arguments);
	            this._categoriesAreDirty = false;
	        },

	        /**
	         * @author sfishel
	         *
	         * Do some intelligent manipulation of axis label step and ellipsization of axis labels (if needed)
	         * before the getOffset routine runs.
	         */

	        getOffsetPreHook: function(axis) {
	            // super
	            Axis.prototype.getOffsetPreHook.call(this, axis);

	            var options = axis.options,
	                chart = axis.chart;

	            if(!options.labels.enabled) {
	                return;
	            }

	            var maxWidth, tickSpacing, minLabelSpacing, labelStep, labelSpacing,
	                formatter = new Formatter(chart.renderer),
	                extremes = axis.getExtremes(),
	                extremesMin = Math.round(extremes.min),
	                extremesMax = Math.round(extremes.max),
	                numCategories = extremesMax - extremesMin + (this.hasTickmarksBetween() ? 1 : 0),
	                categories = this.originalCategories.slice(extremesMin, extremesMin + numCategories),
	                labelLineHeight, i;
	            
	            if(this.isVertical) {
	                maxWidth = Math.floor(chart.chartWidth / 6);

	                // Returns a dictionary with new labels as well as font info
	                var labelAdjustments = formatter.adjustLabels(categories, maxWidth, this.MIN_FONT_SIZE, this.DEFAULT_FONT_SIZE, 'middle');

	                for(i = 0; i < labelAdjustments.labels.length; i++) {
	                    options.categories[i] = labelAdjustments.labels[i];
	                }

	                options.labels.style['font-size'] = labelAdjustments.fontSize + 'px';
	                labelLineHeight = formatter.predictTextHeight('Test', labelAdjustments.fontSize);
	                var axisHeight = chart.plotHeight;

	                tickSpacing = axisHeight / (categories.length || 1);
	                minLabelSpacing = 25;
	                labelStep = this.skipLabelsToAvoidCollisions ? Math.ceil(minLabelSpacing / tickSpacing) : 1;
	                
	                // This centers the lables a bit better in all cases.
	                // The 3 is essentially determined by trial and error
	                options.labels.y = labelLineHeight / 3;
	                options.labels.x = - options.tickLength;
	                
	                options.labels.step = labelStep;
	            }
	            else {
	                var fontSize,
	                    tickLabelPadding = 4,
	                    labelSpacingUpperBound = 100,
	                    axisWidth = chart.plotWidth,
	                    maxWidths = formatter.getMaxWidthForFontRange(categories, this.MIN_FONT_SIZE, this.DEFAULT_FONT_SIZE),
	                    xDelta = 0, 
	                    yDelta = 0;

	                tickSpacing = axisWidth / (numCategories || 1);

	                // Check the width of the longest label for each font
	                // take the largest font size that will make that width less than the tick spacing if possible
	                // will return the largest font size that fits in the tick spacing, or zero if none fit
	                var subTickSpacingFont = this.findBestFontForSpacing(maxWidths, tickSpacing - 2 * tickLabelPadding);
	                if(subTickSpacingFont > 0 && this.labelRotation === 0) {
	                    fontSize = subTickSpacingFont;
	                    labelStep = 1;
	                    labelSpacing = tickSpacing;
	                    maxWidth = labelSpacing;
	                }
	                // Otherwise use the width for smallest font size as minLabelSpacing, with the upper bound
	                else {
	                    minLabelSpacing = Math.min(maxWidths[this.MIN_FONT_SIZE] + 2 * tickLabelPadding, labelSpacingUpperBound);
	                    fontSize = this.MIN_FONT_SIZE;
	                    labelStep = this.skipLabelsToAvoidCollisions ? Math.ceil(minLabelSpacing / tickSpacing) : 1;
	                    labelSpacing = tickSpacing * labelStep;
	                    
	                    var yAxisLeft = chart.yAxis[0].left,
	                        deg2rad = Math.PI * 2 / 360, 
	                        rad = this.labelRotation * deg2rad,
	                        cosRad = Math.abs(Math.cos(rad)),
	                        tickLabelSpacing = labelSpacing - (2 * tickLabelPadding),
	                        maxLabelHeight, maxLabelWidth;

	                    switch(this.labelRotation)
	                    {
	                    case 0:
	                        //label length constricted to space between tickmarks as there is no rotation
	                        maxWidth = tickLabelSpacing;
	                        break;
	                    case -45:
	                        maxWidth = [];
	                        maxLabelHeight = ((chart.chartHeight / 2) / Math.abs(Math.sin(rad)));
	                        for(i = 0; i < numCategories; i++){
	                            //how far each label has from the leftmost edge of the chart before overflowing
	                            maxLabelWidth = (tickSpacing * (i + 1)) / cosRad;
	                            //leftmost label only has space to the left of the chart to fill
	                            if(i === 0){
	                                maxLabelWidth = Math.min(chart.xAxis[0].left, maxLabelWidth);
	                            }
	                            //how far each label has from the bottom edge of the chart before overflowing
	                            //note: permitted margin below x-axis is capped at half of chart height so that chart is still visible
	                            //ellipsize to smallest of maxLabelWidth or maxLabelHeight to prevent cut-off on both left and bottom of panel
	                            if(this.ellipsize){
	                                //if user wants to ellipsize label, then use space between ticks as label length if smallest
	                                maxWidth[i] = Math.min(maxLabelWidth, maxLabelHeight, tickLabelSpacing); 
	                            }else{
	                                maxWidth[i] = Math.min(maxLabelWidth, maxLabelHeight); 
	                            }
	                        }
	                        break;
	                    case 45:
	                        maxWidth = [];
	                        maxLabelHeight = (chart.chartHeight / 2) / Math.abs(Math.sin(rad)); 
	                        for(i = 0; i < numCategories; i++){
	                            maxLabelWidth = (tickSpacing * (i + 1)) /cosRad;
	                            if(this.ellipsize){
	                                maxWidth[numCategories - i - 1] = Math.min(maxLabelWidth, maxLabelHeight, tickLabelSpacing);
	                            }else{
	                                maxWidth[numCategories - i - 1] = Math.min(maxLabelWidth, maxLabelHeight);
	                            }
	                        }
	                        break;
	                    default: // this.labelRotation === -90 || 90
	                        // label length is capped at half of chart height, so that chart is still visible
	                        if(this.ellipsize){
	                            maxWidth = Math.min(chart.chartHeight / 2, tickLabelSpacing);
	                        }else{
	                            maxWidth = chart.chartHeight / 2;
	                        }
	                        break; 
	                    }
	                }
	                this.ellipsizeLabels(categories, formatter, maxWidth, fontSize);
	                _(categories).each(function(category, i) {
	                    options.categories[extremesMin + i] = category;
	                });
	                options.labels.style['font-size'] = fontSize + 'px';

	                labelLineHeight = formatter.predictTextHeight('Test', fontSize);

	                if (this.labelRotation === -45) {
	                    options.labels.align = 'right';
	                    xDelta = 0;
	                    yDelta = labelLineHeight / 4 + options.tickLength;
	                } 
	                else if (this.labelRotation === 45) {
	                    options.labels.align = 'left';
	                    xDelta = 0;
	                    yDelta = labelLineHeight / 4 + options.tickLength;
	                } 
	                else if (this.labelRotation === -90) {
	                    options.labels.align = 'right';
	                    xDelta = labelLineHeight / 4 ;
	                    yDelta = options.tickLength;
	                } 
	                else if (this.labelRotation === 90) {
	                    options.labels.align = 'left';
	                    xDelta = - labelLineHeight / 4 ;
	                    yDelta = options.tickLength;
	                } 
	                else {
	                    options.labels.align = 'center';
	                    xDelta = 0;
	                    // Division by 2 is trial and error, adding tick lenghth keeps
	                    // the labels at the end of the tick
	                    yDelta = labelLineHeight / 2 + options.tickLength;
	                }

	                // If the labels are on the tick mark we add a little more padding
	                if (!this.hasTickmarksBetween()){
	                    yDelta = yDelta + 6;
	                }
	                options.labels.step = labelStep;

	                options.labels.x = xDelta;
	                options.labels.y = yDelta;
	            }
	            formatter.destroy();
	        },

	        findBestFontForSpacing: function(fontWidths, spacing) {
	            var bestFontSize = 0;
	            _(fontWidths).each(function(width, fontSize) {
	                if(width <= spacing) {
	                    bestFontSize = Math.max(bestFontSize, parseInt(fontSize, 10));
	                }
	            });
	            return bestFontSize;
	        },

	        ellipsizeLabels: function(categories, formatter, maxWidth, fontSize) {
	            var i,
	                adjustedLabels = _(categories).map(function(label, j) {
	                    return formatter.ellipsize(label, _.isArray(maxWidth) ? maxWidth[j] : maxWidth, fontSize, {}, 'middle');
	                });

	            for(i = 0; i < adjustedLabels.length; i++) {
	                categories[i] = adjustedLabels[i];
	            }
	        },

	        setTickPositionsPreHook: function(axis) {
	            if(!this.hasTickmarksBetween()) {
	                // this will make sure Highcharts renders space for the last label
	                axis.options.max = this.properties['axis.categories'].length;
	            }
	        },

	        tickPositioner: function(axis, min, max) {
	            if(this.shouldHideTicks(axis)) {
	                // SPL-80164, return a small array with the correct extremes to avoid a Highcharts "too many ticks" error
	                // per SPL-80436, we can't return an empty array here, the tick positions will be emptied in setTickPositionsPostHook
	                return [min, max];
	            }
	            // returning null instructs Highcharts to use its default tick positioning routine
	            return null;
	        },

	        setTickPositionsPostHook: function(axis, secondPass) {
	            if(this.shouldHideTicks(axis)) {
	                axis.tickPositions = [];
	            }
	            // Prevent Highcharts' adjustForMinRange from creating floating point axis min and max
	            // when attempting to zoom into 1 column on iOS
	            if(this.isiOS && this.hasTickmarksBetween() && this.originalCategories.length > 1){
	                axis.min = Math.round(axis.min);
	                axis.max = Math.round(axis.max);
	            }
	        },

	        shouldHideTicks: function(axis) {
	            var threshold = this.isVertical ? 15 : 20,
	                extremes = axis.getExtremes(),
	                numCategories = extremes.max - extremes.min + (this.hasTickmarksBetween() ? 1 : 0),
	                pixelsPerCategory = axis.len / numCategories;

	            return (pixelsPerCategory < threshold);
	        },

	        /**
	         * @author sfishel
	         *
	         * Do a custom enforcement of the label step by removing ticks that don't have a label
	         */

	        tickRenderPostHook: function(tick, index, old, opacity) {
	            var axisOptions = tick.axis.options;
	            axisOptions.labels = axisOptions.labels || {};
	            if(!axisOptions.labels.enabled || axisOptions.tickWidth === 0) {
	                return;
	            }
	            Axis.prototype.tickRenderPostHook.call(this, tick, index, old, opacity);
	            var adjustedPosition = tick.pos + (this.hasTickmarksBetween() ? 1 : 0);
	            var labelStep = axisOptions.labels.step || 1;

	            if(adjustedPosition % labelStep !== 0) {
	                tick.mark.hide();
	            }
	            else {
	                tick.mark.show();
	            }
	        },

	        formatValue: function(value) {
	            return value;
	        },

	        formatLabel: function(info) {
	            return parsingUtils.escapeSVG(info);
	        },

	        hasTickmarksBetween: function() {
	            return (this.properties['axisLabels.tickmarkPlacement'] === 'between');
	        },

	        getTickLabelExtremesY: function(tick) {
	            return [-tick.labelBBox.height, 0];
	        }

	    });

	    return CategoryAxis;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/util/time_utils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("require/underscore"), __webpack_require__("util/time"), __webpack_require__("stubs/i18n")], __WEBPACK_AMD_DEFINE_RESULT__ = function(_, splunkTimeUtils, i18n) {

	    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	    // TimeUtils

	    
	    var TimeUtils = {

	        SECS_PER_MIN: 60,
	        SECS_PER_HOUR: 60 * 60,

	        convertTimeToCategories: function(timeData, numLabelCutoff) {
	            // debugging
	            // un-commenting this will print the time series to console in a way that can be copy-pasted to a unit test
	            // console.log('[\n' + JSON.stringify(timeData).replace(/\[|\]/g, '').split(',').join(',\n') + '\n]');

	            var i, labelIndex, prettyLabelInfo, prettyLabels, prettyLabel, labelIndexes,
	                // find the indexes (a list of numbers) where the labels should go
	                rawLabels    = [],
	                categories   = [];


	            labelIndexes = this.findLabelIndexes(timeData, numLabelCutoff);

	            // based on the label indexes, look up the raw labels from the original list
	            _(labelIndexes).each(function(i){
	                rawLabels.push(timeData[i]);
	            });

	            prettyLabelInfo = this.getPrettyLabelInfo(rawLabels);
	            prettyLabels    = prettyLabelInfo.prettyLabels;

	            // now assemble the full category list to return
	            // start with a list of all blanks
	            _(timeData).each(function(i){ categories.push(' ');});

	            // then put the pretty labels in the right places
	            _(labelIndexes).each(function(labelIndex,j){
	                categories[labelIndex] = prettyLabels[j];
	            });

	            return ({
	                categories: categories,
	                rawLabels: rawLabels,
	                granularity: prettyLabelInfo.granularity
	            });
	        },

	        findLabelIndexes: function(timeData, numLabelCutoff) {
	            var i, labelIndex, indexes = [];

	            // if there are less data points than the cutoff, should label all points
	            if(timeData.length <= numLabelCutoff) {
	                i=0;
	                while(i<timeData.length){
	                    indexes.push(i++);
	                }
	                return indexes;
	            }

	            var pointSpan = this.getPointSpan(timeData),
	                totalSpan = this.getTotalSpan(timeData);

	            if(this.couldLabelFirstOfMonth(pointSpan, totalSpan)) {
	                var firstIndexes = this.findFirstOfMonthIndexes(timeData);
	                var indexLen = firstIndexes.length;
	                if(indexLen >= 3){
	                    var step = Math.ceil(indexLen / numLabelCutoff),
	                        newIndexes = [];
	                    for(i = 0; i < indexLen; i += step) {
	                        labelIndex = firstIndexes[i];
	                        newIndexes.push(labelIndex);
	                    }
	                    firstIndexes = newIndexes;
	                    return firstIndexes;
	                }

	             }

	            // find major unit (in number of points, not time)
	            var majorUnit       = this.findMajorUnit(timeData, numLabelCutoff, pointSpan, totalSpan),
	                firstMajorSlice = timeData.slice(0, majorUnit),
	                roundestIndex   = this.getRoundestIndex(firstMajorSlice, majorUnit, pointSpan),
	                index           = roundestIndex;

	            if(this.couldLabelMidnight(majorUnit, pointSpan)){
	                var midnightIndexes = this.findMidnightIndexes(timeData);
	                if(midnightIndexes.length > numLabelCutoff){
	                    step = Math.ceil(midnightIndexes.length / numLabelCutoff);
	                    newIndexes = [];
	                    for(i = 0; i < midnightIndexes.length; i += step) {
	                        labelIndex = midnightIndexes[i];
	                        newIndexes.push(labelIndex);
	                    }
	                    midnightIndexes = newIndexes;
	                }
	                return midnightIndexes;
	            }

	            if (majorUnit <= 0) {
	                // This really shouldn't happen, but better to throw an error than go into an infinite loop.
	                throw new Error(
	                    'Error parsing timestamp information: Major unit is not a positive number.  This should not happen.'
	                );
	            }
	            while(index < timeData.length) {
	                indexes.push(index);
	                index += majorUnit;
	            }
	            return indexes;
	        },

	        couldLabelMidnight: function(majorUnit, pointSpan){
	            return ((majorUnit % 24 === 0) && (pointSpan === 60*60));
	        },

	        couldLabelFirstOfMonth: function(pointSpan, totalSpan) {
	            if(pointSpan > this.MAX_SECS_PER_DAY) {
	                return false;
	            }
	            if(pointSpan < this.SECS_PER_HOUR) {
	                return false;
	            }
	            // prevent a user-defined span like 4003 seconds from derailing things
	            if(pointSpan < this.MIN_SECS_PER_DAY && (24 * this.SECS_PER_HOUR) % pointSpan !== 0) {
	                return false;
	            }
	            if(totalSpan < 2 * this.MIN_SECS_PER_MONTH) {
	                return false;
	            }
	            return true;
	        },

	        findMidnightIndexes: function(timeData){
	            var i, bdTime,
	                bdTimes = [],
	                midnightIndexes = [];
	                for(i = 0; i < timeData.length; i++) {
	                    bdTimes.push(splunkTimeUtils.extractBdTime(timeData[i]));
	                }
	                for(i = 0; i < bdTimes.length; i++) {
	                    bdTime = bdTimes[i];
	                    if((bdTime.hour === 0) && (bdTime.minute === 0)) {
	                        midnightIndexes.push(i);
	                    }
	                }
	                return midnightIndexes;
	        },

	        findFirstOfMonthIndexes: function(timeData) {
	            var bdTimes = [],
	                firstIndexes = [];

	            _(timeData).each(function(dataPoint, i){
	                bdTimes.push(splunkTimeUtils.extractBdTime(dataPoint));
	            });
	            _(bdTimes).each(function(bdTime, i){
	                if(bdTime.day === 1 && bdTime.hour === 0){
	                    firstIndexes.push(i);
	                }
	            });
	            return firstIndexes;
	        },

	        // Always returns a positive number, even if timeData is in reverse order.
	        getPointSpan: function(timeData) {
	            if(timeData.length < 2) {
	                return 0.001;
	            }
	            if(timeData.length < 4) {
	                return Math.abs(this.getSpanBetween(timeData[0], timeData[1]));
	            }
	            var firstSpan  = Math.abs(this.getSpanBetween(timeData[0], timeData[1])),
	                secondSpan = Math.abs(this.getSpanBetween(timeData[1], timeData[2])),
	                thirdSpan  = Math.abs(this.getSpanBetween(timeData[2], timeData[3]));

	            // sample the three spans to avoid the case where daylight savings might produce an erroneous result
	            if(firstSpan === secondSpan) {
	                return firstSpan;
	            }
	            if(secondSpan === thirdSpan) {
	                return secondSpan;
	            }
	            if(firstSpan === thirdSpan) {
	                return firstSpan;
	            }
	            return firstSpan;
	        },

	        // Always returns a positive number, even if timeData is in reverse order.
	        getTotalSpan: function(timeData) {
	            var i, lastPoint;
	            for(i = timeData.length - 1; i >= 0; i--) {
	                lastPoint = timeData[i];
	                if(splunkTimeUtils.isValidIsoTime(lastPoint)) {
	                    break;
	                }
	            }
	            return Math.abs(this.getSpanBetween(timeData[0], lastPoint));
	        },

	        getSpanBetween: function(start, end) {
	            var startDate  = splunkTimeUtils.isoToDateObject(start),
	                endDate    = splunkTimeUtils.isoToDateObject(end),
	                millisDiff = endDate.getTime() - startDate.getTime();

	            return millisDiff / 1000;
	        },

	        // use a 23-hour day as a minimum to protect against daylight savings errors
	        MIN_SECS_PER_DAY: 23 * 60 * 60,
	        // use a 25-hour day as a maximum to protect against daylight savings errors
	        MAX_SECS_PER_DAY: 25 * 60 * 60,

	        MAJOR_UNITS_MILLISECONDS: [
	            1 / 1000,
	            2 / 1000,
	            5 / 1000,
	            10 / 1000,
	            20 / 1000,
	            50 / 1000,
	            100 / 1000,
	            200 / 1000,
	            250 / 1000,
	            500 / 1000,
	            1
	        ],

	        MAJOR_UNITS_SECONDS: [
	            1,
	            2,
	            5,
	            10,
	            15,
	            30,
	            60,
	            2 * 60,
	            3 * 60,
	            5 * 60,
	            10 * 60,
	            15 * 60,
	            30 * 60,
	            60 * 60,
	            2 * 60 * 60,
	            4 * 60 * 60,
	            6 * 60 * 60,
	            12 * 60 * 60,
	            24 * 60 * 60,
	            48 * 60 * 60,
	            96 * 60 * 60,
	            168 * 60 * 60
	        ],

	        MAJOR_UNIT_DAYS: [
	            1,
	            2,
	            4,
	            7,
	            14,
	            28,
	            56,
	            112,
	            224,
	            364,
	            476,
	            728
	        ],

	        // this is ok because daylight savings is never in February
	        MIN_SECS_PER_MONTH: 28 * 24 * 60 * 60,

	        MAJOR_UNIT_MONTHS: [
	            1,
	            2,
	            4,
	            6,
	            12,
	            24,
	            48,
	            96
	        ],

	        findMajorUnit: function(timeData, numLabelCutoff, pointSpan, totalSpan) {
	            var i, majorUnit, unitsPerSpan;
	            if(pointSpan < 1) {
	                for(i = 0; i < this.MAJOR_UNITS_MILLISECONDS.length; i++) {
	                    majorUnit = this.MAJOR_UNITS_MILLISECONDS[i];
	                    unitsPerSpan = totalSpan / majorUnit;
	                    if(unitsPerSpan <= numLabelCutoff) {
	                        return majorUnit / pointSpan;
	                    }
	                }
	            } else if(pointSpan < this.MIN_SECS_PER_DAY) {
	                for(i = 0; i < this.MAJOR_UNITS_SECONDS.length; i++) {
	                    majorUnit = this.MAJOR_UNITS_SECONDS[i];
	                    unitsPerSpan = totalSpan / majorUnit;
	                    if((unitsPerSpan >= 3) && (unitsPerSpan <= numLabelCutoff) && (majorUnit % pointSpan === 0)) {
	                        // SPL-55264, 3 minutes is included in the major units list to prevent this loop from failing to find
	                        // a major unit at all, but if 5 minutes would fit it is preferred over 3 minutes
	                        if(majorUnit === 3 * 60 && totalSpan >= 15 * 60) {
	                            continue;
	                        }
	                        return majorUnit / pointSpan;
	                    }
	                }
	            }
	            else if(pointSpan < this.MIN_SECS_PER_MONTH) {
	                var secsPerDay = 24 * 60 * 60,
	                    dayPointSpan = Math.round(pointSpan / secsPerDay),
	                    dayTotalSpan = Math.round(totalSpan / secsPerDay);

	                for(i = 0; i < this.MAJOR_UNIT_DAYS.length; i++) {
	                    majorUnit = this.MAJOR_UNIT_DAYS[i];
	                    unitsPerSpan = dayTotalSpan / majorUnit;
	                    if((unitsPerSpan >= 3) && (unitsPerSpan <= numLabelCutoff) && (majorUnit % dayPointSpan === 0)) {
	                        return majorUnit / dayPointSpan;
	                    }
	                }
	            }
	            else {
	                var secsPerMonth = 30 * 24 * 60 * 60,
	                    monthPointSpan = Math.round(pointSpan / secsPerMonth),
	                    monthTotalSpan = Math.round(totalSpan / secsPerMonth);

	                for(i = 0; i < this.MAJOR_UNIT_MONTHS.length; i++) {
	                    majorUnit = this.MAJOR_UNIT_MONTHS[i];
	                    unitsPerSpan = monthTotalSpan / majorUnit;
	                    if((unitsPerSpan >= 3) && (unitsPerSpan <= numLabelCutoff) && (majorUnit % monthPointSpan === 0)) {
	                        return majorUnit / monthPointSpan;
	                    }
	                }
	            }
	            // if we exit the loop without finding a major unit, we just punt and divide the points evenly
	            return Math.ceil(timeData.length / numLabelCutoff);
	        },

	        getRoundestIndex: function(timeData, majorUnit, pointSpan) {
	            var i, roundest, roundestIndex,
	                bdTimes = [],
	                secsMajorUnit = majorUnit * pointSpan;

	            _(timeData).each(function(label){
	                bdTimes.push(splunkTimeUtils.extractBdTime(label));
	            });

	            roundest = bdTimes[0];
	            roundestIndex = 0;
	            for(i = 1; i < bdTimes.length; i++) {
	                if(this.isRounderThan(bdTimes[i], roundest, pointSpan) && this.bdTimeMatchesUnit(bdTimes[i], secsMajorUnit)) {
	                    roundest = bdTimes[i];
	                    roundestIndex = i;
	                }
	            }
	            return roundestIndex;
	        },

	        isRounderThan: function(first, second, pointSpan) {
	            if(first.month === 1 && first.day === 1 && first.hour === 0
	                    && second.month !== 1 && second.day === 1 && second.hour === 0) {
	                return true;
	            }

	            if(first.hour === 0 && second.hour !== 0) {
	                return true;
	            }
	            if(first.hour % 12 === 0 && second.hour % 12 !== 0) {
	                return true;
	            }
	            if(first.hour % 6 === 0 && second.hour % 6 !== 0) {
	                return true;
	            }
	            if(first.hour % 4 === 0 && second.hour % 4 !== 0) {
	                return true;
	            }
	            if(first.hour % 2 === 0 && second.hour % 2 !== 0) {
	                return true;
	            }

	            if(first.minute === 0 && second.minute !== 0) {
	                return true;
	            }
	            if(first.minute % 30 === 0 && second.minute % 30 !== 0) {
	                return true;
	            }
	            if(first.minute % 15 === 0 && second.minute % 15 !== 0) {
	                return true;
	            }
	            if(first.minute % 10 === 0 && second.minute % 10 !== 0) {
	                return true;
	            }
	            if(first.minute % 5 === 0 && second.minute % 5 !== 0) {
	                return true;
	            }
	            if(first.minute % 2 === 0 && second.minute % 2 !== 0) {
	                return true;
	            }

	            if(first.second === 0 && second.second !== 0) {
	                return true;
	            }
	            if(first.second % 30 === 0 && second.second % 30 !== 0) {
	                return true;
	            }
	            if(first.second % 15 === 0 && second.second % 15 !== 0) {
	                return true;
	            }
	            if(first.second % 10 === 0 && second.second % 10 !== 0) {
	                return true;
	            }
	            if(first.second % 5 === 0 && second.second % 5 !== 0) {
	                return true;
	            }
	            if(first.second % 2 === 0 && second.second % 2 !== 0) {
	                return true;
	            }
	            if(first.millisecond % 500 === 0 && second.millisecond % 500 !== 0) {
	                return true;
	            }
	            if(first.millisecond % 250 === 0 && second.millisecond % 250 !== 0) {
	                return true;
	            }
	            if(first.millisecond % 100 === 0 && second.millisecond % 100 !== 0) {
	                return true;
	            }
	            if(first.millisecond % 50 === 0 && second.millisecond % 50 !== 0) {
	                return true;
	            }
	            if(first.millisecond % 50 === 0 && second.millisecond % 50 !== 0) {
	                return true;
	            }
	            if(first.millisecond % 25 === 0 && second.millisecond % 25 !== 0) {
	                return true;
	            }
	            if(first.millisecond % 10 === 0 && second.millisecond % 10 !== 0) {
	                return true;
	            }
	            if(first.millisecond % 5 === 0 && second.millisecond % 5 !== 0) {
	                return true;
	            }
	            if(first.millisecond % 2 === 0 && second.millisecond % 2 !== 0) {
	                return true;
	            }
	            return false;
	        },

	        bdTimeMatchesUnit: function(bdTime, secsMajor) {
	            if(secsMajor < 1) {
	                return (bdTime.millisecond % (secsMajor * 1000) === 0);
	            }
	            if(secsMajor < 60) {
	                return (bdTime.second % secsMajor === 0);
	            }
	            if(secsMajor < 60 * 60) {
	                var minutes = Math.floor(secsMajor / 60);
	                return (bdTime.minute % minutes === 0);
	            }
	            else {
	                var hours = Math.floor(secsMajor / (60 * 60));
	                return (bdTime.hour % hours === 0);
	            }
	            return true;
	        },

	        getPrettyLabelInfo: function(rawLabels) {
	            var i, prettyLabel,
	                bdTimes = [],
	                prettyLabels = [];

	            _(rawLabels).each(function(label){
	                bdTimes.push(splunkTimeUtils.extractBdTime(label));
	            });
	            var granularity = splunkTimeUtils.determineLabelGranularity(bdTimes);
	            for(i = 0; i < bdTimes.length; i++) {
	                if(i === 0) {
	                    prettyLabel = this.formatBdTimeAsAxisLabel(bdTimes[i], null, granularity);
	                }
	                else {
	                    prettyLabel = this.formatBdTimeAsAxisLabel(bdTimes[i], bdTimes[i - 1], granularity);
	                }

	                if(prettyLabel) {
	                    prettyLabels.push(prettyLabel.join('<br/>'));
	                }
	                else {
	                    prettyLabels.push("");
	                }
	            }

	            return {
	                prettyLabels: prettyLabels,
	                granularity: granularity
	            };
	        },

	        formatBdTimeAsAxisLabel: function(time, prevBdTime, granularity) {
	            if(time.isInvalid) {
	                return null;
	            }
	            var dateTime     = splunkTimeUtils.bdTimeToDateObject(time),
	                showDay      = (granularity in { 'millisecond': true, 'second': true, 'minute': true, 'hour': true, 'day': true }),
	                showTimes    = (granularity in { 'millisecond': true, 'second': true, 'minute': true, 'hour': true}),
	                showSeconds  = (granularity in { 'millisecond': true, 'second': true }),
	                showMillis   = (granularity === 'millisecond'),
	                timeFormat   = (showSeconds) ? 'medium' : 'short',
	                dateFormat   = (showDay) ? 'ccc MMM d' : 'MMMM',

	                formatTime = function(dt, format) {
	                    if(showMillis) {
	                        return i18n.format_time_microseconds(dt, format);
	                    }
	                    return i18n.format_time(dt, format);
	                };

	            if(granularity === 'year') {
	                return [i18n.format_date(dateTime, 'YYYY')];
	            }
	            if(prevBdTime && prevBdTime.year === time.year && time.month === prevBdTime.month && time.day === prevBdTime.day) {
	                return [formatTime(dateTime, timeFormat)];
	            }
	            var formattedPieces =  (showTimes) ?
	                [formatTime(dateTime, timeFormat), i18n.format_date(dateTime, dateFormat)] :
	                [i18n.format_date(dateTime, dateFormat)];

	            if(!prevBdTime || time.year !== prevBdTime.year) {
	                formattedPieces.push(i18n.format_date(dateTime, 'YYYY'));
	            }
	            return formattedPieces;
	        },

	        // returns null if string cannot be parsed
	        formatIsoStringAsTooltip: function(isoString, pointSpan) {
	            var bdTime = splunkTimeUtils.extractBdTime(isoString),
	                dateObject;

	            if(bdTime.isInvalid) {
	                return null;
	            }
	            dateObject = splunkTimeUtils.bdTimeToDateObject(bdTime);

	            if(pointSpan >= this.MIN_SECS_PER_DAY) { // day or larger
	                return i18n.format_date(dateObject);
	            }
	            if(pointSpan >= this.SECS_PER_MIN) { // minute or longer
	                return i18n.format_datetime(dateObject, 'medium', 'short');
	            }
	            if(pointSpan >= 1) { // second or longer
	                return i18n.format_datetime(dateObject);
	            }
	            return i18n.format_datetime_microseconds(dateObject, 'medium');
	        }
	    };

		return TimeUtils;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "js_charting/components/axes/NumericAxis":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/components/axes/Axis"),
	            __webpack_require__("js_charting/helpers/Formatter"),
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/math_utils"),
	            __webpack_require__("stubs/i18n")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Axis,
	            Formatter,
	            parsingUtils,
	            langUtils,
	            mathUtils,
	            i18n
	        ) {

	    var NumericAxis = function(properties) {
	        Axis.call(this, properties);
	        // SPL-72638, always include zero if the axis has log scale
	        this.includeZero = this.determineIncludeZero();
	        this.hasExplicitMin = this.validateNumericProperty("axis.minimumNumber");
	        this.hasExplicitMax = this.validateNumericProperty("axis.maximumNumber");
	        this.hasExplicitMajorUnit = this.validateNumericProperty("axisLabels.majorUnit");
	    };

	    langUtils.inherit(NumericAxis, Axis);
	    $.extend(NumericAxis.prototype, {

	        getConfig: function() {
	            var config = Axis.prototype.getConfig.call(this),
	                extendAxisRange = parsingUtils.normalizeBoolean(this.properties['axisLabels.extendsAxisRange'], true),
	                showMinorTicks = this.properties['axisLabels.minorTickVisibility'] === 'show',
	                showMinorGridLines = parsingUtils.normalizeBoolean(this.properties['gridLines.showMinorLines']);

	            $.extend(true, config, {
	                tickInterval: (this.properties['isEmpty'] && (this.properties['axis.scale']  ==='log')) ? 10:
	                    this.properties['isEmpty'] ? 10 :
	                        parseFloat(this.properties['axisLabels.majorUnit']) || null,
	                endOnTick: extendAxisRange,
	                startOnTick: extendAxisRange,
	                tickWidth: (this.properties['axisLabels.majorTickVisibility'] === 'show') ? 1 : 0 ,

	                allowDecimals: !parsingUtils.normalizeBoolean(this.properties['axisLabels.integerUnits']),

	                minorTickColor: this.properties['axis.foregroundColorSoft'],
	                minorTickLength: parseInt(this.properties['axisLabels.minorTickSize'], 10) || 10,
	                minorTickInterval: (showMinorTicks || showMinorGridLines) ? 'auto' : null,
	                minorTickWidth: showMinorTicks ? 1 : 0,
	                minorGridLineWidth: showMinorGridLines ? 1 : 0,
	                //FIXME: clear min/max up so that reader can understand why we check for 'isEmpty'
	                min: this.properties['isEmpty'] ? 0 : null,
	                max: (this.properties['isEmpty'] && (this.properties['axis.scale']  ==='log')) ? 2 : this.properties['isEmpty'] ? 100 : null,
	                gridLineWidth: parsingUtils.normalizeBoolean(this.properties['gridLines.showMajorLines'], true) ? 1 : 0,
	                getSeriesExtremesPostHook: _(this.getSeriesExtremesPostHook).bind(this),
	                setTickPositionsPreHook: _(this.setTickPositionsPreHook).bind(this),
	                labels: {
	                    maxStaggerLines: 1
	                },
	                lineWidth: (this.properties['axisLabels.axisVisibility'] === 'show') ? 1 : 0
	            });
	            
	            this.addMinAndMaxToConfig(config);
	            return config;
	        },

	        validateNumericProperty: function(propName) {
	            var value = this.properties[propName];
	            // Zero is the only falsy value that is a valid numeric property value, so get that out of the way.
	            if(value === 0) {
	                return true;
	            }
	            return !!value && !_.isNaN(parseFloat(value));
	        },

	        addMinAndMaxToConfig: function(config) {
	            var min = this.hasExplicitMin ? parseFloat(this.properties['axis.minimumNumber']) : -Infinity,
	                max = this.hasExplicitMax ? parseFloat(this.properties['axis.maximumNumber']) :  Infinity;

	            if(min > max) {
	                var temp = min;
	                min = max;
	                max = temp;
	            }
	            if(min > -Infinity) {
	                this.addMinToConfig(config, min, this.includeZero);
	            }
	            if(max < Infinity) {
	                this.addMaxToConfig(config, max, this.includeZero);
	            }
	        },

	        addMinToConfig: function(config, min, includeZero) {
	            if(includeZero && min > 0) {
	                min = 0;
	            }
	            else if(this.isLogScale()) {
	                min = mathUtils.absLogBaseTen(min);
	            }
	            config.min = min;
	            config.minPadding = 0;
	            config.startOnTick = false;
	        },

	        addMaxToConfig: function(config, max, includeZero) {
	            if(includeZero && max < 0) {
	                max = 0;
	            }
	            else if(this.isLogScale()) {
	                max = mathUtils.absLogBaseTen(max);
	            }
	            config.max = max;
	            config.maxPadding = 0;
	            config.endOnTick = false;

	        },

	        getVerticalConfig: function() {
	            var config = Axis.prototype.getVerticalConfig.call(this);

	            var tickSizeOffset = parseInt(this.properties['axisLabels.majorTickSize'], 10) || 0;
	            var xDelta = tickSizeOffset + 6;
	            return $.extend(true, config, {
	                labels: {
	                    x: this.properties['opposite'] === true ? xDelta : -xDelta,
	                    y: 4
	                }
	            });
	        },

	        getHorizontalConfig: function() {
	            var config = Axis.prototype.getHorizontalConfig.call(this),
	                tickSizeOffset = parseInt(this.properties['axisLabels.majorTickSize'], 10) || 0,
	                xDelta = null, yDelta = null,
	                alignment; 

	            // NOTE: Deltas are set here based on experimentation,
	            // this code relies on the fact that fontSize for Numeric Axes
	            // does not change. 
	            if(this.labelRotation === -45){
	                alignment = 'right';
	                xDelta = 5;
	                yDelta = 10;
	            }
	            else if(this.labelRotation === -90){
	                alignment = 'right';
	                xDelta = 4; 
	                yDelta = 6;
	            }
	            else if(this.labelRotation === 45){
	                alignment = 'left';
	                xDelta = 0;
	                yDelta = 10;
	            }
	            else if(this.labelRotation === 90){
	                alignment = 'left';
	                xDelta = -4; 
	                yDelta = 6;
	            }
	            else{
	                alignment = 'center';
	                yDelta = 14;
	            }
	            
	            return $.extend(true, config, {
	                labels: {
	                    align: alignment,
	                    x: xDelta,
	                    y: this.properties['opposite'] === true 
	                        ? -6 - tickSizeOffset // Measurements are a little different on the opposite side
	                        : yDelta + tickSizeOffset
	                }
	            });
	        },

	        formatLabel: function(info) {
	            if(this.isLogScale()) {
	                if(this.properties['stackMode'] === 'stacked100'){
	                    return NumericAxis.formatNumber(info.value);
	                }
	                return NumericAxis.formatNumber(mathUtils.absPowerTen(info.value));
	            }
	            return NumericAxis.formatNumber(info.value);
	        },

	        formatValue: function(value) {
	            // handle the edge case where the value is not a valid number but the nullValueMode property has rendered it as a zero
	            var formatted = NumericAxis.formatNumber(value);
	            return (formatted !== 'NaN' ? formatted : i18n.format_decimal('0'));
	        },

	        isLogScale: function() {
	            return (this.properties['axis.scale'] === 'log');
	        },

	        normalizeAxisOptions: function(axis) {
	            var options = axis.options,
	                extremes = axis.getExtremes(),
	                chart = axis.chart;

	            if(!this.properties['isEmpty']){
	                var formatter = new Formatter(chart.renderer);

	                extremes.min = options.min || extremes.dataMin;
	                extremes.max = options.max || extremes.dataMax;
	                var tickInterval,
	                    range = Math.abs(extremes.max - extremes.min);
	                    // if we can't read a tickInterval from the options, estimate it from the tick pixel interval
	                
	                if(this.isVertical) {
	                    tickInterval = options.tickInterval || (options.tickPixelInterval / chart.plotHeight) * range;
	                }
	                else {
	                    tickInterval = options.tickInterval || (options.tickPixelInterval / chart.plotWidth) * range;   
	                }

	                if(this.isLogScale()) {
	                    // SPL-72638, always use tick interval of 1 if the axis has log scale, since we will force the axis to start at zero
	                    options.tickInterval = 1;
	                }
	                else {
	                    this.checkMajorUnitFit(tickInterval, extremes, options, formatter, chart);
	                }

	                if(this.includeZero) {
	                    this.enforceIncludeZero(options, extremes);
	                }
	                else {
	                    this.adjustAxisRange(options, extremes, tickInterval);
	                }

	                if(options.allowDecimals !== false) {
	                    this.enforceIntegerMajorUnit(options, extremes);
	                }
	                formatter.destroy();
	            }
	            else {
	                this.handleNoData(options);
	            }
	        },

	        getSeriesExtremesPostHook: function(axis, secondPass) {
	            this.normalizeAxisOptions(axis);
	        },

	        setTickPositionsPreHook: function(axis, secondPass) {
	            if(secondPass) {
	                this.normalizeAxisOptions(axis);
	            }
	        },

	        checkMajorUnitFit: function(unit, extremes, options, formatter, chart) {
	            var range = Math.abs(extremes.max - extremes.min),
	                axisLength = (this.isVertical) ? chart.plotHeight : chart.plotWidth,
	                tickSpacing = unit * axisLength / range,
	                largestExtreme = Math.max(Math.abs(extremes.min), Math.abs(extremes.max)),
	                tickLabelPadding = (this.isVertical) ? 5 : 15,
	                fontSize = parseInt((options.labels.style.fontSize.split('px'))[0], 10),

	                getTickInterval = function(labelSize) {
	                    return (labelSize * range / axisLength);
	                };

	            if(this.isVertical) {
	                var maxHeight = formatter.predictTextHeight(this.formatValue(largestExtreme), fontSize);
	                if(tickSpacing < (maxHeight + 2 * tickLabelPadding)) {
	                    options.tickInterval = Math.ceil(getTickInterval(maxHeight + 2 * tickLabelPadding));
	                }
	            }
	            else {
	                var maxWidth = formatter.predictTextWidth(this.formatValue(largestExtreme), fontSize) + 2 * tickLabelPadding;
	                if(tickSpacing < maxWidth || (tickSpacing > (2 * maxWidth))) {
	                    var tickInterval = getTickInterval(maxWidth),
	                        magnitude = Math.pow(10, Math.floor(Math.log(tickInterval) / Math.LN10));

	                    options.tickInterval = this.fitTickIntervalToWidth(tickInterval, null, magnitude, options.allowDecimals);
	                }
	            }
	        },

	        determineIncludeZero: function() {
	            if(parsingUtils.normalizeBoolean(this.properties['axis.includeZero'])) {
	                return true;
	            }
	            // SPL-72638, always include zero if the axis has log scale, unless the user has explicitly set a min or max that contradicts
	            if(this.isLogScale()) {
	                var userMin = parseFloat(this.properties["axis.minimumNumber"]),
	                    userMax = parseFloat(this.properties["axis.maximumNumber"]);

	                if((_.isNaN(userMin) || userMin <= 0) && (_.isNaN(userMax) || userMax >= 0)) {
	                    return true;
	                }
	            }
	            return false;
	        },

	        enforceIncludeZero: function(options, extremes) {
	            // if there are no extremes (i.e. no meaningful data was extracted), go with 0 to 100
	            if(!extremes.min && !extremes.max) {
	                this.handleNoData(options);
	                return;
	            }
	            if(extremes.min >= 0) {
	                options.min = 0;
	                options.minPadding = 0;
	            }
	            else if(extremes.max <= 0) {
	                options.max = 0;
	                options.maxPadding = 0;
	            }
	        },

	        // clean up various issues that can arise from the axis extremes
	        adjustAxisRange: function(options, extremes, tickInterval) {
	            // this method will add artificial min/max values that did not come from the user
	            // clear them here so that each run will do the right thing
	            if(!this.hasExplicitMin) {
	                delete options.min;
	            }
	            if(!this.hasExplicitMax) {
	                delete options.max;
	            }
	            // if there are no extremes (i.e. no meaningful data was extracted), go with 0 to 100
	            if(!extremes.dataMin && !extremes.dataMax && !this.hasExplicitMax && !this.hasExplicitMin) {
	                this.handleNoData(options);
	                return;
	            }
	            // if the min or max is such that no data makes it onto the chart, we hard-code some reasonable extremes
	            if(extremes.min > extremes.dataMax && extremes.min > 0 && !this.hasExplicitMax) {
	                options.max = (this.isLogScale()) ? extremes.min + 2 : extremes.min * 2;
	                return;
	            }
	            if(extremes.max < extremes.dataMin && extremes.max < 0 && !this.hasExplicitMin) {
	                options.min = (this.isLogScale()) ? extremes.max - 2 : extremes.max * 2;
	                return;
	            }
	            // if either data extreme within one tick interval of zero,
	            // remove the padding on that side so the axis doesn't extend beyond zero
	            if(extremes.dataMin >= 0 && extremes.dataMin <= tickInterval) {
	                if(!this.hasExplicitMin){
	                    options.min = 0;
	                }
	                options.minPadding = 0;
	            }
	            if(extremes.dataMax <= 0 && extremes.dataMax >= -1 * tickInterval) {
	                if(!this.hasExplicitMax){
	                    options.max = 0;
	                }
	                options.maxPadding = 0;
	            }

	        },

	        handleNoData: function(axisOptions) {
	            var logScale = this.isLogScale();
	            axisOptions.min = 0;
	            axisOptions.max = logScale ? 2 : 100;
	            if(logScale) {
	                axisOptions.tickInterval = 1;
	            }
	        },

	        enforceIntegerMajorUnit: function(options, extremes) {
	            var range = extremes.max - extremes.min;
	            // if the axis range is ten or greater, require that the major unit be an integer
	            if(range >= 10) {
	                options.allowDecimals = false;
	            }
	        },

	        // This is a custom version of Highcharts' normalizeTickInterval method. For some reason, Highcharts
	        // wasn't collapsing axis tick intervals early enough (SPL-72905), so we elected to choose one multiple
	        // higher than what they would have recommended (e.g. choose 5,000,000 instead of 2,500,000).
	        fitTickIntervalToWidth: function(interval, multiples, magnitude, allowDecimals) {
	            var normalized = interval / magnitude;

	            if (!multiples) {
	                multiples = [1, 2, 2.5, 5, 10, 20];
	                // the allowDecimals option
	                if (allowDecimals === false) {
	                    if (magnitude === 1) {
	                        multiples = [1, 2, 5, 10];
	                    } else if (magnitude <= 0.1) {
	                        multiples = [1 / magnitude];
	                    }
	                }
	            }

	            if (multiples.length === 1) {
	                interval = multiples[0];
	            }
	            else {
	                // normalize the interval to the nearest multiple
	                for (var i = 0; i < multiples.length - 1; i++) {
	                    interval = multiples[i];
	                    if (normalized <= (multiples[i] + (multiples[i + 1] || multiples[i])) / 2) {
	                        interval = multiples[i+1];
	                        break;
	                    }
	                }
	            }

	            // multiply back to the correct magnitude
	            interval *= magnitude;
	            if(this.hasExplicitMajorUnit) {
	                return Math.max(mathUtils.parseFloat(this.properties['axisLabels.majorUnit']), interval);
	            }
	            return interval;
	        }

	    });

	    $.extend(NumericAxis, {

	        formatNumber: function(value) {
	            value = mathUtils.parseFloat(value);
	            var absValue = Math.abs(value);
	            if(absValue > 0 && absValue < 0.000001) {
	                return i18n.format_scientific(value, '#.###E0');
	            }
	            // Hackery to avoid floating point errors...
	            // First calculate the decimal precision needed to display the number, then add that many characters after
	            // the decimal point to the number format.  Then add a small number to the value, which will be truncated
	            // by the formatting logic but prevents a round-down due to floating point errors.
	            var precision = mathUtils.getDecimalPrecision(value),
	                numberFormat = '#,##0.';

	            _(precision).times(function() {
	                numberFormat += '#';
	            });
	            value += Math.pow(10, -1 * precision - 1);
	            return i18n.format_decimal(value, numberFormat);
	        }

	    });

	    return NumericAxis;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "js_charting/util/math_utils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("require/underscore"), __webpack_require__("util/math_utils")], __WEBPACK_AMD_DEFINE_RESULT__ = function(_, splunkMathUtils) {

	    var HEX_REGEX = /^( )*(0x|-0x)/;

	    // an extended version of parseFloat that will handle numbers encoded in hex format (i.e. "0xff")
	    // and is stricter than native JavaScript parseFloat for decimal numbers
	    var parseFloat = function(str) {
	        // determine if the string is a hex number by checking if it begins with '0x' or '-0x',
	        // in which case delegate to parseInt with a 16 radix
	        if(HEX_REGEX.test(str)) {
	            return parseInt(str, 16);
	        }
	        return splunkMathUtils.strictParseFloat(str);
	    };

	    // shortcut for base-ten log, also rounds to four decimal points of precision to make pretty numbers
	    var logBaseTen = function(num) {
	        var result = Math.log(num) / Math.LN10;
	        return (Math.round(result * 10000) / 10000);
	    };

	    // transforms numbers to a normalized log scale that can handle negative numbers
	    // rounds to four decimal points of precision
	    var absLogBaseTen = function(num) {
	        if(typeof num !== "number") {
	            num = parseFloat(num);
	        }
	        if(_(num).isNaN()) {
	            return num;
	        }
	        var isNegative = (num < 0),
	            result;

	        if(isNegative) {
	            num = -num;
	        }
	        if(num < 10) {
	            num += (10 - num) / 10;
	        }
	        result = logBaseTen(num);
	        return (isNegative) ? -result : result;
	    };

	    // reverses the transformation made by absLogBaseTen above
	    // rounds to three decimal points of precision
	    var absPowerTen = function(num) {
	        if(typeof num !== "number") {
	            num = parseFloat(num);
	        }
	        if(_(num).isNaN()) {
	            return num;
	        }
	        var isNegative = (num < 0),
	            result;

	        if(isNegative) {
	            num = -num;
	        }
	        result = Math.pow(10, num);
	        if(result < 10) {
	            result = 10 * (result - 1) / (10 - 1);
	        }
	        result = (isNegative) ? -result : result;
	        return (Math.round(result * 1000) / 1000);
	    };

	    // calculates the power of ten that is closest to but not greater than the number
	    // negative numbers are treated as their absolute value and the sign of the result is flipped before returning
	    var nearestPowerOfTen = function(num) {
	        if(typeof num !== "number") {
	            return NaN;
	        }
	        var isNegative = num < 0;
	        num = (isNegative) ? -num : num;
	        var log = logBaseTen(num),
	            result = Math.pow(10, Math.floor(log));

	        return (isNegative) ? -result: result;
	    };

	    var roundWithMin = function(value, min) {
	        return Math.max(Math.round(value), min);
	    };

	    var roundWithMinMax = function(value, min, max) {
	        var roundVal = Math.round(value);
	        if(roundVal < min) {
	            return min;
	        }
	        if(roundVal > max) {
	            return max;
	        }
	        return roundVal;
	    };

	    var degreeToRadian = function(degree) {
	        return (degree * Math.PI) / 180;
	    };

	    // returns the number of digits of precision after the decimal point
	    // optionally accepts a maximum number, after which point it will stop looking and return the max
	    var getDecimalPrecision = function(num, max) {
	        max = max || Infinity;
	        var precision = 0;

	        while(precision < max && num.toFixed(precision) !== num.toString()) {
	            precision += 1;
	        }

	        return precision;
	    };

	    return ({

	        parseFloat: parseFloat,
	        logBaseTen: logBaseTen,
	        absLogBaseTen: absLogBaseTen,
	        absPowerTen: absPowerTen,
	        nearestPowerOfTen: nearestPowerOfTen,
	        roundWithMin: roundWithMin,
	        roundWithMinMax: roundWithMinMax,
	        degreeToRadian: degreeToRadian,
	        getDecimalPrecision: getDecimalPrecision

	    });

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/components/Legend":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/helpers/EventMixin"),
	            __webpack_require__("js_charting/helpers/Formatter"),
	            __webpack_require__("js_charting/helpers/HoverEventThrottler"),
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("js_charting/util/color_utils"),
	            __webpack_require__("js_charting/util/dom_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            EventMixin,
	            Formatter,
	            HoverEventThrottler,
	            parsingUtils,
	            colorUtils,
	            domUtils
	        ) {

	    var Legend = function(properties) {
	        this.properties = properties || {};
	        this.id = _.uniqueId('legend_');
	        this.clickEnabled = parsingUtils.normalizeBoolean(this.properties.clickEnabled);
	        this.ellipsisMode = this.OVERFLOW_TO_ELLIPSIS_MAP[this.properties['labelStyle.overflowMode']]
	            || this.DEFAULT_ELLIPSIS_MODE;
	        this.UNHIGHLIGHTED_COLOR =
	            colorUtils.addAlphaToColor(this.UNHIGHLIGHTED_BASE_COLOR, this.UNHIGHLIGHTED_OPACITY);
	    };

	    Legend.prototype = $.extend({}, EventMixin, {

	        HIGHLIGHTED_OPACITY: 1.0,
	        HIGHLIGHTED_SYMBOL_OPACITY: 1.0,
	        UNHIGHLIGHTED_OPACITY: 0.3,
	        UNHIGHLIGHTED_BASE_COLOR: 'rgb(150, 150, 150)',
	        DEFAULT_PLACEMENT: 'right',
	        DEFAULT_ELLIPSIS_MODE: 'middle',

	        BASE_CONFIG: {
	            borderWidth: 0
	        },

	        PLACEMENT_OPTIONS: {
	            top: true,
	            left: true,
	            bottom: true,
	            right: true,
	            none: true
	        },

	        PLACEMENT_TO_MARGIN_MAP: {
	            top: 12,
	            left: 15,
	            bottom: 2,
	            right: 2
	        },

	        OVERFLOW_TO_ELLIPSIS_MAP: {
	            ellipsisStart: 'start',
	            ellipsisMiddle: 'middle',
	            ellipsisEnd: 'end',
	            ellipsisNone: 'none',
	            'default': 'start'
	        },

	        getConfig: function() {
	            var placement = this.PLACEMENT_OPTIONS.hasOwnProperty(this.properties['placement']) ?
	                    this.properties['placement'] : this.DEFAULT_PLACEMENT,
	                isVertical = { left: true, right: true }.hasOwnProperty(placement),
	                itemCursorStyle = this.clickEnabled ? 'pointer' : 'default';
	            
	            return $.extend(true, {}, this.BASE_CONFIG, {
	                enabled: this.properties['isEmpty'] ? false : true,
	                align: isVertical ? placement : 'center',
	                verticalAlign: isVertical ? 'middle' : placement,
	                layout: isVertical ? 'vertical' : 'horizontal',
	                margin: this.PLACEMENT_TO_MARGIN_MAP[placement],
	                itemStyle: {
	                    cursor: itemCursorStyle,
	                    color: this.properties['fontColor'] || '#000000',
	                    fontWeight: 'normal',
	                    // Hack to make sure we can render literal '<' and '>'
	                    HcTextStroke: true
	                },
	                itemHoverStyle: {
	                    cursor: itemCursorStyle,
	                    color: this.properties['fontColor'] || '#000000'
	                },
	                renderItemsPreHook: _(this.renderItemsPreHook).bind(this),
	                renderItemsPostHook: _(this.renderItemsPostHook).bind(this),
	                renderPreHook: _(this.renderPreHook).bind(this),
	                renderPostHook: _(this.renderPostHook).bind(this)
	            });
	        },

	        onChartLoad: function(chart) {
	            // Works but may need to be changed in the future
	            this.hcSeriesList = _(chart.series).filter(function(series){
	                return series.options.showInLegend !== false;
	            });
	            this.setSymbolFillOpacity(this.hcSeriesList[0]);
	        },

	        onChartLoadOrRedraw: function(chart) {
	            this.hcSeriesList = _(chart.series).filter(function(series){
	                return series.options.showInLegend !== false;
	            });            
	            this.removeEventHandlers();
	            this.addEventHandlers();
	        },

	        setSymbolFillOpacity: function(series) {
	            // Line chart has a "legendLine" instead of a "legendSymbol"
	            var symbol = series.legendSymbol || series.legendLine;
	            // Highcharts SVG wrapper's 'attr' method returns 0 if fill-opacity attribute is not set (which behaves like fill-opacity = 1)
	            var computedOpacity = colorUtils.getComputedOpacity(symbol);
	            if (computedOpacity === 0) { 
	                //Highcharts attr method when used to set fill-opacity seems to treat fill-opacity 0 as 0, as opposed 1 (as the above would indicate)
	                this.HIGHLIGHTED_SYMBOL_OPACITY = 1;
	            } else {
	                this.HIGHLIGHTED_SYMBOL_OPACITY = computedOpacity;
	            }
	        },

	        addEventHandlers: function() {
	            var that = this,
	                properties = {
	                    highlightDelay: 125,
	                    unhighlightDelay: 50,
	                    onMouseOver: function(fieldName) {
	                        that.selectField(fieldName);
	                        that.trigger('mouseover', [fieldName]);
	                    },
	                    onMouseOut: function(fieldName) {
	                        that.unSelectField(fieldName);
	                        that.trigger('mouseout', [fieldName]);
	                    }
	                },
	                throttle = new HoverEventThrottler(properties);

	            _(this.hcSeriesList).each(function(series) {
	                var fieldName = series.name;
	                _(this.getSeriesLegendObjects(series)).each(function(graphic) {
	                    domUtils.jQueryOn.call($(graphic.element), 'mouseover.' + this.id, function() {
	                        throttle.mouseOverHappened(fieldName);
	                    });
	                    domUtils.jQueryOn.call($(graphic.element), 'mouseout.' + this.id, function() {
	                        throttle.mouseOutHappened(fieldName);
	                    });
	                    if(this.clickEnabled) {
	                        domUtils.jQueryOn.call($(graphic.element), 'click.' + this.id, function(e) {
	                            var clickEvent = {
	                                type: 'click',
	                                modifierKey: (e.ctrlKey || e.metaKey)
	                            };
	                            that.trigger(clickEvent, [fieldName]);
	                        });
	                    }
	                }, this);
	            }, this);
	        },

	        removeEventHandlers: function() {
	            _(this.hcSeriesList).each(function(series) {
	                _(this.getSeriesLegendObjects(series)).each(function(graphic) {
	                    domUtils.jQueryOff.call($(graphic.element), '.' + this.id);
	                }, this);
	            }, this);
	        },

	        selectField: function(fieldName) {
	            _(this.hcSeriesList).each(function(series) {
	                if(series.name !== fieldName) {
	                    this.unHighlightField(fieldName, series);
	                } else {
	                    this.highlightField(fieldName, series);
	                }
	            }, this);
	        },

	        unSelectField: function(fieldName) {
	            _(this.hcSeriesList).each(function(series) {
	                if(series.name !== fieldName) {
	                    this.highlightField(fieldName, series);
	                }
	            }, this);
	        },

	        highlightField: function(fieldName, series) {
	            series = series || this.getSeriesByFieldName(fieldName);
	            var objects = this.getSeriesLegendObjects(series),
	                seriesColor = series.color;
	            if(objects.item) {
	                objects.item.attr('fill-opacity', this.HIGHLIGHTED_OPACITY);
	            }
	            if(objects.line) {
	                objects.line.attr('stroke', seriesColor);
	            }
	            if(objects.symbol) {
	                objects.symbol.attr({
	                    'fill': seriesColor,
	                    'stroke': seriesColor,
	                    'fill-opacity': this.HIGHLIGHTED_SYMBOL_OPACITY
	                });
	            }
	        },

	        unHighlightField: function(fieldName, series) {
	            series = series || this.getSeriesByFieldName(fieldName);
	            var objects = this.getSeriesLegendObjects(series);
	            if(objects.item) {
	                objects.item.attr('fill-opacity', this.UNHIGHLIGHTED_OPACITY);
	            }
	            if(objects.line) {
	                objects.line.attr('stroke', this.UNHIGHLIGHTED_COLOR);
	            }
	            if(objects.symbol) {
	                objects.symbol.attr({
	                    'fill': this.UNHIGHLIGHTED_COLOR,
	                    'stroke': this.UNHIGHLIGHTED_COLOR,
	                    'fill-opacity': this.UNHIGHLIGHTED_OPACITY
	                });
	            }
	        },

	        getSeriesByFieldName: function(fieldName) {
	            return _(this.hcSeriesList).find(function(series) { return series.name === fieldName; });
	        },

	        getSeriesLegendObjects: function(series) {
	            var objects = {};

	            if(series.legendItem) {
	                objects.item = series.legendItem;
	            }
	            if(series.legendSymbol) {
	                objects.symbol = series.legendSymbol;
	            }
	            if(series.legendLine) {
	                objects.line = series.legendLine;
	            }
	            return objects;
	        },

	        destroy: function() {
	            this.off();
	            this.removeEventHandlers();
	            this.hcSeriesList = null;
	        },

	        /**
	         * @author sfishel
	         *
	         * Do some intelligent ellipsizing of the legend labels (if needed) before they are rendered.
	         */

	        renderItemsPreHook: function(legend) {
	            var i, adjusted, fixedWidth, maxWidth,
	                options = legend.options,
	                itemStyle = legend.itemStyle,
	                items = legend.allItems,
	                chart = legend.chart,
	                renderer = chart.renderer,
	                spacingBox = chart.spacingBox,
	                horizontalLayout = (options.layout === 'horizontal'),
	                defaultFontSize = 12,
	                minFontSize = 10,
	                symbolWidth = legend.symbolWidth,
	                symbolPadding = options.symbolPadding,
	                boxPadding = legend.padding || 0,
	                itemHorizSpacing = 10,
	                labels = [],
	                formatter = new Formatter(renderer);

	            if(horizontalLayout) {
	                maxWidth = (items.length > 5) ?
	                    // With more than 5 items, don't try to fit them all on one line.
	                    Math.floor(spacingBox.width / 6) :
	                    // With >= 5 items, determine the width allowed for each item to fit all on one line, taking into account
	                    // the space needed for the symbol and padding between items
	                    Math.floor(spacingBox.width / items.length) - (symbolWidth + symbolPadding + itemHorizSpacing);
	            }
	            else {
	                maxWidth = Math.floor(spacingBox.width / 6) - (symbolWidth + symbolPadding + boxPadding);
	            }

	            // make a copy of the original formatting function, since we're going to clobber it
	            if(!options.originalFormatter) {
	                options.originalFormatter = options.labelFormatter;
	            }
	            // get all of the legend labels
	            for(i = 0; i < items.length; i++) {
	                labels.push(options.originalFormatter.call(items[i]));
	            }

	            adjusted = formatter.adjustLabels(labels, maxWidth, minFontSize, defaultFontSize, this.ellipsisMode);

	            // in case of horizontal layout with ellipsized labels, set a fixed width for nice alignment
	            if(adjusted.areEllipsized && horizontalLayout && items.length > 5) {
	                fixedWidth = maxWidth + symbolWidth + symbolPadding + itemHorizSpacing;
	                options.itemWidth = fixedWidth;
	            }
	            else {
	                options.itemWidth = undefined;
	            }

	            // set the new labels to the name field of each item
	            for(i = 0; i < items.length; i++) {
	                items[i].ellipsizedName = adjusted.labels[i];
	                // if the legendItem is already set this is a resize event, so we need to explicitly reformat the item
	                if(items[i].legendItem) {
	                    domUtils.setLegendItemText(items[i].legendItem, parsingUtils.escapeSVG(adjusted.labels[i]));
	                    items[i].legendItem.css({ 'font-size': adjusted.fontSize + 'px' });
	                }
	            }
	            // now that the ellipsizedName field has the pre-formatted labels, update the label formatter
	            options.labelFormatter = function() {
	                return parsingUtils.escapeSVG(this.ellipsizedName);
	            };
	            // adjust the font size
	            itemStyle['font-size'] = adjusted.fontSize + 'px';
	            legend.itemMarginTop = defaultFontSize - adjusted.fontSize;
	            formatter.destroy();
	        },

	        /**
	         * @author sfishel
	         *
	         * Detect if the legend items will overflow the container (in which case navigation buttons will be shown)
	         * and adjust the default values for the vertical positioning and width
	         *
	         * FIXME: it would be better to do this work after the nav has been rendered instead of
	         * hard-coding an expected width
	         */

	        renderItemsPostHook: function(legend) {
	            var NAV_WIDTH = 55,
	                options = legend.options,
	                padding = legend.padding,
	                legendHeight = legend.lastItemY + legend.lastLineHeight,
	                availableHeight = legend.chart.spacingBox.height - padding;

	            if(legendHeight > availableHeight) {
	                options.verticalAlign = 'top';
	                options.y = -padding;
	                if(legend.offsetWidth < NAV_WIDTH) {
	                    options.width = NAV_WIDTH;
	                }
	            }
	            else {
	                // SPL-70551, make sure to set things back to defaults in case the chart was resized to a larger height
	                var config = this.getConfig();
	                $.extend(options, {
	                    verticalAlign: config.verticalAlign,
	                    y: config.y,
	                    width: config.width
	                });
	            }
	        },

	        // SPL-88618
	        // Highcharts works around some rendering bugs in Firefox and IE 11 by delaying the positioning of legend items.
	        // However, this results in a split second where all of the legend items are on top of each other.
	        // Some basic testing indicates that these bugs no longer exist in latest versions of Firefox and IE 11,
	        // so we trick Highcharts into not delaying by pretending to be in export mode, just for the legend render.
	        renderPreHook: function(legend) {
	            var renderer = legend.chart.renderer;
	            this._rendererForExport = renderer.forExport;
	            renderer.forExport = true;
	        },

	        renderPostHook: function(legend) {
	            legend.chart.renderer.forExport = this._rendererForExport;
	        }

	    });

	    return Legend;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/helpers/HoverEventThrottler":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("shim/jquery")], __WEBPACK_AMD_DEFINE_RESULT__ = function($) {

	    var Throttler = function(properties){
	        properties              = properties || {};
	        this.highlightDelay     = properties.highlightDelay || 200;
	        this.unhighlightDelay   = properties.unhighlightDelay || 100;
	        this.timer              = null;
	        this.timer2             = null;
	        this.mouseStatus        = 'over';
	        this.isSelected         = false;
	        this.onMouseOver        = properties.onMouseOver;
	        this.onMouseOut         = properties.onMouseOut;
	    };

	    $.extend(Throttler.prototype, {

	        setMouseStatus: function(status) { this.mouseStatus = status; },

	        getMouseStatus: function() { return this.mouseStatus; },

	        mouseOverHappened: function(someArgs) {
	            var that = this,
	                args = arguments;

	            this.mouseOverFn = function() {
	                that.onMouseOver.apply(null, args);
	            };
	            clearTimeout(this.timer);
	            clearTimeout(this.timer2);
	            this.setMouseStatus('over');
	            this.timeOutManager();
	        },

	        mouseOutHappened: function(someArgs) {
	            var that = this,
	                args = arguments;
	            this.mouseOutFn = function() {
	                that.onMouseOut.apply(null, args);
	            };
	            this.setMouseStatus('out');
	            this.timeOutManager();
	        },

	        timeOutManager: function(){
	            var that = this;

	            clearTimeout(this.timer);
	            if(this.isSelected) {
	                if(this.getMouseStatus()==='over') {
	                    this.mouseEventManager();
	                }
	                else {
	                    this.timer2 = setTimeout(function() {
	                        that.setMouseStatus('out');
	                        that.mouseEventManager();
	                    }, that.unhighlightDelay);
	                }
	            }
	            else {
	                this.timer = setTimeout(function() {
	                    that.isSelected = true;
	                    that.mouseEventManager();
	                }, that.highlightDelay);
	            }
	        },

	        mouseEventManager: function() {
	            var that = this;
	            if(this.getMouseStatus()==='over') {
	                this.mouseOverFn();
	                this.isSelected = true;
	                this.setMouseStatus('out');
	            }
	            else {
	                this.mouseOutFn();
	                this.isSelected = false;
	                this.setMouseStatus('over');
	            }
	        }
	    });

	    return Throttler;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "js_charting/components/Tooltip":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("shim/jquery"), __webpack_require__("require/underscore")], __WEBPACK_AMD_DEFINE_RESULT__ = function($, _) {

	    var Tooltip = function(properties) {
	        this.properties = properties || {};
	    };

	    Tooltip.prototype = {

	        BASE_CONFIG: {
	            enabled: true,
	            backgroundColor: '#000000',
	            borderColor: '#ffffff',
	            hideDelay: 0,
	            style: {
	                color: '#cccccc'
	            },
	            /**
	             * @author sfishel
	             *
	             * If the tooltip is too wide for the plot area, clip it left not right.
	             *
	             * unit test: js_charting/components/test_tooltip.html
	             */
	            positioner: function(boxWidth, boxHeight, point) {
	                var position = this.getPosition(boxWidth, boxHeight, point),
	                    plotWidth = this.chart.plotWidth,
	                    plotHeight = this.chart.plotHeight,
	                    resetZoomButton = $('.btn-zoom-out');

	                // If the point lies outside of the plot, we move the tooltip
	                // back into the plot area. The numeric constants are to account
	                // for the tooltip 'tail'
	                // NOTE: points that are within the plot handle the tooltip
	                // correctly by default, so we don't have to worry about
	                // cases where just the tooltip box overflows the plot.
	                if (point.plotX > plotWidth) {
	                    position.x = this.chart.plotLeft + plotWidth - boxWidth - 8;
	                }
	                if (point.plotX < 0) {
	                    position.x = this.chart.plotLeft + 8;
	                }
	                if (point.plotY < 0) {
	                    position.y = 0 + 17;
	                }
	                if (point.plotY > plotHeight) {
	                    position.y = plotHeight - boxHeight + 3;
	                }

	                // Prevent tooltip from blocking the reset zoom button
	                if(resetZoomButton.length > 0){
	                    var buttonPos = resetZoomButton.position();
	                    if(buttonPos){
	                        var buttonTop = buttonPos.top,
	                            buttonHeight = resetZoomButton.height(),
	                            buttonBottom = buttonTop + buttonHeight,
	                            tooltipTop = position.y;
	                        if(tooltipTop < buttonBottom){
	                            // Tooltip is overlapping reset button -> shift tooltip to below point
	                            position.y = point.plotY + 17; // height of tooltip 'tail': ~ 17
	                        }
	                    }
	                }
	                
	                return position;
	            },
	            /**
	             * @author sfishel
	             *
	             * Adjust the tooltip anchor position for column charts.
	             * Use a position relative to the selected column instead of a shared one for the series group.
	             *
	             * unit test: js_charting/components/test_tooltip.html
	             */
	            getAnchorPostHook: function(points, mouseEvent, anchor) {
	                if(points && !_.isArray(points) && points.series.options.type === 'column') {
	                    anchor[0] = points.barX;
	                }
	                return anchor;
	            }
	        },

	        getConfig: function() {
	            return $.extend(true, {}, this.BASE_CONFIG, {
	                borderColor: this.properties['borderColor']
	            });
	        },

	        destroy: function() {}

	    };

	    return Tooltip;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/components/SelectionWindow":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/helpers/EventMixin"),
	            __webpack_require__("helpers/user_agent")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            EventMixin,
	            userAgent
	        ) {

	    var SelectionWindow = function(hcChart) {
	        this.id = _.uniqueId('selection_window');
	        this.hcChart = hcChart;
	        this.renderer = hcChart.renderer;
	        this.axis = hcChart.xAxis[0];
	        this.axisHasTickmarksBetween = this.axis.options.tickmarkPlacement === 'between';
	        this.axisValueOffset = this.axisHasTickmarksBetween ? 0.5 : 0;
	        this.isiOS = userAgent.isiOS();

	        var rawX,
	            right,
	            selectionMarkerX,
	            selectionMarkerWidth;
	        this.pointer = hcChart.pointer;
	        if(this.pointer.selectionMarker.renderer){
	            // SelectionMarker was created by mouse drag
	            this.zIndex = this.pointer.selectionMarker.attr('zIndex');
	            selectionMarkerX = this.pointer.selectionMarker.attr('x');
	            selectionMarkerWidth = this.pointer.selectionMarker.attr('width');
	        }else{
	            // SelectionMarker was created by touch pinch
	            this.zIndex = 7; // default Highcharts pointer selection marker z-index
	            selectionMarkerX = this.pointer.selectionMarker.x;
	            selectionMarkerWidth = this.pointer.selectionMarker.width;
	        }
	        rawX = selectionMarkerX;
	        right = this.snapXValue(
	            rawX + selectionMarkerWidth,
	            this.axisHasTickmarksBetween ? 'ceil' : 'round',
	            'max'
	        );
	        this.x = this.snapXValue(rawX, this.axisHasTickmarksBetween ? 'floor' : 'round', 'min');

	        this.width = right - this.x;
	        this.createResizeHandles();
	        this.ownedElements = [
	            this.resizeHandleLeft.element,
	            this.resizeHandleRight.element
	        ];
	        this.updateExtremesValues();
	        var $chartContainer = $(this.hcChart.container);
	        this.defaultContainerCursor = $chartContainer.css('cursor');
	        $chartContainer.on('mousemove.' + this.id, _(this.onContainerMouseMove).bind(this));
	        this.initialized = true;
	    };

	    SelectionWindow.prototype = $.extend({}, EventMixin, {

	        handleWidth: userAgent.isiOS() ? 25 : 10,
	        handleHeight: 50,
	        handleBorderColor: 'rgb(255,255,255)',
	        handleBgColor: 'rgba(79,79,79,0.5)',
	        handleBorderRadius: 5,
	        shadedAreaColor: 'rgba(100,100,100,0.3)',

	        handleDragStartEvent: function(e) {
	            var target = e.target,
	                isSelectionDrag = target === this.hcChart.chartBackground.element &&
	                    this.hcChart.isInsidePlot(e.chartX - this.hcChart.plotLeft, e.chartY - this.hcChart.plotTop);

	            if(isSelectionDrag || _(this.ownedElements).contains(target)) {
	                this.originalTarget = target;
	                this.mouseDownX = this.getCurrentX();
	                this.mouseDownWidth = this.getCurrentWidth();
	                this.isDragging = true;
	                return true;
	            }
	            return false;
	        },

	        handleDragEvent: function(e) {
	            if(this.originalTarget === this.hcChart.chartBackground.element) {
	                this.dragSelectionMarker(e);
	            }
	            if(this.originalTarget === this.resizeHandleLeft.element) {
	                this.resizeSelectionLeft(e);
	            }
	            if(this.originalTarget === this.resizeHandleRight.element) {
	                this.resizeSelectionRight(e);
	            }
	        },

	        handleDropEvent: function(e) {
	            if(this.isDragging) {
	                this.updateExtremesValues();
	                this.emitSelectionEvent();
	                this.isDragging = false;
	            }
	        },

	        getExtremes: function() {
	            return { min: this.startValue, max: this.endValue };
	        },

	        setExtremes: function(extremes) {
	            this.startValue = extremes.min;
	            this.endValue = extremes.max;
	            this.x = Math.round(this.axis.toPixels(this.startValue + this.axisValueOffset));
	            this.width = Math.round(this.axis.toPixels(this.endValue + this.axisValueOffset)) - this.x;
	            this.positionResizeHandles('both');
	        },

	        onContainerMouseMove: function(e) {
	            e = this.pointer.normalize(e);
	            if(e.target === this.hcChart.chartBackground.element &&
	                    this.hcChart.isInsidePlot(e.chartX - this.hcChart.plotLeft, e.chartY - this.hcChart.plotTop)) {
	                $(this.hcChart.container).css('cursor', 'move');
	            }
	            else {
	                $(this.hcChart.container).css('cursor', this.defaultContainerCursor);
	            }
	        },

	        onChartRedraw: function() {
	            this.x = Math.round(this.axis.toPixels(this.startValue + this.axisValueOffset));
	            this.width = Math.round(this.axis.toPixels(this.endValue + this.axisValueOffset)) - this.x;
	            this.resizeHandleLeft.attr({
	                y: this.hcChart.plotTop + (this.hcChart.plotHeight / 2) - (this.handleHeight / 2)
	            });
	            this.resizeHandleRight.attr({
	                y: this.hcChart.plotTop + (this.hcChart.plotHeight / 2) - (this.handleHeight / 2)
	            });
	            this.shadedRegionLeft.attr({
	                x: this.hcChart.plotLeft,
	                y: this.hcChart.plotTop,
	                height: this.hcChart.plotHeight
	            });
	            this.shadedRegionRight.attr({
	                y: this.hcChart.plotTop,
	                height: this.hcChart.plotHeight
	            });
	            this.positionResizeHandles('both');
	        },

	        destroy: function() {
	            if(this.initialized) {
	                this.resizeHandleLeft.destroy();
	                this.resizeHandleRight.destroy();
	                this.handleVerticalLineLeft.destroy();
	                this.handleVerticalLineRight.destroy();
	                this.shadedRegionRight.destroy();
	                this.shadedRegionLeft.destroy();
	                this.$resetButton.remove();
	                this.initialized = false;
	            }
	            $(this.hcChart.container).off('mousemove.' + this.id);
	            this.off();
	        },

	        dragSelectionMarker: function(e) {
	            this.x = this.snapXValue(this.mouseDownX + e.chartX - this.pointer.mouseDownX, 'round');
	            // don't let the marker outside the plot area
	            this.x = Math.max(this.x, this.hcChart.plotLeft);
	            this.x = Math.min(this.x, this.hcChart.plotLeft + this.hcChart.plotWidth - this.getCurrentWidth());
	            this.positionResizeHandles('both');
	        },

	        resizeSelectionLeft: function(e) {
	            var currentX = this.getCurrentX(),
	                currentWidth = this.getCurrentWidth();

	            // set the new x based on how far the mouse was dragged
	            this.x = this.snapXValue(this.mouseDownX + e.chartX - this.pointer.mouseDownX, 'round');
	            // don't let the marker outside the plot area
	            this.x = Math.max(this.x, this.hcChart.plotLeft);
	            // don't let the handle meet the other handle
	            var right = currentX + currentWidth;
	            this.x = Math.min(this.x, this.axis.toPixels(this.axis.toValue(right) - 1));
	            this.width = currentWidth - this.x + currentX;
	            this.positionResizeHandles('left');
	        },

	        resizeSelectionRight: function(e) {
	            this.x = this.getCurrentX();
	            // set the new width based on how far the mouse was dragged
	            var newWidth = this.mouseDownWidth + e.chartX - this.pointer.mouseDownX,
	                right = this.snapXValue(this.x + newWidth, 'round');

	            this.width = right - this.x;
	            // don't let the marker outside the plot area
	            this.width = Math.min(this.width, this.hcChart.plotLeft + this.hcChart.plotWidth - this.x);
	            // don't let the handle meet the other handle, i.e. width must be >= 1 axis unit
	            this.width = Math.max(this.width, (this.axis.toPixels(1) - this.axis.toPixels(0)));
	            this.positionResizeHandles('right');
	        },

	        emitSelectionEvent: function() {
	            var xAxis = this.axis,
	                rangeStart = xAxis.toValue(this.x) + this.axisValueOffset,
	                rangeEnd = xAxis.toValue(this.x + this.width) - this.axisValueOffset;

	            this.trigger('rangeSelect', [rangeStart, rangeEnd]);
	        },

	        createResizeHandles: function() {
	            var handleAttrs = {
	                    zIndex: this.zIndex + 1,
	                    fill: {
	                        linearGradient: { x1: 0, y1: 0.5, x2: 1, y2: 0.5},
	                        stops: [
	                            [0, this.handleBgColor],
	                            [1/6, this.handleBorderColor],
	                            [2/6, this.handleBgColor],
	                            [3/6, this.handleBorderColor],
	                            [4/6, this.handleBgColor],
	                            [5/6, this.handleBorderColor],
	                            [1, this.handleBgColor]
	                        ]
	                    },
	                    'stroke-width': 2,
	                    stroke: this.handleBgColor
	                },
	                handleLineAttrs = { 'stroke-width': 2, stroke: this.handleBgColor, zIndex: this.zIndex },
	                shadedRegionAttrs = { zIndex: this.zIndex, fill: this.shadedAreaColor},
	                top = this.hcChart.plotTop + (this.hcChart.plotHeight / 2) - (this.handleHeight / 2);

	            this.shadedRegionRight = this.renderer.rect(0, this.hcChart.plotTop, 0, this.hcChart.plotHeight)
	                .attr(shadedRegionAttrs)
	                .add();
	            this.handleVerticalLineRight = this.renderer.path().attr(handleLineAttrs).add();
	            this.resizeHandleRight = this.renderer.rect(
	                    0,
	                    top,
	                    this.handleWidth,
	                    this.handleHeight,
	                    this.handleBorderRadius
	                )
	                .attr(handleAttrs)
	                .css({ cursor: 'ew-resize' })
	                .add();

	            this.shadedRegionLeft = this.renderer.rect(this.hcChart.plotLeft, this.hcChart.plotTop, 0, this.hcChart.plotHeight)
	                .attr(shadedRegionAttrs)
	                .add();
	            this.handleVerticalLineLeft = this.renderer.path().attr(handleLineAttrs).add();

	            this.resizeHandleLeft = this.renderer.rect(
	                    0,
	                    top,
	                    this.handleWidth,
	                    this.handleHeight,
	                    this.handleBorderRadius
	                )
	                .attr(handleAttrs)
	                .css({ cursor: 'ew-resize' })
	                .add();

	            this.positionResizeHandles('both');

	            this.$resetButton = $(_(this.resetButtonTemplate).template({}));
	            this.$resetButton.on('click', function(e) { e.preventDefault(); });
	            this.$resetButton.css({ 
	                top: this.hcChart.yAxis[0].top + 'px', 
	                right: this.hcChart.xAxis[0].right + 'px',
	                position: 'absolute' 
	            });
	            this.$resetButton.appendTo(this.hcChart.container);
	        },

	        positionResizeHandles: function(whichOnes) {
	            var markerLeft = this.x,
	                markerRight = markerLeft + this.width,
	                plotTop = this.hcChart.plotTop,
	                plotBottom = plotTop + this.hcChart.plotHeight,
	                plotLeft = this.hcChart.plotLeft,
	                plotRight = plotLeft + this.hcChart.plotWidth;

	            if(whichOnes === 'both' || whichOnes === 'left') {
	                this.shadedRegionLeft.attr({ width: markerLeft - plotLeft });
	                this.handleVerticalLineLeft.attr({ d: ['M', markerLeft, plotTop, 'L', markerLeft, plotBottom] });
	                this.resizeHandleLeft.attr({ x: markerLeft - (this.handleWidth / 2) });
	            }
	            if(whichOnes === 'both' || whichOnes === 'right') {
	                this.shadedRegionRight.attr({ x: markerRight, width: plotRight - markerRight });
	                this.handleVerticalLineRight.attr({ d: ['M', markerRight, plotTop, 'L', markerRight, plotBottom] });
	                this.resizeHandleRight.attr({ x: markerRight - (this.handleWidth / 2) });
	            }
	        },

	        getCurrentX: function() {
	            return this.resizeHandleLeft.attr('x') + (this.handleWidth / 2);
	        },

	        getCurrentWidth: function() {
	            return (this.resizeHandleRight.attr('x') + (this.handleWidth / 2)) - this.getCurrentX();
	        },

	        snapXValue: function(rawXValue, mathOperation) {
	            var axis = this.axis,
	                axisValue = axis.toValue(rawXValue);

	            return axis.toPixels(Math[mathOperation](axisValue - this.axisValueOffset) + this.axisValueOffset);
	        },

	        updateExtremesValues: function() {
	            this.startValue = Math.round(this.axis.toValue(this.x) - this.axisValueOffset);
	            this.endValue = Math.round(this.axis.toValue(this.x + this.width) - this.axisValueOffset);
	        },

	        resetButtonTemplate: '<a class="btn-link btn-reset-selection" href="#"><i class="icon-minus-circle"></i><%= _("Reset").t() %></a>'

	    });

	    return SelectionWindow;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/components/PanButtons":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/helpers/EventMixin"),
	            __webpack_require__("js_charting/util/color_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            EventMixin,
	            colorUtils
	        ) {

	    var PanButtons = function(hcChart){
	        this.hcChart = hcChart;
	        this.initialize();
	    };

	    PanButtons.prototype = $.extend({}, EventMixin, {

	        initialize: function() {
	            var axis = this.hcChart.xAxis[0], 
	                extremes = axis.getExtremes(),
	                leftButtonTemplate = '<a class="btn-pill btn-pan-left" href="#"><i class="icon-chevron-left"></i></a>', 
	                rightButtonTemplate = '<a class="btn-pill btn-pan-right" href="#"><i class="icon-chevron-right"></i></a>';
	                
	            if(!this.panRightButton){
	                this.panRightButton = $(rightButtonTemplate);
	                //zoomed into left edge of chart - disable left pan
	                if((this.hcChart.xAxis[0].options.tickmarkPlacement === 'between' && extremes.max >= extremes.dataMax) 
	                    || (this.hcChart.xAxis[0].options.tickmarkPlacement === 'on' && extremes.max > extremes.dataMax)){
	                    this.panRightButton.addClass('disabled');
	                }
	                $(this.hcChart.container).append(this.panRightButton);
	            }
	           
	            if(!this.panLeftButton){
	                this.panLeftButton = $(leftButtonTemplate);
	                //zoomed into left edge of chart - disable left pan
	                if(extremes.min === 0){
	                    this.panLeftButton.addClass('disabled');
	                }
	                $(this.hcChart.container).append(this.panLeftButton);
	            }

	            var that = this;
	            this.debouncedPanLeft = _.debounce(function() {
	                that.handlePan('left');
	                that.positionButtons();
	            });
	            this.debouncedPanRight = _.debounce(function() {
	                that.handlePan('right');
	                that.positionButtons();
	            });
	           
	            this.positionButtons();
	            this.bindPanListeners();
	        },

	        positionButtons: function() {
	            var legendOptions = this.hcChart.legend.options,
	                topPos = this.hcChart.plotHeight + this.hcChart.plotTop + 4,
	                leftPos = this.hcChart.xAxis[0].left - 20, 
	                rightPos = this.hcChart.xAxis[0].right - (legendOptions.align === 'right' ? 20 : 0);

	            this.panRightButton.css({
	                'position': 'absolute',
	                'top':  topPos + 'px',
	                'right': rightPos + 'px'
	            });
	            this.panLeftButton.css({
	                'position': 'absolute',
	                'top': topPos + 'px',
	                'left': leftPos + 'px'
	            });
	        },

	        handlePan: function(direction) {
	            var axis = this.hcChart.xAxis[0],
	                extremes = axis.getExtremes(),
	                prevMin = Math.round(extremes.min),
	                prevMax = Math.round(extremes.max),
	                doRedraw, 
	                newMin,
	                newMax,
	                min,
	                max;
	            if(direction === 'left'){
	                min = extremes.dataMin;
	                if(prevMin > min){
	                    if(prevMin === min + 1){
	                        // disable pan left button as we are now at the left chart edge
	                        this.panLeftButton.addClass('disabled');
	                    }
	                    // enable pan right button as we are no longer at the right chart edge
	                    if(this.panRightButton.hasClass('disabled')){
	                        this.panRightButton.removeClass('disabled');
	                    }
	                    newMin = prevMin - 1;
	                    newMax = prevMax - 1;
	                    doRedraw = true;
	                }
	            }else if(direction === 'right'){
	                max = extremes.dataMax + ((this.hcChart.xAxis[0].options.tickmarkPlacement === 'between') ? 0 : 1);
	                if(prevMax < max){
	                    if(prevMax === max - 1) {
	                        // disable pan right button as we are now at the right chart edge
	                        this.panRightButton.addClass('disabled');
	                    }
	                    // enable pan left button as we are no longer at the left chart edge
	                    if(this.panLeftButton.hasClass('disabled')){
	                        this.panLeftButton.removeClass('disabled');
	                    }
	                    newMin = prevMin + 1;
	                    newMax = prevMax + 1;
	                    doRedraw = true;
	                }
	            }

	            axis.setExtremes(newMin, newMax, false, false, { trigger: 'pan' });

	            if (doRedraw) {
	                this.hcChart.redraw(false);
	            }
	        },

	        bindPanListeners: function() {
	            var that = this,
	                pressTimer,
	                clearPanTimeout = function(){
	                    if(pressTimer){
	                        clearInterval(pressTimer);
	                    }
	                }, 
	                xAxis = this.hcChart.xAxis[0],
	                extremes,
	                min,
	                max;

	            if(this.panLeftButton){
	                this.panLeftButton.on('click', function(e){
	                    e.preventDefault();
	                    that.debouncedPanLeft();
	                });
	                this.panLeftButton.on('mousedown', function(e){
	                    clearPanTimeout();
	                    pressTimer = window.setInterval(function(){
	                        that.handlePan('left');
	                    }, 200);
	                });
	                this.panLeftButton.on('mouseup', function(e){
	                    clearPanTimeout();
	                    extremes = xAxis.getExtremes();
	                    that.trigger('pan', [extremes.min, extremes.max]);
	                });
	            }
	            if(this.panRightButton){
	                this.panRightButton.on('click', function(e){
	                    e.preventDefault();
	                    that.debouncedPanRight();
	                });
	                this.panRightButton.on('mousedown', function(e){
	                    clearPanTimeout();
	                    pressTimer = window.setInterval(function(){
	                        that.handlePan('right');
	                    }, 200);
	                });
	                this.panRightButton.on('mouseup', function(e){
	                    clearPanTimeout();
	                    extremes = xAxis.getExtremes();
	                    that.trigger('pan', [extremes.min, extremes.max]);
	                });
	            }
	        },

	        onChartResize: function(chart) {
	            if(this.panLeftButton && this.panRightButton){
	                this.positionButtons();
	            }
	        },

	        onChartRedraw: function(chart) {
	            if(this.panLeftButton && this.panRightButton){
	                this.positionButtons();
	            }
	        },

	        destroy: function() {
	            if(this.panLeftButton){
	                this.panLeftButton.remove();
	                this.panLeftButton = undefined;
	            }
	            if(this.panRightButton){
	                this.panRightButton.remove();
	                this.panRightButton = undefined;
	            }
	            this.off();
	        }

	    });

	    return PanButtons;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/components/ZoomOutButton":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/helpers/EventMixin"),
	            __webpack_require__("js_charting/util/color_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            EventMixin,
	            colorUtils
	        ) {

	    var ZoomOutButton = function(hcChart){
	        this.hcChart = hcChart;
	        this.initialize();
	        this.debouncedZoomOut = _.debounce(function(){
	            hcChart.zoomOut();
	        });
	    };

	    ZoomOutButton.prototype = $.extend({}, EventMixin, {

	        initialize: function() {
	            var axis = this.hcChart.xAxis[0], 
	                extremes = axis.getExtremes(),
	                btnTemplate = '<a class="btn-pill btn-zoom-out" href="#"><i class="icon-minus-circle"></i>' + _('Reset Zoom').t() + '</a>';
	                
	            if(!this.zoomOutBtn){
	                this.zoomOutBtn = $(btnTemplate);
	                $(this.hcChart.container).append(this.zoomOutBtn);
	            }
	            var topPos = this.hcChart.yAxis[0].top, 
	                rightPos = this.hcChart.xAxis[0].right;
	            this.zoomOutBtn.css({
	                'position': 'absolute',
	                'top':  topPos + 'px',
	                'right': rightPos + 'px'
	            });
	            this.addEventHandlers();
	        },

	        addEventHandlers: function() {
	            var that = this;

	            if(this.zoomOutBtn){
	                this.zoomOutBtn.on('click', function(e){
	                    e.preventDefault();
	                    that.debouncedZoomOut();
	                });
	            }
	        },

	        destroy: function() {
	            if(this.zoomOutBtn){
	                this.zoomOutBtn.remove();
	                this.zoomOutBtn = undefined;
	            }
	            this.off();
	        }

	    });

	    return ZoomOutButton;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/charts/ScatterChart":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/visualizations/charts/Chart"),
	            __webpack_require__("js_charting/series/series_factory"),
	            __webpack_require__("js_charting/components/axes/NumericAxis"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/parsing_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Chart,
	            seriesFactory,
	            NumericAxis,
	            langUtils,
	            parsingUtils
	        ) {

	    var ScatterChart = function(container, properties) {
	        Chart.call(this, container, properties);
	        // Nulls should always be treated as zeros for scatter charts (SPL-114835).
	        this.properties['chart.nullValueMode'] = 'zero';
	    };
	    langUtils.inherit(ScatterChart, Chart);

	    $.extend(ScatterChart.prototype, {
	        NUM_DIMENSION_FIELDS: 2,
	        TYPE: 'scatter',

	        initializeFields: function() {
	            Chart.prototype.initializeFields.call(this);
	            // to support the pivot interface, scatter charts ignore the first column if it is the result of a group-by
	            var dataFields = this.dataSet.allDataFields();
	            if(this.dataSet.fieldIsGroupby(dataFields[0])) {
	                this.markField = dataFields[0];
	                dataFields = dataFields.slice(1);
	            }
	            this.initializeNonMarkFields(dataFields);
	        },

	        initializeNonMarkFields: function(dataFields) {
	            if(dataFields.length > this.NUM_DIMENSION_FIELDS) {
	                this.isMultiSeries = true;
	                this.labelField = dataFields[0];
	                this.xField = dataFields[1];
	                this.yField = dataFields[2];
	                this.hasLegend = (this.properties['legend.placement'] !== 'none');
	            }
	            else {
	                this.isMultiSeries = false;
	                this.xField = dataFields[0];
	                this.yField = dataFields[1];
	                this.hasLegend = false;
	            }
	        },

	        // Override chart data label init. Scatter chart does not support data labels
	        initializeDataLabels: function(){
	            // Do nothing
	        },

	        isEmpty: function() {
	            return _(this.xField).isUndefined() || _(this.yField).isUndefined();
	        },

	        hasTimeXAxis: function() {
	            return false;
	        },

	        initializeSeriesPropertiesList: function() {
	            var propertiesList;
	            if(this.isMultiSeries) {
	                propertiesList = _(this.dataSet.getSeries(this.labelField)).chain()
	                    .uniq()
	                    .compact()
	                    .map(function(label) {
	                        return ({
	                            name: label,
	                            type: this.TYPE,
	                            clickEnabled: this.chartClickEnabled
	                        });
	                    }, this)
	                    .value();
	            }
	            else {
	                var seriesProps = {
	                    name: _.uniqueId(this.TYPE + '_field_'),
	                    type: this.TYPE,
	                    clickEnabled: this.chartClickEnabled
	                };
	                propertiesList = [seriesProps];
	            }
	            return propertiesList;
	        },

	        initializeXAxisList: function() {
	            var axisProps = $.extend(parsingUtils.getXAxisProperties(this.properties), this.axisColorScheme, {
	                'axis.orientation': 'horizontal',
	                'isEmpty': this.isEmpty()
	            });

	            axisProps['axisTitle.text'] = this._getComputedXAxisTitle(axisProps, this.xField);

	            axisProps['gridLines.showMajorLines'] = false;
	            this.xAxisList = [new NumericAxis(axisProps)];
	        },

	        initializeYAxisList: function() {
	            var axisProps = $.extend(parsingUtils.getYAxisProperties(this.properties), this.axisColorScheme, {
	                'axis.orientation': 'vertical',
	                'isEmpty': this.isEmpty()
	            });

	            axisProps['axisTitle.text'] = this._getComputedYAxisTitle(axisProps, null);

	            this.yAxisList = [new NumericAxis(axisProps)];
	        },

	        setAllSeriesData: function() {
	            var xData = this.formatAxisData(this.xAxisList[0], this.xField),
	                yData = this.formatAxisData(this.yAxisList[0], this.yField);

	            if(this.isMultiSeries) {
	                _(this.seriesList).each(function(series) {
	                    var seriesName = series.getName();
	                    series.setData({
	                        x: this.filterDataByNameMatch(xData, seriesName),
	                        y: this.filterDataByNameMatch(yData, seriesName)
	                    });
	                }, this);
	            }
	            else {
	                this.seriesList[0].setData({
	                    x: xData,
	                    y: yData
	                });
	            }
	        },

	        // Overrides the base class because scatter chart has different
	        // default axis label behavior
	        _getDefaultYAxisTitle: function(){
	            return this.yField;
	        },

	        // Overrides the base class because scatter chart has different
	        // default axis label behavior
	        _getDefaultXAxisTitleFromField: function(field){
	            return this.xField;
	        },

	        getPlotOptionsConfig: function() {
	            var markerSize = parseInt(this.properties['chart.markerSize'], 10);
	            return ({
	                scatter: {
	                    stickyTracking: false,
	                    fillOpacity: 1,
	                    trackByArea: true,
	                    marker: {
	                        radius: markerSize ? Math.ceil(markerSize * 6 / 4) : 6,
	                        symbol: 'square'
	                    },
	                    tooltip: {
	                        followPointer: false
	                    },
	                    cursor: this.chartClickEnabled ? 'pointer' : 'default'
	                }
	            });
	        },

	        handlePointClick: function(event, point, series) {
	            var pointIndex = point.index,
	                seriesName = series.getName(),
	                xSeries = this.dataSet.getSeries(this.xField),
	                ySeries = this.dataSet.getSeries(this.yField),
	                xValue = this.isMultiSeries ? this.filterDataByNameMatch(xSeries, seriesName)[pointIndex] : xSeries[pointIndex],
	                yValue = this.isMultiSeries ? this.filterDataByNameMatch(ySeries, seriesName)[pointIndex] : ySeries[pointIndex],
	                rowContext = {};

	            if(this.markField) {
	                var markSeries = this.dataSet.getSeries(this.markField),
	                    markValue = this.isMultiSeries ? this.filterDataByNameMatch(markSeries, seriesName)[pointIndex] : markSeries[pointIndex];

	                rowContext['row.' + this.markField] = markValue;
	            }

	            var pointClickEvent = {
	                type: 'pointClick',
	                modifierKey: event.modifierKey,
	                name: this.markField ? this.markField : (this.isMultiSeries ? this.labelField : this.xField),
	                value: this.markField ? markValue : (this.isMultiSeries ? seriesName : xValue),
	                name2: (this.markField && this.isMultiSeries) ? this.labelField : this.yField,
	                value2: (this.markField && this.isMultiSeries) ? seriesName : yValue,
	                rowContext: rowContext
	            };

	            rowContext['row.' + this.xField] = xValue;
	            rowContext['row.' + this.yField] = yValue;
	            if(this.isMultiSeries) {
	                rowContext['row.' + this.labelField] = seriesName;
	            }
	            this.trigger(pointClickEvent);
	        },

	        handleLegendClick: function(event, fieldName) {
	            var rowContext = {},
	                legendClickEvent = {
	                    type: 'legendClick',
	                    modifierKey: event.modifierKey,
	                    name: this.labelField,
	                    value: fieldName,
	                    rowContext: rowContext
	                };

	            rowContext['row.' + this.labelField] = fieldName;
	            this.trigger(legendClickEvent);
	        },

	        getSeriesPointInfo: function(series, hcPoint) {
	            var pointIndex = hcPoint.index,
	                xAxis = this.xAxisList[0],
	                yAxis = this.yAxisList[0],
	                seriesName = series.getName(),
	                xSeries = this.dataSet.getSeries(this.xField),
	                ySeries = this.dataSet.getSeries(this.yField),
	                xValue = this.isMultiSeries ? this.filterDataByNameMatch(xSeries, seriesName)[pointIndex] : xSeries[pointIndex],
	                yValue = this.isMultiSeries ? this.filterDataByNameMatch(ySeries, seriesName)[pointIndex] : ySeries[pointIndex],

	                pointInfo = {
	                    isMultiSeries: this.isMultiSeries,
	                    xAxisName: this.xField,
	                    xValue: xAxis.formatValue(xValue),
	                    yAxisName: this.yField,
	                    yValue: yAxis.formatValue(yValue),
	                    markName: null,
	                    markValue: null
	                };

	            if(this.markField) {
	                var markSeries = this.dataSet.getSeries(this.markField),
	                    markValue = this.isMultiSeries ? this.filterMarkByNameMatch(seriesName)[pointIndex] : markSeries[pointIndex];

	                $.extend(pointInfo, {
	                    markName: this.markField,
	                    markValue: markValue
	                });
	            }

	            if(this.isMultiSeries) {
	                $.extend(pointInfo, {
	                    labelSeriesName: this.labelField
	                });
	            }
	            return pointInfo;
	        },

	        filterDataByNameMatch: function(dataSeries, name) {
	            var labelData = this.dataSet.getSeries(this.labelField);
	            return _(dataSeries).filter(function(point, i) {
	                return labelData[i] === name;
	            });
	        },

	        filterMarkByNameMatch: function(name) {
	            var labelData = this.dataSet.getSeries(this.labelField),
	                markData = this.dataSet.getSeries(this.markField);

	            return _(markData).filter(function(point, i) {
	                return labelData[i] === name;
	            });
	        }

	    });
	            
	    return ScatterChart;
	            
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/ColumnSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/series/ManyShapeOptimizedSeries"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            ManyShapeOptimizedSeries,
	            langUtils
	        ) {

	    var ColumnSeries = function(properties) {
	        ManyShapeOptimizedSeries.call(this, properties);
	    };
	    langUtils.inherit(ColumnSeries, ManyShapeOptimizedSeries);

	    $.extend(ColumnSeries.prototype, {

	        CHARTING_PROPERTY_WHITELIST: _.union(['columnSpacing'], ManyShapeOptimizedSeries.prototype.CHARTING_PROPERTY_WHITELIST),

	        type: 'column',

	        getConfig: function() {
	            var config = ManyShapeOptimizedSeries.prototype.getConfig.call(this);
	            config.pointPadding = this.computeColumnSpacing(this.properties['columnSpacing']);
	            config.groupPadding = this.computeColumnGroupSpacing(this.properties['seriesSpacing']);

	            return config;
	        },

	        // SPL-68694, this should be a no-op for column series or it will interfere with click handlers
	        bringToFront: function() { }

	    });

	    return ColumnSeries;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/ManyShapeOptimizedSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("shim/highcharts"),
	            __webpack_require__("js_charting/series/Series"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/color_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Highcharts,
	            Series,
	            langUtils,
	            colorUtils
	        ) {

	    var ManyShapeOptimizedSeries = function(properties) {
	        Series.call(this, properties);
	        
	    };
	    langUtils.inherit(ManyShapeOptimizedSeries, Series);

	    $.extend(ManyShapeOptimizedSeries.prototype, {

	        CHARTING_PROPERTY_WHITELIST: _.union(['seriesSpacing'], Series.prototype.CHARTING_PROPERTY_WHITELIST),

	        DEFAULT_COLUMN_SPACING: 0.01,
	        DEFAULT_COLUMN_GROUP_SPACING: 0.05,
	        DEFAULT_BAR_SPACING: 0.02,
	        DEFAULT_BAR_GROUP_SPACING: 0.05,

	        getConfig: function() {
	            var config = Series.prototype.getConfig.apply(this, arguments);
	            config.drawGraphOverride = _(this.drawGraphOverride).bind(this);
	            config.drawTrackerOverride = _(this.drawTrackerOverride).bind(this);
	            config.drawPointsOverride = _(this.drawPointsOverride).bind(this);
	            config.getGraphPathOverride = _(this.getGraphPathOverride).bind(this);
	            return config;
	        },

	        // the columns will be drawn as a single <path> element using the area series drawGraph/drawTracker routine
	        // and the override of getGrapthPath below
	        drawGraphOverride: function(series) {
	            Highcharts.seriesTypes.area.prototype.drawGraph.call(series);
	        },

	        drawTrackerOverride: function(series) {
	            Highcharts.seriesTypes.area.prototype.drawTracker.call(series);
	        },

	        // no-op, since points are rendered as one single <path>
	        drawPointsOverride: function() { },

	        destroy: function() {
	            this.unSelectPoint();
	            Series.prototype.destroy.call(this);
	        },

	        getGraphPathOverride: function(series) {
	            _(series.points).each(function(point) {
	                var shapeArgs = point.shapeArgs,
	                    x = shapeArgs.x || 0,
	                    y = shapeArgs.y || 0,
	                    width = shapeArgs.width || 0,
	                    height = shapeArgs.height || 0;

	                series.areaPath.push(
	                    'M', x, y,
	                    'L', x + width, y,
	                    'L', x + width, y + height,
	                    'L', x, y + height,
	                    'Z'
	                );
	            });
	            series.singlePoints = [];
	            return [];
	        },

	        handlePointMouseOver: function(point) {
	            Series.prototype.handlePointMouseOver.call(this, point);
	            this.unHighlight();
	            this.selectPoint(point);
	        },

	        handlePointMouseOut: function(point) {
	            Series.prototype.handlePointMouseOut.call(this, point);
	            this.highlight();
	            this.unSelectPoint();
	        },

	        highlight: function() {
	            Series.prototype.highlight.call(this);
	            if(!this.hcSeries || !this.hcSeries.area) {
	                return;
	            }
	            var seriesColor = this.getColor();
	            this.hcSeries.area.attr({ fill: seriesColor, 'stroke-width': 0 });
	        },

	        unHighlight: function() {
	            Series.prototype.unHighlight.call(this);
	            this.unSelectPoint();
	            if(!this.hcSeries.area) {
	                return;
	            }
	            this.hcSeries.area.attr({
	                fill: this.UNHIGHLIGHTED_COLOR,
	                stroke: this.UNHIGHLIGHTED_BORDER_COLOR,
	                'stroke-width': 1
	            });
	        },

	        selectPoint: function(point) {
	            var matchingPoint = this.hcSeries.data[point.index],
	                shapeArgs = matchingPoint.shapeArgs,
	                renderer = this.hcSeries.chart.renderer,
	                seriesGroup = this.hcSeries.group;

	            this.selectedPointGraphic = renderer.rect(shapeArgs.x, shapeArgs.y, shapeArgs.width, shapeArgs.height)
	                .attr({ fill: this.getColor(), zIndex: 1 })
	                .add(seriesGroup);
	        },

	        unSelectPoint: function() {
	            if(this.selectedPointGraphic) {
	                this.selectedPointGraphic.destroy();
	                this.selectedPointGraphic = null;
	            }
	        },

	        computeColumnSpacing: function(str) {
	            var value = parseFloat(str);
	            if(_(value).isNaN()) {
	                return this.DEFAULT_COLUMN_SPACING;
	            }
	            return value * this.DEFAULT_COLUMN_SPACING;
	        },

	        computeColumnGroupSpacing: function(str) {
	            var value = parseFloat(str);
	            if(_(value).isNaN()) {
	                return this.DEFAULT_COLUMN_GROUP_SPACING;
	            }
	            return this.DEFAULT_COLUMN_GROUP_SPACING * (1 + value);
	        },

	        computeBarSpacing: function(str) {
	            var value = parseFloat(str);
	            if(_(value).isNaN()) {
	                return this.DEFAULT_BAR_SPACING;
	            }
	            return value * this.DEFAULT_BAR_SPACING;
	        },

	        computeBarGroupSpacing: function(str) {
	            var value = parseFloat(str);
	            if(_(value).isNaN()) {
	                return this.DEFAULT_BAR_GROUP_SPACING;
	            }
	            return this.DEFAULT_BAR_GROUP_SPACING * (1 + value);
	        }

	    });

	    return ManyShapeOptimizedSeries;
	    
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/Series":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/helpers/EventMixin"),
	            __webpack_require__("js_charting/helpers/Formatter"),
	            __webpack_require__("js_charting/util/color_utils"),
	            __webpack_require__("js_charting/util/parsing_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            EventMixin,
	            Formatter,
	            colorUtils,
	            parsingUtils
	        ) {

	    var Point = function(hcPoint) {
	        this.index = hcPoint.index;
	        this.seriesName = hcPoint.series.name;
	        this.name = hcPoint.name;
	        this.y = hcPoint.y;
	    };

	    var Series = function(properties) {
	        this.properties = this.normalizeProperties(properties || {});
	        this.processProperties();
	        this.id = _.uniqueId('series_');
	        this.data = [];
	        this._isDirty = false;
	        this._dataIsDirty = false;
	        this.UNHIGHLIGHTED_COLOR =
	            colorUtils.addAlphaToColor(this.UNHIGHLIGHTED_BASE_COLOR, this.UNHIGHLIGHTED_OPACITY);
	        this.UNHIGHLIGHTED_BORDER_COLOR =
	            colorUtils.addAlphaToColor(this.UNHIGHLIGHTED_BORDER_BASE_COLOR, this.UNHIGHLIGHTED_OPACITY);
	    };

	    Series.prototype = $.extend({}, EventMixin, {

	        STACK_MODE_MAP: {
	            'default': null,
	            'stacked': 'normal',
	            'stacked100': 'percent'
	        },
	        CHART_PROPERTY_PREFIX_REGEX: /^chart\./,

	        UNHIGHLIGHTED_OPACITY: 0.3,
	        UNHIGHLIGHTED_BASE_COLOR: 'rgb(150, 150, 150)',
	        UNHIGHLIGHTED_BORDER_BASE_COLOR: 'rgb(200, 200, 200)',
	        DEFAULT_STACK_MODE: null,
	        CHARTING_PROPERTY_WHITELIST: [],

	        // a centralized normalization method for series properties, subclasses override or extend the
	        // CHARTING_PROPERTY_WHITELIST with a list of property names (without the leading "chart.")
	        // to be parsed from the chart properties passed to the constructor
	        normalizeProperties: function(rawProps) {
	            var normalizedProps = $.extend(true, {}, rawProps);
	            _(normalizedProps).each(function(value, key) {
	                if(this.CHART_PROPERTY_PREFIX_REGEX.test(key)) {
	                    delete normalizedProps[key];
	                    var strippedKey = key.replace(this.CHART_PROPERTY_PREFIX_REGEX, '');
	                    if(_(this.CHARTING_PROPERTY_WHITELIST).contains(strippedKey)) {
	                        normalizedProps[strippedKey] = value;
	                    }
	                }
	            }, this);
	            return normalizedProps;
	        },

	        // no-op to be overridden by sub-classes
	        processProperties: function() { },

	        redraw: function(redrawChart) {
	            if(!this.hcSeries) {
	                // this is not an error state, there are cases where a new series is added dynamically in an update
	                return;
	            }
	            if(this.isDirty()) {
	                this.hcSeries.update(this.getConfig(), redrawChart);
	            }
	            else if(this.dataIsDirty()) {
	                this.hcSeries.setData(this.hasPrettyData ? this.prettyData : this.data, redrawChart);
	            }
	        },

	        update: function(properties) {
	            var oldProperties = this.properties;
	            this.properties = this.normalizeProperties(properties);
	            if(!_.isEqual(this.properties, oldProperties)) {
	                this.processProperties();
	                this._isDirty = true;
	            }
	        },

	        setData: function(inputData) {
	            var oldData = this.data;
	            if(_(inputData.x).isUndefined()) {
	                this.data = inputData.y;
	            }
	            else {
	                this.data = _(inputData.x).map(function(value, i) {
	                    return [value, inputData.y[i]];
	                });
	            }
	            if(!_.isEqual(this.data, oldData)) {
	                this._dataIsDirty = true;
	            }
	        },

	        getData: function() {
	            return this.data;
	        },

	        isDirty: function() {
	            return this._isDirty;
	        },

	        dataIsDirty: function() {
	            return this._dataIsDirty;
	        },

	        getXAxisIndex: function() {
	            return this.properties.xAxis || 0;
	        },

	        getYAxisIndex: function() {
	            return this.properties.yAxis || 0;
	        },

	        getName: function() {
	            return this.properties.name;
	        },

	        getLegendKey: function() {
	            return this.properties.legendKey || this.getName();
	        },

	        getFieldList: function() {
	            return [this.getName()];
	        },

	        matchesName: function(name) {
	            return name === this.getName();
	        },

	        applyColorMapping: function(colorMapping) {
	            var oldColor = this.color;
	            this.color = colorMapping[this.getName()];
	            if(this.color !== oldColor) {
	                this._isDirty = true;
	            }
	        },

	        getColor: function() {
	            return this.color;
	        },

	        getStackMode: function() {
	            return this.STACK_MODE_MAP[this.properties['stacking']] || this.DEFAULT_STACK_MODE;
	        },

	        getType: function() {
	            return this.type;
	        },

	        getConfig: function() {
	            return ({
	                type: this.type,
	                id: this.id,
	                name: this.getName(),
	                color: this.color,
	                data: this.hasPrettyData ? this.prettyData : this.data,
	                xAxis: this.getXAxisIndex(),
	                yAxis: this.getYAxisIndex(),
	                stacking: this.getStackMode()
	            });
	        },

	        onChartLoad: function(chart) { },

	        onChartLoadOrRedraw: function(chart) {
	            this.hcSeries = chart.get(this.id);
	            // create a back-reference so we can get from the HighCharts series to this object
	            this.hcSeries.splSeries = this;
	            this._isDirty = false;
	            this._dataIsDirty = false;
	            this.hcSeries.options.states.hover.enabled = true;
	            this.addEventHandlers(this.hcSeries);
	            // FIXME: would be nice to find a way around this
	            _(this.hcSeries.data).each(function(point, i) {
	                if(point){
	                    point.index = i;
	                }
	            });
	        },

	        addEventHandlers: function(hcSeries) {
	            hcSeries.options.point.events = hcSeries.options.point.events || {};
	            var that = this,
	                pointEvents = hcSeries.options.point.events;

	            pointEvents.mouseOver = function(e) {
	                var hcPoint = this,
	                    point = new Point(hcPoint);
	                that.trigger('mouseover', [point, that]);
	            };
	            pointEvents.mouseOut = function(e) {
	                var hcPoint = this,
	                    point = new Point(hcPoint);
	                that.trigger('mouseout', [point, that]);
	            };

	            if(parsingUtils.normalizeBoolean(this.properties['clickEnabled'])) {
	                pointEvents.click = function(e) {
	                    var hcPoint = this,
	                        point = new Point(hcPoint),
	                        clickEvent = {
	                            type: 'click',
	                            modifierKey: (e.ctrlKey || e.metaKey)
	                        };
	                    that.trigger(clickEvent, [point, that]);
	                };
	            }
	        },

	        destroy: function() {
	            this.off();
	            // remove the back-reference to avoid any reference loops that might confuse the GC
	            if(this.hcSeries && this.hcSeries.splSeries) {
	                this.hcSeries.splSeries = null;
	            }
	            this.hcSeries = null;
	        },

	        handlePointMouseOver: function(point) {
	            this.bringToFront();
	        },

	        handleLegendMouseOver: function(fieldName) {
	            this.bringToFront();
	            this.highlight();
	        },

	        bringToFront: function() {
	            if(this.hcSeries.group) {
	                this.hcSeries.group.toFront();
	            }
	            if(this.hcSeries.trackerGroup) {
	                this.hcSeries.trackerGroup.toFront();
	            }
	        },

	        estimateMaxColumnWidths: function(hcChart, leftColData, rightColData) {
	            var formatter = new Formatter(hcChart.renderer),
	                fontSize = hcChart.options.tooltip.style.fontSize.replace("px", "");

	            // Use the text in the columns to roughly estimate which column requires more space
	            var maxLeftColWidth = -Infinity,
	                maxRightColWidth = -Infinity;

	            _.each(leftColData, function(datum) {
	                var colWidth = formatter.predictTextWidth(datum, fontSize);
	                if(colWidth > maxLeftColWidth) {
	                    maxLeftColWidth = colWidth;
	                }
	            });

	            _.each(rightColData, function(datum) {
	                var colWidth = formatter.predictTextWidth(datum, fontSize);
	                if(colWidth > maxRightColWidth) {
	                    maxRightColWidth = colWidth;
	                }
	            });

	            formatter.destroy();

	            return { maxLeftColWidth: maxLeftColWidth, maxRightColWidth: maxRightColWidth };
	        },

	        // To be overridden by subclasses
	        getTooltipRows: function(info) {
	            var rows = [];
	            if(info.xAxisIsTime) {
	                rows.push([info.xValueDisplay]);
	            }
	            else {
	                rows.push([info.xAxisName, info.xValueDisplay]);
	            }
	            rows.push([ { color: info.seriesColor, text: info.seriesName }, info.yValueDisplay ]);
	            return rows;
	        },

	        // find a way to send the target series and target point to the handler just like a click event
	        getTooltipHtml: function(info, hcChart) {
	            info.seriesName = this.getName();
	            info.seriesColor = this.getColor();

	            var normalizeToText = function(cellInfo) {
	                return _(cellInfo).isString() ? cellInfo : cellInfo.text;
	            };

	            var normalizeToColor = function(cellInfo) {
	                return _(cellInfo).isString() ? null : cellInfo.color;
	            };

	            var tooltipRows = this.getTooltipRows(info),
	                maxTooltipWidth = hcChart.chartWidth - 50,
	                leftColData = _(tooltipRows).map(function(row) { return normalizeToText(row[0] || ''); }),
	                rightColData = _(tooltipRows).map(function(row) { return normalizeToText(row[1] || ''); }),
	                colResults = this.estimateMaxColumnWidths(hcChart, leftColData, rightColData),
	                leftColRatio = colResults.maxLeftColWidth / (colResults.maxLeftColWidth + colResults.maxRightColWidth);

	            // Make sure one column doesn't completely dominate the other
	            if(leftColRatio > 0.9) {
	                leftColRatio = 0.9;
	            }
	            else if(leftColRatio < 0.1) {
	                leftColRatio = 0.1;
	            }

	            info.scaledMaxLeftColWidth = (leftColRatio * maxTooltipWidth) + "px";
	            info.scaledMaxRightColWidth = ((1 - leftColRatio) * maxTooltipWidth) + "px";
	            info.willWrap = (colResults.maxLeftColWidth + colResults.maxRightColWidth > maxTooltipWidth);

	            return _(this.tooltipTemplate).template($.extend(info, {
	                rows: tooltipRows,
	                normalizeToText: normalizeToText,
	                normalizeToColor: normalizeToColor
	            }));
	        },

	        // stub methods to be overridden as needed by subclasses
	        handlePointMouseOut: function(point) { },
	        handleLegendMouseOut: function(fieldName) { },
	        highlight: function() { },
	        unHighlight: function() { },

	        tooltipTemplate: '\
	            <table class="highcharts-tooltip"\
	                <% if(willWrap) { %>\
	                    style="word-wrap: break-word; white-space: normal;"\
	                <% } %>>\
	                <% _(rows).each(function(row) { %>\
	                    <tr>\
	                        <% if(row.length === 1) { %>\
	                            <td style="text-align: left; color: <%= normalizeToColor(row[0]) || "#ffffff" %>;" colpsan="2"><%- normalizeToText(row[0]) %></td>\
	                        <% } else { %>\
	                            <td style="text-align: left; color: <%= normalizeToColor(row[0]) || "#cccccc" %>; max-width: <%= scaledMaxLeftColWidth %>;"><%- normalizeToText(row[0]) %>:&nbsp;&nbsp;</td>\
	                            <td style="text-align: right; color: <%= normalizeToColor(row[1]) || "#ffffff" %>; max-width: <%= scaledMaxRightColWidth %>;"><%- normalizeToText(row[1]) %></td>\
	                        <% } %>\
	                    </tr>\
	                <% }); %>\
	            </table>\
	        '

	    });

	    Series.Point = Point;

	    return Series;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "js_charting/series/BarSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/series/ManyShapeOptimizedSeries"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            ManyShapeOptimizedSeries,
	            langUtils
	        ) {

	    var BarSeries = function(properties) {
	        ManyShapeOptimizedSeries.call(this, properties);
	    };
	    langUtils.inherit(BarSeries, ManyShapeOptimizedSeries);

	    $.extend(BarSeries.prototype, {

	        CHARTING_PROPERTY_WHITELIST: _.union(['barSpacing'], ManyShapeOptimizedSeries.prototype.CHARTING_PROPERTY_WHITELIST),

	        type: 'bar',

	        getConfig: function() {
	            var config = ManyShapeOptimizedSeries.prototype.getConfig.call(this);
	            config.pointPadding = this.computeBarSpacing(this.properties['barSpacing']);
	            config.groupPadding = this.computeBarGroupSpacing(this.properties['seriesSpacing']);
	            return config;
	        },

	        // SPL-68694, this should be a no-op for bar series or it will interfere with click handlers
	        bringToFront: function() { }

	    });

	    return BarSeries;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/LineSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/series/SingleShapeSeries"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/parsing_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            SingleShapeSeries,
	            langUtils,
	            parsingUtils
	        ) {

	    var LineSeries = function(properties) {
	        SingleShapeSeries.call(this, properties);
	    };
	    langUtils.inherit(LineSeries, SingleShapeSeries);

	    $.extend(LineSeries.prototype, {

	        CHARTING_PROPERTY_WHITELIST:_.union(['showMarkers'], SingleShapeSeries.prototype.CHARTING_PROPERTY_WHITELIST),

	        type: 'line',

	        highlight: function() {
	            SingleShapeSeries.prototype.highlight.call(this);
	            if(this.hcSeries.graph) {
	                var seriesColor = this.getColor();
	                this.hcSeries.graph.attr({
	                    'stroke': seriesColor,
	                    'stroke-opacity': this.HIGHLIGHTED_OPACITY
	                });
	            }
	            _(this.hcSeries.data).each(this.highlightPoint, this);
	        },

	        unHighlight: function() {
	            SingleShapeSeries.prototype.unHighlight.call(this);
	            if(this.hcSeries.graph) {
	                this.hcSeries.graph.attr('stroke', this.UNHIGHLIGHTED_COLOR);
	            }
	            _(this.hcSeries.data).each(this.unHighlightPoint, this);
	        },

	        highlightPoint: function(hcPoint) {
	            var seriesColor = this.getColor();
	            if(hcPoint.graphic) {
	                hcPoint.graphic.attr('fill', seriesColor);
	            }
	        },

	        unHighlightPoint: function(hcPoint) {
	            if(hcPoint.graphic) {
	                hcPoint.graphic.attr('fill', this.UNHIGHLIGHTED_COLOR);
	            }
	        },

	        translatePostHook: function() {
	            if(this.hcSeries){
	                var chart = this.hcSeries.chart,
	                    xAxis = this.hcSeries.xAxis, 
	                    points = this.hcSeries.points;
	                // If the series is an overlay on a column chart and there is only 1 point displayed
	                // then we override the x-coordinates of the neightboring points so that the 1-point overlay is rendered correctly  
	                if(Math.round(xAxis.min) === Math.round(xAxis.max) && this.hcSeries.options.type === 'line'){
	                    var isOverlay = false, 
	                        allSeries = chart.series;
	                    for(var i = 0; i < chart.series.length; i++){
	                        if(chart.series[i].options.type === 'column'){
	                            isOverlay = true;
	                        }
	                    }
	                    if(isOverlay){
	                        var zoomedPointIndex = Math.round(xAxis.min);
	                        if(points[zoomedPointIndex - 1]){
	                            points[zoomedPointIndex - 1].plotX = points[zoomedPointIndex].plotX - xAxis.width;
	                        }
	                        if(points[zoomedPointIndex + 1]){
	                            points[zoomedPointIndex + 1].plotX = points[zoomedPointIndex].plotX + xAxis.width;
	                        }
	                    }
	                }    
	            } 
	        },

	        getConfig: function() {
	            var config = SingleShapeSeries.prototype.getConfig.call(this);
	            config.connectNulls = (this.properties['nullValueMode'] === 'connect');
	            $.extend(config,{
	                marker: {},
	                stacking: this.STACK_MODE_MAP['default'],
	                // line series has a higher z-index for chart overlay
	                zIndex: 2,
	                translatePostHook: _(this.translatePostHook).bind(this), 
	                dashStyle: this.properties['dashStyle']
	            });

	            config.marker.enabled = parsingUtils.normalizeBoolean(this.properties['showMarkers'], false);

	            return config;
	        }

	    });

	    return LineSeries;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/SingleShapeSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/series/Series"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Series,
	            langUtils
	        ) {

	    var SingleShapeSeries = function(properties) {
	        Series.call(this, properties);
	    };
	    langUtils.inherit(SingleShapeSeries, Series);

	    $.extend(SingleShapeSeries.prototype, {

	        CHARTING_PROPERTY_WHITELIST:_.union(
	            ['lineStyle', 'nullValueMode'],
	            Series.prototype.CHARTING_PROPERTY_WHITELIST
	        ),

	        HIGHLIGHTED_OPACITY: 1.0,

	        getConfig: function() {
	            var config = Series.prototype.getConfig.call(this);
	            config.dashStyle = (this.properties['lineStyle'] === 'dashed') ? 'Dash' : 'Solid';
	            config.pointPlacement = this.properties['pointPlacement'];
	            config.drawPointsPreHook = _(this.drawPointsPreHook).bind(this);
	            return config;
	        },

	        handlePointMouseOver: function(point) {
	            Series.prototype.handlePointMouseOver.call(this, point);
	            this.highlight();
	        },

	        drawPointsPreHook: function(series) {
	            // SPL-55213, we want to handle the case where some segments contain a single point and would not be visible
	            // if showMarkers is true, the marker will take care of what we want, so we're done
	            if(series.options.marker && series.options.marker.enabled) {
	                return;
	            }
	            var i, segment,
	                segments = series.segments;

	            for(i = 0; i < segments.length; i++) {
	                // a segments with a length of one contains a single point
	                // extend the point's options to draw a small marker on it
	                segment = segments[i];
	                if(segment.length === 1) {
	                    segment[0].update({
	                        marker: {
	                            enabled: true,
	                            radius: 4
	                        }
	                    }, false);
	                }
	            }
	        }

	    });

	    return SingleShapeSeries;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/AreaSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/series/SingleShapeSeries"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/color_utils"),
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("js_charting/util/math_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            SingleShapeSeries,
	            langUtils,
	            colorUtils,
	            parsingUtils,
	            mathUtils
	        ) {

	    var AreaSeries = function(properties) {
	        SingleShapeSeries.call(this, properties);
	        this.UNHIGHLIGHTED_LINE_COLOR =
	            colorUtils.addAlphaToColor(this.UNHIGHLIGHTED_BASE_COLOR, this.UNHIGHLIGHTED_LINE_OPACITY);
	    };
	    langUtils.inherit(AreaSeries, SingleShapeSeries);

	    $.extend(AreaSeries.prototype, {

	        HIGHLIGHTED_OPACITY: 0.75,
	        UNHIGHLIGHTED_LINE_OPACITY: 0.4,

	        CHARTING_PROPERTY_WHITELIST:_.union(['showLines', 'areaFillOpacity'], SingleShapeSeries.prototype.CHARTING_PROPERTY_WHITELIST),

	        type: 'area',

	        processProperties: function() {
	            var rawFillOpacity = mathUtils.parseFloat(this.properties.areaFillOpacity);
	            this.fillOpacity = (rawFillOpacity <= 1 && rawFillOpacity >= 0) ? rawFillOpacity : this.HIGHLIGHTED_OPACITY;
	        },

	        getConfig: function() {
	            var config = SingleShapeSeries.prototype.getConfig.call(this);
	            config.fillOpacity = this.fillOpacity;
	            config.connectNulls = (this.properties['nullValueMode'] === 'connect');
	            config.lineWidth = parsingUtils.normalizeBoolean(this.properties['showLines'], true) ? 1 : 0;
	            return config;
	        },

	        onChartLoadOrRedraw: function(chart) {
	            SingleShapeSeries.prototype.onChartLoadOrRedraw.call(this, chart);
	            this.hasLines = (this.hcSeries.options.lineWidth > 0);
	            // FIXME: shouldn't have to do this here, try to make it work with highcharts settings
	            this.hcSeries.area.attr('fill-opacity', this.fillOpacity);
	        },

	        highlight: function() {
	            SingleShapeSeries.prototype.highlight.call(this);
	            var seriesColor = this.getColor();
	            this.hcSeries.area.attr({
	                'fill': seriesColor,
	                'fill-opacity': this.fillOpacity
	            });
	            if(this.hcSeries.graph && this.hasLines) {
	                this.hcSeries.graph.attr({
	                    'stroke': seriesColor,
	                    'stroke-opacity': 1
	                });
	            }
	        },

	        unHighlight: function() {
	            SingleShapeSeries.prototype.unHighlight.call(this);
	            this.hcSeries.area.attr({
	                'fill': this.UNHIGHLIGHTED_COLOR
	            });
	            if(this.hcSeries.graph && this.hasLines) {
	                this.hcSeries.graph.attr('stroke', this.UNHIGHLIGHTED_LINE_COLOR);
	            }
	        }

	    });

	    return AreaSeries;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/PieSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/series/Series"),
	            __webpack_require__("js_charting/series/ManyShapeSeries"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("js_charting/util/time_utils"),
	            __webpack_require__("util/time"),
	            __webpack_require__("stubs/i18n")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Series,
	            ManyShapeSeries,
	            langUtils,
	            parsingUtils,
	            timeUtils,
	            splunkTimeUtils,
	            i18n
	        ) {

	    var PieSeries = function(properties) {
	        ManyShapeSeries.call(this, properties);
	    };
	    langUtils.inherit(PieSeries, ManyShapeSeries);

	    $.extend(PieSeries.prototype, {

	        UNHIGHLIGHTED_OPACITY: 1,
	        UNHIGHLIGHTED_BASE_COLOR: 'rgb(225, 225, 225)',

	        CHARTING_PROPERTY_WHITELIST: _.union(
	            ['sliceCollapsingThreshold', 'sliceCollapsingLabel', 'showPercent'],
	            ManyShapeSeries.prototype.CHARTING_PROPERTY_WHITELIST
	        ),

	        type: 'pie',
	        hasPrettyData: false,

	        fieldList: [],

	        processProperties: function() {
	            this.collapseFieldName = this.properties.sliceCollapsingLabel || 'other';
	            this.collapsePercent = 0.01; 
	            if (this.properties.hasOwnProperty('sliceCollapsingThreshold') ){
	                var collapsePercentInput = parseFloat(this.properties.sliceCollapsingThreshold);
	                if (collapsePercentInput >= 0 && collapsePercentInput <=1){
	                    this.collapsePercent = collapsePercentInput;
	                }  
	            }
	        },

	        getConfig: function() {
	            return $.extend(ManyShapeSeries.prototype.getConfig.call(this), {
	                translatePreHook: _(this.translatePreHook).bind(this)
	            });
	        },

	        setData: function(inputData) {
	            var oldData = this.data;
	            this.data = [];
	            this.prettyData = [];
	            var that = this,
	                nameSeries = inputData.names,
	                sizeSeries = inputData.sizes,
	                spanSeries = inputData.spans,
	                isTimeBased = inputData.isTimeBased,
	                totalSize = _(sizeSeries).reduce(function(sum, value) { return (sum + value); }, 0),
	                cardinality = sizeSeries.length,
	                collapsedSize = 0,
	                numCollapsed = 0,
	                numLessThanThresh = 0,
	                granularity = null,

	                passesThreshold = function(value) {
	                    return (value > 0 && (value / totalSize) > that.collapsePercent);
	                };

	            if(isTimeBased) {
	                granularity = splunkTimeUtils.determineLabelGranularity(nameSeries);
	                this.hasPrettyData = true;
	            }

	            this.fieldList = _(nameSeries).map(parsingUtils.escapeSVG, parsingUtils);
	            _(sizeSeries).each(function(value, i) {
	                if(!(passesThreshold(sizeSeries[i]))) {
	                    numLessThanThresh++;
	                }
	            }, this);

	            _(nameSeries).each(function(name, i) {
	                var sizeValue = sizeSeries[i];
	                if(passesThreshold(sizeValue) || numLessThanThresh === 1 || cardinality <=10) {                    
	                    if(isTimeBased) {
	                        var bdTime = splunkTimeUtils.extractBdTime(name),
	                            humanizedName = timeUtils.formatBdTimeAsAxisLabel(bdTime, null, granularity).join(' '),
	                            spanValue = spanSeries[i];
	                        this.data.push([name, sizeValue, spanValue]);
	                        this.prettyData.push([humanizedName, sizeValue, spanValue]);
	                    }
	                    else {
	                        this.data.push([name, sizeValue]);
	                    }
	                }
	                else {
	                    collapsedSize += sizeValue;
	                    numCollapsed++;
	                    this.fieldList = _(this.fieldList).without(name);
	                }
	            }, this);

	            if(numCollapsed > 0) {
	                var collapsedName = this.collapseFieldName + ' (' + numCollapsed + ')';
	                this.data.push([collapsedName, collapsedSize]);
	                // Doesn't make sense to attach a span value to the collapsed section
	                this.prettyData.push([collapsedName, collapsedSize, null]);
	                this.fieldList.push('__other');
	            }

	            if(!_.isEqual(this.data, oldData)) {
	                this._dataIsDirty = true;
	            }
	        },

	        getFieldList: function() {
	            return this.fieldList;
	        },

	        // returns the series data after any processing (like slice collapsing) has been applied
	        getData: function() {
	            return this.data;
	        },

	        getPrettyData: function() {
	            return this.prettyData;
	        },

	        highlightPoint: function(hcPoint) {
	            if(!hcPoint.graphic) {
	                return;
	            }
	            var pointColor = hcPoint.color;
	            hcPoint.graphic.attr({
	                'fill': pointColor,
	                'stroke-width': 0,
	                'stroke': pointColor
	            });
	        },

	        getTooltipRows: function(info) {
	            return ([
	                [info.sliceFieldName, info.sliceName],
	                [{ text: info.seriesName, color: info.sliceColor }, info.yValue],
	                [{ text: info.seriesName + "%", color: info.sliceColor }, info.yPercent]
	            ]);
	        },

	        /**
	         * @author sfishel
	         *
	         * Dynamically adjust the pie size based on the height and width of the container.
	         * If labels are showing, don't allow it to take up more than one third of the width.
	         */

	        translatePreHook: function(pieSeries) {
	            var chart = pieSeries.chart;
	            if(pieSeries.options.dataLabels.enabled) {
	                pieSeries.options.size = Math.min(chart.plotHeight * 0.75, chart.plotWidth / 3);
	            }
	            else {
	                pieSeries.options.size = Math.min(chart.plotHeight * 0.75, chart.plotWidth * 0.75);
	            }
	        }

	    });
	    
	    return PieSeries;
	    
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/ManyShapeSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("shim/highcharts"),
	            __webpack_require__("js_charting/series/Series"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Highcharts,
	            Series,
	            langUtils
	        ) {

	    var ManyShapeSeries = function(properties) {
	        Series.call(this, properties);
	    };
	    langUtils.inherit(ManyShapeSeries, Series);

	    $.extend(ManyShapeSeries.prototype, {

	        CHARTING_PROPERTY_WHITELIST: _.union(['seriesSpacing'], Series.prototype.CHARTING_PROPERTY_WHITELIST),

	        destroy: function() {
	            this.unSelectPoint();
	            Series.prototype.destroy.call(this);
	        },

	        handlePointMouseOver: function(point) {
	            Series.prototype.handlePointMouseOver.call(this, point);
	            this.selectPoint(point);
	        },

	        handlePointMouseOut: function(point) {
	            Series.prototype.handlePointMouseOut.call(this, point);
	            this.unSelectPoint(point);
	        },

	        selectPoint: function(point) {
	            var matchingPoint = this.hcSeries.data[point.index];
	            this.highlightPoint(matchingPoint);
	            _(this.hcSeries.data).chain().without(matchingPoint).each(this.unHighlightPoint, this);
	        },

	        unSelectPoint: function(point) {
	            if(!point){
	                return;
	            }
	            var matchingPoint = this.hcSeries.data[point.index];
	            _(this.hcSeries.data).chain().without(matchingPoint).each(this.highlightPoint, this);
	        },

	        highlight: function() {
	            Series.prototype.highlight.call(this);
	            _(this.hcSeries.data).each(this.highlightPoint, this);
	        },

	        unHighlight: function() {
	            Series.prototype.unHighlight.call(this);
	            _(this.hcSeries.data).each(this.unHighlightPoint, this);
	        },

	        highlightPoint: function(hcPoint) {
	            if(!hcPoint.graphic) {
	                return;
	            }
	            var seriesColor = this.getColor();
	            hcPoint.graphic.attr({
	                'fill': seriesColor,
	                'fill-opacity': this.HIGHLIGHTED_OPACITY,
	                'stroke': seriesColor
	            });
	        },

	        unHighlightPoint: function(hcPoint) {
	            if(!hcPoint.graphic) {
	                return;
	            }
	            hcPoint.graphic.attr({
	                'fill': this.UNHIGHLIGHTED_COLOR,
	                'stroke-width': 1,
	                'stroke': this.UNHIGHLIGHTED_BORDER_COLOR
	            });
	        }

	    });

	    return ManyShapeSeries;
	    
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/ScatterSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("shim/highcharts"),
	            __webpack_require__("js_charting/series/ManyShapeOptimizedSeries"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Highcharts,
	            ManyShapeOptimizedSeries,
	            langUtils
	        ) {

	    var ScatterSeries = function(properties) {
	        ManyShapeOptimizedSeries.call(this, properties);
	    };
	    langUtils.inherit(ScatterSeries, ManyShapeOptimizedSeries);

	    $.extend(ScatterSeries.prototype, {

	        type: 'scatter',

	        getConfig: function() {
	            var config = ManyShapeOptimizedSeries.prototype.getConfig.apply(this, arguments);
	            config.pointActionsPreHook = _(this.pointActionsPreHook).bind(this);
	            config.renderPostHook = _(this.renderPostHook).bind(this);
	            return config;
	        },

	        getGraphPathOverride: function(series) {
	            var UNDEFINED,
	                NORMAL_STATE = '',
	                SELECT_STATE = 'select',
	                chart = series.chart;

	            _(series.points).each(function(point) {
	                // BEGIN code borrowed from Highcharts Series#drawPoints
	                var plotX = Math.floor(point.plotX), // #1843
	                    plotY = point.plotY,
	                    pointMarkerOptions = point.marker || {},
	                    isInside = chart.isInsidePlot(Math.round(plotX), plotY, chart.inverted); // #1858

	                // only draw the point if y is defined
	                if(series.options.marker && plotY !== UNDEFINED && !isNaN(plotY) && point.y !== null) {

	                    // shortcuts
	                    var pointAttr = point.pointAttr[point.selected ? SELECT_STATE : NORMAL_STATE],
	                        radius = pointAttr.r,
	                        symbol = Highcharts.pick(pointMarkerOptions.symbol, series.symbol);

	                    if(isInside && radius > 0) {
	                        // END code from Series#drawPoints, the following is custom rendering code...
	                        // TODO: this assumes the symbol can be rendered with a <path>, will break for circles or images
	                        var symbolPath = chart.renderer.symbols[symbol](
	                            plotX - radius,
	                            plotY - radius,
	                            2 * radius,
	                            2 * radius
	                        );
	                        series.areaPath.push.apply(series.areaPath, symbolPath);
	                    }
	                }
	            });
	            series.singlePoints = [];
	            return [];
	        },

	        renderPostHook: function(series) {
	            // SPL-79730, the series group (which contains the mouse tracker) needs to be in front of the marker group
	            // otherwise when a hover event happens the marker blocks the tracker and triggers a mouse out
	            if(series.group) {
	                series.group.toFront();
	            }
	        },

	        pointActionsPreHook: function(series, e) {
	            var i, l, hoverPoint,
	                chart = series.chart,
	                pointer = chart.pointer,
	                eX = e.chartX - chart.plotLeft,
	                eY = e.chartY - chart.plotTop,
	                markerRadius = series.options.marker.radius,
	                markerPadding = 5,
	                pointEffectiveRadius = markerRadius + markerPadding,
	                tooltipIndex = pointer.getIndex(e);

	            // memoize sorting the series points by their chartX value
	            if(!series._sortedPoints) {
	                series._sortedPoints = _(series.points).sortBy('plotX');
	            }

	            // find the index of the first point in the sorted array that has an x value that overlaps the mouse event
	            var point, pointX,
	                pointsInXRange = [],
	                xRangeStartIndex = _(series._sortedPoints).sortedIndex({ plotX: eX - pointEffectiveRadius }, 'plotX');

	            // from that first point index, walk forward and find all points that overlap the mouse event
	            for(i = xRangeStartIndex, l = series._sortedPoints.length; i < l; i++) {
	                point = series._sortedPoints[i];
	                pointX = point.plotX;
	                if(pointX <= eX + pointEffectiveRadius) {
	                    pointsInXRange.push(point);
	                }
	                else {
	                    break;
	                }
	            }

	            // if only one point matched, it is the hover point
	            if(pointsInXRange.length === 1) {
	                hoverPoint = pointsInXRange[0];
	            }
	            // otherwise, find the best match for the mouse event's y co-ordinate
	            else {
	                hoverPoint = _(pointsInXRange).min(function(point) { return Math.abs(point.plotY - eY); });
	            }

	            // make sure the point that should be hovered is at the correct index in the series tooltipPoints array
	            series.tooltipPoints = series.tooltipPoints || [];
	            series.tooltipPoints[tooltipIndex] = hoverPoint;
	        },

	        // Highcharts will create a stateMarkerGraphic to show the selected state of the point
	        // per SPL-79730, move that element to show up on top of the existing point but under the mouse tracker
	        selectPoint: function(point) {
	            var matchingPoint = this.hcSeries.data[point.index],
	                matchingSeries = matchingPoint.series;

	            if(matchingSeries.stateMarkerGraphic) {
	                this.selectedPointGraphic = matchingSeries.stateMarkerGraphic;
	                // remove Highcharts's reference so it doesn't try to destroy the marker
	                matchingSeries.stateMarkerGraphic = null;
	                $(this.selectedPointGraphic.element).insertBefore(matchingSeries.tracker.element);
	            }
	        },

	        getTooltipRows: function(info) {
	            var rows = [];
	            if(info.isMultiSeries) {
	                rows.push([info.labelSeriesName, { text: info.seriesName, color: info.seriesColor }]);
	            }
	            if(info.markName) {
	                rows.push([info.markName, info.markValue]);
	            }
	            rows.push(
	                [info.xAxisName, info.xValue],
	                [info.yAxisName, info.yValue]
	            );
	            return rows;
	        }

	    });

	    return ScatterSeries;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/BubbleSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/series/ManyShapeSeries"),
	            __webpack_require__("js_charting/series/ScatterSeries"),
	            __webpack_require__("js_charting/series/Series"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            ManyShapeSeries,
	            ScatterSeries,
	            Series,
	            langUtils
	        ) {

	    var BubbleSeries = function(container, properties) {
	        ManyShapeSeries.call(this, container, properties);
	    };
	    langUtils.inherit(BubbleSeries, ManyShapeSeries);

	    $.extend(BubbleSeries.prototype, {

	        HIGHLIGHTED_OPACITY: 0.5,

	        type: 'bubble',

	        setData: function(inputData) {
	            var oldData = this.data;
	            this.data = _(inputData.x).map(function(value, i) {
	                return [value, inputData.y[i], inputData.z[i]];                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           
	            });
	            if(!_.isEqual(this.data, oldData)) {
	                this._dataIsDirty = true;
	            }
	        },

	        getTooltipRows: function(info) {
	            var rows = ScatterSeries.prototype.getTooltipRows.apply(this, arguments);
	            rows.push([info.zAxisName, info.zValue]);
	            return rows;
	        }
	    });

	    return BubbleSeries;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/RangeSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/series/AreaSeries"),
	            __webpack_require__("js_charting/series/LineSeries"),
	            __webpack_require__("js_charting/series/MultiSeries"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            AreaSeries,
	            LineSeries,
	            MultiSeries,
	            langUtils
	        ) {

	    var LowerRangeSeries = function(properties) {
	        this.threshold = 0;
	        AreaSeries.call(this, properties);
	    };
	    langUtils.inherit(LowerRangeSeries, AreaSeries);

	    $.extend(LowerRangeSeries.prototype, {

	        HIGHLIGHTED_OPACITY: 0,
	        UNHIGHLIGHTED_OPACITY: 0,
	        UNHIGHLIGHTED_LINE_OPACITY: 0.25,

	        normalizeProperties: function(rawProps) {
	            return $.extend({}, AreaSeries.prototype.normalizeProperties.apply(this, arguments), {
	                lineStyle: 'dashed',
	                stacking: 'stacked'
	            });
	        },

	        setData: function(inputData) {
	            AreaSeries.prototype.setData.call(this, inputData);
	            var minValue = _(inputData.y).min();
	            var oldThreshold = this.threshold;
	            this.threshold = Math.min(minValue, 0);
	            if(this.threshold !== oldThreshold) {
	                this._isDirty = true;
	            }
	        },

	        getConfig: function() {
	            var config = AreaSeries.prototype.getConfig.call(this);
	            config.showInLegend = false;
	            config.threshold = this.threshold;
	            config.stack = this.properties.stack;
	            return config;
	        }

	    });

	    var UpperRangeSeries = function(properties) {
	        AreaSeries.call(this, properties);
	    };
	    langUtils.inherit(UpperRangeSeries, AreaSeries);

	    $.extend(UpperRangeSeries.prototype, {

	        HIGHLIGHTED_OPACITY: 0.25,
	        UNHIGHLIGHTED_OPACITY: 0.1,
	        UNHIGHLIGHTED_LINE_OPACITY: 0.25,

	        normalizeProperties: function(rawProps) {
	            return $.extend({}, AreaSeries.prototype.normalizeProperties.apply(this, arguments), {
	                lineStyle: 'dashed',
	                stacking: 'stacked'
	            });
	        },

	        getConfig: function() {
	            var config = AreaSeries.prototype.getConfig.call(this);
	            config.showInLegend = false;
	            config.stack = this.properties.stack;
	            return config;
	        }

	    });

	    var RangeSeries = function(properties) {
	        MultiSeries.call(this, properties);
	        this.rangeStackId = _.uniqueId('rangeStack_');

	        this.predictedSeries = new LineSeries(this.getPredictedSeriesProperties());
	        this.lowerSeries = new LowerRangeSeries(this.getLowerSeriesProperties());
	        this.upperSeries = new UpperRangeSeries(this.getUpperSeriesProperties());
	        this.nestedSeriesList = [this.upperSeries, this.lowerSeries, this.predictedSeries];
	        this.bindNestedSeries();
	    };
	    langUtils.inherit(RangeSeries, MultiSeries);

	    $.extend(RangeSeries.prototype, {

	        type: 'range',

	        update: function(properties) {
	            this.properties = this.normalizeProperties(properties);
	            this.predictedSeries.update(this.getPredictedSeriesProperties());
	            this.lowerSeries.update(this.getLowerSeriesProperties());
	            this.upperSeries.update(this.getUpperSeriesProperties());
	        },

	        setData: function(inputData) {
	            this.predictedSeries.setData({
	                y: inputData.predicted,
	                x: inputData.x
	            });
	            this.lowerSeries.setData({
	                y: inputData.lower,
	                x: inputData.x
	            });

	            // TODO: will this work for log scale?
	            inputData.upper = _(inputData.upper).map(function(point, i) {
	                if(_(point).isNull()) {
	                    return null;
	                }
	                var diff = point - inputData.lower[i];
	                return Math.max(diff, 0);
	            });
	            this.upperSeries.setData({
	                y: inputData.upper,
	                x: inputData.x
	            });
	        },

	        getPredictedSeriesProperties: function() {
	            return this.properties;
	        },

	        getLowerSeriesProperties: function() {
	            return $.extend({}, this.properties, {
	                name: this.properties.names.lower,
	                legendKey: this.predictedSeries.getLegendKey(),
	                stack: this.rangeStackId
	            });
	        },

	        getUpperSeriesProperties: function() {
	            return $.extend({}, this.properties, {
	                name: this.properties.names.upper,
	                legendKey: this.predictedSeries.getLegendKey(),
	                stack: this.rangeStackId
	            });
	        },

	        getFieldList: function() {
	            return this.predictedSeries.getFieldList();
	        },

	        // to get the right color effects, we have to force the upper and lower series
	        // to take on the same color as the predicted series
	        applyColorMapping: function(colorMapping) {
	            this.predictedSeries.applyColorMapping(colorMapping);
	            var predictedColor = this.predictedSeries.getColor(),
	                lowerSeriesColorMapping = {},
	                upperSeriesColorMapping = {};

	            lowerSeriesColorMapping[this.lowerSeries.getName()] = predictedColor;
	            this.lowerSeries.applyColorMapping(lowerSeriesColorMapping);

	            upperSeriesColorMapping[this.upperSeries.getName()] = predictedColor;
	            this.upperSeries.applyColorMapping(upperSeriesColorMapping);
	        },

	        handlePointMouseOver: function(point) {
	            this.bringToFront();
	            this.highlight();
	        },

	        handlePointMouseOut: function(point) { },

	        handleLegendMouseOver: function(fieldName) {
	            this.bringToFront();
	            this.highlight();
	        },

	        handleLegendMouseOut: function(fieldName) { }

	    });
	    
	    return RangeSeries;
	    
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/MultiSeries":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/series/Series"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Series,
	            langUtils
	        ) {

	    var MultiSeries = function(properties) {
	        Series.call(this, properties);
	        this.nestedSeriesList = [];
	    };
	    langUtils.inherit(MultiSeries, Series);

	    $.extend(MultiSeries.prototype, {

	        // leave any normalization to child series
	        normalizeProperties: function(rawProps) {
	            return rawProps;
	        },

	        isDirty: function() {
	            return _(this.nestedSeriesList).any(function(series) { return series.isDirty(); });
	        },

	        dataIsDirty: function() {
	            return _(this.nestedSeriesList).any(function(series) { return series.dataIsDirty(); });
	        },

	        getFieldList: function() {
	            return _(this.nestedSeriesList).invoke('getFieldList');
	        },

	        applyColorMapping: function(colorMapping) {
	            _(this.nestedSeriesList).invoke('applyColorMapping', colorMapping);
	        },

	        matchesName: function(name) {
	            return _(this.nestedSeriesList).any(function(series) {
	                return series.matchesName(name);
	            });
	        },

	        getConfig: function() {
	            return _(this.nestedSeriesList).invoke('getConfig');
	        },

	        bindNestedSeries: function() {
	            var that = this;
	            _(this.nestedSeriesList).each(function(series) {
	                series.on('mouseover', function(e, point, targetSeries) {
	                    that.trigger(e, [point, targetSeries]);
	                });
	                series.on('mouseout', function(e, point, targetSeries) {
	                    that.trigger(e, [point, targetSeries]);
	                });
	                series.on('click', function(e, point, targetSeries) {
	                    that.trigger(e, [point, targetSeries]);
	                });
	            });
	        },

	        handlePointMouseOver: function(point) {
	            var seriesName = point.seriesName;
	            _(this.nestedSeriesList).each(function(series) {
	                if(series.matchesName(seriesName)) {
	                    series.handlePointMouseOver(point);
	                }
	                else {
	                    series.unHighlight();
	                }
	            });
	        },

	        handlePointMouseOut: function(point) {
	            var seriesName = point.seriesName;
	            _(this.nestedSeriesList).each(function(series) {
	                if(series.matchesName(seriesName)) {
	                    series.handlePointMouseOut(point);
	                }
	                else {
	                    series.highlight();
	                }
	            });
	        },

	        handleLegendMouseOver: function(fieldName) {
	            _(this.nestedSeriesList).each(function(series) {
	                if(series.matchesName(fieldName)) {
	                    series.handleLegendMouseOver(fieldName);
	                }
	                else {
	                    series.unHighlight();
	                }
	            });
	        },

	        handleLegendMouseOut: function(fieldName) {
	            _(this.nestedSeriesList).each(function(series) {
	                if(series.matchesName(fieldName)) {
	                    series.handleLegendMouseOut(fieldName);
	                }
	                else {
	                    series.highlight();
	                }
	            });
	        },

	        onChartLoad: function(chart) {
	            _(this.nestedSeriesList).invoke('onChartLoad', chart);
	        },

	        onChartLoadOrRedraw: function(chart) {
	            _(this.nestedSeriesList).invoke('onChartLoadOrRedraw', chart);
	        },

	        redraw: function(redrawChart) {
	            _(this.nestedSeriesList).invoke('redraw', redrawChart);
	        },

	        destroy: function() {
	            this.off();
	            _(this.nestedSeriesList).invoke('destroy');
	        },

	        bringToFront: function() {
	            _(this.nestedSeriesList).invoke('bringToFront');
	        },

	        highlight: function() {
	            _(this.nestedSeriesList).invoke('highlight');
	        },

	        unHighlight: function() {
	            _(this.nestedSeriesList).invoke('unHighlight');
	        }

	    });

	    return MultiSeries;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/util/testing_utils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("shim/splunk"),
	            __webpack_require__("js_charting/util/dom_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Splunk,
	            domUtils
	        ) {

	    var getPointCoordinates = function(hcChart, seriesIndex, pointIndex) {
	        var series = hcChart.series[seriesIndex],
	            seriesType = series.type,
	            point = series.data[pointIndex],
	            containerOffset = $(hcChart.container).offset();

	        if(seriesType in { line: true, area: true, scatter: true }) {
	            // handle the chart overlay case for bar charts
	            if(hcChart.inverted) {
	                return ({
	                    x: series.yAxis.translate(point.y) + containerOffset.left + hcChart.plotLeft,
	                    y: hcChart.plotHeight + hcChart.plotTop + containerOffset.top - series.xAxis.translate(point.x)
	                });
	            }
	            return ({
	                x: point.plotX + containerOffset.left + hcChart.plotLeft,
	                y: point.plotY + containerOffset.top + hcChart.plotTop
	            });
	        }
	        if(seriesType === 'column') {
	            var shapeArgs = point.shapeArgs;
	            return ({
	                x: point.plotX + containerOffset.left + hcChart.plotLeft,
	                y: point.plotY + containerOffset.top + hcChart.plotTop + (shapeArgs.height / 2)
	            });
	        }
	        if(seriesType === 'bar') {
	            return ({
	                x: containerOffset.left + hcChart.plotLeft + hcChart.plotWidth - point.shapeArgs.y - (point.shapeArgs.height / 2),
	                y: containerOffset.top + hcChart.plotTop + hcChart.plotHeight - series.xAxis.translate(point.x) - (series.barW / 2) - series.pointXOffset
	            });
	        }
	        if(seriesType === 'pie') {
	            var centerX = series.center[0],
	                centerY = series.center[1],
	                labelX = point.labelPos[0],
	                labelY = point.labelPos[1];

	            return ({
	                x: (centerX + labelX) / 2 + containerOffset.left + hcChart.plotLeft,
	                y: (centerY + labelY) / 2 + containerOffset.top + hcChart.plotTop
	            });
	        }
	        return {};
	    };

	    var initializeTestingMetaData = function(chartWrapper, xFields, type){
	        chartWrapper.$container.addClass('highcharts-wrapper');
	        // make sure the wrapper container has an id, this will be used in createGlobalReference
	        if(!chartWrapper.$container.attr('id')) {
	            chartWrapper.$container.attr('id', chartWrapper.id);
	        }
	        var chart = chartWrapper.hcChart;
	        $(chart.container).addClass(type);
	        addDataClasses(chart);
	        addAxisClasses(chart);
	        if(chart.options.legend.enabled) {
	            addLegendClasses(chart);
	        }
	        if(chart.tooltip && chart.tooltip.refresh) {
	            var tooltipRefresh = chart.tooltip.refresh,
	                decorateTooltip = (_.find(xFields, function(field){ return (field === '_time'); }) === '_time') ?
	                                        addTimeTooltipClasses : addTooltipClasses;

	            chart.tooltip.refresh = function(point) {
	                tooltipRefresh.call(chart.tooltip, point);
	                decorateTooltip(chart);
	            };
	        }
	        chart.getPointCoordinates = _(getPointCoordinates).bind(null, chart);
	    };

	    var addDataClasses = function(chart) {
	        var seriesName,
	            dataElements;

	        $('.highcharts-series', $(chart.container)).each(function(i, series) {
	            seriesName = chart.series[i].name;
	            $(series).attr('id', seriesName + '-series');
	            dataElements = $('rect, path', $(series));
	            dataElements.each(function(j, elem) {
	                addClassToElement(elem, 'spl-display-object');
	            });
	        });
	    };

	    var addAxisClasses = function(chart) {
	        var labelElements, i;
	        _(chart.xAxis).each(function(axis, i) {
	            var className = chart.inverted ? 'vertical-axis' : 'horizontal-axis';
	            addClassToElement(axis.axisGroup.element, className);
	            addClassToElement(axis.labelGroup.element, className);
	            addClassToElement(axis.gridGroup.element, 'x-axis-' + i + '-grid-group');
	        });
	        _(chart.yAxis).each(function(axis, i) {
	            var className = chart.inverted ? 'horizontal-axis' : 'vertical-axis';
	            addClassToElement(axis.axisGroup.element, className);
	            addClassToElement(axis.labelGroup.element, className);
	            addClassToElement(axis.gridGroup.element, 'y-axis-' + i + '-grid-group');
	        });
	        $('.highcharts-axis, .highcharts-axis-labels', $(chart.container)).each(function(i, elem) {
	            labelElements = $('text', $(elem));
	            labelElements.each(function(j, label) {
	                addClassToElement(label, 'spl-text-label');
	            });
	        });

	        var labelAxisTickmarks = function(axis) {
	            _(axis.ticks).each(function(tick) {
	                if(tick.mark && tick.mark.element) {
	                    addClassToElement(tick.mark.element, 'highcharts-axis-tickmark');
	                }
	            });
	        };

	        for(i = 0; i < chart.xAxis.length; i++) {
	            if(chart.xAxis[i].axisTitle) {
	                addClassToElement(chart.xAxis[i].axisTitle.element, 'x-axis-title');
	            }
	            labelAxisTickmarks(chart.xAxis[i]);
	        }
	        for(i = 0; i < chart.yAxis.length; i++) {
	            if(chart.yAxis[i].axisTitle) {
	                addClassToElement(chart.yAxis[i].axisTitle.element, 'y-axis-title');
	            }
	            labelAxisTickmarks(chart.yAxis[i]);
	        }
	    };

	    var addTooltipClasses = function(chart) {
	        var i, loopSplit, loopKeyName, loopKeyElem, loopValElem, toolTipCells,
	            $tooltip = $('.highcharts-tooltip'),
	            tooltipElements = $('tr', $tooltip);

	        for(i = 0; i < tooltipElements.length; i++) {
	            toolTipCells = $('td', tooltipElements[i]);
	            loopSplit = tooltipElements[i].textContent;
	            $(toolTipCells[0]).addClass('key');
	            $(toolTipCells[0]).addClass(sanitizeClassName(loopSplit[0] + '-key'));
	            $(toolTipCells[1]).addClass('value');
	            $(toolTipCells[1]).addClass(sanitizeClassName(loopSplit[0] + '-value'));
	        }
	    };
	    
	    var addTimeTooltipClasses = function(chart) {
	        var that = this,
	            i, loopSplit, loopKeyName, loopKeyElem, loopValElem, toolTipCells,
	            $tooltip = $('.highcharts-tooltip'),
	            tooltipElements = $('tr', $tooltip);
	        
	        for(i = 0; i < tooltipElements.length; i++) {
	            toolTipCells = $('td', tooltipElements[i]);
	            if(i===0){
	                $(toolTipCells[0]).addClass('time-value');
	                $(toolTipCells[0]).addClass('time');
	            } else {
	                loopSplit = tooltipElements[i].textContent.split(':');
	                $(toolTipCells[0]).addClass('key');
	                $(toolTipCells[0]).addClass(sanitizeClassName(loopSplit[0] + '-key'));
	                $(toolTipCells[1]).addClass('value');
	                $(toolTipCells[1]).addClass(sanitizeClassName(loopSplit[0] + '-value'));
	            }
	        }
	    };

	    var addLegendClasses = function(chart) {
	        var that = this,
	            loopSeriesName;

	        if (chart.legend && chart.legend.down) {
	            addClassToElement(chart.legend.down.element, 'page-down-button');
	        }
	        if (chart.legend && chart.legend.up) {
	            addClassToElement(chart.legend.up.element, 'page-up-button');
	        }
	        $(chart.series).each(function(i, series) {
	            if(!series.legendItem) {
	                return;
	            }
	            loopSeriesName = series.legendItem.textStr;
	            if(series.legendSymbol) {
	                addClassToElement(series.legendSymbol.element, 'symbol');
	                addClassToElement(series.legendSymbol.element, loopSeriesName + '-symbol');
	            }
	            if(series.legendLine) {
	                addClassToElement(series.legendLine.element, 'symbol');
	                addClassToElement(series.legendLine.element, loopSeriesName + '-symbol');
	            }
	            if(series.legendItem) {
	                addClassToElement(series.legendItem.element, 'legend-label');
	            }
	        });
	    };

	    var addClassToElement = function(elem, className) {
	        if (!elem) {
	            return;
	        }
	        className = sanitizeClassName(className);
	        if(className === '') {
	            return;
	        }
	        if(elem.className.baseVal) {
	            elem.className.baseVal += " " + className;
	        }
	        else {
	            elem.className.baseVal = className;
	        }
	    };

	    var sanitizeClassName = function(className) {
	        // the className can potentially come from the search results, so make sure it is valid before
	        // attempting to insert it...

	        // first remove any leading white space
	        className = className.replace(/\s/g, '');
	        // if the className doesn't start with a letter or a '-' followed by a letter, it should not be inserted
	        if(!/^[-]?[A-Za-z]/.test(className)) {
	            return '';
	        }
	        // now filter out anything that is not a letter, number, '-', or '_'
	        return className.replace(/[^A-Za-z0-9_-]/g, "");
	    };

	    //////////////////////////
	    // Gauge specific testing

	    var gaugeAddTestingMetadata = function(gaugeWrapper, elements, typeName, value) {
	        // make sure the wrapper container has an id, this will be used in createGlobalReference
	        if(!gaugeWrapper.$container.attr('id')) {
	            gaugeWrapper.$container.attr('id', gaugeWrapper.id);
	        }
	        var innerContainer = gaugeWrapper.$hcContainer;
	        innerContainer.addClass(typeName);
	        gaugeUpdate(innerContainer, value);
	        if(elements.valueDisplay) {
	            addClassToElement(elements.valueDisplay.element, 'gauge-value');
	        }
	        var key;
	        for(key in elements) {
	            if(/^tickLabel_/.test(key)) {
	                addClassToElement(elements[key].element, 'gauge-tick-label');
	            }
	        }
	        for(key in elements) {
	            if(/^colorBand/.test(key)){
	                addClassToElement(elements[key].element, 'gauge-color-band');
	            }
	        }
	        $('.gauge-color-band').each(function() {
	            $(this).attr('data-band-color', $(this).attr('fill'));
	        });

	        // this is bad OOP but I think it's better to keep all of this code in one method
	        if(elements.fill){
	            $(elements.fill.element).attr('data-indicator-color', $(elements.fill.element).attr('fill'));
	        }
	        if(elements.needle) {
	            addClassToElement(elements.needle.element, 'gauge-indicator');
	        }
	        if(elements.markerLine) {
	            addClassToElement(elements.markerLine.element, 'gauge-indicator');
	        }
	    };

	    var gaugeUpdate = function(container, value){
	        container.attr('data-gauge-value', value);
	    };

	    var createGlobalReference = function(wrapperObject, chartObject) {
	        Splunk.JSCharting = Splunk.JSCharting || {};
	        Splunk.JSCharting.chartByIdMap = Splunk.JSCharting.chartByIdMap || {};
	        var id = wrapperObject.$container.attr('id');
	        Splunk.JSCharting.chartByIdMap[id] = chartObject;
	    };

	    return ({

	        initializeTestingMetaData: initializeTestingMetaData,
	        gaugeAddTestingMetadata: gaugeAddTestingMetadata,
	        gaugeUpdate: gaugeUpdate,
	        createGlobalReference: createGlobalReference,
	        getPointCoordinates: getPointCoordinates

	    });

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "js_charting/util/async_utils":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("shim/jquery"), __webpack_require__("require/underscore")], __WEBPACK_AMD_DEFINE_RESULT__ = function($, _) {

	    var asyncUtils = {};

	    asyncUtils.CANCELLED = 'cancelled';

	    // http://www.paulirish.com/2011/requestanimationframe-for-smart-animating
	    asyncUtils.requestFrame = _(function(){
	        return (
	            window.requestAnimationFrame ||
	            window.webkitRequestAnimationFrame ||
	            window.mozRequestAnimationFrame ||
	            function(callback){
	                window.setTimeout(callback, 50);
	            }
	        );
	    }()).bind(window);

	    asyncUtils.cancelFrame = _(function() {
	        return (
	            window.cancelAnimationFrame ||
	            window.mozCancelAnimationFrame ||
	            // SPL-76580, can't reference window.clearTimeout directly here, IE 7 and 8 might not have defined it yet
	            function(id) {
	                window.clearTimeout(id);
	            }
	        );
	    }()).bind(window);

	    asyncUtils.asyncEach = function(list, callback) {
	        var pendingOperation,
	            cancelled = false,
	            listLength = list.length,
	            dfd = $.Deferred(),
	            callOnceAndWait = function(i) {
	                // the cancel() method will try to de-queue the frame, but this is not always supported
	                // so also logically cancel the work just to be safe
	                if(cancelled) {
	                    return;
	                }
	                callback(list[i], i);
	                // check if we just processed the last item in the list
	                // if so, we're done, if not, queue up the next one
	                if(i < listLength - 1) {
	                    pendingOperation = asyncUtils.requestFrame(function() { callOnceAndWait(i + 1); });
	                }
	                else {
	                    dfd.resolve();
	                }
	            };

	        dfd.cancel = function() {
	            cancelled = true;
	            if(pendingOperation) {
	                asyncUtils.cancelFrame(pendingOperation);
	                dfd.reject(asyncUtils.CANCELLED);
	            }
	        };

	        callOnceAndWait(0);
	        return dfd;
	    };

	    return asyncUtils;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/helpers/DataSet":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("shim/jquery"), __webpack_require__("require/underscore"), __webpack_require__("js_charting/util/math_utils")], __WEBPACK_AMD_DEFINE_RESULT__ = function($, _, mathUtils) {

	    var DataSet = function(data) {
	        var fields = data.fields || {};
	        var series = data.columns || {};

	        this.fields = [];
	        this.seriesList = [];
	        this.fieldMetadata = {};

	        _(fields).each(function(field, i) {
	            var fieldName;
	            if(_.isObject(field)) {
	                fieldName = field.name;
	                this.fieldMetadata[fieldName] = field;
	            }
	            else {
	                fieldName = field;
	            }
	            if(this.ALLOWED_HIDDEN_FIELDS_REGEX.test(fieldName) || this.isDataField(fieldName)){
	                this.fields.push(fieldName);
	                this.seriesList.push($.extend([], series[i]));
	            }
	        }, this);
	        this.length = this.fields.length;

	        // create an instance-specific memoized copy of getSeriesAsFloats
	        this.getSeriesAsFloats = _.memoize(this.getSeriesAsFloats, this.seriesAsFloatsMemoizeHash);
	    };

	    DataSet.prototype = {

	        ALLOWED_HIDDEN_FIELDS_REGEX: /^(_span|_tc|_lower.*|_predicted.*|_upper.*)$/,
	        DATA_FIELD_REGEX: /^[^_]|^_time$/,

	        allFields: function() {
	            return this.fields.slice();
	        },

	        allDataFields: function() {
	            return _(this.fields).filter(this.isDataField, this);
	        },

	        isDataField: function(field){
	            return this.DATA_FIELD_REGEX.test(field);
	        },

	        isTotalValue: function(value) {
	            return (value === 'ALL');
	        },

	        hasField: function(name) {
	            return (_(this.fields).indexOf(name) > -1);
	        },

	        fieldAt: function(index) {
	            return this.fields[index];
	        },

	        fieldIsGroupby: function(name) {
	            return (this.fieldMetadata[name] && this.fieldMetadata[name].hasOwnProperty('groupby_rank'));
	        },

	        seriesAt: function(index) {
	            return this.seriesList[index];
	        },

	        getSeries: function(name) {
	            var index = _(this.fields).indexOf(name);
	            if(index === -1) {
	                return [];
	            }
	            return _(this.seriesList[index]).map(function(value) { return value === null ? '' : value; });

	        },

	        getSeriesAsFloats: function(name, options) {
	            options = options || {};
	            var series = this.getSeries(name),
	                nullsToZero = options.nullValueMode === 'zero',
	                logScale = options.scale === 'log',
	                asFloats = [];

	            for(var i = 0; i < series.length; i++) {
	                var floatVal = mathUtils.parseFloat(series[i]);
	                if(_.isNaN(floatVal)) {
	                    asFloats.push(nullsToZero ? 0 : null);
	                    continue;
	                }
	                asFloats.push(logScale ? mathUtils.absLogBaseTen(floatVal) : floatVal);
	            }
	            return asFloats;
	        },

	        // this is a targeted fix for the case where the back-end adds an 'ALL' data point to the end of a time series
	        // but could be expanded into a more generic handler as we grow into it
	        getSeriesAsTimestamps: function(name) {
	            var series = this.getSeries(name);
	            if(this.isTotalValue(_(series).last())) {
	                return series.slice(0, -1);
	            }
	            return series;
	        },

	        seriesAsFloatsMemoizeHash: function(name, options) {
	            options = options || {};
	            return name + options.scale + options.nullValueMode;
	        },

	        toJSON: function() {
	            return ({
	                fields: this.fields,
	                columns: this.seriesList
	            });
	        }

	    };

	    return DataSet;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/charts/SplitSeriesChart":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/visualizations/charts/Chart"),
	            __webpack_require__("js_charting/util/lang_utils"), 
	            __webpack_require__("js_charting/util/parsing_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Chart,
	            langUtils, 
	            parsingUtils
	        ) {

	    var SplitSeriesChart = function(container, properties) {
	        Chart.call(this, container, properties);
	    };
	    langUtils.inherit(SplitSeriesChart, Chart);

	    $.extend(SplitSeriesChart.prototype, {

	        interAxisSpacing: 10,

	        shouldUpdateInPlace: function() {
	            if (this.selectionWindow) {
	                return this.hcChart && !this.isDirty();
	            } else {
	                return false;
	            }
	        },

	        processProperties: function() {
	            Chart.prototype.processProperties.call(this);
	            this.allowIndependentYRanges = parsingUtils.normalizeBoolean(
	                this.properties['layout.splitSeries.allowIndependentYRanges'], false
	            );
	        },

	        initializeSeriesPropertiesList: function() {
	            var propertiesList = Chart.prototype.initializeSeriesPropertiesList.call(this);
	            // give each series its own y-axis
	            _(propertiesList).each(function(props, i) {
	                props.yAxis = i;
	            });
	            return propertiesList;
	        },

	        initializeYAxisProperties: function(axisIndex, isEmpty) {
	            // If split-series chart, disable Y2 axes 
	            var axisProperties = $.extend(parsingUtils.getYAxisProperties(this.properties, 0), this.axisColorScheme, {
	                'axis.orientation': this.axesAreInverted ? 'horizontal' : 'vertical',
	                'isEmpty': isEmpty,
	                'opposite': false
	            });
	            return axisProperties; 
	        },

	        setAllSeriesData: function() {
	            Chart.prototype.setAllSeriesData.call(this);
	            // memoize the global min and max across all data
	            this.globalMin = Infinity;
	            this.globalMax = -Infinity;
	            _(this.yFields).each(function(field, i) {
	                var axis = this.yAxisList[i],
	                    data = this.formatAxisData(axis, field);

	                this.globalMin = Math.min(this.globalMin, Math.min.apply(Math, data));
	                this.globalMax = Math.max(this.globalMax, Math.max.apply(Math, data));
	            }, this);
	        },

	        getYAxisConfig: function() {
	            var config = Chart.prototype.getYAxisConfig.call(this);
	            _(config).each(function(axisConfig, i) {
	                $.extend(axisConfig, {
	                    opposite: false,
	                    offset: 0,
	                    setSizePreHook: _(function(axis) {
	                        $.extend(axis.options, this.getAdjustedAxisPosition(axis, i, this.yAxisList.length));
	                    }).bind(this)
	                });
	                var originalExtremesHook = axisConfig.getSeriesExtremesPostHook;
	                axisConfig.getSeriesExtremesPostHook = _(function(axis) {
	                    //if stackmode is 100, we want to keep the default 0-100 range
	                    if (!this.allowIndependentYRanges && this.stackMode !== 'stacked100') {
	                        axis.dataMax = Math.max(axis.dataMax, this.globalMax);
	                        axis.dataMin = Math.min(axis.dataMin, this.globalMin);
	                    }
	                    //make sure to invoke the original hook if it's there
	                    if(originalExtremesHook) {
	                        originalExtremesHook(axis);
	                    }
	                }).bind(this);
	            }, this);
	            return config;
	        },

	        getSeriesConfigList: function() {
	            var config = Chart.prototype.getSeriesConfigList.call(this);
	            _(config).each(function(seriesConfig) {
	                seriesConfig.afterAnimatePostHook = _(this.updateSeriesClipRect).bind(this);
	                seriesConfig.renderPostHook = _(this.updateSeriesClipRect).bind(this);
	                seriesConfig.destroyPreHook = _(this.destroySplitSeriesClipRect).bind(this);
	            }, this);
	            return config;
	        },

	        getAdjustedAxisPosition: function(axis, index, numAxes) {
	            var chart = axis.chart;
	            if(chart.inverted) {
	                var plotWidth = chart.plotWidth,
	                    axisWidth = (plotWidth - (this.interAxisSpacing * (numAxes - 1))) / numAxes;

	                return ({
	                    left: chart.plotLeft + (axisWidth + this.interAxisSpacing) * index,
	                    width: axisWidth
	                });
	            }
	            var plotHeight = chart.plotHeight,
	                axisHeight = (plotHeight - (this.interAxisSpacing * (numAxes - 1))) / numAxes;

	            return ({
	                top: chart.plotTop + (axisHeight + this.interAxisSpacing) * index,
	                height: axisHeight
	            });
	        },

	        getTooltipConfig: function() {
	            var config = Chart.prototype.getTooltipConfig.call(this);
	            var that = this; 
	            config.getAnchorPostHook = function(points, mouseEvent, anchor) {
	                if(that.axesAreInverted){
	                    anchor[0] = points.series.yAxis.left + (points.pointWidth || 0);
	                }
	                return anchor;
	            };
	            return config;
	        },

	        updateSeriesClipRect: function(series) {
	            var chart = series.chart,
	                yAxis = series.yAxis;

	            this.destroySplitSeriesClipRect(series);
	            if(chart.inverted) {
	                // this looks wrong, but this is happening before the 90 degree rotation so x is y and y is x
	                series.splitSeriesClipRect = chart.renderer.clipRect(0, -0, chart.plotHeight, yAxis.width);
	            }
	            else {
	                series.splitSeriesClipRect = chart.renderer.clipRect(0, 0, chart.plotWidth, yAxis.height);
	            }
	            series.group.clip(series.splitSeriesClipRect);
	        },

	        destroySplitSeriesClipRect: function(series) {
	            if(series.hasOwnProperty('splitSeriesClipRect')) {
	                series.splitSeriesClipRect.destroy();
	            }
	        }
	    });

	    return SplitSeriesChart;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/charts/PieChart":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("shim/highcharts"),
	            __webpack_require__("stubs/i18n"),
	            __webpack_require__("js_charting/visualizations/charts/Chart"),
	            __webpack_require__("shim/splunk.util"),
	            __webpack_require__("js_charting/components/PieChartDataLabels"),
	            __webpack_require__("js_charting/helpers/HoverEventThrottler"),
	            __webpack_require__("js_charting/series/series_factory"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("util/general_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Highcharts,
	            i18n,
	            Chart,
	            splunkUtils,
	            DataLabels,
	            HoverEventThrottler,
	            seriesFactory,
	            langUtils,
	            parsingUtils,
	            general_utils
	        ) {

	    var PieChart = function(container, properties) {
	        Chart.call(this, container, properties);
	    };
	    langUtils.inherit(PieChart, Chart);

	    $.extend(PieChart.prototype, {

	        SLICE_NAME_FIELD_INDEX: 0,
	        SLICE_SIZE_FIELD_INDEX: 1,

	        hasLegend: false,
	        hasXAxis: false,
	        hasYAxis: false,

	        shouldUpdateInPlace: function() {
	            return false;
	        },

	        processProperties: function() {
	            Chart.prototype.processProperties.call(this);
	            this.showLabels = this.isEmpty() ? false : parsingUtils.normalizeBoolean(this.properties['chart.showLabels'], true);
	        },

	        prepare: function(dataSet, properties) {
	            Chart.prototype.prepare.call(this, dataSet, properties);
	            if(this.showLabels) {
	                this.initializeDataLabels();
	            }
	        },

	        handleDraw: function(callback) {
	            this.destroyCustomRenderer();
	            if(this.isEmpty()) {
	                this.benchmark('Draw Started');
	                this.drawEmptyPieChart();
	                this.benchmark('Draw Finished');
	                callback(this, this.benchmarks);
	                return;
	            }
	            Chart.prototype.handleDraw.call(this, callback);
	        },

	        initializeFields: function() {
	            var dataFields = this.dataSet.allDataFields();
	            this.sliceNameField = dataFields[this.SLICE_NAME_FIELD_INDEX];
	            this.sliceSizeField = dataFields[this.SLICE_SIZE_FIELD_INDEX];
	        },

	        isEmpty: function() {
	            if(this.dataSet){
	                return (!this._sizeValuesAreNumeric() || this.dataSet.allDataFields().length < 2);
	            }
	            else {
	                return false;
	            }
	        },

	        hasTimeXAxis: function() {
	            return false;
	        },

	        _sizeValuesAreNumeric: function() {
	            return general_utils.valuesAreNumeric(this.dataSet.seriesList[this.SLICE_SIZE_FIELD_INDEX]);
	        },

	        _getInvalidDataMessage: function() {
	            // If there is not enough data, message is no results
	            if(!this.dataSet || this.dataSet.allDataFields().length < 2) {
	                return _('No Results').t();
	            }
	            else{
	                // Note: we never expect to return 'Invalid data' it is here for completeness
	                return this._sizeValuesAreNumeric() ? _('Invalid Data').t() : _('Numeric Data Required').t();
	            }
	        },

	        shouldProgressiveDraw: function() {
	            return false;
	        },

	        initializeSeriesPropertiesList: function() {
	            var seriesProps = $.extend({}, this.properties, {
	                name: this.sliceSizeField,
	                type: 'pie',
	                clickEnabled: this.chartClickEnabled
	            });
	            return [seriesProps];
	        },

	        setAllSeriesData: function() {
	            var isTimeBased = this.seriesIsTimeBased(this.sliceNameField),
	                spans;

	            if(isTimeBased) {
	                spans = this.dataSet.getSeriesAsFloats("_span");
	            }

	            this.seriesList[0].setData({
	                names: this.dataSet.getSeries(this.sliceNameField),
	                sizes: this.dataSet.getSeriesAsFloats(this.sliceSizeField, { nullValueMode: 'zero' }),
	                spans: spans,
	                isTimeBased: isTimeBased
	            });
	        },

	        handlePointMouseOver: function(targetPoint) {
	            this.seriesList[0].handlePointMouseOver(targetPoint);
	            if(this.dataLabels) {
	                this.dataLabels.selectLabel(targetPoint);
	            }
	        },

	        handlePointMouseOut: function(targetPoint){
	            this.seriesList[0].handlePointMouseOut(targetPoint);
	            if(this.dataLabels) {
	                this.dataLabels.unSelectLabel(targetPoint);
	            }
	        },

	        handlePointClick: function(event, point) {
	            var pointIndex = point.index,
	                pointData = this.seriesList[0].getData()[pointIndex],
	                sliceName = pointData[0],
	                sliceSize = pointData[1].toString(),
	                collapseFieldName = new RegExp("^" + this.seriesList[0].collapseFieldName),
	                rowContext = {},
	                pointClickEvent = {
	                    type: 'pointClick',
	                    modifierKey: event.modifierKey,
	                    name: this.sliceNameField,
	                    // 'value' will be inserted later based on series type
	                    name2: this.sliceSizeField,
	                    value2: sliceSize,
	                    rowContext: rowContext
	                };

	            // Clicking on the collapsed slice for a _time based pie chart should just return a normal pointClickEvent,
	            // not the special time-based one
	            if(this.seriesIsTimeBased(this.sliceNameField) && !collapseFieldName.test(pointData[0])) {
	                var isoTimeString = pointData[0];
	                pointClickEvent.value = splunkUtils.getEpochTimeFromISO(isoTimeString);
	                pointClickEvent._span = pointData[2];
	                rowContext['row.' + this.sliceNameField] = pointClickEvent.value;
	            }
	            else {
	                pointClickEvent.value = sliceName;
	                rowContext['row.' + this.sliceNameField] = sliceName;
	            }

	            rowContext['row.' + this.sliceSizeField] = sliceSize;
	            this.trigger(pointClickEvent);
	        },

	        initializeDataLabels: function() {
	            var labelProps = {
	                fontColor: this.fontColor,
	                foregroundColorSoft: this.foregroundColorSoft,
	                clickEnabled: parsingUtils.normalizeBoolean(this.properties['chart.clickEnabled'])
	                    || parsingUtils.normalizeBoolean(this.properties['enableChartClick'])
	            };
	            if(this.dataLabels) {
	                this.dataLabels.destroy();
	            }
	            this.dataLabels = new DataLabels(labelProps);
	            var that = this,
	                properties = {
	                    highlightDelay: 75,
	                    unhighlightDelay: 50,
	                    onMouseOver: function(point){
	                        that.seriesList[0].selectPoint(point);
	                    },
	                    onMouseOut: function(point){
	                        that.seriesList[0].unSelectPoint(point);
	                    }
	                },
	                throttle = new HoverEventThrottler(properties);

	            this.dataLabels.on('mouseover', function(e, point) {
	                throttle.mouseOverHappened(point);
	            });
	            this.dataLabels.on('mouseout', function(e, point) {
	                throttle.mouseOutHappened(point);
	            });
	            // TODO [sff] add a click handler here for data label drilldown
	        },

	        getPlotOptionsConfig: function() {
	            var that = this;
	            return ({
	                pie: {
	                    dataLabels: $.extend(this.getDataLabelConfig(), {
	                        formatter: function() {
	                            var formatInfo = this;
	                            return parsingUtils.escapeSVG(that.formatDataLabel(formatInfo));
	                        }
	                    }),
	                    borderWidth: 0,
	                    stickyTracking: false,
	                    cursor: this.chartClickEnabled ? 'pointer' : 'default',
	                    states: {
	                        hover: {
	                            brightness: 0
	                        }
	                    },
	                    tooltip: {
	                        followPointer: false
	                    }
	                }
	            });
	        },

	        getDataLabelConfig: function() {
	            if(!this.showLabels) {
	                return {
	                    enabled: false
	                };
	            }
	            return this.dataLabels.getConfig();
	        },

	        applyColorPalette: function() {
	            // FIXME: this is bad, find a way to encapsulate this in the PieSeries object
	            this.BASE_CONFIG = $.extend({}, this.BASE_CONFIG, {
	                colors: _(this.getFieldList()).map(this.computeFieldColor, this)
	            });
	        },

	        addPercentToName: function(name, percentage) {
	            if(parsingUtils.normalizeBoolean(this.properties['chart.showPercent'])) {
	                return name + ', ' + i18n.format_percent(percentage / 100);
	            }
	            return name;
	        },

	        formatDataLabel: function(info) {
	            return this.addPercentToName(info.point.name, info.percentage);
	        },

	        getSeriesPointInfo: function(series, hcPoint) {
	            var pointIndex = hcPoint.index,
	                pointData = series.hasPrettyData ? series.getPrettyData()[pointIndex] : series.getData()[pointIndex],
	                pointName = this.addPercentToName(pointData[0], hcPoint.percentage),
	                pointValue = pointData[1];

	            return ({
	                sliceFieldName: this.sliceNameField,
	                sliceName: pointName,
	                sliceColor: hcPoint.color,
	                yValue: i18n.format_decimal(pointValue),
	                yPercent: i18n.format_percent(hcPoint.percentage / 100)
	            });
	        },

	        drawEmptyPieChart: function() {
	            var width = this.$container.width(),
	                height = this.$container.height(),
	                // TODO [sff] this logic is duplicated in PieSeries translatePreHook()
	                circleRadius = Math.min(height * 0.75, width / 3) / 2;

	            this.renderer = new Highcharts.Renderer(this.container, width, height);

	            this.renderer.circle(width / 2, height / 2, circleRadius).attr({
	                fill: 'rgba(150, 150, 150, 0.3)',
	                stroke: 'rgb(200, 200, 200)',
	                'stroke-width': 1,
	                'title': _('Invalid data: second column must be numeric for a pie chart').t()
	            }).add();

	            this.renderer.text(this._getInvalidDataMessage(), width / 2, height / 2)
	            .attr({
	                align: 'center'
	            })
	            .css({
	                fontSize: '20px',
	                color: 'rgb(200, 200, 200)'
	            }).add();
	        },

	        setSize: function(width, height) {
	            if(this.isEmpty()) {
	                this.destroyCustomRenderer();
	                this.drawEmptyPieChart();
	            }
	            else {
	                Chart.prototype.setSize.call(this, width, height);    
	            }
	        },

	        destroy: function() {
	            this.destroyCustomRenderer();
	            Chart.prototype.destroy.call(this);
	        },

	        destroyCustomRenderer: function() {
	            if(this.renderer) {
	                this.renderer.destroy();
	                this.renderer = null;
	                this.$container.empty();
	            }
	        }
	    });

	    return PieChart;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/components/PieChartDataLabels":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/helpers/EventMixin"),
	            __webpack_require__("js_charting/helpers/Formatter"),
	            __webpack_require__("js_charting/helpers/HoverEventThrottler"),
	            __webpack_require__("js_charting/util/dom_utils"),
	            __webpack_require__("js_charting/components/DataLabels"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        	$,
	        	_,
	        	EventMixin,
	        	Formatter,
	        	HoverEventThrottler,
	        	domUtils,
	        	DataLabels,
	        	langUtils
	        )  {


	        	var PieChartDataLabels = function(properties) {
	        		DataLabels.call(this, properties);
	        		this.id = _.uniqueId('data_labels_');
	        	};


	        	langUtils.inherit(PieChartDataLabels, DataLabels);
		        PieChartDataLabels.prototype = $.extend(PieChartDataLabels.prototype, {

		       	HIGHLIGHTED_OPACITY: 1.0,
		        UNHIGHLIGHTED_OPACITY: 0.3,

			        getConfig: function() {
			            return ({
			                color: this.properties['fontColor'] || '#000000',
			                connectorColor: this.properties['foregroundColorSoft'],
			                softConnector: false,
			                distance: 20,
			                style: {
			                    cursor: this.properties['clickEnabled'] ? 'pointer' : 'default',
			                    // Hack to make sure we can render literal '<' and '>'
			                    HcTextStroke: true
			                },
			                x: 0.01,
			                drawDataLabelsPreHook: _(this.drawDataLabelsPreHook).bind(this),
			                drawDataLabelsPostHook: _(this.drawDataLabelsPostHook).bind(this)
			            });
			        },


			          onChartLoad: function() {},

	        onChartLoadOrRedraw: function(chart) {
	            this.removeEventHandlers();
				this.hcSeries = chart.series[0];
	            this.addEventHandlers();
	        },

	        addEventHandlers: function() {
	            var that = this,
	                properties = {
	                    highlightDelay: 125,
	                    unhighlightDelay: 50,
	                    onMouseOver: function(point){
	                        that.selectLabel(point);
	                        that.trigger('mouseover', [point]);
	                    },
	                    onMouseOut: function(point){
	                        that.unSelectLabel(point);
	                        that.trigger('mouseout', [point]);
	                    }
	                },
	                throttle = new HoverEventThrottler(properties);

	            _(this.hcSeries.data).each(function(point) {
	                var label = point.dataLabel.element;
	                domUtils.jQueryOn.call($(label), 'mouseover.' + this.id, function() {
	                    throttle.mouseOverHappened(point);
	                });
	                domUtils.jQueryOn.call($(label), 'mouseout.' + this.id, function() {
	                    throttle.mouseOutHappened(point);
	                });
	                domUtils.jQueryOn.call($(label), 'click.' + this.id, function() {
	                    that.trigger('click', [point]);
	                });
	            }, this);
	        },

	        removeEventHandlers: function() {
				if(!this.hcSeries) {
	                return;
	            }
	            _(this.hcSeries.data).each(function(point) {
	                var label = point.dataLabel.element;
	                domUtils.jQueryOff.call($(label), '.' + this.id);
	            }, this);
	        },

	        destroy: function() {
	            this.off();
	            this.removeEventHandlers();
	            this.hcSeries = null;
	        },

	        selectLabel: function(point) {
	            var matchingPoint = this.hcSeries.data[point.index];
	            matchingPoint.dataLabel.attr('fill-opacity', this.HIGHLIGHTED_OPACITY);
	            _(this.hcSeries.data).chain().without(matchingPoint).each(function(hcPoint) {
	                hcPoint.dataLabel.attr('fill-opacity', this.UNHIGHLIGHTED_OPACITY);
	            }, this);
	        },

	        unSelectLabel: function(point) {
	            var matchingPoint = this.hcSeries.data[point.index];
	            _(this.hcSeries.data).chain().without(matchingPoint).each(function(hcPoint) {
	                hcPoint.dataLabel.attr('fill-opacity', this.HIGHLIGHTED_OPACITY);
	            }, this);
	        },



		        /**
		         * @author sfishel
		         *
		         * Before the data label draw routine, overwrite the series getX method so that labels will be aligned vertically.
		         * Then make sure all labels will fit in the plot area.
		         */

		        drawDataLabelsPreHook: function(pieSeries) {
		            var chart = pieSeries.chart,
		                distance = pieSeries.options.dataLabels.distance,
		                center = pieSeries.center,
		                radius = center[2] / 2;

		            pieSeries.getX = function(y, left) {
		                return (chart.plotLeft + center[0] + (left ? (-radius - distance) : (radius + distance / 2)));
		            };

		            this.fitLabelsToPlotArea(pieSeries);
		        },

		        fitLabelsToPlotArea: function(series) {
		            var i, adjusted,
		                options = series.options,
		                labelDistance = options.dataLabels.distance,
		                size = options.size, // assumes size in pixels TODO: handle percents
		                chart = series.chart,
		                renderer = chart.renderer,
		                formatter = new Formatter(renderer),

		                defaultFontSize = 11,
		                minFontSize = 9,
		                maxWidth = (chart.plotWidth - (size + 2 * labelDistance)) / 2,
		                labels = [];
		            for(i = 0; i < series.data.length; i++) {
		                if (typeof series.options.data[i][0] !== "undefined"){
		                    labels.push(series.options.data[i][0]);
		                } else {
		                    labels.push(series.options.data[i].name);
		                }
		            }
		            adjusted = formatter.adjustLabels(labels, maxWidth, minFontSize, defaultFontSize, 'middle');

		            for(i = 0; i < series.data.length; i++) {
		                series.data[i].name = adjusted.labels[i];
		                // check for a redraw, update the font size in place
		                if(series.data[i].dataLabel && series.data[i].dataLabel.css) {
		                    series.data[i].dataLabel.css({'fontSize': adjusted.fontSize + 'px'});
		                }
		            }
		            $.extend(true, options.dataLabels, {
		                style: {
		                    'fontSize': adjusted.fontSize + 'px'
		                },
		                y: Math.floor(adjusted.fontSize / 4) - 3
		            });
		            formatter.destroy();
		        },

		        /**
		         * @author sfishel
		         *
		         * After the data labels have been drawn, update the connector paths in place.
		         */

		        drawDataLabelsPostHook: function(pieSeries) {
		            _(pieSeries.points).each(function(point) {
		                if(point.connector) {
		                    var path = point.connector.attr('d').split(' ');
		                    point.connector.attr({ d: this.updateConnectorPath(path) });
		                }
		            }, this);
		        },

		        updateConnectorPath: function(path) {
		            // the default path consists of three points that create a two-segment line
		            // we are going to move the middle point so the outer segment is horizontal

		            // first extract the actual points from the SVG-style path declaration
		            var firstPoint = {
		                    x: parseFloat(path[1]),
		                    y: parseFloat(path[2])
		                },
		                secondPoint = {
		                    x: parseFloat(path[4]),
		                    y: parseFloat(path[5])
		                },
		                thirdPoint = {
		                    x: parseFloat(path[7]),
		                    y: parseFloat(path[8])
		                };

		            // find the slope of the second line segment, use it to calculate the new middle point
		            var secondSegmentSlope = (thirdPoint.y - secondPoint.y) / (thirdPoint.x - secondPoint.x),
		                newSecondPoint = {
		                    x: thirdPoint.x + (firstPoint.y - thirdPoint.y) / secondSegmentSlope,
		                    y: firstPoint.y
		                };

		            // define the update path and swap it into the original array
		            // if the resulting path would back-track on the x-axis (or is a horizontal line),
		            // just draw a line directly from the first point to the last
		            var lineIsVertical = !_.isFinite(secondSegmentSlope),
		                wouldBacktrack = isNaN(newSecondPoint.x) || (firstPoint.x >= newSecondPoint.x && newSecondPoint.x <= thirdPoint.x)
		                    || (firstPoint.x <= newSecondPoint.x && newSecondPoint.x >= thirdPoint.x),
		                newPath = (!lineIsVertical && wouldBacktrack) ?
		                    [
		                        "M", firstPoint.x, firstPoint.y,
		                        "L", thirdPoint.x, thirdPoint.y
		                    ] :
		                    [
		                        "M", firstPoint.x, firstPoint.y,
		                        "L", newSecondPoint.x, newSecondPoint.y,
		                        "L", thirdPoint.x, thirdPoint.y
		                    ];

		            return newPath;
		        }

	    });
		
		return PieChartDataLabels;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/charts/BubbleChart":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/visualizations/charts/ScatterChart"),
	            __webpack_require__("js_charting/components/axes/NumericAxis"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            ScatterChart,
	            NumericAxis,
	            langUtils
	        ) {

	    var BubbleChart = function(container, properties) {
	        ScatterChart.call(this, container, properties);
	    };
	    langUtils.inherit(BubbleChart, ScatterChart);

	    $.extend(BubbleChart.prototype, {
	        NUM_DIMENSION_FIELDS: 3,
	        TYPE: 'bubble',

	        initializeNonMarkFields: function(dataFields) {
	            ScatterChart.prototype.initializeNonMarkFields.call(this, dataFields);
	            if(dataFields.length > this.NUM_DIMENSION_FIELDS) {
	                this.zField = dataFields[3];
	            }
	            else {
	                this.zField = dataFields[2];
	            }
	        },

	        isEmpty: function() {
	            return ScatterChart.prototype.isEmpty.apply(this, arguments) || _(this.zField).isUndefined();
	        },

	        processProperties: function() {
	            ScatterChart.prototype.processProperties.call(this);

	            var defaults = { 'bubbleMaximumSize': 50, 'bubbleMinimumSize': 10, 'bubbleSizeBy': 'area' };

	            this.bubbleMaximumSize = this.properties['chart.bubbleMaximumSize'] && parseInt(this.properties['chart.bubbleMaximumSize'], 10);
	            this.bubbleMinimumSize = this.properties['chart.bubbleMinimumSize'] && parseInt(this.properties['chart.bubbleMinimumSize'], 10);
	            this.bubbleSizeBy = this.properties['chart.bubbleSizeBy'] || defaults['bubbleSizeBy'];

	            if(isNaN(this.bubbleMaximumSize) || this.bubbleMaximumSize <= 0){
	                this.bubbleMaximumSize = defaults['bubbleMaximumSize'];
	            }

	            if(isNaN(this.bubbleMinimumSize) || this.bubbleMinimumSize <= 0){
	                this.bubbleMinimumSize = defaults['bubbleMinimumSize'];
	            }
	            
	            if(this.bubbleSizeBy === 'diameter'){
	                this.bubbleSizeBy = 'width';
	            }else if(this.bubbleSizeBy !== ('area')){
	                this.bubbleSizeBy = defaults['bubbleSizeBy'];
	            }
	        },

	        setAllSeriesData: function() {
	            var xData = this.formatAxisData(this.xAxisList[0], this.xField),
	                yData = this.formatAxisData(this.yAxisList[0], this.yField),
	                zData = this.formatAxisData(this.yAxisList[0], this.zField);

	            if(this.isMultiSeries) {
	                _(this.seriesList).each(function(series) {
	                    var seriesName = series.getName();
	                    series.setData({
	                        x: this.filterDataByNameMatch(xData, seriesName),
	                        y: this.filterDataByNameMatch(yData, seriesName),
	                        z: this.filterDataByNameMatch(zData, seriesName)
	                    });
	                }, this);
	            }
	            else {
	                this.seriesList[0].setData({
	                    x: xData,
	                    y: yData,
	                    z: zData
	                });
	            }
	        },

	        getPlotOptionsConfig: function() {
	            var minSize = this.bubbleMinimumSize,
	                maxSize = this.bubbleMaximumSize,
	                sizeBy = this.bubbleSizeBy;
	            return ({
	                bubble: {
	                    stickyTracking: false,
	                    minSize: minSize,
	                    maxSize: maxSize,
	                    sizeBy: sizeBy,
	                    tooltip: {
	                        followPointer: false
	                    },
	                    cursor: this.chartClickEnabled ? 'pointer' : 'default'
	                }
	            });
	        },

	        getSeriesPointInfo: function(series, hcPoint) {
	            var pointInfo = ScatterChart.prototype.getSeriesPointInfo.apply(this, arguments),
	                pointIndex = hcPoint.index,
	                seriesName = series.getName(),
	                zSeries = this.dataSet.getSeries(this.zField),
	                zValue = this.isMultiSeries ? this.filterDataByNameMatch(zSeries, seriesName)[pointIndex] : zSeries[pointIndex];

	            pointInfo.zAxisName = this.zField;
	            pointInfo.zValue = NumericAxis.formatNumber(zValue);
	            return pointInfo;
	        }


	    });

	    return BubbleChart;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/gauges/RadialGauge":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("js_charting/visualizations/gauges/Gauge"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/math_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Gauge,
	            langUtils,
	            mathUtils
	        ) {

	    var RadialGauge = function(container, properties) {
	        Gauge.call(this, container, properties);
	    };
	    langUtils.inherit(RadialGauge, Gauge);

	    $.extend(RadialGauge.prototype, {

	        showMinorTicksByDefault: false,

	        updateDimensions: function() {
	            Gauge.prototype.updateDimensions.call(this);
	            // since the gauge is circular, have to handle when the container is narrower than it is tall
	            if(this.width < this.height && this.width >= this.MIN_GAUGE_HEIGHT) {
	                this.$container.height(this.width);
	                this.height = this.width;
	            }
	        },

	        processProperties: function() {
	            Gauge.prototype.processProperties.call(this);
	            this.verticalPadding = 10;
	            this.minorsPerMajor = 10;
	            this.tickWidth = 1;

	            this.startAngle = this.computeStartAngle();
	            this.arcAngle = this.computeArcAngle();
	        },

	        computeStartAngle: function() {
	            var angle = parseInt(this.properties['chart.rangeStartAngle'], 10);
	            if(_(angle).isNaN()) {
	                angle = 45;
	            }
	            // add 90 to startAngle because we start at south instead of east
	            return mathUtils.degreeToRadian(angle + 90);
	        },

	        computeArcAngle: function() {
	            var angle = parseInt(this.properties['chart.rangeArcAngle'], 10) || 270;
	            return mathUtils.degreeToRadian(angle);
	        },

	        renderGauge: function() {
	            Gauge.prototype.renderGauge.call(this);
	            this.borderWidth = mathUtils.roundWithMin(this.height / 60, 3);
	            this.tickOffset = mathUtils.roundWithMin(this.height / 100, 3);
	            this.tickLabelOffset = this.borderWidth;
	            this.tickFontSize = mathUtils.roundWithMin(this.height / 25, 10);  // in pixels
	            this.valueFontSize = mathUtils.roundWithMin(this.height / 15, 15);  // in pixels
	            if(this.isShiny) {
	                this.needleTailLength = mathUtils.roundWithMin(this.height / 15, 10);
	                this.needleTailWidth = mathUtils.roundWithMin(this.height / 50, 6);
	                this.knobWidth = mathUtils.roundWithMin(this.height / 30, 7);
	            }
	            else {
	                this.needleWidth = mathUtils.roundWithMin(this.height / 60, 3);
	            }
	            if(!this.isShiny) {
	                this.bandOffset = 0;
	                this.bandThickness = mathUtils.roundWithMin(this.height / 30, 7);
	            }
	            else {
	                this.bandOffset = this.borderWidth;
	                this.bandThickness = mathUtils.roundWithMin(this.height / 40, 4);
	            }
	            this.tickColor = (!this.isShiny) ? this.foregroundColor : 'silver';
	            this.tickFontColor = (!this.isShiny) ? this.fontColor : 'silver';
	            this.valueColor = (!this.isShiny) ? this.fontColor : '#b8b167';
	            this.tickLength = mathUtils.roundWithMin(this.height / 20, 4);
	            this.minorTickLength = this.tickLength / 2;
	            this.radius = (this.height - 2 * (this.verticalPadding + this.borderWidth)) / 2;
	            this.valueHeight = this.height - ((this.radius / 4) + this.verticalPadding + this.borderWidth);
	            this.needleLength = (!this.isShiny) ? this.radius - (this.bandThickness) / 2 : this.radius;

	            this.tickStart = this.radius - this.bandOffset - this.bandThickness - this.tickOffset;
	            this.tickEnd = this.tickStart - this.tickLength;
	            this.tickLabelPosition = this.tickEnd - this.tickLabelOffset;
	            this.minorTickEnd = this.tickStart - this.minorTickLength;

	            if(this.isShiny) {
	                this.elements.border = this.renderer.circle(this.width / 2,
	                    this.height / 2, this.radius + this.borderWidth)
	                    .attr({
	                        fill: '#edede7',
	                        stroke: 'silver',
	                        'stroke-width': 1
	                    })
	                    .add();

	                this.elements.background = this.renderer.circle(this.width / 2,
	                    this.height / 2, this.radius)
	                    .attr({
	                        fill: '#000000'
	                    })
	                    .add();
	            }

	            if(this.showRangeBand) {
	                this.drawColorBand();
	            }
	            this.drawTicks();
	            this.drawIndicator(this.value);
	            if(this.showValue) {
	                this.drawValueDisplay();
	            }

	            this.checkOutOfRange(this.value);
	        },

	        updateValueDisplay: function(valueText) {
	            this.elements.valueDisplay.attr({
	                text: valueText
	            });
	        },

	        drawColorBand: function() {
	            var i, startAngle, endAngle,
	                outerRadius = this.radius - this.bandOffset,
	                innerRadius = outerRadius - this.bandThickness;

	            for(i = 0; i < this.ranges.length - 1; i++) {
	                startAngle = this.translateValue(this.ranges[i]);
	                endAngle = this.translateValue(this.ranges[i + 1]);

	                this.elements['colorBand' + i] = this.renderer.arc(this.width / 2, this.height / 2,
	                    outerRadius, innerRadius, startAngle, endAngle)
	                    .attr({
	                        fill: this.getColorByIndex(i)
	                    })
	                    .add();
	            }
	        },

	        drawMajorTick: function(angle) {
	            return this.renderer.path([
	                'M', (this.width / 2) + this.tickStart * Math.cos(angle),
	                (this.height / 2) + this.tickStart * Math.sin(angle),
	                'L', (this.width / 2) + this.tickEnd * Math.cos(angle),
	                (this.height / 2) + this.tickEnd * Math.sin(angle)
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.tickWidth
	                })
	                .add();
	        },

	        drawMajorTickLabel: function(angle, text) {
	            var sin = Math.sin(angle),
	                labelWidth = this.predictTextWidth(text, this.tickFontSize),
	                textAlignment = (angle < (1.5 * Math.PI)) ? 'left' : 'right',
	                xOffset = (angle < (1.5 * Math.PI)) ? (-labelWidth / 2) * sin *  sin :
	                    (labelWidth / 2) * sin * sin,
	                yOffset = (this.tickFontSize / 4) * sin;

	            return this.renderer.text(text,
	                (this.width / 2) + (this.tickLabelPosition) * Math.cos(angle)
	                    + xOffset,
	                (this.height / 2) + (this.tickLabelPosition - 4) * sin
	                    + (this.tickFontSize / 4) - yOffset
	            )
	                .attr({
	                    align: textAlignment
	                })
	                .css({
	                    color: this.tickFontColor,
	                    fontSize: this.tickFontSize + 'px'
	                })
	                .add();
	        },

	        drawMinorTick: function(angle) {
	            return this.renderer.path([
	                'M', (this.width / 2) + this.tickStart * Math.cos(angle),
	                (this.height / 2) + this.tickStart * Math.sin(angle),
	                'L', (this.width / 2) + this.minorTickEnd * Math.cos(angle),
	                (this.height / 2) + this.minorTickEnd * Math.sin(angle)
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.tickWidth
	                })
	                .add();
	        },

	        drawIndicator: function(val) {
	            var needlePath, needleStroke, needleStrokeWidth,
	                needleFill, needleRidgePath, knobFill,
	                valueAngle = this.normalizedTranslateValue(val),
	                myCos = Math.cos(valueAngle),
	                mySin = Math.sin(valueAngle);

	            if(!this.isShiny) {
	                needlePath = [
	                    'M', (this.width / 2),
	                    (this.height / 2),
	                    'L', (this.width / 2) + myCos * this.needleLength,
	                    (this.height / 2) + mySin * this.needleLength
	                ];
	                needleStroke = this.foregroundColor;
	                needleStrokeWidth = this.needleWidth;
	            }
	            else {
	                needlePath = [
	                    'M', (this.width / 2) - this.needleTailLength * myCos,
	                    (this.height / 2) - this.needleTailLength * mySin,
	                    'L', (this.width / 2) - this.needleTailLength * myCos + this.needleTailWidth * mySin,
	                    (this.height / 2) - this.needleTailLength * mySin - this.needleTailWidth * myCos,
	                    (this.width / 2) + this.needleLength * myCos,
	                    (this.height / 2) + this.needleLength * mySin,
	                    (this.width / 2) - this.needleTailLength * myCos - this.needleTailWidth * mySin,
	                    (this.height / 2) - this.needleTailLength * mySin + this.needleTailWidth * myCos,
	                    (this.width / 2) - this.needleTailLength * myCos,
	                    (this.height / 2) - this.needleTailLength * mySin
	                ];
	                needleFill = {
	                    linearGradient: [(this.width / 2) - this.needleTailLength * myCos,
	                        (this.height / 2) - this.needleTailLength * mySin,
	                        (this.width / 2) - this.needleTailLength * myCos - this.needleTailWidth * mySin,
	                        (this.height / 2) - this.needleTailLength * mySin + this.needleTailWidth * myCos],
	                    stops: [
	                        [0, '#999999'],
	                        [0.2, '#cccccc']
	                    ]
	                };
	                needleRidgePath = [
	                    'M', (this.width / 2) - (this.needleTailLength - 2) * myCos,
	                    (this.height / 2) - (this.needleTailLength - 2) * mySin,
	                    'L', (this.width / 2) + (this.needleLength - (this.bandOffset / 2)) * myCos,
	                    (this.height / 2) + (this.needleLength - (this.bandOffset / 2)) * mySin
	                ];
	                knobFill = {
	                    linearGradient: [(this.width / 2) + this.knobWidth * mySin,
	                        (this.height / 2) - this.knobWidth * myCos,
	                        (this.width / 2) - this.knobWidth * mySin,
	                        (this.height / 2) + this.knobWidth * myCos],
	                    stops: [
	                        [0, 'silver'],
	                        [0.5, 'black'],
	                        [1, 'silver']
	                    ]
	                };
	            }
	            if(this.isShiny) {
	                if(this.elements.centerKnob) {
	                    this.elements.centerKnob.destroy();
	                }
	                this.elements.centerKnob = this.renderer.circle(this.width / 2, this.height /2, this.knobWidth)
	                    .attr({
	                        fill: knobFill
	                    })
	                    .add();
	            }
	            if(this.elements.needle) {
	                this.elements.needle.destroy();
	            }
	            this.elements.needle = this.renderer.path(needlePath)
	                .attr({
	                    fill: needleFill || '',
	                    stroke: needleStroke || '',
	                    'stroke-width': needleStrokeWidth || ''
	                })
	                .add();
	            if(this.isShiny) {
	                if(this.elements.needleRidge) {
	                    this.elements.needleRidge.destroy();
	                }
	                this.elements.needleRidge = this.renderer.path(needleRidgePath)
	                    .attr({
	                        stroke: '#cccccc',
	                        'stroke-width': 1
	                    })
	                    .add();
	            }
	        },

	        drawValueDisplay: function() {
	            var valueText = this.formatValue(this.value);
	            this.elements.valueDisplay = this.renderer.text(valueText, this.width / 2, this.valueHeight)
	                .css({
	                    color: this.valueColor,
	                    fontSize: this.valueFontSize + 'px',
	                    lineHeight: this.valueFontSize + 'px',
	                    fontWeight: 'bold'
	                })
	                .attr({
	                    align: 'center'
	                })
	                .add();
	        },

	        getSVG: function() {
	            // a little bit of cleanup is required here since the export renderer doesn't support gradients
	            if(this.elements.centerKnob) {
	                this.elements.centerKnob.attr({ fill: '#999999' });
	            }
	            this.elements.needle.attr({ fill: '#bbbbbb' });
	            if(this.elements.needleRidge) {
	                this.elements.needleRidge.attr({ stroke: '#999999' });
	            }
	            return Gauge.prototype.getSVG.call(this);
	        },

	        normalizedTranslateValue: function(val) {
	            if(val < this.ranges[0]) {
	                return this.translateValue(this.ranges[0]);
	            }
	            if(val > this.ranges[this.ranges.length - 1]) {
	                return this.translateValue(this.ranges[this.ranges.length - 1]);
	            }
	            return this.translateValue(val);
	        },

	        translateValue: function(val) {
	            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
	                normalizedValue = val - this.ranges[0];

	            return this.startAngle + ((normalizedValue / dataRange) * this.arcAngle);
	        }

	    });

	    return RadialGauge;
	    
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/gauges/Gauge":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("shim/highcharts"),
	            __webpack_require__("js_charting/visualizations/Visualization"),
	            __webpack_require__("js_charting/helpers/Formatter"),
	            __webpack_require__("js_charting/components/ColorPalette"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/parsing_utils"),
	            __webpack_require__("js_charting/util/testing_utils"),
	            __webpack_require__("js_charting/util/math_utils"),
	            __webpack_require__("js_charting/util/dom_utils"),
	            __webpack_require__("js_charting/util/color_utils"),
	            __webpack_require__("stubs/i18n")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Highcharts,
	            Visualization,
	            Formatter,
	            ColorPalette,
	            langUtils,
	            parsingUtils,
	            testingUtils,
	            mathUtils,
	            domUtils,
	            colorUtils,
	            i18n
	        ) {

	    var Gauge = function(container, properties) {
	        Visualization.call(this, container, properties);
	        // for consistency with other chart types, create a <div> inside this container where the gauge will draw
	        this.$hcContainer = $('<div />').addClass('highcharts-container').appendTo(this.container);
	        this.elements = {};
	        this.hasRendered = false;
	        this.needsRedraw = true;
	    };
	    langUtils.inherit(Gauge, Visualization);

	    $.extend(Gauge.prototype, {

	        WINDOW_RESIZE_DELAY: 100,

	        EXPORT_HEIGHT: 400,
	        EXPORT_WIDTH: 600,

	        MIN_GAUGE_HEIGHT: 25,
	        RESIZED_GAUGE_HEIGHT: 200,

	        DEFAULT_COLORS: [0x84E900, 0xFFE800, 0xBF3030],
	        DEFAULT_RANGES: [0, 30, 70, 100],
	        MAX_TICKS_PER_RANGE: 10,

	        showValueByDefault: true,
	        showMinorTicksByDefault: true,

	        getFieldList: function() {
	            return [];
	        },

	        // in export mode we need to set explicit width and height
	        // we'll honor the width and height of the parent node, unless they are zero
	        getWidth: function() {
	            var width = Visualization.prototype.getWidth.call(this);
	            if(this.exportMode) {
	                return width || this.EXPORT_WIDTH;
	            }
	            return width;
	        },

	        getHeight: function() {
	            var height = Visualization.prototype.getHeight.call(this);
	            if(this.exportMode) {
	                return height || this.EXPORT_HEIGHT;
	            }
	            // Fix for SPL-61657 - make sure the height of the gauge div can't be below a certain threshold
	            height = (height < this.MIN_GAUGE_HEIGHT) ? this.RESIZED_GAUGE_HEIGHT : height;
	            return height;
	        },

	        prepare: function(dataSet, properties) {
	            var oldRanges = $.extend([], this.ranges);
	            Visualization.prototype.prepare.call(this, dataSet, properties);
	            if(!parsingUtils.arraysAreEquivalent(oldRanges, this.ranges)) {
	                this.needsRedraw = true;
	            }
	        },

	        handleDraw: function(callback) {
	            if(this.needsRedraw) {
	                this.teardownGauge();
	                this.renderer = new Highcharts.Renderer(this.$hcContainer[0], this.getWidth(), this.getHeight());
	                this.formatter = new Formatter(this.renderer);
	                this.$container.css('backgroundColor', this.backgroundColor);
	                this.renderGauge();
	                this.hasRendered = true;
	                if(this.testMode) {
	                    testingUtils.gaugeAddTestingMetadata(this, this.elements, this.getClassName(), this.value);
	                    testingUtils.createGlobalReference(this, this.getChartObject());
	                }
	                this.needsRedraw = false;
	                this.cacheDrawnDimensions();
	            }
	            else {
	                this.updateValue(this.previousValue || 0, this.value);
	            }
	            callback(this);
	        },

	        setSize: function(width, height) {
	            if(!this.hasRendered) {
	                return;
	            }
	            this.teardownGauge();
	            this.renderer = new Highcharts.Renderer(this.$hcContainer[0], width, height);
	            this.formatter = new Formatter(this.renderer);
	            this.renderGauge();
	            if(this.testMode) {
	                testingUtils.gaugeAddTestingMetadata(this, this.elements, this.getClassName(), this.value);
	            }
	            this.hasRendered = true;
	            this.cacheDrawnDimensions();
	        },

	        destroy: function() {
	            this.teardownGauge();
	            this.$hcContainer.remove();
	        },

	        teardownGauge: function() {
	            var key;
	            // stop any running animations
	            this.stopWobble();
	            this.$container.stop();
	            for(key in this.elements) {
	                if(this.elements.hasOwnProperty(key)) {
	                    this.elements[key].destroy();
	                }
	            }
	            if(this.renderer) {
	                this.renderer.destroy();
	            }
	            if(this.formatter) {
	                this.formatter.destroy();
	            }
	            this.elements = {};
	            this.$hcContainer.empty();
	            this.$container.css('backgroundColor', '');
	            this.hasRendered = false;
	        },

	        getSVG: function() {
	            return this.$container.find('svg').eq(0).parent().html();
	        },

	        processProperties: function() {
	            Visualization.prototype.processProperties.call(this);
	            this.colors = this.computeColors();
	            this.colorPalette = new ColorPalette(this.colors, true);
	            this.ranges = this.computeRanges();
	            this.previousValue = this.value;
	            this.value = this.computeValue();

	            this.majorUnit = parseInt(this.properties['chart.majorUnit'], 10) || null;
	            this.showMajorTicks = parsingUtils.normalizeBoolean(this.properties['chart.showMajorTicks'], true);
	            this.showMinorTicks = parsingUtils.normalizeBoolean(this.properties['chart.showMinorTicks'], this.showMinorTicksByDefault);
	            this.showLabels = parsingUtils.normalizeBoolean(this.properties['chart.showLabels'], true);
	            this.showValue = parsingUtils.normalizeBoolean(this.properties['chart.showValue'], this.showValueByDefault);
	            this.showRangeBand = parsingUtils.normalizeBoolean(this.properties['chart.showRangeBand'], true);
	            this.usePercentageRange = parsingUtils.normalizeBoolean(this.properties['chart.usePercentageRange']);
	            this.usePercentageValue = parsingUtils.normalizeBoolean(this.properties['chart.usePercentageValue']);
	            this.isShiny = this.properties['chart.style'] !== 'minimal';
	        },

	        computeColors: function() {
	            var userColors = parsingUtils.stringToHexArray(this.properties['chart.gaugeColors'] || this.properties['gaugeColors']);
	            return (userColors && userColors.length > 0) ? userColors : this.DEFAULT_COLORS;
	        },

	        computeRanges: function() {
	            var ranges,
	                userRanges = parsingUtils.stringToArray(this.properties['chart.rangeValues']);
	            
	            if(userRanges && userRanges.length > 1) {
	                ranges = userRanges;
	            }
	            else {
	                var dataFields = this.dataSet.allDataFields();
	                ranges = _(dataFields.slice(1)).map(function(field) {
	                    return this.dataSet.getSeries(field)[0];
	                }, this);
	            }
	            var prevRange = -Infinity,
	                floatRanges = [];

	            _(ranges).each(function(range) {
	                var floatRange = mathUtils.parseFloat(range);
	                if(!_(floatRange).isNaN() && floatRange > prevRange) {
	                    floatRanges.push(floatRange);
	                    prevRange = floatRange;
	                }
	            });

	            return (floatRanges.length > 1) ? floatRanges : this.DEFAULT_RANGES;
	        },

	        computeValue: function() {
	            var dataFields = this.dataSet.allDataFields();
	            return (dataFields.length > 0) ? mathUtils.parseFloat(this.dataSet.getSeries(dataFields[0])[0]) || 0 : 0;
	        },

	        updateValue: function(oldValue, newValue) {
	            // if the value didn't change, do nothing
	            if(oldValue === newValue) {
	                return;
	            }
	            if(this.shouldAnimateTransition(oldValue, newValue)) {
	                this.stopWobble();
	                this.animateTransition(oldValue, newValue, _(this.drawIndicator).bind(this), _(this.onAnimationFinished).bind(this));
	            }
	            if(this.showValue) {
	                var valueText = this.formatValue(newValue);
	                this.updateValueDisplay(valueText);
	            }
	            if(this.testMode) {
	                testingUtils.gaugeUpdate(this.$container, newValue);
	            }
	        },

	        shouldAnimateTransition: function(oldValue, newValue) {
	            // if we were already out of range, no need to animate the indicator
	            return (this.normalizedTranslateValue(oldValue) !== this.normalizedTranslateValue(newValue));
	        },

	        drawTicks: function() {
	            var i, loopTranslation, loopText,
	                tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.MAX_TICKS_PER_RANGE);

	            for(i = 0; i < tickValues.length; i++) {
	                loopTranslation = this.translateValue(tickValues[i]);
	                if(this.showMajorTicks) {
	                    this.elements['tickMark_' + tickValues[i]] = this.drawMajorTick(loopTranslation);
	                }
	                if(this.showLabels) {
	                    loopText = this.formatTickLabel(tickValues[i]);
	                    this.elements['tickLabel_' + tickValues[i]] = this.drawMajorTickLabel(loopTranslation, loopText);
	                }
	            }
	            // if the labels are visible, check for collisions and remove ticks if needed before drawing the minors
	            if(this.showLabels) {
	                tickValues = this.removeTicksIfOverlap(tickValues);
	            }

	            if(this.showMinorTicks) {
	                var majorInterval = tickValues[1] - tickValues[0],
	                    minorInterval = majorInterval / this.minorsPerMajor,
	                    startValue = (this.usePercentageRange) ?
	                        this.ranges[0] :
	                        tickValues[0] - Math.floor((tickValues[0] - this.ranges[0]) / minorInterval) * minorInterval;

	                for(i = startValue; i <= this.ranges[this.ranges.length - 1]; i += minorInterval) {
	                    if(!this.showMajorTicks || $.inArray(i, tickValues) < 0) {
	                        loopTranslation = this.translateValue(i);
	                        this.elements['minorTickMark_' + i] = this.drawMinorTick(loopTranslation);
	                    }
	                }
	            }
	        },

	        removeTicksIfOverlap: function(tickValues) {
	            while(tickValues.length > 2 && this.tickLabelsOverlap(tickValues)) {
	                tickValues = this.removeEveryOtherTick(tickValues);
	            }
	            return tickValues;
	        },

	        tickLabelsOverlap: function(tickValues) {
	            var i, labelOne, labelTwo,
	                marginX = 3,
	                marginY = 1,
	                renderer = this.renderer;

	            // Highcharts is doing a little too good of a job cache-ing the bounding boxes of numerical text elements.
	            // We have to bust the per-renderer cache unless there is per-element cached value (SPL-83393).
	            var getBBox = function(wrapper) {
	                if(wrapper.bBox) {
	                    return wrapper.bBox;
	                }
	                renderer.cache = {};
	                return wrapper.getBBox();
	            };

	            for(i = 0; i < tickValues.length - 1; i++) {
	                labelOne = this.elements['tickLabel_' + tickValues[i]];
	                labelTwo = this.elements['tickLabel_' + tickValues[i + 1]];
	                if(this.formatter.bBoxesOverlap(getBBox(labelOne), getBBox(labelTwo), marginX, marginY)) {
	                    return true;
	                }
	            }
	            return false;
	        },

	        removeEveryOtherTick: function(tickValues) {
	            var i,
	                newTickValues = [];

	            for(i = 0; i < tickValues.length; i++) {
	                if(i % 2 === 0) {
	                    newTickValues.push(tickValues[i]);
	                }
	                else {
	                    if(this.elements['tickMark_' + tickValues[i]]) {
	                        this.elements['tickMark_' + tickValues[i]].destroy();
	                        delete this.elements['tickMark_' + tickValues[i]];
	                    }
	                    if(this.elements['tickLabel_' + tickValues[i]]) {
	                        this.elements['tickLabel_' + tickValues[i]].destroy();
	                        delete this.elements['tickLabel_' + tickValues[i]];
	                    }
	                }
	            }
	            return newTickValues;
	        },

	        // we can't use the jQuery animation library explicitly to perform complex SVG animations, but
	        // we can take advantage of their implementation using a meaningless css property and a custom step function
	        animateTransition: function(startVal, endVal, drawFn, finishCallback) {
	            var animationRange = endVal - startVal,
	                duration = 500,
	                animationProperties = {
	                    duration: duration,
	                    step: function(now) {
	                        drawFn(startVal + now);
	                    }.bind(this)
	                };

	            if(finishCallback) {
	                animationProperties.complete = function() {
	                    finishCallback(endVal);
	                };
	            }
	            // for the animation start and end values, use 0 and animationRange for consistency with the way jQuery handles
	            // css properties that it doesn't recognize
	            this.$container
	                .stop(true, true)
	                .css({'animation-progress': 0})
	                .animate({'animation-progress': animationRange}, animationProperties);
	        },

	        onAnimationFinished: function(val) {
	            this.checkOutOfRange(val);
	        },

	        checkOutOfRange: function(val) {
	            var totalRange, wobbleCenter, wobbleRange;

	            if(val < this.ranges[0]) {
	                totalRange = this.ranges[this.ranges.length - 1] - this.ranges[0];
	                wobbleRange = totalRange * 0.005;
	                wobbleCenter = this.ranges[0] + wobbleRange;
	                this.wobble(wobbleCenter, wobbleRange, this.drawIndicator);
	            }
	            else if(val > this.ranges[this.ranges.length - 1]) {
	                totalRange = this.ranges[this.ranges.length - 1] - this.ranges[0];
	                wobbleRange = totalRange * 0.005;
	                wobbleCenter = this.ranges[this.ranges.length - 1] - wobbleRange;
	                this.wobble(wobbleCenter, wobbleRange, this.drawIndicator);
	            }
	        },

	        formatValue: function(val) {
	            return (this.usePercentageValue) ?
	                this.formatPercent(((val - this.ranges[0]) / (this.ranges[this.ranges.length - 1] - this.ranges[0]))) :
	                this.formatNumber(val);
	        },

	        formatTickLabel: function(val) {
	            return (this.usePercentageRange) ?
	                this.formatPercent(((val - this.ranges[0]) / (this.ranges[this.ranges.length - 1] - this.ranges[0]))) :
	                this.formatNumber(val);
	        },

	        formatNumber: function(val) {
	            var parsedVal = parseFloat(val),
	                absVal = Math.abs(parsedVal);
	            // if the magnitude is 1 billion or greater or less than one thousandth (and non-zero), express it in scientific notation
	            if(absVal >= 1e9 || (absVal !== 0 && absVal < 1e-3)) {
	                return i18n.format_scientific(parsedVal, "#.###E0");
	            }
	            return i18n.format_decimal(parsedVal);
	        },

	        formatPercent: function(val) {
	            return i18n.format_percent(val);
	        },

	        wobble: function(center, range, drawFn) {
	            var self = this,
	                wobbleCounter = 0;

	            this.wobbleInterval = setInterval(function() {
	                var wobbleVal = center + (wobbleCounter % 3 - 1) * range;
	                drawFn.call(self, wobbleVal);
	                wobbleCounter = (wobbleCounter + 1) % 3;
	            }, 75);

	        },

	        stopWobble: function() {
	            clearInterval(this.wobbleInterval);
	        },

	        predictTextWidth: function(text, fontSize) {
	            return this.formatter.predictTextWidth(text, fontSize);
	        },

	        calculateTickValues: function(start, end, numTicks) {
	            var i, loopStart,
	                range = end - start,
	                rawTickInterval = range / (numTicks - 1),
	                nearestPowerOfTen = mathUtils.nearestPowerOfTen(rawTickInterval),
	                roundTickInterval = nearestPowerOfTen,
	                tickValues = [];

	            if(this.usePercentageRange) {
	                roundTickInterval = (this.majorUnit && !isNaN(this.majorUnit)) ? Math.abs(this.majorUnit) : 10;
	                for(i = 0; i <= 100; i += roundTickInterval) {
	                    tickValues.push(start + (i / 100) * range);
	                }
	            }
	            else {
	                if(this.majorUnit && !isNaN(this.majorUnit)) {
	                    roundTickInterval = Math.abs(this.majorUnit);
	                }
	                else {
	                    if(range / roundTickInterval > numTicks) {
	                        // if the tick interval creates too many ticks, bump up to a factor of two
	                        roundTickInterval *= 2;
	                    }
	                    if(range / roundTickInterval > numTicks) {
	                        // if there are still too many ticks, bump up to a factor of five (of the original)
	                        roundTickInterval *= (5 / 2);
	                    }
	                    if(range / roundTickInterval > numTicks) {
	                        // if there are still too many ticks, bump up to a factor of ten (of the original)
	                        roundTickInterval *= 2;
	                    }
	                }
	                // in normal mode we label in whole numbers, so the tick discovery loop starts at 0 or an appropriate negative number
	                // but in percent mode we force it to label the first range value and go from there
	                loopStart = (this.usePercentageRange) ?
	                    start :
	                    (start >= 0) ? 0 : (start - start % roundTickInterval);
	                for(i = loopStart; i <= end; i += roundTickInterval) {
	                    if(i >= start) {
	                        // work-around to deal with floating-point rounding errors
	                        tickValues.push(parseFloat(i.toFixed(14)));
	                    }
	                }
	            }
	            return tickValues;
	        },

	        getColorByIndex: function(index) {
	            return colorUtils.colorFromHex(this.colorPalette.getColor(null, index, this.ranges.length - 1));
	        },

	        // this is just creating a stub interface so automated tests won't fail
	        getChartObject: function() {
	            return {
	                series: [
	                    {
	                        data: [
	                               {
	                                   y: this.value,
	                                   onMouseOver: function() { }
	                               }
	                        ]
	                    }
	                ]
	            };
	        },


	        // to be implemented by subclasses
	        renderGauge: function() {
	            this.updateDimensions();
	        },
	        translateValue: function() { },
	        normalizedTranslateValue: function() { }

	    });

	    return Gauge;
	    
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "js_charting/visualizations/gauges/HorizontalFillerGauge":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("js_charting/visualizations/gauges/FillerGauge"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/math_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            FillerGauge,
	            langUtils,
	            mathUtils
	        ) {

	    var HorizontalFillerGauge = function(container, properties) {
	        FillerGauge.call(this, container, properties);
	        this.horizontalPadding = 20;
	        this.tickOffset = 5;
	        this.tickLength = 15;
	        this.tickWidth = 1;
	        this.tickLabelOffset = 5;
	        this.minorTickLength = Math.floor(this.tickLength / 2);
	    };
	    langUtils.inherit(HorizontalFillerGauge, FillerGauge);

	    $.extend(HorizontalFillerGauge.prototype, {

	        renderGauge: function() {
	            this.tickFontSize = mathUtils.roundWithMinMax(this.width / 50, 10, 20);  // in pixels
	            this.backgroundCornerRad = mathUtils.roundWithMinMax(this.width / 120, 3, 5);
	            this.valueFontSize = mathUtils.roundWithMinMax(this.width / 40, 15, 25);  // in pixels
	            this.backgroundHeight = this.valueFontSize * 3;
	            this.valueBottomPadding = mathUtils.roundWithMinMax(this.width / 100, 5, 10);
	            FillerGauge.prototype.renderGauge.call(this);
	        },

	        drawBackground: function() {
	            var tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.MAX_TICKS_PER_RANGE),
	                maxTickValue = tickValues[tickValues.length - 1],
	                maxTickWidth = this.predictTextWidth(this.formatValue(maxTickValue), this.tickFontSize);

	            this.horizontalPadding = Math.max(this.horizontalPadding, maxTickWidth);
	            this.backgroundWidth = this.width - (2 * this.horizontalPadding);

	            if(this.isShiny) {
	                this.elements.background = this.renderer.rect(this.horizontalPadding,
	                    (this.height - this.backgroundHeight) / 2, this.backgroundWidth, this.backgroundHeight,
	                    this.backgroundCornerRad)
	                    .attr({
	                        fill: '#edede7',
	                        stroke: 'silver',
	                        'stroke-width': 1
	                    })
	                    .add();
	            }

	            // no actual dependency here, but want to be consistent with sibling class
	            this.tickStartY = (this.height + this.backgroundHeight) / 2 + this.tickOffset;
	            this.tickEndY = this.tickStartY + this.tickLength;
	            this.tickLabelStartY = this.tickEndY + this.tickLabelOffset;
	        },

	        drawMajorTick: function(offset) {
	            var tickOffset = this.horizontalPadding + offset;

	            return this.renderer.path([
	                'M', tickOffset, this.tickStartY,
	                'L', tickOffset, this.tickEndY
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.tickWidth
	                })
	                .add();
	        },

	        drawMajorTickLabel: function(offset, text) {
	            var tickOffset = this.horizontalPadding + offset;

	            return this.renderer.text(text,
	                tickOffset, this.tickLabelStartY + this.tickFontSize
	            )
	                .attr({
	                    align: 'center'
	                })
	                .css({
	                    color: this.tickFontColor,
	                    fontSize: this.tickFontSize + 'px',
	                    lineHeight: this.tickFontSize + 'px'
	                })
	                .add();
	        },

	        drawMinorTick: function(offset) {
	            var tickOffset = this.horizontalPadding + offset;

	            return this.renderer.path([
	                'M', tickOffset, this.tickStartY,
	                'L', tickOffset, this.tickStartY + this.minorTickLength
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.minorTickWidth
	                })
	                .add();
	        },

	        drawIndicator: function(val) {
	            // TODO: implement calculation of gradient based on user-defined colors
	            // for not we are using solid colors

	            var //fillGradient = this.getFillGradient(val),
	                fillColor = this.getFillColor(val),
	                fillOffset = this.normalizedTranslateValue(val),
	                fillTopX,
	                fillPath;
	            if(fillOffset > 0) {
	                fillOffset = Math.max(fillOffset, this.backgroundCornerRad);
	                fillTopX = this.horizontalPadding + fillOffset;
	                if(!this.isShiny) {
	                    fillPath = [
	                        'M', this.horizontalPadding,
	                        (this.height - this.backgroundHeight) / 2,
	                        'L', fillTopX,
	                        (this.height - this.backgroundHeight) / 2,
	                        fillTopX,
	                        (this.height + this.backgroundHeight) / 2,
	                        this.horizontalPadding,
	                        (this.height + this.backgroundHeight) / 2,
	                        this.horizontalPadding,
	                        (this.height - this.backgroundHeight) / 2
	                    ];
	                }
	                else {
	                    fillPath = [
	                        'M', this.horizontalPadding + this.backgroundCornerRad,
	                        (this.height - this.backgroundHeight - 2) / 2,
	                        'C', this.horizontalPadding + this.backgroundCornerRad,
	                        (this.height - this.backgroundHeight - 2) / 2,
	                        this.horizontalPadding,
	                        (this.height - this.backgroundHeight - 2) / 2,
	                        this.horizontalPadding,
	                        (this.height - this.backgroundHeight - 2) / 2 + this.backgroundCornerRad,
	                        'L', this.horizontalPadding,
	                        (this.height + this.backgroundHeight) / 2 - this.backgroundCornerRad,
	                        'C', this.horizontalPadding,
	                        (this.height + this.backgroundHeight) / 2 - this.backgroundCornerRad,
	                        this.horizontalPadding,
	                        (this.height + this.backgroundHeight) / 2,
	                        this.horizontalPadding + this.backgroundCornerRad,
	                        (this.height + this.backgroundHeight) / 2,
	                        'L', fillTopX,
	                        (this.height + this.backgroundHeight) / 2,
	                        fillTopX,
	                        (this.height - this.backgroundHeight - 2) / 2,
	                        this.horizontalPadding + this.backgroundCornerRad,
	                        (this.height - this.backgroundHeight - 2) / 2
	                    ];
	                }
	            }
	            else {
	                fillPath = [];
	            }

	            if(this.elements.fill) {
	                this.elements.fill.destroy();
	            }
	            this.elements.fill = this.renderer.path(fillPath)
	                .attr({
	                    fill: fillColor
	                })
	                .add();
	            if(this.showValue) {
	                this.drawValueDisplay(val, fillColor, fillOffset);
	            }
	        },

	        drawValueDisplay: function(val, fillColor, fillOffset) {
	            var displayVal = this.getDisplayValue(val),
	                fillTopX = this.horizontalPadding + fillOffset,
	                valueColor = this.getValueColor(fillColor),
	                valueStartX,
	                valueText = this.formatValue(displayVal),
	                valueTotalWidth = this.predictTextWidth(valueText, this.valueFontSize) + this.valueBottomPadding;

	            // determine if the value display can (horizontally) fit inside the fill,
	            // if not orient it to the right of the fill
	            if(fillOffset >= valueTotalWidth) {
	                valueStartX = fillTopX - valueTotalWidth;
	            }
	            else {
	                valueStartX = fillTopX + this.valueBottomPadding;
	                valueColor = this.defaultValueColor;
	            }
	            if(this.elements.valueDisplay) {
	                this.elements.valueDisplay.attr({
	                    text: valueText,
	                    x: valueStartX
	                })
	                    .css({
	                        color: valueColor,
	                        fontSize: this.valueFontSize + 'px',
	                        fontWeight: 'bold'
	                    }).toFront();
	            }
	            else {
	                this.elements.valueDisplay = this.renderer.text(
	                    valueText, valueStartX, (this.height / 2) + this.valueFontSize / 4
	                )
	                    .css({
	                        color: valueColor,
	                        fontSize: this.valueFontSize + 'px',
	                        lineHeight: this.valueFontSize + 'px',
	                        fontWeight: 'bold'
	                    })
	                    .attr({
	                        align: 'left'
	                    })
	                    .add();
	            }
	        },

	        normalizedTranslateValue: function(val) {
	            if(val < this.ranges[0]) {
	                return 0;
	            }
	            if(val > this.ranges[this.ranges.length - 1]) {
	                return this.translateValue(this.ranges[this.ranges.length - 1]);
	            }
	            return this.translateValue(val);
	        },

	        translateValue: function(val) {
	            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
	                normalizedValue = val - this.ranges[0];

	            return Math.round((normalizedValue / dataRange) * this.backgroundWidth);
	        }

	    });

	    return HorizontalFillerGauge;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/gauges/FillerGauge":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("js_charting/visualizations/gauges/Gauge"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/math_utils"),
	            __webpack_require__("js_charting/util/color_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            Gauge,
	            langUtils,
	            mathUtils,
	            colorUtils
	        ) {

	    var FillerGauge = function(container, properties) {
	        Gauge.call(this, container, properties);
	        this.minorsPerMajor = 5;
	        this.minorTickWidth = 1;
	    };
	    langUtils.inherit(FillerGauge, Gauge);

	    $.extend(FillerGauge.prototype, {

	        processProperties: function() {
	            Gauge.prototype.processProperties.call(this);
	        },

	        onAnimationFinished: function() {
	            // no-op for filler gauges
	        },

	        renderGauge: function() {
	            Gauge.prototype.renderGauge.call(this);
	            this.tickColor = this.foregroundColor;
	            this.tickFontColor = this.fontColor;
	            this.defaultValueColor = (this.isShiny) ? 'black' : this.fontColor;
	            this.drawBackground();
	            this.drawTicks();
	            this.drawIndicator(this.value);
	        },

	        // use the decimal precision of the old and new values to set things up for a smooth animation
	        updateValue: function(oldValue, newValue) {
	            var oldPrecision = mathUtils.getDecimalPrecision(oldValue, 3),
	                newPrecision = mathUtils.getDecimalPrecision(newValue, 3);

	            this.valueAnimationPrecision = Math.max(oldPrecision, newPrecision);
	            Gauge.prototype.updateValue.call(this, oldValue, newValue);
	        },

	        getDisplayValue: function(rawVal) {
	            // unless this we are displaying a final value, round the value to the animation precision for a smooth transition
	            var multiplier = Math.pow(10, this.valueAnimationPrecision);
	            return ((rawVal !== this.value) ? (Math.round(rawVal * multiplier) / multiplier) : rawVal);
	        },

	        updateValueDisplay: function() {
	            // no-op, value display is updated as part of drawIndicator
	        },

	        // filler gauges animate the change in the value display,
	        // so they always animate transitions, even when the values are out of range
	        shouldAnimateTransition: function() {
	            return true;
	        },

	        getFillColor: function(val) {
	            var i;
	            for(i = 0; i < this.ranges.length - 2; i++) {
	                if(val <= this.ranges[i + 1]) {
	                    break;
	                }
	            }
	            return this.getColorByIndex(i);
	        },

	        // use the value to determine the fill color, then use that color's luminance determine
	        // if a light or dark font color should be used
	        getValueColor: function(fillColor) {
	            var fillColorHex = colorUtils.hexFromColor(fillColor),
	                luminanceThreshold = 128,
	                darkColor = 'black',
	                lightColor = 'white',
	                fillLuminance = colorUtils.getLuminance(fillColorHex);

	            return (fillLuminance < luminanceThreshold) ? lightColor : darkColor;
	        }

	    });

	    return FillerGauge;
	    
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/gauges/VerticalFillerGauge":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("js_charting/visualizations/gauges/FillerGauge"),
	            __webpack_require__("js_charting/util/lang_utils"),        
	            __webpack_require__("js_charting/util/math_utils")        
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            FillerGauge,
	            langUtils,
	            mathUtils
	        ) {

	    var VerticalFillerGauge = function(container, properties) {
	        FillerGauge.call(this, container, properties);
	        this.tickWidth = 1;
	    };
	    langUtils.inherit(VerticalFillerGauge, FillerGauge);

	    $.extend(VerticalFillerGauge.prototype, {

	        renderGauge: function() {
	            this.tickOffset = mathUtils.roundWithMin(this.height / 100, 3);
	            this.tickLength = mathUtils.roundWithMin(this.height / 20, 4);
	            this.tickLabelOffset = mathUtils.roundWithMin(this.height / 60, 3);
	            this.tickFontSize = mathUtils.roundWithMin(this.height / 20, 10);  // in pixels
	            this.minorTickLength = this.tickLength / 2;
	            this.backgroundCornerRad = mathUtils.roundWithMin(this.height / 60, 3);
	            this.valueBottomPadding = mathUtils.roundWithMin(this.height / 30, 5);
	            this.valueFontSize = mathUtils.roundWithMin(this.height / 20, 12);  // in pixels
	            FillerGauge.prototype.renderGauge.call(this);
	        },

	        drawBackground: function() {
	            this.verticalPadding = 10 + this.tickFontSize / 2;
	            this.backgroundWidth = mathUtils.roundWithMin(this.height / 4, 50);
	            this.backgroundHeight = this.height - (2 * this.verticalPadding);

	            // rather than trying to dynamically increase the width as the values come in, we
	            // provide enough room for an order of magnitude greater than the highest range value
	            var maxValueWidth = this.determineMaxValueWidth(this.ranges, this.valueFontSize) + 10;

	            this.backgroundWidth = Math.max(this.backgroundWidth, maxValueWidth);

	            if(this.isShiny) {
	                this.elements.background = this.renderer.rect((this.width - this.backgroundWidth) / 2,
	                    this.verticalPadding, this.backgroundWidth, this.backgroundHeight,
	                    this.backgroundCornerRad)
	                    .attr({
	                        fill: '#edede7',
	                        stroke: 'silver',
	                        'stroke-width': 1
	                    })
	                    .add();
	            }

	            // these values depend on the adjusted width of the background
	            this.tickStartX = (this.width + this.backgroundWidth) / 2 + this.tickOffset;
	            this.tickEndX = this.tickStartX + this.tickLength;
	            this.tickLabelStartX = this.tickEndX + this.tickLabelOffset;
	        },

	        determineMaxValueWidth: function(ranges, fontSize) {
	            // in percent mode, we can hard-code what the max-width value can be
	            if(this.usePercentageValue) {
	                return this.predictTextWidth("100.00%", fontSize);
	            }
	            var i, valueString,
	                maxWidth = 0;

	            // loop through all ranges and determine which has the greatest width (because of scientific notation, we can't just look at the extremes)
	            // additionally add an extra digit to the min and max ranges to accomodate out-of-range values
	            for(i = 0; i < ranges.length; i++) {
	                valueString = "" + ranges[i];
	                if(i === 0 || i === ranges.length - 1) {
	                    valueString += "0";
	                }
	                maxWidth = Math.max(maxWidth, this.predictTextWidth(valueString, fontSize));
	            }
	            return maxWidth;
	        },

	        drawMajorTick: function(height) {
	            var tickHeight = this.verticalPadding + this.backgroundHeight - height;

	            return this.renderer.path([
	                'M', this.tickStartX, tickHeight,
	                'L', this.tickEndX, tickHeight
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.tickWidth
	                })
	                .add();
	        },

	        drawMajorTickLabel: function(height, text) {
	            var tickHeight = this.verticalPadding + this.backgroundHeight - height;

	            return this.renderer.text(text,
	                this.tickLabelStartX, tickHeight + (this.tickFontSize / 4)
	            )
	                .attr({
	                    align: 'left'
	                })
	                .css({
	                    color: this.tickFontColor,
	                    fontSize: this.tickFontSize + 'px',
	                    lineHeight: this.tickFontSize + 'px'
	                })
	                .add();
	        },

	        drawMinorTick: function(height) {
	            var tickHeight = this.verticalPadding + this.backgroundHeight - height;

	            return this.renderer.path([
	                'M', this.tickStartX, tickHeight,
	                'L', this.tickStartX + this.minorTickLength, tickHeight
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.minorTickWidth
	                })
	                .add();
	        },

	        drawIndicator: function(val) {
	            // TODO: implement calculation of gradient based on user-defined colors
	            // for now we are using solid colors

	            var //fillGradient = this.getFillGradient(val),
	                fillColor = this.getFillColor(val),
	                fillHeight = this.normalizedTranslateValue(val),
	                fillTopY,
	                fillPath;
	            if(fillHeight > 0) {
	                fillHeight = Math.max(fillHeight, this.backgroundCornerRad);
	                fillTopY = this.verticalPadding + this.backgroundHeight - fillHeight;
	                if(!this.isShiny) {
	                    fillPath = [
	                        'M', (this.width - this.backgroundWidth) / 2,
	                        this.height - this.verticalPadding,
	                        'L', (this.width + this.backgroundWidth) / 2,
	                        this.height - this.verticalPadding,
	                        (this.width + this.backgroundWidth) / 2,
	                        fillTopY,
	                        (this.width - this.backgroundWidth) / 2,
	                        fillTopY,
	                        (this.width - this.backgroundWidth) / 2,
	                        this.height - this.verticalPadding
	                    ];
	                }
	                else {
	                    fillPath = [
	                        'M', (this.width - this.backgroundWidth - 2) / 2,
	                        this.height - this.verticalPadding - this.backgroundCornerRad,
	                        'C', (this.width - this.backgroundWidth - 2) / 2,
	                        this.height - this.verticalPadding - this.backgroundCornerRad,
	                        (this.width - this.backgroundWidth - 2) / 2,
	                        this.height - this.verticalPadding,
	                        (this.width - this.backgroundWidth - 2) / 2 + this.backgroundCornerRad,
	                        this.height - this.verticalPadding,
	                        'L', (this.width + this.backgroundWidth - 2) / 2 - this.backgroundCornerRad,
	                        this.height - this.verticalPadding,
	                        'C', (this.width + this.backgroundWidth - 2) / 2 - this.backgroundCornerRad,
	                        this.height - this.verticalPadding,
	                        (this.width + this.backgroundWidth - 2) / 2,
	                        this.height - this.verticalPadding,
	                        (this.width + this.backgroundWidth - 2) / 2,
	                        this.height - this.verticalPadding - this.backgroundCornerRad,
	                        'L', (this.width + this.backgroundWidth - 2) / 2,
	                        fillTopY,
	                        (this.width - this.backgroundWidth - 2) / 2,
	                        fillTopY,
	                        (this.width - this.backgroundWidth - 2) / 2,
	                        this.height - this.verticalPadding - this.backgroundCornerRad
	                    ];
	                }
	            }
	            else {
	                fillPath = [];
	            }

	            if(this.elements.fill) {
	                this.elements.fill.destroy();
	            }
	            this.elements.fill = this.renderer.path(fillPath)
	                .attr({
	                    fill: fillColor
	                })
	                .add();
	            if(this.showValue) {
	                this.drawValueDisplay(val, fillColor);
	            }
	        },

	        drawValueDisplay: function(val, fillColor) {
	            var displayVal = this.getDisplayValue(val),
	                fillHeight = this.normalizedTranslateValue(val),
	                fillTopY = this.verticalPadding + this.backgroundHeight - fillHeight,
	                valueTotalHeight = this.valueFontSize + this.valueBottomPadding,

	                valueColor = this.getValueColor(fillColor),
	                valueBottomY,
	                valueText = this.formatValue(displayVal);

	            // determine if the value display can (vertically) fit inside the fill,
	            // if not orient it to the bottom of the fill
	            if(fillHeight >= valueTotalHeight) {
	                valueBottomY = fillTopY + valueTotalHeight - this.valueBottomPadding;
	            }
	            else {
	                valueBottomY = fillTopY - this.valueBottomPadding;
	                valueColor = this.defaultValueColor;
	            }
	            if(this.elements.valueDisplay) {
	                this.elements.valueDisplay.attr({
	                    text: valueText,
	                    y: valueBottomY
	                })
	                    .css({
	                        color: valueColor,
	                        fontSize: this.valueFontSize + 'px',
	                        fontWeight: 'bold'
	                    }).toFront();
	            }
	            else {
	                this.elements.valueDisplay = this.renderer.text(
	                    valueText, this.width / 2, valueBottomY
	                )
	                    .css({
	                        color: valueColor,
	                        fontSize: this.valueFontSize + 'px',
	                        lineHeight: this.valueFontSize + 'px',
	                        fontWeight: 'bold'
	                    })
	                    .attr({
	                        align: 'center'
	                    })
	                    .add();
	            }
	        },

	        normalizedTranslateValue: function(val) {
	            if(val < this.ranges[0]) {
	                return 0;
	            }
	            if(val > this.ranges[this.ranges.length - 1]) {
	                return this.translateValue(this.ranges[this.ranges.length - 1]) + 5;
	            }
	            return this.translateValue(val);
	        },

	        translateValue: function(val) {
	            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
	                normalizedValue = val - this.ranges[0];

	            return Math.round((normalizedValue / dataRange) * this.backgroundHeight);
	        }

	    });

	    return VerticalFillerGauge;
	    
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/gauges/HorizontalMarkerGauge":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("js_charting/visualizations/gauges/MarkerGauge"),
	            __webpack_require__("js_charting/util/lang_utils"),
	            __webpack_require__("js_charting/util/math_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            MarkerGauge,
	            langUtils,
	            mathUtils
	        ) {

	    var HorizontalMarkerGauge = function(container, properties) {
	        MarkerGauge.call(this, container, properties);
	        this.horizontalPadding = 20;
	        this.tickOffset = 5;
	        this.tickLength = 15;
	        this.tickWidth = 1;
	        this.tickLabelOffset = 5;
	        this.minorTickLength = Math.floor(this.tickLength / 2);
	        this.bandHeight = (!this.isShiny) ? 35 : 15;
	    };
	    langUtils.inherit(HorizontalMarkerGauge, MarkerGauge);

	    $.extend(HorizontalMarkerGauge.prototype, {

	        renderGauge: function() {
	            this.markerWindowHeight = mathUtils.roundWithMinMax(this.width / 30, 30, 80);
	            this.markerSideWidth = this.markerWindowHeight / 2;
	            this.markerSideCornerRad = this.markerSideWidth / 3;
	            this.bandOffsetBottom = 5 + this.markerWindowHeight / 2;
	            this.bandOffsetTop = 5 + this.markerWindowHeight / 2;
	            this.tickFontSize = mathUtils.roundWithMinMax(this.width / 50, 10, 20);  // in pixels
	            this.backgroundCornerRad = mathUtils.roundWithMinMax(this.width / 120, 3, 5);
	            this.valueFontSize = mathUtils.roundWithMinMax(this.width / 40, 15, 25);  // in pixels
	            this.valueOffset = this.markerSideWidth + 10;
	            this.tickLabelPadding = this.tickFontSize / 2;
	            this.bandOffsetX = (!this.isShiny) ? 0 : this.tickLabelPadding;
	            this.backgroundHeight = this.bandOffsetX + this.bandHeight + this.tickOffset + this.tickLength
	                + this.tickLabelOffset + this.tickFontSize + this.tickLabelPadding;
	            MarkerGauge.prototype.renderGauge.call(this);
	        },

	        drawBackground: function(tickValues) {
	            tickValues = this.calculateTickValues(this.ranges[0], this.ranges[this.ranges.length - 1], this.MAX_TICKS_PER_RANGE);
	            var maxTickValue = tickValues[tickValues.length - 1],
	                maxTickWidth = this.predictTextWidth(this.formatValue(maxTickValue), this.tickFontSize);

	            this.bandOffsetBottom = Math.max(this.bandOffsetBottom, maxTickWidth);
	            this.bandOffsetTop = Math.max(this.bandOffsetTop, maxTickWidth);
	            this.backgroundWidth = this.width - (2 * this.horizontalPadding);
	            this.bandWidth = this.backgroundWidth - (this.bandOffsetBottom + this.bandOffsetTop);

	            if(this.isShiny) {
	                this.elements.background = this.renderer.rect(this.horizontalPadding,
	                    (this.height - this.backgroundHeight) / 2, this.backgroundWidth, this.backgroundHeight,
	                    this.backgroundCornerRad)
	                    .attr({
	                        fill: '#edede7',
	                        stroke: 'silver',
	                        'stroke-width': 1
	                    })
	                    .add();
	            }
	        },

	        drawBand: function() {
	            var i, startOffset, endOffset,
	                bandStartX = this.horizontalPadding + this.bandOffsetBottom,
	                bandTopY = ((this.height - this.backgroundHeight) / 2) + this.bandOffsetX;

	            for(i = 0; i < this.ranges.length - 1; i++) {
	                startOffset = this.translateValue(this.ranges[i]);
	                endOffset = this.translateValue(this.ranges[i + 1]);
	                this.elements['colorBand' + i] = this.renderer.rect(
	                    bandStartX + startOffset, bandTopY,
	                    endOffset - startOffset, this.bandHeight, this.bandCornerRad
	                )
	                    .attr({
	                        fill: this.getColorByIndex(i)
	                    })
	                    .add();
	            }

	            this.tickStartY = (this.height - this.backgroundHeight) / 2 + (this.bandOffsetX + this.bandHeight)
	                + this.tickOffset;
	            this.tickEndY = this.tickStartY + this.tickLength;
	            this.tickLabelStartY = this.tickEndY + this.tickLabelOffset;
	        },

	        drawMajorTick: function(offset) {
	            var tickOffset = this.horizontalPadding + this.bandOffsetBottom + offset;

	            return this.renderer.path([
	                'M', tickOffset, this.tickStartY,
	                'L', tickOffset, this.tickEndY
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.tickWidth
	                })
	                .add();
	        },

	        drawMajorTickLabel: function(offset, text) {
	            var tickOffset = this.horizontalPadding + this.bandOffsetBottom + offset;

	            return this.renderer.text(text,
	                tickOffset, this.tickLabelStartY + this.tickFontSize
	            )
	                .attr({
	                    align: 'center'
	                })
	                .css({
	                    color: this.tickFontColor,
	                    fontSize: this.tickFontSize + 'px',
	                    lineHeight: this.tickFontSize + 'px'
	                })
	                .add();
	        },

	        drawMinorTick: function(offset) {
	            var tickOffset = this.horizontalPadding + this.bandOffsetBottom + offset;

	            return this.renderer.path([
	                'M', tickOffset, this.tickStartY,
	                'L', tickOffset, this.tickStartY + this.minorTickLength
	            ])
	                .attr({
	                    stroke: this.tickColor,
	                    'stroke-width': this.minorTickWidth
	                })
	                .add();
	        },

	        drawIndicator: function(val) {
	            var markerOffset = this.normalizedTranslateValue(val),
	                markerStartY = (!this.isShiny) ? (this.height - this.backgroundHeight) / 2 - 10 : (this.height - this.backgroundHeight) / 2,
	                markerEndY = (!this.isShiny) ? markerStartY + this.bandHeight + 20 : markerStartY + this.backgroundHeight,
	                markerStartX = this.horizontalPadding + this.bandOffsetBottom + markerOffset,
	                markerLineWidth = 3, // set to 1 for shiny
	                markerLineStroke = this.foregroundColor, // set to red for shiny
	                markerLinePath = [
	                    'M', markerStartX, markerStartY,
	                    'L', markerStartX, markerEndY
	                ];

	            if(this.isShiny) {
	                var markerLHSPath = [
	                        'M', markerStartX - this.markerWindowHeight / 2,
	                        markerStartY,
	                        'L', markerStartX - this.markerWindowHeight / 2,
	                        markerStartY  - (this.markerSideWidth - this.markerSideCornerRad),
	                        'C', markerStartX - this.markerWindowHeight / 2,
	                        markerStartY  - (this.markerSideWidth - this.markerSideCornerRad),
	                        markerStartX - this.markerWindowHeight / 2,
	                        markerStartY - this.markerSideWidth,
	                        markerStartX - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
	                        markerStartY - this.markerSideWidth,
	                        'L', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
	                        markerStartY - this.markerSideWidth,
	                        'C', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
	                        markerStartY - this.markerSideWidth,
	                        markerStartX + (this.markerWindowHeight / 2),
	                        markerStartY - this.markerSideWidth,
	                        markerStartX + (this.markerWindowHeight / 2),
	                        markerStartY - (this.markerSideWidth - this.markerSideCornerRad),
	                        'L', markerStartX + this.markerWindowHeight / 2,
	                        markerStartY,
	                        markerStartX - this.markerWindowHeight,
	                        markerStartY
	                    ],
	                    markerRHSPath = [
	                        'M', markerStartX - this.markerWindowHeight / 2,
	                        markerEndY,
	                        'L', markerStartX - this.markerWindowHeight / 2,
	                        markerEndY + (this.markerSideWidth - this.markerSideCornerRad),
	                        'C', markerStartX - this.markerWindowHeight / 2,
	                        markerEndY + (this.markerSideWidth - this.markerSideCornerRad),
	                        markerStartX - this.markerWindowHeight / 2,
	                        markerEndY + this.markerSideWidth,
	                        markerStartX - (this.markerWindowHeight / 2) + this.markerSideCornerRad,
	                        markerEndY + this.markerSideWidth,
	                        'L', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
	                        markerEndY + this.markerSideWidth,
	                        'C', markerStartX + (this.markerWindowHeight / 2) - this.markerSideCornerRad,
	                        markerEndY + this.markerSideWidth,
	                        markerStartX + (this.markerWindowHeight / 2),
	                        markerEndY + this.markerSideWidth,
	                        markerStartX + (this.markerWindowHeight / 2),
	                        markerEndY + (this.markerSideWidth - this.markerSideCornerRad),
	                        'L', markerStartX + this.markerWindowHeight / 2,
	                        markerEndY,
	                        markerStartX - this.markerWindowHeight,
	                        markerEndY
	                    ],
	                    markerBorderPath = [
	                        'M', markerStartX - this.markerWindowHeight / 2,
	                        markerStartY,
	                        'L', markerStartX - this.markerWindowHeight / 2,
	                        markerEndY,
	                        markerStartX + this.markerWindowHeight / 2,
	                        markerEndY,
	                        markerStartX + this.markerWindowHeight / 2,
	                        markerStartY,
	                        markerStartX - this.markerWindowHeight / 2,
	                        markerStartY
	                    ],
	                    markerUnderlinePath = [
	                        'M', markerStartX - 1,
	                        markerStartY,
	                        'L', markerStartX - 1,
	                        markerEndY
	                    ];
	                markerLineStroke = 'red';
	                markerLineWidth = 1;

	                if(this.elements.markerLHS) {
	                    this.elements.markerLHS.destroy();
	                }
	                this.elements.markerLHS = this.renderer.path(markerLHSPath)
	                    .attr({
	                        fill: '#cccccc'
	                    })
	                    .add();
	                if(this.elements.markerRHS) {
	                    this.elements.markerRHS.destroy();
	                }
	                this.elements.markerRHS = this.renderer.path(markerRHSPath)
	                    .attr({
	                        fill: '#cccccc'
	                    })
	                    .add();
	                if(this.elements.markerWindow) {
	                    this.elements.markerWindow.destroy();
	                }
	                this.elements.markerWindow = this.renderer.rect(markerStartX - this.markerWindowHeight / 2,
	                    markerStartY, this.markerWindowHeight, this.backgroundHeight, 0)
	                    .attr({
	                        fill: 'rgba(255, 255, 255, 0.3)'
	                    })
	                    .add();
	                if(this.elements.markerBorder) {
	                    this.elements.markerBorder.destroy();
	                }
	                this.elements.markerBorder = this.renderer.path(markerBorderPath)
	                    .attr({
	                        stroke: 'white',
	                        'stroke-width': 2
	                    })
	                    .add();
	                if(this.elements.markerUnderline) {
	                    this.elements.markerUnderline.destroy();
	                }
	                this.elements.markerUnderline = this.renderer.path(markerUnderlinePath)
	                    .attr({
	                        stroke: 'white',
	                        'stroke-width': 2
	                    })
	                    .add();
	            }

	            if(this.elements.markerLine) {
	                this.elements.markerLine.destroy();
	            }
	            this.elements.markerLine = this.renderer.path(markerLinePath)
	                .attr({
	                    stroke: markerLineStroke,
	                    'stroke-width': markerLineWidth
	                })
	                .add();
	            if(this.showValue) {
	                this.drawValueDisplay(val);
	            }
	        },

	        drawValueDisplay: function(val) {
	            var valueText = this.formatValue(val),
	                markerOffset = this.normalizedTranslateValue(val),
	                valueX = this.horizontalPadding + this.bandOffsetBottom + markerOffset;

	            if(this.elements.valueDisplay) {
	                this.elements.valueDisplay.attr({
	                    text: valueText,
	                    x: valueX
	                });
	            }
	            else {
	                this.elements.valueDisplay = this.renderer.text(
	                    valueText, valueX, (this.height - this.backgroundHeight) / 2 - this.valueOffset
	                )
	                    .css({
	                        color: 'black',
	                        fontSize: this.valueFontSize + 'px',
	                        lineHeight: this.valueFontSize + 'px',
	                        fontWeight: 'bold'
	                    })
	                    .attr({
	                        align: 'center'
	                    })
	                    .add();
	            }

	        },

	        normalizedTranslateValue: function(val) {
	            if(val < this.ranges[0]) {
	                return 0;
	            }
	            if(val > this.ranges[this.ranges.length - 1]) {
	                return this.translateValue(this.ranges[this.ranges.length - 1]);
	            }
	            return this.translateValue(val);
	        },

	        translateValue: function(val) {
	            var dataRange = this.ranges[this.ranges.length - 1] - this.ranges[0],
	                normalizedValue = val - this.ranges[0];

	            return Math.round((normalizedValue / dataRange) * this.bandWidth);
	        }

	    });

	    return HorizontalMarkerGauge;
	            
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/visualizations/gauges/MarkerGauge":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("js_charting/visualizations/gauges/Gauge"),
	            __webpack_require__("js_charting/util/lang_utils")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            Gauge,
	            langUtils
	        ) {

	    var MarkerGauge = function(container, properties) {
	        Gauge.call(this, container, properties);
	        this.bandCornerRad = 0;
	        this.tickLabelPaddingRight = 10;
	        this.minorsPerMajor = 5;
	        this.minorTickWidth = 1;
	        this.tickWidth = 1;
	    };
	    langUtils.inherit(MarkerGauge, Gauge);

	    $.extend(MarkerGauge.prototype, {

	        showValueByDefault: false,

	        renderGauge: function() {
	            Gauge.prototype.renderGauge.call(this);
	            this.tickColor = (this.isShiny) ? 'black' : this.foregroundColor;
	            this.tickFontColor = (this.isShiny) ? 'black' : this.fontColor;
	            this.valueOffset = (this.isShiny) ? this.markerSideWidth + 10 : this.valueFontSize;
	            this.drawBackground();
	            if(this.showRangeBand) {
	                this.drawBand();
	            }
	            this.drawTicks();
	            this.drawIndicator(this.value);
	            this.checkOutOfRange(this.value);
	        },

	        updateValueDisplay: function() {
	            // no-op, value display is updated as part of drawIndicator
	        }

	    });

	    return MarkerGauge;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "js_charting/series/series_factory":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("js_charting/series/ColumnSeries"),
	            __webpack_require__("js_charting/series/BarSeries"),
	            __webpack_require__("js_charting/series/LineSeries"),
	            __webpack_require__("js_charting/series/AreaSeries"),
	            __webpack_require__("js_charting/series/PieSeries"),
	            __webpack_require__("js_charting/series/ScatterSeries"),
	            __webpack_require__("js_charting/series/BubbleSeries"),
	            __webpack_require__("js_charting/series/RangeSeries")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            ColumnSeries,
	            BarSeries,
	            LineSeries,
	            AreaSeries,
	            PieSeries,
	            ScatterSeries,
	            BubbleSeries,
	            RangeSeries
	        ) {

	    return ({

	        create: function(properties) {
	            if(properties.type === 'column') {
	                return new ColumnSeries(properties);
	            }
	            if(properties.type === 'bar') {
	                return new BarSeries(properties);
	            }
	            if(properties.type === 'line') {
	                return new LineSeries(properties);
	            }
	            if(properties.type === 'area') {
	                return new AreaSeries(properties);
	            }
	            if(properties.type === 'pie') {
	                return new PieSeries(properties);
	            }
	            if(properties.type === 'scatter') {
	                return new ScatterSeries(properties);
	            }
	            if(properties.type === 'bubble') {
	                return new BubbleSeries(properties);
	            }
	            if(properties.type === 'range') {
	                return new RangeSeries(properties);
	            }
	            return new ColumnSeries(properties);
	        }

	    });

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ })

});