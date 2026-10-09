import { NextResponse } from "next/server";
import { getSessionFromRequest, SessionPayload } from "./session";

/**
 * Route-level authorization guard for API handlers.
 * Returns the session when the caller holds one of the allowed roles,
 * otherwise a ready-to-return 401/403 NextResponse.
 */
export async function requireAuth(
  req: Request,
  allowedRoles: string[]
): Promise<{ ok: true; session: SessionPayload } | { ok: false; response: NextResponse }> {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Authentication required. Please sign in." },
        { status: 401 }
      ),
    };
  }

  const role = session.role?.toUpperCase();
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Forbidden: your role does not have access to this resource." },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session };
}

/** Standard 429 response for rate-limited requests. */
export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { message: `Too many requests. Please retry in ${retryAfterSeconds}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
