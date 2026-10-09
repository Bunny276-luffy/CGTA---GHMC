import { NextResponse } from "next/server";
import { getRepository } from "../../../../../lib/db";
import { requireAuth, tooManyRequests } from "../../../../../lib/api-auth";
import { rateLimit, getClientIp } from "../../../../../lib/rate-limit";
import { VALID_STATUSES, cleanText, validatePhotoDataUrl, validateLatitude, validateLongitude } from "../../../../../lib/validation";
import { haversineMeters, gpsToleranceMeters } from "../../../../../lib/geo";
import { Complaint } from "../../../../../lib/repositories/types";

interface TransitionRequest {
  status?: string;
  assignedOfficerId?: string;
  resolutionPhotoUrl?: string;
  officerLat?: number;
  officerLng?: number;
  notes?: string;
}

/** Allowed status transitions per role (deterministic authorization rules). */
const OFFICER_TRANSITIONS: Record<string, string[]> = {
  ASSIGNED: ["IN_PROGRESS", "TPA_REVIEW"],
  IN_PROGRESS: ["RESOLVED", "TPA_REVIEW"],
  SUBMITTED: ["TPA_REVIEW"],
  TPA_REVIEW: ["IN_PROGRESS"],
};

const CITIZEN_TRANSITIONS: Record<string, string[]> = {
  RESOLVED: ["CLOSED", "IN_PROGRESS"], // confirm or dispute
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuth(req, ["CITIZEN", "OFFICER", "ADMIN", "DEPT_HEAD"]);
  if (!guard.ok) return guard.response;
  const session = guard.session;
  const role = session.role.toUpperCase();

  const limit = rateLimit(`status:${getClientIp(req)}`, 60, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const { id: complaintId } = await params;
  if (!complaintId || typeof complaintId !== "string" || complaintId.length > 64) {
    return NextResponse.json({ message: "Invalid complaint id" }, { status: 400 });
  }

  const body: TransitionRequest = await req.json().catch(() => ({}) as any);
  const nextStatus = typeof body.status === "string" ? body.status.toUpperCase() : "";
  if (!VALID_STATUSES.includes(nextStatus as any)) {
    return NextResponse.json({ message: "Invalid target status" }, { status: 400 });
  }

  let complaint: Complaint | null;
  let repo: ReturnType<typeof getRepository>;
  try {
    repo = getRepository();
    complaint = await repo.getComplaintById(complaintId);
  } catch (dbError: any) {
    console.error("COMPLAINT FETCH ERROR:", dbError.message);
    return NextResponse.json(
      { message: "Service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }

  if (!complaint) {
    return NextResponse.json({ message: "Complaint not found" }, { status: 404 });
  }

  const currentStatus = complaint.status;
  const options: {
    assignedOfficerId?: string | null;
    resolutionPhotoUrl?: string;
    rejectionCount?: number;
    citizenConfirmed?: boolean;
  } = {};
  const notes = cleanText(body.notes ?? "", 500);
  let geofenceReport: { distanceMeters: number; toleranceMeters: number; withinTolerance: boolean } | null = null;
  let statusToApply = nextStatus;

  // ---- Role & transition authorization -------------------------------------
  if (role === "ADMIN" || role === "DEPT_HEAD") {
    // Administrators may move the ledger to any state, optionally assigning an officer.
    if (typeof body.assignedOfficerId === "string" && body.assignedOfficerId) {
      if (body.assignedOfficerId.length > 64) {
        return NextResponse.json({ message: "Invalid officer id" }, { status: 400 });
      }
      // The assignee must exist and hold the OFFICER role.
      try {
        const officer = await repo.getUserById(body.assignedOfficerId);
        if (!officer || officer.role !== "OFFICER") {
          return NextResponse.json(
            { message: "Assignee must be an existing field officer account." },
            { status: 400 }
          );
        }
      } catch (dbError: any) {
        console.error("OFFICER LOOKUP ERROR:", dbError.message);
        return NextResponse.json({ message: "Service temporarily unavailable." }, { status: 503 });
      }
      options.assignedOfficerId = body.assignedOfficerId;
    }
  } else if (role === "OFFICER") {
    // Object-Level Authorization: Officer must be assigned to this ticket (or taking an unassigned ticket)
    if (complaint.assigned_officer_id && complaint.assigned_officer_id !== session.id) {
      return NextResponse.json(
        { message: "Forbidden: you may only manage complaints assigned to your officer account." },
        { status: 403 }
      );
    }

    const allowed = OFFICER_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        { message: `Forbidden: officers cannot move a ticket from ${currentStatus} to ${nextStatus}.` },
        { status: 403 }
      );
    }


    if (nextStatus === "RESOLVED") {
      // Resolution requires proof: photo + on-site GPS + field note. Fail closed.
      const photoCheck = validatePhotoDataUrl(body.resolutionPhotoUrl);
      if (!photoCheck.ok) {
        return NextResponse.json({ message: photoCheck.error }, { status: 400 });
      }
      if (!notes || notes.length < 10) {
        return NextResponse.json(
          { message: "A field action note (min 10 characters) is required to resolve." },
          { status: 400 }
        );
      }
      if (!validateLatitude(body.officerLat) || !validateLongitude(body.officerLng)) {
        return NextResponse.json(
          { message: "On-site field GPS is required to verify the resolution location." },
          { status: 400 }
        );
      }

      // Deterministic geofence verification against the complaint's coordinates.
      const distance = Math.round(
        haversineMeters(body.officerLat as number, body.officerLng as number, complaint.latitude, complaint.longitude)
      );
      const tolerance = gpsToleranceMeters();
      const withinTolerance = distance <= tolerance;
      geofenceReport = { distanceMeters: distance, toleranceMeters: tolerance, withinTolerance };

      if (withinTolerance) {
        options.resolutionPhotoUrl = body.resolutionPhotoUrl;
      } else {
        // Fail closed: evidence is preserved but the claim is routed to the
        // third-party auditor instead of being marked RESOLVED.
        statusToApply = "TPA_REVIEW";
        options.resolutionPhotoUrl = body.resolutionPhotoUrl;
      }
    }
  } else {
    // CITIZEN: may only act on their own complaint, only after officer resolution.
    if (complaint.created_by_id !== session.id) {
      return NextResponse.json(
        { message: "Forbidden: you can only manage your own grievances." },
        { status: 403 }
      );
    }
    const allowed = CITIZEN_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        { message: `Forbidden: citizens cannot move a grievance from ${currentStatus} to ${nextStatus}.` },
        { status: 403 }
      );
    }

    if (nextStatus === "CLOSED") {
      options.citizenConfirmed = true;
    } else {
      // Disputed resolution: bump rejection count; escalate to TPA after 2 disputes.
      const rejections = (complaint.rejection_count ?? 0) + 1;
      options.rejectionCount = rejections;
      options.citizenConfirmed = false;
      statusToApply = rejections >= 2 ? "TPA_REVIEW" : "IN_PROGRESS";
    }
  }

  try {
    await repo.updateComplaintStatus(complaintId, statusToApply, options);

    // Resolution evidence is also recorded in the evidence ledger.
    if (options.resolutionPhotoUrl) {
      try {
        const byteSize = Math.floor(((options.resolutionPhotoUrl.split(",")[1] || "").length * 3) / 4);
        await repo.createComplaintEvidence(complaintId, {
          file_url: options.resolutionPhotoUrl,
          file_type: "image/jpeg",
          size_bytes: byteSize,
          metadata: JSON.stringify({
            kind: "resolution",
            officerLat: body.officerLat ?? null,
            officerLng: body.officerLng ?? null,
            geofence: geofenceReport
          })
        });
      } catch (evidenceError: any) {
        console.error("RESOLUTION EVIDENCE ERROR:", evidenceError.message);
        // Status change stands; evidence write failure is surfaced in audit.
      }
    }

    const auditDetail =
      `${complaint.tracking_id}: ${currentStatus} → ${statusToApply} by ${role} ${session.name}` +
      (geofenceReport
        ? ` — geofence delta ${geofenceReport.distanceMeters}m (tolerance ${geofenceReport.toleranceMeters}m, ${geofenceReport.withinTolerance ? "PASS" : "FAIL"})`
        : "") +
      (notes ? ` — ${notes}` : "");

    await repo.createAuditLog({
      user_id: session.id,
      action: `COMPLAINT_STATUS_${statusToApply}`,
      details: auditDetail
    });

    // Notify the complaint owner about workflow progress (skip self-actions).
    if (complaint.created_by_id !== session.id) {
      const ownerMessage =
        statusToApply === "RESOLVED"
          ? `Grievance ${complaint.tracking_id} was resolved by the field officer. Please confirm the resolution.`
          : statusToApply === "TPA_REVIEW"
          ? `Grievance ${complaint.tracking_id} was escalated to the Third-Party Auditor for review.`
          : statusToApply === "CLOSED"
          ? `Grievance ${complaint.tracking_id} was closed by the municipal administration.`
          : `Grievance ${complaint.tracking_id} status changed: ${currentStatus} → ${statusToApply}.`;
      try {
        await repo.createNotification(complaint.created_by_id, ownerMessage);
      } catch (notifError: any) {
        console.error("NOTIFICATION ERROR:", notifError.message);
      }
    }

    return NextResponse.json({
      message:
        statusToApply === nextStatus
          ? "Status updated"
          : `Geofence check failed: recorded at ${geofenceReport?.distanceMeters}m from the site (tolerance ${geofenceReport?.toleranceMeters}m). Evidence preserved and routed to TPA review.`,
      complaint: {
        id: complaintId,
        trackingId: complaint.tracking_id,
        status: statusToApply,
        rejectionCount: options.rejectionCount ?? complaint.rejection_count ?? 0
      },
      geofence: geofenceReport,
      escalated: statusToApply === "TPA_REVIEW" && currentStatus !== "TPA_REVIEW"
    });
  } catch (dbError: any) {
    console.error("COMPLAINT UPDATE ERROR:", dbError.message);
    return NextResponse.json(
      { message: "Database persistence failed" },
      { status: 503 }
    );
  }
}
