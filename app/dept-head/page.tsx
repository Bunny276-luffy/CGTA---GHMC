"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t, SupportedLanguage } from "@/lib/i18n";
import {
  ShieldCheck,
  LogOut,
  Users,
  Clock,
  BarChart3,
  AlertTriangle,
  Globe,
  CheckCircle,
  MapPin,
  RefreshCw,
  Search
} from "lucide-react";
import { fetchSessionUser, logoutAndRedirect, StoredUser } from "../../lib/client-auth";

interface SlaState {
  deadlineHours: number;
  warnAtPercent: number;
  state: "ON_TRACK" | "WARNING" | "OVERDUE";
  ageHours: number;
}

interface ComplaintRow {
  id: string;
  trackingId: string;
  title: string;
  category: string;
  status: string;
  severity: string;
  address: string;
  createdAt: string;
  assignedOfficerId?: string | null;
  rejectionCount: number;
  sla?: SlaState | null;
  suggestedDepartment?: string | null;
}

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const OPEN_STATUSES = ["SUBMITTED", "ASSIGNED", "IN_PROGRESS", "TPA_REVIEW"];

export default function DeptHeadDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [lang, setLang] = useState<SupportedLanguage>("en");
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [officers, setOfficers] = useState<DirectoryUser[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [assignSelections, setAssignSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const bootstrap = async () => {
      const user = await fetchSessionUser(["DEPT_HEAD", "ADMIN"]);
      if (!user) {
        router.push("/dept-head/login");
        return;
      }
      setCurrentUser(user);

      try {
        const [complaintsRes, overviewRes] = await Promise.all([
          fetch("/api/complaints", { credentials: "same-origin" }),
          fetch("/api/admin/overview", { credentials: "same-origin" })
        ]);

        if (complaintsRes.status === 401 || overviewRes.status === 401) {
          router.push("/dept-head/login");
          return;
        }

        if (complaintsRes.ok) {
          const data = await complaintsRes.json();
          if (Array.isArray(data)) setComplaints(data);
        }

        if (overviewRes.ok) {
          const data = await overviewRes.json();
          setOfficers(Array.isArray(data.users) ? data.users.filter((u: DirectoryUser) => u.role === "OFFICER") : []);
        }
      } catch (err) {
        console.warn("Could not load department data:", err);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [router]);

  const applyTransition = async (complaintId: string, status: string, extras: Record<string, unknown> = {}) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status, ...extras })
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/dept-head/login");
        return null;
      }
      if (!res.ok) {
        throw new Error(data.message || "Action rejected by the server");
      }
      return data;
    } catch (err: any) {
      setActionError(err?.message ? `Action failed: ${err.message}` : "Action failed. Please try again.");
      return null;
    }
  };

  const handleAssign = async (c: ComplaintRow) => {
    const officerId = assignSelections[c.id];
    if (!officerId) return;
    const result = await applyTransition(c.id, "ASSIGNED", { assignedOfficerId: officerId });
    if (!result) return;
    setComplaints(prev => prev.map(x => x.id === c.id ? { ...x, status: "ASSIGNED", assignedOfficerId: officerId } : x));
    setAssignSelections(prev => ({ ...prev, [c.id]: "" }));
  };

  const handleEscalate = async (c: ComplaintRow) => {
    const result = await applyTransition(c.id, "TPA_REVIEW", { notes: "Escalated to supervisor audit by department head" });
    if (!result) return;
    setComplaints(prev => prev.map(x => x.id === c.id ? { ...x, status: "TPA_REVIEW" } : x));
  };

  const logout = () => {
    logoutAndRedirect(router, "/dept-head/login");
  };

  const total = complaints.length;
  const openCases = complaints.filter(c => OPEN_STATUSES.includes(c.status));
  const overdueCases = openCases.filter(c => c.sla?.state === "OVERDUE");
  const resolvedCount = complaints.filter(c => c.status === "RESOLVED" || c.status === "CLOSED").length;
  const resolutionRate = total > 0 ? ((resolvedCount / total) * 100).toFixed(1) : "0.0";

  const officerWorkload = officers.map(o => ({
    ...o,
    assigned: complaints.filter(c => c.assignedOfficerId === o.id && OPEN_STATUSES.includes(c.status)).length
  })).sort((a, b) => b.assigned - a.assigned);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900 font-bold text-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-blue-700 border-t-transparent animate-spin" />
          <span>Opening Department Operations Desk...</span>
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
            <span className="text-base font-bold tracking-tight block leading-tight">{t("depthead.title", lang)}</span>
            <span className="text-[11px] text-slate-400 block font-normal">{currentUser?.name || "Department Head"} ({t("app.municipality", lang)})</span>
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

        {/* Operational Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase block">Total Volume</span>
            <span className="text-2xl font-black text-slate-900">{total}</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase block">Active Workload</span>
            <span className="text-2xl font-black text-blue-800">{openCases.length}</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase block">SLA Overdue</span>
            <span className="text-2xl font-black text-rose-700">{overdueCases.length}</span>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase block">Resolution Rate</span>
            <span className="text-2xl font-black text-emerald-700">{resolutionRate}%</span>
          </div>
        </div>

        {/* Workload & Escalation Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Department Open Cases Queue */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase">Department Pending Cases & Assignments</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="px-4 py-3">Tracking ID</th>
                      <th className="px-4 py-3">Headline</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assign Field Officer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {openCases.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-medium">No open department grievances pending.</td>
                      </tr>
                    ) : (
                      openCases.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-blue-900">{c.trackingId}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{c.title}</td>
                          <td className="px-4 py-3 text-slate-700">{c.category}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{c.status}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <select
                                value={assignSelections[c.id] || ""}
                                onChange={(e) => setAssignSelections({ ...assignSelections, [c.id]: e.target.value })}
                                className="min-h-[36px] px-2 rounded border border-slate-300 bg-white text-xs outline-none"
                              >
                                <option value="">Select Officer...</option>
                                {officers.map(o => (
                                  <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleAssign(c)}
                                disabled={!assignSelections[c.id]}
                                className="px-3 py-1.5 rounded bg-blue-700 text-white font-bold text-xs uppercase disabled:opacity-50 min-h-[36px]"
                              >
                                Assign
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Officer Capacity Breakdown */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-xl bg-white border border-slate-300 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase">Field Officer Capacity</h3>
              <div className="space-y-2 text-xs">
                {officerWorkload.length === 0 ? (
                  <p className="text-slate-500 font-medium">No field officers registered.</p>
                ) : (
                  officerWorkload.map(o => (
                    <div key={o.id} className="p-3 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{o.name}</span>
                        <span className="text-slate-500 text-[11px]">{o.email}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-900 border border-blue-300 font-bold font-mono">
                        {o.assigned} Active
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
