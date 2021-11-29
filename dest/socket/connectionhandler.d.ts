import { RequestHandler } from "./requesthandler.js";
import * as Types from "../types.js";
import { Dependencies } from "./models.js";
/**
 * Encloses a RequestHandler and provides additional 'robustness'
 * features on it, namely this class handles scheduling new connection
 * attempts when socket closes *unexpectedly*.
 *
 * @class RobustWSChannel
 */
declare class RobustWSChannel {
    _addressCallback: (lbDomain: string, account: number, site: number, token: string) => Promise<string>;
    _options: Types.UserOptions;
    _socket: WebSocket | null;
    _socketHandler: RequestHandler | null;
    _lastJwtUsed: string | null;
    _tokenExpirationTimeout: null | ReturnType<typeof setTimeout>;
    _retryTimeout: null | ReturnType<typeof setTimeout>;
    _nextRetryInterval: number | null;
    _logger: Types.ConsoleLogger | null;
    _dependencyContainer: Dependencies;
    _onConnectionRecreated: (() => void) | null;
    _webSocketStateOpen: number;
    _webSocketStateClosed: number;
    tokenExpiration: number;
    tokenIssued: number;
    domain: string;
    account: number;
    site: number;
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
    constructor(domain: string, accountId: number, siteId: number, options: Types.UserOptions, dependencyContainer: Dependencies);
    _reconnect(): void;
    /**
     * Send a message with payload directly.
     *
     * @param {string} action Action name.
     * @param {Object} payload Action's payload.
     * @returns Promise that resolves with the response payload.
     * @memberof RobustWSChannel
     */
    sendMessageRaw(action: string, payload: Object): Promise<Types.CloudResponse>;
    /**
     * Set a callback that will be called when socket connection was re-established
     * after unexpected closure. Can be used to for example handle re-establishing
     * the state before closure.
     *
     * @param {Function} onConnectionRecreated
     * @memberof RobustWSChannel
     */
    setOnReconnectCallback(onConnectionRecreated: () => void): void;
    /**
     * Close the underlying connection.
     *
     * @returns Promise that resolves when connection is closed.
     * @memberof RobustWSChannel
     */
    close(): Promise<void>;
    /**
     * Connect to WS endpoint and authenticate with the given JSON Web Token.
     *
     * @param {string} jwt Encoded JWT to authenticate with.
     * @returns Resolves if both connecting and authentication were successful,
     * rejects with error otherwise.
     * @memberof RobustWSChannel
     */
    connect(jwt: string): Promise<Types.AuthenticateResult | null>;
    /** @see {@link RequestHandler#registerServerCallback} */
    registerServerCallback(registeredResponseType: string, uuid: string, callback: (err: string, payload: object) => void): void;
    /** @see {@link RequestHandler#removeServerCallback} */
    unregisterServerCallback(action: string, uuid: string): void;
    /** @see {@link RequestHandler#sendRequest} */
    sendRequest(msg: Types.Request, timeout?: number | null, serverResponseType?: string | null): Promise<Types.CloudResponse | undefined>;
    /**
     * True if underlying connection is open and authenticated.
     *
     * @readonly
     * @memberof RobustWSChannel
     */
    get connected(): boolean;
}
/**
 * Handles automatic periodic refreshing of JWT token.
 *
 * @export
 * @class RobustAuthenticatedWSChannel
 * @inheritdoc
 * @extends {RobustWSChannel}
 */
export declare class RobustAuthenticatedWSChannel extends RobustWSChannel {
    _refreshToken(authServerDomain: string, getToken: (jwt: string) => Promise<string>): Promise<Types.AuthenticateResponse>;
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
    scheduleTokenRefresh(authServerDomain: string, tokenExpiration: number, tokenIssued: number, getToken: (domain: string) => Promise<string>): void;
    /**
     * Fetch token, create an authenticated connection to backend and schedule
     * automatic token refreshals.
     *
     * @param {string} authServerDomain Domain for authentication server.
     * @param {(domain: string) => Promise<string>} getToken Async callback that fetches the
     * access token.
     * @memberof RobustAuthenticatedWSChannel
     */
    createAuthenticatedConnection(authServerDomain: string, getToken: (domain: string) => Promise<string>): Promise<void>;
    /** @inheritdoc */
    close(): Promise<void>;
}
export {};
