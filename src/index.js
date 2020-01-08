// Expose all relevant public properties.
import { EVENT_TYPES } from "./constants/constants";
import { createWSChannel } from "./websocket/handler";
import { getToken } from "./rest/authentication";

export const realTime = {
    createWSChannel,
    EVENT_TYPES
};

export const authentication = {
    getToken
};

export const rest = {};
