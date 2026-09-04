import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Missing email or password credentials" },
        { status: 400 }
      );
    }

    let user;
    try {
      const repo = getRepository();
      const dbUser = await repo.getUserByEmail(email);

      if (!dbUser) {
        return NextResponse.json(
          { message: "Invalid email or password credentials" },
          { status: 401 }
        );
      }

      if (!verifyPassword(password, dbUser.password_hash)) {
        return NextResponse.json(
          { message: "Invalid email or password credentials" },
          { status: 401 }
        );
      }

      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role
      };

      // Log Audit Event
      await repo.createAuditLog({
        user_id: user.id,
        action: "LOGIN_USER",
        details: `User ${user.name} logged in successfully`
      });

    } catch (dbError: any) {
      console.error("DATABASE LOGIN ERROR:", dbError.message);
      return NextResponse.json(
        { message: "Service temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    const mockToken = `mock-jwt-token-header.${btoa(JSON.stringify(user))}.signature`;

    const headers: Record<string, string> = {};

    return NextResponse.json({
      message: "Login successful",
      user,
      token: mockToken
    }, {
      headers
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
