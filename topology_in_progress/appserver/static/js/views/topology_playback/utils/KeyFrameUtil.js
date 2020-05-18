/**
 * Created by frank on 2016-03-25
 */

define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/searchmanager',
    'app/views/topology/TopologyConfig'
], function($, _, mvc, SearchManager, TopologyConfig){

    const MAX_RESULT_COUNT = 100000;

    var tokenModel = mvc.Components.getInstance('default');

    return {
        generateKeyFrames: function(filterTypes){
            var dfd = $.Deferred();

            var resourceIdSearchArr = [],
                searchMap = TopologyConfig.topologyChartConfig.playbackConfig.frameSearchMap;

            for(var type in searchMap){
                if(filterTypes[type]){
                    resourceIdSearchArr.push(searchMap[type]);
                }
            }

            if(filterTypes.vpc){
                resourceIdSearchArr.push(searchMap.igw);
            }

            var resourceIdSPL = `(${resourceIdSearchArr.join(" OR ")})`;

            var searchMgr = new SearchManager({
                id: _.uniqueId('time_frame_search'),
                app: TopologyConfig.context.appName,
                preview: false,
                search: TopologyConfig.topologyChartConfig.playbackConfig.eventFrameSPL.format(resourceIdSPL, resourceIdSPL),
                earliest_time: new Date().getTime() / 1000 - TopologyConfig.topologyChartConfig.playbackConfig.maxTimeRange
            }, {tokens: true});

            var resultModel = searchMgr.data('results', {
                output_mode: 'json',
                count: MAX_RESULT_COUNT
            });

            resultModel.on('data', () => {
                if(resultModel.data().results.length > 0) {
                    dfd.resolve(this._getKeyFrameCountMap(resultModel.data().results));
                }
            });

            return dfd;
        },

        _getKeyFrameCountMap: function(resultArr){
            var timestampCountMap = {},
                nodeMap = {},
                ec2Status = tokenModel.get('form.state');

            for(var i = 0; i < resultArr.length; i++){
                var result = resultArr[i],
                    resourceId = result.resourceId,
                    name = result.resourceName,
                    status = result.resourceStatus,
                    state = result.instanceStatus,
                    timestamp = result.timestamp,
                    isChange = false;

                if(typeof nodeMap[resourceId] === 'undefined'){
                    if(status !== 'ResourceDeleted' && (resourceId.split('-')[0] !== 'i' || ec2Status === '*' || state === ec2Status)){
                        isChange = true;
                    }
                }
                else if(nodeMap[resourceId].status !== status && (status === 'ResourceDeleted' || nodeMap[resourceId].status === 'ResourceDeleted')){
                    isChange = true;
                }
                else if(nodeMap[resourceId].name !== name){
                    isChange = true;
                }
                else if(nodeMap[resourceId].state !== state){
                    isChange = true;
                }
                if(isChange){
                    nodeMap[resourceId] = {
                        name: name,
                        status: status,
                        state: state
                    };
                    if(timestampCountMap[timestamp]){
                        timestampCountMap[timestamp] = timestampCountMap[timestamp] + 1;
                    }
                    else{
                        timestampCountMap[timestamp] = 1;
                    }
                }
            }

            return timestampCountMap;
        }
    };
});