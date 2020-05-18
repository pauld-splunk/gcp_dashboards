/**
 * Created by peter on 6/5/15.
 */
define(['views/Base'], function (BaseView) {

    return BaseView.extend({
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
        },

        render: function () {
            this.$el.html(this.template);
            return this;
        },

        template: '\
            <div class="aws-page-header">\
                <div class="title">Configure</div>\
            </div>\
            '
    });
});






