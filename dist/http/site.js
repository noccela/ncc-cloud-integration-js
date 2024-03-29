import { validateAccountAndSite } from "../utils/utils.js";
import { sendAuthenticatedRequest } from "./httputils.js";
import { NCC_PATHS } from "../constants/paths.js";
/**
 * Get direct domain for site into which the WS should connect.
 *
 * @param {string} accessToken
 * @param {string} lbDomain
 * @param {number} account
 * @param {number} site
 */
export async function getNodeDomainForSite(accessToken, lbDomain, account, site) {
    if (!accessToken || !accessToken.length) {
        throw Error("Invalid access token");
    }
    validateAccountAndSite(account, site);
    const url = new URL(NCC_PATHS["NODE_DOMAIN"], lbDomain);
    url.searchParams.append("account", account.toString());
    url.searchParams.append("site", site.toString());
    const response = await sendAuthenticatedRequest(url, "GET", null, accessToken);
    return response.domain;
}
// Fetch domain for the site handler and build the
// websocket URL to connect to.
export async function getAddress(lbDomain, accountId, siteId, accessToken) {
    const directDomain = await getNodeDomainForSite(accessToken, lbDomain, accountId, siteId);
    const useTls = lbDomain.startsWith("https");
    const protocol = useTls ? "wss://" : "ws://";
    const directOrigin = `${protocol}${directDomain}`;
    const url = getWebsocketAddress(directOrigin);
    url.searchParams.append("account", accountId.toString());
    url.searchParams.append("site", siteId.toString());
    return url.href;
}
export function getWebsocketAddress(domain) {
    return new URL(NCC_PATHS["REALTIME_API"], domain);
}
//# sourceMappingURL=site.js.map