import "regenerator-runtime/runtime";
import { EventChannel } from "../../src/socket/eventhandler";
import {
    DEV_API_DOMAIN,
    DEV_AUTH_DOMAIN,
    DEV_CLIENT_ID,
    DEV_CLIENT_SECRET,
    waitAsync
} from "../test-shared";
import { getToken } from "../../src/rest/authentication";
import { getWebSocket } from "../../src/utils/ponyfills";
import { DEFAULT_OPTIONS } from "../../src/constants/constants";

describe("connecting to backend", () => {
    /** @type { EventChannel } */
    let ncc;
    let accessToken;
    let ws;
    beforeEach(async () => {
        ncc = new EventChannel(null, DEV_API_DOMAIN);
        ({ accessToken } = await getToken(
            DEV_CLIENT_ID,
            DEV_CLIENT_SECRET,
            DEV_AUTH_DOMAIN
        ));
        ws = await getWebSocket();
    });

    afterEach(async () => {
        await ncc.close();
    });

    test("should connect and authenticate to backend", async () => {
        await ncc.connect(accessToken);

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

    test("should reconnect after socket is closed unexpectedly", async () => {
        await ncc.connect(accessToken);

        expect(ncc._connection.connected).toBeTruthy();
        expect(ncc._connection._nextRetryInterval).toEqual(
            DEFAULT_OPTIONS.retryIntervalMin
        );
        expect(ncc._connection._retryTimeout).toBeNull();

        ncc._connection._socket.close();

        await waitAsync(500);

        expect(ncc._connection.connected).toBeFalsy();
        expect(ncc._connection._socket.readyState).toEqual(ws.CLOSED);
        expect(ncc._connection._socketHandler).toBeNull();
        expect(ncc._connection._nextRetryInterval).toBeGreaterThan(
            DEFAULT_OPTIONS.retryIntervalMin
        );
        expect(ncc._connection._retryTimeout).not.toBeNull();

        await waitAsync(3000);

        expect(ncc._connection.connected).toBeTruthy();
        expect(ncc._connection._nextRetryInterval).toEqual(
            DEFAULT_OPTIONS.retryIntervalMin
        );
    }, 10000);
});
