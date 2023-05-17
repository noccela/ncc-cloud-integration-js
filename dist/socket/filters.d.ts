import * as Types from "../types.js";
import { Dependencies } from "./models.js";
export declare function getFilteredCallback(filterClass: typeof BaseFilter, callback: (err: string | null, payload: object) => void, filters: Types.MessageFilter, dependencies: Dependencies): FilteredCallback;
export declare class FilteredCallback {
    callback: (err: string | null, payload: object | null) => void;
    filterObj: BaseFilter;
    _logger: Types.ConsoleLogger | null;
    /**
     *
     * @param {(err: string, payload: Object) => void} callback
     * @param {BaseFilter} filter
     * @param {import("./models").Dependencies} dependencies
     */
    constructor(callback: (err: string | null, payload: object | null) => void, filter: BaseFilter, dependencies: Dependencies);
    process(payload: object): void;
}
/**
 * Callback wrapped with a filter for server messages.
 *
 * @class FilteredCallback
 * @abstract
 */
export declare class BaseFilter {
    /**
     * Implementation of a filter for specific use-case.
     *
     * @abstract
     * @param {Object} payload
     * @memberof FilteredCallback
     */
    constructor(_: Types.MessageFilter);
    filter(_: object): object | null;
}
export declare class EmptyFilter extends BaseFilter {
    constructor(filters: Types.MessageFilter);
    filter(payload: Object): Object | null;
}
export declare class TwrDataFilter extends BaseFilter {
    _filter: Types.TwrDataFilter;
    constructor(filters: Types.TwrDataFilter);
    /** @inheritdoc */
    filter(payload: Types.TwrDataResponse): Types.TwrDataResponse | null;
}
export declare class ContactTracingUpdateFilter extends BaseFilter {
    _filter: Types.MessageFilter;
    constructor(filters: Types.MessageFilter);
    /** @inheritdoc */
    filter(payload: Types.ContactTracingUpdateResponse): Types.ContactTracingUpdateResponse | null;
}
export declare class LocationUpdateFilter extends BaseFilter {
    _filter: Types.MessageFilter;
    constructor(filters: Types.MessageFilter);
    /** @inheritdoc */
    filter(payload: Types.LocationUpdateResponse): Types.LocationUpdateResponse | null;
}
export declare class P2pDistanceUpdateFilter extends BaseFilter {
    _filter: Types.MessageFilter;
    constructor(filters: Types.MessageFilter);
    /** @inheritdoc */
    filter(payload: Types.P2PDistanceUpdateResponse): Types.P2PDistanceUpdateResponse | null;
}
export declare class TagDiffStreamFilter extends BaseFilter {
    _filter: Types.MessageFilter;
    constructor(filters: Types.MessageFilter);
    /** @inheritdoc */
    filter(payload: Types.TagDiffResponse): Types.TagDiffResponse | null;
}
export declare class AlertDiffStreamFilter extends BaseFilter {
    _filter: Types.MessageFilter;
    constructor(filters: Types.MessageFilter);
    /** @inheritdoc */
    filter(payload: Types.AlertDiffResponse): Types.AlertDiffResponse | null;
}
export declare class NoOpFilter extends BaseFilter {
    filter(payload: object): object;
}
export declare class TagInitialStateFilter extends BaseFilter {
    _filter: Types.MessageFilter;
    constructor(filters: Types.MessageFilter);
    /** @inheritdoc */
    filter(initialState: Types.CloudResponse): Types.TagInitialStateResponse | null;
}
export declare class AlertInitialStateFilter extends BaseFilter {
    _filter: Types.MessageFilter;
    constructor(filters: Types.MessageFilter);
    /** @inheritdoc */
    filter(initialState: Types.CloudResponse): Types.AlertInitialStateResponse | null;
}
