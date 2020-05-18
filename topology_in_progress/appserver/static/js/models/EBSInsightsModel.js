define([
    'underscore',
    'jquery',
    'backbone',
    'app/utils/Util',
    'app/utils/HelpLinks'
], function (_, $, Backbone, Utils, HelpLinks) {
    'use strict';

    var link = Utils.buildLinkNode(HelpLinks.AWS_RECOMMENDATION_EBS);
    var EBSInsightsModel = Backbone.Model.extend({
        defaults: {
            problem: undefined,
            solution: undefined,
            detail: undefined
        },

        unsetData: function () {
            this.set({problem: undefined, solution: undefined, detail: undefined});
        },

        // set EBS related recommendation details here
        setUnattachedEBSData: function (ebsID) {
            let problem = 'Current EBS(' + ebsID + ')' + ' is not attached to any EC2 instance.';
            this.set({
                    problem: problem,
                    solution: `You can delete this EBS. ${link}`,
                    detail: ''
            });
        },

        setNonOptimizedEBSData: function (ebsID, instanceId, instanceName) {
            instanceName = _.isUndefined(instanceName)? '':` (${instanceName})`;
            let problem = 'Current EBS(' + ebsID + ')' + ' is attached to non-ebs optimized EC2 instances.',
                solution = `You can optimize the attached EC2 instance: ${instanceId}${instanceName}. ${link}`;
            this.set({
                    problem: problem,
                    solution: solution,
                    detail: ''
            });
        },

        setNoSnapshotEBSData: function (ebsID, lastSnapshot, lastTime, snapshotAge) {
            let problem = 'The EBS(' + ebsID + ')' + '  volume has no snapshot in last 30 days.',
                solution = `You can take a snapshot of the EBS volume for disaster recovery. ${link}`,
                detail = '';
            if (lastSnapshot !== null && lastSnapshot)
                detail = 'Last Snapshot ID: ' + lastSnapshot + ' was taken at ' + lastTime + '(snapshot age: ' + snapshotAge + ' days).';
            this.set({
                    problem: problem,
                    solution: solution,
                    detail: detail
            });
        },

        setLargeIopsEBSData: function (ebsID, iops, piops) {
            let problem = 'The IOPS of this EBS(' + ebsID + ')' + ' for the last 7 days is ' + iops + '.';
            let solution = '',
                detail = '';
            solution = `You can upgrade the provisioned IOPS. ${link}`;
            if (piops && piops !== null && piops !== 'null') {
                let iopsPercentage = (iops / piops).toFixed(2);
                detail = 'Cunrrent EBS volume has a provisioned IOPS of ' + piops + '(Usage percentage: ' + iopsPercentage + ').';
            }
            this.set({
                    problem: problem,
                    solution: solution,
                    detail: detail
            });
        },

        setSmallIopsEBSData: function (ebsID, iops, piops) {
            let problem = 'The IOPS of this EBS(' + ebsID + ')' + ' for the last 7 days is ' + iops + '.';
            let solution = '',
                detail = '';
            solution = `You can downgrade the provisioned IOPS. ${link}`;
            if (piops && piops !== null && piops !== 'null') {
                let iopsPercentage = (iops / piops).toFixed(5);
                detail = 'Cunrrent EBS volume has a provisioned IOPS of ' + piops + ' (Usage percentage: ' + iopsPercentage + ').';
            }
            this.set({
                    problem: problem,
                    solution: solution,
                    detail: detail
            });
        }
    });
    return EBSInsightsModel;
});
