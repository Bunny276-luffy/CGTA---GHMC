export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  password_hash: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface Complaint {
  id: string;
  tracking_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  severity: string;
  anonymous: boolean | number;
  before_photo_url?: string;
  resolution_photo_url?: string;
  rejection_count?: number;
  citizen_confirmed?: boolean | number;
  closed_by_tpa?: boolean | number;
  created_at?: Date | string;
  updated_at?: Date | string;
  created_by_id: string;
  assigned_officer_id?: string;
}

export interface Evidence {
  id: string;
  complaint_id: string;
  file_url: string;
  file_type: string;
  size_bytes: number;
  metadata?: any;
  uploaded_at?: Date | string;
}

export interface AIReport {
  id: string;
  complaint_id: string;
  exif_data?: any;
  duplicate_detected?: boolean | number;
  duplicate_parent_id?: string | null;
  forgery_score?: number;
  trust_score?: number;
  explainable_report?: string | null;
  priority_predicted?: string;
  image_sha256?: string | null;
  image_phash?: string | null;
  checked_at?: Date | string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  details: string;
  ip_address?: string;
  timestamp?: Date | string;
}

export interface DashboardStats {
  total: number;
  resolved: number;
  inProgress: number;
  submitted: number;
  assigned: number;
}

export interface DatabaseRepository {
  // Users
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  
  // Complaints
  createComplaint(complaint: Omit<Complaint, 'id' | 'created_at' | 'updated_at' | 'tracking_id'>, evidence?: Omit<Evidence, 'id' | 'complaint_id' | 'uploaded_at'>): Promise<Complaint>;
  getComplaintByTrackingId(trackingId: string): Promise<Complaint | null>;
  getComplaintsByUserId(userId: string): Promise<Complaint[]>;
  getAllComplaints(): Promise<Complaint[]>;
  getComplaintsByOfficerId(officerId: string): Promise<Complaint[]>;
  updateComplaintStatus(complaintId: string, status: string, assignedOfficerId?: string): Promise<void>;
  
  // AI Reports
  createAIReport(report: Omit<AIReport, 'id' | 'checked_at'>): Promise<AIReport>;
  getAIReportByComplaintId(complaintId: string): Promise<AIReport | null>;
  getEvidenceByComplaintId(complaintId: string): Promise<Evidence | null>;

  // Audit
  createAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;

  // Analytics
  getDashboardStats(): Promise<DashboardStats>;

  // Setup
  setupDatabase(): Promise<void>;
}
