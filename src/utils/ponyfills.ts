// Fetch a function for current environment.
// i.e. returns matching functions for NodeJs.

import { isNodeJs } from "./utils.js";

// atob
export function getAtob(): (s: string) => string {
    if (isNodeJs()) {
        return str => Buffer.from(str, "base64").toString("binary");
    } else {
        return atob;
    }
}

// WebSocket
export async function getWebSocket():Promise<typeof WebSocket> {
    return await (isNodeJs()
        ? import("ws").then(wsModule => wsModule.default)
        : Promise.resolve(WebSocket));
}
