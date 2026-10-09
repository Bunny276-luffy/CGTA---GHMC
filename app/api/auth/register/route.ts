import { NextResponse } from "next/server";
import { getRepository } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/crypto";
import { buildSessionCookieHeaders, signSession } from "../../../../lib/session";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit";
import { isEmail, validatePasswordPolicy, cleanText } from "../../../../lib/validation";
import { verifyCaptchaToken } from "../../../../lib/captcha";
import { logSystemError } from "../../../../lib/error-logger";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}) as any);
    const { email: rawEmail, password, name: rawName, captchaToken } = body;
    const requestedRole = typeof body.role === "string" ? body.role.toUpperCase() : "CITIZEN";

    const role = requestedRole === "CITIZEN" ? "CITIZEN" : null;
    if (!role) {
      return NextResponse.json(
        { message: "Forbidden: self-registration is available for citizen accounts only." },
        { status: 403 }
      );
    }

    const limit = rateLimit(`register:ip:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { message: `Too many registration attempts. Please retry in ${limit.retryAfterSeconds}s.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }

    // CAPTCHA Bot Protection
    const captchaResult = await verifyCaptchaToken(captchaToken, ip);
    if (!captchaResult.ok) {
      await logSystemError({
        area: "AUTH",
        endpoint: "/api/auth/register",
        severity: "WARNING",
        message: `CAPTCHA check failed during registration from IP ${ip}: ${captchaResult.message}`,
      });
      return NextResponse.json(
        { message: captchaResult.message || "CAPTCHA verification failed." },
        { status: 400 }
      );
    }

    const name = cleanText(rawName, 100);
    if (!name) {
      return NextResponse.json({ message: "A valid full name is required" }, { status: 400 });
    }
    if (!isEmail(rawEmail)) {
      return NextResponse.json({ message: "A valid email address is required" }, { status: 400 });
    }
    if (!validatePasswordPolicy(password)) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters and contain letters and numbers" },
        { status: 400 }
      );
    }

    const email = rawEmail.toLowerCase();

    let user;
    try {
      const repo = getRepository();

      const existingUser = await repo.getUserByEmail(email);
      if (existingUser) {
        return NextResponse.json(
          { message: "User with this email already exists" },
          { status: 409 }
        );
      }

      const createdUser = await repo.createUser({
        name,
        email,
        role,
        password_hash: hashPassword(password)
      });

      user = {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        role: createdUser.role
      };

      await repo.createAuditLog({
        user_id: user.id,
        action: "REGISTER_USER",
        details: `Citizen ${name} registered`,
        ip_address: ip
      });
    } catch (dbError: any) {
      await logSystemError({
        area: "DATABASE",
        endpoint: "/api/auth/register",
        severity: "CRITICAL",
        message: `Database failure during registration for ${email}`,
        details: dbError.message,
      });
      return NextResponse.json(
        { message: "Service temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    const token = await signSession(user);

    const res = NextResponse.json(
      {
        message: "Registration successful",
        user,
        token
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
    for (const cookie of buildSessionCookieHeaders(token, req)) {
      res.headers.append("Set-Cookie", cookie);
    }
    return res;
  } catch (error: any) {
    await logSystemError({
      area: "SYSTEM",
      endpoint: "/api/auth/register",
      severity: "ERROR",
      message: `Unhandled exception during registration: ${error.message}`,
    });
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
