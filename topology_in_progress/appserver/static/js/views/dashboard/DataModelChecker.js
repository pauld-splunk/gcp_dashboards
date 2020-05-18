define([
    'app/utils/SearchUtil',
    'app/views/dashboard/MessageView',
    'app/utils/HelpLinks'
], function (
    SearchUtil,
    MessageView,
    HelpLinks
) {
    'use strict';

    let DataModelChecker = {
        check(model) {
            SearchUtil.search(`| rest /servicesNS/nobody/splunk_app_aws/admin/summarization/tstats:DM_splunk_app_aws_${model} splunk_server=local`)
                .then((data) => {
                    if (data.length === 0) {
                        MessageView.setMessage(model, `Acceleration status for Data Model "${model}" is not found. Have you enabled the acceleration?`, HelpLinks.AWS_DASHBOARD_BILLINGDATAMODEL);
                    } else if (data.length === 1) {
                        let percentage = Math.round(parseFloat(data[0]['summary.complete']) * 100, 2);
                        if (percentage <= 99.99) {
                            MessageView.setMessage(model, `Acceleration for Data Model "${model}" is still in progress (${percentage}%). The dashboard may not be accurate.`, HelpLinks.AWS_DASHBOARD_BILLINGDATAMODEL);
                        }
                    }
                });
        }
    };

    return DataModelChecker;
});
