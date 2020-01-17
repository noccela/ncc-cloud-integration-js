import fetch from "cross-fetch";
import { AUTH_TOKEN_ENDPOINT } from "../constants/paths";

/**
 * Fetch a fresh JWT access token from Noccela's OAuth2 authentication server.
 * Provide the base domain for authentication server (no path!) and the client
 * id and secret visible in app's page.
 *
 * The token is JWT access token that is sent with HTTP requests in Authorization
 * header as Bearer token or through websocket if using real time API.
 *
 * The expiration time is returned in seconds. It is recommended to get a new
 * token when less than half of the time until expiration is left. Requests
 * with expired token return 403.
 *
 * The OAuth flow used is client credentials.
 *
 * @param {String} domain Base domain for authentication server, without path.
 * @param {Number} clientId Client if for registered app.
 * @param {String} clientSecret Client secret for app.
 */
export async function getToken(domain, clientId, clientSecret) {
    // Construct the full OAuth2 token endpoint.
    const url = new URL(AUTH_TOKEN_ENDPOINT, domain).href;

    // Build the request body.
    // Token request only supports x-www-form-urlencoded, not json.
    const authRequestBody = new URLSearchParams();
    authRequestBody.append("client_id", clientId);
    authRequestBody.append("client_secret", clientSecret);
    authRequestBody.append("grant_type", "client_credentials");

    // Fetch JWT token from authentication server.
    const authResponse = await fetch(url, {
        method: "post",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: authRequestBody
    });

    // Pick the relevant properties.
    // Scopes are not used in Noccela APIs, at least yet so ignoring.
    const {
        expires_in: tokenExpiration,
        access_token: accessToken,
        error
    } = await authResponse.json();

    if (error) {
        // Error returned by authentication server.
        throw Error(`Authentication failed: ${error}`);
    }

    return {
        tokenExpiration,
        accessToken
    };
}
