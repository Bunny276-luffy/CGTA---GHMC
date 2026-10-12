import assert from "assert";
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

// Setup environment
process.env.AUTH_SECRET = "civictrust-test-auth-secret-32chars-minimum";
process.env.CAPTCHA_ENABLED = "false"; // Permit development workflow in local tests

let ipCounter = 1;
function getUniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

import { Jimp } from "jimp";

// Mock OCR to prevent worker thread crashes in offline/mock environment
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

async function createTestImage(format: "jpeg" | "png", width: number, height: number, colorHex: number): Promise<Buffer> {
  const image = new Jimp({ width, height, color: colorHex });
  const mime = format === "jpeg" ? "image/jpeg" : "image/png";
  return await image.getBuffer(mime);
}

async function runEvidenceIntegrityTests() {
  console.log("=== STARTING EVIDENCE VERIFICATION INTEGRITY TEST SUITE ===");

  const sampleJpegBuffer1 = await createTestImage("jpeg", 100, 100, 0xFF0000FF);
  const sampleJpegDataUrl1 = `data:image/jpeg;base64,${sampleJpegBuffer1.toString("base64")}`;

  const sampleJpegBuffer2 = await createTestImage("jpeg", 100, 100, 0x00FF00FF);
  const sampleJpegDataUrl2 = `data:image/jpeg;base64,${sampleJpegBuffer2.toString("base64")}`;

  const citizenToken = await signSession({
    id: "citizen-integrity-test",
    email: "citizen.integrity@example.com",
    name: "Citizen Integrity",
    role: "CITIZEN",
  });

  const authHeaders = {
    "content-type": "application/json",
    "authorization": `Bearer ${citizenToken}`,
  };

  // --------------------------------------------------------------------------
  // Scenario 1: Correct token, same image, same category, matching coordinates
  // --------------------------------------------------------------------------
  clearVerificationCache();
  const vResult1 = await runVerificationPipeline({
    fileName: "pothole1.jpg",
    fileSize: sampleJpegBuffer1.length,
    fileType: "image/jpeg",
    category: "Roads & Potholes",
    description: "Deep pothole on main road",
    userLat: 17.3850,
    userLng: 78.4867,
    fileData: sampleJpegBuffer1,
  });
  const token1 = cacheVerificationResult(vResult1, {
    category: "Roads & Potholes",
    userLat: 17.3850,
    userLng: 78.4867,
  });

  const match1 = await matchCachedVerification({
    token: token1,
    photoBuffer: sampleJpegBuffer1,
    category: "Roads & Potholes",
    latitude: 17.3850,
    longitude: 78.4867,
  });
  assert(match1 !== null, "Matching evidence must retrieve cached verification result");
  assert.strictEqual(match1.sha256Hash, vResult1.sha256Hash, "Result SHA-256 must match verified evidence");
  console.log("✅ Scenario 1 Passed: Same image, category, and coordinates successfully match cache");

  // --------------------------------------------------------------------------
  // Scenario 2: Token reused with a different image
  // --------------------------------------------------------------------------
  const match2 = await matchCachedVerification({
    token: token1,
    photoBuffer: sampleJpegBuffer2, // Different image bytes!
    category: "Roads & Potholes",
    latitude: 17.3850,
    longitude: 78.4867,
  });
  assert.strictEqual(match2, null, "Token reused with different image bytes must be rejected");
  console.log("✅ Scenario 2 Passed: Token reused with altered image bytes is safely rejected");

  // --------------------------------------------------------------------------
  // Scenario 3: Token reused with a different category
  // --------------------------------------------------------------------------
  const match3 = await matchCachedVerification({
    token: token1,
    photoBuffer: sampleJpegBuffer1,
    category: "Garbage & Waste", // Different category!
    latitude: 17.3850,
    longitude: 78.4867,
  });
  assert.strictEqual(match3, null, "Token reused with different category must be rejected");
  console.log("✅ Scenario 3 Passed: Token reused with altered category is safely rejected");

  // --------------------------------------------------------------------------
  // Scenario 4: Token reused with different coordinates (outside tolerance)
  // --------------------------------------------------------------------------
  const match4 = await matchCachedVerification({
    token: token1,
    photoBuffer: sampleJpegBuffer1,
    category: "Roads & Potholes",
    latitude: 17.4400, // Drifts ~6km away
    longitude: 78.5000,
  });
  assert.strictEqual(match4, null, "Token reused with coordinates outside tolerance must be rejected");
  console.log("✅ Scenario 4 Passed: Token reused with shifted coordinates is safely rejected");

  // --------------------------------------------------------------------------
  // Scenario 5: Client-supplied hash that does not match uploaded bytes
  // --------------------------------------------------------------------------
  // Client attempts to pass arbitrary token and unverified photo
  const fakeHash = "sha256_0000000000000000000000000000000000000000000000000000000000000000";
  const match5 = await matchCachedVerification({
    token: fakeHash,
    photoBuffer: sampleJpegBuffer1,
    category: "Roads & Potholes",
    latitude: 17.3850,
    longitude: 78.4867,
  });
  assert.strictEqual(match5, null, "Unverified client-supplied hash must not match cache");
  console.log("✅ Scenario 5 Passed: Arbitrary unverified hash parameter cannot bypass verification");

  // --------------------------------------------------------------------------
  // Scenario 6: Missing, unknown, or expired token
  // --------------------------------------------------------------------------
  const match6Missing = await matchCachedVerification({
    token: null,
    photoBuffer: sampleJpegBuffer1,
    category: "Roads & Potholes",
  });
  assert.strictEqual(match6Missing, null, "Missing token must return null");

  const match6Unknown = await matchCachedVerification({
    token: "non_existent_token_12345",
    photoBuffer: sampleJpegBuffer1,
    category: "Roads & Potholes",
  });
  assert.strictEqual(match6Unknown, null, "Unknown token must return null");
  console.log("✅ Scenario 6 Passed: Missing and unknown tokens safely yield cache misses");

  // --------------------------------------------------------------------------
  // Scenario 7: Coordinate validation on /api/complaints/verify route
  // --------------------------------------------------------------------------
  // Subcase A: Latitude out of range (> 90)
  const reqInvalidLat = new Request("http://localhost:3000/api/complaints/verify", {
    method: "POST",
    headers: { ...authHeaders, "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      category: "Roads & Potholes",
      userLat: 195.0, // Invalid latitude
      userLng: 78.4867,
    }),
  });
  const resInvalidLat = await verifyHandler(reqInvalidLat);
  assert.strictEqual(resInvalidLat.status, 400, "Verify route must reject latitude > 90 with HTTP 400");
  const dataInvalidLat = await resInvalidLat.json();
  assert(dataInvalidLat.message?.includes("Valid GPS coordinates"), "Error message should cite GPS coordinates");

  // Subcase B: Non-finite coordinates (NaN / Infinity)
  const reqNaNLat = new Request("http://localhost:3000/api/complaints/verify", {
    method: "POST",
    headers: { ...authHeaders, "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      category: "Roads & Potholes",
      userLat: "NaN", // Non-number or NaN
      userLng: 78.4867,
    }),
  });
  const resNaNLat = await verifyHandler(reqNaNLat);
  assert.strictEqual(resNaNLat.status, 400, "Verify route must reject invalid coordinates with HTTP 400");

  // Subcase C: Invalid deviceLat
  const reqInvalidDeviceLat = new Request("http://localhost:3000/api/complaints/verify", {
    method: "POST",
    headers: { ...authHeaders, "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      category: "Roads & Potholes",
      userLat: 17.3850,
      userLng: 78.4867,
      deviceLat: 999.0, // Invalid device latitude
      deviceLng: 78.4867,
    }),
  });
  const resInvalidDeviceLat = await verifyHandler(reqInvalidDeviceLat);
  assert.strictEqual(resInvalidDeviceLat.status, 400, "Verify route must reject deviceLat > 90 with HTTP 400");
  console.log("✅ Scenario 7 Passed: Invalid, non-finite, and out-of-range coordinates rejected with HTTP 400");

  // --------------------------------------------------------------------------
  // Scenario 8: Invalid category and severity rejection
  // --------------------------------------------------------------------------
  const reqInvalidCat = new Request("http://localhost:3000/api/complaints/verify", {
    method: "POST",
    headers: { ...authHeaders, "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      category: "Unauthorized Custom Category",
    }),
  });
  const resInvalidCat = await verifyHandler(reqInvalidCat);
  assert.strictEqual(resInvalidCat.status, 400, "Verify route must reject invalid category with HTTP 400");

  const reqInvalidSev = new Request("http://localhost:3000/api/complaints/verify", {
    method: "POST",
    headers: { ...authHeaders, "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      category: "Roads & Potholes",
      severity: "SUPER_CRITICAL_CUSTOM",
    }),
  });
  const resInvalidSev = await verifyHandler(reqInvalidSev);
  assert.strictEqual(resInvalidSev.status, 400, "Verify route must reject invalid severity with HTTP 400");
  console.log("✅ Scenario 8 Passed: Invalid category and severity are rejected with HTTP 400");

  // --------------------------------------------------------------------------
  // Scenario 9: Distinct user coordinates and device coordinates handling
  // --------------------------------------------------------------------------
  // Send distinct userLat (Hyderabad) and deviceLat (Bangalore)
  const reqDistinctCoords = new Request("http://localhost:3000/api/complaints/verify", {
    method: "POST",
    headers: { ...authHeaders, "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      category: "Roads & Potholes",
      userLat: 17.3850,
      userLng: 78.4867,
      deviceLat: 12.9716, // Bangalore coordinates
      deviceLng: 77.5946,
      fileName: "gps_test.jpg",
      fileData: sampleJpegDataUrl1,
    }),
  });
  const resDistinct = await verifyHandler(reqDistinctCoords);
  assert.strictEqual(resDistinct.status, 200, "Verify route must succeed with valid distinct coordinates");
  const dataDistinct = await resDistinct.json();
  assert(dataDistinct.verificationToken, "Verification result must include token");
  assert.strictEqual(dataDistinct.complaintLatitude, 17.3850, "User complaint latitude must be preserved");
  assert.notStrictEqual(dataDistinct.imageLatitude, dataDistinct.complaintLatitude, "Device/EXIF latitude must never be silently overwritten by userLat");
  assert.strictEqual(dataDistinct.imageLatitude, null, "Image with no EXIF tags must not inherit userLat as EXIF imageLatitude");
  console.log("✅ Scenario 9 Passed: Distinct user and device coordinates correctly handled without silent substitution");

  // --------------------------------------------------------------------------
  // Scenario 10: Submission Route Integrity — cached token verified or safely rerun
  // --------------------------------------------------------------------------
  // Subcase A: Valid verify -> valid submit preserves verificationToken
  const reqVerifyLegit = new Request("http://localhost:3000/api/complaints/verify", {
    method: "POST",
    headers: { ...authHeaders, "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      category: "Roads & Potholes",
      description: "Severe pothole at Jubilee Hills road",
      userLat: 17.3850,
      userLng: 78.4867,
      fileName: "legit.jpg",
      fileData: sampleJpegDataUrl1,
    }),
  });
  const resVerifyLegit = await verifyHandler(reqVerifyLegit);
  assert.strictEqual(resVerifyLegit.status, 200);
  const dataVerifyLegit = await resVerifyLegit.json();
  const legitToken = dataVerifyLegit.verificationToken;
  assert(legitToken, "Legit verification must produce a token");

  // Submit with matching token and matching photo
  const matchResult = await matchCachedVerification({
    token: legitToken,
    photoBuffer: sampleJpegBuffer1,
    category: "Roads & Potholes",
    latitude: 17.3850,
    longitude: 78.4867,
  });
  assert(matchResult !== null, "Legitimate submission evidence must match cached token");

  // Subcase B: Attempt to submit with legitToken but swapped photo (sampleJpegBuffer2)
  const swappedResult = await matchCachedVerification({
    token: legitToken,
    photoBuffer: sampleJpegBuffer2, // Swapped!
    category: "Roads & Potholes",
    latitude: 17.3850,
    longitude: 78.4867,
  });
  assert.strictEqual(swappedResult, null, "Swapped photo must NOT match cached token");
  console.log("✅ Scenario 10 Passed: Legitimate submission matches token; swapped photo rejected");

  console.log("=== ALL EVIDENCE INTEGRITY REGRESSION TESTS PASSED ===");
}

runEvidenceIntegrityTests().catch((err) => {
  console.error("❌ Evidence integrity test failed:", err);
  process.exit(1);
});
