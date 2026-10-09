import { NextResponse } from "next/server";
import { getRepository } from "../../../lib/db";
import { requireAuth, tooManyRequests } from "../../../lib/api-auth";
import { rateLimit, getClientIp } from "../../../lib/rate-limit";

/** GET: the caller's workflow notifications (never another user's). */
export async function GET(req: Request) {
  const guard = await requireAuth(req, ["CITIZEN", "OFFICER", "ADMIN", "DEPT_HEAD"]);
  if (!guard.ok) return guard.response;

  const limit = rateLimit(`notif:${getClientIp(req)}`, 120, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const repo = getRepository();
    const rows = await repo.getNotificationsByUserId(guard.session.id, 30);
    return NextResponse.json(
      rows.map(n => ({
        id: n.id,
        message: n.message,
        read: Boolean(n.read),
        createdAt: n.created_at
      }))
    );
  } catch (dbError: any) {
    console.error("NOTIFICATIONS ERROR:", dbError.message);
    return NextResponse.json(
      { message: "Service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}

/** POST: mark the caller's notifications as read. */
export async function POST(req: Request) {
  const guard = await requireAuth(req, ["CITIZEN", "OFFICER", "ADMIN", "DEPT_HEAD"]);
  if (!guard.ok) return guard.response;

  try {
    const repo = getRepository();
    await repo.markNotificationsRead(guard.session.id);
    return NextResponse.json({ message: "Notifications marked as read" });
  } catch (dbError: any) {
    console.error("NOTIFICATIONS MARK READ ERROR:", dbError.message);
    return NextResponse.json(
      { message: "Service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
