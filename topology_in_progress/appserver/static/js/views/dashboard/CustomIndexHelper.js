define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'splunkjs/mvc/searchmanager',
    'app/views/dashboard/MessageView',
    'app/utils/HelpLinks'
], function($, _, mvc, utils, SearchManager, MessageView, HelpLinks) {
    const PAGE_CUSTOM_INDEX_MAP = {
        'topology': ['aws_topology_history', 'aws_topology_daily_snapshot', 'aws_topology_monthly_snapshot', 'aws_topology_playback'],
        'vpc_flow_logs_security': ['aws_vpc_flow_logs'],
        'vpc_flow_logs_traffic': ['aws_vpc_flow_logs'],
        'insights_overview': ['aws_anomaly_detection'],
        'billing_anomaly_detection_insights': ['aws_anomaly_detection'],
        'security_anomaly_detection_insights': ['aws_anomaly_detection']
    };

    let service = mvc.createService({
        owner: 'nobody',
        app: utils.getCurrentApp()
    });

    let page = utils.getPageInfo().page;

    return {
        checkCustomIndex(is_aws_admin) {
            if (_.isUndefined(PAGE_CUSTOM_INDEX_MAP[page])) {
                return;
            }

            service.request('server/info', 'GET').done((data) => {
                let {server_roles:serverRoles, isForwarding, host} = JSON.parse(data).entry[0].content;

                // if it is a single instance
                if (serverRoles.indexOf('search_head') === -1) {
                    this._checkOnSingleInstance();
                }
                // if it is on SHC
                else {
                    // check data forwarding
                    if (!isForwarding) {
                        this._showForwardingWarning();
                    }
                    // check indexes
                    else {
                        this._checkOnDistributedEnv(is_aws_admin, host);
                    }
                }
            });
        },

        _checkOnSingleInstance() {
            let customIndexes = PAGE_CUSTOM_INDEX_MAP[page];

            // get all custom indexes
            service.request('data/indexes', 'GET').done((data) => {
                let indexes = _.pluck(JSON.parse(data).entry, 'name'),
                    missedCustomIndexes = _.difference(customIndexes, indexes);

                // show warning message
                if (missedCustomIndexes.length > 0) {
                    this._showIndexWarning(missedCustomIndexes);
                }
            });
        },

        _checkOnDistributedEnv(is_aws_admin, host) {
            let customIndexes = PAGE_CUSTOM_INDEX_MAP[page];

            let customIndexSM = new SearchManager({
                id: _.uniqueId(),
                earliest_time: '-6h',
                latest_time: 'now',
                search: `index=${customIndexes[0]} | head 1`
            });

            customIndexSM.on('search:done', (properties) => {
                if (properties.content.resultCount === 0) {
                    if (!is_aws_admin) {
                        this._showIndexWarning(customIndexes);
                    }
                    else {
                        let splunkdSM = new SearchManager({
                            id: _.uniqueId(),
                            earliest_time: '-1h@h',
                            latest_time: 'now',
                            search: `index=_internal source=*splunkd.log log_level=WARN component=IndexerService message="*${host}*" message="Received event for unconfigured/disabled/deleted index=${customIndexes[0]}*"`
                        });

                        splunkdSM.on('search:done', (properties) => {
                            if (properties.content.resultCount > 0) {
                                this._showIndexWarning(customIndexes);
                            }
                        });
                    }
                }
            });
        },

        _showIndexWarning(missingIndexes) {
            let message = `Some panels may not be displayed correctly because you do not have created the following indexes: ${missingIndexes.join(", ")}, or, data of these indexes have not been generated.`;
            MessageView.setMessage('customIndexChecker', message, HelpLinks.AWS_CUSTOM_INDEX);
        },

        _showForwardingWarning() {
            let message = 'Some panels may not be displayed correctly. Configure this search head to forward data directly to the indexer layer.';
            MessageView.setMessage('customIndexChecker', message, HelpLinks.AWS_DATA_FORWARDING);
        }
    };
});