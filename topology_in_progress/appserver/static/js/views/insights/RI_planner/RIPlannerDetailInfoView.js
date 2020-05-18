define([
    'underscore',
    'backbone',
    'views/Base',
    'splunkjs/mvc',
    'app/views/insights/RI_planner/RIPlannerHelper',
    'contrib/text!app/views/insights/templates/RI_planner/RIPlannerDetailInfoTemplate.html'
], function (_, Backbone, BaseView, mvc, Helper, InfoTemplate) {
    'use strict';
    
    return BaseView.extend({
        tagName: 'div',

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.tokens = mvc.Components.get('default');
        },

        render: function () {
            let applyFlexibility = Helper.checkSizeFlexibility(this.tokens.get('platform'), this.tokens.get('tenancy'));
            let [family, size] = this.tokens.get('instance_type').split('.');
            this.$el.html(_.template(InfoTemplate, {
                accountId: this.tokens.get('accountId'),
                platform: this.tokens.get('platformLabel'),
                tenancy: this.tokens.get('tenancyLabel'),
                region: this.tokens.get('regionLabel'),
                type: this.tokens.get('instance_type'),
                applyFlexibility: applyFlexibility,
                family: family
            }));
            return this;
        }
    });
});
