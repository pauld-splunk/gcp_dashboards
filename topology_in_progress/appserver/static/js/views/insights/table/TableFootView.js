define([
    'underscore',
    'backbone',
    'views/Base',
    'app/views/insights/table/TableFootCellView'
], function (_, Backbone, BaseView, TableFootCellView) {
    return BaseView.extend({
        tagName: 'tr',

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.model = this.options.model;
            this.Config = this.options.Config;
            this.views = [];
            for (let i = 0; i < this.Config.columnName.length; i++) {
                if (this.Config.columnName[i] in this.Config.footerParams) {
                    let curFooterCellParams = $.extend({}, this.Config.footerParams[this.Config.columnName[i]], {
                        index: i,
                        type: this.Config.columnType[i],
                        value: 'N/A'
                    });
                    let curFooterCellView = new TableFootCellView(curFooterCellParams);
                    this.views.push(curFooterCellView);
                }
            }
            this.listenTo(this.model, 'change:rowsReady', this.render.bind(this));
        },

        toggle: function () {
            this.views.forEach(view => {
                view.toggle();
            });
        },

        removeViews: function () {
            this.views.forEach(view => {
                view.remove();
            });
        },

        render: function () {
            if (this.model.get('rowsReady')) {
                this.views.forEach(view => {
                    view.updateOptions({value: this.model.getSummary(view.options.index)});
                    this.$el.append(view.render().$el);
                });
            } else {
                this.removeViews();
            }
            return this;
        }
    });
});
