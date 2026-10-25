/**
 * CivicTrust CAPTCHA & Bot Protection Subsystem
 * Supports Cloudflare Turnstile, reCAPTCHA v2/v3, and fail-safe environment verification.
 */

export interface CaptchaVerificationResult {
  ok: boolean;
  score?: number;
  message?: string;
  provider: "turnstile" | "recaptcha" | "none";
  status?: number;
}

export async function verifyCaptchaToken(
  token: string | undefined | null,
  clientIp?: string
): Promise<CaptchaVerificationResult> {
  const secretKey =
    process.env.CAPTCHA_SECRET_KEY ||
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.RECAPTCHA_SECRET_KEY;

  const isProduction = process.env.NODE_ENV === "production";
  const isEnabled = process.env.CAPTCHA_ENABLED === "true";
  const isDisabledExplicitly = process.env.CAPTCHA_ENABLED === "false";
  const isStrict = process.env.CAPTCHA_STRICT === "true";

  // Determine if CAPTCHA protection is required:
  // 1. Running in production environment (unless explicitly disabled via CAPTCHA_ENABLED=false)
  // 2. Explicitly enabled via CAPTCHA_ENABLED=true
  // 3. Explicitly strict via CAPTCHA_STRICT=true
  // 4. Secret key is configured
  const isRequired = !isDisabledExplicitly && (isProduction || isEnabled || isStrict || Boolean(secretKey));

  // If CAPTCHA is not required and not configured, permit local development/test execution
  if (!isRequired && (!secretKey || isDisabledExplicitly)) {
    return { ok: true, score: 1.0, provider: "none" };
  }

  // If CAPTCHA protection is required (or enabled) but secret key is missing, fail-closed safely
  if (!secretKey) {
    return {
      ok: false,
      message: "Security verification required but unconfigured on server.",
      provider: "none",
      status: 500,
    };
  }

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return {
      ok: false,
      message: "CAPTCHA validation token is missing.",
      provider: "none",
      status: 400,
    };
  }

  const isTurnstile = Boolean(
    process.env.TURNSTILE_SECRET_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  );
  const provider = isTurnstile ? "turnstile" : "recaptcha";

  try {
    const verifyUrl = isTurnstile
      ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
      : "https://www.google.com/recaptcha/api/siteverify";

    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (clientIp) formData.append("remoteip", clientIp);

    const res = await fetch(verifyUrl, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!res.ok) {
      return {
        ok: false,
        message: "CAPTCHA verification service temporarily unavailable.",
        provider,
        status: 503,
      };
    }

    const data = await res.json().catch(() => ({}) as any);
    if (data && data.success === true) {
      return {
        ok: true,
        score: typeof data.score === "number" ? data.score : 1.0,
        provider,
      };
    }

    return {
      ok: false,
      message: "Security check failed. Please refresh and try again.",
      provider,
      status: 400,
    };
  } catch {
    return {
      ok: false,
      message: "CAPTCHA verification service temporarily unavailable.",
      provider,
      status: 503,
    };
  }
}
