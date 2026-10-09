import { getRepository } from "./db";
import { evaluateSla, getJurisdictionConfig } from "./config";
import { Complaint } from "./repositories/types";

/**
 * Escalation Engine
 *
 * Deterministic, configuration-driven escalation: open complaints past their
 * configured SLA deadline are escalated to the status defined in the
 * jurisdiction deployment profile (default: third-party audit review).
 * Every escalation is recorded in the audit ledger and the grievance owner
 * is notified. Idempotent: complaints already in the breach status are
 * skipped.
 */
let escalationRunning = false;

export async function runEscalationEvaluation(): Promise<{
  checked: number;
  escalated: number;
  details: string[];
}> {
  // Concurrency guard: two admins loading consoles at once must not run
  // duplicate escalation passes against the same ledger.
  if (escalationRunning) return { checked: 0, escalated: 0, details: [] };
  escalationRunning = true;
  try {
    return await evaluate();
  } finally {
    escalationRunning = false;
  }
}

async function evaluate(): Promise<{
  checked: number;
  escalated: number;
  details: string[];
}> {
  const cfg = getJurisdictionConfig();
  const breachStatus = cfg.escalationRules.slaBreachStatus || "TPA_REVIEW";
  const repo = getRepository();

  const all: Complaint[] = await repo.getAllComplaints();
  const openStatuses = ["SUBMITTED", "ASSIGNED", "IN_PROGRESS"];
  const open = all.filter(c => openStatuses.includes(c.status));

  let escalated = 0;
  const details: string[] = [];

  for (const complaint of open) {
    if (complaint.status === breachStatus) continue;

    const sla = evaluateSla(complaint.created_at, complaint.severity);
    if (!sla || sla.state !== "OVERDUE") continue;

    await repo.updateComplaintStatus(complaint.id, breachStatus, {});

    const detail =
      `${complaint.tracking_id}: SLA breach (${sla.ageHours}h elapsed vs ${sla.deadlineHours}h policy) — ` +
      `escalated to ${breachStatus} per jurisdiction escalation rules`;
    await repo.createAuditLog({
      action: "COMPLAINT_SLA_ESCALATED",
      details: detail
    });

    try {
      await repo.createNotification(
        complaint.created_by_id,
        `Grievance ${complaint.tracking_id} exceeded its ${sla.deadlineHours}h resolution target and was escalated to audit review.`
      );
    } catch {
      // Escalation must not fail if the notification write fails.
    }

    escalated += 1;
    details.push(detail);
  }

  return { checked: open.length, escalated, details };
}
