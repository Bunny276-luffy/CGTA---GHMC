import assert from "assert";
import { signSession } from "../lib/session";
import { getRepository } from "../lib/db";
import { PATCH as statusHandler } from "../app/api/complaints/[id]/status/route";
import { POST as submitHandler } from "../app/api/complaints/submit/route";
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
  const originalCreateComplaint = repo.createComplaint;
  const originalCreateAIReport = repo.createAIReport;

  // In-memory complaint ledger for tests
  const complaintsTable = new Map<string, Complaint>();
  const recordedUpdate: { current: { id: string; status: string; options?: any } | null } = {
    current: null,
  };
  let createComplaintCalls = 0;

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
  repo.createComplaint = async (data: any): Promise<Complaint> => {
    createComplaintCalls++;
    const id = `ticket-created-${createComplaintCalls}`;
    const comp: Complaint = {
      id,
      tracking_id: `CGTA-2026-SUB${createComplaintCalls}`,
      title: data.title,
      description: data.description,
      category: data.category,
      status: data.status || "SUBMITTED",
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address,
      severity: data.severity,
      anonymous: data.anonymous,
      before_photo_url: data.before_photo_url,
      created_by_id: data.created_by_id,
      rejection_count: 0,
    };
    complaintsTable.set(id, comp);
    return comp;
  };
  repo.createAIReport = async (report: any): Promise<any> => ({ id: "ai-mock", ...report });

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

    // 1C: Officer 101 attempts to transition assigned ticket from TPA_REVIEW to IN_PROGRESS
    complaintsTable.set("ticket-assigned-tpa", {
      id: "ticket-assigned-tpa",
      tracking_id: "CGTA-2026-TPA1",
      title: "Contaminated Water Supply",
      description: "Discolored water reported in ward 12",
      category: "WATER",
      status: "TPA_REVIEW",
      latitude: 17.385,
      longitude: 78.486,
      address: "Ward 12, Hyderabad",
      severity: "EMERGENCY",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: "officer-101",
    });

    const req1C = new Request("http://localhost:3000/api/complaints/ticket-assigned-tpa/status", {
      method: "PATCH",
      headers: officer1Headers,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Officer attempts unilateral de-escalation of TPA_REVIEW ticket",
      }),
    });
    const res1C = await statusHandler(req1C, { params: Promise.resolve({ id: "ticket-assigned-tpa" }) });
    assert.strictEqual(res1C.status, 403, "Assigned officer attempting to move TPA_REVIEW -> IN_PROGRESS must receive 403");
    const data1C = await res1C.json();
    assert.strictEqual(
      data1C.message,
      "Forbidden: officers cannot move a ticket from TPA_REVIEW to IN_PROGRESS.",
      "Rejection message must indicate officers cannot move out of TPA_REVIEW"
    );
    console.log("✅ 1C Passed: Assigned officer received 403 when attempting to move assigned complaint from TPA_REVIEW to IN_PROGRESS");

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

    // 4D: DEPT_HEAD moves complaint from TPA_REVIEW to IN_PROGRESS with officer assignment
    complaintsTable.set("ticket-gov-3", {
      id: "ticket-gov-3",
      tracking_id: "CGTA-2026-GOV3",
      title: "Sewer Line Overflow",
      description: "Audit review completed; remedial work ordered",
      category: "DRAINAGE",
      status: "TPA_REVIEW",
      latitude: 17.43,
      longitude: 78.41,
      address: "Drainage Lane, Hyderabad",
      severity: "HIGH",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: "officer-101",
    });

    const req4D = new Request("http://localhost:3000/api/complaints/ticket-gov-3/status", {
      method: "PATCH",
      headers: deptHeadHeaders,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        assignedOfficerId: "officer-101",
        notes: "Supervisor concluded audit review and authorized remedial action",
      }),
    });
    const res4D = await statusHandler(req4D, { params: Promise.resolve({ id: "ticket-gov-3" }) });
    assert.strictEqual(res4D.status, 200, "DEPT_HEAD moving TPA_REVIEW complaint to IN_PROGRESS must return 200");
    const data4D = await res4D.json();
    assert.strictEqual(data4D.complaint?.status, "IN_PROGRESS", "Complaint status must be updated to IN_PROGRESS");
    console.log("✅ 4D Passed: DEPT_HEAD successfully transitions TPA_REVIEW complaint to IN_PROGRESS");

    // 4E: ADMIN moves complaint from TPA_REVIEW directly to CLOSED
    complaintsTable.set("ticket-gov-4", {
      id: "ticket-gov-4",
      tracking_id: "CGTA-2026-GOV4",
      title: "Commercial Noise Dispute",
      description: "Escalated for administrative adjudication",
      category: "GENERAL",
      status: "TPA_REVIEW",
      latitude: 17.44,
      longitude: 78.47,
      address: "Commercial Zone, Hyderabad",
      severity: "STANDARD",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: undefined,
    });

    const req4E = new Request("http://localhost:3000/api/complaints/ticket-gov-4/status", {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({
        status: "CLOSED",
        notes: "Administrative determination rendered and grievance closed by governance office",
      }),
    });
    const res4E = await statusHandler(req4E, { params: Promise.resolve({ id: "ticket-gov-4" }) });
    assert.strictEqual(res4E.status, 200, "ADMIN moving TPA_REVIEW complaint to CLOSED must return 200");
    const data4E = await res4E.json();
    assert.strictEqual(data4E.complaint?.status, "CLOSED", "Complaint status must be updated to CLOSED");
    console.log("✅ 4E Passed: ADMIN successfully closes TPA_REVIEW complaint");

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

    // 5D: Citizen owner disputes resolved complaint (1st dispute -> IN_PROGRESS, rejection_count: 1)
    complaintsTable.set("ticket-citizen-dispute-1", {
      id: "ticket-citizen-dispute-1",
      tracking_id: "CGTA-2026-DISP1",
      title: "Broken water main leaking",
      description: "Water pooling at intersection",
      category: "DRAINAGE",
      status: "RESOLVED",
      latitude: 17.38,
      longitude: 78.47,
      address: "Intersection 5, Hyderabad",
      severity: "HIGH",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: "officer-101",
      rejection_count: 0,
    });

    const req5D = new Request("http://localhost:3000/api/complaints/ticket-citizen-dispute-1/status", {
      method: "PATCH",
      headers: citizenOwnerHeaders,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Work incomplete. Water is still leaking onto the road.",
      }),
    });
    const res5D = await statusHandler(req5D, { params: Promise.resolve({ id: "ticket-citizen-dispute-1" }) });
    assert.strictEqual(res5D.status, 200, "Citizen disputing resolution must return 200");
    const data5D = await res5D.json();
    assert.strictEqual(data5D.complaint?.status, "IN_PROGRESS", "First dispute must set status to IN_PROGRESS");
    assert.strictEqual(data5D.complaint?.rejectionCount, 1, "First dispute must set rejection count to 1");
    assert.strictEqual(recordedUpdate.current?.options?.citizenConfirmed, false, "Dispute must record citizenConfirmed as false");
    console.log("✅ 5D Passed: Citizen owner successfully disputes resolution (moves to IN_PROGRESS, rejection_count: 1)");

    // 5E: Citizen owner disputes resolved complaint for 2nd time (2nd dispute -> escalates to TPA_REVIEW)
    complaintsTable.set("ticket-citizen-dispute-2", {
      id: "ticket-citizen-dispute-2",
      tracking_id: "CGTA-2026-DISP2",
      title: "Garbage pile recurring",
      description: "Waste dumped repeatedly",
      category: "SANITATION",
      status: "RESOLVED",
      latitude: 17.39,
      longitude: 78.48,
      address: "Market Corner, Hyderabad",
      severity: "STANDARD",
      anonymous: false,
      created_by_id: "citizen-1",
      assigned_officer_id: "officer-101",
      rejection_count: 1, // Already rejected once
    });

    const req5E = new Request("http://localhost:3000/api/complaints/ticket-citizen-dispute-2/status", {
      method: "PATCH",
      headers: citizenOwnerHeaders,
      body: JSON.stringify({
        status: "IN_PROGRESS",
        notes: "Second dispute: trash was never removed. Escalating to supervisor.",
      }),
    });
    const res5E = await statusHandler(req5E, { params: Promise.resolve({ id: "ticket-citizen-dispute-2" }) });
    assert.strictEqual(res5E.status, 200, "Second dispute must return 200");
    const data5E = await res5E.json();
    assert.strictEqual(data5E.complaint?.status, "TPA_REVIEW", "Second dispute must automatically escalate to TPA_REVIEW");
    assert.strictEqual(data5E.complaint?.rejectionCount, 2, "Second dispute must set rejection count to 2");
    assert.strictEqual(data5E.escalated, true, "Escalated flag must be true on TPA_REVIEW escalation");
    console.log("✅ 5E Passed: Second dispute triggers automated escalation to TPA_REVIEW");

    // 5F: Citizen attempts unauthorized transition from RESOLVED (e.g. RESOLVED -> ASSIGNED)
    const req5F = new Request("http://localhost:3000/api/complaints/ticket-citizen-res/status", {
      method: "PATCH",
      headers: citizenOwnerHeaders,
      body: JSON.stringify({
        status: "ASSIGNED",
      }),
    });
    const res5F = await statusHandler(req5F, { params: Promise.resolve({ id: "ticket-citizen-res" }) });
    assert.strictEqual(res5F.status, 403, "Citizen cannot move ticket to ASSIGNED");
    const data5F = await res5F.json();
    assert(
      data5F.message?.includes("Forbidden: citizens cannot move a grievance"),
      "Message must enforce citizen transition restrictions"
    );
    console.log("✅ 5F Passed: Citizen rejected when attempting non-permitted transition from RESOLVED");

    // 5G: Citizen attempts transition on non-existent complaint
    const req5G = new Request("http://localhost:3000/api/complaints/ticket-does-not-exist/status", {
      method: "PATCH",
      headers: citizenOwnerHeaders,
      body: JSON.stringify({
        status: "CLOSED",
      }),
    });
    const res5G = await statusHandler(req5G, { params: Promise.resolve({ id: "ticket-does-not-exist" }) });
    assert.strictEqual(res5G.status, 404, "Transition on non-existent complaint must return 404");
    const data5G = await res5G.json();
    assert.strictEqual(data5G.message, "Complaint not found");
    console.log("✅ 5G Passed: Citizen transition on non-existent complaint returns 404");

    // -------------------------------------------------------------------------
    // TEST 6: Complaint Submission Validation & Non-Citizen Role Rejection
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 6: Complaint Submission Validation & Non-Citizen Role Rejection ---");

    // 6A: Missing headline and description
    const req6A = new Request("http://localhost:3000/api/complaints/submit", {
      method: "POST",
      headers: citizenOwnerHeaders,
      body: JSON.stringify({
        title: "",
        description: "",
        category: "Roads & Potholes",
        latitude: 17.385,
        longitude: 78.486,
      }),
    });
    const res6A = await submitHandler(req6A);
    assert.strictEqual(res6A.status, 400, "Submission without headline/description must return 400");
    const data6A = await res6A.json();
    assert.strictEqual(data6A.message, "A clean headline and description are required.");
    assert.strictEqual(createComplaintCalls, 0, "No complaint must be persisted on validation failure");
    console.log("✅ 6A Passed: Missing headline/description rejected with 400, no DB record created");

    // 6B: Invalid grievance category
    const req6B = new Request("http://localhost:3000/api/complaints/submit", {
      method: "POST",
      headers: citizenOwnerHeaders,
      body: JSON.stringify({
        title: "Pothole on Main Road",
        description: "Dangerous pothole near bus stop",
        category: "INVALID_UNKNOWN_CATEGORY",
        latitude: 17.385,
        longitude: 78.486,
      }),
    });
    const res6B = await submitHandler(req6B);
    assert.strictEqual(res6B.status, 400, "Submission with invalid category must return 400");
    const data6B = await res6B.json();
    assert.strictEqual(data6B.message, "Invalid grievance category.");
    assert.strictEqual(createComplaintCalls, 0, "No complaint must be persisted on category validation failure");
    console.log("✅ 6B Passed: Invalid category rejected with 400, no DB record created");

    // 6C: Invalid GPS coordinates
    const req6C = new Request("http://localhost:3000/api/complaints/submit", {
      method: "POST",
      headers: citizenOwnerHeaders,
      body: JSON.stringify({
        title: "Pothole on Main Road",
        description: "Dangerous pothole near bus stop",
        category: "Roads & Potholes",
        latitude: 999.0, // Invalid latitude
        longitude: 78.486,
      }),
    });
    const res6C = await submitHandler(req6C);
    assert.strictEqual(res6C.status, 400, "Submission with invalid latitude must return 400");
    const data6C = await res6C.json();
    assert.strictEqual(data6C.message, "Valid GPS coordinates are required.");
    assert.strictEqual(createComplaintCalls, 0, "No complaint must be persisted on GPS validation failure");
    console.log("✅ 6C Passed: Invalid GPS coordinates rejected with 400, no DB record created");

    // 6D: Officer role attempting citizen submission is rejected with 403
    const req6D = new Request("http://localhost:3000/api/complaints/submit", {
      method: "POST",
      headers: officer1Headers,
      body: JSON.stringify({
        title: "Staff attempting to submit",
        description: "Officer should not use citizen submission endpoint",
        category: "Roads & Potholes",
        latitude: 17.385,
        longitude: 78.486,
      }),
    });
    const res6D = await submitHandler(req6D);
    assert.strictEqual(res6D.status, 403, "Officer attempting to submit complaint must receive 403");
    const data6D = await res6D.json();
    assert.strictEqual(data6D.message, "Forbidden: your role does not have access to this resource.");
    assert.strictEqual(createComplaintCalls, 0, "No complaint must be persisted on role rejection");
    console.log("✅ 6D Passed: Non-citizen role rejected with 403 Forbidden");

    console.log("\n=== ALL COMPLAINT STATUS AUTHORIZATION REGRESSION TESTS PASSED ===");
  } finally {
    // Restore original repository methods
    repo.getComplaintById = originalGetComplaintById;
    repo.getUserById = originalGetUserById;
    repo.updateComplaintStatus = originalUpdateComplaintStatus;
    repo.createAuditLog = originalCreateAuditLog;
    repo.createNotification = originalCreateNotification;
    repo.createComplaintEvidence = originalCreateComplaintEvidence;
    repo.createComplaint = originalCreateComplaint;
    repo.createAIReport = originalCreateAIReport;
  }
}

runStatusAuthRegressionTests().catch((err) => {
  console.error("❌ TEST FAILURE:", err);
  process.exit(1);
});
