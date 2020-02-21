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
    if (!tagMacs || !tagMacs.length) return {};

    // Create tag status objects from decoded MessagePack payload.
    // MessagePack loses all information about property names, so the array
    // indices are hard-coded.
    for (const [deviceId, tagData] of Object.entries(payload)) {
        const tagObj = {
            deviceId: +deviceId
        };
        tagObj["name"] = tagData[1];
        tagObj["batteryVoltage"] = tagData[2];
        tagObj["batteryStatus"] = tagData[3];
        tagObj["status"] = tagData[4];
        tagObj["areas"] = tagData[5];
        tagObj["wire"] = tagData[6];
        tagObj["reed"] = tagData[7];
        tagObj["isOnline"] = tagData[8];
        tagObj["timestamp"] = tagData[9];
        tagObj["x"] = tagData[10];
        tagObj["y"] = tagData[11];
        tagObj["accelerometer"] = tagData[12];
        tagObj["floorId"] = tagData[13];
        tagObj["signalLost"] = tagData[14];
        tagObj["powerSave"] = tagData[15];

        // Append to result.
        result[tagObj["deviceId"]] = tagObj;
    }

    return result;
}
