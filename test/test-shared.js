export const DEV_DOMAIN = "auth.samuel.noccela.xyz";
export const DEV_CLIENT_ID = 7142;
export const DEV_CLIENT_SECRET = "pj62txhSptVBFnF5fyQgurPeRIcMxqEf";

export async function waitAsync(ms) {
    await new Promise(res => {
        setTimeout(res, ms);
    });
}