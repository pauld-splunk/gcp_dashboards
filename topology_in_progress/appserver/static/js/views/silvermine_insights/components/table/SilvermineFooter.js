/**
 * Created by hshen on 10/6/16.
 */
define([
    'jquery',
    'moment',
    'underscore',
    'backbone',
    'views/Base'
],function($, moment, _, Backbone, BaseView){

    return BaseView.extend({
        tagName: 'tfoot',
        className: 'table-footer',

        initialize: function(params){
            BaseView.prototype.initialize.apply(this, arguments);

            // Re-render if dates changed
            this.model = params.model;
            this.listenTo(this.model, 'change:showedDates', this.render);
            this.listenTo(this.model, 'change:allDates', this.render);
        },

        events: {
            // Change the showed dates to next
            'click .icon-triangle-right.active': function (e) {
                e.preventDefault();

                // Use clone to trigger change:showedDates event
                let showedDates = _.clone(this.model.get('showedDates')) || [];

                let allDates = this.model.get('allDates') || [];
                let firstDay = showedDates[0];

                // Modify array
                showedDates.shift();
                showedDates.push(allDates[allDates.indexOf(firstDay) + showedDates.length + 1]);

                this.model.set('showedDates', showedDates);
            },
            // Change the showed dates to previous
            'click .icon-triangle-left.active': function (e) {
                e.preventDefault();

                // Use clone to trigger change:showedDates event
                let showedDates = _.clone(this.model.get('showedDates')) || [];

                let allDates = this.model.get('allDates') || [];
                let lastDate = showedDates[showedDates.length - 1];

                // Modify array
                showedDates.pop();
                showedDates.unshift(allDates[allDates.indexOf(lastDate) - showedDates.length - 1]);

                this.model.set('showedDates', showedDates);
            }
        },

        render:function(){
            let showedDates = this.model.get('showedDates') || [];
            let allDates = this.model.get('allDates') || [];

            // Render icons for previous day and next day
            let icons = '';
            if (showedDates.length > 0 && allDates.length >0){
                icons = icons + `<i class="icon-triangle-left ${showedDates[0] > allDates[0] ? 'active' : 'inactive'}"></i>`;
                icons = icons + `<i class="icon-triangle-right
                                ${showedDates[showedDates.length - 1] < allDates[allDates.length - 1] ? 'active' : 'inactive'}"></i>`;
            }

            // Html to render
            let html = `<td>${icons}</td>`;

            // Render the dates
            html += showedDates.map((date, index) => {
                date = moment(date);

                // First date or last date
                if (index === 0 || index === showedDates.length - 1) {
                    // Specialize today
                    if (date.diff(moment(), 'days') === 0) {
                        return `<td class="today">(Today) ${date.format('LL')}</td>`;
                    } else {
                        return `<td>${date.format('LL')}</td>`;
                    }
                }
                // Other dates
                else {
                    if (date.date() === 1) {
                        return `<td>${date.format('LL')}</td>`;
                    } else {
                        return `<td>${date.format('DD')}</td>`;
                    }
                }
            }).join('');

            this.$el.html(html);
            return this;
        }

    })
});