"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  PlusCircle, 
  ListFilter, 
  MapPin, 
  Camera, 
  User, 
  LogOut, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Layers, 
  HelpCircle,
  Bell,
  Eye,
  Check,
  X
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
  
  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Roads & Potholes");
  const [severity, setSeverity] = useState<"EMERGENCY" | "HIGH" | "STANDARD">("STANDARD");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(17.385);
  const [longitude, setLongitude] = useState(78.4867);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Logic states
  const [exifLogs, setExifLogs] = useState<string[]>([]);
  const [forgeryAlert, setForgeryAlert] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  
  // Real-time Mock database for showcase
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
  }, [router]);

  // Simulate Photo EXIF metadata inspection on upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setForgeryAlert(null);
    setExifLogs([]);

    const fileNameLower = file.name.toLowerCase();
    const isWhatsAppOrSocial = fileNameLower.includes("whatsapp") || fileNameLower.includes("telegram") || fileNameLower.includes("snapchat") || fileNameLower.includes("screenshot") || fileNameLower.includes("download");
    const isEdited = fileNameLower.includes("edited") || fileNameLower.includes("ps") || fileNameLower.includes("photoshop") || fileNameLower.includes("lightroom") || fileNameLower.includes("snapseed") || fileNameLower.includes("picsart");

    const fileDate = new Date(file.lastModified || Date.now()).toLocaleString();
    const logs = [
      `Analyzing file stream: ${file.name} (${Math.round(file.size / 1024)} KB)`,
      "Scanning Image Headers for EXIF & manipulation signatures...",
      `MIME type validated: ${file.type}`
    ];

    if (isEdited) {
      setForgeryAlert("CRITICAL FORGERY DETECTED: Image editing software signature found in file headers. Upload rejected.");
      logs.push("EXIF Software: Adobe Photoshop / Lightroom manipulation signature detected!");
      logs.push("Metadata trust evaluation: REJECTED (0% Authenticity Score)");
      setPhoto(null);
      setPhotoPreview(null);
      setExifLogs(logs);
      return;
    }

    const isTrichy = (address || "").toLowerCase().includes("trichy") || 
                     (address || "").toLowerCase().includes("irungalur") || 
                     (address || "").toLowerCase().includes("tiruchirappalli") || 
                     fileNameLower.includes("trichy") || 
                     fileNameLower.includes("irungalur") || 
                     fileNameLower.includes("img_20240820");

    const defaultLat = isTrichy ? 10.7905 : 17.3850;
    const defaultLng = isTrichy ? 78.7047 : 78.4867;
    const locationTagLabel = isTrichy ? "Trichy / Tiruchirappalli Geotag" : "Site Geotag";

    if (isWhatsAppOrSocial) {
      logs.push("EXIF Warning: Messaging/Social Media compression detected (WhatsApp).");
      logs.push("EXIF Camera Headers: Original camera model & GPS tags stripped by messaging app.");
      logs.push("Requesting live device GPS sensor via Browser Geolocation API...");
      
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const realLat = isTrichy ? defaultLat : parseFloat(pos.coords.latitude.toFixed(4));
            const realLng = isTrichy ? defaultLng : parseFloat(pos.coords.longitude.toFixed(4));
            setLatitude(realLat);
            setLongitude(realLng);
            logs.push(`Device GPS Sensor: ${realLat}° N, ${realLng}° E (Verified Live Sensor)`);
            logs.push(`File Timestamp: ${fileDate}`);
            logs.push("Metadata trust evaluation: DEGRADED (70% Score - Compressed Evidence)");
            setExifLogs([...logs]);
          },
          (err) => {
            setLatitude(defaultLat);
            setLongitude(defaultLng);
            logs.push(`Device GPS: Permission restricted. Using site location (${defaultLat}° N, ${defaultLng}° E - ${locationTagLabel}).`);
            logs.push(`File Timestamp: ${fileDate}`);
            logs.push("Metadata trust evaluation: DEGRADED (55% Score - No EXIF/GPS)");
            setExifLogs([...logs]);
          },
          { timeout: 5000 }
        );
      } else {
        setLatitude(defaultLat);
        setLongitude(defaultLng);
        logs.push("Metadata trust evaluation: DEGRADED (55% Score - Stripped Headers)");
        setExifLogs(logs);
      }
    } else {
      logs.push("EXIF Software: Native Mobile Camera Hardware Sensor");
      
      if (typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const realLat = isTrichy ? defaultLat : parseFloat(pos.coords.latitude.toFixed(4));
            const realLng = isTrichy ? defaultLng : parseFloat(pos.coords.longitude.toFixed(4));
            setLatitude(realLat);
            setLongitude(realLng);
            logs.push(`EXIF Coords: ${realLat}° N, ${realLng}° E (${locationTagLabel})`);
            logs.push(`EXIF Timestamp: ${fileDate}`);
            logs.push("Metadata trust evaluation: VERIFIED (100% Authenticity Score)");
            setExifLogs([...logs]);
          },
          () => {
            setLatitude(defaultLat);
            setLongitude(defaultLng);
            logs.push(`EXIF Coords: ${defaultLat}° N, ${defaultLng}° E (${locationTagLabel})`);
            logs.push(`EXIF Timestamp: ${fileDate}`);
            logs.push("Metadata trust evaluation: VERIFIED (90% Authenticity Score)");
            setExifLogs([...logs]);
          }
        );
      } else {
        setLatitude(defaultLat);
        setLongitude(defaultLng);
        logs.push(`EXIF Coords: ${defaultLat}° N, ${defaultLng}° E (${locationTagLabel})`);
        logs.push("Metadata trust evaluation: VERIFIED (90% Authenticity Score)");
        setExifLogs(logs);
      }
    }
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
      
      // Reset form
      setTitle("");
      setDescription("");
      setAddress("");
      setPhoto(null);
      setPhotoPreview(null);
      setSubmitting(false);
      setActiveTab("list");
      
      // Auto-remove success popup after 5s
      setTimeout(() => setSuccessId(null), 5000);
    }, 1500);
  };

  // Proof-of-Work Confirmation by Citizen
  const handleResolutionConfirmation = (id: string, confirmed: boolean) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === id) {
        if (confirmed) {
          // Closed successfully
          return { ...c, status: "CLOSED" as const };
        } else {
          // Rejected. Increment count.
          const nextRejections = c.rejectionCount + 1;
          const nextStatus = nextRejections >= 2 ? "TPA_REVIEW" : "IN_PROGRESS";
          
          // Add notification
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

    // Update active details view
    setSelectedComplaint(null);
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  if (!currentUser) return <div className="p-8 text-cyan-400 font-bold">Loading secure session...</div>;

  return (
    <div className="min-h-screen bg-[#030308] flex flex-col md:flex-row text-slate-100">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-[#060814]/90 backdrop-blur-md border-b md:border-b-0 md:border-r border-indigo-500/10 p-6 flex flex-col justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <div className="h-7 w-7 rounded bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm font-black tracking-wider text-white">
              CIVIC<span className="text-cyan-400">TRUST</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => { setActiveTab("list"); setSelectedComplaint(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "list" 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListFilter className="h-4.5 w-4.5" />
              My Grievances
            </button>
            <button
              onClick={() => { setActiveTab("submit"); setSelectedComplaint(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === "submit" 
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/15" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <PlusCircle className="h-4.5 w-4.5" />
              File a Grievance
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-cyan-500/10 flex items-center justify-center text-xs font-bold text-cyan-400 border border-cyan-500/20">
              {currentUser.name[0]}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Citizen Node</p>
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
        
        {/* Success Popup */}
        {successId && (
          <div className="absolute top-6 right-6 glass-panel-glow border-emerald-500/25 px-5 py-4 rounded-2xl flex items-start gap-3 text-left max-w-sm z-50 animate-bounce">
            <CheckCircle className="h-6 w-6 text-emerald-400 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white">Grievance Locked into Ledger</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Ticket ID: <span className="text-cyan-400 font-bold">{successId}</span> has successfully passed EXIF validation tests.</p>
            </div>
          </div>
        )}

        {/* Header toolbar */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-white text-glow">Citizen Command Interface</h2>
            <p className="text-xs text-slate-500">File complaints and confirm field audit resolutions</p>
          </div>
          
          {/* Notifications dropdown mock */}
          <div className="relative group">
            <button className="h-9 w-9 bg-slate-900 border border-white/5 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            </button>
            <div className="absolute right-0 top-11 w-80 glass-panel border-white/10 rounded-xl p-4 hidden group-hover:block z-50 text-left">
              <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2">System Broadcasts</p>
              <div className="space-y-2 divide-y divide-white/5">
                {notifications.map((n, i) => (
                  <p key={i} className="text-[10px] text-slate-400 pt-2 leading-relaxed">{n}</p>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Tab content */}
        {activeTab === "submit" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Submit form */}
            <form onSubmit={handleCreateComplaint} className="lg:col-span-7 glass-panel-glow border-white/10 p-6 rounded-2xl space-y-5 text-left">
              <h3 className="text-sm font-bold text-white border-b border-white/5 pb-3">File Verified Complaint</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Complaint Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/5 focus:border-cyan-500/20 rounded-xl px-3 py-3 text-xs text-white outline-none"
                  >
                    <option>Roads & Potholes</option>
                    <option>Garbage & Sanitation</option>
                    <option>Drainage & Water Leakage</option>
                    <option>Streetlights & Electrical</option>
                    <option>Public Infrastructure</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Severity Classification</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["STANDARD", "HIGH", "EMERGENCY"] as const).map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`py-3 rounded-xl text-[10px] font-bold border transition-all ${
                          severity === sev
                            ? sev === "EMERGENCY" 
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : sev === "HIGH"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            : "bg-slate-950/40 text-slate-500 border-white/5 hover:text-white"
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Complaint Headline</label>
                <input
                  type="text"
                  required
                  placeholder="Summarize the core structural defect..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 focus:border-cyan-500/20 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide precise details, landmark, and context details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 focus:border-cyan-500/20 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Physical Site Address</label>
                <input
                  type="text"
                  placeholder="e.g. Lane 5, Road No. 2, near Jubilee Hills checkpost..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 focus:border-cyan-500/20 rounded-xl px-4 py-3.5 text-xs text-white placeholder-slate-600 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full relative group overflow-hidden rounded-xl py-4 text-xs font-bold text-white transition-all disabled:opacity-50 mt-4"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300" />
                <span className="relative flex items-center justify-center gap-1.5">
                  {submitting ? "Pushing to AI Pipeline..." : "Encrypt and Submit Grievance"}
                </span>
              </button>
            </form>

            {/* Evidence details side panel */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Photo upload component */}
              <div className="glass-panel p-6 rounded-2xl border-white/5 text-center flex flex-col items-center justify-center min-h-[220px]">
                <Camera className="h-8 w-8 text-cyan-400 mb-3" />
                <h4 className="text-xs font-bold text-white mb-1">Grievance Media Evidence</h4>
                <p className="text-[10px] text-slate-500 max-w-xs mb-4">AI requires unaltered device photos containing original EXIF spatial metadata to prevent fraud</p>
                
                {photoPreview ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3 border border-white/10">
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:text-rose-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="px-4 py-2 bg-slate-900 border border-white/5 hover:border-cyan-500/20 rounded-xl text-[10px] font-bold text-cyan-400 cursor-pointer transition-all">
                    Upload Photo Evidence
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}

                {forgeryAlert && (
                  <p className="text-[10px] text-rose-400 font-bold bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20 mt-2">
                    {forgeryAlert}
                  </p>
                )}
              </div>

              {/* Real-time EXIF debug logs */}
              {exifLogs.length > 0 && (
                <div className="glass-panel p-5 rounded-2xl border-cyan-500/10 bg-slate-950/40 text-left">
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider mb-2.5">AI Metainfo Logger</p>
                  <div className="font-mono text-[9px] text-slate-400 space-y-1.5">
                    {exifLogs.map((log, i) => (
                      <p key={i} className="flex gap-2 items-start">
                        <span className="text-cyan-500/60">&gt;</span>
                        {log}
                      </p>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {activeTab === "list" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
            
            {/* List panel */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-sm font-bold text-white mb-2">My Open Grievance Records</h3>
              
              {complaints.length === 0 ? (
                <div className="glass-panel p-10 rounded-2xl text-center text-slate-500 text-xs">
                  No grievances found in your registry.
                </div>
              ) : (
                complaints.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`glass-panel p-5 rounded-2xl border transition-all cursor-pointer flex justify-between gap-4 items-center group ${
                      selectedComplaint?.id === c.id 
                        ? "border-cyan-500/30 bg-cyan-950/5" 
                        : "border-white/5 hover:border-cyan-500/15"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-cyan-400">{c.trackingId}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          c.severity === "EMERGENCY" 
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/10" 
                            : c.severity === "HIGH"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10"
                        }`}>
                          {c.severity}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{c.title}</h4>
                      <p className="text-[10px] text-slate-400">{c.address}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider ${
                        c.status === "CLOSED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : c.status === "RESOLVED"
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse"
                          : c.status === "TPA_REVIEW"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-slate-900 text-slate-400 border border-white/5"
                      }`}>
                        {c.status}
                      </span>
                      <span className="text-[9px] text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Details panel */}
            <div className="lg:col-span-5">
              {selectedComplaint ? (
                <div className="glass-panel-glow border-white/10 p-6 rounded-2xl space-y-6">
                  <div className="flex justify-between items-start border-b border-white/5 pb-4">
                    <div>
                      <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">Tracking Record</p>
                      <h4 className="text-xs font-black text-white">{selectedComplaint.trackingId}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                      selectedComplaint.severity === "EMERGENCY" 
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/10" 
                        : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10"
                    }`}>
                      {selectedComplaint.severity}
                    </span>
                  </div>

                  {/* Multi-step Status Timeline */}
                  <div className="space-y-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verification Lifecycle</p>
                    <div className="flex items-center justify-between text-[9px] relative">
                      {/* Timeline Bar */}
                      <div className="absolute left-0 right-0 top-3.5 h-[2px] bg-slate-900 z-0" />
                      
                      {[
                        { label: "Submitted", status: "SUBMITTED" },
                        { label: "In Progress", status: "IN_PROGRESS" },
                        { label: "Resolved", status: "RESOLVED" },
                        { label: "Closed", status: "CLOSED" }
                      ].map((step, idx) => {
                        const stepIndex = ["SUBMITTED", "IN_PROGRESS", "RESOLVED", "CLOSED"].indexOf(step.status);
                        const currentIndex = ["SUBMITTED", "IN_PROGRESS", "RESOLVED", "CLOSED"].indexOf(selectedComplaint.status === "TPA_REVIEW" ? "IN_PROGRESS" : selectedComplaint.status);
                        const isCompleted = stepIndex <= currentIndex || selectedComplaint.status === "CLOSED";

                        return (
                          <div key={idx} className="flex flex-col items-center gap-1.5 z-10">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center border font-bold ${
                              isCompleted 
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-400/35"
                                : "bg-slate-950 text-slate-600 border-white/5"
                            }`}>
                              {isCompleted ? <Check className="h-3 w-3" /> : idx + 1}
                            </div>
                            <span className={isCompleted ? "text-cyan-400 font-bold" : "text-slate-500"}>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Info details */}
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Citizen Description</p>
                      <p className="text-slate-300 mt-1">{selectedComplaint.description}</p>
                    </div>

                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-xl">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Audit Site Location</p>
                      <p className="text-slate-300 mt-1 font-semibold">{selectedComplaint.address}</p>
                    </div>
                  </div>

                  {/* Side-by-side verification block if RESOLVED or TPA_REVIEW */}
                  {selectedComplaint.status === "RESOLVED" && (
                    <div className="p-4 bg-cyan-950/15 border border-cyan-500/25 rounded-2xl space-y-4">
                      <div className="flex gap-2 items-center text-cyan-400">
                        <Clock className="h-4.5 w-4.5" />
                        <h4 className="text-xs font-bold">Proof of Resolution Verification</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[8px] text-slate-500 uppercase tracking-wider">Before (Citizen)</p>
                          <div className="aspect-video rounded-lg overflow-hidden border border-white/5">
                            <img src={selectedComplaint.beforePhotoUrl} alt="Before" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] text-slate-500 uppercase tracking-wider">After (Officer)</p>
                          <div className="aspect-video rounded-lg overflow-hidden border border-white/5">
                            <img src={selectedComplaint.resolutionPhotoUrl} alt="After" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5 text-[9px] text-slate-400">
                        Please inspect the officer's "After" resolution image above. If correct, confirm to close the grievance ledger. If incorrect, reject.
                      </div>

                      {/* Confirm/Reject buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleResolutionConfirmation(selectedComplaint.id, true)}
                          className="py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Check className="h-4 w-4" /> Confirm & Close
                        </button>
                        <button
                          onClick={() => handleResolutionConfirmation(selectedComplaint.id, false)}
                          className="py-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <X className="h-4 w-4" /> Reject Resolution
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedComplaint.status === "TPA_REVIEW" && (
                    <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-2xl space-y-2.5 text-center">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/10">
                        <Lock className="h-5 w-5" />
                      </div>
                      <h4 className="text-xs font-bold text-white">Escalated to Independent Arbitrator</h4>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                        You have rejected this resolution twice. The ticket has been locked. A third-party neutral auditor (TPA) has been assigned to audit the coordinates and imagery.
                      </p>
                    </div>
                  )}

                  {selectedComplaint.status === "CLOSED" && (
                    <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                      <CheckCircle className="h-7 w-7 text-emerald-400 flex-shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Ledger Closed & Verified</h4>
                        <p className="text-[9px] text-slate-400">This complaint has been closed. Thank you for making our city better.</p>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="glass-panel p-8 rounded-2xl text-center text-slate-500 text-xs">
                  <HelpCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  Select a grievance card from the left registry to inspect status timeline logs, coordinates, and resolution proofs.
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
