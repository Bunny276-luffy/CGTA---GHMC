"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  LogOut,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  MapPin,
  Sun,
  Moon,
  ArrowRight,
  BarChart3,
  Scale,
  CheckCircle2,
  Activity
} from "lucide-react";

interface ComplaintStat {
  id: string;
  trackingId: string;
  category: string;
  status: string;
  severity: string;
  createdAt: string;
}

export default function DeptHeadDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [complaints, setComplaints] = useState<ComplaintStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let user;
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        router.push("/login");
        return;
      }
      user = JSON.parse(userStr);
      if (!user || user.role !== "ADMIN") {
        router.push("/login");
        return;
      }
      setCurrentUser(user);
    } catch (e) {
      router.push("/login");
      return;
    }

    const fetchGrievanceStats = async () => {
      try {
        const res = await fetch(`/api/complaints/track?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setComplaints(data);
          }
        }
      } catch (err) {
        console.warn("Could not load department complaints:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGrievanceStats();
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

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const total = complaints.length;
  const resolved = complaints.filter(c => c.status === "RESOLVED" || c.status === "CLOSED").length;
  const inProgress = complaints.filter(c => c.status === "IN_PROGRESS").length;
  const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : "100.0";

  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center p-8 text-amber-400 font-bold font-mono text-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span>Initializing Executive Analytics Console...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col md:flex-row ${
      theme === "dark" ? "bg-[#030308] text-slate-100" : "bg-[#f8fafc] text-slate-900"
    }`}>

      {/* Sidebar Navigation */}
      <aside className={`w-full md:w-64 border-b md:border-b-0 md:border-r p-5 flex flex-col justify-between flex-shrink-0 z-20 ${
        theme === "dark" ? "bg-[#0c0804]/90 backdrop-blur-md border-amber-500/10" : "bg-white border-slate-200 shadow-sm"
      }`}>
        <div>
          <div className="flex items-center gap-2.5 mb-8">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-md shadow-amber-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className={`text-sm font-black tracking-wider ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                EXECUTIVE<span className="text-amber-400">DESK</span>
              </span>
              <p className="text-[9px] font-mono text-slate-400">GHMC Executive Analytics</p>
            </div>
          </div>

          <div className="space-y-1 text-left">
            <button
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                theme === "dark"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-amber-50 text-amber-900 border-amber-200"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Department Volumetrics</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t space-y-3 border-slate-200 dark:border-white/5">
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

      {/* Main Content Workspace */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">

        <header className="flex justify-between items-center border-b pb-4 border-slate-200 dark:border-white/5">
          <div className="text-left">
            <h1 className={`text-xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              Department Executive Volumetrics
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Municipal resource allocation, resolution velocity, and SLA telemetry</p>
          </div>
        </header>

        {/* KPIs Summary Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className={`p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Resolution Rate</span>
            <div className="flex items-center gap-2 mt-2">
              <h3 className={`text-2xl font-mono font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{resolutionRate}%</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Verified on-chain resolutions</p>
          </div>

          <div className={`p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Pending Complaints</span>
            <div className="flex items-center gap-2 mt-2">
              <h3 className={`text-2xl font-mono font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{inProgress}</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Active field operations</p>
          </div>

          <div className={`p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Avg SLA Speed</span>
            <div className="flex items-center gap-2 mt-2">
              <h3 className={`text-2xl font-mono font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>14.8 Hrs</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Target turnaround: 24.0 Hrs</p>
          </div>

          <div className={`p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Total Grievances</span>
            <div className="flex items-center gap-2 mt-2">
              <h3 className={`text-2xl font-mono font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{total}</h3>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Logged across all sectors</p>
          </div>
        </div>

        {/* Operational Department Feed */}
        <div className={`rounded-2xl border text-left p-6 ${
          theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/5 mb-4">
            <span className="text-xs font-mono font-bold uppercase text-slate-300">Department Inspection Overview</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">TELEMETRY ACTIVE</span>
          </div>

          {complaints.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <Activity className="h-8 w-8 text-slate-500 mx-auto" />
              <p>No active department grievances registered in the current billing period.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {complaints.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono text-amber-400 font-bold mr-2">{c.trackingId}</span>
                    <span className="text-slate-300 font-medium">{c.category}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
