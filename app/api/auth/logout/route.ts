import { NextResponse } from "next/server";
import { buildClearSessionCookieHeaders, getSessionFromRequest } from "../../../../lib/session";
import { getRepository } from "../../../../lib/db";

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req);
  if (session) {
    try {
      const repo = getRepository();
      await repo.createAuditLog({
        user_id: session.id,
        action: "LOGOUT_USER",
        details: `User ${session.name} signed out`
      });
    } catch {
      // Logout must succeed even if the audit write fails.
    }
  }

  const res = NextResponse.json(
    { message: "Signed out" },
    { headers: { "Cache-Control": "no-store" } }
  );
  for (const cookie of buildClearSessionCookieHeaders(req)) {
    res.headers.append("Set-Cookie", cookie);
  }
  return res;
}
