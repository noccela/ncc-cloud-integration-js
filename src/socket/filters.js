import { parseTagLiveData } from "../utils/messagepack";
import { ArgumentException } from "../utils/exceptions";

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
    constructor(callback, filter, dependencies) {
        if (!callback || typeof callback !== "function") {
            throw new ArgumentException("callback");
        }
        if (!filter || !(filter instanceof BaseFilter)) {
            throw new ArgumentException("filter");
        }

        this.callback = callback;
        this.filterObj = filter;
        ({ logger: this._logger } = dependencies);
    }

    // Filter messages and pass on to callback.
    process(payload) {
        if (!payload) return;

        let filteredMsg;
        try {
            filteredMsg = this.filterObj.filter(payload);
        } catch (e) {
            this._logger.exception("Exception while filtering message", e);
            return;
        }

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
     * @param {Object} msg
     * @memberof FilteredCallback
     */
    filter(payload) {
        throw NotImplementedError();
    }
}

export class LocationUpdateFilter extends BaseFilter {
    constructor(filters) {
        super();
        ({
            account: this._account,
            site: this._site,
            deviceIds: this._deviceIds
        } = filters);
    }

    filter(payload) {
        for (const [siteIdentifier, response] of Object.entries(payload)) {
            // Filter message based on site.
            const [account, site] = siteIdentifier.split("|").map(i => +i);
            if (this._account !== account || this._site !== site) {
                continue;
            }

            let filteredResponse = response;

            // Filter out devices locations from response that the user
            // did not subscribe to.
            if (this._deviceIds) {
                filteredResponse = response.filter(r =>
                    this._deviceIds.includes(+r["deviceId"])
                );
            }

            return filteredResponse;
        }
    }
}

export class TagDiffStreamFilter extends BaseFilter {
    constructor(filters) {
        super();
        ({
            account: this._account,
            site: this._site,
            deviceIds: this._deviceIds
        } = filters);
    }

    filter(payload) {
        let filteredResponse = payload;
        if (this._deviceIds) {
            // TODO: Filter removedTags.
            // Only MAC addresses are received which makes it difficult.

            // Filter out irrelevant tags.
            filteredResponse["tags"] = Object.entries(filteredResponse["tags"])
                .filter(([mac, data]) => {
                    const deviceId = data["deviceId"];
                    return this._deviceIds.includes(+deviceId);
                })
                .reduce((obj, [mac, data]) => {
                    obj[mac] = data;
                    return obj;
                }, {});
        }

        return filteredResponse;
    }
}

export class TagInitialStateFilter extends BaseFilter {
    constructor(filters) {
        super();
        ({
            account: this._account,
            site: this._site,
            deviceIds: this._deviceIds
        } = filters);
    }

    filter(payload) {
        let filteredResponse = payload;

        // Parse encoded response.
        filteredResponse = parseTagLiveData(filteredResponse);

        // Apply other filters.
        if (this._deviceIds) {
            // Filter out irrelevant tags by ID.
            filteredResponse = Object.keys(filteredResponse)
                .filter(k => this._deviceIds.includes(+k))
                .reduce((obj, key) => {
                    obj[key] = payload[key];
                    return obj;
                }, {});
        }

        return filteredResponse;
    }
}
