define([
    'jquery',
    'underscore',
    'backbone',
    'views/Base',
    'app/models/Config'
], function ($, _, Backbone, BaseView, Config) {

    var WaitingPanel = BaseView.extend({

        className: 'custom-waiting-panel',

        initialize: function() {
            BaseView.prototype.initialize.apply(this, arguments);
        },

        render: function() {
            var template = this.compiledTemplate({
                    message: this.message
                });
            this.$el.html(template);
            return this;
        },

        /**
         * show message upon the modal backdrop
         * @param message the text to be rendered. Show 'Please wait ...' in case not defined.
         */
        show: function(message) {
            if ($('.custom-waiting-panel').length === 0) {
                $('body').append(this.render().el);
            }

            this.$el.html(this.compiledTemplate({
                message: message || 'Please wait ...'
            }));

            this.$el.removeClass('hide');
        },

        close: function() {
            this.$el.addClass('hide');
        },

        template: '\
            <div class="modal-backdrop model-white"></div>\
            <div class="msg">\
                <img class="img" src="../../../static/app/' + Config.contextData.APP + '/img/loading.gif" />\
                <span class="text"><%= message %></span></div>\
            '
    });

    var waitingPanel = new WaitingPanel();

    return waitingPanel;
});
