/**
 * Created by frank on 2016-09-05
 */

define(['backbone'], function(Backbone){
    return Backbone.Model.extend({
        defaults: {
            events: null,
            warningMessage: null,
            loading: false
        }
    });
});