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
  Brain,
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
  Activity
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
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "CITIZEN" | "OFFICER" | "DEPT_HEAD" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
}

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"data" | "tpa" | "users" | "config">("data");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const [geofenceLimit, setGeofenceLimit] = useState(100);
  const [duplicateRadius, setDuplicateRadius] = useState(50);
  const [enableDeepfakeCheck, setEnableDeepfakeCheck] = useState(true);

  const [complaints, setComplaints] = useState<Complaint[]>([
    {
      id: "comp-1",
      trackingId: "CGTA-2026-9812",
      title: "Broken Drainage near Metro Pillar 104",
      description: "Severe overflow causing heavy waterlogging on main road. Immediate intervention needed.",
      category: "Drainage & Water Leakage",
      status: "RESOLVED",
      severity: "EMERGENCY",
      address: "Jubilee Hills Road No. 36, Hyderabad",
      latitude: 17.385,
      longitude: 78.4867,
      beforePhotoUrl: "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
      resolutionPhotoUrl: "https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&w=400&q=80",
      rejectionCount: 0,
      createdAt: "2026-07-16T10:30:00.000Z"
    },
    {
      id: "comp-2",
      trackingId: "CGTA-2026-4412",
      title: "Garbage Pile-up at Public Park Entry",
      description: "Large dump neglected for 4 days. Strong odor spreading to neighborhood children park.",
      category: "Garbage & Sanitation",
      status: "TPA_REVIEW",
      severity: "HIGH",
      address: "Bandra West Reclamation, Mumbai",
      latitude: 18.9752,
      longitude: 72.8258,
      beforePhotoUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80",
      resolutionPhotoUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80",
      rejectionCount: 2,
      createdAt: "2026-07-17T14:20:00.000Z"
    },
    {
      id: "comp-3",
      trackingId: "CGTA-2026-8801",
      title: "Major Pothole on Main Flyover Spur",
      description: "Asphalt collapsed. Dangerous for traffic.",
      category: "Roads & Potholes",
      status: "SUBMITTED",
      severity: "EMERGENCY",
      address: "Jubilee Hills Road No. 36, Hyderabad",
      latitude: 17.3852,
      longitude: 78.4870,
      beforePhotoUrl: "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
      rejectionCount: 0,
      createdAt: "2026-07-18T09:15:00.000Z"
    }
  ]);

  const [usersList, setUsersList] = useState<UserProfile[]>([
    { id: "usr-1", name: "Officer Ramesh", email: "ramesh@civictrust.gov.in", role: "OFFICER", status: "ACTIVE" },
    { id: "usr-2", name: "Officer Sneha", email: "sneha@civictrust.gov.in", role: "OFFICER", status: "ACTIVE" },
    { id: "usr-3", name: "Citizen Yashasvi", email: "yashasvi@gmail.com", role: "CITIZEN", status: "ACTIVE" },
    { id: "usr-4", name: "Director Prasad", email: "head@civictrust.gov.in", role: "DEPT_HEAD", status: "ACTIVE" }
  ]);

  const [securityEvents, setSecurityEvents] = useState<string[]>([
    "ALARM: Exif Header mismatch detected for user comp-432. Image upload discarded.",
    "ALARM: Geofence mismatch from Officer Amit. Blocked resolution submission."
  ]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    setCurrentUser(JSON.parse(userStr));
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

  const handleTpaDecision = (id: string, resolve: boolean) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === id) {
        return { 
          ...c, 
          status: resolve ? ("CLOSED" as const) : ("IN_PROGRESS" as const),
          rejectionCount: resolve ? c.rejectionCount : 0
        };
      }
      return c;
    }));
  };

  const handleUserToggleStatus = (id: string) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === "ACTIVE" ? "SUSPENDED" as const : "ACTIVE" as const };
      }
      return u;
    }));
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.trackingId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === "All" || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  if (!currentUser) return <div className="p-8 text-blue-400 font-bold font-mono text-center">Loading Session...</div>;

  return (
    <div className={`min-h-screen transition-colors duration-500 ease-in-out flex flex-col md:flex-row ${
      theme === "dark" ? "bg-[#020205] text-slate-100" : "bg-[#f8fafc] text-slate-900"
    }`}>
      
      {/* Sidebar Navigation */}
      <aside className={`w-full md:w-64 border-b md:border-b-0 md:border-r transition-colors duration-500 p-6 flex flex-col justify-between flex-shrink-0 ${
        theme === "dark" ? "bg-slate-950/60 border-white/5" : "bg-white border-slate-200"
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-7 w-7 bg-gradient-to-tr from-indigo-500 to-purple-650 flex items-center justify-center rounded">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className={`text-sm font-black tracking-wider ${theme === "dark" ? "text-white" : "text-blue-900"}`}>
              CIVIC<span className="text-indigo-500">TRUST</span>
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <button
              onClick={() => setActiveTab("data")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "data"
                  ? theme === "dark" 
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15" 
                    : "bg-indigo-50 text-indigo-900 border-indigo-100"
                  : "text-slate-400 hover:text-indigo-500 border-transparent border"
              }`}
            >
              <List className="h-4.5 w-4.5" />
              Grievance List
            </button>
            <button
              onClick={() => setActiveTab("tpa")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "tpa"
                  ? theme === "dark" 
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15" 
                    : "bg-indigo-50 text-indigo-900 border-indigo-100"
                  : "text-slate-400 hover:text-indigo-500 border-transparent border"
              }`}
            >
              <Scale className="h-4.5 w-4.5" />
              Arbitration Queue (TPA)
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "users"
                  ? theme === "dark" 
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15" 
                    : "bg-indigo-50 text-indigo-900 border-indigo-100"
                  : "text-slate-400 hover:text-indigo-500 border-transparent border"
              }`}
            >
              <Users className="h-4.5 w-4.5" />
              User Profiles
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "config"
                  ? theme === "dark" 
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15" 
                    : "bg-indigo-50 text-indigo-900 border-indigo-100"
                  : "text-slate-400 hover:text-indigo-500 border-transparent border"
              }`}
            >
              <Settings className="h-4.5 w-4.5" />
              System Config
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 space-y-4">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
              theme === "dark"
                ? "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
                : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            {theme === "dark" ? (
              <><Sun className="h-4.5 w-4.5 text-amber-400" /> Switch to Light</>
            ) : (
              <><Moon className="h-4.5 w-4.5 text-indigo-600" /> Switch to Dark</>
            )}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 border border-indigo-500/20">
              {currentUser.name[0]}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider font-mono">Platform Admin</p>
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
        
        <header className="flex justify-between items-center mb-8 border-b pb-5 border-slate-200 dark:border-white/5">
          <div className="text-left">
            <h2 className={`text-xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              Platform Admin Control Core
            </h2>
            <p className="text-xs text-slate-500 mt-1">Manage global system parameters, TPA disputes, and user node registrations.</p>
          </div>
        </header>

        {/* Platform Health Overview Diagnostics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 text-left">
          
          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-indigo-550 text-indigo-500" />
              API Latency
            </span>
            <div className="flex items-center gap-2 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>18ms</h3>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
          </div>

          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold flex items-center gap-1">
              <Database className="h-3.5 w-3.5 text-indigo-500" />
              DB Conn Pool
            </span>
            <div className="flex items-center gap-2 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>12 / 50</h3>
              <span className="text-[9px] font-bold text-slate-500 font-mono">Active</span>
            </div>
          </div>

          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5 text-indigo-500" />
              AI Check Success
            </span>
            <div className="flex items-center gap-2 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>99.8%</h3>
              <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">Clean</span>
            </div>
          </div>

          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-indigo-550 text-indigo-500" />
              Ledger Blocks
            </span>
            <div className="flex items-center gap-2 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>1,482</h3>
              <span className="text-[9px] font-bold text-indigo-500 bg-indigo-500/10 px-1 py-0.5 rounded border border-indigo-500/20">Sealed</span>
            </div>
          </div>

        </div>

        {/* Dashboard Tabs Content */}
        {activeTab === "data" && (
          <div className="space-y-6 text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Tracking ID or headline..."
                  className={`w-full pl-9 pr-4 py-3 rounded-xl border text-xs outline-none ${
                    theme === "dark" ? "bg-slate-950/60 border-white/5 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`border rounded-xl px-3 py-3 text-xs outline-none ${
                  theme === "dark" ? "bg-slate-950/60 border-white/5 text-white" : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                <option>All</option>
                <option>Roads & Potholes</option>
                <option>Garbage & Sanitation</option>
                <option>Drainage & Water Leakage</option>
                <option>Streetlights & Electrical</option>
                <option>Public Infrastructure</option>
              </select>
            </div>

            <div className={`glass-panel border rounded-3xl overflow-hidden ${
              theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="divide-y divide-slate-200 dark:divide-white/5">
                <div className="p-4 grid grid-cols-12 gap-2 text-slate-555 text-slate-500 font-bold bg-slate-50 dark:bg-slate-950/40 font-mono text-[9px] uppercase tracking-widest">
                  <div className="col-span-2">Tracking ID</div>
                  <div className="col-span-4">Headline / Description</div>
                  <div className="col-span-3">Category</div>
                  <div className="col-span-1.5 col-span-2 text-center">Status</div>
                  <div className="col-span-1 text-right">Severity</div>
                </div>

                {filteredComplaints.map((c) => (
                  <div key={c.id} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-slate-100/40 dark:hover:bg-white/[0.01] transition-colors">
                    <div className="col-span-2 font-mono font-bold text-indigo-400">{c.trackingId}</div>
                    <div className="col-span-4">
                      <p className={`font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{c.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{c.description}</p>
                    </div>
                    <div className="col-span-3 text-slate-550 text-slate-400 font-semibold">{c.category}</div>
                    <div className="col-span-2 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[8px] font-bold ${
                        c.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" : "bg-slate-800 text-slate-400"
                      }`}>{c.status}</span>
                    </div>
                    <div className="col-span-1 text-right font-bold text-rose-500">{c.severity}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tpa" && (
          <div className="space-y-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {complaints.filter(c => c.status === "TPA_REVIEW").map((c) => (
                <div key={c.id} className={`p-6 rounded-3xl border space-y-4 ${
                  theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-indigo-400 font-bold">{c.trackingId}</span>
                    <span className="px-2.5 py-0.5 rounded text-[8px] font-bold bg-rose-500/10 text-rose-450 border border-rose-500/20 animate-pulse">Disputed TPA</span>
                  </div>

                  <div>
                    <h4 className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-850"}`}>{c.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-center">
                      <p className="text-[8px] text-slate-500 uppercase font-bold">EXIF coordinate offset</p>
                      <p className="text-xs font-bold text-white mt-1">42 Meters</p>
                    </div>
                    <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-center">
                      <p className="text-[8px] text-slate-500 uppercase font-bold">Tamper Alarm Score</p>
                      <p className="text-xs font-bold text-emerald-400 mt-1">0% (Original)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => handleTpaDecision(c.id, true)}
                      className="py-2.5 bg-indigo-650 bg-indigo-900 hover:bg-indigo-850 text-white font-bold text-xs rounded-xl transition-all"
                    >
                      Resolve & Close
                    </button>
                    <button
                      onClick={() => handleTpaDecision(c.id, false)}
                      className="py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-350 text-xs font-bold rounded-xl transition-all"
                    >
                      Re-assign to Officer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6 text-left">
            <div className={`glass-panel border rounded-3xl overflow-hidden ${
              theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="divide-y divide-slate-200 dark:divide-white/5">
                <div className="p-4 grid grid-cols-12 gap-2 text-slate-500 font-bold bg-slate-50 dark:bg-slate-950/40 font-mono text-[9px] uppercase tracking-widest">
                  <div className="col-span-3">Full Name</div>
                  <div className="col-span-4">Email Coordinates</div>
                  <div className="col-span-2">Registered Role</div>
                  <div className="col-span-1.5 col-span-2 text-center">Status</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {usersList.map((usr) => (
                  <div key={usr.id} className="p-4 grid grid-cols-12 gap-2 items-center hover:bg-slate-100/40 dark:hover:bg-white/[0.01] transition-colors">
                    <div className={`col-span-3 font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{usr.name}</div>
                    <div className="col-span-4 font-mono text-slate-500">{usr.email}</div>
                    <div className="col-span-2">
                      <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-400 font-mono">
                        {usr.role}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        usr.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-450" : "bg-rose-500/10 text-rose-450"
                      }`}>{usr.status}</span>
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => handleUserToggleStatus(usr.id)}
                        className={`text-[9px] font-bold transition-all px-2.5 py-1 rounded border ${
                          usr.status === "ACTIVE" 
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20" 
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                      >
                        {usr.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Alerts alarm board */}
            <div className={`p-6 rounded-3xl border space-y-4 ${
              theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-white/5">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                <h3 className={`text-xs font-mono font-bold uppercase tracking-wider ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Security Event Logs</h3>
              </div>

              <div className="space-y-2 font-mono text-[9px] text-slate-500">
                {securityEvents.map((evt, idx) => (
                  <p key={idx} className="flex gap-2">
                    <span className="text-rose-500 font-bold">&gt;</span>
                    <span>{evt}</span>
                  </p>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === "config" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
            <div className={`p-6 rounded-3xl border space-y-6 ${
              theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <h3 className={`text-sm font-bold border-b pb-3 ${theme === "dark" ? "text-white border-white/5" : "text-slate-800 border-slate-100"}`}>
                Engine Tweak Options
              </h3>

              <div className="space-y-5">
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px] text-slate-500">
                    <span>GEOFENCE REACH CAP:</span>
                    <span className="text-indigo-400 font-bold">{geofenceLimit}m</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={300}
                    value={geofenceLimit}
                    onChange={(e) => setGeofenceLimit(parseInt(e.target.value))}
                    className="w-full h-[2px] bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[9px] text-slate-500">Limits coordinates offset target ranges.</p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[10px] text-slate-500">
                    <span>DEDUPLICATION NEST RADIUS:</span>
                    <span className="text-indigo-400 font-bold">{duplicateRadius}m</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={150}
                    value={duplicateRadius}
                    onChange={(e) => setDuplicateRadius(parseInt(e.target.value))}
                    className="w-full h-[2px] bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[9px] text-slate-500">Examines radius for merging redundant files.</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900/40 border border-white/5 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-white">Strict Deepfake Integrity Checks</p>
                    <p className="text-[9px] text-slate-550 text-slate-400 mt-0.5">Applies pixel validation software scanning headers.</p>
                  </div>
                  <button
                    onClick={() => setEnableDeepfakeCheck(!enableDeepfakeCheck)}
                    className={`px-3 py-1 rounded text-[9px] font-bold ${
                      enableDeepfakeCheck ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {enableDeepfakeCheck ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
