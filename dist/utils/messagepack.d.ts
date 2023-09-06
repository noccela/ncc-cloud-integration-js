import * as Types from "../types";
/**
 * Parse and decode Base64 encoded MsgPack message from cloud.
 *
 * @param {string} baseMsg Base64 encoded message.
 */
export declare function parseMsgPack(baseMsg: string): object;
export declare function parseBeaconLiveData(msg: string): Types.BeaconInitialStateResponse;
export declare function parseBeaconDiffData(msg: string): Types.BeaconDiffResponse;
export declare function parseTagLiveData(msg: string): Types.TagInitialStateResponse;
export declare function parseAlertLiveData(msg: string): Types.AlertInitialStateResponse;
