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
        socket.onerror = (err) => {
            socket.onopen = null;
            socket.onclose = null;
            socket.onerror = null;
            // @ts-ignore
            reject(`Error while connecting: '${err.message}'`);
        };
        socket.onclose = (ev) => {
            socket.onopen = null;
            socket.onclose = null;
            socket.onerror = null;
            const code = ev.code;
            const reason = ev.reason;
            reject(`Failed to connect, code ${code}${reason ? `, reason ${reason}` : ""}`);
        };
    });
}
/**
 * Authenticate and validate connection to Noccela cloud.
 * @param {WebSocket} socket WebSocket object.
 * @param {string} token JWT token.
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
            }
            catch (e) {
                reject(`Failed to parse first message from cloud: ${e}`);
                return;
            }
            const { uniqueId, payload: { tokenExpiration, tokenIssued } } = initialMessage;
            // Cloud sends cloud version as first message after successful
            // authentication, if this is present all is ok.
            if (uniqueId === "authSuccess") {
                let response = {
                    tokenExpiration: +tokenExpiration,
                    tokenIssued: +tokenIssued
                };
                resolve(response);
            }
            else {
                reject(`Got uknown initial message ${data} after authentication`);
            }
        };
        socket.onclose = (ev) => {
            socket.onmessage = null;
            socket.onclose = null;
            reject(`Invalid token? Closure code ${ev.code}${ev.reason ? `, ${ev.reason}` : ""}`);
        };
        // Send the JWT token through socket to cloud and await response.
        socket.send(token);
    });
}
/**
 * If connection was broken, calculate and schedule timeout for new attempt.
 *
 * @param {number} retryTimeoutId If retry timeout is scheduled, id for timeout.
 * @param {number} nextRetryInterval Milliseconds for the the next retry to be scheduled.
 * @param {Object} options Options object.
 * @param {Function} connectCallback Function to call to retry connection.
 * @param {Object} logger Logger object.
 */
export function scheduleReconnection(retryTimeoutId, nextRetryInterval, options, connectCallback, logger) {
    if (retryTimeoutId != null)
        clearTimeout(retryTimeoutId);
    const interval = nextRetryInterval || options.retryIntervalMin;
    // Calculate new retry interval.
    const newNextRetryInterval = Math.min(interval + options.retryIntervalIncrease, options.retryIntervalMax);
    logger === null || logger === void 0 ? void 0 : logger.log(`Trying to reconnect in ${interval} ms`);
    // Connect again after a while.
    const newRetryTimeoutId = setTimeout(connectCallback, interval);
    return [newRetryTimeoutId, newNextRetryInterval];
}
//# sourceMappingURL=socketutils.js.map