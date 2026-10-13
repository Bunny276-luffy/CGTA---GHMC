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

async function runStatusAuthRegressionTests() {
  console.log("=== STARTING COMPLAINT STATUS AUTHORIZATION REGRESSION TEST SUITE ===");

  const repo = getRepository();

  // Save original repository methods for clean restoration
  const originalGetComplaintById = repo.getComplaintById;
  const originalGetUserById = repo.getUserById;
  const originalUpdateComplaintStatus = repo.updateComplaintStatus;
  const originalCreateAuditLog = repo.createAuditLog;
  const originalCreateNotification = repo.createNotification;
  const originalCreateComplaintEvidence = repo.createComplaintEvidence;

  // In-memory complaint ledger for tests
  const complaintsTable = new Map<string, Complaint>();
  const recordedUpdate: { current: { id: string; status: string; options?: any } | null } = {
    current: null,
  };

  // Install test stubs on repository singleton
  repo.getComplaintById = async (id: string): Promise<Complaint | null> => {
    return complaintsTable.get(id) || null;
  };

  repo.getUserById = async (id: string): Promise<User | null> => {
    if (id === "officer-101" || id === "officer-102") {
      return {
        id,
        name: `Officer ${id}`,
        email: `${id}@civictrust.local`,
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
      if (options?.assignedOfficerId !== undefined) {
        existing.assigned_officer_id = options.assignedOfficerId;
      }
      complaintsTable.set(complaintId, existing);
    }
    recordedUpdate.current = { id: complaintId, status, options };
  };

  repo.createAuditLog = async (): Promise<any> => ({ id: "audit-mock" });
  repo.createNotification = async (): Promise<any> => ({ id: "notif-mock" });
  repo.createComplaintEvidence = async (): Promise<any> => ({ id: "evidence-mock" });

  try {
    const officer1Headers = await createAuthHeaders({
      id: "officer-101",
      email: "officer101@civictrust.local",
      name: "Field Officer 101",
      role: "OFFICER",
    });

    const officer2Headers = await createAuthHeaders({
      id: "officer-102",
      email: "officer102@civictrust.local",
      name: "Field Officer 102",
      role: "OFFICER",
    });

    const adminHeaders = await createAuthHeaders({
      id: "admin-1",
      email: "admin@civictrust.local",
      name: "System Admin",
      role: "ADMIN",
    });

    const deptHeadHeaders = await createAuthHeaders({
      id: "depthead-1",
      email: "depthead@civictrust.local",
      name: "Sanitation Dept Head",
      role: "DEPT_HEAD",
    });

    const citizenOwnerHeaders = await createAuthHeaders({
      id: "citizen-1",
      email: "citizen1@example.com",
      name: "Citizen Owner",
      role: "CITIZEN",
    });

    const otherCitizenHeaders = await createAuthHeaders({
      id: "citizen-2",
      email: "citizen2@example.com",
      name: "Citizen Other",
      role: "CITIZEN",
    });

    // -------------------------------------------------------------------------
    // TEST 1: Assigned Officer — allowed when transition and payload are valid
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: Assigned Officer Authorization ---");

    // 1A: Officer 101 moves assigned ticket from ASSIGNED -> IN_PROGRESS
    complaintsTable.set("ticket-assigned-1", {
      id: "ticket-assigned-1",
      tracking_id: "CGTA-2026-ASG1",
      title: "Broken Streetlight",
      description: "Light not functioning on Main Road",
      category: "ELECTRICAL",
      status: "ASSIGNED",
      latitude: 17.385,
      longitude: 78.486,
      address: "Main Road, Hyderabad",
      severity: "STANDARD",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: "officer-101",
    });

    const req1A = new Request("http://localhost:3000/api/complaints/ticket-assigned-1/status", {
      method: "PATCH",
      headers: officer1Headers,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Officer acknowledged assignment and commenced onsite repair",
      }),
    });
    const res1A = await statusHandler(req1A, { params: Promise.resolve({ id: "ticket-assigned-1" }) });
    assert.strictEqual(res1A.status, 200, "Assigned officer moving ASSIGNED -> IN_PROGRESS must return 200");
    const data1A = await res1A.json();
    assert.strictEqual(data1A.complaint?.status, "IN_PROGRESS", "Complaint status must be updated to IN_PROGRESS");
    console.log("✅ 1A Passed: Assigned officer successfully moves ASSIGNED -> IN_PROGRESS");

    // 1B: Officer 101 resolves IN_PROGRESS ticket with valid photo, note, and GPS coordinates
    const req1B = new Request("http://localhost:3000/api/complaints/ticket-assigned-1/status", {
      method: "PATCH",
      headers: officer1Headers,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Streetlight bulb replaced and wiring checked",
      }),
    });
    const res1B = await statusHandler(req1B, { params: Promise.resolve({ id: "ticket-assigned-1" }) });
    assert.strictEqual(res1B.status, 200, "Assigned officer resolving IN_PROGRESS ticket must return 200");
    const data1B = await res1B.json();
    assert.strictEqual(data1B.complaint?.status, "RESOLVED", "Complaint status must be updated to RESOLVED");
    assert.strictEqual(data1B.geofence?.withinTolerance, true, "Geofence verification must succeed");
    console.log("✅ 1B Passed: Assigned officer successfully resolves IN_PROGRESS ticket with valid proof");

    // -------------------------------------------------------------------------
    // TEST 2: Unassigned Complaint — Officer receives 403 Forbidden
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Unassigned Complaint Officer Rejection (BOLA Regression) ---");

    // 2A: Officer attempts to transition an unassigned ticket in SUBMITTED status
    complaintsTable.set("ticket-unassigned-1", {
      id: "ticket-unassigned-1",
      tracking_id: "CGTA-2026-UNAS1",
      title: "Pothole on Ring Road",
      description: "Severe pothole near flyover",
      category: "ROADS",
      status: "SUBMITTED",
      latitude: 17.44,
      longitude: 78.38,
      address: "Ring Road, Hyderabad",
      severity: "HIGH",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: null as any, // Explicitly null
    });

    const req2A = new Request("http://localhost:3000/api/complaints/ticket-unassigned-1/status", {
      method: "PATCH",
      headers: officer1Headers,
      body: JSON.stringify({
        status: "TPA_REVIEW",
        notes: "Unauthorized attempt to hijack unassigned ticket",
      }),
    });
    const res2A = await statusHandler(req2A, { params: Promise.resolve({ id: "ticket-unassigned-1" }) });
    assert.strictEqual(res2A.status, 403, "Officer attempting to update unassigned SUBMITTED complaint must receive 403");
    const data2A = await res2A.json();
    assert.strictEqual(
      data2A.message,
      "Forbidden: you may only manage complaints assigned to your officer account.",
      "Rejection message must indicate assigned officer requirement"
    );
    console.log("✅ 2A Passed: Officer received 403 when attempting to update unassigned SUBMITTED complaint (null)");

    // 2B: Officer attempts to transition an unassigned ticket in TPA_REVIEW status
    complaintsTable.set("ticket-unassigned-2", {
      id: "ticket-unassigned-2",
      tracking_id: "CGTA-2026-UNAS2",
      title: "Garbage Dump Overflow",
      description: "Waste overflowing near market",
      category: "SANITATION",
      status: "TPA_REVIEW",
      latitude: 17.40,
      longitude: 78.45,
      address: "Market Road, Hyderabad",
      severity: "STANDARD",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: null as any, // Explicitly null
    });

    const req2B = new Request("http://localhost:3000/api/complaints/ticket-unassigned-2/status", {
      method: "PATCH",
      headers: officer1Headers,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Attempt to take unassigned TPA_REVIEW complaint into progress",
      }),
    });
    const res2B = await statusHandler(req2B, { params: Promise.resolve({ id: "ticket-unassigned-2" }) });
    assert.strictEqual(res2B.status, 403, "Officer attempting to update unassigned TPA_REVIEW complaint must receive 403");
    const data2B = await res2B.json();
    assert.strictEqual(
      data2B.message,
      "Forbidden: you may only manage complaints assigned to your officer account."
    );
    console.log("✅ 2B Passed: Officer received 403 when attempting to take unassigned TPA_REVIEW complaint (null)");

    // 2C: Officer attempts to transition an unassigned ticket in ASSIGNED status (assigned_officer_id undefined)
    complaintsTable.set("ticket-unassigned-3", {
      id: "ticket-unassigned-3",
      tracking_id: "CGTA-2026-UNAS3",
      title: "Drainage Leak",
      description: "Drain line ruptured",
      category: "DRAINAGE",
      status: "ASSIGNED",
      latitude: 17.42,
      longitude: 78.41,
      address: "Drain Lane, Hyderabad",
      severity: "HIGH",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: undefined, // undefined
    });

    const req2C = new Request("http://localhost:3000/api/complaints/ticket-unassigned-3/status", {
      method: "PATCH",
      headers: officer1Headers,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Attempting to claim ASSIGNED complaint with null assignee",
      }),
    });
    const res2C = await statusHandler(req2C, { params: Promise.resolve({ id: "ticket-unassigned-3" }) });
    assert.strictEqual(res2C.status, 403, "Officer attempting to update ASSIGNED complaint without assigned officer must receive 403");
    console.log("✅ 2C Passed: Officer received 403 when complaint is in ASSIGNED state without assigned officer (undefined)");

    // 2D: Officer attempts to resolve an unassigned complaint in IN_PROGRESS status with proof
    complaintsTable.set("ticket-unassigned-4", {
      id: "ticket-unassigned-4",
      tracking_id: "CGTA-2026-UNAS4",
      title: "Broken Water Pipe",
      description: "Water pipe leaking heavily",
      category: "WATER_SUPPLY",
      status: "IN_PROGRESS",
      latitude: 17.385,
      longitude: 78.486,
      address: "Pipeline Rd, Hyderabad",
      severity: "HIGH",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: null as any,
    });

    const req2D = new Request("http://localhost:3000/api/complaints/ticket-unassigned-4/status", {
      method: "PATCH",
      headers: officer1Headers,
      body: JSON.stringify({
        status: "RESOLVED",
        resolutionPhotoUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
        officerLat: 17.385,
        officerLng: 78.486,
        notes: "Unauthorized attempt to resolve unassigned ticket with proof",
      }),
    });
    const res2D = await statusHandler(req2D, { params: Promise.resolve({ id: "ticket-unassigned-4" }) });
    assert.strictEqual(res2D.status, 403, "Officer attempting to resolve unassigned complaint must receive 403");
    console.log("✅ 2D Passed: Officer received 403 when attempting to resolve unassigned IN_PROGRESS complaint");

    // -------------------------------------------------------------------------
    // TEST 3: Complaint Assigned to Another Officer — Officer receives 403
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Other Officer Assignment Rejection ---");

    complaintsTable.set("ticket-officer-102", {
      id: "ticket-officer-102",
      tracking_id: "CGTA-2026-OF102",
      title: "Water Contamination",
      description: "Pipe contamination in Sector 4",
      category: "WATER_SUPPLY",
      status: "ASSIGNED",
      latitude: 17.39,
      longitude: 78.47,
      address: "Sector 4, Hyderabad",
      severity: "EMERGENCY",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: "officer-102", // Assigned to Officer 102
    });

    // Officer 101 tries to update Officer 102's assigned complaint
    const req3 = new Request("http://localhost:3000/api/complaints/ticket-officer-102/status", {
      method: "PATCH",
      headers: officer1Headers,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Officer 101 attempting to modify Officer 102 ticket",
      }),
    });
    const res3 = await statusHandler(req3, { params: Promise.resolve({ id: "ticket-officer-102" }) });
    assert.strictEqual(res3.status, 403, "Officer attempting to update another officer's complaint must receive 403");
    const data3 = await res3.json();
    assert.strictEqual(
      data3.message,
      "Forbidden: you may only manage complaints assigned to your officer account."
    );
    console.log("✅ 3 Passed: Officer 101 received 403 when attempting to modify complaint assigned to Officer 102");

    // -------------------------------------------------------------------------
    // TEST 4: ADMIN and DEPT_HEAD Authorization Behavior Unchanged
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: ADMIN and DEPT_HEAD Authority Preserved ---");

    // 4A: DEPT_HEAD assigns unassigned ticket to an officer
    complaintsTable.set("ticket-gov-1", {
      id: "ticket-gov-1",
      tracking_id: "CGTA-2026-GOV1",
      title: "Park Bench Damaged",
      description: "Public park bench broken",
      category: "PARKS",
      status: "SUBMITTED",
      latitude: 17.41,
      longitude: 78.43,
      address: "Public Park, Hyderabad",
      severity: "STANDARD",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: undefined,
    });

    const req4A = new Request("http://localhost:3000/api/complaints/ticket-gov-1/status", {
      method: "PATCH",
      headers: deptHeadHeaders,
      body: JSON.stringify({
        status: "ASSIGNED",
        assignedOfficerId: "officer-101",
        notes: "Dispatched by department head to Officer 101",
      }),
    });
    const res4A = await statusHandler(req4A, { params: Promise.resolve({ id: "ticket-gov-1" }) });
    assert.strictEqual(res4A.status, 200, "DEPT_HEAD assigning unassigned ticket must succeed with 200");
    assert.strictEqual(recordedUpdate.current?.options?.assignedOfficerId, "officer-101", "Assigned officer ID must be set");
    console.log("✅ 4A Passed: DEPT_HEAD successfully assigns unassigned ticket to officer");

    // 4B: ADMIN escalates unassigned ticket directly to TPA_REVIEW
    complaintsTable.set("ticket-gov-2", {
      id: "ticket-gov-2",
      tracking_id: "CGTA-2026-GOV2",
      title: "Illegal Encroachment",
      description: "Footpath occupied without permission",
      category: "TOWN_PLANNING",
      status: "SUBMITTED",
      latitude: 17.45,
      longitude: 78.49,
      address: "Commercial St, Hyderabad",
      severity: "HIGH",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: undefined,
    });

    const req4B = new Request("http://localhost:3000/api/complaints/ticket-gov-2/status", {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        status: "TPA_REVIEW",
        notes: "Admin direct referral for independent audit",
      }),
    });
    const res4B = await statusHandler(req4B, { params: Promise.resolve({ id: "ticket-gov-2" }) });
    assert.strictEqual(res4B.status, 200, "ADMIN moving unassigned complaint to TPA_REVIEW must succeed with 200");
    console.log("✅ 4B Passed: ADMIN successfully transitions unassigned ticket without officer assignment");

    // 4C: ADMIN administrative closure of an assigned complaint
    const req4C = new Request("http://localhost:3000/api/complaints/ticket-gov-1/status", {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        status: "CLOSED",
        notes: "Administrative administrative closure by governance office",
      }),
    });
    const res4C = await statusHandler(req4C, { params: Promise.resolve({ id: "ticket-gov-1" }) });
    assert.strictEqual(res4C.status, 200, "ADMIN administrative closure must succeed with 200");
    console.log("✅ 4C Passed: ADMIN successfully closes complaint");

    // -------------------------------------------------------------------------
    // TEST 5: Citizen Ownership Restrictions Unchanged
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Citizen Ownership Restrictions Preserved ---");

    complaintsTable.set("ticket-citizen-res", {
      id: "ticket-citizen-res",
      tracking_id: "CGTA-2026-CTZ1",
      title: "Street sweeping needed",
      description: "Fallen leaves accumulating",
      category: "SANITATION",
      status: "RESOLVED",
      latitude: 17.37,
      longitude: 78.46,
      address: "Residential Area, Hyderabad",
      severity: "STANDARD",
      anonymous: false,
      created_by_id: "citizen-1", // Owned by Citizen 1
      assigned_officer_id: "officer-101",
    });

    // 5A: Citizen Owner closes their own resolved grievance
    const req5A = new Request("http://localhost:3000/api/complaints/ticket-citizen-res/status", {
      method: "PATCH",
      headers: citizenOwnerHeaders,
      body: JSON.stringify({
        status: "CLOSED",
        notes: "Resolution verified by citizen. Work completed satisfactorily.",
      }),
    });
    const res5A = await statusHandler(req5A, { params: Promise.resolve({ id: "ticket-citizen-res" }) });
    assert.strictEqual(res5A.status, 200, "Citizen confirming their own resolved complaint must return 200");
    console.log("✅ 5A Passed: Citizen owner successfully closes their own resolved complaint");

    // 5B: Another citizen attempts to close Citizen 1's resolved complaint
    const req5B = new Request("http://localhost:3000/api/complaints/ticket-citizen-res/status", {
      method: "PATCH",
      headers: otherCitizenHeaders,
      body: JSON.stringify({
        status: "CLOSED",
      }),
    });
    const res5B = await statusHandler(req5B, { params: Promise.resolve({ id: "ticket-citizen-res" }) });
    assert.strictEqual(res5B.status, 403, "Non-owner citizen must receive 403 when updating complaint");
    const data5B = await res5B.json();
    assert.strictEqual(data5B.message, "Forbidden: you can only manage your own grievances.");
    console.log("✅ 5B Passed: Non-owner citizen rejected with 403 IDOR guard");

    // 5C: Citizen attempts an invalid transition on a SUBMITTED ticket (e.g. SUBMITTED -> IN_PROGRESS)
    complaintsTable.set("ticket-citizen-sub", {
      id: "ticket-citizen-sub",
      tracking_id: "CGTA-2026-CTZ2",
      title: "Noise complaint",
      description: "Construction at midnight",
      category: "GENERAL",
      status: "SUBMITTED",
      latitude: 17.36,
      longitude: 78.45,
      address: "Colony, Hyderabad",
      severity: "STANDARD",
      anonymous: false,
      created_by_id: "citizen-1",
    });

    const req5C = new Request("http://localhost:3000/api/complaints/ticket-citizen-sub/status", {
      method: "PATCH",
      headers: citizenOwnerHeaders,
      body: JSON.stringify({
        status: "IN_PROGRESS",
      }),
    });
    const res5C = await statusHandler(req5C, { params: Promise.resolve({ id: "ticket-citizen-sub" }) });
    assert.strictEqual(res5C.status, 403, "Citizen cannot move SUBMITTED complaint to IN_PROGRESS");
    const data5C = await res5C.json();
    assert(
      data5C.message?.includes("Forbidden: citizens cannot move a grievance"),
      "Message must enforce citizen transition restrictions"
    );
    console.log("✅ 5C Passed: Citizen rejected when attempting non-permitted transition");

    console.log("\n=== ALL COMPLAINT STATUS AUTHORIZATION REGRESSION TESTS PASSED ===");
  } finally {
    // Restore original repository methods
    repo.getComplaintById = originalGetComplaintById;
    repo.getUserById = originalGetUserById;
    repo.updateComplaintStatus = originalUpdateComplaintStatus;
    repo.createAuditLog = originalCreateAuditLog;
    repo.createNotification = originalCreateNotification;
    repo.createComplaintEvidence = originalCreateComplaintEvidence;
  }
}

runStatusAuthRegressionTests().catch((err) => {
  console.error("❌ TEST FAILURE:", err);
  process.exit(1);
});
