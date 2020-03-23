import fetch from "cross-fetch";

/**
 * @param {URL} url
 * @param {("GET" | "POST" | "DELETE" | "PUT" | "UPDATE" | "OPTIONS")} method
 * @param {Object} body
 * @param {string} accessToken
 */
export async function sendAuthenticatedRequest(url, method, body, accessToken) {
    if (!(url instanceof URL)) throw Error("Invalid url");

    const response = await fetch(url.href, {
        method: method,
        body: body,
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    const statusCode = response.status;
    if (!response.ok || statusCode !== 200) {
        throw Error(response.statusText || `StatusCode ${statusCode}`);
    }

    return await response.json();
}
