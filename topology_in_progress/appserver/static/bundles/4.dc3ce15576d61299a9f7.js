awsJsonp([4],{

/***/ "views/shared/singlevalue/Master":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	        __webpack_require__("shim/jquery"),
	        __webpack_require__("require/underscore"),
	        module,
	        __webpack_require__("views/shared/viz/Base"),
	        __webpack_require__("views/shared/singlevalue/Sparkline"),
	        __webpack_require__("views/shared/singlevalue/MainBody"),
	        __webpack_require__("views/shared/singlevalue/UnderLabel"),
	        __webpack_require__("models/Base"),
	        __webpack_require__("shim/splunk.util"),
	        __webpack_require__("util/svg"),
	        __webpack_require__("uri/route"),
	        __webpack_require__("util/drilldown"),
	        __webpack_require__("util/time"),
	        __webpack_require__("util/color_utils"),
	        __webpack_require__("js_charting/util/parsing_utils"),
	        __webpack_require__("util/general_utils"),
	        __webpack_require__("util/moment/relative"),
	        __webpack_require__("util/numeral")
	    ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        $,
	        _,
	        module,
	        VisualizationBase,
	        Sparkline,
	        MainBodyView,
	        UnderLabelView,
	        BaseModel,
	        splunkUtil,
	        svgUtil,
	        route,
	        drilldownUtil,
	        timeUtil,
	        colorUtil,
	        parsingUtils,
	        generalUtil,
	        relativeMomentUtil,
	        numeral
	    ) {
	        return VisualizationBase.extend({
	            moduleId: module.id,
	            className: "single-value",
	            SEVERITY_COLORS: {
	                severe : '#d93f3c', //red
	                high : '#f58f39', //orange
	                elevated: '#f7bc38', //yellow
	                guarded: '#6db7c6', //blue
	                low: '#65a637', //green
	                none: '#555555'
	            },
	            SEVERITIES: ['none', 'low', 'guarded', 'elevated', 'high', 'severe'],
	            BLOCK_DEFAULT_FONT_COLOR: '#FFFFFF',
	            DEFAULT_FONT_COLOR: '#333333',
	            UNDERLABEL_COLOR: '#555555',
	            NEUTRAL_CHANGE_COLOR: '#555555',
	            DELTA_GREEN: '#65a637',
	            DELTA_RED: '#d93f3c',
	            EDGE_PADDING: 32,
	            NEUTRAL_SPARKLINE_COLOR: '#999999',

	            MAX_RESULT_COUNT: 1000,

	            initialize: function(options) {
	                VisualizationBase.prototype.initialize.apply(this, arguments);

	                this.$el.width(this.options.width || '100%');
	                this.$el.height(this.options.height || '100%');
	                this.$el.css('position', 'relative');

	                this.model.results = new BaseModel({
	                    searchResultsColumn: this.model.searchData,
	                    resultField: '',
	                    resultFieldValue: ''
	                });

	                this.model.presentation = new BaseModel();

	                this.updateContainerDimensions();

	                this.originalHeight = this.$el.height();

	                this.model.presentation.set({
	                    fontColor: this.getFontColor(),
	                    scaleRatio: 1,
	                    edgePadding: this.EDGE_PADDING
	                });

	                
	                this.$inlineMessage = $('<div class="inline-message"></div>').css({
	                        "text-align":"center",
	                        "height":"32px",
	                        "width":"100%",
	                        "position":"absolute",
	                        "bottom":"0"})
	                    .addClass(this.options.messageContainerClass || '');

	            },

	            onConfigChange: function(changedAttributes) {
	                var shouldInvalidate = _(changedAttributes).chain().keys()
	                    .any(function(key) {
	                        return key.indexOf('display.visualizations.singlevalue.') === 0;
	                    })
	                    .value();

	                if (shouldInvalidate) {
	                    this.invalidate('formatDataPass');
	                }
	            },

	            updateResultState: function() {
	                var resultField = this.determineResultFieldName(this.model.config.get("display.visualizations.singlevalue.field")),
	                    resultFieldValue = this.getFieldValue(resultField),
	                    fontColor,
	                    sparklineData,
	                    sparklineColor,
	                    deltaIndicatorColor;
	                // If the first column is _time, then it is a timechart and contains
	                // multiple result rows, and therefore should display a sparkline.
	                // Else, it should just display a standard single result value
	                this.model.results.set('resultField', resultField);
	                this.model.results.set('resultFieldValue', resultFieldValue);

	                if (this.isTimeSeries() && !isNaN(resultFieldValue)) {
	                    sparklineData = this.getFieldValues(resultField);
	                    this.model.results.set('sparkline', sparklineData);
	                    this.setDeltaValue(resultFieldValue);
	                    // In-mem config attribute - tell Viz Editor that time series viz controls should be displayed
	                    this.model.config.set('is_timeseries', true, {'transient': true});
	                } else {
	                    this.model.results.unset('sparkline');
	                    this.model.results.unset('deltaValue');
	                    this.model.results.unset('deltaBacktrack');

	                    // In-mem config attribute - tell Viz Editor that time series viz controls should be hidden
	                    this.model.config.set('is_timeseries', false, {'transient': true});
	                }

	                this.severityColor = this.getSeverityColor(resultFieldValue);
	                this.deltaColor = this.getDeltaColor(resultFieldValue);

	                deltaIndicatorColor = this.getDeltaIndicatorColor();
	                if ((this.useColors() && this.model.config.get('display.visualizations.singlevalue.colorBy') === 'trend')
	                    || this.hasBackground()) {
	                    sparklineColor = deltaIndicatorColor;
	                } else {
	                    sparklineColor = this.NEUTRAL_SPARKLINE_COLOR;
	                }
	                this.model.presentation.set('deltaColor', deltaIndicatorColor);
	                this.model.presentation.set('sparklineColor', sparklineColor);
	                this.model.presentation.set('fontColor', this.getFontColor());
	                this.model.presentation.set('formatPattern', this.getFormatPattern());
	            },

	            getDeltaColor: function() {
	                var deltaMode = this.model.config.get('display.visualizations.singlevalue.trendColorInterpretation') || 'standard', // defaults to standard
	                    deltaValue = this.model.results.get('deltaValue'),
	                    deltaIncreased = deltaValue === 'percentageIncrease' || deltaValue > 0;
	                if (deltaValue === 0) {
	                    return this.NEUTRAL_CHANGE_COLOR;
	                }
	                if (deltaMode === 'inverse') {
	                    if (deltaIncreased) {
	                        return this.DELTA_RED;
	                    }
	                    return this.DELTA_GREEN;
	                } else {
	                    if (deltaIncreased) {
	                        return this.DELTA_GREEN;
	                    }
	                    return this.DELTA_RED;
	                }
	            },

	            getSeverityColor: function(resultFieldValue) {
	                var ranges = this.model.config.get('display.visualizations.singlevalue.rangeValues'),
	                    colors = this.model.config.get('display.visualizations.singlevalue.rangeColors'),
	                    useColors = splunkUtil.normalizeBoolean(this.model.config.get('display.visualizations.singlevalue.useColors')) || false,
	                    rangeMapValue = this.getResultField('range'),
	                    parsedRanges,
	                    parsedColors,
	                    colorsDefined,
	                    severities;

	                // Legacy single value behavior dictates that if there is a rangemap in the results, that will color the viz.
	                // We also check that useColors is false. If it is true, the user is explicitly using the rangeColors
	                if (rangeMapValue && !useColors) {
	                    // If the classField is used and the range field contains is a valid severity, use this as the severity
	                    return this.SEVERITY_COLORS[rangeMapValue] || this.DEFAULT_FONT_COLOR;
	                }
	                if (ranges) {
	                    parsedRanges = parsingUtils.stringToArray(ranges);
	                    parsedColors = parsingUtils.stringToArray(colors);
	                    colorsDefined = parsedColors.length > 0;
	                    if (parsedRanges.length === 0 || isNaN(resultFieldValue)) {
	                        return this.DEFAULT_FONT_COLOR;
	                    }
	                    severities = this.SEVERITIES.slice(1, 6); // discard 'none'
	                    for (var i = 0; i < parsedRanges.length; i++) {
	                        if(isNaN(parsedRanges[i])){
	                            return this.DEFAULT_FONT_COLOR;
	                        }
	                        if (parseFloat(resultFieldValue) <= parseFloat(parsedRanges[i])) {
	                            // As soon as we encounter a range that is greater than or equal to the resultFieldValue,
	                            // that is the severity range that the resultFieldValue falls into, so we exit the loop and function.
	                            if (colorsDefined) {
	                                return colorUtil.replaceSymbols(parsedColors[i], '#') || this.DEFAULT_FONT_COLOR;
	                            }
	                            return this.SEVERITY_COLORS[severities[i]];
	                        }
	                    }
	                    if (colorsDefined) {
	                        // If there are more ranges than colors, assign the default grey color
	                        return colorUtil.replaceSymbols(parsedColors[parsedRanges.length], '#') || this.DEFAULT_FONT_COLOR;
	                    }
	                    return this.SEVERITY_COLORS[severities[severities.length - 1]]; // if no severity has yet been assigned, has fallen through to highest severity
	                }

	                return this.DEFAULT_FONT_COLOR; // fall through to default
	            },

	            getDeltaIndicatorColor: function() {
	                var colorBy = this.model.config.get('display.visualizations.singlevalue.colorBy');
	                if (this.hasBackground()) {
	                    return this.BLOCK_DEFAULT_FONT_COLOR;
	                }
	                if (colorBy === 'value' || !this.useColors()) {
	                    return this.DEFAULT_FONT_COLOR;
	                }
	                return this.deltaColor;
	            },

	            getFontColor: function() {
	                var colorBy = this.model.config.get('display.visualizations.singlevalue.colorBy');
	                if (this.hasBackground()) {
	                    return this.BLOCK_DEFAULT_FONT_COLOR;
	                }
	                if ((colorBy === 'trend' && this.isTimeSeries()) || !this.useColors()) {
	                    return this.DEFAULT_FONT_COLOR;
	                }
	                return this.severityColor;
	            },

	            useColors: function() {
	                var useColors = splunkUtil.normalizeBoolean(this.model.config.get('display.visualizations.singlevalue.useColors')) || false, // default to false
	                    rangeMapValue = this.getFieldValues('range');
	                // Default to use old Rangemap command result if useColors is not set.
	                if (rangeMapValue && !useColors) {
	                    return true;
	                }
	                return useColors;
	            },

	            hasBackground: function() {
	                var backgroundMode = this.model.config.get('display.visualizations.singlevalue.colorMode');
	                return (backgroundMode === 'block' && this.useColors() && this.getBackgroundColor());
	            },

	            getBackgroundColor: function() {
	                var colorBy = this.model.config.get('display.visualizations.singlevalue.colorBy');
	                if (this.useColors()) {
	                    if (colorBy === 'trend') {
	                        return this.deltaColor;
	                    }
	                    return this.severityColor;
	                }
	                return this.DEFAULT_FONT_COLOR;
	            },

	            getFormatPattern: function() {
	                var formatPattern = '0',
	                    matchedPrecision,
	                    decimalPlaces,
	                    numberPrecision = this.model.config.get('display.visualizations.singlevalue.numberPrecision'),
	                    useThousandSeparators = splunkUtil.normalizeBoolean(this.model.config.get('display.visualizations.singlevalue.useThousandSeparators'));
	                if (useThousandSeparators !== false) {
	                    formatPattern += ',0';
	                }
	                if (numberPrecision) {
	                    matchedPrecision = numberPrecision.match(/^0\.?(0*)$/);
	                    if (matchedPrecision && matchedPrecision.length === 2) {
	                        decimalPlaces = matchedPrecision[1];
	                        if (decimalPlaces.length > 4) {
	                            // User wants a large d.p. value, so revert them to the allowed max
	                            decimalPlaces = '0000';
	                        }
	                        if (decimalPlaces.length > 0) {
	                            formatPattern = formatPattern +  '.' + decimalPlaces;
	                        }
	                    }
	                }
	                return formatPattern;
	            },

	            setDeltaValue: function(currentValue) {
	                var deltaTimeRange = this.model.config.get('display.visualizations.singlevalue.trendInterval'),
	                    deltaFormat = this.model.config.get('display.visualizations.singlevalue.trendDisplayMode'),
	                    times = this.getFieldValues('_time'),
	                    parsedTimeArr,
	                    parsedTime,
	                    deltaValue,
	                    deltaBacktrack,
	                    formattedDeltaValue,
	                    resultField = this.model.results.get('resultField'),
	                    timeToBacktrackInSeconds,
	                    dataPointsToBacktrack,
	                    mostRecentDate,
	                    secondMostRecentDate,
	                    deltaDate,
	                    timeGranularityInSeconds,
	                    timeAmount,
	                    timeUnit,
	                    formatPattern = this.getFormatPattern(),
	                    createRecentDateObject = function(offset) {
	                        return timeUtil.bdTimeToDateObject(timeUtil.extractBdTime(times[times.length - offset]));
	                    };
	                if (deltaTimeRange && deltaTimeRange !== 'auto') {
	                    // Calculate diff between values at most recent _time (minus) deltaTimeRange
	                    try {
	                        parsedTimeArr = relativeMomentUtil.parseRelativeTimeExpression(deltaTimeRange);
	                    } catch(err) {
	                        return;
	                    }
	                    if (parsedTimeArr && parsedTimeArr[0]) {
	                        parsedTime = parsedTimeArr[0];
	                    }
	                    if (times.length >= 2 && parsedTime && parsedTime.unit && !isNaN(parsedTime.amount)) {
	                        timeUnit = timeUtil.normalizeUnit(parsedTime.unit);
	                        timeAmount = Math.abs(parsedTime.amount);
	                        // Create 2 copies of the most recent Date object - only deltaDate will be mutated
	                        mostRecentDate = createRecentDateObject(1);
	                        deltaDate = createRecentDateObject(1);
	                        //Compare both granularity of elements in the _time array and
	                        //deltaTimeRange by converting them both to the same units - seconds
	                        secondMostRecentDate = createRecentDateObject(2);
	                        // Compare both granularity of elements in the _time array and
	                        // deltaTimeRange by converting them both to the same units - seconds
	                        timeGranularityInSeconds = (mostRecentDate.getTime() - secondMostRecentDate.getTime()) / 1000; // Convert from milliseconds to seconds by dividing by 1000
	                        if (_.indexOf(['s', 'm', 'h'], timeUnit) !== -1) {
	                            // Seconds, minutes, and hours are affected by Daylight Savings Time, so should NOT use the JS Date() object.
	                            // Instead, they should use BDTime.
	                            timeToBacktrackInSeconds = timeUtil.convertAmountAndUnitToSeconds(timeAmount, timeUnit);
	                        } else {
	                            // Can use the JS Date() object's setter and getter methods as months have irregular numbers of days
	                            // and the Date() object internally handles these inconsistencies when calculating time deltas.
	                            switch (timeUnit) {
	                                case 'y':
	                                    deltaDate.setFullYear(deltaDate.getFullYear() - timeAmount);
	                                    break;
	                                case 'q':
	                                    deltaDate.setMonth(deltaDate.getMonth() - (timeAmount * 3));
	                                    break;
	                                case 'mon':
	                                    deltaDate.setMonth(deltaDate.getMonth() - timeAmount);
	                                    break;
	                                case 'w':
	                                    deltaDate.setDate(deltaDate.getDate() - (timeAmount * 7));
	                                    break;
	                                case 'd':
	                                    deltaDate.setDate(deltaDate.getDate() - timeAmount);
	                                    break;
	                                default:
	                                    deltaDate = undefined;
	                                    return deltaDate;
	                            }
	                            if (deltaDate) {
	                                timeToBacktrackInSeconds = (mostRecentDate.getTime() - deltaDate) / 1000; // Convert form milliseconds to seconds by dividing by 1000
	                            }
	                        }

	                        if (timeToBacktrackInSeconds) {
	                            // How many elements back in the _time array we should compare the currentValue to
	                            dataPointsToBacktrack = Math.round(timeToBacktrackInSeconds / timeGranularityInSeconds);
	                            if (dataPointsToBacktrack < times.length) {
	                                deltaValue = this.calculateDeltaValue(resultField, dataPointsToBacktrack, deltaFormat, currentValue);
	                                deltaBacktrack = dataPointsToBacktrack;
	                            }
	                        }
	                    }
	                }

	                // Default: if deltaTimeRange is not specified or invalid, delta spans range between most recent and 2nd-most-recent data points
	                if ((!deltaValue && deltaValue !== 0)) {
	                    // If the field is a '_time' field, take the most recent 'count' data point as the field value,
	                    // which is the last element in the 'count' array.
	                    deltaValue = this.calculateDeltaValue(resultField, 1, deltaFormat, currentValue);
	                    deltaBacktrack = 1;
	                }

	                if (formatPattern && !isNaN(deltaValue)) {
	                    formattedDeltaValue = numeral(deltaValue).format(formatPattern);
	                    this.model.results.set('formattedDeltaValue', formattedDeltaValue);
	                }

	                this.model.results.set('deltaValue', deltaValue);
	                this.model.results.set('deltaBacktrack', deltaBacktrack);
	            },

	            calculateDeltaValue: function(resultField, dataPointsToBacktrack, deltaFormat, currentValue) {
	                var previousValue = this.getFieldValue(resultField, dataPointsToBacktrack);
	                if (deltaFormat && deltaFormat.toLowerCase() === 'percent') {
	                    if (previousValue === "0") {
	                        if (currentValue === "0") {
	                            return 0;
	                        }
	                        // Would return a percentage change value of Infinity, which we must display as 'N/A'
	                        return (currentValue > previousValue) ? 'percentageIncrease' : 'percentageDecrease';
	                    }
	                    return (currentValue - previousValue) / previousValue * 100;
	                }
	                return currentValue - previousValue;
	            },

	            onAddedToDocument: function() {
	                VisualizationBase.prototype.onAddedToDocument.apply(this, arguments);
	                this.validateReflow(true);
	            },

	            reflow: function() {
	                this.updateContainerDimensions();
	                this.updateBackgroundDimensions();
	                this.invokeOnChildren('validateReflow', true);
	            },

	            updateContainerDimensions: function() {
	                var $svgContainer = this.getSvgContainer(),
	                    scaleRatio;

	                // For PDF: $el has undefined height and width so set manually to passed in height and width options
	                if (this.model.config.get('exportMode')) {
	                    this.svgWidth = this.options.width;
	                    this.svgHeight = this.options.height;
	                } else {
	                    this.svgHeight = this.$el.height();
	                    this.svgWidth = this.$el.width();
	                }

	                if(this.$el.find(this.$inlineMessage).length == 1) {
	                    this.svgHeight = this.svgHeight - this.$inlineMessage.height();
	                }                

	                if (generalUtil.valuesAreNumericAndFinite([this.svgHeight, this.svgWidth])) {
	                    $svgContainer
	                        .height(this.svgHeight)
	                        .width(this.svgWidth);

	                    scaleRatio = this.svgHeight / this.originalHeight;
	                    if (!generalUtil.valuesAreNumericAndFinite([scaleRatio]) || scaleRatio === 0) {
	                        scaleRatio = 1;
	                    }

	                    this.model.presentation.set({
	                        svgWidth: this.svgWidth,
	                        svgHeight: this.svgHeight,
	                        scaleRatio: scaleRatio
	                    });
	                }
	            },

	            getResultField: function(field) {
	                var resultFieldValue = this.getFieldValue(this.determineResultFieldName(field));
	                if (!resultFieldValue) {
	                    return _('N/A').t();
	                }
	                return resultFieldValue;
	            },

	            // Fields can either be a list of strings or a list of dictionaries each with a 'name' entry
	            // depending on whether 'show_metadata' is enabled
	            getFieldNames: function() {
	                var fields = this.model.searchData.get('fields');

	                if (!fields || fields.length === 0) {
	                    return [];
	                }
	                if (_.isObject(fields[0])) {
	                    return _(fields).pluck('name');
	                }
	                return $.extend([], fields);
	            },

	            getFieldValue: function(field, idx) {
	                var column = this.getFieldValues(field);
	                if (!idx) {
	                    // idx should be 0 unless calculating backtracked delta value
	                    idx = 0;
	                }
	                if (!(column && column.length)) {
	                    return '';
	                }
	                // If data is time series, then result value should be the most recent, which is at the end
	                if (this.isTimeSeries()) {
	                    return column[(column.length - idx - 1)];
	                }
	                // If data is not time series, then result value should be the first in the list
	                return column[idx];
	            },

	            getFieldValues: function(fieldName) {
	                var fields = this.getFieldNames(),
	                    columns = this.model.searchData.get('columns') || [],
	                    countIdx = _(fields).indexOf(fieldName);
	                return columns[countIdx];
	            },

	            determineResultFieldName: function(configuredField) {
	                var fields = this.getFieldNames();
	                if (configuredField && _(fields).contains(configuredField)) {
	                    return configuredField;
	                }
	                return _(fields).find(function(f) {
	                    return f === '_raw' || f[0] !== '_'; // Does not allow '_time' either
	                });
	            },

	            // Is using Timechart command
	            isTimeSeries: function() {
	                var fields = this.getFieldNames();
	                return _(fields).some(function(f) {
	                    return f === '_time';
	                });
	            },

	            getSvgContainer: function() {
	                return this.$('.svg-container');
	            },

	            getBackgroundMode: function() {
	                return this.model.config.get('display.visualizations.singlevalue.colorMode') || 'none';
	            },

	            updateBackgroundDimensions: function() {
	                var background;
	                if (this.hasBackground()) {
	                    background = this.getSvgContainer().find('.block-background');
	                    if (background.length > 0) {
	                        background.attr('width', this.svgWidth);
	                        background.attr('height', this.svgHeight);
	                    }
	                }
	            },

	            drawSeverityBackground: function($svgContainer) {
	                if (this.hasBackground()) {
	                    $svgContainer.append(
	                        svgUtil.createElement('rect')
	                            .attr({
	                                x: 0,
	                                y: 0,
	                                width: this.svgWidth,
	                                height: this.svgHeight,
	                                'class': 'block-background',
	                                fill: this.getBackgroundColor()
	                            })
	                    );
	                }
	            },

	            drawSvgContainer: function() {
	                var $svgContainer = this.getSvgContainer();
	                if ($svgContainer.length > 0) {
	                    $svgContainer.remove();
	                }

	                $svgContainer = svgUtil.createElement('svg')
	                    .width(this.svgWidth)
	                    .height(this.svgHeight)
	                    .attr('class', 'svg-container')
	                    .css('position', 'absolute')
	                    .css('top', '0')
	                    .css('left', '0');
	                $svgContainer.appendTo(this.el);
	                return $svgContainer;
	            },

	            drawSparkline: function($svgContainer) {
	                if (this.children.sparkline) {
	                    this.children.sparkline.detach();
	                    this.children.sparkline.remove();
	                }
	                if (this.hasSparkline) {
	                    this.model.results.set({
	                        sparklineData: this.model.results.get('sparkline').slice(0)
	                    });

	                    this.model.presentation.set({
	                       sparklineOpacity: 1
	                    });

	                    this.children.sparkline = new Sparkline({
	                        model: {
	                            presentation: this.model.presentation,
	                            results: this.model.results,
	                            state: this.model.config
	                        }
	                    });
	                    this.children.sparkline.render().appendTo($svgContainer);
	                } else {
	                    this.model.results.unset('sparklineData');
	                }
	            },

	            drawMainBody: function($svgContainer) {
	                var mainBodyPadding,
	                    deltaFontSize,
	                    deltaScale,
	                    singleValueFont,
	                    sideLabelFont,
	                    hasUnderLabel = this.model.config.get('display.visualizations.singlevalue.underLabel');
	                if (this.children.mainBody) {
	                    this.children.mainBody.detach();
	                    this.children.mainBody.remove();
	                }
	                if (this.hasSparkline && hasUnderLabel) {
	                    singleValueFont = 50;
	                    sideLabelFont = 28;
	                    mainBodyPadding = 50;
	                    deltaFontSize = 20;
	                    deltaScale = 0.85;
	                } else {
	                    singleValueFont = 66;
	                    sideLabelFont = 37;
	                    deltaFontSize = 26;
	                    deltaScale = 1.1;
	                    if (!this.hasSparkline && !hasUnderLabel) {
	                        mainBodyPadding = 70;
	                    } else {
	                        mainBodyPadding = 60;
	                    }
	                }
	                this.model.presentation.set({
	                    singleValueFontSize: singleValueFont,
	                    sideLabelFontSize: sideLabelFont,
	                    mainBodyPadding: mainBodyPadding,
	                    deltaFontSize: deltaFontSize,
	                    deltaScale: deltaScale
	                });
	                this.children.mainBody = new MainBodyView({
	                    model: {
	                        application: this.model.application,
	                        state: this.model.config,
	                        results: this.model.results,
	                        presentation: this.model.presentation
	                    }
	                });

	                this.listenTo(this.children.mainBody, 'singleDrilldownClicked', function(params) {
	                    this.handleSingleDrilldownClicked(params);
	                });
	                this.listenTo(this.children.mainBody, 'anchorTagClicked', function(e) {
	                    this.handleAnchorTagClicked(e);
	                });

	                this.children.mainBody.render().appendTo($svgContainer);
	            },

	            handleSingleDrilldownClicked: function(params) {
	                this.trigger(params.specificEventNames, params.drilldownInfo);
	            },

	            handleAnchorTagClicked: function(e) {
	                // xlink:href does not work for SVG anchors in our case, so we must handle redirect manually
	                var href = $(e.currentTarget).attr('href');
	                if (href) {
	                    route.redirectTo(href, drilldownUtil.shouldDrilldownInNewTab(e));
	                }
	            },

	            drawUnderLabel: function($svgContainer) {
	                var underLabelColor = this.hasBackground() ? this.BLOCK_DEFAULT_FONT_COLOR : this.UNDERLABEL_COLOR,
	                    underLabelOpacity = this.hasBackground() ? 0.8 : 1,
	                    underLabelY;

	                if (this.hasSparkline) {
	                    underLabelY = 72;
	                } else {
	                    underLabelY = 85;
	                }

	                if (this.children.underLabel) {
	                    this.children.underLabel.detach();
	                    this.children.underLabel.remove();
	                }
	                this.model.presentation.set({
	                    underLabelY: underLabelY,
	                    underLabelColor: underLabelColor,
	                    underLabelOpacity: underLabelOpacity
	                });
	                    this.children.underLabel = new UnderLabelView({
	                    model: {
	                        state: this.model.config,
	                        results: this.model.results,
	                        presentation: this.model.presentation,
	                        application: this.model.application
	                    }
	                });

	                this.listenTo(this.children.underLabel, 'singleDrilldownClicked', function(params) {
	                    this.handleSingleDrilldownClicked(params);
	                });
	                this.listenTo(this.children.underLabel, 'anchorTagClicked', function(e) {
	                    this.handleAnchorTagClicked(e);
	                });

	                this.children.underLabel.render().appendTo($svgContainer);
	            },

	            drawComponents: function() {
	                var $svgContainer = this.drawSvgContainer();

	                this.hasSparkline = this.model.results.get('sparkline') && splunkUtil.normalizeBoolean(this.model.config.get('display.visualizations.singlevalue.showSparkline')) !== false;
	                this.model.presentation.set('hasSparkline', this.hasSparkline);

	                this.drawSeverityBackground($svgContainer);

	                this.drawMainBody($svgContainer);

	                if (this.model.config.get("display.visualizations.singlevalue.underLabel")) {
	                    this.drawUnderLabel($svgContainer);
	                }

	                this.drawSparkline($svgContainer);
	            },

	            renderMaxResultCountMessage: function(resultCount) {
	                var message = splunkUtil.sprintf(
	                    _('These results may be truncated. This visualization is configured to display a maximum of %s results per series, and that limit has been reached.').t(),
	                    resultCount
	                );
	                this.$inlineMessage.html(_(this.inlineMessageTemplate).template({ message: message, level: 'warning' }));
	            },
	            inlineMessageTemplate: '\
	                <div class="alert alert-inline alert-<%= level %> alert-inline"> \
	                    <i class="icon-alert"></i> \
	                    <%- message %> \
	                </div> \
	            ',

	            updateView: function() {
	                this.updateResultState();

	                this.$el.removeClass(this._dynamicClasses || '');
	                this._dynamicClasses = [
	                    this.model.config.get('display.visualizations.singlevalue.additionalClass'),
	                    this.getFieldValue(this.model.config.get('display.visualizations.singlevalue.classField'))
	                ].join(' ');
	                this.$el.addClass(this._dynamicClasses);

	                this.drawComponents();
	                
	                this.$inlineMessage.remove();
	                if(this.model.searchDataParams) {
	                    this.MAX_RESULT_COUNT = this.model.searchDataParams.get('count');
	                }

	                if(this.model.results.get('sparkline') && this.model.results.get('sparkline').length >= this.MAX_RESULT_COUNT) {
	                    this.renderMaxResultCountMessage(this.MAX_RESULT_COUNT);
	                    this.$inlineMessage.insertAfter(this.$('.svg-container'));
	                }

	                if (this.isAddedToDocument()) {
	                    this.reflow();
	                }
	            }
	        });
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

/***/ "views/shared/singlevalue/MainBody":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	        __webpack_require__("shim/jquery"),
	        __webpack_require__("require/underscore"),
	        module,
	        __webpack_require__("views/Base"),
	        __webpack_require__("views/shared/singlevalue/Labels"),
	        __webpack_require__("views/shared/singlevalue/Delta"),
	        __webpack_require__("models/Base"),
	        __webpack_require__("shim/splunk.util"),
	        __webpack_require__("util/svg"),
	        __webpack_require__("util/general_utils"),
	        __webpack_require__("util/math_utils")

	    ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        $,
	        _,
	        module,
	        BaseView,
	        LabelsView,
	        DeltaView,
	        BaseModel,
	        splunkUtil,
	        svgUtil,
	        generalUtil,
	        mathUtil
	        ) {
	        return BaseView.extend({
	            moduleId: module.id,
	            className: 'single-value-main-body',
	            el: function() {
	                return svgUtil.createElement('g').attr('class', 'single-value-main-body');
	            },
	            DELTA_PADDING: 10,
	            initialize: function(options) {
	                BaseView.prototype.initialize.apply(this, arguments);
	                this.model.presentation.set('deltaPadding', this.DELTA_PADDING);
	            },

	            reflow: function() {
	                var mainLabelsRightX,
	                    deltaWidth,
	                    labelWidth,
	                    maxDeltaWidth,
	                    maxLabelsWidth,
	                    $rightmostLabel,
	                    rightLabelWidth,
	                    rightLabelLeftX,
	                    edgePadding = this.model.presentation.get('edgePadding'),
	                    svgWidth = this.model.presentation.get('svgWidth') - edgePadding * 2,
	                    scaleRatio = this.model.presentation.get('scaleRatio'),
	                    mainBodyPadding = this.model.presentation.get('mainBodyPadding'),
	                    scaledMainBodyPadding = mainBodyPadding * scaleRatio;


	                if (generalUtil.valuesAreNumericAndFinite([scaledMainBodyPadding])) {
	                    this.$el.attr('transform', 'translate(0,' + scaledMainBodyPadding + ')');
	                }
	                // Keep track of ratio between Labels and Delta Value
	                if (this.displayDelta()) {
	                    svgWidth -= this.DELTA_PADDING;
	                    if (!this.maxLabelProportion) {
	                        labelWidth = this.children.labels.getMainLabelsWidth();
	                        deltaWidth = this.children.delta.el.getBBox().width;
	                        this.maxLabelProportion = mathUtil.roundToDecimal(labelWidth / (labelWidth + deltaWidth), -2);
	                    }
	                    maxLabelsWidth = mathUtil.roundToDecimal(svgWidth * this.maxLabelProportion, -2);
	                    maxDeltaWidth = svgWidth - maxLabelsWidth;

	                    // Subtract width of delta view from the width available for the main labels
	                    this.model.presentation.set('maxLabelsWidth', maxLabelsWidth);
	                    this.model.presentation.set('maxDeltaWidth', maxDeltaWidth);
	                } else {
	                    this.model.presentation.set('maxLabelsWidth', svgWidth);
	                    this.model.presentation.set('maxDeltaWidth', 0);
	                }

	                // Have main labels scale to fill in the new width
	                this.children.labels.validateReflow(true);

	                if (this.displayDelta()) {
	                    // Have delta scale to fill in the new width
	                    // ( Note: because delta scaling and positioning happen in the same SVG transform action, the delta
	                    //   will also be positioned here, but we will reposition the delta properly later in this method. )
	                    this.children.delta.validateReflow(true);

	                    deltaWidth = this.children.delta.el.getBoundingClientRect().width;

	                    this.model.presentation.set('deltaWidth', deltaWidth);
	                } else {
	                    this.model.presentation.set('deltaWidth', 0);
	                }

	                this.children.labels.positionLabels();

	                // Now, we reposition the delta value to its final position using the new scaled label's coordinates
	                if (this.displayDelta()) {
	                    if (this.hasAfterLabel) {
	                        $rightmostLabel = this.children.labels.children.afterLabelView;
	                    } else {
	                        $rightmostLabel = this.children.labels.children.singleResultView;
	                    }
	                    // PDF requires that we read the text element's 'x' attribute to measure its position
	                    rightLabelLeftX = parseFloat($rightmostLabel.$('text').attr('x'));
	                    rightLabelWidth = $rightmostLabel.getWidth();
	                    mainLabelsRightX = rightLabelLeftX + rightLabelWidth;

	                    this.model.presentation.set('deltaLeft', mainLabelsRightX);
	                    this.children.delta.positionAndScaleElements();
	                }
	            },

	            drawLabels: function() {
	                if (this.children.labels) {
	                    this.children.labels.remove();
	                }

	                var unit = this.model.state.get("display.visualizations.singlevalue.unit");
	                if (typeof unit === "undefined" || unit === "") {
	                    this.hasUnit = false;
	                    this.hasAfterLabel = !!this.model.state.get("display.visualizations.singlevalue.afterLabel");
	                    this.hasBeforeLabel = !!this.model.state.get("display.visualizations.singlevalue.beforeLabel");
	                } else {
	                    this.hasUnit = true;
	                    var unitPosition = this.model.state.get("display.visualizations.singlevalue.unitPosition");
	                    if (unitPosition === "before") {
	                        this.unitPosition = "before";
	                        this.hasBeforeLabel = false;
	                        this.hasAfterLabel = false;
	                    } else {
	                        this.unitPosition = "after";
	                        this.hasBeforeLabel = false;
	                        this.hasAfterLabel = false;
	                    }
	                }
	                this.children.labels = new LabelsView({
	                    model: {
	                        application: this.model.application,
	                        state: this.model.state,
	                        results: this.model.results,
	                        presentation: this.model.presentation
	                    },
	                    unit: unit,
	                    unitPosition: this.unitPosition,
	                    hasUnit: this.hasUnit,
	                    hasBeforeLabel: this.hasBeforeLabel,
	                    hasAfterLabel: this.hasAfterLabel
	                });
	                this.listenTo(this.children.labels, 'singleDrilldownClicked', function(params) {
	                    this.trigger('singleDrilldownClicked', params);
	                });
	                this.listenTo(this.children.labels, 'anchorTagClicked', function(e) {
	                    this.trigger('anchorTagClicked', e);
	                });
	                this.children.labels.render().appendTo(this.$el);
	            },

	            drawDelta: function() {
	                if (this.children.delta) {
	                    this.children.delta.detach();
	                    this.children.delta.remove();
	                }

	                if (this.displayDelta()) {
	                    this.children.delta = new DeltaView({
	                        model: {
	                            state: this.model.state,
	                            presentation: this.model.presentation,
	                            results: this.model.results
	                        }
	                    });
	                    this.children.delta.render().appendTo(this.$el);
	                }

	            },

	            displayDelta: function() {
	                var showDeltaValue = splunkUtil.normalizeBoolean(this.model.state.get('display.visualizations.singlevalue.showTrendIndicator')),
	                deltaValue = this.model.results.get('deltaValue');
	                return showDeltaValue !== false && (deltaValue  || deltaValue === 0);
	            },

	            drawComponents: function() {
	                this.drawLabels();
	                this.drawDelta();
	            },

	            render: function() {
	                this.drawComponents();
	                return this;
	            }
	        });
	    }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "views/shared/singlevalue/Labels":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	        __webpack_require__("shim/jquery"),
	        __webpack_require__("require/underscore"),
	        module,
	        __webpack_require__("views/Base"),
	        __webpack_require__("views/shared/singlevalue/Label"),
	        __webpack_require__("models/Base"),
	        __webpack_require__("shim/splunk.util"),
	        __webpack_require__("util/svg"),
	        __webpack_require__("util/math_utils")
	    ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        $,
	        _,
	        module,
	        BaseView,
	        LabelView,
	        BaseModel,
	        splunkUtil,
	        svgUtil,
	        mathUtil
	        ) {

	        return BaseView.extend({
	            moduleId: module.id,
	            className: "single-value-labels",
	            el: function() {
	                return svgUtil.createElement('g').attr('class', 'single-value-labels');
	            },
	            LABEL_SIDE_PADDING: 5,

	            initialize: function(options) {
	                BaseView.prototype.initialize.apply(this, arguments);
	                this.activate();
	                this.unit = options.unit;
	                this.unitPosition = options.unitPosition;
	                this.hasUnit = options.hasUnit;
	                this.hasAfterLabel = options.hasAfterLabel;
	                this.hasBeforeLabel = options.hasBeforeLabel;
	                this.originalSingleValueFontSize = this.model.presentation.get('singleValueFontSize');
	                this.originalSideLabelFontSize = this.model.presentation.get('sideLabelFontSize');
	                this.updateContainerDimensions();
	            },

	            reflow: function() {
	                this.updateContainerDimensions();
	                this.scaleLabels();
	                // Do not call this.positionLabels() in reflow because positionLabels is called manually by the parent view (MainBody.js) later,
	                // after the delta value scaling and measuring routines have run, in order to use the latest deltaWidth dimension.
	            },

	            updateContainerDimensions: function() {
	                // Scale font size to fill new available SVG height
	                this.scaleRatio = this.model.presentation.get('scaleRatio');
	                this.singleValueFontSize = this.originalSingleValueFontSize * this.scaleRatio;
	                this.labelFontSize = this.originalSideLabelFontSize * this.scaleRatio;
	            },

	            constructMainLabelData: function() {
	                var labelData,
	                    fontColor = this.model.presentation.get('fontColor'),
	                    beforeLabelConfigName = "display.visualizations.singlevalue.beforeLabel",
	                    afterLabelConfigName = "display.visualizations.singlevalue.afterLabel";

	                labelData = {
	                    singleResultData: {
	                        labelFontSize: this.originalSingleValueFontSize,
	                        labelFontColor: fontColor,
	                        labelGroupClass: 'single-result-group',
	                        labelClass: 'single-result',
	                        linkField: 'result',
	                        configName: 'display.visualizations.singlevalue.singleResult',
	                        useResultField: true,
	                        fontWeight: 'bold',
	                        unit: this.unit,
	                        unitPosition: this.unitPosition,
	                        hasUnit: this.hasUnit,
	                        exportMode: !!this.model.state.get('exportMode')
	                    }
	                };

	                if (this.hasBeforeLabel) {
	                    labelData.beforeLabelData = {
	                        labelFontSize: this.originalSideLabelFontSize,
	                        labelFontColor: fontColor,
	                        labelGroupClass: 'before-label-group',
	                        labelClass: 'before-label',
	                        linkField: 'beforelabel',
	                        configName: beforeLabelConfigName,
	                        useResultField: false,
	                        fontWeight: 'normal'
	                    };
	                }

	                if (this.hasAfterLabel) {
	                    labelData.afterLabelData = {
	                        labelFontSize: this.originalSideLabelFontSize,
	                        labelFontColor: fontColor,
	                        labelGroupClass: 'after-label-group',
	                        labelClass: 'after-label',
	                        linkField: 'afterlabel',
	                        configName: afterLabelConfigName,
	                        useResultField: false,
	                        fontWeight: 'normal'
	                    };
	                }

	                return labelData;
	            },

	            getMainLabelsWidth: function() {
	                var mainLabelsWidth = 0;
	                if (this.hasBeforeLabel) {
	                    mainLabelsWidth += this.children.beforeLabelView.getWidth();
	                    mainLabelsWidth += this.LABEL_SIDE_PADDING;
	                }
	                if (this.hasAfterLabel) {
	                    mainLabelsWidth += this.children.afterLabelView.getWidth();
	                    mainLabelsWidth += this.LABEL_SIDE_PADDING;
	                }
	                mainLabelsWidth += this.children.singleResultView.getWidth();

	                return mainLabelsWidth;
	            },

	            positionLabels: function() {
	                var shiftWidth = 0,
	                    beforeLabel,
	                    afterLabel,
	                    singleValue = this.children.singleResultView.getLabelElement(),
	                    beforeLabelX = shiftWidth,
	                    singleValueX = shiftWidth,
	                    afterLabelX = 0,
	                    beforeLabelWidth,
	                    singleValueWidth = this.children.singleResultView.getWidth(),
	                    mainLabelsWidth = this.getMainLabelsWidth(),
	                    deltaWidth = this.model.presentation.get('deltaWidth') || 0,
	                    svgWidth = this.model.presentation.get('svgWidth');

	                if (deltaWidth > 0) {
	                    deltaWidth += this.model.presentation.get('deltaPadding');
	                }
	                // Center labels within SVG container
	                shiftWidth = mathUtil.roundToDecimal((svgWidth / 2) - ((mainLabelsWidth + deltaWidth) / 2), -2); // round to 2 d.p.

	                // Now, actually reposition the labels
	                if (this.hasBeforeLabel) {
	                    beforeLabelWidth = this.children.beforeLabelView.getWidth();
	                    beforeLabel = this.children.beforeLabelView.getLabelElement();
	                    beforeLabelX = shiftWidth;
	                    singleValueX = beforeLabelWidth + beforeLabelX + this.LABEL_SIDE_PADDING;
	                    beforeLabel.attr('x', beforeLabelX);
	                } else {
	                    singleValueX = shiftWidth;
	                }
	                singleValue.attr('x', singleValueX);

	                if (this.hasAfterLabel) {
	                    afterLabel = this.children.afterLabelView.getLabelElement();
	                    afterLabelX = singleValueX + singleValueWidth + this.LABEL_SIDE_PADDING;
	                    afterLabel.attr('x', afterLabelX);
	                }
	            },

	            scaleLabels: function() {
	                var beforeLabel,
	                    singleValue = this.children.singleResultView.getLabelElement(),
	                    afterLabel,
	                    mainLabelsWidth,
	                    maxLabelWidth = this.model.presentation.get('maxLabelsWidth'),
	                    maxLabelRatio;

	                if (!this.defaultMainLabelsWidth) {
	                    this.defaultMainLabelsWidth = this.getMainLabelsWidth();
	                }

	                // Reset all adjusted attributes to position and scale from the same place every time
	                singleValue.css('font-size', this.singleValueFontSize);

	                // Width will always be 0 in PDF so skip this step
	                if (!this.model.state.get('exportMode')) {
	                    if (this.children.singleResultView.getWidth() === 0) {
	                        // The labels are not yet in the DOM - not point of adjusting positions/scales
	                        // Bail and wait until next pass through when labels are in DOM
	                        return;
	                    }
	                }

	                if (this.hasBeforeLabel) {
	                    beforeLabel = this.children.beforeLabelView.getLabelElement();
	                    beforeLabel.css('font-size', this.labelFontSize);
	                }

	                if (this.hasAfterLabel) {
	                    afterLabel = this.children.afterLabelView.getLabelElement();
	                    afterLabel.css('font-size', this.labelFontSize);
	                }

	                mainLabelsWidth = this.getMainLabelsWidth();

	                // Newly scaled labels would overflow - revert to max allowable size
	                if (mainLabelsWidth > maxLabelWidth) {
	                    maxLabelRatio = mathUtil.roundToDecimal(maxLabelWidth / this.defaultMainLabelsWidth, -4);
	                    this.singleValueFontSize = mathUtil.roundToDecimal(this.originalSingleValueFontSize * maxLabelRatio, -4);
	                    this.labelFontSize = mathUtil.roundToDecimal(this.originalSideLabelFontSize * maxLabelRatio, -4);

	                    singleValue.css('font-size', this.singleValueFontSize);
	                    if (this.hasBeforeLabel) {
	                        beforeLabel = this.children.beforeLabelView.getLabelElement();
	                        beforeLabel.css('font-size', this.labelFontSize);
	                    }

	                    if (this.hasAfterLabel) {
	                        afterLabel = this.children.afterLabelView.getLabelElement();
	                        afterLabel.css('font-size', this.labelFontSize);
	                    }
	                }
	            },

	            createLabel: function(mainGroup, mainLabelData, modelOptions, viewName, dataName) {
	                if (this.children[viewName]) {
	                    this.children[viewName].detach();
	                    this.children[viewName].remove();
	                }
	                this.children[viewName] = new LabelView(_.extend(modelOptions, mainLabelData[dataName]));
	                this.children[viewName].render().appendTo(mainGroup);

	                this.listenTo(this.children[viewName], 'singleDrilldownClicked', function(params) {
	                    this.trigger('singleDrilldownClicked', params);
	                });
	                this.listenTo(this.children[viewName], 'anchorTagClicked', function(e) {
	                    this.trigger('anchorTagClicked', e);
	                });
	            },

	            render: function() {
	                var mainGroup = this.$el.find('.main-label-group'),
	                    mainLabelData = this.constructMainLabelData(),
	                    modelOptions = {
	                        model: {
	                            state: this.model.state,
	                            results: this.model.results,
	                            presentation: this.model.presentation,
	                            application: this.model.application
	                        }
	                    };
	                if (mainGroup.length > 0) {
	                    mainGroup.remove();
	                }
	                // Create group to contain BeforeLabel, SingleValue, and AfterLabel
	                mainGroup = svgUtil.createElement('g')
	                    .attr('class', 'main-label-group');
	                this.$el.append(mainGroup);

	                if (this.hasBeforeLabel) {
	                    this.createLabel(mainGroup, mainLabelData, modelOptions, 'beforeLabelView', 'beforeLabelData');
	                }

	                this.createLabel(mainGroup, mainLabelData, modelOptions, 'singleResultView', 'singleResultData');

	                if (this.hasAfterLabel) {
	                    this.createLabel(mainGroup, mainLabelData, modelOptions, 'afterLabelView', 'afterLabelData');
	                }
	                return this;
	            }
	        });
	    }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "views/shared/singlevalue/Label":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	        __webpack_require__("shim/jquery"),
	        __webpack_require__("require/underscore"),
	        module,
	        __webpack_require__("views/Base"),
	        __webpack_require__("models/Base"),
	        __webpack_require__("shim/splunk.util"),
	        __webpack_require__("util/svg"),
	        __webpack_require__("util/general_utils"),
	        __webpack_require__("uri/route"),
	        __webpack_require__("util/numeral")
	    ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        $,
	        _,
	        module,
	        BaseView,
	        BaseModel,
	        splunkUtil,
	        svgUtil,
	        generalUtil,
	        route,
	        numeral
	        ) {

	        var getStringRepresentation = function(label, formatted) {
	            if (_.isFunction(label)) {
	                try {
	                    label = label(formatted);
	                } catch (e) {
	                    return '';
	                }
	            }
	            return label;
	        };

	        return BaseView.extend({
	            moduleId: module.id,
	            className: "single-value-label",
	            el: function() {
	                return svgUtil.createElement('g').attr({
	                    'class': 'single-value-label',
	                    'data-name': this.options.configName
	                });
	            },

	            initialize: function(options) {
	                BaseView.prototype.initialize.apply(this, arguments);
	                this.activate();
	                this.LABEL_FONT_SIZE = this.options.labelFontSize;
	                this.labelFontColor = this.options.labelFontColor;
	                this.labelGroupClass = this.options.labelGroupClass;
	                this.labelClass = this.options.labelClass;
	                this.linkField = this.options.linkField;
	                this.resultFieldValue = this.model.results.get('resultFieldValue');
	                this.configName = this.options.configName;
	                this.unit = this.options.unit;
	                this.unitPosition = this.options.unitPosition;
	                this.hasUnit = this.options.hasUnit;
	                this.isNumericLabelValue = false;
	                if (this.options.useResultField) {
	                    if (!isNaN(this.resultFieldValue)) {
	                        // Single Result Label - needs formatting
	                        var formatPattern = this.model.presentation.get('formatPattern');
	                        this.labelValue = numeral(this.resultFieldValue).format(formatPattern);
	                        this.isNumericLabelValue = true;
	                    } else {
	                        this.labelValue = this.resultFieldValue;
	                    }
	                } else {
	                    this.labelValue = getStringRepresentation(this.model.state.get(this.configName) || "", this.resultFieldValue);
	                }
	                this.fontWeight = this.options.fontWeight;
	                this.labelOpacity = this.options.labelOpacity;
	                this.exportMode = this.options.exportMode;
	            },

	            events: {
	                'click a.single-drilldown': function(e) {
	                    e.preventDefault();
	                    var target = $(e.currentTarget);
	                    var resModel = this.model.results.get('searchResultsColumn'),
	                        names = resModel.get('fields');

	                    // Fields can either be a list of strings or a list of dictionaries each with a 'name' entry
	                    // depending on whether 'show_metadata' is enabled
	                    if (_.isObject(names[0])) {
	                        names = _(names).pluck('name');
	                    }

	                    var rowContext = _.object(
	                        _(names).map(function(f) { return 'row.' + f; }),
	                        _(resModel.get('columns')).map(function(col) { return _(col).last(); })
	                    );

	                    var drilldownInfo = {
	                        name: target.data('field'),
	                        value: target.data('value'),
	                        rowContext: rowContext,
	                        originalEvent: e,
	                        type: 'cell'
	                    };

	                    // If the results model has sparkline data, we want to narrow the drilldown time range
	                    // to the last time bucket, since that is what is used to display the label.
	                    if (this.model.results.has('sparklineData')) {
	                        var timeFieldIndex = _(names).indexOf('_time'),
	                            spanFieldIndex = _(names).indexOf('_span'),
	                            columns = resModel.get('columns'),
	                            lastTimestamp = splunkUtil.getEpochTimeFromISO(_(columns[timeFieldIndex]).last()),
	                            lastTimespan = parseFloat(_(columns[spanFieldIndex]).last());

	                        // Time range drilldown has to be done with `name` and `value`, re-map the current values
	                        // there to `name2` and `value2` so that consumers still have access to them.
	                        drilldownInfo.name2 = drilldownInfo.name;
	                        drilldownInfo.value2 = drilldownInfo.value;
	                        drilldownInfo.name = '_time';
	                        drilldownInfo.value = lastTimestamp;
	                        drilldownInfo._span = lastTimespan;
	                        drilldownInfo.rowContext['row._time'] = lastTimestamp;
	                        drilldownInfo.rowContext['row._span'] = lastTimespan;
	                    }

	                    var specificEventNames = _(target.children('text').attr('class').split(' ')).map(function(cls) {
	                        return 'click:' + cls;
	                    }).join(' ');
	                    this.trigger('singleDrilldownClicked', { specificEventNames: 'click drilldown ' + specificEventNames, drilldownInfo: drilldownInfo });
	                },
	                'click a.link-drilldown': function(e) {
	                    e.preventDefault();
	                    this.trigger('anchorTagClicked', e);
	                }
	            },

	            constructLabelData: function() {
	                var labelData,
	                    severityColor = this.model.presentation.get('severityColor');

	                labelData = {
	                    name: this.labelClass,
	                    linkField: this.linkField,
	                    value: this.labelValue,
	                    fontSize: this.LABEL_FONT_SIZE + 'px',
	                    fontWeight: this.fontWeight,
	                    fontColor: this.labelFontColor,
	                    opacity: this.labelOpacity || 1
	                };

	                return labelData;
	            },

	            drawLabel: function(container, labelData) {
	                var labelGroup,
	                    labelText,
	                    labelAnchor;

	                labelGroup = svgUtil.createElement('g')
	                    .attr('class', 'svg-label');

	                labelText = svgUtil.createElement('text')
	                    .attr({
	                        x: labelData.x,
	                        y: labelData.y,
	                        'class': labelData.name
	                    })
	                    .css({
	                        'letter-spacing': this.isNumericLabelValue ? '-0.02em' : 'normal',
	                        'font-size' : labelData.fontSize,
	                        'font-weight' : labelData.fontWeight,
	                        'fill' : labelData.fontColor,
	                        'opacity': labelData.opacity
	                    });

	                var labelValue = ("" + labelData.value);

	                if (this.hasUnit && (this.unitPosition === "before")) {
	                    if ((/^\-\d/).test(labelValue)) {
	                        labelText.append(document.createTextNode('-'));
	                        labelValue = labelValue.substring(1);
	                    }

	                    if (this.exportMode) {
	                        // The export renderer does not support <tspan> elements,
	                        // work around it by prepending the unit directly to the main label.
	                        labelValue = "" + this.unit + labelValue;
	                    } else {
	                        var beforeSpan = svgUtil.createElement('tspan')
	                            .attr({
	                                'class': labelData.name + "-unit"
	                            })
	                            .css({
	                                'letter-spacing': 'normal'
	                            })
	                            .text("" + this.unit);

	                        labelText.append(beforeSpan);
	                    }
	                }

	                labelText.append(document.createTextNode(labelValue));

	                if (this.hasUnit && (this.unitPosition === "after")) {
	                    if (this.exportMode) {
	                        // The export renderer does not support <tspan> elements,
	                        // work around it by appending the unit directly to the main label.
	                        labelText.append(document.createTextNode('\u2009' + this.unit));  // u2009 = thin space
	                    } else {
	                        var afterSpan = svgUtil.createElement('tspan')
	                            .attr({
	                                'class': labelData.name + "-unit"
	                            })
	                            .css({
	                                'letter-spacing': 'normal'
	                            })
	                            .text('\u2009' + this.unit);  // u2009 = thin space

	                        labelText.append(afterSpan);
	                    }
	                }

	                if (labelData.link) {
	                    labelAnchor = svgUtil.createElement('a')
	                        .attr({
	                            href: labelData.link.attr('href'),
	                            'class': labelData.link.attr('class')
	                        })
	                        .css({
	                            'text-decoration': 'none' // only style the <text> element itself, so that there is only 1 underline on hover
	                        });
	                    labelAnchor.data('value', labelData.value);
	                    labelAnchor.data('field', labelData.linkField);

	                    labelAnchor.append(labelText);
	                    labelGroup.append(labelAnchor);

	                    // IE requires that hover underline anchor styles are applied directly to the <text> element and not the surrounding anchor tag.
	                    // We must therefore dynamically apply a hover styling event handler as
	                    // we have no stylesheet for Single Value in which to use :hover pseudoselector for SVG
	                    labelText.hover(function(e) {
	                        labelText.css({ 'text-decoration': e.type === "mouseenter" ? 'underline' : 'none' });
	                    });
	                } else {
	                    labelGroup.append(labelText);
	                }
	                container.append(labelGroup);

	                this.labelElement = this.getLabelElement();
	            },

	            getWidth: function() {
	                return this.getBBox(this.labelElement).width;
	            },

	            getLeftX: function($label) {
	                return parseInt($label.attr('x'), 10);
	            },

	            getBBox: function($label) {
	                var bbox;
	                try {
	                    bbox = $label[0].getBBox();
	                } catch (e) {
	                    // FF throws blocking error if element is not yet in DOM and getBBox is called, so return dummy BBox.
	                    bbox = {
	                        x: 0,
	                        y: 0,
	                        width: 0,
	                        height: 0
	                    };
	                }
	                return bbox;
	            },

	            getRightX: function($label) {
	                return this.getLeftX($label) + this.getWidth($label);
	            },

	            getClientRect: function($label) {
	                return $label[0].getBoundingClientRect();
	            },

	            getLabelElement: function() {
	                var label = this.$('.' + this.labelClass);
	                if (label.length > 0) {
	                    return label;
	                }
	            },

	            wrapLinks: function(field, value) {
	                if (!this.model.application) {
	                    return;
	                }
	                var linkFields = this.model.state.get('display.visualizations.singlevalue.linkFields');
	                linkFields = linkFields ? $.trim(linkFields).split(/\s*,\s*/) : [];
	                var linkView = this.model.state.get('display.visualizations.singlevalue.linkView');
	                var linkSearch = this.model.state.get('display.visualizations.singlevalue.linkSearch');
	                var drilldown = this.model.state.get('display.visualizations.singlevalue.drilldown') || 'none';
	                var app = this.model.application.toJSON();

	                var link;
	                if ((linkView !== 'search' && linkFields.length) || linkSearch) {
	                    var url;
	                    if (linkView) {
	                        var params = linkSearch ? { q: linkSearch } : undefined;
	                        if (linkView.charAt(0) === '/') {
	                            url = splunkUtil.make_full_url(linkView, params);
	                        } else {
	                            url = route.page(app.root, app.locale, app.app, linkView, { data: params });
	                        }
	                    } else {
	                        url = route.search(app.root, app.locale, app.app, { data: { q: linkSearch }});
	                    }
	                    link = $('<a class="link-drilldown" />').attr('href', url);
	                } else if (drilldown !== 'none') {
	                    link = $('<a class="single-drilldown" href="#"></a>');
	                    if (!_(linkFields).contains('result')) {
	                        linkFields.push('result');
	                    }
	                }

	                if (link) {
	                    link.data({
	                        field: field,
	                        value: value
	                    });
	                    return { linkFields: linkFields, link: link };
	                }
	            },

	            render: function() {
	                var labelGroup,
	                    labelData = this.constructLabelData(),
	                    resultFieldValue = this.model.results.get('resultFieldValue'),
	                    linkArray = this.wrapLinks(this.model.results.get('resultField'), resultFieldValue);

	                if (linkArray) {
	                    _.each(linkArray.linkFields, function(linkField) {
	                        if (this.linkField === linkField) {
	                            labelData.link = linkArray.link;
	                        }
	                    }, this);
	                }
	                labelGroup = this.$el.find('.' + this.labelGroupClass);
	                if (labelGroup.length > 0) {
	                    labelGroup.remove();
	                }
	                labelGroup = svgUtil.createElement('g')
	                    .attr('class', this.labelGroupClass);
	                this.$el.append(labelGroup);
	                this.drawLabel(labelGroup, labelData);
	                return this;
	            }
	        });
	    }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "util/numeral":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__("stubs/i18n"), __webpack_require__("shim/numeral")], __WEBPACK_AMD_DEFINE_RESULT__ = function(i18n, numeral){
	    var initFn = i18n.numeral_install,
	        localeMap = {
	            'de_DE': 'de',
	            'en_DEBUG': 'en-debug',
	            'en_GB': 'en-gb',
	            'en_US': 'en-us',
	            'it_IT': 'it',
	            'ko_KR': 'ko',
	            'zh_CN': 'chs',
	            'zh_TW': 'chs-traditional'
	        };
	    if(typeof initFn === 'function') {
	        initFn(numeral);
	        numeral.language(localeMap[i18n.locale_name()]);
	    }
	    return numeral;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "shim/numeral":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(35)], __WEBPACK_AMD_DEFINE_RESULT__ = function(numeral) {
	    // This shim is only needed for backwards compatibility. It makes numeral a
	    // global on the window object to support the language files in:
	    // web/search_mrsparkle/exposed/js/contrib/numeral/lang
	    // These language files are injected into i18n.js in the
	    // `write_numeral_translation` function of
	    // /Users/dstreit/splunk/source/main/python-site/splunk/appserver/mrsparkle/lib/i18n.py
	    return numeral;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "views/shared/singlevalue/Sparkline":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	        __webpack_require__("shim/jquery"),
	        __webpack_require__("require/underscore"),
	        module,
	        __webpack_require__("views/Base"),
	        __webpack_require__("shim/splunk.util"),
	        __webpack_require__("util/svg"),
	        __webpack_require__("util/general_utils"),
	        __webpack_require__("util/math_utils")
	    ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        $,
	        _,
	        module,
	        BaseView,
	        splunkUtil,
	        svgUtil,
	        generalUtil,
	        mathUtil
	    ) {

	        return BaseView.extend({
	            moduleId: module.id,
	            className: "single-value-sparkline",
	            el: function() {
	                return svgUtil.createElement('g').attr('class', 'single-value-sparkline');
	            },
	            SPARKLINE_WIDTH: 150,
	            SPARKLINE_HEIGHT: 14,
	            SPARKLINE_Y: 77,
	            DEFAULT_SPARKLINE_COLOR: '#000000',
	            initialize: function(options) {
	                BaseView.prototype.initialize.apply(this, arguments);

	                this.sparklineColor = this.model.presentation.get('sparklineColor');
	                this.activate();
	            },
	            drawSparkline: function() {
	                var opacity = this.model.presentation.get('sparklineOpacity') || 1,
	                    counter = 1, // X-axis values do not matter as long as they are uniform in distance from one another
	                    rawData = this.model.results.get('sparklineData'),
	                    deltaBacktrack = this.model.results.get('deltaBacktrack');

	                // clear previous render
	                this.$el.empty();

	                // bail if no data or less than two data points
	                if (!rawData || (rawData.length < 2)) {
	                    return;
	                }

	                // convert data to points and compute x/y ranges
	                var points = [];
	                var minX = Infinity;
	                var maxX = -Infinity;
	                var minY = Infinity;
	                var maxY = -Infinity;
	                _.each(rawData, function(d) {
	                    var x = counter++;
	                    var y = parseFloat(d) || 0;
	                    minX = Math.min(x, minX);
	                    maxX = Math.max(x, maxX);
	                    minY = Math.min(y, minY);
	                    maxY = Math.max(y, maxY);
	                    points.push({ x: x, y: y });
	                });

	                // scale points to width/height
	                var width = this.SPARKLINE_WIDTH;
	                var height = this.SPARKLINE_HEIGHT;
	                _.each(points, function(d, i) {
	                    d.x = (width * ((d.x - minX) / Math.max(maxX - minX, 1)));
	                    d.y = (height * (1 - (d.y - minY) / Math.max(maxY - minY, 1)));
	                });

	                // draw sparkline with delta range
	                if ((deltaBacktrack > 0) && this.displayDeltaRange()) {
	                    var endIndex = points.length - 1;
	                    var startIndex = Math.max(endIndex - deltaBacktrack, 0);

	                    // draw thin path segment
	                    svgUtil.createElement('path')
	                        .attr('class', 'sparkline')
	                        .attr('d', this.pointsToPath(points.slice(0, startIndex + 1)))
	                        .attr('fill', 'none')
	                        .attr('stroke', this.sparklineColor)
	                        .attr('opacity', opacity * 0.6)
	                        .attr('stroke-width', '1px')
	                        .attr('stroke-linecap', 'round')
	                        .attr('stroke-linejoin', 'round')
	                        .appendTo(this.$el);

	                    // draw thick path segment
	                    svgUtil.createElement('path')
	                        .attr('class', 'sparkline-delta')
	                        .attr('d', this.pointsToPath(points.slice(startIndex, endIndex + 1)))
	                        .attr('fill', 'none')
	                        .attr('stroke', this.sparklineColor)
	                        .attr('opacity', opacity)
	                        .attr('stroke-width', '1.5px')
	                        .attr('stroke-linecap', 'round')
	                        .attr('stroke-linejoin', 'round')
	                        .appendTo(this.$el);

	                    // draw start point
	                    var startPoint = points[startIndex];
	                    svgUtil.createElement('circle')
	                        .attr('class', 'sparkline-point')
	                        .attr('cx', startPoint.x)
	                        .attr('cy', startPoint.y)
	                        .attr('r', 2)
	                        .attr('fill', this.sparklineColor)
	                        .attr('stroke', 'none')
	                        .attr('opacity', opacity)
	                        .appendTo(this.$el);

	                // draw normal sparkline
	                } else {
	                    svgUtil.createElement('path')
	                        .attr('class', 'sparkline')
	                        .attr('d', this.pointsToPath(points))
	                        .attr('fill', 'none')
	                        .attr('stroke', this.sparklineColor)
	                        .attr('opacity', opacity)
	                        .attr('stroke-width', '1.5px')
	                        .attr('stroke-linecap', 'round')
	                        .attr('stroke-linejoin', 'round')
	                        .appendTo(this.$el);
	                }

	                // draw end point
	                var endPoint = points[points.length - 1];
	                svgUtil.createElement('circle')
	                    .attr('class', 'sparkline-point')
	                    .attr('cx', endPoint.x)
	                    .attr('cy', endPoint.y)
	                    .attr('r', 2)
	                    .attr('fill', this.sparklineColor)
	                    .attr('stroke', 'none')
	                    .attr('opacity', opacity)
	                    .appendTo(this.$el);
	            },
	            positionAndScaleSparkline: function() {
	                // Position sparkline in middle of SVG container
	                var shiftWidth = mathUtil.roundToDecimal(((this.svgWidth / 2 - this.sparklineWidth / 2) / this.scaleRatio), -2),
	                    shiftHeight = this.SPARKLINE_Y,
	                    edgePadding = this.model.presentation.get('edgePadding'),
	                    availableWidth = this.svgWidth - (edgePadding * 2),
	                    originalHeight,
	                    maxHeight,
	                    maxWidthRatio,
	                    maxShiftWidth,
	                    maxShiftHeight;
	                if (this.sparklineWidth < availableWidth) {
	                    // Only scale up sparkline if there is horizontal space to do so
	                    if (generalUtil.valuesAreNumericAndFinite([this.scaleRatio, shiftWidth, shiftHeight])) {
	                        this.$el.attr({
	                            transform: "scale(" + this.scaleRatio + ")translate(" + shiftWidth + "," + shiftHeight + ")"
	                        });
	                    }
	                } else {
	                    maxWidthRatio = mathUtil.roundToDecimal((availableWidth / this.SPARKLINE_WIDTH), -2);
	                    maxShiftWidth = mathUtil.roundToDecimal((edgePadding / maxWidthRatio), -2);
	                    originalHeight = mathUtil.roundToDecimal((this.svgHeight / this.scaleRatio), -2);
	                    // Due to width constraint, Sparkline cannot scale beyond this max height
	                    maxHeight = originalHeight * maxWidthRatio;
	                    // Because Sparkline is scaled only by the constant maxWidthRatio and not by the actual viz height's scaleRatio,
	                    // the Sparkline vertical translate amount must be increased by the viz height increase in addition to the usual shiftHeight
	                    maxShiftHeight = mathUtil.roundToDecimal(shiftHeight + ((this.svgHeight - maxHeight) / maxWidthRatio), -2);
	                    if (generalUtil.valuesAreNumericAndFinite([maxWidthRatio, maxShiftWidth, maxShiftHeight])) {
	                        this.$el.attr({
	                            transform: "scale(" + maxWidthRatio + ")translate(" + maxShiftWidth + "," + maxShiftHeight + ")"
	                        });
	                    }
	                }
	            },
	            pointsToPath: function(points) {
	                var path = "";
	                var point;
	                for (var i = 0, l = points.length; i < l; i++) {
	                    point = points[i];
	                    path += (i === 0) ? "M" : "L";
	                    path += point.x + "," + point.y;
	                }
	                return path;
	            },
	            displayDeltaRange: function() {
	                var showDeltaValue = splunkUtil.normalizeBoolean(this.model.state.get('display.visualizations.singlevalue.showTrendIndicator')),
	                deltaValue = this.model.results.get('deltaValue');
	                return (showDeltaValue !== false) && (deltaValue != null);
	            },
	            reflow: function() {
	                this.updateContainerDimensions();
	                this.positionAndScaleSparkline();
	            },
	            updateContainerDimensions: function() {
	                this.svgWidth = this.model.presentation.get('svgWidth');
	                this.svgHeight = this.model.presentation.get('svgHeight');
	                this.scaleRatio = this.model.presentation.get('scaleRatio');

	                // Scale sparkline dimensions to fill new available SVG height
	                this.sparklineWidth = this.SPARKLINE_WIDTH * this.scaleRatio;
	            },
	            render: function() {
	                this.drawSparkline();
	                return this;
	            }
	        });
	    }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "views/shared/singlevalue/Delta":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	        __webpack_require__("shim/jquery"),
	        __webpack_require__("require/underscore"),
	        module,
	        __webpack_require__("views/Base"),
	        __webpack_require__("util/svg"),
	        __webpack_require__("util/general_utils"),
	        __webpack_require__("util/math_utils")
	    ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        $,
	        _,
	        module,
	        BaseView,
	        svgUtil,
	        generalUtil,
	        mathUtil
	        ) {

	        return BaseView.extend({
	            moduleId: module.id,
	            className: "single-value-delta",
	            el: function() {
	                return svgUtil.createElement('g').attr('class', 'single-value-delta');
	            },
	            SVG_POINTS: {
	                decrease: {
	                    polylinePoints: '20.5,3 20.5,20.5 3,20.5',
	                    linePoints: [20.2,20.9,3.4,4]
	                },
	                increase: {
	                    polylinePoints: '20.5,21 20.5,3.5 3,3.5',
	                    linePoints: [20.2,3.3,3.4,20.2]
	                },
	                noChange: {
	                    polylinePoints: '14.8,20.2 23.8,11.2 14.8,2.2',
	                    linePoints: [0,11.2,23,11.2]
	                }
	            },
	            INDICATOR_WIDTH: 22,
	            initialize: function(options) {
	                BaseView.prototype.initialize.apply(this, arguments);
	                this.updateContainerDimensions();
	                this.activate();
	            },
	            drawComponents: function() {
	                var deltaFormat = this.model.state.get('display.visualizations.singlevalue.trendDisplayMode');

	                this.deltaValue = this.model.results.get('deltaValue');
	                this.formattedDeltaValue = this.model.results.get('formattedDeltaValue');

	                if (this.deltaValue && this.deltaValue !== 0) {
	                    if (this.deltaValue === 'percentageDecrease' || this.deltaValue < 0) {
	                        this.indicatorMode = 'decrease';
	                        this.indicatorClass = 'delta-down-indicator';
	                    } else if (this.deltaValue === 'percentageIncrease' || this.deltaValue > 0) {
	                        this.indicatorMode = 'increase';
	                        this.indicatorClass = 'delta-up-indicator';
	                    }
	                } else {
	                    this.indicatorMode = 'noChange';
	                    this.indicatorClass = 'delta-no-change-indicator';
	                }

	                this.indicatorColor = this.model.presentation.get('deltaColor');

	                if (isNaN(this.deltaValue) || this.deltaValue === Infinity || this.deltaValue === -Infinity) {
	                    this.formattedDeltaValue = "N/A";
	                } else {
	                    if (deltaFormat && deltaFormat.toLowerCase() === 'percent') {
	                        this.formattedDeltaValue += '%';
	                    }
	                }

	                this.drawLabel();
	                this.drawIndicator();
	            },
	            drawIndicator: function() {
	                var indicatorGroup = svgUtil.createElement('g')
	                        .attr({
	                            'class': 'delta-indicator ' +  this.indicatorClass
	                        }),
	                    points = this.SVG_POINTS[this.indicatorMode],
	                    polyline = svgUtil.createElement('polyline')
	                        .attr({
	                            points: points.polylinePoints,
	                            fill: 'none',
	                            stroke: this.indicatorColor,
	                            'stroke-width': '5px'
	                        }),
	                    line = svgUtil.createElement('line')
	                        .attr({
	                            x1: points.linePoints[0],
	                            y1: points.linePoints[1],
	                            x2: points.linePoints[2],
	                            y2: points.linePoints[3],
	                            fill: this.indicatorColor,
	                            stroke: this.indicatorColor,
	                            'stroke-width': '5px'
	                        });
	                indicatorGroup.append(polyline);
	                indicatorGroup.append(line);
	                this.$el.append(indicatorGroup);
	            },
	            drawLabel: function() {
	                var value = svgUtil.createElement('text')
	                    .attr({
	                        'class': 'delta-label'
	                    })
	                    .text(this.formattedDeltaValue)
	                    .css({
	                        'font-size' : this.model.presentation.get('deltaFontSize'),
	                        'fill' : this.indicatorColor,
	                        'fontWeight' : 'bold'
	                    });
	                this.$el.append(value);
	            },
	            updateContainerDimensions: function() {
	                this.scaleRatio = this.model.presentation.get('scaleRatio');
	            },
	            positionAndScaleElements: function() {
	                var $label = this.$el.find('.delta-label'),
	                    $indicator = this.$el.find('.delta-indicator'),
	                    deltaScale = this.model.presentation.get('deltaScale'),
	                    labelWidth,
	                    indicatorWidth = this.INDICATOR_WIDTH * deltaScale,
	                    deltaWidth,
	                    deltaLeft = this.model.presentation.get('deltaLeft') || 0,
	                    indicatorTranslateX,
	                    indicatorTranslateY = -45,
	                    deltaTranslateX,
	                    maxDeltaRatio,
	                    maxDeltaWidth = this.model.presentation.get('maxDeltaWidth');

	                if (!this.defaultDeltaWidth) {
	                    this.defaultDeltaWidth = this.getDeltaWidth();
	                }

	                if (!this.defaultLabelWidth) {
	                    this.defaultLabelWidth = $label[0].getBBox().width;
	                }

	                deltaTranslateX = (deltaLeft + 10) / this.scaleRatio;
	                labelWidth = this.defaultLabelWidth;

	                indicatorTranslateX = mathUtil.roundToDecimal((labelWidth / 2 - indicatorWidth / 2), -2);
	                if (generalUtil.valuesAreNumericAndFinite([this.scaleRatio, indicatorTranslateX, indicatorTranslateY, deltaTranslateX])) {
	                    $indicator.attr({
	                        transform: 'scale(' + deltaScale + ')translate(' + indicatorTranslateX + ',' + indicatorTranslateY + ')'
	                    });
	                    this.$el.attr({
	                        transform: "scale(" + this.scaleRatio + ")translate(" + deltaTranslateX + ")"
	                    });
	                }


	                deltaWidth = this.getDeltaWidth();
	                if (deltaWidth > maxDeltaWidth) {
	                    maxDeltaRatio = mathUtil.roundToDecimal(maxDeltaWidth / this.defaultDeltaWidth, -2);
	                    deltaTranslateX = (deltaLeft + 10) / maxDeltaRatio;
	                    if (generalUtil.valuesAreNumericAndFinite([maxDeltaRatio, deltaTranslateX])) {
	                        this.$el.attr({
	                            transform: "scale(" + maxDeltaRatio + ")translate(" + deltaTranslateX + ")"
	                        });
	                    }
	                }
	            },
	            getDeltaWidth: function() {
	                return this.el.getBoundingClientRect().width;
	            },
	            reflow: function() {
	                this.updateContainerDimensions();
	                this.positionAndScaleElements();
	            },
	            render: function() {
	                this.drawComponents();
	                return this;
	            }
	        });
	    }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "views/shared/singlevalue/UnderLabel":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	        __webpack_require__("shim/jquery"),
	        __webpack_require__("require/underscore"),
	        module,
	        __webpack_require__("views/Base"),
	        __webpack_require__("views/shared/singlevalue/Label"),
	        __webpack_require__("models/Base"),
	        __webpack_require__("shim/splunk.util"),
	        __webpack_require__("util/svg"),
	        __webpack_require__("util/general_utils"),
	        __webpack_require__("util/math_utils")
	    ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	        $,
	        _,
	        module,
	        BaseView,
	        LabelView,
	        BaseModel,
	        splunkUtil,
	        svgUtil,
	        generalUtil,
	        mathUtil
	        ) {

	        return BaseView.extend({
	            moduleId: module.id,
	            className: 'single-value-under-label',
	            initialize: function(options) {
	                BaseView.prototype.initialize.apply(this, arguments);
	            },
	            el: function() {
	                return svgUtil.createElement('g').attr('class', 'single-value-under-label');
	            },
	            LABEL_FONT_SIZE: 12,

	            createUnderLabel: function() {
	                if (this.children.underLabel) {
	                    this.children.underLabel.detach();
	                    this.children.underLabel.remove();
	                }
	                this.children.underLabel = new LabelView({
	                    model: {
	                        state: this.model.state,
	                        results: this.model.results,
	                        presentation: this.model.presentation,
	                        application: this.model.application
	                    },
	                    labelFontSize: this.LABEL_FONT_SIZE,
	                    labelFontColor: this.model.presentation.get('underLabelColor'),
	                    labelGroupClass: 'under-label-group',
	                    labelClass: 'under-label',
	                    linkField: 'underlabel',
	                    configName: 'display.visualizations.singlevalue.underLabel',
	                    useResultField: false,
	                    labelOpacity: this.model.presentation.get('underLabelOpacity'),
	                    fontWeight: 'normal'
	                });

	                this.listenTo(this.children.underLabel, 'singleDrilldownClicked', function(params) {
	                    this.trigger('singleDrilldownClicked', params);
	                });
	                this.listenTo(this.children.underLabel, 'anchorTagClicked', function(e) {
	                    this.trigger('anchorTagClicked', e);
	                });
	            },

	            reflow: function() {
	                this.updateContainerDimensions();
	                this.positionAndScaleUnderLabel();
	            },

	            updateContainerDimensions: function() {
	                this.svgWidth = this.model.presentation.get('svgWidth');
	                this.svgHeight = this.model.presentation.get('svgHeight');
	                // Scale up the font size at a decreasing rate to keep the label relatively small
	                this.scaleRatio = this.model.presentation.get('scaleRatio');
	                this.UNDER_LABEL_WIDTH = this.children.underLabel.getWidth();
	            },

	            positionAndScaleUnderLabel: function() {
	                // Under label does not scale - it always stays the same size. It is just scaled vertically.
	                if (this.UNDER_LABEL_WIDTH) {
	                    // Position underlabel in correct location to bottom center of container
	                    var shiftWidth = mathUtil.roundToDecimal((this.svgWidth / 2 - this.UNDER_LABEL_WIDTH / 2), -2),
	                        shiftHeight = this.model.presentation.get('underLabelY') * this.scaleRatio;
	                    if (generalUtil.valuesAreNumericAndFinite([shiftWidth, shiftHeight])) {
	                        this.$el.attr({
	                            transform: "translate(" + shiftWidth + "," + shiftHeight + ")"
	                        });
	                    }
	                }
	            },

	            render: function() {
	                this.createUnderLabel();
	                this.children.underLabel.render().appendTo(this.$el);
	                return this;
	            }
	        });
	    }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),

/***/ "util/drilldown":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("models/services/search/IntentionsParser"),
	            __webpack_require__("shim/splunk.util"),
	            __webpack_require__("util/console")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            IntentionsParser,
	            splunkUtil,
	            console
	        ) {

	    var computeModifierKey = function(clickInfo) {
	        var event = clickInfo.originalEvent || clickInfo;
	        return !!(event.ctrlKey || event.metaKey);
	    };

	    var computeAltKey = function(clickInfo) {
	        var event = clickInfo.originalEvent || clickInfo;
	        return !!event.altKey;
	    };

	    var convertRowDrilldownToIntentions = function(clickInfo, metadata) {
	        var rowContext = _(clickInfo.rowContext).omit('row._time'),
	            field = _(rowContext).chain().keys().map(function(f) { return f.replace('row.', ''); }).value();
	        
	        var isGroupbyField = function(fieldName) {
	            return metadata[fieldName] && metadata[fieldName].hasOwnProperty('groupby_rank');
	        };

	        var isSplitbyField = function(fieldName) {
	            return _.any(metadata, function(meta) { return meta['splitby_field'] === fieldName; });
	        };

	        // If any field in the metadata is the result of a group-by operation, then filter arguments to the inentionsparser
	        // to only include groub-by and split-by fields.
	        if (metadata && _.any(metadata, function(meta, fieldName) { return isGroupbyField(fieldName); })) {
	            field = _(field).filter(function(f) {
	                return isGroupbyField(f) || isSplitbyField(f);
	            });
	        }
	        return ({
	            action: 'fieldvalue',
	            field: field,
	            value: _(field).map(function(f) { return rowContext['row.' + f]; })
	        });
	    };

	    var convertCellDrilldownToIntentions = function(clickInfo) {
	        var field, value;
	        if (clickInfo.name === '_time') {
	            field = _.compact([clickInfo.name2]);
	            value = _.compact([clickInfo.value2]);
	        } else {
	            if (clickInfo.name && clickInfo.name2) {
	                field = [clickInfo.name, clickInfo.name2];
	                value = [clickInfo.value, clickInfo.value2];
	            } else if (clickInfo.name) {
	                field = [clickInfo.name];
	                value = [clickInfo.value];
	            } else {
	                field = [clickInfo.name2];
	                value = [clickInfo.value2];
	            }
	        }
	        return ({
	            action: 'fieldvalue',
	            field: field,
	            value: value
	        });
	    };

	    var convertColumnDrilldownToIntentions = function(clickInfo) {
	        return ({
	            action: 'keyword',
	            field: clickInfo.name2
	        });
	    };

	    var convertAddTermDrilldownToIntentions = function(clickInfo) {
	        return ({
	            action: 'addterm',
	            value: clickInfo.name2
	        });
	    };

	    // normalize data for drilldown event to handle a map click
	    var convertGeovizDrilldownToIntentions = function(clickInfo) {
	        var latLonFields, latLonValues, params,
	            DRILLDOWN_PROPERTIES = {
	                _geo_lat_field: '_geo_lat_field',
	                _geo_lon_field: '_geo_long_field',
	                _geo_bounds_south: '_geo_bounds_south',
	                _geo_bounds_west: '_geo_bounds_west',
	                _geo_bounds_north: '_geo_bounds_north',
	                _geo_bounds_east: '_geo_bounds_east'
	            };

	        if (!_.all(DRILLDOWN_PROPERTIES, function(srcKey) { return !!clickInfo.data[srcKey]; })) {
	            // The search results did not contain bound information for the marker. This happens when the
	            // results have not been produced by the geostats command. In this case we fall back
	            // to a 'fieldvalue' action with the first two fields, which should be latitude and longitude.
	            latLonFields = clickInfo.fields.slice(0, 2);
	            latLonValues = _(latLonFields).map(function(f) { return clickInfo.data[f]; });
	            return ({
	                action: 'fieldvalue',
	                field: latLonFields,
	                value: latLonValues
	            });
	        }
	        params = _(DRILLDOWN_PROPERTIES).chain().map(function(srcKey, prop) {
	            return [prop, clickInfo.data[srcKey]];
	        }).object().value();
	        return (_.extend({ action: 'geoviz' }, params));
	    };

	    var Drilldown = {};

	    /**
	     * Calls the intentions parser which then generates a new search string and time range based on the original
	     * search string of the manager and the click information.
	     *
	     * @param clickInfo {Object} - {
	     *      name/value, name2/value2 {String}
	     *      _span {Number}
	     *      type {String}
	     *      rowContext {Object} map of all key-value pairs in the row
	     *      originalEvent {jQuery Event} the original browser event
	     *  }
	     * @param query {Object} - the properties of the current query - {
	     *     search {String} the current search string
	     *     earliest {String} the current earliest time
	     *     latest {String} the current latest time
	     * }
	     * @param metadata - the current field metadata
	     * @param applicationModel - the current application model
	     * @param options {Object} - {
	     *      negate {Boolean} - Invert the drilldown intention
	     *      stripReportsSearch {Boolean} - default true, strip of all reporting commands, drill down into events
	     *      newSearch {Boolean} - default false, drill down into all events, ignores current search string
	     *      drilldownNewTab {Boolean} - whether to open a new tab for the drilldown action,
	     *                                  default is to inspect the clickInfo for a modifier key
	     *      fields {Array} - list of additional field constraints to apply to cell drilldown
	     *      values {Array} - list of additional value constraints (1 to 1 correspondence with "fields" above)
	     *  }
	     *
	     * @returns A promise for the result of the intentions parser - which is an object containing the search
	     *              string (q) and the time range (earliest and latest)
	     */
	    Drilldown.applyDrilldownIntention = function(clickInfo, query, metadata, applicationModel, options) {
	        options || (options = {});
	        var search = options.newSearch ? '*' : query.search,
	            newTab = Drilldown.shouldDrilldownInNewTab(clickInfo, options),
	            intentionsParser = new IntentionsParser();

	        if (clickInfo.name === '_time') {
	            intentionsParser.set({
	                'dispatch.earliest_time': clickInfo.value
	            }, { silent: true });
	        }
	        if (clickInfo._span) {
	            intentionsParser.set({
	                'dispatch.latest_time': JSON.stringify(Math.round((parseFloat(clickInfo.value) + clickInfo._span) * 1000) / 1000)
	            }, { silent: true });
	        }

	        var intentionParams = {
	            negate: options.hasOwnProperty('negate') ? options.negate : computeAltKey(clickInfo),
	            stripReportsSearch: options.hasOwnProperty('stripReportsSearch') ? options.stripReportsSearch : true
	        };
	        if (options.fields && options.fields.length > 0) {
	            _.extend(intentionParams, { action: 'fieldvalue', field: options.fields, value: options.values });
	        }
	        else if (clickInfo.type === 'geoviz') {
	            _.extend(intentionParams, convertGeovizDrilldownToIntentions(clickInfo));
	        } else if (clickInfo.type === 'column') {
	            _.extend(intentionParams, convertColumnDrilldownToIntentions(clickInfo));
	        } else if (clickInfo.type === 'row') {
	            _.extend(intentionParams, convertRowDrilldownToIntentions(clickInfo, metadata));
	        } else if (clickInfo.type === 'addterm') {
	            _.extend(intentionParams, convertAddTermDrilldownToIntentions(clickInfo));
	        } else {
	            _.extend(intentionParams, convertCellDrilldownToIntentions(clickInfo));
	        }

	        console.info('Applying drilldown intention', intentionParams);
	        var dfd = $.Deferred();
	        intentionsParser.fetch({
	            data: _.extend({
	                q: search,
	                fieldMetaData: JSON.stringify(metadata),
	                app: applicationModel.get('app'),
	                owner: applicationModel.get('owner'),
	                parse_only: true
	            }, intentionParams)
	        }).done(function() {
	            dfd.resolve({
	                'q': splunkUtil.stripLeadingSearchCommand(intentionsParser.get('fullSearch')),
	                'earliest': intentionsParser.get('dispatch.earliest_time') || query.earliest || 0,
	                'latest': intentionsParser.get('dispatch.latest_time') || query.latest || ''
	            }, newTab);
	        }).fail(function() {
	            dfd.reject.apply(dfd, arguments);
	        });

	        return dfd.promise();
	    };

	    /*
	     * Returns whether or not the drilldown should be in a new tab.
	     *
	     * @param clickInfo {Object} (see applyDrilldownIntention above)
	     * @param options {Object} (see applyDrilldownIntention above)
	     */
	    Drilldown.shouldDrilldownInNewTab = function(clickInfo, options) {
	        options = options || {};
	        var modifierKey = clickInfo.hasOwnProperty('modifierKey') ? clickInfo.modifierKey : computeModifierKey(clickInfo);
	        return options.hasOwnProperty('drilldownNewTab') ? options.drilldownNewTab : modifierKey;
	    };

	    // we want those functions to be testable
	    Drilldown._convertRowDrilldownToIntentions = convertRowDrilldownToIntentions;
	    Drilldown._convertCellDrilldownToIntentions = convertCellDrilldownToIntentions;
	    Drilldown._convertColumnDrilldownToIntentions = convertColumnDrilldownToIntentions;
	    Drilldown._convertAddTermDrilldownToIntentions = convertAddTermDrilldownToIntentions;
	    Drilldown._convertGeovizDrilldownToIntentions = convertGeovizDrilldownToIntentions;

	    return Drilldown;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),

/***/ "models/services/search/IntentionsParser":
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * @author sfishel
	 *
	 * Model representation of the intentions parser endpoint.
	 *
	 * The endpoint is still in flux, so there is a little hackery here to try to expose the interface we will eventually have
	 * from splunkd but don't have yet.
	 *
	 * Sample REST response:

	   {
	        "remoteSearch": "litsearch * | eval  myfield = 10  | search somefield = somevalue  | addinfo  type=count label=prereport_events | fields  keepcolorder=t \"_bkt\" \"_cd\" \"_si\" \"host\" \"index\" \"linecount\" \"prestats_reserved_*\" \"psrsvd_*\" \"source\" \"sourcetype\" \"splunk_server\"  | remotetl  nb=300 et=2147483647.000000 lt=0.000000 max_count=1000 max_prefetch=100 | prestats  count",
	        "remoteTimeOrdered": true,
	        "eventsSearch": "search *   | eval myfield = 10  | search somefield = somevalue ",
	        "eventsTimeOrdered": true,
	        "eventsStreaming": true,
	        "reportsSearch": "stats  count",
	        "canSummarize": false,
	        "commands": [
	            {
	                "command": "search",
	                "rawargs": "*  ",
	                "pipeline": "streaming",
	                "args": {
	                    "search": [
	                        "*"
	                    ]
	                },
	                "isGenerating": true,
	                "streamType": "SP_STREAM"
	            },
	            {
	                "command": "eval",
	                "rawargs": "myfield = 10 ",
	                "pipeline": "streaming",
	                "args": " myfield = 10 ",
	                "isGenerating": false,
	                "streamType": "SP_STREAM"
	            },
	            {
	                "command": "search",
	                "rawargs": "somefield = somevalue ",
	                "pipeline": "streaming",
	                "args": {
	                    "search": [
	                        "somefield = somevalue "
	                    ]
	                },
	                "isGenerating": false,
	                "streamType": "SP_STREAM"
	            },
	            {
	                "command": "stats",
	                "rawargs": "count",
	                "pipeline": "report",
	                "args": {
	                    "stat-specifiers": [
	                        {
	                            "function": "count",
	                            "rename": "count"
	                        }
	                    ]
	                },
	                "isGenerating": false,
	                "streamType": "SP_STREAMREPORT",
	                "isStreamingOpRequired": false,
	                "preStreamingOp": "prestats count"
	            }
	        ]
	    }
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [
	            __webpack_require__("shim/jquery"),
	            __webpack_require__("require/underscore"),
	            __webpack_require__("require/backbone"),
	            __webpack_require__("models/Base"),
	            __webpack_require__("util/splunkd_utils"),
	            __webpack_require__("shim/splunk.util")
	        ], __WEBPACK_AMD_DEFINE_RESULT__ = function(
	            $,
	            _,
	            Backbone,
	            Base,
	            splunkDUtils,
	            splunkUtils
	        ) {

	    var DELIMITER = ':!:';

	    return Base.extend({

	        url: 'search/intentionsparser',

	        sync: function(method, model, options) {
	            if(method !== 'read') {
	                throw new Error('Sync operation not supported: ' + method);
	            }

	            options = $.extend(true, {}, options);
	            // these URLs can be quite long, so we make this request by POST
	            options.type = 'POST';
	            var data = options.data;
	            if(_.isArray(data.field)) {
	                data.field = data.field.join(DELIMITER);
	                data.value = data.value.join(DELIMITER);
	            }

	            // TEMPORARY: currently a different endpoint has to be used if you just want to parse the search with no action
	            // eventually they will be unified in the same endpoint so we just switch the URL here for the time being
	            var url = (options.data && options.data.action) ? model.url : 'search/parser',
	                syncOptions = splunkDUtils.prepareSyncOptions(options, url);

	            if(syncOptions.data && syncOptions.data.q) {
	                syncOptions.data.q = splunkUtils.addLeadingSearchCommand(syncOptions.data.q, true);
	            }

	            return Base.prototype.sync.call(this, 'read', model, syncOptions);
	        },
	        
	        fullSearch: function() {
	            var fullSearch = this.get('fullSearch');
	            
	            if(fullSearch) {
	                return splunkUtils.stripLeadingSearchCommand(fullSearch);
	            }
	            var reportsSearch = this.get('reportsSearch') || '',
	                eventsSearch = splunkUtils.stripLeadingSearchCommand(this.get('eventsSearch') || '');
	            if (reportsSearch) {
	                reportsSearch = ' | ' + reportsSearch;
	            }
	            return eventsSearch + reportsSearch;
	        },

	        isReportsSearch: function() {
	            var reportsSearch = this.get('reportsSearch');
	            return reportsSearch ? true : false;
	        }

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

/***/ 35:
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*** IMPORTS FROM imports-loader ***/
	(function() {

	/*!
	 * numeral.js
	 * version : 1.5.3
	 * author : Adam Draper
	 * license : MIT
	 * http://adamwdraper.github.com/Numeral-js/
	 */

	(function () {

	    /************************************
	        Constants
	    ************************************/

	    var numeral,
	        VERSION = '1.5.3',
	        // internal storage for language config files
	        languages = {},
	        currentLanguage = 'en',
	        zeroFormat = null,
	        defaultFormat = '0,0',
	        // check for nodeJS
	        hasModule = (typeof module !== 'undefined' && module.exports);


	    /************************************
	        Constructors
	    ************************************/


	    // Numeral prototype object
	    function Numeral (number) {
	        this._value = number;
	    }

	    /**
	     * Implementation of toFixed() that treats floats more like decimals
	     *
	     * Fixes binary rounding issues (eg. (0.615).toFixed(2) === '0.61') that present
	     * problems for accounting- and finance-related software.
	     */
	    function toFixed (value, precision, roundingFunction, optionals) {
	        var power = Math.pow(10, precision),
	            optionalsRegExp,
	            output;
	            
	        //roundingFunction = (roundingFunction !== undefined ? roundingFunction : Math.round);
	        // Multiply up by precision, round accurately, then divide and use native toFixed():
	        output = (roundingFunction(value * power) / power).toFixed(precision);

	        if (optionals) {
	            optionalsRegExp = new RegExp('0{1,' + optionals + '}$');
	            output = output.replace(optionalsRegExp, '');
	        }

	        return output;
	    }

	    /************************************
	        Formatting
	    ************************************/

	    // determine what type of formatting we need to do
	    function formatNumeral (n, format, roundingFunction) {
	        var output;

	        // figure out what kind of format we are dealing with
	        if (format.indexOf('$') > -1) { // currency!!!!!
	            output = formatCurrency(n, format, roundingFunction);
	        } else if (format.indexOf('%') > -1) { // percentage
	            output = formatPercentage(n, format, roundingFunction);
	        } else if (format.indexOf(':') > -1) { // time
	            output = formatTime(n, format);
	        } else { // plain ol' numbers or bytes
	            output = formatNumber(n._value, format, roundingFunction);
	        }

	        // return string
	        return output;
	    }

	    // revert to number
	    function unformatNumeral (n, string) {
	        var stringOriginal = string,
	            thousandRegExp,
	            millionRegExp,
	            billionRegExp,
	            trillionRegExp,
	            suffixes = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
	            bytesMultiplier = false,
	            power;

	        if (string.indexOf(':') > -1) {
	            n._value = unformatTime(string);
	        } else {
	            if (string === zeroFormat) {
	                n._value = 0;
	            } else {
	                if (languages[currentLanguage].delimiters.decimal !== '.') {
	                    string = string.replace(/\./g,'').replace(languages[currentLanguage].delimiters.decimal, '.');
	                }

	                // see if abbreviations are there so that we can multiply to the correct number
	                thousandRegExp = new RegExp('[^a-zA-Z]' + languages[currentLanguage].abbreviations.thousand + '(?:\\)|(\\' + languages[currentLanguage].currency.symbol + ')?(?:\\))?)?$');
	                millionRegExp = new RegExp('[^a-zA-Z]' + languages[currentLanguage].abbreviations.million + '(?:\\)|(\\' + languages[currentLanguage].currency.symbol + ')?(?:\\))?)?$');
	                billionRegExp = new RegExp('[^a-zA-Z]' + languages[currentLanguage].abbreviations.billion + '(?:\\)|(\\' + languages[currentLanguage].currency.symbol + ')?(?:\\))?)?$');
	                trillionRegExp = new RegExp('[^a-zA-Z]' + languages[currentLanguage].abbreviations.trillion + '(?:\\)|(\\' + languages[currentLanguage].currency.symbol + ')?(?:\\))?)?$');

	                // see if bytes are there so that we can multiply to the correct number
	                for (power = 0; power <= suffixes.length; power++) {
	                    bytesMultiplier = (string.indexOf(suffixes[power]) > -1) ? Math.pow(1024, power + 1) : false;

	                    if (bytesMultiplier) {
	                        break;
	                    }
	                }

	                // do some math to create our number
	                n._value = ((bytesMultiplier) ? bytesMultiplier : 1) * ((stringOriginal.match(thousandRegExp)) ? Math.pow(10, 3) : 1) * ((stringOriginal.match(millionRegExp)) ? Math.pow(10, 6) : 1) * ((stringOriginal.match(billionRegExp)) ? Math.pow(10, 9) : 1) * ((stringOriginal.match(trillionRegExp)) ? Math.pow(10, 12) : 1) * ((string.indexOf('%') > -1) ? 0.01 : 1) * (((string.split('-').length + Math.min(string.split('(').length-1, string.split(')').length-1)) % 2)? 1: -1) * Number(string.replace(/[^0-9\.]+/g, ''));

	                // round if we are talking about bytes
	                n._value = (bytesMultiplier) ? Math.ceil(n._value) : n._value;
	            }
	        }
	        return n._value;
	    }

	    function formatCurrency (n, format, roundingFunction) {
	        var symbolIndex = format.indexOf('$'),
	            openParenIndex = format.indexOf('('),
	            minusSignIndex = format.indexOf('-'),
	            space = '',
	            spliceIndex,
	            output;

	        // check for space before or after currency
	        if (format.indexOf(' $') > -1) {
	            space = ' ';
	            format = format.replace(' $', '');
	        } else if (format.indexOf('$ ') > -1) {
	            space = ' ';
	            format = format.replace('$ ', '');
	        } else {
	            format = format.replace('$', '');
	        }

	        // format the number
	        output = formatNumber(n._value, format, roundingFunction);

	        // position the symbol
	        if (symbolIndex <= 1) {
	            if (output.indexOf('(') > -1 || output.indexOf('-') > -1) {
	                output = output.split('');
	                spliceIndex = 1;
	                if (symbolIndex < openParenIndex || symbolIndex < minusSignIndex){
	                    // the symbol appears before the "(" or "-"
	                    spliceIndex = 0;
	                }
	                output.splice(spliceIndex, 0, languages[currentLanguage].currency.symbol + space);
	                output = output.join('');
	            } else {
	                output = languages[currentLanguage].currency.symbol + space + output;
	            }
	        } else {
	            if (output.indexOf(')') > -1) {
	                output = output.split('');
	                output.splice(-1, 0, space + languages[currentLanguage].currency.symbol);
	                output = output.join('');
	            } else {
	                output = output + space + languages[currentLanguage].currency.symbol;
	            }
	        }

	        return output;
	    }

	    function formatPercentage (n, format, roundingFunction) {
	        var space = '',
	            output,
	            value = n._value * 100;

	        // check for space before %
	        if (format.indexOf(' %') > -1) {
	            space = ' ';
	            format = format.replace(' %', '');
	        } else {
	            format = format.replace('%', '');
	        }

	        output = formatNumber(value, format, roundingFunction);
	        
	        if (output.indexOf(')') > -1 ) {
	            output = output.split('');
	            output.splice(-1, 0, space + '%');
	            output = output.join('');
	        } else {
	            output = output + space + '%';
	        }

	        return output;
	    }

	    function formatTime (n) {
	        var hours = Math.floor(n._value/60/60),
	            minutes = Math.floor((n._value - (hours * 60 * 60))/60),
	            seconds = Math.round(n._value - (hours * 60 * 60) - (minutes * 60));
	        return hours + ':' + ((minutes < 10) ? '0' + minutes : minutes) + ':' + ((seconds < 10) ? '0' + seconds : seconds);
	    }

	    function unformatTime (string) {
	        var timeArray = string.split(':'),
	            seconds = 0;
	        // turn hours and minutes into seconds and add them all up
	        if (timeArray.length === 3) {
	            // hours
	            seconds = seconds + (Number(timeArray[0]) * 60 * 60);
	            // minutes
	            seconds = seconds + (Number(timeArray[1]) * 60);
	            // seconds
	            seconds = seconds + Number(timeArray[2]);
	        } else if (timeArray.length === 2) {
	            // minutes
	            seconds = seconds + (Number(timeArray[0]) * 60);
	            // seconds
	            seconds = seconds + Number(timeArray[1]);
	        }
	        return Number(seconds);
	    }

	    function formatNumber (value, format, roundingFunction) {
	        var negP = false,
	            signed = false,
	            optDec = false,
	            abbr = '',
	            abbrK = false, // force abbreviation to thousands
	            abbrM = false, // force abbreviation to millions
	            abbrB = false, // force abbreviation to billions
	            abbrT = false, // force abbreviation to trillions
	            abbrForce = false, // force abbreviation
	            bytes = '',
	            ord = '',
	            abs = Math.abs(value),
	            suffixes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
	            min,
	            max,
	            power,
	            w,
	            precision,
	            thousands,
	            d = '',
	            neg = false;

	        // check if number is zero and a custom zero format has been set
	        if (value === 0 && zeroFormat !== null) {
	            return zeroFormat;
	        } else {
	            // see if we should use parentheses for negative number or if we should prefix with a sign
	            // if both are present we default to parentheses
	            if (format.indexOf('(') > -1) {
	                negP = true;
	                format = format.slice(1, -1);
	            } else if (format.indexOf('+') > -1) {
	                signed = true;
	                format = format.replace(/\+/g, '');
	            }

	            // see if abbreviation is wanted
	            if (format.indexOf('a') > -1) {
	                // check if abbreviation is specified
	                abbrK = format.indexOf('aK') >= 0;
	                abbrM = format.indexOf('aM') >= 0;
	                abbrB = format.indexOf('aB') >= 0;
	                abbrT = format.indexOf('aT') >= 0;
	                abbrForce = abbrK || abbrM || abbrB || abbrT;

	                // check for space before abbreviation
	                if (format.indexOf(' a') > -1) {
	                    abbr = ' ';
	                    format = format.replace(' a', '');
	                } else {
	                    format = format.replace('a', '');
	                }

	                if (abs >= Math.pow(10, 12) && !abbrForce || abbrT) {
	                    // trillion
	                    abbr = abbr + languages[currentLanguage].abbreviations.trillion;
	                    value = value / Math.pow(10, 12);
	                } else if (abs < Math.pow(10, 12) && abs >= Math.pow(10, 9) && !abbrForce || abbrB) {
	                    // billion
	                    abbr = abbr + languages[currentLanguage].abbreviations.billion;
	                    value = value / Math.pow(10, 9);
	                } else if (abs < Math.pow(10, 9) && abs >= Math.pow(10, 6) && !abbrForce || abbrM) {
	                    // million
	                    abbr = abbr + languages[currentLanguage].abbreviations.million;
	                    value = value / Math.pow(10, 6);
	                } else if (abs < Math.pow(10, 6) && abs >= Math.pow(10, 3) && !abbrForce || abbrK) {
	                    // thousand
	                    abbr = abbr + languages[currentLanguage].abbreviations.thousand;
	                    value = value / Math.pow(10, 3);
	                }
	            }

	            // see if we are formatting bytes
	            if (format.indexOf('b') > -1) {
	                // check for space before
	                if (format.indexOf(' b') > -1) {
	                    bytes = ' ';
	                    format = format.replace(' b', '');
	                } else {
	                    format = format.replace('b', '');
	                }

	                for (power = 0; power <= suffixes.length; power++) {
	                    min = Math.pow(1024, power);
	                    max = Math.pow(1024, power+1);

	                    if (value >= min && value < max) {
	                        bytes = bytes + suffixes[power];
	                        if (min > 0) {
	                            value = value / min;
	                        }
	                        break;
	                    }
	                }
	            }

	            // see if ordinal is wanted
	            if (format.indexOf('o') > -1) {
	                // check for space before
	                if (format.indexOf(' o') > -1) {
	                    ord = ' ';
	                    format = format.replace(' o', '');
	                } else {
	                    format = format.replace('o', '');
	                }

	                ord = ord + languages[currentLanguage].ordinal(value);
	            }

	            if (format.indexOf('[.]') > -1) {
	                optDec = true;
	                format = format.replace('[.]', '.');
	            }

	            w = value.toString().split('.')[0];
	            precision = format.split('.')[1];
	            thousands = format.indexOf(',');

	            if (precision) {
	                if (precision.indexOf('[') > -1) {
	                    precision = precision.replace(']', '');
	                    precision = precision.split('[');
	                    d = toFixed(value, (precision[0].length + precision[1].length), roundingFunction, precision[1].length);
	                } else {
	                    d = toFixed(value, precision.length, roundingFunction);
	                }

	                w = d.split('.')[0];

	                if (d.split('.')[1].length) {
	                    d = languages[currentLanguage].delimiters.decimal + d.split('.')[1];
	                } else {
	                    d = '';
	                }

	                if (optDec && Number(d.slice(1)) === 0) {
	                    d = '';
	                }
	            } else {
	                w = toFixed(value, null, roundingFunction);
	            }

	            // format number
	            if (w.indexOf('-') > -1) {
	                w = w.slice(1);
	                neg = true;
	            }

	            if (thousands > -1) {
	                w = w.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + languages[currentLanguage].delimiters.thousands);
	            }

	            if (format.indexOf('.') === 0) {
	                w = '';
	            }

	            return ((negP && neg) ? '(' : '') + ((!negP && neg) ? '-' : '') + ((!neg && signed) ? '+' : '') + w + d + ((ord) ? ord : '') + ((abbr) ? abbr : '') + ((bytes) ? bytes : '') + ((negP && neg) ? ')' : '');
	        }
	    }

	    /************************************
	        Top Level Functions
	    ************************************/

	    numeral = function (input) {
	        if (numeral.isNumeral(input)) {
	            input = input.value();
	        } else if (input === 0 || typeof input === 'undefined') {
	            input = 0;
	        } else if (!Number(input)) {
	            input = numeral.fn.unformat(input);
	        }

	        return new Numeral(Number(input));
	    };

	    // version number
	    numeral.version = VERSION;

	    // compare numeral object
	    numeral.isNumeral = function (obj) {
	        return obj instanceof Numeral;
	    };

	    // This function will load languages and then set the global language.  If
	    // no arguments are passed in, it will simply return the current global
	    // language key.
	    numeral.language = function (key, values) {
	        if (!key) {
	            return currentLanguage;
	        }

	        if (key && !values) {
	            if(!languages[key]) {
	                throw new Error('Unknown language : ' + key);
	            }
	            currentLanguage = key;
	        }

	        if (values || !languages[key]) {
	            loadLanguage(key, values);
	        }

	        return numeral;
	    };
	    
	    // This function provides access to the loaded language data.  If
	    // no arguments are passed in, it will simply return the current
	    // global language object.
	    numeral.languageData = function (key) {
	        if (!key) {
	            return languages[currentLanguage];
	        }
	        
	        if (!languages[key]) {
	            throw new Error('Unknown language : ' + key);
	        }
	        
	        return languages[key];
	    };

	    numeral.language('en', {
	        delimiters: {
	            thousands: ',',
	            decimal: '.'
	        },
	        abbreviations: {
	            thousand: 'k',
	            million: 'm',
	            billion: 'b',
	            trillion: 't'
	        },
	        ordinal: function (number) {
	            var b = number % 10;
	            return (~~ (number % 100 / 10) === 1) ? 'th' :
	                (b === 1) ? 'st' :
	                (b === 2) ? 'nd' :
	                (b === 3) ? 'rd' : 'th';
	        },
	        currency: {
	            symbol: '$'
	        }
	    });

	    numeral.zeroFormat = function (format) {
	        zeroFormat = typeof(format) === 'string' ? format : null;
	    };

	    numeral.defaultFormat = function (format) {
	        defaultFormat = typeof(format) === 'string' ? format : '0.0';
	    };

	    /************************************
	        Helpers
	    ************************************/

	    function loadLanguage(key, values) {
	        languages[key] = values;
	    }

	    /************************************
	        Floating-point helpers
	    ************************************/

	    // The floating-point helper functions and implementation
	    // borrows heavily from sinful.js: http://guipn.github.io/sinful.js/

	    /**
	     * Array.prototype.reduce for browsers that don't support it
	     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce#Compatibility
	     */
	    if ('function' !== typeof Array.prototype.reduce) {
	        Array.prototype.reduce = function (callback, opt_initialValue) {
	            'use strict';
	            
	            if (null === this || 'undefined' === typeof this) {
	                // At the moment all modern browsers, that support strict mode, have
	                // native implementation of Array.prototype.reduce. For instance, IE8
	                // does not support strict mode, so this check is actually useless.
	                throw new TypeError('Array.prototype.reduce called on null or undefined');
	            }
	            
	            if ('function' !== typeof callback) {
	                throw new TypeError(callback + ' is not a function');
	            }

	            var index,
	                value,
	                length = this.length >>> 0,
	                isValueSet = false;

	            if (1 < arguments.length) {
	                value = opt_initialValue;
	                isValueSet = true;
	            }

	            for (index = 0; length > index; ++index) {
	                if (this.hasOwnProperty(index)) {
	                    if (isValueSet) {
	                        value = callback(value, this[index], index, this);
	                    } else {
	                        value = this[index];
	                        isValueSet = true;
	                    }
	                }
	            }

	            if (!isValueSet) {
	                throw new TypeError('Reduce of empty array with no initial value');
	            }

	            return value;
	        };
	    }

	    
	    /**
	     * Computes the multiplier necessary to make x >= 1,
	     * effectively eliminating miscalculations caused by
	     * finite precision.
	     */
	    function multiplier(x) {
	        var parts = x.toString().split('.');
	        if (parts.length < 2) {
	            return 1;
	        }
	        return Math.pow(10, parts[1].length);
	    }

	    /**
	     * Given a variable number of arguments, returns the maximum
	     * multiplier that must be used to normalize an operation involving
	     * all of them.
	     */
	    function correctionFactor() {
	        var args = Array.prototype.slice.call(arguments);
	        return args.reduce(function (prev, next) {
	            var mp = multiplier(prev),
	                mn = multiplier(next);
	        return mp > mn ? mp : mn;
	        }, -Infinity);
	    }        


	    /************************************
	        Numeral Prototype
	    ************************************/


	    numeral.fn = Numeral.prototype = {

	        clone : function () {
	            return numeral(this);
	        },

	        format : function (inputString, roundingFunction) {
	            return formatNumeral(this, 
	                  inputString ? inputString : defaultFormat, 
	                  (roundingFunction !== undefined) ? roundingFunction : Math.round
	              );
	        },

	        unformat : function (inputString) {
	            if (Object.prototype.toString.call(inputString) === '[object Number]') { 
	                return inputString; 
	            }
	            return unformatNumeral(this, inputString ? inputString : defaultFormat);
	        },

	        value : function () {
	            return this._value;
	        },

	        valueOf : function () {
	            return this._value;
	        },

	        set : function (value) {
	            this._value = Number(value);
	            return this;
	        },

	        add : function (value) {
	            var corrFactor = correctionFactor.call(null, this._value, value);
	            function cback(accum, curr, currI, O) {
	                return accum + corrFactor * curr;
	            }
	            this._value = [this._value, value].reduce(cback, 0) / corrFactor;
	            return this;
	        },

	        subtract : function (value) {
	            var corrFactor = correctionFactor.call(null, this._value, value);
	            function cback(accum, curr, currI, O) {
	                return accum - corrFactor * curr;
	            }
	            this._value = [value].reduce(cback, this._value * corrFactor) / corrFactor;            
	            return this;
	        },

	        multiply : function (value) {
	            function cback(accum, curr, currI, O) {
	                var corrFactor = correctionFactor(accum, curr);
	                return (accum * corrFactor) * (curr * corrFactor) /
	                    (corrFactor * corrFactor);
	            }
	            this._value = [this._value, value].reduce(cback, 1);
	            return this;
	        },

	        divide : function (value) {
	            function cback(accum, curr, currI, O) {
	                var corrFactor = correctionFactor(accum, curr);
	                return (accum * corrFactor) / (curr * corrFactor);
	            }
	            this._value = [this._value, value].reduce(cback);            
	            return this;
	        },

	        difference : function (value) {
	            return Math.abs(numeral(this._value).subtract(value).value());
	        }

	    };

	    /************************************
	        Exposing Numeral
	    ************************************/

	    // CommonJS module is defined
	    if (hasModule) {
	        module.exports = numeral;
	    }

	    /*global ender:false */
	    if (typeof ender === 'undefined') {
	        // here, `this` means `window` in the browser, or `global` on the server
	        // add `numeral` as a global object via a string identifier,
	        // for Closure Compiler 'advanced' mode
	        this['numeral'] = numeral;
	    }

	    /*global define:false */
	    if (true) {
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function () {
	            return numeral;
	        }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    }
	}).call(this);
	}.call(window));

/***/ })

});