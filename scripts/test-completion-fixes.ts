import assert from "assert";
import { getRepository } from "../lib/db";
import { signSession, SESSION_COOKIE } from "../lib/session";
import { GET as meHandler } from "../app/api/auth/me/route";
import { PATCH as statusHandler } from "../app/api/complaints/[id]/status/route";
import { getPublicConfig } from "../lib/config";
import { hashPassword } from "../lib/crypto";

// Ensure test session secret is available
process.env.AUTH_SECRET = process.env.AUTH_SECRET || "civictrust-test-auth-secret-32chars-minimum";

async function runCompletionFixesTests() {
  console.log("=== CivicTrust Final Completion Fixes Regression Test Suite ===\n");

  const repo = getRepository();
  await repo.setupDatabase();

  const timestamp = Date.now();
  const citizenEmail = `citizen.fixes.${timestamp}@civictrust.local`;
  const adminEmail = `admin.fixes.${timestamp}@civictrust.local`;

  let citizenUser: any;
  let adminUser: any;
  let testComplaint: any;

  try {
    // -------------------------------------------------------------------------
    // Part 1: Verify getPublicConfig Exposes Verification Parameters
    // -------------------------------------------------------------------------
    console.log("--- Part 1: Jurisdiction Configuration Verification Parameters ---");
    const publicConfig = getPublicConfig();
    assert.ok(publicConfig.verification, "getPublicConfig must expose verification parameters");
    assert.strictEqual(typeof publicConfig.verification.gpsToleranceMeters, "number", "gpsToleranceMeters must be a number");
    assert.strictEqual(typeof publicConfig.verification.duplicateRadiusMeters, "number", "duplicateRadiusMeters must be a number");
    assert.strictEqual(typeof publicConfig.verification.manualReviewTrustThreshold, "number", "manualReviewTrustThreshold must be a number");
    assert.strictEqual(typeof publicConfig.verification.highTrustThreshold, "number", "highTrustThreshold must be a number");
    console.log(`✅ Passed: getPublicConfig exposes verification parameters (GPS tolerance: ${publicConfig.verification.gpsToleranceMeters}m, duplicate radius: ${publicConfig.verification.duplicateRadiusMeters}m)`);

    // -------------------------------------------------------------------------
    // Part 2: Verify Server-Driven Session Hydration (/api/auth/me)
    // -------------------------------------------------------------------------
    console.log("\n--- Part 2: Server-Driven Session Hydration (/api/auth/me) ---");
    citizenUser = await repo.createUser({
      name: "Fixes Citizen User",
      email: citizenEmail,
      role: "CITIZEN",
      password_hash: hashPassword("Test_Password_123!")
    });

    const citizenToken = await signSession({
      id: citizenUser.id,
      email: citizenUser.email,
      name: citizenUser.name,
      role: citizenUser.role
    });

    const meReq = new Request("http://localhost:3000/api/auth/me", {
      headers: {
        cookie: `${SESSION_COOKIE}=${citizenToken}`
      }
    });

    const meRes = await meHandler(meReq);
    assert.strictEqual(meRes.status, 200, "GET /api/auth/me must return 200 with valid session cookie");
    const meData = await meRes.json();
    assert.strictEqual(meData.user.id, citizenUser.id, "Session user ID must match citizen user ID");
    assert.strictEqual(meData.user.role, "CITIZEN", "Session user role must be CITIZEN");
    console.log("✅ Passed: /api/auth/me validates and returns live session for cookie-only citizen session");

    // -------------------------------------------------------------------------
    // Part 3: Verify closed_by_tpa Persistence on TPA_REVIEW Closure
    // -------------------------------------------------------------------------
    console.log("\n--- Part 3: closed_by_tpa Persistence on TPA_REVIEW Closure ---");
    adminUser = await repo.createUser({
      name: "Fixes Admin User",
      email: adminEmail,
      role: "ADMIN",
      password_hash: hashPassword("Test_Password_123!")
    });

    const adminToken = await signSession({
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role
    });

    // Create a complaint in TPA_REVIEW status
    testComplaint = await repo.createComplaint({
      title: "Test Complaint Under TPA Review",
      description: "Pothole requiring supervisor review",
      category: "Roads & Potholes",
      latitude: 17.4300,
      longitude: 78.4100,
      address: "Road 36, Jubilee Hills",
      severity: "STANDARD",
      anonymous: false,
      created_by_id: citizenUser.id,
      status: "TPA_REVIEW"
    });

    assert.strictEqual(testComplaint.status, "TPA_REVIEW", "Initial complaint status must be TPA_REVIEW");

    // Admin closes the TPA_REVIEW complaint
    const closeReq = new Request(`http://localhost:3000/api/complaints/${testComplaint.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: `${SESSION_COOKIE}=${adminToken}`
      },
      body: JSON.stringify({
        status: "CLOSED",
        notes: "Supervisor reviewed and verified site cleanup"
      })
    });

    const closeRes = await statusHandler(closeReq, {
      params: Promise.resolve({ id: testComplaint.id })
    });

    assert.strictEqual(closeRes.status, 200, "Admin closing TPA_REVIEW complaint must return 200 OK");
    const closeData = await closeRes.json();
    assert.strictEqual(closeData.complaint.status, "CLOSED", "Target complaint status must be CLOSED");

    // Inspect direct database record to verify closed_by_tpa was persisted
    const updatedComplaint = await repo.getComplaintById(testComplaint.id);
    assert.ok(updatedComplaint, "Updated complaint must exist in database");
    assert.strictEqual(updatedComplaint.status, "CLOSED", "Database status must be CLOSED");
    assert.ok(
      updatedComplaint.closed_by_tpa === true || updatedComplaint.closed_by_tpa === 1,
      `closed_by_tpa must be persisted as true/1 on TPA review closure, got: ${updatedComplaint.closed_by_tpa}`
    );
    console.log(`✅ Passed: closed_by_tpa is persisted as ${updatedComplaint.closed_by_tpa} when closed from TPA_REVIEW`);

    console.log("\n========================================================");
    console.log("All Completion Fixes Regression Tests Passed Successfully!");
    console.log("========================================================");
  } finally {
    // Clean up test records
    try {
      const db = (repo as any).getDb ? (repo as any).getDb() : null;
      if (db) {
        if (testComplaint?.id) db.prepare("DELETE FROM complaints WHERE id = ?").run(testComplaint.id);
        if (citizenUser?.id) db.prepare("DELETE FROM users WHERE id = ?").run(citizenUser.id);
        if (adminUser?.id) db.prepare("DELETE FROM users WHERE id = ?").run(adminUser.id);
      }
    } catch {
      // Ignore cleanup error
    }
  }
}

runCompletionFixesTests().catch((err) => {
  console.error("❌ Completion fixes test failed:", err);
  process.exit(1);
});
