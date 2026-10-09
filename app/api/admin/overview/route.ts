import { NextResponse } from "next/server";
import { getRepository } from "../../../../lib/db";
import { requireAuth, tooManyRequests } from "../../../../lib/api-auth";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit";
import { runEscalationEvaluation } from "../../../../lib/escalation";

/**
 * GET /api/admin/overview
 *
 * ADMIN / DEPT_HEAD only. Bundles dashboard stats, the recent audit ledger,
 * and the user directory for the command console.
 */
export async function GET(req: Request) {
  const guard = await requireAuth(req, ["ADMIN", "DEPT_HEAD"]);
  if (!guard.ok) return guard.response;

  const limit = rateLimit(`overview:${getClientIp(req)}`, 60, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    // Escalation engine: deterministic SLA-breach evaluation runs whenever
    // governance consoles load, so escalation never depends on a cron service.
    let escalation = null;
    try {
      escalation = await runEscalationEvaluation();
    } catch (escError: any) {
      console.error("ESCALATION EVALUATION ERROR:", escError.message);
    }

    const repo = getRepository();
    const [stats, auditLogs, users, categories, verification] = await Promise.all([
      repo.getDashboardStats(),
      repo.getAuditLogs(50),
      repo.listUsers(100),
      repo.getCategoryStats(),
      repo.getVerificationStats()
    ]);

    return NextResponse.json({
      stats,
      categories,
      verification,
      escalation,
      auditLogs: auditLogs.map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        details: log.details,
        timestamp: log.timestamp
      })),
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.created_at
      }))
    });
  } catch (dbError: any) {
    console.error("ADMIN OVERVIEW ERROR:", dbError.message);
    return NextResponse.json(
      { message: "Service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
