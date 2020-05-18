define([
    'underscore',
    'jquery',
    'app/views/anomaly_detection/algorithm/AlgorithmConfig'
], function (_, $, Config) {

    var ZScore = function (strictness) {
        this.strictness = strictness;
    };
    ZScore.prototype.getStrictness = function () {
        return this.strictness;
    };
    ZScore.prototype.getMethod = function () {
        return 'zscore';
    };
    ZScore.prototype.getTrainCount = function () {
        return Config.TRAIN_COUNT;
    };
    ZScore.prototype.detect = function (data) {
        var outlier = [];
        if (_.isEmpty(data)) {
            return outlier;
        }
        if (data.length < Config.TRAIN_COUNT) {
            return outlier;
        }
        var strictness = Config.STRICTNESS_MAP[this.strictness];
        for (var i = Config.TRAIN_COUNT; i < data.length; i++) {
            var trainArray = data.slice(i - Config.TRAIN_COUNT, i);
            var curVal = data[i];
            var sum = _.reduce(trainArray, function (a, b) {
                return a + b;
            }, 0);
            var mean = sum / Config.TRAIN_COUNT;
            var std = Math.pow(_.reduce(trainArray, function (a, b) {
                    return a + Math.pow(b - mean, 2)
                }, 0) / Config.TRAIN_COUNT, 0.5);
            trainArray.sort(function (a, b) {
                return a - b;
            });
            var medianVal = trainArray[parseInt(Config.TRAIN_COUNT / 2)];
            if (Config.TRAIN_COUNT % 2 == 0) {
                medianVal += trainArray[parseInt(Config.TRAIN_COUNT / 2 - 1)];
                medianVal /= 2.0;
            }
            if (curVal > medianVal + strictness * std) {
                outlier.push(i);
            }
        }
        return outlier;
    };
    // singleton
    var instances = {};
    return {
        getInstance: function (strictness) {
            if (_.isEmpty(instances[strictness])) {
                instances[strictness] = new ZScore(strictness);
            }
            return instances[strictness];
        }
    }
});
