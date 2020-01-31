import { createAction, createActions, handleActions } from "redux-actions";

const defaultState = {
    connection: {
        // WS endpoint.
        address: null,
        
        // Socket connected?
        connected: false,
        connecting: null,
        connectionError: null,

        // Attempt to reconnect if connection breaks?
        retryFailedConnection: false,
        // Timeout ID for scheduled reconnection.
        retryTimeoutId: null,
        
        // Current wait for reconnecting broken connection.
        currentRetryWait: null,
        // Time to wait for next attempt to be scheduled.
        nextRetryWait: null,
    },
    authentication: {
        authenticated: false,
        lastTokenUsed: null,
        tokenIssued: null,
        tokenExpiration: null,
        refreshTokenAutomatically: false,
        tokenRefreshTimeoutId: null,
        tokenRefreshWait: null,
        authenticationServerAddress: null
    },
    events: [],
    requests: []
};

function createActionSet(name, payloadCreator, successCreator = undefined) {
    return createActions({
        [name]: payloadCreator,
        [`${name}_SUCCESS`]: successCreator,
        [`${name}_FAILURE`]: error => ({ error }),
    });
}

const {
    connect,
    connectSuccess,
    connectFailure
} = createActionSet("CONNECT", address => ({ address }));

export const connect;
export const connectSuccess;
export const connectFailure;

const {
    authenticate,
    authenticateSuccess,
    authenticateFail
} = createActionSet("AUTHENTICATE", token => ({ token }));

export const authenticate;
export const authenticateSuccess;
export const authenticateFail;
