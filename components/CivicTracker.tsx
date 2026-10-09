"use client";

import React, { useState } from "react";
import { Search, Loader2, ShieldCheck, ShieldAlert, Calendar, MapPin, CheckCircle, ArrowRight } from "lucide-react";

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
      <div className="p-6 rounded-xl border border-slate-300 bg-white text-left space-y-4 shadow-sm">
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Public Grievance Status Lookup
          </h3>
          <p className="text-xs text-slate-600 font-medium">
            Enter your official grievance tracking ID (e.g. <span className="font-mono text-blue-800 font-bold">CT-2026-XXXX</span>) to view resolution progress.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              required
              placeholder="e.g. CT-2026-1049"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-900 outline-none focus:border-blue-700"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase min-h-[46px] flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            <span>Lookup Status</span>
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold">
            {error}
          </div>
        )}
      </div>

      {/* Result Display */}
      {result && (
        <div className="p-6 rounded-xl border border-slate-300 bg-white text-left space-y-6 shadow-sm">
          <div className="flex justify-between items-start border-b pb-4 border-slate-200">
            <div>
              <span className="text-xs font-mono font-bold text-blue-900 block">{result.tracking_id}</span>
              <h3 className="text-base font-bold text-slate-900">{result.title}</h3>
            </div>
            <span className="px-3 py-1 rounded bg-slate-100 border border-slate-300 font-bold text-xs text-slate-800">
              {result.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-800">
            <div>Category: <strong>{result.category}</strong></div>
            <div>Location: <strong>{result.address}</strong></div>
            <div>Trust Score: <strong className="text-emerald-700">{result.trust_score}/100</strong></div>
            <div>Registered: <strong>{new Date(result.created_at).toLocaleDateString()}</strong></div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed p-3 bg-slate-50 border border-slate-200 rounded-lg">
            {result.explainable_report || result.description}
          </p>
        </div>
      )}

    </div>
  );
}
