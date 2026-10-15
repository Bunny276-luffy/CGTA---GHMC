import assert from "assert";
import { signSession } from "../lib/session";
import { getRepository } from "../lib/db";
import { PATCH as statusHandler } from "../app/api/complaints/[id]/status/route";
import { Complaint, User } from "../lib/repositories/types";

// Ensure a consistent auth secret for token signing in tests
process.env.AUTH_SECRET = "civictrust-test-auth-secret-32chars-minimum";

let ipCounter = 1;
function getUniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

async function createAuthHeaders(user: { id: string; email: string; name: string; role: string }) {
  const token = await signSession(user);
  return {
    "content-type": "application/json",
    cookie: `civictrust_session_v2=${encodeURIComponent(token)}`,
    "x-forwarded-for": getUniqueIp(),
  };
}

// Genuinely decodable 1x1 test image fixtures (verified with installed decoders: sharp, Jimp)
// 1x1 White JPEG (baseline SOF0, JFIF, valid scan data, decodable by sharp and Jimp)
const VALID_JPEG_BUFFER = Buffer.from(
  "/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/" +
  "2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/" +
  "wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAA" +
  "AAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpAB//Z",
  "base64"
);
const VALID_JPEG_DATA_URL = `data:image/jpeg;base64,${VALID_JPEG_BUFFER.toString("base64")}`;

// 1x1 White PNG (IHDR, sRGB, IDAT, IEND, decodable by sharp and Jimp)
const VALID_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4//8/AAX+Av5Y8msOAAAAAElFTkSuQmCC",
  "base64"
);
const VALID_PNG_DATA_URL = `data:image/png;base64,${VALID_PNG_BUFFER.toString("base64")}`;

// 1x1 White WebP (RIFF, WEBP, VP8 keyframe 1x1, decodable by sharp)
const VALID_WEBP_BUFFER = Buffer.from(
  "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vz0AAA=",
  "base64"
);
const VALID_WEBP_DATA_URL = `data:image/webp;base64,${VALID_WEBP_BUFFER.toString("base64")}`;

type SharpFn = (input?: Buffer | Uint8Array | string) => {
  metadata: () => Promise<{ format?: string; width?: number; height?: number }>;
  raw: () => {
    toBuffer: (options: { resolveWithObject: true }) => Promise<{
      data: Buffer;
      info: { width: number; height: number; channels: number; size: number };
    }>;
  };
};

let sharpDecoder: SharpFn | null = null;
let sharpChecked = false;

async function getSharpDecoder(): Promise<SharpFn | null> {
  if (!sharpChecked) {
    try {
      const sharpModule = await import("sharp");
      const resolved = (sharpModule as any).default || sharpModule;
      if (typeof resolved === "function") {
        sharpDecoder = resolved as SharpFn;
      }
    } catch {
      sharpDecoder = null;
    }
    sharpChecked = true;
  }
  return sharpDecoder;
}

/**
 * Verifies that a fixture buffer can be fully decoded into uncompressed pixels by sharp.
 * When sharp is available, an undecodable fixture, unexpected format, or missing pixel data
 * causes an assertion failure.
 * If sharp is unavailable at runtime, explicitly reports that limitation; does not claim verification.
 */
async function verifyFixtureDecodability(
  buffer: Buffer,
  expectedFormat: "jpeg" | "png" | "webp"
): Promise<void> {
  const sharp = await getSharpDecoder();
  if (!sharp) {
    console.log(
      `⚠️  Decoder limitation: 'sharp' is not available in runtime environment. Full pixel decoding verification for ${expectedFormat.toUpperCase()} was not performed.`
    );
    return;
  }

  let metadata: { format?: string; width?: number; height?: number };
  let decoded: { data: Buffer; info: { width: number; height: number; channels: number; size: number } };

  try {
    metadata = await sharp(buffer).metadata();
    decoded = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  } catch (decodeErr: any) {
    assert.fail(
      `Decoder failure: Expected valid, fully decodable ${expectedFormat.toUpperCase()} fixture, but sharp decode failed: ${decodeErr.message}`
    );
  }

  // Verify container format matches expectation exactly
  assert.strictEqual(
    metadata.format,
    expectedFormat,
    `Decoded format mismatch: expected '${expectedFormat}', got '${metadata.format}'`
  );

  // Assert nonzero width and height from both container metadata and full pixel decode
  assert.ok(
    typeof metadata.width === "number" && metadata.width > 0,
    `Metadata width must be a positive number, got ${metadata.width}`
  );
  assert.ok(
    typeof metadata.height === "number" && metadata.height > 0,
    `Metadata height must be a positive number, got ${metadata.height}`
  );
  assert.ok(
    typeof decoded.info.width === "number" && decoded.info.width > 0,
    `Decoded raster width must be a positive number, got ${decoded.info.width}`
  );
  assert.ok(
    typeof decoded.info.height === "number" && decoded.info.height > 0,
    `Decoded raster height must be a positive number, got ${decoded.info.height}`
  );

  // Assert genuine pixel data is present in the decompressed buffer
  assert.ok(
    Buffer.isBuffer(decoded.data) && decoded.data.length > 0,
    `Decoded pixel buffer must contain nonzero pixel data, got length ${decoded.data?.length}`
  );

  console.log(
    `ℹ️  ${expectedFormat.toUpperCase()} fixture verified fully decodable by sharp (format: ${metadata.format}, raster: ${decoded.info.width}x${decoded.info.height}, pixels: ${decoded.data.length} bytes)`
  );
}

async function runResolutionUploadSecurityTests() {
  console.log("=== STARTING RESOLUTION EVIDENCE UPLOAD SECURITY REGRESSION TEST SUITE ===");

  const repo = getRepository();

  // Save original repository methods for safe restoration
  const originalGetComplaintById = repo.getComplaintById;
  const originalGetUserById = repo.getUserById;
  const originalUpdateComplaintStatus = repo.updateComplaintStatus;
  const originalCreateAuditLog = repo.createAuditLog;
  const originalCreateNotification = repo.createNotification;
  const originalCreateComplaintEvidence = repo.createComplaintEvidence;

  // In-memory complaint ledger for tests
  const complaintsTable = new Map<string, Complaint>();
  const recordedEvidence: { current: { complaintId: string; evidence: any } | null } = { current: null };
  const recordedStatusUpdate: { current: { complaintId: string; status: string; options?: any } | null } = { current: null };

  const getRecordedEvidence = (): { complaintId: string; evidence: any } | null => {
    return recordedEvidence.current;
  };
  const getRecordedStatusUpdate = (): { complaintId: string; status: string; options?: any } | null => {
    return recordedStatusUpdate.current;
  };

  // Stub repository methods
  repo.getComplaintById = async (id: string): Promise<Complaint | null> => {
    return complaintsTable.get(id) || null;
  };

  repo.getUserById = async (id: string): Promise<User | null> => {
    if (id === "officer-201") {
      return {
        id,
        name: "Officer 201",
        email: "officer201@civictrust.local",
        role: "OFFICER",
        password_hash: "mock",
      };
    }
    return null;
  };

  repo.updateComplaintStatus = async (complaintId: string, status: string, options?: any): Promise<void> => {
    const existing = complaintsTable.get(complaintId);
    if (existing) {
      existing.status = status;
      if (options?.resolutionPhotoUrl !== undefined) {
        existing.resolution_photo_url = options.resolutionPhotoUrl;
      }
      complaintsTable.set(complaintId, existing);
    }
    recordedStatusUpdate.current = { complaintId, status, options };
  };

  repo.createComplaintEvidence = async (complaintId: string, evidence: any): Promise<any> => {
    recordedEvidence.current = { complaintId, evidence };
    return { id: "evidence-mock-id", complaint_id: complaintId, ...evidence };
  };

  repo.createAuditLog = async (): Promise<any> => ({ id: "audit-mock" });
  repo.createNotification = async (): Promise<any> => ({ id: "notif-mock" });

  try {
    const officerHeaders = await createAuthHeaders({
      id: "officer-201",
      email: "officer201@civictrust.local",
      name: "Field Officer 201",
      role: "OFFICER",
    });

    const resetTicket = (id: string) => {
      complaintsTable.set(id, {
        id,
        tracking_id: "CGTA-2026-SEC1",
        title: "Pothole on Road #12",
        description: "Deep pothole causing traffic obstruction",
        category: "ROADS",
        status: "IN_PROGRESS",
        latitude: 17.385,
        longitude: 78.486,
        address: "Banjara Hills, Hyderabad",
        severity: "STANDARD",
        anonymous: false,
        created_by_id: "citizen-1",
        assigned_officer_id: "officer-201",
      });
      recordedEvidence.current = null;
      recordedStatusUpdate.current = null;
    };

    // -------------------------------------------------------------------------
    // TEST 1: Corrupted / Non-image payload disguised as JPEG
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: Corrupted or Non-image Payload Disguised as JPEG ---");
    resetTicket("ticket-test-1");

    const req1 = new Request("http://localhost:3000/api/complaints/ticket-test-1/status", {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: "data:image/jpeg;base64,bm90YW5pbWFnZWRhdGE=", // "notanimagedata"
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Work completed successfully at the site",
      }),
    });
    const res1 = await statusHandler(req1, { params: Promise.resolve({ id: "ticket-test-1" }) });
    assert.strictEqual(res1.status, 400, "Corrupted image payload disguised as JPEG must return HTTP 400");
    const data1 = await res1.json();
    assert.strictEqual(
      data1.message,
      "Invalid file signature. Only authentic JPEG, PNG, and WebP images are accepted.",
      "Rejection message must indicate invalid file signature"
    );
    assert.strictEqual(complaintsTable.get("ticket-test-1")?.status, "IN_PROGRESS", "Complaint status must remain IN_PROGRESS");
    assert.strictEqual(getRecordedEvidence(), null, "No evidence ledger record must be created on failed validation");
    assert.strictEqual(getRecordedStatusUpdate(), null, "No status update must be committed to repository");
    console.log("✅ TEST 1 Passed: Corrupted payload disguised as JPEG is rejected; status & evidence unchanged");

    // -------------------------------------------------------------------------
    // TEST 2: SVG and Unsupported MIME Types
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: SVG and Unsupported MIME Types ---");
    resetTicket("ticket-test-2");

    const svgPayload = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoLz48L3N2Zz4=";
    const req2 = new Request("http://localhost:3000/api/complaints/ticket-test-2/status", {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: svgPayload,
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Work completed successfully at the site",
      }),
    });
    const res2 = await statusHandler(req2, { params: Promise.resolve({ id: "ticket-test-2" }) });
    assert.strictEqual(res2.status, 400, "SVG payload must be rejected with HTTP 400");
    const data2 = await res2.json();
    assert.strictEqual(
      data2.message,
      "Invalid file signature. Only authentic JPEG, PNG, and WebP images are accepted.",
      "Rejection message must indicate invalid file signature"
    );
    assert.strictEqual(complaintsTable.get("ticket-test-2")?.status, "IN_PROGRESS", "Complaint status must remain IN_PROGRESS");
    assert.strictEqual(getRecordedEvidence(), null, "No evidence ledger record must be created for SVG upload");
    console.log("✅ TEST 2 Passed: SVG and non-whitelisted MIME types are rejected; evidence not recorded");

    // -------------------------------------------------------------------------
    // TEST 3: Embedded Script Payload inside Image Buffer
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Embedded Script Payload inside Image Buffer ---");
    resetTicket("ticket-test-3");

    // Buffer starts with JPEG magic bytes (0xFF 0xD8 0xFF) followed by <script> tag
    const scriptBuffer = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from("<script>alert('CIVICTRUST_XSS')</script>"),
    ]);
    const req3 = new Request("http://localhost:3000/api/complaints/ticket-test-3/status", {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: `data:image/jpeg;base64,${scriptBuffer.toString("base64")}`,
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Work completed successfully at the site",
      }),
    });
    const res3 = await statusHandler(req3, { params: Promise.resolve({ id: "ticket-test-3" }) });
    assert.strictEqual(res3.status, 400, "Image payload with embedded script tag must return HTTP 400");
    const data3 = await res3.json();
    assert.strictEqual(
      data3.message,
      "File rejected due to embedded script or code content.",
      "Rejection message must indicate embedded script or code detection"
    );
    assert.strictEqual(complaintsTable.get("ticket-test-3")?.status, "IN_PROGRESS", "Complaint status must remain IN_PROGRESS");
    assert.strictEqual(getRecordedEvidence(), null, "Evidence record must not be created for embedded script payload");
    console.log("✅ TEST 3 Passed: Embedded script payload rejected; evidence not recorded");

    // -------------------------------------------------------------------------
    // TEST 4: Embedded PHP / Executable Code inside Image Buffer
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Embedded PHP Code inside Image Buffer ---");
    resetTicket("ticket-test-4");

    const phpBuffer = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from("<?php system($_GET['cmd']); ?>"),
    ]);
    const req4 = new Request("http://localhost:3000/api/complaints/ticket-test-4/status", {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: `data:image/jpeg;base64,${phpBuffer.toString("base64")}`,
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Work completed successfully at the site",
      }),
    });
    const res4 = await statusHandler(req4, { params: Promise.resolve({ id: "ticket-test-4" }) });
    assert.strictEqual(res4.status, 400, "Image payload with embedded PHP signature must return HTTP 400");
    const data4 = await res4.json();
    assert.strictEqual(
      data4.message,
      "File rejected due to embedded script or code content.",
      "Rejection message must indicate embedded script/code detection"
    );
    assert.strictEqual(complaintsTable.get("ticket-test-4")?.status, "IN_PROGRESS", "Complaint status must remain IN_PROGRESS");
    console.log("✅ TEST 4 Passed: Embedded PHP payload rejected; status unchanged");

    // -------------------------------------------------------------------------
    // TEST 5: Malformed Data URL Format
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Malformed Data URL Format ---");
    resetTicket("ticket-test-5");

    const req5 = new Request("http://localhost:3000/api/complaints/ticket-test-5/status", {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: "not-a-valid-data-url",
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Work completed successfully at the site",
      }),
    });
    const res5 = await statusHandler(req5, { params: Promise.resolve({ id: "ticket-test-5" }) });
    assert.strictEqual(res5.status, 400, "Malformed data URL must return HTTP 400");
    assert.strictEqual(complaintsTable.get("ticket-test-5")?.status, "IN_PROGRESS", "Complaint status must remain IN_PROGRESS");
    console.log("✅ TEST 5 Passed: Malformed non-data-URL is rejected");

    // -------------------------------------------------------------------------
    // TEST 6: Valid JPEG Upload — Saves Detected MIME and Byte Size
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 6: Valid JPEG Upload with Correct Metadata ---");
    resetTicket("ticket-test-6");

    await verifyFixtureDecodability(VALID_JPEG_BUFFER, "jpeg");

    const req6 = new Request("http://localhost:3000/api/complaints/ticket-test-6/status", {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: VALID_JPEG_DATA_URL,
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Pothole filled with asphalt and steam-rolled",
      }),
    });
    const res6 = await statusHandler(req6, { params: Promise.resolve({ id: "ticket-test-6" }) });
    assert.strictEqual(res6.status, 200, "Valid JPEG resolution must return HTTP 200");
    const data6 = await res6.json();
    assert.strictEqual(data6.complaint?.status, "RESOLVED", "Status must be updated to RESOLVED");
    assert.strictEqual(complaintsTable.get("ticket-test-6")?.status, "RESOLVED", "Complaint in ledger must be RESOLVED");
    const evidence6 = getRecordedEvidence();
    assert.ok(evidence6, "Evidence ledger record must be created");
    assert.strictEqual(evidence6.evidence.file_type, "image/jpeg", "Detected MIME type must be image/jpeg");
    assert.strictEqual(
      evidence6.evidence.size_bytes,
      VALID_JPEG_BUFFER.length,
      `Decoded size_bytes must equal exact buffer length (${VALID_JPEG_BUFFER.length})`
    );
    console.log("✅ TEST 6 Passed: Valid JPEG accepted; saved with MIME image/jpeg and accurate size_bytes");

    // -------------------------------------------------------------------------
    // TEST 7: Valid PNG Upload — Saves Detected MIME 'image/png'
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 7: Valid PNG Upload with Correct Metadata ---");
    resetTicket("ticket-test-7");

    await verifyFixtureDecodability(VALID_PNG_BUFFER, "png");

    const req7 = new Request("http://localhost:3000/api/complaints/ticket-test-7/status", {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: VALID_PNG_DATA_URL,
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Pothole patch verified with compaction report photo",
      }),
    });
    const res7 = await statusHandler(req7, { params: Promise.resolve({ id: "ticket-test-7" }) });
    assert.strictEqual(res7.status, 200, "Valid PNG resolution must return HTTP 200");
    assert.strictEqual(complaintsTable.get("ticket-test-7")?.status, "RESOLVED", "Complaint must be RESOLVED");
    const evidence7 = getRecordedEvidence();
    assert.ok(evidence7, "Evidence ledger record must be created");
    assert.strictEqual(evidence7.evidence.file_type, "image/png", "Detected MIME type must be image/png");
    assert.strictEqual(
      evidence7.evidence.size_bytes,
      VALID_PNG_BUFFER.length,
      `Decoded size_bytes must equal exact PNG buffer length (${VALID_PNG_BUFFER.length})`
    );
    console.log("✅ TEST 7 Passed: Valid PNG accepted; saved with MIME image/png and accurate size_bytes");

    // -------------------------------------------------------------------------
    // TEST 8: Valid WebP Upload — Saves Detected MIME 'image/webp'
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 8: Valid WebP Upload with Correct Metadata ---");
    resetTicket("ticket-test-8");

    await verifyFixtureDecodability(VALID_WEBP_BUFFER, "webp");

    const req8 = new Request("http://localhost:3000/api/complaints/ticket-test-8/status", {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: VALID_WEBP_DATA_URL,
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Onsite asphalt compaction verified and clean",
      }),
    });
    const res8 = await statusHandler(req8, { params: Promise.resolve({ id: "ticket-test-8" }) });
    assert.strictEqual(res8.status, 200, "Valid WebP resolution must return HTTP 200");
    assert.strictEqual(complaintsTable.get("ticket-test-8")?.status, "RESOLVED", "Complaint must be RESOLVED");
    const evidence8 = getRecordedEvidence();
    assert.ok(evidence8, "Evidence ledger record must be created");
    assert.strictEqual(evidence8.evidence.file_type, "image/webp", "Detected MIME type must be image/webp");
    assert.strictEqual(
      evidence8.evidence.size_bytes,
      VALID_WEBP_BUFFER.length,
      `Decoded size_bytes must equal exact WebP buffer length (${VALID_WEBP_BUFFER.length})`
    );
    console.log("✅ TEST 8 Passed: Valid WebP accepted; saved with MIME image/webp and accurate size_bytes");

    // -------------------------------------------------------------------------
    // TEST 9: Geofence Failure with Valid Photo Routes to TPA_REVIEW
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 9: Geofence Failure with Valid Photo Routes to TPA_REVIEW ---");
    resetTicket("ticket-test-9");

    // Coordinates far away from site (17.385, 78.486)
    const req9 = new Request("http://localhost:3000/api/complaints/ticket-test-9/status", {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: VALID_JPEG_DATA_URL,
        officerLat: 18.000,
        officerLng: 79.000,
        notes: "Claiming resolution from remote area",
      }),
    });
    const res9 = await statusHandler(req9, { params: Promise.resolve({ id: "ticket-test-9" }) });
    assert.strictEqual(res9.status, 200, "Geofence failure routes to TPA_REVIEW with HTTP 200");
    const data9 = await res9.json();
    assert.strictEqual(data9.complaint?.status, "TPA_REVIEW", "Complaint status must be routed to TPA_REVIEW");
    assert.strictEqual(data9.escalated, true, "Escalated flag must be true");
    const evidence9 = getRecordedEvidence();
    assert.ok(evidence9, "Evidence must be preserved for third-party auditor");
    assert.strictEqual(evidence9.evidence.file_type, "image/jpeg", "Evidence MIME must be preserved");
    assert.strictEqual(evidence9.evidence.size_bytes, VALID_JPEG_BUFFER.length, "Evidence size must be preserved");
    console.log("✅ TEST 9 Passed: Geofence breach preserves validated evidence and routes to TPA_REVIEW");

    console.log("\n=== ALL RESOLUTION EVIDENCE UPLOAD SECURITY TESTS PASSED ===");
  } finally {
    // Restore repository methods
    repo.getComplaintById = originalGetComplaintById;
    repo.getUserById = originalGetUserById;
    repo.updateComplaintStatus = originalUpdateComplaintStatus;
    repo.createAuditLog = originalCreateAuditLog;
    repo.createNotification = originalCreateNotification;
    repo.createComplaintEvidence = originalCreateComplaintEvidence;
  }
}

runResolutionUploadSecurityTests().catch((err) => {
  console.error("❌ REGRESSION TEST FAILED:", err);
  process.exit(1);
});
