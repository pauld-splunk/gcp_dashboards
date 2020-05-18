define([
    'jquery',
    'underscore',
    'backbone',
    'splunkjs/mvc',
    'views/Base',
    'app/views/insights/RI_planner/RIPlannerHelper',
    'app/views/insights/RI_planner/RIPlannerConfig',
    'splunkjs/mvc/simpleform/formutils',
    'contrib/text!app/views/insights/templates/RI_planner/OptimalRITooltipTemplate.html',
    'contrib/text!app/views/insights/templates/RI_planner/RIDetailFormulaTooltipTemplate.html'
], function ($, _, Backbone, mvc, BaseView, Helper, Config, FormUtils, OptimalRITooltipTemplate, RIDetailFormulaTooltipTemplate) {
    return BaseView.extend({
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.model = this.options.model;
            this.tokens = mvc.Components.get('default');
            this.formula = null;
            this.applyFlexibility = Helper.checkSizeFlexibility(this.tokens.get('platform'), this.tokens.get('tenancy'));
            this.normalFactor = this.applyFlexibility ? parseFloat(this.tokens.get('normalFactor')) : 1;
            this.listenTo(this.model, 'change:singleData', this.formatData.bind(this));
            this.listenTo(this.tokens, 'change:base', this._updateDrilldown.bind(this));
            this.listenTo(mvc.Components.get('existingRi'), 'rendered', this._renderExistingRi.bind(this));
            this.listenTo(mvc.Components.get('ri'), 'rendered', this._renderRi.bind(this));
            this.listenTo(mvc.Components.get('riCost'), 'rendered', this._renderRiCost.bind(this));
        },

        formatData: function () {
            let payment = this.tokens.get('payment'),
                priceInfo = this.model.get('priceInfo'),
                data = this.model.get('singleData'),
                reservedHourly = priceInfo.onDemandHourly,
                yearly = reservedHourly * Config.ONE_DAY_HOUR * Config.ONE_YEAR_DAY,
                monthly = 0;
            switch (payment) {
                case 'all':
                    reservedHourly = priceInfo.reservedOneAllYearly / (Config.ONE_DAY_HOUR * Config.ONE_YEAR_DAY);
                    yearly = priceInfo.reservedOneAllYearly;
                    break;
                case 'partial':
                    reservedHourly = priceInfo.reservedOnePartialYearly / (Config.ONE_DAY_HOUR * Config.ONE_YEAR_DAY) + priceInfo.reservedOnePartialHourly;
                    yearly = priceInfo.reservedOnePartialYearly;
                    monthly = priceInfo.reservedOnePartialHourly * Config.ONE_DAY_HOUR * (Config.ONE_YEAR_DAY / Config.ONE_YEAR_MONTH);
                    break;
                case 'no':
                    reservedHourly = priceInfo.reservedOneNoHourly;
                    yearly = 0;
                    monthly = priceInfo.reservedOneNoHourly * Config.ONE_DAY_HOUR * (Config.ONE_YEAR_DAY / Config.ONE_YEAR_MONTH);
                    break;
                default:
                    break;
            }
            let ri = parseInt(Helper.calRI(data, reservedHourly, priceInfo.onDemandHourly));
            let {onDemandCost, riCost, totalUnCoveredHours} = Helper.calRICost(data, ri, reservedHourly, priceInfo.onDemandHourly);
            this.formula = _.template(RIDetailFormulaTooltipTemplate, {
                remainedDisplay: (this.applyFlexibility? 'Remained Units':'Remained Hours'),
                RI: ri * this.normalFactor,
                yearly: parseInt(yearly / this.normalFactor),
                monthly: parseFloat(monthly / this.normalFactor).toFixed(2),
                hours: parseInt(totalUnCoveredHours * this.normalFactor),
                hourly: parseFloat(priceInfo.onDemandHourly / this.normalFactor).toFixed(2),
                currencySign: this.tokens.get('currency')
            });
            this.tokens.set('ri', ri * this.normalFactor);
            this.tokens.set('onDemandCost', onDemandCost);
            this.tokens.set('riCost', riCost);
            FormUtils.submitForm({replaceState: true});
        },

        _updateDrilldown: function () {
            let riView = mvc.Components.getInstance('ri');
            let base = this.tokens.get('base');
            riView.getVisualization(function (view) {
                if (base === 'history') {
                    view.settings.set('drilldown', 'all');
                } else {
                    view.settings.set('drilldown', 'none');
                }
            });
        },

        _renderRi: function () {
            if ($('#ri .optimal-RI-tooltip').length <= 0) {
                $('#ri .dashboard-element-title').append(' ' + OptimalRITooltipTemplate);
                $('.optimal-RI-tooltip').tooltip({container: '#ri'});
            }
            // by default, the unit is count
            if(this.applyFlexibility && $('#ri .under-label').length > 0) {
                $('#ri .under-label').text('Unit');
            }
        },

        _renderRiCost: function () {
            if ($('#riCost .delta-label').length > 0) {
                let delta = $('#riCost .delta-label').text();
                delta = delta.indexOf('-') >= 0 ? delta.slice(1) : delta; // remove - symbol
                $('#riCost .delta-label').text(delta);
                $('#riCost text.delta-label').attr('fill', '#5cc05c');
            }
            if ($('#riCost .delta-indicator polyline').length > 0) {
                $('#riCost .delta-indicator polyline').attr({'stroke': '#5cc05c'});
            }
            if ($('#riCost .delta-indicator line').length > 0) {
                $('#riCost .delta-indicator line').attr({
                    'fill': '#5cc05c',
                    'stroke': '#5cc05c'
                });
            }
            if ($('#riCost .single-result-unit').length > 0) {
                $('#riCost .single-result-unit').text(this.tokens.get('currency'));
            }
            if ($('#riCost .RI-formula-tooltip').length > 0) {
                $('#riCost .tooltip').remove();
                $('#riCost .RI-formula-tooltip').remove();
            }
            if (!_.isEmpty(this.formula)) {
                $('#riCost .dashboard-element-title').append(' ' + this.formula);
                $('.RI-formula-tooltip').tooltip({container: '#riCost'});
            }
        },

        _renderExistingRi: function () {
            // by default, the unit is count
            if(this.applyFlexibility && $('#existingRi .under-label').length > 0) {
                $('#existingRi .under-label').text('Unit');
            }
        }
    });

});
