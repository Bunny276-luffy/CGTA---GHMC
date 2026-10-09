/**
 * CivicTrust Server-Side Session Auth
 *
 * Stateless HMAC-SHA256 signed session tokens carried in an HttpOnly cookie.
 * Implemented with the Web Crypto API so the same module runs in Node API
 * routes and in the Edge middleware runtime (no node:crypto dependency).
 */

export const SESSION_COOKIE = "civictrust_session_v2";

// Historical cookie names cleared on login/logout so stale duplicate cookies
// (e.g. from a previous build or a dev/prod mix on the same host) can never
// shadow the active session.
const LEGACY_COOKIES = ["civictrust-session", "civictrust-auth"];
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface SessionPayload extends SessionUser {
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();

let cachedSecret: Uint8Array | null = null;

function getSessionSecretBytes(): Uint8Array {
  if (cachedSecret) return cachedSecret;
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "";
  if (!secret) {
    throw new Error(
      "AUTH_SECRET (or NEXTAUTH_SECRET) is not configured. Set it in the environment before running the server."
    );
  }
  cachedSecret = encoder.encode(secret);
  return cachedSecret;
}

export function hasSessionSecret(): boolean {
  return Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    getSessionSecretBytes() as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/** Sign a session token: base64url(payload).base64url(hmac_sha256(payload)) */
export async function signSession(user: SessionUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ...user,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  return `${payloadB64}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/** Verify a signed session token. Returns the payload or null when invalid/expired. */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signatureB64] = parts;

  try {
    const key = await importHmacKey();
    const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
    const provided = base64UrlDecode(signatureB64);
    if (!constantTimeEqual(new Uint8Array(expected), provided)) {
      return null;
    }

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      return null;
    }
    if (!payload.id || !payload.role) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Extract all values for a cookie name from a raw Cookie header (API routes). */
function getAllCookieValues(cookieHeader: string | null, name: string): string[] {
  if (!cookieHeader) return [];
  const values: string[] = [];
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    if (pair.slice(0, idx).trim() === name) {
      values.push(decodeURIComponent(pair.slice(idx + 1).trim()));
    }
  }
  return values;
}

/**
 * Resolve the current session from a request: signed session cookie first,
 * then the Authorization: Bearer fallback for API clients. If duplicate
 * cookies with the same name exist (browser quirks), the first one that
 * verifies wins.
 */
export async function getSessionFromRequest(req: Request): Promise<SessionPayload | null> {
  for (const cookieToken of getAllCookieValues(req.headers.get("cookie"), SESSION_COOKIE)) {
    const session = await verifySession(cookieToken);
    if (session) return session;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifySession(authHeader.slice(7).trim());
  }
  return null;
}

/** True when the request arrived over HTTPS (directly or behind a proxy). */
export function requestIsSecure(req: Request): boolean {
  if (req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https") return true;
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookiePair(name: string, value: string, maxAge: number, secure: boolean): string {
  const securePart = secure ? "; Secure" : "";
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${securePart}`;
}

/**
 * Build Set-Cookie headers for a session. The Secure flag follows the actual
 * request protocol: Secure cookies sent over plain HTTP are silently dropped
 * by several browsers, which looked like "signed out on every refresh".
 */
export function buildSessionCookieHeaders(token: string, req: Request): string[] {
  const secure = requestIsSecure(req);
  const headers = [cookiePair(SESSION_COOKIE, encodeURIComponent(token), SESSION_MAX_AGE_SECONDS, secure)];
  // Clear any legacy/duplicate session cookies so exactly one identity exists.
  for (const legacy of LEGACY_COOKIES) {
    headers.push(cookiePair(legacy, "", 0, secure));
    headers.push(cookiePair(legacy, "", 0, !secure));
  }
  return headers;
}

/** Build Set-Cookie headers that clear the session (and legacy cookies). */
export function buildClearSessionCookieHeaders(req: Request): string[] {
  const secure = requestIsSecure(req);
  const headers = [cookiePair(SESSION_COOKIE, "", 0, secure)];
  for (const legacy of LEGACY_COOKIES) {
    headers.push(cookiePair(legacy, "", 0, secure));
    headers.push(cookiePair(legacy, "", 0, !secure));
  }
  return headers;
}

/** Serialize the public user fields of a session payload. */
export function toPublicUser(session: SessionPayload): SessionUser {
  return { id: session.id, email: session.email, name: session.name, role: session.role };
}
