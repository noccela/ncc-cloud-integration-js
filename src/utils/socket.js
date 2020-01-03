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
                    logger?.error(
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

    socket.onerror = ({ message }) => {
        logger?.error(`Socket error: ${message}`);
    };

    socket.onclose = ({ code, reason }) => {
        logger?.log(`Socket closed with code ${code}`);
        socket.onmessage = null;
        messageHandlers = {};
        serverMessageHandlers = {};
        clearTimeout(timeoutCheckTimeout);
        if (onClose && typeof onClose === "function") {
            onClose();
        }

        // Call the callback to schedule reconnection.
        if (options.reopenBrokenConnection && reconnectCallback && !onClose) {
            reconnectCallback();
        }
    };

    socket.onmessage = ev => {
        const { data } = ev;

        if (data === WS_MSG_CONSTANTS["PING_MSG"]) {
            logger?.debug(`<- PING`);
            socket.send(WS_MSG_CONSTANTS["PONG_MSG"]);
            return;
        }

        let uniqueId, status, payload;
        try {
            ({ uniqueId, status, payload } = JSON.parse(data));
        } catch (e) {
            logger?.exception(`Failed to parse message`, e);
            return;
        }

        const statusOk = status === WS_MSG_CONSTANTS["CLOUD_RESPONSE_OK"];

        const handler = messageHandlers[uniqueId];
        const serverHandlers = serverMessageHandlers[uniqueId];

        if (handler) {
            if (statusOk) {
                (() => {
                    try {
                        handler["promiseResolve"](payload);
                    } catch (e) {
                        logger.exception(
                            "Exception thrown inside request resolve callback",
                            e
                        );
                    }
                })();
            } else {
                try {
                    handler["promiseReject"](status);
                } catch (e) {
                    logger.exception(
                        "Exception thrown inside request reject callback",
                        e
                    );
                }
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
            logger?.warn(
                `Got message with no handler: uniqueId ${uniqueId}, status: ${status}`
            );
        }

        // Log raw message if specified in options.
        if (options?.logRawMessages) {
            logger?.debug("<-", data.substring(500));
        }
    };

    function sendRequest(uuid, msg, timeout = null) {
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
            messageHandlers[uuid] = trackingData;

            socket.send(JSON.stringify(msg));
        });
    }

    function registerServerCallback(uniqueId, callback) {
        const handlerValue = {
            callback: callback
        };

        if (!serverMessageHandlers.hasOwnProperty(uniqueId)) {
            serverMessageHandlers[uniqueId] = [];
        }

        serverMessageHandlers[uniqueId].push(handlerValue);
    }

    function addClosureCallback(callback) {
        onClose = callback;
    }

    function removeCallback(uniqueId, uuid) {
        // TODO
        delete messageHandlers[uuid];
    }

    return {
        sendRequest,
        registerServerCallback,
        addClosureCallback,
        removeCallback
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
