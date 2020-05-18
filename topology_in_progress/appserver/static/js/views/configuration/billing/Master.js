define(
    [
        'jquery',
        'underscore',
        'backbone',
        'views/Base',
        'app/views/configuration/billing/TagModal',
        'contrib/text!app/views/configuration/billing/template.html'
    ],
    function (
        $,
        _,
        Backbone,
        BaseView,
        TagModal,
        htmlTemplate
    ) {
        'use strict';

        return BaseView.extend({
            className: 'billing-tag-view',
            events: {
                'click #edit-billing-tags': 'onEdit'
            },

            initialize() {
                BaseView.prototype.initialize.apply(this, arguments);

                this.model = new Backbone.Model();

                this.listenTo(this.model, 'change:state', this.renderState, this);
                this.listenTo(this.model, 'change:loaded', this.renderLoaded, this);
            },

            renderState(model, value) {
                this.$('#edit-billing-tags').text(value);
            },

            renderLoaded(model, value) {
                if (value) {
                    this.$('#edit-billing-tags')
                        .removeClass('disabled')
                        .text('Select Billing Tags');
                } else {
                    this.$('#edit-billing-tags').addClass('disabled');
                }
            },

            onEdit() {
                this.tagModal.show();
            },

            render() {
                this.$el.html(htmlTemplate);

                if (!this.tagModal) {
                    this.tagModal = new TagModal({
                        model: this.model
                    }).render();
                }

                return this;
            }

        });
    });