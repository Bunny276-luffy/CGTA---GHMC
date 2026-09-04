import { NextResponse } from "next/server";
import { getRepository } from "@/lib/db";
import { hashPassword } from "@/lib/crypto";

export async function POST(req: Request) {
  try {
    const { email, password, name, role } = await req.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { message: "Missing required registration parameters" },
        { status: 400 }
      );
    }

    let user;
    try {
      const repo = getRepository();

      // Check if user exists
      const existingUser = await repo.getUserByEmail(email);

      if (existingUser) {
        return NextResponse.json(
          { message: "User with this email already exists" },
          { status: 409 }
        );
      }

      // Create new user
      user = await repo.createUser({
        name,
        email,
        role,
        password_hash: hashPassword(password)
      });
      
      // Log Audit Event
      await repo.createAuditLog({
        user_id: user.id,
        action: "REGISTER_USER",
        details: `User ${name} registered with role ${role}`
      });

    } catch (dbError: any) {
      console.error("DATABASE REGISTER ERROR:", dbError.message);
      return NextResponse.json(
        { message: "Service temporarily unavailable. Please try again." },
        { status: 503 }
      );
    }

    // Generate Token
    const mockToken = `mock-jwt-token-header.${btoa(JSON.stringify(user))}.signature`;

    const headers: Record<string, string> = {};

    return NextResponse.json(
      { 
        message: "Registration successful", 
        user,
        token: mockToken
      },
      { status: 201, headers }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
