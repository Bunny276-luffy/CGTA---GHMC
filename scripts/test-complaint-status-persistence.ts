import assert from "assert";
import Database from "better-sqlite3";
import path from "path";
import { randomBytes } from "crypto";
import { SQLiteRepository } from "../lib/repositories/sqlite";
import { PostgresRepository, getPool, resetPool } from "../lib/repositories/postgres";
import { Pool } from "pg";

async function runRegressionTestSuite() {
  console.log("=== CivicTrust Complaint Status Persistence Regression Test Suite ===");

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
  console.log("\n--- Part 1: SQLite Repository Status Persistence ---");

  const testRunId = randomBytes(6).toString("hex");
  const sqliteRepo = new SQLiteRepository();
  const dbPath = path.join(process.cwd(), "data", "civictrust.db");
  const directDb = new Database(dbPath);

  // Track specifically created test records for pinpoint cleanup
  let createdUserId: string | null = null;
  const createdComplaintIds: string[] = [];

  try {
    // Ensure test citizen user exists with a unique email to avoid collisions
    const testUserEmail = `test-status-${testRunId}@civictrust.local`;
    const testUser = await sqliteRepo.createUser({
      name: `Status Test Citizen ${testRunId}`,
      email: testUserEmail,
      role: "CITIZEN",
      password_hash: "mock-hash",
    });
    createdUserId = testUser.id;

    // -----------------------------------------------------------------------
    // Test 1.1: Explicit TPA_REVIEW status persistence
    // -----------------------------------------------------------------------
    const complaint1 = await sqliteRepo.createComplaint({
      title: `Pothole in Begumpet [${testRunId}]`,
      description: "Severe pothole requiring review",
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

    assertTest(
      complaint1.status === "TPA_REVIEW",
      "SQLite 1.1a: createComplaint returns status 'TPA_REVIEW'",
      `Expected 'TPA_REVIEW', got '${complaint1.status}'`
    );

    const read1 = await sqliteRepo.getComplaintById(complaint1.id);
    assertTest(
      read1?.status === "TPA_REVIEW",
      "SQLite 1.1b: getComplaintById returns persisted status 'TPA_REVIEW'",
      `Expected 'TPA_REVIEW', got '${read1?.status}'`
    );

    const read1ByTracking = await sqliteRepo.getComplaintByTrackingId(complaint1.tracking_id);
    assertTest(
      read1ByTracking?.status === "TPA_REVIEW",
      "SQLite 1.1c: getComplaintByTrackingId returns persisted status 'TPA_REVIEW'",
      `Expected 'TPA_REVIEW', got '${read1ByTracking?.status}'`
    );

    const directRow1 = directDb
      .prepare("SELECT status FROM complaints WHERE id = ?")
      .get(complaint1.id) as { status: string } | undefined;
    assertTest(
      directRow1?.status === "TPA_REVIEW",
      "SQLite 1.1d: Direct database read confirms persisted status 'TPA_REVIEW'",
      `Expected 'TPA_REVIEW', got '${directRow1?.status}'`
    );

    // -----------------------------------------------------------------------
    // Test 1.2: Explicit SUBMITTED status persistence
    // -----------------------------------------------------------------------
    const complaint2 = await sqliteRepo.createComplaint({
      title: `Broken streetlight in Banjara Hills [${testRunId}]`,
      description: "Streetlight not working",
      category: "Street Lighting & Electrical",
      address: "Road No. 12 Banjara Hills",
      latitude: 17.415,
      longitude: 78.435,
      severity: "STANDARD",
      anonymous: false,
      status: "SUBMITTED",
      created_by_id: testUser.id,
    });
    createdComplaintIds.push(complaint2.id);

    assertTest(
      complaint2.status === "SUBMITTED",
      "SQLite 1.2a: createComplaint returns status 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${complaint2.status}'`
    );

    const read2 = await sqliteRepo.getComplaintById(complaint2.id);
    assertTest(
      read2?.status === "SUBMITTED",
      "SQLite 1.2b: getComplaintById returns persisted status 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${read2?.status}'`
    );

    const directRow2 = directDb
      .prepare("SELECT status FROM complaints WHERE id = ?")
      .get(complaint2.id) as { status: string } | undefined;
    assertTest(
      directRow2?.status === "SUBMITTED",
      "SQLite 1.2c: Direct database read confirms persisted status 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${directRow2?.status}'`
    );

    // -----------------------------------------------------------------------
    // Test 1.3: Omitted status defaults to SUBMITTED
    // -----------------------------------------------------------------------
    const complaint3 = await sqliteRepo.createComplaint({
      title: `Water logging in Secunderabad [${testRunId}]`,
      description: "Water logging near station",
      category: "Drainage & Water Leakage",
      address: "Station Road, Secunderabad",
      latitude: 17.439,
      longitude: 78.498,
      severity: "HIGH",
      anonymous: false,
      // status intentionally omitted
      created_by_id: testUser.id,
    });
    createdComplaintIds.push(complaint3.id);

    assertTest(
      complaint3.status === "SUBMITTED",
      "SQLite 1.3a: createComplaint with omitted status returns default 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${complaint3.status}'`
    );

    const read3 = await sqliteRepo.getComplaintById(complaint3.id);
    assertTest(
      read3?.status === "SUBMITTED",
      "SQLite 1.3b: getComplaintById returns default persisted status 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${read3?.status}'`
    );

    const directRow3 = directDb
      .prepare("SELECT status FROM complaints WHERE id = ?")
      .get(complaint3.id) as { status: string } | undefined;
    assertTest(
      directRow3?.status === "SUBMITTED",
      "SQLite 1.3c: Direct database read confirms default persisted status 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${directRow3?.status}'`
    );

  } finally {
    // Guaranteed isolated cleanup: only delete specifically recorded test IDs.
    // Never run broad DELETE queries or alter pre-existing user records.
    try {
      for (const id of createdComplaintIds) {
        try {
          directDb.prepare("DELETE FROM evidence WHERE complaint_id = ?").run(id);
        } catch (e: any) {
          console.error(`Warning: Failed to clean up test evidence for complaint ${id}:`, e.message);
        }
        try {
          directDb.prepare("DELETE FROM complaints WHERE id = ?").run(id);
        } catch (e: any) {
          console.error(`Warning: Failed to clean up test complaint ${id}:`, e.message);
        }
      }

      if (createdUserId) {
        try {
          directDb.prepare("DELETE FROM users WHERE id = ?").run(createdUserId);
        } catch (e: any) {
          console.error(`Warning: Failed to clean up test user ${createdUserId}:`, e.message);
        }
      }
    } finally {
      try {
        directDb.close();
      } catch (closeErr: any) {
        console.error("Warning: Failed to close direct SQLite connection:", closeErr.message);
      }
    }
  }

  // =========================================================================
  // Part 2: PostgreSQL Repository Status Persistence (Contract / Query Validation)
  // =========================================================================
  console.log("\n--- Part 2: PostgreSQL Repository Status Persistence ---");

  // Reset any active pool to ensure a clean baseline state
  await resetPool();

  try {
    type CapturedQuery = { text: string; values?: any[] };
    const capturedQueries: CapturedQuery[] = [];
    let inMemoryDbStatus: string | undefined = undefined;

    const mockClient = {
      query: async (queryText: string, values?: any[]) => {
        capturedQueries.push({ text: queryText, values });
        const trimmed = queryText.trim();
        if (trimmed === "BEGIN" || trimmed === "COMMIT" || trimmed === "ROLLBACK") {
          return { rows: [] };
        }
        if (trimmed.startsWith("INSERT INTO complaints")) {
          const statusParam = values ? values[4] : undefined;
          inMemoryDbStatus = statusParam;
          return {
            rows: [
              {
                id: "pg-mock-id-1",
                tracking_id: values?.[0] || "CGTA-2026-MOCK01",
                title: values?.[1],
                description: values?.[2],
                category: values?.[3],
                status: statusParam,
                latitude: values?.[5],
                longitude: values?.[6],
                address: values?.[7],
                severity: values?.[8],
                anonymous: values?.[9],
                before_photo_url: values?.[10],
                created_by_id: values?.[11],
              },
            ],
          };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    const mockPool = {
      connect: async () => mockClient,
      query: async (queryText: string, values?: any[]) => {
        capturedQueries.push({ text: queryText, values });
        if (queryText.includes("FROM complaints WHERE id = $1")) {
          return {
            rows: [
              {
                id: values?.[0],
                tracking_id: "CGTA-2026-MOCK01",
                title: "Mock Title",
                description: "Mock Desc",
                category: "Roads & Potholes",
                status: inMemoryDbStatus,
              },
            ],
          };
        }
        return { rows: [] };
      },
      on: () => {},
      end: async () => {},
      ending: false,
      ended: false,
    };

    // Inject mock pool into global slot
    global.__civictrust_pg_pool__ = mockPool as unknown as Pool;
    const pgRepo = new PostgresRepository();

    // -------------------------------------------------------------------------
    // Test 2.1: PostgreSQL explicit TPA_REVIEW status persistence
    // -------------------------------------------------------------------------
    capturedQueries.length = 0;
    const pgComplaint1 = await pgRepo.createComplaint({
      title: "PG Pothole",
      description: "Requires TPA Review",
      category: "Roads & Potholes",
      address: "Kukatpally Main Rd",
      latitude: 17.494,
      longitude: 78.399,
      severity: "HIGH",
      anonymous: false,
      status: "TPA_REVIEW",
      created_by_id: "user-uuid-1",
    });

    const insertQuery1 = capturedQueries.find((q) => q.text.includes("INSERT INTO complaints"));
    assertTest(
      !!insertQuery1,
      "Postgres 2.1a: Executed INSERT INTO complaints query",
      "No INSERT query captured"
    );

    const hasStatusColumn1 = insertQuery1?.text.includes("status");
    const bindsStatusParam1 = insertQuery1?.values && insertQuery1.values[4] === "TPA_REVIEW";
    assertTest(
      !!hasStatusColumn1 && !!bindsStatusParam1,
      "Postgres 2.1b: INSERT statement includes 'status' and binds 'TPA_REVIEW' to $5",
      `SQL: ${insertQuery1?.text}\nValues: ${JSON.stringify(insertQuery1?.values)}`
    );

    assertTest(
      pgComplaint1.status === "TPA_REVIEW",
      "Postgres 2.1c: createComplaint returns persisted status 'TPA_REVIEW'",
      `Expected 'TPA_REVIEW', got '${pgComplaint1.status}'`
    );

    const pgRead1 = await pgRepo.getComplaintById(pgComplaint1.id);
    assertTest(
      pgRead1?.status === "TPA_REVIEW",
      "Postgres 2.1d: Subsequent getComplaintById returns matching persisted status 'TPA_REVIEW'",
      `Expected 'TPA_REVIEW', got '${pgRead1?.status}'`
    );

    // -------------------------------------------------------------------------
    // Test 2.2: PostgreSQL explicit SUBMITTED status persistence
    // -------------------------------------------------------------------------
    capturedQueries.length = 0;
    const pgComplaint2 = await pgRepo.createComplaint({
      title: "PG Streetlight",
      description: "Standard ticket",
      category: "Street Lighting & Electrical",
      address: "Madhapur",
      latitude: 17.448,
      longitude: 78.391,
      severity: "STANDARD",
      anonymous: false,
      status: "SUBMITTED",
      created_by_id: "user-uuid-1",
    });

    const insertQuery2 = capturedQueries.find((q) => q.text.includes("INSERT INTO complaints"));
    const bindsStatusParam2 = insertQuery2?.values && insertQuery2.values[4] === "SUBMITTED";
    assertTest(
      !!bindsStatusParam2,
      "Postgres 2.2a: INSERT statement binds explicit 'SUBMITTED' to $5",
      `Values: ${JSON.stringify(insertQuery2?.values)}`
    );

    assertTest(
      pgComplaint2.status === "SUBMITTED",
      "Postgres 2.2b: createComplaint returns persisted status 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${pgComplaint2.status}'`
    );

    const pgRead2 = await pgRepo.getComplaintById(pgComplaint2.id);
    assertTest(
      pgRead2?.status === "SUBMITTED",
      "Postgres 2.2c: Subsequent getComplaintById returns matching persisted status 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${pgRead2?.status}'`
    );

    // -------------------------------------------------------------------------
    // Test 2.3: PostgreSQL omitted status defaults to SUBMITTED
    // -------------------------------------------------------------------------
    capturedQueries.length = 0;
    const pgComplaint3 = await pgRepo.createComplaint({
      title: "PG Garbage Issue",
      description: "Omitted status ticket",
      category: "Garbage & Waste",
      address: "Ameerpet",
      latitude: 17.437,
      longitude: 78.448,
      severity: "STANDARD",
      anonymous: false,
      // status intentionally omitted
      created_by_id: "user-uuid-1",
    });

    const insertQuery3 = capturedQueries.find((q) => q.text.includes("INSERT INTO complaints"));
    const bindsStatusParam3 = insertQuery3?.values && insertQuery3.values[4] === "SUBMITTED";
    assertTest(
      !!bindsStatusParam3,
      "Postgres 2.3a: INSERT statement defaults omitted status to 'SUBMITTED' at $5",
      `Values: ${JSON.stringify(insertQuery3?.values)}`
    );

    assertTest(
      pgComplaint3.status === "SUBMITTED",
      "Postgres 2.3b: createComplaint with omitted status returns default 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${pgComplaint3.status}'`
    );

    const pgRead3 = await pgRepo.getComplaintById(pgComplaint3.id);
    assertTest(
      pgRead3?.status === "SUBMITTED",
      "Postgres 2.3c: Subsequent getComplaintById returns matching default status 'SUBMITTED'",
      `Expected 'SUBMITTED', got '${pgRead3?.status}'`
    );
  } finally {
    // Guaranteed cleanup of mock pool
    await resetPool();
  }

  // -------------------------------------------------------------------------
  // Live PostgreSQL integration status report
  // -------------------------------------------------------------------------
  console.log("\n--- Live PostgreSQL Integration Status ---");
  if (!process.env.DATABASE_URL) {
    console.log(
      "ℹ️  [PostgreSQL Live Integration]: Skipped (DATABASE_URL environment variable is not configured).\n" +
      "   Live PostgreSQL integration requires an active database URL (e.g. Supabase or managed Postgres).\n" +
      "   Repository query formatting and parameter bindings were fully validated via contract tests above."
    );
  } else {
    console.log("ℹ️  DATABASE_URL detected. Attempting live PostgreSQL connection...");
    try {
      const livePool = new Pool({ connectionString: process.env.DATABASE_URL });
      const client = await livePool.connect();
      client.release();
      await livePool.end();
      console.log("✅ Live PostgreSQL database connection verified.");
    } catch (err: any) {
      console.log(`ℹ️  [PostgreSQL Live Integration]: Live database not reachable (${err.message}).`);
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log(`\n=== Test Results: ${passedCount} Passed, ${failedCount} Failed ===`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runRegressionTestSuite().catch((err) => {
  console.error("Unhandled error in test suite:", err);
  process.exit(1);
});
