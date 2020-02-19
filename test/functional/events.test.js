// TODO: For some reason beforeEach is not run before the tests, which causes
// tests to randomly fail.

import { getToken } from "../../src/rest/authentication";
import { EventChannel } from "../../src/socket/eventhandler";
import {
    DEV_API_DOMAIN,
    DEV_AUTH_DOMAIN,
    DEV_CLIENT_ID,
    DEV_CLIENT_SECRET
} from "../test-shared";
import { EVENT_TYPES } from "../../src/constants/constants";

describe("registering to events", () => {
    /** @type { EventChannel } */
    let ncc;

    beforeEach(async () => {
        const { accessToken } = await getToken(
            DEV_AUTH_DOMAIN,
            DEV_CLIENT_ID,
            DEV_CLIENT_SECRET
        );
        const eventChannel = new EventChannel(DEV_API_DOMAIN);
        await eventChannel.connect(accessToken);
        ncc = eventChannel;
    });

    afterEach(async () => {
        await ncc.close();
        ncc = null;
    });

    // To test this, client should be receiving any location updates.
    test("should receive location updates", async () => {
        // const ncc = await getNcc();
        function callback(payload) {
            for (const [deviceId, deviceData] of Object.entries(payload)) {
                expect(deviceId.length).toEqual(10);
                expect(Number.isInteger(deviceData.x)).toEqual(true);
                expect(Number.isInteger(deviceData.y)).toEqual(true);
                expect(Number.isInteger(deviceData.floor)).toEqual(true);
            }
        }

        return await expectEventToBeCalledNTimes(
            callback => ncc.registerLocationUpdate(callback, 1, 1, null),
            callback,
            3
        );
    }, 20000);

    test("should receive tag diff updates", async () => {
        function callback(payload) {
            const tags = payload.tags;
            expect(tags).toEqual(expect.anything());
            for (const [deviceId, deviceData] of Object.entries(tags)) {
                expect(Number.isNaN(Number(deviceId))).toBeFalsy();
                expect(Object.keys(deviceData).length).toBeGreaterThan(0);
            }
        }

        return await expectEventToBeCalledNTimes(
            callback => ncc.registerTagDiffStream(callback, 1, 1, null),
            callback,
            3
        );
    }, 20000);

    test("should receive initial tag state and again when connection is re-established", done => {
        const callback = (() => {
            let socketClosed = false;

            return function(err, payload) {
                expect(err).toBeNull();

                const keys = Object.keys(payload);
                expect(keys.length).toBeGreaterThan(0);

                for (const deviceId of keys) {
                    expect(Number.isNaN(Number(deviceId))).toBeFalsy();
                }

                if (!socketClosed) {
                    ncc._connection._socket.close();
                    socketClosed = true;
                } else {
                    // Reconnected.
                    done();
                }
            };
        })();

        ncc.registerInitialTagState(callback, 1, 1, null);
    }, 15000);

    test("unregistering should stop messages", done => {
        let uuid = [];
        const callback = (() => {
            let unsubscribed = false;

            return async function(err, payload) {
                expect(err).toBeNull();

                if (!unsubscribed) {
                    expect(Object.keys(payload).length).toBeGreaterThan(0);
                    await ncc.unregister(uuid[0]);
                    setTimeout(() => {
                        // Nothing received for a while, so probably a success.
                        done();
                    }, 5000);
                } else {
                    done("received message after unsubscribing");
                }
            };
        })();

        ncc.register(EVENT_TYPES["LOCATION_UPDATE"], 1, 1, null, callback).then(
            id => {
                uuid[0] = id;
            }
        );
    }, 15000);
});

async function expectEventToBeCalledNTimes(register, callback, n = 3) {
    const expectedLocationUpdates = 3;
    let receivedUpdates = 0;

    let resolvePromise;
    let promise = new Promise(res => {
        resolvePromise = res;
    });

    function innerCallback(err, payload) {
        expect(err).toBeNull();
        callback(payload);
        if (receivedUpdates++ >= expectedLocationUpdates) {
            resolvePromise();
        }
    }

    await register(innerCallback);

    return promise;
}
