define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'app/views/dashboard/MessageView',
    'app/utils/HelpLinks'
], function ($, _, mvc, utils, MessageView, HelpLinks) {
    const PAGE_HINT_MAP = {
        'iam': ['ACCELERATION_REPORT'],
        'key_pairs': ['ACCELERATION_REPORT'],
        'network_acls': ['ACCELERATION_REPORT'],
        'security_groups': ['ACCELERATION_REPORT'],
        'security_overview': ['ACCELERATION_REPORT'],
        'user_activity': ['ACCELERATION_REPORT'],
        'vpcs': ['ACCELERATION_REPORT'],
        'RI_planner': ['RI_PLANNER_PRICE_INFO']
    };
    const HINT_INFO = {
        ACCELERATION_REPORT: {
            source: 'report acceleration hint',
            body: 'It may take a long time to return search results in the current panel due to pending report acceleration.',
            helpLink: null
        },
        RI_PLANNER_PRICE_INFO: {
            source: 'riPrice',
            body: 'To keep the prices of EC2 instances up-to-date, use this search command: "| rirecommendation info".',
            helpLink: null

        }
    };

    let page = utils.getPageInfo().page;

    return {
        showWarning() {
            if (_.isUndefined(PAGE_HINT_MAP[page])) {
                return;
            }
            PAGE_HINT_MAP[page].forEach(hint => {
                let hintDetail = HINT_INFO[hint];
                MessageView.setMessage(hintDetail.source, hintDetail.body, hintDetail.helpLink, (hintDetail.type||'info'));
            });
        }
    };
});