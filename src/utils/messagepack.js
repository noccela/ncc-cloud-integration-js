import { deserialize } from "@ygoe/msgpack";
import { getAtob } from "./ponyfills";

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

    const payload = deserialize(intArray);
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
        tagObj["deviceModel"] = tagData[1];
        tagObj["name"] = tagData[2];
        tagObj["batteryVoltage"] = tagData[3];
        tagObj["batteryStatus"] = tagData[4];
        tagObj["status"] = tagData[5];
        tagObj["temperature"] = tagData[6];
        tagObj["areas"] = tagData[7];
        tagObj["wire"] = tagData[8];
        tagObj["reed"] = tagData[9];
        tagObj["isOnline"] = tagData[10];
        tagObj["timestamp"] = tagData[11];
        tagObj["x"] = tagData[12];
        tagObj["y"] = tagData[13];
        tagObj["accountId"] = tagData[14];
        tagObj["siteId"] = tagData[15];
        tagObj["accelerometer"] = tagData[16];
        tagObj["floorId"] = tagData[17];
        tagObj["signalLost"] = tagData[18];
        tagObj["powerSave"] = tagData[19];

        // Append to result.
        result[tagObj["deviceId"]] = tagObj;
    }

    return result;
}
