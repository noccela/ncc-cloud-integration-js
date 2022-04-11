import * as Types from "../types.js";
/**
 * Get a random string that can be used as unique(ish) ID to track requests
 * in the library and other assets.
 *
 * @param {boolean} useUuidV4 Use standard-compliant UUIDV4 instead of simpler
 * random string.
 * @param {number} shortLength If not using UUID4, the length of the random
 * string.
 */
export declare function getUniqueId(useUuidV4?: boolean, shortLength?: number): string;
/**
 * Validate account and site id values.
 * @param {number} accountId Account id.
 * @param {number} siteId Site id.
 */
export declare function validateAccountAndSite(accountId: number, siteId: number): void;
/**
 * Validate object's properties and throw if any issues arise.
 *
 * @param {Object} options Options object.
 * @param {Array} validOptionNames Array of strings for valid property names.
 * @param {Array} requiredOptionNames Array of strings that are required.
 */
export declare function validateOptions(options: Types.MessageFilter, validOptionNames: string[], requiredOptionNames: string[] | null): void;
/**
 * Check if we are running in NodeJs environment.
 */
export declare function isNodeJs(): boolean;
/**
 * Wait asynchronously.
 * @param {Number} ms Milliseconds until promise is resolved.
 */
export declare function waitAsync(ms: number): Promise<void>;
