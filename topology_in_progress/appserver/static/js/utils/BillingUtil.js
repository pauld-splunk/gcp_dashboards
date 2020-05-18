define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'app/utils/LookupUtil',
    'splunkjs/mvc/simpleform/formutils',
    'util/moment'
], function ($, _, mvc, LookupUtil, FormUtils, moment) {
    'use strict';
    const DATE_FORMAT = 'YYYY-MM';

    let tokenModel = mvc.Components.getInstance('default');

    // from: from timestamp
    // to: to timestamp
    // notice that it won't generate any months that >= this month
    function generateMonths(from, to) {
        let fromMoment = moment.unix(from).utc();
        let toMoment = moment.unix(to).utc();
        let monMoment = moment().utc().startOf('month');
        let months = [];

        while (fromMoment.diff(toMoment) < 0 && fromMoment.isBefore(monMoment)) {
            months.push(fromMoment.format(DATE_FORMAT));
            fromMoment.add(1, 'M');
        }

        return months;
    }

    // get unix time in UTC
    function getUTCUnix(date) {
        return date.unix() - date.zone() * 60;
    }

    function getDedupSpl(s3keyByMonth, prefix) {
        let monthSpl = Object.keys(s3keyByMonth).map(month => {
                let keys = s3keyByMonth[month];
                let spl = keys.map(key => {
                    return `${prefix}S3KeyLastModified="${key}"`;
                }).join(' OR ');

                return `(source="*${month}*" AND (${spl}))`;
            }).join(' OR ');

        return `(${monthSpl})`;
    }

    // from: from timestamp
    // to: to timestamp
    // eventtype: 'aws_billing_detail_report' or 'aws_billing_monthly_report'
    // prefix: 'detailed_billing' for detailed billing
    // submit: submitted to FormUtil
    function updateMonthSpl(from, to, eventtype, prefix, submit) {
        let months = generateMonths(from, to);
        LookupUtil.tryLookup('| inputlookup billing_report_s3key', {
            cache: true
        }, 'Billing: Billing Reports S3Key Generator', 'billing_report_s3key', results => {
            if (!results) {
                return;
            }

            let s3keyByMonth = months.reduce((acc, month) => {
                acc[month] = [];
                return acc;
            }, {});

            results.map(result => {
                months.forEach(month => {
                    if (result.eventtype === eventtype && result.source.indexOf(month) > -1) {
                        s3keyByMonth[month].push(result.S3KeyLastModified);
                    }
                });
            });

            let monthSpl = getDedupSpl(s3keyByMonth, prefix);
            tokenModel.set('monthSpl', monthSpl);

            if (submit) {
                FormUtils.submitForm({replaceState: true});
            }
        });

    }

    return {
        updateMonthSpl: updateMonthSpl,
        getUTCUnix: getUTCUnix,
        getDedupSpl: getDedupSpl
    }
});
