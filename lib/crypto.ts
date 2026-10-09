import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Password hashing.
 *
 * New hashes use scrypt with a per-user random salt, stored as:
 *   scrypt$N$r$p$salt_b64$hash_b64
 *
 * Legacy unsalted SHA-256 hashes (64 hex chars) are still verified so existing
 * accounts keep working; callers can detect them with isLegacyHash and upgrade
 * to scrypt on the next successful login (see /api/auth/login).
 */

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/** True when the stored hash uses the legacy unsalted SHA-256 format. */
export function isLegacyHash(hash: string): boolean {
  return typeof hash === "string" && /^[0-9a-f]{64}$/i.test(hash);
}

function legacyVerify(password: string, hash: string): boolean {
  const candidate = createHash("sha256").update(password).digest("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function scryptVerify(password: string, hash: string): boolean {
  const parts = hash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const N = parseInt(parts[1], 10);
  const r = parseInt(parts[2], 10);
  const p = parseInt(parts[3], 10);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  try {
    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    const actual = scryptSync(password, salt, expected.length, { N, r, p });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function verifyPassword(password: string, hash: string): boolean {
  if (typeof password !== "string" || typeof hash !== "string") return false;
  if (isLegacyHash(hash)) return legacyVerify(password, hash);
  return scryptVerify(password, hash);
}
