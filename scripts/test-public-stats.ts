import assert from "assert";
import fs from "fs";
import path from "path";
import { GET as publicStatsHandler } from "../app/api/public/stats/route";
import { getRepository, resetRepository } from "../lib/db";
import { resetPool } from "../lib/repositories/postgres";
import { Pool } from "pg";

process.env.AUTH_SECRET = process.env.AUTH_SECRET || "civictrust-test-auth-secret-32chars-minimum";

async function runPublicStatsTestSuite() {
  console.log("=== CivicTrust Public Stats & PostgreSQL Schema Regression Test Suite ===");

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
  // Part 1: Canonical Schema Verification
  // =========================================================================
  console.log("\n--- Part 1: Canonical Table Names & PostgreSQL Schema DDL ---");

  const schemaPath = path.join(process.cwd(), "schema.sql");
  assertTest(fs.existsSync(schemaPath), "schema.sql exists in project root");

  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  // 1.1 Canonical table definitions
  assertTest(
    schemaContent.includes("CREATE TABLE IF NOT EXISTS complaints"),
    "Canonical table name is 'complaints' in schema.sql"
  );
  assertTest(
    schemaContent.includes("CREATE TABLE IF NOT EXISTS users"),
    "Canonical table name is 'users' in schema.sql"
  );
  assertTest(
    schemaContent.includes("CREATE TABLE IF NOT EXISTS ai_reports"),
    "Canonical table name is 'ai_reports' in schema.sql"
  );
  assertTest(
    schemaContent.includes("CREATE TABLE IF NOT EXISTS evidence"),
    "Canonical table name is 'evidence' in schema.sql"
  );
  assertTest(
    schemaContent.includes("CREATE TABLE IF NOT EXISTS notifications"),
    "Canonical table name is 'notifications' in schema.sql"
  );
  assertTest(
    schemaContent.includes("CREATE TABLE IF NOT EXISTS audit_logs"),
    "Canonical table name is 'audit_logs' in schema.sql"
  );
  assertTest(
    schemaContent.includes("CREATE TABLE IF NOT EXISTS system_errors"),
    "Canonical table name is 'system_errors' in schema.sql"
  );

  // 1.2 Safe extension handling
  assertTest(
    schemaContent.includes('CREATE EXTENSION IF NOT EXISTS "pgcrypto"') &&
    schemaContent.includes("EXCEPTION\n    WHEN OTHERS THEN null;"),
    "pgcrypto extension creation is safely wrapped to prevent non-superuser failure on cloud hosts"
  );

  // 1.3 Backward-compatible idempotent column additions
  assertTest(
    schemaContent.includes("ALTER TABLE complaints ADD COLUMN IF NOT EXISTS rejection_count INT DEFAULT 0;"),
    "schema.sql idempotently ensures rejection_count column exists"
  );
  assertTest(
    schemaContent.includes("ALTER TABLE ai_reports ADD COLUMN IF NOT EXISTS image_sha256 VARCHAR(64);"),
    "schema.sql idempotently ensures image_sha256 column exists"
  );

  // =========================================================================
  // Part 2: PostgreSQL Repository Stats Query Compatibility
  // =========================================================================
  console.log("\n--- Part 2: PostgreSQL Repository Query Contract ---");

  await resetPool();
  resetRepository();

  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  const originalProvider = env.DATABASE_PROVIDER;
  const originalDbUrl = env.DATABASE_URL;

  function setEnv(key: string, value: string | undefined) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  try {
    setEnv("NODE_ENV", "production");
    setEnv("DATABASE_PROVIDER", "postgres");
    setEnv("DATABASE_URL", "postgresql://mock_user:mock_pass@mock-host:5432/mock_db");

    const executedQueries: string[] = [];

    const mockPool = {
      query: async (queryText: string, values?: any[]) => {
        executedQueries.push(queryText.trim());
        const trimmed = queryText.trim();

        if (trimmed === "SELECT 1") {
          return { rows: [{ "?column?": 1 }] };
        }

        if (trimmed === "SELECT COUNT(*) FROM complaints") {
          return { rows: [{ count: "12" }] };
        }
        if (trimmed.includes("status IN ('RESOLVED', 'CLOSED')")) {
          return { rows: [{ count: "5" }] };
        }
        if (trimmed.includes("status = 'IN_PROGRESS'")) {
          return { rows: [{ count: "3" }] };
        }
        if (trimmed.includes("status = 'SUBMITTED'")) {
          return { rows: [{ count: "2" }] };
        }
        if (trimmed.includes("status = 'ASSIGNED'")) {
          return { rows: [{ count: "1" }] };
        }

        if (trimmed.includes("FROM complaints GROUP BY category")) {
          return {
            rows: [
              { category: "Roads & Potholes", count: 7 },
              { category: "Garbage & Waste", count: 5 }
            ]
          };
        }

        if (trimmed.includes("FROM ai_reports")) {
          return {
            rows: [
              {
                totalReports: 12,
                avgTrustScore: 84.5,
                highTrust: 10,
                lowTrust: 2,
                duplicatesFlagged: 1,
                manipulationFlagged: 0
              }
            ]
          };
        }

        return { rows: [] };
      },
      on: () => {},
      end: async () => {}
    };

    // Inject mock pool into global for test
    (global as any).__civictrust_pg_pool__ = mockPool;

    const repo = getRepository();

    // 2.1 getDashboardStats
    const dashStats = await repo.getDashboardStats();
    assertTest(dashStats.total === 12, "getDashboardStats returns total = 12");
    assertTest(dashStats.resolved === 5, "getDashboardStats returns resolved = 5");
    assertTest(dashStats.inProgress === 3, "getDashboardStats returns inProgress = 3");
    assertTest(dashStats.submitted === 2, "getDashboardStats returns submitted = 2");
    assertTest(dashStats.assigned === 1, "getDashboardStats returns assigned = 1");

    // 2.2 getCategoryStats
    const catStats = await repo.getCategoryStats();
    assertTest(catStats.length === 2, "getCategoryStats returns 2 category groups");
    assertTest(catStats[0].category === "Roads & Potholes", "Top category is Roads & Potholes");

    // 2.3 getVerificationStats
    const verStats = await repo.getVerificationStats();
    assertTest(verStats.totalReports === 12, "getVerificationStats returns totalReports = 12");
    assertTest(verStats.avgTrustScore === 84.5, "getVerificationStats returns avgTrustScore = 84.5");
    assertTest(verStats.highTrust === 10, "getVerificationStats returns highTrust = 10");

    // =========================================================================
    // Part 3: Public Stats Route Handler Execution
    // =========================================================================
    console.log("\n--- Part 3: /api/public/stats Route Handler Execution ---");

    const req = new Request("http://localhost:3000/api/public/stats", {
      method: "GET",
      headers: {
        "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200 + 10)}`
      }
    });

    const res = await publicStatsHandler(req);
    assertTest(res.status === 200, "GET /api/public/stats returns HTTP 200");

    const data = await res.json();
    assertTest(typeof data.complaints === "object", "Response includes complaints object");
    assertTest(data.complaints.total === 12, "complaints.total matches repository value (12)");
    assertTest(data.complaints.tpaReview === 1, "complaints.tpaReview is calculated correctly (12 - 5 - 3 - 2 - 1 = 1)");
    assertTest(Array.isArray(data.categories), "Response includes categories array");
    assertTest(data.verification.avgTrustScore === 84.5, "verification.avgTrustScore matches (84.5)");
    assertTest(Boolean(data.generatedAt), "Response includes generatedAt ISO timestamp");

    // =========================================================================
    // Part 4: Missing Table Error Handling (relation "complaints" does not exist)
    // =========================================================================
    console.log("\n--- Part 4: Missing Table Error Handling (Postgres 42P01) ---");

    // Simulate missing table error
    const missingTablePool = {
      query: async (queryText: string) => {
        if (queryText.includes("FROM complaints")) {
          const err: any = new Error('relation "complaints" does not exist');
          err.code = "42P01";
          throw err;
        }
        return { rows: [] };
      },
      on: () => {},
      end: async () => {}
    };

    await resetPool();
    (global as any).__civictrust_pg_pool__ = missingTablePool;
    resetRepository();

    const missingTableReq = new Request("http://localhost:3000/api/public/stats", {
      method: "GET",
      headers: {
        "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200 + 10)}`
      }
    });

    const errorRes = await publicStatsHandler(missingTableReq);
    assertTest(errorRes.status === 503, "Missing complaints table returns HTTP 503 gracefully");

    const errorData = await errorRes.json();
    assertTest(
      errorData.message === "Service temporarily unavailable. Please try again.",
      "Error response is sanitized and does not leak database relation name or credentials"
    );

  } finally {
    setEnv("NODE_ENV", originalNodeEnv);
    setEnv("DATABASE_PROVIDER", originalProvider);
    setEnv("DATABASE_URL", originalDbUrl);
    delete (global as any).__civictrust_pg_pool__;
    await resetPool();
    resetRepository();
  }

  // =========================================================================
  // Part 5: SQLite Baseline Parity
  // =========================================================================
  console.log("\n--- Part 5: SQLite Baseline Parity ---");

  resetRepository();
  const sqliteReq = new Request("http://localhost:3000/api/public/stats", {
    method: "GET",
    headers: {
      "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200 + 10)}`
    }
  });
  const sqliteRes = await publicStatsHandler(sqliteReq);
  assertTest(sqliteRes.status === 200, "SQLite GET /api/public/stats returns HTTP 200");
  const sqliteData = await sqliteRes.json();
  assertTest(typeof sqliteData.complaints.total === "number", "SQLite complaints.total is a valid number");
  assertTest(typeof sqliteData.verification.evidenceAudited === "number", "SQLite verification.evidenceAudited is a valid number");

  console.log("\n========================================================");
  console.log(`Public Stats Test Suite Summary: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("========================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPublicStatsTestSuite().catch((err) => {
  console.error("Unhandled error in public stats test suite:", err);
  process.exit(1);
});
