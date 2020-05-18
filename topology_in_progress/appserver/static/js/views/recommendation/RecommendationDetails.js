define([
    'underscore',
    'jquery',
    'views/Base',
    'contrib/text!app/views/recommendation/templates/SGTemplate.html',
    'contrib/text!app/views/recommendation/templates/ELBTemplate.html',
    'contrib/text!app/views/recommendation/templates/EC2Template.html',
    'app/utils/Util',
    'app/utils/HelpLinks'
], function (_, $, BaseView, SGTemplate, ELBTemplate, EC2Template, Utils, HelpLinks) {
    'use strict';


    /**
     * @param {Object} options
     * @param {Number} options.id - The id of this SG.
     * @param {Number} options.region - The region of this SG.
     */
    let SGDetailView = BaseView.extend({
        template: SGTemplate,

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
        },

        render: function () {
            let region = this.options.region || 'REGION';

            this.$el
                .empty()
                .html(_.template(this.template, {
                    id: this.options.id,
                    region: region,
                    learnMore: Utils.buildLinkNode(HelpLinks.AWS_RECOMMENDATION_SECURITYGROUP)
                }));

            return this;
        }
    });

    /**
     * @param {Object} options
     * @param {Number} options.id - The id of this ELB.
     * @param {Number} options.region - The region of this ELB.
     */
    let ELBDetailView = BaseView.extend({
        template: ELBTemplate,

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
        },

        render: function () {
            let name = this.options.id.split('(')[0].trim();
            let region = this.options.region || 'REGION';

            this.$el
                .empty()
                .html(_.template(this.template, {
                    id: this.options.id,
                    region: region,
                    name: name,
                    learnMore: Utils.buildLinkNode(HelpLinks.AWS_RECOMMENDATION_ELB)
                }));

            return this;
        }
    });

    /**
     * @param {Object} options
     * @param {Number} options.id - The id of this EC2.
     * @param {Number} options.action - The action, "upgrade" or "downgrade".
     * @param {Number} options.region - The region of this EC2.
     */
    let EC2DetailView = BaseView.extend({
        template: EC2Template,

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
        },

        render: function () {
            let action = this.options.action.toLowerCase();
            let region = this.options.region || 'REGION';

            this.$el
                .empty()
                .html(_.template(this.template, {
                    id: this.options.id,
                    region: region,
                    utilized: action === 'downgrade' ? 'underutilized' : 'overutilized',
                    reason: action === 'downgrade' ? 'save cost' : 'improve performance',
                    action: action,
                    actioning: action === 'downgrade' ? 'downgrading' : 'upgrading',
                    learnMore: Utils.buildLinkNode(HelpLinks.AWS_RECOMMENDATION_EC2)
                }));

            return this;
        }
    });

    return {
        SGDetailView: SGDetailView,
        ELBDetailView: ELBDetailView,
        EC2DetailView: EC2DetailView
    }
})
;
