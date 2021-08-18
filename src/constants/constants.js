import { consoleLogger } from "../utils/logging.js";

// Relevant WebSocket closure codes.
export const WS_CLOSURE_CODES = {
    NORMAL_CLOSURE: 1001,
    NO_STATUS: 1005,
};

export const WS_MSG_CONSTANTS = {
    PING_MSG: "",
    PONG_MSG: "1",
    CLOUD_RESPONSE_OK: "ok",
};

// Events the user can register to.
export const EVENT_TYPES = {
    LOCATION_UPDATE: "LOCATION_UPDATE",
    TAG_STATE: "TAG_STATE",
    TAG_DIFF: "TAG_DIFF",
    TWR_DATA: "TWR_DATA",
    CONTACT_TRACE_DATA: "CT_HISTORY",
    CONTACT_TRACE_UPDATE: "CT_UPDATE",
    P2P_DISTANCE_UPDATE: "P2P_DISTANCE_UPDATE",
    SITE_INFO: "SITE_INFO",
};

// Default settings that are extended or overridden by user provided ones.
/** @type GlobalOptions */
export const DEFAULT_OPTIONS = {
    loggers: [consoleLogger],
    reopenBrokenConnection: true,
    retryIntervalMin: 1000,
    retryIntervalMax: 60000,
    retryIntervalIncrease: 1000,
    logRawMessages: false,
    onMessage: null,
    onClose: null,
    onError: null,
    onConnect: null,
    processMessages: true,
    requestTimeout: 60000,
    automaticTokenRenewal: true,
    tokenRefreshFailureRetryTimeout: 60000,
    registrationAttemptsUntilIgnored: 50,
    waitForFailedReRegistration: 1000,
    getWsAddress: null
};

export const SOCKET_HANDLER_MISSING_ERROR =
    "Cannot send message, no authenticated connection available";

// Default length for (short) id.
export const UUID_LENGTH = 6;

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
