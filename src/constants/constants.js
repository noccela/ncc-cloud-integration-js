import { consoleLogger } from "../utils/logging";

// WebSocket readystates.
export const WS_READYSTATE = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
};

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
    tokenRefreshFailureRetryTimeout: 60000
};
