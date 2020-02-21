import { ArgumentException } from "../utils/exceptions.js";

// Internal registration for event, for tracking the event and allowing
// it to be unregistered later.
export class RegisteredEvent {
    /**
     * @param {string} eventType
     * @param {string} responseType
     * @param {(err: string, payload: Object) => void} callback
     * @param {Object[]} args
     */
    constructor(eventType, responseType, callback, args, unregisterRequest) {
        this._eventType = eventType;
        this._responseType = responseType;
        this._callback = callback;
        this._args = args;
        this._unregisterRequest = unregisterRequest;
        this._failedAttempts = 0;
    }

    get failedAttempts() {
        return this._failedAttempts;
    }

    set failedAttempts(value) {
        this._failedAttempts = value;
    }

    get eventType() {
        return this._eventType;
    }

    get responseType() {
        return this._responseType;
    }

    get callback() {
        return this._callback;
    }

    get args() {
        return this._args;
    }

    get unregisterRequest() {
        return this._unregisterRequest;
    }
}

// A request sent to cloud and related tracking information and callbacks.
export class TrackedRequest {
    /**
     * @param {(value?: Object) => void} resolve
     * @param {(err: String) => void} reject
     * @param {number} timeout
     */
    constructor(resolve, reject, timeout) {
        if (typeof resolve !== "function")
            throw new ArgumentException("resolve");
        if (typeof reject !== "function") throw new ArgumentException("reject");
        if (!Number.isInteger(timeout)) throw new ArgumentException("timeout");

        this.sentAt = Date.now();
        this.timeout = timeout;
        this._resolve = resolve;
        this._reject = reject;
    }

    resolve(value) {
        this._resolve(value);
    }

    reject(error) {
        this._reject(error);
    }

    /**
     * Check if request has timed out.
     *
     * @param {number?} date
     * @returns
     * @memberof TrackedRequest
     */
    hasTimedOut(date = null) {
        // Check if the request has taken too long.
        const tof = (date || Date.now()) - this.sentAt;

        if (tof <= 0 || !Number.isInteger(tof))
            throw Error(`Invalid tof ${tof}`);

        return tof > this.timeout;
    }
}

// Container for dependencies that are commonly passed forward in this project.
export class Dependencies {
    constructor(args) {
        /** @type import("../constants/constants").Logger */
        this._logger = null;
        ({ logger: this._logger } = args);
    }

    get logger() {
        return this._logger;
    }
}
