import { consoleLogger } from "../utils/logging";

// Relevant WebSocket closure codes.
export const WS_CLOSURE_CODES = {
    NORMAL_CLOSURE: 1001,
    NO_STATUS: 1005
};

export const WS_MSG_CONSTANTS = {
    PING_MSG: "",
    PONG_MSG: "1",
    CLOUD_RESPONSE_OK: "ok"
};

// Events the user can register to.
export const EVENT_TYPES = {
    LOCATION_UPDATE: "LOCATION_UPDATE",
    TAG_STATE: "TAG_STATE",
    TAG_DIFF: "TAG_DIFF"
};

// Default settings that are extended or overridden by user provided ones.
/** @type GlobalOptions */
export const DEFAULT_OPTIONS = {
    loggers: [consoleLogger],
    reopenBrokenConnection: true,
    retryIntervalMin: 1000,
    retryIntervalMax: 60000,
    retryIntervalIncrease: 1000,
    logRawMessages: true,
    onMessage: null,
    onClose: null,
    onError: null,
    processMessages: true,
    requestTimeout: 60000,
    automaticTokenRenewal: true,
    tokenRefreshFailureRetryTimeout: 60000,
    useWebWorkers: true
};

export const SOCKET_HANDLER_MISSING_ERROR =
    "Cannot send message, no authenticated connection available";

// Type definitions.

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
 * @prop {Boolean} [processMessages] - If false, don't handle socket messages in the
 * library, but rather pass them only to user provided callbacks
 * @prop {number} [requestTimeout] - Timeout in ms for request to timeout and reject
 * @prop {Boolean} [automaticTokenRenewal] - If true schedule and handle new token
 * fetching and re-authentication automatically
 * @prop {number} [tokenRefreshFailureRetryTimeout] - Timeout to try again in case
 * fetching new token fails
 * @prop {Boolean} [useWebWorkers] - Handle socket and filtering in web worker if
 * they are available
 */