import { getToken } from "../../src/rest/authentication";
import { EventChannel } from "../../src/socket/eventhandler";
import {
    DEV_API_DOMAIN,
    DEV_AUTH_DOMAIN,
    DEV_CLIENT_ID,
    DEV_CLIENT_SECRET
} from "../test-shared";

describe("registering to events", () => {
    /** @type { EventChannel } */
    let ncc;

    beforeEach(async () => {
        ncc = new EventChannel(DEV_API_DOMAIN);
        const { accessToken } = await getToken(
            DEV_AUTH_DOMAIN,
            DEV_CLIENT_ID,
            DEV_CLIENT_SECRET
        );
        await ncc.connect(accessToken);
    });

    afterEach(async () => {
        await ncc.close();
    });

    test("should receive location updates", async () => {
        const expectedLocationUpdates = 3;
        let receivedUpdates = 0;

        let resolvePromise;
        let promise = new Promise(res => {
            resolvePromise = res;
        });

        function callback(err, payload) {
            expect(err).toBeNull();
            for (const [deviceId, deviceData] of Object.entries()) {
                expect(deviceId.length).toEqual(10);
                expect(Number.isInteger(deviceData.x)).toEqual(true);
                expect(Number.isInteger(deviceData.y)).toEqual(true);
                expect(Number.isInteger(deviceData.floor)).toEqual(true);
            }

            if (receivedUpdates++ >= expectedLocationUpdates) {
                resolvePromise();
            }
        }

        await ncc.registerLocationUpdate(callback, 1, 1, null);

        return promise;
    }, 20000);
});
