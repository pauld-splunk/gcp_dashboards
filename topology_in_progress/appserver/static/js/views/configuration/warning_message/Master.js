/**
 * Created by frank on 2016/08/30.
 */

define([
    'jquery',
    'underscore',
    'backbone',
    'splunkjs/mvc/utils',
    'util/splunkd_utils',
    'contrib/text!app/views/configuration/warning_message/template.html'
], function($, _, Backbone, utils, splunkd_utils, template){
    var url=splunkd_utils.fullpath('saas-aws/splunk_app_aws_warning_message', {
        app: utils.getPageInfo().app,
        sharing: 'app'
    });

    return Backbone.View.extend({
        tagName: 'div',

        className: 'message-setting-view',

        events: {
            'click .message-setting-check': '_submitChecks'
        },

        constructor: function (options) {
            Backbone.View.apply(this, arguments);
        },

        render: function() {
            this.$el.html(template);
            this._getChecks();
            return this;
        },

        _getChecks: function() {
            // if user hides messages of this page, will not do sourcetype check
            $.get(`${url}?output_mode=json`).done((data) => {
                var page_roots = data.entry[0].content.page_roots;

                this.$el.find('.message-setting-check').prop('checked', true);

                page_roots.forEach((page_root) => {
                    this.$el.find(`.message-setting-check[value=${page_root}]`).prop('checked', false);
                });

                this.$el.find('.message-setting-check').removeAttr('disabled');
            });
        },

        _submitChecks: function() {
            var page_roots = [];

            this.$el.find('.message-setting-check:not(:checked)').each(function() {
                page_roots.push($(this).val());
            });

            $.ajax({
                url: `${url}?output_mode=json`,
                type: 'post',
                dataType: 'json',
                data: {
                    name: 'update_message_settings',
                    page_roots: page_roots.join(',')
                }
            });
        }
    });
});