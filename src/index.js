// Expose all relevant public properties.
import { EVENT_TYPES } from "./constants/constants";
import { EventChannel } from "./socket/eventhandler";
import { getToken } from "./rest/authentication";

export const realTime = {
    EventChannel,
    EVENT_TYPES
};

export const authentication = {
    getToken
};

export const rest = {};
