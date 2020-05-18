define([
    'underscore'
], function (_) {

    const DEFAULT_WINDOW_SIZE = 5;
    class SearchQueueManager {
        constructor(options) {
            this.options = options || {};
            this.options.windowSize = options.windowSize || DEFAULT_WINDOW_SIZE;
            this.options.searchDoneCallback = options.searchDoneCallback || null;
            this.options.searchErrorCallback = options.searchErrorCallback || null;
            this.waitQueue = [];
            this.runningSearches = {};
        }

        killSearches() {
            _.values(this.runningSearches).forEach(search => {
                this.runningSearches[search.id].cancel();
                delete this.runningSearches[search.id];
            });
            this.waitQueue.forEach(search => {
                search = null;
            });
            this.waitQueue = [];
            return this;
        }

        appendSearches (searches) {
            searches.forEach(search => {
                search.on('search:done', this._onSearchDone.bind(this, search));
                search.on('search:error', this._onSearchError.bind(this, search));
                search.on('search:failed', this._onSearchError.bind(this, search));
            });
            this.waitQueue = this.waitQueue.concat(searches);
            return this;
        }

        start() {
            for (let i = 0; i < Math.min(this.options.windowSize, this.waitQueue.length); i++) {
                this._startNext();
            }
            return this;
        }

        _startNext() {
            if (Object.keys(this.runningSearches).length >= this.options.windowSize || this.waitQueue.length <= 0) {
                return;
            }
            let search = this.waitQueue.shift();
            if (!_.isUndefined(search)) {
                if (search.id in this.runningSearches) {
                    return this;
                }
                this.runningSearches[search.id] = search;
                search.startSearch();
            }
            return this;
        }

        _onSearchDone(search) {
            if (_.isFunction(this.options.searchDoneCallback)) {
                this.options.searchDoneCallback(search);
            }
            delete this.runningSearches[search.id];
            this._startNext();
            return this;
        }

        _onSearchError(search) {
            if (_.isFunction(this.options.searchErrorCallback)) {
                this.options.searchErrorCallback(search);
            }
            delete this.runningSearches[search.id];
            this._startNext();
            return this;
        }
    }

    return SearchQueueManager;
});