define([
    'underscore',
    'jquery',
    'backbone',
    'app/utils/Util',
    'splunkjs/mvc',
    'splunkjs/mvc/simplesplunkview',
    'app/libs/d3.min',
    'splunkjs/mvc/searchmanager',
    'app/views/topology/TopologyConfig',
    'app/views/topology/TopologyAlgorithm',
    'app/views/dashboard/MessageView',
    'app/views/topology_playback/PlayBackView',
    'app/views/topology_playback/utils/KeyFrameUtil',
    'util/splunkd_utils',
    'app/utils/HelpLinks',
    'app/libs/canvg'
], (_, $, Backbone, Utils, mvc, SimpleSplunkView, d3, SearchManager, TopologyConfig, TopologyAlgorithm, MessageView, PlayBackView, KeyFrameUtil, splunkd_utils, HelpLinks) => {

    let tokenModel = mvc.Components.getInstance("default"), {appName, locale, root} = TopologyConfig.context;

    const IMG_FOLDER = `${root}/${locale}/static/app/${appName}/img`;

    const HIGHLIGHT_DURATION = 750, ZOOM_DURATION = 300, DRAG_DURATION = 300, DETAILS_ANIMATE_DURATION = 400, HIGHLIGHT_DEBOUNCE = 300, FILTER_DEBOUNCE = 1500;

    const RUNNING = "running", STOPPED = "stopped";

    const INIT_SCALE = 100, MAX_SCALE = 150, MIN_SCALE = 30, SHOW_TEXT_SCALE = 50;

    const DEFAULT_LINK_STRENGTH = 0.6;

    const PLAYBACK_MONTH_COUNT = 6;

    const CONFIG_RULE_X_MARGIN = 15, CONFIG_RULE_Y_MARGIN = 22, INSPECTOR_X_MARGIN = 25, INSPECTOR_Y_MARGIN = 10;

    const MAX_RESULT_COUNT = 1000000;

    const ELB_RESOURCE_TYPE = 'AWS::EC2::LoadBalancer', POLICY_RESOURCE_TYPE = 'AWS::IAM::Policy';

    let TopologyPanel = SimpleSplunkView.extend({

        tagName: 'div',

        events: {
            'click #fitBtn:not(.disabled)': '_onFullscreen',
            'click #zoom-in:not(.disabled)': '_onZoom',
            'click #zoom-out:not(.disabled)': '_onZoom',
            'click #overviewBtn:not(.disabled)': function() {
                let overview = this.model.viewModel.get('overview');
                this.model.viewModel.set('overview', !overview);
            },
            'click #legendBtn:not(.disabled)': function() {
                let legend = this.model.viewModel.get('legend');
                this.model.viewModel.set('legend', !legend);
            },
            'click #cameraBtn:not(.disabled)': '_onExport',
            'change #cpu-layer-check': '_onCheckCPU',
            'change #network-layer-check': '_onCheckNetwork',
            'change #billing-layer-check': '_onCheckBilling',
            'change #rule-layer-check': '_onCheckRules',
            'change #iam-rule-layer-check': '_onCheckConfigRule',
            'click #layerBtn:not(.disabled)': '_onLayer',
            'click #playbackBtn:not(.disabled)': '_onPlayback',
            'click #recommBtn:not(.disabled), #recommBadge': '_onRecommendation',
            'click #recomm-dependency .close': function() {
                $('#recomm-dependency').hide();
            }
        },

        initialize(params) {
            SimpleSplunkView.prototype.initialize.apply(this, arguments);

            this.output_mode = "json";
            this.options = {data : "results"};
            this.config = TopologyConfig.topologyChartConfig;
            this.isRenderEnds = false;
            this.model = new Backbone.Model();
            this.model.viewModel = params.viewModel;
            this.template = `\
                <div class="chart-title">\
                    <!-- Hide Insights button ... \
                    <div class="recommZone disabled"> \
                        <div id="recommBtn"  data-toggle="tooltip" data-placement="left" data-container="body" data-content="Vivamus sagittis lacus vel augue laoreet rutrum faucibus." title="Insights"></div>\
                        <div id="recommBadge"></div> \
                    </div> \
                    --> \
                    <div id="fitBtn" class="fit-screen disabled" data-toggle="tooltip" data-placement="top" data-container="body" title="Maximize or minimize the viewport"></div>\
                    <div id="zoom-in" class="disabled" current-scale="100" data-toggle="tooltip" data-placement="top" data-container="body" title="Zoom in"></div>\
                    <div id="zoom-out" class="disabled" current-scale="100" data-toggle="tooltip" data-placement="top" data-container="body" title="Zoom out"></div>\
                    <!-- Hide playback button... \
                    <div id="playbackBtn" class="disabled" data-toggle="tooltip" data-placement="top" data-container="body" title="Playback of topology change"></div>\
                    -->
                    <!-- Hide overall topology button for now... \
                    <div id="cameraBtn" class="disabled" data-toggle="tooltip" data-placement="top" data-container="body" title="Generate overall topology picture"></div>\
                    --> \
                    <!-- No layers yet... \
                    <div id="layerBtn" class="disabled" data-toggle="tooltip" data-placement="top" data-container="body" title="Select topology layers"></div>\
                    <div id="layers-dropdown-area"class="disabled">\
                        <div class="layer-set-item">\
                            <input id="cpu-layer-check" type="checkbox"/>\
                            <label for="cpu-layer-check">CPU Utilization </label>\
                        </div>\
                        <div class="layer-set-item">\
                            <input id="network-layer-check" type="checkbox"/>\
                            <label for="network-layer-check">Network Traffic </label><br/>\
                        </div>\
                        <div class="layer-set-item">\
                            <input id="billing-layer-check" type="checkbox"/>\
                            <label for="billing-layer-check">Billing </label><br/>\
                        </div>\
                        <div class="layer-set-item">\
                            <input id="rule-layer-check" type="checkbox"/>\
                            <label for="rule-layer-check">Amazon Inspector & Config Rules</label><br/>\
                        </div>\
                        <div class="layer-set-item iam-layer">\
                            <input id="iam-rule-layer-check" type="checkbox"/>\
                            <label for="iam-rule-layer-check">Config Rules</label><br/>\
                        </div>\
                    </div>\
                    -->\
                    <div id="overviewBtn" class="disabled" data-toggle="tooltip" data-placement="top" data-container="body" title="Overview of topology"></div>\
                    <!-- Hide legent group button for now... \
                    <div id="legendBtn" class="disabled" data-toggle="tooltip" data-placement="top" data-container="body" title="Legend group"></div>\
                    -->\
                </div>\
                <div class="svg-container"></div>\
                <div id="legend-group">\
                    <p>Legend Group</p>\
                    <div class="legend-item">\
                        <p>CPU Utilization</p>\
                        <div>\
                            <image src="${IMG_FOLDER}/cpu-utilization-legend.svg"/>\
                        </div>\
                    </div>\
                    <div class="legend-item">\
                        <p>Network Traffic/Billing</p>\
                        <div>\
                            <image src="${IMG_FOLDER}/network-legend.svg"/>\
                        </div>\
                    </div>\
                    <div class="legend-item">\
                        <p>Amazon Inspector</p>\
                        <div>\
                            <image src="${IMG_FOLDER}/inspector-green-legend.svg" class="severity-legend-icon"/>\
                            <image src="${IMG_FOLDER}/inspector-yellow-legend.svg" class="severity-legend-icon"/>\
                            <image src="${IMG_FOLDER}/inspector-red-legend.svg" class="severity-legend-icon"/>\
                        </div>\
                        <div class="legend-serious-label inspector-legend">
                            |<br/>Serious
                        </div>
                    </div>\
                    <div class="legend-item">\
                        <p>Config Rules</p>\
                        <div>\
                            <image src="${IMG_FOLDER}/config-rules-green-legend.svg" class="severity-legend-icon"/>\
                            <image src="${IMG_FOLDER}/config-rules-red-legend.svg" class="severity-legend-icon"/>\
                        </div>\
                        <div class="legend-serious-label config-rule-legend">
                            |<br/>Serious
                        </div>
                    </div>\
                </div>\
                <div id="chart-overview"></div> \
                <div id="chart-playback"></div> \
                <div id="recomm-dependency"> \
                    <div class="arrow"></div> \
                    <h3>Insights Service unavailable<button class="close" type="button">×</button></h3> \
                    <p>The Insights Service depends on the Python for Scientific Computing application, which is not installed on this server. <%=learnmore%></p> \
                </div> \
            `;
            this.svgContext = {
                svg: null,
                svgLayer1: null,
                svgLayer2: null,
                lines: null,
                nodeImages: null,
                nodeTexts: null,
                zoom: null,
                overviewWidth: null,
                overviewHeight: null,
                wheelCallback: null,
                nodeData: null,
                linkData: null,
                coordinateScope:{
                    xMin:0,
                    yMin:0,
                    xMax:0,
                    yMax:0
                }
            };
            this.loadingTemplate = '\
                <div id="loadingLayer"> \
                    <div class="loadingArea"> \
                        Loading ... \
                    </div> \
                </div> \
            ';
            this.keyFrameCountMap = {};

            // Listen filterType field
            this.listenTo(this.model.viewModel, 'change:filterTypes', () => {
                $.debounce(() => {
                    $('#zoom-in,#zoom-out').attr('current-scale', INIT_SCALE);
                    this.render();
                }, 'filterTypes', FILTER_DEBOUNCE)();
            });

            this.listenTo(this.model.viewModel, 'change:hoverResource', (model, value) => {
                if (this.model.viewModel.get('selected')) {
                    return;
                }
                if (!value) {
                    $.debounce(this._resetHighlight.bind(this), 'nodeImages', HIGHLIGHT_DEBOUNCE / 2)();
                    return;
                }

                $.debounce(() => {
                    if (value.focus) {
                        this._focusOnResource(value.id);
                    }
                    this._highlightRelatedResources(value.id);
                }, 'nodeImages', HIGHLIGHT_DEBOUNCE)();
            });

            // Looks for the ML Toolkit and displays a message if not installed
            /*
            this.listenTo(this.model.viewModel, 'change:hasMLLib', (model, value) => {
                if (value === false) {
                    this._disableRecommZone();
                }
            });
            */

            this.listenTo(this.model.viewModel, 'change:selected', (model, value) => {
                this._resizeTopologyPanel();

                if (!value) {
                    this._resetHighlight();
                    return;
                }

                if (value.focus !== false){
                    this._focusOnResource(value.id);
                }

                $('#layers-dropdown-area').hide();

                // highlight related resources
                this._highlightRelatedResources(value.id, true);
                setTimeout(this._refreshChartOverview.bind(this), HIGHLIGHT_DURATION);
            });

            this.listenTo(this.model.viewModel, 'change:recommendation', (model, value) => {
                if (value) {
                    $('#recommBtn').addClass('enabled');
                    this.model.viewModel.set('overview', false);
                    this.model.viewModel.set('legend', false);
                } else {
                    $('#recommBtn').removeClass('enabled');
                }

                this._resizeTopologyPanel();
            });

            this.listenTo(this.model.viewModel, 'change:overview', (model, value) => {
                if (value) {
                    $('#overviewBtn').addClass('enabled');
                    // set size of overview
                    this._resizeChartOverview();

                    // refresh overview
                    this._refreshChartOverview();
                    this.elements.overview_element.show();
                } else {
                    $('#overviewBtn').removeClass('enabled');
                    this.elements.overview_element.hide();
                }
            });

            this.listenTo(this.model.viewModel, 'change:legend', (model, value) => {
                if (value) {
                    $('#legendBtn').addClass('enabled');
                    $('#legend-group').show();
                } else {
                    $('#legendBtn').removeClass('enabled');
                    $('#legend-group').hide();
                }
            });

            this.listenTo(this.model.viewModel, 'change:recommendationCount', (model, value) => {
                let $badge = $('#recommBadge');
                if (value) {
                    $badge.show();
                    $badge.text(value);
                } else {
                    $badge.hide();
                }
            });

            $('body').on('fullscreenchange webkitfullscreenchange mozfullscreenchange msfullscreenchange', ()=>{
                let isFullScreen = (document.fullscreen || document.mozFullScreen || document.webkitIsFullScreen || document.msFullscreenElement);
                if(!isFullScreen && $('#fitBtn').hasClass('fit-area')){
                    $('#fitBtn').click();
                }
            });

            $('body').on('click', (evt) => {
                if($(evt.target).parents('#layers-dropdown-area').length === 0){
                    $('#layers-dropdown-area').hide();
                }
                if(this.model.viewModel.get('selected') && !$(evt.target).is('image') && $(evt.target).parents('.svg-container').length > 0){
                    this.model.viewModel.set('selected', null);
                }
            });

            // chart overview map always fixed at the top right
            $(window).scroll(() => {
                this._relocateChartOverview();
                $('#recomm-dependency').hide();
            });

            // topology needs to re-arrange when resizing
            $(window).resize(this._resizeTopologyPanel.bind(this));
        },

        createView() {
            this.$el.html(_.template(this.template, {
                learnmore: Utils.buildLinkNode(HelpLinks.AWS_RECOMMENDATION_DEPENDENCY)
            }));

            this.elements = {
                container_element: $("#topologyContainer"),
                list_element: $(".topology-list"),
                chart_element: $(".topology-chart"),
                overview_element: $("#chart-overview"),
                recommendation_element: $('.topology-recomm'),
            };

            this.titleHeight = $('.chart-title').height();

            // loading layer
            this._loadingTopology();

            let width = this.elements.chart_element.width(),
                height = this.elements.chart_element.height() - this.titleHeight;

            let svg = d3.select(".svg-container")
                .append("svg")
                .attr("width", width)
                .attr("height", height);

            // Looks for the ML Toolkit and displays a message if not installe
            /*
            if (this.model.viewModel.get('hasMLLib') === false) {
                this._disableRecommZone();
            }
            */

            return {container: this.$el, svg: svg, width: width, height: height};
        },

        formatData(data) {
            let nodes = {}, // stores nodes
                links = [], // stores links
                filterTypes = this.model.viewModel.get('filterTypes'),
                nodesForRelationships = {},
                usedVolumeIds = {},
                policyLinks = {},
                inlinePolicyLinks = {};

            // filterTypes comes from TopologyConfig.  The value will be what is selected in the left hand side menu.
            // For example, VPC, Instance, Subnet, Volume, etc.
            data.forEach((datum) => {
                let prefix = TopologyConfig.resourceTypeToPrefix[datum.resourceType], needPolicy = false;

                if (prefix === "group" || prefix === "user"){
                    needPolicy = true;
                }

                if (!filterTypes[prefix] && prefix !== "igw") {
                    return;
                }

                if (filterTypes[prefix] || (prefix === "igw" && filterTypes.vpc)) {
                    if (!nodes[datum.resourceId]) {
                        nodes[datum.resourceId] = {
                            id: datum.resourceId,
                            name: datum.resourceName,
                            type: prefix,
                            resourceType: datum.resourceType,
                            status: datum.instanceStatus,
                            resourceRegion: datum.resourceRegion,
                            accountId: datum.accountId,
                            instanceType: datum.instanceType,
                            publicIp: datum.publicIp,
                            privateIp: datum.privateIp,
                            tags: datum.tags,
                            vpcId: datum.vpcId
                        };
                    }
                }

                if (!nodesForRelationships[datum.resourceId]) {
                    nodesForRelationships[datum.resourceId] = {
                        id: datum.resourceId,
                        name: datum.resourceName,
                        resourceType: datum.resourceType,
                        type: prefix,
                        nics: []  // add nic for instance
                    };
                }

                // set policy nodes
                if (needPolicy) {

                    // attached policies
                    let attachedPolicies = datum.attachedPolicies;

                    if(!_.isUndefined(attachedPolicies)){

                        if (!_.isArray(attachedPolicies)) {
                            attachedPolicies = attachedPolicies.split('\n');
                        }

                        for(let j=0; j<attachedPolicies.length; j++){
                            let policy = attachedPolicies[j],
                                arn = policy.split(",")[0], name = policy.split(",")[1],
                                policyNode = {
                                    id: arn,
                                    name: name,
                                    type: "policy",
                                    resourceType: POLICY_RESOURCE_TYPE
                                };

                            if(!nodes[arn]) {
                                nodes[arn] = policyNode;
                            }
                            if(!nodesForRelationships[arn]) {
                                nodesForRelationships[arn] = policyNode;
                            }
                        }

                        // cache policy relationships
                        if(!policyLinks[datum.resourceId]){
                            policyLinks[datum.resourceId] = attachedPolicies;
                        }
                    }

                    // inline policies
                    if(!_.isUndefined(datum.userPolicies) || !_.isUndefined(datum.groupPolicies)){

                        let inlinePolicies = datum.userPolicies || datum.groupPolicies;

                        if (!_.isArray(inlinePolicies)) {
                            inlinePolicies = inlinePolicies.split('\n');
                        }

                        for(let j=0; j<inlinePolicies.length; j++){
                            let policy = inlinePolicies[j],
                                id = `policy-${datum.resourceId}-${policy.split(",")[0]}`, name = policy.split(",")[0],
                                policyNode = {
                                    id: id,
                                    name: name,
                                    type: "policy",
                                    resourceType: POLICY_RESOURCE_TYPE
                                };

                            if(!nodes[id]) {
                                nodes[id] = policyNode;
                            }
                            if(!nodesForRelationships[id]) {
                                nodesForRelationships[id] = policyNode;
                            }
                        }

                        // cache policy relationships
                        if(!inlinePolicyLinks[datum.resourceId]){
                            inlinePolicyLinks[datum.resourceId] = inlinePolicies;
                        }
                    }
                }
            });

            // populate links
            data.forEach((datum) => {
                let prefix = TopologyConfig.resourceTypeToPrefix[datum.resourceType];
                let relationships = datum.relationships;

                // some nodes may not have relationships
                if (_.isUndefined(relationships) && datum.resourceType !== ELB_RESOURCE_TYPE) {
                    return;
                }

                if (!_.isArray(relationships)) {
                    if (_.isUndefined(relationships)) {
                        relationships = [];
                    }
                    else {
                        relationships = relationships.split('\n');
                    }
                }

                // elb should have link with vpc
                if (datum.resourceType === ELB_RESOURCE_TYPE) {
                    relationships.push(datum.vpcId);
                }

                if (relationships.length === 1) {
                    // internet gateway and ebs volume have only one relationship
                    if (nodes[datum.resourceId]) {
                        nodes[datum.resourceId].targetResourceId = relationships[0].split(",")[0];
                    }
                }

                relationships.forEach((relationship) => {
                    // Get the ID of the target resource
                    let relationship_target = relationship.split(",")[0];

                    let link = {
                        source: nodes[datum.resourceId],
                        target: nodes[relationship_target]
                    };

                    if (datum.resourceType === ELB_RESOURCE_TYPE) {
                        link.state = relationship.split(",")[1];
                    }

                    if (link.source && link.target) {
                        links.push(link);

                        //if (datum.resourceId.indexOf("vol-") === 0) {
                        if (prefix == "vol") {
                            usedVolumeIds[datum.resourceId] = true;
                        }

                        if (prefix == "sg" && !_.isUndefined(link.target["vpcId"])) {
                            link.source["vpcId"] = link.target["vpcId"];
                        }

                        // add NIC for instance
                        // if (datum.resourceId.indexOf("eni-") === 0 && relationship_target.indexOf("i-") === 0){
                        let target_prefix = TopologyConfig.resourceTypeToPrefix[link.target["resourceType"]];
                        if(prefix == "nic" && target_prefix == "i") {
                            if(nodesForRelationships[relationship_target]) {
                                nodesForRelationships[relationship_target].nics.push(datum.resourceId);
                            }
                        }
                    }
                });
            });

            // attached policy links
            for(let sourceId in policyLinks){
                let attachedPolicies = policyLinks[sourceId];
                links = attachedPolicies.map((policy) => {
                    return {
                        source: nodes[sourceId],
                        target: nodes[policy.split(',')[0]]
                    };
                }).concat(links);
            }

            // inline policy links
            for(let sourceId in inlinePolicyLinks){
                let inlinePolicies = inlinePolicyLinks[sourceId];
                links = inlinePolicies.map((policy) => {
                    return {
                        source: nodes[sourceId],
                        target: nodes[`policy-${sourceId}-${policy.split(',')[0]}`]
                    };
                }).concat(links);
            }

            // only shows volumes that binds to a rendered instance
            for (let resourceId in nodes) {
                let resource = nodes[resourceId];
                let prefix = TopologyConfig.resourceTypeToPrefix[resource.resourceType];
                //if (resourceId.indexOf('vol-') === 0) {
                if (prefix == "vol") {
                    if (!usedVolumeIds[resourceId]) {
                        delete nodes[resourceId];
                    }
                }
            }

            // stores in details config
            TopologyConfig.detailsPanelConfig.nodes = nodesForRelationships;
            TopologyConfig.nodeData = nodes;

            return {
                nodes: nodes,
                links: links
            };
        },

        // Need to override this method, because when there is no data, "updateView" and "formResults" methods will not be invoked.
        displayMessage() {
            SimpleSplunkView.prototype.displayMessage.apply(this, arguments);

            // close pop-up dialog, by setting "selected" model attribute to "null"
            if (this.model && this.model.viewModel.get('selected')) {
                this.model.viewModel.set('selected', null);
            }
        },

        updateView(viz, data) {

            this._resetUIStates();

            let filterTypes = this.model.viewModel.get("filterTypes");

            // if no data
            if (Object.keys(data.nodes).length === 0) {
                this.isRenderEnds = true;

                // if there is no iam data, need to show a tooltip
                if(filterTypes.user && filterTypes.group && filterTypes.policy){
                    MessageView.setMessage("no_iam_data", this.config.warningMessage.no_iam_data);
                }

                // disable some buttons
                $('#playbackBtn, #cameraBtn').addClass('disabled');
                $('.recommZone').addClass('disabled').find('#recommBtn').tooltip('destroy');

                return;
            }

            // remove disabled styles of title buttons
            $('.chart-title>.disabled').removeClass('disabled');

            // if iam, hide playback button
            if (filterTypes.user && filterTypes.group && filterTypes.policy){
                // disable some buttons
                $('#playbackBtn, #recommBtn, #cameraBtn').addClass('disabled');

                // only show iam layer
                $('.layer-set-item').hide();
                $('.layer-set-item.iam-layer').show();
            } else {
                // do not show iam layer
                $('.layer-set-item').show();
                $('.layer-set-item.iam-layer').hide();

                // for playback, camera buttons, needs to wait for XHR response
                $('#playbackBtn, #cameraBtn').addClass('disabled');

                // get time frames of playback
                KeyFrameUtil.generateKeyFrames(filterTypes).then((data) => {
                    this.keyFrameCountMap = data;
                    $('#playbackBtn').removeClass('disabled');
                });
            }

            // if not aws admin, hide recommendation button
            // Only admin and power user can access this feature
            /*
            let contextURL=splunkd_utils.fullpath("saas-aws/splunk_app_aws_current_context", {
                app: appName,
                sharing: 'app'
            });

            $.get(`${contextURL}?output_mode=json`, (user_context) => {
                if (!user_context.entry[0].content['is_aws_admin']) {
                    $('.recommZone').hide();
                }
            });
            */

            let size = this.config.nodeImage.imageSize;

            // Support Zoom and Highlight
            let zoom = d3.behavior.zoom()
                .on("zoom", () => {
                    let scale = d3.event.scale,
                        translateX = d3.event.translate[0],
                        translateY = d3.event.translate[1];

                    // zoom in, zoom out
                    if (d3.event.sourceEvent === null) {
                        svgLayer2.transition().duration(ZOOM_DURATION).attr("transform", `translate(${translateX},${translateY})scale(${scale})`);
                    }
                    // drag
                    else {
                        // Disable dragging the selection out of the Overview box
                        let {pointX, pointY} = this._getOverviewAttributes(translateX, translateY);

                        if(this._isOverviewOutOfScope(pointX, pointY)){
                            zoom.translate([zoom.translateX, zoom.translateY]);
                            return;
                        }
                        svgLayer2.attr("transform", `translate(${translateX},${translateY})scale(${scale})`);
                        zoom.translateX = translateX;
                        zoom.translateY = translateY;
                    }

                    scale *= 100;

                    if (!$('#cpu-layer-check').is(':checked')) {
                        scale <= SHOW_TEXT_SCALE ? nodeTexts.style("opacity", 0.0): nodeTexts.style("opacity", 1.0);
                    }

                    $("#zoom-in,#zoom-out").attr("current-scale", scale);

                    this._refreshChartOverview();
                });

            let svgLayer1 = viz.svg
                .call(zoom)
                .on("dblclick.zoom", null)
                .append("g");

            let wheelCallback = viz.svg.on("wheel.zoom");
            viz.svg.on("wheel.zoom", null);
            viz.svg.on("mousewheel.zoom", null); // for IE

            let svgLayer2 = svgLayer1.append("g");

            this.svgContext.linkData = JSON.stringify(data.links),
            this.svgContext.nodeData = JSON.stringify(data.nodes);

            TopologyAlgorithm.layoutNodes(data, this.config.maxInstanceNum);

            // Force chart
            let force = d3.layout.force()
                .size([viz.width, viz.height])
                .linkStrength((link, i) => {
                    if (link.source.type === "sg" && link.target.type === "vpc") {
                        if (link.source.type === "sg" && link.source.link_size === 1) {
                            return 1;
                        }
                        return 10;
                    }
                    let linkStrengthMap = this.config.forceChart.linkStrength;
                    return (linkStrengthMap[link.source.type] ? linkStrengthMap[link.source.type][link.target.type] || linkStrengthMap[link.source.type]["*"] || linkStrengthMap["*"][link.target.type] || DEFAULT_LINK_STRENGTH : DEFAULT_LINK_STRENGTH);
                })
                .linkDistance((link, i) => {
                    let linkDistanceMap = this.config.forceChart.linkDistance,
                        callback = (linkDistanceMap[link.source.type] ? linkDistanceMap[link.source.type][link.target.type] || linkDistanceMap[link.source.type]["*"] || linkDistanceMap["*"][link.target.type] || linkDistanceMap["*"]["*"] : linkDistanceMap["*"]["*"]);
                    return callback.call(this, link);
                })
                .charge(this.config.forceChart.chargeCompute)
                .gravity(0.08)
                .nodes(d3.values(data.nodes))
                .links(data.links)
                .start();

            // Draw links
            let lines = svgLayer2.selectAll("line")
                .data(force.links())
                .enter()
                .append("line")
                .style("stroke", this.config.line.color)
                .style("stroke-width", "1px")
                .style("stroke-dasharray", (link) => {
                    return (link.state === "OutOfService" ? "5,5": "0");
                });

            // Insert Text
            let nodeTexts = svgLayer2.selectAll("text")
                .data(force.nodes())
                .enter()
                .append("text")
                .style({
                    "text-anchor": "middle",
                    "fill": this.config.nodeText.color,
                    "font-size": "11px"
                })
                .text((d) => {
                    let nodeName = d.name;
                    if (d.type === 'elb') {
                        nodeName = nodeName.split('(')[0].trim();
                    }
                    return nodeName.length > 18 ? nodeName.substring(0, 16) + "..." : nodeName;
                });

            // Insert Image
            let nodeImages = svgLayer2.selectAll("image")
                .data(force.nodes())
                .enter()
                .append("image")
                .attr("width", (d) => {
                    return (_.isUndefined(size[d.type]) ? size.defaultSize : size[d.type]);
                })
                .attr("height", (d) => {
                    return (_.isUndefined(size[d.type]) ? size.defaultSize : size[d.type]);
                })
                .attr("xlink:href", (d) => {
                    return this._getImageURL(d);
                })
                .attr("type", (d) => {
                    if (d.type === "i") {
                        return (d.status === RUNNING ?`i-${RUNNING}` : `i-${STOPPED}`);
                    }
                    return d.type;
                })
                .on("click", (d) => {
                    if (d3.event.defaultPrevented) {
                        return;
                    }
                    $.debounce(() => {
                        let title = d.id + (d.name === d.id ? "" : ` (${d.name})`);
                        if (d.type==="user" || d.type==="group" || d.type==="policy") {
                            title = d.name + (d.name === d.id? "" : ` (${d.id})`);
                        }
                        this.model.viewModel.set('selected', {
                            id: d.id,
                            focus: false
                        });
                    }, "nodeImages", 0)();
                })
                .on("mouseover",(d) => {
                    this.model.viewModel.set('hoverResource', {
                        id: d.id,
                        focus: false
                    });
                })
                .on("mouseout", () => {
                    this.model.viewModel.set('hoverResource', null);
                })
                .on("dragstart", () => {
                    d3.event.sourceEvent.stopPropagation();
                });

            let alphaToRender = 0.09, xMax = -9999, xMin = 9999, yMin = 9999, yMax = -9999;

            // Update topology locations
            force.on("tick", (evt) => {
                if(this.isRenderEnds){
                    return;
                }

                // loading layer
                this._loadingTopology();

                let alpha = evt.alpha;

                if (alpha > alphaToRender) {
                    return;
                }

                alphaToRender -= 0.002;

                // Locate Links
                lines.attr("x1", (d) => {
                    return d.source.x;
                });
                lines.attr("y1", (d) => {
                    return d.source.y;
                });
                lines.attr("x2", (d) => {
                    return d.target.x;
                });
                lines.attr("y2", (d) => {
                    return d.target.y;
                });

                // Locate Images
                nodeImages.attr("x", (d) => {
                    let x = d.x - size.defaultSize / 2;
                    if (alpha <= 0.01) {
                        if(x > xMax){
                            xMax = x;
                        }
                        if(x < xMin){
                            xMin = x;
                        }
                    }
                    return x;
                });
                nodeImages.attr("y", (d) => {
                    let y = d.y - size.defaultSize / 2;
                    if (alpha <= 0.01) {
                        if(y > yMax){
                            yMax = y;
                        }
                        if(y < yMin){
                            yMin = y;
                        }
                    }
                    return y;
                });

                // Locate Texts
                nodeTexts.attr("x", (d) => {
                    return d.x;
                });
                nodeTexts.attr("y", (d) => {
                    return d.y + size.defaultSize / 2 + 8;
                });

                if (alpha <= 0.01) {
                    force.stop();
                }

            }).on("end", () => {
                if(this.isRenderEnds){
                    return;
                }

                if(this.svgContext.nodeImages.length===0){
                    return;
                }

                // set overview params
                this.svgContext.coordinateScope.xMin = xMin;
                this.svgContext.coordinateScope.yMin = yMin;
                this.svgContext.coordinateScope.xMax = xMax;
                this.svgContext.coordinateScope.yMax = yMax;
                this.svgContext.overviewWidth = xMax - xMin + size.defaultSize * 2;
                this.svgContext.overviewHeight = yMax - yMin + size.defaultSize * 2;

                // draw vpc scope borders
                this._drawVpcScopes();
            });

            this.svgContext.svg = viz.svg;
            this.svgContext.svgLayer1 = svgLayer1;
            this.svgContext.svgLayer2 = svgLayer2;
            this.svgContext.zoom = zoom;
            this.svgContext.lines = lines;
            this.svgContext.nodeImages = nodeImages;
            this.svgContext.nodeTexts = nodeTexts;
            this.svgContext.wheelCallback = wheelCallback;

            // get kpis
            this._generateKPIs();

            this.$el.find('[data-toggle="tooltip"]').tooltip();

            this.model.viewModel.set('viewUpdated', Date.now());
        },

        // select display size (full-screen or fit to area)
        _onFullscreen(model) {
            let $btn = $(model.currentTarget);
            let svgContext = this.svgContext;
            let svg = svgContext.svg;

            // fullscreen display
            if ($btn.hasClass('fit-screen')) {

                // enable zoom with mouse wheel event
                svgContext.svg.on('wheel.zoom', svgContext.wheelCallback);

                $btn.removeClass('fit-screen').addClass('fit-area');

                // fullscreen
                let fullscreenElem = this.elements.container_element[0];
                if (fullscreenElem.requestFullscreen) {
                    fullscreenElem.requestFullscreen();
                } else if (fullscreenElem.msRequestFullscreen) {
                    fullscreenElem.msRequestFullscreen();
                } else if (fullscreenElem.mozRequestFullScreen) {
                    fullscreenElem.mozRequestFullScreen();
                } else if (fullscreenElem.webkitRequestFullScreen) {
                    fullscreenElem.webkitRequestFullScreen();
                } else{
                    this.elements.chart_element.css({'width': '100%', 'height': $(window).height() + 'px'});
                    window.scrollTo(0, this.elements.chart_element.offset().top);
                }

                svg
                    .attr('width', this.elements.chart_element.width())
                    .attr('height', this.elements.chart_element.height() - this.titleHeight);
            } else {
                // exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                }

                svg.attr('width', this.elements.chart_element.width()).attr('height', this.elements.chart_element.height() - this.titleHeight);

                // disable zoom with mouse wheel event
                svgContext.svg.on('wheel.zoom', null);
                svgContext.svg.on('mousewheel.zoom', null); // for IE

                $btn.removeClass('fit-area').addClass('fit-screen');
            }

            // refresh overview
            setTimeout(this._refreshChartOverview.bind(this), DETAILS_ANIMATE_DURATION);
            setTimeout(this._relocateChartOverview.bind(this), DETAILS_ANIMATE_DURATION);
        },

        _onZoom(model) {
            let $btn = $(model.currentTarget);
            let scale =  parseInt($btn.attr('current-scale'));
            let id = $btn.attr('id');
            let zoom = this.svgContext.zoom;

            if (id === 'zoom-in') {
                if (scale >= MAX_SCALE) {
                    return false;
                }
                scale += 10;

            } else if (id === 'zoom-out') {
                if (scale <= MIN_SCALE) {
                    return false;
                }
                scale -= 10;
            }

            if (zoom) {
                zoom.scale(scale / 100);
                zoom.event(this.svgContext.svg);
                $('#zoom-in,#zoom-out').attr('current-scale', scale);
            }
        },

        _onLayer(model) {
            $('#layers-dropdown-area').css('left', ($('#layerBtn').offset().left - $('#layers-dropdown-area').outerWidth() - 20) + 'px').toggle();
            return false;
        },

        _onExport(model) {
            let storeConfig = this.config.topologyStore,
                svg = sessionStorage[storeConfig.exportKey],
                exportingURL = `${root}/${locale}/static/app/${appName}/js/views/topology/panels/topology_exporting.html`,
                agent = navigator.userAgent,
                isChrome = agent.indexOf("Chrome") > -1,
                win_ref;


            // In Chrome, HTML feature "download" is supported, so we can download as a svg file directly.
            if(isChrome){
                this._downloadFile("topology.svg", sessionStorage[storeConfig.exportKey]);
            }
            // Safari will block "window.open" in an event callback, for security issue.
            else {
                win_ref = window.open(exportingURL);
                canvg("export_canvas", svg, true);
                setTimeout(() => {
                    win_ref.location = $("#export_canvas")[0].toDataURL("image/png");
                }, 500);
            }
        },

        _onCheckCPU(model) {
            let $checkbox = $(model.currentTarget);

            let hasData = false;
            this.svgContext.nodeImages.style('opacity', (d) => {
                if(!_.isUndefined(d.cpu_opacity)){
                    hasData = true;
                }
                return this._getOpacityOfImage(d);
            }).attr('xlink:href', (d) => {
                return this._getImageURL(d);
            });
            this.svgContext.nodeTexts.style('opacity', (d) => {
                return this._getOpacityOfText(d);
            });

            // no cloudwatch data for CPU
            if(!hasData){
                $checkbox.is(':checked') ? MessageView.setMessage('no_cpu_data', this.config.warningMessage.no_cpu_data) : MessageView.unsetMessage('no_cpu_data');
            }
        },

        _onCheckNetwork(model) {
            let $checkbox = $(model.currentTarget);

            if($checkbox.is(':checked')) {
                this._createCircleKPILayer('network_layer', 'network', 'no_network_data', '#FF9947');
                this._createCircleKPILayer('vol_traffic_layer', 'vol_traffic', null, '#B43030');
            } else{
                d3.select('#network_layer').remove();
                d3.select('#vol_traffic_layer').remove();
                MessageView.unsetMessage('no_network_data');
            }
        },

        _onCheckRules(model) {
            this._onCheckInspector(model);
            this._onCheckConfigRule(model);
        },

        _onCheckInspector(model) {
            let $checkbox = $(model.currentTarget);
            if($checkbox.is(':checked')) {
                this._createRuleKPILayer('inspector_layer', 'inspector', 'no_inspector_data');
            } else{
                d3.select('#inspector_layer').remove();
                MessageView.unsetMessage('no_inspector_data');
            }

            // need to refresh overview map
            if (this.model.viewModel.get('overview')){
                this._resizeChartOverview();
                this._refreshChartOverview();
            }
        },

        _onCheckConfigRule(model) {
            let $checkbox = $(model.currentTarget);
            if($checkbox.is(':checked')) {
                this._createRuleKPILayer('config_rule_layer', 'config_rule', 'no_config_rule_data');
            } else{
                d3.select('#config_rule_layer').remove();
                MessageView.unsetMessage('no_config_rule_data');
            }

            // need to refresh overview map
            if (this.model.viewModel.get('overview')){
                this._resizeChartOverview();
                this._refreshChartOverview();
            }
        },

        _onCheckBilling(model) {
            let $checkbox = $(model.currentTarget);
            if ($checkbox.is(':checked')) {
                this._createCircleKPILayer('billing_layer', 'billing', 'no_billing_data', '#FF9947');
            } else {
                d3.select('#billing_layer').remove();
                MessageView.unsetMessage('no_billing_data');
            }
        },

        _onPlayback(model) {
            $(".tooltip").stop(true).hide();

            let el = $("#chart-playback");

            let endTime = new Date().getTime() / 1000,
                startTime = endTime - this.config.playbackConfig.maxTimeRange;

            // get first snapshot time
            let firstSnapshotTime = tokenModel.get('first_snapshot_time');

            let playbackView = new PlayBackView({
                el: el,
                start: Math.max(firstSnapshotTime, startTime),
                end: endTime,
                types: this.model.viewModel.get("filterTypes"),
                keyFrameCountMap: this.keyFrameCountMap
            });
            playbackView.render();
        },

        _onRecommendation(model) {
            if (this.model.viewModel.get('recommendationDependencyError')) {

            } else {
                let recommendation = this.model.viewModel.get('recommendation');
                this.model.viewModel.set('recommendation', !recommendation);
            }
        },

        _createCircleKPILayer(layer, kpi, warning, color) {
            let layerData = [],
                min = Number.MAX_SAFE_INTEGER,
                max = 0,
                hasData = false,
                maxSize = this.config.kpiLayer.circleSize.max,
                minSize = this.config.kpiLayer.circleSize.min,
                confSizeDiff = maxSize - minSize;

            this.svgContext.nodeImages.data().forEach((node) => {
                let kpiData = node[kpi];
                if(!_.isUndefined(kpiData)) {
                    hasData = true;
                    kpiData = parseFloat(kpiData);
                    if(kpiData > 0){
                        layerData.push(node);
                        if (kpiData > max) {
                            max = kpiData;
                        }
                        if (kpiData < min) {
                            min = kpiData;
                        }
                    }
                }
            });

            let sizeDiff = max - min;

            // No data for KPI
            if (!hasData && warning) {
                MessageView.setMessage(warning, this.config.warningMessage[warning]);
            }

            let svg = this._insertKpiLayer(layer);
            svg.selectAll('circle')
                .data(layerData)
                .enter()
                .append('circle')
                .attr('r', (d) => {
                    return (parseFloat(d[kpi]) - min) * confSizeDiff / sizeDiff + minSize;
                })
                .attr('fill', color)
                .style('opacity', '0.3')
                .attr('cx', (d) => {
                    return d.x;
                })
                .attr('cy', (d) => {
                    return d.y;
                });
        },

        _createRuleKPILayer(layer, kpi, warning){
            let layerData = [],
                hasData = false;

            this.svgContext.nodeImages.data().forEach((node) => {
                let kpiData = node[kpi];
                if(!_.isUndefined(kpiData)){
                    hasData = true;
                    layerData.push(node);
                }
            });

            // No data for KPI
            if (!hasData && warning) {
                MessageView.setMessage(warning, this.config.warningMessage[warning]);
            }

            let rulesOrder = ['High', 'Medium', 'Low', 'Informational', 'NON_COMPLIANT', 'COMPLIANT'],
                rulesImageURL = {
                    High: `${IMG_FOLDER}/inspector-red-legend.svg`,
                    Medium: `${IMG_FOLDER}/inspector-yellow-legend.svg`,
                    Low: `${IMG_FOLDER}/inspector-green-legend.svg`,
                    Informational: `${IMG_FOLDER}/inspector-green-legend.svg`,
                    NON_COMPLIANT: `${IMG_FOLDER}/config-rules-red-legend.svg`,
                    COMPLIANT: `${IMG_FOLDER}/config-rules-green-legend.svg`
                };

            let svg = this._insertKpiLayer(layer, true),
                size = this.config.nodeImage.imageSize;

            svg.selectAll('image')
                .data(layerData)
                .enter()
                .append('image')
                .attr('type', 'rule')
                .attr('width', '15')
                .attr('height', '15')
                .attr('x', (d) => {
                    if(kpi === 'config_rule'){
                        return d.x - CONFIG_RULE_X_MARGIN;
                    }
                    return d.x - INSPECTOR_X_MARGIN;
                })
                .attr('y', (d) => {
                    if(kpi === 'config_rule'){
                        return d.y - CONFIG_RULE_Y_MARGIN;
                    }
                    return d.y - INSPECTOR_Y_MARGIN;
                })
                .attr('data-x', (d) => (d.x - size.defaultSize / 2))
                .attr('data-y', (d) => (d.y - size.defaultSize / 2))
                .attr('xlink:href', (d) => {
                    let url = '';
                    for(let i=0; i<rulesOrder.length; i++){
                        if(d[kpi][rulesOrder[i]]){
                            url = rulesImageURL[rulesOrder[i]];
                            break;
                        }
                    }
                    return url;
                });
        },

        _relocateChartOverview() {
            if($(window).scrollTop() >= (this.elements.container_element.offset().top + 36)){
                this.elements.overview_element.css({"position":"fixed", "top":"0px", "right":(this.elements.container_element.offset().left-2) + "px"});
            } else{
                this.elements.overview_element.css({"position":"absolute", "top":"36px", "right":"-1px"});
            }
        },

        _resizeChartOverview() {
            if (!this.model.viewModel.get('overview')) {
                return;
            }

            let svg = this.svgContext.svgLayer2,
                overviewEl = this.elements.overview_element,
                width = overviewEl.width(),
                height = this.svgContext.overviewHeight * width / this.svgContext.overviewWidth;

            overviewEl.empty().height(height);

            let overviewSVG = d3.select(overviewEl[0])
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', `${this.svgContext.coordinateScope.xMin},${this.svgContext.coordinateScope.yMin},${this.svgContext.overviewWidth},${this.svgContext.overviewHeight}`)
                .attr('preserveAspectRatio', 'xMinYMin meet');

            // clone main layout to overview minimap
            overviewSVG[0][0].appendChild(($(svg[0][0]).clone())[0]);

            overviewEl.find('g').removeAttr('transform');
            overviewEl.find('text').css('opacity', 0);
            overviewEl.find('image').css('opacity', 1);
            overviewEl.find('line').css('stroke', this.config.line.color);

            _.each(overviewEl.find('image[type=rule]'), (item) => {
                let ele = $(item),
                    size = this.config.nodeImage.imageSize.defaultSize;
                ele.attr({
                    'x': ele.attr('data-x'),
                    'y': ele.attr('data-y'),
                    'width': size,
                    'height': size
                });
            });
        },

        _refreshChartOverview() {
            if (this.svgContext.overviewWidth === null || !this.model.viewModel.get('overview')) {
                return;
            }

            if ($("#overview-position").length === 0) {
                this.elements.overview_element.append("<div id='overview-position'></div>");
                $("#overview-position").draggable().on("dragstop", (event, ui) => {
                    let scale = parseInt($("#zoom-in").attr("current-scale")),
                        left = parseInt(ui.position.left),
                        top = parseInt(ui.position.top),
                        lastLeft = parseInt($("#overview-position").attr("lastLeft")),
                        lastTop = parseInt($("#overview-position").attr("lastTop")),
                        xRatio = this.svgContext.overviewWidth / (this.elements.overview_element.width()),
                        yRatio = this.svgContext.overviewHeight / (this.elements.overview_element.height()),
                        moveX = (left - lastLeft) * xRatio * scale/100,
                        moveY = (top - lastTop) * yRatio * scale/100,
                        transform = $(".svg-container svg>g").attr("transform"),
                        transformX = 0, transformY = 0;

                    if (transform && transform.length > 0) {
                        let regex = /^translate\((\S+)[, ](\S+)\)$/,
                            results = regex.exec(transform);
                        if (results !== null && results.length === 3) {
                            transformX = parseInt(results[1]);
                            transformY = parseInt(results[2]);
                        }
                    }
                    transformX -= moveX;
                    transformY -= moveY;
                    let newTransform = "translate(" + transformX + "," + transformY + ")";
                    this.svgContext.svgLayer1.transition().duration(DRAG_DURATION).attr("transform", newTransform);
                    $("#overview-position").attr({"lastLeft": ui.position.left, "lastTop": ui.position.top});
                }).on("drag", (event, ui) => {
                    // Disable dragging the selection out of the Overview box
                    let left = parseInt(ui.position.left),
                        top = parseInt(ui.position.top);

                    if(this._isOverviewOutOfScope(left, top)){
                        return false;
                    }
                });
            }

            let {width, height, pointX, pointY} = this._getOverviewAttributes();
            $("#overview-position").css({
                "top": pointY + "px",
                "left": pointX + "px",
                "width": width + "px",
                "height": height + "px"
            }).attr({"lastTop": pointY, "lastLeft": pointX});
        },

        _getOverviewAttributes(translateX, translateY){
            let scale = parseInt($("#zoom-in").attr("current-scale")),
                x = 0,
                y = 0,
                transform1 = $(".svg-container svg>g").attr("transform");
            if (transform1 && transform1.length > 0) {
                let regex = /^translate\((\S+)[, ](\S+)\)$/,
                    results = regex.exec(transform1);
                if (results !== null && results.length === 3) {
                    x -= parseInt(results[1]);
                    y -= parseInt(results[2]);
                }
            }
            if(!_.isUndefined(translateX)){
                x -= parseInt(translateX);
                y -= parseInt(translateY);
            } else{
                let transform2 = $(".svg-container svg>g>g").attr("transform");
                if (transform2 && transform2.length > 0) {
                    let regex = /^translate\((\S+)[, ](\S+)\).+$/,
                        results = regex.exec(transform2);
                    if (results !== null && results.length === 3) {
                        x -= parseInt(results[1]);
                        y -= parseInt(results[2]);
                    }
                }
            }

            let xRatio = this.svgContext.overviewWidth / (this.elements.overview_element.width()),
                yRatio = this.svgContext.overviewHeight / (this.elements.overview_element.height()),
                width = $(".svg-container svg").width() / xRatio * 100 / scale,
                height = $(".svg-container svg").height() / yRatio * 100 / scale,
                pointX = (-this.svgContext.coordinateScope.xMin + x * 100 / scale) / xRatio,
                pointY = (-this.svgContext.coordinateScope.yMin + y * 100 / scale) / yRatio;

            return {
                width: width,
                height: height,
                pointX: pointX,
                pointY: pointY
            };
        },

        _isOverviewOutOfScope(left, top) {
            // if topology data is too small, always enable drag
            if(this.svgContext.overviewWidth < parseInt(this.elements.chart_element.width()) || this.svgContext.overviewHeight < parseInt(this.elements.chart_element.height())){
                return false;
            }

            let width = $("#overview-position").width(),
                height = $("#overview-position").height(),
                isLeft = (left < parseInt($("#overview-position").attr("lastLeft"))),
                isUp = (top < parseInt($("#overview-position").attr("lastTop")));

            if(left <= - 2 * width / 3){
                if(isLeft){
                    return true;
                }
            }
            if(left >= this.elements.overview_element.width() - width/2){
                if(!isLeft){
                    return true;
                }
            }
            if(top <= - 2 * height / 3){
                if(isUp){
                    return true;
                }
            }
            if(top >= this.elements.overview_element.height() - height/2){
                if(!isUp){
                    return true;
                }
            }
            return false;
        },

        _loadingTopology() {
            let loading = $(this.loadingTemplate);
            if ($("#loadingLayer").length === 0) {
                $("body").append(loading);
            }
            let left = this.elements.chart_element.offset().left + "px",
                top = this.elements.chart_element.offset().top + "px",
                width = this.elements.chart_element.width() + "px",
                height = this.elements.chart_element.height() + "px";
            $("#loadingLayer").css({"left": left, "top": top, "width": width, "height": height}).show();
        },

        _highlightRelatedResources(id, needRenderDetail) {
            let {nodeImages, lines, nodeTexts} = this.svgContext,
                targetLines = [];

            lines.style("stroke", (line) => {
                if (line.source.id === id || line.target.id === id) {
                    targetLines.push(line);
                    return this.config.line.highlightColor;
                } else {
                    return this.config.line.dimColor;
                }
            });


            nodeTexts.style("opacity", (d) => {
                if (d.id === id) {
                    return this._getOpacityOfText(d);
                } else {
                    for (let i = 0; i < targetLines.length; i++) {
                        let line = targetLines[i];
                        if (line.source.id === d.id || line.target.id === d.id) {
                            return this._getOpacityOfText(d);
                        }
                    }
                    return this.config.nodeText.dimOpacity;
                }
            });

            let cpuChecked = $("#cpu-layer-check").is(":checked");
            nodeImages.attr("xlink:href", (d) => {
                let postfix = "";
                if (d.type === "i") {
                    if(d.status !== RUNNING){
                        postfix = `-${STOPPED}`;
                    } else if(cpuChecked && _.isUndefined(d.cpu_opacity)){
                        postfix = "-nodata";
                    }
                }
                if (d.id === id) {
                    if (needRenderDetail) {
                        if(d.type === "policy"){
                            // Get users and groups in relationships
                            let policySourceMap = {
                                users: {},
                                groups: {}
                            };
                            for(let i=0;i<targetLines.length; i++) {
                                let line = targetLines[i];
                                let source = line.source;
                                if(source.type === "user"){
                                    policySourceMap.users[source.id] = source.name;
                                } else if(source.type === "group"){
                                    policySourceMap.groups[source.id] = source.name;
                                }
                            }
                            tokenModel.set("policySources", JSON.stringify(policySourceMap));
                        }
                    }
                    return `${IMG_FOLDER}/${d.type + postfix}-hover.svg`;
                } else {
                    for (let i = 0; i < targetLines.length; i++) {
                        let line = targetLines[i];
                        if (line.source.id === d.id || line.target.id === d.id) {
                            return `${IMG_FOLDER}/${d.type + postfix}-hover.svg`;
                        }
                    }
                    return this._getImageURL(d);
                }
            }).style("opacity", (d) => {
                if (d.id === id) {
                    return this._getOpacityOfImage(d);
                } else{
                    for (let i = 0; i < targetLines.length; i++) {
                        let line = targetLines[i];
                        if (line.source.id === d.id || line.target.id === d.id) {
                            return this._getOpacityOfImage(d);
                        }
                    }
                    return this.config.nodeImage.dimOpacity;
                }
            });
        },

        _focusOnResource(id) {
            let {nodeImages, svgLayer1, svgLayer2} = this.svgContext,
                highLightX = (this.elements.container_element.find('svg').outerWidth()) / 2,
                highLightY = ($(window).height() - this.elements.container_element.offset().top - this.titleHeight) / 2 + $(window).scrollTop() / 2;


            let highlightItems = nodeImages.filter((d) => d.id === id);

            if (!_.isUndefined(highlightItems) && highlightItems.length > 0) {
                let highlightItem = highlightItems[0][0];
                if (_.isUndefined(highlightItem)) {
                    return;
                }
                let px = highlightItem.x.animVal.value,
                    py = highlightItem.y.animVal.value,
                    transform = svgLayer2.attr('transform'),
                    scale = parseInt($('#zoom-in').attr('current-scale'));

                if (transform === null) {
                    svgLayer1.transition().duration(HIGHLIGHT_DURATION).attr('transform', `translate(${highLightX - px},${highLightY - py})`);
                } else if (transform !== null && transform.length > 0) {
                    let regex = /^translate\((\S+)[, ](\S+)\).+$/,
                        results = regex.exec(transform);
                    if (results !== null && results.length === 3) {
                        let svgX = parseInt(results[1]),
                            svgY = parseInt(results[2]);
                        svgLayer1.transition().duration(HIGHLIGHT_DURATION).attr('transform', `translate(${highLightX - (svgX + px * scale / 100)},${highLightY - (svgY + py * scale / 100)})`);
                    } else {
                        svgLayer1.transition().duration(HIGHLIGHT_DURATION).attr('transform', `translate(${highLightX - px * scale / 100},${highLightY - py * scale / 100})`);
                    }
                }
            }
        },

        _resetHighlight() {
            this.svgContext.lines.style('stroke', this.config.line.color);
            this.svgContext.nodeTexts.style('opacity', (d) => this._getOpacityOfText(d));
            this.svgContext.nodeImages
                .attr('xlink:href', (d) => this._getImageURL(d))
                .style('opacity', (d) => this._getOpacityOfImage(d));
        },

        _generateKPIs() {
            const KPIS = {
                cpu: {
                    search: '|inputlookup topology_cpu_metrics | table cpu, name',
                    callback: function(node, kpi) {
                        if(!_.isUndefined(node.cpu)) {
                            let opacity = 0.5 * Math.log(parseFloat(node.cpu)) / Math.log(100) + 0.5; // to highlight the difference of opacity
                            if(opacity > 1){
                                opacity = 1;
                            }
                            node.cpu_opacity = opacity;
                        }
                    }
                },
                disk: {
                    search: "|inputlookup topology_diskio_metrics | table disk, name",
                    callback: null
                },
                network: {
                    search: "|inputlookup topology_network_traffic_metrics | table network_traffic, name",
                    callback: null
                },
                vol: {
                    search: "|inputlookup topology_volumeio_metrics | table volume_io, name",
                    callback: null
                },
                vol_traffic: {
                    search: "|inputlookup topology_volume_traffic_metrics | table network_traffic, name",
                    callback: null
                },
                billing: {
                    search: "|inputlookup topology_billing_metrics | table billing, name",
                    callback: null
                },
                inspector: {
                    search: "|inputlookup topology_inspector_recommendations | table severity, agent_id",
                    callback: null
                },
                config_rule: {
                    search: "|inputlookup topology_config_rules | table compliance_type, resource_id",
                    callback: null
                }
            };

            let KPIStore = {},
                nodeImages = this.svgContext.nodeImages,
                nodeTexts = this.svgContext.nodeTexts;

            Object.keys(KPIS).forEach(kpi => {
                let kpiObj = KPIS[kpi];

                KPIStore[kpi] = {};

                let sm = new SearchManager({
                    id:  _.uniqueId(`${kpi}_search`),
                    app: appName,
                    preview: false,
                    search: kpiObj.search
                });

                sm.on('search:done', (properties) => {
                    if(properties.content.resultCount > 0){
                        let result = sm.data('results', {
                            count: MAX_RESULT_COUNT
                        });

                        result.on('data', () => {
                            if(result.data().rows.length > 0) {
                                result.data().rows.forEach((row) => {
                                    // for inspector and config rules, we need to push a json here
                                    if(kpi === 'inspector' || kpi === 'config_rule'){
                                        if(_.isUndefined(KPIStore[kpi][row[1]])){
                                            KPIStore[kpi][row[1]] = {};
                                        }
                                        if(_.isUndefined(KPIStore[kpi][row[1]][row[0]])){
                                            KPIStore[kpi][row[1]][row[0]] = 1;
                                        } else{
                                            KPIStore[kpi][row[1]][row[0]] = KPIStore[kpi][row[1]][row[0]] + 1;
                                        }
                                    } else{
                                        KPIStore[kpi][row[1]] = row[0];
                                    }
                                });

                                // set nodeImages
                                let nodes = nodeImages.data();
                                nodes.forEach((node) => {
                                    node[kpi] = KPIStore[kpi][node.id];

                                    if ('callback' in kpiObj && typeof kpiObj.callback === 'function') {
                                        kpiObj.callback(node, kpi);
                                    }

                                });
                                nodeImages.data(nodes);
                                nodeTexts.data(nodes);
                            }
                        });
                    }
                });
            });
        },

        _resetUIStates() {
            // clear canvas
            $(".svg-container svg").empty();

            // hide buttons and widgets
            $("#loadingLayer, #cpu-utilization-legend").hide();

            // disable all checkboxes
            $("input[type=checkbox]").attr("checked", false);

            // make overview button and legend button not activated
            this.model.viewModel.set('overview', false);
            this.model.viewModel.set('legend', false);

            // close pop-up dialog, by setting "selected" model attribute to "null"
            if (this.model.viewModel.get('selected')) {
                this.model.viewModel.set('selected', null);
            }

            // remove vpc borders
            d3.select("#vpc_layer").remove();

            // clear all error messages
            MessageView.unsetMessage(["no_cpu_data","no_network_data", "no_iam_data", "no_billing_data", "no_inspector_data", "no_config_rule_data"]);

            // reset boolean
            this.isRenderEnds = false;
        },

        _insertKpiLayer(id, isFront) {
            // put layer at the front of other layers
            if(isFront){
                return this.svgContext.svgLayer2.append("g").attr("id", id);
            }

            let vpc_layer = d3.select("#vpc_layer");
            if(vpc_layer.size() === 0){
                return this.svgContext.svgLayer2.insert("g",":first-child").attr("id", id);
            } else{
                return vpc_layer.append("g").attr("id", id);
            }
        },

        _drawVpcScopes() {
            d3.select("#vpc_layer").remove();

            let filterTypes = this.model.viewModel.get("filterTypes");

            if(!filterTypes.vpc) {
                this._exportTopology();
                return;
            }

            let nodes = this.svgContext.nodeImages.data(),
                parentLayer = this.svgContext.svgLayer2,
                vpcScopes = {},
                isVpcExist = false,
                vpcsExist = {},
                instance2Vpc = {};

            for(let i=0; i<nodes.length; i++){
                let node = nodes[i];
                let prefix = TopologyConfig.resourceTypeToPrefix[node.resourceType];
                
                //if(node.id.indexOf("vpc-") === 0){
                if(prefix == "vpc") {
                    vpcsExist[node.id] = true;
                //} else if(node.id.indexOf("i-") === 0){
                } else if (prefix =="i") {
                    instance2Vpc[node.id] = node.vpcId;
                }
            }

            for(let i=0; i<nodes.length; i++){
                let node = nodes[i], vpcId = node.vpcId;
                let node_prefix = TopologyConfig.resourceTypeToPrefix[node.resourceType];

                // internet gateway does not have "vpcId" field
                if(node.id.indexOf("igw-") === 0 && node.targetResourceId && node.targetResourceId.indexOf("vpc-") === 0){
                    vpcId = node.targetResourceId;
                }

                // volumes do not have "vpcId" field
                //else if(node.id.indexOf("vol-") === 0 && node.targetResourceId && node.targetResourceId.indexOf("i-") === 0){
                else if (node_prefix == "vol" && node.targetResourceId) {
                    vpcId = instance2Vpc[node.targetResourceId];
                }

                if(vpcId && vpcsExist[vpcId]){
                    if(_.isUndefined(vpcScopes[vpcId])){
                        vpcScopes[vpcId] = {
                            xMin: 9999,
                            xMax: -9999,
                            yMin: 9999,
                            yMax: -9999,
                            name: null,
                            region: "Global"
                        };
                    }
                    if(node.x > vpcScopes[vpcId].xMax){
                        vpcScopes[vpcId].xMax = node.x;
                    }
                    if(node.x < vpcScopes[vpcId].xMin){
                        vpcScopes[vpcId].xMin = node.x;
                    }
                    if(node.y > vpcScopes[vpcId].yMax){
                        vpcScopes[vpcId].yMax = node.y;
                    }
                    if(node.y < vpcScopes[vpcId].yMin){
                        vpcScopes[vpcId].yMin = node.y;
                    }
                }

                //if(node.id.indexOf("vpc-") === 0){
                if(node_prefix == "vpc") {
                    isVpcExist = true;
                    // set vpc name
                    vpcScopes[vpcId].name = node.name;
                    // set vpc region
                    vpcScopes[vpcId].region = node.resourceRegion;
                }
            }

            if(!isVpcExist){
                this._exportTopology();
                return;
            }

            let padding = this.config.vpcScope.padding,
                vpcLayer = parentLayer.insert("g",":first-child").attr("id", "vpc_layer");

            for(let vpcId in vpcScopes){
                let scope = vpcScopes[vpcId];
                vpcLayer.append("rect").attr("ry", 10).attr("x", scope.xMin-padding).attr("y", scope.yMin-padding*1.2).attr("width", scope.xMax-scope.xMin+padding*2).attr("height", scope.yMax-scope.yMin+padding*2.2).style({"stroke": "#007FFF", "stroke-width":2, "stroke-opacity":0.6, "fill": "#FFFFFF", "opacity": 0.6});
                vpcLayer.append("image").attr({
                    "xlink:href": `${IMG_FOLDER}/cloud.svg`,
                    "x": scope.xMin-padding+10,
                    "y": scope.yMin-padding*1.2+5,
                    "width": 50,
                    "height": 50,
                    "type": "cloud"
                });
                vpcLayer.append("text").attr("x", scope.xMin-padding+70).attr("y", scope.yMin-padding*1.2+25).text(scope.name).style({"font-size":"16px", "font-weight":"bold", "fill": "#007FFF", "opacity": 0.6});
                vpcLayer.append("text").attr("x", scope.xMin-padding+70).attr("y", scope.yMin-padding*1.2+45).text(scope.region).style({"font-size":"14px", "fill": "#007FFF", "opacity": 0.6});
            }

            this._exportTopology();
        },

        _exportTopology() {
            // check if IE
            if(this._isIE()){
                this._onTopologyRenderComplete();
                return;
            }

            let overviewWidth = this.svgContext.overviewWidth,
                overviewHeight = this.svgContext.overviewHeight,
                padding = this.config.vpcScope.padding,
                xMin = this.svgContext.coordinateScope.xMin,
                yMin = this.svgContext.coordinateScope.yMin,
                viewBox = (xMin-padding) + "," + (yMin-padding*1.5) + "," + (overviewWidth+padding*2) + "," + (overviewHeight+padding*2.5),
                svgContainerHTML = $(".svg-container").html(),
                storeConfig = this.config.topologyStore,
                exportKey = storeConfig.exportKey;

            let url=splunkd_utils.fullpath("saas-aws/splunk_app_aws_topology_export", {
                app: appName,
                sharing: 'app'
            });

            $.ajax({
                url: `${url}?output_mode=json`,
                type: "post",
                dataType: "json",
                data: {
                    "name": "topology_entity",
                    "viewbox": viewBox,
                    "overview_width": overviewWidth,
                    "overview_height": overviewHeight,
                    "svgcontainer_html": svgContainerHTML
                },
                success: (result) => {
                    if(this.isRenderEnds){
                        return;
                    }

                    this._onTopologyRenderComplete();

                    if(result.entry && result.entry.length===1 && result.entry[0].content && result.entry[0].content.svg){
                        // cache exported topology png
                        sessionStorage[exportKey] = result.entry[0].content.svg;
                        // enable camera button
                        $('#cameraBtn').removeClass('disabled');
                    }
                },
                error: () => {
                    $("#loadingLayer").hide();
                }
            });
        },

        _onTopologyRenderComplete() {
            $("#loadingLayer").hide();

            // make overview map enabled
            this.model.viewModel.set('overview', true);

            // support drilldowns for layers
            let tokenCheckboxMap ={
                'layers.cpuLayer': '#cpu-layer-check',
                'layers.networkLayer': '#network-layer-check',
                'layers.billingLayer': '#billing-layer-check',
                'layers.configRuleLayer': '#rule-layer-check',
                'layers.inspectorLayer': '#rule-layer-check',
                'layers.iamConfigRuleLayer': '#iam-rule-layer-check'
            };

            for(let token in tokenCheckboxMap){
                if(tokenCheckboxMap.hasOwnProperty(token)){
                    let checkbox = tokenCheckboxMap[token],
                        tokenValue = tokenModel.get(token);
                    if(!_.isUndefined(tokenValue) && !!tokenValue && tokenValue !== 'false'){
                        $(checkbox).prop('checked', true).change();
                    }
                }
            }

            // support drilldowns for resource id
            let resourceId= tokenModel.get('resourceId');

            if(!_.isUndefined(resourceId)){
                this.model.viewModel.set('selected', {
                    id: resourceId
                });
            }
        },

        _downloadFile(fileName, content) {
            var aLink = document.createElement('a');
            aLink.href = "data:text/plain," + content;
            var evt = document.createEvent("MouseEvents");
            evt.initEvent("click", false, false);
            aLink.download = fileName;
            aLink.dispatchEvent(evt);
        },

        _getOpacityOfImage(d) {
            if($("#cpu-layer-check").is(":checked")){
                return d.cpu_opacity || 1;
            }
            return 1;
        },

        _getOpacityOfText(d) {
            if($("#cpu-layer-check").is(":checked") && d.type === "i"){
                if(_.isUndefined(d.cpu_opacity)){
                    return 0;
                }
                return d.cpu_opacity;
            }
            return 1;
        },

        _resizeTopologyPanel() {
            let newWidth = this.elements.container_element.width() - this.elements.list_element.outerWidth();
            this.elements.chart_element.width(Math.floor(newWidth));

            let svgWidth = newWidth;
            if (this.model.viewModel.get('recommendation')) {
                svgWidth -= this.elements.recommendation_element.outerWidth();
            }
            d3.select(".svg-container>svg").attr("width", svgWidth);

            this._resizeChartOverview();
            this._refreshChartOverview();
        },

        _getImageURL(d) {
            if (d.type === "i") {
                if(d.status !== RUNNING){
                    return `${IMG_FOLDER}/i-${STOPPED}.svg`;
                } else if($("#cpu-layer-check").is(":checked") && _.isUndefined(d.cpu_opacity)){
                    return `${IMG_FOLDER}/i-nodata.svg`;
                }
            }
            return `${IMG_FOLDER}/${d.type}-normal.svg`;
        },

        _isIE() {
            let ua = window.navigator.userAgent;

            // IE 10
            // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';

            // IE 11
            // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';

            // IE 12 / Spartan
            // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';

            // Edge (IE 12+)
            // ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586';

            let msie = ua.indexOf('MSIE ');
            if (msie > 0) {
                // IE 10 or older
                return true;
            }

            let trident = ua.indexOf('Trident/');
            if (trident > 0) {
                // IE 11
                return true;
            }

            let edge = ua.indexOf('Edge/');
            if (edge > 0) {
                // Edge (IE 12+)
                return true;
            }

            // other browser
            return false;
        },

        _disableRecommZone () {
            $('.recommZone')
                .addClass('disabled')
                .find('#recommBtn')
                .tooltip('destroy')
                .hover(() => {
                    this._showTooltip();
                });

            // by default it shows
            this._showTooltip();
        },

        _showTooltip() {
            $('#recomm-dependency').show();
            $('#recomm-dependency').css('top', $('#recommBtn').offset().top - 115 - $(window).scrollTop());
        }
    });

    return TopologyPanel;
});