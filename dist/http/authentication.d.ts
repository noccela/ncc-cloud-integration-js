import * as Types from "../types.js";
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
 * @param {number} clientId Client if for registered app.
 * @param {string} clientSecret Client secret for app.
 * @param {string} authOrigin Base domain for authentication server, without path.
 */
export declare function getToken(clientId: number, clientSecret: string, authOrigin?: string): Promise<Types.AuthResult>;
