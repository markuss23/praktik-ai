// Keycloak OIDC configuration and helpers (PKCE flow)

export const KC_CONFIG = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:8090",
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "praktikai-dev",
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "praktik-ai-app",
};

export const KC_BASE = `${KC_CONFIG.url}/realms/${KC_CONFIG.realm}/protocol/openid-connect`;

// PKCE helpers

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array.buffer);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return base64UrlEncode(digest);
}

// Auth URLs

export function getCallbackUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback`;
}

export async function buildLoginUrl(state?: string): Promise<string> {
  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const callbackUrl = getCallbackUrl();

  // Persist verifier and state so the callback page can use them
  sessionStorage.setItem("pkce_verifier", verifier);
  sessionStorage.setItem("pkce_state", state ?? "");

  const params = new URLSearchParams({
    client_id: KC_CONFIG.clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid profile email",
    code_challenge: challenge,
    code_challenge_method: "S256",
    ...(state ? { state } : {}),
  });

  return `${KC_BASE}/auth?${params.toString()}`;
}

export function buildLogoutUrl(redirectAfter?: string): string {
  const params = new URLSearchParams({
    client_id: KC_CONFIG.clientId,
    post_logout_redirect_uri: redirectAfter ?? (typeof window !== "undefined" ? window.location.origin : ""),
  });
  return `${KC_BASE}/logout?${params.toString()}`;
}

// Token exchange 

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  // Lifetime of the access token in seconds (from Keycloak)
  expires_in: number;
  // Lifetime of the refresh token in seconds
  refresh_expires_in?: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const verifier = sessionStorage.getItem("pkce_verifier");
  if (!verifier) throw new Error("Missing PKCE verifier");

  const body = new URLSearchParams({
    client_id: KC_CONFIG.clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: getCallbackUrl(),
    code_verifier: verifier,
  });

  const res = await fetch(`${KC_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  return res.json() as Promise<TokenResponse>;
}

// Token refresh

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: KC_CONFIG.clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(`${KC_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error("Token refresh failed");
  return res.json() as Promise<TokenResponse>;
}

// User info

export interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
}

export function parseJwt(token: string): UserInfo | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as UserInfo;
  } catch {
    return null;
  }
}

// Storage helpers

const STORAGE_KEYS = {
  accessToken: "kc_access_token",
  refreshToken: "kc_refresh_token",
  idToken: "kc_id_token",
  expiresAt: "kc_expires_at",
} as const;

// Persist tokens
export function storeTokens(tokens: TokenResponse) {
  // Store 30 s before real expiry to have a safety margin
  const expiresAt = Date.now() + (tokens.expires_in - 30) * 1000;
  localStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
  localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
  localStorage.setItem(STORAGE_KEYS.idToken, tokens.id_token);
  localStorage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt));
  // Notify any mounted useAuth instances that a new session is available
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kc:login", { detail: { accessToken: tokens.access_token } }));
  }
}

export function clearTokens() {
  if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEYS.accessToken)) {
    // Let useAuth (and any other listener) know the session ended
    window.dispatchEvent(new CustomEvent("kc:logout"));
  }
  Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  sessionStorage.removeItem("pkce_verifier");
  sessionStorage.removeItem("pkce_state");
}

export function getStoredTokens() {
  if (typeof window === "undefined") return null;
  const access = localStorage.getItem(STORAGE_KEYS.accessToken);
  const refresh = localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!access || !refresh) return null;
  return {
    accessToken: access,
    refreshToken: refresh,
    idToken: localStorage.getItem(STORAGE_KEYS.idToken) ?? "",
    expiresAt: Number(localStorage.getItem(STORAGE_KEYS.expiresAt) ?? 0),
  };
}

// Returns true when the stored access token expires
export function isTokenExpiring(bufferSeconds = 60): boolean {
  if (typeof window === "undefined") return false;
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.expiresAt) ?? 0);
  return !expiresAt || Date.now() >= expiresAt - bufferSeconds * 1000;
}

let _refreshPromise: Promise<TokenResponse> | null = null;

// Returns a valid access token, refreshing silently when the current one is about to expire.
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  // Token still fresh — return immediately
  if (!isTokenExpiring()) return tokens.accessToken;

  // Token near expiry — refresh (singleton to avoid parallel requests)
  if (!_refreshPromise) {
    _refreshPromise = refreshTokens(tokens.refreshToken)
      .then((fresh) => {
        storeTokens(fresh);
        return fresh;
      })
      .catch((err) => {
        clearTokens(); // dispatches "kc:logout"
        throw err;
      })
      .finally(() => {
        _refreshPromise = null;
      });
  }

  try {
    const fresh = await _refreshPromise;
    return fresh.access_token;
  } catch {
    return null;
  }
}
