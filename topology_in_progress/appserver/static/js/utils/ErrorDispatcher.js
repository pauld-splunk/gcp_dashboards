/**
 * Created by michael on 6/20/15.
 */
define(['underscore', 'backbone'], function (_, Backbone) {

    var errorBus = {};
    _.extend(errorBus, Backbone.Events);

    var normalize = function (rawMessage, errorCode) {
        //TODO, error handling logic here. transform rawMessage to user friendly message.
        //TODO, expected to have tons of regex here.
        var friendlyMessage = rawMessage;
        return friendlyMessage;
    };
    return {
        raise: function(rawMessage, errorCode) {
            errorBus.trigger('error', normalize(rawMessage, errorCode), errorCode);
        },
        warning: function(rawMsg) {
            errorBus.trigger('warning', rawMsg);
        },
        clear: function() {
            // TODO
        },
        subscribe: function(evt, fn) {
            errorBus.on(evt, fn);
        }
    };
});