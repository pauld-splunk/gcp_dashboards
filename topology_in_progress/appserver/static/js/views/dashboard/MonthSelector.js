define([
    'underscore',
    'backbone',
    'models/Base',
    'views/Base',
    'splunkjs/mvc',
    'app/components/views/controls/SingleInputControl',
    'app/utils/BillingUtil',
    'util/moment',
    'splunkjs/mvc/simplexml/ready!'
], function(_, Backbone, BaseModel, BaseView, mvc, SingleInputControl, BillingUtil, moment) {
    'use strict';

    const FROM_RANGE = 12;
    const TO_RANGE = 0;
    const DATE_FORMAT = 'YYYY-MM';
    const FROM_TITLE = 'From';
    const TO_TITLE = 'To';

    let tokenModel = mvc.Components.getInstance('default');

    // @param
    //        fromRange {Integer} number of months
    //        fromCurrentMonth {Boolean} allow the user to select current month as "From"
    function generateFromOptions(fromRange, fromCurrentMonth) {
        let optionList = [];

        let nowMoment = moment();

        if (!fromCurrentMonth) {
            nowMoment.subtract(1, 'M');
        }

        for (let i = 1; i <= fromRange; i++) {
            let date = nowMoment.startOf('month');
            optionList.push({
                label: date.format(DATE_FORMAT),
                value: BillingUtil.getUTCUnix(date)
            });

            nowMoment.subtract(1, 'M');
        }

        return optionList;
    }

    // @param
    //        toRange {Integer} number of months
    function generateToOptions(timerangeFrom, toRange) {
        let optionList = [];

        let fromMoment = moment.unix(timerangeFrom);
        let nowMoment = moment();

        while (fromMoment.isBefore(nowMoment) || toRange > 0) {
            fromMoment = fromMoment.endOf('month');

            optionList.unshift({
                label: fromMoment.format(DATE_FORMAT),
                value: fromMoment.unix() - fromMoment.zone() * 60
            });

            toRange--;
            fromMoment.add(1, 'M');
        }

        return optionList;
    }

    /**
     * @constructor
     * @name MonthSelector
     * @extends BaseView
     *
     * @param {Object} options
     * @param {String} options.from -
     * @param {String} options.to -
     * @param {Integer} options.fromRange -
     * @param {Boolean} options.fromCurrentMonth - allow the user to select current month as "From"
     * @param {Integer} options.toRange -
     * @param {Boolean} options.submit - automatically submit form after change
     * @param {Boolean} options.isDetailedBilling
     */
    let MonthSelector = BaseView.extend({
        initialize(options) {
            BaseView.prototype.initialize.apply(this, arguments);

            let fromOptionList = generateFromOptions(options.fromRange || FROM_RANGE, options.fromCurrentMonth);
            let defaultFrom = fromOptionList[2].value;
            let defaultTo = this.options.defaultTo;

            if (this.options.defaultFrom) {
                let result = _.findWhere(fromOptionList, {value: parseInt(this.options.defaultFrom)});
                if (result) {
                    defaultFrom = result.value;
                }
            }

            this.model = new BaseModel({
                from: defaultFrom,
                to: defaultTo
            });

            this.$from = options.from;
            this.$to = options.to;
            this.fromTitle = options.fromTitle || FROM_TITLE;
            this.toTitle = options.toTitle || TO_TITLE;
            this.isDetailedBilling = options.isDetailedBilling;

            this.timerangeFromSelector = new SingleInputControl({
                modelAttribute: 'from',
                model: this.model,
                autoCompleteFields: fromOptionList
            });

            this.timerangeToSelector = new SingleInputControl({
                modelAttribute: 'to',
                model: this.model
            });

            this.model.on('change:from', () => {
                this._updateTimerange();
                this._updateToSelection();
            }, this);
            this.model.on('change:to', this._updateTimerange, this);
        },

        loading(loading) {
            if (loading) {
                this.model.unset('from');
                this.model.unset('to');
                this.timerangeFromSelector.startLoading();
                this.timerangeToSelector.startLoading();
            } else {
                this.timerangeFromSelector.enable();
                this.timerangeToSelector.enable();
            }
        },

        setDatamodel(isDetailedBilling) {
            this.isDetailedBilling = isDetailedBilling;
        },

        render() {
            this.$from.empty();
            this.$to.empty();

            this.$from.append(`<label for="timerange-from">${this.fromTitle}</label>`);
            this.$from.append(this.timerangeFromSelector.render().el);

            this.$to.append(`<label for="timerange-to">${this.toTitle}</label>`);
            this.$to.append(this.timerangeToSelector.render().el);

            this.$from.parent().parent()
                .css('display', 'inline-block');
            this.$from
                .css('width', '120px');

            this.$to.parent().parent()
                .css('display', 'inline-block')
                .css('margin-left', '20px');

            this.$to
                .css('width', '120px')
                .css('margin-right', '30px');

            this._updateToSelection();
            this._updateTimerange();
        },

        _updateToSelection() {
            let timerangeFrom = parseInt(this.model.get('from'));
            let options = generateToOptions(timerangeFrom, this.options.toRange || TO_RANGE);

            let timerangeTo = parseInt(this.model.get('to'));
            if (!timerangeTo || timerangeFrom > timerangeTo) {
                this.model.set('to', options[0].value);
            }

            this.timerangeToSelector.setAutoCompleteFields(options, null, true);
        },

        _updateTimerange() {
            let from = this.model.get('from');
            let to = this.model.get('to');

            if (!from || !to) {
                return;
            }

            let prefix = this.isDetailedBilling ? 'detailed_billing.' : '';
            let eventtype = this.isDetailedBilling ? 'aws_billing_detail_report' : 'aws_billing_monthly_report';

            BillingUtil.updateMonthSpl(from, to, eventtype, prefix, this.options.submit);
        }
    });

    return MonthSelector;
});