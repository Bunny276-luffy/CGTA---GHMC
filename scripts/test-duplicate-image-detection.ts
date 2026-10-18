import assert from "assert";
import Database from "better-sqlite3";
import path from "path";
import { randomBytes } from "crypto";
import { Jimp } from "jimp";
import { SQLiteRepository } from "../lib/repositories/sqlite";
import { PostgresRepository, resetPool } from "../lib/repositories/postgres";
import {
  runVerificationPipeline,
  computeDHash,
  calculateHammingDistance,
  generateFileHash
} from "../lib/verification-engine";
import { POST as submitHandler } from "../app/api/complaints/submit/route";
import { signSession } from "../lib/session";
import { Pool } from "pg";

// Configure test environment
process.env.AUTH_SECRET = "civictrust-test-auth-secret-32chars-minimum";
process.env.CAPTCHA_ENABLED = "false";

// Mock OCR to prevent worker thread delays in fast regression test suite
const tesseractModule = require("tesseract.js");
tesseractModule.createWorker = async () => ({
  recognize: async () => ({
    data: {
      text: "",
      confidence: 100
    }
  }),
  terminate: async () => {}
});

let ipCounter = 100;
function getUniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

async function runDuplicateRegressionTests() {
  console.log("=== CivicTrust Issue #8: Database-Backed Duplicate Image Detection Suite ===");

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

  const testRunId = randomBytes(6).toString("hex");
  const sqliteRepo = new SQLiteRepository();
  const dbPath = path.join(process.cwd(), "data", "civictrust.db");
  const directDb = new Database(dbPath);

  let testUserId: string | null = null;
  const createdComplaintIds: string[] = [];
  const createdReportIds: string[] = [];

  // Load standard starfish fixture (Image A)
  const fs = require("fs");
  const starfishJpgPath = path.join(process.cwd(), "node_modules", "exif-parser", "test", "starfish.jpg");
  const imageABuffer = fs.readFileSync(starfishJpgPath);
  const shaA = await generateFileHash(imageABuffer);
  const phashA = await computeDHash(imageABuffer);

  // Image A Near: Re-encoded / recompressed starfish (deterministic near duplicate, distance 1..10)
  const recompressedJimp = await Jimp.read(imageABuffer);
  const imageANearBuffer = await recompressedJimp.getBuffer("image/jpeg", { quality: 30 });
  const shaANear = await generateFileHash(imageANearBuffer);
  const phashANear = await computeDHash(imageANearBuffer);

  const hammingAtoNear = calculateHammingDistance(phashA, phashANear);
  assert(hammingAtoNear > 0 && hammingAtoNear <= 10, `Hamming distance between near images must be 1..10, got ${hammingAtoNear}`);
  assert(shaA !== shaANear, "Near image must have a distinct SHA-256 hash");

  // Image B: Checkerboard pattern (Clean non-duplicate with non-zero hash, distance > 20 from starfish and flat images)
  const imageBInstance = new Jimp({ width: 100, height: 100 });
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const color = ((Math.floor(x / 10) + Math.floor(y / 10)) % 2 === 0) ? 0xFFFFFFFF : 0x000000FF;
      imageBInstance.setPixelColor(color, x, y);
    }
  }
  const imageBBuffer = await imageBInstance.getBuffer("image/jpeg");
  const shaB = await generateFileHash(imageBBuffer);
  const phashB = await computeDHash(imageBBuffer);

  const hammingAtoB = calculateHammingDistance(phashA, phashB);
  assert(hammingAtoB > 10, `Hamming distance between distinct images must exceed 10, got ${hammingAtoB}`);

  try {
    // Setup test citizen user
    const testUser = await sqliteRepo.createUser({
      name: `Duplicate Test Citizen ${testRunId}`,
      email: `test-dup-${testRunId}@civictrust.local`,
      role: "CITIZEN",
      password_hash: "mock-hash"
    });
    testUserId = testUser.id;

    // Create primary complaint with Image A in SQLite
    const complaintA = await sqliteRepo.createComplaint({
      title: `Pothole Complaint Primary [${testRunId}]`,
      description: "Severe road damage on primary road",
      category: "Roads & Potholes",
      address: "Road No. 1, Banjara Hills",
      latitude: 17.415,
      longitude: 78.435,
      severity: "HIGH",
      anonymous: false,
      status: "SUBMITTED",
      created_by_id: testUser.id
    });
    createdComplaintIds.push(complaintA.id);

    const reportA = await sqliteRepo.createAIReport({
      complaint_id: complaintA.id,
      duplicate_detected: false,
      duplicate_parent_id: null,
      forgery_score: 0.0,
      trust_score: 95.0,
      explainable_report: "Primary complaint report",
      priority_predicted: "HIGH",
      image_sha256: shaA,
      image_phash: phashA
    });
    createdReportIds.push(reportA.id);

    // =========================================================================
    // Part 1: SQLite Repository Shared Methods
    // =========================================================================
    console.log("\n--- Part 1: SQLite Repository Duplicate Lookup Methods ---");

    const foundReport = await sqliteRepo.getAIReportByImageSha256(shaA);
    assertTest(
      foundReport !== null && foundReport.complaint_id === complaintA.id,
      "SQLite 1.1: getAIReportByImageSha256 finds existing report by SHA-256",
      `Expected complaint_id ${complaintA.id}, got ${foundReport?.complaint_id}`
    );

    const missingReport = await sqliteRepo.getAIReportByImageSha256("0000000000000000000000000000000000000000000000000000000000000000");
    assertTest(
      missingReport === null,
      "SQLite 1.2: getAIReportByImageSha256 returns null for unknown hash"
    );

    const emptyReport = await sqliteRepo.getAIReportByImageSha256("");
    assertTest(
      emptyReport === null,
      "SQLite 1.3: getAIReportByImageSha256 returns null safely for empty hash string"
    );

    const pHashRows = await sqliteRepo.getAIReportsWithPHash();
    const hasReportAPHash = pHashRows.some(r => r.complaint_id === complaintA.id && r.image_phash === phashA);
    assertTest(
      hasReportAPHash,
      "SQLite 1.4: getAIReportsWithPHash includes existing report pHash"
    );

    // =========================================================================
    // Part 2: End-to-End Pipeline in SQLite (No historicalRecords passed!)
    // =========================================================================
    console.log("\n--- Part 2: End-to-End Duplicate Verification in SQLite ---");

    // Test 2.1: Exact Duplicate Detection in SQLite
    const exactResult = await runVerificationPipeline({
      fileName: "duplicate_submission.jpg",
      fileSize: imageABuffer.length,
      fileType: "image/jpeg",
      category: "Roads & Potholes",
      description: "Filing grievance with same photo",
      fileData: imageABuffer
    });

    assertTest(
      exactResult.duplicateDetected === true,
      "SQLite 2.1a: duplicateDetected is true for exact duplicate"
    );
    assertTest(
      exactResult.duplicateType === "EXACT_DUPLICATE",
      "SQLite 2.1b: duplicateType is EXACT_DUPLICATE",
      `Got ${exactResult.duplicateType}`
    );
    assertTest(
      exactResult.duplicateParentId === complaintA.id,
      "SQLite 2.1c: duplicateParentId matches the persisted complaint ID",
      `Expected ${complaintA.id}, got ${exactResult.duplicateParentId}`
    );
    assertTest(
      exactResult.duplicateSimilarity === 1.0,
      "SQLite 2.1d: duplicateSimilarity is 1.0 for exact duplicate"
    );
    assertTest(
      exactResult.isDuplicate === true,
      "SQLite 2.1e: isDuplicate flag is true"
    );
    assertTest(
      exactResult.trustScore <= 35,
      "SQLite 2.1f: trustScore is capped at <= 35 for duplicate",
      `Got ${exactResult.trustScore}`
    );
    assertTest(
      exactResult.trustGrade === "SUSPICIOUS",
      "SQLite 2.1g: trustGrade is SUSPICIOUS for duplicate"
    );

    // Test 2.2: Near Duplicate Detection in SQLite
    const nearResult = await runVerificationPipeline({
      fileName: "near_duplicate_submission.jpg",
      fileSize: imageANearBuffer.length,
      fileType: "image/jpeg",
      category: "Roads & Potholes",
      description: "Filing grievance with slightly altered photo",
      fileData: imageANearBuffer
    });

    assertTest(
      nearResult.duplicateDetected === true,
      "SQLite 2.2a: duplicateDetected is true for near duplicate"
    );
    assertTest(
      nearResult.duplicateType === "NEAR_DUPLICATE",
      "SQLite 2.2b: duplicateType is NEAR_DUPLICATE",
      `Got ${nearResult.duplicateType}`
    );
    assertTest(
      nearResult.duplicateParentId === complaintA.id,
      "SQLite 2.2c: duplicateParentId matches primary complaint ID",
      `Expected ${complaintA.id}, got ${nearResult.duplicateParentId}`
    );
    assertTest(
      nearResult.duplicateSimilarity > 0.8 && nearResult.duplicateSimilarity < 1.0,
      "SQLite 2.2d: duplicateSimilarity reflects Hamming distance similarity (0.8..1.0)",
      `Got ${nearResult.duplicateSimilarity}`
    );
    assertTest(
      nearResult.trustScore <= 35,
      "SQLite 2.2e: trustScore is capped at <= 35 for near duplicate",
      `Got ${nearResult.trustScore}`
    );

    // Test 2.3: Clean Non-Duplicate in SQLite
    const cleanResult = await runVerificationPipeline({
      fileName: "clean_different.jpg",
      fileSize: imageBBuffer.length,
      fileType: "image/jpeg",
      category: "Roads & Potholes",
      description: "Filing grievance with completely unique photo",
      fileData: imageBBuffer
    });

    assertTest(
      cleanResult.duplicateDetected === false,
      "SQLite 2.3a: duplicateDetected is false for clean unique image"
    );
    assertTest(
      cleanResult.duplicateType === "NOT_DUPLICATE",
      "SQLite 2.3b: duplicateType is NOT_DUPLICATE"
    );
    assertTest(
      cleanResult.duplicateParentId === null,
      "SQLite 2.3c: duplicateParentId is null for clean image"
    );
    assertTest(
      cleanResult.duplicateSimilarity === 0.0,
      "SQLite 2.3d: duplicateSimilarity is 0.0 for clean image"
    );
    assertTest(
      cleanResult.isDuplicate === false,
      "SQLite 2.3e: isDuplicate is false for clean image"
    );
    assertTest(
      cleanResult.trustScore > 35,
      "SQLite 2.3f: trustScore is not capped for clean unique image",
      `Got ${cleanResult.trustScore}`
    );

    // =========================================================================
    // Part 3: Failure Safety, Trust Score Capping & Historical Fallback
    // =========================================================================
    console.log("\n--- Part 3: Failure Safety, Trust Score Capping & Fallback ---");

    const { getRepository } = require("../lib/db");
    const activeRepo = getRepository();
    const originalGetAIReport = activeRepo.getAIReportByImageSha256;
    activeRepo.getAIReportByImageSha256 = async () => {
      throw new Error("Simulated SQLite disk I/O error");
    };

    let failedLookupResult: any = null;
    let fallbackResult: any = null;
    try {
      // 3.1-3.6: Database lookup failure without historical fallback
      failedLookupResult = await runVerificationPipeline({
        fileName: "failed_lookup.jpg",
        fileSize: imageBBuffer.length,
        fileType: "image/jpeg",
        category: "Roads & Potholes",
        description: "Failure test without historical fallback",
        fileData: imageBBuffer
      });

      // 3.7: Intended fallback behavior when DB throws but historicalRecords IS provided
      fallbackResult = await runVerificationPipeline({
        fileName: "fallback_test.jpg",
        fileSize: imageABuffer.length,
        fileType: "image/jpeg",
        category: "Roads & Potholes",
        description: "Fallback test with historical records",
        fileData: imageABuffer,
        historicalRecords: [
          { complaint_id: "comp-fallback-99", image_sha256: shaA, image_phash: phashA }
        ]
      });
    } finally {
      activeRepo.getAIReportByImageSha256 = originalGetAIReport;
    }

    assertTest(
      failedLookupResult !== null && failedLookupResult.duplicateDetected === false,
      "Safety 3.1: duplicateDetected is false when DB lookup throws"
    );
    assertTest(
      failedLookupResult !== null && failedLookupResult.duplicateType === "UNAVAILABLE",
      "Safety 3.2: duplicateType is UNAVAILABLE on DB failure",
      `Got ${failedLookupResult?.duplicateType}`
    );
    assertTest(
      failedLookupResult !== null && failedLookupResult.duplicateDescription.includes("Database lookup failed"),
      "Safety 3.3: duplicateDescription states database lookup failed (does NOT claim no duplicates found)",
      `Got: ${failedLookupResult?.duplicateDescription}`
    );
    assertTest(
      failedLookupResult !== null && failedLookupResult.trustScore <= 55,
      "Safety 3.4: trustScore is capped at <= 55 when duplicate check is UNAVAILABLE (cannot reach 60 auto-admission threshold)",
      `Got: ${failedLookupResult?.trustScore}`
    );
    assertTest(
      failedLookupResult !== null && failedLookupResult.trustGrade !== "HIGH_TRUST",
      "Safety 3.5: trustGrade cannot be HIGH_TRUST when duplicate check failed",
      `Got: ${failedLookupResult?.trustGrade}`
    );
    assertTest(
      failedLookupResult !== null && failedLookupResult.trustExplanation.includes("[CAPPED: Duplicate verification unavailable.]"),
      "Safety 3.6: trustExplanation clearly documents duplicate verification unavailable cap",
      `Got: ${failedLookupResult?.trustExplanation}`
    );
    assertTest(
      fallbackResult !== null && fallbackResult.duplicateDetected === true && fallbackResult.duplicateType === "EXACT_DUPLICATE",
      "Safety 3.7: When DB lookup throws, pipeline successfully falls back to provided historicalRecords",
      `Got type: ${fallbackResult?.duplicateType}, detected: ${fallbackResult?.duplicateDetected}`
    );
    assertTest(
      fallbackResult !== null && fallbackResult.duplicateParentId === "comp-fallback-99",
      "Safety 3.8: Fallback duplicateParentId matches provided historicalRecords",
      `Expected comp-fallback-99, got ${fallbackResult?.duplicateParentId}`
    );

    // 3.9: Non-empty historicalRecords replaces database lookup to avoid false positives from DB
    const isolatedHistoryResult = await runVerificationPipeline({
      fileName: "isolated_history.jpg",
      fileSize: imageABuffer.length,
      fileType: "image/jpeg",
      category: "Roads & Potholes",
      description: "Evaluating Image A against custom history containing only different image",
      fileData: imageABuffer,
      historicalRecords: [
        { complaint_id: "comp-isolated-diff", image_sha256: shaB, image_phash: phashB }
      ]
    });
    assertTest(
      isolatedHistoryResult.duplicateDetected === false && isolatedHistoryResult.duplicateType === "NOT_DUPLICATE",
      "Safety 3.9: Non-empty historicalRecords replaces DB lookup and prevents false positives from persisted database",
      `Got type: ${isolatedHistoryResult.duplicateType}, detected: ${isolatedHistoryResult.duplicateDetected}`
    );

    // 3.10: Empty historicalRecords array [] replaces database lookup (0 historical records in dataset)
    const emptyHistoryResult = await runVerificationPipeline({
      fileName: "empty_history.jpg",
      fileSize: imageABuffer.length,
      fileType: "image/jpeg",
      category: "Roads & Potholes",
      description: "Evaluating Image A against empty historical records array",
      fileData: imageABuffer,
      historicalRecords: []
    });
    assertTest(
      emptyHistoryResult.duplicateDetected === false && emptyHistoryResult.duplicateType === "NOT_DUPLICATE",
      "Safety 3.10: Empty historicalRecords array [] replaces DB lookup and returns NOT_DUPLICATE without DB false positives",
      `Got type: ${emptyHistoryResult.duplicateType}, detected: ${emptyHistoryResult.duplicateDetected}`
    );

    // =========================================================================
    // Part 4: Route-Level Submission Regression Test (Fail-Safe Verification)
    // =========================================================================
    console.log("\n--- Part 4: Route-Level Submission Regression Test ---");

    const citizenToken = await signSession({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: "CITIZEN"
    });

    const originalGetReportForRoute = activeRepo.getAIReportByImageSha256;
    activeRepo.getAIReportByImageSha256 = async () => {
      throw new Error("Simulated database outage during submission verification");
    };

    let routeResponse: any = null;
    let routeResponseData: any = null;
    try {
      const submitReq = new Request("http://localhost:3000/api/complaints/submit", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${citizenToken}`,
          "x-forwarded-for": getUniqueIp()
        },
        body: JSON.stringify({
          title: `Route Fail-Safe Pothole [${testRunId}]`,
          description: "Submitting grievance when database duplicate lookup has an issue",
          category: "Roads & Potholes",
          latitude: 17.415,
          longitude: 78.435,
          address: "Banjara Hills, Hyderabad",
          severity: "HIGH",
          beforePhotoUrl: `data:image/jpeg;base64,${imageBBuffer.toString("base64")}`
        })
      });

      routeResponse = await submitHandler(submitReq);
      routeResponseData = await routeResponse.json();
    } finally {
      activeRepo.getAIReportByImageSha256 = originalGetReportForRoute;
    }

    assertTest(
      routeResponse !== null && routeResponse.status === 200,
      "Route 4.1: Submission request returns HTTP 200 (citizen complaint accepted)",
      `Got status ${routeResponse?.status}: ${JSON.stringify(routeResponseData)}`
    );

    const submittedComplaint = routeResponseData?.complaint;
    if (submittedComplaint?.id) {
      createdComplaintIds.push(submittedComplaint.id);
    }

    assertTest(
      submittedComplaint !== null && submittedComplaint.status === "TPA_REVIEW",
      "Route 4.2: Complaint status is strictly TPA_REVIEW (cannot bypass review or auto-admit to SUBMITTED)",
      `Expected status 'TPA_REVIEW', got '${submittedComplaint?.status}'`
    );

    // Direct SQLite database verification of complaint status
    const dbComplaintRow = submittedComplaint?.id
      ? directDb.prepare("SELECT * FROM complaints WHERE id = ?").get(submittedComplaint.id) as any
      : null;
    assertTest(
      dbComplaintRow !== null && dbComplaintRow.status === "TPA_REVIEW",
      "Route 4.3: Direct database query confirms persisted complaint status is TPA_REVIEW",
      `Got persisted status: ${dbComplaintRow?.status}`
    );

    // Direct SQLite database verification of AI report trust score and flags
    const dbReportRow = submittedComplaint?.id
      ? directDb.prepare("SELECT * FROM ai_reports WHERE complaint_id = ?").get(submittedComplaint.id) as any
      : null;
    if (dbReportRow?.id) {
      createdReportIds.push(dbReportRow.id);
    }

    assertTest(
      dbReportRow !== null && dbReportRow.trust_score <= 55,
      "Route 4.4: Persisted AI report trust_score is capped at <= 55",
      `Got trust_score: ${dbReportRow?.trust_score}`
    );
    assertTest(
      dbReportRow !== null && dbReportRow.duplicate_detected === 0,
      "Route 4.5: Persisted AI report duplicate_detected is 0 (not false positive duplicate)",
      `Got duplicate_detected: ${dbReportRow?.duplicate_detected}`
    );

    // =========================================================================
    // Part 5: PostgreSQL Repository Query Binding & Parity
    // =========================================================================
    console.log("\n--- Part 5: PostgreSQL Repository Query Binding & Parity ---");

    let capturedQueryText = "";
    let capturedQueryParams: any[] = [];

    const mockPool = {
      query: async (text: string, params?: any[]) => {
        capturedQueryText = text;
        capturedQueryParams = params || [];
        if (text.includes("image_sha256 = $1")) {
          return {
            rowCount: 1,
            rows: [
              {
                id: "mock-pg-report-id",
                complaint_id: "comp-pg-123",
                trust_score: 90.0,
                image_sha256: params?.[0],
                image_phash: "mock-pg-phash"
              }
            ]
          };
        }
        if (text.includes("image_phash IS NOT NULL")) {
          return {
            rowCount: 2,
            rows: [
              { complaint_id: "comp-pg-1", image_phash: "1111222233334444" },
              { complaint_id: "comp-pg-2", image_phash: "aaaabbbbccccdddd" }
            ]
          };
        }
        return { rowCount: 0, rows: [] };
      },
      on: () => {},
      end: async () => {},
      ending: false,
      ended: false
    };

    await resetPool();
    global.__civictrust_pg_pool__ = mockPool as unknown as Pool;

    const pgRepo = new PostgresRepository();

    // 5.1 getAIReportByImageSha256 query binding
    const testSha = "abc123def456abc123def456abc123def456abc123def456abc123def456abc1";
    const pgReport = await pgRepo.getAIReportByImageSha256(testSha);

    assertTest(
      capturedQueryText === "SELECT * FROM ai_reports WHERE image_sha256 = $1 LIMIT 1",
      "Postgres 5.1a: getAIReportByImageSha256 executes parameterized query with LIMIT 1",
      `Got query: ${capturedQueryText}`
    );
    assertTest(
      capturedQueryParams[0] === testSha,
      "Postgres 5.1b: Bound parameter $1 matches provided SHA-256 string"
    );
    assertTest(
      pgReport !== null && pgReport.complaint_id === "comp-pg-123",
      "Postgres 5.1c: Returns mapped AIReport row"
    );

    // 5.2 Empty SHA-256 handling in Postgres
    capturedQueryText = "";
    const pgEmptyReport = await pgRepo.getAIReportByImageSha256("  ");
    assertTest(
      pgEmptyReport === null && capturedQueryText === "",
      "Postgres 5.2: Missing/blank SHA-256 returns null without executing SQL query"
    );

    // 5.3 getAIReportsWithPHash query binding
    const pgPHashRows = await pgRepo.getAIReportsWithPHash();
    assertTest(
      capturedQueryText.includes("image_phash IS NOT NULL") && capturedQueryText.includes("length(image_phash) = 16"),
      "Postgres 5.3a: getAIReportsWithPHash executes query filtering 16-character pHashes",
      `Got query: ${capturedQueryText}`
    );
    assertTest(
      pgPHashRows.length === 2 && pgPHashRows[0].complaint_id === "comp-pg-1",
      "Postgres 5.3b: Returns expected mapped pHash rows"
    );

  } finally {
    // -----------------------------------------------------------------------
    // Cleanup: Teardown test SQLite records & restore PostgreSQL pool state
    // -----------------------------------------------------------------------
    try {
      if (createdReportIds.length > 0) {
        directDb.prepare(
          `DELETE FROM ai_reports WHERE id IN (${createdReportIds.map(() => "?").join(",")})`
        ).run(...createdReportIds);
      }
      if (createdComplaintIds.length > 0) {
        directDb.prepare(
          `DELETE FROM complaints WHERE id IN (${createdComplaintIds.map(() => "?").join(",")})`
        ).run(...createdComplaintIds);
        directDb.prepare(
          `DELETE FROM audit_logs WHERE details LIKE '%${testRunId}%'`
        ).run();
      }
      if (testUserId) {
        directDb.prepare("DELETE FROM audit_logs WHERE user_id = ?").run(testUserId);
        directDb.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
      }
      directDb.close();
    } catch (cleanupErr: any) {
      console.warn("Cleanup warning for SQLite test records:", cleanupErr.message);
    }

    // Restore PG pool state
    delete (global as any).__civictrust_pg_pool__;
    resetPool();
  }

  console.log("\n============================================================");
  console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
  console.log("============================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runDuplicateRegressionTests().catch(err => {
  console.error("Unhandled test execution error:", err);
  process.exit(1);
});
