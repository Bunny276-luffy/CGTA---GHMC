import { Pool, PoolConfig } from "pg";
import {
  User,
  Complaint,
  Evidence,
  AIReport,
  AuditLog,
  DashboardStats,
  DatabaseRepository
} from './types';

declare global {
  // eslint-disable-next-line no-var
  var __civictrust_pg_pool__: Pool | undefined;
}

function getPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === "production";

  let ssl: any = false;
  if (
    process.env.DATABASE_SSL === "true" ||
    (isProduction && connectionString && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1"))
  ) {
    ssl = {
      rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === "true",
    };
  }

  return {
    connectionString: connectionString || (isProduction ? undefined : "postgresql://postgres:adminpassword@localhost:5432/civictrust"),
    ssl,
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

export function getPool(): Pool {
  if (global.__civictrust_pg_pool__) {
    return global.__civictrust_pg_pool__;
  }

  const config = getPoolConfig();
  const pool = new Pool(config);

  pool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client pool:", err.message);
  });

  if (process.env.NODE_ENV !== "production") {
    global.__civictrust_pg_pool__ = pool;
  }

  return pool;
}

export class PostgresRepository implements DatabaseRepository {
  async getUserByEmail(email: string): Promise<User | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows.length > 0 ? (res.rows[0] as User) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows.length > 0 ? (res.rows[0] as User) : null;
  }

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const pool = getPool();
    const res = await pool.query(
      'INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      [user.name, user.email, user.role, user.password_hash]
    );
    return res.rows[0] as User;
  }

  async createComplaint(
    complaint: Omit<Complaint, 'id' | 'created_at' | 'updated_at' | 'tracking_id'>,
    evidence?: Omit<Evidence, 'id' | 'complaint_id' | 'uploaded_at'>
  ): Promise<Complaint> {
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      const tracking_id = `CGTA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const compRes = await client.query(
        `INSERT INTO complaints 
          (tracking_id, title, description, category, latitude, longitude, address, severity, anonymous, before_photo_url, created_by_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
         RETURNING *`,
        [
          tracking_id,
          complaint.title,
          complaint.description,
          complaint.category,
          complaint.latitude,
          complaint.longitude,
          complaint.address,
          complaint.severity,
          complaint.anonymous || false,
          complaint.before_photo_url || null,
          complaint.created_by_id
        ]
      );
      
      const newComplaint = compRes.rows[0] as Complaint;

      if (evidence) {
        await client.query(
          `INSERT INTO evidence 
            (complaint_id, file_url, file_type, size_bytes, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            newComplaint.id,
            evidence.file_url,
            evidence.file_type,
            evidence.size_bytes,
            evidence.metadata ? JSON.stringify(evidence.metadata) : null
          ]
        );
      }

      await client.query("COMMIT");
      return newComplaint;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getComplaintByTrackingId(trackingId: string): Promise<Complaint | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM complaints WHERE tracking_id = $1', [trackingId]);
    return res.rows.length > 0 ? (res.rows[0] as Complaint) : null;
  }

  async getComplaintsByUserId(userId: string): Promise<Complaint[]> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM complaints WHERE created_by_id = $1 ORDER BY created_at DESC', [userId]);
    return res.rows as Complaint[];
  }

  async getAllComplaints(): Promise<Complaint[]> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM complaints ORDER BY created_at DESC');
    return res.rows as Complaint[];
  }

  async getComplaintsByOfficerId(officerId: string): Promise<Complaint[]> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM complaints WHERE assigned_officer_id = $1 ORDER BY created_at DESC', [officerId]);
    return res.rows as Complaint[];
  }

  async updateComplaintStatus(complaintId: string, status: string, assignedOfficerId?: string): Promise<void> {
    const pool = getPool();
    if (assignedOfficerId) {
      await pool.query('UPDATE complaints SET status = $1, assigned_officer_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [status, assignedOfficerId, complaintId]);
    } else {
      await pool.query('UPDATE complaints SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, complaintId]);
    }
  }

  async createAIReport(report: Omit<AIReport, 'id' | 'checked_at'>): Promise<AIReport> {
    const pool = getPool();
    const res = await pool.query(
      `INSERT INTO ai_reports 
        (complaint_id, exif_data, duplicate_detected, duplicate_parent_id, forgery_score, trust_score, explainable_report, priority_predicted, image_sha256, image_phash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        report.complaint_id,
        report.exif_data ? JSON.stringify(report.exif_data) : null,
        report.duplicate_detected || false,
        report.duplicate_parent_id || null,
        report.forgery_score || 0.0,
        report.trust_score || 100.0,
        report.explainable_report || null,
        report.priority_predicted || 'STANDARD',
        report.image_sha256 || null,
        report.image_phash || null
      ]
    );
    return res.rows[0] as AIReport;
  }

  async getAIReportByComplaintId(complaintId: string): Promise<AIReport | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM ai_reports WHERE complaint_id = $1', [complaintId]);
    return res.rows.length > 0 ? (res.rows[0] as AIReport) : null;
  }

  async getEvidenceByComplaintId(complaintId: string): Promise<Evidence | null> {
    const pool = getPool();
    const res = await pool.query('SELECT * FROM evidence WHERE complaint_id = $1 LIMIT 1', [complaintId]);
    return res.rows.length > 0 ? (res.rows[0] as Evidence) : null;
  }

  async createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const pool = getPool();
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)',
      [log.user_id || null, log.action, log.details, log.ip_address || null]
    );
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const pool = getPool();
    const totalRes = await pool.query('SELECT COUNT(*) FROM complaints');
    const resolvedRes = await pool.query("SELECT COUNT(*) FROM complaints WHERE status = 'RESOLVED'");
    const inProgressRes = await pool.query("SELECT COUNT(*) FROM complaints WHERE status = 'IN_PROGRESS'");
    const submittedRes = await pool.query("SELECT COUNT(*) FROM complaints WHERE status = 'SUBMITTED'");
    const assignedRes = await pool.query("SELECT COUNT(*) FROM complaints WHERE status = 'ASSIGNED'");

    return {
      total: parseInt(totalRes.rows[0].count, 10),
      resolved: parseInt(resolvedRes.rows[0].count, 10),
      inProgress: parseInt(inProgressRes.rows[0].count, 10),
      submitted: parseInt(submittedRes.rows[0].count, 10),
      assigned: parseInt(assignedRes.rows[0].count, 10),
    };
  }

  async setupDatabase(): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(process.cwd(), "schema.sql");
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    const sqlContent = fs.readFileSync(schemaPath, "utf8");
    const pool = getPool();
    await pool.query(sqlContent);
  }
}
