import { ArgumentException, NotImplementedError } from "../utils/exceptions.js";
import { parseTagLiveData } from "../utils/messagepack.js";

export function getFilteredCallback(
    filterClass,
    callback,
    filters,
    dependencies
) {
    if (!filterClass || typeof filterClass !== "function") {
        throw new ArgumentException("filterClass");
    }
    if (!callback || typeof callback !== "function") {
        throw new ArgumentException("callback");
    }

    const filter = new filterClass(filters);
    const filteredCallback = new FilteredCallback(
        callback,
        filter,
        dependencies
    );
    return filteredCallback;
}

export class FilteredCallback {
    /**
     *
     * @param {(err: string, payload: Object) => void} callback
     * @param {BaseFilter} filter
     * @param {import("./models").Dependencies} dependencies
     */
    constructor(callback, filter, dependencies) {
        if (!callback || typeof callback !== "function") {
            throw new ArgumentException("callback");
        }
        if (!filter || !(filter instanceof BaseFilter)) {
            throw new ArgumentException("filter");
        }

        this.callback = callback;
        this.filterObj = filter;

        this._logger = null;
        ({ logger: this._logger } = dependencies);
    }

    // Filter messages and pass on to callback.
    process(payload) {
        if (!payload) return;

        /** @type Object */
        let filteredMsg;
        try {
            filteredMsg = this.filterObj.filter(payload);
        } catch (e) {
            this._logger.exception("Exception while filtering message", e);
            return;
        }

        if (!filteredMsg) return;

        const constructor = filteredMsg.constructor;

        // Filter out empty messages.
        if (!filteredMsg) return;
        if (constructor == Array && !filteredMsg.length) return;
        if (constructor == Object && !Object.keys(filteredMsg).length) return;

        // Schedule the callback into later in event loop, because we don't
        // know how long it will take.
        setTimeout(() => {
            try {
                this.callback(null, filteredMsg);
            } catch (e) {
                this._logger.exception("Error in location update callback", e);
            }
        }, 0);
    }
}

/**
 * Callback wrapped with a filter for server messages.
 *
 * @class FilteredCallback
 * @abstract
 */
class BaseFilter {
    /**
     * Implementation of a filter for specific use-case.
     *
     * @abstract
     * @param {Object} payload
     * @memberof FilteredCallback
     */
    // eslint-disable-next-line no-unused-vars
    filter(payload) {
        throw new NotImplementedError();
    }
}

export class LocationUpdateFilter extends BaseFilter {
    constructor(filters) {
        super();

        this._account = null;
        this._site = null;
        this._deviceIds = null;
        ({
            account: this._account,
            site: this._site,
            deviceIds: this._deviceIds
        } = filters);

        if (this._deviceIds) {
            this._deviceIds = new Set(this._deviceIds);
        }

        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(payload) {
        const { accountId, siteId, tags } = payload;

        // Filter message based on site.
        if (+accountId !== this._account) return null;
        if (+siteId !== this._site) return null;
        if (!tags) return null;

        if (!this._deviceIds) return tags;

        const filteredResponse = Object.entries(tags).reduce(
            (prev, [deviceId, data]) => {
                if (!this._deviceIds.has(+deviceId)) return prev;
                return {
                    ...prev,
                    [deviceId]: data
                };
            },
            {}
        );

        return filteredResponse;
    }
}

export class TagDiffStreamFilter extends BaseFilter {
    constructor(filters) {
        super();

        this._account = null;
        this._site = null;
        this._deviceIds = null;
        ({
            account: this._account,
            site: this._site,
            deviceIds: this._deviceIds
        } = filters);

        if (this._deviceIds) {
            this._deviceIds = new Set(this._deviceIds);
        }

        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(payload) {
        const { accountId, siteId, tags, removedTags } = payload;

        // Filter message based on site.
        if (+accountId !== this._account) return null;
        if (+siteId !== this._site) return null;
        if (!tags && !removedTags) return null;

        if (!this._deviceIds)
            return {
                tags,
                removedTags: removedTags
            };

        const filterTags = (prev, [deviceId, data]) => {
            if (!this._deviceIds.has(+deviceId)) return prev;
            return {
                ...prev,
                [deviceId]: data
            };
        };

        // Filter by device ID.
        const filteredTags = Object.entries(tags).reduce(filterTags, {});

        let filteredRemovedTags = null;

        // removedTags can be null or undefined.
        if (removedTags) {
            filteredRemovedTags = Object.entries(removedTags).filter(d =>
                this._deviceIds.has(d)
            );
        }

        if (
            !Object.keys(filteredTags).length &&
            (!filteredRemovedTags || !filteredRemovedTags.length)
        )
            return null;

        return {
            tags: filteredTags,
            removedTags: filteredRemovedTags
        };
    }
}

// Filter that does nothing special, just passes the message
// unmodified.
export class NoOpFilter extends BaseFilter {
    filter(payload) {
        return payload;
    }
}

// Filter that parses the encoded message.
export class TagInitialStateFilter extends BaseFilter {
    constructor(filters) {
        super();

        this._account = null;
        this._site = null;
        this._deviceIds = null;
        ({
            account: this._account,
            site: this._site,
            deviceIds: this._deviceIds
        } = filters);

        if (this._deviceIds) {
            this._deviceIds = new Set(this._deviceIds);
        }

        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(payload) {
        const { accountId, siteId, data } = payload;

        // Filter message based on site.
        if (+accountId !== this._account) return null;
        if (+siteId !== this._site) return null;
        if (!data) return null;

        // Parse encoded response.
        let response = parseTagLiveData(data);
        if (!this._deviceIds) return response;

        // Filter by device ID.
        const filteredResponse = Object.entries(response).reduce(
            (prev, [deviceId, data]) => {
                if (!this._deviceIds.has(+deviceId)) return prev;
                return {
                    ...prev,
                    [deviceId]: data
                };
            },
            {}
        );

        return filteredResponse;
    }
}
