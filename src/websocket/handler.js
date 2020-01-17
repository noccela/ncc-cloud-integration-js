import "regenerator-runtime/runtime";

import { DEFAULT_OPTIONS, EVENT_TYPES } from "../constants/constants";
import {
    connectWebsocket,
    authenticate,
    WebsocketMessageHandler,
    scheduleReconnection
} from "./socket";
import {
    isWsOpen,
    validateOptions,
    uuidv4,
    validateAccountAndSite
} from "../utils/utils";
import {
    getLocationUpdateCallback,
    getTagInitialStateCallback,
    getTagDiffStreamCallback
} from "../utils/events";
import { parseTagLiveData } from "../utils/messagepack";
import { NCC_PATHS } from "../constants/paths";
import { getToken } from "../rest/authentication";

const SOCKET_HANDLER_MISSING_ERROR =
    "Cannot send message, no authenticated connection available";

/**
 * Create the connection object that is used to communicate with Noccela cloud.
 * Provides methods to connect, authenticate, send requests asynchronously and
 * custom events with filters.
 *
 * @param {String} address WebSocket endpoint address.
 * @param {Object?} userOptions User provided options object that overrides or supplements defaults.
 */
export function createWSChannel(domain, userOptions = {}) {
    if (!domain || typeof domain !== "string") throw Error("Invalid address");
    if (!domain.startsWith("ws"))
        throw Error("Invalid protocol for WS address, expected ws or wss");

    // Build the complete ws endpoint address.
    const address = new URL(NCC_PATHS["REALTIME_API"], domain).href;

    let socket = null;
    let socketHandler = null;
    let lastJwtUsed = null;
    let tokenExpirationTimeout = null;

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

    async function refreshToken(authServerDomain, clientId, clientSecret) {
        // Fetch new token from auth. server.
        logger.log(`Refreshing access token...`);

        // Connection is down currently, throw and try again later.
        if (socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }

        const { accessToken: newToken } = await getToken(
            authServerDomain,
            clientId,
            clientSecret
        );

        logger.debug(`Got new token, sending to cloud`);

        // Send the new token as a request.
        const uuid = uuidv4();
        const response = await socketHandler.sendRequest(uuid, {
            action: "refreshToken",
            payload: {
                token: newToken
            }
        });

        logger.log(
            `Token refreshed successfully, new expiration ${response["tokenExpiration"]}`
        );

        logger.log(newToken);

        lastJwtUsed = newToken;

        return response;
    }

    /**
     * Schedule a token refreshal callback.
     * Handles cases in which this callback fails.
     * Re-schedules the callback after successful call.
     * 
     * @param {Object} args Arguments object.
     */
    function scheduleTokenRefresh(args) {
        const {
            authServerDomain,
            tokenExpiration,
            tokenIssued,
            clientId,
            clientSecret
        } = args;

        // Calculate the wait until token should be refreshed, half of the time
        // remaining.
        const tokenSpan = tokenExpiration - tokenIssued;
        if (typeof tokenSpan !== "number" || tokenSpan <= 0) {
            throw Error("Received invalid token information");
        }

        // Calculate timestamp after which token should be refreshed.
        const tokenRefreshTimestamp = (tokenIssued + tokenSpan / 2) | 0;
        const currentTimestamp = (Date.now() / 1000) | 0;

        // Get ms until token should be refreshed, with given minimum wait.
        const timeUntilRefresh =
            Math.max((tokenRefreshTimestamp - currentTimestamp) * 1000, 1000) |
            0;

        clearTimeout(tokenExpirationTimeout);
        const callback = async () => {
            try {
                const { tokenExpiration, tokenIssued } = await refreshToken(
                    authServerDomain,
                    clientId,
                    clientSecret
                );

                // Schedule next refreshal with new values.
                scheduleTokenRefresh({
                    ...args,
                    tokenExpiration: +tokenExpiration,
                    tokenIssued: +tokenIssued
                });
            } catch (e) {
                // The authentication might fail for any number of reasons,
                // has to be handled and tried again later.
                logger.exception(
                    "Error while fetching new token, trying again later",
                    e
                );
                setTimeout(callback, options.tokenRefreshFailureRetryTimeout);
            }
        };

        logger.debug(
            `Refreshing the token at ${new Date(tokenRefreshTimestamp * 1000)}`
        );
        tokenExpirationTimeout = setTimeout(callback, timeUntilRefresh);
    }

    // Called by socket handler if connection closes unexpectedly.
    // Attempts to connect again later with increasing intervals.
    function reconnect() {
        // Previous socket handler should no longer be used.
        socketHandler = null;

        // Attempt to connect, authenticate and re-establish the previous state.
        async function connectionAttempt() {
            try {
                await connect(lastJwtUsed);
                // Re-register events.
                const oldEntries = Object.entries(registeredEvents);
                for (const [uuid, data] of oldEntries) {
                    const { args } = data;

                    // Remove old registrations.
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
                logger.exception("Exception while attempting to reconnect", e);
                reconnect();
                return;
            }

            logger.log("Connection re-established");
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
     * Fetch new token from authentication server and connect the WebSocket in
     * one go. Also automatically schedules new token retrieval if 'automaticTokenRenewal'
     * is true in options.
     * 
     * @param {String} authServerDomain Authentication server domain.
     * @param {String} clientId Client ID to authenticate with.
     * @param {String} clientSecret Client secret.
     */
    async function authenticateAndConnect(
        authServerDomain,
        clientId,
        clientSecret
    ) {
        const { accessToken: token } = await getToken(
            authServerDomain,
            clientId,
            clientSecret
        );

        const { tokenExpiration, tokenIssued } = await connect(token);

        if (options.automaticTokenRenewal) {
            scheduleTokenRefresh({
                authServerDomain,
                tokenExpiration,
                tokenIssued,
                clientId,
                clientSecret
            });
        }
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

        logger.log(`Connecting to ${address}`);

        // Connect to cloud.
        await connectWebsocket(socket);

        logger.log(`Connected, sending token`);

        // Send JWT to cloud for authentication.
        const { tokenExpiration, tokenIssued } = await authenticate(
            socket,
            jwt
        );

        logger.log(
            `Authentication successful, token expiration ${tokenExpiration}`
        );

        // All is OK, create WebSocket handler.
        socketHandler = WebsocketMessageHandler(
            socket,
            logger,
            options,
            reconnect
        );

        lastJwtUsed = jwt;
        nextRetryInterval = options.retryIntervalMin;

        return {
            tokenExpiration,
            tokenIssued
        };
    }

    /**
     * Close connection.
     */
    function close() {
        if (!isWsOpen(socket)) return;

        clearTimeout(retryTimeout);
        clearTimeout(tokenExpirationTimeout);

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
        if (socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }

        validateAccountAndSite(accountId, siteId);

        // Create UUID to track event and request.
        const uuid = uuidv4();
        // The type of the server response message, need to track this
        // to later unregister it.
        let registeredResponseType = null;
        let unregisterFromHandler = true;

        switch (type) {
            case EVENT_TYPES["LOCATION_UPDATE"]:
                validateOptions(filters, ["deviceIds"], null);
                registeredResponseType = "locationUpdate";
                socketHandler.registerServerCallback(
                    registeredResponseType,
                    uuid,
                    getLocationUpdateCallback(
                        accountId,
                        siteId,
                        finalFilters,
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
            case EVENT_TYPES["TAG_DIFF"]:
                validateOptions(filters, ["deviceIds"], null);
                registeredResponseType = "tagDiffStream";
                socketHandler.registerServerCallback(
                    registeredResponseType,
                    uuid,
                    getTagDiffStreamCallback(filters, callback, logger)
                );
                await socketHandler.sendRequest(uuid, {
                    accountId,
                    siteId,
                    action: "registerToTagChangeStream",
                    payload: filters
                });
                break;
            case EVENT_TYPES["TAG_STATE"]:
                validateOptions(filters, ["deviceIds"], null);
                registeredResponseType = "initialTagState";

                // This event has special handling.
                unregisterFromHandler = false;

                getTagState(accountId, siteId)
                    .then(getTagInitialStateCallback(filters, callback, logger))
                    .catch(err => {
                        callback(err, null);
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

        // Track the event so it can be unregistered or re-registered if socket
        // is re-established.
        registeredEvents[uuid] = {
            eventType: type,
            responseType: registeredResponseType,
            callback: callback,
            args: [type, accountId, siteId, filters, callback],
            unregisterFromHandler: unregisterFromHandler
        };

        return uuid;
    }

    /**
     * Fetch initial state for tags on the site.
     *
     * @param {Number} accountId Site's account id.
     * @param {Number} siteId Site's id.
     */
    async function getTagState(accountId, siteId) {
        if (socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }

        const payload = await socketHandler.sendRequest(
            "getInitialTagState",
            {
                accountId,
                siteId,
                action: "getInitialTagState",
                payload: null
            },
            null,
            "initialTagState"
        );

        // Parse the encoded message.
        const result = parseTagLiveData(payload);
        return result;
    }

    /**
     * Unregister an event registered with 'register()'. The UUID provided
     * is the one returned by register function.
     *
     * @param {String} uuid UUID for the registered event.
     */
    async function unregister(uuid) {
        const event = registeredEvents[uuid];
        if (!event) return false;

        const type = event["responseType"];
        const eventType = event["eventType"];
        const unregisterFromHandler = event["unregisterFromHandler"];

        delete registeredEvents[uuid];

        if (unregisterFromHandler) {
            // Unregister from handler, if it exists.
            // No handler means the socket is temporarily down, no need to
            // unregister from cloud as new connection will just not re-register it.
            if (socketHandler) {
                socketHandler.removeServerCallback(type, uuid);
            }
        }
        logger.log(`Unregistered event ${eventType} with UUID ${uuid}`);

        return true;
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
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
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
        authenticateAndConnect,
        connect,
        close,
        register,
        unregister,
        sendMessageRaw,
        getTagState
    };
}
