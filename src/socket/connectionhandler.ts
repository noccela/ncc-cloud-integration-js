import { SOCKET_HANDLER_MISSING_ERROR } from "../constants/constants.js";
import { ArgumentException } from "../utils/exceptions.js";
import { getUniqueId } from "../utils/utils.js";
import { RequestHandler } from "./requesthandler.js";
import {
    authenticate,
    connectWebsocket,
    scheduleReconnection,
} from "./socketutils.js";
import { getAddress } from "../http/site.js"
import { getWebSocket } from "../utils/ponyfills.js";
import * as Types from "../types.js";
import { Dependencies } from "./models.js";

/**
 * Encloses a RequestHandler and provides additional 'robustness'
 * features on it, namely this class handles scheduling new connection
 * attempts when socket closes *unexpectedly*.
 *
 * @class RobustWSChannel
 */
class RobustWSChannel {
	public _addressCallback: (lbDomain: string, account: number, site: number, token: string) => Promise<string>;
	public _options: Types.UserOptions;
	public _socket: WebSocket | null;
	public _socketHandler: RequestHandler | null;
	public _lastJwtUsed: string | null;
	public _tokenExpirationTimeout: null | ReturnType<typeof setTimeout> = null;
	public _retryTimeout: null | ReturnType<typeof setTimeout> = null;
	public _nextRetryInterval: number | null;
	public _logger: Types.ConsoleLogger | null;
	public _dependencyContainer: Dependencies;
	public _onConnectionRecreated: (() => void) | null = null;
	public _webSocketStateOpen: number = 0;
	public _webSocketStateClosed: number = 0;
	public tokenExpiration: number = 0;
	public tokenIssued: number = 0;
    public domain: string;
    public account: number;
    public site: number;

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
    constructor(domain: string, accountId: number, siteId: number, options: Types.UserOptions, dependencyContainer: Dependencies) {
        if (
            !domain ||
            typeof domain !== "string" ||
            !domain.startsWith("http")
        ) {
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

        // Unpack dependencies.
        this._logger = null;
        ({ logger: this._logger } = dependencyContainer);
        this._dependencyContainer = dependencyContainer;

        this._reconnect = this._reconnect.bind(this);
    }

    // Called by socket handler if connection closes unexpectedly.
    // Attempts to connect again later with increasing intervals.
    _reconnect(): void {
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
            } catch (e) {
                // @ts-ignore
                this._logger.exception(
                    "Exception while attempting to reconnect",
                    e
                );

                // Delay and schedule new attempt after attempt failed.
                // @ts-ignore
                this._reconnect();
                return;
            }

            // @ts-ignore
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
     * @param {Object} payload Action's payload.
     * @returns Promise that resolves with the response payload.
     * @memberof RobustWSChannel
     */
    async sendMessageRaw(action: string, payload: Object): Promise<Types.CloudResponse> {
        if (this._socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }

        const request : Types.Request = {
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
    setOnReconnectCallback(onConnectionRecreated: () => void): void {
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
    async close(): Promise<void> {
        if (!this.connected) return;

        await new Promise<void>((res, rej) => {
            // Resolve when request handler calls back when socket is closed.
            this._socketHandler?.setClosureCallback(() => {
                res();
                this._socketHandler = null;
                this._lastJwtUsed = null;
            });

            if (this._retryTimeout != null) clearTimeout(this._retryTimeout);

            try {
                this._socket?.close();
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
    async connect(jwt: string): Promise<Types.AuthenticateResult | null> {
        if (!jwt || typeof jwt !== "string") throw Error("Invalid JWT");

        if (this._socket && this.connected) return null;

        if (this._retryTimeout != null) clearTimeout(this._retryTimeout);

        // Create new WebSocket and handler.
        const wsConstructor: typeof WebSocket = await getWebSocket();

        this._webSocketStateOpen = wsConstructor.OPEN;
        this._webSocketStateClosed = wsConstructor.CLOSED;

        const address: string = await this._addressCallback(this.domain, this.account, this.site, jwt);
        if (!address.startsWith("ws")) {
            throw Error(
                `Invalid protocol for WS address, expected ws or wss, got ${address}`
            );
        }
        this._socket = new wsConstructor(address);

        this._logger?.log(`Connecting to ${address}`);
        // Connect to cloud.
        await connectWebsocket(this._socket);
        this._logger?.log("Connected, sending token");

        // Send JWT to cloud for authentication.
        const authResult: Types.AuthenticateResult = await authenticate(
            this._socket,
            jwt
        );

        this._logger?.log(
            `Authentication successful, token expiration ${authResult.tokenExpiration}`
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

        // Call user-provided connection callback if such exists.
        if (typeof this._options.onConnect === "function") {
            setTimeout(this._options.onConnect, 0);
        }

        return authResult;
    }

    /** @see {@link RequestHandler#registerServerCallback} */
    registerServerCallback(registeredResponseType: string, uuid: string, callback: (err: string, payload: object) => void): void {
        this._socketHandler?.registerServerCallback(
            registeredResponseType,
            uuid,
            callback
        );
    }

    /** @see {@link RequestHandler#removeServerCallback} */
    unregisterServerCallback(action: string, uuid: string) {
        this._socketHandler?.removeServerCallback(action, uuid);
    }

    /** @see {@link RequestHandler#sendRequest} */
    async sendRequest(msg : Types.Request, timeout:number | null = null, serverResponseType: string | null = null): Promise<Types.CloudResponse | undefined> {
        
        return await this._socketHandler?.sendRequest(
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
    get connected():boolean {
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
	
    // Fetch a new token and re-authenticate with the connection.
    async _refreshToken(authServerDomain: string, getToken: (jwt: string) => Promise<string>): Promise<Types.AuthenticateResponse> {
        // Fetch new token from auth. server.
        this._logger?.log("Refreshing access token...");

        // Connection is down currently, throw and try again later.
        if (this._socketHandler === null) {
            throw Error(SOCKET_HANDLER_MISSING_ERROR);
        }

        const newToken: string = await getToken(authServerDomain);

        this._logger?.debug("Got new token, sending to cloud", null);

        // Send the new token as a request.
        let req: Types.Request = {
            uniqueId: getUniqueId(),
            action: "refreshToken",
            payload: {
                token: newToken,
            },
        };
        const response: Types.CloudResponse = await this._socketHandler.sendRequest(req);
        const authResponse = response.payload as Types.AuthenticateResponse;

        this._logger?.log(
            `Token refreshed successfully, new expiration ${authResponse.tokenExpiration}`
        );

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
    scheduleTokenRefresh(authServerDomain: string, tokenExpiration: number,tokenIssued: number, getToken: (domain: string) => Promise<string>): void {
        

        // Calculate the wait until token should be refreshed, half of the time
        // remaining.
        const tokenSpan: number = tokenExpiration - tokenIssued;
        if (typeof tokenSpan !== "number" || tokenSpan <= 0) {
            throw Error("Received invalid token information");
        }

        // Calculate timestamp after which token should be refreshed.
        const tokenRefreshTimestamp: number = Math.trunc(tokenIssued + tokenSpan / 2);
        const currentTimestamp: number = Math.trunc(Date.now() / 1000);

        // Get ms until token should be refreshed, with given minimum wait.
        const timeUntilRefresh: number = Math.max((tokenRefreshTimestamp - currentTimestamp) * 1000, 1000) | 0;

        if (this._tokenExpirationTimeout != null) clearTimeout(this._tokenExpirationTimeout);
        const callback = async () => {
            try {
                const response: Types.AuthenticateResponse = await this._refreshToken(authServerDomain, getToken);

                // Schedule next refreshal with new values.
                this.scheduleTokenRefresh(authServerDomain, +response.tokenExpiration, +response.tokenIssued, getToken);
            } catch (e: any) {
                // The authentication might fail for any number of reasons,
                // has to be handled and tried again later.
                this._logger?.exception(
                    "Error while fetching new token, trying again later",
                    e.toString()
                );
                setTimeout(
                    callback,
                    this._options.tokenRefreshFailureRetryTimeout
                );
            }
        };

        this._logger?.debug(
            `Refreshing the token at ${new Date(tokenRefreshTimestamp * 1000)}`, null
        );
        this._tokenExpirationTimeout = setTimeout(callback, timeUntilRefresh);
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
    async createAuthenticatedConnection(authServerDomain: string, getToken: (domain: string) => Promise<string>): Promise<void> {
        if (!authServerDomain || !authServerDomain.startsWith("http")) {
            throw Error("Invalid auth. server domain");
        }

        if (!getToken || typeof getToken !== "function") {
            throw Error("Invalid getToken callback");
        }

        const token: string = await getToken(authServerDomain);
        if (!token || typeof token !== "string" || !token.length) {
            throw Error("Got invalid token from getToken callback");
        }

        const authResult: Types.AuthenticateResult | null = await this.connect(token);

        if (authResult != null && this._options.automaticTokenRenewal) {
            this.scheduleTokenRefresh(authServerDomain,authResult.tokenExpiration,authResult.tokenIssued, getToken);
        }
    }

    /** @inheritdoc */
    async close() {
        if (this._tokenExpirationTimeout != null) clearTimeout(this._tokenExpirationTimeout);
        await super.close();
    }
}
