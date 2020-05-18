/**
 * Created by zxiao on 9/6/16.
 */
define([
    'app/models/EBSInsightsModel',
    'app/views/insights/table/InsightsRowExpansionView',
    'splunkjs/mvc/tableview',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc',
    'underscore',
    'app/views/dashboard/common',
    'appcss/pages/insights/ebs_insights.pcss',
    'splunkjs/mvc/simplexml/ready!'], function (EBSInsightsModel,
                                                InsightsRowExpansionView,
                                                TableView,
                                                SearchManager,
                                                mvc,
                                                _) {
    let recommendationFilter = mvc.Components.getInstance('recommendation_filter');
    let search = new SearchManager({
        id: 'search_ebs_recommendation_merge',
        search: '',
        preview: false,
        autostart: true
    }, {tokens: true});
    const IOPS_UPPER_THESH = 0.9,
        IOPS_LOWER_THRESH = 0.1;
    let resultData = null;
    search.on('search:done', () => {
        let resultModel = search.data('results', {count: 0, offset: 0});
        resultModel.on('data', () => {
            resultData = resultModel.data();
        });
    });

    recommendationFilter.on('change', () => {
        let filters = recommendationFilter.val();
        let spl = '';
        if (filters.length === 1 && filters[0] === '*')
            filters = ['unattached', 'nonoptimized', 'nosnapshot', 'largeiops', 'smalliops'];
        let filterHash = {unattached: 0, nonoptimized: 0, nosnapshot: 0, largeiops: 0, smalliops: 0};
        for (let i = 0; i < filters.length; i++) {
            filterHash[filters[i]] = 1;
        }
        spl = _splGenerator(filterHash);
        spl = mvc.tokenSafe(spl);
        search.settings.unset('search');
        search.settings.set('search', spl);
    });

    // Ivory will not trigger a change event when the page first loads or refreshes
    recommendationFilter.trigger('change');

    function _splGenerator(filterHash) {
        let splPart1 = '';
        if (filterHash['largeiops'] === 1 || filterHash['smalliops'] === 1) {
            let splBase = `earliest=-7d@h \`aws-cloudwatch-ebs($accountId$, $region$)\` (metric_name="VolumeWriteOps" OR metric_name="VolumeReadOps")
                          | eval Average = Average / period
                          | stats avg(Average) as iops by metric_dimensions
                          | eval iops = round(iops*2, 2)
                          | \`aws-cloudwatch-dimension-rex("VolumeId", "id")\`
                          | fields id, iops
                          | join type=inner id [search earliest=-1d \`aws-description-resource($accountId$, $region$, "ec2_volumes")\` $tags|tag2description$
                          | where iops != "null"
                          | rename iops as piops
                          | fields id, region, size, type, status, piops]
                          | eval iops_perc = iops/piops`,
                splAppend = '';
            if (filterHash['largeiops'] === 1)
                splAppend = `| where iops_perc > ${IOPS_UPPER_THESH}`;
            if (filterHash['smalliops'] === 1) {
                if (splAppend)
                    splAppend += ` OR (iops_perc < ${IOPS_LOWER_THRESH} AND type="io1")`;
                else
                    splAppend = `| where iops_perc< ${IOPS_LOWER_THRESH} AND type="io1"`;
            }
            splAppend += `| eval abnormaltype = case(iops_perc > ${IOPS_UPPER_THESH},"Large IOPS",iops_perc<${IOPS_LOWER_THRESH},"Small IOPS"), Severity=3`;
            splPart1 = splBase + splAppend;
        }

        let splPart2 = '';
        if (filterHash['unattached'] === 1 ||
            filterHash['nonoptimized'] === 1 ||
            filterHash['nosnapshot'] === 1) {
            let splBase = `earliest=-1d \`aws-description-resource($accountId$, $region$, "ec2_volumes")\` $tags|tag2description$
                          | rename attach_data.instance_id as instanceId | fields id, region, instanceId, size, status, type`,
                splAppend = '', evalAppend = '';
            // Step 1
            if (filterHash['nonoptimized'] === 1) {
                splAppend += `| join instanceId type="left"
                             [ search earliest=-1d \`aws-description-resource($accountId$,  $region$ , "ec2_instances")\`
                             | where ebs_optimized="false"
                             | rename id as instanceId, tags.Name as instanceName | fillnull value="N/A" | fields instanceId, instanceName, ebs_optimized]`;
            }
            if (filterHash['nosnapshot'] === 1) {
                splAppend += `| join id type="left"
                             [ search earliest=-1d \`aws-description-resource($accountId$,  $region$ , "ebs_snapshots")\`
                             | rename id as snapshotId, status as snapshotStatus
                             | rename volume_id as id
                             | fields id, snapshotId, snapshotStatus, start_time]
                             | eval snapTime=strptime(start_time, "%Y-%m-%dT%T"), diff=round((now()-snapTime)/86400,0)`;
            }
            // Step 2

            if (filterHash['unattached'] === 1) {
                evalAppend += ', abnormaltype1=case(status!="in-use","Unattached")';
            }
            if (filterHash['nonoptimized'] === 1) {
                evalAppend += ', abnormaltype2=case((ebs_optimized="false" AND type="io1" AND status="in-use"),"Non-Optimized")';
            }
            if (filterHash['nosnapshot'] === 1) {
                evalAppend += ', abnormaltype3=case((NOT (diff>0 AND diff<30)),"No Recent Snapshot")';
            }
            // Step 3
            evalAppend += ', abnormaltype=mvappend(abnormaltype1,abnormaltype2,abnormaltype3)';
            if (filterHash['nosnapshot'] === 1) {
                splAppend += evalAppend;
            } else {
                splAppend += '|eval ' + evalAppend.slice(1)
            }
            splAppend += `| search abnormaltype="*"
                         | mvexpand abnormaltype
                         | eval Severity=case(abnormaltype="Unattached", 1, abnormaltype="Non-Optimized", 1, abnormaltype="No Recent Snapshot", 2)`;
            splPart2 = splBase + splAppend;
        }
        let splRet = '';
        if (splPart1 && splPart2)
            splRet = splPart1 + `| append[search ` + splPart2 + `]`;
        else
            splRet = splPart1 + splPart2;
        return splRet;
    }

    let EBSRecommendationDetail = TableView.BaseRowExpansionRenderer.extend({
        initialize: () => {
            this.detailModel = new EBSInsightsModel();
            this.detailView = new InsightsRowExpansionView({
                model: this.detailModel
            });
        },
        canRender: (rowData) => {
            return true;
        },
        render: ($container, rowData) => {
            this.detailModel.unsetData();
            let ID = _(rowData.cells).find((cell) => {
                    return cell.field === 'ID';
                }).value,
                abnormalType = _(rowData.cells).find((cell) => {
                    return cell.field === 'Insight';
                }).value;
            $container.append(this.detailView.render().el);
            switch (abnormalType) {
                case 'Unattached' :
                    this.detailModel.setUnattachedEBSData(ID);
                    break;
                case 'Non-Optimized' :
                    let instanceId = _getFieldValue(ID, abnormalType, 'instanceId'),
                        instanceName = _getFieldValue(ID, abnormalType, 'instanceName');
                    this.detailModel.setNonOptimizedEBSData(ID, instanceId, instanceName);
                    break;
                case 'No Recent Snapshot' :
                    let lastSnapshot = _getFieldValue(ID, abnormalType, 'snapshotId'),
                        lastTime = _getFieldValue(ID, abnormalType, 'start_time'),
                        snapshotAge = _getFieldValue(ID, abnormalType, 'diff');
                    this.detailModel.setNoSnapshotEBSData(ID, lastSnapshot, lastTime, snapshotAge);
                    break;
                case 'Large IOPS' :
                {
                    let piops = _getFieldValue(ID, abnormalType, 'piops'),
                        iops = _getFieldValue(ID, abnormalType, 'iops');
                    this.detailModel.setLargeIopsEBSData(ID, iops, piops);
                    break;
                }
                case 'Small IOPS' :
                {
                    let piops = _getFieldValue(ID, abnormalType, 'piops'),
                        iops = _getFieldValue(ID, abnormalType, 'iops');
                    this.detailModel.setSmallIopsEBSData(ID, iops, piops);
                    break;
                }
            }
        }
    });

    function _getFieldValue(ID, abnormalType, field) {
        let fieldIdx = _.indexOf(resultData.fields, field),
            idIdx = _.indexOf(resultData.fields, 'id'),
            abnormalTypeIdx = _.indexOf(resultData.fields, 'abnormaltype');

        for (let i = 0; i < resultData.rows.length; i++) {
            if (ID === resultData.rows[i][idIdx] &&
                abnormalType === resultData.rows[i][abnormalTypeIdx]) {
                return resultData.rows[i][fieldIdx];
            }
        }
    }

    const ICONS = {
        'S1': 'alert-circle',
        'S2': 'alert',
        'S3': 'alert',
        'S4': 'alert'
    };

    let SeverityCellRenderer = TableView.BaseCellRenderer.extend({
        canRender: (cell) => {
            return cell.field === 'Severity';
        },
        render: ($td, cell) => {
            var icon = 'question';
            if (ICONS.hasOwnProperty('S' + cell.value)) {
                icon = ICONS['S' + cell.value];
            }
            $td.addClass('icon').html(_.template('<i class="icon-<%-icon%> <%- range %>" title="<%- range %>"></i>', {
                icon: icon,
                range: 'S' + cell.value
            }));
        }
    });

    let resultTable = mvc.Components.getInstance('ebs_recommend_merge');
    resultTable.getVisualization(tableView => {
        tableView.addRowExpansionRenderer(new EBSRecommendationDetail());
    });
    resultTable.getVisualization(tableView => {
        tableView.addCellRenderer(new SeverityCellRenderer())
    });
});