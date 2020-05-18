define([
    'ui-metrics-collector/ui-metrics-collector',
    'app/partyjs/PartyConfig',
    'app/partyjs/collectors/UsageCollector',
    'app/partyjs/collectors/ConfigureCollector'
], function(Collector, PartyConfig, UsageCollector, ConfigureCollector) {

    return {
        startParty: function() {
            // partyjs will check status and run
            Collector.start({
                apiKey: PartyConfig.MINT_ID,
                dedupInterval: {
                    'usage': PartyConfig.USAGE_COLLECT_INTERVAL
                }
            });
            if (console.debug) console.debug('Party Started!');
        },

        renderToggler: function(containerElement) {
            new Collector.Views.Toggler({learnMoreLink: PartyConfig.LEARN_MORE_LINK}).render().$el.appendTo(containerElement);
        },

        checkStatus: function() {
            Collector.checkAgreement({learnMoreLink: PartyConfig.LEARN_MORE_LINK});
        },

        collectUsage: function() {
            Collector.Configs.read((configs) => {
                if (configs.isOn()) {
                    UsageCollector.collectUsageData((model) => {
                        Collector.collect('usage', model);
                    });
                }
            });
        },

        collectConfigData: function() {
            Collector.Configs.read((configs) => {
                if (configs.isOn()) {
                    ConfigureCollector.collectConfigData((model) => {
                        Collector.collect('track_configuration', model);
                    });
                }
            });
        }
    }
});