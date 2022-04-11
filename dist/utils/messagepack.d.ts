import * as Types from "../types";
/**
 * Parse and decode Base64 encoded MsgPack message from cloud.
 *
 * @param {string} baseMsg Base64 encoded message.
 */
export declare function parseMsgPack(baseMsg: string): object;
export declare function parseTagLiveData(msg: string): Types.TagInitialStateResponse;
export declare function parseAlertLiveData(msg: string): Types.AlertInitialStateResponse;
