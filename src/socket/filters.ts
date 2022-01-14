import { ArgumentException, NotImplementedError } from "../utils/exceptions.js";
import { parseTagLiveData, parseAlertLiveData } from "../utils/messagepack.js";
import * as Types from "../types.js";
import { Dependencies } from "./models.js";


export function getFilteredCallback(filterClass: typeof BaseFilter, callback: (err: string | null, payload: object) => void, filters: Types.MessageFilter, dependencies: Dependencies): FilteredCallback {
    if (!filterClass || typeof filterClass !== "function") {
        throw new ArgumentException("filterClass");
    }
    if (!callback || typeof callback !== "function") {
        throw new ArgumentException("callback");
    }

    const filter: BaseFilter = new filterClass(filters);
    const filteredCallback: FilteredCallback = new FilteredCallback(
        callback,
        filter,
        dependencies
    );
    return filteredCallback;
}

export class FilteredCallback {
	public callback: (err: string | null, payload: object | null) => void;
	public filterObj: BaseFilter;
	public _logger: Types.ConsoleLogger | null;

    /**
     *
     * @param {(err: string, payload: Object) => void} callback
     * @param {BaseFilter} filter
     * @param {import("./models").Dependencies} dependencies
     */
    constructor(callback: (err: string | null, payload: object | null) => void, filter: BaseFilter, dependencies: Dependencies) {
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
    process(payload: object): void {
        if (!payload) return;

        /** @type Object */
        let filteredMsg: object | null;
        try {
            filteredMsg = this.filterObj.filter(payload);
        } catch (e) {
            if (e instanceof Error) {
                this._logger?.exception("Exception while filtering message", e.message);
            }
            return;
        }

        if (filteredMsg == null) return;

        const constructor = filteredMsg.constructor;

        // Filter out empty messages.
        if (!filteredMsg) return;
        if (constructor == Object && !Object.keys(filteredMsg).length) return;

        // Schedule the callback into later in event loop, because we don't
        // know how long it will take.
        setTimeout(() => {
            try {
                this.callback(null, filteredMsg);
            } catch (e) {
                if (e instanceof Error) {
                    this._logger?.exception("Error in location update callback", e.message);
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
     constructor(_: Types.MessageFilter) {
       
    }
    // eslint-disable-next-line no-unused-vars
    filter(_: object): object | null {
        throw new NotImplementedError();
    }
}

export class TwrDataFilter extends BaseFilter {
    public _filter: Types.TwrDataFilter;

    constructor(filters: Types.TwrDataFilter) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(payload: Types.TwrDataResponse): Types.TwrDataResponse | null {
        if (!payload) return null;
        
        const tagDeviceId = payload.tId;
        const beaconDeviceId = payload.bId;
        
        // TODO: What should happen on invalid message?
        if (!tagDeviceId || !beaconDeviceId) return null;
        if (this._filter.tagDeviceIds && !this._filter.tagDeviceIds.includes(tagDeviceId)) return null;
        if (this._filter.beaconDeviceIds && !this._filter.beaconDeviceIds.includes(beaconDeviceId)) return null;
        

        return payload;
    }
}

export class ContactTracingUpdateFilter extends BaseFilter {
	public _filter: Types.MessageFilter;

    constructor(filters: Types.MessageFilter) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(payload: Types.ContactTracingUpdateResponse): Types.ContactTracingUpdateResponse | null{
        if (!payload) return null;
        if (!Array.isArray(payload)) return null;
        if (!payload.length) return null;
        if (this._filter.deviceIds == null) return payload;

        const filteredResponse: Types.ContactTracingUpdateResponse = [];
        for(var index in payload){
            let obj: Types.ContactTracingUpdateItem | undefined = payload[index];
            if (!obj || (!this._filter.deviceIds.includes(obj.tag1) && !this._filter.deviceIds.includes(obj.tag2))) continue;
            filteredResponse.push(obj);
        }
        return filteredResponse;
    }
}

export class LocationUpdateFilter extends BaseFilter {
	public _filter: Types.MessageFilter;

    constructor(filters: Types.MessageFilter) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(payload: Types.LocationUpdateResponse): Types.LocationUpdateResponse | null {
        if (!payload) return null;

        const payloadEntries = Object.entries(payload);
        if (!payloadEntries.length) return null;

        if (!this._filter.deviceIds) return payload;

        const filteredResponse: Types.LocationUpdateResponse = {};
        for(var deviceId in payload){
            let obj: Types.LocationUpdateItem | undefined = payload[deviceId];
            if (!obj || (this._filter.deviceIds && !this._filter.deviceIds.includes(+deviceId))) continue;
            filteredResponse[+deviceId] = obj;
        }

        return filteredResponse;
    }
}

export class P2pDistanceUpdateFilter extends BaseFilter {
	public _filter: Types.MessageFilter;

    constructor(filters: Types.MessageFilter) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(payload: Types.P2PDistanceUpdateResponse): Types.P2PDistanceUpdateResponse | null {
        if (!payload) return null;
        if (!this._filter.deviceIds) return payload;

        const filteredResponse: Types.P2PDistanceUpdateResponse = [];

        for(var index in payload){
            let obj: Types.P2PDistanceUpdateItem | undefined = payload[index];
            if (!obj || (!this._filter.deviceIds.includes(obj.tag1) && !this._filter.deviceIds.includes(obj.tag2))) continue;
            filteredResponse.push(obj);
        }

        return filteredResponse;
    }
}


export class TagDiffStreamFilter extends BaseFilter {
	public _filter: Types.MessageFilter;

    constructor(filters: Types.MessageFilter) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(payload: Types.TagDiffResponse): Types.TagDiffResponse | null {
        if (!payload.tags && !payload.removedTags) return null;

        if (!this._filter.deviceIds) return payload;

        const filteredResponse: Types.TagDiffResponse = {
            tags: null,
            removedTags: null
        };

        if (payload.tags){
            for(var deviceId in payload.tags){
                if (!this._filter.deviceIds.includes(+deviceId)) continue;
                if(filteredResponse.tags == null) filteredResponse.tags = {};
                let obj: Types.TagDiffItem | undefined = payload.tags[deviceId];
                if (obj) filteredResponse.tags[+deviceId] = obj;
            }
        }
        
        if (payload.removedTags){
            for (var index in payload.removedTags){
                let deviceId: string | undefined = payload.removedTags[index];
                if (!deviceId || !this._filter.deviceIds.includes(+deviceId)) continue;
                if (filteredResponse.removedTags == null) filteredResponse.removedTags = [];
                filteredResponse.removedTags.push(deviceId);
            }
        }

        return filteredResponse;
    }
}

export class AlertDiffStreamFilter extends BaseFilter {
	public _filter: Types.MessageFilter;

    constructor(filters: Types.MessageFilter) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(payload: Types.AlertDiffResponse): Types.AlertDiffResponse | null {
        if (!payload.alerts && !payload.removedAlerts) return null;

        if (!this._filter.deviceIds) return payload;

        const filteredResponse: Types.AlertDiffResponse = {
            alerts: null,
            removedAlerts: null
        };

        if (payload.alerts){
            for(var alarmId in payload.alerts){
                const alert : Types.Alert | undefined = payload.alerts[alarmId];
                if(alert == null) continue;
                if (!this._filter.deviceIds.includes(alert.deviceId)) continue;
                if(filteredResponse.alerts == null) filteredResponse.alerts = {};
                filteredResponse.alerts[alarmId] = alert;
            }
        }

        return filteredResponse;
    }
}

// Filter that does nothing special, just passes the message
// unmodified.
export class NoOpFilter extends BaseFilter {
    filter(payload: object) {
        return payload;
    }
}

// Filter that parses the encoded message.
export class TagInitialStateFilter extends BaseFilter {
	public _filter: Types.MessageFilter;

    constructor(filters: Types.MessageFilter) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(initialState: Types.CloudResponse): Types.TagInitialStateResponse | null {
        // Parse encoded response.
        let filteredResponse: Types.TagInitialStateResponse = {};
        if (!initialState) return filteredResponse;
        let response: Types.TagInitialStateResponse = parseTagLiveData(initialState.payload);
        if (this._filter.deviceIds == null) return response;
        for(var deviceId in response){
            let obj: Types.InitialTagState | undefined = response[deviceId];
            if (!obj || !this._filter.deviceIds.includes(+deviceId)) continue;
            filteredResponse[deviceId] = obj;
        }
        return filteredResponse;
    }
}

export class AlertInitialStateFilter extends BaseFilter {
	public _filter: Types.MessageFilter;

    constructor(filters: Types.MessageFilter) {
        super(filters);
        this._filter = filters;
        this.filter = this.filter.bind(this);
    }

    /** @inheritdoc */
    filter(initialState: Types.CloudResponse): Types.AlertInitialStateResponse | null {
        // Parse encoded response.
        let filteredResponse: Types.AlertInitialStateResponse = {};
        if (!initialState) return filteredResponse;
        let response: Types.AlertInitialStateResponse = parseAlertLiveData(initialState.payload);
        if (this._filter.deviceIds == null) return response;
        for(var alertId in response){
            let obj: Types.Alert | undefined = response[alertId];
            if (!obj || !this._filter.deviceIds.includes(obj.deviceId)) continue;
            filteredResponse[alertId] = obj;
        }
        return filteredResponse;
    }
}
