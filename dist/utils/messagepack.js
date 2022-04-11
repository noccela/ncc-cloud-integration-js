import msgpack from "@ygoe/msgpack";
import { getAtob } from "./ponyfills.js";
const atob = getAtob();
/**
 * Parse and decode Base64 encoded MsgPack message from cloud.
 *
 * @param {string} baseMsg Base64 encoded message.
 */
export function parseMsgPack(baseMsg) {
    const bytes = atob(baseMsg);
    const arrayBuffer = new ArrayBuffer(bytes.length);
    const intArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.length; i++) {
        intArray[i] = bytes.charCodeAt(i);
    }
    const payload = msgpack.deserialize(intArray);
    return payload;
}
export function parseTagLiveData(msg) {
    const payload = parseMsgPack(msg);
    const result = {};
    const tagMacs = Object.keys(payload);
    if (!tagMacs || !tagMacs.length)
        return result;
    // Create tag status objects from decoded MessagePack payload.
    // MessagePack loses all information about property names, so the array
    // indices are hard-coded.
    for (const [deviceId, tagData] of Object.entries(payload)) {
        const did = +deviceId;
        const tagObj = {
            name: tagData[1],
            batteryVoltage: tagData[2],
            batteryStatus: tagData[3],
            status: tagData[4],
            areas: tagData[5],
            wire: tagData[6],
            reed: tagData[7],
            isOnline: tagData[8],
            timestamp: tagData[9],
            x: tagData[10],
            y: tagData[11],
            z: tagData[19],
            accelerometer: tagData[12],
            floorId: tagData[13],
            signalLost: tagData[14],
            powerSave: tagData[15],
            deviceModel: tagData[16],
            fwVersion: tagData[17],
            strokeCount: tagData[18],
        };
        // Append to result.
        result[did] = tagObj;
    }
    return result;
}
export function parseAlertLiveData(msg) {
    const payload = parseMsgPack(msg);
    const result = {};
    const alertIds = Object.keys(payload);
    if (!alertIds || !alertIds.length)
        return result;
    // Create tag status objects from decoded MessagePack payload.
    // MessagePack loses all information about property names, so the array
    // indices are hard-coded.
    for (const [alertId, alertData] of Object.entries(payload)) {
        const aid = +alertId;
        const alertObj = {
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
//# sourceMappingURL=messagepack.js.map