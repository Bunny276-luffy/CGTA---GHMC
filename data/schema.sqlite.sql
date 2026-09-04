-- CivicTrust Database Schema (SQLite)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'CITIZEN' CHECK(role IN ('CITIZEN', 'OFFICER', 'ADMIN', 'DEPT_HEAD')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Complaints/Grievances Table
CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    tracking_id TEXT UNIQUE NOT NULL, -- Format: CGTA-YYYY-XXXX
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'SUBMITTED' CHECK(status IN ('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'TPA_REVIEW', 'CLOSED')),
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT NOT NULL,
    severity TEXT DEFAULT 'STANDARD' CHECK(severity IN ('EMERGENCY', 'HIGH', 'STANDARD', 'LOW')),
    anonymous INTEGER DEFAULT 0,
    before_photo_url TEXT,
    resolution_photo_url TEXT,
    rejection_count INTEGER DEFAULT 0,
    citizen_confirmed INTEGER DEFAULT 0,
    closed_by_tpa INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_officer_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- Evidence Table (Attachments)
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    metadata TEXT, -- JSON string
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Reports Table (13-Stage Verification Output)
CREATE TABLE IF NOT EXISTS ai_reports (
    id TEXT PRIMARY KEY,
    complaint_id TEXT UNIQUE NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    exif_data TEXT, -- JSON string
    duplicate_detected INTEGER DEFAULT 0,
    duplicate_parent_id TEXT,
    forgery_score REAL DEFAULT 0.0,
    trust_score REAL DEFAULT 100.0,
    explainable_report TEXT,
    priority_predicted TEXT DEFAULT 'STANDARD',
    image_sha256 TEXT,
    image_phash TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table (Immutable Public Audit Ledger)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    ip_address TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices for faster query lookups
CREATE INDEX IF NOT EXISTS idx_complaints_tracking_id ON complaints(tracking_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_created_by_id ON complaints(created_by_id);
CREATE INDEX IF NOT EXISTS idx_evidence_complaint_id ON evidence(complaint_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_reports_image_sha256 ON ai_reports(image_sha256);
CREATE INDEX IF NOT EXISTS idx_ai_reports_image_phash ON ai_reports(image_phash);
