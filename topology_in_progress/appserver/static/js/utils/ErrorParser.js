/**
 * Created by peter on 8/12/15.
 * This class is used to parse system error message to user friendly message.
 */
define(['underscore', 'jquery'], function (_, $) {

    var TYPE = {
        MSG_TYPE_ERROR: 'MSG_TYPE_ERROR',
        MSG_TYPE_WARNING: 'MSG_TYPE_WARNING'
    };

    var MODULE = {
        // TODO: fill it later on, used in parse method
    };

    return {
        MODULE: MODULE,

        TYPE: TYPE,

        parse: function(message, moduleName) {
            // default: return original message
            try {
                var errorMsg = $.parseJSON(message).messages[0].text.replace(/\n/g, ' ');
                var xmlText = errorMsg.match(/(<\?xml|<ErrorResponse xmlns).*<\/(ErrorResponse|Error|Response)>/);

                if (xmlText) {
                    var xmlMsg = $.parseXML(xmlText[0]);
                    var errorCode = $(xmlMsg).find('Code').text();
                    errorMsg = $(xmlMsg).find('Message').text();

                    return {
                        type: TYPE.MSG_TYPE_ERROR,
                        msg: "Unexpected error occurs. " + errorCode + ": " + errorMsg
                    };

                } else {
                    return {
                        type: TYPE.MSG_TYPE_ERROR,
                        msg: "Unexpected error occurs. " + errorMsg
                    };
                }


            } catch(e) {
                return {
                    type: TYPE.MSG_TYPE_ERROR,
                    msg: message
                };
            }

        }
    };
});