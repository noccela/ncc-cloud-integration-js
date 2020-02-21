import { UUID_LENGTH } from "../constants/constants";

/**
 * Generate standard-compliant UUID (v4).
 * From https://stackoverflow.com/a/2117523
 */
function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0,
            v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Get a shorter unique ID.
 */
function shortUuid(length) {
    return "x".repeat(length).replace(/[x]/g, () => {
        const r = (Math.random() * 16) | 0;
        return r.toString(16);
    });
}

/**
 * Get a random string that can be used as unique(ish) ID to track requests
 * in the library and other assets.
 *
 * @param {boolean} useUuidV4 Use standard-compliant UUIDV4 instead of simpler
 * random string.
 * @param {number} shortLength If not using UUID4, the length of the random
 * string.
 */
export function getUniqueId(useUuidV4 = false, shortLength = UUID_LENGTH) {
    return useUuidV4 ? uuidv4() : shortUuid(shortLength);
}

/**
 * Validate account and site id values.
 * @param {number} accountId Account id.
 * @param {number} siteId Site id.
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
            if (
                !Object.prototype.hasOwnProperty.call(
                    options,
                    requiredOptionName
                )
            ) {
                throw Error(`Missing required option ${requiredOptionName}`);
            }
        }
    }
}

/**
 * Check if we are running in NodeJs environment.
 */
export function isNodeJs() {
    return typeof window === "undefined";
}

/**
 * Wait asynchronously.
 * @param {Number} ms Milliseconds until promise is resolved.
 */
export async function waitAsync(ms) {
    await new Promise(res => {
        setTimeout(res, ms);
    });
}
