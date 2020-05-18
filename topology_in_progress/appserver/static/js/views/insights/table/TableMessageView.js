define([
    'underscore',
    'backbone',
    'views/Base',
    'splunkjs/mvc/paginatorview',
    'app/views/insights/table/TableConfig'
], function (_, Backbone, BaseView, PaginatorView, TableConfig) {
    return BaseView.extend({

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.model = this.options.model;
            this.Config = this.options.Config;
            this.paginator = new PaginatorView({
                page: 0,
                itemCount: this.model.get('rowsLength') || 0,
                pageSize: TableConfig.PAGE_SIZE
            });

            this.paginator.settings.on('change:page', this._changeModelPage.bind(this));
            this.listenTo(this.model, 'change:rowsReady', this._reRender.bind(this));
            this.listenTo(this.model, 'change:rowsLength', this._renderProgressMessage.bind(this));
        },

        _changeModelPage: function () {
            this.model.set({'page': this.paginator.settings.get('page')});
        },

        _renderProgressMessage: function () {
            let totalLength = this.model.get('totalLength');
            let rowsLength = this.model.get('rowsLength');
            if (totalLength > rowsLength) {
                // it needs progress message
                if (rowsLength <= 1) {
                    this.messageDom.html(`<span class="loading-img"><img width="10px" height="10px" src="${TableConfig.LOADING_IMAGE}"> ${rowsLength}/${totalLength} ${this.Config.ITEM_NAME.SINGLE} is loaded.</span>`);
                } else {
                    this.messageDom.html(`<span class="loading-img"><img width="10px" height="10px" src="${TableConfig.LOADING_IMAGE}"> ${rowsLength}/${totalLength} ${this.Config.ITEM_NAME.PLURAL} are loaded.</span>`);
                }
            } else {
                if (rowsLength <= 1) {
                    this.messageDom.html(`<span>${rowsLength} ${this.Config.ITEM_NAME.SINGLE} is loaded.</span>`);
                } else {
                    this.messageDom.html(`<span>${rowsLength} ${this.Config.ITEM_NAME.PLURAL} are loaded.</span>`);
                }
            }
            this.paginator.settings.set({itemCount: this.model.get('rowsLength')});
        },
        
        _reRender: function () {
            if (this.model.get('rowsReady')) {
                this.messageDom.html('');
                this.paginator.settings.set({'page': 0, itemCount: this.model.get('totalLength')});
            } else {
                this.messageDom.html(`<span class="loading-img"><img width="10px" height="10px" src="${TableConfig.LOADING_IMAGE}"> Please waiting ...</span>`);
                this.paginator.settings.set({'page': 0, itemCount: 0});
            }
        },

        render: function () {
            this.$el.html(`<div class="${TableConfig.CLASS.PROGRESS}"></div><div class="${TableConfig.CLASS.PAGINATOR}"></div>`);
            this.$(`.${TableConfig.CLASS.PAGINATOR}`).append(this.paginator.render().$el);
            this.messageDom = this.$(`.${TableConfig.CLASS.PROGRESS}`);
            return this;
        }
    });
});
