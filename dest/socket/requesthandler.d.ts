import { Dependencies, TrackedRequest } from "./models.js";
import * as Types from "../types.js";
/**
 * This class handles sending and receiving messages to and from backend
 * through WebSocket provided to it. This is the lowest level handler for
 * WS, handling directly WS related events.
 *
 * Additional features is providing timeout-based request rejection.
 *
 * This class handles internally some Noccela API specific intricasies
 * to make the usage simpler.
 *
 * @export
 * @class RequestHandler
 */
export declare class RequestHandler {
    _requestHandlers: Record<string, TrackedRequest>;
    _serverMessageHandlers: Record<string, Types.ServerMessageHandler[]>;
    _timeoutCheckTimeout: ReturnType<typeof setTimeout> | null;
    _onCloseCallback: (() => void) | null;
    _reconnectCallback: () => void;
    _clientOnCloseCallback: any;
    _clientOnErrorCallback: any;
    _defaultTimeout: number;
    _timeoutCheckInterval: number;
    _options: Types.UserOptions;
    _logger: Types.ConsoleLogger | null;
    _dependencyContainer: Dependencies;
    _socket: WebSocket;
    data: any;
    /**
     * Creates an instance of RequestHandler.
     * @param {WebSocket} socket Open WebSocket.
     * @param {import("../constants/constants").GlobalOptions} options
     * @param {Function} reconnectCallback Callback to call when socket
     * should be reconnected.
     * @param {import("./models").Dependencies} dependencyContainer
     * @memberof RequestHandler
     */
    constructor(socket: WebSocket, options: Types.UserOptions, reconnectCallback: () => void, dependencyContainer: Dependencies);
    _bindSocketCallbacks(): void;
    _onError(): void;
    _onClose(e: CloseEvent): void;
    _onMessage(ev: MessageEvent): void;
    _checkTimeouts(reschedule?: boolean): void;
    _rejectAllWaitingHandlers(error: string): void;
    /**
     * Send a single-shot request to server, returns promise that resolves
     * on valid response and rejects on timeout or error.
     *
     * @param {string} uuid Generated UUID for the request which will
     * be used to match response.
     * @param {Object} msg Core message object with type and payload.
     * @param {number} timeout Custom timeout in ms, will override default.
     * @param {string} serverResponseType If present, overrides UUID and uniqueId
     * that is expected for the server response. For special cases.
     */
    sendRequest(msg: Types.Request, timeout?: number | null, serverResponseType?: string | null): Promise<Types.CloudResponse>;
    /**
     * Register a callback for a server message that is not a response to a request but
     * can be received multiple times in response of some event on the server, like tag
     * activity.
     *
     * @param {string} action Id, i.e. response type for the expected server
     * message.
     * @param {string} uuid UUID for the event registered for this response,
     * used to later remove the listener.
     * @param {import("./filters").FilteredCallback} callback Callback to be
     * invoked when a relevant message is received.
     */
    registerServerCallback(action: string, uuid: string, callback: (payload: object) => void): void;
    /**
     * Remove a registered server message callback.
     *
     * @param {string} action UniqueId, or in this case the message type.
     * @param {string} uuid UUID for the specific registered event to remove.
     */
    removeServerCallback(action: string, uuid: string): void;
    /**
     * Add a function to call when socket closes. Used to convert WS closure
     * into a promise, not for other purposes.
     *
     * @param {Function} callback Callback.
     */
    setClosureCallback(callback: () => void): void;
}
