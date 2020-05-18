define([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'api/SplunkVisualizationBase',
    'api/SplunkVisualizationUtils',
    'app/views/anomaly_detection/algorithm/ZScore',
    'app/views/anomaly_detection/Config'
], function (_, $, mvc, SplunkVisualizationBase, SplunkVisualizationUtils, ZScore, SystemConfig) {
    // Parse and format data in anomaly_detection_viz
    class DataHelper {
        constructor() {

        }

        isFieldValid(fields) {
            var fields = this._getFields(fields);
            var detectedFields = this._getDetectedFields(fields);
            var displayMode = false;
            var isDisplayFieldsValid = true;
            for (var i = 0; i < detectedFields.length; i++) {
                var field = detectedFields[i];
                if (displayMode && !(field.startsWith('outlier_') || field.startsWith('value_'))) {
                    isDisplayFieldsValid = false;
                    break;
                }
                if (field.startsWith('outlier_') || field.startsWith('value_')) {
                    displayMode = true;
                    if (field.startsWith('value_')) {
                        var outlierFieldName = 'outlier_' + field.slice(6);
                        if ((detectedFields.indexOf(outlierFieldName) < 0)) {
                            isDisplayFieldsValid = false;
                            break;
                        }
                    }
                }
            }

            if (!isDisplayFieldsValid) {
                throw new SplunkVisualizationBase.VisualizationError(
                    'For non-default detection algorithm, please convert fields name to "value_*", "outlier_*" where "value_*" indicates the value of field and "outlier_*" indicates whether it is outlier.'
                );
            }
            if (!displayMode && (fields.indexOf('_time') < 0 || fields.indexOf('_span') < 0)) {
                throw new SplunkVisualizationBase.VisualizationError(
                    'This visualization requires timestamped, evenly spaced numeric time-series data. Try using the timechart command in your query.'
                );
            }
            return true;
        }

        wrapDetectResults(fields, columns, config, namespace) {
            var results = {};
            var data = this._wrapPreparation(fields, columns, results);
            if (_.isEmpty(data.columns)) {
                // not numerical
                return results;
            }
            // read configs
            var strictness = config[namespace + 'strictness'];
            var type = config[namespace + 'type'];
            var stack = config[namespace + 'stack_mode'];
            var mask = config[namespace + 'mask'];
            // select algorithm
            var algorithm = ZScore.getInstance(strictness);
            // detect anomalies
            var series = [];
            var trainCount = mask === 'true'? algorithm.getTrainCount() : 0;
            for (var i = 0; i < data.fields.length; i++) {
                var curField = data.fields[i];
                var curData = data.columns[curField];
                if(_.isUndefined(curData)) {
                    continue;
                }
                series.push(this._wrapSeries(curData, algorithm.detect(curData), trainCount, curField, SystemConfig.NORMAL_COLORS[i % SystemConfig.NORMAL_COLORS.length], type, stack));
            }
            // wrap results
            results.series = series;
            results.start += trainCount * results.span;
            var trainTime = this._getTrainTime(algorithm, results.span);
            results.trainNum = trainTime.num;
            results.trainUnit = trainTime.unit;
            return results;
        }

        wrapDisplayResults(fields, columns, config, namespace) {
            var results = {};
            var data = this._wrapPreparation(fields, columns, results);
            if (_.isEmpty(data.columns)) {
                // not numerical
                return results;
            }
            var series = [];
            var type = config[namespace + 'type'];
            var stack = config[namespace + 'stack_mode'];
            var color = 0;
            for (var i = 0; i < data.fields.length; i++) {
                var curField = data.fields[i];
                if (curField.startsWith('outlier') || curField.startsWith('severity')) {
                    continue;
                }
                var curData = data.columns[curField];
                var outlier = data.columns['outlier_' + curField.slice(6)].reduce(function (a, e, i) {
                    if (e === 'True')
                        a.push(i);
                    return a;
                }, []);
                series.push(this._wrapSeries(curData, outlier, 0, curField.slice(6), SystemConfig.NORMAL_COLORS[color++ % SystemConfig.NORMAL_COLORS.length], type, stack));
            }
            // wrap results
            results.trainNum = '0';
            results.trainUnit = 'm';
            results.series = series;
            return results;
        }

        wrapHighlightResults(fields, columns, config, namespace, time, field) {
            var results = {};
            var data = this._wrapPreparation(fields, columns, results);
            if (_.isEmpty(data.columns)) {
                // not numerical
                return results;
            }
            var series = [];
            var type = config[namespace + 'type'];
            var stack = config[namespace + 'stack_mode'];
            for (var i = 0; i < data.fields.length; i++) {
                var curField = data.fields[i];
                if (curField.startsWith('outlier') || curField.startsWith('severity')) {
                    continue;
                }
                var curData = data.columns[curField];
                var outlier = [];
                if (curField === field || 'value_' + field === curField) {
                    outlier.push((time - results.start) / results.span);
                }
                series.push(this._wrapSeries(curData, outlier, 0, curField, SystemConfig.NORMAL_COLORS[i % SystemConfig.NORMAL_COLORS.length], type, stack));

            }
            // wrap results
            results.series = series;
            return results;
        }

        getMode(fields) {
            var fields = this._getFields(fields);
            var detectedFields = this._getDetectedFields(fields);
            if (detectedFields.length === 0 || detectedFields[0].startsWith('outlier_') || detectedFields[0].startsWith('value_')) {
                return SystemConfig.DISPLAY_MODE;
            } else {
                return SystemConfig.DETECT_MODE;
            }
        }

        _getTrainTime(algorithm, span) {
            var unit = 's';
            if (span % SystemConfig.MILLI_SEC_IN_DAY === 0) {
                unit = 'd';
                span /= SystemConfig.MILLI_SEC_IN_DAY;
            } else if (span % SystemConfig.MILLI_SEC_IN_HOUR === 0) {
                unit = 'h';
                span /= SystemConfig.MILLI_SEC_IN_HOUR;
            } else if (span % SystemConfig.MILLI_SEC_IN_MIN === 0) {
                unit = 'm';
                span /= SystemConfig.MILLI_SEC_IN_MIN;
            } else {
                span /= SystemConfig.MILLI_SEC_IN_SEC;
            }
            return {'num': span * algorithm.getTrainCount(), 'unit': unit};
        }

        _wrapSeries(data, outlier, trainCount, name, color, type, stack) {
            _.each(outlier, function (i) {
                data[i] = {
                    y: data[i],
                    color: SystemConfig.OUTLIER_COLOR,
                    marker: {enabled: true, symbol: 'circle', radius: 5}
                };
            });
            data = data.slice(trainCount);
            var returnResults = {'data': data, 'color': color, 'name': name, 'type': type};
            if (stack !== 'no') {
                returnResults['stacking'] = stack;
            }
            return returnResults;
        }

        _wrapPreparation(fields, columns, results) {
            var fields = this._getFields(fields);
            results.start = new Date(columns[fields.indexOf('_time')][0]).getTime();
            results.end = new Date(columns[fields.indexOf('_time')][columns[0].length - 1]).getTime();
            if (fields.indexOf('_span') >= 0) {
                results.span = parseInt(columns[fields.indexOf('_span')][0]) * SystemConfig.MILLI_SEC_IN_SEC;
            } else {
                results.span = new Date(columns[fields.indexOf('_time')][1]).getTime() - results.start;
            }
            var detectedFields = this._getDetectedFields(fields);
            // parse columns
            var detectedData = this._getData(columns, fields, detectedFields);
            return {
                fields: detectedFields,
                columns: detectedData
            }
        }

        _getFields(fields) {
            return _.map(fields, function (value) {
                var name = value.name;
                if (name.startsWith('values(') && name.endsWith(')')) {
                    name = name.slice(7, -1);
                }
                return name;
            });
        }

        _getDetectedFields(fields) {
            return _.filter(fields, function (value) {
                return value !== '_time' && value !== '_span' && value != '_spandays' && !value.startsWith('severity_')
            });
        }

        _getData(columns, fields, detectedFields) {
            var detectedData = {};
            _.each(detectedFields, function (curField) {
                var index = fields.indexOf(curField);
                var isValid = true;
                var pureBool = true;
                var curData = _.map(columns[index], function (value) {
                    if (value === 'True' || value === 'False') {
                        if (!pureBool) {
                            isValid = false;
                        }
                        return value;
                    }
                    pureBool = false;
                    var parseVal = parseInt(SplunkVisualizationUtils.escapeHtml(value));
                    if (_.isNaN(parseVal)) {
                        isValid = false;
                    }
                    return parseVal;
                });
                if (!isValid) {
                    return;
                }
                detectedData[curField] = curData;
            });
            return detectedData;
        }
    }

    return DataHelper;
});
