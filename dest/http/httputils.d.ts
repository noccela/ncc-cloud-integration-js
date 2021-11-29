import * as Types from "../types.js";
/**
 * @param {URL} url
 * @param {("GET" | "POST" | "DELETE" | "PUT" | "UPDATE" | "OPTIONS")} method
 * @param {BodyInit} body
 * @param {string} accessToken
 */
export declare function sendAuthenticatedRequest(url: URL, method: string, body: BodyInit | null, accessToken: string): Promise<Types.NodeDomainResponse>;
