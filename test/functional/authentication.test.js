import "regenerator-runtime/runtime";
import { getToken } from "../../src/rest/authentication";
import {
    DEV_CLIENT_ID,
    DEV_CLIENT_SECRET,
    waitAsync,
    DEV_AUTH_DOMAIN
} from "../test-shared";

describe("authentication", () => {
    test("should work with correct credentials", async () => {
        const clientId = DEV_CLIENT_ID;
        const clientSecret = DEV_CLIENT_SECRET;
        const { accessToken, tokenExpiration } = await getToken(
            clientId,
            clientSecret,
            DEV_AUTH_DOMAIN
        );

        expect(accessToken).toBeDefined();
        expect(tokenExpiration).toBeDefined();
        expect(tokenExpiration).toBeGreaterThan(0);
    });

    test("should return new credentials in subsequent calls", async () => {
        const clientId = DEV_CLIENT_ID;
        const clientSecret = DEV_CLIENT_SECRET;

        const {
            accessToken: accessToken1,
            tokenExpiration: tokenExpiration1
        } = await getToken(clientId, clientSecret, DEV_AUTH_DOMAIN);

        expect(accessToken1).toBeDefined();
        expect(tokenExpiration1).toBeDefined();

        await waitAsync(1000);

        const {
            accessToken: accessToken2,
            tokenExpiration: tokenExpiration2
        } = await getToken(clientId, clientSecret, DEV_AUTH_DOMAIN);

        expect(accessToken2).toBeDefined();
        expect(tokenExpiration2).toBeDefined();

        expect(accessToken1).not.toEqual(accessToken2);
    });

    test("should fail for invalid credentials", async () => {
        await expect(
            getToken(DEV_CLIENT_ID, "hunter2", DEV_AUTH_DOMAIN)
        ).rejects.toThrow("failed");

        await expect(
            getToken("asdf", DEV_CLIENT_SECRET, DEV_AUTH_DOMAIN)
        ).rejects.toThrow("Invalid argument");

        await expect(
            getToken(1234, DEV_CLIENT_SECRET, DEV_AUTH_DOMAIN)
        ).rejects.toThrow("failed");
    });
});
