"use client";

import React, { useState } from "react";
import { Search, Loader2, ShieldCheck, ShieldAlert, Calendar, MapPin, CheckCircle, ArrowRight } from "lucide-react";
import TiltCard from "./TiltCard";

interface TrackingResult {
  tracking_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  address: string;
  created_at: string;
  trust_score: number;
  forgery_score: number;
  duplicate_detected: boolean;
  explainable_report: string;
}

export default function CivicTracker() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/complaints/track?id=${query.trim()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Grievance record not found on ledger");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case "SUBMITTED": return 1;
      case "ASSIGNED": return 2;
      case "IN_PROGRESS": return 3;
      case "RESOLVED": return 4;
      case "CLOSED": return 5;
      default: return 1;
    }
  };

  const currentStep = result ? getStatusStep(result.status) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      
      {/* Search Input Card */}
      <TiltCard>
        <div className="glass-panel p-6 rounded-3xl border border-amber-500/10 bg-slate-950/45 text-left space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Verify On-Chain Grievance Ledger
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Enter any grievance tracking ID (e.g. <span className="text-amber-400">CGTA-2026-0001</span> or <span className="text-amber-400">CGTA-2026-0002</span>) to run a live telemetry integrity audit.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Enter Tracking ID (e.g. CGTA-YYYY-XXXX)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/60 border border-white/5 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/30 focus:bg-slate-900 transition-all uppercase"
              />
              <Search className="absolute right-4 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-bold uppercase font-mono tracking-wider flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Query Ledger"
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-mono flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      </TiltCard>

      {/* Audit Result Display */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch animate-fade-in-up">
          
          {/* Left Column: Complaint Details & Verification Progress */}
          <div className="md:col-span-7">
            <TiltCard className="h-full">
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-950/60 h-full flex flex-col justify-between space-y-6 text-left">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase">LEDGER DATA ENTRY</span>
                      <h4 className="text-xs font-mono font-bold text-white mt-0.5">{result.tracking_id}</h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {result.status}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white uppercase font-mono">{result.title}</h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                      {result.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[9px] font-mono text-slate-400 pt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{new Date(result.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span className="truncate" title={result.address}>{result.address}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Milestone Line */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">
                    Grievance Audit Lifecycle:
                  </span>
                  
                  <div className="flex items-center justify-between w-full relative">
                    <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-800 -translate-y-1/2 z-0" />
                    <div 
                      className="absolute top-1/2 left-0 h-[2px] bg-amber-500 -translate-y-1/2 z-0 transition-all duration-500" 
                      style={{ width: `${(currentStep - 1) * 25}%` }}
                    />

                    {[
                      { step: 1, label: "Uploaded" },
                      { step: 2, label: "Assigned" },
                      { step: 3, label: "Pending" },
                      { step: 4, label: "Resolved" },
                      { step: 5, label: "Sealed" }
                    ].map((s) => (
                      <div key={s.step} className="flex flex-col items-center relative z-10">
                        <div 
                          className={`h-6 w-6 rounded-full flex items-center justify-center border font-mono text-[9px] font-bold ${
                            currentStep >= s.step 
                              ? "bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20" 
                              : "bg-slate-950 border-slate-850 text-slate-500"
                          }`}
                        >
                          {s.step}
                        </div>
                        <span className={`text-[8px] font-mono mt-1.5 ${currentStep >= s.step ? "text-amber-400 font-bold" : "text-slate-500"}`}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </TiltCard>
          </div>

          {/* Right Column: AI Ledger Scorecard */}
          <div className="md:col-span-5">
            <TiltCard className="h-full">
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-950/20 h-full flex flex-col justify-between space-y-6 text-left">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
                      LEDGER TELEMETRY REPORT
                    </span>
                    <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" />
                  </div>

                  {/* Trust Score Radial Meter */}
                  <div className="py-2 flex flex-col items-center space-y-2">
                    <div className="relative h-24 w-24 flex items-center justify-center rounded-full border border-white/5 bg-slate-900/50">
                      <div className="absolute inset-2 rounded-full border border-dashed border-amber-500/20 animate-spin" style={{ animationDuration: "12s" }} />
                      <div className="text-center">
                        <span className="text-2xl font-black text-amber-400 font-mono">{result.trust_score}%</span>
                        <span className="text-[7px] text-slate-500 font-mono block uppercase">TRUST RATE</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[10px] font-mono border-b border-white/5 pb-1.5">
                      <span className="text-slate-400">GPS RANGE LOCK:</span>
                      <span className="text-emerald-400 font-bold">COMPLIANT</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono border-b border-white/5 pb-1.5">
                      <span className="text-slate-400">EXIF FORGERY INDEX:</span>
                      <span className={`font-bold ${result.forgery_score > 50 ? "text-red-400" : "text-emerald-400"}`}>
                        {result.forgery_score}%
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono border-b border-white/5 pb-1.5">
                      <span className="text-slate-400">DUPLICATE SPATIALS:</span>
                      <span className="text-emerald-400 font-bold">
                        {result.duplicate_detected ? "OVERLAP DETECTED" : "CLEAN"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Explainable AI report */}
                <div className="p-3.5 bg-slate-900/60 border border-white/5 rounded-2xl">
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">
                    Telemetry Scan Details:
                  </span>
                  <p className="text-[9px] text-slate-400 leading-normal font-mono mt-1">
                    {result.explainable_report}
                  </p>
                </div>

              </div>
            </TiltCard>
          </div>

        </div>
      )}

    </div>
  );
}
