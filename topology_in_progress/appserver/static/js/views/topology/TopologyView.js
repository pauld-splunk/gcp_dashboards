define([
    'underscore',
    'jquery',
    'backbone',
    'splunkjs/mvc',
    'splunkjs/mvc/simplesplunkview',
    'app/views/topology/TopologyConfig',
    'app/views/topology/panels/ListPanel',
    'app/views/topology/panels/DetailsPanel',
    'app/views/topology/panels/TopologyPanel',
    'app/views/topology/panels/RecommendationPanel'
], (_, $, Backbone, mvc, SimpleSplunkView, TopologyConfig, ListPanel, DetailsPanel, TopologyPanel, RecommendationPanel) => {

    let tokenModel = mvc.Components.getInstance("default");

    class TopologyView extends SimpleSplunkView {

        constructor(params){
            super(params);
            this.output_mode= 'json';
            this.options={data: 'results'};
        }

        initialize() {
            SimpleSplunkView.prototype.initialize.apply(this, arguments);

            this.template = '\
                <div class="topology-list"></div>\
                <div class="topology-chart"></div>\
                <div class="topology-details"></div>\
                <div class="topology-recomm"></div>';

            this.initFilterTypes();
        }

        createView() {
            let offsetTop = this.$el.offset().top;
            let innerHeight = $(window).innerHeight();
            this.$el.css('height', innerHeight - offsetTop - 20);
            this.$el.html(_.template(this.template));

            let $list = $('.topology-list');
            let $chart = $('.topology-chart').css('width', (this.$el.width() - $list.outerWidth()) + 'px');
            let $details = $('.topology-details');
            let $recomm = $('.topology-recomm');

            let topology = new TopologyPanel({
                el: $chart,
                managerid: this.manager.id,
                viewModel: this.model,
                id: this.id + '-chart',
                name: this.name + '-chart'
            });

            let list = new ListPanel({
                el: $list,
                managerid: this.manager.id,
                viewModel: this.model,
                id: this.id + '-list',
                name: this.name + '-list'
            });

            let details = new DetailsPanel({
                el: $details,
                managerid: this.manager.id,
                viewModel: this.model,
                id: this.id + '-details',
                name: this.name + '-details'
            }).render().el;

            let recomm = new RecommendationPanel({
                el: $recomm,
                managerid: this.manager.id,
                viewModel: this.model,
                id: this.id + '-recomm',
                name: this.name + '-recomm'
            }).render().el;

            // when full-screen, prevent mouse scroll
            $('body').on('mousewheel', function(event){
                if ($('#fit-size').val() === 'screen' && $(event.target).parents('.topology-details').length===0) {
                    return false;
                }
            });

            return {container: this.$el, list: $list, chart: $chart, details: $details};
        }

        // making the data look how we want it to for updateView to do its job
        formatData(data) {
            return {data: data};
        }

        updateView(viz, data) {
            return;
        }

        // do not empty viz while change time range
        displayMessage() {
            if (!$('.topology-list').length) {
                SimpleSplunkView.prototype.displayMessage.apply(this, arguments);
            }
            if ($('#fit-size').length) {
                $('#fit-size').val('area').change();
            }
            $('#chart-overview').hide();
            return this;
        }

        initFilterTypes() {
            let filterTypes = tokenModel.get('filterTypes') || 'vpc,subnet,i';

            let types = filterTypes.split(',');
            types.forEach((type) => {
                TopologyConfig.defaultFilterTypes[type] = true;
            });

            this.model = new Backbone.Model();
            this.model.set('filterTypes', TopologyConfig.defaultFilterTypes);
        }

    }

    return TopologyView;
});
