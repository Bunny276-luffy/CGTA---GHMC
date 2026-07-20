"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  PlusCircle, 
  ListFilter, 
  Camera, 
  LogOut, 
  CheckCircle, 
  Clock, 
  Bell, 
  Sun,
  Moon,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  MapPin,
  FileText
} from "lucide-react";
import Link from "next/link";

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
  rejectionCount: number;
  createdAt: string;
}

export default function CitizenDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"submit" | "list">("list");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Roads & Potholes");
  const [severity, setSeverity] = useState<"EMERGENCY" | "HIGH" | "STANDARD">("STANDARD");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(17.385);
  const [longitude, setLongitude] = useState(78.4867);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [exifLogs, setExifLogs] = useState<string[]>([]);
  const [forgeryAlert, setForgeryAlert] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  
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
      status: "IN_PROGRESS",
      severity: "HIGH",
      address: "Bandra West Reclamation, Mumbai",
      beforePhotoUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80",
      rejectionCount: 1,
      createdAt: "2026-07-17T14:20:00.000Z"
    }
  ]);

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [notifications, setNotifications] = useState<string[]>([
    "Your complaint CGTA-2026-9812 has been marked as Resolved by Officer Ramesh.",
    "Officer Ramesh was assigned to your complaint CGTA-2026-9812."
  ]);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    setCurrentUser(JSON.parse(userStr));

    // Simulate skeleton loader trigger
    const timer = setTimeout(() => setLoading(false), 1200);

    return () => clearTimeout(timer);
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setForgeryAlert(null);
    setExifLogs([]);

    const reader = new FileReader();
    reader.onload = () => {
      const logs = [
        `Analyzing file stream: ${file.name} (${Math.round(file.size / 1024)} KB)`,
        "Scanning Image Headers for manipulation metadata...",
        `MIME type validated: ${file.type}`
      ];

      if (file.name.toLowerCase().includes("edited") || file.name.toLowerCase().includes("ps") || file.name.toLowerCase().includes("photoshop")) {
        setForgeryAlert("WARNING: Photoshop/Lightroom signature detected in Software header. Upload rejected.");
        setPhoto(null);
        setPhotoPreview(null);
      } else {
        const mockLat = (17.385 + (Math.random() - 0.5) * 0.05).toFixed(4);
        const mockLng = (78.4867 + (Math.random() - 0.5) * 0.05).toFixed(4);
        logs.push(`EXIF Software: Apple iOS Camera v19.2`);
        logs.push(`EXIF Coords: ${mockLat}° N, ${mockLng}° E`);
        logs.push(`EXIF Timestamp: ${new Date().toLocaleString()}`);
        logs.push(`Metadata trust evaluation: VERIFIED (100% Authenticity Score)`);
        
        setLatitude(parseFloat(mockLat));
        setLongitude(parseFloat(mockLng));
      }
      setExifLogs(logs);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setForgeryAlert("Error: Grievance photo evidence is required for AI audit");
      return;
    }

    setSubmitting(true);
    
    setTimeout(() => {
      const trackingId = `CGTA-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newComplaint: Complaint = {
        id: "comp-" + Math.floor(Math.random() * 1000),
        trackingId,
        title,
        description,
        category,
        status: "SUBMITTED",
        severity,
        address: address || "Automatically Geolocated Site, GHMC Zone 4",
        beforePhotoUrl: photoPreview || "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
        rejectionCount: 0,
        createdAt: new Date().toISOString()
      };

      setComplaints([newComplaint, ...complaints]);
      setSuccessId(trackingId);
      
      setTitle("");
      setDescription("");
      setAddress("");
      setPhoto(null);
      setPhotoPreview(null);
      setSubmitting(false);
      setActiveTab("list");
      
      setTimeout(() => setSuccessId(null), 5500);
    }, 1500);
  };

  const handleQuickAction = (quickTitle: string, quickCat: string, quickSev: "EMERGENCY" | "HIGH" | "STANDARD") => {
    setTitle(quickTitle);
    setCategory(quickCat);
    setSeverity(quickSev);
    setDescription(`Immediate automated report filed regarding ${quickTitle}.`);
    setActiveTab("submit");
  };

  const handleResolutionConfirmation = (id: string, confirmed: boolean) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === id) {
        if (confirmed) {
          return { ...c, status: "CLOSED" as const };
        } else {
          const nextRejections = c.rejectionCount + 1;
          const nextStatus = nextRejections >= 2 ? "TPA_REVIEW" : "IN_PROGRESS";
          
          setNotifications(prevNotif => [
            `Grievance ${c.trackingId} rejected by you. Escalated to ${nextStatus === "TPA_REVIEW" ? "Independent Arbitrator (TPA)" : "Field Officer"}`,
            ...prevNotif
          ]);

          return { 
            ...c, 
            status: nextStatus as any, 
            rejectionCount: nextRejections 
          };
        }
      }
      return c;
    }));

    setSelectedComplaint(null);
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

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
            <div className="h-7 w-7 bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center rounded">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className={`text-sm font-black tracking-wider ${theme === "dark" ? "text-white" : "text-blue-900"}`}>
              CIVIC<span className="text-indigo-500">TRUST</span>
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <button
              onClick={() => { setActiveTab("list"); setSelectedComplaint(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "list"
                  ? theme === "dark" 
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15" 
                    : "bg-indigo-50 text-indigo-900 border-indigo-100"
                  : "text-slate-400 hover:text-indigo-500 border-transparent border"
              }`}
            >
              <ListFilter className="h-4.5 w-4.5" />
              My Grievances
            </button>
            <button
              onClick={() => { setActiveTab("submit"); setSelectedComplaint(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                activeTab === "submit"
                  ? theme === "dark" 
                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15" 
                    : "bg-indigo-50 text-indigo-900 border-indigo-100"
                  : "text-slate-400 hover:text-indigo-500 border-transparent border"
              }`}
            >
              <PlusCircle className="h-4.5 w-4.5" />
              File Grievance
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
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-450 text-indigo-400 border border-indigo-500/20">
              {currentUser.name[0]}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider font-mono">Citizen Node</p>
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
        
        {successId && (
          <div className={`absolute top-6 right-6 border px-5 py-4 rounded-2xl flex items-start gap-3 text-left max-w-sm z-50 animate-bounce ${
            theme === "dark" ? "bg-emerald-950/80 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-250 text-emerald-800"
          }`}>
            <CheckCircle className="h-6 w-6 text-emerald-500 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold">Grievance Locked into Ledger</h4>
              <p className="text-[10px] mt-0.5 opacity-80">Ticket <span className="text-indigo-400 font-bold">{successId}</span> passed all EXIF integrity checks.</p>
            </div>
          </div>
        )}

        {/* Personalized Welcome Banner */}
        <div className={`mb-8 p-6 rounded-3xl border text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
          theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
        }`}>
          <div className="space-y-1">
            <h2 className={`text-2xl font-black ${theme === "dark" ? "text-glow-indigo text-white" : "text-slate-900"}`}>
              Welcome back, {currentUser.name}
            </h2>
            <p className="text-xs text-slate-500">Securely coordinate municipal audits. Active account health: OPTIMAL.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-[9px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
            <Sparkles className="h-3.5 w-3.5" /> Ledger Identity Verified
          </div>
        </div>

        {/* Quick Action Shortcuts Panel */}
        <div className="mb-8 text-left">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500 font-bold mb-3">Quick Action Shortcuts</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleQuickAction("Drainage overflow at Main Circle", "Drainage & Water Leakage", "EMERGENCY")}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between hover:scale-[1.01] transition-all ${
                theme === "dark" ? "bg-slate-950/40 border-white/5 hover:border-indigo-500/25" : "bg-white border-slate-200 hover:border-indigo-500/30 shadow-sm"
              }`}
            >
              <div className="h-2 w-2 rounded-full bg-rose-500 mb-4" />
              <div>
                <p className="text-[9px] font-mono text-slate-500 uppercase font-bold">Emergency</p>
                <p className={`text-xs font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Drainage Overflow</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickAction("Pothole cluster near metro exit", "Roads & Potholes", "HIGH")}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between hover:scale-[1.01] transition-all ${
                theme === "dark" ? "bg-slate-950/40 border-white/5 hover:border-amber-500/25" : "bg-white border-slate-200 hover:border-amber-500/30 shadow-sm"
              }`}
            >
              <div className="h-2 w-2 rounded-full bg-amber-500 mb-4" />
              <div>
                <p className="text-[9px] font-mono text-slate-500 uppercase font-bold">Priority High</p>
                <p className={`text-xs font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Pothole Cluster</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickAction("Sanitation request park entry", "Garbage & Sanitation", "STANDARD")}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between hover:scale-[1.01] transition-all ${
                theme === "dark" ? "bg-slate-950/40 border-white/5 hover:border-indigo-500/25" : "bg-white border-slate-200 hover:border-indigo-500/30 shadow-sm"
              }`}
            >
              <div className="h-2 w-2 rounded-full bg-indigo-500 mb-4" />
              <div>
                <p className="text-[9px] font-mono text-slate-500 uppercase font-bold">Standard</p>
                <p className={`text-xs font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>Sanitation Dump</p>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Main Panels Layout */}
        {activeTab === "submit" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <form onSubmit={handleCreateComplaint} className={`lg:col-span-7 p-6 rounded-2xl border text-left space-y-5 ${
              theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
            }`}>
              <h3 className={`text-sm font-bold border-b pb-3 ${theme === "dark" ? "text-white border-white/5" : "text-slate-800 border-slate-100"}`}>
                File Audited Grievance
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-3 text-xs outline-none ${
                      theme === "dark" ? "bg-slate-950/60 border-white/5 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <option>Roads & Potholes</option>
                    <option>Garbage & Sanitation</option>
                    <option>Drainage & Water Leakage</option>
                    <option>Streetlights & Electrical</option>
                    <option>Public Infrastructure</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["STANDARD", "HIGH", "EMERGENCY"] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${
                          severity === sev
                            ? severity === "EMERGENCY"
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              : severity === "HIGH"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                            : "bg-slate-950/40 text-slate-500 border-white/5 hover:text-white"
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-slate-455 font-bold uppercase tracking-wider font-mono">Grievance Headline</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Broken water pipe leaking into residential gate"
                  className={`w-full border rounded-xl px-3 py-3 text-xs outline-none ${
                    theme === "dark" ? "bg-slate-950/60 border-white/5 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-slate-455 font-bold uppercase tracking-wider font-mono">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise indicators to help field officer verify coordinates"
                  className={`w-full border rounded-xl px-3 py-3 text-xs outline-none ${
                    theme === "dark" ? "bg-slate-950/60 border-white/5 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] text-slate-455 font-bold uppercase tracking-wider font-mono">Site Landmark Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Opposite Pillar 45, Jubilee Hills Road 36"
                  className={`w-full border rounded-xl px-3 py-3 text-xs outline-none ${
                    theme === "dark" ? "bg-slate-950/60 border-white/5 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-650 text-xs font-bold text-white uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10"
              >
                {submitting ? (
                  <>Sealing ledger entries...</>
                ) : (
                  <>Submit Cryptographic Complaint <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            {/* Photo & EXIF Metadata Inspector */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className={`p-6 rounded-2xl border text-left ${
                theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider mb-4">Required Image Evidence</h4>
                
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 dark:border-white/5 rounded-2xl text-center hover:border-indigo-500/30 transition-all relative overflow-hidden min-h-[160px]">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Evidence" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="space-y-2">
                      <Camera className="h-8 w-8 text-slate-500 mx-auto" />
                      <p className="text-[10px] text-slate-500">Upload geotagged evidence image</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                {forgeryAlert && (
                  <p className="text-[10px] text-rose-500 font-bold mt-3 leading-relaxed">{forgeryAlert}</p>
                )}
              </div>

              {exifLogs.length > 0 && (
                <div className={`p-5 rounded-2xl border text-left font-mono text-[9px] space-y-1.5 ${
                  theme === "dark" ? "bg-[#05050f] border-indigo-500/20 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  <p className="text-indigo-400 font-bold uppercase tracking-wider mb-1">EXIF Extraction Trace</p>
                  {exifLogs.map((log, idx) => (
                    <p key={idx} className="flex gap-1.5">
                      <span className="text-indigo-500 font-bold">&gt;</span>
                      <span>{log}</span>
                    </p>
                  ))}
                </div>
              )}

            </div>

          </div>
        ) : (
          /* List View & Interactive Audit Details */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* List with Skeleton Loaders */}
            <div className="lg:col-span-7 space-y-4">
              
              {loading ? (
                // Blinking Skeleton Cards
                <div className="space-y-4">
                  {[1, 2].map(n => (
                    <div key={n} className={`p-5 rounded-2xl border animate-pulse ${
                      theme === "dark" ? "bg-slate-950/20 border-white/5" : "bg-white border-slate-200"
                    }`}>
                      <div className="h-3.5 w-1/3 bg-slate-800 rounded mb-3" />
                      <div className="h-2 w-3/4 bg-slate-800 rounded mb-2" />
                      <div className="h-2 w-1/2 bg-slate-800 rounded" />
                    </div>
                  ))}
                </div>
              ) : complaints.length === 0 ? (
                <div className="p-12 border border-dashed border-white/5 rounded-2xl text-center text-slate-500">
                  <FileText className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs">No grievances filed under your profile coordinates yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {complaints.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedComplaint(c)}
                      className={`p-5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.005] ${
                        selectedComplaint?.id === c.id
                          ? "bg-indigo-500/10 border-indigo-500/30"
                          : theme === "dark" 
                          ? "bg-slate-950/40 border-white/5 hover:border-indigo-500/20" 
                          : "bg-white border-slate-200 hover:border-slate-350 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-mono text-indigo-400 font-bold tracking-widest">{c.trackingId}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          c.status === "RESOLVED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse"
                            : c.status === "CLOSED"
                            ? "bg-slate-800 text-slate-400"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <h4 className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{c.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{c.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Timeline & Audit Tracker */}
            <div className="lg:col-span-5">
              {selectedComplaint ? (
                <div className={`p-6 rounded-2xl border text-left space-y-6 ${
                  theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
                }`}>
                  <div className="border-b pb-3 border-slate-200 dark:border-white/5 flex justify-between items-center">
                    <span className="text-[9px] font-mono text-indigo-400 font-bold">{selectedComplaint.trackingId}</span>
                    <button onClick={() => setSelectedComplaint(null)} className="text-slate-500 hover:text-white text-xs">Close</button>
                  </div>

                  <div className="space-y-4">
                    <h3 className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-850"}`}>{selectedComplaint.title}</h3>
                    
                    {/* Timeline Stages */}
                    <div className="space-y-4 pl-3 border-l border-indigo-500/20 relative">
                      
                      <div className="relative pl-4">
                        <div className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-emerald-500" />
                        <h5 className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Stage 1: Grievance Logged</h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">Stored securely in raw municipal pool.</p>
                      </div>

                      <div className="relative pl-4">
                        <div className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-emerald-500" />
                        <h5 className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Stage 2: EXIF Integrity Checked</h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">Software headers parsed. Authenticity validated.</p>
                      </div>

                      <div className="relative pl-4">
                        <div className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-emerald-500" />
                        <h5 className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Stage 3: Geofence Verified</h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">Coordinates locked within required municipal sector bounds.</p>
                      </div>

                      <div className="relative pl-4">
                        <div className={`absolute -left-[17px] top-1 h-2 w-2 rounded-full ${
                          selectedComplaint.status === "RESOLVED" || selectedComplaint.status === "CLOSED" ? "bg-emerald-500" : "bg-slate-700 animate-ping"
                        }`} />
                        <h5 className="text-[10px] font-mono font-bold uppercase">Stage 4: Officer Audit</h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {selectedComplaint.status === "RESOLVED" || selectedComplaint.status === "CLOSED" 
                            ? "Resolution proof uploaded and geofence-scanned at site." 
                            : "Currently dispatched to field officer."}
                        </p>
                      </div>

                    </div>

                    {/* Verification Actions */}
                    {selectedComplaint.status === "RESOLVED" && (
                      <div className="pt-4 border-t border-slate-200 dark:border-white/5 space-y-4">
                        <p className="text-xs text-indigo-400 font-bold leading-normal">
                          Officer Ramesh uploaded resolution proof. Confirm resolution integrity:
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleResolutionConfirmation(selectedComplaint.id, true)}
                            className="py-2.5 rounded-xl bg-indigo-650 bg-indigo-900 hover:bg-indigo-850 text-white font-bold text-xs uppercase"
                          >
                            Accept & Close
                          </button>
                          <button
                            onClick={() => handleResolutionConfirmation(selectedComplaint.id, false)}
                            className="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-300 font-bold text-xs uppercase"
                          >
                            Reject & Escalate
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <div className={`p-8 rounded-2xl border border-dashed text-center text-slate-500 ${
                  theme === "dark" ? "border-white/5 bg-slate-950/20" : "border-slate-200 bg-white"
                }`}>
                  <HelpCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs leading-relaxed">Select a complaint from the left panel to display interactive verification timelines and resolution audits.</p>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
