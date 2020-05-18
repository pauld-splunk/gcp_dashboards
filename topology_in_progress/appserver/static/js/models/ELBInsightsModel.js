define([
    'underscore',
    'jquery',
    'backbone',
    'app/utils/Util',
    'app/utils/HelpLinks'
], function (_, $, Backbone, appUtils, HelpLinks) {
    'use strict';
    let link = appUtils.buildLinkNode(HelpLinks.AWS_RECOMMENDATION_ELB);
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
                let curid = `${row.account_id}_${row.Region}_${row.name}`;
                return row.insight === insight && curid === id
            }));
            switch (insight) {
                case 'No healthy instance':
                    this.setUnusedData(results);
                    break;
                case 'One healthy instance without autoscaling':
                    this.setNotAutoscalingData();
                    break;
                case 'Not enough requests':
                    this.setNotEnoughRequestData(results);
                    break;
                case 'Healthy instances are not cross-zone':
                    this.setNotCrossZoneData(results);
                    break;
                case 'Insecure listener protocol':
                    this.setInsecureListenerData(results);
                    break;
                default:
                    return;
            }
        },

        // detail information for unused ELB
        setUnusedData: function (results) {
            let instanceIds = [];
            if (results.length > 0 && 'instances' in results[0]) {
                let instances = _.isArray(results[0].instances) ? results[0].instances : [results[0].instances];
                instanceIds = instances.map(value => {
                    return value.split(',')[0]
                });
            }
            let details = `There are ${instanceIds.length} instance${instanceIds.length > 1 ? 's' : ''} attached. `;
            if (instanceIds.length > 0) {
                details += (instanceIds.length > 1 ? 'They are ' : 'It is ') + instanceIds.join(', ') + '.';
            }
            this.set({
                problem: 'Load balancer has no healthy instance attached.',
                solution: `You can register healthy instances or delete this load balancer. ${link}`,
                detail: details
            });
        },

        // detail information for one instance without autoscaling for ELB
        setNotAutoscalingData: function () {
            this.set({
                problem: 'Load balancing with only one healthy instance attached. No auto-scaling applied.',
                solution: `You can delete this load balancer. ${link}`,
                detail: ''
            });
        },

        // detail information for no enough request for ELB
        setNotEnoughRequestData: function (results) {
            if (results.length === 0 || !('request_count' in results[0])) {
                this.set({
                    problem: 'Load balancer has no request over the last 7 days.',
                    solution: `You can apply auto-scaling or delete this load balancer. ${link}`,
                    detail: ''
                });
            } else {
                let requestCount = results[0].request_count;
                this.set({
                    problem: 'Too few request, there is no need to use load balancer.',
                    solution: `You can delete this load balancer. ${link}`,
                    detail: `Load balancer has fewer than ${parseInt(requestCount)} request${parseInt(requestCount) > 1 ? 's' : ''} over the last 7 days.`
                });
            }
        },

        // detail information for not best practice of ELB
        setNotCrossZoneData: function (results) {
            let detail = (results.length > 0 && ('placement' in results[0])) ? `Only availability zone ${results[0].placement}`: 'No availability zone';
            this.set({
                problem: 'Healthy instances are not cross-zones.',
                solution: `You can configure cross-zone instances. ${link}`, //TODO: add link http://docs.aws.amazon.com/elasticloadbalancing/latest/classic/enable-disable-crosszone-lb.html in doc
                detail: `${detail} has healthy back-end instances.`
            });
        },

        // checks for load balancers with listeners that do not use a secure protocol (HTTPS or SSL)
        setInsecureListenerData: function (results) {
            this.set({
                problem: 'No listener uses a secure protocol (HTTPS or SSL).',
                solution: 'If the traffic to load balancer must be secure, use either the HTTPS or the SSL protocol for the front-end connection.',
                detail: ''
            });
        }
    });
});
