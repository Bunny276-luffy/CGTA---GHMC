"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LogOut,
  AlertTriangle,
  BarChart3,
  Sliders,
  List,
  Scale,
  Search,
  Check,
  Sun,
  Moon,
  Database,
  Cpu,
  Lock,
  Users,
  Settings,
  Terminal,
  Activity,
  Filter,
  ArrowUpDown,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from "lucide-react";

interface Complaint {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  status: "SUBMITTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "TPA_REVIEW" | "CLOSED";
  severity: "EMERGENCY" | "HIGH" | "STANDARD";
  address: string;
  beforePhotoUrl: string;
  resolutionPhotoUrl?: string;
  latitude: number;
  longitude: number;
  rejectionCount: number;
  createdAt: string;
  trustScore?: number;
  trustGrade?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "CITIZEN" | "OFFICER" | "DEPT_HEAD" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  createdAt?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "complaints" | "audit" | "users" | "config">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Policy & Engine Configuration
  const [geofenceLimit, setGeofenceLimit] = useState(100);
  const [duplicateRadius, setDuplicateRadius] = useState(50);
  const [enableDeepfakeCheck, setEnableDeepfakeCheck] = useState(true);
  const [configSaved, setConfigSaved] = useState(false);

  // Real Data State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [auditEvents, setAuditEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let parsed;
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        router.push("/login");
        return;
      }
      parsed = JSON.parse(userStr);
      if (!parsed || parsed.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      setCurrentUser(parsed);
    } catch (e) {
      router.push("/login");
      return;
    }

    // Fetch real complaints from API
    const loadAdminData = async () => {
      try {
        const res = await fetch(`/api/complaints/track?userId=${parsed.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setComplaints(data);
          }
        }
      } catch (err) {
        console.warn("Could not load complaints from database:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [router]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const handleStatusUpdate = (complaintId: string, newStatus: any) => {
    setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, status: newStatus } : c));
    if (selectedComplaint && selectedComplaint.id === complaintId) {
      setSelectedComplaint(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === "All" || c.category === categoryFilter;
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const totalComplaints = complaints.length;
  const resolvedCount = complaints.filter(c => c.status === "RESOLVED" || c.status === "CLOSED").length;
  const inProgressCount = complaints.filter(c => c.status === "IN_PROGRESS").length;
  const emergencyCount = complaints.filter(c => c.severity === "EMERGENCY").length;

  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center p-8 text-indigo-400 font-bold font-mono text-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          <span>Authenticating Administrator Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col md:flex-row ${
      theme === "dark" ? "bg-[#030308] text-slate-100" : "bg-[#f8fafc] text-slate-900"
    }`}>

      {/* Persistent Left Admin Navigation Sidebar */}
      <aside className={`w-full md:w-64 border-b md:border-b-0 md:border-r p-5 flex flex-col justify-between flex-shrink-0 z-20 ${
        theme === "dark" ? "bg-[#06060f]/95 backdrop-blur-md border-white/5" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div>
          {/* Brand & Badge */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="h-8 w-8 bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center rounded-lg shadow-md shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className={`text-sm font-black tracking-wider ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                MUNICIPAL<span className="text-cyan-400">ADMIN</span>
              </span>
              <p className="text-[9px] font-mono text-slate-400">GHMC Command & Telemetry</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1 text-left">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "overview"
                  ? theme === "dark" ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-900 border-indigo-200"
                  : "text-slate-400 hover:text-indigo-400 border-transparent"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Operations Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("complaints")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "complaints"
                  ? theme === "dark" ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-900 border-indigo-200"
                  : "text-slate-400 hover:text-indigo-400 border-transparent"
              }`}
            >
              <List className="h-4 w-4" />
              <div className="flex items-center justify-between w-full">
                <span>Grievance Ledger</span>
                {complaints.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-500/20 text-indigo-300 font-mono">
                    {complaints.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "audit"
                  ? theme === "dark" ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-900 border-indigo-200"
                  : "text-slate-400 hover:text-indigo-400 border-transparent"
              }`}
            >
              <Cpu className="h-4 w-4" />
              <span>13-Stage Audit Log</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "users"
                  ? theme === "dark" ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-900 border-indigo-200"
                  : "text-slate-400 hover:text-indigo-400 border-transparent"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Officer & User Roles</span>
            </button>

            <button
              onClick={() => setActiveTab("config")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "config"
                  ? theme === "dark" ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "bg-indigo-50 text-indigo-900 border-indigo-200"
                  : "text-slate-400 hover:text-indigo-400 border-transparent"
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>Policy & Thresholds</span>
            </button>
          </nav>
        </div>

        {/* Footer Account Actions */}
        <div className="pt-6 border-t border-slate-200 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-slate-400 truncate max-w-[140px] font-mono text-[11px]">{currentUser.email}</span>
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Command Workspace */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">

        {/* Top Operational Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-white/5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                Municipal Command & Telemetry Console
              </h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                SYSTEM ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time cryptographic validation, 13-stage AI evidence audit, and SLA resolution tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">
              Sector: <strong className="text-slate-200">GHMC Zone 4 (Central)</strong>
            </span>
          </div>
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-5 rounded-2xl border text-left space-y-2 ${
                theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">Total Lodged</span>
                <span className="text-2xl font-mono font-black text-indigo-400">{totalComplaints}</span>
                <p className="text-[10px] text-slate-500">Official citizen submissions</p>
              </div>

              <div className={`p-5 rounded-2xl border text-left space-y-2 ${
                theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">In Progress</span>
                <span className="text-2xl font-mono font-black text-amber-400">{inProgressCount}</span>
                <p className="text-[10px] text-slate-500">Under field officer remediation</p>
              </div>

              <div className={`p-5 rounded-2xl border text-left space-y-2 ${
                theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">Resolved & Closed</span>
                <span className="text-2xl font-mono font-black text-emerald-400">{resolvedCount}</span>
                <p className="text-[10px] text-slate-500">Verified by citizen confirmation</p>
              </div>

              <div className={`p-5 rounded-2xl border text-left space-y-2 ${
                theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">Emergency Priority</span>
                <span className="text-2xl font-mono font-black text-rose-400">{emergencyCount}</span>
                <p className="text-[10px] text-slate-500">Critical hazard response dispatched</p>
              </div>
            </div>

            {/* Recent Ledger Records Table Preview */}
            <div className={`rounded-2xl border overflow-hidden text-left ${
              theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">Live Grievance Feed</h3>
                <button
                  onClick={() => setActiveTab("complaints")}
                  className="text-xs text-indigo-400 hover:underline font-bold"
                >
                  View All Records →
                </button>
              </div>

              {complaints.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No grievances currently recorded in the database.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/30 text-slate-400 text-[10px] uppercase font-mono">
                      <tr>
                        <th className="p-3">Tracking ID</th>
                        <th className="p-3">Title</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {complaints.slice(0, 5).map((c) => (
                        <tr key={c.id} className="hover:bg-indigo-500/5 transition-colors">
                          <td className="p-3 font-mono text-indigo-400 font-bold">{c.trackingId}</td>
                          <td className="p-3 text-slate-200 font-semibold">{c.title}</td>
                          <td className="p-3 text-slate-400">{c.category}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              c.severity === "EMERGENCY" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {c.severity}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-white/5">
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB: COMPLAINTS LEDGER */}
        {activeTab === "complaints" && (
          <div className="space-y-4 text-left">

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by Tracking ID, keyword or landmark..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none focus:border-indigo-500 transition-all ${
                    theme === "dark" ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-indigo-500 ${
                    theme === "dark" ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <option value="All">All Categories</option>
                  <option value="Roads & Potholes">Roads & Potholes</option>
                  <option value="Drainage & Water Leakage">Drainage & Water Leakage</option>
                  <option value="Garbage & Waste">Garbage & Sanitation</option>
                </select>
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-indigo-500 ${
                    theme === "dark" ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <option value="All">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            {/* Complaints Data Table */}
            <div className={`rounded-2xl border overflow-hidden ${
              theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}>
              {filteredComplaints.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No grievances found matching the current criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black/30 text-slate-400 text-[10px] uppercase font-mono">
                      <tr>
                        <th className="p-3">Tracking ID</th>
                        <th className="p-3">Title & Location</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Severity</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredComplaints.map((c) => (
                        <tr key={c.id} className="hover:bg-indigo-500/5 transition-colors">
                          <td className="p-3 font-mono text-indigo-400 font-bold">{c.trackingId}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-200">{c.title}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">{c.address}</div>
                          </td>
                          <td className="p-3 text-slate-400">{c.category}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              c.severity === "EMERGENCY" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {c.severity}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300">
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedComplaint(c)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-bold text-[11px]"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Inspector Modal / Detail Drawer */}
            {selectedComplaint && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <div className={`w-full max-w-lg p-6 rounded-3xl border space-y-4 ${
                  theme === "dark" ? "bg-[#0a0a14] border-white/10 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                }`}>
                  <div className="flex items-center justify-between border-b pb-3 border-white/10">
                    <div>
                      <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase block">Grievance Audit</span>
                      <h3 className="text-base font-bold">{selectedComplaint.title}</h3>
                    </div>
                    <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <p className="text-slate-300">{selectedComplaint.description}</p>
                    <div className="grid grid-cols-2 gap-2 bg-black/30 p-3 rounded-xl font-mono text-[11px] text-slate-400">
                      <div>Tracking ID: <strong className="text-indigo-300">{selectedComplaint.trackingId}</strong></div>
                      <div>Status: <strong className="text-emerald-300">{selectedComplaint.status}</strong></div>
                      <div>Location: <strong className="text-slate-300">{selectedComplaint.address}</strong></div>
                      <div>Severity: <strong className="text-rose-300">{selectedComplaint.severity}</strong></div>
                    </div>

                    {selectedComplaint.beforePhotoUrl && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Uploaded Evidence Photo</span>
                        <img
                          src={selectedComplaint.beforePhotoUrl}
                          alt="Grievance Evidence"
                          className="max-h-44 rounded-xl object-contain bg-black/40 border border-white/5"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                    <button
                      onClick={() => handleStatusUpdate(selectedComplaint.id, "IN_PROGRESS")}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                    >
                      Assign to Field Officer
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedComplaint.id, "CLOSED")}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Mark Closed
                    </button>
                    <button
                      onClick={() => setSelectedComplaint(null)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB: POLICY CONFIGURATION */}
        {activeTab === "config" && (
          <div className={`p-6 rounded-2xl border text-left max-w-2xl space-y-6 ${
            theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
          }`}>
            <div>
              <h3 className="text-base font-bold text-slate-200 dark:text-white">Municipal Policy & Anti-Fraud Parameters</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tune forensic thresholds and geofencing limits across all GHMC sectors.</p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Geofence Proximity Tolerance (Meters)</label>
                <input
                  type="number"
                  value={geofenceLimit}
                  onChange={(e) => setGeofenceLimit(Number(e.target.value))}
                  className={`w-full px-3.5 py-2.5 rounded-xl border outline-none ${
                    theme === "dark" ? "bg-slate-900 border-white/10 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
                <p className="text-[10px] text-slate-500 mt-1">Maximum allowed drift between complaint coordinate and officer resolution geotag.</p>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Perceptual Hash Duplicate Similarity Threshold (%)</label>
                <input
                  type="number"
                  value={duplicateRadius}
                  onChange={(e) => setDuplicateRadius(Number(e.target.value))}
                  className={`w-full px-3.5 py-2.5 rounded-xl border outline-none ${
                    theme === "dark" ? "bg-slate-900 border-white/10 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
                <p className="text-[10px] text-slate-500 mt-1">Minimum similarity for flagging near-duplicate citizen evidence.</p>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-black/20">
                <input
                  type="checkbox"
                  id="deepfakeCheck"
                  checked={enableDeepfakeCheck}
                  onChange={(e) => setEnableDeepfakeCheck(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-0"
                />
                <label htmlFor="deepfakeCheck" className="text-xs font-bold text-slate-300 cursor-pointer">
                  Enable Error Level Analysis (ELA) and Recompression Anomaly Verification
                </label>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                {configSaved ? "✓ Parameters Saved" : "Save Policy Configuration"}
              </button>
            </form>
          </div>
        )}

        {/* TAB: AUDIT & USER MANAGEMENT */}
        {(activeTab === "audit" || activeTab === "users") && (
          <div className={`p-8 rounded-2xl border text-center space-y-2 ${
            theme === "dark" ? "bg-slate-950/30 border-white/5" : "bg-white border-slate-200"
          }`}>
            <Activity className="h-8 w-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">
              {activeTab === "audit" ? "13-Stage Audit Ledger Active" : "Municipal User Management"}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {activeTab === "audit"
                ? "Every citizen submission automatically records cryptographic SHA-256 signatures, ELA, and geofence tokens."
                : "Active user accounts and field officer permissions are managed by the GHMC Administration directory."}
            </p>
          </div>
        )}

      </main>

    </div>
  );
}
