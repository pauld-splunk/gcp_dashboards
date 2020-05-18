define([
    'underscore',
    'backbone',
    'views/Base',
    'app/views/insights/table/TableBodyView',
    'app/views/insights/table/TableHeadView',
    'app/views/insights/table/TableFootView',
    'app/views/insights/table/TableMessageView',
    'app/views/insights/table/TableConfig',
    'contrib/text!app/views/insights/templates/table/TableTemplate.html',
    'appcss/pages/insights/table.pcss',
    'views/shared/results_table/ResultsTableMaster.pcss'
], function (_, Backbone, BaseView, TableBodyView, TableHeadView, TableFootView, TableMessageView, Config, TableTemplate) {
    return BaseView.extend({
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.model = this.options.model;
            this.Config = this.options.Config;
            this.bodyView = new TableBodyView({
                paginatorDom: `.${Config.CLASS.PAGINATOR}`,
                messageDom: `.${Config.CLASS.PROGRESS}`,
                Config: this.Config,
                model: this.model
            });
            this.headView = new TableHeadView({
                Config: this.Config,
                model: this.model
            });
            this.footView = new TableFootView({
                Config: this.Config,
                model: this.model
            });
            this.messageView = new TableMessageView({
                Config: this.Config,
                model: this.model
            });
            this.listenTo(this.headView, Config.EVENT.TOGGLE, this.bodyView.toggle.bind(this.bodyView));
            this.listenTo(this.headView, Config.EVENT.SORT, this.sort);
        },

        sort: function (index, direction) {
            this.model.sort(index, direction);
            this.bodyView.render();
        },

        render: function () {
            this.$el.html(TableTemplate);
            this.$('.table-head').append(this.headView.render().$el);
            this.$('.table-foot').append(this.footView.render().$el);
            this.$('.table-message').append(this.messageView.render().$el);
            this.$('.table-head').after(this.bodyView.render().$el);
            // by default, all toggle-elements are hide
            this.headView.toggle();
            return this;
        }
    });
});
