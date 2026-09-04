import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DB_PATH = path.join(process.cwd(), 'data', 'civictrust.db');
const BACKUP_PATH = path.join(process.cwd(), 'data', 'civictrust.db.backup');

console.log("--- Starting Persistence Test ---");

// Backup existing DB if it exists
if (fs.existsSync(DB_PATH)) {
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  fs.unlinkSync(DB_PATH);
  console.log("[Setup] Backed up existing DB.");
}

try {
  // Step 1: Initialize and create
  console.log("\n[Process 1] Initializing and creating complaint...");
  execSync('npx tsx scripts/persistence-step1.ts', { stdio: 'inherit' });

  // Step 2: Retrieve and update
  console.log("\n[Process 2] Retrieving exact complaint and updating to RESOLVED...");
  execSync('npx tsx scripts/persistence-step2.ts', { stdio: 'inherit' });

  // Step 3: Retrieve updated status
  console.log("\n[Process 3] Retrieving RESOLVED status...");
  execSync('npx tsx scripts/persistence-step3.ts', { stdio: 'inherit' });

  console.log("\n✅ Database Persistence Test Passed.");

} catch (error) {
  console.error("❌ Persistence Test Failed:", error);
} finally {
  // Cleanup test db
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    const wal = DB_PATH + '-wal';
    const shm = DB_PATH + '-shm';
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    if (fs.existsSync(shm)) fs.unlinkSync(shm);
  }
  // Restore backup
  if (fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(BACKUP_PATH, DB_PATH);
    fs.unlinkSync(BACKUP_PATH);
    console.log("[Cleanup] Restored original DB.");
  }
}
