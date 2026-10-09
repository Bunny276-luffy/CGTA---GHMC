import { NextResponse } from "next/server";
import { getSessionFromRequest, toPublicUser } from "../../../../lib/session";
import { getRepository } from "../../../../lib/db";

/**
 * Returns the authenticated user for the current session (or 401).
 * Fails closed: if the account behind a still-valid token no longer exists
 * (e.g. the database was reset), the session is rejected. Responses are
 * no-store so a cached verdict can never sign someone in or out.
 */
export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { message: "Authentication required. Please sign in." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const repo = getRepository();
    const user = await repo.getUserById(session.id);
    if (!user) {
      return NextResponse.json(
        { message: "Session account no longer exists. Please sign in again." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
  } catch (dbError: any) {
    console.error("SESSION USER LOOKUP ERROR:", dbError.message);
    return NextResponse.json(
      { message: "Service temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { user: toPublicUser(session) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
