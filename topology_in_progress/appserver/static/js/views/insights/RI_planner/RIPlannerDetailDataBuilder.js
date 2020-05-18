define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/searchmanager',
    'app/views/insights/RI_planner/RIPlannerHelper',
    'app/views/insights/RI_planner/RIPlannerConfig'
], function ($, _, mvc, SearchManager, Helper, Config) {
    class RIPlannerDetailDataBuilder {
        constructor(model, earliest, latest) {
            // models
            this.model = model;
            this.tokens = mvc.Components.get('default');
            this.model.set('filtersEnabled', false);
            let ihDfd = this.instanceHourSearch(earliest, latest);
            let infoDfd = this.riInfoSearch();
            $.when(ihDfd, infoDfd).done((()=> {
                this.model.set('filtersEnabled', true);
            }).bind(this));
        }

        instanceHourSearch(earliest, latest) {
            let dfd = $.Deferred();
            let dedupSpl = decodeURIComponent(this.tokens.get('dedupSpl'));
            // ri singleview drilldown
            let params = {
                dedupSpl,
                aws_account_id: this.tokens.get('accountId'),
                region: this.tokens.get('region'),
                platform: this.tokens.get('platform'),
                tenancy: this.tokens.get('tenancy'),
                instance_type: this.tokens.get('instance_type'),
                normalFactor: this.tokens.get('normalFactor')
            };
            this.tokens.set('ihSearchSPL', Helper.generateIHSPL($.extend({base: 'history'}, params)));
            let ihSM = new SearchManager({
                id: 'ihSearch',
                search: Helper.generateIHSPL($.extend({base: 'prediction'}, params)),
                earliest_time: earliest,
                latest_time: latest,
                preview: false
            });

            ihSM.on('search:done', (properties) => {
                if (properties.content.resultCount === 0) {
                    dfd.resolve();
                } else {
                    let resultModel = ihSM.data('results', {
                        output_mode: 'json',
                        count: 0
                    });
                    resultModel.once('data', () => {
                        let results = resultModel.data().results;
                        // parse search data for single views
                        this._parseSearchDataForChart(results);
                        // parse search data for single views
                        this._parseSearchDataForSingleViews(results);
                        dfd.resolve();
                    });
                }
            });
            return dfd;
        }

        riInfoSearch() {
            let dfd = $.Deferred();
            let that = this;
            let params = {
                base: '',
                payment: '',
                region: this.tokens.get('region'),
                platform: this.tokens.get('platform'),
                tenancy: this.tokens.get('tenancy'),
                instance_type: this.tokens.get('instance_type')
            };
            let search = Helper.generateRecommSPL(params);
            let infoSearch = new SearchManager({
                id: 'riInfoSearch',
                search: search,
                preivew: false
            });
            infoSearch.on('search:done', (()=> {
                let resultModel = infoSearch.data('results', {
                    output_mode: 'json',
                    count: 0
                });
                resultModel.once('data', (() => {
                    let results = resultModel.data().results;
                    this.model.set('priceInfo', {
                        onDemandHourly: parseFloat(results[0].on_demand_hourly),
                        reservedOneAllYearly: parseFloat(results[0].reserved_one_all_yearly),
                        reservedOnePartialYearly: parseFloat(results[0].reserved_one_partial_yearly),
                        reservedOnePartialHourly: parseFloat(results[0].reserved_one_partial_hourly),
                        reservedOneNoHourly: parseFloat(results[0].reserved_one_no_hourly)
                    });
                    dfd.resolve();
                }).bind(that));
            }).bind(that));
            return dfd;
        }

        _parseSearchDataForChart(results) {
            let prediction = results.filter(v=> {
                return !(_.isUndefined(v['recommended_d']));
            });
            let history = results.filter(v=> {
                return !(_.isUndefined(v['current_d']));
            });
            prediction = prediction.slice(history.length);
            // history
            let historyData = history.map(v => {
                return Math.max(Math.round(v['current_d'], 0));
            });
            Helper.start = new Date(history[0]['d_time'] / Config.TIMESTAMP_TO_SPLUNK_TIME_COEF);
            // prediction
            let predictionData = prediction.map(v => {
                return Math.max(Math.round(v['recommended_d']), 0);
            });
            this.model.set('dailyData', {
                history: {
                    data: historyData,
                    start: history[0]['d_time'] / Config.TIMESTAMP_TO_SPLUNK_TIME_COEF,
                    end: history[history.length - 1]['d_time'] / Config.TIMESTAMP_TO_SPLUNK_TIME_COEF
                },
                prediction: {
                    data: predictionData,
                    start: prediction[0]['d_time'] / Config.TIMESTAMP_TO_SPLUNK_TIME_COEF,
                    end: prediction[prediction.length - 1]['d_time'] / Config.TIMESTAMP_TO_SPLUNK_TIME_COEF
                }
            });
        }

        _parseSearchDataForSingleViews(results) {
            let historyHour = results.filter(v=> {
                return !(_.isUndefined(v['current_ih']));
            });
            let predictionHour = results.filter(v=> {
                return _.isUndefined(v['current_ih']);
            });
            predictionHour = predictionHour.map(v => {
                return Math.max(parseFloat(v['recommended_ih']), 0);
            });
            historyHour = historyHour.map(v => {
                return Math.max(parseInt(Math.round(parseFloat(v['current_ih']))), 0);
            });
            this.model.set('hourlyData', {
                history: historyHour,
                prediction: predictionHour
            });
            this.model.changeSingleData(this.tokens.get('base'));
        }
    }
    return RIPlannerDetailDataBuilder;
});