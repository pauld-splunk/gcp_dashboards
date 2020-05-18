/**
 * Created by frank on 2016-02-18
 */

define([
    'jquery',
    'underscore'
], function($, _){

    const DAY_UNIT = 86400;

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
        controlToNextFrame: function(controlModel){
            var controlEnd = function(){
                controlModel.set('playing', false);
                controlModel.set('current', controlModel.get('timeRange').end);
            };

            var current = this.convertTimeInUnit(controlModel.get('current'), controlModel.get('step')),
                end = controlModel.get('timeRange').end;

            // check if ends
            if(current >= end){
                controlEnd();
                return false;
            }

            // check if there is no key frames beyond current time
            var newCurrent = current,
                keyFrames = controlModel.get('keyFrameList'),
                index = 0,
                isEnd = true;

            for(var i = 0; i < keyFrames.length; i++){
                if(keyFrames[i] > current){
                    index = i;
                    isEnd = false;
                    break;
                }
            }

            if(isEnd){
                controlEnd();
                return false;
            }

            // get the latest key frame within the step of time
            while(true){
                newCurrent += controlModel.get('step');
                if(newCurrent > end || keyFrames[index] <= newCurrent){
                    break;
                }
            }

            if(newCurrent > end){
                controlEnd();
                return false;
            }

            controlModel.set('current', newCurrent);

            return true;
        },

        convertTimeInUnit: function(time, unit){
            return Math.floor(time / unit) * unit;
        },

        convertTimeToTooltips: function(date, unit){
            var year = date.getUTCFullYear(),
                month = MONTH_NAMES[date.getUTCMonth()],
                day = date.getUTCDate() <= 9 ? '0' + date.getUTCDate() : date.getUTCDate(),
                fullTooltip = `${month} ${day}, ${year}`,
                simpleTooltip = `${month} ${day}`;

            // if time unit is not day, need to show hour and minute as well
            if(unit !== DAY_UNIT){
                var hour = date.getUTCHours() <= 9 ? '0' + date.getUTCHours() : date.getUTCHours(),
                    minute = date.getUTCMinutes() <= 9 ? '0' + date.getUTCMinutes() : date.getUTCMinutes();
                fullTooltip = `${hour}:${minute}, ${month} ${day}, ${year}`,
                simpleTooltip = `${hour}:${minute}`;
            }

            return {
                fullTooltip: fullTooltip,
                simpleTooltip: simpleTooltip
            };
        },

        generateTimelineLabels: function(start, end){
            const YEAR = 365, HALF_YEAR = 200, QUARTER = 100, TWO_MONTH = 60, ONE_MONTH = 30, HALF_MONTH = 15;

            var dayNum = parseInt((end - start) / DAY_UNIT),
                startDate = new Date(start * 1000),
                endDate = new Date(end * 1000),
                timelineLabels = [];

            // if over half a year, then every month place a label
            if(dayNum > HALF_YEAR){
                var startMonth = startDate.getUTCMonth(),
                    endMonth = endDate.getUTCMonth(),
                    startYear = startDate.getUTCFullYear(),
                    endYear = endDate.getUTCFullYear(),
                    currentMonth = startMonth + 1,
                    currentYear = startYear,
                    isNewYear = true,
                    step = Math.max(parseInt(dayNum / YEAR), 1);

                while(true){
                    if(currentMonth > 11){
                        currentMonth = currentMonth % 12;
                        currentYear ++;
                        isNewYear = true;
                    }
                    var date = new Date(Date.UTC(currentYear, currentMonth, 1));
                    if(date.getTime()/1000 <= end){
                        timelineLabels.push({
                            time: date.getTime() / 1000,
                            label: this._convertTimeToLabels(date, isNewYear, true)
                        });
                    }
                    else{
                        break;
                    }
                    currentMonth += step;
                    isNewYear = false;
                }
            }
            // if 4~6 month, then every 15 days place a label
            else if(dayNum > QUARTER){
                var startMonth = startDate.getUTCMonth(),
                    endMonth = endDate.getUTCMonth(),
                    startYear = startDate.getUTCFullYear(),
                    endYear = endDate.getUTCFullYear(),
                    currentMonth = startMonth,
                    currentYear = startYear,
                    currentDay = 15,
                    isNewYear = true;

                while(true){
                    if(currentMonth > 11){
                        currentMonth = currentMonth % 12;
                        currentYear ++;
                        isNewYear = true;
                    }
                    var date = new Date(Date.UTC(currentYear, currentMonth, currentDay));
                    if(date.getTime()/1000 <= end){
                        timelineLabels.push({
                            time: date.getTime() / 1000,
                            label: this._convertTimeToLabels(date, isNewYear, true)
                        });
                    }
                    else{
                        break;
                    }
                    currentMonth = (currentDay === 15 ? currentMonth+1 : currentMonth);
                    currentDay = (currentDay === 15 ? 1 : 15);
                    isNewYear = false;
                }
            }
            // if 3 month, then every 10 days place a label
            else if(dayNum > TWO_MONTH){
                timelineLabels = this._generateTimelineLabelsByDay(startDate, endDate, 10, 5, 25);
            }
            // if 1~2 month, then every 5 days place a label
            else if(dayNum > ONE_MONTH){
                timelineLabels = this._generateTimelineLabelsByDay(startDate, endDate, 5, 5, 25);
            }
            // if 15~30 days, then every 3 days place a label
            else if(dayNum > HALF_MONTH){
                timelineLabels = this._generateTimelineLabelsByDay(startDate, endDate, 3, 1, 28);
            }
            // if 7~15 days, then everyday place a label
            else if(dayNum >= 7){
                timelineLabels = this._generateTimelineLabelsByHour(startDate, endDate, 24);
            }
            // if 3~6 days, then every 12 hours place a label
            else if(dayNum >= 3){
                timelineLabels = this._generateTimelineLabelsByHour(startDate, endDate, 12);
            }
            // if 2 days, then every 4 hours place a label
            else if(dayNum == 2){
                timelineLabels = this._generateTimelineLabelsByHour(startDate, endDate, 4);
            }
            // if 1 day, then every 3 hours place a label
            else if(dayNum == 1){
                timelineLabels = this._generateTimelineLabelsByHour(startDate, endDate, 3);
            }

            return timelineLabels;
        },

        _generateTimelineLabelsByDay: function(startDate, endDate, interval, startDayOfMonth, lastDayOfMonth){
            var timelineLabels = [],
                startMonth = startDate.getUTCMonth(),
                endMonth = endDate.getUTCMonth(),
                startYear = startDate.getUTCFullYear(),
                endYear = endDate.getUTCFullYear(),
                currentMonth = startMonth,
                currentYear = startYear,
                currentDay = startDayOfMonth,
                isNewYear = true;

            while(true){
                if(currentMonth > 11){
                    currentMonth = currentMonth % 12;
                    currentYear ++;
                    isNewYear = true;
                }
                var date = new Date(Date.UTC(currentYear, currentMonth, currentDay));
                if(date.getTime() <= endDate.getTime()){
                    timelineLabels.push({
                        time: date.getTime() / 1000,
                        label: this._convertTimeToLabels(date, isNewYear, true)
                    });
                }
                else{
                    break;
                }
                currentMonth = (currentDay === lastDayOfMonth ? currentMonth+1 : currentMonth);
                currentDay = (currentDay === lastDayOfMonth ? startDayOfMonth : currentDay+interval);
                isNewYear = false;
            }

            return timelineLabels;
        },

        _generateTimelineLabelsByHour: function(startDate, endDate, interval){
            var timelineLabels = [],
                currentDate = new Date(startDate.getTime()),
                currentYear = currentDate.getUTCFullYear(),
                isNewYear = true;

            currentDate.setUTCHours(0);
            currentDate.setUTCMinutes(0);

            while(true){
                if(currentDate.getTime() > endDate.getTime()){
                    break;
                }

                timelineLabels.push({
                    time: currentDate.getTime() / 1000,
                    label: this._convertTimeToLabels(currentDate, isNewYear, currentDate.getUTCHours() === 0 || interval === 24, interval !== 24)
                });

                var newDate = new Date(currentDate.getTime() + 3600000 * interval);
                isNewYear = (currentYear !== newDate.getUTCFullYear());
                if(isNewYear){
                    currentYear = newDate.getUTCFullYear();
                }

                currentDate = newDate;
            }

            return timelineLabels;
        },

        _convertTimeToLabels: function(date, containsYear, containsDate, containsTime){
            var labelArr = [];

            if(containsTime){
                var hour = date.getUTCHours() <= 9 ? '0' + date.getUTCHours() : date.getUTCHours(),
                    minute = date.getUTCMinutes() <= 9 ? '0' + date.getUTCMinutes() : date.getUTCMinutes();
                labelArr.push(`${hour}:${minute}`);
            }

            if(containsDate){
                var month = MONTH_NAMES[date.getUTCMonth()],
                    day = date.getUTCDate() <= 9 ? '0' + date.getUTCDate() : date.getUTCDate();

                if(containsTime){
                    labelArr.push(`<br/>${month} ${day}`);
                }
                else{
                    labelArr.push(`${month} ${day}`);
                }
            }

            if(containsYear){
                var year = date.getUTCFullYear();
                if(containsTime){
                    labelArr.push(`, ${year}`);
                }
                else{
                    labelArr.push(`<br/>${year}`);
                }
            }

            return labelArr.join('');
        }
    };
});