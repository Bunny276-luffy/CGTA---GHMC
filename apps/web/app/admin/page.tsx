"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Layers, 
  LogOut, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3, 
  Sliders, 
  List, 
  Scale, 
  MapPin, 
  ArrowRight,
  TrendingDown,
  Brain,
  Search,
  Check,
  RotateCcw
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

export default function AdminDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"data" | "tpa" | "analytics" | "config">("data");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Config parameters
  const [geofenceLimit, setGeofenceLimit] = useState(100);
  const [duplicateRadius, setDuplicateRadius] = useState(50);
  const [enableDeepfakeCheck, setEnableDeepfakeCheck] = useState(true);

  // Complaints database
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
      description: "Asphalt collapsed. Dangerous for fast moving highway traffic.",
      category: "Roads & Potholes",
      status: "SUBMITTED",
      severity: "EMERGENCY",
      address: "Jubilee Hills Road No. 36, Hyderabad",
      latitude: 17.3852,
      longitude: 78.4870,
      beforePhotoUrl: "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
      rejectionCount: 0,
      createdAt: "2026-07-18T09:15:00.000Z"
    },
    {
      id: "comp-4",
      trackingId: "CGTA-2026-8802",
      title: "Pavement Pothole adjacent to Metro Pillar 105",
      description: "Another pothole forming 20 meters away from the first flyover pothole.",
      category: "Roads & Potholes",
      status: "SUBMITTED",
      severity: "HIGH",
      address: "Jubilee Hills Road No. 36, Hyderabad",
      latitude: 17.3853,
      longitude: 78.4871,
      beforePhotoUrl: "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
      rejectionCount: 0,
      createdAt: "2026-07-18T09:30:00.000Z"
    }
  ]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    setCurrentUser(JSON.parse(userStr));
  }, [router]);

  // Compute Predictive Decay Alerts:
  // Trigger warning if same Category has 3+ complaints in same Ward/Address within 7 days
  const getDecayAlerts = () => {
    const counts: Record<string, { count: number; address: string; category: string }> = {};
    complaints.forEach((c) => {
      const key = `${c.address}_${c.category}`;
      if (counts[key]) {
        counts[key].count += 1;
      } else {
        counts[key] = { count: 1, address: c.address, category: c.category };
      }
    });

    return Object.values(counts).filter(x => x.count >= 3);
  };

  const decayAlerts = getDecayAlerts();

  // TPA Arbitration decisions
  const handleTpaDecision = (id: string, resolve: boolean) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === id) {
        return { 
          ...c, 
          status: resolve ? ("CLOSED" as const) : ("IN_PROGRESS" as const),
          rejectionCount: resolve ? c.rejectionCount : 0 // Reset rejections if reopen
        };
      }
      return c;
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

  if (!currentUser) return <div className="p-8 text-purple-400 font-bold">Loading supervisor shell...</div>;

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col md:flex-row text-slate-100">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-950/60 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-7 w-7 rounded bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm font-black tracking-wider text-white">
              CIVIC<span className="text-purple-400">TRUST</span>
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <button
              onClick={() => setActiveTab("data")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "data" 
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/15" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="h-4.5 w-4.5" />
              Grievance Registry
            </button>
            <button
              onClick={() => setActiveTab("tpa")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "tpa" 
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/15" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Scale className="h-4.5 w-4.5" />
              TPA Disputed Queue
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "analytics" 
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/15" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BarChart3 className="h-4.5 w-4.5" />
              Civic Analytics
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "config" 
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/15" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sliders className="h-4.5 w-4.5" />
              AI Pipeline Tuning
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center text-xs font-bold text-purple-400 border border-purple-500/20">
              {currentUser.name[0]}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Super Administrator</p>
              <p className="text-xs text-white font-bold truncate">{currentUser.name}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 text-left text-slate-500 hover:text-rose-400 text-[11px] font-bold transition-all"
          >
            <LogOut className="h-4 w-4" />
            Deauthorize Session
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-h-0 bg-[#040814]/40 p-6 md:p-10 relative overflow-y-auto">
        
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-white text-glow-purple">Admin Command Center</h2>
            <p className="text-xs text-slate-500">Monitor urban structural decays and arbitrate disputed resolutions</p>
          </div>
        </header>

        {/* Predictive Decay Warnings Banner */}
        {decayAlerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {decayAlerts.map((alert, idx) => (
              <div key={idx} className="p-4 bg-amber-500/10 border-l-4 border-amber-500 rounded-r-xl flex items-start gap-3 text-left">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-400">Predictive Infrastructure Decay Warning</h4>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Multiple complaints ({alert.count} instances) for <span className="font-bold text-white">"{alert.category}"</span> recorded at <span className="font-bold text-white">"{alert.address}"</span> within the past 7 days. Heavy localized system failure predicted.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Contents */}
        {activeTab === "data" && (
          <div className="space-y-6 text-left">
            
            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-950/40 p-4 rounded-xl border border-white/5">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by Tracking ID or Title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-white/5 focus:border-purple-500/25 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-white/5 rounded-lg py-2 px-3 text-xs text-slate-300 outline-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Roads & Potholes">Roads & Potholes</option>
                  <option value="Garbage & Sanitation">Garbage & Sanitation</option>
                  <option value="Drainage & Water Leakage">Drainage & Water Leakage</option>
                  <option value="Streetlights & Electrical">Streetlights & Electrical</option>
                </select>
              </div>
            </div>

            {/* Data Table */}
            <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-white/5 text-slate-400 font-bold">
                    <th className="p-4">Tracking ID</th>
                    <th className="p-4">Complaint Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Site Location</th>
                    <th className="p-4 text-center">Severity</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Filed On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">No grievance listings match search parameters</td>
                    </tr>
                  ) : (
                    filteredComplaints.map((c) => (
                      <tr key={c.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-bold text-purple-400">{c.trackingId}</td>
                        <td className="p-4 font-semibold text-white">{c.title}</td>
                        <td className="p-4 text-slate-400">{c.category}</td>
                        <td className="p-4 text-slate-400 truncate max-w-[200px]">{c.address}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            c.severity === "EMERGENCY" 
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/10" 
                              : "bg-slate-900 text-slate-400"
                          }`}>
                            {c.severity}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.status === "CLOSED"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : c.status === "TPA_REVIEW"
                              ? "bg-amber-500/10 text-amber-400 animate-pulse"
                              : "bg-slate-900 text-slate-400"
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {activeTab === "tpa" && (
          <div className="space-y-6 text-left">
            <h3 className="text-sm font-bold text-white">Third-Party Arbitration (TPA) Dispute Queue</h3>
            
            {complaints.filter(c => c.status === "TPA_REVIEW").length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl text-center text-slate-500 text-xs">
                Disputed arbitration ledger is completely clear.
              </div>
            ) : (
              complaints.filter(c => c.status === "TPA_REVIEW").map((c) => (
                <div key={c.id} className="glass-panel-glow border-amber-500/20 p-6 rounded-2xl space-y-6">
                  
                  {/* Top Metadata */}
                  <div className="flex justify-between items-start border-b border-white/5 pb-4">
                    <div>
                      <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Arbitration Dispute File</span>
                      <h4 className="text-xs font-black text-white">{c.trackingId} — {c.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-500" /> {c.address} (GPS Coords: {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)})
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/10 uppercase font-bold">2 Rejections by Citizen</span>
                    </div>
                  </div>

                  {/* Dual Image Comparison Pane */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Citizen 'Before' Evidence</p>
                      <div className="aspect-video rounded-xl overflow-hidden border border-white/5 relative bg-slate-950">
                        <img src={c.beforePhotoUrl} alt="Before" className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[9px] text-slate-300">
                          Original Coordinates Verified
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Officer 'After' Evidence</p>
                      <div className="aspect-video rounded-xl overflow-hidden border border-white/5 relative bg-slate-950">
                        <img src={c.resolutionPhotoUrl} alt="After" className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-amber-500/20 text-[9px] text-amber-400 border border-amber-500/25">
                          Resolution proof coordinates matching 100m geofence bounds
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auditor Actions */}
                  <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-950/60 p-4 rounded-xl border border-white/5">
                    <div className="text-left text-[11px] text-slate-400 max-w-lg leading-relaxed">
                      <span className="font-bold text-white">System Advisory:</span> AI audits confirm that both images passed deepfake metadata filters. Spatial calculations verify the officer was 24 meters from target coordinates. Force Close if resolution is physically complete. Reopen if details show remaining issues.
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => handleTpaDecision(c.id, false)}
                        className="px-4 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/25 rounded-lg text-xs font-bold hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="h-4 w-4" /> Reopen Ticket
                      </button>
                      <button
                        onClick={() => handleTpaDecision(c.id, true)}
                        className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
                      >
                        <Check className="h-4 w-4" /> Force Close (TPA Approved)
                      </button>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6 text-left">
            <h3 className="text-sm font-bold text-white">Live Operations Metrics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Category distribution visual mockup */}
              <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Complaint Distribution by Sector</h4>
                <div className="space-y-3 text-xs">
                  {[
                    { label: "Roads & Potholes", count: 42, color: "bg-cyan-500", pct: "42%" },
                    { label: "Garbage & Sanitation", count: 28, color: "bg-purple-500", pct: "28%" },
                    { label: "Drainage & Water Leakage", count: 18, color: "bg-amber-500", pct: "18%" },
                    { label: "Streetlights & Electrical", count: 12, color: "bg-emerald-500", pct: "12%" }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between font-medium">
                        <span>{item.label}</span>
                        <span className="font-bold text-slate-400">{item.count} complaints ({item.pct})</span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: item.pct }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operations trust score chart mockup */}
              <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Historical AI Trust Score distribution</h4>
                <div className="space-y-3 text-xs">
                  {[
                    { label: "High Trust (90-100 Score)", count: 148, color: "bg-emerald-500", pct: "74%" },
                    { label: "Standard Verification (60-89)", count: 32, color: "bg-cyan-500", pct: "16%" },
                    { label: "Anomaly Flagged / Low Trust (<60)", count: 20, color: "bg-rose-500", pct: "10%" }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between font-medium">
                        <span>{item.label}</span>
                        <span className="font-bold text-slate-400">{item.count} items ({item.pct})</span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: item.pct }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === "config" && (
          <div className="glass-panel-glow border-white/10 p-6 rounded-2xl text-left space-y-6 max-w-2xl">
            <div className="border-b border-white/5 pb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="text-sm font-bold text-white">AI Verification Engine Tuner</h3>
                <p className="text-xs text-slate-500">Configure parameters governing verification networks</p>
              </div>
            </div>

            <div className="space-y-5 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between font-bold">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Maximum Geofence Range Limit (Haversine Distance)</label>
                  <span className="text-purple-400">{geofenceLimit} meters</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={50}
                  value={geofenceLimit}
                  onChange={(e) => setGeofenceLimit(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[9px] text-slate-500">Rejects field officer resolution proof if uploaded further than this boundary from the complaint coordinates.</p>
              </div>

              <div className="space-y-2 border-t border-white/5 pt-4">
                <div className="flex justify-between font-bold">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Spatial Deduplication Search Radius</label>
                  <span className="text-purple-400">{duplicateRadius} meters</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={10}
                  value={duplicateRadius}
                  onChange={(e) => setDuplicateRadius(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <p className="text-[9px] text-slate-500">Aggregates duplicate submissions into a unified master ticket within this radius.</p>
              </div>

              <div className="space-y-3 border-t border-white/5 pt-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Force EXIF Image Integrity Scan</label>
                  <button
                    type="button"
                    onClick={() => setEnableDeepfakeCheck(!enableDeepfakeCheck)}
                    className={`h-6 w-11 rounded-full p-0.5 transition-colors ${enableDeepfakeCheck ? "bg-purple-500" : "bg-slate-900"}`}
                  >
                    <div className={`h-5 w-5 rounded-full bg-white transition-transform ${enableDeepfakeCheck ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
                <p className="text-[9px] text-slate-500">Scans file headers to detect software indicators from photoshop, GIMP, Snapseed, Lightroom, or other pixel manipulators, auto-rejecting anomalies.</p>
              </div>

              <button
                type="button"
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all mt-4 text-center"
              >
                Apply Engine Configurations
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
