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
  Play, 
  Sparkles,
  ArrowRight,
  BarChart3,
  Scale
} from "lucide-react";

interface Officer {
  name: string;
  role: string;
  activeTickets: number;
  resolvedTickets: number;
  slaSpeed: string;
  rating: string;
}

export default function DeptHeadDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  
  // Chart Data Hover
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; resolved: number; filed: number; month: string } | null>(null);
  
  // AI Insights State
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  const officers: Officer[] = [
    { name: "Officer Ramesh", role: "Roads & Highways", activeTickets: 3, resolvedTickets: 148, slaSpeed: "11.2 Hrs", rating: "98.4%" },
    { name: "Officer Sneha", role: "Drainage & Water", activeTickets: 5, resolvedTickets: 120, slaSpeed: "14.5 Hrs", rating: "96.1%" },
    { name: "Officer Amit", role: "Sanitation", activeTickets: 2, resolvedTickets: 95, slaSpeed: "16.1 Hrs", rating: "94.8%" },
    { name: "Officer Priya", role: "Streetlights", activeTickets: 1, resolvedTickets: 110, slaSpeed: "19.8 Hrs", rating: "91.2%" }
  ];

  // SVG Chart Coordinates for monthly data
  const chartPoints = [
    { x: 50, y: 150, resolved: 42, filed: 50, month: "Jan" },
    { x: 130, y: 120, resolved: 65, filed: 72, month: "Feb" },
    { x: 210, y: 90, resolved: 88, filed: 95, month: "Mar" },
    { x: 290, y: 110, resolved: 74, filed: 80, month: "Apr" },
    { x: 370, y: 60, resolved: 110, filed: 115, month: "May" }
  ];

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user || { name: "Director Prasad", role: "DEPT_HEAD" });
      } else {
        setCurrentUser({ name: "Director Prasad", role: "DEPT_HEAD" });
      }
    } catch (e) {
      setCurrentUser({ name: "Director Prasad", role: "DEPT_HEAD" });
    }
    
    // Set theme class on HTML element
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme, router]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const handleDispatch = () => {
    setDispatchSuccess(true);
    setTimeout(() => setDispatchSuccess(false), 4000);
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center p-8 text-amber-400 font-bold font-mono text-center">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          <span>Initializing Executive Analytics Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ease-in-out flex flex-col md:flex-row ${
      theme === "dark" ? "bg-[#030308] text-slate-100" : "bg-[#f8fafc] text-slate-900"
    }`}>
      
      {/* Sidebar Navigation */}
      <aside className={`w-full md:w-64 border-b md:border-b-0 md:border-r transition-colors duration-500 p-6 flex flex-col justify-between flex-shrink-0 ${
        theme === "dark" ? "bg-[#140b05]/90 backdrop-blur-md border-amber-500/10" : "bg-white border-slate-200"
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-7 w-7 rounded bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className={`text-sm font-black tracking-wider ${theme === "dark" ? "text-white" : "text-amber-950"}`}>
              EXECUTIVE<span className="text-amber-400">DESK</span>
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                theme === "dark"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-amber-50 text-amber-900 border-amber-200"
              }`}
            >
              <BarChart3 className="h-4.5 w-4.5" />
              Department Panel
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t space-y-4 border-slate-200 dark:border-white/5">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              theme === "dark"
                ? "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
                : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4.5 w-4.5 text-amber-400" />
                Switch to Light
              </>
            ) : (
              <>
                <Moon className="h-4.5 w-4.5 text-indigo-600" />
                Switch to Dark
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 border border-indigo-500/20">
              {currentUser.name[0]}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Department Head</p>
              <p className={`text-xs font-bold truncate ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{currentUser.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 text-left text-slate-500 hover:text-rose-500 text-[11px] font-bold transition-all"
          >
            <LogOut className="h-4 w-4" />
            Deauthorize Session
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-h-0 p-6 md:p-10 relative overflow-y-auto">
        
        {/* Floating Success Alert */}
        {dispatchSuccess && (
          <div className={`absolute top-6 right-6 px-5 py-4 rounded-2xl flex items-start gap-3 text-left max-w-sm z-50 border shadow-lg animate-bounce ${
            theme === "dark" ? "bg-emerald-950/80 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            <ShieldCheck className="h-6 w-6 text-emerald-500 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold">Officer Dispatched Successfully</h4>
              <p className="text-[10px] mt-0.5 opacity-80">Geofence lock parameters sent to Ramesh's node.</p>
            </div>
          </div>
        )}

        <header className="flex justify-between items-center mb-8 border-b pb-5 border-slate-200 dark:border-white/5">
          <div className="text-left">
            <h2 className={`text-xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              Department Executive Core
            </h2>
            <p className="text-xs text-slate-500 mt-1">Review resolution rates, workload metrics, and dispatch resources</p>
          </div>
        </header>

        {/* 1. KPIs Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
          
          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold">Resolution Rate</span>
              <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>88.4%</h3>
              <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">+4.2%</span>
            </div>
          </div>

          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold">Pending Complaints</span>
              <AlertCircle className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>42</h3>
              <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Critical Focus</span>
            </div>
          </div>

          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold">Avg SLA Time</span>
              <Clock className="h-4.5 w-4.5 text-teal-550 text-teal-650 text-teal-600" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>14.8 Hrs</h3>
              <span className="text-[9px] font-bold text-teal-500 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">Within SLA</span>
            </div>
          </div>

          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold">Active Officers</span>
              <Users className="h-4.5 w-4.5 text-purple-500" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>12 / 15</h3>
              <span className="text-[9px] font-bold text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">On Duty</span>
            </div>
          </div>

        </div>

        {/* 2. Interactive SVG Charts & AI Recommendation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8 text-left">
          
          {/* Resolution Trends Line Chart */}
          <div className={`lg:col-span-8 glass-panel p-6 rounded-3xl border flex flex-col justify-between ${
            theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
          } min-h-[360px]`}>
            <div className="border-b pb-4 border-slate-200 dark:border-white/5 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold">Monthly Audit Data</span>
                <h3 className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Resolution & Filing Volumetrics</h3>
              </div>
              <span className="text-[10px] text-slate-500">Jan - May 2026</span>
            </div>

            {/* SVG Chart Drawing */}
            <div className="relative flex-grow flex items-center justify-center p-4">
              <svg viewBox="0 0 420 200" className="w-full h-[180px] overflow-visible">
                {/* Horizontal grid lines */}
                <line x1="40" y1="50" x2="400" y2="50" stroke="currentColor" className="text-slate-200 dark:text-slate-900" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="40" y1="100" x2="400" y2="100" stroke="currentColor" className="text-slate-200 dark:text-slate-900" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="40" y1="150" x2="400" y2="150" stroke="currentColor" className="text-slate-200 dark:text-slate-900" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Line Path for Resolved tickets (Teal) */}
                <path
                  d="M 50 150 L 130 120 L 210 90 L 290 110 L 370 60"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Line Path for Filed tickets (Indigo) */}
                <path
                  d="M 50 130 L 130 110 L 210 80 L 290 95 L 370 50"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="4,2"
                />

                {/* Interactive Points */}
                {chartPoints.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill={theme === "dark" ? "#030308" : "#ffffff"}
                    stroke="#14b8a6"
                    strokeWidth="3.5"
                    className="cursor-pointer hover:r-6 transition-all"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* X Axis Labels */}
                {chartPoints.map((pt, idx) => (
                  <text
                    key={idx}
                    x={pt.x}
                    y="180"
                    fill="currentColor"
                    className="text-slate-400 dark:text-slate-600 font-mono text-[9px] text-anchor-middle"
                    textAnchor="middle"
                  >
                    {pt.month}
                  </text>
                ))}
              </svg>

              {/* Chart Tooltip Overlay */}
              {hoveredPoint && (
                <div 
                  className={`absolute p-3 rounded-xl border text-[10px] pointer-events-none shadow-2xl font-mono ${
                    theme === "dark" ? "bg-slate-950/95 border-indigo-500/35 text-slate-300" : "bg-white border-slate-200 text-slate-700"
                  }`}
                  style={{
                    left: `${(hoveredPoint.x / 420) * 100}%`,
                    top: `${(hoveredPoint.y / 200) * 100 - 30}%`
                  }}
                >
                  <p className="font-bold text-white uppercase">{hoveredPoint.month}</p>
                  <p className="mt-1">Resolved: <span className="text-teal-400 font-bold">{hoveredPoint.resolved}</span></p>
                  <p>Filed: <span className="text-indigo-400 font-bold">{hoveredPoint.filed}</span></p>
                </div>
              )}
            </div>

            <div className="flex gap-6 text-[9px] font-mono uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 bg-indigo-500 rounded" /> Incoming Grievances
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-3 bg-teal-500 rounded" /> Audit Resolutions
              </span>
            </div>
          </div>

          {/* AI Resource Insights (Alert & Action Box) */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between ${
              theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
            } min-h-[360px]`}>
              <div className="border-b pb-3 border-slate-200 dark:border-white/5 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${theme === "dark" ? "text-white" : "text-slate-800"}`}>AI Resource Allocation</h3>
              </div>

              <div className="space-y-4 my-4 flex-grow flex flex-col justify-center">
                <div className={`p-4 rounded-2xl border text-xs text-left ${
                  theme === "dark" ? "bg-indigo-950/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-200"
                }`}>
                  <p className="font-bold text-indigo-500 mb-1">Deduplication Cluster Flagged</p>
                  <p className="opacity-90 leading-relaxed">
                    AI detected a high density of Roads/Potholes complaints (14 overlaps) near Indiranagar Sector 4 coordinates.
                  </p>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Recommended action: Dispatch Officer Ramesh to coordinate verification and prevent redundant site visits.
                </p>
              </div>

              <button
                onClick={handleDispatch}
                className="w-full py-3 bg-indigo-650 bg-indigo-900 hover:bg-indigo-800 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                Dispatch Officer Ramesh <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

        {/* 3. Team Standings Table */}
        <div className={`glass-panel rounded-3xl border overflow-hidden ${
          theme === "dark" ? "bg-slate-950/30 border-white/5" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="p-5 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Scale className="h-4.5 w-4.5 text-indigo-500" />
              Officer Standings & Workload Matrix
            </span>
            <span className="text-[9px] font-mono text-slate-500">Live stats</span>
          </div>

          <div className="divide-y text-xs divide-slate-200 dark:divide-white/5 text-left">
            <div className="p-4 grid grid-cols-12 gap-2 text-slate-500 font-bold bg-slate-50/50 dark:bg-slate-950/40 uppercase tracking-widest text-[9px] font-mono">
              <div className="col-span-3">Officer Name</div>
              <div className="col-span-3">Assigned Sector</div>
              <div className="col-span-2 text-center">Active Workload</div>
              <div className="col-span-2 text-center">Total Resolved</div>
              <div className="col-span-2 text-right">Avg SLA Speed</div>
            </div>

            {officers.map((row, idx) => (
              <div key={idx} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-slate-100/40 dark:hover:bg-white/[0.01] transition-colors">
                <div className="col-span-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {row.name}
                </div>
                <div className="col-span-3 text-slate-550 text-slate-400 font-semibold">{row.role}</div>
                <div className="col-span-2 text-center font-bold font-mono text-indigo-400">{row.activeTickets} tickets</div>
                <div className="col-span-2 text-center font-mono">{row.resolvedTickets} cases</div>
                <div className="col-span-2 text-right font-mono font-bold text-teal-400">{row.slaSpeed}</div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
