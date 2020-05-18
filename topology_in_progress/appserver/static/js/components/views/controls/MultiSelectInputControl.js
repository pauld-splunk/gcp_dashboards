define(
    [
        'jquery',
        'underscore',
        'views/shared/controls/Control',
        'splunk.util',
        'select2/select2'
    ],
    function ($,
              _,
              Control,
              splunkUtils) {
        /**
         * Radio button Group
         *
         * @param {Object} options
         *                        {Object} model The model to operate on
         *                        {String} modelAttribute The attribute on the model to observe and update on selection
         *                        {Object} items An array of one-level deep data structures:
         *                                      label (textual display),
         *                                      value (value to store in model)
         */
        var DELIMITER = '::::';
        return Control.extend({
            className: 'control multiselect-input-control splunk-multidropdown splunk-chioce-input',
            filterAll: true,
            initialize: function () {
                if(!_.isUndefined(this.options.filterAll)) {
                    this.filterAll = this.options.filterAll;
                }
                if (this.options.modelAttribute) {
                    this.$el.attr('data-name', this.options.modelAttribute);
                }
                Control.prototype.initialize.call(this, this.options);
            },
            render: function () {
                this.$el.html(this.compiledTemplate({
                    items: this.options.items
                }));
                this.$('select').select2({
                    placeholder: this.options.placeholder,
                    formatNoMatches: function () {
                        return 'No matches found';
                    },
                    value: this._value,
                    dropdownCssClass: 'empty-results-allowed',
                    separator: DELIMITER,
                    // SPL-77050, this needs to be false for use inside popdowns/modals
                    openOnEnter: false
                }).select2('val', splunkUtils.stringToFieldList(this._value || ''));
                return this;
            },
            setItems: function (items, render) {
                render = render || true;
                this.options.items = _.filter(items, item => !_.isUndefined(item.label) && !_.isUndefined(item.value));
                render && this.render();
            },
            remove: function () {
                this.$('select').select2('close').select2('destroy');
                return Control.prototype.remove.apply(this, arguments);
            },
            disable: function () {
                this.options.enabled = false;
                _.debounce(function () {
                    this.$('select').prop('disabled', true);
                }.bind(this), 0)();
            },
            events: {
                'change select': function (e) {
                    var values = e.val || [];
                    if (this.filterAll) {
                        // if choose All, do not need to put other values
                        if (values.length > 1 && values.indexOf('*') !== -1) {
                            values = ['*'];
                        }
                    }

                    this.setValue(splunkUtils.fieldListToString(values), false);
                }
            },
            template: '\
				<select multiple="multiple">\
	                <% _.each(items, function(item, index){ %>\
	                    <option value="<%- item.value %>"><%- item.label %></option>\
                    <% }) %>\
	            </select>'
        });
    }
);