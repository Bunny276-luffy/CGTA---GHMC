import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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
      // Raw SQL: Check if user exists
      const checkRes = await db.query(
        "SELECT id, email FROM users WHERE email = $1",
        [email]
      );

      if (checkRes.rowCount && checkRes.rowCount > 0) {
        return NextResponse.json(
          { message: "User with this email already exists" },
          { status: 409 }
        );
      }

      // Raw SQL: Create new user
      const insertRes = await db.query(
        "INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
        [name, email, role, hashPassword(password)]
      );

      user = insertRes.rows[0];
      
      // Log Audit Event
      await db.query(
        "INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)",
        [user.id, "REGISTER_USER", `User ${name} registered with role ${role}`]
      );

    } catch (dbError: any) {
      console.warn("PostgreSQL database not active, falling back to mock registration:", dbError.message);
      
      // Fallback user session for local demo/development
      user = {
        id: "mock-uid-" + Math.floor(Math.random() * 1000),
        email,
        name,
        role: role.toUpperCase()
      };
    }

    // Generate Token
    const mockToken = `mock-jwt-token-header.${btoa(JSON.stringify(user))}.signature`;

    return NextResponse.json(
      { 
        message: "Registration successful", 
        user,
        token: mockToken
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
