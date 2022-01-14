import { UserOptions } from "../types.js";
export declare const WS_CLOSURE_CODES: {
    NORMAL_CLOSURE: number;
    NO_STATUS: number;
};
export declare const WS_MSG_CONSTANTS: {
    PING_MSG: string;
    PONG_MSG: string;
    CLOUD_RESPONSE_OK: string;
};
export declare const EVENT_TYPES: {
    LOCATION_UPDATE: string;
    TAG_STATE: string;
    TAG_DIFF: string;
    TWR_DATA: string;
    CONTACT_TRACE_DATA: string;
    CONTACT_TRACE_UPDATE: string;
    P2P_DISTANCE_UPDATE: string;
    SITE_INFO: string;
    ALERT_STATE: string;
    ALERT_DIFF: string;
};
/** @type GlobalOptions */
export declare const DEFAULT_OPTIONS: UserOptions;
export declare const SOCKET_HANDLER_MISSING_ERROR = "Cannot send message, no authenticated connection available";
export declare const UUID_LENGTH = 6;
/**
 * @typedef {Object} Logger
 * @prop {Function} [log] Log informational message
 * @prop {Function} [warn] Log warning message
 * @prop {Function} [error] Log error message
 * @prop {Function} [debug] Log debug message
 * @prop {Function} [exception] Log exception
 */
/**
 * @typedef {Object} GlobalOptions
 * @prop {Logger[]} [loggers] - Array of loggers
 * @prop {Boolean} [reopenBrokenConnection] - Open broken socket automatically
 * @prop {number} [retryIntervalMin] - Starting interval when reopening the socket
 * @prop {number} [retryIntervalMax] - Maximum interval when reopening socket
 * @prop {number} [retryIntervalIncrease] - Increase in timeout at every time
 * socket reopen fails.
 * @prop {Boolean} [logRawMessages] - If true log all received messages to debug log
 * @prop {Function} [onMessage] - Custom callback when a message is received from cloud
 * @prop {Function} [onClose] - Custom callback when socket is closed
 * @prop {Function} [onError] - Custom callback when socket emits error
 * @prop {Function} [onConnect] - Custom callback when socket is connected
 * @prop {Boolean} [processMessages] - If false, don't handle socket messages in the
 * library, but rather pass them only to user provided callbacks
 * @prop {number} [requestTimeout] - Timeout in ms for request to timeout and reject
 * @prop {Boolean} [automaticTokenRenewal] - If true schedule and handle new token
 * fetching and re-authentication automatically
 * @prop {number} [tokenRefreshFailureRetryTimeout] - Timeout to try again in case
 * fetching new token fails
 * @prop {Number} [registrationAttemptsUntilIgnored] - How many times event will
 * be attempted to be re-registered until it is ditched completely.
 * @prop {Number} [waitForFailedReRegistration] - Time to wait in case a re-
 * registration of event fails between attempts.
 * @prop {Function} [getWsAddress] - Custom callback for fetching the correct
 * endpoint address to connect to.
 */
