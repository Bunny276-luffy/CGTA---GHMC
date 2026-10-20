import assert from "assert";
import Database from "better-sqlite3";
import path from "path";
import { randomBytes } from "crypto";
import { Jimp } from "jimp";
import { SQLiteRepository } from "../lib/repositories/sqlite";
import {
  runVerificationPipeline,
  cacheVerificationResult,
  getCachedVerificationResult,
  clearVerificationCache,
  matchCachedVerification,
  generateFileHash
} from "../lib/verification-engine";
import { POST as verifyHandler } from "../app/api/complaints/verify/route";
import { POST as submitHandler } from "../app/api/complaints/submit/route";
import { signSession } from "../lib/session";

// Configure test environment
process.env.AUTH_SECRET = "civictrust-test-auth-secret-32chars-minimum";
process.env.CAPTCHA_ENABLED = "false";

// Mock OCR to prevent worker thread delays in test runner
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

let ipCounter = 200;
function getUniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

async function createPatternImage(seed: number): Promise<Buffer> {
  const image = new Jimp({ width: 100, height: 100 });
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const color = ((Math.floor(x / 10) + Math.floor(y / 10) + seed) % 2 === 0) ? 0x336699FF : 0xCC9933FF;
      image.setPixelColor(color, x, y);
    }
  }
  return await image.getBuffer("image/jpeg");
}

async function runTokenReplayTests() {
  console.log("=== CivicTrust Issue #9: Cached Verification Token Replay Prevention Suite ===");

  let passedCount = 0;
  let failedCount = 0;

  function testAssert(condition: boolean, testName: string, details?: string) {
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

  try {
    // Setup test citizen user in SQLite database to satisfy foreign keys
    const testUser = await sqliteRepo.createUser({
      name: `Token Replay Citizen ${testRunId}`,
      email: `test-replay-${testRunId}@civictrust.local`,
      role: "CITIZEN",
      password_hash: "mock-hash"
    });
    testUserId = testUser.id;

    const citizenToken = await signSession({
      id: testUser.id,
      email: testUser.email,
      name: testUser.name,
      role: "CITIZEN",
    });

    const authHeaders = {
      "content-type": "application/json",
      "authorization": `Bearer ${citizenToken}`,
    };

    const sampleJpegBuffer1 = await createPatternImage(1);
    const sampleJpegDataUrl1 = `data:image/jpeg;base64,${sampleJpegBuffer1.toString("base64")}`;

    const sampleJpegBuffer2 = await createPatternImage(2);
    const sampleJpegDataUrl2 = `data:image/jpeg;base64,${sampleJpegBuffer2.toString("base64")}`;

    // -------------------------------------------------------------------------
    // Test 1: Successful first use consumes token
    // -------------------------------------------------------------------------
    console.log("\n--- Part 1: Single-Use Token Consumption & Replay Rejection ---");
    clearVerificationCache();
    const vResult1 = await runVerificationPipeline({
      fileName: `test_evidence_1_${testRunId}.jpg`,
      fileSize: sampleJpegBuffer1.length,
      fileType: "image/jpeg",
      category: "Roads & Potholes",
      description: "Pothole on main road",
      userLat: 17.3850,
      userLng: 78.4867,
      fileData: sampleJpegBuffer1,
      historicalRecords: [] // Isolate from preexisting test records
    });
    const token1 = cacheVerificationResult(vResult1, {
      category: "Roads & Potholes",
      userLat: 17.3850,
      userLng: 78.4867,
    });

    // 1.1: First match succeeds with default consume: true
    const match1 = await matchCachedVerification({
      token: token1,
      photoBuffer: sampleJpegBuffer1,
      category: "Roads & Potholes",
      latitude: 17.3850,
      longitude: 78.4867,
    });
    testAssert(match1 !== null, "1.1 First use matches cached verification result");
    testAssert(match1?.sha256Hash === vResult1.sha256Hash, "1.2 Result hash matches cached verification");

    // 1.3: Immediate replay of same token must be rejected
    const replayMatch = await matchCachedVerification({
      token: token1,
      photoBuffer: sampleJpegBuffer1,
      category: "Roads & Potholes",
      latitude: 17.3850,
      longitude: 78.4867,
    });
    testAssert(replayMatch === null, "1.3 Replay of consumed token returns null");

    // 1.4: Direct cache lookup for consumed token returns null
    const directLookup = getCachedVerificationResult(token1);
    testAssert(directLookup === null, "1.4 getCachedVerificationResult returns null for consumed token");

    // 1.5: Hash alias lookup for consumed token returns null
    const hashAliasLookup = getCachedVerificationResult(`hash_${vResult1.sha256Hash}`);
    testAssert(hashAliasLookup === null, "1.5 Hash alias lookup returns null for consumed token");

    // -------------------------------------------------------------------------
    // Test 2: Mismatched attributes reject without consuming token
    // -------------------------------------------------------------------------
    console.log("\n--- Part 2: Mismatched Attributes Safety & Non-Consumption ---");
    clearVerificationCache();
    const vResult2 = await runVerificationPipeline({
      fileName: `test_evidence_2_${testRunId}.jpg`,
      fileSize: sampleJpegBuffer1.length,
      fileType: "image/jpeg",
      category: "Sanitation & Waste",
      description: "Waste accumulation",
      userLat: 17.4000,
      userLng: 78.4500,
      fileData: sampleJpegBuffer1,
      historicalRecords: []
    });
    const token2 = cacheVerificationResult(vResult2, {
      category: "Sanitation & Waste",
      userLat: 17.4000,
      userLng: 78.4500,
    });

    // 2.1: Mismatched image bytes returns null
    const mismatchImage = await matchCachedVerification({
      token: token2,
      photoBuffer: sampleJpegBuffer2, // Different image
      category: "Sanitation & Waste",
      latitude: 17.4000,
      longitude: 78.4500,
    });
    testAssert(mismatchImage === null, "2.1 Mismatched image bytes rejected");

    // 2.2: Token was NOT consumed by image mismatch
    const afterImageMismatch = getCachedVerificationResult(token2);
    testAssert(afterImageMismatch !== null, "2.2 Token not consumed after image mismatch");

    // 2.3: Mismatched category returns null
    const mismatchCategory = await matchCachedVerification({
      token: token2,
      photoBuffer: sampleJpegBuffer1,
      category: "Roads & Potholes", // Different category
      latitude: 17.4000,
      longitude: 78.4500,
    });
    testAssert(mismatchCategory === null, "2.3 Mismatched category rejected");

    // 2.4: Token was NOT consumed by category mismatch
    const afterCategoryMismatch = getCachedVerificationResult(token2);
    testAssert(afterCategoryMismatch !== null, "2.4 Token not consumed after category mismatch");

    // 2.5: Mismatched coordinates outside GPS tolerance returns null
    const mismatchCoords = await matchCachedVerification({
      token: token2,
      photoBuffer: sampleJpegBuffer1,
      category: "Sanitation & Waste",
      latitude: 17.5000, // ~12km away
      longitude: 78.5500,
    });
    testAssert(mismatchCoords === null, "2.5 Coordinates outside GPS tolerance rejected");

    // 2.6: Token was NOT consumed by coordinate mismatch
    const afterCoordsMismatch = getCachedVerificationResult(token2);
    testAssert(afterCoordsMismatch !== null, "2.6 Token not consumed after coordinates mismatch");

    // 2.7: Matching request can now successfully consume the unconsumed token
    const successfulMatch = await matchCachedVerification({
      token: token2,
      photoBuffer: sampleJpegBuffer1,
      category: "Sanitation & Waste",
      latitude: 17.4000,
      longitude: 78.4500,
    });
    testAssert(successfulMatch !== null, "2.7 Legitimate matching evidence consumes token successfully");

    // 2.8: Subsequent call after legitimate consumption is rejected
    const secondReplay = await matchCachedVerification({
      token: token2,
      photoBuffer: sampleJpegBuffer1,
      category: "Sanitation & Waste",
      latitude: 17.4000,
      longitude: 78.4500,
    });
    testAssert(secondReplay === null, "2.8 Token cannot be replayed after legitimate consumption");

    // -------------------------------------------------------------------------
    // Test 3: Token Expiration
    // -------------------------------------------------------------------------
    console.log("\n--- Part 3: Token Expiration Handling ---");
    clearVerificationCache();
    const token3 = cacheVerificationResult(vResult1, {
      category: "Roads & Potholes",
      userLat: 17.3850,
      userLng: 78.4867,
    });

    const realDateNow = Date.now;
    try {
      Date.now = () => realDateNow() + 16 * 60 * 1000; // 16 minutes in future (> 15 min TTL)
      const expiredMatch = await matchCachedVerification({
        token: token3,
        photoBuffer: sampleJpegBuffer1,
        category: "Roads & Potholes",
        latitude: 17.3850,
        longitude: 78.4867,
      });
      testAssert(expiredMatch === null, "3.1 Expired verification token rejected");

      const expiredLookup = getCachedVerificationResult(token3);
      testAssert(expiredLookup === null, "3.2 Expired token evicted from cache on lookup");
    } finally {
      Date.now = realDateNow;
    }

    // -------------------------------------------------------------------------
    // Test 4: Concurrent Atomic Token Consumption
    // -------------------------------------------------------------------------
    console.log("\n--- Part 4: Atomic Concurrency Protection ---");
    clearVerificationCache();
    const token4 = cacheVerificationResult(vResult1, {
      category: "Roads & Potholes",
      userLat: 17.3850,
      userLng: 78.4867,
    });

    // Fire 10 concurrent requests to consume token4 simultaneously
    const concurrentAttempts = await Promise.all(
      Array.from({ length: 10 }, () =>
        matchCachedVerification({
          token: token4,
          photoBuffer: sampleJpegBuffer1,
          category: "Roads & Potholes",
          latitude: 17.3850,
          longitude: 78.4867,
        })
      )
    );

    const successfulAttempts = concurrentAttempts.filter((res) => res !== null);
    const rejectedAttempts = concurrentAttempts.filter((res) => res === null);

    testAssert(
      successfulAttempts.length === 1,
      "4.1 Exactly ONE concurrent request successfully consumes the token",
      `Expected 1 success, got ${successfulAttempts.length}`
    );
    testAssert(
      rejectedAttempts.length === 9,
      "4.2 All other concurrent requests (9) are rejected",
      `Expected 9 rejections, got ${rejectedAttempts.length}`
    );

    // -------------------------------------------------------------------------
    // Test 5: Route-Level Replay Duplicate Detection & Review Enforcement
    // -------------------------------------------------------------------------
    console.log("\n--- Part 5: Route-Level Submission Replay & Duplicate Enforcement ---");

    // Clean image with unique pattern for route-level test to prevent DB duplicate collisions
    const routeImageBuffer = await createPatternImage(3);
    const routeImageDataUrl = `data:image/jpeg;base64,${routeImageBuffer.toString("base64")}`;

    // Step A: Client requests initial verification via /api/complaints/verify
    const verifyReq = new Request("http://localhost:3000/api/complaints/verify", {
      method: "POST",
      headers: {
        ...authHeaders,
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        fileName: `pothole_${testRunId}.jpg`,
        fileSize: routeImageBuffer.length,
        fileData: routeImageDataUrl,
        category: "Roads & Potholes",
        description: `Severe road damage on primary road [${testRunId}]`,
        userLat: 17.3850,
        userLng: 78.4867,
        severity: "HIGH",
      }),
    });

    const verifyRes = await verifyHandler(verifyReq);
    testAssert(verifyRes.status === 200, "5.1 Initial /api/complaints/verify returns HTTP 200");
    const verifyData = await verifyRes.json();
    const routeToken = verifyData.verificationToken;
    testAssert(typeof routeToken === "string" && routeToken.length > 0, "5.2 Verification returns valid token");
    testAssert(verifyData.trustScore >= 60, "5.3 Initial verification trustScore >= 60", `Score: ${verifyData.trustScore}`);
    testAssert(verifyData.isDuplicate === false, "5.4 Initial verification indicates not a duplicate");

    // Step B: Submit initial complaint with verification token (First use)
    const submitReq1 = new Request("http://localhost:3000/api/complaints/submit", {
      method: "POST",
      headers: {
        ...authHeaders,
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        title: `Pothole on Main Road [${testRunId}]`,
        description: `Severe road damage on primary road [${testRunId}]`,
        category: "Roads & Potholes",
        latitude: 17.3850,
        longitude: 78.4867,
        address: "Charminar, Hyderabad",
        severity: "HIGH",
        beforePhotoUrl: routeImageDataUrl,
        verificationToken: routeToken,
      }),
    });

    const submitRes1 = await submitHandler(submitReq1);
    testAssert(submitRes1.status === 200, "5.5 First complaint submission returns HTTP 200");
    const submitData1 = await submitRes1.json();
    const complaint1 = submitData1.complaint;
    if (complaint1?.id) {
      createdComplaintIds.push(complaint1.id);
    }

    testAssert(complaint1?.status === "SUBMITTED", "5.6 First complaint admitted with status SUBMITTED", `Status: ${complaint1?.status}`);
    testAssert(complaint1?.trustScore >= 60, "5.7 First complaint has trustScore >= 60", `Score: ${complaint1?.trustScore}`);
    testAssert(complaint1?.verificationResult?.isDuplicate === false, "5.8 First complaint verificationResult is not duplicate");

    // Confirm database row for first complaint
    const dbRow1 = directDb.prepare("SELECT status FROM complaints WHERE id = ?").get(complaint1.id) as any;
    testAssert(dbRow1?.status === "SUBMITTED", "5.9 Persisted status in DB is SUBMITTED");

    // Step C: Replay submission with the EXACT SAME verificationToken and evidence (Replay Attack)
    const submitReq2 = new Request("http://localhost:3000/api/complaints/submit", {
      method: "POST",
      headers: {
        ...authHeaders,
        "x-forwarded-for": getUniqueIp(),
      },
      body: JSON.stringify({
        title: `Duplicate Pothole Replay Attempt [${testRunId}]`,
        description: "Replayed submission using already-consumed verification token",
        category: "Roads & Potholes",
        latitude: 17.3850,
        longitude: 78.4867,
        address: "Charminar, Hyderabad",
        severity: "HIGH",
        beforePhotoUrl: routeImageDataUrl,
        verificationToken: routeToken, // REPLAY! Token is already consumed
      }),
    });

    const submitRes2 = await submitHandler(submitReq2);
    testAssert(submitRes2.status === 200, "5.10 Replayed submission is handled gracefully (HTTP 200)");
    const submitData2 = await submitRes2.json();
    const complaint2 = submitData2.complaint;
    if (complaint2?.id) {
      createdComplaintIds.push(complaint2.id);
    }

    // Step D: Verify that replay CANNOT bypass duplicate detection or trust score rules
    testAssert(
      complaint2?.status === "TPA_REVIEW",
      "5.11 Replayed submission forced to TPA_REVIEW (cannot auto-admit to SUBMITTED)",
      `Status: ${complaint2?.status}`
    );
    testAssert(
      complaint2?.trustScore <= 35,
      "5.12 Replayed submission trustScore capped at <= 35 due to duplicate detection",
      `Score: ${complaint2?.trustScore}`
    );
    testAssert(
      complaint2?.verificationResult?.isDuplicate === true,
      "5.13 Replayed submission verificationResult.isDuplicate is TRUE"
    );
    testAssert(
      complaint2?.verificationResult?.duplicateType === "EXACT_DUPLICATE",
      "5.14 Replayed submission duplicateType is EXACT_DUPLICATE",
      `Type: ${complaint2?.verificationResult?.duplicateType}`
    );
    testAssert(
      complaint2?.verificationResult?.duplicateLinkedId === complaint1.id,
      "5.15 Replayed submission links to the parent complaint ID",
      `Linked: ${complaint2?.verificationResult?.duplicateLinkedId}`
    );

    // Step E: Direct database verification of replayed complaint and AI report
    const dbRow2 = directDb.prepare("SELECT status FROM complaints WHERE id = ?").get(complaint2.id) as any;
    testAssert(dbRow2?.status === "TPA_REVIEW", "5.16 Replayed complaint persisted in DB as TPA_REVIEW");

    const aiReportRow = directDb.prepare(
      "SELECT duplicate_detected, duplicate_parent_id, trust_score FROM ai_reports WHERE complaint_id = ?"
    ).get(complaint2.id) as any;
    testAssert(aiReportRow?.duplicate_detected === 1, "5.17 AI report in DB has duplicate_detected = 1");
    testAssert(aiReportRow?.duplicate_parent_id === complaint1.id, "5.18 AI report in DB links to parent complaint ID");
    testAssert(aiReportRow?.trust_score <= 35, "5.19 AI report in DB trust_score is capped at <= 35");

  } finally {
    // Clean up created complaints from SQLite test database
    for (const cId of createdComplaintIds) {
      try {
        directDb.prepare("DELETE FROM ai_reports WHERE complaint_id = ?").run(cId);
        directDb.prepare("DELETE FROM complaints WHERE id = ?").run(cId);
      } catch (e) {
        // ignore cleanup error
      }
    }
    if (testUserId) {
      try {
        directDb.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
      } catch (e) {
        // ignore cleanup error
      }
    }
    directDb.close();
  }

  console.log("\n============================================================");
  console.log(`Results: ${passedCount} passed, ${failedCount} failed`);
  console.log("============================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTokenReplayTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
