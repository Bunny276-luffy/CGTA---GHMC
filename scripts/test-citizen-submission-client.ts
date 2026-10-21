/**
 * Regression Test Suite: Citizen Client Submission & Status Update Response Handling
 *
 * Verifies that app/citizen client submission and status update response handling:
 * 1. Handles HTTP 400, 401, 403, 429, and 500 responses without creating client complaints or tracking IDs.
 * 2. Handles network errors (fetch rejections) without creating complaints or tracking IDs.
 * 3. Requires valid server-persisted complaint with server ID, tracking ID, and server-owned status for success.
 * 4. Rejects malformed 200 responses missing complaint, ID, tracking ID, or status.
 * 5. Guarantees no fallback to Math.random() / Date.now() / fabricated mock IDs.
 * 6. Handles PATCH status updates, validating confirmed status without falling back to targetStatus.
 * 7. Rejects malformed PATCH responses and preserves existing rejectionCount when not returned.
 */

import assert from "node:assert";
import {
  Complaint,
  SubmissionDraftContext,
  CitizenClientSubmissionState,
  processSubmissionOutcome,
  processStatusUpdateOutcome,
  applySubmissionOutcome
} from "../lib/citizen-submission";

let passedCount = 0;

function pass(testName: string) {
  passedCount++;
  console.log(`✅ Passed: ${testName}`);
}

async function runClientSubmissionTests() {
  console.log("=== CITIZEN CLIENT SUBMISSION & STATUS RESPONSE-HANDLING REGRESSION TESTS ===\n");

  const sampleDraft: SubmissionDraftContext = {
    title: "Broken Streetlight on Main Rd",
    description: "Light fixture broken, pole #42 dark",
    category: "Street Lighting & Electrical",
    severity: "HIGH",
    address: "Main Rd, Jubilee Hills, Hyderabad",
    beforePhotoUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    verificationResult: {
      cameraModel: "Pixel 8",
      sha256Hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      verificationToken: "token_abc123_verified"
    } as any
  };

  const existingComplaint: Complaint = {
    id: "existing-uuid-1",
    trackingId: "GHMC-2026-0001",
    title: "Prior Pothole",
    description: "Old complaint in citizen state",
    category: "Roads & Potholes",
    status: "IN_PROGRESS",
    severity: "STANDARD",
    address: "Colony Lane",
    beforePhotoUrl: "",
    rejectionCount: 1,
    createdAt: new Date().toISOString()
  };

  const initialState: CitizenClientSubmissionState = {
    complaints: [existingComplaint],
    successId: null,
    submissionError: null
  };

  // -------------------------------------------------------------------------
  // TEST 1: HTTP 400 Bad Request / Validation Failure
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: HTTP 400 Validation Failure ---");
  const res400 = {
    status: 400,
    ok: false,
    json: async () => ({ message: "A clean headline and description are required." })
  };
  const outcome400 = await processSubmissionOutcome(res400, sampleDraft);
  assert.strictEqual(outcome400.success, false, "400 response must mark outcome as unsuccessful");
  assert.strictEqual(outcome400.error, "A clean headline and description are required.", "Error message must match server message");
  assert.strictEqual(outcome400.complaint, undefined, "No complaint must be created on 400");
  assert.strictEqual(outcome400.trackingId, undefined, "No tracking ID must be created on 400");

  const state400 = applySubmissionOutcome(initialState, outcome400);
  assert.strictEqual(state400.complaints.length, 1, "Complaints list must not change on 400");
  assert.strictEqual(state400.complaints[0].id, "existing-uuid-1", "Existing complaint must remain intact");
  assert.strictEqual(state400.successId, null, "successId must remain null on 400");
  assert.strictEqual(state400.submissionError, "A clean headline and description are required.");
  pass("1. HTTP 400 validation failure displays server error and never adds complaint or tracking ID");

  // -------------------------------------------------------------------------
  // TEST 2: HTTP 401 Unauthorized / Session Expired
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: HTTP 401 Unauthorized ---");
  const res401 = {
    status: 401,
    ok: false,
    json: async () => ({ message: "Authentication required" })
  };
  const outcome401 = await processSubmissionOutcome(res401, sampleDraft);
  assert.strictEqual(outcome401.success, false, "401 response must mark outcome as unsuccessful");
  assert.strictEqual(outcome401.requiresLogin, true, "401 response must flag requiresLogin");
  assert.strictEqual(outcome401.complaint, undefined, "No complaint must be created on 401");
  assert.strictEqual(outcome401.trackingId, undefined, "No tracking ID must be created on 401");

  const state401 = applySubmissionOutcome(initialState, outcome401);
  assert.strictEqual(state401.complaints.length, 1, "Complaints list must not change on 401");
  assert.strictEqual(state401.successId, null, "successId must remain null on 401");
  pass("2. HTTP 401 unauthorized flags login requirement and never adds complaint or tracking ID");

  // -------------------------------------------------------------------------
  // TEST 3: HTTP 403 Forbidden / Access Denied
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3: HTTP 403 Forbidden ---");
  const res403 = {
    status: 403,
    ok: false,
    json: async () => ({ message: "Forbidden: your role does not have access to this resource." })
  };
  const outcome403 = await processSubmissionOutcome(res403, sampleDraft);
  assert.strictEqual(outcome403.success, false, "403 response must mark outcome as unsuccessful");
  assert.strictEqual(outcome403.error, "Forbidden: your role does not have access to this resource.");
  assert.strictEqual(outcome403.complaint, undefined, "No complaint must be created on 403");
  assert.strictEqual(outcome403.trackingId, undefined, "No tracking ID must be created on 403");

  const state403 = applySubmissionOutcome(initialState, outcome403);
  assert.strictEqual(state403.complaints.length, 1, "Complaints list must not change on 403");
  assert.strictEqual(state403.successId, null, "successId must remain null on 403");
  assert.strictEqual(state403.submissionError, "Forbidden: your role does not have access to this resource.");
  pass("3. HTTP 403 forbidden displays error and never adds complaint or tracking ID");

  // -------------------------------------------------------------------------
  // TEST 4: HTTP 429 Rate Limited
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4: HTTP 429 Rate Limit ---");
  const res429 = {
    status: 429,
    ok: false,
    json: async () => ({ message: "Too many grievance submissions. Please wait 15 minutes." })
  };
  const outcome429 = await processSubmissionOutcome(res429, sampleDraft);
  assert.strictEqual(outcome429.success, false, "429 response must mark outcome as unsuccessful");
  assert.strictEqual(outcome429.error, "Too many grievance submissions. Please wait 15 minutes.");
  assert.strictEqual(outcome429.complaint, undefined, "No complaint must be created on 429");
  assert.strictEqual(outcome429.trackingId, undefined, "No tracking ID must be created on 429");

  const state429 = applySubmissionOutcome(initialState, outcome429);
  assert.strictEqual(state429.complaints.length, 1, "Complaints list must not change on 429");
  assert.strictEqual(state429.successId, null, "successId must remain null on 429");
  assert.strictEqual(state429.submissionError, "Too many grievance submissions. Please wait 15 minutes.");
  pass("4. HTTP 429 rate limit displays error and never adds complaint or tracking ID");

  // -------------------------------------------------------------------------
  // TEST 5: HTTP 500 Server Error
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5: HTTP 500 Server Error ---");
  // 5A: Server error with JSON message
  const res500A = {
    status: 500,
    ok: false,
    json: async () => ({ message: "Database connection failed" })
  };
  const outcome500A = await processSubmissionOutcome(res500A, sampleDraft);
  assert.strictEqual(outcome500A.success, false, "500 response must mark outcome as unsuccessful");
  assert.strictEqual(outcome500A.error, "Database connection failed");
  assert.strictEqual(outcome500A.complaint, undefined);
  assert.strictEqual(outcome500A.trackingId, undefined);

  const state500A = applySubmissionOutcome(initialState, outcome500A);
  assert.strictEqual(state500A.complaints.length, 1);
  assert.strictEqual(state500A.successId, null);
  assert.strictEqual(state500A.submissionError, "Database connection failed");

  // 5B: Server error with empty/non-JSON response
  const res500B = {
    status: 500,
    ok: false,
    json: async () => { throw new Error("Invalid JSON"); }
  };
  const outcome500B = await processSubmissionOutcome(res500B, sampleDraft);
  assert.strictEqual(outcome500B.success, false);
  assert.strictEqual(outcome500B.error, "Server rejected submission (HTTP 500)");

  const state500B = applySubmissionOutcome(initialState, outcome500B);
  assert.strictEqual(state500B.complaints.length, 1);
  assert.strictEqual(state500B.successId, null);
  assert.strictEqual(state500B.submissionError, "Server rejected submission (HTTP 500)");
  pass("5. HTTP 500 server error safely falls back to status error and never adds complaint or tracking ID");

  // -------------------------------------------------------------------------
  // TEST 6: Network Failure (fetch rejection / offline)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: Network Failure ---");
  const networkError = new TypeError("Failed to fetch");
  const outcomeNetwork = await processSubmissionOutcome(networkError, sampleDraft);
  assert.strictEqual(outcomeNetwork.success, false, "Network error must mark outcome as unsuccessful");
  assert.strictEqual(outcomeNetwork.error, "Failed to fetch");
  assert.strictEqual(outcomeNetwork.complaint, undefined);
  assert.strictEqual(outcomeNetwork.trackingId, undefined);

  const stateNetwork = applySubmissionOutcome(initialState, outcomeNetwork);
  assert.strictEqual(stateNetwork.complaints.length, 1, "Complaints list must not change on network error");
  assert.strictEqual(stateNetwork.successId, null, "successId must remain null on network error");
  assert.strictEqual(stateNetwork.submissionError, "Failed to fetch");
  pass("6. Network failure surfaces error message and never adds complaint or tracking ID");

  // -------------------------------------------------------------------------
  // TEST 7: Valid Successful Submission (Server-Owned Status & Fields)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 7: Valid Successful Submission ---");

  // 7A: Standard successful submission (admitted to SUBMITTED)
  const serverComplaintData7A = {
    id: "server-uuid-8899",
    trackingId: "GHMC-2026-8899",
    title: "Broken Streetlight on Main Rd",
    status: "SUBMITTED"
  };
  const res200A = {
    status: 200,
    ok: true,
    json: async () => ({
      message: "Complaint registered successfully",
      complaint: serverComplaintData7A
    })
  };
  const outcome200A = await processSubmissionOutcome(res200A, sampleDraft);
  assert.strictEqual(outcome200A.success, true, "200 response with valid complaint must succeed");
  assert.strictEqual(outcome200A.error, undefined, "Successful outcome must not have error");
  assert.strictEqual(outcome200A.trackingId, "GHMC-2026-8899", "Tracking ID must match server tracking ID");
  assert.ok(outcome200A.complaint, "Complaint object must be created");
  assert.strictEqual(outcome200A.complaint?.id, "server-uuid-8899", "Complaint ID must match server ID");
  assert.strictEqual(outcome200A.complaint?.trackingId, "GHMC-2026-8899");
  assert.strictEqual(outcome200A.complaint?.title, "Broken Streetlight on Main Rd");
  assert.strictEqual(outcome200A.complaint?.status, "SUBMITTED", "Status must preserve server-assigned SUBMITTED status");
  assert.strictEqual(outcome200A.complaint?.rejectionCount, 0, "Initial submission rejectionCount is 0");
  assert.strictEqual(outcome200A.complaint?.createdAt, undefined, "createdAt is undefined when omitted by server (no fake client date)");

  const state200A = applySubmissionOutcome(initialState, outcome200A);
  assert.strictEqual(state200A.complaints.length, 2, "Complaints list must contain newly added complaint");
  assert.strictEqual(state200A.complaints[0].id, "server-uuid-8899", "New complaint must be prepended");
  assert.strictEqual(state200A.complaints[0].trackingId, "GHMC-2026-8899");
  assert.strictEqual(state200A.successId, "GHMC-2026-8899", "successId must be populated with server tracking ID");
  assert.strictEqual(state200A.submissionError, null, "submissionError must be cleared on success");

  // 7B: Server-enforced escalation status (TPA_REVIEW due to low trust score or duplicate detection)
  const serverComplaintData7B = {
    id: "server-uuid-8900",
    trackingId: "GHMC-2026-8900",
    title: "Suspicious Grievance Flagged for Audit",
    status: "TPA_REVIEW"
  };
  const res200B = {
    status: 200,
    ok: true,
    json: async () => ({
      message: "Complaint registered and routed for review",
      complaint: serverComplaintData7B
    })
  };
  const outcome200B = await processSubmissionOutcome(res200B, sampleDraft);
  assert.strictEqual(outcome200B.success, true);
  assert.strictEqual(outcome200B.complaint?.status, "TPA_REVIEW", "Server-assigned TPA_REVIEW must not be silently overridden");

  pass("7. Valid successful submission preserves server-confirmed complaint, tracking ID, and server-owned status");

  // -------------------------------------------------------------------------
  // TEST 8: Malformed 200 OK Server Responses (Missing Server-Owned Fields)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 8: Malformed 200 OK Server Responses ---");

  // 8A: Missing complaint entirely ({})
  const resMalformedEmpty = {
    status: 200,
    ok: true,
    json: async () => ({})
  };
  const outcome8A = await processSubmissionOutcome(resMalformedEmpty, sampleDraft);
  assert.strictEqual(outcome8A.success, false, "Empty response must fail");
  assert.strictEqual(outcome8A.error, "Server response did not include a valid registered complaint.");
  const state8A = applySubmissionOutcome(initialState, outcome8A);
  assert.strictEqual(state8A.complaints.length, 1);
  assert.strictEqual(state8A.successId, null);

  // 8B: complaint is null ({ complaint: null })
  const resMalformedNull = {
    status: 200,
    ok: true,
    json: async () => ({ complaint: null })
  };
  const outcome8B = await processSubmissionOutcome(resMalformedNull, sampleDraft);
  assert.strictEqual(outcome8B.success, false, "Null complaint must fail");
  assert.strictEqual(outcome8B.error, "Server response did not include a valid registered complaint.");
  const state8B = applySubmissionOutcome(initialState, outcome8B);
  assert.strictEqual(state8B.complaints.length, 1);
  assert.strictEqual(state8B.successId, null);

  // 8C: complaint missing id ({ complaint: { trackingId: "GHMC-2026-9999", status: "SUBMITTED" } })
  const resMalformedNoId = {
    status: 200,
    ok: true,
    json: async () => ({ complaint: { trackingId: "GHMC-2026-9999", status: "SUBMITTED" } })
  };
  const outcome8C = await processSubmissionOutcome(resMalformedNoId, sampleDraft);
  assert.strictEqual(outcome8C.success, false, "Complaint missing id must fail");
  assert.strictEqual(outcome8C.error, "Server response did not include a valid registered complaint.");
  const state8C = applySubmissionOutcome(initialState, outcome8C);
  assert.strictEqual(state8C.complaints.length, 1);
  assert.strictEqual(state8C.successId, null);

  // 8D: complaint missing trackingId ({ complaint: { id: "server-uuid-no-tracking", status: "SUBMITTED" } })
  const resMalformedNoTracking = {
    status: 200,
    ok: true,
    json: async () => ({ complaint: { id: "server-uuid-no-tracking", status: "SUBMITTED" } })
  };
  const outcome8D = await processSubmissionOutcome(resMalformedNoTracking, sampleDraft);
  assert.strictEqual(outcome8D.success, false, "Complaint missing trackingId must fail");
  assert.strictEqual(outcome8D.error, "Server response did not include a valid registered complaint.");
  const state8D = applySubmissionOutcome(initialState, outcome8D);
  assert.strictEqual(state8D.complaints.length, 1);
  assert.strictEqual(state8D.successId, null);

  // 8E: complaint missing status ({ complaint: { id: "server-uuid-no-status", trackingId: "GHMC-2026-9999" } })
  const resMalformedNoStatus = {
    status: 200,
    ok: true,
    json: async () => ({ complaint: { id: "server-uuid-no-status", trackingId: "GHMC-2026-9999" } })
  };
  const outcome8E = await processSubmissionOutcome(resMalformedNoStatus, sampleDraft);
  assert.strictEqual(outcome8E.success, false, "Complaint missing status must fail");
  assert.strictEqual(outcome8E.error, "Server response did not include a valid registered complaint.");
  const state8E = applySubmissionOutcome(initialState, outcome8E);
  assert.strictEqual(state8E.complaints.length, 1);
  assert.strictEqual(state8E.successId, null);

  // 8F: complaint with invalid/unknown status ({ complaint: { id: "c1", trackingId: "t1", status: "BOGUS_STATUS" } })
  const resMalformedInvalidStatus = {
    status: 200,
    ok: true,
    json: async () => ({ complaint: { id: "c1", trackingId: "t1", status: "BOGUS_STATUS" } })
  };
  const outcome8F = await processSubmissionOutcome(resMalformedInvalidStatus, sampleDraft);
  assert.strictEqual(outcome8F.success, false, "Complaint with invalid status must fail");
  assert.strictEqual(outcome8F.error, "Server response did not include a valid registered complaint.");
  const state8F = applySubmissionOutcome(initialState, outcome8F);
  assert.strictEqual(state8F.complaints.length, 1);
  assert.strictEqual(state8F.successId, null);

  pass("8. Malformed 200 responses missing server-owned fields (id/trackingId/status) fail safely and never add unpersisted items");

  // -------------------------------------------------------------------------
  // TEST 9: Verification of No Mock ID or Math.random() Fabrication
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 9: Anti-Fabrication Guarantee ---");
  const failedOutcomes = [
    outcome400,
    outcome401,
    outcome403,
    outcome429,
    outcome500A,
    outcome500B,
    outcomeNetwork,
    outcome8A,
    outcome8B,
    outcome8C,
    outcome8D,
    outcome8E,
    outcome8F
  ];
  for (const failed of failedOutcomes) {
    assert.strictEqual(failed.complaint, undefined, "Failed outcome must have undefined complaint");
    assert.strictEqual(failed.trackingId, undefined, "Failed outcome must have undefined trackingId");
  }
  pass("9. Anti-fabrication guarantee: No Math.random(), Date.now(), or mock IDs created across failure scenarios");

  // -------------------------------------------------------------------------
  // TEST 10: Status Update Response Handling & Malformed PATCH Responses
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 10: Status Update Response Handling (PATCH /api/complaints/[id]/status) ---");

  // 10A: Successful confirmation PATCH -> CLOSED, rejectionCount: 0
  const patch200A = {
    status: 200,
    ok: true,
    json: async () => ({
      message: "Status updated",
      complaint: {
        id: "existing-uuid-1",
        trackingId: "GHMC-2026-0001",
        status: "CLOSED",
        rejectionCount: 0
      }
    })
  };
  const statusOutcome10A = await processStatusUpdateOutcome(patch200A, existingComplaint);
  assert.strictEqual(statusOutcome10A.success, true);
  assert.strictEqual(statusOutcome10A.status, "CLOSED");
  assert.strictEqual(statusOutcome10A.rejectionCount, 0);
  assert.strictEqual(statusOutcome10A.trackingId, "GHMC-2026-0001");
  assert.strictEqual(statusOutcome10A.escalated, false);

  // 10B: Successful dispute PATCH -> IN_PROGRESS, rejectionCount: 1
  const patch200B = {
    status: 200,
    ok: true,
    json: async () => ({
      message: "Status updated",
      complaint: {
        id: "existing-uuid-1",
        trackingId: "GHMC-2026-0001",
        status: "IN_PROGRESS",
        rejectionCount: 1
      }
    })
  };
  const statusOutcome10B = await processStatusUpdateOutcome(patch200B, existingComplaint);
  assert.strictEqual(statusOutcome10B.success, true);
  assert.strictEqual(statusOutcome10B.status, "IN_PROGRESS");
  assert.strictEqual(statusOutcome10B.rejectionCount, 1);
  assert.strictEqual(statusOutcome10B.escalated, false);

  // 10C: Escalated dispute PATCH -> TPA_REVIEW, rejectionCount: 2, escalated: true
  const patch200C = {
    status: 200,
    ok: true,
    json: async () => ({
      message: "Status updated",
      complaint: {
        id: "existing-uuid-1",
        trackingId: "GHMC-2026-0001",
        status: "TPA_REVIEW",
        rejectionCount: 2
      },
      escalated: true
    })
  };
  const statusOutcome10C = await processStatusUpdateOutcome(patch200C, existingComplaint);
  assert.strictEqual(statusOutcome10C.success, true);
  assert.strictEqual(statusOutcome10C.status, "TPA_REVIEW");
  assert.strictEqual(statusOutcome10C.rejectionCount, 2);
  assert.strictEqual(statusOutcome10C.escalated, true);

  // 10D: Malformed PATCH response: missing complaint object entirely ({})
  const patchMalformedNoComplaint = {
    status: 200,
    ok: true,
    json: async () => ({ message: "Status updated" })
  };
  const statusOutcome10D = await processStatusUpdateOutcome(patchMalformedNoComplaint, existingComplaint);
  assert.strictEqual(statusOutcome10D.success, false, "PATCH without complaint must fail");
  assert.strictEqual(statusOutcome10D.error, "Server response did not include a valid confirmed grievance status.");
  assert.strictEqual(statusOutcome10D.status, undefined, "Status must NOT fall back to targetStatus on malformed response");

  // 10E: Malformed PATCH response: complaint missing status ({ complaint: { id: "c1" } })
  const patchMalformedNoStatus = {
    status: 200,
    ok: true,
    json: async () => ({ complaint: { id: "existing-uuid-1", rejectionCount: 1 } })
  };
  const statusOutcome10E = await processStatusUpdateOutcome(patchMalformedNoStatus, existingComplaint);
  assert.strictEqual(statusOutcome10E.success, false, "PATCH without status must fail");
  assert.strictEqual(statusOutcome10E.error, "Server response did not include a valid confirmed grievance status.");
  assert.strictEqual(statusOutcome10E.status, undefined, "Status must NOT fall back to targetStatus when server omits status");

  // 10F: Malformed PATCH response: invalid status string
  const patchMalformedInvalidStatus = {
    status: 200,
    ok: true,
    json: async () => ({ complaint: { id: "existing-uuid-1", status: "UNCONFIRMED_BOGUS" } })
  };
  const statusOutcome10F = await processStatusUpdateOutcome(patchMalformedInvalidStatus, existingComplaint);
  assert.strictEqual(statusOutcome10F.success, false);
  assert.strictEqual(statusOutcome10F.status, undefined);

  // 10G: Malformed PATCH response: invalid rejectionCount type (non-number string)
  const patchMalformedBadRejectionCount = {
    status: 200,
    ok: true,
    json: async () => ({ complaint: { id: "existing-uuid-1", status: "CLOSED", rejectionCount: "none" } })
  };
  const statusOutcome10G = await processStatusUpdateOutcome(patchMalformedBadRejectionCount, existingComplaint);
  assert.strictEqual(statusOutcome10G.success, false);
  assert.strictEqual(statusOutcome10G.error, "Server response included an invalid rejection count.");

  // 10H: Missing rejectionCount in PATCH response preserves existing complaint count (does not force 0)
  const patchMissingRejectionCount = {
    status: 200,
    ok: true,
    json: async () => ({ complaint: { id: "existing-uuid-1", status: "CLOSED" } })
  };
  const statusOutcome10H = await processStatusUpdateOutcome(patchMissingRejectionCount, existingComplaint);
  assert.strictEqual(statusOutcome10H.success, true);
  assert.strictEqual(statusOutcome10H.status, "CLOSED");
  assert.strictEqual(statusOutcome10H.rejectionCount, 1, "Preserves existing rejectionCount (1) when omitted by API");

  // 10I: HTTP 401 on status update flags requiresLogin
  const patch401 = {
    status: 401,
    ok: false,
    json: async () => ({ message: "Unauthorized" })
  };
  const statusOutcome10I = await processStatusUpdateOutcome(patch401, existingComplaint);
  assert.strictEqual(statusOutcome10I.success, false);
  assert.strictEqual(statusOutcome10I.requiresLogin, true);

  // 10J: HTTP 403 on status update returns error and does not update
  const patch403 = {
    status: 403,
    ok: false,
    json: async () => ({ message: "Forbidden: you can only manage your own grievances." })
  };
  const statusOutcome10J = await processStatusUpdateOutcome(patch403, existingComplaint);
  assert.strictEqual(statusOutcome10J.success, false);
  assert.strictEqual(statusOutcome10J.error, "Forbidden: you can only manage your own grievances.");

  // 10K: Network error on status update returns error
  const statusOutcome10K = await processStatusUpdateOutcome(new Error("Connection reset"), existingComplaint);
  assert.strictEqual(statusOutcome10K.success, false);
  assert.strictEqual(statusOutcome10K.error, "Connection reset");

  pass("10. Status update response handling strictly enforces server status, rejects malformed PATCH, and preserves rejectionCount");

  console.log(`\n=== ALL ${passedCount} CLIENT SUBMISSION & STATUS RESPONSE-HANDLING TESTS PASSED ===`);
}

runClientSubmissionTests().catch(err => {
  console.error("❌ CLIENT SUBMISSION TEST FAILURE:", err);
  process.exit(1);
});
