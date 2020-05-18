define([
    'underscore',
    'jquery',
    'backbone',
    'util/moment'
], function (_, $, Backbone, moment) {
    'use strict';

    return Backbone.Model.extend({
        defaults: {
            problem: undefined,
            solution: undefined,
            detail: undefined
        },

        initialize: function () {
            Backbone.Model.prototype.initialize.apply(this, arguments);
            var SM = this.get('search');
            SM.on('search:done', (properties) => {
                if (properties.content.resultCount === 0) {
                    this.set('baseResults', []);
                } else {
                    var baseSGModel = SM.data('results', {output_mode: 'json', count: 0});
                    baseSGModel.on('data', () => {
                        this.set('baseResults', baseSGModel.data().results);
                    });
                }
            });
        },

        unsetData: function () {
            this.set({problem: undefined, solution: undefined, detail: undefined});
        },

        formatData: function (insight, id) {
            let results = _.filter(this.get('baseResults'), (row => {
                let curid = `${row.account_id}_${row.UserName}`;
                return row.insight === insight && curid === id
            }));
            switch (insight) {
                case 'IAM access key rotation':
                    this.setLongUseAccessKey(results);
                    break;
                case 'No IAM user created':
                    this.setNoIAM(results);
                    break;
                case 'No password policy':
                    this.setNoPasswordPolicy(results);
                    break;
                case 'Password reuse is not prevented':
                    this.setReusePassword(results);
                    break;
                case 'User is unused for long time':
                    this.setUnusedIAMUser(results);
                    break;
                default:
                    return;
            }
        },

        /**
         * The access key is active and has not been rotated in the last 90 days.
         */
        setLongUseAccessKey: function (results) {
            let detail = '';
            if (results.length > 0 && 'CreateDate' in results[0]) {
                let dates = results[0].CreateDate;
                dates = _.isArray(dates) ? dates : [dates];
                dates.forEach(date => {
                    date = moment.utc(date).format('YYYY-MM-DD hh:mm:ss').toString();
                    detail+= `One access key's last rotated time is ${date} (UTC).<br/>`
                });
            }
            this.set({
                problem: 'Active IAM access keys have not been rotated in the last 90 days.',
                solution: 'Rotate access keys on a regular basis.',
                detail: detail
            });
        },

        /**
         * No IAM users have been created for this account.
         */
        setNoIAM: function (results) {
            this.set({
                problem: 'No IAM users have been created for this account.',
                solution: 'Create one or more IAM users in your account. You can then create additional users ' +
                'whose permissions are limited to perform specific tasks in your AWS environment.',
                detail: ''
            });
        },

        /**
         * No password policy is enabled.
         */
        setNoPasswordPolicy: function(results) {
            this.set({
                problem: 'No password policy is enabled for this account.',
                solution: 'No password policy is enabled, please create and configure one on the root account.',
                detail: ''
            });
        },

        /**
         * Password is reusable.
         */
        setReusePassword: function(results) {
            this.set({
                problem: 'Password can be reusable.',
                solution: 'You can prevent it by configuring password policy on the root account.',
                detail: ''
            });
        },

        /**
         * IAM user is unused for long time.
         */
        setUnusedIAMUser: function(results) {
            this.set({
                problem: 'IAM user is unused for longer than 30 days.',
                solution: 'You can make a choice to revoke this user.',
                detail: ''
            });
        }
    });
});
