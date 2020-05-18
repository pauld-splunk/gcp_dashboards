/**
 * Created by peter on 6/5/15.
 */
define(
    [
        'jquery',
        'underscore',
        'backbone',
        'models/Base',
        'views/Base',
        'app/views/configuration/billing/Master',
        'app/views/configuration/warning_message/Master',
        'app/views/common/BaseSection',
        'app/partyjs/PartyController',
        'app/models/Config'
    ],
    function (
        $,
        _,
        Backbone,
        BaseModel,
        BaseView,
        BillingTagView,
        WarningMessageView,
        BaseSection,
        PartyController,
        Config
    ) {
        'use strict';

        return BaseView.extend({
            initialize: function (options) {
                BaseView.prototype.initialize.apply(this, arguments);

                this.children.messageSettingView = new WarningMessageView();
                this.children.billingTagView = new BillingTagView();

                this.children.billingSection = new BaseSection({
                    className: 'billing-setting-section',
                    label: _('Billing').t()
                });

                this.children.billingSection.renderContent = ($content) => {
                    $content.append(this.children.billingTagView.render().el);
                };

                this.children.baseSection = new BaseSection({
                    className: 'other-setting-section'
                });

                this.children.baseSection.renderContent = ($content) => {
                    // do not show toggler when non-admin
                    if (Config.contextData.IS_ADMIN) {
                        PartyController.renderToggler($content);
                    }
                    $content.append(this.children.messageSettingView.render().el);
                };

                PartyController.checkStatus();

                PartyController.startParty();

                PartyController.collectConfigData();
                PartyController.collectUsage();
            },

            render: function () {
                // do not show "edit billing tags" button when the user is not aws admin
                if (Config.contextData.IS_AWS_ADMIN) {
                    this.$el.append(this.children.billingSection.render().el);
                }
                this.$el.append(this.children.baseSection.render().el);

                return this;
            }

        });
    });
