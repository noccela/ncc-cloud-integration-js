import { WS_READYSTATE } from "../constants/constants";

/**
 * Generate standard-compliant UUID (v4).
 * From https://stackoverflow.com/a/2117523
 */
export function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Check if WebSocket is open.
 * @param {WebSocket} ws Websocket object.
 */
export function isWsOpen(ws) {
    return ws !== null && ws.readyState === WS_READYSTATE["OPEN"];
}

/**
 * Validate account and site id values.
 * @param {Number} accountId Account id.
 * @param {Number} siteId Site id.
 */
export function validateAccountAndSite(accountId, siteId) {
    if (!accountId || !Number.isInteger(accountId))
        throw Error(`Invalid accountId ${accountId}`);
    if (!siteId || !Number.isInteger(siteId))
        throw Error(`Invalid accountId ${siteId}`);
}

/**
 * Validate object's properties and throw if any issues arise.
 *
 * @param {Object} options Options object.
 * @param {Array} validOptionNames Array of strings for valid property names.
 * @param {Array} requiredOptionNames Array of strings that are required.
 */
export function validateOptions(
    options,
    validOptionNames,
    requiredOptionNames
) {
    const validSet = new Set(validOptionNames);

    // Check for invalid option names.
    const optionNames = Object.getOwnPropertyNames(options);
    for (const optionName of optionNames) {
        if (!validSet.has(optionName)) {
            throw Error(`Invalid option ${optionName}`);
        }
    }

    if (requiredOptionNames) {
        // Check that all required properties are present.
        for (const requiredOptionName of requiredOptionNames) {
            if (!options.hasOwnProperty(requiredOptionName)) {
                throw Error(`Missing required option ${requiredOptionName}`);
            }
        }
    }
}
