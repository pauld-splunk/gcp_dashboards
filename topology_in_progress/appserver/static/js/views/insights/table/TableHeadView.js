define([
    'underscore',
    'backbone',
    'views/Base',
    'app/views/insights/table/TableHeadCellView',
    'app/views/insights/table/TableConfig'
], function (_, Backbone, BaseView, TableHeadCellView, TableConfig) {
    return BaseView.extend({
        tagName: 'tr',

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.model = this.options.model;
            this.Config = this.options.Config;
            this.views = [];
            for (let i = 0; i < this.Config.columnName.length; i++) {
                let curHeaderCellParams = $.extend({}, this.Config.headerParams[this.Config.columnName[i]], {
                    index: i,
                    name: this.Config.columnName[i],
                    type: this.Config.columnType[i]
                });
                let curHeaderCellView = new TableHeadCellView(curHeaderCellParams);
                this.views.push(curHeaderCellView);
                this.listenTo(curHeaderCellView, TableConfig.EVENT.TOGGLE, this.toggle.bind(this));
                this.listenTo(curHeaderCellView, TableConfig.EVENT.SORT, this._sort.bind(this));
            }
            this.listenTo(this.model, 'change:rowsReady', this.showSortIcons.bind(this));
        },

        toggle: function () {
            this.views.forEach(view => {
                view.toggle();
            });
            this.trigger(TableConfig.EVENT.TOGGLE);
        },

        toggleSortIcon: function (index) {
            this.views[index].toggleSortIcon();
        },

        showSortIcons: function () {
            if (!this.model.get('rowsReady')) {
                return;
            }
            this.views.forEach(view => {
                view.showSortIcon();
            });
        },

        resetSortIcons: function () {
            this.views.forEach(view => {
                view.resetSortIcon();
            });
        },

        _sort: function (index, direction) {
            for (let i = 0; i < this.views.length; i++) {
                if (i === index) {
                    continue;
                } else {
                    this.views[i].resetSortIcon();
                }
            }
            this.trigger(TableConfig.EVENT.SORT, index, direction);
        },

        render: function () {
            this.views.forEach(view => {
                this.$el.append(view.render().$el);
            });
            return this;
        }
    });
});
