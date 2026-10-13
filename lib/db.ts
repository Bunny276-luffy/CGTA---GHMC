import { DatabaseRepository } from './repositories/types';
import { SQLiteRepository } from './repositories/sqlite';
import { PostgresRepository } from './repositories/postgres';

let repositoryInstance: DatabaseRepository | null = null;

export interface DatabaseConfig {
  provider: 'postgres' | 'sqlite';
  databaseUrl?: string;
}

/**
 * Validates database environment configuration according to the runtime environment.
 * - In production:
 *   1. DATABASE_PROVIDER must be explicitly 'postgres' (silent fallback or SQLite is rejected).
 *   2. DATABASE_URL must be provided, non-empty, and a valid postgresql:// or postgres:// URL.
 * - In non-production (development / test):
 *   1. If DATABASE_PROVIDER is unset or empty, defaults to 'sqlite' for local compatibility.
 *   2. If DATABASE_PROVIDER is 'postgres', DATABASE_URL must be valid.
 *   3. If DATABASE_PROVIDER is 'sqlite', SQLite repository is used.
 *   4. Unsupported providers are rejected.
 *
 * NOTE: Error messages never print raw credentials or DATABASE_URL contents to prevent secret exposure.
 */
export function validateDatabaseConfig(): DatabaseConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const rawProvider = process.env.DATABASE_PROVIDER;

  if (isProduction) {
    if (!rawProvider || !rawProvider.trim()) {
      throw new Error(
        "Production database configuration error: DATABASE_PROVIDER must be explicitly configured as 'postgres'. Missing provider is not permitted."
      );
    }

    const provider = rawProvider.trim();
    if (provider !== 'postgres') {
      throw new Error(
        "Production database configuration error: Production requires DATABASE_PROVIDER='postgres'. SQLite and non-postgres providers are forbidden in production."
      );
    }

    const dbUrl = process.env.DATABASE_URL?.trim();
    if (!dbUrl) {
      throw new Error(
        "Production database configuration error: DATABASE_URL must be explicitly configured when running in production."
      );
    }

    try {
      const parsed = new URL(dbUrl);
      if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
        throw new Error(
          "Production database configuration error: DATABASE_URL must use 'postgres:' or 'postgresql:' protocol."
        );
      }
      if (!parsed.hostname) {
        throw new Error(
          "Production database configuration error: DATABASE_URL must include a valid hostname."
        );
      }
    } catch (err: any) {
      if (err.message.startsWith("Production database configuration error:")) {
        throw err;
      }
      throw new Error(
        "Production database configuration error: DATABASE_URL is not a valid connection URL."
      );
    }

    return { provider: 'postgres', databaseUrl: dbUrl };
  }

  // Non-production (development, test)
  const provider = (rawProvider && rawProvider.trim()) ? rawProvider.trim() : 'sqlite';

  if (provider === 'postgres') {
    const dbUrl = process.env.DATABASE_URL?.trim();
    if (!dbUrl) {
      throw new Error(
        "Database configuration error: DATABASE_URL is required when DATABASE_PROVIDER is 'postgres'."
      );
    }
    try {
      const parsed = new URL(dbUrl);
      if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
        throw new Error(
          "Database configuration error: DATABASE_URL must use 'postgres:' or 'postgresql:' protocol."
        );
      }
      if (!parsed.hostname) {
        throw new Error(
          "Database configuration error: DATABASE_URL must include a valid hostname."
        );
      }
    } catch (err: any) {
      if (err.message.startsWith("Database configuration error:")) {
        throw err;
      }
      throw new Error(
        "Database configuration error: DATABASE_URL is not a valid connection URL."
      );
    }
    return { provider: 'postgres', databaseUrl: dbUrl };
  }

  if (provider === 'sqlite') {
    return { provider: 'sqlite' };
  }

  throw new Error(
    "Database configuration error: Unsupported DATABASE_PROVIDER. Supported providers are 'postgres' and 'sqlite'."
  );
}

export function getRepository(): DatabaseRepository {
  if (repositoryInstance) return repositoryInstance;

  const config = validateDatabaseConfig();

  if (config.provider === 'postgres') {
    repositoryInstance = new PostgresRepository();
  } else {
    repositoryInstance = new SQLiteRepository();
  }

  return repositoryInstance;
}

/**
 * Resets the cached repository singleton.
 * Exported for automated testing across multiple configuration states.
 */
export function resetRepository(): void {
  repositoryInstance = null;
}

// Keeping a mocked db.query and db.transaction for backward compatibility in scripts
// if necessary, but ideally everything should use getRepository().
export const db = {
  async query(text: string, params?: any[]): Promise<any> {
    throw new Error('db.query is deprecated. Use getRepository() instead.');
  },
  async transaction(callback: any): Promise<any> {
    throw new Error('db.transaction is deprecated. Use getRepository() instead.');
  }
};
