import {
    connectWebsocket,
    authenticate,
    WebsocketMessageHandler,
    scheduleReconnection
} from "./utils/socket";
import {
    isWsOpen,
    validateOptions,
    uuidv4,
    validateAccountAndSite
} from "./utils/utils";
import { DEFAULT_OPTIONS, EVENT_TYPES } from "./constants";

import "regenerator-runtime/runtime";
import { getLocationUpdateCallback } from "./utils/events";

export function createConnection(address, userOptions = {}) {
    if (!address || typeof address !== "string") throw Error("Invalid address");
    if (!address.startsWith("ws"))
        throw Error("Invalid protocol for WS address, expected ws or wss");

    let socket = null;
    let socketHandler = null;
    let lastJwtUsed = null;

    let retryTimeout, nextRetryInterval;

    // Registered events mapped by their id.
    let registeredEvents = {};

    // Combine default options with provided ones.
    const options = Object.assign(DEFAULT_OPTIONS, userOptions);

    // Create logger functions that call all registered loggers.
    const logger = {
        log: (...objs) => options.loggers.forEach(l => l?.log(...objs)),
        warn: (...objs) => options.loggers.forEach(l => l?.warn(...objs)),
        error: (...objs) => options.loggers.forEach(l => l?.error(...objs)),
        exception: (...objs) =>
            options.loggers.forEach(l => l?.exception(...objs)),
        debug: (...objs) => options.loggers.forEach(l => l?.debug(...objs))
    };

    // Called by socket handler if connection closes unexpectedly.
    // Attempts to connect again later with increasing intervals.
    function reconnect() {
        // Attempt to connect, authenticate and re-establish the previous state.
        async function connectionAttempt() {
            try {
                await connect(lastJwtUsed);
                // Re-register events.
                const oldEntries = Object.entries(registeredEvents);
                for (const [uuid, data] of oldEntries) {
                    const { args } = data;

                    // Remove old
                    registeredEvents = {};

                    try {
                        // Register the event using same arguments as before.
                        await register(...args);
                    } catch (e) {
                        // TODO: What should happen in this situation?
                        logger.exception("Error while re-registering event", e);
                    }
                }
            } catch (e) {
                logger?.exception("Exception while attempting to reconnect", e);
                reconnect();
                return;
            }

            logger?.log("Connection re-established");
        }

        [retryTimeout, nextRetryInterval] = scheduleReconnection(
            retryTimeout,
            nextRetryInterval,
            options,
            connectionAttempt,
            logger
        );
    }

    /**
     * Create connection to Noccela cloud and authenticate the connection.
     * @param {String} jwt JWT token received from authentication server.
     */
    async function connect(jwt) {
        if (!jwt || typeof jwt !== "string") throw Error("Invalid JWT");

        if (socket && isWsOpen(socket)) return;

        clearTimeout(retryTimeout);

        // Create new WebSocket and handler.
        socket = new WebSocket(address);

        logger?.log(`Connecting to ${address}`);

        // Connect to cloud.
        await connectWebsocket(socket);

        logger?.log(`Connected, sending token`);

        // Send JWT to cloud for authentication.
        await authenticate(socket, jwt);

        logger?.log("Authentication successful");

        // All is OK, create WebSocket handler.
        socketHandler = WebsocketMessageHandler(
            socket,
            logger,
            options,
            reconnect
        );

        lastJwtUsed = jwt;
    }

    /**
     * Close connection.
     */
    function close() {
        if (!isWsOpen(socket)) return;

        clearTimeout(retryTimeout);

        return new Promise((res, rej) => {
            socketHandler.addClosureCallback(() => {
                res();
                socketHandler = null;
            });

            registeredEvents = {};

            try {
                socket.close();
            } catch (e) {
                rej(e);
            }
        });
    }

    /**
     * Register to an API event, such as location update and tag metadata streams.
     * Provide filters for site and request-specific filters and a callback to
     * be invoked with response filtered with the provided filters.
     *
     * @param {String} type Type of the event to be registered.
     * @param {Number} accountId Account id for the site.
     * @param {Number} siteId Site id for the site.
     * @param {Object} filters Request specific filters for request.
     * @param {Function} callback Callback when a filtered message is received.
     */
    async function register(type, accountId, siteId, filters, callback) {
        validateAccountAndSite(accountId, siteId);

        // Create UUID to track event and request.
        const uuid = uuidv4();

        switch (type) {
            case EVENT_TYPES["LOCATION_UPDATE"]:
                validateOptions(filters, null, ["deviceIds"]);
                socketHandler.registerServerCallback(
                    "locationUpdate",
                    getLocationUpdateCallback(
                        accountId,
                        siteId,
                        filters,
                        callback,
                        logger
                    )
                );
                await socketHandler.sendRequest(uuid, {
                    accountId,
                    siteId,
                    action: "tagLocationRequest",
                    payload: filters
                });
                break;
            default:
                throw Error(
                    `Invalid event type ${type}, available types ${Object.keys(
                        EVENT_TYPES
                    ).join()}`
                );
        }

        logger.log(`Registered event ${type}`);

        // Track the event so it can be unregisterec or re-registered if socket
        // is re-established.
        registeredEvents[uuid] = {
            callback: callback,
            args: [type, accountId, siteId, filters, callback]
        };

        return uuid;
    }

    async function unregister() {
        // TODO
    }

    /**
     * Send a raw request to cloud.
     *
     * @param {String} action Request type.
     * @param {Number} accountId Account id for requested site.
     * @param {Number} siteId Site id for requested site.
     * @param {Object} payload Request payload object.
     */
    async function sendMessageRaw(action, accountId, siteId, payload) {
        if (socketHandler === null) {
            throw Error(
                "Cannot send message, no authenticated connection available"
            );
        }

        const request = {
            accountId: accountId,
            siteId: siteId,
            payload: payload,
            action: action
        };

        await socketHandler.sendRequest(request);
    }

    // Public API.
    return {
        connect,
        close,
        register,
        unregister,
        sendMessageRaw
    };
}
