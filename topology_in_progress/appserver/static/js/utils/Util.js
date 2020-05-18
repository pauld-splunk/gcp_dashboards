/**
 * Created by peter on 8/31/15.
 * Utility functions
 */
define(['underscore'], function (_) {

    var APP_NAME = 'splunk_app_aws';
    var APP_VERSION = '5.0.0';

    var APP_PREFIX = encodeURIComponent('[' + APP_NAME + ':' + APP_VERSION + ']');

    return {

        buildLinkNode: function(link, text) {
            text = text || _('Learn more').t();
            return "<a class='external' target='_blank' href='/help?location=" + APP_PREFIX + link + "'>" + text + "</a>";
        }
    };

});