/**
 * Created by peter on 6/18/15.
 */
define([
        'jquery',
        'underscore',
        'backbone',
        'views/shared/Modal'
    ],
    function ($,
              _,
              Backbone,
              Modal) {

        /**
         * Synthetic ConfirmDialog
         *
         * @param {Object} options
         *      {String} title The title shown in the header
         *      {String} content The message shown in the body
         *      {String} btnCancel The button text
         *      {String} btnOK The button text
         */

        var BUTTON_CANCEL = '<a href="#" class="btn cancel modal-btn-cancel pull-right" data-dismiss="modal"></a>';
        var BUTTON_OK = '<a href="#" class="btn ok btn-primary modal-btn-ok pull-right" data-dismiss="modal"></a>';

        return Modal.extend({
            className: "modal fade notificationdialog",

            attributes: {
                style: 'display:none',
                tabindex: -1,
                backdrop: 'static',
                keyboard: false
            },

            events: $.extend({}, Modal.prototype.events, {
                'click div.modal-footer>a.modal-btn-cancel': 'clickedCancel',
                'click div.modal-footer>a.modal-btn-ok': 'clickedOK'
            }),

            clickedCancel: function () {
                this.trigger('cancel');
            },

            clickedOK: function () {
                this.trigger('ok');
            },

            constructor: function (options) {
                Modal.prototype.constructor.call(this, _.extend({backdrop: 'static'}, options));
            },

            initialize: function (attributes, options) {
                Modal.prototype.initialize.apply(this, arguments);
                this.model = new Backbone.Model();
                this.model.set({
                    title: this.options.title || _('Confirmation').t(),
                    content: this.options.content || _('Are you sure?').t(),
                    btnCancel: this.options.btnCancel === null ?
                        null : (this.options.btnCancel === undefined ? _('Cancel').t() : this.options.btnCancel),
                    btnOK: this.options.btnOK === null ?
                        null : (this.options.btnOK === undefined ? _('OK').t() : this.options.btnOK)
                }, {silent: true});

                this.listenTo(this.model, 'change', this.render);
            },

            // update the content of this dialog
            update: function (args) {
                this.model.unset('btnCancel', {silent: true});
                this.model.unset('btnOK', {silent: true});

                // set will trigger render automatically
                this.model.set(args);
            },

            render: function () {
                this.$el.html(Modal.TEMPLATE);
                this.$(Modal.HEADER_TITLE_SELECTOR).html(this.model.get('title'));
                this.$(Modal.BODY_SELECTOR).show();
                this.$(Modal.BODY_SELECTOR).html(this.model.get('content'));

                if (this.model.get('btnOK')) {
                    this.$(Modal.FOOTER_SELECTOR).append(BUTTON_OK);
                    this.$(Modal.FOOTER_SELECTOR + ' a.modal-btn-ok').html(this.model.get('btnOK'));
                }

                if (this.model.get('btnCancel')) {
                    this.$(Modal.FOOTER_SELECTOR).append(BUTTON_CANCEL);
                    this.$(Modal.FOOTER_SELECTOR + ' a.modal-btn-cancel').html(this.model.get('btnCancel'));
                }

                return this;
            }
        });
    });
