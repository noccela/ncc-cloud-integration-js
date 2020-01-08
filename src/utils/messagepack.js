import { deserialize } from "@ygoe/msgpack";

/**
 * Parse and decode Base64 encoded MsgPack message from cloud.
 *
 * @param {String} baseMsg Base64 encoded message.
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
    for (const [mac, tagData] of Object.entries(payload)) {
        const tagObj = {
            mac: mac
        };
        tagObj["deviceId"] = tagData[0];
        tagObj["deviceModel"] = tagData[1];
        tagObj["name"] = tagData[2];
        tagObj["status"] = tagData[3];
        tagObj["batteryStatus"] = tagData[4];
        tagObj["isOnline"] = tagData[5];
        tagObj["lastActivity"] = tagData[6];
        tagObj["x"] = tagData[7];
        tagObj["y"] = tagData[8];
        tagObj["z"] = tagData[9];
        tagObj["isLedOrBuzzer"] = tagData[10];
        tagObj["floorId"] = tagData[12];
        tagObj["signalLost"] = tagData[13];
        tagObj["powerSave"] = tagData[14];
        tagObj["inCharger"] = tagData[15];
        tagObj["customerViewerProtected"] = tagData[16];
        tagObj["settings"] = tagData[11];

        // Append to result.
        result[tagObj["deviceId"]] = tagObj;

        return result;
    }
}
