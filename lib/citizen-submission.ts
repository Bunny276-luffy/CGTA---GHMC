/**
 * Pure client-side helper for citizen complaint submission response processing,
 * status update processing, and state transitions.
 */

import { VerificationResult } from "./verification-engine";

export interface Complaint {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  status: "SUBMITTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "TPA_REVIEW" | "CLOSED";
  severity: "EMERGENCY" | "HIGH" | "STANDARD";
  address: string;
  beforePhotoUrl: string;
  resolutionPhotoUrl?: string;
  rejectionCount: number;
  createdAt?: string;
  verificationResult?: VerificationResult;
}

export interface SubmissionDraftContext {
  title: string;
  description: string;
  category: string;
  severity: "EMERGENCY" | "HIGH" | "STANDARD";
  address: string;
  beforePhotoUrl: string;
  verificationResult?: VerificationResult | null;
}

export interface ProcessSubmissionResult {
  success: boolean;
  requiresLogin?: boolean;
  complaint?: Complaint;
  trackingId?: string;
  error?: string;
}

export interface ProcessStatusUpdateResult {
  success: boolean;
  requiresLogin?: boolean;
  status?: Complaint["status"];
  rejectionCount?: number;
  trackingId?: string;
  escalated?: boolean;
  error?: string;
}

export interface CitizenClientSubmissionState {
  complaints: Complaint[];
  successId: string | null;
  submissionError: string | null;
}

export const VALID_COMPLAINT_STATUSES = new Set([
  "SUBMITTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "TPA_REVIEW",
  "CLOSED"
]);

/**
 * Parses and validates the server submission response or fetch error.
 * Guaranteed to never fabricate IDs or create unpersisted mock complaints.
 *
 * Server-owned fields:
 * - id: Guaranteed string returned by /api/complaints/submit
 * - trackingId: Guaranteed string returned by /api/complaints/submit
 * - status: Guaranteed status ("SUBMITTED" or "TPA_REVIEW") returned by /api/complaints/submit
 *
 * Limitation note: /api/complaints/submit does not include rejectionCount or createdAt
 * in its JSON response (persisted in DB via schema defaults). If the server provides them,
 * those values are preserved; otherwise rejectionCount defaults to 0 for a new grievance,
 * and createdAt is left undefined to avoid presenting a client-generated timestamp as
 * server-confirmed data.
 */
export async function processSubmissionOutcome(
  responseOrError: { status: number; ok: boolean; json: () => Promise<any> } | Error,
  draft: SubmissionDraftContext
): Promise<ProcessSubmissionResult> {
  if (responseOrError instanceof Error) {
    return {
      success: false,
      error: responseOrError.message || "Failed to submit grievance. Please try again."
    };
  }

  const res = responseOrError;
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    return {
      success: false,
      requiresLogin: true,
      error: data.message || "Session expired. Please log in again."
    };
  }

  if (!res.ok) {
    return {
      success: false,
      error: data.message || `Server rejected submission (HTTP ${res.status})`
    };
  }

  const serverComplaint = data.complaint;
  if (
    !serverComplaint ||
    typeof serverComplaint.id !== "string" ||
    !serverComplaint.id.trim() ||
    typeof serverComplaint.trackingId !== "string" ||
    !serverComplaint.trackingId.trim() ||
    typeof serverComplaint.status !== "string" ||
    !VALID_COMPLAINT_STATUSES.has(serverComplaint.status)
  ) {
    return {
      success: false,
      error: "Server response did not include a valid registered complaint."
    };
  }

  const trackingId = serverComplaint.trackingId.trim();

  // Server-owned fields take strict precedence over draft fields.
  // Status is strictly server-assigned (SUBMITTED or TPA_REVIEW) and never defaulted.
  // createdAt is only assigned if provided by the server, avoiding presenting local timestamps as server truth.
  const serverCreatedAt = typeof serverComplaint.createdAt === "string" && serverComplaint.createdAt.trim()
    ? serverComplaint.createdAt.trim()
    : typeof serverComplaint.created_at === "string" && serverComplaint.created_at.trim()
    ? serverComplaint.created_at.trim()
    : undefined;

  const newComplaint: Complaint = {
    id: serverComplaint.id.trim(),
    trackingId,
    title: typeof serverComplaint.title === "string" && serverComplaint.title.trim()
      ? serverComplaint.title.trim()
      : draft.title,
    description: draft.description,
    category: draft.category,
    status: serverComplaint.status as Complaint["status"],
    severity: draft.severity,
    address: draft.address || "Geolocated Site, Municipal Zone",
    beforePhotoUrl: draft.beforePhotoUrl || "",
    rejectionCount: typeof serverComplaint.rejectionCount === "number" ? serverComplaint.rejectionCount : 0,
    createdAt: serverCreatedAt,
    verificationResult: serverComplaint.verificationResult || draft.verificationResult
  };

  return {
    success: true,
    complaint: newComplaint,
    trackingId
  };
}

/**
 * Parses and validates the status update response from PATCH /api/complaints/[id]/status.
 *
 * Contract:
 * - Requires a valid, server-confirmed status from VALID_COMPLAINT_STATUSES.
 * - Does not fall back to targetStatus when server omits status.
 * - Rejects malformed responses with invalid rejectionCount.
 * - If rejectionCount is omitted by the API, preserves existing complaint's rejectionCount.
 */
export async function processStatusUpdateOutcome(
  responseOrError: { status: number; ok: boolean; json: () => Promise<any> } | Error,
  currentComplaint?: Complaint | null
): Promise<ProcessStatusUpdateResult> {
  if (responseOrError instanceof Error) {
    return {
      success: false,
      error: responseOrError.message || "Failed to update resolution status. Please try again."
    };
  }

  const res = responseOrError;
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    return {
      success: false,
      requiresLogin: true,
      error: data.message || "Session expired. Please log in again."
    };
  }

  if (!res.ok) {
    return {
      success: false,
      error: data.message || `Failed to update resolution status (HTTP ${res.status})`
    };
  }

  const updatedComplaint = data.complaint;
  if (
    !updatedComplaint ||
    typeof updatedComplaint.status !== "string" ||
    !VALID_COMPLAINT_STATUSES.has(updatedComplaint.status)
  ) {
    return {
      success: false,
      error: "Server response did not include a valid confirmed grievance status."
    };
  }

  if (
    updatedComplaint.rejectionCount !== undefined &&
    typeof updatedComplaint.rejectionCount !== "number"
  ) {
    return {
      success: false,
      error: "Server response included an invalid rejection count."
    };
  }

  const finalStatus = updatedComplaint.status as Complaint["status"];
  const finalRejectionCount = typeof updatedComplaint.rejectionCount === "number"
    ? updatedComplaint.rejectionCount
    : (currentComplaint?.rejectionCount ?? 0);

  const trackingId = (typeof updatedComplaint.trackingId === "string" && updatedComplaint.trackingId.trim())
    || currentComplaint?.trackingId;

  const isEscalated = Boolean(data.escalated) || finalStatus === "TPA_REVIEW";

  return {
    success: true,
    status: finalStatus,
    rejectionCount: finalRejectionCount,
    trackingId,
    escalated: isEscalated
  };
}

/**
 * Pure state reducer applying the submission outcome to citizen client state.
 * Failed submissions leave complaints and successId untouched.
 */
export function applySubmissionOutcome(
  prevState: CitizenClientSubmissionState,
  outcome: ProcessSubmissionResult
): CitizenClientSubmissionState {
  if (outcome.requiresLogin) {
    return {
      ...prevState,
      submissionError: outcome.error || "Session expired. Please log in again."
    };
  }

  if (!outcome.success || !outcome.complaint || !outcome.trackingId) {
    return {
      ...prevState,
      submissionError: outcome.error || "Failed to submit grievance. Please try again."
    };
  }

  return {
    complaints: [outcome.complaint, ...prevState.complaints],
    successId: outcome.trackingId,
    submissionError: null
  };
}
