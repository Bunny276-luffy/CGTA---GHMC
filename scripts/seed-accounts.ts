/**
 * Provisions initial staff accounts for local development / first deployment.
 *
 * Officer, department-head, and admin accounts cannot be self-registered — they
 * must be provisioned. This script creates real accounts with properly hashed
 * passwords.
 *
 * SECURITY REQUIREMENT:
 * Passwords must be explicitly provided via environment variables:
 * - SEED_OFFICER_PASSWORD
 * - SEED_DEPT_PASSWORD
 * - SEED_ADMIN_PASSWORD
 *
 * Predictable fallback passwords are strictly prohibited. If any required
 * password is missing or blank, execution terminates immediately before
 * creating or modifying any database accounts.
 *
 * Safe to re-run: existing emails are left untouched.
 *
 * Usage:
 *   SEED_OFFICER_PASSWORD=... SEED_DEPT_PASSWORD=... SEED_ADMIN_PASSWORD=... npm run db:seed
 */
import path from "path";
import { getRepository } from "../lib/db";
import { hashPassword } from "../lib/crypto";
import type { DatabaseRepository } from "../lib/repositories/types";

export interface SeedAccountDefinition {
  name: string;
  defaultEmail: string;
  emailEnvVar: string;
  passwordEnvVar: string;
  role: "OFFICER" | "DEPT_HEAD" | "ADMIN";
}

export const SEED_ACCOUNT_DEFINITIONS: readonly SeedAccountDefinition[] = [
  {
    name: "Field Officer",
    defaultEmail: "officer@civictrust.local",
    emailEnvVar: "SEED_OFFICER_EMAIL",
    passwordEnvVar: "SEED_OFFICER_PASSWORD",
    role: "OFFICER"
  },
  {
    name: "Department Head",
    defaultEmail: "dept@civictrust.local",
    emailEnvVar: "SEED_DEPT_EMAIL",
    passwordEnvVar: "SEED_DEPT_PASSWORD",
    role: "DEPT_HEAD"
  },
  {
    name: "Administrator",
    defaultEmail: "admin@civictrust.local",
    emailEnvVar: "SEED_ADMIN_EMAIL",
    passwordEnvVar: "SEED_ADMIN_PASSWORD",
    role: "ADMIN"
  }
];

export interface ValidatedSeedAccount {
  name: string;
  email: string;
  password: string;
  role: "OFFICER" | "DEPT_HEAD" | "ADMIN";
  passwordEnvVar: string;
}

/**
 * Validates that all required staff seed credentials are configured and non-blank.
 * Throws a descriptive error listing missing environment variables without exposing secret values.
 * Fails fast before any database connection or account creation occurs.
 */
export function validateSeedAccounts(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  definitions: readonly SeedAccountDefinition[] = SEED_ACCOUNT_DEFINITIONS
): ValidatedSeedAccount[] {
  const missingVars: string[] = [];
  const validatedAccounts: ValidatedSeedAccount[] = [];

  for (const def of definitions) {
    const rawPassword = env[def.passwordEnvVar];
    if (typeof rawPassword !== "string" || rawPassword.trim().length === 0) {
      missingVars.push(def.passwordEnvVar);
      continue;
    }

    const rawEmail = env[def.emailEnvVar];
    const email =
      typeof rawEmail === "string" && rawEmail.trim().length > 0
        ? rawEmail.trim().toLowerCase()
        : def.defaultEmail.toLowerCase();

    validatedAccounts.push({
      name: def.name,
      email,
      password: rawPassword,
      role: def.role,
      passwordEnvVar: def.passwordEnvVar
    });
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Cannot seed accounts: missing or blank required password environment variable(s): ${missingVars.join(
        ", "
      )}. Privileged staff accounts must have explicit, secure passwords configured via environment variables.`
    );
  }

  return validatedAccounts;
}

/**
 * Seeds staff accounts into the provided repository using pre-validated credentials.
 */
export async function seedAccounts(
  repo: DatabaseRepository,
  accounts: ValidatedSeedAccount[]
): Promise<{ created: string[]; skipped: string[] }> {
  await repo.setupDatabase();
  const created: string[] = [];
  const skipped: string[] = [];

  for (const account of accounts) {
    const existing = await repo.getUserByEmail(account.email);
    if (existing) {
      console.log(`= ${account.role} ${account.email} already exists — skipped`);
      skipped.push(account.email);
      continue;
    }

    const user = await repo.createUser({
      name: account.name,
      email: account.email,
      role: account.role,
      password_hash: hashPassword(account.password)
    });

    await repo.createAuditLog({
      user_id: user.id,
      action: "PROVISION_ACCOUNT",
      details: `${account.role} account provisioned via seed script`
    });

    console.log(`+ ${account.role} ${account.email} created`);
    created.push(account.email);
  }

  console.log("\nStaff accounts ready.");
  return { created, skipped };
}

/**
 * Main coordinator function. Validates all credentials before touching the database.
 */
export async function runSeed(
  repo?: DatabaseRepository,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): Promise<{ created: string[]; skipped: string[] }> {
  const validatedAccounts = validateSeedAccounts(env);
  const targetRepo = repo ?? getRepository();
  return seedAccounts(targetRepo, validatedAccounts);
}

export async function main() {
  try {
    const { loadEnvConfig } = await import("@next/env");
    loadEnvConfig(process.cwd());
  } catch {
    // If @next/env cannot be loaded, continue with existing process.env
  }

  await runSeed();
}

const isDirectExecution =
  (typeof require !== "undefined" && require.main === module) ||
  (typeof process !== "undefined" &&
    process.argv[1] &&
    path.basename(process.argv[1]).replace(/\.[^.]+$/, "") === "seed-accounts");

if (isDirectExecution) {
  main().catch(err => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  });
}
