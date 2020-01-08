import { WS_MSG_CONSTANTS } from "../constants";

/**
 * Wraps WebSocket connect as a Promise.
 * @param {WebSocket} socket WebSocket object.
 */
export function connectWebsocket(socket) {
    return new Promise((resolve, reject) => {
        socket.onopen = () => {
            socket.onopen = null;
            socket.onclose = null;
            resolve();
        };

        socket.onclose = ev => {
            socket.onopen = null;
            socket.onclose = null;
            const code = ev.code;
            const reason = ev.reason;
            reject(`Failed to connect, code ${code}, reason ${reason}`);
        };
    });
}

/**
 * Authenticate and validate connection to Noccela cloud.
 * @param {WebSocket} socket WebSocket object.
 * @param {String} token JWT token.
 */
export function authenticate(socket, token) {
    return new Promise((resolve, reject) => {
        socket.onmessage = msg => {
            socket.onmessage = null;
            socket.onclose = null;

            const { data } = msg;

            let initialMessage;

            try {
                initialMessage = JSON.parse(data);
            } catch (e) {
                reject(`Failed to parse first message from cloud: ${e}`);
                return;
            }

            const { uniqueId } = initialMessage;

            // Cloud sends cloud version as first message after successful
            // authentication, if this is present all is ok.
            if (uniqueId === "cloudVersion") {
                resolve();
            } else {
                reject(
                    `Got uknown initial message ${data} after authentication`
                );
            }
        };

        socket.onclose = ({ code, reason }) => {
            socket.onmessage = null;
            socket.onclose = null;
            reject(`Invalid token? Closure code ${code}`);
        };

        // Send the JWT token through socket to cloud and await response.
        socket.send(token);
    });
}

/**
 * Create an object that handles WebSocket commications, callbacks etc.
 * Sends and tracks requests and invokes callbacks/resolves promises.
 *
 * @param {WebSocket} socket Open and authenticated WebSocket object.
 * @param {Object} logger Logger.
 * @param {Object} options Options object.
 * @param {Function} reconnectCallback Callback that is invoked when socket should reconnect.
 */
export function WebsocketMessageHandler(
    socket,
    logger,
    options,
    reconnectCallback
) {
    // Map request ids/message types to metadata and callbacks.
    let messageHandlers = {};
    let serverMessageHandlers = {};
    const timeout = options.requestTimeout;

    const timeoutCheckInterval = Math.max(timeout / 2 || 0, 5000);

    // Timeout id for the periodical check.
    let timeoutCheckTimeout = null;

    let onClose = null;

    function checkTimeouts(reschedule = true) {
        for (const [uniqueId, handlerData] of Object.entries(messageHandlers)) {
            const sentAt = handlerData["sentAt"];
            const customTimeout = handlerData["timeout"];

            // Request can't timeout if no timestamp is recorded.
            if (!sentAt) continue;

            // Check if the request has taken too long.
            const tof = Date.now() - sentAt;
            if (
                (customTimeout && tof > customTimeout) ||
                (!customTimeout && tof > timeout)
            ) {
                const reject = handlerData["promiseReject"];
                if (!reject || typeof reject !== "function") {
                    logger.error(
                        `Request ${uniqueId} timeouted and did not have valid reject callback`
                    );
                } else {
                    // Reject the promise that awaits the request.
                    reject("timeout");
                }
            }
        }

        if (reschedule) {
            timeoutCheckTimeout = setTimeout(
                checkTimeouts,
                timeoutCheckInterval
            );
        }
    }

    // Schedule periodical timeout check if timeout period has been defined.
    if (timeout) {
        setTimeout(checkTimeouts, timeoutCheckInterval);
    }

    // Handle socket error.
    socket.onerror = ({ message }) => {
        // TODO: Inform user?
        logger.error(`Socket error: ${message}`);
    };

    // Handle socket closure.
    socket.onclose = ({ code, reason }) => {
        logger.log(`Socket closed with code ${code}`);
        socket.onmessage = null;
        messageHandlers = {};
        serverMessageHandlers = {};
        clearTimeout(timeoutCheckTimeout);

        // When onClose is present, user has explicitly called close
        // and callback is registered to complete the promise.
        // Otherwise, the socket has closed for unexpected reasons.
        // Hacky way to do this, but needed because WS doesn't offer Promises by
        // default.
        if (onClose && typeof onClose === "function") {
            onClose();
        }

        // Call the callback to schedule reconnection.
        if (options.reopenBrokenConnection && reconnectCallback && !onClose) {
            reconnectCallback();
        }

        onClose = null;
    };

    // Initial handling of raw message from server, pass to relevant callbacks.
    socket.onmessage = ev => {
        const { data } = ev;

        // Respond to server ping.
        if (data === WS_MSG_CONSTANTS["PING_MSG"]) {
            logger.debug(`<- PING`);
            socket.send(WS_MSG_CONSTANTS["PONG_MSG"]);
            return;
        }

        // Parse server message.
        let uniqueId, status, payload;
        try {
            ({ uniqueId, status, payload } = JSON.parse(data));
        } catch (e) {
            logger.exception(`Failed to parse message`, e);
            return;
        }

        const statusOk = status === WS_MSG_CONSTANTS["CLOUD_RESPONSE_OK"];

        // TODO: Find a smarter way to do this.
        if (uniqueId === "getInitialTagState" && !statusOk) {
            // Initial tag state response is of different type if the request
            // is successful, but if it fails it returns with the original uniqueId.
            uniqueId = "initialTagState";
        }

        const handler = messageHandlers[uniqueId];
        const serverHandlers = serverMessageHandlers[uniqueId];

        // Call matching single-shot handler or persistent server message
        // listener.
        if (handler) {
            if (statusOk) {
                setTimeout(() => {
                    try {
                        handler["promiseResolve"](payload);
                    } catch (e) {
                        logger.exception(
                            "Exception thrown inside request resolve callback",
                            e
                        );
                    }
                }, 0);
            } else {
                setTimeout(() => {
                    try {
                        handler["promiseReject"](status);
                    } catch (e) {
                        logger.exception(
                            "Exception thrown inside request reject callback",
                            e
                        );
                    }
                }, 0)
            }

            // Remove the single-shot callback.
            delete messageHandlers[uniqueId];
        } else if (serverHandlers) {
            // Call all callbacks registered to this server message.
            for (const handler of serverHandlers) {
                handler["callback"](payload);
            }
        } else {
            // This happens when cloud sends an unknown message type (not expected)
            // or a response to a time-outed request.
            logger.warn(
                `Got message with no handler: uniqueId ${uniqueId}, status: ${status}`
            );
        }

        // Log raw message if specified in options.
        if (options?.logRawMessages) {
            logger.debug("<-", data.substr(0, 100));
        }
    };

    /**
     * Send a single-shot request to server, returns promise that resolves
     * on valid response and rejects on timeout or error.
     *
     * @param {String} uuid Generated UUID for the request which will be used to match response.
     * @param {Object} msg Core message object with type and payload.
     * @param {Number} timeout Custom timeout in ms, will override default.
     * @param {String} serverResponseType If present, overrides UUID and uniqueId that is expected for the server response.
     */
    function sendRequest(uuid, msg, timeout = null, serverResponseType = null) {
        return new Promise((res, rej) => {
            msg = {
                ...msg,
                uniqueId: uuid
            };

            // Attach information and request and reject callbacks to message.
            const trackingData = {
                sentAt: Date.now(),
                promiseResolve: res,
                promiseReject: rej,
                customTimeout: timeout
            };

            // Add the request and metadata to collection to track it
            // until it times out or response arrives.
            messageHandlers[serverResponseType || uuid] = trackingData;

            socket.send(JSON.stringify(msg));
        });
    }

    /**
     * Register a callback for a server message that is not a response to a request but
     * can be received multiple times in response of some event on the server, like tag
     * activity.
     *
     * @param {String} uniqueId Id, i.e. response type for the expected server message.
     * @param {String} uuid UUID for the event registered for this response, used to later remove the listener.
     * @param {Function} callback Callback to be invoked when a relevant message is received.
     */
    function registerServerCallback(uniqueId, uuid, callback) {
        const handlerValue = {
            callback: callback,
            uuid: uuid
        };

        if (!serverMessageHandlers.hasOwnProperty(uniqueId)) {
            serverMessageHandlers[uniqueId] = [];
        }

        serverMessageHandlers[uniqueId].push(handlerValue);
    }

    /**
     * Add a function to call when socket closes. Used to convert WS closure
     * into a promise, not for other purposes.
     *
     * @param {Function} callback Callback.
     */
    function addClosureCallback(callback) {
        onClose = callback;
    }

    /**
     * Remove a registered server message callback.
     *
     * @param {String} uniqueId UniqueId, or in this case the message type.
     * @param {String} uuid UUID for the specific registered event to remove.
     */
    function removeServerCallback(uniqueId, uuid) {
        const handlers = serverMessageHandlers[uniqueId];
        if (!handlers) return;
        // Filter out matching callbacks.
        serverMessageHandlers[uniqueId] = handlers.filter(
            h => h["uuid"] !== uuid
        );

        // Delete the key altogether if no listeners remain.
        if (!serverMessageHandlers[uniqueId].length) {
            delete serverMessageHandlers[uniqueId];
        }
    }

    return {
        sendRequest,
        registerServerCallback,
        addClosureCallback,
        removeServerCallback
    };
}

/**
 * If connection was broken, calculate and schedule timeout for new attempt.
 *
 * @param {Number} retryTimeoutId If retry timeout is scheduled, id for timeout.
 * @param {Number} nextRetryInterval Milliseconds for the the next retry to be scheduled.
 * @param {Object} options Options object.
 * @param {Function} connectCallback Function to call to retry connection.
 * @param {Object} logger Logger object.
 */
export function scheduleReconnection(
    retryTimeoutId,
    nextRetryInterval,
    options,
    connectCallback,
    logger
) {
    clearTimeout(retryTimeoutId);

    const interval = nextRetryInterval || options.retryIntervalMin;

    // Calculate new retry interval.
    const newNextRetryInterval = Math.min(
        interval + options.retryIntervalIncrease,
        options.retryIntervalMax
    );

    logger.log(`Trying to reconnect in ${interval} ms`);

    // Connect again after a while.
    const newRetryTimeoutId = setTimeout(connectCallback, interval);

    return [newRetryTimeoutId, newNextRetryInterval];
}
