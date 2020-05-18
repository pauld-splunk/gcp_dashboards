define([
    'underscore',
    'jquery',
    'backbone',
    'splunkjs/mvc',
    'app/views/insights/RI_planner/RIPlannerHelper',
    'app/views/insights/RI_planner/RIPlannerConfig'], function (_, $, Backbone, mvc, Helper, Config) {
    return Backbone.Model.extend({
        defaults: {
            hourlyData: null, // data for single view calculation
            singleData: null, // data for single view render
            dailyData: null, // data for chart view calculation
            priceInfo: null, // (all, partial, no upfront) payment price detail
            filtersEnabled: false // base and payment filters will be enabled only after single view data is ready
        },
        
        changeSingleData: function (base) {
            let data = this.get('hourlyData')[base];
            if (base === 'prediction') {
                let predictionDay = this.get('dailyData')[base].data;
                data = Helper.distributeDayAccordingHour(predictionDay, data);
            }
            this.set('singleData', data);
        },

        selectTimeToModifySingleData: function (startDayIndex, endDayIndex) {
            let startIndex = startDayIndex * Config.ONE_DAY_HOUR,
                endIndex = (endDayIndex + 1) * Config.ONE_DAY_HOUR;
            this.set('singleData', this.get('hourlyData').history.slice(startIndex, endIndex));
        },

        dragPointToModifySingleData(newPredictionDay) {
            let predictionHour = this.get('hourlyData').prediction;
            this.set('singleData', Helper.distributeDayAccordingHour(newPredictionDay, predictionHour));
        }

    });
});