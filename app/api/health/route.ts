import { NextResponse } from "next/server";
import { getRepository } from "../../../lib/db";

/**
 * GET /api/health
 * Minimal public health ping for uptime monitoring.
 */
export async function GET() {
  try {
    const repo = getRepository();
    const dbHealth = await repo.checkHealth();

    if (!dbHealth.ok) {
      return NextResponse.json(
        { status: "DEGRADED", database: "UNAVAILABLE", timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "HEALTHY",
      database: "CONNECTED",
      provider: dbHealth.provider,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      { status: "DEGRADED", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
