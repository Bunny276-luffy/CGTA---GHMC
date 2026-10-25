import assert from "assert";
import { verifyCaptchaToken } from "../lib/captcha";
import { POST as registerHandler } from "../app/api/auth/register/route";
import { POST as loginHandler } from "../app/api/auth/login/route";
import { POST as submitHandler } from "../app/api/complaints/submit/route";
import { signSession } from "../lib/session";

// Helper to back up and restore process.env
const originalEnv = { ...process.env };
const originalFetch = global.fetch;

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.CAPTCHA_SECRET_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.RECAPTCHA_SECRET_KEY;
  delete process.env.CAPTCHA_ENABLED;
  delete process.env.CAPTCHA_STRICT;
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  process.env.AUTH_SECRET = "civictrust-test-auth-secret-32chars-minimum";
  global.fetch = originalFetch;
}

let ipCounter = 1;
function getUniqueIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

async function runCaptchaSecurityTests() {
  console.log("=== STARTING CAPTCHA SECURITY & REGRESSION TEST SUITE ===");

  // Scenario 1: Local development with CAPTCHA explicitly disabled
  resetEnv();
  (process.env as any).NODE_ENV = "development";
  process.env.CAPTCHA_ENABLED = "false";
  const res1 = await verifyCaptchaToken(null);
  assert.strictEqual(res1.ok, true, "Local dev with CAPTCHA disabled should pass gracefully");
  assert.strictEqual(res1.provider, "none");
  console.log("✅ Scenario 1 Passed: Local dev with CAPTCHA disabled permits execution");

  // Scenario 2: Production with CAPTCHA configuration missing
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  const res2 = await verifyCaptchaToken("some-token");
  assert.strictEqual(res2.ok, false, "Production with missing CAPTCHA secret must fail-closed");
  assert.strictEqual(res2.status, 500, "Unconfigured protection must return 500 status");
  assert(res2.message?.includes("unconfigured"), "Error message should cite unconfigured protection");
  console.log("✅ Scenario 2 Passed: Unconfigured production deployment fails-closed with 500");

  // Scenario 2b: Production with explicit CAPTCHA_ENABLED=false permits operation
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.CAPTCHA_ENABLED = "false";
  const res2b = await verifyCaptchaToken(null);
  assert.strictEqual(res2b.ok, true, "Production with explicit CAPTCHA_ENABLED=false must pass gracefully");
  assert.strictEqual(res2b.provider, "none");
  console.log("✅ Scenario 2b Passed: Production deployment with CAPTCHA_ENABLED=false permits execution");

  // Scenario 3: Strict mode with missing token
  resetEnv();
  (process.env as any).NODE_ENV = "development";
  process.env.CAPTCHA_SECRET_KEY = "test-secret-key";
  process.env.CAPTCHA_STRICT = "true";
  const res3 = await verifyCaptchaToken("");
  assert.strictEqual(res3.ok, false, "Strict mode with missing token must be rejected");
  assert.strictEqual(res3.status, 400, "Missing token must return 400 status");
  assert.strictEqual(res3.message, "CAPTCHA validation token is missing.");
  console.log("✅ Scenario 3 Passed: Strict mode rejects missing token with 400");

  // Scenario 4: Configured verification with valid token
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.CAPTCHA_SECRET_KEY = "test-secret-key";
  process.env.CAPTCHA_ENABLED = "true";
  global.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({ success: true, score: 0.9 })
    } as any;
  }) as typeof fetch;

  const res4 = await verifyCaptchaToken("valid-token", "127.0.0.1");
  assert.strictEqual(res4.ok, true, "Valid token should be verified successfully");
  assert.strictEqual(res4.score, 0.9);
  console.log("✅ Scenario 4 Passed: Configured verification succeeds for valid token");

  // Scenario 5: Invalid or replayed token rejection
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.CAPTCHA_SECRET_KEY = "test-secret-key";
  process.env.CAPTCHA_ENABLED = "true";
  global.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] })
    } as any;
  }) as typeof fetch;

  const res5 = await verifyCaptchaToken("invalid-token");
  assert.strictEqual(res5.ok, false, "Invalid or replayed token must be rejected");
  assert.strictEqual(res5.status, 400, "Invalid token must return 400 status");
  assert.strictEqual(res5.message, "Security check failed. Please refresh and try again.");
  console.log("✅ Scenario 5 Passed: Invalid token is safely rejected with 400");

  // Scenario 6: CAPTCHA provider returning non-success HTTP status (500/503)
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.CAPTCHA_SECRET_KEY = "test-secret-key";
  process.env.CAPTCHA_ENABLED = "true";
  global.fetch = (async () => {
    return {
      ok: false,
      status: 503
    } as any;
  }) as typeof fetch;

  const res6 = await verifyCaptchaToken("any-token");
  assert.strictEqual(res6.ok, false, "Provider HTTP error must fail-closed");
  assert.strictEqual(res6.status, 503, "Provider HTTP error must return 503 status");
  assert.strictEqual(res6.message, "CAPTCHA verification service temporarily unavailable.");
  console.log("✅ Scenario 6 Passed: Provider HTTP error fails-closed safely with 503");

  // Scenario 7: Network failure or timeout
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.CAPTCHA_SECRET_KEY = "test-secret-key";
  process.env.CAPTCHA_ENABLED = "true";
  global.fetch = (async () => {
    throw new Error("Network connection reset by peer");
  }) as typeof fetch;

  const res7 = await verifyCaptchaToken("any-token");
  assert.strictEqual(res7.ok, false, "Network failure must fail-closed");
  assert.strictEqual(res7.status, 503, "Network failure must return 503 status");
  assert.strictEqual(res7.message, "CAPTCHA verification service temporarily unavailable.");
  console.log("✅ Scenario 7 Passed: Network failure fails-closed safely with 503");

  // Scenario 8: Contradictory environment settings (CAPTCHA_ENABLED=true without secret key)
  resetEnv();
  (process.env as any).NODE_ENV = "development";
  process.env.CAPTCHA_ENABLED = "true"; // Missing secret key
  const res8 = await verifyCaptchaToken("any-token");
  assert.strictEqual(res8.ok, false, "CAPTCHA_ENABLED=true without secret key must fail-closed");
  assert.strictEqual(res8.status, 500, "Contradictory settings must return 500 status");
  assert(res8.message?.includes("unconfigured"), "Error message should cite unconfigured protection");
  console.log("✅ Scenario 8 Passed: Contradictory settings fail-closed with 500");

  // Scenario 9: Confidentiality check — client responses must not expose secret keys or stack traces
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.CAPTCHA_SECRET_KEY = "SUPER_SECRET_KEY_12345";
  global.fetch = (async () => {
    throw new Error("Sensitive connection string postgresql://user:pass@host:5432/db failed");
  }) as typeof fetch;

  const res9 = await verifyCaptchaToken("token");
  assert.strictEqual(res9.ok, false);
  assert(!JSON.stringify(res9).includes("SUPER_SECRET_KEY"), "Response must not contain secret key");
  assert(!JSON.stringify(res9).includes("postgresql://"), "Response must not contain database URI");
  assert(!JSON.stringify(res9).includes("connection string"), "Response must not expose internal exceptions");
  console.log("✅ Scenario 9 Passed: Client error messages are strictly sanitized");

  // =========================================================================
  // ROUTE-LEVEL TESTS: Registration, Login, and Complaint Submission POST Handlers
  // =========================================================================
  console.log("\n=== STARTING ROUTE-LEVEL CAPTCHA & SECURITY TESTS ===");

  resetEnv();
  const citizenToken = await signSession({
    id: "test-citizen-uuid",
    email: "citizen@example.com",
    name: "Test Citizen",
    role: "CITIZEN",
  });
  const adminToken = await signSession({
    id: "test-admin-uuid",
    email: "admin@example.com",
    name: "Test Admin",
    role: "ADMIN",
  });

  // --- Route Auth & Rate-Limit Preservation Checks ---
  // Submit Route: Unauthenticated request must return 401
  const reqUnauth = new Request("http://localhost:3000/api/complaints/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": getUniqueIp(),
    },
    body: JSON.stringify({ title: "Test", captchaToken: "any" }),
  });
  const resUnauth = await submitHandler(reqUnauth);
  assert.strictEqual(resUnauth.status, 401, "Submit handler without session must return 401");
  console.log("✅ Route Check Passed: Submit endpoint preserves 401 unauthenticated guard");

  // Submit Route: Forbidden role (ADMIN cannot submit citizen grievance) must return 403
  const reqForbidden = new Request("http://localhost:3000/api/complaints/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${adminToken}`,
      "x-forwarded-for": getUniqueIp(),
    },
    body: JSON.stringify({ title: "Test", captchaToken: "any" }),
  });
  const resForbidden = await submitHandler(reqForbidden);
  assert.strictEqual(resForbidden.status, 403, "Submit handler with non-citizen session must return 403");
  console.log("✅ Route Check Passed: Submit endpoint preserves 403 role authorization guard");

  // Register Route: Non-citizen role registration forbidden
  const reqRoleForbidden = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": getUniqueIp(),
    },
    body: JSON.stringify({
      role: "OFFICER",
      name: "Officer",
      email: "officer@example.com",
      password: "Password123!",
      captchaToken: "any",
    }),
  });
  const resRoleForbidden = await registerHandler(reqRoleForbidden);
  assert.strictEqual(resRoleForbidden.status, 403, "Self-registration for non-citizen must return 403");
  console.log("✅ Route Check Passed: Register endpoint preserves 403 role restriction guard");

  // Rate-limiting check: Register endpoint rate limit exhaustion
  const fixedRateIp = "203.0.113.99";
  for (let i = 0; i < 5; i++) {
    // Consume budget (limit is 5)
    await registerHandler(
      new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": fixedRateIp },
        body: JSON.stringify({ role: "CITIZEN", captchaToken: "x" }),
      })
    );
  }
  const reqRateLimited = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": fixedRateIp },
    body: JSON.stringify({ role: "CITIZEN", captchaToken: "x" }),
  });
  const resRateLimited = await registerHandler(reqRateLimited);
  assert.strictEqual(resRateLimited.status, 429, "Exhausted rate limit must return 429");
  console.log("✅ Route Check Passed: Rate limiting returns 429 when budget exhausted");

  // --- Route Scenario: Server Configuration Failure (HTTP 500) ---
  // When running in production with unconfigured secret key, all three endpoints must return 500
  resetEnv();
  (process.env as any).NODE_ENV = "production"; // Secret key missing

  const reqReg500 = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      password: "Password123!",
      captchaToken: "some-token",
    }),
  });
  const resReg500 = await registerHandler(reqReg500);
  assert.strictEqual(resReg500.status, 500, "Register route must return 500 on server configuration failure");
  const dataReg500 = await resReg500.json();
  assert(dataReg500.message?.includes("unconfigured"), "Register 500 must cite unconfigured protection");
  console.log("✅ Route Check Passed: Register endpoint returns 500 on server configuration failure");

  const reqLog500 = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      email: "test@example.com",
      password: "Password123!",
      captchaToken: "some-token",
    }),
  });
  const resLog500 = await loginHandler(reqLog500);
  assert.strictEqual(resLog500.status, 500, "Login route must return 500 on server configuration failure");
  const dataLog500 = await resLog500.json();
  assert(dataLog500.message?.includes("unconfigured"), "Login 500 must cite unconfigured protection");
  console.log("✅ Route Check Passed: Login endpoint returns 500 on server configuration failure");

  const reqSub500 = new Request("http://localhost:3000/api/complaints/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${citizenToken}`,
      "x-forwarded-for": getUniqueIp(),
    },
    body: JSON.stringify({
      title: "Pothole repair needed",
      description: "Severe pothole on roadway",
      category: "ROADS",
      latitude: 17.385,
      longitude: 78.486,
      captchaToken: "some-token",
    }),
  });
  const resSub500 = await submitHandler(reqSub500);
  assert.strictEqual(resSub500.status, 500, "Submit route must return 500 on server configuration failure");
  const dataSub500 = await resSub500.json();
  assert(dataSub500.message?.includes("unconfigured"), "Submit 500 must cite unconfigured protection");
  console.log("✅ Route Check Passed: Submit endpoint returns 500 on server configuration failure");

  // --- Route Scenario: Upstream Provider Outage / Error (HTTP 503) ---
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.CAPTCHA_SECRET_KEY = "test-secret-key";
  process.env.CAPTCHA_ENABLED = "true";
  global.fetch = (async () => {
    return { ok: false, status: 503 } as any;
  }) as typeof fetch;

  const reqReg503 = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      password: "Password123!",
      captchaToken: "valid-looking-token",
    }),
  });
  const resReg503 = await registerHandler(reqReg503);
  assert.strictEqual(resReg503.status, 503, "Register route must return 503 on provider outage");
  console.log("✅ Route Check Passed: Register endpoint returns 503 on provider outage");

  const reqLog503 = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      email: "test@example.com",
      password: "Password123!",
      captchaToken: "valid-looking-token",
    }),
  });
  const resLog503 = await loginHandler(reqLog503);
  assert.strictEqual(resLog503.status, 503, "Login route must return 503 on provider outage");
  console.log("✅ Route Check Passed: Login endpoint returns 503 on provider outage");

  const reqSub503 = new Request("http://localhost:3000/api/complaints/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${citizenToken}`,
      "x-forwarded-for": getUniqueIp(),
    },
    body: JSON.stringify({
      title: "Pothole repair needed",
      description: "Severe pothole on roadway",
      category: "ROADS",
      latitude: 17.385,
      longitude: 78.486,
      captchaToken: "valid-looking-token",
    }),
  });
  const resSub503 = await submitHandler(reqSub503);
  assert.strictEqual(resSub503.status, 503, "Submit route must return 503 on provider outage");
  console.log("✅ Route Check Passed: Submit endpoint returns 503 on provider outage");

  // --- Route Scenario: Invalid or Missing CAPTCHA Token (HTTP 400) ---
  resetEnv();
  (process.env as any).NODE_ENV = "production";
  process.env.CAPTCHA_SECRET_KEY = "test-secret-key";
  process.env.CAPTCHA_ENABLED = "true";

  // Subcase A: Missing token
  const reqRegMissing = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      password: "Password123!",
      captchaToken: "",
    }),
  });
  const resRegMissing = await registerHandler(reqRegMissing);
  assert.strictEqual(resRegMissing.status, 400, "Register route must return 400 on missing CAPTCHA token");
  console.log("✅ Route Check Passed: Register endpoint returns 400 on missing token");

  const reqLogMissing = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      email: "test@example.com",
      password: "Password123!",
      captchaToken: null,
    }),
  });
  const resLogMissing = await loginHandler(reqLogMissing);
  assert.strictEqual(resLogMissing.status, 400, "Login route must return 400 on missing CAPTCHA token");
  console.log("✅ Route Check Passed: Login endpoint returns 400 on missing token");

  const reqSubMissing = new Request("http://localhost:3000/api/complaints/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${citizenToken}`,
      "x-forwarded-for": getUniqueIp(),
    },
    body: JSON.stringify({
      title: "Pothole repair needed",
      description: "Severe pothole on roadway",
      category: "ROADS",
      latitude: 17.385,
      longitude: 78.486,
      captchaToken: "",
    }),
  });
  const resSubMissing = await submitHandler(reqSubMissing);
  assert.strictEqual(resSubMissing.status, 400, "Submit route must return 400 on missing CAPTCHA token");
  console.log("✅ Route Check Passed: Submit endpoint returns 400 on missing token");

  // Subcase B: Invalid token (Provider rejects token)
  global.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
    } as any;
  }) as typeof fetch;

  const reqRegInvalid = new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      name: "Test User",
      email: "test@example.com",
      password: "Password123!",
      captchaToken: "invalid-token-123",
    }),
  });
  const resRegInvalid = await registerHandler(reqRegInvalid);
  assert.strictEqual(resRegInvalid.status, 400, "Register route must return 400 on invalid CAPTCHA token");
  console.log("✅ Route Check Passed: Register endpoint returns 400 on rejected token");

  const reqLogInvalid = new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": getUniqueIp() },
    body: JSON.stringify({
      email: "test@example.com",
      password: "Password123!",
      captchaToken: "invalid-token-123",
    }),
  });
  const resLogInvalid = await loginHandler(reqLogInvalid);
  assert.strictEqual(resLogInvalid.status, 400, "Login route must return 400 on invalid CAPTCHA token");
  console.log("✅ Route Check Passed: Login endpoint returns 400 on rejected token");

  const reqSubInvalid = new Request("http://localhost:3000/api/complaints/submit", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${citizenToken}`,
      "x-forwarded-for": getUniqueIp(),
    },
    body: JSON.stringify({
      title: "Pothole repair needed",
      description: "Severe pothole on roadway",
      category: "ROADS",
      latitude: 17.385,
      longitude: 78.486,
      captchaToken: "invalid-token-123",
    }),
  });
  const resSubInvalid = await submitHandler(reqSubInvalid);
  assert.strictEqual(resSubInvalid.status, 400, "Submit route must return 400 on invalid CAPTCHA token");
  console.log("✅ Route Check Passed: Submit endpoint returns 400 on rejected token");

  // Restore environment
  resetEnv();
  console.log("=== ALL CAPTCHA SECURITY & ROUTE HANDLER TESTS PASSED ===");
}

runCaptchaSecurityTests().catch((err) => {
  console.error("❌ CAPTCHA security test failed:", err);
  process.exit(1);
});

