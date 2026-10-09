import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  User,
  Complaint,
  Evidence,
  AIReport,
  AuditLog,
  AppNotification,
  CategoryStat,
  VerificationStats,
  DashboardStats,
  DatabaseRepository
} from './types';

// Singleton DB instance
let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'civictrust.db');
  db = new Database(dbPath);
  // Keep the default rollback journal: WAL strands recent commits in a -wal
  // side file that an ungraceful shutdown can lose, which silently reverted
  // this database once. Durability beats write concurrency at this scale.
  db.pragma('synchronous = FULL');
  return db;
}

export class SQLiteRepository implements DatabaseRepository {
  
  async getUserByEmail(email: string): Promise<User | null> {
    const stmt = getDb().prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as User | undefined;
    return user || null;
  }

  async getUserById(id: string): Promise<User | null> {
    const stmt = getDb().prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id) as User | undefined;
    return user || null;
  }

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const id = randomUUID();
    const stmt = getDb().prepare(
      'INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(id, user.name, user.email, user.role, user.password_hash);
    
    return { ...user, id } as User;
  }

  async createComplaint(
    complaint: Omit<Complaint, 'id' | 'created_at' | 'updated_at' | 'tracking_id'>,
    evidence?: Omit<Evidence, 'id' | 'complaint_id' | 'uploaded_at'>
  ): Promise<Complaint> {
    const db = getDb();

    const insertComplaint = db.prepare(`
      INSERT INTO complaints
        (id, tracking_id, title, description, category, latitude, longitude, address, severity, anonymous, before_photo_url, created_by_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEvidence = db.prepare(`
      INSERT INTO evidence
        (id, complaint_id, file_url, file_type, size_bytes, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const crypto = require('crypto') as typeof import('crypto');

    // Tracking IDs are random 4-char codes per the CGTA-YYYY-XXXX format.
    // With a UNIQUE constraint, random collisions become likely as the ledger
    // grows — retry with a fresh ID instead of failing the citizen's submission.
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const id = randomUUID();
      const tracking_id = `CGTA-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6)}`;

      const transaction = db.transaction(() => {
        insertComplaint.run(
          id,
          tracking_id,
          complaint.title,
          complaint.description,
          complaint.category,
          complaint.latitude,
          complaint.longitude,
          complaint.address,
          complaint.severity,
          complaint.anonymous ? 1 : 0,
          complaint.before_photo_url || null,
          complaint.created_by_id
        );

        if (evidence) {
          insertEvidence.run(
            randomUUID(),
            id,
            evidence.file_url,
            evidence.file_type,
            evidence.size_bytes,
            evidence.metadata ? JSON.stringify(evidence.metadata) : null
          );
        }
      });

      try {
        transaction();
        return { ...complaint, id, tracking_id } as Complaint;
      } catch (err: any) {
        lastError = err;
        // Retry only on a tracking-ID uniqueness collision; rethrow anything else.
        if (!String(err.message).includes('tracking_id')) throw err;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('Could not allocate a unique tracking ID after repeated attempts');
  }

  async getComplaintByTrackingId(trackingId: string): Promise<Complaint | null> {
    const stmt = getDb().prepare('SELECT * FROM complaints WHERE tracking_id = ?');
    const row = stmt.get(trackingId) as Complaint | undefined;
    return row || null;
  }

  async getComplaintById(complaintId: string): Promise<Complaint | null> {
    const stmt = getDb().prepare('SELECT * FROM complaints WHERE id = ?');
    const row = stmt.get(complaintId) as Complaint | undefined;
    return row || null;
  }

  async getComplaintsByUserId(userId: string): Promise<Complaint[]> {
    const stmt = getDb().prepare('SELECT * FROM complaints WHERE created_by_id = ? ORDER BY created_at DESC');
    return stmt.all(userId) as Complaint[];
  }

  async getAllComplaints(): Promise<Complaint[]> {
    const stmt = getDb().prepare('SELECT * FROM complaints ORDER BY created_at DESC');
    return stmt.all() as Complaint[];
  }

  async getComplaintsByOfficerId(officerId: string): Promise<Complaint[]> {
    const stmt = getDb().prepare('SELECT * FROM complaints WHERE assigned_officer_id = ? ORDER BY created_at DESC');
    return stmt.all(officerId) as Complaint[];
  }

  async updateComplaintStatus(
    complaintId: string,
    status: string,
    options?: {
      assignedOfficerId?: string | null;
      resolutionPhotoUrl?: string;
      rejectionCount?: number;
      citizenConfirmed?: boolean;
    }
  ): Promise<void> {
    const sets: string[] = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [status];

    if (options?.assignedOfficerId !== undefined) {
      sets.push('assigned_officer_id = ?');
      params.push(options.assignedOfficerId);
    }
    if (options?.resolutionPhotoUrl !== undefined) {
      sets.push('resolution_photo_url = ?');
      params.push(options.resolutionPhotoUrl);
    }
    if (options?.rejectionCount !== undefined) {
      sets.push('rejection_count = ?');
      params.push(options.rejectionCount);
    }
    if (options?.citizenConfirmed !== undefined) {
      sets.push('citizen_confirmed = ?');
      params.push(options.citizenConfirmed ? 1 : 0);
    }

    params.push(complaintId);
    getDb()
      .prepare(`UPDATE complaints SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
  }

  async listUsers(limit = 200): Promise<User[]> {
    const stmt = getDb().prepare(
      'SELECT id, email, name, role, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ?'
    );
    return stmt.all(limit) as User[];
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    getDb()
      .prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(passwordHash, userId);
  }

  async createAIReport(report: Omit<AIReport, 'id' | 'checked_at'>): Promise<AIReport> {
    const id = randomUUID();
    const stmt = getDb().prepare(`
      INSERT INTO ai_reports 
        (id, complaint_id, exif_data, duplicate_detected, duplicate_parent_id, forgery_score, trust_score, explainable_report, priority_predicted, image_sha256, image_phash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      report.complaint_id,
      report.exif_data ? JSON.stringify(report.exif_data) : null,
      report.duplicate_detected ? 1 : 0,
      report.duplicate_parent_id || null,
      report.forgery_score || 0.0,
      report.trust_score || 100.0,
      report.explainable_report || null,
      report.priority_predicted || 'STANDARD',
      report.image_sha256 || null,
      report.image_phash || null
    );

    return { ...report, id } as AIReport;
  }

  async getAIReportByComplaintId(complaintId: string): Promise<AIReport | null> {
    const stmt = getDb().prepare('SELECT * FROM ai_reports WHERE complaint_id = ?');
    const row = stmt.get(complaintId) as AIReport | undefined;
    return row || null;
  }

  async createComplaintEvidence(
    complaintId: string,
    evidence: { file_url: string; file_type: string; size_bytes: number; metadata?: string }
  ): Promise<void> {
    const id = randomUUID();
    getDb()
      .prepare(
        'INSERT INTO evidence (id, complaint_id, file_url, file_type, size_bytes, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(id, complaintId, evidence.file_url, evidence.file_type, evidence.size_bytes, evidence.metadata || null);
  }

  async getEvidenceByComplaintId(complaintId: string): Promise<Evidence | null> {
    const stmt = getDb().prepare('SELECT * FROM evidence WHERE complaint_id = ? LIMIT 1');
    const row = stmt.get(complaintId) as Evidence | undefined;
    return row || null;
  }

  async createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const id = randomUUID();
    const stmt = getDb().prepare(
      'INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(id, log.user_id || null, log.action, log.details, log.ip_address || null);
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const stmt = getDb().prepare(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(limit) as AuditLog[];
  }

  async createSystemError(error: Omit<import('./types').SystemErrorLog, 'id' | 'timestamp'>): Promise<void> {
    const id = randomUUID();
    try {
      getDb()
        .prepare(
          'INSERT INTO system_errors (id, area, endpoint, severity, status, message, details) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          id,
          error.area,
          error.endpoint || null,
          error.severity || 'ERROR',
          error.status || 'UNRESOLVED',
          error.message,
          error.details || null
        );
    } catch {
      // Ignore fallback log error if schema not initialized
    }
  }

  async getSystemErrors(limit = 100): Promise<import('./types').SystemErrorLog[]> {
    try {
      const stmt = getDb().prepare('SELECT * FROM system_errors ORDER BY timestamp DESC LIMIT ?');
      return stmt.all(limit) as import('./types').SystemErrorLog[];
    } catch {
      return [];
    }
  }

  async checkHealth(): Promise<{ ok: boolean; latencyMs: number; provider: string; error?: string }> {
    const start = Date.now();
    try {
      getDb().prepare('SELECT 1').get();
      return { ok: true, latencyMs: Date.now() - start, provider: 'sqlite' };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - start, provider: 'sqlite', error: err.message };
    }
  }


  async createNotification(userId: string, message: string): Promise<void> {
    const id = randomUUID();
    getDb()
      .prepare('INSERT INTO notifications (id, user_id, message, read) VALUES (?, ?, ?, 0)')
      .run(id, userId, message);
    // Prune: keep only the latest 50 per user so the table cannot grow unbounded.
    getDb()
      .prepare(
        'DELETE FROM notifications WHERE user_id = ? AND id NOT IN (SELECT id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50)'
      )
      .run(userId, userId);
  }

  async getNotificationsByUserId(userId: string, limit = 30): Promise<AppNotification[]> {
    const stmt = getDb().prepare(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    );
    return stmt.all(userId, limit) as AppNotification[];
  }

  async markNotificationsRead(userId: string): Promise<void> {
    getDb().prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
  }

  async getCategoryStats(): Promise<CategoryStat[]> {
    const stmt = getDb().prepare(
      'SELECT category, COUNT(*) as count FROM complaints GROUP BY category ORDER BY count DESC'
    );
    return stmt.all() as CategoryStat[];
  }

  async getVerificationStats(): Promise<VerificationStats> {
    const db = getDb();
    const row = db.prepare(`
      SELECT
        COUNT(*) as totalReports,
        COALESCE(AVG(trust_score), 0) as avgTrustScore,
        COALESCE(SUM(CASE WHEN trust_score >= 70 THEN 1 ELSE 0 END), 0) as highTrust,
        COALESCE(SUM(CASE WHEN trust_score < 70 THEN 1 ELSE 0 END), 0) as lowTrust,
        COALESCE(SUM(CASE WHEN duplicate_detected = 1 THEN 1 ELSE 0 END), 0) as duplicatesFlagged,
        COALESCE(SUM(CASE WHEN forgery_score >= 50 THEN 1 ELSE 0 END), 0) as manipulationFlagged
      FROM ai_reports
    `).get() as any;
    return {
      totalReports: row.totalReports || 0,
      avgTrustScore: Math.round((row.avgTrustScore || 0) * 10) / 10,
      highTrust: row.highTrust || 0,
      lowTrust: row.lowTrust || 0,
      duplicatesFlagged: row.duplicatesFlagged || 0,
      manipulationFlagged: row.manipulationFlagged || 0
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const db = getDb();
    const total = (db.prepare('SELECT COUNT(*) as count FROM complaints').get() as any).count;
    const resolved = (db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status IN ('RESOLVED', 'CLOSED')").get() as any).count;
    const inProgress = (db.prepare('SELECT COUNT(*) as count FROM complaints WHERE status = ?').get('IN_PROGRESS') as any).count;
    const submitted = (db.prepare('SELECT COUNT(*) as count FROM complaints WHERE status = ?').get('SUBMITTED') as any).count;
    const assigned = (db.prepare('SELECT COUNT(*) as count FROM complaints WHERE status = ?').get('ASSIGNED') as any).count;

    return { total, resolved, inProgress, submitted, assigned };
  }

  async setupDatabase(): Promise<void> {
    const db = getDb();
    const schemaPath = path.join(process.cwd(), 'data', 'schema.sqlite.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
    }
  }
}
