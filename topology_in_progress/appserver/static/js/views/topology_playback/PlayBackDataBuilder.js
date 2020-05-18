/**
 * Created by frank on 2016-02-18
 */

define([
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/searchmanager',
    'app/views/topology/TopologyConfig'
], function(_, mvc, SearchManager, TopologyConfig){

    const MAX_RESULT_COUNT = 1000000, RUNNING_STATUS = 'running';

    function PlayBackDataBuilder(controlModel, dataModel){
        // models
        this.controlModel = controlModel;
        this.dataModel = dataModel;

        // tokens
        this.tokenModel = mvc.Components.getInstance('default');

        // search manager
        this.playbackSearchMgr = new SearchManager({
            id: `playback_search${new Date().getTime()}`,
            search: TopologyConfig.topologyChartConfig.playbackConfig.playbackSPL,
            app: TopologyConfig.context.appName,
            preview: false,
            autostart: false
        }, {tokens: true});

        this.snapshotSearchMgr = new SearchManager({
            id: `snapshot_search${new Date().getTime()}`,
            search: TopologyConfig.topologyChartConfig.playbackConfig.snapshotSPL,
            app: TopologyConfig.context.appName,
            preview: false,
            autostart: false
        }, {tokens: true});

        var searchCallback = (properties, searchMgr) => {
            if(properties.content.resultCount === 0){
                this._triggerDataChange();
            }
            else{
                var resultModel = searchMgr.data('results',{
                    output_mode: 'json',
                    count: MAX_RESULT_COUNT
                });
                resultModel.once('data', () => {
                    this._formatSplResults(resultModel.data().results);
                });
            };
        };

        this.playbackSearchMgr.on('search:done', (properties) => {
            searchCallback(properties, this.playbackSearchMgr);
        });

        this.snapshotSearchMgr.on('search:done', (properties) => {
            searchCallback(properties, this.snapshotSearchMgr);
        });

        // EC2 Status
        this.ec2Status = this.tokenModel.get('form.state');
    };

    PlayBackDataBuilder.prototype.build = function(){
        var previousCurrent = this.controlModel.previous('current'),
            current = this.controlModel.get('current'),
            isFirstRender = this.controlModel.get('isFirstRender');

        // render topology through snapshot plus history data
        if (isFirstRender) {
            this.dataModel.set({
                nodeData: {},
                linkData: [],
                linkHash: {}
            });
            this.tokenModel.set('earliest_playback', current - 86400);
            this.tokenModel.set('latest_playback', current);
            this.snapshotSearchMgr.startSearch();
        }
        // when playing
        else {
            this.tokenModel.set('earliest_playback', previousCurrent);
            this.tokenModel.set('latest_playback', current);
            this.playbackSearchMgr.startSearch();
        }
    };

    PlayBackDataBuilder.prototype._formatSplResults = function(splResults){
        var nodeData = this.dataModel.get('nodeData'),
            linkData = this.dataModel.get('linkData'),
            linkHash = this.dataModel.get('linkHash'),
            types = this.dataModel.get('types'),
            needReflow = false,
            eventList = [],
            eventTypes = TopologyConfig.topologyChartConfig.playbackConfig.eventTypes;

        var appendEvent = function(splResult, type, details){
            eventList.push({
                id: splResult.resourceId,
                time: splResult.timestamp,
                account: splResult.resourceAccountId,
                type: type,
                details: details
            });
        };

        // build nodes
        _.each(splResults, (splResult) => {
            var id = splResult.resourceId,
                prefix = id.split('-')[0];

            if(!types[prefix] && prefix !== 'igw'){
                return;
            }
            if(types[prefix] || (prefix === 'igw' && types.vpc)){
                // create
                if((typeof nodeData[id] === 'undefined' || nodeData[id].resourceStatus === 'ResourceDeleted') && splResult.resourceStatus !== 'ResourceDeleted'){

                    // ******************** !!!IMPORTANT!!!**********************************
                    // When creating, if it is ec2 instance, it must match status condition.
                    // However, when modifying, do not need to match status condition.
                    // Because it'd be better to show the status change in the playback.
                    // **********************************************************************

                    if(prefix !== 'i' || this.ec2Status === '*' || splResult.instanceStatus === this.ec2Status){
                        var name = splResult.resourceName;

                        nodeData[id] = {
                            id: id,
                            name: name,
                            type: prefix,
                            status: splResult.instanceStatus
                        };

                        needReflow = true;

                        var details = (splResult.resourceId === name ? splResult.resourceId : `${splResult.resourceId} (${name})`);

                        appendEvent(splResult, eventTypes.createResource, details);
                    }
                }
                else if(typeof nodeData[id] !== 'undefined'){
                    // delete
                    if(splResult.resourceStatus === 'ResourceDeleted'){
                        var name = nodeData[id].name,
                            details = (splResult.resourceId === name ? splResult.resourceId : `${splResult.resourceId} (${name})`);

                        appendEvent(splResult, eventTypes.deleteResource, details);

                        delete nodeData[id];

                        needReflow = true;
                    }
                    // modify
                    else if(this._isResourceModified(nodeData[id], splResult)){
                        var eventType,
                            name = splResult.resourceName;

                        if(nodeData[id].status !== splResult.instanceStatus){
                            if(nodeData[id].status === RUNNING_STATUS){
                                eventType = eventTypes.stopEC2;
                            }
                            else{
                                eventType = eventTypes.startEC2;
                            }
                        }
                        else{
                            eventType = eventTypes.renameResource;
                        }

                        var details = (splResult.resourceId === name ? splResult.resourceId : `${splResult.resourceId} (${name})`);

                        appendEvent(splResult, eventType, details);

                        nodeData[id].name = name;
                        nodeData[id].status = splResult.instanceStatus;
                    }
                }
            }
        });

        // build links
        _.each(splResults, (splResult) => {
            var relationships = splResult.relationships;

            if (_.isUndefined(relationships)) {
                return;
            }

            relationships = relationships.split('\n');

            relationships.forEach((relationship) => {
                var relationship_name = relationship.split(",")[1],
                    relationship_target = relationship.split(",")[0],
                    id = `${splResult.resourceId}#${relationship_target}`;

                // create
                if(!linkHash[id] && linkHash[id] !== 0 && splResult.resourceStatus !== 'ResourceDeleted'){
                    linkData.push({
                        source: splResult.resourceId,
                        target: relationship_target,
                        relation: relationship_name
                    });

                    linkHash[id] = linkData.length - 1;

                    needReflow = true;
                }
                else if(linkHash[id] || linkHash[id] === 0){
                    var index = linkHash[id];
                    // delete
                    if(splResult.resourceStatus === 'ResourceDeleted'){
                        linkHash[id] = false;
                        linkData[index] = null;

                        needReflow = true;
                    }
                }
            });
        });

        // when first rendering, always need to reflow force layout
        this.controlModel.set('needReflow', needReflow || this.controlModel.get('isFirstRender'));

        if(eventList.length > 0){
            // sort by time
            this.dataModel.set('eventList', eventList.sort(function(eventA, eventB){
                return eventA.time - eventB.time;
            }));
        }

        this._triggerDataChange();
    };

    PlayBackDataBuilder.prototype._isResourceModified = function(oldResource, splResult){
        if(oldResource.type === 'i'){
            if(oldResource.status !== splResult.instanceStatus || oldResource.name !== splResult.resourceName){
                return true;
            }
        }
        return false;
    };

    PlayBackDataBuilder.prototype._triggerDataChange = function(){
        this.dataModel.set('lastModified', new Date().getTime());
    };

    PlayBackDataBuilder.prototype.destroy = function(){
        this.playbackSearchMgr.stopListening();
    };

    return PlayBackDataBuilder;
});