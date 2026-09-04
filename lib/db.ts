import { DatabaseRepository } from './repositories/types';
import { SQLiteRepository } from './repositories/sqlite';
import { PostgresRepository } from './repositories/postgres';

let repositoryInstance: DatabaseRepository | null = null;

export function getRepository(): DatabaseRepository {
  if (repositoryInstance) return repositoryInstance;

  const provider = process.env.DATABASE_PROVIDER || 'sqlite';
  
  if (provider === 'postgres') {
    repositoryInstance = new PostgresRepository();
  } else {
    repositoryInstance = new SQLiteRepository();
  }

  return repositoryInstance;
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
