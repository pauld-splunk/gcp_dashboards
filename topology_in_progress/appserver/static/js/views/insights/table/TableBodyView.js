define([
    'underscore',
    'backbone',
    'views/Base',
    'splunkjs/mvc/paginatorview',
    'app/views/insights/table/TableRowView',
    'app/views/insights/table/TableConfig'
], function (_, Backbone, BaseView, PaginatorView, RowView, TableConfig) {
    return BaseView.extend({
        tagName: 'tbody',
        className: 'table-body',
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.toggleState = true; // by default, toggle all elements
            this.model = this.options.model;
            this.Config = this.options.Config;
            this.views = {};
            this.rowIndex = 0;
            this.accumulationLength = 0;
            this.lastDrilldownRowUniqId = null;
            this.lastExpandRowUniqId = null;
            this.lastDrilldownGroup = false;
            this.listenTo(this.model, 'change:page', this.render.bind(this));
            this.listenTo(this.model, 'change:rowsLength', this.addRows.bind(this));
        },

        toggle: function () {
            this.toggleState = !this.toggleState;
            Object.keys(this.views).forEach(key => {
                this.views[key].toggle();
            });
        },

        render: function () {
            // clear table body
            this.removeViews();
            this._iterateRows();
            return this;
        },

        removeViews: function () {
            Object.keys(this.views).forEach(key => {
                this.stopListening(this.views[key]);
                this.views[key].removeViews();
            });
            this.$(`.${TableConfig.CLASS.EXPAND_CONTENT}`).remove();
            this.views = {};
            // reset table
            this.rowIndex = 0;
            this.accumulationLength = 0;
        },

        addRows: function () {
            if (this.model.get('rowLength') === 0) {
                return;
            }
            let page = this.model.get('page');
            let endLength = (page + 1) * TableConfig.PAGE_SIZE;
            if (this.accumulationLength < endLength) {
                this._iterateRows();
            }
        },

        _iterateRows: function () {
            let rows = this.model.get('rows');
            let page = this.model.get('page');
            let start = page * TableConfig.PAGE_SIZE;
            let end = (page + 1) * TableConfig.PAGE_SIZE - 1;
            for (let i = this.rowIndex; i < rows.length; i++) {
                if (this.accumulationLength > end) {
                    break;
                }
                let indexInTable = (this.accumulationLength - 1) + rows[i].multipleLineLength;
                if (indexInTable < start) {
                    this.accumulationLength += rows[i].multipleLineLength;
                    continue;
                }
                let lengthInRow = Math.min(indexInTable, end) - Math.max(this.accumulationLength, start) + 1;
                let indexInRow = Math.max(this.accumulationLength, start) - this.accumulationLength - 1;
                this._addViews(indexInRow + 1, indexInRow + lengthInRow, rows[i], i);
                if (indexInRow + lengthInRow === rows[i].multipleLineLength - 1) {
                    // current row is finished
                    this.rowIndex += 1;
                }
                this.accumulationLength += indexInRow + lengthInRow + 1;
            }
        },

        _drilldown: function (view, isGroup) {
            if (this.lastDrilldownRowUniqId in this.views) {
                this.views[this.lastDrilldownRowUniqId].changeBackground('remove', this.lastDrilldownGroup);
            }
            this.lastDrilldownRowUniqId = this._buildUniqId(view.data);
            this.lastDrilldownGroup = isGroup;
            view.changeBackground('addclick', isGroup);
            this.model.set('drilldown', this.lastDrilldownRowUniqId + isGroup);
        },

        _expand: function(view) {
            if (this.lastExpandRowUniqId in this.views) {
                this.$(`.${TableConfig.CLASS.EXPAND_CONTENT}`).remove();
                this.views[this.lastExpandRowUniqId].toggleExpandedRow(false);
            }
            let curExpandRowUniqId = this._buildUniqId(view.data);
            if(curExpandRowUniqId != this.lastExpandRowUniqId) {
                view.toggleExpandedRow(true);
                view.$el.after(`<tr class="${TableConfig.CLASS.EXPAND_CONTENT}"><td colspan="${this.Config.columnName.length-1}">${view.data[TableConfig.HTML_CONTENT]}</td></tr>`);
                this.lastExpandRowUniqId = curExpandRowUniqId;
            }else{
                this.lastExpandRowUniqId = null;
            }
        },

        _buildUniqId: function (data) {
            let name = '';
            for (let i = 0; i < this.Config.columnName.length; i++) {
                let curColumnName = this.Config.columnName[i], curColumnType = this.Config.columnType[i];
                if (curColumnType.indexOf('array') < 0) {
                    name += data[curColumnName].value + '_';
                }
            }
            return name;
        },

        _addViews: function (start, end, row) {
            let viewsGroup = [];
            for (let i = start; i <= end; i++) {
                let data = {};
                for (let j = 0; j < this.Config.columnName.length; j++) {
                    let curColumnName = this.Config.columnName[j], curColumnType = this.Config.columnType[j];
                    if (curColumnType.indexOf('index') >= 0) {
                        data[curColumnName] = {value: i + 1};
                    } else if(curColumnType.indexOf('expand') >= 0) {
                        data[curColumnName] = {value: `<a href="#"><i class="${TableConfig.CLASS.EXPAND_ICON_RIGHT}"></i></a>`};
                        data[TableConfig.HTML_CONTENT] = row[TableConfig.HTML_CONTENT];
                    } else {
                        if (curColumnType.indexOf('multipleLine') >= 0) {
                            data[curColumnName] = {value: row[curColumnName].value, rowSpan: end - start + 1};
                        } else if(curColumnType.indexOf('array') >= 0) {
                            data[curColumnName] = {value: row[curColumnName][i]};
                        } else {
                            data[curColumnName] = row[curColumnName];
                        }
                    }
                }
                let view = new RowView({
                    data: data,
                    Config: this.Config,
                    isFirstLine: (i === start),
                    toggleState: this.toggleState
                });
                this.$el.append(view.render().$el);
                viewsGroup.push(view);
                this.views[this._buildUniqId(view.data)] = view;
                this.listenTo(view, TableConfig.EVENT.DRILLDOWN, this._drilldown.bind(this));
                this.listenTo(view, TableConfig.EVENT.EXPAND, this._expand.bind(this));
            }
            viewsGroup.forEach(view => {
                view.relatedViews = viewsGroup;
            });
        }
    });
});
