// This helper improves the multiselectview from Splunk MVC.
//
// Initially the multiselectview has default value '*' (all). If the user
// selects any other value, '*' should be removed and only selected value applied.
// 
// If the user select '*' again, then remove all other values.
define([
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/multiselectview',
    'app/utils/InputUtil'
], function(_, mvc, MultiSelectView, InputUtil) {
    'use strict';

    Object.keys(mvc.Components.attributes).forEach((componentName) => {
        var component = mvc.Components.get(componentName);
        if (component instanceof MultiSelectView) {
            component.val = InputUtil.multiSelectVal;
        }
    });
});
