import fetch from "cross-fetch";
import * as Types from "../types.js";

/**
 * @param {URL} url
 * @param {("GET" | "POST" | "DELETE" | "PUT" | "UPDATE" | "OPTIONS")} method
 * @param {BodyInit} body
 * @param {string} accessToken
 */
export async function sendAuthenticatedRequest(url: URL, method: string, body: BodyInit | null, accessToken: string): Promise<Types.NodeDomainResponse> {
    if (!(url instanceof URL)) throw Error("Invalid url");

    const response: Response = await fetch(url.href, {
        method: method,
        body: body,
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const statusCode: number = response.status;
    if (!response.ok || statusCode !== 200) {
        throw Error(response.statusText || `StatusCode ${statusCode}`);
    }

    return await response.json();
}
