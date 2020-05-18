/**
 * Created by michael on 6/21/15.
 */
define([
    'jquery',
    'backbone',
    'underscore',
    'app/components/views/controls/NotificationDialog'
], function ($, Backbone, _, Dialog) {

    // singleton confirm dialog.
    var dialog = new Dialog();
    dialog.render().appendTo($('body'));
    dialog.hide();

    var DialogManager = {
        /**
         *
         * @param dialogArgs object
         *                  {
         *                      title:<String>
         *                      content:<String>
         *                      btnCancel:<String>
         *                      btnOK:<String>
         *                  }
         * @param okFn  callback when user click on ok button
         * @param cancelFn callback when user click on cancel button
         */
        showConfirmDialog: function (dialogArgs, okFn, cancelFn) {
            dialog.update(dialogArgs);
            var self = this;
            dialog.on('ok', function () {
                okFn && okFn();
                // close the dialog, we may need a return value from callback to indicate whether to close the dialog.
                self.hide();
            });
            dialog.on('cancel', function () {
                cancelFn && cancelFn();
                self.hide();
            });
            dialog.show();
        },

        /**
         *
         * @param dialogArgs object
         *                  {
         *                      title:<String>
         *                      content:<String>
         *                      btn:<String>
         *                  }
         * @param fn  callback when user click on button
         */
        showNotificationDialog: function(dialogArgs, fn) {
            var args = _.extend({}, dialogArgs,
                { btnOK: dialogArgs.btn, btnCancel: null });

            dialog.update(args);
            var self = this;
            dialog.on('ok', function () {
                fn && fn();

                // close the dialog, we may need a return value from callback to indicate whether to close the dialog.
                self.hide();
            });

            dialog.show();
        },

        hide: function () {
            dialog.off();
            dialog.hide();
        }
    };

    return DialogManager;
});

