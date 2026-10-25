import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { getRepository, validateDatabaseConfig } from "../lib/db";
import { resetPool } from "../lib/repositories/postgres";

async function runMigrations() {
  console.log("=== CivicTrust Explicit Database Schema Setup ===");
  try {
    const config = validateDatabaseConfig();
    console.log(`[Config] Target database provider: ${config.provider}`);

    const repo = getRepository();
    await repo.setupDatabase();
    console.log(`✅ CivicTrust database schema setup completed successfully for '${config.provider}'!`);
  } catch (err: any) {
    console.error("❌ Database setup failed:", err.message);
    process.exitCode = 1;
  } finally {
    try {
      await resetPool();
    } catch {
      // Ignore pool reset cleanup error on shutdown
    }
    process.exit(process.exitCode ?? 0);
  }
}

runMigrations();
