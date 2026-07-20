-- CivicTrust Database Schema (PostgreSQL)

-- Create custom enum types
CREATE TYPE user_role AS ENUM ('CITIZEN', 'OFFICER', 'ADMIN');
CREATE TYPE ticket_status AS ENUM ('SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'TPA_REVIEW', 'CLOSED');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'CITIZEN'::user_role,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Complaints/Grievances Table
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id VARCHAR(50) UNIQUE NOT NULL, -- Format: CGTA-YYYY-XXXX
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    status ticket_status DEFAULT 'SUBMITTED'::ticket_status,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'STANDARD', -- EMERGENCY, HIGH, STANDARD, LOW
    anonymous BOOLEAN DEFAULT FALSE,
    before_photo_url TEXT,
    resolution_photo_url TEXT,
    rejection_count INT DEFAULT 0,
    citizen_confirmed BOOLEAN DEFAULT FALSE,
    closed_by_tpa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_officer_id UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Evidence Table (Attachments)
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    size_bytes INT NOT NULL,
    metadata JSONB, -- For saving raw EXIF tags
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Reports Table
CREATE TABLE ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID UNIQUE NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    exif_data JSONB,
    duplicate_detected BOOLEAN DEFAULT FALSE,
    duplicate_parent_id VARCHAR(50),
    forgery_score DOUBLE PRECISION DEFAULT 0.0,
    trust_score DOUBLE PRECISION DEFAULT 100.0,
    explainable_report TEXT,
    priority_predicted VARCHAR(50) DEFAULT 'STANDARD',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for faster searches
CREATE INDEX idx_complaints_tracking_id ON complaints(tracking_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);
CREATE INDEX idx_evidence_complaint_id ON evidence(complaint_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
