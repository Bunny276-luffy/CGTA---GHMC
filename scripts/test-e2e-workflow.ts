import assert from "assert";
import { signSession } from "../lib/session";
import { getRepository } from "../lib/db";
import { POST as submitHandler } from "../app/api/complaints/submit/route";
import { GET as listHandler } from "../app/api/complaints/route";
import { PATCH as statusHandler } from "../app/api/complaints/[id]/status/route";
import { GET as trackHandler } from "../app/api/complaints/track/route";
import { hashPassword } from "../lib/crypto";
import { Jimp } from "jimp";
import Database from "better-sqlite3";
import path from "path";

// Ensure auth secret is set for test session tokens
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "civictrust-test-auth-secret-32chars-minimum";

// Tesseract OCR stub to ensure deterministic recognition on synthetic test images
const exifParserModule = require("exif-parser");
const originalExifCreate = exifParserModule.create;

function stubExif(lat: number, lng: number) {
  exifParserModule.create = () => ({
    parse: () => ({
      tags: {
        GPSLatitude: Math.abs(lat),
        GPSLongitude: Math.abs(lng),
        GPSLatitudeRef: lat >= 0 ? "N" : "S",
        GPSLongitudeRef: lng >= 0 ? "E" : "W",
        Make: "Canon",
        Model: "Canon EOS 5D Mark IV",
        DateTimeOriginal: Math.floor(Date.now() / 1000) - 60
      }
    })
  });
}

function restoreExif() {
  exifParserModule.create = originalExifCreate;
}

const tesseractModule = require("tesseract.js");
const originalCreateWorker = tesseractModule.createWorker;

function stubOcr() {
  tesseractModule.createWorker = async () => ({
    recognize: async () => ({
      data: { text: "Road defect Jubilee Hills", confidence: 95 }
    }),
    terminate: async () => {}
  });
}

function restoreOcr() {
  tesseractModule.createWorker = originalCreateWorker;
}

let ipCounter = 200;
function getUniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

async function createAuthHeaders(user: { id: string; email: string; name: string; role: string }) {
  const token = await signSession(user);
  return {
    "content-type": "application/json",
    cookie: `civictrust_session_v2=${encodeURIComponent(token)}`,
    "x-forwarded-for": getUniqueIp()
  };
}

import { runVerificationPipeline, cacheVerificationResult } from "../lib/verification-engine";

async function createPatternImage(seed: number): Promise<{ buffer: Buffer; dataUrl: string }> {
  const image = new Jimp({ width: 100, height: 100 });
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const color = ((Math.floor(x / 10) + Math.floor(y / 10) + seed) % 2 === 0) ? 0x336699FF : 0xCC9933FF;
      image.setPixelColor(color, x, y);
    }
  }
  const buffer = await image.getBuffer("image/jpeg");
  const dataUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;
  return { buffer, dataUrl };
}

async function runE2EWorkflowTests() {
  console.log("=== STARTING CIVICTRUST END-TO-END MULTI-ROLE INTEGRATION TEST SUITE ===");
  stubOcr();
  stubExif(17.43, 78.41);

  const repo = getRepository();
  await repo.setupDatabase();

  const timestamp = Date.now();
  const citizenEmail = `citizen.e2e.${timestamp}@civictrust.local`;
  const deptEmail = `dept.e2e.${timestamp}@civictrust.local`;
  const officerEmail = `officer.e2e.${timestamp}@civictrust.local`;
  const adminEmail = `admin.e2e.${timestamp}@civictrust.local`;

  let citizenUser: any;
  let deptUser: any;
  let officerUser: any;
  let adminUser: any;
  let createdComplaintId = "";

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Provision Multi-Role Test Accounts
    // -------------------------------------------------------------------------
    console.log("\n[Phase 1] Provisioning test actors for Citizen, Dept Head, Officer, and Admin...");

    citizenUser = await repo.createUser({
      name: "E2E Citizen User",
      email: citizenEmail,
      role: "CITIZEN",
      password_hash: hashPassword("E2E_Test_Pass_123!")
    });
    console.log(`✅ Citizen account provisioned: ${citizenUser.id} (${citizenUser.email})`);

    deptUser = await repo.createUser({
      name: "E2E Dept Head User",
      email: deptEmail,
      role: "DEPT_HEAD",
      password_hash: hashPassword("E2E_Test_Pass_123!")
    });
    console.log(`✅ Department Head account provisioned: ${deptUser.id} (${deptUser.email})`);

    officerUser = await repo.createUser({
      name: "E2E Field Officer User",
      email: officerEmail,
      role: "OFFICER",
      password_hash: hashPassword("E2E_Test_Pass_123!")
    });
    console.log(`✅ Field Officer account provisioned: ${officerUser.id} (${officerUser.email})`);

    adminUser = await repo.createUser({
      name: "E2E Municipal Admin User",
      email: adminEmail,
      role: "ADMIN",
      password_hash: hashPassword("E2E_Test_Pass_123!")
    });
    console.log(`✅ Admin account provisioned: ${adminUser.id} (${adminUser.email})`);

    // Prepare auth headers
    const citizenHeaders = await createAuthHeaders(citizenUser);
    const deptHeaders = await createAuthHeaders(deptUser);
    const officerHeaders = await createAuthHeaders(officerUser);
    const adminHeaders = await createAuthHeaders(adminUser);

    const { buffer: photoBuf, dataUrl: validJpegDataUrl } = await createPatternImage(timestamp);

    // Pre-verify evidence using the real verification engine
    const vResult = await runVerificationPipeline({
      fileName: `evidence_${timestamp}.jpg`,
      fileSize: photoBuf.length,
      fileType: "image/jpeg",
      category: "Roads & Potholes",
      description: "Hazardous deep pothole causing traffic obstruction and rim damage near metro pillar.",
      address: "Near Metro Pillar 104, Road 36, Jubilee Hills, Hyderabad",
      userLat: 17.4300,
      userLng: 78.4100,
      deviceLat: 17.4300,
      deviceLng: 78.4100,
      fileLastModified: Date.now(),
      fileData: photoBuf,
      severity: "HIGH",
      historicalRecords: []
    });

    const verificationToken = cacheVerificationResult(vResult, {
      category: "Roads & Potholes",
      userLat: 17.4300,
      userLng: 78.4100
    });

    // -------------------------------------------------------------------------
    // Phase 2: Citizen Grievance Submission
    // -------------------------------------------------------------------------
    console.log("\n[Phase 2] Citizen submitting new grievance with evidence photo, GPS, and verification token...");

    const submitReq = new Request("http://localhost:3000/api/complaints/submit", {
      method: "POST",
      headers: citizenHeaders,
      body: JSON.stringify({
        title: "Major Pothole on Road 36 Jubilee Hills",
        description: "Hazardous deep pothole causing traffic obstruction and rim damage near metro pillar.",
        category: "Roads & Potholes",
        severity: "HIGH",
        address: "Near Metro Pillar 104, Road 36, Jubilee Hills, Hyderabad",
        latitude: 17.4300,
        longitude: 78.4100,
        beforePhotoUrl: validJpegDataUrl,
        photoName: "road_defect.jpg",
        verificationToken
      })
    });

    const submitRes = await submitHandler(submitReq);
    assert.strictEqual(submitRes.status, 200, `Submit must return 200 OK, got ${submitRes.status}`);

    const submitData = await submitRes.json();
    createdComplaintId = submitData.complaint?.id;
    const trackingId = submitData.complaint?.trackingId;

    assert.ok(createdComplaintId, "Submit response must return server-generated complaint ID");
    assert.ok(trackingId, "Submit response must return tracking ID");
    assert.match(trackingId, /^CGTA-\d{4}-[A-Z0-9]{4,8}$/, "Tracking ID must match standard CGTA pattern");
    assert.strictEqual(submitData.complaint.status, "SUBMITTED", "Initial status must be SUBMITTED");

    console.log(`✅ Grievance created: ${createdComplaintId} [${trackingId}] — Status: ${submitData.complaint.status}`);

    // -------------------------------------------------------------------------
    // Phase 3: Department Head Queries & Assigns Complaint to Officer
    // -------------------------------------------------------------------------
    console.log("\n[Phase 3] Department Head reviewing unassigned complaints and assigning to field officer...");

    const deptListReq = new Request("http://localhost:3000/api/complaints?scope=all", {
      method: "GET",
      headers: deptHeaders
    });
    const deptListRes = await listHandler(deptListReq);
    assert.strictEqual(deptListRes.status, 200, "Dept Head listing must succeed");
    const deptListData = await deptListRes.json();
    assert.ok(Array.isArray(deptListData), "Complaints listing must return an array");

    const foundInList = deptListData.find((c: any) => c.id === createdComplaintId);
    assert.ok(foundInList, "Submitted complaint must be visible in Department Head listing");
    assert.strictEqual(foundInList.status, "SUBMITTED");

    // Dept Head assigns complaint to Officer
    const assignReq = new Request(`http://localhost:3000/api/complaints/${createdComplaintId}/status`, {
      method: "PATCH",
      headers: deptHeaders,
      body: JSON.stringify({
        status: "ASSIGNED",
        assignedOfficerId: officerUser.id,
        notes: "Assigned to Jubilee Hills ward officer for immediate field inspection"
      })
    });
    const assignRes = await statusHandler(assignReq, {
      params: Promise.resolve({ id: createdComplaintId })
    });
    assert.strictEqual(assignRes.status, 200, `Dept Head assignment must return 200, got ${assignRes.status}`);
    const assignData = await assignRes.json();
    assert.strictEqual(assignData.complaint.status, "ASSIGNED");
    const assignedComplaintInDb = await repo.getComplaintById(createdComplaintId);
    assert.strictEqual(assignedComplaintInDb?.assigned_officer_id, officerUser.id, "Assigned officer ID must be persisted in database");
    console.log(`✅ Complaint ${createdComplaintId} successfully assigned to Officer ${officerUser.id}`);

    // -------------------------------------------------------------------------
    // Phase 4: Officer Acknowledges and Starts Work (IN_PROGRESS)
    // -------------------------------------------------------------------------
    console.log("\n[Phase 4] Officer acknowledging assignment and moving ticket to IN_PROGRESS...");

    const startWorkReq = new Request(`http://localhost:3000/api/complaints/${createdComplaintId}/status`, {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Officer arrived on site at Jubilee Hills Road 36, commencing asphalt repair"
      })
    });
    const startWorkRes = await statusHandler(startWorkReq, {
      params: Promise.resolve({ id: createdComplaintId })
    });
    assert.strictEqual(startWorkRes.status, 200, "Officer transition to IN_PROGRESS must succeed");
    const startWorkData = await startWorkRes.json();
    assert.strictEqual(startWorkData.complaint.status, "IN_PROGRESS");
    console.log(`✅ Complaint ${createdComplaintId} moved to IN_PROGRESS by assigned officer`);

    // -------------------------------------------------------------------------
    // Phase 5: Officer Submits Resolution Proof with On-Site GPS (RESOLVED)
    // -------------------------------------------------------------------------
    console.log("\n[Phase 5] Officer submitting resolution photographic proof and on-site GPS...");

    const resolveReq = new Request(`http://localhost:3000/api/complaints/${createdComplaintId}/status`, {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: validJpegDataUrl,
        officerLat: 17.4300, // Matching location within tolerance
        officerLng: 78.4100,
        notes: "Filled pothole with hot asphalt mix, compacted surface, traffic restored"
      })
    });
    const resolveRes = await statusHandler(resolveReq, {
      params: Promise.resolve({ id: createdComplaintId })
    });
    assert.strictEqual(resolveRes.status, 200, "Officer resolution submission must succeed");
    const resolveData = await resolveRes.json();
    assert.strictEqual(resolveData.complaint.status, "RESOLVED");
    assert.ok(resolveData.geofence?.withinTolerance, "Officer GPS must be verified within tolerance");
    console.log(`✅ Complaint ${createdComplaintId} marked RESOLVED with verified on-site GPS`);

    // -------------------------------------------------------------------------
    // Phase 6: Citizen Disputes Resolution (1st Dispute -> Returns to IN_PROGRESS)
    // -------------------------------------------------------------------------
    console.log("\n[Phase 6] Citizen inspecting resolution and submitting 1st dispute...");

    const dispute1Req = new Request(`http://localhost:3000/api/complaints/${createdComplaintId}/status`, {
      method: "PATCH",
      headers: citizenHeaders,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Pavement is still noticeably uneven and asphalt was not leveled with the kerb"
      })
    });
    const dispute1Res = await statusHandler(dispute1Req, {
      params: Promise.resolve({ id: createdComplaintId })
    });
    assert.strictEqual(dispute1Res.status, 200, "Citizen dispute must succeed");
    const dispute1Data = await dispute1Res.json();
    assert.strictEqual(dispute1Data.complaint.status, "IN_PROGRESS", "Disputed complaint must return to IN_PROGRESS");
    assert.strictEqual(dispute1Data.complaint.rejectionCount, 1, "rejectionCount must be incremented to 1");
    console.log(`✅ 1st Dispute verified: status returned to IN_PROGRESS, rejectionCount: ${dispute1Data.complaint.rejectionCount}`);

    // -------------------------------------------------------------------------
    // Phase 7: Officer Submits Second Resolution Proof
    // -------------------------------------------------------------------------
    console.log("\n[Phase 7] Officer re-visiting site and submitting second resolution proof...");

    const resolve2Req = new Request(`http://localhost:3000/api/complaints/${createdComplaintId}/status`, {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: validJpegDataUrl,
        officerLat: 17.4300,
        officerLng: 78.4100,
        notes: "Re-rolled and leveled asphalt flush with kerb surface"
      })
    });
    const resolve2Res = await statusHandler(resolve2Req, {
      params: Promise.resolve({ id: createdComplaintId })
    });
    assert.strictEqual(resolve2Res.status, 200, "Second resolution submission must succeed");
    const resolve2Data = await resolve2Res.json();
    assert.strictEqual(resolve2Data.complaint.status, "RESOLVED");
    console.log(`✅ Complaint ${createdComplaintId} re-marked RESOLVED`);

    // -------------------------------------------------------------------------
    // Phase 8: Citizen Disputes a 2nd Time -> Auto-Escalation to TPA_REVIEW
    // -------------------------------------------------------------------------
    console.log("\n[Phase 8] Citizen submitting 2nd dispute — verifying auto-escalation to TPA_REVIEW...");

    const dispute2Req = new Request(`http://localhost:3000/api/complaints/${createdComplaintId}/status`, {
      method: "PATCH",
      headers: citizenHeaders,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Loose gravel left across pedestrian walkway; second inspection unsatisfactory"
      })
    });
    const dispute2Res = await statusHandler(dispute2Req, {
      params: Promise.resolve({ id: createdComplaintId })
    });
    assert.strictEqual(dispute2Res.status, 200, "Second citizen dispute must succeed");
    const dispute2Data = await dispute2Res.json();
    assert.strictEqual(dispute2Data.complaint.status, "TPA_REVIEW", "Complaint with 2 disputes MUST auto-escalate to TPA_REVIEW");
    assert.strictEqual(dispute2Data.complaint.rejectionCount, 2, "rejectionCount must be 2");
    console.log(`✅ 2nd Dispute auto-escalation verified: Status is TPA_REVIEW, rejectionCount is 2`);

    // -------------------------------------------------------------------------
    // Phase 9: Security Invariant: Officer CANNOT Move Out of TPA_REVIEW (Issue #10)
    // -------------------------------------------------------------------------
    console.log("\n[Phase 9] Verifying Officer cannot bypass TPA_REVIEW (Issue #10 security invariant)...");

    const officerBypassReq = new Request(`http://localhost:3000/api/complaints/${createdComplaintId}/status`, {
      method: "PATCH",
      headers: officerHeaders,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Officer attempting unilateral move out of audit"
      })
    });
    const officerBypassRes = await statusHandler(officerBypassReq, {
      params: Promise.resolve({ id: createdComplaintId })
    });
    assert.strictEqual(officerBypassRes.status, 403, "Officer move out of TPA_REVIEW MUST be blocked with HTTP 403");
    console.log(`✅ Issue #10 enforced: Officer receives HTTP 403 when attempting to change TPA_REVIEW status`);

    // -------------------------------------------------------------------------
    // Phase 10: Admin Audits TPA_REVIEW Complaint & Closes with Verification
    // -------------------------------------------------------------------------
    console.log("\n[Phase 10] Administrator reviewing TPA_REVIEW complaint and completing closure...");

    const adminCloseReq = new Request(`http://localhost:3000/api/complaints/${createdComplaintId}/status`, {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        status: "CLOSED",
        notes: "Independent third-party supervisor inspected site; cleanup verified and grievance formally closed"
      })
    });
    const adminCloseRes = await statusHandler(adminCloseReq, {
      params: Promise.resolve({ id: createdComplaintId })
    });
    assert.strictEqual(adminCloseRes.status, 200, "Admin closure from TPA_REVIEW must succeed");
    const adminCloseData = await adminCloseRes.json();
    assert.strictEqual(adminCloseData.complaint.status, "CLOSED", "Final complaint status must be CLOSED");
    console.log(`✅ Complaint ${createdComplaintId} closed by Municipal Admin with audit rationale`);

    // -------------------------------------------------------------------------
    // Phase 11: Public Tracking Endpoint Lookup
    // -------------------------------------------------------------------------
    console.log("\n[Phase 11] Verifying public tracking endpoint returns accurate ledger status...");

    const publicTrackReq = new Request(`http://localhost:3000/api/complaints/track?id=${trackingId}`, {
      method: "GET",
      headers: {
        "x-forwarded-for": getUniqueIp()
      }
    });
    const publicTrackRes = await trackHandler(publicTrackReq);
    assert.strictEqual(publicTrackRes.status, 200, "Public tracking request must return 200 OK");
    const trackData = await publicTrackRes.json();
    assert.strictEqual(trackData.tracking_id, trackingId);
    assert.strictEqual(trackData.status, "CLOSED");
    assert.strictEqual(trackData.title, "Major Pothole on Road 36 Jubilee Hills");
    assert.ok(typeof trackData.trust_score === "number", "Trust score must be present in public tracker response");
    console.log(`✅ Public tracking lookup verified for ${trackingId}: Status is CLOSED, Trust Score is ${trackData.trust_score}`);

    // -------------------------------------------------------------------------
    // Phase 12: Audit Ledger Verification
    // -------------------------------------------------------------------------
    console.log("\n[Phase 12] Verifying audit ledger records all lifecycle transitions...");

    const auditLogs = await repo.getAuditLogs(100);
    const relatedLogs = auditLogs.filter(
      (log: any) =>
        log.details?.includes(createdComplaintId) ||
        log.details?.includes(trackingId) ||
        log.user_id === citizenUser.id ||
        log.user_id === officerUser.id ||
        log.user_id === deptUser.id ||
        log.user_id === adminUser.id
    );

    assert.ok(relatedLogs.length >= 5, `Expected at least 5 audit ledger records for grievance, found ${relatedLogs.length}`);
    console.log(`✅ Audit ledger verified: ${relatedLogs.length} audit records found for grievance lifecycle.`);

    console.log("\n==========================================================================");
    console.log("🎉 ALL END-TO-END MULTI-ROLE INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==========================================================================");

  } finally {
    // -------------------------------------------------------------------------
    // Cleanup: Remove test records to keep test database pristine
    // -------------------------------------------------------------------------
    console.log("\n[Cleanup] Cleaning up test database records...");
    try {
      const dbPath = path.join(process.cwd(), "data", "civictrust.db");
      const directDb = new Database(dbPath);
      try {
        if (createdComplaintId) {
          directDb.prepare("DELETE FROM audit_logs WHERE details LIKE ?").run(`%${createdComplaintId}%`);
          directDb.prepare("DELETE FROM notifications WHERE message LIKE ?").run(`%${createdComplaintId}%`);
          directDb.prepare("DELETE FROM evidence WHERE complaint_id = ?").run(createdComplaintId);
          directDb.prepare("DELETE FROM ai_reports WHERE complaint_id = ?").run(createdComplaintId);
          directDb.prepare("DELETE FROM complaints WHERE id = ?").run(createdComplaintId);
        }
        const testUserIds = [citizenUser?.id, deptUser?.id, officerUser?.id, adminUser?.id].filter(Boolean);
        for (const uid of testUserIds) {
          directDb.prepare("DELETE FROM audit_logs WHERE user_id = ?").run(uid);
          directDb.prepare("DELETE FROM notifications WHERE user_id = ?").run(uid);
          directDb.prepare("DELETE FROM users WHERE id = ?").run(uid);
        }
      } finally {
        directDb.close();
      }
      console.log("✅ Test database cleanup completed successfully.");
    } catch (cleanupErr: any) {
      console.warn("Notice: Test cleanup warning:", cleanupErr.message);
    } finally {
      restoreOcr();
      restoreExif();
    }
  }
}

runE2EWorkflowTests().catch((err: any) => {
  console.error("\n❌ E2E Workflow Test failed with error:", err);
  process.exit(1);
});
