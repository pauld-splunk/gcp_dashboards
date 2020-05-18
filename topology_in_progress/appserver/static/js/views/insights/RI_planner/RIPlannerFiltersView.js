define([
    'underscore',
    'backbone',
    'views/Base',
    'splunkjs/mvc',
    'contrib/text!app/views/insights/templates/RI_planner/RIBasisTooltipTemplate.html'
], function (_, Backbone, BaseView, mvc, BasisTooltipTemplate) {
    const SUBMIT_BUTTON = '.form-submit > button';
    return BaseView.extend({
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.model = this.options.model;
            // tokens
            this.tokens = mvc.Components.get('default');

            // tooltips for basis
            $('#base > label').append(' ' + BasisTooltipTemplate);
            $('.RI-basis-tooltip').tooltip({container: '#container'});
            
            // initial submit button is disabled
            this._submitToggle();

            // add interaction events in page
            this._addEvents();
        },

        _addEvents: function () {
            this.listenTo(this.model, 'change:canSubmit', this._submitToggle.bind(this));
        },

        _submitToggle: function() {
            if(this.model.get('canSubmit') === true) {
                $(SUBMIT_BUTTON).removeClass('disabled');
            }else{
                $(SUBMIT_BUTTON).addClass('disabled');
            }
        }
    });
});
