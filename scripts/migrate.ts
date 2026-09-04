import { getRepository } from "../lib/db";
import fs from "fs";
import path from "path";

async function runMigrations() {
  console.log("Running CivicTrust Database Setup...");
  try {
    const repo = getRepository();
    await repo.setupDatabase();
    console.log("✅ CivicTrust database setup completed successfully!");
  } catch (err: any) {
    console.error("❌ Database setup failed:", err.message);
    process.exitCode = 1;
  }
}

runMigrations();
