define([
    'jquery',
    'underscore',
    'moment',
    'app/views/insights/RI_planner/RIPlannerConfig'
], function ($, _, moment, Config) {
    'use strict';

    let RIPlannerHelper = {

        /**
         * Generate SPL that fetches the instance hours overtime
         *
         * @return {String} the SPL
         */
        generateIHSPL: function (params) {
            let {aws_account_id, region, instance_type, platform, tenancy, base, normalFactor, dedupSpl} = params;
            let templateSPL = Config.RI, locationSPL = region + '*', typeSPL = instance_type, referSPL = '';
            if (this.checkSizeFlexibility(platform, tenancy)) {
                templateSPL = Config.SIZE_FLEXIBILITY_RI;
                let [family, size] = instance_type.split('.');
                typeSPL = family + '*';
                referSPL = normalFactor;
            }
            let splParams = {
                dedupSpl,
                region,
                platform,
                tenancy,
                accountId: aws_account_id,
                location: locationSPL,
                type: typeSPL,
                refer: referSPL
            };
            let spl = _.template(templateSPL, $.extend({
                slice: 'h',
                name: 'current_ih'
            }, splParams));

            if (base === 'prediction') {
                let isLeapYear = moment().add(1, 'y').isLeapYear();
                let days = Config.ONE_YEAR_DAY + (isLeapYear ? 1 : 0);

                spl += _.template(Config.PREDICT_RI, {
                    oneYearHour: days * Config.ONE_DAY_HOUR,
                    oneYearDay: days,
                    instanceHourSPL: _.template(templateSPL, $.extend({
                        slice: 'd',
                        name: 'current_d'
                    }, splParams))
                });
            }
            return spl;
        },

        generateRecommSPL: function (params) {
            let {base, payment, instance_type, region, platform, tenancy} = params;
            return `| rirecommendation ${base} ${region} ${instance_type} ${payment} "${platform}" "${tenancy}"`;
        },

        generateRISPL: function (params) {
            return RIPlannerHelper.generateIHSPL(params) + RIPlannerHelper.generateRecommSPL(params);
        },

        /**
         * Caculate the number of suggested RI based on usage.
         *
         * @param  {Array} data: instance hours
         * @param  {Number} reservedHourly: reserved instance price per hour
         * @param  {Number} onDemandHourly: on demand instance price per hour
         * @return {Number} number of suggested RI
         */
        calRI: function (data, reservedHourly, onDemandHourly) {
            if (onDemandHourly === 0) {
                return 0;
            }

            let dataCopySorted = data
                .slice()
                .sort((e1, e2) => e1 - e2);

            let k = parseInt(reservedHourly / onDemandHourly * data.length);
            let index = Math.min(Math.max(data.length - k - 1, 0), data.length - 1);
            return parseInt(Math.round(dataCopySorted[index]));
        },

        /**
         * Calculate the total cost of purchasing such number of RIs.
         *
         * @param  {Array} data instance hours
         * @param  {Number} reservedHourly: reserved instance price per hour
         * @param  {Number} onDemandHourly: on demand instance price per hour
         * @param  {Number} ri number of suggested RI
         */
        calRICost: function (data, ri, reservedHourly, onDemandHourly) {
            let parsedData = data.map(ih => parseFloat(ih));

            let totalHours = parsedData.reduce((acc, ih) => acc + ih, 0);
            let totalUnCoveredHours = parsedData.reduce((acc, ih) => {
                let unCoveredHours = ih - ri;
                return acc + (unCoveredHours > 0 ? unCoveredHours : 0);
            }, 0);

            let onDemandCost = totalHours * onDemandHourly,
                riCost = totalUnCoveredHours * onDemandHourly + ri * reservedHourly * data.length;
            if (data.length < Config.ONE_YEAR_DAY * Config.ONE_DAY_HOUR) {
                onDemandCost = parseInt(Math.round(onDemandCost / data.length * Config.ONE_YEAR_DAY * Config.ONE_DAY_HOUR));
                riCost = parseInt(Math.round(riCost / data.length * Config.ONE_YEAR_DAY * Config.ONE_DAY_HOUR));
                totalUnCoveredHours = parseInt(Math.round(totalUnCoveredHours / data.length * Config.ONE_YEAR_DAY * Config.ONE_DAY_HOUR));
            }

            return {
                onDemandCost,
                riCost,
                totalUnCoveredHours
            };
        },

        timeToIndex: function (time) {
            return Math.floor((time - RIPlannerHelper.start.getTime()) / Config.ONE_DAY_MIS);
        },

        addPlotLine: function (xAxis, id, text, value, color, moreLabelOption) {
            let plotLineParams = {
                color: color,
                dashStyle: 'shortdot',
                value: value,
                width: 2,
                id: id,
                label: {
                    rotation: 0,
                    text: text
                }
            };
            $.extend(plotLineParams.label, moreLabelOption);
            xAxis.addPlotLine(plotLineParams);
        },

        timeToXText: function (time) {
            return moment(time).format('MMM DD,YYYY');
        },

        buildCacheId: function (base, payment, params) {
            let fields = [params.aws_account_id, params.region, params.platform, params.tenancy, params.instance_type, base, payment, params.regionLabel, params.platformLabel, params.tenancyLabel];
            return fields.join('_');
        },

        _hoursWeightCmp: function (a, b) {
            // descending sort
            // first compare diff
            if (a.diff !== b.diff) {
                return a.diff > b.diff ? -1 : 1;
            } else {
                // then compare value
                if (a.value === b.value) {
                    return 0;
                }
                let returnCoeff = 1, bigger = 0, smaller = 0;
                if (a.value > b.value) {
                    returnCoeff = -1;
                    bigger = a.value;
                    smaller = b.value;
                } else {
                    bigger = b.value;
                    smaller = a.value;
                }
                let pro = smaller / bigger;
                let addSPro = Math.floor(smaller + 1) / (bigger < 1 ? 1.0 : Math.floor(bigger));
                let addBPro = Math.floor(smaller) / Math.floor(bigger + 1);
                let addSDiff = Math.abs(addSPro - pro);
                let addBDiff = Math.abs(addBPro - pro);
                if (addSDiff === addBDiff) {
                    return 0;
                }
                return addSDiff < addBDiff ? returnCoeff * -1 : returnCoeff * 1;
            }
        },

        distributeDayAccordingHour: function (dayData, hourData) {
            if (dayData.length === 0 || hourData.length === 0 || dayData.length !== hourData.length / Config.ONE_DAY_HOUR) {
                return [];
            }
            let results = Array.apply(null, Array(dayData.length * Config.ONE_DAY_HOUR)).map(Number.prototype.valueOf, 0);
            for (let i = 0; i < dayData.length; i++) {
                let hoursSum = Math.round(dayData[i]);
                if (hoursSum === 0) {
                    continue; // no need to distribute for 0
                }
                let remainedHours = hoursSum,
                    hoursWeight = [],
                    hoursDistribution = hourData.slice(i * Config.ONE_DAY_HOUR, (i + 1) * Config.ONE_DAY_HOUR),
                    distributionSum = hoursDistribution.reduce((a, b) => {
                        return a + b;
                    }, 0);
                hoursDistribution = hoursDistribution.map(d => {
                    return distributionSum === 0 ? 1.0 / Config.ONE_DAY_HOUR : d / distributionSum;
                });
                for (let j = 0; j < Config.ONE_DAY_HOUR; j++) {
                    results[i * Config.ONE_DAY_HOUR + j] = Math.floor(hoursDistribution[j] * hoursSum);
                    let diffValue = hoursDistribution[j] * hoursSum - Math.floor(hoursDistribution[j] * hoursSum);
                    remainedHours -= results[i * Config.ONE_DAY_HOUR + j];
                    hoursWeight.push({index: j, diff: diffValue, value: results[i * Config.ONE_DAY_HOUR + j]});
                }
                if (remainedHours > 0) {
                    // still some hours not be distributed
                    hoursWeight.sort(this._hoursWeightCmp);
                    while (remainedHours > 0 && hoursWeight.length > 0) {
                        // bigger weight will get additional hour earlier than smaller weight
                        results[i * Config.ONE_DAY_HOUR + hoursWeight.shift().index] += 1;
                        remainedHours -= 1;
                    }
                }
            }
            return results;
        },

        /**
         * Initialize hierarchical map with giving keys and value.
         * If map has giving keys, add value to dict's existing value.
         *
         * @param  {Map} map
         * @param  {Array} keys
         * @param  {Number} value
         */
        accumulateToMap: function (map, keys, value) {
            value = parseFloat(value);
            if (_.isNaN(value)) {
                value = 0;
            }
            let pre_map = map;
            for (let i = 0; i < keys.length; i++) {
                if (keys[i] in pre_map) {
                    if (i == keys.length - 1) {
                        pre_map[keys[i]] += value
                    }
                } else {
                    if (i == keys.length - 1) {
                        pre_map[keys[i]] = value;
                    } else {
                        pre_map[keys[i]] = {}
                    }
                }
                pre_map = pre_map[keys[i]]
            }
        },

        /**
         * Get value from hierarchical map with giving keys.
         * If map doesn't have giving keys, return 0.
         *
         * @param  {Map} map
         * @param  {Array} keys
         */
        getValueFromMap: function (map, keys) {
            let pre_map = map;
            for (let i = 0; i < keys.length; i++) {
                if (keys[i] in pre_map) {
                    pre_map = pre_map[keys[i]];
                } else {
                    return 0;
                }
            }
            return pre_map;
        },

        checkSizeFlexibility: function (platform, tenancy) {
            if (platform == 'Linux' && tenancy == 'On Demand') {
                return true;
            } else {
                return false;
            }

        }
    };
    return RIPlannerHelper;
});