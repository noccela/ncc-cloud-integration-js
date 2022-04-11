import { AuthenticateResult, ConsoleLogger, UserOptions } from "../types.js";
/**
 * Wraps WebSocket connect as a Promise.
 * @param {WebSocket} socket WebSocket object.
 */
export declare function connectWebsocket(socket: WebSocket): Promise<void>;
/**
 * Authenticate and validate connection to Noccela cloud.
 * @param {WebSocket} socket WebSocket object.
 * @param {string} token JWT token.
 */
export declare function authenticate(socket: WebSocket, token: string): Promise<AuthenticateResult>;
/**
 * If connection was broken, calculate and schedule timeout for new attempt.
 *
 * @param {number} retryTimeoutId If retry timeout is scheduled, id for timeout.
 * @param {number} nextRetryInterval Milliseconds for the the next retry to be scheduled.
 * @param {Object} options Options object.
 * @param {Function} connectCallback Function to call to retry connection.
 * @param {Object} logger Logger object.
 */
export declare function scheduleReconnection(retryTimeoutId: ReturnType<typeof setTimeout> | null, nextRetryInterval: number | null, options: UserOptions, connectCallback: () => void, logger: ConsoleLogger | null): [ReturnType<typeof setTimeout>, number];
