import { WS_MSG_CONSTANTS } from "../constants/constants";
import { ArgumentException } from "../utils/exceptions";
import { TrackedRequest } from "./models";

/**
 * This class handles sending and receiving messages to and from backend
 * through WebSocket provided to it. This is the lowest level handler for
 * WS, handling directly WS related events.
 *
 * Additional features is providing timeout-based request rejection.
 *
 * This class handles internally some Noccela API specific intricasies
 * to make the usage simpler.
 *
 * @export
 * @class RequestHandler
 */
export class RequestHandler {
    /**
     * Creates an instance of RequestHandler.
     * @param {WebSocket} socket Open WebSocket.
     * @param {import("../constants/constants").GlobalOptions} options
     * @param {Function} reconnectCallback Callback to call when socket
     * should be reconnected.
     * @param {import("./models").Dependencies} dependencyContainer
     * @memberof RequestHandler
     */
    constructor(socket, options, reconnectCallback, dependencyContainer) {
        const readyState = socket.readyState;
        if (!Number.isInteger(readyState) || readyState != 1) {
            throw new ArgumentException("socket");
        }

        // Map request ids/message types to metadata and callbacks.
        this._requestHandlers = {};
        this._serverMessageHandlers = {};

        // Timeout id for the periodical check.
        this._timeoutCheckTimeout = null;

        // Socket closure callback.
        this._onCloseCallback = null;

        // Callback to reconnect the socket.
        this._reconnectCallback = reconnectCallback;

        // Unpack options.
        this._defaultTimeout = options.requestTimeout;
        this._timeoutCheckInterval = Math.max(
            this._defaultTimeout / 2 || 0,
            5000
        );
        this._options = options;

        // Unpack dependencies.
        /** @type {import("../constants/constants").Logger} */
        this._logger = null;
        ({ logger: this._logger } = dependencyContainer);
        this._dependencyContainer = dependencyContainer;

        this._socket = socket;

        // Bind callbacks to this class.
        this._bindSocketCallbacks();
        this._checkTimeouts = this._checkTimeouts.bind(this);

        // Schedule periodical timeout check if timeout period has been defined.
        if (this._defaultTimeout) {
            this._timeoutCheckTimeout = setTimeout(
                this._checkTimeouts,
                this._timeoutCheckInterval
            );
        }
    }

    _bindSocketCallbacks() {
        this._socket.onclose = this._onClose.bind(this);
        this._socket.onerror = this._onError.bind(this);
        this._socket.onmessage = this._onMessage.bind(this);
    }

    // Handle socket error.
    _onError({ message }) {
        // TODO: Inform user?
        this._logger.error(`Socket error: ${message}`);
    }

    // Handle socket closure.
    _onClose({ code, reason }) {
        this._logger.log(
            `Socket closed with code ${code}, ${reason ? ` ${reason}` : ""}`
        );
        this._socket.onmessage = null;

        // Reject all waiting handlers to that they are not left hanging forever.
        this._rejectAllWaitingHandlers("socket closed");

        this._requestHandlers = {};
        this._serverMessageHandlers = {};
        clearTimeout(this._timeoutCheckTimeout);

        // When onClose is present, user has explicitly called close
        // and callback is registered to complete the promise.
        // Otherwise, the socket has closed for unexpected reasons.
        // Hacky way to do this, but needed because WS doesn't offer Promises by
        // default.
        if (this._onCloseCallback) {
            this._onCloseCallback();
        }

        // Call the callback to schedule reconnection.
        if (
            this._options.reopenBrokenConnection &&
            this._reconnectCallback &&
            !this._onCloseCallback // TODO: More elegant way to indicate that no reconnection should happen.
        ) {
            this._reconnectCallback();
        }

        this._onCloseCallback = null;
    }

    // Handle message from server.
    _onMessage(ev) {
        const { data } = ev;

        // Respond to server ping.
        if (data === WS_MSG_CONSTANTS["PING_MSG"]) {
            this._logger.debug("<- PING");
            this._socket.send(WS_MSG_CONSTANTS["PONG_MSG"]);
            return;
        }

        // Parse server message.
        let uniqueId, action, status, payload;
        try {
            ({ uniqueId, action, status, payload } = JSON.parse(data));
        } catch (e) {
            this._logger.exception("Failed to parse message", e);
            return;
        }

        const statusOk = status === WS_MSG_CONSTANTS["CLOUD_RESPONSE_OK"];

        // For special cases, don't check for handler.
        let skipHandlerCheck = false;

        // TODO: Find a more elegant way to do this.
        if (uniqueId === "getInitialTagState" && !statusOk) {
            // Initial tag state response is of different type if the request
            // is successful, but if it fails it returns with the original uniqueId.
            action = "initialTagState";
        } else if (uniqueId === "getInitialTagState" && statusOk) {
            // This is expected, don't complain.
            skipHandlerCheck = true;
        } else if (action === "initialTagState" && statusOk) {
            // Server message 'initialTagState' is one-off and has a matching
            // request callback.
            uniqueId = action;
            action = null;
        }

        const handler = this._requestHandlers[uniqueId];
        const serverHandlers = this._serverMessageHandlers[action];

        if (!skipHandlerCheck) {
            // Call matching single-shot handler or persistent server message
            // listener.
            if (handler) {
                if (statusOk) {
                    setTimeout(() => {
                        try {
                            handler.resolve(payload);
                        } catch (e) {
                            this._logger.exception(
                                "Exception thrown inside request resolve callback",
                                e
                            );
                        }
                    }, 0);
                } else {
                    setTimeout(() => {
                        try {
                            handler.reject(status);
                        } catch (e) {
                            this._logger.exception(
                                "Exception thrown inside request reject callback",
                                e
                            );
                        }
                    }, 0);
                }

                // Remove the single-shot callback.
                delete this._requestHandlers[uniqueId];
            } else if (serverHandlers) {
                // Call all callbacks registered to this server message.
                for (const handler of serverHandlers) {
                    setTimeout(() => {
                        try {
                            handler.callback.process(payload);
                        } catch (e) {
                            this._logger.exception(
                                "Exception while processing server message",
                                e
                            );
                        }
                    }, 0);
                }
            } else {
                // This happens when cloud sends an unknown message type (not expected)
                // or a response to a time-outed request.
                this._logger.warn(
                    `Got message with no handler: uniqueId/action ${uniqueId ||
                        action}, status: ${status}`
                );
            }
        }

        // Log raw message if specified in options.
        if (this._options.logRawMessages) {
            this._logger.debug(`<- ${status} `, data.substr(0, 150));
        }
    }

    // Reject handlers which have timed out.
    _checkTimeouts(reschedule = true) {
        const handlersToDelete = [];
        for (const [uniqueId, handlerData] of Object.entries(
            this._requestHandlers
        )) {
            if (handlerData.hasTimedOut(Date.now())) {
                setTimeout(() => {
                    try {
                        handlerData.reject("timeout");
                    } catch (e) {
                        this._logger.exception(
                            "Error while rejecting timed out handler",
                            e
                        );
                    }
                }, 0);
                handlersToDelete.push(uniqueId);
            }
        }

        for (const uuid of handlersToDelete) {
            delete this._requestHandlers[uuid];
        }

        // Re-schedule the check.
        if (reschedule) {
            this._timeoutCheckTimeout = setTimeout(
                this._checkTimeouts,
                this._timeoutCheckInterval
            );
        }
    }

    // Reject all waiting request promises with a given message.
    _rejectAllWaitingHandlers(error) {
        for (const [, handlerData] of Object.entries(this._requestHandlers)) {
            setTimeout(() => {
                try {
                    handlerData.reject(error);
                } catch (e) {
                    this._logger.exception("Error while rejecting handler", e);
                }
            }, 0);
        }
    }

    /**
     * Send a single-shot request to server, returns promise that resolves
     * on valid response and rejects on timeout or error.
     *
     * @param {string} uuid Generated UUID for the request which will
     * be used to match response.
     * @param {Object} msg Core message object with type and payload.
     * @param {number} timeout Custom timeout in ms, will override default.
     * @param {string} serverResponseType If present, overrides UUID and uniqueId
     * that is expected for the server response. For special cases.
     */
    sendRequest(uuid, msg, timeout = null, serverResponseType = null) {
        return new Promise((res, rej) => {
            const finalMessage = {
                ...msg,
                uniqueId: uuid
            };

            // Attach information and request and reject callbacks to message.
            const trackingData = new TrackedRequest(
                res,
                rej,
                timeout || this._defaultTimeout
            );

            // Add the request and metadata to collection to track it
            // until it times out or response arrives.
            this._requestHandlers[serverResponseType || uuid] = trackingData;

            // Send serialized message through socket.
            this._socket.send(JSON.stringify(finalMessage));

            this._logger.debug(`Sent request with uuid ${uuid}`);
        });
    }

    /**
     * Register a callback for a server message that is not a response to a request but
     * can be received multiple times in response of some event on the server, like tag
     * activity.
     *
     * @param {string} action Id, i.e. response type for the expected server
     * message.
     * @param {string} uuid UUID for the event registered for this response,
     * used to later remove the listener.
     * @param {import("./filters").FilteredCallback} callback Callback to be
     * invoked when a relevant message is received.
     */
    registerServerCallback(action, uuid, callback) {
        if (!action) throw Error(`Invalid action '${action}'`);
        if (!uuid) throw Error(`Invalid uuid '${uuid}'`);
        if (!callback.process) throw Error("Invalid callback");

        const handlerValue = {
            callback: callback,
            uuid: uuid
        };

        if (
            !Object.prototype.hasOwnProperty.call(
                this._serverMessageHandlers,
                action
            )
        ) {
            this._serverMessageHandlers[action] = [];
        }

        this._serverMessageHandlers[action].push(handlerValue);
    }

    /**
     * Remove a registered server message callback.
     *
     * @param {string} action UniqueId, or in this case the message type.
     * @param {string} uuid UUID for the specific registered event to remove.
     */
    removeServerCallback(action, uuid) {
        const handlers = this._serverMessageHandlers[action];
        if (!handlers) return;

        // Filter out matching callbacks.
        this._serverMessageHandlers[action] = handlers.filter(
            h => h.uuid !== uuid
        );

        // Delete the key altogether if no listeners remain.
        if (!this._serverMessageHandlers[action].length) {
            delete this._serverMessageHandlers[action];
        }
    }

    /**
     * Add a function to call when socket closes. Used to convert WS closure
     * into a promise, not for other purposes.
     *
     * @param {Function} callback Callback.
     */
    setClosureCallback(callback) {
        this._onCloseCallback = callback;
    }
}
