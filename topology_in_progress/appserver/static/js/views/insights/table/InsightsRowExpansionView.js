define([
    'underscore',
    'jquery',
    'views/Base'
], function (_, $, BaseView) {
    'use strict';

    var InsightsRowExpansionView = BaseView.extend({
        template: `
            <p>
                <strong>Problem:</strong><br>
                <%= problem %>
            </p>
            <p>
                <strong>Solution:</strong><br>
                <%= solution %>
            </p>
            <p class="<%= showDetail %>">
                <strong>Details:</strong><br>
                <%= detail %>
            </p> 
        `,

        events: {
            'click .external': function (e) {
                window.open(e.target.href);
            }
        },

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.listenTo(this.model, 'change:problem', this.render);
        },

        render: function () {
            this.$el.empty();
            let htmlContent = '<p>Loading ...</p>';
            if (!_.isUndefined(this.model.get('problem'))) {
                htmlContent = _.template(this.template, {
                    problem: this.model.get('problem'),
                    solution: this.model.get('solution'),
                    detail: this.model.get('detail'),
                    showDetail: this.model.get('detail') ? '' : 'hide'
                });
            }
            this.$el.html(htmlContent);
            return this;
        }
    });
    return InsightsRowExpansionView;
})
;
