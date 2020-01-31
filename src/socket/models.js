// Internal registration for event, for tracking the event and allowing
// it to be unregistered later.
export class RegisteredEvent {
    constructor(
        eventType,
        responseType,
        callback,
        args,
        unregisterFromHandler
    ) {
        this.eventType = eventType;
        this.responseType = responseType;
        this.callback = callback;
        this.args = args;
        this.unregisterFromHandler = unregisterFromHandler;
    }
}

export class TrackedRequest {
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
     * @param {DateTime?} date
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
        ({ logger: this._logger } = args);
    }

    get logger() {
        return this._logger;
    }
}
