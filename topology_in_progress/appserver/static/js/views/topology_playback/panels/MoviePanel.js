/**
 * Created by frank on 2016-02-17
 */

define([
    'underscore',
    'backbone',
    'app/libs/d3.min',
    'app/views/topology/TopologyConfig',
    'app/views/topology/TopologyAlgorithm',
    'app/views/topology_playback/panels/EventPanel',
    'app/views/topology_playback/utils/AnimationLocker'
], function(_, Backbone, d3, TopologyConfig, TopologyAlgorithm, EventPanel, AnimationLocker){

    const DEFAULT_LINK_STRENGTH = 0.6;
    const RUNNING = 'running', STOPPED = 'stopped';
    const ZOOM_DURATION = 300, SHOW_TEXT_SCALE = 0.5;
    const RENDER_TIME = 1500, FIRST_RENDER_TIME = 3000, TRANSITION_DURATION = 600;
    const HIGHLIGHT_DURATION = 750;

    let {appName, locale, root} = TopologyConfig.context;
    const IMG_PREFIX = `${root}/${locale}/static/app/${appName}/img`;

    return Backbone.View.extend({
        template: '\
            <svg></svg> \
            <div id="event-panel"></div> \
        ',

        loadingTemplate: '\
            <div id="movieLoading"> \
                <div class="loadingArea"> \
                    Loading ... \
                </div> \
            </div> \
        ',

        events: {
            'click .event-details.clickable': '_focusOnResource'
        },

        constructor: function () {
            Backbone.View.apply(this, arguments);
            this.config = TopologyConfig.topologyChartConfig;
            this.zoomBehavior = d3.behavior.zoom().on('zoom', () => {
                let scale = d3.event.scale,
                    translateX = d3.event.translate[0],
                    translateY = d3.event.translate[1];

                this.transformAttr = `translate(${translateX},${translateY})scale(${scale})`;
                // zoom in, zoom out
                if (d3.event.sourceEvent === null) {                    
                    this.renderLayer.transition().duration(ZOOM_DURATION).attr('transform', this.transformAttr);
                } else {
                    // drag
                    this.renderLayer.attr('transform', this.transformAttr);
                }
                // hide text
                scale <= SHOW_TEXT_SCALE ? this.$el.find('text').css('opacity', 0.0) : this.$el.find('text').css('opacity', 1.0);
                this.currentScale = scale;
            });
            this.xCoordinates = {};
            this.yCoordinates = {};
            this.currentScale = 1;

            // create views
            this.eventPanel = new EventPanel({
                model: this.model
            });

            // listen to model
            this.listenTo(this.model.control, 'change:isFirstRender', this._toggleLoading);
        },

        render: function(){
            this.$el.html(this.template);
            this.$el.find('#event-panel').append(this.eventPanel.render().$el);

            return this;
        },

        drawTopology: function(callback, interval, changedResourceIds, needReflow){
            let nodeData = this.model.data.get('nodeData'),
                linkData = this.model.data.get('linkData'),
                isFirstRender = this.model.control.get('isFirstRender');

            // if first render, empty all the cached attributes
            if(isFirstRender){
                this.transformAttr = null;
                this.xCoordinates = {};
                this.yCoordinates = {};
                this.currentScale = 1;
                this.hideLoading();
            }
            // do not need to re-render force layout
            else if(!needReflow){
                this.nodeImages && this.nodeImages.attr('xlink:href', (d) => this._getImageURL(nodeData[d.id]));
                this.nodeCircles && this.nodeCircles.attr('r', 0);
                this.tickTimeout = setTimeout(callback, interval);
                return;
            }

            // remain links with existed nodes
            let effective_linkData = linkData
                .filter(link => link && link.source in nodeData && link.target in nodeData)
                .map(link => {
                    return {
                        source: nodeData[link.source],
                        target: nodeData[link.target]
                    };
                });

            // set initial coordinates
            let data = {
                nodes: nodeData,
                links: effective_linkData
            };

            TopologyAlgorithm.layoutNodes(data, this.config.maxInstanceNum);

            // set DOM
            d3.select('#movie-panel svg g').remove();

            let width = this.$el.parent().width(),
                height = this.$el.parent().height(),
                imageSize = this.config.nodeImage.imageSize;

            this.renderLayer = d3.select('#movie-panel svg').attr({
                width: width,
                height: height
            }).call(this.zoomBehavior).append('g');

            if(this.transformAttr){
                this.renderLayer.attr('transform', this.transformAttr);
            }

            // set force layout
            if(isFirstRender){
                this.force = d3.layout.force()
                    .size([width, height])
                    .linkStrength((link) => {
                        if (link.source.type === 'sg' && link.target.type === 'vpc') {
                            // SG has and only has ONE vpc relationship
                            if (link.source.link_size === 1) {
                                return 1;
                            }
                            return 10;
                        }
                        let linkStrengthMap = this.config.forceChart.linkStrength;
                        return (linkStrengthMap[link.source.type] ? linkStrengthMap[link.source.type][link.target.type] || linkStrengthMap[link.source.type]["*"] || linkStrengthMap["*"][link.target.type] || DEFAULT_LINK_STRENGTH : DEFAULT_LINK_STRENGTH);
                    })
                    .linkDistance((link) => {
                        let linkDistanceMap = this.config.forceChart.linkDistance,
                            callback = linkDistanceMap[link.source.type][link.target.type] || linkDistanceMap[link.source.type]['*'] || linkDistanceMap['*'][link.target.type] || linkDistanceMap['*']['*'];
                        return callback.call(this, link);
                    })
                    .charge(this.config.forceChart.chargeCompute)
                    .gravity(0.15)
                    .nodes(d3.values(data.nodes))
                    .links(data.links)
                    .start();
            }
            else {
                this.force.nodes(d3.values(data.nodes)).links(data.links).start();
            }

            // Draw links
            this.lines = this.renderLayer
                .selectAll('line')
                .data(this.force.links())
                .enter()
                .append('line')
                .style('stroke', this.config.line.color)
                .style('stroke-width', '1px')
                .attr('x1', (d) => this.xCoordinates[d.source.id] || d.source.x)
                .attr('y1', (d) => this.yCoordinates[d.source.id] || d.source.y)
                .attr('x2', (d) => this.xCoordinates[d.target.id] || d.target.x)
                .attr('y2', (d) => this.yCoordinates[d.target.id] || d.target.y)
                .style('display', (d) => this.xCoordinates[d.source.id] && this.yCoordinates[d.source.id] && this.xCoordinates[d.target.id] && this.yCoordinates[d.target.id] ? 'inline' : 'none');

            // Insert Text
            this.nodeTexts = this.renderLayer
                .selectAll('text')
                .data(this.force.nodes())
                .enter()
                .append('text')
                .style({
                    'text-anchor': 'middle',
                    'font-size': '11px',
                    'fill': this.config.nodeText.color
                })
                .text((d) => d.name.length > 18 ? d.name.substring(0, 16) + '...' : d.name)
                .attr('x', (d) => this.xCoordinates[d.id] || d.x)
                .attr('y', (d) => this.yCoordinates[d.id] + imageSize.defaultSize / 2 + 8 || d.y + imageSize.defaultSize / 2 + 8)
                .style('display', (d) => this.xCoordinates[d.id] && this.yCoordinates[d.id] ? 'inline' : 'none')
                .style('opacity', (d) => this.currentScale <= SHOW_TEXT_SCALE ? 0 : 1);

            // Insert highlight circle
            this.nodeCircles = this.renderLayer
                .selectAll('circle')
                .data(this.force.nodes())
                .enter()
                .append('circle')
                .attr('r', (d) => (changedResourceIds[d.id] && !isFirstRender ? 40 : 0))
                .attr('fill', (d) => TopologyConfig.topologyChartConfig.playbackConfig.changedResourceColorMap[d.type])
                .style('opacity', '0.3')
                .attr('cx', (d) => this.xCoordinates[d.id] || d.x)
                .attr('cy', (d) => this.yCoordinates[d.id] || d.y)
                .style('display', (d) => this.xCoordinates[d.id] && this.yCoordinates[d.id] ? 'inline' : 'none');

            // Insert Image
            this.nodeImages = this.renderLayer
                .selectAll('image')
                .data(this.force.nodes())
                .enter()
                .append('image')
                .attr('width', (d) => d.type in imageSize ? imageSize[d.type] : imageSize.defaultSize)
                .attr('height', (d) => d.type in imageSize ? imageSize[d.type] : imageSize.defaultSize)
                .attr('xlink:href', (d) => this._getImageURL(d))
                .attr('x', (d) => this.xCoordinates[d.id] - imageSize.defaultSize / 2 || d.x - imageSize.defaultSize / 2)
                .attr('y', (d) => this.yCoordinates[d.id] - imageSize.defaultSize / 2 || d.y - imageSize.defaultSize / 2)
                .style('display', (d) => this.xCoordinates[d.id] && this.yCoordinates[d.id] ? 'inline' : 'none');

            // Update topology locations
            if (isFirstRender) {
                this.force.on('tick', () => {
                    // when first rendering, needs animation of force chart
                    if(this.model.control.get('isFirstRender')){
                        this._tick(false);
                    }
                }).on('end', () => {
                    // when not first rendering, needs animation of topology transition
                    this._tick(!this.model.control.get('isFirstRender'));

                    // not first anymore
                    this.model.control.set('isFirstRender', false);

                    // release lock
                    AnimationLocker.release();

                    // cache current coordinates
                    this.xCoordinates = {};
                    this.yCoordinates = {};
                    this.nodeImages.data().forEach((node) => {
                        this.xCoordinates[node.id] = node.x;
                        this.yCoordinates[node.id] = node.y;
                    });
                });
            }

            // clear timeout references of last rendering task
            if (this.renderTimeout){
                clearTimeout(this.renderTimeout);
            }
            if (this.tickTimeout){
                clearTimeout(this.tickTimeout);
            }

            // needs more rendering time at the very beginning
            let renderTime = RENDER_TIME;
            if (isFirstRender){
                renderTime = FIRST_RENDER_TIME;
            }

            // lock
            AnimationLocker.lockPreemptively(this);

            // rendering task
            this.renderTimeout = setTimeout(() => {
                this.force.stop();
                this.tickTimeout = setTimeout(callback, interval);
            }, renderTime);
        },

        _getImageURL: function(d){
            if (d.type === 'i' && d.status !== RUNNING) {
                return `${IMG_PREFIX}/i-${STOPPED}.svg`;
            }
            return `${IMG_PREFIX}/${d.type}-normal.svg`;
        },

        _tick: function(isTransition){
            // Locate Images
            let nodeImages = this.nodeImages;
            if(isTransition){
                nodeImages = nodeImages.transition().duration(TRANSITION_DURATION);
            }
            nodeImages.attr('x', (d) => d.x - this.config.nodeImage.imageSize.defaultSize / 2).attr('y', (d) => d.y - this.config.nodeImage.imageSize.defaultSize / 2).style('display', 'inline');

            // Locate circles
            let nodeCircles = this.nodeCircles;
            if(isTransition){
                nodeCircles = nodeCircles.transition().duration(TRANSITION_DURATION);
            }
            nodeCircles.attr('cx', (d) => d.x).attr('cy', (d) => d.y).style('display', 'inline');

            // Locate Texts
            let nodeTexts = this.nodeTexts;
            if(isTransition){
                nodeTexts = nodeTexts.transition().duration(TRANSITION_DURATION);
            }
            nodeTexts.attr('x', (d) => d.x).attr('y', (d) => d.y + this.config.nodeImage.imageSize.defaultSize / 2 + 8).style('display', 'inline');

            // Locate Links
            let lines = this.lines;
            lines = lines.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y).attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y).style('display', 'inline');
            if(isTransition){
                lines.style('opacity', 0).transition().delay(TRANSITION_DURATION).style('opacity', 1);
            }
        },

        _toggleLoading: function() {
            if(this.model.control.get('isFirstRender')){
                let loading = $(this.loadingTemplate);
                if ($('#movieLoading').length === 0) {
                    this.$el.append(loading);
                }

                $('#movieLoading .loadingArea').css('margin-top', this.$el.height() * 2 / 5 + 'px');
                $('#movieLoading').show();
            } else {
                $('#movieLoading').hide();
            }
        },

        _focusOnResource: function(evt) {
            if(!this.model.control.get('playing')){
                let id = $(evt.target).data('id');

                let highLightX = (this.$el.width() - this.$el.find('#event-panel').outerWidth()) / 2,
                    highLightY = (this.$el.height() - $('#control-panel').height()) / 2;

                let highlightItems = this.nodeImages.filter((d) => d.id === id);

                if (!_.isUndefined(highlightItems) && highlightItems.length > 0) {
                    let highlightItem = highlightItems[0][0];
                    if (_.isUndefined(highlightItem)) {
                        return;
                    }
                    let px = highlightItem.x.animVal.value,
                        py = highlightItem.y.animVal.value;
                    this.renderLayer.transition().duration(HIGHLIGHT_DURATION).attr('transform', `translate(${highLightX - px},${highLightY - py})`);
                }
            }
        },

        hideLoading: function() {
            $('#movieLoading').hide();
        }
    });
});