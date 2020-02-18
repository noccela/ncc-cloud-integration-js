import { SOCKET_HANDLER_MISSING_ERROR } from "../constants/constants";
import { getToken } from "../rest/authentication";
import { ArgumentException } from "../utils/exceptions";
import { uuidv4, validateAccountAndSite, getWebSocket } from "../utils/utils";
import { Dependencies } from "./models";
import { RequestHandler } from "./requesthandler";
import {
    authenticate,
    connectWebsocket,
    scheduleReconnection
} from "./socketutils";

/**
 * Encloses a RequestHandler and provides additional 'robustness'
 * features on it, namely this class handles scheduling new connection
 * attempts when socket closes *unexpectedly*.
 *
 * @class RobustWSChannel
 */
class RobustWSChannel {
    /**
     * Creates an instance of RobustWSChannel.
     * @param {string} address Socket endpoint address.
     * @param {Object} options
     * @param {Dependencies} dependencyContainer
     * @memberof RobustWSChannel
     */
    constructor(address, options, dependencyContainer) {
        if (!address || typeof address !== "string") {
            throw Error("Invalid address");
        }
        if (!address.startsWith("ws")) {
            throw Error("Invalid protocol for WS address, expected ws or wss");
        }

        this._address = address;
        this._options = options;

        // Internal socket state.
        this._socket = null;
        this._socketHandler = null;
        this._lastJwtUsed = null;
        this._tokenExpirationTimeout = null;
        this._retryTimeout = null;
        this._nextRetryInterval = null;

        // Unpack dependencies.
        this._logger = null;
        ({ logger: this._logger } = dependencyContainer);
        this._dependencyContainer = dependencyContainer;

        this._reconnect = this._reconnect.bind(this);
    }

    // Called by socket handler if connection closes unexpectedly.
    // Attempts to connect again later with increasing intervals.
    _reconnect() {
        // Previous socket handler should no longer be used.
        this._socketHandler = null;

        // Attempt to connect, authenticate and re-establish the previous state.
        async function connectionAttempt() {
            try {
                await this.connect(this._lastJwtUsed);

                // Call callback to do other actions after connection has been
                // recreated.
                this._onConnectionRecreated?.();
            } catch (e) {
                this._logger.exception(
                    "Exception while attempting to reconnect",
                    e
                );

                // Delay and schedule new attempt after attempt failed.
                this._reconnect();
                return;
            }

            this._logger.log("Connection re-established");
        }

        [this._retryTimeout, this._nextRetryInterval] = scheduleReconnection(
            this._retryTimeout,
            this._nextRetryInterval,
            this._options,
            connectionAttempt.bind(this),
            this._logger
        );
    }

    /**
     * Send a message with payload directly.
     *
     * @param {string} action Action name.
     * @param {number} account Site's account ID.
     * @param {number} site Site's ID.
     * @param {Object} payload Action's payload.
     * @returns Promise that resolves with the response payload.
     * @memberof RobustWSChannel
     */
    async sendMessageRaw(action, account, site, payload) {
        if (this._socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }

        validateAccountAndSite(account, site);

        const uuid = uuidv4();
        const request = {
            accountId: account,
            siteId: site,
            payload: payload,
            action: action
        };

        return await this._socketHandler.sendRequest(uuid, request);
    }

    /**
     * Set a callback that will be called when socket connection was re-established
     * after unexpected closure. Can be used to for example handle re-establishing
     * the state before closure.
     *
     * @param {Function} onConnectionRecreated
     * @memberof RobustWSChannel
     */
    setOnReconnectCallback(onConnectionRecreated) {
        if (
            onConnectionRecreated &&
            typeof onConnectionRecreated !== "function"
        ) {
            throw new ArgumentException("onConnectionRecreated");
        }

        this._onConnectionRecreated = onConnectionRecreated;
    }

    /**
     * Close the underlying connection.
     *
     * @returns Promise that resolves when connection is closed.
     * @memberof RobustWSChannel
     */
    async close() {
        if (!this.connected) return;

        await new Promise((res, rej) => {
            // Resolve when request handler calls back when socket is closed.
            this._socketHandler.setClosureCallback(() => {
                res();
                this._socketHandler = null;
                this._lastJwtUsed = null;
            });

            clearTimeout(this._retryTimeout);

            try {
                this._socket.close();
            } catch (e) {
                rej(e);
            }
        });
    }

    /**
     * Connect to WS endpoint and authenticate with the given JSON Web Token.
     *
     * @param {string} jwt Encoded JWT to authenticate with.
     * @returns Resolves if both connecting and authentication were successful,
     * rejects with error otherwise.
     * @memberof RobustWSChannel
     */
    async connect(jwt) {
        if (!jwt || typeof jwt !== "string") throw Error("Invalid JWT");

        if (this._socket && this.connected) return;

        clearTimeout(this._retryTimeout);

        // Create new WebSocket and handler.
        const wsConstructor = await getWebSocket();

        this._webSocketStateOpen = wsConstructor.OPEN;
        this._webSocketStateClosed = wsConstructor.CLOSED;

        this._socket = new wsConstructor(this._address);

        this._logger.log(`Connecting to ${this._address}`);
        // Connect to cloud.
        await connectWebsocket(this._socket);
        this._logger.log(`Connected, sending token`);

        // Send JWT to cloud for authentication.
        const { tokenExpiration, tokenIssued } = await authenticate(
            this._socket,
            jwt
        );

        this._logger.log(
            `Authentication successful, token expiration ${tokenExpiration}`
        );

        // All is OK, create WebSocket handler.
        this._socketHandler = new RequestHandler(
            this._socket,
            this._options,
            this._reconnect,
            this._dependencyContainer
        );

        this._lastJwtUsed = jwt;
        this._nextRetryInterval = this._options.retryIntervalMin;

        return {
            tokenExpiration,
            tokenIssued
        };
    }

    /** @see {@link RequestHandler#registerServerCallback} */
    registerServerCallback(registeredResponseType, uuid, callback) {
        this._socketHandler.registerServerCallback(
            registeredResponseType,
            uuid,
            callback
        );
    }

    /** @see {@link RequestHandler#removeServerCallback} */
    unregisterServerCallback(action, uuid) {
        this._socketHandler.removeServerCallback(action, uuid);
    }

    /** @see {@link RequestHandler#sendRequest} */
    async sendRequest(uuid, msg, timeout = null, serverResponseType = null) {
        if (typeof uuid !== "string") {
            throw new ArgumentException("uuid");
        }
        return await this._socketHandler.sendRequest(
            uuid,
            msg,
            timeout,
            serverResponseType
        );
    }

    /**
     * True if underlying connection is open and authenticated.
     *
     * @readonly
     * @memberof RobustWSChannel
     */
    get connected() {
        return (
            !!this._socket &&
            !!this._socketHandler &&
            this._socket.readyState === this._webSocketStateOpen
        );
    }
}

/**
 * Handles automatic periodic refreshing of JWT token.
 *
 * @export
 * @class RobustAuthenticatedWSChannel
 * @inheritdoc
 * @extends {RobustWSChannel}
 */
export class RobustAuthenticatedWSChannel extends RobustWSChannel {
    // Fetch a new token and re-authenticate with the conneciton.
    async _refreshToken(authServerDomain, clientId, clientSecret) {
        // Fetch new token from auth. server.
        this._logger.log(`Refreshing access token...`);

        // Connection is down currently, throw and try again later.
        if (this._socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }

        const { accessToken: newToken } = await getToken(
            authServerDomain,
            clientId,
            clientSecret
        );

        this._logger.debug(`Got new token, sending to cloud`);

        // Send the new token as a request.
        const uuid = uuidv4();
        const response = await this._socketHandler.sendRequest(uuid, {
            action: "refreshToken",
            payload: {
                token: newToken
            }
        });

        this._logger.log(
            `Token refreshed successfully, new expiration ${response["tokenExpiration"]}`
        );

        // Persist the token in internal state so the connection can be recreated.
        this._lastJwtUsed = newToken;

        return response;
    }

    /**
     * Schedule a token refreshal callback.
     * Handles cases in which this callback fails.
     * Re-schedules the callback after successful call.
     *
     * @param {{authServerDomain: string
     * , tokenExpiration: number
     * , tokenIssued: number
     * , clientId: number
     * , clientSecret: string}} args Arguments object.
     */
    scheduleTokenRefresh(args) {
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
        const tokenRefreshTimestamp = Math.trunc(tokenIssued + tokenSpan / 2);
        const currentTimestamp = Math.trunc(Date.now() / 1000);

        // Get ms until token should be refreshed, with given minimum wait.
        const timeUntilRefresh =
            Math.max((tokenRefreshTimestamp - currentTimestamp) * 1000, 1000) |
            0;

        clearTimeout(this._tokenExpirationTimeout);
        const callback = async () => {
            try {
                const {
                    tokenExpiration,
                    tokenIssued
                } = await this._refreshToken(
                    authServerDomain,
                    clientId,
                    clientSecret
                );

                // Schedule next refreshal with new values.
                this.scheduleTokenRefresh({
                    ...args,
                    tokenExpiration: +tokenExpiration,
                    tokenIssued: +tokenIssued
                });
            } catch (e) {
                // The authentication might fail for any number of reasons,
                // has to be handled and tried again later.
                this._logger.exception(
                    "Error while fetching new token, trying again later",
                    e
                );
                setTimeout(
                    callback,
                    this._options.tokenRefreshFailureRetryTimeout
                );
            }
        };

        this._logger.debug(
            `Refreshing the token at ${new Date(tokenRefreshTimestamp * 1000)}`
        );
        this._tokenExpirationTimeout = setTimeout(callback, timeUntilRefresh);
    }

    /**
     * Fetch token, create an authenticated connection to backend and schedule
     * automatic token refreshals.
     *
     * @param {string} authServerDomain Domain for authentication server.
     * @param {number} clientId Client ID.
     * @param {string} clientSecret Client secret.
     * @memberof RobustAuthenticatedWSChannel
     */
    async createAuthenticatedConnection(
        authServerDomain,
        clientId,
        clientSecret
    ) {
        const { accessToken: token } = await getToken(
            authServerDomain,
            clientId,
            clientSecret
        );

        const { tokenExpiration, tokenIssued } = await this.connect(token);

        if (this._options.automaticTokenRenewal) {
            this.scheduleTokenRefresh({
                authServerDomain,
                tokenExpiration,
                tokenIssued,
                clientId,
                clientSecret
            });
        }
    }

    /** @inheritdoc */
    async close() {
        clearTimeout(this._tokenExpirationTimeout);
        await super.close();
    }
}
