define([
    'underscore',
    'backbone',
    'views/Base',
    'app/views/insights/table/TableConfig'
], function (_, Backbone, BaseView, TableConfig) {
    return BaseView.extend({
        tagName: 'td',

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
        },

        updateOptions: function (newOptions) {
            $.extend(this.options, newOptions);
        },

        toggle: function () {
            if (this.$el.hasClass(TableConfig.CLASS.TOGGLE)) {
                // only toggle-element will be hided or showed
                if (this.$el.hasClass(TableConfig.CLASS.HIDE)) {
                    this.$el.removeClass(TableConfig.CLASS.HIDE);
                } else {
                    this.$el.addClass(TableConfig.CLASS.HIDE);
                }
            }
        },
        
        render: function () {
            if (this.options.type.indexOf('fix') >= 0) {
                this.$el.addClass(TableConfig.CLASS.FIX);
            }
            if (this.options.type.indexOf('toggle') >= 0) {
                this.$el.addClass(TableConfig.CLASS.TOGGLE);
            }
            this.$el.attr(_.omit(this.options, 'value'));
            let cellTemplate = '<%= cellValue %>';

            this.$el.html(_.template(cellTemplate, {
                cellValue: this.options.value
            }));
            return this;
        }
    });
});
