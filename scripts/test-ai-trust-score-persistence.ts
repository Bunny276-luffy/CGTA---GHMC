import assert from "assert";
import Database from "better-sqlite3";
import path from "path";
import { randomBytes } from "crypto";
import { SQLiteRepository } from "../lib/repositories/sqlite";
import { PostgresRepository, resetPool } from "../lib/repositories/postgres";
import { Pool } from "pg";

async function runRegressionTestSuite() {
  console.log("=== CivicTrust AI Trust Score Persistence Regression Test Suite ===");

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
  // Part 1: SQLite Repository Persistence Tests (Live Database)
  // =========================================================================
  console.log("\n--- Part 1: SQLite Repository Trust Score Persistence ---");

  const testRunId = randomBytes(6).toString("hex");
  const sqliteRepo = new SQLiteRepository();
  const dbPath = path.join(process.cwd(), "data", "civictrust.db");
  const directDb = new Database(dbPath);

  let createdUserId: string | null = null;
  const createdComplaintIds: string[] = [];
  const createdReportIds: string[] = [];

  try {
    // 1. Create a dedicated test user to satisfy foreign keys
    const testUserEmail = `test-trust-${testRunId}@civictrust.local`;
    const testUser = await sqliteRepo.createUser({
      name: `Trust Test Citizen ${testRunId}`,
      email: testUserEmail,
      role: "CITIZEN",
      password_hash: "mock-hash",
    });
    createdUserId = testUser.id;

    // Get baseline stats before creating new reports
    const baselineStats = await sqliteRepo.getVerificationStats();

    // -----------------------------------------------------------------------
    // Test 1.1: Explicit trust_score: 0 persistence
    // -----------------------------------------------------------------------
    const complaint1 = await sqliteRepo.createComplaint({
      title: `Zero Trust Test Complaint 1 [${testRunId}]`,
      description: "Evidence failed verification",
      category: "Roads & Potholes",
      address: "Begumpet Main Road",
      latitude: 17.444,
      longitude: 78.466,
      severity: "HIGH",
      anonymous: false,
      status: "TPA_REVIEW",
      created_by_id: testUser.id,
    });
    createdComplaintIds.push(complaint1.id);

    const report1 = await sqliteRepo.createAIReport({
      complaint_id: complaint1.id,
      duplicate_detected: false,
      forgery_score: 85.0,
      trust_score: 0,
      explainable_report: "Corrupt or invalid image buffer",
      priority_predicted: "HIGH",
      image_sha256: "mock-sha-0",
      image_phash: "mock-phash-0",
    });
    createdReportIds.push(report1.id);

    assertTest(
      report1.trust_score === 0,
      "SQLite 1.1a: createAIReport returns trust_score: 0 in memory",
      `Expected 0, got ${report1.trust_score}`
    );

    const read1 = await sqliteRepo.getAIReportByComplaintId(complaint1.id);
    assertTest(
      read1 !== null && read1.trust_score === 0,
      "SQLite 1.1b: getAIReportByComplaintId retrieves persisted trust_score as exactly 0",
      `Expected 0, got ${read1?.trust_score}`
    );

    const directRow1 = directDb
      .prepare("SELECT trust_score FROM ai_reports WHERE id = ?")
      .get(report1.id) as { trust_score: number } | undefined;
    assertTest(
      directRow1 !== undefined && directRow1.trust_score === 0,
      "SQLite 1.1c: Direct database SELECT confirms trust_score is stored as 0 (not 100)",
      `Expected 0, got ${directRow1?.trust_score}`
    );

    // -----------------------------------------------------------------------
    // Test 1.2: Missing trust_score receives intended default of 100
    // -----------------------------------------------------------------------
    const complaint2 = await sqliteRepo.createComplaint({
      title: `Missing Trust Test Complaint 2 [${testRunId}]`,
      description: "Default trust score test",
      category: "Garbage & Waste",
      address: "Banjara Hills Rd 12",
      latitude: 17.412,
      longitude: 78.435,
      severity: "STANDARD",
      anonymous: false,
      status: "SUBMITTED",
      created_by_id: testUser.id,
    });
    createdComplaintIds.push(complaint2.id);

    const report2 = await sqliteRepo.createAIReport({
      complaint_id: complaint2.id,
      duplicate_detected: false,
      forgery_score: 0.0,
      explainable_report: "Default score fallback",
      priority_predicted: "STANDARD",
      image_sha256: "mock-sha-100",
      image_phash: "mock-phash-100",
    });
    createdReportIds.push(report2.id);

    assertTest(
      report2.trust_score === 100.0,
      "SQLite 1.2a: createAIReport returns default trust_score: 100.0 when omitted",
      `Expected 100, got ${report2.trust_score}`
    );

    const read2 = await sqliteRepo.getAIReportByComplaintId(complaint2.id);
    assertTest(
      read2 !== null && read2.trust_score === 100.0,
      "SQLite 1.2b: getAIReportByComplaintId retrieves default trust_score as 100.0",
      `Expected 100, got ${read2?.trust_score}`
    );

    const directRow2 = directDb
      .prepare("SELECT trust_score FROM ai_reports WHERE id = ?")
      .get(report2.id) as { trust_score: number } | undefined;
    assertTest(
      directRow2 !== undefined && directRow2.trust_score === 100.0,
      "SQLite 1.2c: Direct database SELECT confirms missing score defaults to 100.0",
      `Expected 100, got ${directRow2?.trust_score}`
    );

    // -----------------------------------------------------------------------
    // Test 1.3: Fractional score (45.5) persists without corruption
    // -----------------------------------------------------------------------
    const complaint3 = await sqliteRepo.createComplaint({
      title: `Fractional Trust Test Complaint 3 [${testRunId}]`,
      description: "Fractional score test",
      category: "Street Lighting & Electrical",
      address: "Secunderabad",
      latitude: 17.439,
      longitude: 78.498,
      severity: "STANDARD",
      anonymous: false,
      status: "SUBMITTED",
      created_by_id: testUser.id,
    });
    createdComplaintIds.push(complaint3.id);

    const report3 = await sqliteRepo.createAIReport({
      complaint_id: complaint3.id,
      trust_score: 45.5,
      explainable_report: "Moderate trust score",
    });
    createdReportIds.push(report3.id);

    const read3 = await sqliteRepo.getAIReportByComplaintId(complaint3.id);
    assertTest(
      read3 !== null && read3.trust_score === 45.5,
      "SQLite 1.3: Fractional trust_score (45.5) persists accurately",
      `Expected 45.5, got ${read3?.trust_score}`
    );

    // -----------------------------------------------------------------------
    // Test 1.4: Verification statistics correctly classify zero score as lowTrust
    // -----------------------------------------------------------------------
    const updatedStats = await sqliteRepo.getVerificationStats();
    const lowTrustDelta = updatedStats.lowTrust - baselineStats.lowTrust;
    const highTrustDelta = updatedStats.highTrust - baselineStats.highTrust;

    // Report 1 has trust_score: 0 (< 70 -> lowTrust)
    // Report 2 has trust_score: 100 (>= 70 -> highTrust)
    // Report 3 has trust_score: 45.5 (< 70 -> lowTrust)
    assertTest(
      lowTrustDelta === 2,
      "SQLite 1.4a: Verification stats classify trust_score: 0 and 45.5 as lowTrust (+2)",
      `Expected lowTrust delta 2, got ${lowTrustDelta}`
    );
    assertTest(
      highTrustDelta === 1,
      "SQLite 1.4b: Verification stats classify default trust_score: 100 as highTrust (+1)",
      `Expected highTrust delta 1, got ${highTrustDelta}`
    );

  } finally {
    // Pinpoint cleanup: ensure test artifacts do not pollute the database
    for (const reportId of createdReportIds) {
      directDb.prepare("DELETE FROM ai_reports WHERE id = ?").run(reportId);
    }
    for (const complaintId of createdComplaintIds) {
      directDb.prepare("DELETE FROM complaints WHERE id = ?").run(complaintId);
    }
    if (createdUserId) {
      directDb.prepare("DELETE FROM users WHERE id = ?").run(createdUserId);
    }
    directDb.close();
  }

  // =========================================================================
  // Part 2: PostgreSQL Repository Tests (Query Parameter Binding & Defaults)
  // =========================================================================
  console.log("\n--- Part 2: PostgreSQL Repository Trust Score Binding ---");

  try {
    await resetPool();

    const capturedQueries: { text: string; values?: any[] }[] = [];
    const inMemoryReports = new Map<string, any>();

    const mockPool = {
      query: async (queryText: string, values?: any[]) => {
        capturedQueries.push({ text: queryText, values });

        if (queryText.includes("INSERT INTO ai_reports")) {
          const reportRow = {
            id: `pg-ai-${randomBytes(4).toString("hex")}`,
            complaint_id: values?.[0],
            exif_data: values?.[1] ? JSON.parse(values[1]) : null,
            duplicate_detected: values?.[2],
            duplicate_parent_id: values?.[3],
            forgery_score: values?.[4],
            trust_score: values?.[5],
            explainable_report: values?.[6],
            priority_predicted: values?.[7],
            image_sha256: values?.[8],
            image_phash: values?.[9],
            checked_at: new Date().toISOString(),
          };
          inMemoryReports.set(reportRow.complaint_id, reportRow);
          return { rows: [reportRow] };
        }

        if (queryText.includes("SELECT * FROM ai_reports WHERE complaint_id = $1")) {
          const complaintId = values?.[0];
          const found = inMemoryReports.get(complaintId);
          return { rows: found ? [found] : [] };
        }

        return { rows: [] };
      },
      on: () => {},
      end: async () => {},
      ending: false,
      ended: false,
    };

    global.__civictrust_pg_pool__ = mockPool as unknown as Pool;
    const pgRepo = new PostgresRepository();

    // -----------------------------------------------------------------------
    // Test 2.1: PostgreSQL trust_score: 0 binds as 0 in INSERT query
    // -----------------------------------------------------------------------
    capturedQueries.length = 0;
    const pgReport1 = await pgRepo.createAIReport({
      complaint_id: "pg-cmp-zero-trust",
      duplicate_detected: false,
      forgery_score: 90.0,
      trust_score: 0,
      explainable_report: "Tampered EXIF metadata",
      priority_predicted: "HIGH",
    });

    const insertQuery1 = capturedQueries.find((q) => q.text.includes("INSERT INTO ai_reports"));
    assertTest(
      !!insertQuery1,
      "Postgres 2.1a: Executed INSERT INTO ai_reports query",
      "No INSERT query captured"
    );

    // In INSERT query: (complaint_id, exif_data, duplicate_detected, duplicate_parent_id, forgery_score, trust_score, ...)
    // values: [$1, $2, $3, $4, $5, $6, ...]
    // $6 (index 5) corresponds to trust_score
    const boundTrustScore1 = insertQuery1?.values?.[5];
    assertTest(
      boundTrustScore1 === 0,
      "Postgres 2.1b: Bound trust_score parameter ($6) is strictly 0 (not 100)",
      `Expected 0, got ${boundTrustScore1}`
    );

    assertTest(
      pgReport1.trust_score === 0,
      "Postgres 2.1c: Returned AIReport row has trust_score: 0",
      `Expected 0, got ${pgReport1.trust_score}`
    );

    const pgRead1 = await pgRepo.getAIReportByComplaintId("pg-cmp-zero-trust");
    assertTest(
      pgRead1?.trust_score === 0,
      "Postgres 2.1d: Subsequent getAIReportByComplaintId returns trust_score: 0",
      `Expected 0, got ${pgRead1?.trust_score}`
    );

    // -----------------------------------------------------------------------
    // Test 2.2: PostgreSQL missing trust_score binds as 100.0 default
    // -----------------------------------------------------------------------
    capturedQueries.length = 0;
    const pgReport2 = await pgRepo.createAIReport({
      complaint_id: "pg-cmp-default-trust",
      duplicate_detected: false,
      forgery_score: 0.0,
      explainable_report: "Missing score defaults to 100",
    });

    const insertQuery2 = capturedQueries.find((q) => q.text.includes("INSERT INTO ai_reports"));
    const boundTrustScore2 = insertQuery2?.values?.[5];
    assertTest(
      boundTrustScore2 === 100.0,
      "Postgres 2.2a: Bound trust_score parameter ($6) is default 100.0 when omitted",
      `Expected 100.0, got ${boundTrustScore2}`
    );

    assertTest(
      pgReport2.trust_score === 100.0,
      "Postgres 2.2b: Returned AIReport row has default trust_score: 100.0",
      `Expected 100.0, got ${pgReport2.trust_score}`
    );

  } finally {
    await resetPool();
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n============================================================");
  console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
  console.log("============================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRegressionTestSuite().catch((err) => {
  console.error("Test suite crashed with unhandled error:", err);
  process.exit(1);
});
