/**
 * CivicTrust server-side input validation & sanitization.
 *
 * Every API route validates untrusted JSON payloads through these helpers
 * before they reach the database or the AI verification pipeline.
 */

export const VALID_ROLES = ["CITIZEN", "OFFICER", "ADMIN", "DEPT_HEAD"] as const;
export const VALID_SEVERITIES = ["STANDARD", "HIGH", "EMERGENCY"] as const;
export const VALID_STATUSES = [
  "SUBMITTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "TPA_REVIEW",
  "CLOSED",
] as const;

export const VALID_CATEGORIES = [
  "Roads & Potholes",
  "Drainage & Water Leakage",
  "Garbage & Waste",
  "Street Lighting & Electrical",
  "Veterinary & Stray Animal Control",
] as const;

/** Maximum accepted evidence photo payload (base64 data URL). ~6 MB binary. */
export const MAX_PHOTO_BASE64_LENGTH = 8 * 1024 * 1024;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Strip control characters, collapse whitespace, and enforce a max length. */
export function cleanText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

export function isEmail(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 254) return false;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
}

/** Enforce a modest password policy: 8+ chars with at least one letter and one digit. */
export function validatePasswordPolicy(password: unknown): password is string {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) return false;
  return /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

export function validateLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function validateLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

/** Validate an evidence photo data URL and return its decoded byte size. */
export function validatePhotoDataUrl(dataUrl: unknown): ValidationResult<{ byteSize: number }> {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return { ok: false, error: "Photo evidence must be an image data URL" };
  }
  if (dataUrl.length > MAX_PHOTO_BASE64_LENGTH) {
    return { ok: false, error: "Photo evidence exceeds the 6 MB size limit" };
  }
  const base64 = dataUrl.split(",")[1];
  if (!base64) {
    return { ok: false, error: "Photo evidence data URL is malformed" };
  }
  const byteSize = Math.floor((base64.length * 3) / 4);
  if (byteSize > 6 * 1024 * 1024) {
    return { ok: false, error: "Photo evidence exceeds the 6 MB size limit" };
  }
  return { ok: true, value: { byteSize } };
}
