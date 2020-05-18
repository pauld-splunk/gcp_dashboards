define([
    'underscore'
], function (_) {
    class DraggableChartHelper {
        constructor() {
        }

        reload(params) {
            this.anchorList = [];
            this.startAnchor = params.start;
            this.endAnchor = params.end;
            this._insertList(this.anchorList, this.startAnchor);
            this._insertList(this.anchorList, this.endAnchor);
        }

        dragStart(curIndex, oldY) {
            this.curIndex = curIndex;
            this.oldY = oldY;
            this._insertList(this.anchorList, curIndex);
        }

        dragInProgress(data, newY) {
            let results = [];
            let startAnchorIndex = Math.max(this._findBiggestSmallerThanValue(this.anchorList, this.curIndex), 0);
            let endAnchorIndex = Math.min(this._findSmallestBiggerThanValue(this.anchorList, this.curIndex),
                this.anchorList.length - 1);
            this.startAnchor = this.anchorList[startAnchorIndex];
            this.endAnchor = this.anchorList[endAnchorIndex];
            if (this.startAnchor < this.curIndex) {
                let toLeftProportion = this._calProportion(this.curIndex - this.startAnchor, newY - this.oldY);
                this._floodToNeighbors(data, this.startAnchor, this.startAnchor + 1, this.curIndex - 1, toLeftProportion, results);
            }

            if (this.curIndex < this.endAnchor) {
                let toRightProportion = this._calProportion(this.curIndex - this.endAnchor, newY - this.oldY);
                this._floodToNeighbors(data, this.endAnchor, this.curIndex + 1, this.endAnchor - 1, toRightProportion, results);
            }
            return results;
        }

        deleteAnchor(value) {
            if(value === this.startAnchor || value === this.endAnchor) {
                return;
            }
            let index = this.anchorList.indexOf(value);
            if (index > -1) {
                this.anchorList.splice(index, 1);
            }
        }

        addAnchor(value) {
            this._insertList(this.anchorList, value);
        }

        _floodToNeighbors(list, referencePoint, startIndex, endIndex, propotion, results) {
            for (let i = startIndex; i <= endIndex; i++) {
                let newY = Math.max(this._calDiff(i - referencePoint, propotion) + list[i], 0);
                results.push({
                    x: i,
                    y: newY
                })
            }
        }

        _findBiggestSmallerThanValue(list, value) {
            let length = list.length;
            let start = 0;
            let end = length - 1;
            while (start <= end) {
                let mid = parseInt((start + end) / 2);
                if (value <= list[mid]) {
                    end = mid - 1;
                } else {
                    start = mid + 1;
                }
            }
            return end;
        }

        _findSmallestBiggerThanValue(list, value) {
            let length = list.length;
            let start = 0;
            let end = length - 1;
            while (start <= end) {
                let mid = parseInt((start + end) / 2);
                if (value < list[mid]) {
                    end = mid - 1;
                } else {
                    start = mid + 1;
                }
            }
            return start;
        }

        _insertList(list, value) {
            let length = list.length;
            let start = 0;
            let end = length - 1;
            while (start <= end) {
                let mid = parseInt((start + end) / 2);
                if (value == list[mid]) {
                    // not add into list
                    return;
                } else if (value < list[mid]) {
                    end = mid - 1;
                } else {
                    start = mid + 1;
                }
            }
            list.push(value);
            for (let i = length; i > start; i--) {
                let temp = list[i];
                list[i] = list[i - 1];
                list[i - 1] = temp;
            }
        }

        _calDiff(xDiff, propotion) {
            return propotion * xDiff;
        }

        _calProportion(xDiff, yDiff) {
            return xDiff === 0 ? 0 : yDiff / xDiff;
        }
    }
    let instance;
    return {
        getInstance: function () {
            if (!instance) {
                instance = new DraggableChartHelper();
            }
            return instance;
        }
    }
});
