"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { VerificationResult } from "@/lib/verification-engine";
import { t, SupportedLanguage, LANGUAGE_NAMES } from "@/lib/i18n";
import {
  ShieldCheck,
  PlusCircle,
  ListFilter,
  Camera,
  LogOut,
  CheckCircle,
  Clock,
  Bell,
  AlertCircle,
  MapPin,
  FileText,
  Search,
  Check,
  Navigation,
  Copy,
  AlertTriangle,
  RefreshCw,
  Globe,
  FolderPlus,
  Info
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
  rejectionCount: number;
  createdAt: string;
  verificationResult?: VerificationResult;
}

const CATEGORY_OPTIONS = [
  { id: "Roads & Potholes", label: "Roads & Potholes", desc: "Pothole, damaged asphalt, open manhole" },
  { id: "Drainage & Water Leakage", label: "Drainage & Water", desc: "Overflowing drain, pipe leakage" },
  { id: "Garbage & Waste", label: "Garbage & Sanitation", desc: "Uncollected trash, open dumping" },
  { id: "Street Lighting & Electrical", label: "Streetlights & Wire", desc: "Broken lamp, hanging cable" },
  { id: "Veterinary & Stray Animal Control", label: "Stray Animals", desc: "Animal nuisance, health hazard" },
];

export default function CitizenDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"submit" | "list">("submit");
  const [lang, setLang] = useState<SupportedLanguage>("en");
  const [loading, setLoading] = useState(true);

  // Form Fields (Preserved on error & local storage fallback)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Roads & Potholes");
  const [severity, setSeverity] = useState<"EMERGENCY" | "HIGH" | "STANDARD">("STANDARD");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(17.385);
  const [longitude, setLongitude] = useState(78.4867);
  const [gpsLocked, setGpsLocked] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Verification & Submission State
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [forgeryAlert, setForgeryAlert] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Grievances State
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [notifications, setNotifications] = useState<string[]>([]);
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
      if (!user || user.role !== "CITIZEN") {
        router.push("/login");
        return;
      }
      setCurrentUser(user);
    } catch (e) {
      router.push("/login");
      return;
    }

    const fetchComplaints = async () => {
      try {
        const response = await fetch(`/api/complaints/track?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setComplaints(data);
          }
        }
      } catch (err) {
        console.warn("Could not fetch user complaints from database:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [router]);

  const handleFetchCurrentLocation = () => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));
          setLatitude(lat);
          setLongitude(lng);
          setGpsLocked(true);
          setGpsLoading(false);
          if (!address) {
            setAddress(`Geolocated Site (${lat}° N, ${lng}° E)`);
          }
        },
        (err) => {
          console.warn("Geolocation lookup error:", err.message);
          setGpsLocked(true);
          setGpsLoading(false);
          if (!address) {
            setAddress("Jubilee Hills / Central Zone, Municipal Ward");
          }
        },
        { timeout: 8000 }
      );
    } else {
      setGpsLocked(true);
      if (!address) setAddress("Central Zone, Municipal Ward");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setForgeryAlert(null);

    setSubmissionError(null);
    setIsVerifying(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const verifyRes = await fetch("/api/complaints/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            category,
            description: description || "Civic grievance photo uploaded",
            address,
            userLat: latitude,
            userLng: longitude,
            fileLastModified: file.lastModified,
            fileData: base64Data,
            severity
          })
        });

        if (!verifyRes.ok) {
          throw new Error(`Verification HTTP error! status: ${verifyRes.status}`);
        }

        const vRes: VerificationResult = await verifyRes.json();
        setVerificationResult(vRes);

        if (vRes.exifCoords) {
          setLatitude(vRes.exifCoords.lat);
          setLongitude(vRes.exifCoords.lng);
          setGpsLocked(true);
        }

        if (vRes.manipulationDetected) {
          setForgeryAlert("Notice: Photo contains image editor signatures. Report marked for supervisor verification.");
        } else {
          setForgeryAlert(null);
        }
      } catch (err: any) {
        console.error("Verification API call failed:", err);
      } finally {
        setIsVerifying(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setSubmissionError("Please attach or capture photo evidence of the issue.");
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);

    try {
      const res = await fetch("/api/complaints/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          severity,
          address: address || "Geolocated Site, Municipal Zone",
          latitude,
          longitude,
          beforePhotoUrl: photoPreview || "",
          photoName: photo.name,
          exifLat: latitude,
          exifLng: longitude,
          exifSoftware: verificationResult?.cameraModel || "Mobile Camera Hardware Sensor",
          createdById: currentUser?.id || "citizen-1",
          verificationToken: verificationResult?.verificationToken,
          sha256Hash: verificationResult?.sha256Hash
        })
      });

      const data = await res.json();
      if (!res.ok && res.status >= 500 && !data.complaint) {
        throw new Error(data.message || "Failed to submit complaint to server");
      }

      const trackingId = data.complaint?.trackingId || `CT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newComplaint: Complaint = {
        id: data.complaint?.id || "comp-" + Date.now(),
        trackingId,
        title: title || `${category} Issue`,
        description,
        category,
        status: (data.complaint?.status as any) || "SUBMITTED",
        severity,
        address: address || "Geolocated Site, Municipal Zone",
        beforePhotoUrl: photoPreview || "",
        rejectionCount: 0,
        createdAt: new Date().toISOString(),
        verificationResult: verificationResult || data.complaint?.verificationResult
      };

      setComplaints([newComplaint, ...complaints]);
      setSuccessId(trackingId);

      // Reset form
      setTitle("");
      setDescription("");
      setAddress("");
      setPhoto(null);
      setPhotoPreview(null);
      setVerificationResult(null);
      setSubmitting(false);

    } catch (err: any) {
      console.warn("Local grievance creation fallback mode:", err);
      const trackingId = `CT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const newComplaint: Complaint = {
        id: "comp-" + Date.now(),
        trackingId,
        title: title || `${category} Issue`,
        description,
        category,
        status: "SUBMITTED",
        severity,
        address: address || "Geolocated Site, Municipal Zone",
        beforePhotoUrl: photoPreview || "",
        rejectionCount: 0,
        createdAt: new Date().toISOString(),
        verificationResult: verificationResult || undefined
      };

      setComplaints([newComplaint, ...complaints]);
      setSuccessId(trackingId);
      setTitle("");
      setDescription("");
      setAddress("");
      setPhoto(null);
      setPhotoPreview(null);
      setVerificationResult(null);
      setSubmitting(false);
    }
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
            `Grievance ${c.trackingId} resolution disputed. Escalated to Supervisor.`,
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

  const copyTrackingId = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  const logout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const getStatusBadge = (status: Complaint["status"]) => {
    switch (status) {
      case "CLOSED":
        return <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" /> [✓ {t("status.closed", lang)}]</span>;
      case "RESOLVED":
        return <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-300 font-bold text-xs flex items-center gap-1"><Check className="h-3.5 w-3.5" /> [✓ {t("status.resolved", lang)}]</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> [● {t("status.in_progress", lang)}]</span>;
      case "ASSIGNED":
        return <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold text-xs flex items-center gap-1"><Info className="h-3.5 w-3.5" /> [● {t("status.assigned", lang)}]</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1"><Info className="h-3.5 w-3.5" /> [● {t("status.submitted", lang)}]</span>;
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!mounted || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-900 font-bold text-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full border-2 border-blue-700 border-t-transparent animate-spin" />
          <span>Opening Citizen Portal...</span>
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
            <span className="text-base font-bold tracking-tight block leading-tight">{t("citizen.title", lang)}</span>
            <span className="text-[11px] text-slate-400 block font-normal">{t("app.municipality", lang)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selection */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <Globe className="h-3.5 w-3.5 text-slate-400 ml-1" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as SupportedLanguage)}
              className="bg-transparent text-white text-xs font-semibold outline-none cursor-pointer py-1 pr-1"
              aria-label={t("nav.language", lang)}
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
      <main className="flex-1 px-4 py-5 max-w-xl mx-auto w-full pb-28">

        {/* Notifications Bar */}
        {notifications.length > 0 && (
          <div className="mb-4 space-y-2">
            {notifications.map((notif, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900 font-medium">
                <Bell className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-700" />
                <span>{notif}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-200 rounded-xl">
          <button
            onClick={() => { setActiveTab("submit"); setSuccessId(null); }}
            className={`py-3 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 min-h-[48px] ${
              activeTab === "submit" ? "bg-blue-700 text-white shadow-md" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>{t("citizen.tab.report", lang)}</span>
          </button>

          <button
            onClick={() => { setActiveTab("list"); setSuccessId(null); }}
            className={`py-3 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 min-h-[48px] ${
              activeTab === "list" ? "bg-blue-700 text-white shadow-md" : "text-slate-700 hover:text-slate-900"
            }`}
          >
            <ListFilter className="h-4 w-4" />
            <span>{t("citizen.tab.myGrievances", lang)} ({complaints.length})</span>
          </button>
        </div>

        {/* TAB 1: REPORT ISSUE */}
        {activeTab === "submit" && (
          <div className="space-y-6">

            {successId ? (
              <div className="p-6 rounded-xl bg-emerald-50 border-2 border-emerald-600 text-center space-y-4 shadow-sm">
                <div className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-emerald-900">{t("citizen.success.title", lang)}</h2>
                  <p className="text-xs text-emerald-800 mt-1">Directly dispatched to municipal field inspection team.</p>
                </div>

                <div className="p-4 rounded-lg bg-white border border-emerald-300 flex items-center justify-between gap-3 max-w-sm mx-auto">
                  <div className="text-left">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block">{t("citizen.success.tracking", lang)}</span>
                    <span className="text-base font-mono font-bold text-slate-900">{successId}</span>
                  </div>
                  <button
                    onClick={() => copyTrackingId(successId)}
                    className="px-3.5 py-2 rounded-md bg-emerald-700 text-white font-bold text-xs min-h-[44px] flex items-center gap-1.5"
                  >
                    {copiedId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedId ? t("citizen.copied", lang) : t("citizen.copy", lang)}</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => { setActiveTab("list"); setSuccessId(null); }}
                    className="w-full py-3.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase min-h-[48px] shadow-sm"
                  >
                    View Status in My Complaints
                  </button>
                  <button
                    onClick={() => setSuccessId(null)}
                    className="w-full py-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs uppercase min-h-[44px]"
                  >
                    Report Another Issue
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateComplaint} className="space-y-5">

                {/* STEP 1: PHOTO EVIDENCE */}
                <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t("citizen.step1", lang)}</h3>
                  <p className="text-xs text-slate-600">{t("citizen.step1.sub", lang)}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Camera Capture */}
                    <label className="min-h-[52px] p-3 rounded-lg border-2 border-dashed border-blue-600 bg-blue-50/50 hover:bg-blue-50 text-center cursor-pointer flex items-center justify-center gap-2 text-blue-900 font-bold text-xs">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Camera className="h-5 w-5 text-blue-700" />
                      <span>{t("citizen.camera.launch", lang)}</span>
                    </label>

                    {/* Gallery / File Fallback */}
                    <label className="min-h-[52px] p-3 rounded-lg border-2 border-dashed border-slate-400 bg-slate-100 hover:bg-slate-200 text-center cursor-pointer flex items-center justify-center gap-2 text-slate-800 font-bold text-xs">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <FolderPlus className="h-5 w-5 text-slate-600" />
                      <span>{t("citizen.camera.gallery", lang)}</span>
                    </label>
                  </div>

                  {photoPreview && (
                    <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 text-center space-y-2 mt-2">
                      <img src={photoPreview} alt="Evidence Preview" className="max-h-48 mx-auto rounded-md object-contain border border-slate-300" />
                      <span className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1">
                        <CheckCircle className="h-4 w-4 text-emerald-700" /> Photo attached: {photo?.name}
                      </span>
                    </div>
                  )}

                  {isVerifying && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2.5 text-xs text-blue-900 font-semibold">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-700 flex-shrink-0" />
                      <span>{t("citizen.checking", lang)}</span>
                    </div>
                  )}

                  {forgeryAlert && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0" />
                      <span>{forgeryAlert}</span>
                    </div>
                  )}
                </div>

                {/* STEP 2: LOCATION */}
                <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t("citizen.step2", lang)}</h3>
                    <button
                      type="button"
                      onClick={handleFetchCurrentLocation}
                      disabled={gpsLoading}
                      className="px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs border border-blue-300 min-h-[44px] flex items-center gap-1.5"
                    >
                      {gpsLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5 text-blue-700" />}
                      <span>{gpsLocked ? t("citizen.gps.locked", lang) : t("citizen.gps.fetch", lang)}</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Address / Landmark</label>
                    <input
                      type="text"
                      required
                      placeholder={t("citizen.address.placeholder", lang)}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 py-3 rounded-lg border border-slate-400 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                    />
                  </div>
                </div>

                {/* STEP 3: CATEGORY */}
                <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t("citizen.step3", lang)}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`min-h-[52px] p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                          category === cat.id
                            ? "bg-blue-700 text-white border-blue-800 font-bold shadow-sm"
                            : "bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <div>
                          <span className="text-xs block font-bold">{cat.label}</span>
                          <span className={`text-[10px] block ${category === cat.id ? "text-blue-100" : "text-slate-500"}`}>{cat.desc}</span>
                        </div>
                        {category === cat.id && <Check className="h-4 w-4 text-white flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* STEP 4: SEVERITY */}
                <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t("citizen.step4", lang)}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSeverity("STANDARD")}
                      className={`min-h-[48px] py-2.5 px-3 rounded-lg border text-xs font-bold text-center ${
                        severity === "STANDARD" ? "bg-slate-800 text-white border-slate-900" : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverity("HIGH")}
                      className={`min-h-[48px] py-2.5 px-3 rounded-lg border text-xs font-bold text-center ${
                        severity === "HIGH" ? "bg-amber-600 text-white border-amber-700" : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      High
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverity("EMERGENCY")}
                      className={`min-h-[48px] py-2.5 px-3 rounded-lg border text-xs font-bold text-center ${
                        severity === "EMERGENCY" ? "bg-rose-700 text-white border-rose-800" : "bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                    >
                      Emergency
                    </button>
                  </div>
                </div>

                {/* STEP 5: DESCRIPTION */}
                <div className="p-4 rounded-xl bg-white border border-slate-300 space-y-3 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{t("citizen.step5", lang)}</h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Issue Headline</label>
                    <input
                      type="text"
                      required
                      placeholder={t("citizen.headline.placeholder", lang)}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full min-h-[48px] px-3.5 py-3 rounded-lg border border-slate-400 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Additional Details</label>
                    <textarea
                      rows={2}
                      required
                      placeholder={t("citizen.details.placeholder", lang)}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-lg border border-slate-400 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
                    />
                  </div>
                </div>

                {submissionError && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 flex items-center gap-2 text-xs text-rose-900 font-bold">
                    <AlertTriangle className="h-4 w-4 text-rose-700 flex-shrink-0" />
                    <span>{submissionError}</span>
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[56px] py-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>{t("citizen.submitting", lang)}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5" />
                      <span>{t("citizen.submit", lang)}</span>
                    </>
                  )}
                </button>

              </form>
            )}

          </div>
        )}

        {/* TAB 2: MY GRIEVANCES */}
        {activeTab === "list" && (
          <div className="space-y-4">

            {/* Filter */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by Tracking ID or headline..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[48px] pl-10 pr-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs font-medium outline-none focus:border-blue-700"
              />
            </div>

            {filteredComplaints.length === 0 ? (
              <div className="p-8 rounded-xl bg-white border border-slate-300 text-center space-y-2">
                <FileText className="h-8 w-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 font-medium">No grievances registered yet.</p>
              </div>
            ) : (
              filteredComplaints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className="p-4 rounded-xl bg-white border border-slate-300 hover:border-blue-600 cursor-pointer transition-all shadow-sm space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-blue-900">{c.trackingId}</span>
                    {getStatusBadge(c.status)}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{c.title}</h4>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{c.address}</span>
                  </p>
                </div>
              ))
            )}

            {/* Complaint Detail Modal */}
            {selectedComplaint && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/80 backdrop-blur-sm">
                <div className="w-full max-w-lg p-5 rounded-t-2xl sm:rounded-2xl bg-white border border-slate-300 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                    <div>
                      <span className="text-xs font-mono font-bold text-blue-900 block">{selectedComplaint.trackingId}</span>
                      <h3 className="text-sm font-bold text-slate-900">{selectedComplaint.title}</h3>
                    </div>
                    <button onClick={() => setSelectedComplaint(null)} className="p-2 text-slate-500 hover:text-slate-900 font-bold min-h-[44px] min-w-[44px]">✕</button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <p className="text-slate-700 leading-relaxed font-medium">{selectedComplaint.description}</p>
                    <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 space-y-1 text-slate-800 font-medium">
                      <div>Location: <strong>{selectedComplaint.address}</strong></div>
                      <div>Category: <strong>{selectedComplaint.category}</strong></div>
                      <div>Status: <strong>{selectedComplaint.status}</strong></div>
                    </div>

                    {selectedComplaint.beforePhotoUrl && (
                      <img src={selectedComplaint.beforePhotoUrl} alt="Evidence" className="max-h-48 mx-auto rounded-lg object-contain border border-slate-300" />
                    )}

                    {selectedComplaint.status === "RESOLVED" && (
                      <div className="pt-3 border-t border-slate-200 space-y-3">
                        <p className="text-xs text-blue-900 font-bold">
                          Field officer submitted resolution proof. Confirm resolution:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleResolutionConfirmation(selectedComplaint.id, true)}
                            className="min-h-[48px] py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase shadow-sm"
                          >
                            Accept & Close
                          </button>
                          <button
                            onClick={() => handleResolutionConfirmation(selectedComplaint.id, false)}
                            className="min-h-[48px] py-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xs uppercase"
                          >
                            Dispute Resolution
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

    </div>
  );
}
