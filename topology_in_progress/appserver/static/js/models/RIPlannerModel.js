define([
    'underscore',
    'jquery',
    'backbone',
    'app/views/insights/RI_planner/RIPlannerHelper',
    'app/views/insights/RI_planner/RIPlannerConfig'], function (_, $, Backbone, Helper, Config) {
    return Backbone.Model.extend({
        defaults: {
            rows: [], // rows contains bought RI and suggested RI
            rowsLength: 0, // rows length
            page: 0, // table page
            totalLength: 0, // total rows length
            canSubmit: false,
            rowsReady: true
        },
        emptyRows: function () {
            this.set({rows: []});
            this.set({rowsLength: 0, rowsReady: false});
        },
        addRow: function (row) {
            let rows = this.get('rows');
            rows.push(row);
            this.set({rowsLength: rows.length});
            let totalLength = this.get('totalLength');
            if (rows.length >= totalLength) {
                this.set({rowsReady: true});
            }
        },
        updateTotalLength: function (totalLength) {
            this.set({'page': 0}, {silent: true});
            this.set({'totalLength': totalLength});
        },
        /**
         * Summary designated column information for table footer.
         *
         * @param  {Number} index of column
         * @return  {String} the summary info
         */
        getSummary: function (index) {
            if (Config.TABLE.columnName[index] === '') {
                return 'Total estimated yearly savings:';
            }
            if (index === Config.TABLE.YEARLY_SAVING_INDEX) {
                // calculate total yearly saving
                // If the rows is empty, then summary and return value is 'N/A'.
                // If the rows is not empty, then summary should be something like {'$':'20', '¥':'30'} and
                // corresponding return value is '$20 + ¥30'.
                let summary = 'N/A';
                this.get('rows').forEach(value => {
                    let savings = value[Config.TABLE.columnName[index]].value;
                    let currency = savings.slice(0, 1);
                    let curValue = savings.slice(1).replace(/\,/g, '');
                    if ($.isNumeric(curValue)) {
                        if (summary == 'N/A') {
                            summary = {};
                        }
                        Helper.accumulateToMap(summary, [currency], parseFloat(curValue));
                    } else {
                        return;
                    }
                });
                if(summary !== 'N/A') {
                    summary = Object.keys(summary).map(currency =>{ return `${currency}${numeral(summary[currency]).format('0,0')}`;}).join(' + ');
                }
                return summary;
            }
            return 'N/A';
        },
        sort: function (index, direction) {
            let rows = this.get('rows');
            let r = 0;
            rows.sort((a, b) => {
                r = 0;
                let sortIndex = Config.TABLE.SORT_INDEX.slice(0);
                sortIndex.unshift(index);
                while (sortIndex.length > 0 && r === 0) {
                    let curIndex = sortIndex.shift();
                    let aKey = undefined;
                    let bKey = undefined;
                    if (curIndex === Config.TABLE.YEARLY_SAVING_INDEX) {
                        // remove currency sign and commas
                        aKey = a[Config.TABLE.columnName[curIndex]].value.slice(1).replace(/\,/g, '');
                        bKey = b[Config.TABLE.columnName[curIndex]].value.slice(1).replace(/\,/g, '');
                    } else if (curIndex === Config.TABLE.MESSAGE_INDEX) {
                        aKey = bKey = Config.TABLE.MESSAGE;
                    } else if (curIndex === Config.TABLE.EXISTING_RI_INDEX || curIndex === Config.TABLE.OPTIMAL_RI_INDEX) {
                        aKey = a[Config.TABLE.columnName[curIndex]].value.split('(')[0].trim();
                        bKey = b[Config.TABLE.columnName[curIndex]].value.split('(')[0].trim()
                    } else {
                        aKey = a[Config.TABLE.columnName[curIndex]].value;
                        bKey = b[Config.TABLE.columnName[curIndex]].value;
                    }
                    if ($.isNumeric(aKey) && $.isNumeric(bKey)) {
                        aKey = parseFloat(aKey);
                        bKey = parseFloat(bKey);
                        r = aKey < bKey ? -1 : (aKey > bKey ? 1 : 0);
                    } else if ($.isNumeric(aKey)) {
                        r = 1;
                    } else if ($.isNumeric(bKey)) {
                        r = -1;
                    } else {
                        r = aKey < bKey ? -1 : (aKey > bKey ? 1 : 0);
                    }
                }
                return direction * r;
            });
        }
    });
});