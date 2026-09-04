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
  db.pragma('journal_mode = WAL');
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
    const id = randomUUID();
    const tracking_id = `CGTA-${new Date().getFullYear()}-${require('crypto').randomBytes(2).toString('hex').toUpperCase()}`;
    
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

    transaction();
    
    return { ...complaint, id, tracking_id } as Complaint;
  }

  async getComplaintByTrackingId(trackingId: string): Promise<Complaint | null> {
    const stmt = getDb().prepare('SELECT * FROM complaints WHERE tracking_id = ?');
    const row = stmt.get(trackingId) as Complaint | undefined;
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

  async updateComplaintStatus(complaintId: string, status: string, assignedOfficerId?: string): Promise<void> {
    if (assignedOfficerId) {
      const stmt = getDb().prepare('UPDATE complaints SET status = ?, assigned_officer_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(status, assignedOfficerId, complaintId);
    } else {
      const stmt = getDb().prepare('UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(status, complaintId);
    }
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

  async getDashboardStats(): Promise<DashboardStats> {
    const db = getDb();
    const total = (db.prepare('SELECT COUNT(*) as count FROM complaints').get() as any).count;
    const resolved = (db.prepare('SELECT COUNT(*) as count FROM complaints WHERE status = ?').get('RESOLVED') as any).count;
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
