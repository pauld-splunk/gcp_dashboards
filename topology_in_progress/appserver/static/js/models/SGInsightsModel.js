define([
    'underscore',
    'jquery',
    'backbone'
], function (_, $, Backbone) {
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
                return row.insight === insight && row.id === id
            }));
            switch (insight) {
                case 'Large number of rules':
                    this.setExcessiveRulesSG(results);
                    break;
                case 'Unrestricted access on specific ports':
                    this.setUnrestrictedAccess(results);
                    break;
                case 'Unrestricted access':
                    this.setUnrestrictedAccess(results);
                    break;
                case 'Unused security group':
                    this.setUnusedSG();
                    break;
                case 'Redundant security groups':
                    this.setRedundantSG(results);
                    break;
                default:
                    return;
            }
        },

        /**
         * Accessing to ports is unrestricted
         */
        setUnrestrictedAccess: function (results) {
            let detail = 'No port is unrestricted.';
            if (results.length > 0 && 'port' in results[0]) {
                let ports = results[0].port;
                ports = _.isArray(ports) ? ports : [ports];
                ports = ports.map((port) => {
                    port = port.replace('-1', 'N/A (ICMP)');
                    return port.replace('null', 'All');
                });
                ports.sort();
                ports = _.union(ports);
                detail = `Accessing to port ${ports.join(', ')} is unrestricted.`;
            }

            this.set({
                problem: 'Security groups with rules that allow unrestricted access (0.0.0.0/0) to specific ports.',
                solution: 'Restrict access to only those IP addresses that require it. To restrict access to a specific IP address, set the suffix to /32 (for example, 192.0.2.10/32).<br/> Be sure to delete overly permissive rules after creating rules that are more restrictive.',
                detail: detail
            });
        },

        /**
         * Security group is unused
         */
        setUnusedSG: function () {
            this.set({
                problem: 'Security group has no instance associated.',
                solution: 'You can associate instances with this security group or just delete it.',
                detail: null
            });
        },

        /**
         * Security group is same with other security groups
         */
        setRedundantSG: function (results) {
            let problem = 'No security group is';
            let detail = null;
            if (results.length > 0) {
                if ('same_ids' in results[0] && 'id_count' in results[0]) {
                    let sg = results[0].same_ids;
                    sg.sort();
                    problem = `${results[0].id_count} security groups are`;
                    detail = `Security groups ${sg.join(', ')} are redundant.`
                }
            }
            this.set({
                problem: `${problem} same in inbound rules, outbound rules and VPC.`,
                solution: `You can delete other security groups and migrate associated instances to this security group.`,
                detail: detail
            });
        },

        /**
         * Security group has large number of rules
         * For EC2-VPC, more than 50 rules
         * For EC2-Classic, more than 100 rules
         */
        setExcessiveRulesSG: function(results) {
            let detail = '';
            if (results.length > 0) {
                if ('inbound_count' in results[0] && 'outbound_count' in results[0]) {
                        detail = `This security group has ${results[0].inbound_count} inbound rules and ${results[0].outbound_count} outbound rules.`
                }
            }
            this.set({
                problem: 'Large number of rules will degrade performance.',
                solution: 'Reduce the number of rules in a security group by deleting unnecessary or overlapping rules.' ,
                detail: detail
            });
        }
    });
});
