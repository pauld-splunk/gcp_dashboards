// This helper extract all search macros from web page Components.
define([
    'jquery',
    'underscore',
    'backbone',
    'splunkjs/mvc',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/simplexml/ready!'
], function (
    $,
    _,
    Backbone,
    mvc,
    SearchManager
) {
    'use strict';

    // Predefined SPL -> sourcetype map
    // Normally all spl should have sourcetype="aws:xxx" string. Those one will be extract automatically.
    // However, there are some exceptions such as datamodel searches and etc.
    const SOURCETYPE_MAP = {
        'aws_topology_daily_snapshot': 'aws:config',
        'services/saas-aws/splunk_app_aws_recommendation': 'aws:cloudwatch',
        'datamodel=Detailed_Billing': 'aws:billing',
        'datamodel=Instance_Hour': 'aws:billing',
        'datamodel S3_Access_Log': 'aws:s3:accesslogs',
        'datamodel CloudFront_Access_Log': 'aws:cloudfront:accesslogs'
    };
    const SOURCETYPE_REGEX = /sourcetype\s*=[\s'"]*(aws:.+?)[\s'"]{1}/g;
    const CHECKING_INTERVAL = 4000;

    let MacroHelper = _.extend(Backbone.Events);


    /**
     * Get all search managers from mvc
     *
     * @returns the search managers
     */
    function _getSMS() {
        return Object.keys(mvc.Components.attributes).map((key) => {
                let component = mvc.Components.get(key);
                let sm = null;

                if (component instanceof SearchManager) {
                    sm = component;
                } else if (component.manager && component.manager instanceof SearchManager) {
                    sm = component.manager;
                }

                return sm;
            }).filter(sm => sm !== null);
    }


    /**
     *
     * @param {any} spl
     * @returns whether the spl contains the Recommendation.
     */
    function _checkRecommendation(spl) {
        return spl.indexOf('services/saas-aws/splunk_app_aws_recommendation') > -1;
    }



    /**
     * Extract sourcetypes from search managers and trigger the events.
     *
     */
    function _extractSourcetype() {
        let sms = _getSMS();
        let hasRecommendation = false;

        let sourcetypes = sms
            .map(sm => {
                if (!sm.has('data')) {
                    return null;
                }

                return sm.get('data').eventSearch + sm.get('data').reportSearch;
            })
            .filter(spl => !!spl)
            .map(spl => {
                if (!hasRecommendation && _checkRecommendation(spl)) {
                    hasRecommendation = true;
                }

                let results = [];
                let matches = spl.match(SOURCETYPE_REGEX);
                if (matches) {
                    results = matches.map((item) => {
                        let result = SOURCETYPE_REGEX.exec(item);
                        if (result && result.length > 1) {
                            return result[1];
                        }

                        return null;
                    }).filter((item) => item !== null);
                }

                for (let item in SOURCETYPE_MAP) {
                    if (spl.indexOf(item) > -1) {
                        results.push(SOURCETYPE_MAP[item]);
                    }
                }

                return results;
            })
            .reduce((acc, sourcetype) => {
                sourcetype.forEach(type => {
                    acc[type] = true;
                });

                return acc;
             }, {});

        if (hasRecommendation) {
            MacroHelper.trigger('change:recommendation', true);
        }

        MacroHelper.trigger('change:sourcetype', Object.keys(sourcetypes));
    }

    setInterval(_extractSourcetype, CHECKING_INTERVAL);

    return MacroHelper;
});
