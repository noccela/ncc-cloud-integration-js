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
export async function getNodeDomainForSite(
    accessToken,
    lbDomain,
    account,
    site
) {
    if (!accessToken || !accessToken.length) {
        throw Error("Invalid access token");
    }
    validateAccountAndSite(account, site);

    const url = new URL(NCC_PATHS["NODE_DOMAIN"], lbDomain);
    url.searchParams.append("account", account.toString());
    url.searchParams.append("site", site.toString());

    const { domain } = await sendAuthenticatedRequest(
        url,
        "GET",
        undefined,
        accessToken
    );

    return domain;
}
