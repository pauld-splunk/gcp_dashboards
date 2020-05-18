/**
 * Created by hshen on 10/8/16.
 */
define([
    'jquery',
    'underscore',
    'backbone',
    'views/Base',
    'contrib/text!app/views/silvermine_insights/templates/Header.html'
],function($, _, Backbone, BaseView, Header){

    return BaseView.extend({
        className: 'silvermine-header',

        initialize: function(params){
            BaseView.prototype.initialize.apply(this, arguments);
        },

        render:function(){
            this.$el.html(this.template);

            return this;
        },

        template: Header
    })
});