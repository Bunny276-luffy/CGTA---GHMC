import { NextResponse } from "next/server";
import { getPublicConfig } from "../../../lib/config";
import { rateLimit, getClientIp } from "../../../lib/rate-limit";
import { tooManyRequests } from "../../../lib/api-auth";

/**
 * GET /api/config
 *
 * Public, non-sensitive subset of the jurisdiction deployment profile:
 * local-body identity, service categories, SLA target hours and enabled
 * languages. Client components read this instead of embedding deployment
 * constants in the bundle.
 */
export async function GET(req: Request) {
  const limit = rateLimit(`config:${getClientIp(req)}`, 60, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    return NextResponse.json(getPublicConfig(), {
      headers: { "Cache-Control": "public, max-age=300" }
    });
  } catch (err: any) {
    console.error("PUBLIC CONFIG ERROR:", err.message);
    return NextResponse.json(
      { message: "Jurisdiction configuration unavailable." },
      { status: 503 }
    );
  }
}
