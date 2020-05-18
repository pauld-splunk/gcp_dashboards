define([
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/searchmanager',
    'app/views/topology/TopologyConfig',
    'app/views/dashboard/common',
    'splunkjs/mvc/simplexml/ready!'
], function(_, mvc, TableView, SearchManager, TopologyConfig) {
    'use strict';

    // set token filters
    mvc.setFilter('rule2default', function(inputValue) {
        if (inputValue && inputValue.length > 0) {
            return `ConfigRuleName=${inputValue}`;
        } else {
            return inputValue;
        }
    });

    mvc.setFilter('rule2details', function(inputValue) {
        if (inputValue && inputValue.length > 0) {
            return `EvaluationResultIdentifier.EvaluationResultQualifier.ConfigRuleName=${inputValue}`;
        } else {
            return inputValue;
        }
    });

    // generate hyperlink to topology
    var HyperLinkRenderer = TableView.BaseCellRenderer.extend({
        initialize(options) {
            TableView.BaseCellRenderer.prototype.initialize.apply(this, arguments);
        },
        canRender(cell) {
            return cell.field === 'Link';
        },
        render($td, cell) {
            var filterTypes,
                layer,
                cellArr = cell.value.split(','),
                resourceType = cellArr[1],
                resourceTypeToPrefix = TopologyConfig.resourceTypeToPrefix;

            // check if this resource type is supported in topology
            if (_.isUndefined(resourceTypeToPrefix[resourceType])) {
                return;
            }

            if (resourceType.indexOf('AWS::IAM') === 0) {
                filterTypes = 'user,group,policy';
                layer = 'layers.iamConfigRuleLayer';
            }
            else {
                filterTypes = `vpc,subnet,i,${TopologyConfig.resourceTypeToPrefix[resourceType]}`;
                layer = 'layers.configRuleLayer';
            }

            $td.html(_.template(this.template, {
                resourceId: cellArr[0],
                filterTypes: filterTypes,
                layer: layer
            })).click((evt) => {
                // disable default drilldown behavior when clicking this cell
                evt.stopPropagation();
            });
        },
        template: '\
            <a target="_blank" href="topology?filterTypes=<%-filterTypes%>&resourceId=<%-resourceId%>&<%-layer%>=true&form.state=*&form.accountId=*&form.region=*&form.vpc=*&disableLocalToken=true"> \
                Show in Topology \
            </a> \
        '
    });

    Object.keys(mvc.Components.attributes).forEach((componentName) => {
        var component = mvc.Components.get(componentName);

        if (typeof component.getVisualizationType !== 'undefined') {
            var vizType = component.getVisualizationType();

            if (vizType === 'table' || vizType === 'statistics') {
                // hyperlink renderer
                component.getVisualization(function(tableView) {
                    tableView.table.addCellRenderer(new HyperLinkRenderer());
                    tableView.table.render();
                });
            }
        }
    });

    // render expansion rows showing the details of config rules
    var ConfigRuleDetailsRowRenderer = TableView.BaseRowExpansionRenderer.extend({
        template: '\
            <table> \
                <tr><th>Rule Arn: </th><td><%-ConfigRuleArn%></td></tr> \
                <tr><th>Rule ID: </th><td><%-ConfigRuleId%></td></tr> \
                <tr><th>Rule Name: </th><td><%-ConfigRuleName%></td></tr> \
                <tr><th>Rule Type: </th><td><%-type%></td></tr> \
                <tr><th>Rule State: </th><td><%-ConfigRuleState%></td></tr> \
                <tr><th>Resource Type(s): </th><td><%-ResourceTypes%></td></tr> \
                <tr><th>Rule Description: </th><td><%-Description%></td></tr> \
            </table> \
        ',

        cacheData: {},

        canRender: function (rowData) {
            return true;
        },

        render: function ($container, rowData) {
            var ruleName = _(rowData.cells).find((cell) => {
                return cell.field === 'Rule Name';
            }).value,
            region = _(rowData.cells).find((cell) => {
                return cell.field === 'Region';
            }).value,
            accountId = _(rowData.cells).find((cell) => {
                return cell.field === 'Account ID';
            }).value;

            $container.html('<p>Loading ...</p>');

            var spl = '`aws-config-rule($accountId$, $region$, "")` ' + `ConfigRuleName=${ruleName} region=${region} account_id=${accountId} | head 1 | eval type=if('Source.Owner'="AWS", "AWS Managed Rule", "Custom Rule") | rename Scope.ComplianceResourceTypes{} as ResourceTypes | fillnull value="N/A" Description ResourceTypes | table ConfigRuleName, ConfigRuleId, ConfigRuleArn, ConfigRuleState, Description, type, ResourceTypes`,
                cacheId = spl;

            if (typeof this.cacheData[cacheId] === 'undefined') {
                var sm = new SearchManager({
                    id: _.uniqueId(),
                    search: spl,
                    autostart: true
                }, {tokens: true});

                sm.on('search:done', (properties) => {
                    if(properties.content.resultCount !== 0) {
                        var resultModel = sm.data('results', {
                            output_mode: 'json'
                        });
                        resultModel.once('data', () => {
                            var result = resultModel.data().results[0],
                                resourceTypes = result['ResourceTypes'];

                            if (_.isArray(resourceTypes)) {
                                resourceTypes = resourceTypes.join(', ');
                            }
                            result['ResourceTypes'] = resourceTypes;

                            var html = _.template(this.template, result);
                            $container.html(html);
                            this.cacheData[cacheId] = html;
                        });
                    }
                    else {
                        $container.html('No config rule found.');
                    }
                });
            }
            else {
                $container.html(this.cacheData[cacheId]);
            }
        }
    });

    var resourceTable = mvc.Components.getInstance("nonCompliantResourceDetails");
    resourceTable.getVisualization(function (tableView) {
        tableView.addRowExpansionRenderer(new ConfigRuleDetailsRowRenderer());
    });
});