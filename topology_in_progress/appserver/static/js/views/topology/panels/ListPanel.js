define([
    'underscore',
    'jquery',
    'backbone',
    'splunkjs/mvc',
    'splunkjs/mvc/simplesplunkview',
    'app/views/topology/TopologyConfig',
    'app/libs/jquery.ui.autocomplete.min'
], (_, $, Backbone, mvc, SimpleSplunkView, TopologyConfig)=>{

    let {appName, locale, root} = TopologyConfig.context,
        tokenModel = mvc.Components.getInstance("default");

    const IAM_GROUPS = ['user', 'group', 'policy'];
    const DEFAULT_GROUPS =  ['vpc', 'i','subnet'];
    const RESOURCE_GROUPS = ['vpc', 'i', 'subnet', 'vol', 'elb', 'sg', 'eni', 'nic', 'acl', 'rtb'];

    const ELB_RESOURCE_TYPE = 'AWS::EC2::LoadBalancer', ALB_RESOURCE_TYPE = 'AWS::ElasticLoadBalancingV2::LoadBalancer';

    let ListPanel = SimpleSplunkView.extend({

        events: {
            'click .topology-resource-list li': 'onResourceClick',
            'keydown #accordion-autocomplete': 'onAutocomplete',
            'autocompleteselect #accordion-autocomplete': 'onAutocompleteSelect',
            'click .accordion-check': 'onTypeClick',
            'click .topology-accordion-lite-item': 'onTypeLiteClick',
            'click .topology-accordion-toggle': 'onAccordionToggle',
            'click #topology-accordion-control': 'onFold'
        },

        initialize(params){
            SimpleSplunkView.prototype.initialize.apply(this, arguments);

            this.output_mode = 'json';
            this.options = {data:'results'};
            this.config = TopologyConfig.listPanelConfig;
            this.model = new Backbone.Model();
            this.model.viewModel = params.viewModel;
            this.template = '\
                <div id="topology-accordion" class="accordion"> \
                    <input id="accordion-autocomplete" type="text" placeholder="Search by ID or name." /> \
                    <p id="accordion-hint">No results.</p> \
                    <div class="accordion-group"> \
                    <% for(var type in templateData) { %> \
                        <% var item = templateData[type],dataList=item.dataList,count=item.count; %> \
                        <% if(type == "user" || type == "group" || type == "policy"){ continue; %> \
                        <% } else if(typeof dataList==="undefined") { %> \
                            <%  var listItemTitle=item.title+" ("+count+")"; %> \
                            <div class="topology-accordion-toggle disabled"> \
                                <div class="accordion-title" title="<%-listItemTitle%>"> \
                                    <img src="<%-item.iconURL%>"/><%-listItemTitle%> \
                                </div> \
                                <div class="accordion-check unchecked" data-filtertype="<%-type%>"></div> \
                                <div style="clear:both"></div> \
                            </div> \
                        <% } else if(count===0){ %> \
                            <div class="topology-accordion-toggle collapsed"> \
                                <div class="accordion-title"> \
                                    <img src="<%-item.iconURL%>"/><%-item.title%>&nbsp;(0) \
                                </div> \
                                <div class="accordion-check checked"  data-filtertype="<%-type%>"></div> \
                                <div style="clear:both"></div> \
                            </div> \
                        <% } else { %> \
                            <%  var listItemTitle=item.title+" ("+count+")"; \
                                    dataList=dataList.sort(function(a, b){ \
                                        if(a.id>b.id){ \
                                            return 1; \
                                        } \
                                        else if(b.id>a.id){ \
                                            return -1; \
                                        } \
                                        else{ \
                                            return 0; \
                                        } \
                                    }); \
                            %> \
                            <div class="topology-accordion-toggle collapsed" data-toggle="collapse" data-parent="#topology-accordion" href="#<%-item.id%>"> \
                                <div class="accordion-title" title="<%-listItemTitle%>"> \
                                    <img src="<%-item.iconURL%>"/><%-listItemTitle%> \
                                </div> \
                                <div class="accordion-check checked" data-filtertype="<%-type%>"></div> \
                                <div style="clear:both"></div> \
                            </div> \
                            <div id="<%-item.id%>" class="accordion-body collapse"> \
                                <div class="topology-accordion-inner"> \
                                    <ul class="topology-resource-list"> \
                                        <% for(var j = 0; j < dataList.length; j++) { \
                                            var data = dataList[j]; \
                                            var name = data.name + " (" + data.id + ")"; \
                                            var itemName = name; \
                                        %> \
                                        <li title="<%-name%>" data-item="<%-data.id%>"><%=itemName%></li> \
                                        <% }%> \
                                    </ul> \
                                </div> \
                            </div> \
                        <% }%> \
                    <% }%> \
                    <% if(typeof templateData.user.dataList==="undefined" || typeof templateData.group.dataList==="undefined" || typeof templateData.policy.dataList==="undefined"){ %> \
                    <% } else { %> \
                        <div class="topology-accordion-toggle collapsed" data-toggle="collapse" data-parent="#topology-accordion" href="#topology-iam-accordion" style="border-top: 1px dashed #CCC;"> \
                            <div class="accordion-title"> \
                                <img src="<%- iamIconURL %>"/>IAM \
                            </div> \
                            <div class="accordion-check checked" data-filtertype="iam"></div> \
                            <div style="clear:both"></div> \
                        </div> \
                        <div id="topology-iam-accordion" class="accordion-body collapse"> \
                        <%  var iam_types = ["user", "group", "policy"]; \
                            for(var i=0; i<iam_types.length; i++){ \
                                var iam_type = iam_types[i]; \
                        %> \
                            <div class="topology-sub-accordion-toggle collapsed" data-toggle="collapse" href="#<%-templateData[iam_type].id%>"> \
                                <div class="accordion-title"> \
                                    <img src="<%-templateData[iam_type].iconURL%>"/><%-templateData[iam_type].title%>&nbsp;(<%-templateData[iam_type].count%>) \
                                </div> \
                                <div style="clear:both"></div> \
                            </div> \
                            <div id="<%-templateData[iam_type].id%>" class="accordion-body collapse"> \
                                <div class="topology-accordion-inner"> \
                                    <ul class="topology-resource-list"> \
                                        <%  var dataList = templateData[iam_type].dataList; \
                                            dataList=dataList.sort(function(a, b){ \
                                                if(a.name>b.name){ \
                                                    return 1; \
                                                } \
                                                else if(b.name>a.name){ \
                                                    return -1; \
                                                } \
                                                else{ \
                                                    return 0; \
                                                } \
                                            }); \
                                            for(var j = 0; j < dataList.length; j++) { %> \
                                            <li title="<%-dataList[j].name%>" data-item="<%-dataList[j].id%>"><%-dataList[j].name%></li> \
                                        <% }%> \
                                    </ul> \
                                </div> \
                            </div> \
                        <%  } %> \
                        </div> \
                    <% } %> \
                    </div> \
                </div> \
                <div id="topology-accordion-lite"> \
                    <% for(var i = 0; i < liteData.length; i++) { %> \
                        <div id="<%-liteData[i].id%>" data-filtertype="<%-liteData[i].filterType%>" class="topology-accordion-lite-item <%-liteData[i].disabled%>" data-toggle="tooltip" data-placement="right" data-container="body" title="<%-liteData[i].title%>"> \
                            <img src="<%-liteData[i].iconURL%>"/> \
                        </div> \
                    <%  } %> \
                </div> \
                <div id="topology-accordion-control" data-toggle="tooltip" data-placement="right" data-container="body" title="Toggle this panel"> \
                    <i class="<%- foldClass %>" /> \
                    <i class="<%- foldClass %>" /> \
                </div> \
            ';


            /*
            this.template = '\
                <div id="topology-accordion" class="accordion"> \
                    <input id="accordion-autocomplete" type="text" placeholder="Search by ID or name." /> \
                    <p id="accordion-hint">No results.</p> \
                    <div class="accordion-group"> \
                    <% for(var type in templateData) { %> \
                        <% var item = templateData[type],dataList=item.dataList,count=item.count; %> \
                        <% if(type == "user" || type == "group" || type == "policy"){ continue; %> \
                        <% }else if(typeof dataList==="undefined") { %> \
                            <%  var listItemTitle=item.title+" ("+count+")"; \
                            %> \
                            <div class="topology-accordion-toggle disabled"> \
                                <div class="accordion-title" title="<%-listItemTitle%>"> \
                                    <img src="<%-item.iconURL%>"/><%-listItemTitle%> \
                                </div> \
                                <div class="accordion-check unchecked" data-filtertype="<%-type%>"></div> \
                                <div style="clear:both"></div> \
                            </div> \
                        <% }else if(count===0){ %> \
                            <div class="topology-accordion-toggle collapsed"> \
                                <div class="accordion-title"> \
                                    <img src="<%-item.iconURL%>"/><%-item.title%>&nbsp;(0) \
                                </div> \
                                <div class="accordion-check checked"  data-filtertype="<%-type%>"></div> \
                                <div style="clear:both"></div> \
                            </div> \
                        <% }else{ %> \
                            <%  var listItemTitle=item.title+" ("+count+")"; \
                                    dataList=dataList.sort(function(a, b){ \
                                        if(a.id>b.id){ \
                                            return 1; \
                                        } \
                                        else if(b.id>a.id){ \
                                            return -1; \
                                        } \
                                        else{ \
                                            return 0; \
                                        } \
                                    }); \
                            %> \
                            <div class="topology-accordion-toggle collapsed" data-toggle="collapse" data-parent="#topology-accordion" href="#<%-item.id%>"> \
                                <div class="accordion-title" title="<%-listItemTitle%>"> \
                                    <img src="<%-item.iconURL%>"/><%-listItemTitle%> \
                                </div> \
                                <div class="accordion-check checked" data-filtertype="<%-type%>"></div> \
                                <div style="clear:both"></div> \
                            </div> \
                            <div id="<%-item.id%>" class="accordion-body collapse"> \
                                <div class="topology-accordion-inner"> \
                                    <ul class="topology-resource-list"> \
                                        <% for(var j = 0; j < dataList.length; j++) { \
                                            var data = dataList[j], name = data.id + (data.name === data.id || type === "elb" ? "" : " (" + data.name + ")"); \
                                            if (data.resourceType === "AWS::ElasticLoadBalancingV2::LoadBalancer") { \
                                                name = data.name;\
                                            } \
                                            var itemName = name; \
                                            if (type === "elb") { \
                                                var index = name.indexOf("("); \
                                                itemName = name.substring(0, index) + "<br/>" + name.substring(index) \
                                            } \
                                        %> \
                                        <li title="<%-name%>" data-item="<%-data.id%>"><%=itemName%></li> \
                                        <% }%> \
                                    </ul> \
                                </div> \
                            </div> \
                        <% }%> \
                    <% }%> \
                    <% if(typeof templateData.user.dataList==="undefined" || typeof templateData.group.dataList==="undefined" || typeof templateData.policy.dataList==="undefined"){ %> \
                        <div class="topology-accordion-toggle disabled" style="border-top: 1px dashed #CCC;"> \
                            <div class="accordion-title"> \
                                <img src="<%- iamIconURL %>"/>IAM \
                            </div> \
                            <div class="accordion-check unchecked" data-filtertype="iam"></div> \
                            <div style="clear:both"></div> \
                        </div> \
                    <% }else{ %> \
                        <div class="topology-accordion-toggle collapsed" data-toggle="collapse" data-parent="#topology-accordion" href="#topology-iam-accordion" style="border-top: 1px dashed #CCC;"> \
                            <div class="accordion-title"> \
                                <img src="<%- iamIconURL %>"/>IAM \
                            </div> \
                            <div class="accordion-check checked" data-filtertype="iam"></div> \
                            <div style="clear:both"></div> \
                        </div> \
                        <div id="topology-iam-accordion" class="accordion-body collapse"> \
                        <%  var iam_types = ["user", "group", "policy"]; \
                            for(var i=0; i<iam_types.length; i++){ \
                                var iam_type = iam_types[i]; \
                        %> \
                            <div class="topology-sub-accordion-toggle collapsed" data-toggle="collapse" href="#<%-templateData[iam_type].id%>"> \
                                <div class="accordion-title"> \
                                    <img src="<%-templateData[iam_type].iconURL%>"/><%-templateData[iam_type].title%>&nbsp;(<%-templateData[iam_type].count%>) \
                                </div> \
                                <div style="clear:both"></div> \
                            </div> \
                            <div id="<%-templateData[iam_type].id%>" class="accordion-body collapse"> \
                                <div class="topology-accordion-inner"> \
                                    <ul class="topology-resource-list"> \
                                        <%  var dataList = templateData[iam_type].dataList; \
                                            dataList=dataList.sort(function(a, b){ \
                                                if(a.name>b.name){ \
                                                    return 1; \
                                                } \
                                                else if(b.name>a.name){ \
                                                    return -1; \
                                                } \
                                                else{ \
                                                    return 0; \
                                                } \
                                            }); \
                                            for(var j = 0; j < dataList.length; j++) { %> \
                                            <li title="<%-dataList[j].name%>" data-item="<%-dataList[j].id%>"><%-dataList[j].name%></li> \
                                        <% }%> \
                                    </ul> \
                                </div> \
                            </div> \
                        <%  } %> \
                        </div> \
                    <% } %> \
                    </div> \
                </div> \
                <div id="topology-accordion-lite"> \
                    <% for(var i = 0; i < liteData.length; i++) { %> \
                        <div id="<%-liteData[i].id%>" data-filtertype="<%-liteData[i].filterType%>" class="topology-accordion-lite-item <%-liteData[i].disabled%>" data-toggle="tooltip" data-placement="right" data-container="body" title="<%-liteData[i].title%>"> \
                            <img src="<%-liteData[i].iconURL%>"/> \
                        </div> \
                    <%  } %> \
                    <div id="<%-iam.id%>" data-filtertype="<%-iam.filterType%>" class="topology-accordion-lite-item <%-iam.disabled%>" data-toggle="tooltip" data-placement="right" data-container="body" title="<%-iam.title%>" style="border-top: 1px dashed #333; padding-top: 10px"> \
                        <img src="<%-iamIconURL%>"/> \
                    </div> \
                    <div style="clear:both"></div> \
                </div> \
                <div id="topology-accordion-control" data-toggle="tooltip" data-placement="right" data-container="body" title="Toggle this panel"> \
                    <i class="<%- foldClass %>" /> \
                    <i class="<%- foldClass %>" /> \
                </div> \
            ';
            */

            // Listen to filterType field
            this.listenTo(this.model.viewModel, 'change:filterTypes', () => {
                this.render();
            });

            this.listenTo(this.model.viewModel, 'change:listPanelFold', (model, value) => {
                if (value) {
                    this._fold();
                } else {
                    this._unFold();
                }
            });

            this.listenTo(this.model.viewModel, 'change:recommendation', (model, value) => {
                this.model.viewModel.set('listPanelFold', value);
            });

            $('body').on('fullscreenchange webkitfullscreenchange mozfullscreenchange msfullscreenchange', () => {
                let isFullScreen = (document.fullscreen || document.mozFullScreen || document.webkitIsFullScreen || document.msFullscreenElement);
                this.model.viewModel.set('listPanelFold', isFullScreen);
            });
        },

        createView() {
            return {container: this.$el};
        },

        formatData(data) {
            let usedVolumeIds = {},
                policies = {},
                filterTypes = this.model.viewModel.get('filterTypes'),
                hash = {},
                autocompleteHash = {},
                autocompleteList = [],
                templateData = this.config;

            let _extractPoliciesFromData = (policy_entry, is_attached, data_id) => {
                if(is_attached){
                    let name = policy_entry.split(',')[1];
                        policies[policy_entry.split(',')[0]] = name;
                    if(_.isUndefined(autocompleteHash[name])){
                        autocompleteList.push(name);
                        autocompleteHash[name] = name;
                    }
                } else{
                    let name = policy_entry.split(',')[0],
                        id = `policy-${data_id}-${name}`;
                    policies[id] = name;
                    if(_.isUndefined(autocompleteHash[name])){
                        autocompleteList.push(name);
                        autocompleteHash[name] = name;
                    }
                }
            };

            let usedInstanceIds = {};

            data.forEach((datum) => {
                let relationships = datum.relationships;
                let prefix = TopologyConfig.resourceTypeToPrefix[datum.resourceType];

                if (_.isUndefined(relationships) || datum.resourceType === ELB_RESOURCE_TYPE) {
                    return;
                }

                relationships = relationships.split('\n');

                relationships.forEach((relationship) => {
                    let relationship_name = relationship.split(",")[1],
                        relationship_target = relationship.split(",")[0];

                    //if (relationship_name === 'Is attached to Instance' && datum.resourceId.indexOf('vol-') === 0) {
                    if (relationship_name === 'Is attached to Instance' && prefix == "vol") {
                        usedVolumeIds[datum.resourceId] = relationship_target;
                    }
                    else if (prefix == "i"){
                        usedInstanceIds[datum.resourceId] = true;
                    }
                });
            });

            // filter usedVolumeIds
            for(let volId in usedVolumeIds){
                let instanceId = usedVolumeIds[volId];
                if (!usedInstanceIds[instanceId]){
                    delete usedVolumeIds[volId];
                }
            }

            for (let prefix in this.config) {
                if(this.config.hasOwnProperty(prefix)){
                    this.config[prefix].dataList = (filterTypes[prefix] ? [] : undefined);
                    this.config[prefix].count = 0;
                }
            }

            for(let i=0; i<data.length; i++) {
                let dataItem = data[i],
                    id = dataItem.resourceId,
                    name = dataItem.resourceName,
                    resourceType = dataItem.resourceType,
                    prefix = TopologyConfig.resourceTypeToPrefix[resourceType],
                    needPolicy = false;

                if (prefix === 'group' || prefix === 'user'){
                    needPolicy = true;
                }

                if (_.isUndefined(filterTypes[prefix])) {
                    continue;
                }

                if (prefix === 'vol' && _.isUndefined(usedVolumeIds[id])) {
                    continue;
                }

                if (filterTypes[prefix]) {
                    let value = this.config[prefix];
                    if (_.isUndefined(hash[id])) {
                        value.dataList.push({id: id, name: name, resourceType: resourceType});
                        hash[id] = id;
                        this.config[prefix].count++;
                    }
                    if ((_.isUndefined(autocompleteHash[id]) && id) && (prefix !== 'user' && prefix !== 'group') && resourceType !== ALB_RESOURCE_TYPE) {
                        autocompleteList.push(id);
                        autocompleteHash[id] = id;
                    }
                    if (_.isUndefined(autocompleteHash[name]) && name && resourceType !== ELB_RESOURCE_TYPE) {
                        autocompleteList.push(name);
                        autocompleteHash[name] = name;
                    }
                } else {
                    if (_.isUndefined(hash[id])) {
                        hash[id] = id;
                        this.config[prefix].count++;
                    }
                    continue;
                }
                // generate policy list
                if(needPolicy){
                    // attached policies
                    let attachedPolicies = dataItem.attachedPolicies;
                    if(!_.isUndefined(attachedPolicies)){
                        if (!_.isArray(attachedPolicies)) {
                            attachedPolicies = attachedPolicies.split('\n');
                        }
                        for(let j=0; j<attachedPolicies.length; j++){
                            let policy = attachedPolicies[j];
                            _extractPoliciesFromData(policy, true);
                        }
                    }
                    // inline policies
                    if(!_.isUndefined(dataItem.userPolicies) || !_.isUndefined(dataItem.groupPolicies)){
                        let inlinePolicies = dataItem.userPolicies || dataItem.groupPolicies;
                        if (!_.isArray(inlinePolicies)) {
                            inlinePolicies = inlinePolicies.split('\n');
                        }
                        for(let j=0; j<inlinePolicies.length; j++) {
                            let policy = inlinePolicies[j];
                            _extractPoliciesFromData(policy, false, dataItem.resourceId);
                        }
                    }
                }
            }

            autocompleteList = autocompleteList.sort((a, b) => a.localeCompare(b));

            // set policy dataList
            if(filterTypes.policy){
                let policyConfig = this.config['policy'];
                for(let policyArn in policies){
                    policyConfig.count++;
                    policyConfig.dataList.push({
                        id: policyArn,
                        name: policies[policyArn]
                    });
                }
            }

            // prepare data for accordion lite
            const IAMS = ['user', 'group', 'policy'];
            let liteData = Object.keys(this.config)
                .filter(key => (IAMS.indexOf(key) === -1))
                .map(key => {
                    let type = this.config[key];
                    let disabled = !filterTypes[key] ? 'disabled' : '';

                    return {
                        id: type.id + '-lite',
                        title: type.title,
                        iconURL: type.iconURL,
                        disabled: disabled,
                        filterType: key
                    }
                });


            // IAM is a different story...
            let iamDisabled = (_.isUndefined(templateData.user.dataList) || _.isUndefined(templateData.group.dataList) || _.isUndefined(templateData.policy.dataList)) ? 'disabled' : '';
            let iam = {
                id: 'topology-iam-accordion-lite',
                title: 'IAM',
                disabled: iamDisabled,
                filterType: 'iam'
            };

            let foldClass = this.model.viewModel.get('listPanelFold') ? 'icon-chevron-right' : 'icon-chevron-left';

            return {templateData: templateData, liteData:liteData, iam: iam, autocompleteData: autocompleteList, foldClass: foldClass};
        },

        updateView(viz, data) {
            let html = _.template(this.template, {
                templateData: data.templateData,
                liteData: data.liteData,
                iam: data.iam,
                iamIconURL: `${root}/${locale}/static/app/${appName}/img/iam-icon.svg`,
                foldClass: data.foldClass
            });

            $('#accordion-autocomplete').autocomplete('destroy');
            this.$el.find('[data-toggle="tooltip"]').tooltip('destroy');
            this.$el.html(html);
            $('#accordion-autocomplete').autocomplete({source: data.autocompleteData});
            this.$el.find('[data-toggle="tooltip"]').tooltip();

            this.$el.show();
        },

        onResourceClick(event) {
            let $resource = $(event.currentTarget);
            $('.topology-resource-list li').removeClass('active');

            // append timestamp to enable select repeatedly
            $resource.addClass('active');
            this.model.viewModel.set('selected', {
                id: $resource.data('item')
            });
        },

        onAutocomplete(event) {
            $('#accordion-hint').css('visibility', 'hidden');
            if (event.keyCode === 13) {
                let search = $(event.target).val();
                this._autocompleteCallback(search);
            }
        },

        onAutocompleteSelect(event, ui) {
            $('#accordion-hint').css('visibility', 'hidden');
            let search = ui.item.value;
            this._autocompleteCallback(search);
        },

        onTypeClick(event) {
            let $item = $(event.currentTarget),
                type = $item.data('filtertype'),
                types = _.clone(this.model.viewModel.get('filterTypes'));

            if ($item.hasClass('checked')) {
                if (type === 'iam'){
                    IAM_GROUPS.forEach(type => types[type] = false);
                    DEFAULT_GROUPS.forEach(type => types[type] = true);
                } else {
                    types[type] = false;
                }
            } else {
                if (type === 'iam'){
                    IAM_GROUPS.forEach(type => types[type] = true);
                    RESOURCE_GROUPS.forEach(type => types[type] = false);
                } else{
                    types[type] = true;
                    IAM_GROUPS.forEach(type => types[type] = false);
                }
            }

            this.model.viewModel.set('filterTypes', types);

            return false;
        },

        onTypeLiteClick(event) {
            let $item = $(event.currentTarget),
                type = $item.data('filtertype'),
                types = _.clone(this.model.viewModel.get('filterTypes'));

            if (!$item.hasClass('disabled')) {
                if (type === 'iam'){
                    IAM_GROUPS.forEach(type => types[type] = false);
                    DEFAULT_GROUPS.forEach(type => types[type] = true);
                } else {
                    types[type] = false;
                }
            } else {
                if (type === 'iam'){
                    IAM_GROUPS.forEach(type => types[type] = true);
                    RESOURCE_GROUPS.forEach(type => types[type] = false);
                } else{
                    types[type] = true;
                    IAM_GROUPS.forEach(type => types[type] = false);
                }
            }

            this.model.viewModel.set('filterTypes', types);

            return false;
        },

        onAccordionToggle() {
            let $item = $(event.currentTarget);

            $('.topology-accordion-toggle')
                .filter((i, e) => $(e) !== $item)
                .addClass('collapsed');
        },

        onFold() {
            this.model.viewModel.set('listPanelFold', !this.$el.hasClass('topology-list-folded'));
        },

        _fold() {
            this.$el.addClass('topology-list-folded')
            $('#topology-accordion-control')
                .find('.icon-chevron-left')
                .removeClass('icon-chevron-left')
                .addClass('icon-chevron-right');

            // trigger resizing topology panel
            $(window).trigger('resize');
        },

        _unFold() {
            this.$el.removeClass('topology-list-folded')
            $('#topology-accordion-control')
                    .find('.icon-chevron-right')
                    .removeClass('icon-chevron-right')
                    .addClass('icon-chevron-left');

            // trigger resizing topology panel
            $(window).trigger('resize');
        },

        _autocompleteCallback(search) {
            let matchedItems = $('.topology-resource-list').find(`li:contains('${search}')`);
            // if there is matched
            if (matchedItems.length > 0) {
                let matchedOne = $(matchedItems[0]),
                    accordion = $(matchedOne.parents('.accordion-body')[0]);
                // IAM: open first layer
                if ((accordion.attr('id').indexOf('user')!==-1 || accordion.attr('id').indexOf('group')!==-1) && $('#topology-iam-accordion').prev().hasClass('collapsed')){
                    $('#topology-iam-accordion').prev().find('.accordion-title').click();
                }
                // open the accordion
                if (!accordion.hasClass('in')) {
                    accordion.prev().find('.accordion-title').click();
                }
                matchedOne.click();
            } else {
                $('#accordion-hint').css('visibility', 'visible');
            }
        },

        displayMessage() {
            this.$el.hide();
            return this;
        }

    });

    return ListPanel;

});