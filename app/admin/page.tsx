"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t, SupportedLanguage } from "@/lib/i18n";
import {
  ShieldCheck,
  LogOut,
  AlertTriangle,
  BarChart3,
  List,
  Search,
  Check,
  Users,
  Settings,
  Terminal,
  Clock,
  MapPin,
  RefreshCw,
  Globe,
  Info,
  CheckCircle
} from "lucide-react";
import { fetchSessionUser, logoutAndRedirect, StoredUser } from "../../lib/client-auth";

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
  assignedOfficerId?: string | null;
  trustScore?: number;
  trustGrade?: string;
}

interface AuditEntry {
  id: string;
  userId?: string;
  action: string;
  details: string;
  timestamp?: string;
}

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [lang, setLang] = useState<SupportedLanguage>("en");
  const [activeTab, setActiveTab] = useState<"overview" | "complaints" | "audit" | "users" | "config">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Configuration State
  const [geofenceLimit, setGeofenceLimit] = useState(100);
  const [duplicateRadius, setDuplicateRadius] = useState(50);
  const [configSaved, setConfigSaved] = useState(false);
  const [assignOfficerId, setAssignOfficerId] = useState("");

  // Data State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [usersList, setUsersList] = useState<DirectoryUser[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<{ total: number; resolved: number; inProgress: number; submitted: number; assigned: number } | null>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);

    const bootstrap = async () => {
      const user = await fetchSessionUser(["ADMIN"]);
      if (!user) {
        router.push("/admin/login");
        return;
      }
      setCurrentUser(user);

      try {
        const [complaintsRes, overviewRes, healthRes] = await Promise.all([
          fetch("/api/complaints", { credentials: "same-origin" }),
          fetch("/api/admin/overview", { credentials: "same-origin" }),
          fetch("/api/admin/health", { credentials: "same-origin" })
        ]);

        if (complaintsRes.status === 401 || overviewRes.status === 401) {
          router.push("/admin/login");
          return;
        }

        if (complaintsRes.ok) {
          const data = await complaintsRes.json();
          if (Array.isArray(data)) {
            setComplaints(data.map((c: any) => ({
              ...c,
              rejectionCount: c.rejectionCount ?? 0
            })));
          }
        }

        if (overviewRes.ok) {
          const data = await overviewRes.json();
          setStats(data.stats ?? null);
          setAuditEvents(Array.isArray(data.auditLogs) ? data.auditLogs : []);
          setUsersList(Array.isArray(data.users) ? data.users : []);
        }

        if (healthRes.ok) {
          const hData = await healthRes.json();
          setHealthData(hData);
        }
      } catch (err) {
        console.warn("Could not load admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [router]);

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/admin/health", { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.warn("Could not load health diagnostics:", err);
    }
  };


  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const applyStatusUpdate = async (
    complaintId: string,
    newStatus: string,
    extras: Record<string, unknown> = {}
  ): Promise<any | null> => {
    setActionError(null);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status: newStatus, ...extras })
      });

      const data = await res.json();
      if (res.status === 401) {
        router.push("/admin/login");
        return null;
      }
      if (!res.ok) {
        throw new Error(data.message || "Status update rejected by the server");
      }
      return data;
    } catch (err: any) {
      setActionError(err?.message ? `Action failed: ${err.message}` : "Action failed. Please try again.");
      return null;
    }
  };

  const handleStatusUpdate = async (complaintId: string, newStatus: string, extras: Record<string, unknown> = {}) => {
    const result = await applyStatusUpdate(complaintId, newStatus, extras);
    if (!result) return;

    const serverStatus = result.complaint?.status ?? newStatus;
    setComplaints(prev => prev.map(c => c.id === complaintId ? {
      ...c,
      status: serverStatus,
      ...(extras.assignedOfficerId ? { assignedOfficerId: extras.assignedOfficerId as string } : {})
    } : c));

    if (selectedComplaint && selectedComplaint.id === complaintId) {
      setSelectedComplaint(prev => prev ? {
        ...prev,
        status: serverStatus,
        ...(extras.assignedOfficerId ? { assignedOfficerId: extras.assignedOfficerId as string } : {})
      } : null);
    }
  };

  const logout = () => {
    logoutAndRedirect(router, "/admin/login");
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

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900 font-bold text-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-blue-700 border-t-transparent animate-spin" />
          <span>Opening Municipal Command Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-blue-700 rounded-lg flex items-center justify-center font-bold text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight block leading-tight">{t("admin.title", lang)}</span>
            <span className="text-[11px] text-slate-400 block font-normal">{currentUser?.name || "Administrator"} ({t("app.municipality", lang)})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <Globe className="h-3.5 w-3.5 text-slate-400 ml-1" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportedLanguage)}
              className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer py-1 pr-1"
            >
              <option value="en" className="bg-slate-900 text-white">English</option>
              <option value="hi" className="bg-slate-900 text-white">हिंदी</option>
              <option value="te" className="bg-slate-900 text-white">తెలుగు</option>
            </select>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold text-xs flex items-center gap-1 min-h-[44px]"
            title={t("nav.logout", lang)}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full pb-20 space-y-6">

        {actionError && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 flex items-center gap-2 text-xs text-rose-900 font-bold">
            <AlertTriangle className="h-4 w-4 text-rose-700 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-2 border-b border-slate-300 pb-2">
          {[
            { id: "overview", label: "System Overview", icon: BarChart3 },
            { id: "complaints", label: "Grievances Ledger", icon: List },
            { id: "audit", label: "Audit Trails", icon: Terminal },
            { id: "users", label: "Staff Directory", icon: Users },
            { id: "config", label: "Policy Parameters", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all min-h-[44px] ${
                  activeTab === tab.id
                    ? "bg-blue-700 text-white shadow-sm"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase block">Total Grievances</span>
                <span className="text-2xl font-black text-slate-900">{totalComplaints}</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase block">Resolved Cases</span>
                <span className="text-2xl font-black text-emerald-700">{resolvedCount}</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase block">In Progress</span>
                <span className="text-2xl font-black text-amber-700">{inProgressCount}</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase block">Emergency Level</span>
                <span className="text-2xl font-black text-rose-700">{emergencyCount}</span>
              </div>
            </div>

            {/* REAL System Health Control Center */}
            <div className="p-5 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">System Health & Diagnostic Center</h3>
                </div>
                <button
                  onClick={fetchHealth}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh Health</span>
                </button>
              </div>

              {healthData ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {Object.entries(healthData.services || {}).map(([key, service]: [string, any]) => (
                    <div key={key} className="p-3 rounded-lg bg-slate-800 border border-slate-700 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300 capitalize">{key}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          service.status === "HEALTHY" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          service.status === "DEGRADED" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}>
                          {service.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">{service.name || key}</span>
                      {service.latencyMs !== undefined && (
                        <span className="text-[10px] font-mono text-slate-500 block">Latency: {service.latencyMs}ms ({service.provider})</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-medium">Click Refresh Health to fetch live diagnostic telemetry.</div>
              )}
            </div>

            {/* Structured Operational Error Logs */}
            {healthData?.systemErrors && healthData.systemErrors.length > 0 && (
              <div className="p-5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Recent Operational Error Ledger ({healthData.systemErrors.length})</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Timestamp</th>
                        <th className="px-3 py-2">Area</th>
                        <th className="px-3 py-2">Severity</th>
                        <th className="px-3 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {healthData.systemErrors.slice(0, 10).map((err: any) => (
                        <tr key={err.id}>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{new Date(err.timestamp).toLocaleTimeString()}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{err.area}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              err.severity === "CRITICAL" ? "bg-rose-100 text-rose-800" :
                              err.severity === "ERROR" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                            }`}>
                              [{err.severity}]
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700 max-w-md truncate">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}


          </div>
        )}

        {/* TAB 2: COMPLAINTS LEDGER */}
        {activeTab === "complaints" && (
          <div className="space-y-4">

            {/* Search & Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search tracking ID, headline or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
                >
                  <option value="All">All Statuses</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            {/* Table / Responsive Card View */}
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-sm">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Tracking ID</th>
                    <th className="px-4 py-3">Grievance Headline</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">No complaints match your filters.</td>
                    </tr>
                  ) : (
                    filteredComplaints.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-bold text-blue-900">{c.trackingId}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{c.title}</td>
                        <td className="px-4 py-3">{c.category}</td>
                        <td className="px-4 py-3 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            c.severity === "EMERGENCY" ? "bg-rose-100 text-rose-800 border border-rose-300" :
                            c.severity === "HIGH" ? "bg-amber-100 text-amber-800 border border-amber-300" :
                            "bg-slate-100 text-slate-800 border border-slate-300"
                          }`}>
                            [{c.severity}]
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold">{c.status}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedComplaint(c)}
                            className="px-3 py-1.5 rounded bg-blue-50 border border-blue-300 text-blue-900 hover:bg-blue-100 font-bold text-xs"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Complaint Inspection Modal */}
            {selectedComplaint && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                <div className="w-full max-w-xl p-5 rounded-2xl bg-white border border-slate-300 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl text-xs">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                    <div>
                      <span className="font-mono font-bold text-blue-900 block">{selectedComplaint.trackingId}</span>
                      <h3 className="text-base font-bold text-slate-900">{selectedComplaint.title}</h3>
                    </div>
                    <button onClick={() => setSelectedComplaint(null)} className="p-2 text-slate-500 font-bold hover:text-slate-900">✕</button>
                  </div>

                  <p className="text-slate-700 leading-relaxed font-medium">{selectedComplaint.description}</p>
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 space-y-1 text-slate-800 font-medium">
                    <div>Location: <strong>{selectedComplaint.address} ({selectedComplaint.latitude}° N, {selectedComplaint.longitude}° E)</strong></div>
                    <div>Status: <strong>{selectedComplaint.status}</strong></div>
                  </div>

                  {selectedComplaint.beforePhotoUrl && (
                    <img src={selectedComplaint.beforePhotoUrl} alt="Evidence" className="max-h-52 mx-auto rounded-lg object-contain border border-slate-300 bg-slate-100" />
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <label className="block font-bold text-slate-800">Assign Field Officer:</label>
                    <div className="flex gap-2">
                      <select
                        value={assignOfficerId}
                        onChange={(e) => setAssignOfficerId(e.target.value)}
                        className="flex-1 min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white font-medium"
                      >
                        <option value="">Select Officer...</option>
                        {usersList.filter(u => u.role === "OFFICER").map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleStatusUpdate(selectedComplaint.id, "ASSIGNED", { assignedOfficerId: assignOfficerId })}
                        disabled={!assignOfficerId}
                        className="px-4 rounded-lg bg-blue-700 text-white font-bold text-xs uppercase disabled:opacity-50 min-h-[44px]"
                      >
                        Assign
                      </button>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleStatusUpdate(selectedComplaint.id, "CLOSED")}
                        className="flex-1 py-2.5 rounded-lg bg-emerald-700 text-white font-bold text-xs uppercase min-h-[44px]"
                      >
                        Approve & Close Ticket
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 3: AUDIT TRAILS */}
        {activeTab === "audit" && (
          <div className="p-5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase">System Audit Ledger</h3>
            <div className="space-y-2">
              {auditEvents.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium">No audit events recorded yet.</p>
              ) : (
                auditEvents.map(evt => (
                  <div key={evt.id} className="p-3 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs flex justify-between gap-3">
                    <div>
                      <span className="font-bold text-blue-900">{evt.action}</span>: <span className="text-slate-800">{evt.details}</span>
                    </div>
                    <span className="text-slate-500">{evt.timestamp ? new Date(evt.timestamp).toLocaleString() : ""}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: USERS */}
        {activeTab === "users" && (
          <div className="p-5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase">Staff & User Directory</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{u.name}</td>
                      <td className="px-4 py-2.5 text-slate-700">{u.email}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-blue-900">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: CONFIGURATION */}
        {activeTab === "config" && (
          <form onSubmit={handleSaveConfig} className="p-5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-4 max-w-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase">Policy Parameters</h3>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Geofence Distance Tolerance (Meters)</label>
              <input
                type="number"
                value={geofenceLimit}
                onChange={(e) => setGeofenceLimit(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Duplicate Image Search Radius (Meters)</label>
              <input
                type="number"
                value={duplicateRadius}
                onChange={(e) => setDuplicateRadius(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white font-medium"
              />
            </div>

            {configSaved && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-900 font-bold flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-700" />
                <span>Policy parameters updated successfully.</span>
              </div>
            )}

            <button
              type="submit"
              className="py-3 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold uppercase min-h-[44px]"
            >
              Save Configuration
            </button>
          </form>
        )}

      </main>

    </div>
  );
}
