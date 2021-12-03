import * as Types from "../types.js";
export declare class RegisteredEvent {
    _eventType: string;
    _responseType: string;
    _callback: (payload: object) => void;
    _args: Types.RegisterRequest;
    _unregisterRequest: Types.Request | null;
    _failedAttempts: number;
    /**
     * @param {string} eventType
     * @param {string} responseType
     * @param {(payload: Object) => void} callback
     * @param {Object[]} args
     */
    constructor(eventType: string, responseType: string, callback: (payload: object) => void, args: Types.RegisterRequest, unregisterRequest: Types.Request | null);
    get failedAttempts(): number;
    set failedAttempts(value: number);
    get eventType(): string;
    get responseType(): string;
    get callback(): (payload: object) => void;
    get args(): Types.RegisterRequest;
    get unregisterRequest(): Types.Request | null;
}
export declare class TrackedRequest {
    sentAt: number;
    timeout: number;
    _resolve: (value: Object | null) => void;
    _reject: (err: string) => void;
    /**
     * @param {(value?: Object) => void} resolve
     * @param {(err: String) => void} reject
     * @param {number} timeout
     */
    constructor(resolve: (value: Object | null) => void, reject: (err: String) => void, timeout: number);
    resolve(value: object): void;
    reject(error: string): void;
    /**
     * Check if request has timed out.
     *
     * @param {number?} date
     * @returns
     * @memberof TrackedRequest
     */
    hasTimedOut(date?: number | null): boolean;
}
export declare class Dependencies {
    _logger: Types.ConsoleLogger | null;
    constructor(logger: Types.ConsoleLogger);
    get logger(): Types.ConsoleLogger | null;
}
