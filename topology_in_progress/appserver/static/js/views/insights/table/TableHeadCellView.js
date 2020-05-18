define([
    'underscore',
    'backbone',
    'views/Base',
    'app/views/insights/table/TableConfig'
], function (_, Backbone, BaseView, TableConfig) {
    return BaseView.extend({
        tagName: 'th',

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
        },

        _clickToggle: function () {
            this.options.toggleState = !this.options.toggleState;
            this.$(`.${TableConfig.CLASS.TOGGLE_CONTROLLER}`).text(this.options.toggleText[this.options.toggleState]);
            this.trigger(TableConfig.EVENT.TOGGLE);
        },

        _clickSortIcon: function () {
            let direction = TableConfig.CLASS.SORT_ICON_DESC;
            if (this.$(`.${TableConfig.CLASS.SORT_ICON}`).hasClass(TableConfig.CLASS.SORT_ICON_DESC)) {
                this.$(`.${TableConfig.CLASS.SORT_ICON}`).removeClass(TableConfig.CLASS.SORT_ICON_DESC);
                this.$(`.${TableConfig.CLASS.SORT_ICON}`).addClass(TableConfig.CLASS.SORT_ICON_ASC);
                direction = TableConfig.CLASS.SORT_ICON_ASC;
            } else if (this.$(`.${TableConfig.CLASS.SORT_ICON}`).hasClass(TableConfig.CLASS.SORT_ICON_ASC)) {
                this.$(`.${TableConfig.CLASS.SORT_ICON}`).removeClass(TableConfig.CLASS.SORT_ICON_ASC);
                this.$(`.${TableConfig.CLASS.SORT_ICON}`).addClass(TableConfig.CLASS.SORT_ICON_DESC);
            } else {
                // By default, it change to DESC first
                this.$(`.${TableConfig.CLASS.SORT_ICON}`).addClass(TableConfig.CLASS.SORT_ICON_DESC);
            }
            this.trigger(TableConfig.EVENT.SORT, this.options.index, direction === TableConfig.CLASS.SORT_ICON_DESC ? -1 : 1);
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

        resetSortIcon: function () {
            if (this.$(`.${TableConfig.CLASS.SORT_ICON}`).length > 0) {
                this.$(`.${TableConfig.CLASS.SORT_ICON}`).removeClass(TableConfig.CLASS.SORT_ICON_DESC);
                this.$(`.${TableConfig.CLASS.SORT_ICON}`).removeClass(TableConfig.CLASS.SORT_ICON_ASC);
            }
        },

        showSortIcon: function () {
            if (this.$(`.${TableConfig.CLASS.SORT_ICON}`).length > 0) {
                this.$(`.${TableConfig.CLASS.SORT_ICON}`).removeClass(TableConfig.CLASS.HIDE);
            }
        },

        toggleSortIcon: function() {
            this._clickSortIcon();
        },

        render: function () {
            if (this.options.type.indexOf('fix') >= 0) {
                this.$el.addClass(TableConfig.CLASS.FIX);
            }
            if (this.options.type.indexOf('toggle') >= 0) {
                this.$el.addClass(TableConfig.CLASS.TOGGLE);
            }
            if (this.options.type.indexOf('expand') >= 0) {
                this.$el.addClass(TableConfig.CLASS.EXPAND_HEAD);
            }
            let moreComponents = '';
            if (this.options.type.indexOf('headerTooltip') >= 0) {
                moreComponents += ' '+this.options.tooltipTemplate;
            }
            if (this.options.type.indexOf('sort') >= 0) { // this cell enable sort
                moreComponents += `<span class="${TableConfig.CLASS.SORT_ICON} ${TableConfig.CLASS.HIDE}"></span>`;
            }
            if (this.options.type.indexOf('toggleController') >= 0) { // this cell is responsible for toggle controlling
                moreComponents += `<a class="${TableConfig.CLASS.TOGGLE_CONTROLLER}" style="float: right;">${this.options.toggleText[this.options.toggleState]}</a>`;
            }
            if(this.options.type.indexOf('expand') >= 0) {
                moreComponents += '<i class="icon-info"></i>';
            }
            this.$el.html(_.template(this.template, {
                name: this.options.name,
                moreComponents: moreComponents
            }));
            if (this.options.type.indexOf('headerTooltip') >= 0) {
                this.$('.optimal-RI-tooltip').tooltip({container: '#container'});
            }
            this.$(`.${TableConfig.CLASS.TOGGLE_CONTROLLER}`).click(this._clickToggle.bind(this));
            this.$(`.${TableConfig.CLASS.SORT_ICON}`).click(this._clickSortIcon.bind(this));
            return this;
        },
        template: '<%= name %><%= moreComponents%>'
    });
});
