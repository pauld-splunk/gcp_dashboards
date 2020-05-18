define([
    'jquery',
    'underscore',
    'backbone',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'app/utils/LookupUtil',
    'app/views/dashboard/TokenHelper',
    'splunkjs/mvc/searchmanager',
    'app/utils/SearchUtil',
    'splunkjs/mvc/tokenforwarder',
    'app/views/insights/SearchQueueManager',
    'app/views/insights/RI_planner/RIPlannerHelper',
    'app/views/insights/RI_planner/RIPlannerConfig',
    'app/views/insights/table/TableConfig',
    'app/utils/BillingUtil',
    'moment',
    'contrib/text!app/views/insights/templates/RI_planner/RIPlannerExistingRITemplate.html',
    'contrib/text!app/views/insights/templates/RI_planner/RIPlannerOptimalRITemplate.html'
], function ($, _, Backbone, mvc, utils, LookupUtil, TokenHelper, SearchManager, SearchUtil, TokenForwarder, SearchQueueManager, Helper, Config, TableConfig, BillingUtil, moment, RIPlannerExistingRITemplate, RIPlannerOptimalRITemplate) {
    'use strict';
    const DATE_FORMAT = 'YYYY-MM';

    class RIPlannerController {
        constructor(model) {
            this.model = model;
            this.cache = {};
            this.paramSearchResults = []; // paramSearchResults contains the combinations of the RI purchase options (account_id, region, platform, tenancy and instance type)
            this.boughtRIs = {}; // bought RI with key is aws_account_id, region, platform, tenancy, instance type and value is instance count
            this.billingReportEarliest = 0;
            this.billingReportLatest = 'now';
            this.billingReportDedupSPL = ''; // dedup billing report according to S3KeyLastModified
            this.normalFactor = {}; // key is size, value is normal factor
            this.flexibilityInfo = {}; // key is region, family and value is possible size list
            this.curClickTimestamp = null; // store current click's timestamp
            this.searchQueueManager = new SearchQueueManager({
                searchDoneCallback: this.searchDoneCallback.bind(this),
                searchErrorCallback: this.searchErrorCallback.bind(this)
            });
            this.tokens = mvc.Components.get('default');

            // generate account for billing
            LookupUtil.generateAccountName();

            let dfdList = [];
            // param search should return all combination of account_id, AZ, region, and instance_type
            dfdList.push(this._paramSearch());

            // bought RI search
            dfdList.push(this._boughtRISearch());

            // billing report dedup spl search
            dfdList.push(this._billingReportDedupSearch());

            // normal factor search
            dfdList.push(this._normalFactorSearch());

            // instance size flexibility search
            dfdList.push(this._flexibilityInfoSearch());

            $.when(...dfdList).then(()=> {
                this.model.set('canSubmit', true);
            });
            // tokens reset
            TokenHelper.resetTokenValue('accountId', 'form.region', '*');
            TokenHelper.resetTokenValue('region', 'form.platform', '*');
            TokenHelper.resetTokenValue('region', 'form.tenancy', '*');
            TokenHelper.resetTokenValue('region', 'form.instanceType', '*');
        }

        searchErrorCallback(search, value = null) {
            let searchIds = search.id.split('_');
            let searchTimestamp = parseInt(searchIds[searchIds.length - 2]);
            if (searchTimestamp === this.curClickTimestamp) {
                let cacheId = searchIds.slice(0, -2).join('_');
                this.cache[cacheId] = value;
                this._assembleRow(cacheId);
            }
        }

        searchDoneCallback(search) {
            let isError = false;
            let data = search.get('data');
            if ('messages' in data && data['messages'].length > 0 && 'type' in data['messages'][0] && data['messages'][0]['type'] === 'ERROR') { // custom command error
                isError = true;
            }
            if (isError || search.get('data').resultCount === 0) {
                this.searchErrorCallback(search);
            } else {
                let resultModel = search.data('results', {
                    output_mode: 'json'
                });
                resultModel.once('data', (() => {
                    this.searchErrorCallback(search, resultModel.data().results);
                }));
            }
        }

        _boughtRISearch() {
            let dfd = $.Deferred();
            SearchUtil.search(Config.BOUGHT_RI, {
                earliest_time: '-d',
                latest_time: 'now',
                preview: false
            }).then(((results) => {
                results.forEach((ri) => {
                    Helper.accumulateToMap(this.boughtRIs, [ri.aws_account_id, ri.region, ri.platform, ri.tenancy, ri.instance_type, ri.Scope], ri.instance_count);
                });
                dfd.resolve();
            }));
            return dfd;
        }

        _billingReportDedupSearch() {
            let dfd = $.Deferred();
            SearchUtil.search(Config.BILLING_REPORT_ENDTIME, {
                preview: false
            }).then(((results) => {
                let lastYearStartTime = 0;
                let s3keyByMonth = {};
                let curTime = moment();
                curTime = moment(curTime.format('YYYY-MM'));
                results.forEach((row) => {
                    let timestr = row['timestr'];
                    if (Object.keys(s3keyByMonth).length === 0) {
                        // timestr has been sorted desc
                        let endTime = moment(row['timestr'], DATE_FORMAT);
                        let diffMonth = Math.max(curTime.diff(endTime, 'months') - 1, 0);
                        this.billingReportEarliest = `-${Config.ONE_YEAR_MONTH + diffMonth}mon@mon`;
                        this.billingReportLatest = `-${diffMonth}mon@mon`;
                        lastYearStartTime = endTime.add(-Config.ONE_YEAR_MONTH, 'M').format(DATE_FORMAT);
                    }
                    if (timestr >= lastYearStartTime) {
                        s3keyByMonth[timestr] = [row['S3KeyLastModified']];
                    }

                });
                this.billingReportDedupSPL = BillingUtil.getDedupSpl(s3keyByMonth, Config.DEDUP_PREFIX);
                dfd.resolve();
            }));
            return dfd;
        }

        _normalFactorSearch() {
            let dfd = $.Deferred();
            SearchUtil.search(Config.NORMAL_FACTOR, {
                earliest_time: '0',
                latest_time: 'now',
                preview: false
            }).then(((results) => {
                results.forEach((row) => {
                    this.normalFactor[row['size']] = parseFloat(row['factor']);
                });
                dfd.resolve();
            }));
            return dfd;
        }

        _flexibilityInfoSearch() {
            let dfd = $.Deferred();
            SearchUtil.search(Config.FLEXIBILITY_FAMILY_INFO, {
                earliest_time: '0',
                latest_time: 'now',
                preview: false
            }).then(((results) => {
                results.forEach((row) => {
                    if (!(row['region'] in this.flexibilityInfo)) {
                        this.flexibilityInfo[row['region']] = {}
                    }
                    this.flexibilityInfo[row['region']][row['family']] = _.isArray(row['size']) ? row['size'] : [row['size']];
                });
                dfd.resolve();
            }));
            return dfd;
        }

        _paramSearch() {
            let dfd = $.Deferred();
            let paramSM = new SearchManager({
                id: 'param',
                search: Config.PARAM,
                preview: false,
                earliest_time: '-12mon@d',
                latest_time: 'now'
            });
            paramSM.on('search:start', (() => {
                this.paramSearchResults = [];
                // reset canSubmit
                this.model.set('canSubmit', false);
            }));
            paramSM.on('search:done', ((properties) => {
                if (properties.content.resultCount === 0) {
                    dfd.resolve();
                } else {
                    let resultModel = paramSM.data('results', {
                        output_mode: 'json',
                        count: 0
                    });
                    resultModel.once('data', (() => {
                        this.paramSearchResults = resultModel.data().results;
                        dfd.resolve();
                    }));
                }
            }));
            return dfd;
        }

        generateResults() {
            let base = this.tokens.get('base'),
                payment = this.tokens.get('payment'),
                platform = this.tokens.get('platform'),
                tenancy = this.tokens.get('tenancy');

            this.curClickTimestamp = Date.now();
            this.searchQueueManager.killSearches();

            // use account id, region, instance type, platform, and tenancy combination to filter params
            // use form.x here to get the raw data for multi-selection.
            let rowParams = this._filterParams(this.paramSearchResults, this.tokens.get('form.accountId'),
                this.tokens.get('form.region'), platform, tenancy, this.tokens.get('form.instanceType'));
            // set total length, used for table loading
            this.model.updateTotalLength(rowParams.length);
            // use searchQueueManager to run all rows' searches concurrently
            let searches = [];
            rowParams.forEach(rowParam => {
                let cacheId = Helper.buildCacheId(base, payment, rowParam);
                if (!(cacheId in this.cache)) {
                    let searchId = _.uniqueId(cacheId + '_' + this.curClickTimestamp + '_');
                    let [family, type] = rowParam.instance_type.split('.');
                    let params = $.extend({
                        base,
                        payment,
                        normalFactor: this.normalFactor[type],
                        dedupSpl: this.billingReportDedupSPL
                    }, rowParam);
                    let search = new SearchManager({
                        id: searchId,
                        search: Helper.generateRISPL(params),
                        preview: false,
                        autostart: false,
                        earliest_time: this.billingReportEarliest,
                        latest_time: this.billingReportLatest
                    });
                    searches.push(search);
                } else {
                    this._assembleRow(cacheId);
                }
            });
            if (searches.length !== 0) {
                this.searchQueueManager.appendSearches(searches).start();
            }
        }


        _filterParams(results, accountIdArray, regionArray, platform, tenancy, instanceTypeArray) {
            regionArray = _.isArray(regionArray) ? regionArray : [regionArray];
            instanceTypeArray = _.isArray(instanceTypeArray) ? instanceTypeArray : [instanceTypeArray];
            let rowsParams = results.filter((result) => {
                return (
                    ((accountIdArray[0] === '*' || accountIdArray.indexOf(result.aws_account_id) >= 0)) &&
                    (regionArray[0] === '*' || (regionArray.indexOf(result.region) >= 0)) &&
                    (instanceTypeArray[0] === '*' || (instanceTypeArray.indexOf(result.instance_type) >= 0)) &&
                    (platform === '*' || platform === result.platform) &&
                    (tenancy === '*' || tenancy === result.tenancy)
                );
            });
            rowsParams = _.uniq(rowsParams, false, p => {
                if (Helper.checkSizeFlexibility(p.platform, p.tenancy)) {
                    let [family, size] = p.instance_type.split('.');
                    let smallestSizeInFamily = (p.region in this.flexibilityInfo && family in this.flexibilityInfo[p.region]) ?
                        this.flexibilityInfo[p.region][family][0] : size
                    p.instance_type = family + '.' + smallestSizeInFamily;
                    return [p.aws_account_id, p.region, p.platform, p.tenancy, family].join('_');
                } else {
                    return [p.aws_account_id, p.region, p.platform, p.tenancy, p.instance_type].join('_');
                }
            });
            return rowsParams;
        }

        /**
         * Expanded HTML content for existing RIs.
         * If size flexibility is enabled, then existing RIs are measured in 'unit' and only regional RIs are aggregated.
         * If size flexibility is disabled, then existing RIs are measured in 'count' and all RIs are aggregated.
         * @return {Object} existingRIs and corresponding expanded HTML content.
         */
        _generateExistingRIsInfo(appliedFlexibility, accountId, region, platformLabel, tenancyLabel, instance_type, family) {
            let existingRIs = 'N/A';
            let existingRIsUnits = 'N/A';
            let existingRIRegionalList = []; // regional RIs for 'unit'
            let existingRIList = []; // all bought RIs for 'count'
            if (accountId in this.boughtRIs) {
                existingRIs = 0;
                existingRIsUnits = 0;
                let existingRIsByTypeScope = Helper.getValueFromMap(this.boughtRIs, [accountId, region, platformLabel, tenancyLabel]);
                if (existingRIsByTypeScope !== 0) {
                    Object.keys(existingRIsByTypeScope).forEach(existingRIType => {
                        let [existingFamily, existingSize] = existingRIType.split('.');
                        if ((appliedFlexibility && existingFamily === family) || (!appliedFlexibility && instance_type === existingRIType)) {
                            // can apply flexibility and same family or cannot apply with flexibility but same type
                            Object.keys(existingRIsByTypeScope[existingRIType]).forEach(scope => {
                                let boughtRICount = existingRIsByTypeScope[existingRIType][scope];
                                if (boughtRICount > 0) {
                                    existingRIList.push({
                                        'count': boughtRICount,
                                        'type': existingRIType,
                                        'scope': scope
                                    });
                                    existingRIs += boughtRICount;
                                    if (appliedFlexibility && scope === 'Region') {
                                        existingRIRegionalList.push({
                                            'count': boughtRICount,
                                            'size': existingSize,
                                            'factor': this.normalFactor[existingSize]
                                        });
                                        existingRIsUnits += this.normalFactor[existingSize] * boughtRICount;
                                    }
                                }
                            });
                        }
                    });
                }
            }
            let existingRIsContent = _.template(RIPlannerExistingRITemplate, {
                existingRIs, existingRIsUnits, appliedFlexibility,
                'unitEquation': existingRIRegionalList.map(v => {
                    return v.count + ' x ' + v.factor + ' (' + v.size + ')'
                }).join(' + '),
                'existingRIInfo': existingRIList.map(v => {
                    return '<li> ' + v.count + ' ' + v.type + ' with ' + v.scope + ' scope'
                }).join('')
            });
            if (appliedFlexibility) {
                existingRIs = existingRIsUnits;
            }
            return {existingRIs, existingRIsContent};
        }

        /**
         * Expanded HTML content for optimal RIs.
         * Recommend two purchase ways for size flexibility.
         * 1. Always consider smallest size in family.
         * 2. Always consider least purchase count.
         * @return {String} Expanded HTML content.
         */
        _generateOptimalRIsInfo(appliedFlexibility, optimalRI, region, family) {
            let sizeList = [Config.DEFAULT_SMALLEST_SIZE];
            if (region in this.flexibilityInfo && family in this.flexibilityInfo[region][family]) {
                sizeList = this.flexibilityInfo[region][family];
            }
            let recommendedRIList = [`${optimalRI} = ${optimalRI / this.normalFactor[sizeList[0]]} x ${this.normalFactor[sizeList[0]]} (${sizeList[0]})`];
            if (sizeList.length > 1 && optimalRI > this.normalFactor[sizeList[1]]) {
                let combination = [];
                let tempRI = optimalRI;
                // not only smallest size
                for (let i = sizeList.length - 1; i >= 0; i--) {
                    if (tempRI <= 0) {
                        break;
                    }
                    let factor = this.normalFactor[sizeList[i]];
                    let count = parseInt(tempRI / factor);
                    tempRI = tempRI - count * factor;
                    if (count > 0) {
                        combination.push({'count': count, 'factor': factor, 'size': sizeList[i]});
                    }
                }
                recommendedRIList.push(`${optimalRI} = ${combination.map(v => {
                    return v.count + ' x ' + v.factor + ' (' + v.size + ')'
                }).join(' + ')}`);
            }
            return _.template(RIPlannerOptimalRITemplate, {
                optimalRI, appliedFlexibility, family,
                'recommendedRIInfo': recommendedRIList.map(v => {
                    return '<li>' + v + '</li>'
                }).join('')
            });
        }

        _assembleRow(id) {
            let result = this.cache[id];
            let [accountId, region, platform, tenancy, instance_type, base, payment, regionLabel, platformLabel, tenancyLabel] = id.split('_');
            let [family, size] = instance_type.split('.');
            let ri = 'N/A', savings = 'N/A', currency = '$', message = 'Details', expandedContent = '',
                appliedFlexibility = Helper.checkSizeFlexibility(platform, tenancy), unit = appliedFlexibility ? ' (unit)' : ' (count)',
                detailMessage = 'This region may not support reserved instance for this type or price information is out-of-date.';

            // generate existingRI info for expanded row
            let {existingRIs, existingRIsContent} = this._generateExistingRIsInfo(appliedFlexibility, accountId, region, platformLabel, tenancyLabel, instance_type, family);
            expandedContent += existingRIsContent;

            if (result != null) {
                ri = result[0]['ri'];
                if (ri !== 'N/A') {
                    // parse savings
                    currency = result[0]['currency'];
                    savings = parseInt(parseFloat(result[0]['on_demand_cost']) - parseFloat(result[0]['ri_cost']));
                    savings = `${currency}${numeral(savings).format('0,0')}`;
                    // parse ri
                    ri = parseInt(ri) * (appliedFlexibility ? this.normalFactor[size] : 1);
                    // generate optimalRI info for expanded row
                    expandedContent += this._generateOptimalRIsInfo(appliedFlexibility, ri, region, family);
                } else {
                    detailMessage = result[0]['message'];
                }
            }
            // assemble detail, optimal ri, exsiting ri cell
            let detail = {value: message};
            let optimal = {value: ri === 'N/A' ? ri : ri + unit};
            let existing = {value: existingRIs === 'N/A' ? existingRIs : existingRIs + unit};
            if (ri === 'N/A') {
                detail.tooltipTitle = detailMessage;
                optimal.tooltipTitle = detailMessage;
            } else {
                let linkParams = {
                    accountId,
                    region,
                    platform,
                    tenancy,
                    instance_type,
                    base,
                    payment,
                    currency,
                    regionLabel,
                    platformLabel,
                    tenancyLabel,
                    'dedupSpl': encodeURIComponent(this.billingReportDedupSPL),
                    'earliest': this.billingReportEarliest,
                    'latest': this.billingReportLatest,
                    'boughtRI': existingRIs,
                    'normalFactor': this.normalFactor[size],
                };
                detail.link = 'RI_planner_detail?' + Object.keys(linkParams).map(key => `${key}=${linkParams[key]}`).join('&');
            }
            if (existingRIs === 'N/A') {
                existing.tooltipTitle = Config.NO_DESCRIPTION_MESSAGE;
            }
            let row = {
                'Account ID': {value: accountId},
                'Instance type': {value: appliedFlexibility ? family : instance_type},
                'Platform': {value: platformLabel},
                'Tenancy': {value: tenancyLabel},
                'Existing RIs': existing,
                'Optimal RIs': optimal,
                'Estimated yearly savings': {value: savings},
                'Region': {value: regionLabel},
                'Details': detail,
                multipleLineLength: 1
            };
            row[TableConfig.HTML_CONTENT] = expandedContent;
            this.model.addRow(row);
        }

    }
    return RIPlannerController;
});
