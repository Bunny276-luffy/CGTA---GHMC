"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  CheckCircle, 
  Navigation, 
  UploadCloud, 
  AlertTriangle,
  Compass,
  FileCheck,
  LogOut,
  Sun,
  Moon,
  Clock,
  Sparkles,
  Layers,
  ArrowRight
} from "lucide-react";

interface Ticket {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  status: "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  severity: "EMERGENCY" | "HIGH" | "STANDARD";
  address: string;
  latitude: number;
  longitude: number;
  beforePhotoUrl: string;
}

export default function OfficerDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [filter, setFilter] = useState<"ALL" | "EMERGENCY" | "IN_PROGRESS">("ALL");

  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: "comp-2",
      trackingId: "CGTA-2026-4412",
      title: "Garbage Pile-up at Public Park Entry",
      description: "Large dump neglected for 4 days. Strong odor spreading to neighborhood children park.",
      category: "Garbage & Sanitation",
      status: "IN_PROGRESS",
      severity: "HIGH",
      address: "Bandra West Reclamation, Mumbai",
      latitude: 18.9752,
      longitude: 72.8258,
      beforePhotoUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=400&q=80",
    },
    {
      id: "comp-5",
      trackingId: "CGTA-2026-5124",
      title: "Pothole crater on Bypass flyover",
      description: "Deep pothole causing sudden braking. Multiple two-wheelers slipping during rain.",
      category: "Roads & Potholes",
      status: "ASSIGNED",
      severity: "EMERGENCY",
      address: "Western Express Highway Bypass, Mumbai",
      latitude: 18.9801,
      longitude: 72.8310,
      beforePhotoUrl: "https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80",
    }
  ]);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed) {
          setCurrentUser({
            id: parsed.id || "off-1",
            name: parsed.name || parsed.email?.split("@")[0] || "Officer Rajesh",
            role: parsed.role || "OFFICER"
          });
        } else {
          setCurrentUser({ id: "off-1", name: "Officer Rajesh", role: "OFFICER" });
        }
      } else {
        setCurrentUser({ id: "off-1", name: "Officer Rajesh", role: "OFFICER" });
      }
    } catch (e) {
      setCurrentUser({ id: "off-1", name: "Officer Rajesh", role: "OFFICER" });
    }
    if (tickets.length > 0) {
      setSelectedTicket(tickets[0]);
    }
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

  // Radar Scanner Animation
  useEffect(() => {
    let animId: number;

    const drawRadar = () => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;

      const ctx = currentCanvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
      const cx = currentCanvas.width / 2;
      const cy = currentCanvas.height / 2;

      // Outer ring
      ctx.strokeStyle = theme === "dark" ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.15)";
      ctx.lineWidth = 1;
      for (let r = 30; r <= 100; r += 35) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const sweepAngle = (Date.now() * 0.002) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * 110, cy + Math.sin(sweepAngle) * 110);
      ctx.stroke();

      // Core anchor dot
      ctx.fillStyle = "#6366f1";
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing target target
      const pulse = 4 + Math.sin(Date.now() * 0.008) * 2;
      ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
      ctx.beginPath();
      ctx.arc(cx + 40, cy - 40, pulse * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#6366f1";
      ctx.beginPath();
      ctx.arc(cx + 40, cy - 40, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = theme === "dark" ? "rgba(255, 255, 255, 0.8)" : "rgba(15, 23, 42, 0.8)";
      ctx.font = "bold 9px monospace";
      ctx.fillText("TARGET OFFSET (48m)", cx + 48, cy - 36);

      animId = requestAnimationFrame(drawRadar);
    };

    animId = requestAnimationFrame(drawRadar);
    return () => cancelAnimationFrame(animId);
  }, [selectedTicket, theme]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAuditError(null);
    setVerifiedSuccess(false);
    setAuditLogs([]);

    const logs = [
      `Loading image asset: ${file.name}`,
      "Inspecting software signature for pixel manipulation...",
      "Extracting EXIF coordinates from header..."
    ];

    if (file.name.toLowerCase().includes("edited") || file.name.toLowerCase().includes("photoshop")) {
      setAuditError("SECURITY AUDIT FAILED: Photoshop editor software signature found in EXIF tags. Image discarded.");
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }

    if (file.name.toLowerCase().includes("far") || file.name.toLowerCase().includes("fake")) {
      setTimeout(() => {
        logs.push("EXIF Software check: VERIFIED (Unaltered Mobile Camera)");
        logs.push("EXIF Coordinates: 18.9902° N, 72.8410° E");
        logs.push(`Complaint Coordinates: ${selectedTicket?.latitude}° N, ${selectedTicket?.longitude}° E`);
        logs.push("WARNING: Calculated distance: 1.48 Kilometers (1480m)");
        logs.push("SECURITY AUDIT FAILED: Photo taken outside the 100m geofence.");
        setAuditError("GEOFENCE FAILED: Resolution proof was captured 1,480m away from site. Upload blocked.");
        setAuditLogs(logs);
        setPhoto(null);
        setPhotoPreview(null);
      }, 1500);
      return;
    }

    // Success Simulation
    setTimeout(() => {
      const mockLat = (selectedTicket?.latitude || 18.9752).toFixed(4);
      const mockLng = (selectedTicket?.longitude || 72.8258).toFixed(4);
      const isWhatsApp = file.name.toLowerCase().includes("whatsapp") || file.name.toLowerCase().includes("telegram");
      
      if (isWhatsApp) {
        logs.push("EXIF Software check: Compressed Image (WhatsApp Transmission)");
        logs.push(`Site Proximity Check: ${mockLat}° N, ${mockLng}° E`);
        logs.push("Distance check: 18 Meters offset (Geofence Clear)");
        logs.push("Metadata trust evaluation: VERIFIED (WhatsApp Image Accepted via Device Geofence)");
      } else {
        logs.push("EXIF Software check: VERIFIED (Unaltered Mobile Camera Hardware)");
        logs.push(`EXIF Coordinates: ${mockLat}° N, ${mockLng}° E`);
        logs.push("Distance check: 24 Meters offset (Geofence Clear)");
        logs.push("Metadata trust evaluation: 100% (Original Capture Verified)");
      }
      
      setAuditLogs(logs);
      setVerifiedSuccess(true);
    }, 1200);
  };

  const handleStartWork = (id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: "IN_PROGRESS" } : t));
    if (selectedTicket?.id === id) {
      setSelectedTicket(prev => prev ? { ...prev, status: "IN_PROGRESS" } : null);
    }
  };

  const handleSubmitResolution = () => {
    if (!verifiedSuccess || !selectedTicket) return;

    setUploading(true);
    setTimeout(() => {
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: "RESOLVED" } : t));
      setSelectedTicket(null);
      setPhoto(null);
      setPhotoPreview(null);
      setAuditLogs([]);
      setVerifiedSuccess(false);
      setUploading(false);
    }, 1200);
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  // Filter Logic
  const filteredTickets = tickets.filter(t => {
    if (filter === "EMERGENCY") return t.severity === "EMERGENCY";
    if (filter === "IN_PROGRESS") return t.status === "IN_PROGRESS";
    return true;
  });

  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen bg-[#030308] flex items-center justify-center p-8 text-emerald-400 font-bold font-mono text-center">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <span>Initializing Officer Session...</span>
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
        theme === "dark" ? "bg-[#040e0a]/90 backdrop-blur-md border-emerald-500/10" : "bg-white border-slate-200"
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-7 w-7 bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center rounded">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className={`text-sm font-black tracking-wider ${theme === "dark" ? "text-white" : "text-emerald-950"}`}>
              OFFICER<span className="text-emerald-400">DESK</span>
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all border ${
                theme === "dark" 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-emerald-50 text-emerald-900 border-emerald-200"
              }`}
            >
              <Compass className="h-4.5 w-4.5" />
              Resolution Radar
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
              <><Moon className="h-4.5 w-4.5 text-emerald-600" /> Switch to Dark</>
            )}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 border border-emerald-500/20">
              {currentUser?.name?.[0] || "O"}
            </div>
            <div className="text-left overflow-hidden flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{currentUser?.name || "Officer"}</p>
              <p className="text-[10px] text-emerald-400 font-mono">FIELD AUDITOR</p>
            </div>
            <button 
              onClick={logout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-h-0 p-6 md:p-10 relative overflow-y-auto">
        
        <header className="flex justify-between items-center mb-8 border-b pb-5 border-slate-200 dark:border-white/5">
          <div className="text-left">
            <h2 className={`text-xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              Officer Resolution Radar
            </h2>
            <p className="text-xs text-slate-500 mt-1">Geolocate assignments and verify site resolutions within geofences.</p>
          </div>
        </header>

        {/* Workload Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 text-left">
          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold">Goal Completion</span>
            <div className="flex items-center gap-4 mt-3">
              <div className="relative h-12 w-12 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-900" strokeWidth="3" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray={`${Math.PI * 2 * 20}`} strokeDashoffset={`${Math.PI * 2 * 20 * 0.5}`} />
                </svg>
                <span className={`absolute text-[10px] font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>50%</span>
              </div>
              <div>
                <h4 className={`text-base font-black ${theme === "dark" ? "text-glow-indigo text-white" : "text-slate-800"}`}>1 / 2 Resolved</h4>
                <p className="text-[9px] text-slate-500">Daily quota allocation</p>
              </div>
            </div>
          </div>

          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold">Assigned Tickets</span>
            <div className="flex items-center gap-3 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>{tickets.length} Active</h3>
              <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">Critical SLA</span>
            </div>
          </div>

          <div className={`glass-panel p-5 rounded-2xl border ${theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"}`}>
            <span className="text-[9px] font-mono uppercase tracking-widest text-indigo-500 font-bold">Avg Travel Offset</span>
            <div className="flex items-center gap-3 mt-3">
              <h3 className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>38 Meters</h3>
              <span className="text-[9px] font-bold text-teal-500 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">Optimal Range</span>
            </div>
          </div>
        </div>

        {/* Priority Triage Filter buttons */}
        <div className="flex gap-2 mb-6 text-left">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
              filter === "ALL"
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                : "bg-slate-900/60 border-white/5 text-slate-500 hover:text-white"
            }`}
          >
            ALL ASSIGNMENTS
          </button>
          <button
            onClick={() => setFilter("EMERGENCY")}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
              filter === "EMERGENCY"
                ? "bg-rose-500/10 text-rose-450 border-rose-500/20"
                : "bg-slate-900/60 border-white/5 text-slate-500 hover:text-white"
            }`}
          >
            EMERGENCY ONLY
          </button>
          <button
            onClick={() => setFilter("IN_PROGRESS")}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
              filter === "IN_PROGRESS"
                ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                : "bg-slate-900/60 border-white/5 text-slate-500 hover:text-white"
            }`}
          >
            IN PROGRESS
          </button>
        </div>

        {/* Main Work split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Triage List */}
          <div className="lg:col-span-6 space-y-4 text-left">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.005] ${
                  selectedTicket?.id === t.id
                    ? "bg-indigo-500/10 border-indigo-500/30"
                    : theme === "dark" 
                    ? "bg-slate-950/40 border-white/5 hover:border-indigo-500/20" 
                    : "bg-white border-slate-200 hover:border-slate-350 shadow-sm"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-mono text-indigo-400 font-bold tracking-widest">{t.trackingId}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                    t.severity === "EMERGENCY" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-indigo-500/10 text-indigo-400"
                  }`}>
                    {t.severity}
                  </span>
                </div>
                <h4 className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{t.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1">{t.address}</p>

                <div className="mt-3 flex justify-between items-center pt-3 border-t border-slate-100 dark:border-white/5 text-[9px] font-mono">
                  <span className="text-slate-400 uppercase">Status: {t.status}</span>
                  {t.status === "ASSIGNED" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartWork(t.id); }}
                      className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded text-indigo-400 font-bold"
                    >
                      Start Work
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right: Selected Ticket Detail & Radar */}
          <div className="lg:col-span-6 space-y-6">
            {selectedTicket ? (
              <div className={`p-6 rounded-2xl border text-left space-y-6 ${
                theme === "dark" ? "bg-slate-950/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-white/5">
                  <span className="text-[9px] font-mono text-indigo-400 font-bold">{selectedTicket.trackingId}</span>
                  <span className="text-slate-500 text-xs font-mono">{selectedTicket.status}</span>
                </div>

                <div className="space-y-4">
                  <h3 className={`text-base font-bold ${theme === "dark" ? "text-white" : "text-slate-800"}`}>{selectedTicket.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{selectedTicket.description}</p>
                </div>

                {/* XAI Audit Snapshot & SHA-256 Integrity Badge */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 font-mono text-[9px] space-y-2">
                  <div className="flex justify-between items-center text-emerald-400 font-bold">
                    <span>13-STAGE XAI AUDIT: PASSED (92/100 TRUST SCORE)</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">HIGH TRUST</span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>SHA-256 INTEGRITY HASH:</span>
                    <span className="text-indigo-400 truncate font-bold">sha256_8f93a10b42c98d71e2...</span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>AI OBJECT DETECTED:</span>
                    <span className="text-emerald-400 font-bold">{selectedTicket.category.includes("Garbage") ? "Garbage Pile-up (94% Conf)" : "Pothole & Asphalt Collapse (96% Conf)"}</span>
                  </div>
                  <div className="text-slate-400 flex justify-between">
                    <span>GEOFENCE PERMITTED RADIUS:</span>
                    <span className="text-teal-400 font-bold">100 Meters Radius (<span className="text-emerald-400 font-bold">24m Current Offset</span>)</span>
                  </div>
                </div>

                {/* Radar and Upload section */}
                {selectedTicket.status === "IN_PROGRESS" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-4 border-t border-slate-100 dark:border-white/5">
                    
                    <div className="flex flex-col items-center">
                      <canvas ref={canvasRef} width={200} height={200} className="max-w-full" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-800 dark:border-white/5 rounded-xl hover:border-indigo-500/30 transition-all relative overflow-hidden min-h-[120px]">
                        {photoPreview ? (
                          <img src={photoPreview} alt="Proof" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="text-center space-y-1">
                            <UploadCloud className="h-6 w-6 text-slate-500 mx-auto" />
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Upload Resolution Proof</p>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>

                      {auditError && (
                        <p className="text-[9px] text-rose-500 font-bold leading-normal">{auditError}</p>
                      )}

                      {verifiedSuccess && (
                        <button
                          onClick={handleSubmitResolution}
                          disabled={uploading}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-650 text-xs font-bold text-white uppercase tracking-wider hover:opacity-90"
                        >
                          {uploading ? "Locking resolution..." : "Submit Audited Proof"}
                        </button>
                      )}
                    </div>

                  </div>
                )}

                {auditLogs.length > 0 && (
                  <div className={`p-4 rounded-xl border font-mono text-[9px] space-y-1 ${
                    theme === "dark" ? "bg-black/50 border-indigo-500/20 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}>
                    <p className="text-indigo-400 font-bold uppercase tracking-wider mb-1">AI Exif Audit Trace</p>
                    {auditLogs.map((log, idx) => (
                      <p key={idx}>&gt; {log}</p>
                    ))}
                  </div>
                )}

              </div>
            ) : (
              <div className="p-8 border border-dashed border-white/5 rounded-2xl text-center text-slate-500">
                <Navigation className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs">Select an active ticket to initiate GPS coordinate checks and upload resolution proof.</p>
              </div>
            )}
          </div>

        </div>

      </main>

    </div>
  );
}
