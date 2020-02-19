import { getToken } from "../../src/rest/authentication";
import { EventChannel } from "../../src/socket/eventhandler";
import {
    DEV_API_DOMAIN,
    DEV_AUTH_DOMAIN,
    DEV_CLIENT_ID,
    DEV_CLIENT_SECRET
} from "../test-shared";

describe("requesting cloud", () => {
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

    test("should fetch initial tag state", async () => {
        const tagState = await ncc.getTagState(1, 1);
        expect(Object.keys(tagState).constructor).toBe(Array);
        expect(Object.keys(tagState).length).toBeGreaterThan(0);
        for (const [deviceId, deviceData] of Object.entries(tagState)) {
            expect(deviceId.length).toEqual(10);
            expect(deviceData["deviceId"]).toEqual(expect.anything());
            expect(+deviceId).toEqual(deviceData["deviceId"]);
        }
    });
});
