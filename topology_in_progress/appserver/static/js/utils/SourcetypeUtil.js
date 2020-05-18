define([
], function () {
    'use strict';

    const ALL_INPUTS = {
            'aws:cloudtrail': 'CloudTrail',
            'aws:config': 'Config',
            'aws:config:notification': 'Config',
            'aws:billing': 'Billing',
            'aws:inspector': 'Inspector',
            'aws:config:rule': 'Config Rule',
            'aws:cloudwatch': 'CloudWatch',
            'aws:cloudfront:accesslogs': 'CloudFront Access Logs',
            'aws:elb:accesslogs': 'ELB Access Logs',
            'aws:s3:accesslogs': 'S3 Access Logs',
            'aws:description': 'Description',
            'aws:cloudwatchlogs:vpcflow': 'VPC Flow Logs'
        };

    return {
        findInputBySourcetype(sourcetype) {
            return ALL_INPUTS[sourcetype];
        }
    };
});
