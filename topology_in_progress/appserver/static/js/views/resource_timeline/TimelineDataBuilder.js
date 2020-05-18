/**
 * Created by frank on 2016-09-05
 */

define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'splunkjs/mvc/searchmanager',
    'app/views/resource_timeline/TimelineConstants'
], function($, _, mvc, utils, SearchManager, TimelineConstants){

    var tokenModel =  mvc.Components.getInstance('default'),
        appName = utils.getPageInfo().app;

    function TimelineDataBuilder(model){
        // models
        this.model = model;

        // search managers
        var configSM = new SearchManager({
            id: `timeline_config_search${new Date().getTime()}`,
            search: '`aws-config-notification($accountId$, $region$)` $resourceIdConfigFilter$' +
                    '| head ' + TimelineConstants.MAX_COUNT +
                    '| rename configurationItem.resourceId as resourceId, configurationItem.awsAccountId as accountId, configurationItem.resourceRegion as region, configurationItemDiff.changeType as changeType' +
                    '| eval service="' + TimelineConstants.CONFIG_NOTIFICATION_SERVICE + '"' +
                    '| spath path=configurationItemDiff.changedProperties output=changeProperties' +
                    '| eval timestamp=floor(_time/60)*60' +
                    '| table accountId, region, resourceId, changeType, changeProperties, service, timestamp',
            app: appName,
            autostart: false,
            preview: false,
            earliest_time: '$earliest$',
            latest_time: '$latest$'
        }, {tokens: true});

        var inspectorSM = new SearchManager({
            id: `timeline_inspector_search${new Date().getTime()}`,
            search: '`aws-inspector-findings` assetType="ec2-instance" $accountId$ $region$ $resourceIdInspectorFilter$' +
                    '| dedup arn' +
                    '| head ' + TimelineConstants.MAX_COUNT +
                    '| rename assetAttributes.agentId as resourceId, account_id as accountId, id as rule, title as finding' +
                    '| eval service="' + TimelineConstants.INSPECTOR_SERVICE + '", timestamp=floor(_time/60)*60' +
                    '| join type="left" serviceAttributes.rulesPackageArn [search earliest=0 `aws-inspector-runs` | dedup rulesPackages{}.arn ' +
                    '| rename rulesPackages{}.arn as packageArn, rulesPackages{}.name as packageName' +
                    '| eval row=mvzip(packageArn, packageName, "|") ' +
                    '| mvexpand row | rex field=row "(?<packageArn>.*?)\\|(?<packageName>.*)" ' +
                    '| table packageArn packageName | rename packageArn as "serviceAttributes.rulesPackageArn"]' +
                    '| rename packageName as "rules_package"' +
                    '| table accountId, region, resourceId, service, severity, rules_package, rule, finding, timestamp',
            app: appName,
            autostart: false,
            preview: false,
            earliest_time: '$earliest$',
            latest_time: '$latest$'
        }, {tokens: true});

        var cloudtrailSM = new SearchManager({
            id: `timeline_cloudtrail_search${new Date().getTime()}`,
            search: '`aws-cloudtrail($accountId$, $region$)` eventName!="Describe*" eventName!="List*" eventName!="Get*" $resourceIdCloudtrailFilter$' +
                    '| head ' + TimelineConstants.MAX_COUNT +
                    '| dedup eventID' +
                    '| rename eventName as changeType, userIdentity.accountId as accountId, userIdentity.arn as userArn' +
                    '| spath path=requestParameters output=requestParameters' +
                    '| spath path=userIdentity output=userIdentity' +
                    '| eval service="' + TimelineConstants.CLOUDTRAIL_SERVICE + '"' +
                    '| strcat eventType "," eventSource "," sourceIPAddress "," userAgent changeProperties' +
                    '| eval timestamp=floor(_time/60)*60' +
                    '| eval resourceId=coalesce(\'requestParameters.instanceId\', \'requestParameters.networkAclId\', \'requestParameters.groupId\', \'requestParameters.keyName\')' +
                    '| eval resourceIds=coalesce(\'requestParameters.instancesSet.items{}.instanceId\', \'requestParameters.resourcesSet.items{}.resourceId\')' +
                    '| eval elbName=coalesce(\'requestParameters.loadBalancerName\', \'requestParameters.loadBalancerArn\', \'requestParameters.name\', \'requestParameters.description\')' +
                    '| rex field=elbName "app/(?<elbName>.*)/"' +
                    '| table accountId, region, resourceId, resourceIds, elbName, changeType, changeProperties, service, timestamp, requestParameters, userArn, userIdentity',
            app: appName,
            autostart: false,
            preview: false,
            earliest_time: '$earliest$',
            latest_time: '$latest$'
        }, {tokens: true});

        var rulesSM = new SearchManager({
            id: `timeline_rules_search${new Date().getTime()}`,
            search: '`aws-config-rule($accountId$, $region$ , ":complianceDetail")` ComplianceType=NON_COMPLIANT EvaluationResultIdentifier.EvaluationResultQualifier.ResourceId=i-* $resourceIdConfigRuleFilter$' +
                    '| head ' + TimelineConstants.MAX_COUNT +
                    '| rename EvaluationResultIdentifier.EvaluationResultQualifier.ResourceId as resourceId, account_id as accountId, EvaluationResultIdentifier.EvaluationResultQualifier.ConfigRuleName as rule' +
                    '| eval service="' + TimelineConstants.CONFIG_RULE_SERVICE + '", timestamp=floor(_time/60)*60' +
                    '| table accountId, region, resourceId, rule, service, timestamp',
            app: appName,
            autostart: false,
            preview: false,
            earliest_time: '$earliest$',
            latest_time: '$latest$'
        }, {tokens: true});

        var personalHealthSM = new SearchManager({
            id: `timeline_personal_health_search${new Date().getTime()}`,
            search: '`aws-sqs-sourcetype` AND BodyJson.source="aws.health" AND BodyJson.resources{}!="" AND BodyJson.detail.service=EC2' +
                    '| rename BodyJson.account as aws_account_id, BodyJson.region as region ' +
                    '| search $region$ $accountId$' +
                    '| mvexpand BodyJson.resources{} ' +
                    '| rename BodyJson.resources{} as resourceId ' +
                    '| search $resourceIdHealthFilter$' +
                    '| head ' + TimelineConstants.MAX_COUNT +
                    '| rex field=BodyJson.time "(?<date>.*?)T(?<time>.*?)Z" ' +
                    '| nomv BodyJson.detail.eventDescription{}.latestDescription ' +
                    '| rename aws_account_id as accountId, BodyJson.detail.eventDescription{}.latestDescription as details, BodyJson.detail.eventTypeCode as eventTypeCode, BodyJson.detail.eventTypeCategory as eventTypeCategory, BodyJson.detail.startTime as startTime, BodyJson.detail.endTime as endTime' +
                    '| dedup BodyJson.id sortby - time ' +
                    '| eval startTime=replace(startTime, "[TZ]", " "), endTime=replace(endTime, "[TZ]", " ")' +
                    '| eval service="' + TimelineConstants.PERSONAL_HEALTH_SERVICE + '", timestamp=floor(_time/60)*60' +
                    '| table accountId, region, resourceId, eventTypeCode, eventTypeCategory, details, startTime, endTime, service, timestamp',
            app: appName,
            autostart: false,
            preview: false,
            earliest_time: '$earliest$',
            latest_time: '$latest$'
        }, {tokens: true});

        var sqsSM = new SearchManager({
            id: `sqs${new Date().getTime()}`,
            search: '`aws-sqs-sourcetype` AND $resourceIdSQSFilter$ AND BodyJson.title=* AND BodyJson.description=* AND BodyJson.accountId=* AND BodyJson.region=*' +
                    '| rename BodyJson.accountId as aws_account_id, BodyJson.region as region ' +
                    '| search $region$ $accountId$' +
                    '| rename BodyJson.resourceId as resourceId, BodyJson.title as title, BodyJson.description as description, aws_account_id as accountId' +
                    '| eval service="' + TimelineConstants.SQS_CUSTOM_EVENTS + '", timestamp=floor(_time/60)*60' +
                    '| table accountId, region, resourceId, title, description, service, timestamp',
            app: appName,
            autostart: false,
            preview: false,
            earliest_time: '$earliest$',
            latest_time: '$latest$'
        }, {tokens: true});

        this.searchManagerMap = {
            [TimelineConstants.CONFIG_NOTIFICATION_SERVICE]: configSM,
            [TimelineConstants.INSPECTOR_SERVICE]: inspectorSM,
            [TimelineConstants.CLOUDTRAIL_SERVICE]: cloudtrailSM,
            [TimelineConstants.CONFIG_RULE_SERVICE]: rulesSM,
            [TimelineConstants.PERSONAL_HEALTH_SERVICE]: personalHealthSM,
            [TimelineConstants.SQS_CUSTOM_EVENTS]: sqsSM
        };

        var refreshResourceSPL = function() {
            var newType = tokenModel.get('resourceType'),
                accountId = tokenModel.get('accountId'),
                region = tokenModel.get('region'),
                spl = '';
            if(!_.isUndefined(newType) && !_.isUndefined(accountId) && !_.isUndefined(region)) {
                spl = _.template(TimelineConstants.RESOURCE_SPL_MAP[newType],{
                    accountId: accountId,
                    region: region
                });
            }

            tokenModel.set('resourceSPL', spl);
        };

        // listen to resourceType, to change the SPL of resource
        tokenModel.on('change:resourceType', (data) => {
            refreshResourceSPL();
        });
        tokenModel.on('change:accountId', (data) => {
            refreshResourceSPL();
        });
        tokenModel.on('change:region', (data) => {
            refreshResourceSPL();
        });

        refreshResourceSPL();
    };

    TimelineDataBuilder.prototype.build = function(){
        var resources = tokenModel.get('resources'),
            services = tokenModel.get('services');

        if (_.isUndefined(services) || _.isUndefined(resources)) {
            this.model.set('warningMessage', TimelineConstants.FILTER_NOT_EMPTY_WARNING);
            return;
        }

        // start loading
        this.model.set('loading', true);

        resources = resources.split(',');
        services = services.split(',');

        var searchManagerDfds = [],
            resourceType = tokenModel.get('resourceType');

        // 1. init search managers
        // 2. get Deferred object from search job
        services.forEach((service) => {
            switch (service) {
                case TimelineConstants.CONFIG_NOTIFICATION_SERVICE:
                    // set tokens
                    var filters = _.map(resources, resourceId => `configurationItem.resourceId=${resourceId}`);
                    tokenModel.set('resourceIdConfigFilter', 'configurationItem.resourceId=i-* (' + filters.join(' OR ') + ')')

                    // add deferred object
                    searchManagerDfds.push(this._getDfdFromSM(this.searchManagerMap[service]));
                    break;

                case TimelineConstants.CLOUDTRAIL_SERVICE:
                    // set tokens
                    if (resourceType === TimelineConstants.RESOURCE_TYPE_EC2) {
                        var filters = _.map(resources, resourceId => `requestParameters.instancesSet.items{}.instanceId=${resourceId} OR requestParameters.resourcesSet.items{}.resourceId=${resourceId} OR requestParameters.instanceId=${resourceId}`);
                        tokenModel.set('resourceIdCloudtrailFilter', '(requestParameters.instancesSet.items{}.instanceId=i-* OR requestParameters.resourcesSet.items{}.resourceId=i-* OR requestParameters.instanceId=i-*) AND (' + filters.join(' OR ') + ')');
                    }
                    else if (resourceType === TimelineConstants.RESOURCE_TYPE_CLB) {
                        var filters = _.map(resources, resourceId => {
                            var [elbName, accountId, region] = resourceId.split('#');

                            if (resourceId === '*') {
                                elbName = accountId = region = '*';
                            }

                            return `(requestParameters.loadBalancerName="${elbName}" AND aws_account_id=${accountId} AND region=${region})`;
                        });
                        tokenModel.set('resourceIdCloudtrailFilter', 'requestParameters.loadBalancerName=* AND (' + filters.join(' OR ') + ')');
                    }
                    else if (resourceType === TimelineConstants.RESOURCE_TYPE_ALB) {
                        var filters = _.map(resources, resourceId => {
                            var [elbName, accountId, region] = resourceId.split('#');

                            if (resourceId === '*') {
                                elbName = accountId = region = '*';
                            }

                            return `((requestParameters.description="ELB app/${elbName}/*" OR requestParameters.loadBalancerArn="*/app/${elbName}/*" OR requestParameters.name="${elbName}") AND aws_account_id=${accountId} AND region=${region})`;
                        });
                        tokenModel.set('resourceIdCloudtrailFilter', '(requestParameters.description="ELB app/*" OR requestParameters.loadBalancerArn="*/app/*" OR requestParameters.name=*) AND (' + filters.join(' OR ') + ')');
                    }
                    else if (resourceType === TimelineConstants.RESOURCE_TYPE_NACL) {
                        var filters = _.map(resources, resourceId => `requestParameters.resourcesSet.items{}.resourceId=${resourceId} OR requestParameters.networkAclId=${resourceId}`);
                        tokenModel.set('resourceIdCloudtrailFilter', '(requestParameters.resourcesSet.items{}.resourceId=acl-* OR requestParameters.networkAclId=acl-*) AND (' + filters.join(' OR ') + ')');
                    }
                    else if (resourceType === TimelineConstants.RESOURCE_TYPE_SG) {
                        var filters = _.map(resources, resourceId => `requestParameters.groupId=${resourceId}`);
                        tokenModel.set('resourceIdCloudtrailFilter', 'requestParameters.groupId=sg-* AND (' + filters.join(' OR ') + ')');
                    }
                    else if (resourceType === TimelineConstants.RESOURCE_TYPE_KP) {
                        var filters = _.map(resources, resourceId => {
                            var [keyName, accountId, region] = resourceId.split('#');

                            if (resourceId === '*') {
                                keyName = accountId = region = '*';
                            }

                            return `(requestParameters.keyName="${keyName}" AND aws_account_id=${accountId} AND region=${region})`;
                        });

                        tokenModel.set('resourceIdCloudtrailFilter', 'eventName=*KeyPair AND requestParameters.keyName=* AND (' + filters.join(' OR ') + ')');
                    }
                    else if (resourceType === TimelineConstants.RESOURCE_TYPE_IAM_USER) {
                        var filters = _.map(resources, resourceId => `userIdentity.arn=${resourceId}`);
                        tokenModel.set('resourceIdCloudtrailFilter', filters.join(' OR '));
                    }

                    // add deferred object
                    searchManagerDfds.push(this._getDfdFromSM(this.searchManagerMap[service]));
                    break;

                case TimelineConstants.INSPECTOR_SERVICE:
                    // set tokens
                    var filters = _.map(resources, resourceId => `assetAttributes.agentId=${resourceId}`);
                    tokenModel.set('resourceIdInspectorFilter', '(' + filters.join(' OR ') + ')')

                    // add deferred object
                    searchManagerDfds.push(this._getDfdFromSM(this.searchManagerMap[service]));
                    break;

                case TimelineConstants.CONFIG_RULE_SERVICE:
                    // set tokens
                    var filters = _.map(resources, resourceId => `EvaluationResultIdentifier.EvaluationResultQualifier.ResourceId=${resourceId}`);
                    tokenModel.set('resourceIdConfigRuleFilter', '(' + filters.join(' OR ') + ')')

                    // add deferred object
                    searchManagerDfds.push(this._getDfdFromSM(this.searchManagerMap[service]));
                    break;

                case TimelineConstants.PERSONAL_HEALTH_SERVICE:
                    // set tokens
                    var filters = _.map(resources, resourceId => `resourceId=${resourceId}`);
                    tokenModel.set('resourceIdHealthFilter', '(' + filters.join(' OR ') + ')')

                    // add deferred object
                    searchManagerDfds.push(this._getDfdFromSM(this.searchManagerMap[service]));
                    break;

                case TimelineConstants.SQS_CUSTOM_EVENTS:
                    // set tokens
                    var filters = _.map(resources, resourceId => `BodyJson.resourceId=${resourceId}`);
                    tokenModel.set('resourceIdSQSFilter', '(' + filters.join(' OR ') + ')')

                    // add deferred object
                    searchManagerDfds.push(this._getDfdFromSM(this.searchManagerMap[service]));
                    break;
            }
        });

        // start search
        services.forEach((service) => {
            this.searchManagerMap[service].startSearch();
        });

        var events = [];

        // waiting for dfds
        $.when(...searchManagerDfds).then((...results) => {
            results.forEach((serviceResults) => {
                events = [...events, ...serviceResults];
            });

            // set size limit of result array
            events = events.slice(0, TimelineConstants.MAX_COUNT);

            this.model.set('loading', false);

            // make events always change to trigger rendering
            this.model.unset('events', {silent: true});
            this.model.set('events', events);
        });
    };

    TimelineDataBuilder.prototype._getDfdFromSM = function(sm) {
        var dfd = $.Deferred();

        sm.on('search:done', (properties) => {
            if(properties.content.resultCount === 0){
                dfd.resolve([]);
            }
            else{
                var resultModel = sm.data('results',{
                    output_mode: 'json',
                    count: 0
                });
                resultModel.once('data', () => {
                    dfd.resolve(this._formatSplResults(resultModel.data().results));
                });
            };
        });

        return dfd;
    };

    TimelineDataBuilder.prototype._formatSplResults = function(splResults){
        var formatResults = [];

        for (var i = 0; i < splResults.length; i++) {
            var splResult = splResults[i],
                service = splResult.service;

            // convert timestamp to date
            splResult.date = new Date(parseInt(splResult.timestamp) * 1000);

            // build data for config notification
            if (service === TimelineConstants.CONFIG_NOTIFICATION_SERVICE) {
                splResult.changeProperties = JSON.parse(splResult.changeProperties);

                // filter by white list
                var whiteList = TimelineConstants.CHANGE_PROPERTIES_WHITE_LIST[service];

                for (var attribute in whiteList) {
                    if (!_.isUndefined(splResult.changeProperties[attribute])) {
                        formatResults.push(splResult);
                        break;
                    }
                }
            }

            // build data for cloudtrail
            else if (service === TimelineConstants.CLOUDTRAIL_SERVICE) {
                var propArr = splResult.changeProperties.split(','),
                    userIdentity = JSON.parse(splResult.userIdentity),
                    requestParameters = splResult['requestParameters'];

                // stringify and format this JSON string, in order to gain a better look
                if (requestParameters) {
                    requestParameters = JSON.stringify(JSON.parse(requestParameters), null, 2);
                }

                splResult.changeProperties = {
                    eventType: propArr[0],
                    eventSource: propArr[1],
                    sourceIP: propArr[2],
                    userAgent: propArr[3],
                    requestParameters: requestParameters
                };

                var resourceId = splResult.resourceId,
                    resourceIds = splResult.resourceIds,
                    elbName = splResult.elbName,
                    validResourceIds = [],
                    resourceType = tokenModel.get('resourceType');

                // filter resourceIds (via instances token)
                if (!_.isUndefined(resourceIds)) {
                    if (!_.isArray(resourceIds)) {
                        resourceIds = [resourceIds];
                    }

                    var resourceTokens = tokenModel.get('form.resources');

                    resourceIds.forEach((resourceId) => {
                        if (_.isEqual(resourceTokens, ['*']) || resourceTokens.indexOf(resourceId) !== -1) {
                            validResourceIds.push(resourceId);
                        }
                    });
                }

                if (!_.isUndefined(resourceId)) {
                    validResourceIds.push(resourceId);
                }

                if (!_.isUndefined(elbName)) {
                    validResourceIds.push(elbName);
                }

                if (resourceType === TimelineConstants.RESOURCE_TYPE_IAM_USER) {
                    validResourceIds.push(splResult.userArn);
                    splResult['userName'] = `${userIdentity.userName} (${userIdentity.accountId})`;
                }

                validResourceIds.forEach((resourceId) => {
                    formatResults.push($.extend({resourceId: resourceId}, splResult));
                });
            }

            // build data for inspector
            else if (service === TimelineConstants.INSPECTOR_SERVICE) {
                splResult.changeProperties = {
                    severity: splResult.severity,
                    rules_package: splResult.rules_package,
                    rule: splResult.rule,
                    finding: splResult.finding
                };
                formatResults.push(splResult);
            }

            // build data for config rules
            else if (service === TimelineConstants.CONFIG_RULE_SERVICE) {
                splResult.changeProperties = {
                    rule: splResult.rule
                };
                formatResults.push(splResult);
            }

            // build data for personal heath
            else if (service === TimelineConstants.PERSONAL_HEALTH_SERVICE) {
                splResult.changeProperties = {
                    eventTypeCode: splResult.eventTypeCode,
                    eventTypeCategory: splResult.eventTypeCategory,
                    details: splResult.details,
                    status: `${!_.isUndefined(splResult.endTime)? 'Resolved':(splResult.eventTypeCategory==='issue'? 'Error':'Warnings')}`,
                    timeRange: `${splResult.startTime} ~ ${_.isUndefined(splResult.endTime)? 'N/A':`${splResult.endTime}`}`
                };
                formatResults.push(splResult);
            }

            // build data for sqs custom events
            else if (service === TimelineConstants.SQS_CUSTOM_EVENTS) {
                splResult.changeProperties = {
                    description: splResult.description
                };
                formatResults.push(splResult);
            }
        }

        return formatResults;
    };

    return TimelineDataBuilder;
});