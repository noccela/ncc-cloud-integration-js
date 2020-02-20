// Relative base path for all partner API endpoints.
export const PARTNER_API_BASE = "/api/partner";

// Relative path to token endpoint in authenticatino server.
export const AUTH_TOKEN_ENDPOINT = "/connect/token";

// Relative paths of various API endpoints.
export const NCC_PATHS = {
    REALTIME_API: `${PARTNER_API_BASE}/realtime`
};

export const DEFAULT_API_DOMAIN = "wss://partner.noccela.com";

export const DEFAULT_AUTH_DOMAIN = "https://auth.noccela.com";
