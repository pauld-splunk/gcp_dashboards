define([
    'underscore',
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/checkboxview',
    'contrib/text!app/views/dashboard/OneTimePaymentsTemplate.html'
], function(_, $, mvc, CheckboxView, OneTimePaymentsTemplate) {
    'use strict';

    const TITLE = 'Include Onetime Payments';
    const LOADING = 'Loading...';

    var OneTimePaymentsView = CheckboxView.extend({

        initialize() {
            CheckboxView.prototype.initialize.apply(this, arguments);
        },

        loading(loading) {
            if (loading) {
                this.$el.find('span').text(LOADING);
                this.settings.set('disabled', true);
            } else {
                this.$el.find('span').text(TITLE);
                this.settings.set('disabled', false);
            }
        },

        render() {
            let view = CheckboxView.prototype.render.apply(this, arguments);

            view.$el.parent().parent()
                .css('display', 'inline-block')
                .css('margin-left', '10px')
                .css('min-width', '180px')
                .css('margin-top', '24px');

            view.$el.find('input').css('margin-top', '0');

            if (view.$el.find('span').length === 0) {
                view.$el.append(`<span style="margin-left: 5px;">${TITLE}</span> `);
                view.$el.append(OneTimePaymentsTemplate);

                view.$('[data-toggle="tooltip"]').tooltip();
            }

            return view;
        }
    });

    return OneTimePaymentsView;
});
