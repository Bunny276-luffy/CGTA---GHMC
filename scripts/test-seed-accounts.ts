import {
  validateSeedAccounts,
  runSeed,
  seedAccounts,
  main,
  SEED_ACCOUNT_DEFINITIONS,
  ValidatedSeedAccount
} from "./seed-accounts";
import { resetRepository } from "../lib/db";
import { verifyPassword } from "../lib/crypto";
import type { DatabaseRepository, User, AuditLog } from "../lib/repositories/types";

console.log("=== CivicTrust Seed Accounts Security & Fail-Safe Test Suite ===");

type TestEnv = Record<string, string | undefined>;
const envMap = process.env as Record<string, string | undefined>;

function setProcessEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete envMap[key];
  } else {
    envMap[key] = value;
  }
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`✅ Passed: ${testName}`);
    passedCount++;
  } else {
    console.error(`❌ Failed: ${testName}${details ? ` — ${details}` : ""}`);
    failedCount++;
  }
}

/**
 * Creates an in-memory mock repository that tracks all operations.
 * Guarantees no real database or network is ever contacted.
 */
function createMockRepository(initialUsers: User[] = []) {
  const users: User[] = [...initialUsers];
  const auditLogs: AuditLog[] = [];
  const calls = {
    setupDatabase: 0,
    getUserByEmail: 0,
    createUser: 0,
    createAuditLog: 0
  };

  const mockRepo = {
    calls,
    users,
    auditLogs,
    async setupDatabase(): Promise<void> {
      calls.setupDatabase++;
    },
    async getUserByEmail(email: string): Promise<User | null> {
      calls.getUserByEmail++;
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      return found || null;
    },
    async getUserById(id: string): Promise<User | null> {
      return users.find(u => u.id === id) || null;
    },
    async createUser(userData: Omit<User, "id" | "created_at" | "updated_at">): Promise<User> {
      calls.createUser++;
      const newUser: User = {
        id: `mock-user-${users.length + 1}`,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        password_hash: userData.password_hash,
        created_at: new Date()
      };
      users.push(newUser);
      return newUser;
    },
    async createAuditLog(logData: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> {
      calls.createAuditLog++;
      const log: AuditLog = {
        id: `mock-audit-${auditLogs.length + 1}`,
        user_id: logData.user_id,
        action: logData.action,
        details: logData.details,
        timestamp: new Date()
      };
      auditLogs.push(log);
      return log;
    }
  } as unknown as DatabaseRepository & {
    calls: typeof calls;
    users: typeof users;
    auditLogs: typeof auditLogs;
  };

  return mockRepo;
}

async function runTests() {
  // ---------------------------------------------------------------------------
  // Scenario 1: All password variables missing
  // ---------------------------------------------------------------------------
  {
    const mockRepo = createMockRepository();
    const env: TestEnv = {};

    let threw = false;
    let errorMessage = "";
    try {
      await runSeed(mockRepo, env);
    } catch (err: any) {
      threw = true;
      errorMessage = err.message || "";
    }

    assert(
      threw &&
        errorMessage.includes("SEED_OFFICER_PASSWORD") &&
        errorMessage.includes("SEED_DEPT_PASSWORD") &&
        errorMessage.includes("SEED_ADMIN_PASSWORD"),
      "Missing all password env vars throws descriptive error naming all missing variables"
    );
    assert(
      mockRepo.calls.setupDatabase === 0 && mockRepo.calls.createUser === 0,
      "Preflight aborts immediately: zero database setup or user creation calls made"
    );
    assert(
      mockRepo.users.length === 0,
      "No accounts created when all password variables are missing"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 2: Missing first account password (SEED_OFFICER_PASSWORD)
  // ---------------------------------------------------------------------------
  {
    const mockRepo = createMockRepository();
    const env: TestEnv = {
      SEED_DEPT_PASSWORD: "ValidDeptPassword#1",
      SEED_ADMIN_PASSWORD: "ValidAdminPassword#2"
    };

    let threw = false;
    let errorMessage = "";
    try {
      await runSeed(mockRepo, env);
    } catch (err: any) {
      threw = true;
      errorMessage = err.message || "";
    }

    assert(
      threw &&
        errorMessage.includes("SEED_OFFICER_PASSWORD") &&
        !errorMessage.includes("SEED_DEPT_PASSWORD") &&
        !errorMessage.includes("SEED_ADMIN_PASSWORD"),
      "Missing SEED_OFFICER_PASSWORD reports only the missing variable"
    );
    assert(
      mockRepo.calls.createUser === 0 && mockRepo.users.length === 0,
      "Zero accounts created when SEED_OFFICER_PASSWORD is missing"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 3: Missing middle account password (SEED_DEPT_PASSWORD)
  // ---------------------------------------------------------------------------
  {
    const mockRepo = createMockRepository();
    const env: TestEnv = {
      SEED_OFFICER_PASSWORD: "ValidOfficerPassword#1",
      SEED_ADMIN_PASSWORD: "ValidAdminPassword#2"
    };

    let threw = false;
    let errorMessage = "";
    try {
      await runSeed(mockRepo, env);
    } catch (err: any) {
      threw = true;
      errorMessage = err.message || "";
    }

    assert(
      threw && errorMessage.includes("SEED_DEPT_PASSWORD"),
      "Missing SEED_DEPT_PASSWORD reports SEED_DEPT_PASSWORD"
    );
    assert(
      mockRepo.calls.createUser === 0 && mockRepo.users.length === 0,
      "Zero accounts created when SEED_DEPT_PASSWORD is missing"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 4: Missing final account password (SEED_ADMIN_PASSWORD) — NO PARTIAL SEEDING
  // ---------------------------------------------------------------------------
  {
    const mockRepo = createMockRepository();
    const env: TestEnv = {
      SEED_OFFICER_PASSWORD: "ValidOfficerPassword#1",
      SEED_DEPT_PASSWORD: "ValidDeptPassword#2"
    };

    let threw = false;
    let errorMessage = "";
    try {
      await runSeed(mockRepo, env);
    } catch (err: any) {
      threw = true;
      errorMessage = err.message || "";
    }

    assert(
      threw && errorMessage.includes("SEED_ADMIN_PASSWORD"),
      "Missing SEED_ADMIN_PASSWORD reports SEED_ADMIN_PASSWORD"
    );
    assert(
      mockRepo.calls.createUser === 0 && mockRepo.users.length === 0,
      "Preflight prevents partial seeding: Officer and DeptHead are NOT created when Admin password is missing"
    );
    assert(
      mockRepo.calls.setupDatabase === 0,
      "setupDatabase is never invoked when any required password is missing"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 5: Blank password (empty string)
  // ---------------------------------------------------------------------------
  {
    const mockRepo = createMockRepository();
    const env: TestEnv = {
      SEED_OFFICER_PASSWORD: "",
      SEED_DEPT_PASSWORD: "ValidDeptPassword#2",
      SEED_ADMIN_PASSWORD: "ValidAdminPassword#3"
    };

    let threw = false;
    let errorMessage = "";
    try {
      await runSeed(mockRepo, env);
    } catch (err: any) {
      threw = true;
      errorMessage = err.message || "";
    }

    assert(
      threw && errorMessage.includes("SEED_OFFICER_PASSWORD"),
      "Empty string password is treated as missing/blank and rejected"
    );
    assert(
      mockRepo.calls.createUser === 0,
      "Zero accounts created when password is empty string"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 6: Blank password (whitespace-only)
  // ---------------------------------------------------------------------------
  {
    const mockRepo = createMockRepository();
    const env: TestEnv = {
      SEED_OFFICER_PASSWORD: "ValidOfficerPassword#1",
      SEED_DEPT_PASSWORD: "   \t \n  ",
      SEED_ADMIN_PASSWORD: "ValidAdminPassword#3"
    };

    let threw = false;
    let errorMessage = "";
    try {
      await runSeed(mockRepo, env);
    } catch (err: any) {
      threw = true;
      errorMessage = err.message || "";
    }

    assert(
      threw && errorMessage.includes("SEED_DEPT_PASSWORD"),
      "Whitespace-only password is treated as blank and rejected"
    );
    assert(
      mockRepo.calls.createUser === 0,
      "Zero accounts created when password is whitespace only"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 7: Security check — error messages NEVER leak configured passwords/secrets
  // ---------------------------------------------------------------------------
  {
    const mockRepo = createMockRepository();
    const canarySecret = "SUPER_SECRET_CANARY_VALUE_XYZ_987654";
    const env: TestEnv = {
      SEED_OFFICER_PASSWORD: canarySecret,
      SEED_DEPT_PASSWORD: "   " // trigger failure
    };

    let errorMessage = "";
    try {
      await runSeed(mockRepo, env);
    } catch (err: any) {
      errorMessage = err.message || "";
    }

    assert(
      !errorMessage.includes(canarySecret),
      "Error message does not leak configured password secrets"
    );
    assert(
      errorMessage.includes("SEED_DEPT_PASSWORD") && errorMessage.includes("SEED_ADMIN_PASSWORD"),
      "Error message safely lists only environment variable names"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 8: Successful run with all passwords configured
  // ---------------------------------------------------------------------------
  {
    const mockRepo = createMockRepository();
    const officerPass = "OfficerSecretPassphrase#2026";
    const deptPass = "DeptHeadSecretPassphrase#2026";
    const adminPass = "AdminSecretPassphrase#2026";

    const env: TestEnv = {
      SEED_OFFICER_PASSWORD: officerPass,
      SEED_DEPT_PASSWORD: deptPass,
      SEED_ADMIN_PASSWORD: adminPass
    };

    const result = await runSeed(mockRepo, env);

    assert(
      mockRepo.calls.setupDatabase === 1,
      "setupDatabase called exactly once during valid seeding"
    );
    assert(
      mockRepo.calls.createUser === 3 && result.created.length === 3,
      "All three staff accounts created when credentials are valid"
    );
    assert(
      mockRepo.calls.createAuditLog === 3,
      "Audit log entries created for each provisioned account"
    );

    // Verify passwords were properly hashed and match original passwords
    const officerUser = mockRepo.users.find(u => u.role === "OFFICER");
    const deptUser = mockRepo.users.find(u => u.role === "DEPT_HEAD");
    const adminUser = mockRepo.users.find(u => u.role === "ADMIN");

    assert(
      !!officerUser &&
        officerUser.password_hash !== officerPass &&
        officerUser.password_hash.startsWith("scrypt$") &&
        verifyPassword(officerPass, officerUser.password_hash),
      "Officer account stored with valid scrypt hash verifying against configured password"
    );

    assert(
      !!deptUser &&
        deptUser.password_hash !== deptPass &&
        deptUser.password_hash.startsWith("scrypt$") &&
        verifyPassword(deptPass, deptUser.password_hash),
      "Department Head account stored with valid scrypt hash verifying against configured password"
    );

    assert(
      !!adminUser &&
        adminUser.password_hash !== adminPass &&
        adminUser.password_hash.startsWith("scrypt$") &&
        verifyPassword(adminPass, adminUser.password_hash),
      "Admin account stored with valid scrypt hash verifying against configured password"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 9: Custom emails and default email fallbacks
  // ---------------------------------------------------------------------------
  {
    const mockRepo = createMockRepository();
    const env: TestEnv = {
      SEED_OFFICER_EMAIL: "custom-officer@agency.gov",
      SEED_OFFICER_PASSWORD: "OfficerSecret#1",
      SEED_DEPT_PASSWORD: "DeptSecret#2",
      SEED_ADMIN_PASSWORD: "AdminSecret#3"
    };

    await runSeed(mockRepo, env);

    const officerUser = mockRepo.users.find(u => u.role === "OFFICER");
    const deptUser = mockRepo.users.find(u => u.role === "DEPT_HEAD");
    const adminUser = mockRepo.users.find(u => u.role === "ADMIN");

    assert(
      officerUser?.email === "custom-officer@agency.gov",
      "Custom email configuration honored for development/deployment"
    );
    assert(
      deptUser?.email === "dept@civictrust.local" &&
        adminUser?.email === "admin@civictrust.local",
      "Default non-sensitive email fallbacks preserved when env email is omitted"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 10: Idempotent re-run safety (existing accounts are skipped)
  // ---------------------------------------------------------------------------
  {
    const preExistingAdmin: User = {
      id: "admin-existing-1",
      email: "admin@civictrust.local",
      name: "Existing Administrator",
      role: "ADMIN",
      password_hash: "existing-admin-hash"
    };

    const mockRepo = createMockRepository([preExistingAdmin]);
    const env: TestEnv = {
      SEED_OFFICER_PASSWORD: "OfficerSecret#1",
      SEED_DEPT_PASSWORD: "DeptSecret#2",
      SEED_ADMIN_PASSWORD: "AdminSecret#3"
    };

    const result = await runSeed(mockRepo, env);

    assert(
      result.skipped.includes("admin@civictrust.local") &&
        result.created.length === 2 &&
        mockRepo.calls.createUser === 2,
      "Re-run skips existing accounts without error or overwriting"
    );

    const admin = mockRepo.users.find(u => u.email === "admin@civictrust.local");
    assert(
      admin?.password_hash === "existing-admin-hash",
      "Existing account password hash remains completely unmodified"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 11: Standalone validateSeedAccounts unit verification
  // ---------------------------------------------------------------------------
  {
    let threw = false;
    try {
      validateSeedAccounts({
        SEED_OFFICER_PASSWORD: "p1",
        SEED_DEPT_PASSWORD: "p2"
        // Missing SEED_ADMIN_PASSWORD
      });
    } catch (err: any) {
      threw = err.message.includes("SEED_ADMIN_PASSWORD");
    }

    assert(
      threw,
      "validateSeedAccounts function can be used independently as a pure validation preflight"
    );
  }

  // ---------------------------------------------------------------------------
  // Scenario 12: Actual runSeed() execution path without explicit repository (missing credentials)
  // Proves getRepository() is never called when credentials are missing.
  // ---------------------------------------------------------------------------
  {
    const origNodeEnv = envMap.NODE_ENV;
    const origProvider = envMap.DATABASE_PROVIDER;
    const origDbUrl = envMap.DATABASE_URL;
    const origOfficerPass = envMap.SEED_OFFICER_PASSWORD;
    const origDeptPass = envMap.SEED_DEPT_PASSWORD;
    const origAdminPass = envMap.SEED_ADMIN_PASSWORD;

    try {
      // Configure an invalid database environment where getRepository() would throw immediately.
      setProcessEnv("NODE_ENV", "production");
      setProcessEnv("DATABASE_PROVIDER", undefined);
      setProcessEnv("DATABASE_URL", undefined);
      setProcessEnv("SEED_OFFICER_PASSWORD", undefined);
      setProcessEnv("SEED_DEPT_PASSWORD", undefined);
      setProcessEnv("SEED_ADMIN_PASSWORD", undefined);
      resetRepository();

      let runSeedError = "";
      try {
        // Calling runSeed() with NO repository argument
        await runSeed(undefined, process.env);
      } catch (err: any) {
        runSeedError = err.message || "";
      }

      assert(
        runSeedError.includes("Cannot seed accounts: missing or blank required password") &&
          !runSeedError.includes("DATABASE_PROVIDER"),
        "runSeed() default path validates credentials before getRepository() is called (never touches DB)"
      );
    } finally {
      setProcessEnv("NODE_ENV", origNodeEnv);
      setProcessEnv("DATABASE_PROVIDER", origProvider);
      setProcessEnv("DATABASE_URL", origDbUrl);
      setProcessEnv("SEED_OFFICER_PASSWORD", origOfficerPass);
      setProcessEnv("SEED_DEPT_PASSWORD", origDeptPass);
      setProcessEnv("SEED_ADMIN_PASSWORD", origAdminPass);
      resetRepository();
    }
  }

  // ---------------------------------------------------------------------------
  // Scenario 13: Actual runSeed() execution path with blank credentials
  // Proves blank credentials also abort before getRepository() is called.
  // ---------------------------------------------------------------------------
  {
    const origNodeEnv = envMap.NODE_ENV;
    const origProvider = envMap.DATABASE_PROVIDER;
    const origDbUrl = envMap.DATABASE_URL;
    const origOfficerPass = envMap.SEED_OFFICER_PASSWORD;
    const origDeptPass = envMap.SEED_DEPT_PASSWORD;
    const origAdminPass = envMap.SEED_ADMIN_PASSWORD;

    try {
      setProcessEnv("NODE_ENV", "production");
      setProcessEnv("DATABASE_PROVIDER", undefined);
      setProcessEnv("DATABASE_URL", undefined);
      setProcessEnv("SEED_OFFICER_PASSWORD", "   "); // blank
      setProcessEnv("SEED_DEPT_PASSWORD", "SomePassword#1");
      setProcessEnv("SEED_ADMIN_PASSWORD", "SomePassword#2");
      resetRepository();

      let runSeedError = "";
      try {
        await runSeed(undefined, process.env);
      } catch (err: any) {
        runSeedError = err.message || "";
      }

      assert(
        runSeedError.includes("Cannot seed accounts: missing or blank required password") &&
          !runSeedError.includes("DATABASE_PROVIDER"),
        "runSeed() default path with blank credentials fails fast before database initialization"
      );
    } finally {
      setProcessEnv("NODE_ENV", origNodeEnv);
      setProcessEnv("DATABASE_PROVIDER", origProvider);
      setProcessEnv("DATABASE_URL", origDbUrl);
      setProcessEnv("SEED_OFFICER_PASSWORD", origOfficerPass);
      setProcessEnv("SEED_DEPT_PASSWORD", origDeptPass);
      setProcessEnv("SEED_ADMIN_PASSWORD", origAdminPass);
      resetRepository();
    }
  }

  // ---------------------------------------------------------------------------
  // Scenario 14: Actual main() execution path
  // Proves main() terminates with credential validation error before any DB operation.
  // ---------------------------------------------------------------------------
  {
    const origNodeEnv = envMap.NODE_ENV;
    const origProvider = envMap.DATABASE_PROVIDER;
    const origDbUrl = envMap.DATABASE_URL;
    const origOfficerPass = envMap.SEED_OFFICER_PASSWORD;
    const origDeptPass = envMap.SEED_DEPT_PASSWORD;
    const origAdminPass = envMap.SEED_ADMIN_PASSWORD;

    try {
      setProcessEnv("NODE_ENV", "production");
      setProcessEnv("DATABASE_PROVIDER", undefined);
      setProcessEnv("DATABASE_URL", undefined);
      setProcessEnv("SEED_OFFICER_PASSWORD", undefined);
      setProcessEnv("SEED_DEPT_PASSWORD", undefined);
      setProcessEnv("SEED_ADMIN_PASSWORD", undefined);
      resetRepository();

      let mainError = "";
      try {
        await main();
      } catch (err: any) {
        mainError = err.message || "";
      }

      assert(
        mainError.includes("Cannot seed accounts: missing or blank required password") &&
          !mainError.includes("DATABASE_PROVIDER"),
        "main() execution path rejects missing credentials prior to database initialization"
      );
    } finally {
      setProcessEnv("NODE_ENV", origNodeEnv);
      setProcessEnv("DATABASE_PROVIDER", origProvider);
      setProcessEnv("DATABASE_URL", origDbUrl);
      setProcessEnv("SEED_OFFICER_PASSWORD", origOfficerPass);
      setProcessEnv("SEED_DEPT_PASSWORD", origDeptPass);
      setProcessEnv("SEED_ADMIN_PASSWORD", origAdminPass);
      resetRepository();
    }
  }
}

runTests()
  .then(() => {
    console.log("\n=== Test Suite Summary ===");
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${failedCount}`);

    if (failedCount > 0) {
      process.exit(1);
    } else {
      console.log("✅ All seed accounts security & fail-safe tests passed successfully.");
    }
  })
  .catch(err => {
    console.error("Test runner encountered unexpected error:", err);
    process.exit(1);
  });
