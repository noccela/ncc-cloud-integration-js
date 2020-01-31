import { uuidv4, validateAccountAndSite, isWsOpen } from "../utils/utils";
import { RequestHandler } from "./requesthandler";
import {
    authenticate,
    connectWebsocket,
    scheduleReconnection
} from "./socketutils";
import { getToken } from "../rest/authentication";
import { WS_READYSTATE } from "../constants/constants";

// Encloses WS channel that has the ability to re-establish authenticated
// connection and the related request handler.
class RobustWSChannel {
    constructor(address, options, dependencyContainer) {
        if (!address || typeof address !== "string")
            throw Error("Invalid address");
        if (!address.startsWith("ws"))
            throw Error("Invalid protocol for WS address, expected ws or wss");

        this._address = address;
        this._options = options;

        // Internal socket state.
        this._socket = null;
        this._socketHandler = null;
        this._lastJwtUsed = null;
        this._tokenExpirationTimeout = null;
        this._retryTimeout;
        this._nextRetryInterval;

        // Unpack dependencies.
        ({ logger: this._logger } = dependencyContainer);
        this._dependencyContainer = dependencyContainer;

        this._reconnect = this._reconnect.bind(this);
    }

    async sendMessageRaw(action, account, site, payload) {
        if (this._socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }

        validateAccountAndSite(account, site);

        const request = {
            accountId: account,
            siteId: site,
            payload: payload,
            action: action
        };

        return await socketHandler.sendRequest(request);
    }

    setOnReconnectCallback(onConnectionRecreated) {
        if (
            onConnectionRecreated &&
            typeof onConnectionRecreated !== "function"
        ) {
            throw new ArgumentException("onConnectionRecreated");
        }

        this._onConnectionRecreated = onConnectionRecreated;
    }

    async close() {
        if (!isWsOpen(this._socket)) return;

        await new Promise((res, rej) => {
            // Resolve when request handler calls back when socket is closed.
            this._socketHandler.addClosureCallback(() => {
                res();
                this._socketHandler = null;
            });

            clearTimeout(this._retryTimeout);

            try {
                this._socket.close();
            } catch (e) {
                rej(e);
            }
        });
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

    async connect(jwt) {
        if (!jwt || typeof jwt !== "string") throw Error("Invalid JWT");

        if (this._socket && isWsOpen(this._socket)) return;

        clearTimeout(this._retryTimeout);

        // Create new WebSocket and handler.
        this._socket = new WebSocket(this._address);

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

    registerServerCallback(registeredResponseType, uuid, callback) {
        this._socketHandler.registerServerCallback(
            registeredResponseType,
            uuid,
            callback
        );
    }

    unregisterServerCallback(uniqueId, uuid) {
        this._socketHandler.removeServerCallback(uniqueId, uuid);
    }

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

    get connected() {
        return (
            !!this._socket &&
            !!this._socketHandler &&
            this._socket.readyState === WS_READYSTATE["OPEN"]
        );
    }
}

export class RobustAuthenticatedWSChannel extends RobustWSChannel {
    async refreshToken(authServerDomain, clientId, clientSecret) {
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
     * @param {Object} args Arguments object.
     */
    scheduleTokenRefresh({
        authServerDomain,
        tokenExpiration,
        tokenIssued,
        clientId,
        clientSecret
    }) {
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

        clearTimeout(this._tokenExpirationTimeout);
        const callback = async () => {
            try {
                const { tokenExpiration, tokenIssued } = await refreshToken(
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

    async authenticateAndConnect(authServerDomain, clientId, clientSecret) {
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

    async close() {
        clearTimeout(this._tokenExpirationTimeout);
        await super.close();
    }
}
