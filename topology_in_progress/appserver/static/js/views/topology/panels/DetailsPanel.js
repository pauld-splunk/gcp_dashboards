define([
    'underscore',
    'jquery',
    'backbone',
    'app/libs/d3.min',
    'splunkjs/mvc',
    'splunkjs/mvc/simplesplunkview',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/simplexml/element/chart',
    'app/views/topology/TopologyConfig',
    'app/views/dashboard/MessageView',
    'app/views/recommendation/RecommendationDetails',
    'bootstrap.tab'
], (_, $, Backbone, d3, mvc, SimpleSplunkView, SearchManager, ChartElement, TopologyConfig, MessageView, RecommendationDetails) => {
    'use strict';

    let tokenModel = mvc.Components.getInstance('default'), appName = TopologyConfig.context.appName;

    const SHOW_DETAILS = 'Show Details', CLOSE_DETAILS = 'Close Details';

    const ALB_RESOURCE_TYPE = 'AWS::ElasticLoadBalancingV2::LoadBalancer';

    const TITLE_WORD_COUNT = 45;

    const SEARCH_DEFAULT = {
        'status_buckets': 0,
        'earliest_time': '0',
        'latest_time': 'now',
        'app': appName,
        'auto_cancel': 90,
        'runWhenTimeIsUndefined': false,
        'autostart': false
    };

    const CHART_DEFAULT = {
        'charting.chart': 'line',
        'charting.axisY2.enabled': '0',
        'charting.axisTitleY.visibility': 'collapsed',
        'charting.chart.nullValueMode': 'connect',
        'charting.chart.bubbleSizeBy': 'area',
        'charting.layout.splitSeries': '0',
        'charting.drilldown': 'all',
        'charting.legend.placement': 'none',
        'charting.chart.sliceCollapsingThreshold': '0.01',
        'charting.chart.bubbleMinimumSize': '10',
        'charting.chart.style': 'shiny',
        'charting.axisTitleX.visibility': 'collapsed',
        'charting.axisY.scale': 'linear',
        'charting.chart.bubbleMaximumSize': '50',
        'charting.axisLabelsX.majorLabelStyle.overflowMode': 'ellipsisNone',
        'charting.axisLabelsX.majorLabelStyle.rotation': '0',
        'charting.axisY2.scale': 'inherit',
        'charting.legend.labelStyle.overflowMode': 'ellipsisMiddle',
        'charting.chart.stackMode': 'default',
        'resizable': false,
        'charting.axisTitleY2.visibility': 'collapsed',
        'charting.chart.nullValueMode': 'gaps',
        'height': 180
    };

    const DETAILED_METRICS = {
        usage: {
            search: {
                id: 'usageSearch',
                search: '$usageQuery$',
                earliest_time: '-1mon'
            },
            chart: {
                id: 'usageChart',
                managerid: 'usageSearch',
                el: $('#usage-chart')
            },
            title: {
                i: 'Average CPU Utilization (%)',
                vol: 'Average IOPS'
            }
        },
        activity: {
            search: {
                id: 'activitySearch',
                search: '$activityQuery$',
                earliest_time: '-1mon'
            },
            chart: {
                'id': 'activityChart',
                'charting.chart': 'column',
                'charting.chart.stackMode': 'stacked',
                'managerid': 'activitySearch',
                'el': $('#activity-chart')
            },
            title: {
                vpc: 'VPC Activities',
                i: 'Instance Activities',
                subnet: 'Subnet Activities',
                vol: 'Storage Volume Activities'
            }
        },
        vpcFlow: {
            search: {
                id: 'vpcFlowSearch',
                search: '$vpcFlowQuery$',
                earliest_time: '-1d'
            },
            chart: {
                id: 'vpcFlowChart',
                managerid: 'vpcFlowSearch',
                el: $('#vpcFlow-chart')
            },
            //title: {
            //    eni: 'Traffic Size by Network Interface (MB)',
            //    i: 'Traffic Size by EC2 (MB)'
            //}
            title: {
                nic: 'Traffic Size by Network Interface (MB)',
                i: 'Traffic Size by EC2 (MB)'
            }
        },
        billing: {
            search: {
                id: 'billingSearch',
                search: '$billingQuery$',
                earliest_time: '-mon@mon',
                latest_time: '@mon'
            },
            chart: {
                id: 'billingChart',
                managerid: 'billingSearch',
                el: $('#billing-chart')
            },
            title: {
                i: 'Total Cost - Last Month',
                vol: 'Total Cost - Last Month'
            }
        },
        latency: {
            search: {
                id: 'latencySearch',
                search: '$latencyQuery$',
                earliest_time: '-7d'
            },
            chart: {
                id: 'latencyChart',
                managerid: 'latencySearch',
                el: $('#latency-chart')
            },
            title: {
                elb: 'Latency Over Time (ms)',
                alb: 'Target Response Time (ms)'
            }
        },
        request: {
            search: {
                id: 'requestSearch',
                search: '$requestQuery$',
                earliest_time: '-7d'
            },
            chart: {
                id: 'requestChart',
                managerid: 'requestSearch',
                el: $('#request-chart')
            },
            title: {
                elb: 'Requests Over Time',
                alb: 'Requests Over Time'
            }
        }
    };

    const MAX_RESULT_COUNT = 1000000;

    let DetailsPanel = SimpleSplunkView.extend({

        events: {
            'click .details-title > .close': 'onClose',
            'click .nav a': 'onTab',
            'click #recomm-action': 'onAction',
            'click #recomm-ignore': 'onIgnore',
            'click #inspector-detail-btn': 'onInspectorDetailsClicked',
            'click #config-rule-detail-btn': 'onConfigRuleDetailsClicked'
        },

        initialize(params) {
            SimpleSplunkView.prototype.initialize.apply(this, arguments);

            this.output_mode = 'json';
            this.options = {data: 'results'};
            this.config = TopologyConfig.detailsPanelConfig;
            this.model = new Backbone.Model();
            this.model.viewModel = params.viewModel;
            this.searches = [];

            this.template = '\
                <div class="details-title"> \
                    <a href="#" target="_blank"></a> \
                    <button class="close" type="button">×</button> \
                </div> \
                <div id="details-content"> \
                    <ul class="nav nav-pills nav-stacked"> \
                        <li id="recommendTab"> \
                            <a data-toggle="tab" href="#recommendChart"> \
                                Insights \
                            </a> \
                        </li> \
                        <li id="briefTab" class="active"> \
                            <a data-toggle="tab" href="#briefChart"> \
                                Brief \
                            </a> \
                        </li> \
                        <li id="relationshipTab"> \
                            <a data-toggle="tab" href="#relationshipChart"> \
                                Relationship \
                            </a> \
                        </li> \
                        <li id="targetGroupsTab"> \
                            <a data-toggle="tab" href="#targetGroupsTable"> \
                                Target Groups \
                            </a> \
                        </li> \
                        <li id="inboundTab"> \
                            <a data-toggle="tab" href="#inboundPolicyChart"> \
                                Inbound Policy \
                            </a> \
                        </li> \
                        <li id="outboundTab"> \
                            <a data-toggle="tab" href="#outboundPolicyChart"> \
                                Outbound Policy \
                            </a> \
                        </li> \
                        <li id="usageTab"> \
                            <a data-toggle="tab" href="#usage-panel" data-search="usageSearch"> \
                                Usage \
                            </a> \
                        </li> \
                        <li id="activityTab"> \
                            <a data-toggle="tab" href="#activity-panel" data-search="activitySearch"> \
                                Activity \
                            </a> \
                        </li> \
                        <li id="vpcFlowTab"> \
                            <a data-toggle="tab" href="#vpcFlow-panel" data-search="vpcFlowSearch"> \
                                VPC Flow \
                            </a> \
                        </li> \
                        <li id="billingTab"> \
                            <a data-toggle="tab" href="#billing-panel" data-search="billingSearch"> \
                                Billing \
                            </a> \
                        </li> \
                        <!-- Remove \
                        <li id="rulesTab"> \
                            <a data-toggle="tab" href="#rulesChart"> \
                                Amazon Inspector & Config Rules \
                            </a> \
                        </li> \
                        --> \
                        <li id="latencyTab"> \
                            <a data-toggle="tab" href="#latency-panel" data-search="latencySearch"> \
                                Latency \
                            </a> \
                        </li> \
                        <li id="requestTab"> \
                            <a data-toggle="tab" href="#request-panel" data-search="requestSearch"> \
                                Request Count \
                            </a> \
                        </li> \
                    </ul> \
                    <div class="tab-content"> \
                        <div class="tab-pane" id="recommendChart"> \
                            <div id="resource-recommed-container"> \
                                <div id="resource-recommendation"></div> \
                            </div> \
                            <div id="resource-recommendation-control"> \
                                <a id="recomm-ignore" href="#" class="btn">Ignore</a> \
                                <a id="recomm-action" href="#" class="btn btn-primary">Accept</a> \
                            </div> \
                        </div> \
                        <div class="tab-pane active" id="briefChart"> \
                            <div id="resource-brief"> \
                                <div id="resource-kpis" class="single-values-tooltip"></div> \
                                <div id="resource-detail"> \
                                </div> \
                            </div> \
                        </div> \
                        <div class="tab-pane" id="relationshipChart"> \
                            <div id="topology-relationships"></div> \
                        </div> \
                        <div class="tab-pane" id="targetGroupsTable"> \
                        </div> \
                        <div class="tab-pane" id="inboundPolicyChart"> \
                            <div id="sg-inbound"></div> \
                        </div> \
                        <div class="tab-pane" id="outboundPolicyChart"> \
                            <div id="sg-outbound"></div> \
                        </div> \
                        <div class="tab-pane" id="usage-panel"> \
                            <div class="panel-title"></div> \
                            <div id="usage-chart"></div> \
                        </div> \
                        <div class="tab-pane" id="activity-panel"> \
                            <div class="panel-title"></div> \
                            <div id="activity-chart"></div> \
                        </div> \
                        <div class="tab-pane" id="vpcFlow-panel"> \
                            <div class="panel-title"></div> \
                            <div id="vpcFlow-chart"></div> \
                        </div> \
                        <div class="tab-pane" id="billing-panel"> \
                            <div class="panel-title"></div> \
                            <div id="billing-chart"></div> \
                        </div> \
                        <div class="tab-pane" id="rulesChart"></div> \
                        <div class="tab-pane" id="latency-panel"> \
                            <div class="panel-title"></div> \
                            <div id="latency-chart"></div> \
                        </div> \
                        <div class="tab-pane" id="request-panel"> \
                            <div class="panel-title"></div> \
                            <div id="request-chart"></div> \
                        </div> \
                    </div> \
                </div> \
            ';
            this.briefTemplate = '\
                <table> \
                    <% if(node.type === "policy") { %> \
                         <% if(node.id.indexOf("arn:") === 0){ %> \
                             <tr><th>ARN: </th><td><%-node.id%></td></tr> \
                        <% } \
                    } else if(node.arn && (node.type === "user" || node.type === "group")) {%> \
                        <tr><th>ARN: </th><td><%-node.arn%></td></tr> \
                    <% } else if (prefix !== "elb") {%> \
                        <tr><th>ID: </th><td><%-node.id%></td></tr> \
                    <% } %> \
                    <tr><th>Name: </th><td><%-node.name%></td></tr> \
                    <% if(node.type === "policy"){ %> \
                        <% if(node.id.indexOf("arn:") === 0){ %> \
                            <tr><th>Type: </th><td><%-resourceTypeToName[node.resourceType]%> (Attached Policy)</td></tr> \
                        <% } else { %> \
                            <tr><th>Type: </th><td><%-resourceTypeToName[node.resourceType]%> (Inline Policy)</td></tr> \
                        <% } \
                    } else { %> \
                        <tr><th>Type: </th><td><%-resourceTypeToName[node.resourceType]%></td></tr> \
                    <% } %> \
                    <% if(node.type !== "policy"){ %> \
                        <tr><th>Account ID: </th><td><%-node.accountId%></td></tr> \
                        <% if(node.type !== "user" && node.type !== "group"){ %> \
                            <tr><th>Region: </th><td><%-node.resourceRegion%></td></tr> \
                        <% } %> \
                    <% } %> \
                    <% if (node.state) { %> \
                        <tr><th>Status: </th><td><%-node.state%></td></tr> \
                    <% } %> \
                    <% if (node.instanceType) { %> \
                        <tr><th>Instance Type: </th><td><%-node.instanceType%></td></tr> \
                    <% } %> \
                    <% if (node.publicIp) { %> \
                        <tr><th>Public IP: </th><td><%-node.publicIp%></td></tr> \
                    <% } %> \
                    <% if (node.privateIp) { %> \
                        <tr><th>Private IP: </th><td><%-node.privateIp%></td></tr> \
                     <% } %> \
                    <% if (tags) { %> \
                        <tr><th>Tags: </th><td><table id="tag-table"><tr><th>Key</th><th>Value</th></tr> \
                        <% for (var i=0; i<tags.length; i++) { %> \
                            <% var tag = tags[i], tagArr = tag.split(","); %> \
                            <% if (tagArr.length === 2) { %> \
                                <tr><td><%-tagArr[0]%></td><td><%-tagArr[1]%></td></tr> \
                            <% } %> \
                        <% } %> \
                    </table></td></tr> \
                    <% } %> \
                </table> \
            ';
            this.relationshipTemplate = '\
                <h3>Relationships</h3> \
                <div> \
                <% for(var type in templateData) { %> \
                    <% var relationList=templateData[type].relations.sort((a, b) => (a.name > b.name ? 1 : -1)); %> \
                    <p> <%-type%> : </p> \
                    <ul class="<%-templateData[type].prefix%>"> \
                    <% for(var i=0;i<relationList.length;i++){ %> \
                        <% var classNames = (templateData[type].prefix==="i" ? elbInstanceStates[relationList[i].id] : "") + " clickable"; %> \
                        <li class="<%-classNames%>" resourceId="<%-relationList[i].id%>"><%-relationList[i].name%></li> \
                    <% } %> \
                    </ul> \
                <% } %> \
                </div> \
            ';
            this.instanceKPITemplate = '\
                <div class="cpu-kpi">\
                    <div class="kpi-title">CPU Utilization</div>\
                    <div class="kpi-value"><%-cpu%></div>\
                </div>\
                <div class="io-ops-kpi">\
                    <div class="kpi-title">Disk IOPS</div>\
                    <div class="kpi-value"><%-disk%></div>\
                </div>\
                <div class="network-traffic-kpi">\
                    <div class="kpi-title">Network Traffic Size</div>\
                    <div class="kpi-value"><%-network%></div>\
                </div>\
                <div class="billing-kpi">\
                    <div class="kpi-title">Cost - Last Month</div>\
                    <div class="kpi-value"><%-billing%></div>\
                </div>\
            ';
            this.volumeKPITemplate = '\
                <div class="vol-ops-kpi">\
                    <div class="kpi-title">Volume IOPS</div>\
                    <div class="kpi-value"><%-vol%></div>\
                </div>\
                <div class="vol-traffic-kpi">\
                    <div class="kpi-title">Volume IO Size</div>\
                    <div class="kpi-value"><%-vol_traffic%></div>\
                </div>\
                <div class="vol-billing-kpi">\
                    <div class="kpi-title">Cost - Last Month</div>\
                    <div class="kpi-value"><%-billing%></div>\
                </div>\
            ';
            this.rulesTemplate = '\
                <div class="rules-header">Amazon Inspector</div> \
                <div class="inspector-high-count"> \
                    <label>High</label> \
                    <span><%-High%></span> \
                </div> \
                <div class="inspector-medium-count"> \
                    <label>Medium</label> \
                    <span><%-Medium%></span> \
                </div> \
                <div class="inspector-low-count"> \
                    <label>Low</label> \
                    <span><%-Low%></span> \
                </div> \
                <div class="inspector-informational-count"> \
                    <label>Informational</label> \
                    <span><%-Informational%></span> \
                    <% if((High + Medium + Low + Informational) > 0){ %> \
                        <div id="inspector-detail-btn"><%-btnText%></div> \
                    <% } %> \
                </div> \
                <table id="inspector-table"> \
                    <tr> \
                        <th>Severity</th> \
                        <th>Finding</th> \
                    </tr> \
                </table> \
                <div class="rules-header">Config Rules</div> \
                <div class="config-rule-non-compliant-count"> \
                    <label>Non-compliant</label> \
                    <span><%-NON_COMPLIANT%></span> \
                </div> \
                <div class="config-rule-compliant-count"> \
                    <label>Compliant</label> \
                    <span><%-COMPLIANT%></span> \
                    <% if((COMPLIANT + NON_COMPLIANT) > 0){ %> \
                        <div id="config-rule-detail-btn"><%-btnText%></div> \
                    <% } %> \
                </div> \
                <table id="config-rule-table"> \
                    <tr> \
                        <th>Compliance</th> \
                        <th>Rule Name</th> \
                    </tr> \
                </table> \
            ';
            this.policyTemplate = '\
                <table class="policy-table"> \
                    <tr> \
                        <th>Protocol</th> \
                        <th>Port Range</th> \
                        <th><%-directionLegend%><th> \
                    </tr> \
                    <% for (var i = 0; i < policyList.length; i++) { %> \
                        <% var policy = policyList[i]; %> \
                    <tr> \
                        <td><%-(policy.protocol === "-1" ? "All" : policy.protocol.toUpperCase())%></td> \
                        <% var from_port = policy.from_port, to_port = policy.to_port, port = from_port + " - " + to_port; %> \
                        <% if (from_port === "-1") { port = "N/A"; } else if (from_port === null) { port = "All"; } else if (from_port === to_port) { port = from_port; } %> \
                        <td><%-port%></td> \
                        <td> \
                        <% var grants = policy.grants; %> \
                        <% for (var j = 0; j < grants.length; j++) { %> \
                            <% var grant = grants[j]; %> \
                            <p><%-(grant.cidr_ip === null ? grant.group_id : grant.cidr_ip)%></p> \
                        <% } %> \
                        </td> \
                    </tr> \
                    <% } %> \
                </table> \
            ';
            this.targetGroupsTemplate = '\
                <table> \
                    <tr> \
                        <th>Name</th> \
                        <th>Port</th> \
                        <th>Protocol</th> \
                        <th>Targets</th> \
                    </tr> \
                    <% for (var i = 0; i < targetGroupList.length; i++) { %> \
                        <% var targetGroup = targetGroupList[i]; %> \
                    <tr> \
                        <td valign="top"><%-targetGroup["TargetGroupName"]%></td> \
                        <td valign="top"><%-targetGroup["Port"]%></td> \
                        <td valign="top"><%-targetGroup["Protocol"]%></td> \
                        <td> \
                        <% if (targetGroup["TargetHealthDescriptions"].length === 0) { %> \
                            <span>N/A</span> \
                        <% } else { %> \
                            <% for (var j = 0; j < targetGroup["TargetHealthDescriptions"].length; j++) { %> \
                                <% var targetHealth = targetGroup["TargetHealthDescriptions"][j]; %> \
                                <a class="clickable <%-(targetHealth[\"TargetHealth\"][\"State\"] === \"healthy\" ? \"healthy\" : \"unhealthy\")%>" resourceId="<%-targetHealth[\"Target\"][\"Id\"]%>"> <%-targetHealth["Target"]["Id"]%> </a> \
                            <% } %> \
                        <% } %> \
                        </td> \
                    </tr> \
                    <% } %> \
                </table> \
            ';

            for (let key in DETAILED_METRICS) {
                let item = DETAILED_METRICS[key];

                let params = {};
                _.extend(params, SEARCH_DEFAULT, item.search);
                let sm = new SearchManager(params, {tokens: true});
                sm.set('started', false);
                this.searches.push(sm);
            }

            this.listenTo(this.model.viewModel, 'change:selected', (model, value) => {
                this.searches.forEach(search => search.set('started', false));
                if (!value) {
                    this.onClose();
                    return;
                }
                this.render();
            });
        },

        createView() {
            this.$el.html(_.template(this.template));

            for (let key in DETAILED_METRICS) {
                let item = DETAILED_METRICS[key];

                let params = {};
                _.extend(params, CHART_DEFAULT, item.chart);
                params.el = $(`#${key}-chart`);
                new ChartElement(params).render();
            }

            // when clicking items on relationship tab, it will move to the corresponding area of topology
            this.$el.on('click', '#topology-relationships li.clickable, #targetGroupsTable a.clickable', (evt) => {
                this.model.viewModel.set('selected', {
                    id: $(evt.target).attr('resourceId'),
                    focus: true
                });
            });

            return {container: this.$el};
        },

        formatData(data) {
            let selected = this.model.viewModel.get('selected');

            if (!selected || !selected.id) {
                return {};
            }

            let id = selected.id,
                templateData = {},
                elbInstanceStates = {},
                hash = {},
                nodes = this.config.nodes,
                recommendation = selected.recommendation,
                node = TopologyConfig.nodeData[id];
            
            let prefix = prefix = TopologyConfig.resourceTypeToPrefix[node["resourceType"]];

            if (!node) {
                MessageView.setMessage('selectnode', `Cannot find Resource ${selected.id}`);
                this.model.viewModel.set('selected', null);
                return {};
            } else {
                MessageView.unsetMessage('selectnode');
            }

            // for IAM policy relationships
            let attachedPoliciesMap = {};
            let inlinePoliciesMap = {};

            data.forEach ((datum) => {
                let {relationships, attachedPolicies, userPolicies, groupPolicies} = datum;

                if (_.isUndefined(relationships) && _.isUndefined(attachedPolicies) && _.isUndefined(userPolicies) && _.isUndefined(groupPolicies)) {
                    return;
                }

                if (!_.isUndefined(relationships)) {
                    if (!_.isArray(relationships)) {
                        relationships = relationships.split('\n');
                    }

                    relationships.forEach((relationship) => {
                        let relationship_target = relationship.split(",")[0];

                        if (datum.resourceId === id || relationship_target === id) {
                            let targetNode;

                            if (datum.resourceId === id) {
                                targetNode = nodes[relationship_target];
                            } else {
                                targetNode = nodes[datum.resourceId];
                            }

                            if (!_.isUndefined(targetNode) && _.isUndefined(hash[targetNode.id])) {
                                let typeName = TopologyConfig.resourceTypeToName[targetNode.resourceType];

                                if (!_.isUndefined(typeName)) {
                                    let name = (targetNode.name === targetNode.id || targetNode.type === 'elb' ? targetNode.id : `${targetNode.id} (${targetNode.name})`);

                                    if(targetNode.type==='user' || targetNode.type==='group' || targetNode.resourceType === ALB_RESOURCE_TYPE){
                                        name = targetNode.name;
                                    }
                                    if (_.isUndefined(templateData[typeName])) {
                                        templateData[typeName] = {
                                            relations: [{
                                                name: name,
                                                id: targetNode.id
                                            }],
                                            prefix: targetNode.type
                                        };
                                    } else {
                                        templateData[typeName].relations.push({
                                            name: name,
                                            id: targetNode.id
                                        });
                                    }
                                    elbInstanceStates[targetNode.id] = relationship.split(',')[1];
                                    hash[targetNode.id] = targetNode.id;
                                }
                            }
                        }
                    });
                }

                if (datum.resourceId === id){
                    // attached policies
                    if(!_.isUndefined(attachedPolicies)){
                        if (!_.isArray(attachedPolicies)) {
                            attachedPolicies = attachedPolicies.split('\n');
                        }
                        for(let j=0;j<attachedPolicies.length; j++) {
                            let policy = attachedPolicies[j];
                            attachedPoliciesMap[policy.split(',')[0]] = policy.split(',')[1];
                        }
                    }
                    // inline policies
                    if(!_.isUndefined(userPolicies) || !_.isUndefined(groupPolicies)){
                        let inlinePolicies = userPolicies || groupPolicies;
                        if (!_.isArray(inlinePolicies)) {
                            inlinePolicies = inlinePolicies.split('\n');
                        }
                        for(let j=0; j<inlinePolicies.length; j++) {
                            let policy = inlinePolicies[j];
                            inlinePoliciesMap[`policy-${datum.resourceId}-${policy.split(',')[0]}`] = policy.split(',')[0];
                        }
                    }
                }
            });

            for(let arn in attachedPoliciesMap){
                if(_.isUndefined(templateData['Attached Policy'])){
                    templateData['Attached Policy'] = {
                        relations: [{
                            id: arn,
                            name: attachedPoliciesMap[arn]
                        }],
                        prefix: 'attached_policy'
                    };
                } else{
                    templateData['Attached Policy'].relations.push({
                        id: arn,
                        name: attachedPoliciesMap[arn]
                    });
                }
            }
            for(let policyID in inlinePoliciesMap){
                if(_.isUndefined(templateData['Inline Policy'])){
                    templateData['Inline Policy'] = {
                        relations: [{
                            id: policyID,
                            name: inlinePoliciesMap[policyID]
                        }],
                        prefix: 'inline_policy'
                    };
                } else{
                    templateData['Inline Policy'].relations.push({
                        id: policyID,
                        name: inlinePoliciesMap[policyID]
                    });
                }
            }

            let tabs = [],
                idForQuery = id;

            // for ELB
            if (this._isELB(id)) {
                if (node.resourceType === ALB_RESOURCE_TYPE) {
                    prefix = 'alb';

                    let idRegex = new RegExp('^arn:aws:elasticloadbalancing:\\S+:\\d*:loadbalancer/(app/\\S+/\\S+)', 'g'),
                        regexResult = idRegex.exec(id);

                    if (regexResult && regexResult.length === 2) {
                        idForQuery = regexResult[1];
                    }
                }
                else {
                    idForQuery = node.name;
                    prefix = 'elb';
                }
            }

            // check if it is sg, add policy tabs
            if (prefix === 'sg') {
                tabs.push($('#inboundTab'));
                tabs.push($('#outboundTab'));
            }

            // for usage, activity, and billing, elb latency, and elb request, the processes are the same
            // 1. find the tpl, 2. set the token, and 3. show the tab.
            ['usage', 'activity', 'billing', 'latency', 'request'].forEach(type => {
                // usageQuery, activityQuery, billingQuery, latencyQuery, requestQuery
                
                let queryName = `${type}Query`;
                let tpl = this.config[queryName][prefix];
                if (tpl) {
                    let query = tpl.format(idForQuery);
                    tokenModel.set(queryName, query);

                    // usageTab, activityTab, billingTab
                    tabs.push($(`#${type}Tab`));
                }
            });

            // vpcFlow is a different story.
            let vpcFlowQueryTpl = this.config.vpcFlowQuery[prefix];
            if (vpcFlowQueryTpl) {
                if (prefix === 'nic'){
                    let vpcFlowQuery = vpcFlowQueryTpl.format(idForQuery);
                    tokenModel.set('vpcFlowQuery', vpcFlowQuery);
                } else if(prefix === 'i'){
                    let node = this.config.nodes[id],
                        nicSearch = '';
                    if(node && node.nics.length > 0){
                        for(let i=0; i<node.nics.length; i++){
                            let nic = node.nics[i];
                            nicSearch += `OR interface_id="${nic}" `;
                        }
                        nicSearch = nicSearch.substr(2);
                        let vpcFlowQuery = vpcFlowQueryTpl.format(nicSearch);
                        tokenModel.set('vpcFlowQuery', vpcFlowQuery);
                    }
                }
                tabs.push($('#vpcFlowTab'));
            }
            
            let kpi = {
                cpu: (_.isUndefined(node.cpu) ? 'N/A': parseFloat(node.cpu).toFixed(2) + '%'),
                disk: (_.isUndefined(node.disk) ? 'N/A': parseFloat(node.disk / 86400).toFixed(2)),
                network: (_.isUndefined(node.network) ? 'N/A': this._convertTraffcSize(parseInt(node.network))),
                vol: (_.isUndefined(node.vol) ? 'N/A' : parseFloat(node.vol / 86400).toFixed(2)),
                vol_traffic: (_.isUndefined(node.vol_traffic) ? 'N/A': this._convertTraffcSize(parseInt(node.vol_traffic))),
                billing: (_.isUndefined(node.billing) ? 'N/A': d3.format(',')(parseInt(node.billing))),
                inspector: node.inspector,
                config_rule: node.config_rule
            };

            return {templateData: templateData, elbInstanceStates: elbInstanceStates, tabs: tabs, node: node, kpi: kpi, recommendation: recommendation, prefix: prefix};
        },

        updateView(viz, data) {
            let {templateData, elbInstanceStates, node, recommendation, prefix} = data;

            let id = node.id,
                drilldownLinks = this.config.drilldownLinks;

            let drilldownTitle = recommendation ? `${recommendation.get('ml_action')} ${recommendation.get('resource_id')}` : node.name;

            if (node.type === 'user' || node.type === 'group' || node.type === 'policy' || node.resourceType === ALB_RESOURCE_TYPE) {
                drilldownTitle = node.name;
            }

            $('.details-title a').text(drilldownTitle.length > TITLE_WORD_COUNT ? drilldownTitle.substring(0, TITLE_WORD_COUNT) + '...' : drilldownTitle).attr('title', drilldownTitle);

            // drilldowns
            if (_.isUndefined(drilldownLinks[prefix])) {
                $('.details-title a').attr('href', 'javascript:;').removeClass('canDrillDown');

                // set relationships for IAM policy
                if(this._isIAMPolicy(id)){
                    let policySourceMap = JSON.parse(tokenModel.get('policySources')),
                        users = policySourceMap.users,
                        groups = policySourceMap.groups;
                    for(let userID in users){
                        if (_.isUndefined(templateData['IAM User'])) {
                            templateData['IAM User'] = {
                                relations: [users[userID]],
                                prefix: 'user'
                            };
                        } else {
                            templateData['IAM User'].relations.push(users[userID]);
                        }
                    }
                    for(let groupID in groups){
                        if (_.isUndefined(templateData['IAM Group'])) {
                            templateData['IAM Group'] = {
                                relations: [groups[groupID]],
                                prefix: 'group'
                            };
                        } else {
                            templateData['IAM Group'].relations.push(groups[groupID]);
                        }
                    }
                }
            } else {
                var drilldownLink = drilldownLinks[prefix].format(id);

                if (node.resourceType === ALB_RESOURCE_TYPE) {
                    drilldownLink = drilldownLinks[prefix].format(node.name);
                }

                $('.details-title a').attr('href', drilldownLink).addClass('canDrillDown');
            }

            $('#details-content > ul > li').hide();

            let tags;

            // Brief Tab
            if (node.tags) {
                tags = node.tags.split('\n');
            }
            $('#resource-detail').html(_.template(this.briefTemplate, {node: node, tags: tags, resourceTypeToName: TopologyConfig.resourceTypeToName, prefix: prefix}));

            // Relationship Tab
            let relationHTML = _.template(this.relationshipTemplate, {templateData: templateData, elbInstanceStates: elbInstanceStates});
            $('#topology-relationships').html(relationHTML);

            $('#briefTab').show();

            if(node.type !== 'policy') {
                $('#relationshipTab').show();
            }

            // Recommendation Tab
            if (recommendation) {
                let html = this._getRecommHtml(recommendation);
                $('#recommendTab').show();
                $('#recommendTab > a').tab('show');
                $('#resource-recommendation').html(html);

                if (recommendation.get('feedback') === 'action') {
                    $('#resource-recommendation-control').hide();
                } else {
                    $('#resource-recommendation-control').show();
                }
            } else {
                $('#briefTab > a').tab('show');
            }
            data.tabs.forEach($tab => $tab.show());

            // KPIs
            if (node.type === 'i') {
                $('#resource-kpis').html(_.template(this.instanceKPITemplate, data.kpi));
            } else if (node.type === 'vol') {
                $('#resource-kpis').html(_.template(this.volumeKPITemplate, data.kpi));
            } else {
                $('#resource-kpis').empty();
            }

            // render policies of sg
            if (node.type === 'sg') {
                $('#sg-inbound, #sg-outbound').empty();

                let policySM = new SearchManager({
                    id:  _.uniqueId('sg_policy_search'),
                    app: appName,
                    preview: false,
                    search: '`aws-description("*", "*", "ec2_security_groups", "id")` id=' + id + ' earliest=-1d | head 1 | spath rules{} | spath rules_egress{} | rename rules{} as inbound, rules_egress{} as outbound'
                });

                policySM.on('search:done', (properties) => {
                    if(properties.content.resultCount > 0){
                        let policyResult = policySM.data('results', {
                            count: MAX_RESULT_COUNT,
                            output_mode: 'json'
                        });

                        policyResult.on('data', () => {
                            if(policyResult.data().results.length > 0) {
                                // build template data
                                let policyEvent = policyResult.data().results[0],
                                    inboundList = policyEvent.inbound,
                                    outboundList = policyEvent.outbound,
                                    inboundTemplateData = {
                                        directionLegend: 'Source',
                                        policyList: []
                                    },
                                    outboundTemplateData = {
                                        directionLegend: 'Destination',
                                        policyList: []
                                    };

                                if (!_.isArray(inboundList)) {
                                    inboundList = [inboundList];
                                }
                                if (!_.isArray(outboundList)) {
                                    outboundList = [outboundList];
                                }
                                inboundList.forEach((inbound) => {
                                    inbound = JSON.parse(inbound);
                                    inboundTemplateData.policyList.push({
                                        protocol: inbound.ip_protocol,
                                        from_port: inbound.from_port,
                                        to_port: inbound.to_port,
                                        grants: inbound.grants
                                    });
                                });
                                outboundList.forEach((outbound) => {
                                    outbound = JSON.parse(outbound);
                                    outboundTemplateData.policyList.push({
                                        protocol: outbound.ip_protocol,
                                        from_port: outbound.from_port,
                                        to_port: outbound.to_port,
                                        grants: outbound.grants
                                    });
                                });

                                // render tables
                                $('#sg-inbound').html(_.template(this.policyTemplate, inboundTemplateData));
                                $('#sg-outbound').html(_.template(this.policyTemplate, outboundTemplateData));
                            }
                        });
                    }
                });
            }

            // render details of Inspector & Config Rules
            let inspector = data.kpi.inspector,
                config_rule = data.kpi.config_rule;

            // Inspector & Config Rules
            let isRulesShown = (inspector || config_rule);

            if(isRulesShown) {
                $('#rulesTab').show();

                // if drilldown is rules layer, then switch to this tab
                let inspectorToken = tokenModel.get('layers.inspectorLayer'),
                    configRuleToken = tokenModel.get('layers.configRuleLayer') || tokenModel.get('layers.iamConfigRuleLayer');

                if((!_.isUndefined(inspectorToken) && !!inspectorToken && inspectorToken !== 'false')
                    || (!_.isUndefined(configRuleToken) && !!configRuleToken && configRuleToken !== 'false')){

                    $('#briefTab, #briefChart').removeClass('active');
                    $('#rulesTab, #rulesChart').addClass('active');
                }

                let rulesTemplate = _.template(this.rulesTemplate, $.extend({
                    High: 0,
                    Medium: 0,
                    Low: 0,
                    Informational: 0,
                    NON_COMPLIANT: 0,
                    COMPLIANT: 0,
                    btnText: SHOW_DETAILS
                }, inspector, config_rule));

                $('#rulesChart').html(rulesTemplate);

                // get inspector details
                let inspectorSM = new SearchManager({
                    id:  _.uniqueId('inspector_details_search'),
                    app: appName,
                    preview: false,
                    search: `|inputlookup topology_inspector_recommendations | search agent_id=${id} | table severity, finding`
                });

                inspectorSM.on('search:done', (properties) => {
                    if(properties.content.resultCount > 0){
                        let inspectorResult = inspectorSM.data('results', {
                            count: MAX_RESULT_COUNT
                        });

                        inspectorResult.on('data', () => {
                            if(inspectorResult.data().rows.length > 0) {
                                let colorMap = TopologyConfig.topologyChartConfig.ruleColorMap,
                                    valueMap = {};

                                inspectorResult.data().rows.forEach((row) => {
                                    if(_.isUndefined(valueMap[row[0]])){
                                        valueMap[row[0]] = [row[1]];
                                    }
                                    else{
                                        valueMap[row[0]].push(row[1]);
                                    }
                                });

                                ['High', 'Medium', 'Low', 'Informational'].forEach((item) => {
                                    if(!_.isUndefined(valueMap[item])){
                                        valueMap[item].forEach((value) => {
                                            $('#inspector-table').append(`<tr><td style="color:${colorMap[item]}" valign="top">${item}</td><td>${value}</td></tr>`);
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

                // get config rule details
                let configRuleSM = new SearchManager({
                    id:  _.uniqueId('config_rule_details_search'),
                    app: appName,
                    preview: false,
                    search: `|inputlookup topology_config_rules | search resource_id=${id} | table compliance_type, rule_name`
                });

                configRuleSM.on('search:done', (properties) => {
                    if(properties.content.resultCount > 0){
                        let configRuleResult = configRuleSM.data('results', {
                            count: MAX_RESULT_COUNT
                        });

                        configRuleResult.on('data', () => {
                            if(configRuleResult.data().rows.length > 0) {
                                let colorMap = TopologyConfig.topologyChartConfig.ruleColorMap,
                                    valueMap = {};

                                configRuleResult.data().rows.forEach((row) => {
                                    if(_.isUndefined(valueMap[row[0]])){
                                        valueMap[row[0]] = [row[1]];
                                    }
                                    else{
                                        valueMap[row[0]].push(row[1]);
                                    }
                                });

                                ['NON_COMPLIANT', 'COMPLIANT'].forEach((item) => {
                                    if(!_.isUndefined(valueMap[item])){
                                        let compliance = (item === 'NON_COMPLIANT' ? 'Non-compliant' : 'Compliant');

                                        valueMap[item].forEach((value) => {
                                            $('#config-rule-table').append(`<tr><td style="color:${colorMap[item]}" valign="top">${compliance}</td><td>${value}</td></tr>`);
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

            } else{
                $('#rulesTab').hide();
            }

            // Target Groups
            if (node.resourceType === ALB_RESOURCE_TYPE) {
                $('#targetGroupsTab').show();

                let targetGroupSM = new SearchManager({
                    id:  _.uniqueId('target_group_search'),
                    app: appName,
                    preview: false,
                    search: '`aws-description("*", "*", "application_load_balancers", "LoadBalancerArn")` earliest=@d LoadBalancerArn="' + id + '" | head 1'
                });

                targetGroupSM.on('search:done', (properties) => {
                    if(properties.content.resultCount > 0){
                        let targetGroupResult = targetGroupSM.data('results', {
                            count: MAX_RESULT_COUNT,
                            output_mode: 'json'
                        });

                        targetGroupResult.on('data', () => {
                            if(targetGroupResult.data().results.length > 0) {
                                let targetGroups = JSON.parse(targetGroupResult.data().results[0]['_raw']);
                                $('#targetGroupsTable').html(_.template(this.targetGroupsTemplate, {
                                    targetGroupList: targetGroups['TargetGroups']
                                }));
                            }
                        });
                    }
                });

            } else {
                $('#targetGroupsTab').hide();
            }

            this._updatePanelTitles(prefix);

            this._relocate();

            this.$el.show();
        },

        // do not empty viz while change time range
        displayMessage() {
            if ($('.topology-list').length === 0) {
                SimpleSplunkView.prototype.displayMessage.apply(this, arguments);
            }
            return this;
        },

        _updatePanelTitles(resourceType) {
            for (let key in DETAILED_METRICS) {
                let title = DETAILED_METRICS[key].title[resourceType];

                if(!_.isUndefined(title)){
                    $(`#${key}-panel>.panel-title`).text(title);
                }
            }
        },

        onClose(event) {
            if (event) {
                event.preventDefault();
            }
            this.$el.hide();
            this.model.viewModel.set('selected', null);
        },

        onTab(event) {
            let $a = $(event.currentTarget);
            let searchName = $a.data('search');
            let result = _.find(this.searches, (search) => search.id === searchName);
            if (result && !result.get('started')) {
                result.startSearch();
                result.set('started', true);
            }
        },

        onAction(event) {
            if (event) {
                event.preventDefault();
            }
            let id = this.model.viewModel.get('selected').recommendation.get('_key');
            this.model.viewModel.set('takeAction', id);
            this.onClose();
        },

        onIgnore(event) {
            if (event) {
                event.preventDefault();
            }
            let id = this.model.viewModel.get('selected').recommendation.get('_key');
            this.model.viewModel.set('ignore', id);
            this.onClose();
        },

        _relocate() {
            let $chart = $('.topology-chart');
            let $svg = $('.topology-chart svg');
            let top = $chart.outerHeight() / 2 + $chart.offset().top;
            this.$el.css('top', top - this.$el.outerHeight());
            this.$el.css('left', $svg.offset().left + $svg.outerWidth() / 2 - this.$el.outerWidth() / 2)
        },

        _isIAMPolicy(id){
            let nodes = this.config.nodes, node = nodes[id];
            return node.type === 'policy';
        },

        _convertTraffcSize(bytes) {
            let units = ['B', 'KB', 'MB', 'GB', 'TB']
            for (let i = units.length - 1; i >= 0; i--) {
                let threshold = Math.pow(1024, i);
                if (bytes > threshold) {
                    return (bytes/threshold).toFixed(2) + units[i];
                }
            }
            return '0B';
        },

        _getRecommHtml(recommendation) {
            let region = recommendation.get('region');
            let id = recommendation.get('resource_id');
            switch (recommendation.get('resource_type')) {
                case 'sg':
                    return new RecommendationDetails.SGDetailView({
                        id: id,
                        region: region
                    }).render().el;
                case 'elb':
                    return new RecommendationDetails.ELBDetailView({
                        id: id,
                        region: region
                    }).render().el;
                case 'i':
                    return new RecommendationDetails.EC2DetailView({
                        id: id,
                        region: region,
                        action: recommendation.get('ml_action').toLowerCase()
                    }).render().el;
            }
        },

        onInspectorDetailsClicked(evt) {
            $('#inspector-table').toggle();
            $(evt.target).text($('#inspector-table').is(':visible') ? CLOSE_DETAILS : SHOW_DETAILS);
        },

        onConfigRuleDetailsClicked(evt) {
            $('#config-rule-table').toggle();
            $(evt.target).text($('#config-rule-table').is(':visible') ? CLOSE_DETAILS : SHOW_DETAILS);
        },

        _isELB(id){
            let nodes = this.config.nodes, node = nodes[id];
            return node.type === "elb";
        }
    });

    return DetailsPanel;
});