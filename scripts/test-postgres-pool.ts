import { fork } from "child_process";
import { getPool, resetPool } from "../lib/repositories/postgres";
import { Pool } from "pg";

if (!process.env.__CIVICTRUST_ISOLATED_TEST_WORKER__) {
  // Parent process: spawn a dedicated child process to execute the regression tests.
  // This guarantees complete isolation without closing, replacing, or temporarily
  // removing any pre-existing global.__civictrust_pg_pool__ reference in the caller process.
  const child = fork(__filename, [], {
    env: {
      ...process.env,
      __CIVICTRUST_ISOLATED_TEST_WORKER__: "true",
    },
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  child.on("error", (err) => {
    console.error("Failed to spawn isolated test worker:", err);
    process.exit(1);
  });
} else {
  // Worker process: executes tests with a fresh, dedicated global state
  runWorkerTests().catch((err) => {
    console.error("Unhandled error in test runner:", err);
    process.exit(1);
  });
}

async function runWorkerTests() {
  console.log("=== CivicTrust PostgreSQL Connection Pool Lifecycle Regression Test Suite ===");

  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = env.NODE_ENV;
  const originalDbUrl = env.DATABASE_URL;
  const originalPoolMax = env.DB_POOL_MAX;

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
    // -------------------------------------------------------------------------
    // Scenario 1: Production — Repeated getPool() calls must return the same instance
    // -------------------------------------------------------------------------
    await resetPool();
    setEnv("NODE_ENV", "production");
    setEnv("DATABASE_URL", "postgresql://test_user:test_pass@localhost:5432/test_db");

    const prodPool1 = getPool();
    const prodPool2 = getPool();
    const prodPool3 = getPool();

    assert(prodPool1 instanceof Pool, "Scenario 1: getPool() returns a pg.Pool instance in production");
    assert(prodPool1 === prodPool2, "Scenario 1: Second getPool() returns the identical pool instance in production");
    assert(prodPool2 === prodPool3, "Scenario 1: Third getPool() returns the identical pool instance in production");
    assert(
      global.__civictrust_pg_pool__ === undefined,
      "Scenario 1: Production does not pollute global.__civictrust_pg_pool__"
    );

    // -------------------------------------------------------------------------
    // Scenario 2: Production — resetPool() resets the instance and allows fresh creation
    // -------------------------------------------------------------------------
    await resetPool();
    const prodPool4 = getPool();
    const prodPool5 = getPool();

    assert(prodPool4 !== prodPool1, "Scenario 2: getPool() after resetPool() creates a fresh pool instance");
    assert(prodPool4 === prodPool5, "Scenario 2: Fresh pool instance is reused on subsequent calls");

    await resetPool();

    // -------------------------------------------------------------------------
    // Scenario 3: Development — Repeated getPool() calls return the same instance
    // -------------------------------------------------------------------------
    await resetPool();
    setEnv("NODE_ENV", "development");
    setEnv("DATABASE_URL", "postgresql://test_user:test_pass@localhost:5432/test_db");

    const devPool1 = getPool();
    const devPool2 = getPool();

    assert(devPool1 instanceof Pool, "Scenario 3: getPool() returns a pg.Pool instance in development");
    assert(devPool1 === devPool2, "Scenario 3: Repeated getPool() calls return the identical pool instance in development");
    assert(
      global.__civictrust_pg_pool__ === devPool1,
      "Scenario 3: Development populates global.__civictrust_pg_pool__ for hot-reload support"
    );

    // -------------------------------------------------------------------------
    // Scenario 4: Development — Hot-reload simulation reuses the global instance
    // -------------------------------------------------------------------------
    // Simulate hot reload: re-evaluating the module in Next.js dev re-runs module scope
    delete require.cache[require.resolve("../lib/repositories/postgres")];
    const reloadedModule = require("../lib/repositories/postgres");

    const hotReloadPool = reloadedModule.getPool();
    assert(
      hotReloadPool === devPool1,
      "Scenario 4: Re-imported module reuses existing pool from global.__civictrust_pg_pool__"
    );

    await reloadedModule.resetPool();
    assert(
      global.__civictrust_pg_pool__ === undefined,
      "Scenario 4: resetPool() clears global.__civictrust_pg_pool__"
    );

    // -------------------------------------------------------------------------
    // Scenario 5: Idempotent resetPool() — never closes the same pool twice
    // -------------------------------------------------------------------------
    setEnv("NODE_ENV", "production");
    const poolToReset = getPool();
    assert(poolToReset instanceof Pool, "Scenario 5: Pool instantiated for double-reset test");

    let doubleResetError: string | null = null;
    try {
      await resetPool();
      // Consecutive reset call must not throw "Called end on pool more than once"
      await resetPool();
      await resetPool();
    } catch (err: any) {
      doubleResetError = err.message || String(err);
    }
    assert(
      doubleResetError === null,
      "Scenario 5: Calling resetPool() multiple times does not throw or close the same pool twice",
      doubleResetError || undefined
    );

    // -------------------------------------------------------------------------
    // Scenario 6: Pool configuration preservation — connection limits and timeouts
    // -------------------------------------------------------------------------
    await resetPool();
    setEnv("NODE_ENV", "production");
    setEnv("DB_POOL_MAX", "35");
    setEnv("DATABASE_URL", "postgresql://test_user:test_pass@localhost:5432/test_db");

    const configPool = getPool();
    assert(
      configPool.options.max === 35,
      "Scenario 6: Pool configuration honors DB_POOL_MAX environment variable"
    );
    assert(
      configPool.options.idleTimeoutMillis === 30000,
      "Scenario 6: Pool configuration preserves idleTimeoutMillis=30000"
    );
    assert(
      configPool.options.connectionTimeoutMillis === 5000,
      "Scenario 6: Pool configuration preserves connectionTimeoutMillis=5000"
    );

    await resetPool();

  } finally {
    // 1. Clean up test-created pool in worker process
    try {
      await resetPool();
    } catch (cleanupErr) {
      console.error("Error during test pool cleanup:", cleanupErr);
    }

    // 2. Restore worker environment
    setEnv("NODE_ENV", originalNodeEnv);
    setEnv("DATABASE_URL", originalDbUrl);
    setEnv("DB_POOL_MAX", originalPoolMax);
  }

  console.log("\n=== Test Suite Summary ===");
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log("✅ All PostgreSQL connection pool lifecycle regression tests passed successfully.");
  }
}
