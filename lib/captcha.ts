/**
 * CivicTrust CAPTCHA & Bot Protection Subsystem
 * Supports Cloudflare Turnstile, reCAPTCHA v2/v3, and fail-safe environment verification.
 */

export interface CaptchaVerificationResult {
  ok: boolean;
  score?: number;
  message?: string;
  provider: "turnstile" | "recaptcha" | "none";
}

export async function verifyCaptchaToken(
  token: string | undefined | null,
  clientIp?: string
): Promise<CaptchaVerificationResult> {
  const secretKey =
    process.env.CAPTCHA_SECRET_KEY ||
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.RECAPTCHA_SECRET_KEY;

  const isEnabled = process.env.CAPTCHA_ENABLED === "true";
  const isStrict = process.env.CAPTCHA_STRICT === "true";

  // If CAPTCHA is not configured or disabled, fail-safe gracefully for local dev/pilot
  if (!secretKey || !isEnabled) {
    if (isStrict) {
      return {
        ok: false,
        message: "CAPTCHA protection required but unconfigured on server.",
        provider: "none",
      };
    }
    return { ok: true, score: 1.0, provider: "none" };
  }

  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return {
      ok: false,
      message: "CAPTCHA validation token is missing.",
      provider: "none",
    };
  }

  try {
    const isTurnstile = Boolean(process.env.TURNSTILE_SECRET_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
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
        message: `CAPTCHA verification endpoint error: HTTP ${res.status}`,
        provider: isTurnstile ? "turnstile" : "recaptcha",
      };
    }

    const data = await res.json();
    if (data.success) {
      return {
        ok: true,
        score: typeof data.score === "number" ? data.score : 1.0,
        provider: isTurnstile ? "turnstile" : "recaptcha",
      };
    }

    return {
      ok: false,
      message: "Security check failed. Please refresh and try again.",
      provider: isTurnstile ? "turnstile" : "recaptcha",
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `CAPTCHA verification exception: ${err.message}`,
      provider: "none",
    };
  }
}
