import { ArgumentException } from "../utils/exceptions.js";
import * as Types from "../types.js";


// Internal registration for event, for tracking the event and allowing
// it to be unregistered later.
export class RegisteredEvent {
	public _eventType: string;
	public _responseType: string;
	public _callback: (err: string | null, payload: object) => void;
	public _args: Types.RegisterRequest;
	public _unregisterRequest: Types.Request | null;
	public _failedAttempts: number;

    /**
     * @param {string} eventType
     * @param {string} responseType
     * @param {(payload: Object) => void} callback
     * @param {Object[]} args
     */
    constructor(eventType: string, responseType: string, callback: (err: string | null, payload: object) => void, args: Types.RegisterRequest, unregisterRequest: Types.Request | null) {
        this._eventType = eventType;
        this._responseType = responseType;
        this._callback = callback;
        this._args = args;
        this._unregisterRequest = unregisterRequest;
        this._failedAttempts = 0;
    }

    get failedAttempts(): number {
        return this._failedAttempts;
    }

    set failedAttempts(value) {
        this._failedAttempts = value;
    }

    get eventType():string {
        return this._eventType;
    }

    get responseType():string {
        return this._responseType;
    }

    get callback(): (err: string | null, payload: object) => void {
        return this._callback;
    }

    get args(): Types.RegisterRequest {
        return this._args;
    }

    get unregisterRequest(): Types.Request | null {
        return this._unregisterRequest;
    }
}

// A request sent to cloud and related tracking information and callbacks.
export class TrackedRequest {
	public sentAt: number;
	public timeout: number;
	public _resolve: (value: Object | null) => void;
	public _reject: (err: string) => void;

    /**
     * @param {(value?: Object) => void} resolve
     * @param {(err: String) => void} reject
     * @param {number} timeout
     */
    constructor(resolve: (value: Object | null) => void, reject: (err: String) => void, timeout: number) {
        if (typeof resolve !== "function")
            throw new ArgumentException("resolve");
        if (typeof reject !== "function") throw new ArgumentException("reject");
        if (!Number.isInteger(timeout)) throw new ArgumentException("timeout");

        this.sentAt = Date.now();
        this.timeout = timeout;
        this._resolve = resolve;
        this._reject = reject;
    }

    resolve(value: object) {
        this._resolve(value);
    }

    reject(error: string) {
        this._reject(error);
    }

    /**
     * Check if request has timed out.
     *
     * @param {number?} date
     * @returns
     * @memberof TrackedRequest
     */
    hasTimedOut(date: number | null = null) {
        // Check if the request has taken too long.
        const tof = (date || Date.now()) - this.sentAt;

        if (tof <= 0 || !Number.isInteger(tof))
            throw Error(`Invalid tof ${tof}`);

        return tof > this.timeout;
    }
}

// Container for dependencies that are commonly passed forward in this project.
export class Dependencies {
	public _logger: Types.ConsoleLogger | null;

    constructor(logger: Types.ConsoleLogger) {
        /** @type import("../constants/constants").Logger */
        this._logger = logger;
    }

    get logger() {
        return this._logger;
    }
}
