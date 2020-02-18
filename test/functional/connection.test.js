import { EventChannel } from "../../src/socket/eventhandler";
import {
    DEV_API_DOMAIN,
    DEV_AUTH_DOMAIN,
    DEV_CLIENT_ID,
    DEV_CLIENT_SECRET
} from "../test-shared";
import { getToken } from "../../src/rest/authentication";
import { getWebSocket } from "../../src/utils/utils";

describe("connecting to backend", () => {
    test("should connect and authenticate to backend", async () => {
        const ncc = new EventChannel(DEV_API_DOMAIN);

        const { accessToken } = await getToken(
            DEV_AUTH_DOMAIN,
            DEV_CLIENT_ID,
            DEV_CLIENT_SECRET
        );

        await ncc.connect(accessToken);

        const ws = await getWebSocket();

        expect(ncc._connection.connected).toBeTruthy();
        expect(ncc._connection._socket.readyState).toEqual(ws.OPEN);
        expect(ncc._connection._socketHandler).toBeDefined();
        expect(ncc._connection._lastJwtUsed).toEqual(accessToken);
        expect(ncc._connection._tokenExpirationTimeout).toBeNull();

        await ncc.close();

        expect(ncc._connection.connected).toBeFalsy();
        expect(ncc._connection._socket.readyState).toEqual(ws.CLOSED);
        expect(ncc._connection._socketHandler).toBeNull();
        expect(ncc._connection._tokenExpirationTimeout).toBeNull();
        expect(ncc._connection._lastJwtUsed).toBeNull();
    });
});
