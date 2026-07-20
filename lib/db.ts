import { Pool, QueryResult } from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:adminpassword@localhost:5432/civictrust";

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20, // Max clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = {
  /**
   * Run a standard SQL query with parameters.
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== "production") {
        console.log("SQL QUERY EXEC:", { text, duration: `${duration}ms`, rows: res.rowCount });
      }
      return res;
    } catch (err: any) {
      console.error("SQL QUERY ERROR:", { text, error: err.message });
      throw err;
    }
  },

  /**
   * Helper to perform database transactions.
   */
  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
};
