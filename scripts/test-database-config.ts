import { getRepository, resetRepository, validateDatabaseConfig } from "../lib/db";
import { PostgresRepository } from "../lib/repositories/postgres";
import { SQLiteRepository } from "../lib/repositories/sqlite";

console.log("=== CivicTrust Database Configuration Security & Fail-Safe Test Suite ===");

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;
const originalProvider = env.DATABASE_PROVIDER;
const originalDbUrl = env.DATABASE_URL;

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete env[key];
  } else {
    env[key] = value;
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

try {
  // ---------------------------------------------------------------------------
  // Scenario 1: Production with missing DATABASE_PROVIDER
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_PROVIDER", undefined);
  setEnv("DATABASE_URL", undefined);
  resetRepository();

  let scenario1Failed = false;
  try {
    getRepository();
  } catch (err: any) {
    scenario1Failed = err.message.includes("DATABASE_PROVIDER must be explicitly configured as 'postgres'");
  }
  assert(scenario1Failed, "Production with missing DATABASE_PROVIDER fails fast");

  // ---------------------------------------------------------------------------
  // Scenario 2: Production with DATABASE_PROVIDER='sqlite' (no silent fallback)
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_PROVIDER", "sqlite");
  setEnv("DATABASE_URL", undefined);
  resetRepository();

  let scenario2Failed = false;
  try {
    getRepository();
  } catch (err: any) {
    scenario2Failed = err.message.includes("SQLite and non-postgres providers are forbidden in production");
  }
  assert(scenario2Failed, "Production never silently falls back to SQLite");

  // ---------------------------------------------------------------------------
  // Scenario 3: Production with DATABASE_PROVIDER='postgres' but missing DATABASE_URL
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_PROVIDER", "postgres");
  setEnv("DATABASE_URL", undefined);
  resetRepository();

  let scenario3Failed = false;
  try {
    getRepository();
  } catch (err: any) {
    scenario3Failed = err.message.includes("DATABASE_URL must be explicitly configured when running in production");
  }
  assert(scenario3Failed, "Production with missing DATABASE_URL fails fast");

  // ---------------------------------------------------------------------------
  // Scenario 4: Production with DATABASE_PROVIDER='postgres' and empty/whitespace DATABASE_URL
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_PROVIDER", "postgres");
  setEnv("DATABASE_URL", "   ");
  resetRepository();

  let scenario4Failed = false;
  try {
    getRepository();
  } catch (err: any) {
    scenario4Failed = err.message.includes("DATABASE_URL must be explicitly configured when running in production");
  }
  assert(scenario4Failed, "Production with whitespace DATABASE_URL fails fast");

  // ---------------------------------------------------------------------------
  // Scenario 5: Production with invalid URL format
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_PROVIDER", "postgres");
  setEnv("DATABASE_URL", "not-a-valid-url-format");
  resetRepository();

  let scenario5Failed = false;
  try {
    getRepository();
  } catch (err: any) {
    scenario5Failed = err.message.includes("DATABASE_URL is not a valid connection URL");
  }
  assert(scenario5Failed, "Production with malformed DATABASE_URL fails fast");

  // ---------------------------------------------------------------------------
  // Scenario 6: Production with non-postgres protocol
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_PROVIDER", "postgres");
  setEnv("DATABASE_URL", "mysql://safe_user:safe_pass@localhost:3306/civictrust");
  resetRepository();

  let scenario6Failed = false;
  try {
    getRepository();
  } catch (err: any) {
    scenario6Failed = err.message.includes("DATABASE_URL must use 'postgres:' or 'postgresql:' protocol");
  }
  assert(scenario6Failed, "Production with non-postgres protocol fails fast");

  // ---------------------------------------------------------------------------
  // Scenario 7: Production with missing hostname
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_PROVIDER", "postgres");
  setEnv("DATABASE_URL", "postgresql:///civictrust");
  resetRepository();

  let scenario7Failed = false;
  try {
    getRepository();
  } catch (err: any) {
    scenario7Failed = err.message.includes("DATABASE_URL must include a valid hostname");
  }
  assert(scenario7Failed, "Production with URL missing hostname fails fast");

  // ---------------------------------------------------------------------------
  // Scenario 8: Valid production configuration with safe dummy credentials
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_PROVIDER", "postgres");
  setEnv("DATABASE_URL", "postgresql://dummy_user:dummy_password@localhost:5432/civictrust_prod");
  resetRepository();

  let scenario8Success = false;
  try {
    const config = validateDatabaseConfig();
    const repo = getRepository();
    scenario8Success = config.provider === "postgres" && repo instanceof PostgresRepository;
  } catch (err) {
    scenario8Success = false;
  }
  assert(scenario8Success, "Valid production PostgreSQL configuration instantiates PostgresRepository");

  // ---------------------------------------------------------------------------
  // Scenario 9: Local development — omitted DATABASE_PROVIDER defaults to SQLite
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "development");
  setEnv("DATABASE_PROVIDER", undefined);
  setEnv("DATABASE_URL", undefined);
  resetRepository();

  let scenario9Success = false;
  try {
    const config = validateDatabaseConfig();
    const repo = getRepository();
    scenario9Success = config.provider === "sqlite" && repo instanceof SQLiteRepository;
  } catch (err) {
    scenario9Success = false;
  }
  assert(scenario9Success, "Development with omitted DATABASE_PROVIDER defaults safely to SQLite");

  // ---------------------------------------------------------------------------
  // Scenario 10: Local development — explicit DATABASE_PROVIDER='sqlite'
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "development");
  setEnv("DATABASE_PROVIDER", "sqlite");
  setEnv("DATABASE_URL", undefined);
  resetRepository();

  let scenario10Success = false;
  try {
    const config = validateDatabaseConfig();
    const repo = getRepository();
    scenario10Success = config.provider === "sqlite" && repo instanceof SQLiteRepository;
  } catch (err) {
    scenario10Success = false;
  }
  assert(scenario10Success, "Development with explicit DATABASE_PROVIDER='sqlite' uses SQLite");

  // ---------------------------------------------------------------------------
  // Scenario 11: Local development — DATABASE_PROVIDER='postgres' with valid URL
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "development");
  setEnv("DATABASE_PROVIDER", "postgres");
  setEnv("DATABASE_URL", "postgres://dummy_dev:dummy_dev@localhost:5432/civictrust_dev");
  resetRepository();

  let scenario11Success = false;
  try {
    const config = validateDatabaseConfig();
    const repo = getRepository();
    scenario11Success = config.provider === "postgres" && repo instanceof PostgresRepository;
  } catch (err) {
    scenario11Success = false;
  }
  assert(scenario11Success, "Development with DATABASE_PROVIDER='postgres' and valid URL uses Postgres");

  // ---------------------------------------------------------------------------
  // Scenario 12: Local development — DATABASE_PROVIDER='postgres' with missing URL fails
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "development");
  setEnv("DATABASE_PROVIDER", "postgres");
  setEnv("DATABASE_URL", undefined);
  resetRepository();

  let scenario12Failed = false;
  try {
    getRepository();
  } catch (err: any) {
    scenario12Failed = err.message.includes("DATABASE_URL is required when DATABASE_PROVIDER is 'postgres'");
  }
  assert(scenario12Failed, "Development with DATABASE_PROVIDER='postgres' but missing URL fails fast");

  // ---------------------------------------------------------------------------
  // Scenario 13: Local development — unsupported DATABASE_PROVIDER
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "development");
  setEnv("DATABASE_PROVIDER", "unsupported_nosql");
  setEnv("DATABASE_URL", undefined);
  resetRepository();

  let scenario13Failed = false;
  try {
    getRepository();
  } catch (err: any) {
    scenario13Failed =
      err.message.includes("Unsupported DATABASE_PROVIDER. Supported providers are 'postgres' and 'sqlite'") &&
      !err.message.includes("unsupported_nosql");
  }
  assert(scenario13Failed, "Development with unsupported provider rejects with clear non-interpolated error");

  // ---------------------------------------------------------------------------
  // Scenario 14: Security check — error messages must NEVER leak credentials
  // ---------------------------------------------------------------------------
  setEnv("NODE_ENV", "production");
  setEnv("DATABASE_PROVIDER", "postgres");
  const dummySecretToken = "SUPER_SECRET_TOKEN_DO_NOT_LEAK";
  setEnv("DATABASE_URL", `http://dummy_user:${dummySecretToken}@invalid-db-host.com/db`);
  resetRepository();

  let scenario14Secure = false;
  try {
    getRepository();
  } catch (err: any) {
    const message = err.message || "";
    const leakedSecret = message.includes(dummySecretToken);
    scenario14Secure = !leakedSecret && message.includes("DATABASE_URL must use 'postgres:' or 'postgresql:' protocol");
  }
  assert(scenario14Secure, "Error messages never leak secrets or credentials contained in DATABASE_URL");

} finally {
  // Restore original environment
  setEnv("NODE_ENV", originalNodeEnv);
  setEnv("DATABASE_PROVIDER", originalProvider);
  setEnv("DATABASE_URL", originalDbUrl);

  resetRepository();
}

console.log("\n=== Test Suite Summary ===");
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${failedCount}`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("✅ All database configuration fail-safe tests passed successfully.");
}
