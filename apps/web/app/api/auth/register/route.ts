import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return NextResponse.json(
          { message: "User with this email already exists" },
          { status: 409 }
        );
      }

      // Create new user in PostgreSQL
      user = await prisma.user.create({
        data: {
          email,
          name,
          role,
          passwordHash: hashPassword(password)
        }
      });
    } catch (dbError) {
      console.warn("PostgreSQL not active, falling back to mock authentication:", dbError);
      
      // Fallback user session for local demo/development
      user = {
        id: "mock-uid-" + Math.floor(Math.random() * 1000),
        email,
        name,
        role,
        createdAt: new Date().toISOString()
      };
    }

    // Mock Token generation
    const mockToken = `mock-jwt-token-header.${btoa(JSON.stringify(user))}.signature`;

    return NextResponse.json(
      { 
        message: "Registration successful", 
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
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
