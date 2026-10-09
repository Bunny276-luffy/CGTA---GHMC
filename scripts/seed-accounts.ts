/**
 * Provisions initial staff accounts for local development / first deployment.
 *
 * Officer, department-head, and admin accounts cannot be self-registered — they
 * must be provisioned. This script creates real accounts with properly hashed
 * passwords. Change the passwords via environment variables, or edit the users
 * afterwards. Safe to re-run: existing emails are left untouched.
 *
 * Usage: npm run db:seed
 */
import { getRepository } from "../lib/db";
import { hashPassword } from "../lib/crypto";

const ACCOUNTS = [
  { name: "Field Officer", email: (process.env.SEED_OFFICER_EMAIL || "officer@civictrust.local"), password: process.env.SEED_OFFICER_PASSWORD || "Officer@123", role: "OFFICER" },
  { name: "Department Head", email: (process.env.SEED_DEPT_EMAIL || "dept@civictrust.local"), password: process.env.SEED_DEPT_PASSWORD || "DeptHead@123", role: "DEPT_HEAD" },
  { name: "Administrator", email: (process.env.SEED_ADMIN_EMAIL || "admin@civictrust.local"), password: process.env.SEED_ADMIN_PASSWORD || "Admin@12345", role: "ADMIN" }
];

async function main() {
  const repo = getRepository();
  await repo.setupDatabase();

  for (const account of ACCOUNTS) {
    const existing = await repo.getUserByEmail(account.email.toLowerCase());
    if (existing) {
      console.log(`= ${account.role} ${account.email} already exists — skipped`);
      continue;
    }
    const user = await repo.createUser({
      name: account.name,
      email: account.email.toLowerCase(),
      role: account.role,
      password_hash: hashPassword(account.password)
    });
    await repo.createAuditLog({
      user_id: user.id,
      action: "PROVISION_ACCOUNT",
      details: `${account.role} account provisioned via seed script`
    });
    console.log(`+ ${account.role} ${account.email} created`);
  }
  console.log("\nStaff accounts ready. Change these passwords before any real use.");
}

main().catch(err => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
