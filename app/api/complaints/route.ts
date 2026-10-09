import { NextResponse } from "next/server";
import { getRepository } from "../../../lib/db";
import { requireAuth, tooManyRequests } from "../../../lib/api-auth";
import { rateLimit, getClientIp } from "../../../lib/rate-limit";
import { Complaint } from "../../../lib/repositories/types";
import { evaluateSla, getDepartmentForCategory } from "../../../lib/config";

function serializeComplaint(c: Complaint) {
  return {
    id: c.id,
    trackingId: c.tracking_id,
    title: c.title,
    description: c.description,
    category: c.category,
    status: c.status,
    severity: c.severity,
    address: c.address,
    latitude: c.latitude,
    longitude: c.longitude,
    anonymous: Boolean(c.anonymous),
    beforePhotoUrl: c.before_photo_url,
    resolutionPhotoUrl: c.resolution_photo_url,
    rejectionCount: c.rejection_count ?? 0,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    createdById: c.created_by_id,
    assignedOfficerId: c.assigned_officer_id,
    sla: evaluateSla(c.created_at, c.severity),
    suggestedDepartment: getDepartmentForCategory(c.category)?.name ?? null
  };
}

/**
 * GET /api/complaints?scope=mine|assigned|all
 *
 * Role-scoped listing. The session role caps what can be requested:
 * - CITIZEN: own complaints (scope ignored)
 * - OFFICER: complaints assigned to them (scope ignored)
 * - ADMIN / DEPT_HEAD: every complaint in the ledger
 */
export async function GET(req: Request) {
  const guard = await requireAuth(req, ["CITIZEN", "OFFICER", "ADMIN", "DEPT_HEAD"]);
  if (!guard.ok) return guard.response;
  const session = guard.session;

  const limit = rateLimit(`list:${getClientIp(req)}`, 120, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const repo = getRepository();
    const role = session.role.toUpperCase();

    let complaints: Complaint[];
    if (role === "OFFICER") {
      complaints = await repo.getComplaintsByOfficerId(session.id);
    } else if (role === "ADMIN" || role === "DEPT_HEAD") {
      complaints = await repo.getAllComplaints();
    } else {
      complaints = await repo.getComplaintsByUserId(session.id);
    }

    return NextResponse.json(complaints.map(serializeComplaint));
  } catch (dbError: any) {
    console.error("COMPLAINTS LIST ERROR:", dbError.message);
    return NextResponse.json(
      { message: "Service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
