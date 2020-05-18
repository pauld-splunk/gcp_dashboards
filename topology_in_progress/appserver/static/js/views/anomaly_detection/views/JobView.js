define([
    'underscore',
    'jquery',
    'backbone',
    'views/shared/Modal',
    'views/shared/controls/ControlGroup',
    'app/views/anomaly_detection/Config',
    'select2/select2'
], function (_,
             $,
             Backbone,
             Modal,
             ControlGroup,
             SystemConfig) {
    var BUTTON_CANCEL = '<a href="#" class="btn cancel modal-btn-cancel pull-left" data-dismiss="modal">Cancel</a>',
        BUTTON_SAVE = '<a href="#" class="btn btn-primary modal-btn-primary pull-right">Save</a>';
    return Modal.extend({
        initialize: function (options) {
            Modal.prototype.initialize.apply(this, arguments);
            this.models = this.options.models;
            this.mode = SystemConfig.DETECT_MODE | SystemConfig.CREATE_MODE;
            var popdownOptions = {
                attachDialogTo: '.modal:visible',
                scrollContainer: '.modal:visible .modal-body:visible'
            };
            this.nameView = new ControlGroup({
                controlType: 'Text',
                controlClass: 'controls-block',
                controlOptions: {
                    modelAttribute: SystemConfig.JOB_NAME,
                    model: this.models.input
                },
                label: 'Name'
            });
            this.descriptionView = new ControlGroup({
                controlType: 'Textarea',
                controlClass: 'controls-block',
                controlOptions: {
                    modelAttribute: SystemConfig.JOB_DESCRIPTION,
                    model: this.models.input,
                    placeholder: 'Optional'
                },
                label: 'Description'
            });
            this.scheduleView = new ControlGroup({
                className: 'control-group',
                controlType: 'SyntheticSelect',
                controlClass: 'controls-block',
                controlOptions: {
                    modelAttribute: SystemConfig.JOB_SCHEDULE,
                    model: this.models.input,
                    items: [
                        {label: 'Run every hour', value: 'Hourly'},
                        {label: 'Run every day', value: 'Daily'},
                        {label: 'Run every week', value: 'Weekly'},
                        {label: 'Run every month', value: 'Monthly'}
                    ],
                    save: false,
                    toggleClassName: 'btn',
                    labelPosition: 'outside',
                    elastic: true,
                    popdownOptions: popdownOptions
                },
                label: 'Schedule'
            });
            this.severityView = new ControlGroup({
                className: 'control-group',
                controlType: 'SyntheticSelect',
                controlClass: 'controls-block',
                controlOptions: {
                    modelAttribute: SystemConfig.JOB_PRIORITY,
                    model: this.models.input,
                    items: [
                        {label: 'Low', value: '1'},
                        {label: 'Medium', value: '2'},
                        {label: 'High', value: '3'},
                        {label: 'Critical', value: '4'}
                    ],
                    save: false,
                    toggleClassName: 'btn',
                    labelPosition: 'outside',
                    elastic: true,
                    popdownOptions: popdownOptions
                },
                label: 'Priority'
            });
            this.tagsView = new ControlGroup({
                controlType: 'Text',
                controlClass: 'controls-block',
                controlOptions: {
                    modelAttribute: SystemConfig.JOB_TAGS,
                    model: this.models.input
                },
                label: 'Tags',
                additionalClassNames: 'control-tags'
            });
            this.trainNumView = new ControlGroup({
                controlType: 'Text',
                controlClass: 'controls-block',
                controlOptions: {
                    modelAttribute: 'trainNum',
                    model: this.models.input
                },
                label: 'Train period',
                additionalClassNames: 'control-train-num'
            });
            this.trainUnitView = new ControlGroup({
                className: 'control-group',
                controlType: 'SyntheticSelect',
                controlClass: 'controls-block',
                controlOptions: {
                    modelAttribute: 'trainUnit',
                    model: this.models.input,
                    items: [
                        {label: 'seconds', value: 's'},
                        {label: 'minutes', value: 'm'},
                        {label: 'hours', value: 'h'},
                        {label: 'days', value: 'd'}
                    ],
                    save: false,
                    toggleClassName: 'btn',
                    labelPosition: 'outside',
                    elastic: true,
                    popdownOptions: popdownOptions
                }
            });
        },

        events: $.extend({}, Modal.prototype.events, {
            'click a.modal-btn-primary': function (e) {
                e.preventDefault();
                if (this._validateInput()) {
                    this.models.input.set(SystemConfig.JOB_TRAIN, Math.abs(parseInt(this.models.input.get('trainNum')))
                        + this.models.input.get('trainUnit'));
                    this.hide();
                    this.trigger('saveJob', this.mode);
                }
            }
        }),

        _validateInput: function () {
            var validation = true;
            var inputName = this.models.input.get(SystemConfig.JOB_NAME);
            var trainNum = parseInt(this.models.input.get('trainNum'));
            if (_.isEmpty(inputName)) {
                this.$('.job-modal-hint').html('Unable to create job with empty name.');
                validation = false;
            }
            else if ((this.mode & SystemConfig.CREATE_MODE) > 0 && this.models.input.get('usedNames').indexOf(inputName) >= 0) {
                this.$('.job-modal-hint').html('Unable to create job with name "' + inputName + '". A job with that name already exists.');
                validation = false;
            }
            else if (_.isNaN(trainNum)) {
                this.$('.job-modal-hint').html('Invalid train period number ' + trainNum + ' . Integer is required.');
                validation = false;
            }
            return validation;
        },

        show: function (tags, mode) {
            this.mode = mode;
            // Enable select2 for tags
            this.$('.control-tags').find('input').select2({
                tags: tags,
                tokenSeparators: [','],
                maximumInputLength: 128
            });
            if ((mode & SystemConfig.CREATE_MODE) > 0) {
                // set default value for model
                var defaultAttributes = {};
                defaultAttributes[SystemConfig.JOB_NAME] = '';
                defaultAttributes[SystemConfig.JOB_PRIORITY] = '1';
                defaultAttributes[SystemConfig.JOB_DESCRIPTION] = '';
                defaultAttributes[SystemConfig.JOB_SCHEDULE] = 'Hourly';
                defaultAttributes[SystemConfig.JOB_TAGS] = '';
                defaultAttributes[SystemConfig.JOB_ALERT_ID] = '';
                if ((mode & SystemConfig.DETECT_MODE) === 0) {
                    defaultAttributes['trainNum'] = '0';
                    defaultAttributes['trainUnit'] = 'm';
                }
                this.models.input.set(defaultAttributes);
                this.$('.control-tags').find('input').select2('val', '');
            }
            if ((mode & SystemConfig.DETECT_MODE) > 0) {
                // using default anomaly detection algorithm's train period
                this.trainNumView.disable();
                this.trainUnitView.disable();
            }
            this.$el.modal('show');
        },

        render: function () {
            this.$el.html(Modal.TEMPLATE);
            this.$(Modal.HEADER_TITLE_SELECTOR).html('Anomaly detection job settings');
            this.$(Modal.FOOTER_SELECTOR).append(BUTTON_CANCEL);
            this.$(Modal.FOOTER_SELECTOR).append(BUTTON_SAVE);
            this.$(Modal.BODY_SELECTOR).append(Modal.FORM_HORIZONTAL);
            this.nameView.render().appendTo(this.$(Modal.BODY_FORM_SELECTOR));
            this.descriptionView.render().appendTo(this.$(Modal.BODY_FORM_SELECTOR));
            this.severityView.render().appendTo(this.$(Modal.BODY_FORM_SELECTOR));
            this.scheduleView.render().appendTo(this.$(Modal.BODY_FORM_SELECTOR));
            this.tagsView.render().appendTo(this.$(Modal.BODY_FORM_SELECTOR));
            this.trainNumView.render().appendTo(this.$(Modal.BODY_FORM_SELECTOR));
            this.trainUnitView.render().appendTo(this.$(Modal.BODY_FORM_SELECTOR));
            this.$(Modal.BODY_FORM_SELECTOR).append('<p class="job-modal-hint"></p>');
            return this;
        }
    });
});
