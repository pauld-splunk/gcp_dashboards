"use strict";

define([
  "splunkjs/mvc/tableview",
	"app/views/rds/utils"
], function(
	TableView,
	utils
) {
	return TableView.BaseCellRenderer.extend({
		initialize: function(options) {
			options = options || {};
			this.fieldName = options.fieldName;
		},

		canRender: function(cellData) {
			return cellData.field === this.fieldName;
		},

		setup: function($td, cellData) {
			$td.addClass('rds_logo').addClass(this._className(cellData));
		},

		render: function($td, cellData) {
			$td.html(utils.getLogoImg(this._engineName(cellData)) + cellData.value);
		},

		teardown: function($td, cellData) {
			$td.removeClass('rds_logo').removeClass(this._className(cellData));
		},

		_engineName: function(cellData) {
			return cellData.value.split(" ", 2)[0].toLowerCase();
		},

		_className: function(cellData) {
			var name = this._engineName(cellData);
			if(name.indexOf("oracle") > -1) { name = "oracle"; }

			return name;
		}
	});
});
