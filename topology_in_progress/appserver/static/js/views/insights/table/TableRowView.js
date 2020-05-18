define([
    'underscore',
    'backbone',
    'views/Base',
    'app/views/insights/table/TableRowCellView',
    'app/views/insights/table/TableConfig'
], function (_, Backbone, BaseView, TableRowCellView, TableConfig) {
    return BaseView.extend({
        tagName: 'tr',

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.Config = this.options.Config;
            this.data = this.options.data;
            this.views = [];
            this.relatedViews = [];
            for (let i = 0; i < this.Config.columnName.length; i++) {
                let curType = this.Config.columnType[i], curData = this.data[this.Config.columnName[i]], curParams=this.Config.columnParams[this.Config.columnName[i]];
                if (!this.options.isFirstLine && curType.indexOf('multipleLine') >= 0) {
                    continue;
                }
                let curRowCellParams = $.extend({}, curParams, {
                    type: curType,
                    data: curData,
                    toggleState: this.options.toggleState
                });
                let curRowCellView = new TableRowCellView(curRowCellParams);
                this.views.push(curRowCellView);
                this.listenTo(curRowCellView, TableConfig.EVENT.MOUSE, this.changeBackground.bind(this));
            }
        },

        toggle: function () {
            this.views.forEach(view => {
                view.toggle();
            });
        },

        removeViews: function () {
            this.views.forEach(view => {
                this.stopListening(view);
                view.remove();
            });
            this.remove();
            this.views = [];
        },

        render: function () {
            this.views.forEach(view => {
                this.$el.append(view.render().$el);
            });
            return this;
        },

        toggleExpandedRow(isExpand) {
            let expandIconIndex = 0;
            for (let i = 0; i < this.Config.columnType.length; i++) {
                if (this.Config.columnType[i].indexOf('expand') >= 0){
                    expandIconIndex = i;
                    break;
                }
            }
            let expandView = this.views[expandIconIndex];
            if (isExpand) {
                this.$el.addClass(TableConfig.CLASS.EXPAND_ROW);
                expandView.$el.attr('rowspan', '2');
                expandView.$('i').removeClass(TableConfig.CLASS.EXPAND_ICON_RIGHT);
                expandView.$('i').addClass(TableConfig.CLASS.EXPAND_ICON_DOWN);
            }else{
                this.$el.removeClass(TableConfig.CLASS.EXPAND_ROW);
                expandView.$el.removeAttr('rowspan');
                expandView.$('i').removeClass(TableConfig.CLASS.EXPAND_ICON_DOWN);
                expandView.$('i').addClass(TableConfig.CLASS.EXPAND_ICON_RIGHT);
            }
        },

        changeBackground: function (type, isGroup = false, isExpand = false) {
            if (type === 'click' && !isExpand) {
                this.trigger(TableConfig.EVENT.DRILLDOWN, this, isGroup);
                return;
            }
            // appearance change
            if (isGroup) {
                this.relatedViews.forEach(relatedView => {
                    relatedView.views.forEach(rowView => {
                        if (type === 'mouseover') {
                            rowView.changeBackground(TableConfig.CLASS.HIGHLIGHT, true, true);
                        } else if (type === 'mouseleave') {
                            rowView.changeBackground(TableConfig.CLASS.HIGHLIGHT, true, false);
                        } else if (type === 'addclick') {
                            rowView.changeBackground(TableConfig.CLASS.CLICK, true, true);
                        } else { // remove click
                            rowView.changeBackground(TableConfig.CLASS.CLICK, true, false);
                        }

                    });
                });
            } else {
                this.views.forEach(rowView => {
                    if (type === 'mouseover') {
                        rowView.changeBackground(TableConfig.CLASS.HIGHLIGHT, false, true);
                    } else if (type === 'mouseleave') {
                        rowView.changeBackground(TableConfig.CLASS.HIGHLIGHT, false, false);
                    } else if (type === 'addclick') {
                        rowView.changeBackground(TableConfig.CLASS.CLICK, false, true);
                    } else {
                        rowView.changeBackground(TableConfig.CLASS.CLICK, false, false);
                    }
                });
            }

            if(type === 'click' && isExpand) {
                this.trigger(TableConfig.EVENT.EXPAND, this);
            }
        }
    });
});
