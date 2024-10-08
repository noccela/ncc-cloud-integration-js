import { SOCKET_HANDLER_MISSING_ERROR } from "../constants/constants.js";
import { ArgumentException } from "../utils/exceptions.js";
import { getUniqueId } from "../utils/utils.js";
import { RequestHandler } from "./requesthandler.js";
import { authenticate, connectWebsocket, scheduleReconnection, } from "./socketutils.js";
import { getAddress } from "../http/site.js";
import { getWebSocket } from "../utils/ponyfills.js";
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
     *
     * @param {string} domain
     * @param {number} accountId
     * @param {number} siteId
     * @param {import("../constants/constants.js").GlobalOptions} options
     * @param {import("./models").Dependencies} dependencyContainer
     * @memberof RobustWSChannel
     */
    constructor(domain, accountId, siteId, options, dependencyContainer) {
        this._tokenExpirationTimeout = null;
        this._retryTimeout = null;
        this._onConnectionRecreated = null;
        this._webSocketStateOpen = 0;
        this._webSocketStateClosed = 0;
        this.tokenExpiration = 0;
        this.tokenIssued = 0;
        if (!domain ||
            typeof domain !== "string" ||
            !domain.startsWith("http")) {
            throw Error("Invalid domain");
        }
        this._addressCallback = (options.getWsAddress || getAddress);
        this._options = options;
        this.domain = domain;
        this.account = accountId;
        this.site = siteId;
        // Internal socket state.
        this._socket = null;
        this._socketHandler = null;
        this._lastJwtUsed = null;
        this._tokenExpirationTimeout = null;
        this._retryTimeout = null;
        this._nextRetryInterval = null;
        this._clockDiff = 0;
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
                // @ts-ignore
                await this.connect(this._lastJwtUsed);
                // Call callback to do other actions after connection has been
                // recreated.
                // @ts-ignore
                if (this._onConnectionRecreated) {
                    // @ts-ignore
                    await this._onConnectionRecreated();
                }
            }
            catch (e) {
                // @ts-ignore
                this._logger.exception("Exception while attempting to reconnect", e);
                // Delay and schedule new attempt after attempt failed.
                // @ts-ignore
                this._reconnect();
                return;
            }
            // @ts-ignore
            this._logger.log("Connection re-established");
        }
        [this._retryTimeout, this._nextRetryInterval] = scheduleReconnection(this._retryTimeout, this._nextRetryInterval, this._options, connectionAttempt.bind(this), this._logger);
    }
    /**
     * Send a message with payload directly.
     *
     * @param {string} action Action name.
     * @param {Object} payload Action's payload.
     * @returns Promise that resolves with the response payload.
     * @memberof RobustWSChannel
     */
    async sendMessageRaw(action, payload) {
        if (this._socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }
        const request = {
            uniqueId: getUniqueId(),
            payload: payload,
            action: action,
        };
        return await this._socketHandler.sendRequest(request);
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
        if (onConnectionRecreated &&
            typeof onConnectionRecreated !== "function") {
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
        if (!this.connected)
            return;
        await new Promise((res, rej) => {
            var _a, _b;
            // Resolve when request handler calls back when socket is closed.
            (_a = this._socketHandler) === null || _a === void 0 ? void 0 : _a.setClosureCallback(() => {
                res();
                this._socketHandler = null;
                this._lastJwtUsed = null;
            });
            if (this._retryTimeout != null)
                clearTimeout(this._retryTimeout);
            try {
                (_b = this._socket) === null || _b === void 0 ? void 0 : _b.close();
            }
            catch (e) {
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
        var _a, _b, _c;
        if (!jwt || typeof jwt !== "string")
            throw Error("Invalid JWT");
        if (this._socket && this.connected)
            return null;
        if (this._retryTimeout != null)
            clearTimeout(this._retryTimeout);
        // Create new WebSocket and handler.
        const wsConstructor = await getWebSocket();
        this._webSocketStateOpen = wsConstructor.OPEN;
        this._webSocketStateClosed = wsConstructor.CLOSED;
        const address = await this._addressCallback(this.domain, this.account, this.site, jwt);
        if (!address.startsWith("ws")) {
            throw Error(`Invalid protocol for WS address, expected ws or wss, got ${address}`);
        }
        this._socket = new wsConstructor(address);
        (_a = this._logger) === null || _a === void 0 ? void 0 : _a.log(`Connecting to ${address}`);
        // Connect to cloud.
        await connectWebsocket(this._socket);
        (_b = this._logger) === null || _b === void 0 ? void 0 : _b.log("Connected, sending token");
        // Send JWT to cloud for authentication.
        const authResult = await authenticate(this._socket, jwt);
        (_c = this._logger) === null || _c === void 0 ? void 0 : _c.log(`Authentication successful, token expiration ${authResult.tokenExpiration}`);
        // All is OK, create WebSocket handler.
        this._socketHandler = new RequestHandler(this._socket, this._options, this._reconnect, this._dependencyContainer);
        this._lastJwtUsed = jwt;
        this._nextRetryInterval = this._options.retryIntervalMin;
        // Call user-provided connection callback if such exists.
        if (typeof this._options.onConnect === "function") {
            setTimeout(this._options.onConnect, 0);
        }
        return authResult;
    }
    /** @see {@link RequestHandler#registerServerCallback} */
    registerServerCallback(registeredResponseType, uuid, callback) {
        var _a;
        (_a = this._socketHandler) === null || _a === void 0 ? void 0 : _a.registerServerCallback(registeredResponseType, uuid, callback);
    }
    /** @see {@link RequestHandler#removeServerCallback} */
    unregisterServerCallback(action, uuid) {
        var _a;
        (_a = this._socketHandler) === null || _a === void 0 ? void 0 : _a.removeServerCallback(action, uuid);
    }
    /** @see {@link RequestHandler#sendRequest} */
    async sendRequest(msg, timeout = null, serverResponseType = null) {
        var _a;
        return await ((_a = this._socketHandler) === null || _a === void 0 ? void 0 : _a.sendRequest(msg, timeout, serverResponseType));
    }
    /**
     * True if underlying connection is open and authenticated.
     *
     * @readonly
     * @memberof RobustWSChannel
     */
    get connected() {
        return (!!this._socket &&
            !!this._socketHandler &&
            this._socket.readyState === this._webSocketStateOpen);
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
    // Fetch a new token and re-authenticate with the connection.
    async _refreshToken(authServerDomain, getToken) {
        var _a, _b, _c, _d, _e;
        // Fetch new token from auth. server.
        (_a = this._logger) === null || _a === void 0 ? void 0 : _a.log("Refreshing access token...");
        // Connection is down currently, throw and try again later.
        if (this._socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }
        const newToken = await getToken(authServerDomain);
        if (this._lastJwtUsed == newToken) {
            (_b = this._logger) === null || _b === void 0 ? void 0 : _b.error("Received same token from the getToken function than the previous one.");
        }
        else {
            (_c = this._logger) === null || _c === void 0 ? void 0 : _c.debug("Received fresh token from the getToken function.", null);
        }
        (_d = this._logger) === null || _d === void 0 ? void 0 : _d.debug("Got new token, sending to cloud", null);
        // Send the new token as a request.
        let req = {
            uniqueId: getUniqueId(),
            action: "refreshToken",
            payload: {
                token: newToken,
            },
        };
        const response = await this._socketHandler.sendRequest(req);
        const authResponse = response.payload;
        (_e = this._logger) === null || _e === void 0 ? void 0 : _e.log(`Token refreshed successfully, new expiration ${authResponse.tokenExpiration}`);
        // Persist the token in internal state so the connection can be recreated.
        this._lastJwtUsed = newToken;
        return authResponse;
    }
    /**
     * Schedule a token refreshal callback.
     * Handles cases in which this callback fails.
     * Re-schedules the callback after successful call.
     *
     * @param {{authServerDomain: string
     * , tokenExpiration: number
     * , tokenIssued: number
     * , getToken: (domain: string) => Promise<string>
     * }} args
     */
    scheduleTokenRefresh(authServerDomain, tokenExpiration, tokenIssued, getToken) {
        var _a;
        // Calculate the wait until token should be refreshed, half of the time
        // remaining.
        const tokenSpan = tokenExpiration - tokenIssued;
        if (typeof tokenSpan !== "number" || tokenSpan <= 0) {
            throw Error("Received invalid token information");
        }
        const currentTimestamp = Date.now();
        const refreshTimestampInCloudTime = (tokenIssued + tokenSpan / 2) * 1000;
        const refreshTimestampInLocalTime = refreshTimestampInCloudTime + this._clockDiff;
        // Get ms until token should be refreshed, with given minimum wait.
        let milliSecondsUntilRefresh = refreshTimestampInLocalTime - currentTimestamp;
        if (milliSecondsUntilRefresh < 0) {
            const expirationInLocalTime = tokenExpiration * 1000 + this._clockDiff;
            if (expirationInLocalTime > currentTimestamp)
                milliSecondsUntilRefresh = expirationInLocalTime - currentTimestamp - 60 * 1000;
            if (milliSecondsUntilRefresh < 0)
                milliSecondsUntilRefresh = 1000;
        }
        if (this._tokenExpirationTimeout != null)
            clearTimeout(this._tokenExpirationTimeout);
        const callback = async () => {
            var _a;
            try {
                const response = await this._refreshToken(authServerDomain, getToken);
                // Schedule next refreshal with new values.
                this.scheduleTokenRefresh(authServerDomain, +response.tokenExpiration, +response.tokenIssued, getToken);
            }
            catch (e) {
                // The authentication might fail for any number of reasons,
                // has to be handled and tried again later.
                (_a = this._logger) === null || _a === void 0 ? void 0 : _a.exception("Error while fetching new token, trying again later", e.toString());
                setTimeout(callback, this._options.tokenRefreshFailureRetryTimeout);
            }
        };
        (_a = this._logger) === null || _a === void 0 ? void 0 : _a.debug(`Refreshing the token at ${new Date(tokenIssued * 1000 + milliSecondsUntilRefresh).toUTCString()}, clock diff: ${this._clockDiff}`, null);
        this._tokenExpirationTimeout = setTimeout(callback, milliSecondsUntilRefresh);
    }
    /**
     * Fetch token, create an authenticated connection to backend and schedule
     * automatic token refreshals.
     *
     * @param {string} authServerDomain Domain for authentication server.
     * @param {(domain: string) => Promise<string>} getToken Async callback that fetches the
     * access token.
     * @memberof RobustAuthenticatedWSChannel
     */
    async createAuthenticatedConnection(authServerDomain, getToken) {
        if (!authServerDomain || !authServerDomain.startsWith("http")) {
            throw Error("Invalid auth. server domain");
        }
        if (!getToken || typeof getToken !== "function") {
            throw Error("Invalid getToken callback");
        }
        const currentTimestamp = Date.now();
        const token = await getToken(authServerDomain);
        if (!token || typeof token !== "string" || !token.length) {
            throw Error("Got invalid token from getToken callback");
        }
        const authResult = await this.connect(token);
        if (authResult != null && this._options.automaticTokenRenewal) {
            const tokenIssuedTimestamp = authResult.tokenIssued * 1000;
            this._clockDiff = currentTimestamp - tokenIssuedTimestamp;
            this.scheduleTokenRefresh(authServerDomain, authResult.tokenExpiration, authResult.tokenIssued, getToken);
        }
    }
    /** @inheritdoc */
    async close() {
        if (this._tokenExpirationTimeout != null)
            clearTimeout(this._tokenExpirationTimeout);
        await super.close();
    }
}
//# sourceMappingURL=connectionhandler.js.map