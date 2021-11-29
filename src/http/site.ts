import { validateAccountAndSite } from "../utils/utils.js";
import { sendAuthenticatedRequest } from "./httputils.js";
import { NCC_PATHS } from "../constants/paths.js";
import * as Types from "../types.js";

/**
 * Get direct domain for site into which the WS should connect.
 *
 * @param {string} accessToken
 * @param {string} lbDomain
 * @param {number} account
 * @param {number} site
 */
export async function getNodeDomainForSite(accessToken: string, lbDomain: string, account: number, site: number): Promise<string> {
    if (!accessToken || !accessToken.length) {
        throw Error("Invalid access token");
    }
    validateAccountAndSite(account, site);

    const url: URL = new URL(NCC_PATHS["NODE_DOMAIN"], lbDomain);
    url.searchParams.append("account", account.toString());
    url.searchParams.append("site", site.toString());

    const response:Types.NodeDomainResponse  = await sendAuthenticatedRequest(
        url,
        "GET",
        null,
        accessToken
    );

    return response.domain;
}

// Fetch domain for the site handler and build the
// websocket URL to connect to.
export async function getAddress(lbDomain: string, accountId: number, siteId: number, accessToken: string): Promise<string> {
    const directDomain: string = await getNodeDomainForSite(
        accessToken,
        lbDomain,
        accountId,
        siteId
    );

    const useTls: boolean = lbDomain.startsWith("https");
    const protocol: string = useTls ? "wss://" : "ws://";
    const directOrigin: string = `${protocol}${directDomain}`;

    const url: URL = getWebsocketAddress(directOrigin);
    url.searchParams.append("account", accountId.toString());
    url.searchParams.append("site", siteId.toString());

    return url.href;
}

export function getWebsocketAddress(domain: string): URL {
    return new URL(NCC_PATHS["REALTIME_API"], domain);
}