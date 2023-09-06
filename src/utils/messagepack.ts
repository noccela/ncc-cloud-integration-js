import msgpack from "@ygoe/msgpack";
import { getAtob } from "./ponyfills.js";
import * as Types from "../types";

const atob = getAtob();

/**
 * Parse and decode Base64 encoded MsgPack message from cloud.
 *
 * @param {string} baseMsg Base64 encoded message.
 */
export function parseMsgPack(baseMsg: string): object {
    const bytes: string = atob(baseMsg);
    const arrayBuffer: ArrayBuffer = new ArrayBuffer(bytes.length);
    const intArray: Uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < bytes.length; i++) {
        intArray[i] = bytes.charCodeAt(i);
    }

    const payload = msgpack.deserialize(intArray);
    return payload;
}

export function parseBeaconLiveData(msg: string): Types.BeaconInitialStateResponse{
    const payload:object = parseMsgPack(msg);
    const result: Types.BeaconInitialStateResponse = {};
    const deviceIds: string[] = Object.keys(payload);
    if (!deviceIds || !deviceIds.length) return result;

    for (const [deviceId, beaconData] of Object.entries(payload)) {
        const did: number = +deviceId;
        const beaconObj: Types.InitialBeaconState = {
            online: beaconData[0],
            charging : beaconData[1],
            voltage : beaconData[2],
        };
        result[did] = beaconObj;
    }
    return result;
}
export function parseBeaconDiffData(msg: string): Types.BeaconDiffResponse{
    const payload:object = parseMsgPack(msg);
    const result: Types.BeaconDiffResponse = {};
    const deviceIds: string[] = Object.keys(payload);
    if (!deviceIds || !deviceIds.length) return result;

    for (const [deviceId, beaconData] of Object.entries(payload)) {
        const did: number = +deviceId;
        const beaconObj: Types.BeaconDiff = {};
        if (beaconData[0] != null) beaconObj.online = beaconData[0];
        if (beaconData[1] != null) beaconObj.charging = beaconData[1];
        if (beaconData[2] != null) beaconObj.voltage = beaconData[2];
        result[did] = beaconObj;
    }
    return result;
}
export function parseTagLiveData(msg: string): Types.TagInitialStateResponse {
    const payload:object = parseMsgPack(msg);

    const result: Types.TagInitialStateResponse = {};
    const tagMacs: string[] = Object.keys(payload);
    if (!tagMacs || !tagMacs.length) return result;

    // Create tag status objects from decoded MessagePack payload.
    // MessagePack loses all information about property names, so the array
    // indices are hard-coded.
    for (const [deviceId, tagData] of Object.entries(payload)) {
        const did: number = +deviceId;
        const tagObj: Types.InitialTagState = {
            name: tagData[1],
            batteryVoltage : tagData[2],
            batteryStatus : tagData[3],
            status : tagData[4],
            areas : tagData[5],
            wire : tagData[6],
            reed : tagData[7],
            isOnline : tagData[8],
            timestamp : tagData[9],
            x : tagData[10],
            y : tagData[11],
            z : tagData[19],
            accelerometer : tagData[12],
            floorId : tagData[13],
            signalLost : tagData[14],
            powerSave : tagData[15],
            deviceModel : tagData[16],
            fwVersion : tagData[17],
            strokeCount: tagData[18],
            uncertaintyDistance: tagData[20]
        };
        
        // Append to result.
        result[did] = tagObj;
    }

    return result;
}

export function parseAlertLiveData(msg: string): Types.AlertInitialStateResponse {
    const payload:object = parseMsgPack(msg);

    const result: Types.AlertInitialStateResponse = {};
    const alertIds: string[] = Object.keys(payload);
    if (!alertIds || !alertIds.length) return result;

    // Create tag status objects from decoded MessagePack payload.
    // MessagePack loses all information about property names, so the array
    // indices are hard-coded.
    for (const [alertId, alertData] of Object.entries(payload)) {
        const aid: number = +alertId;
        const alertObj: Types.InitialAlertState = {
            alarmId: alertData[0],
		    deviceId: alertData[1],
            alarmType: alertData[2],
		    x: alertData[3],
            y: alertData[4],
            z: alertData[5],
            timestamp: alertData[6],
            reacted: alertData[7],
		    floorId: alertData[8],
            areaNames: alertData[12],
            customTitle: alertData[17]
        };
        
        // Append to result.
        result[aid] = alertObj;
    }

    return result;
}
