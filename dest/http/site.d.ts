/**
 * Get direct domain for site into which the WS should connect.
 *
 * @param {string} accessToken
 * @param {string} lbDomain
 * @param {number} account
 * @param {number} site
 */
export declare function getNodeDomainForSite(accessToken: string, lbDomain: string, account: number, site: number): Promise<string>;
export declare function getAddress(lbDomain: string, accountId: number, siteId: number, accessToken: string): Promise<string>;
export declare function getWebsocketAddress(domain: string): URL;
