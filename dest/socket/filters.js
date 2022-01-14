import { ArgumentException, NotImplementedError } from "../utils/exceptions.js";
import { parseTagLiveData, parseAlertLiveData } from "../utils/messagepack.js";
export function getFilteredCallback(filterClass, callback, filters, dependencies) {
    if (!filterClass || typeof filterClass !== "function") {
        throw new ArgumentException("filterClass");
    }
    if (!callback || typeof callback !== "function") {
        throw new ArgumentException("callback");
    }
    const filter = new filterClass(filters);
    const filteredCallback = new FilteredCallback(callback, filter, dependencies);
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
        var _a;
        if (!payload)
            return;
        /** @type Object */
        let filteredMsg;
        try {
            filteredMsg = this.filterObj.filter(payload);
        }
        catch (e) {
            if (e instanceof Error) {
                (_a = this._logger) === null || _a === void 0 ? void 0 : _a.exception("Exception while filtering message", e.message);
            }
            return;
        }
        if (filteredMsg == null)
            return;
        const constructor = filteredMsg.constructor;
        // Filter out empty messages.
        if (!filteredMsg)
            return;
        if (constructor == Object && !Object.keys(filteredMsg).length)
            return;
        // Schedule the callback into later in event loop, because we don't
        // know how long it will take.
        setTimeout(() => {
            var _a;
            try {
                this.callback(null, filteredMsg);
            }
            catch (e) {
                if (e instanceof Error) {
                    (_a = this._logger) === null || _a === void 0 ? void 0 : _a.exception("Error in location update callback", e.message);
                }
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
export class BaseFilter {
    /**
     * Implementation of a filter for specific use-case.
     *
     * @abstract
     * @param {Object} payload
     * @memberof FilteredCallback
     */
    constructor(_) {
    }
    // eslint-disable-next-line no-unused-vars
    filter(_) {
        throw new NotImplementedError();
    }
}
export class TwrDataFilter extends BaseFilter {
    constructor(filters) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }
    /** @inheritdoc */
    filter(payload) {
        if (!payload)
            return null;
        const tagDeviceId = payload.tId;
        const beaconDeviceId = payload.bId;
        // TODO: What should happen on invalid message?
        if (!tagDeviceId || !beaconDeviceId)
            return null;
        if (this._filter.tagDeviceIds && !this._filter.tagDeviceIds.includes(tagDeviceId))
            return null;
        if (this._filter.beaconDeviceIds && !this._filter.beaconDeviceIds.includes(beaconDeviceId))
            return null;
        return payload;
    }
}
export class ContactTracingUpdateFilter extends BaseFilter {
    constructor(filters) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }
    /** @inheritdoc */
    filter(payload) {
        if (!payload)
            return null;
        if (!Array.isArray(payload))
            return null;
        if (!payload.length)
            return null;
        if (this._filter.deviceIds == null)
            return payload;
        const filteredResponse = [];
        for (var index in payload) {
            let obj = payload[index];
            if (!obj || (!this._filter.deviceIds.includes(obj.tag1) && !this._filter.deviceIds.includes(obj.tag2)))
                continue;
            filteredResponse.push(obj);
        }
        return filteredResponse;
    }
}
export class LocationUpdateFilter extends BaseFilter {
    constructor(filters) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }
    /** @inheritdoc */
    filter(payload) {
        if (!payload)
            return null;
        const payloadEntries = Object.entries(payload);
        if (!payloadEntries.length)
            return null;
        if (!this._filter.deviceIds)
            return payload;
        const filteredResponse = {};
        for (var deviceId in payload) {
            let obj = payload[deviceId];
            if (!obj || (this._filter.deviceIds && !this._filter.deviceIds.includes(+deviceId)))
                continue;
            filteredResponse[+deviceId] = obj;
        }
        return filteredResponse;
    }
}
export class P2pDistanceUpdateFilter extends BaseFilter {
    constructor(filters) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }
    /** @inheritdoc */
    filter(payload) {
        if (!payload)
            return null;
        if (!this._filter.deviceIds)
            return payload;
        const filteredResponse = [];
        for (var index in payload) {
            let obj = payload[index];
            if (!obj || (!this._filter.deviceIds.includes(obj.tag1) && !this._filter.deviceIds.includes(obj.tag2)))
                continue;
            filteredResponse.push(obj);
        }
        return filteredResponse;
    }
}
export class TagDiffStreamFilter extends BaseFilter {
    constructor(filters) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }
    /** @inheritdoc */
    filter(payload) {
        if (!payload.tags && !payload.removedTags)
            return null;
        if (!this._filter.deviceIds)
            return payload;
        const filteredResponse = {
            tags: null,
            removedTags: null
        };
        if (payload.tags) {
            for (var deviceId in payload.tags) {
                if (!this._filter.deviceIds.includes(+deviceId))
                    continue;
                if (filteredResponse.tags == null)
                    filteredResponse.tags = {};
                let obj = payload.tags[deviceId];
                if (obj)
                    filteredResponse.tags[+deviceId] = obj;
            }
        }
        if (payload.removedTags) {
            for (var index in payload.removedTags) {
                let deviceId = payload.removedTags[index];
                if (!deviceId || !this._filter.deviceIds.includes(+deviceId))
                    continue;
                if (filteredResponse.removedTags == null)
                    filteredResponse.removedTags = [];
                filteredResponse.removedTags.push(deviceId);
            }
        }
        return filteredResponse;
    }
}
export class AlertDiffStreamFilter extends BaseFilter {
    constructor(filters) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }
    /** @inheritdoc */
    filter(payload) {
        if (!payload.alerts && !payload.removedAlerts)
            return null;
        if (!this._filter.deviceIds)
            return payload;
        const filteredResponse = {
            alerts: null,
            removedAlerts: payload.removedAlerts
        };
        if (payload.alerts) {
            for (var alarmId in payload.alerts) {
                const alert = payload.alerts[alarmId];
                if (alert == null)
                    continue;
                if (!this._filter.deviceIds.includes(alert.deviceId))
                    continue;
                if (filteredResponse.alerts == null)
                    filteredResponse.alerts = {};
                filteredResponse.alerts[alarmId] = {
                    alarmId: alert.alarmId,
                    deviceId: alert.deviceId,
                    alarmType: alert.alarmType,
                    x: alert.x,
                    y: alert.y,
                    timestamp: alert.timestamp,
                    floorId: alert.floorId,
                    areaNames: alert.areaNames,
                    areaIds: alert.areaIds
                };
            }
        }
        return filteredResponse;
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
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }
    /** @inheritdoc */
    filter(initialState) {
        // Parse encoded response.
        let filteredResponse = {};
        if (!initialState)
            return filteredResponse;
        let response = parseTagLiveData(initialState.payload);
        if (this._filter.deviceIds == null)
            return response;
        for (var deviceId in response) {
            let obj = response[deviceId];
            if (!obj || !this._filter.deviceIds.includes(+deviceId))
                continue;
            filteredResponse[deviceId] = obj;
        }
        return filteredResponse;
    }
}
export class AlertInitialStateFilter extends BaseFilter {
    constructor(filters) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }
    /** @inheritdoc */
    filter(initialState) {
        // Parse encoded response.
        let filteredResponse = {};
        if (!initialState)
            return filteredResponse;
        let response = parseAlertLiveData(initialState.payload);
        if (this._filter.deviceIds == null)
            return response;
        for (var alertId in response) {
            let obj = response[alertId];
            if (!obj || !this._filter.deviceIds.includes(obj.deviceId))
                continue;
            filteredResponse[alertId] = obj;
        }
        return filteredResponse;
    }
}
