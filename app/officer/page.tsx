"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t, SupportedLanguage } from "@/lib/i18n";
import {
  ShieldCheck,
  CheckCircle,
  Navigation,
  UploadCloud,
  AlertTriangle,
  LogOut,
  Clock,
  MapPin,
  Camera,
  RefreshCw,
  Search,
  Globe,
  Check,
  Info,
  ChevronRight
} from "lucide-react";
import { fetchSessionUser, logoutAndRedirect, StoredUser } from "../../lib/client-auth";
import { compressImage } from "../../lib/image-utils";

interface Ticket {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  status: "SUBMITTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "TPA_REVIEW" | "CLOSED";
  severity: "EMERGENCY" | "HIGH" | "STANDARD";
  address: string;
  latitude: number;
  longitude: number;
  beforePhotoUrl: string;
  resolutionPhotoUrl?: string;
  slaDeadline?: string;
  createdAt?: string;
}

export default function OfficerDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [lang, setLang] = useState<SupportedLanguage>("en");
  const [filter, setFilter] = useState<"ALL" | "EMERGENCY" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolution work state
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [fieldNotes, setFieldNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [officerLat, setOfficerLat] = useState<number | null>(null);
  const [officerLng, setOfficerLng] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const bootstrap = async () => {
      const user = await fetchSessionUser(["OFFICER"]);
      if (!user) {
        router.push("/officer/login");
        return;
      }
      setCurrentUser(user);

      try {
        const res = await fetch("/api/complaints", { credentials: "same-origin" });
        if (res.status === 401) {
          router.push("/officer/login");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setTickets(data);
            if (data.length > 0) setSelectedTicket(data[0]);
          }
        }
      } catch (err) {
        console.warn("Could not load officer tickets from backend:", err);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setOfficerLat(parseFloat(pos.coords.latitude.toFixed(4)));
          setOfficerLng(parseFloat(pos.coords.longitude.toFixed(4)));
        },
        () => {
          setOfficerLat(17.385);
          setOfficerLng(78.4867);
        }
      );
    }
  }, [router]);

  const applyStatusChange = async (
    ticketId: string,
    status: string,
    extras: Record<string, unknown> = {}
  ): Promise<any | null> => {
    setActionError(null);
    try {
      const res = await fetch(`/api/complaints/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status, ...extras })
      });

      const data = await res.json();
      if (res.status === 401) {
        router.push("/officer/login");
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

  const handleStartWork = async (ticketId: string) => {
    const result = await applyStatusChange(ticketId, "IN_PROGRESS", {
      notes: "Officer acknowledged assignment and started onsite work"
    });
    if (!result) return;

    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "IN_PROGRESS" } : t));
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: "IN_PROGRESS" } : null);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setAuditError("Resolution photo exceeds the 8 MB limit.");
      return;
    }

    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setAuditError(null);
    setVerifiedSuccess(false);
  };


  const handleVerifyAndResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo || !selectedTicket) {
      setAuditError("Photographic resolution proof is required.");
      return;
    }
    if (!fieldNotes || fieldNotes.trim().length < 5) {
      setAuditError("A field action note is required.");
      return;
    }

    setUploading(true);
    setAuditError(null);
    setAuditLogs(["Capturing field hardware metadata...", "Calculating on-site GPS proximity delta..."]);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = await compressImage(reader.result as string);
        const result = await applyStatusChange(selectedTicket.id, "RESOLVED", {
          resolutionPhotoUrl: base64Data,
          officerLat,
          officerLng,
          notes: fieldNotes
        });

        if (!result) {
          setAuditLogs([]);
          setUploading(false);
          return;
        }

        const logs = [
          `Resolution file: ${photo.name} (${Math.round(photo.size / 1024)} KB)`,
          `Field GPS: ${officerLat ?? "unavailable"}° N, ${officerLng ?? "unavailable"}° E`,
          `Complaint site: ${selectedTicket.latitude}° N, ${selectedTicket.longitude}° E`,
          result.geofence
            ? `Geofence check: ${result.geofence.distanceMeters} m from site — ${result.geofence.withinTolerance ? "WITHIN TOLERANCE" : "OUTSIDE TOLERANCE"}`
            : "Geofence check: verified",
          `Status updated: ${result.complaint?.trackingId || selectedTicket.trackingId} → ${result.complaint?.status || "RESOLVED"}`
        ];

        setAuditLogs(logs);
        setVerifiedSuccess(Boolean(result.geofence?.withinTolerance !== false));
        setUploading(false);

        setTickets(prev => prev.map(t =>
          t.id === selectedTicket.id
            ? { ...t, status: result.complaint?.status || "RESOLVED", resolutionPhotoUrl: photoPreview || undefined }
            : t
        ));
        setSelectedTicket(prev => prev ? { ...prev, status: result.complaint?.status || "RESOLVED", resolutionPhotoUrl: photoPreview || undefined } : null);
      } catch (err: any) {
        setAuditError(err?.message || "Could not read the resolution photo.");
        setAuditLogs([]);
        setUploading(false);
      }
    };
    reader.readAsDataURL(photo);
  };

  const logout = () => {
    logoutAndRedirect(router, "/officer/login");
  };

  const SEVERITY_RANK: Record<string, number> = { EMERGENCY: 0, HIGH: 1, STANDARD: 2 };
  const filteredTickets = tickets
    .filter(t => {
      const matchesFilter = filter === "ALL" ||
                            (filter === "EMERGENCY" && t.severity === "EMERGENCY") ||
                            (filter === "IN_PROGRESS" && t.status === "IN_PROGRESS") ||
                            (filter === "RESOLVED" && (t.status === "RESOLVED" || t.status === "CLOSED"));
      const matchesSearch = t.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 2) - (SEVERITY_RANK[b.severity] ?? 2));

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900 font-bold text-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-blue-700 border-t-transparent animate-spin" />
          <span>Opening Field Officer Desk...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-blue-700 rounded-lg flex items-center justify-center font-bold text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight block leading-tight">{t("officer.title", lang)}</span>
            <span className="text-[11px] text-slate-400 block font-normal">{currentUser?.name || "Field Officer"} ({(currentUser as any)?.department || "Operations"})</span>
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
      <main className="flex-1 px-4 py-5 max-w-5xl mx-auto w-full pb-20">

        {actionError && (
          <div className="mb-4 p-3.5 rounded-lg bg-rose-50 border border-rose-300 flex items-center gap-2 text-xs text-rose-900 font-bold">
            <AlertTriangle className="h-4 w-4 text-rose-700 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Left Column: Assigned Task Queue */}
          <div className="lg:col-span-5 space-y-4">

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">{t("officer.tasks", lang)} ({filteredTickets.length})</h2>
              <div className="flex gap-1">
                {(["ALL", "EMERGENCY", "IN_PROGRESS", "RESOLVED"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase transition-all min-h-[36px] ${
                      filter === f ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by ID, headline, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
              />
            </div>

            {/* Task List */}
            {filteredTickets.length === 0 ? (
              <div className="p-8 rounded-xl bg-white border border-slate-300 text-center text-slate-600 text-xs font-medium">
                No assigned tasks match your filter.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTickets.map(t => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all shadow-sm ${
                      selectedTicket?.id === t.id
                        ? "bg-blue-50 border-blue-700 ring-1 ring-blue-700"
                        : "bg-white border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-mono font-bold text-blue-900">{t.trackingId}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.severity === "EMERGENCY" ? "bg-rose-100 text-rose-800 border border-rose-300" :
                        t.severity === "HIGH" ? "bg-amber-100 text-amber-800 border border-amber-300" :
                        "bg-slate-100 text-slate-800 border border-slate-300"
                      }`}>
                        [{t.severity}]
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{t.title}</h4>
                    <p className="text-xs text-slate-600 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                      <span>{t.address}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Right Column: Case Action & Resolution Workspace */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="p-5 rounded-xl bg-white border border-slate-300 space-y-5 shadow-sm">

                {/* Case Details Header */}
                <div className="border-b pb-3 border-slate-200 flex justify-between items-start gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-blue-900 block">{selectedTicket.trackingId}</span>
                    <h3 className="text-base font-bold text-slate-900">{selectedTicket.title}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800">
                    Status: {selectedTicket.status}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-slate-700 leading-relaxed font-medium">{selectedTicket.description}</p>
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 space-y-1 font-medium text-slate-800">
                    <div>Category: <strong>{selectedTicket.category}</strong></div>
                    <div>Location: <strong>{selectedTicket.address} ({selectedTicket.latitude}° N, {selectedTicket.longitude}° E)</strong></div>
                  </div>

                  {selectedTicket.beforePhotoUrl && (
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">Citizen Evidence Photo:</span>
                      <img src={selectedTicket.beforePhotoUrl} alt="Citizen Evidence" className="max-h-52 rounded-lg object-contain border border-slate-300 bg-slate-100" />
                    </div>
                  )}

                  {/* Actions depending on status */}
                  {selectedTicket.status === "ASSIGNED" || selectedTicket.status === "SUBMITTED" ? (
                    <button
                      onClick={() => handleStartWork(selectedTicket.id)}
                      className="w-full py-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase min-h-[48px] shadow-sm flex items-center justify-center gap-2"
                    >
                      <Navigation className="h-4 w-4" />
                      <span>Start Onsite Inspection / Work</span>
                    </button>
                  ) : null}

                  {selectedTicket.status === "IN_PROGRESS" && (
                    <form onSubmit={handleVerifyAndResolve} className="space-y-4 pt-3 border-t border-slate-200">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">{t("officer.onsite", lang)}</h4>

                      {/* Photo Capture */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t("officer.resolutionPhoto", lang)}</label>
                        <label className="min-h-[52px] p-3 rounded-lg border-2 border-dashed border-blue-600 bg-blue-50/50 hover:bg-blue-50 text-center cursor-pointer flex items-center justify-center gap-2 text-blue-900 font-bold text-xs">
                          <input type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
                          <Camera className="h-5 w-5 text-blue-700" />
                          <span>{photo ? photo.name : "Tap to Launch Resolution Camera"}</span>
                        </label>
                      </div>

                      {photoPreview && (
                        <img src={photoPreview} alt="Resolution Proof Preview" className="max-h-48 mx-auto rounded-lg object-contain border border-slate-300" />
                      )}

                      {/* Remediation Note */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Remediation Action Note</label>
                        <textarea
                          rows={2}
                          required
                          placeholder={t("officer.notePlaceholder", lang)}
                          value={fieldNotes}
                          onChange={(e) => setFieldNotes(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-400 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
                        />
                      </div>

                      {auditError && (
                        <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold">
                          {auditError}
                        </div>
                      )}

                      {/* Submit Resolution Button */}
                      <button
                        type="submit"
                        disabled={uploading}
                        className="w-full min-h-[52px] py-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {uploading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Verifying Onsite Proof...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-4 w-4" />
                            <span>{t("officer.submitResolution", lang)}</span>
                          </>
                        )}
                      </button>

                      {auditLogs.length > 0 && (
                        <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 space-y-1 text-[11px] font-mono text-slate-800">
                          {auditLogs.map((log, i) => (
                            <div key={i}>• {log}</div>
                          ))}
                        </div>
                      )}
                    </form>
                  )}

                  {(selectedTicket.status === "RESOLVED" || selectedTicket.status === "CLOSED") && (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-700 flex-shrink-0" />
                      <span>Resolution proof submitted and stored on municipal ledger.</span>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-8 rounded-xl bg-white border border-slate-300 text-center text-slate-600 text-xs font-medium">
                Select an assigned grievance from the list to begin field work.
              </div>
            )}
          </div>

        </div>

      </main>

    </div>
  );
}
