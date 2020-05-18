define([
    'underscore',
    'backbone',
    'views/Base',
    'app/views/insights/table/TableConfig'
], function (_, Backbone, BaseView, TableConfig) {

    return BaseView.extend({
        tagName: 'td',
        events: {
            'mouseover': '_eventDispatcher',
            'mouseleave': '_eventDispatcher',
            'click': '_eventDispatcher'
        },
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.data = this.options.data;
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
        // for insights overview table different abnormal rate will have different background color
        _buildColor: function (num) {
            try {
                if (num > 500) {
                    return '#F14E3B';
                } else if (num > 250) {
                    return '#fa8e81';
                } else if (num > 100) {
                    return '#fed1c8';
                } else {
                    return '#FCE9E5';
                }
            } catch (err) {
                console.error(err);
            }
        },

        _eventDispatcher: function (e) {
            let eventType = TableConfig.EVENT.MOUSE;
            let isExpandCell = this.options.type.indexOf('expand') >= 0;
            if (e.type === 'click' && this.options.type.indexOf('drilldown') < 0 && !isExpandCell) {
                // only drilldown and expand cell will trigger click event
                return;
            }
            if (this.options.type.indexOf('multipleLine') >= 0) {
                // trigger on whole group
                this.trigger(eventType, e.type, true, isExpandCell);
            } else {
                this.trigger(eventType, e.type, false, isExpandCell);
            }
        },

        changeBackground: function (relatedClass, isGroup, isAdd) {
            if (isAdd) {
                if (!isGroup && this.options.type.indexOf('multipleLine') >= 0) {
                    // if not in group mode and is multipleLine, not add class
                    return;
                }
                this.$el.addClass(relatedClass);
            } else {
                this.$el.removeClass(relatedClass);
            }
        },

        render: function () {
            if (this.options.type.indexOf('fix') >= 0) {
                this.$el.addClass(TableConfig.CLASS.FIX);
            }
            if (this.options.type.indexOf('toggle') >= 0) {
                this.$el.addClass(TableConfig.CLASS.TOGGLE);
                if (!this.options.toggleState) {
                    this.$el.addClass(TableConfig.CLASS.HIDE);
                }
            }
            if (this.options.type.indexOf('expand') >= 0) {
                this.$el.addClass(TableConfig.CLASS.EXPAND_TOGGLE);
            }
            if (this.options.type.indexOf('index') >= 0) {
                this.$el.addClass(TableConfig.CLASS.INDEX);
                this.$el.css('padding-left', '10px');
            }
            if (this.options.type.indexOf('multipleLine') >= 0) {
                this.$el.attr('rowspan', this.data.rowSpan);
            }
            if (this.options.type.indexOf('color') >= 0) {
                this.$el.css('background-color', this._buildColor(parseFloat(this.data.value.slice(1, this.data.value.length - 1))));
            }
            let cellTemplate = '<%= cellValue %>';
            if (this.options.type.indexOf('drilldown') >= 0) {
                if ('link' in this.data) {
                    cellTemplate = `<a class="${TableConfig.CLASS.LINK}" href="<%= cellLink %>" target="_blank"><%= cellValue %></a>`;
                } else {
                    cellTemplate = `<span class="${TableConfig.CLASS.DRILLDOWN}"><%= cellValue %></span>`;
                }
            }
            if (this.options.type.indexOf('tooltip') >= 0 && 'tooltipTitle' in this.data) { // this cell enable tooltip
                cellTemplate = `<a data-toogle="tooltip" data-placement="${this.options.tooltipPlacement}" 
                                    title="${this.data.tooltipTitle}" onclick="${this.options.tooltipOnClick}" 
                                    class="${TableConfig.CLASS.TOOLTIP}">${cellTemplate}</a>`;
            }
            let cellHTML = _.template(cellTemplate, {cellLink: this.data.link, cellValue: this.data.value});
            this.$el.html(cellHTML);
            if (this.options.type.indexOf('tooltip') >= 0 && 'tooltipTitle' in this.data) { // enable tooltip
                this.$(`.${TableConfig.CLASS.TOOLTIP}`).tooltip({container: 'body'});
            }
            return this;
        }
    });
});
