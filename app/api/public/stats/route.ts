import { NextResponse } from "next/server";
import { getRepository } from "../../../../lib/db";
import { rateLimit, getClientIp } from "../../../../lib/rate-limit";
import { tooManyRequests } from "../../../../lib/api-auth";

/**
 * GET /api/public/stats
 *
 * Public, aggregate-only transparency endpoint. Returns real counts from the
 * ledger — when the ledger is empty the numbers are zero. No personal data,
 * no fabricated figures.
 */
export async function GET(req: Request) {
  const limit = rateLimit(`public-stats:${getClientIp(req)}`, 30, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  try {
    const repo = getRepository();
    const [stats, categories, verification] = await Promise.all([
      repo.getDashboardStats(),
      repo.getCategoryStats(),
      repo.getVerificationStats()
    ]);

    return NextResponse.json({
      complaints: {
        total: stats.total,
        submitted: stats.submitted,
        assigned: stats.assigned,
        inProgress: stats.inProgress,
        resolved: stats.resolved,
        tpaReview: Math.max(0, stats.total - stats.submitted - stats.assigned - stats.inProgress - stats.resolved)
      },
      categories,
      verification: {
        evidenceAudited: verification.totalReports,
        avgTrustScore: verification.avgTrustScore,
        highTrust: verification.highTrust,
        lowTrust: verification.lowTrust,
        duplicatesFlagged: verification.duplicatesFlagged,
        manipulationFlagged: verification.manipulationFlagged
      },
      generatedAt: new Date().toISOString()
    });
  } catch (dbError: any) {
    console.error("PUBLIC STATS ERROR:", dbError.message);
    return NextResponse.json(
      { message: "Service temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
}
