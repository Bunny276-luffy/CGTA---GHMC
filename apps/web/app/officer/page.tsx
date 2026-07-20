"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Map, 
  Camera, 
  User, 
  LogOut, 
  CheckCircle, 
  Navigation, 
  UploadCloud, 
  AlertTriangle,
  Compass,
  FileCheck
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
  
  // Audits & Checks
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // Radar Animation States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [radarPing, setRadarPing] = useState(0);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    setCurrentUser(JSON.parse(userStr));
    setSelectedTicket(tickets[0]);
  }, [router]);

  // Animated GPS radar scanner
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let radius = 0;

    const drawRadar = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw scanner grid rings
      ctx.strokeStyle = "rgba(16, 185, 129, 0.1)";
      ctx.lineWidth = 1;
      for (let r = 30; r <= 100; r += 35) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Radar Range indicator (100m Geofence range)
      ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw scanner sweep line
      const sweepAngle = (Date.now() * 0.002) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * 110, cy + Math.sin(sweepAngle) * 110);
      ctx.stroke();

      // Pulsing officer core location dot
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw pulsing target complaint dot within range
      const pulse = 4 + Math.sin(Date.now() * 0.008) * 2;
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
      ctx.beginPath();
      ctx.arc(cx + 40, cy - 40, pulse * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(cx + 40, cy - 40, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(16, 185, 129, 0.8)";
      ctx.font = "bold 9px system-ui";
      ctx.fillText("TARGET (48m away)", cx + 48, cy - 36);

      animId = requestAnimationFrame(drawRadar);
    };

    drawRadar();
    return () => cancelAnimationFrame(animId);
  }, [selectedTicket]);

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

    // Simulate checks:
    // Photoshop detection:
    if (file.name.toLowerCase().includes("edited") || file.name.toLowerCase().includes("photoshop")) {
      setAuditError("SECURITY AUDIT FAILED: Photoshop editor software signature found in EXIF tags. Image discarded.");
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }

    // Distance verification check (Haversine simulation):
    // Rejects if name includes "far"
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
      }, 1000);
      return;
    }

    // Verified success path
    setTimeout(() => {
      logs.push("EXIF Software check: VERIFIED (Unaltered Mobile Camera)");
      logs.push(`EXIF Coordinates: ${selectedTicket ? (selectedTicket.latitude + 0.0002).toFixed(4) : "18.9754"}° N, ${selectedTicket ? (selectedTicket.longitude - 0.0001).toFixed(4) : "72.8257"}° E`);
      logs.push("Calculated distance: 24 meters");
      logs.push("SECURITY AUDIT PASSED: Geofence bounds verified (< 100m)");
      logs.push("Trust score: 100% (Cryptographic Proof validated)");
      setAuditLogs(logs);
      setVerifiedSuccess(true);
    }, 1200);
  };

  const handleResolveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !photo || !verifiedSuccess) return;

    setUploading(true);
    setTimeout(() => {
      // Remove ticket or mark as resolved
      setTickets(prev => prev.map(t => {
        if (t.id === selectedTicket.id) {
          return { ...t, status: "RESOLVED" as const };
        }
        return t;
      }));

      setUploading(false);
      setPhoto(null);
      setPhotoPreview(null);
      setVerifiedSuccess(false);
      setAuditLogs([]);
      
      // Auto select next ticket if any
      const remaining = tickets.filter(t => t.id !== selectedTicket.id && t.status !== "RESOLVED");
      if (remaining.length > 0) {
        setSelectedTicket(remaining[0]);
      } else {
        setSelectedTicket(null);
      }
    }, 1500);
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!currentUser) return <div className="p-8 text-emerald-400 font-bold">Loading officer session...</div>;

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col md:flex-row text-slate-100">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-950/60 border-b md:border-b-0 md:border-r border-white/5 p-6 flex flex-col justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-7 w-7 rounded bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm font-black tracking-wider text-white">
              CIVIC<span className="text-emerald-400">TRUST</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/15"
            >
              <Navigation className="h-4.5 w-4.5" />
              My Assignments
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 border border-emerald-500/20">
              {currentUser.name[0]}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Field Officer</p>
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
            <h2 className="text-xl font-bold text-white text-glow-green">Officer Resolution Core</h2>
            <p className="text-xs text-slate-500">Geotag and verify physical task completions</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
          
          {/* Assignments list */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold text-white">Assigned Civic Grievances</h3>
            
            {tickets.filter(t => t.status !== "RESOLVED").length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl text-center text-slate-500 text-xs">
                All assignments resolved. Standard operation cleared.
              </div>
            ) : (
              tickets.filter(t => t.status !== "RESOLVED").map((t) => (
                <div
                  key={t.id}
                  onClick={() => { setSelectedTicket(t); setPhoto(null); setPhotoPreview(null); setVerifiedSuccess(false); setAuditLogs([]); setAuditError(null); }}
                  className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer flex justify-between gap-4 items-center group ${
                    selectedTicket?.id === t.id 
                      ? "border-emerald-500/30 bg-emerald-950/5" 
                      : "border-white/5 hover:border-emerald-500/15"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-emerald-400">{t.trackingId}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        t.severity === "EMERGENCY" 
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/10 animate-pulse" 
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                      }`}>
                        {t.severity}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">{t.title}</h4>
                    <p className="text-[10px] text-slate-400">{t.address}</p>
                  </div>

                  <span className="px-2 py-1 rounded bg-slate-900 text-slate-400 border border-white/5 text-[9px] font-bold tracking-wider">
                    {t.status}
                  </span>
                </div>
              ))
            )}

            {/* Resolved History */}
            {tickets.filter(t => t.status === "RESOLVED").length > 0 && (
              <div className="pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400">Recently Resolved Tasks</h4>
                {tickets.filter(t => t.status === "RESOLVED").map((t) => (
                  <div key={t.id} className="glass-panel p-4 rounded-xl border-white/5 opacity-55 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-300">{t.trackingId} - {t.title}</p>
                      <p className="text-[10px] text-slate-500">{t.address}</p>
                    </div>
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Awaiting Confirmation
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification Audit side panel */}
          <div className="lg:col-span-5">
            {selectedTicket ? (
              <div className="glass-panel-glow border-white/10 p-6 rounded-2xl space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Active Task Details</p>
                  <h4 className="text-xs font-black text-white">{selectedTicket.trackingId}</h4>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{selectedTicket.description}</p>
                </div>

                {/* Animated GPS Geofence Radar */}
                <div className="flex flex-col items-center justify-center bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                  <canvas ref={canvasRef} width={200} height={200} />
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-emerald-400 font-mono">
                    <Compass className="h-4 w-4 animate-spin" />
                    GPS SIGNAL ACTIVE: DUAL SYNC ON WARD GEOFENCE
                  </div>
                </div>

                {/* Upload Resolution */}
                <form onSubmit={handleResolveTicket} className="space-y-4">
                  <div className="glass-panel p-5 rounded-xl border-white/5 text-center flex flex-col items-center justify-center relative min-h-[140px]">
                    <UploadCloud className="h-7 w-7 text-emerald-400 mb-2" />
                    <span className="text-xs font-bold text-white mb-1">Capture Resolution Photo</span>
                    <p className="text-[9px] text-slate-500 mb-3">Ensure you are standing within 100m of the site coordinates</p>
                    
                    {photoPreview ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-white/10">
                        <img src={photoPreview} alt="Resolution" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setPhoto(null); setPhotoPreview(null); setVerifiedSuccess(false); setAuditLogs([]); setAuditError(null); }}
                          className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="px-4 py-2 bg-slate-900 border border-white/5 hover:border-emerald-500/20 rounded-lg text-[9px] font-bold text-emerald-400 cursor-pointer transition-all">
                        Upload 'After' Photo
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                    )}
                  </div>

                  {auditError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold flex gap-2 items-start">
                      <AlertTriangle className="h-4.5 w-4.5 flex-shrink-0 mt-0.5" />
                      <p>{auditError}</p>
                    </div>
                  )}

                  {auditLogs.length > 0 && (
                    <div className="p-4 bg-slate-950/60 border border-white/5 rounded-xl text-left">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileCheck className="h-4 w-4" /> EXIF Geofence Log
                      </p>
                      <div className="font-mono text-[9px] text-slate-400 space-y-1">
                        {auditLogs.map((log, i) => (
                          <p key={i} className="flex gap-1.5 items-start">
                            <span className="text-emerald-500/55">&gt;</span>
                            {log}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploading || !verifiedSuccess}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {uploading ? "Locking resolved state..." : "Lock Resolved State & Upload"}
                  </button>
                </form>

              </div>
            ) : (
              <div className="glass-panel p-8 rounded-2xl text-center text-slate-500 text-xs">
                Select an assigned grievance card from the left panel to activate the Geofence Radar scanner and upload resolution proof.
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}

// Inline close icon fallback helper
function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
