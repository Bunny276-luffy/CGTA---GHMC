import assert from "assert";
import Database from "better-sqlite3";
import path from "path";
import { randomBytes } from "crypto";
import { evaluateSla, getJurisdictionConfig, getSlaPolicy } from "../lib/config";
import { runEscalationEvaluation } from "../lib/escalation";
import { getRepository } from "../lib/db";
import { signSession } from "../lib/session";
import { GET as adminOverviewHandler } from "../app/api/admin/overview/route";

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "civictrust-test-auth-secret-32chars-minimum";

async function runSlaTestSuite() {
  console.log("=== CivicTrust SLA Escalation & Operational Readiness Test Suite ===");

  let passedCount = 0;
  let failedCount = 0;

  function assertTest(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ Passed: ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ Failed: ${testName}${details ? ` — ${details}` : ""}`);
      failedCount++;
    }
  }

  // =========================================================================
  // Part 1: SLA Evaluation Unit Tests (Boundaries & Edge Cases)
  // =========================================================================
  console.log("\n--- Part 1: SLA Evaluation Unit Tests & Boundary Conditions ---");

  // 1.1 Invalid / missing dates
  assertTest(evaluateSla(undefined, "STANDARD") === null, "evaluateSla(undefined) returns null");
  assertTest(evaluateSla("", "STANDARD") === null, "evaluateSla('') returns null");
  assertTest(evaluateSla("invalid-date-string", "STANDARD") === null, "evaluateSla(invalid-date) returns null");

  // 1.2 Policy lookup
  const emergencyPolicy = getSlaPolicy("EMERGENCY");
  assertTest(emergencyPolicy.hours === 24, "EMERGENCY policy deadline is 24 hours");
  const highPolicy = getSlaPolicy("HIGH");
  assertTest(highPolicy.hours === 72, "HIGH policy deadline is 72 hours");
  const standardPolicy = getSlaPolicy("STANDARD");
  assertTest(standardPolicy.hours === 168, "STANDARD policy deadline is 168 hours");
  const defaultPolicy = getSlaPolicy("UNKNOWN_SEVERITY");
  assertTest(defaultPolicy.hours === 168, "Fallback severity policy defaults to 168 hours");

  // 1.3 Boundary calculation for EMERGENCY (24h, warn @ 75% = 18h)
  const now = Date.now();
  const emOnTrack = evaluateSla(new Date(now - 10 * 3600000).toISOString(), "EMERGENCY");
  assertTest(emOnTrack?.state === "ON_TRACK", "EMERGENCY at 10h is ON_TRACK");
  const emWarning = evaluateSla(new Date(now - 18 * 3600000).toISOString(), "EMERGENCY");
  assertTest(emWarning?.state === "WARNING", "EMERGENCY at 18h (75%) is WARNING");
  const emOverdue = evaluateSla(new Date(now - 24.1 * 3600000).toISOString(), "EMERGENCY");
  assertTest(emOverdue?.state === "OVERDUE", "EMERGENCY at 24.1h is OVERDUE");

  // 1.4 Boundary calculation for HIGH (72h, warn @ 75% = 54h)
  const highOnTrack = evaluateSla(new Date(now - 50 * 3600000).toISOString(), "HIGH");
  assertTest(highOnTrack?.state === "ON_TRACK", "HIGH at 50h is ON_TRACK");
  const highWarning = evaluateSla(new Date(now - 54 * 3600000).toISOString(), "HIGH");
  assertTest(highWarning?.state === "WARNING", "HIGH at 54h (75%) is WARNING");
  const highOverdue = evaluateSla(new Date(now - 72.5 * 3600000).toISOString(), "HIGH");
  assertTest(highOverdue?.state === "OVERDUE", "HIGH at 72.5h is OVERDUE");

  // 1.5 Boundary calculation for STANDARD (168h, warn @ 75% = 126h)
  const stdOnTrack = evaluateSla(new Date(now - 100 * 3600000).toISOString(), "STANDARD");
  assertTest(stdOnTrack?.state === "ON_TRACK", "STANDARD at 100h is ON_TRACK");
  const stdWarning = evaluateSla(new Date(now - 126 * 3600000).toISOString(), "STANDARD");
  assertTest(stdWarning?.state === "WARNING", "STANDARD at 126h (75%) is WARNING");
  const stdOverdue = evaluateSla(new Date(now - 169 * 3600000).toISOString(), "STANDARD");
  assertTest(stdOverdue?.state === "OVERDUE", "STANDARD at 169h is OVERDUE");

  // 1.6 SQLite UTC timestamp format normalization ("YYYY-MM-DD HH:MM:SS")
  const sqliteUtcString = new Date(now - 200 * 3600000).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
  const sqliteParsed = evaluateSla(sqliteUtcString, "STANDARD");
  assertTest(sqliteParsed?.state === "OVERDUE", "SQLite space-separated UTC timestamp evaluated correctly as OVERDUE");
  assertTest(Math.abs((sqliteParsed?.ageHours || 0) - 200) <= 0.5, "SQLite timestamp ageHours matches UTC elapsed time");

  // =========================================================================
  // Part 2: Escalation Engine State Machine & Persistence Tests
  // =========================================================================
  console.log("\n--- Part 2: Escalation Engine State Transitions & Persistence ---");

  const runId = randomBytes(4).toString("hex");
  const dbPath = path.join(process.cwd(), "data", "civictrust.db");
  const directDb = new Database(dbPath);
  const repo = getRepository();

  const testCitizenId = `user-sla-citizen-${runId}`;
  const testAdminId = `user-sla-admin-${runId}`;
  const createdComplaintIds: string[] = [];

  try {
    // 2.1 Provision test users
    directDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(testCitizenId, `citizen-${runId}@civictrust.test`, "mock-hash", "SLA Citizen", "CITIZEN");

    directDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(testAdminId, `admin-${runId}@civictrust.test`, "mock-hash", "SLA Admin", "ADMIN");

    // Helper to insert test complaints with controlled timestamps and statuses
    const insertTestComplaint = (opts: {
      suffix: string;
      status: string;
      severity: string;
      ageHours: number;
    }): string => {
      const id = `cmp-sla-${runId}-${opts.suffix}`;
      const trackingId = `CGTA-2026-${randomBytes(3).toString("hex").toUpperCase()}`;
      const createdUtc = new Date(Date.now() - opts.ageHours * 3600000)
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d{3}Z$/, "");

      directDb.prepare(`
        INSERT INTO complaints (
          id, tracking_id, title, description, category, status,
          latitude, longitude, address, severity, created_by_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        trackingId,
        `SLA Test Complaint ${opts.suffix}`,
        "Automated SLA evaluation test complaint",
        "Roads & Potholes",
        opts.status,
        17.43,
        78.41,
        "Test Address Jubilee Hills",
        opts.severity,
        testCitizenId,
        createdUtc,
        createdUtc
      );
      createdComplaintIds.push(id);
      return id;
    }

    // Set up test matrix:
    // C1: SUBMITTED, STANDARD, 2 hours old -> NOT OVERDUE (remain SUBMITTED)
    const idC1 = insertTestComplaint({ suffix: "recent-sub", status: "SUBMITTED", severity: "STANDARD", ageHours: 2 });
    // C2: SUBMITTED, STANDARD, 130 hours old -> WARNING (remain SUBMITTED)
    const idC2 = insertTestComplaint({ suffix: "warning-sub", status: "SUBMITTED", severity: "STANDARD", ageHours: 130 });
    // C3: SUBMITTED, STANDARD, 200 hours old -> OVERDUE (must escalate to TPA_REVIEW)
    const idC3 = insertTestComplaint({ suffix: "overdue-sub", status: "SUBMITTED", severity: "STANDARD", ageHours: 200 });
    // C4: ASSIGNED, HIGH, 80 hours old -> OVERDUE (must escalate to TPA_REVIEW)
    const idC4 = insertTestComplaint({ suffix: "overdue-asg", status: "ASSIGNED", severity: "HIGH", ageHours: 80 });
    // C5: IN_PROGRESS, EMERGENCY, 30 hours old -> OVERDUE (must escalate to TPA_REVIEW)
    const idC5 = insertTestComplaint({ suffix: "overdue-inp", status: "IN_PROGRESS", severity: "EMERGENCY", ageHours: 30 });
    // C6: RESOLVED, 250 hours old -> OVERDUE AGE, but status is terminal/non-open (must remain RESOLVED)
    const idC6 = insertTestComplaint({ suffix: "resolved-old", status: "RESOLVED", severity: "STANDARD", ageHours: 250 });
    // C7: CLOSED, 300 hours old -> OVERDUE AGE, but status is terminal (must remain CLOSED)
    const idC7 = insertTestComplaint({ suffix: "closed-old", status: "CLOSED", severity: "STANDARD", ageHours: 300 });
    // C8: TPA_REVIEW, 250 hours old -> already in breach status (must remain TPA_REVIEW without re-escalation)
    const idC8 = insertTestComplaint({ suffix: "tpa-old", status: "TPA_REVIEW", severity: "STANDARD", ageHours: 250 });

    // Execute SLA evaluation
    console.log("Executing runEscalationEvaluation()...");
    const result1 = await runEscalationEvaluation();
    console.log(`runEscalationEvaluation result: checked=${result1.checked}, escalated=${result1.escalated}`);

    assertTest(result1.escalated >= 3, `Escalated at least 3 complaints (reported: ${result1.escalated})`);

    // Verify persisted states
    const c1 = await repo.getComplaintById(idC1);
    assertTest(c1?.status === "SUBMITTED", "Recent complaint C1 remains SUBMITTED");

    const c2 = await repo.getComplaintById(idC2);
    assertTest(c2?.status === "SUBMITTED", "Warning complaint C2 remains SUBMITTED");

    const c3 = await repo.getComplaintById(idC3);
    assertTest(c3?.status === "TPA_REVIEW", "Overdue SUBMITTED complaint C3 escalated to TPA_REVIEW");

    const c4 = await repo.getComplaintById(idC4);
    assertTest(c4?.status === "TPA_REVIEW", "Overdue ASSIGNED complaint C4 escalated to TPA_REVIEW");

    const c5 = await repo.getComplaintById(idC5);
    assertTest(c5?.status === "TPA_REVIEW", "Overdue IN_PROGRESS complaint C5 escalated to TPA_REVIEW");

    const c6 = await repo.getComplaintById(idC6);
    assertTest(c6?.status === "RESOLVED", "Aged RESOLVED complaint C6 remains RESOLVED");

    const c7 = await repo.getComplaintById(idC7);
    assertTest(c7?.status === "CLOSED", "Aged CLOSED complaint C7 remains CLOSED");

    const c8 = await repo.getComplaintById(idC8);
    assertTest(c8?.status === "TPA_REVIEW", "Pre-existing TPA_REVIEW complaint C8 remains TPA_REVIEW");

    // =========================================================================
    // Part 3: Audit Ledger & Notification Persistence
    // =========================================================================
    console.log("\n--- Part 3: Audit Ledger & Notification Persistence ---");

    const auditLogs = await repo.getAuditLogs(100);
    const c3Audit = auditLogs.find((l: any) => l.action === "COMPLAINT_SLA_ESCALATED" && l.details?.includes(c3?.tracking_id || ""));
    assertTest(!!c3Audit, "Audit log created for C3 with action COMPLAINT_SLA_ESCALATED");
    assertTest(Boolean(c3Audit?.details?.includes("escalated to TPA_REVIEW")), "Audit log notes destination status TPA_REVIEW");

    const c4Audit = auditLogs.find((l: any) => l.action === "COMPLAINT_SLA_ESCALATED" && l.details?.includes(c4?.tracking_id || ""));
    assertTest(!!c4Audit, "Audit log created for C4 with action COMPLAINT_SLA_ESCALATED");

    const c5Audit = auditLogs.find((l: any) => l.action === "COMPLAINT_SLA_ESCALATED" && l.details?.includes(c5?.tracking_id || ""));
    assertTest(!!c5Audit, "Audit log created for C5 with action COMPLAINT_SLA_ESCALATED");

    // Notifications verification
    const notifications = directDb.prepare("SELECT * FROM notifications WHERE user_id = ?").all(testCitizenId) as any[];
    assertTest(notifications.length >= 3, `Notifications created for owner of breached complaints (found: ${notifications.length})`);
    const c3Notif = notifications.find(n => n.message?.includes(c3?.tracking_id));
    assertTest(!!c3Notif, "Notification contains tracking ID of escalated complaint");

    // =========================================================================
    // Part 4: Idempotency & Repeated Evaluation
    // =========================================================================
    console.log("\n--- Part 4: Idempotency & Repeated Evaluation ---");

    const initialAuditCount = directDb.prepare("SELECT COUNT(*) as cnt FROM audit_logs WHERE action = 'COMPLAINT_SLA_ESCALATED'").get() as any;

    const result2 = await runEscalationEvaluation();
    console.log(`Repeated runEscalationEvaluation result: checked=${result2.checked}, escalated=${result2.escalated}`);

    assertTest(result2.escalated === 0, "Repeated escalation evaluation escalated 0 complaints (idempotent)");

    const secondAuditCount = directDb.prepare("SELECT COUNT(*) as cnt FROM audit_logs WHERE action = 'COMPLAINT_SLA_ESCALATED'").get() as any;
    assertTest(initialAuditCount.cnt === secondAuditCount.cnt, "No duplicate audit logs created on repeated evaluation pass");

    // =========================================================================
    // Part 5: Integration with GET /api/admin/overview
    // =========================================================================
    console.log("\n--- Part 5: Integration with GET /api/admin/overview ---");

    // Insert another overdue complaint to verify overview route auto-triggers escalation
    const idOverviewCmp = insertTestComplaint({ suffix: "overview-sub", status: "SUBMITTED", severity: "STANDARD", ageHours: 210 });
    const adminToken = await signSession({ id: testAdminId, email: `admin-${runId}@civictrust.test`, name: "SLA Admin", role: "ADMIN" });

    const overviewReq = new Request("http://localhost:3000/api/admin/overview", {
      method: "GET",
      headers: {
        cookie: `civictrust_session_v2=${encodeURIComponent(adminToken)}`,
        "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200 + 10)}`
      }
    });

    const overviewRes = await adminOverviewHandler(overviewReq);
    assertTest(overviewRes.status === 200, "GET /api/admin/overview returned HTTP 200");
    const overviewData = await overviewRes.json();

    assertTest(overviewData.escalation !== null, "Admin overview response includes escalation execution block");
    assertTest(overviewData.escalation.escalated >= 1, `Admin overview escalated overdue complaint (escalated: ${overviewData.escalation.escalated})`);

    const overviewCmpAfter = await repo.getComplaintById(idOverviewCmp);
    assertTest(overviewCmpAfter?.status === "TPA_REVIEW", "Overview-triggered complaint transitioned to TPA_REVIEW");

    const overviewAudit = overviewData.auditLogs?.find((l: any) => l.action === "COMPLAINT_SLA_ESCALATED" && l.details?.includes(overviewCmpAfter?.tracking_id));
    assertTest(!!overviewAudit, "Admin overview returned audit log entry for the auto-escalated complaint");

  } finally {
    // =========================================================================
    // Cleanup: Guaranteed removal of all test records
    // =========================================================================
    console.log("\n--- Cleaning up test records ---");
    try {
      if (createdComplaintIds.length > 0) {
        for (const cid of createdComplaintIds) {
          directDb.prepare("DELETE FROM audit_logs WHERE details LIKE ?").run(`%${cid}%`);
          directDb.prepare("DELETE FROM notifications WHERE message LIKE ?").run(`%${cid}%`);
          directDb.prepare("DELETE FROM evidence WHERE complaint_id = ?").run(cid);
          directDb.prepare("DELETE FROM ai_reports WHERE complaint_id = ?").run(cid);
          directDb.prepare("DELETE FROM complaints WHERE id = ?").run(cid);
        }
      }
      directDb.prepare("DELETE FROM audit_logs WHERE user_id IN (?, ?)").run(testCitizenId, testAdminId);
      directDb.prepare("DELETE FROM notifications WHERE user_id IN (?, ?)").run(testCitizenId, testAdminId);
      directDb.prepare("DELETE FROM users WHERE id IN (?, ?)").run(testCitizenId, testAdminId);
      directDb.close();
      console.log(`✅ Cleaned up ${createdComplaintIds.length} test complaints and test users.`);
    } catch (cleanupErr: any) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }

  console.log("\n========================================================");
  console.log(`Test Suite Summary: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("========================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSlaTestSuite().catch((err: any) => {
  console.error("Unhandled error in SLA test suite:", err);
  process.exit(1);
});
