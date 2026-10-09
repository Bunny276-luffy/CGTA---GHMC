import { NextResponse } from "next/server";
import { getRepository } from "../../../../lib/db";
import { verifyPassword, isLegacyHash, hashPassword } from "../../../../lib/crypto";
import { buildSessionCookieHeaders, signSession } from "../../../../lib/session";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit";
import { isEmail } from "../../../../lib/validation";
import { verifyCaptchaToken } from "../../../../lib/captcha";
import { logSystemError } from "../../../../lib/error-logger";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}) as any);
    const { email: rawEmail, password, captchaToken } = body;

    if (!rawEmail || !password) {
      return NextResponse.json(
        { message: "Missing email or password credentials" },
        { status: 400 }
      );
    }

    const ipLimit = rateLimit(`login:ip:${ip}`, 20, 5 * 60 * 1000);
    const emailLimit = rateLimit(`login:email:${String(rawEmail).toLowerCase()}`, 10, 5 * 60 * 1000);
    const blocked = !ipLimit.ok ? ipLimit : !emailLimit.ok ? emailLimit : null;
    if (blocked) {
      await logSystemError({
        area: "AUTH",
        endpoint: "/api/auth/login",
        severity: "WARNING",
        message: `Rate limit triggered for login from IP ${ip}`,
      });
      return NextResponse.json(
        { message: `Too many login attempts. Please retry in ${blocked.retryAfterSeconds}s.` },
        { status: 429, headers: { "Retry-After": String(blocked.retryAfterSeconds) } }
      );
    }

    // CAPTCHA Bot Check
    const captchaResult = await verifyCaptchaToken(captchaToken, ip);
    if (!captchaResult.ok) {
      await logSystemError({
        area: "AUTH",
        endpoint: "/api/auth/login",
        severity: "WARNING",
        message: `CAPTCHA check failed for login attempt from IP ${ip}: ${captchaResult.message}`,
      });
      return NextResponse.json(
        { message: captchaResult.message || "CAPTCHA verification failed." },
        { status: 400 }
      );
    }

    if (!isEmail(rawEmail) || typeof password !== "string") {
      return NextResponse.json(
        { message: "Invalid email or password credentials" },
        { status: 401 }
      );
    }

    const email = rawEmail.toLowerCase();

    let user;
    try {
      const repo = getRepository();
      const dbUser = await repo.getUserByEmail(email);

      if (!dbUser || !verifyPassword(password, dbUser.password_hash)) {
        await logSystemError({
          area: "AUTH",
          endpoint: "/api/auth/login",
          severity: "WARNING",
          message: `Failed login attempt for user ${email} from IP ${ip}`,
        });
        return NextResponse.json(
          { message: "Invalid email or password credentials" },
          { status: 401 }
        );
      }

      // Transparent upgrade: replace legacy unsalted SHA-256 hashes with scrypt.
      if (isLegacyHash(dbUser.password_hash)) {
        try {
          await repo.updatePasswordHash(dbUser.id, hashPassword(password));
          await repo.createAuditLog({
            user_id: dbUser.id,
            action: "PASSWORD_HASH_UPGRADED",
            details: "Legacy SHA-256 password hash upgraded to scrypt on login"
          });
        } catch (upgradeError: any) {
          console.error("PASSWORD REHASH ERROR:", upgradeError.message);
        }
      }

      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role
      };

      await repo.createAuditLog({
        user_id: user.id,
        action: "LOGIN_USER",
        details: `User ${user.name} logged in successfully`,
        ip_address: ip
      });
    } catch (dbError: any) {
      await logSystemError({
        area: "DATABASE",
        endpoint: "/api/auth/login",
        severity: "CRITICAL",
        message: `Database failure during login for ${email}`,
        details: dbError.message,
      });
      return NextResponse.json(
        { message: "Service temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    const token = await signSession(user);

    const res = NextResponse.json(
      { message: "Login successful", user, token },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
    for (const cookie of buildSessionCookieHeaders(token, req)) {
      res.headers.append("Set-Cookie", cookie);
    }
    return res;
  } catch (error: any) {
    await logSystemError({
      area: "SYSTEM",
      endpoint: "/api/auth/login",
      severity: "ERROR",
      message: `Unhandled exception during login: ${error.message}`,
    });
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
