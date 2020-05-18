"use strict";

define([
  "underscore",
  "splunkjs/mvc/multidropdownview",
  "splunkjs/mvc/simpleform/formutils",
  "splunkjs/mvc/simpleform/input/base",
  "app/utils/InputUtil",
  "app/views/rds/utils"
], function(
  _,
  MultiDropdownView,
  FormUtils,
  BaseInput,
  InputUtil,
  utils
) {
  var InstancMultiDropdownView = MultiDropdownView.extend({
    // @override
    // Prepares the id - engine mapping
    // so we can get what engines are currently selected later
    convertDataToChoices: function(data) {
      data = data || this._data || [];

      var valueField = this.settings.get("valueField") || 'value';

      var choices = Array.prototype.slice.call(this.settings.get('choices') || []);

      var engines = _(choices.concat(data)).reduce(function(obj, row) {
        var engine = row.engine;
        if(!_.isUndefined(engine) && !_.isNull(engine)) {
          obj[row[valueField]] = engine;
        }
        return obj;
      }, {});

      this.settings.set("rdsEngines", engines);

      return MultiDropdownView.prototype.convertDataToChoices.apply(this, arguments);
    },

    // it's suggested not to show the logos now.
    // when we change our mind, rename this method to `_select2`.
    _select2_with_icon: function(item, options) {
      var self = this;

      function format(item, el) {
        if(item) {
          var id = item.id,
            text = item.text;

          // Update each row in the open dropdown to have a tooltip
          el.attr('title', text);

          if(id === "*") { return text; }

          var engines = self.settings.get("rdsEngines");
          var engine = engines[id];

          if(_.isUndefined(engine)) {
            return text;
          } else {
            return utils.getLogoImg(engine) + text;
          }
        } else {
          return item;
        }
      }

      options = _.extend(options || {}, {
        formatResult: format,
        formatSelection: format
      });

      return MultiDropdownView.prototype._select2.call(this, item, options);
    },

    val: InputUtil.multiSelectVal
  });

  FormUtils.registerInputType('rds_instances_select', InstancMultiDropdownView, { choices: true, multiValue: true });

  return BaseInput.extend({
    initialVisualization: 'rds_instances_select'
  });
});
