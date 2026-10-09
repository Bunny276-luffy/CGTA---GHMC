"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, ArrowLeft, CheckCircle, ShieldAlert, Award, AlertTriangle, TrendingUp, Layers } from "lucide-react";
import Link from "next/link";

interface PublicStats {
  complaints: {
    total: number;
    submitted: number;
    assigned: number;
    inProgress: number;
    resolved: number;
    tpaReview: number;
  };
  categories: { category: string; count: number }[];
  verification: {
    evidenceAudited: number;
    avgTrustScore: number;
    highTrust: number;
    lowTrust: number;
    duplicatesFlagged: number;
    manipulationFlagged: number;
  };
  generatedAt: string;
}

export default function PublicStatsPage() {
  const [data, setData] = useState<PublicStats | null>(null);
  const [dbUnavailable, setDbUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setDbUnavailable(false);
    try {
      const res = await fetch("/api/public/stats");
      if (res.ok) {
        setData(await res.json());
      } else if (res.status >= 500) {
        setDbUnavailable(true);
      }
    } catch {
      setDbUnavailable(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const complaints = data?.complaints;
  const verification = data?.verification;
  const categories = data?.categories ?? [];

  return (
    <div className="relative min-h-screen bg-[#0A0F1E] text-slate-100 flex flex-col">
      <div className="absolute top-[10%] left-[5%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <header className="border-b border-white/5 bg-[#0A0F1E]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="h-9 w-9 bg-slate-900 border border-white/5 hover:border-blue-500/20 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-gradient-to-tr from-blue-500 to-indigo-700 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-black tracking-wider text-white">
                CIVIC<span className="text-blue-400">TRUST</span>
              </span>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            dbUnavailable
              ? "text-rose-400 bg-rose-950/20 border-rose-500/20"
              : "text-indigo-400 bg-indigo-950/20 border-indigo-500/10"
          }`}>
            {dbUnavailable ? "Ledger Unavailable" : "Open Civic Data Ledger"}
          </span>
        </div>
      </header>

      <main className="flex-grow mx-auto max-w-7xl px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <div className="lg:col-span-7 space-y-8 text-left">

          <div>
            <h2 className="text-2xl font-black text-white text-glow">Public Transparency Ledger</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Live aggregate figures computed directly from the grievance ledger. When the ledger is
              empty, the figures below are zero — no placeholder statistics are shown.
            </p>
            <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
              CivicTrust is a project implementation modelled on the current GHMC 6-zone / 30-circle /
              150-ward administrative structure. It is not an official GHMC deployment.
            </p>
          </div>

          {dbUnavailable && (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-rose-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  DATABASE UNAVAILABLE — live statistics cannot be loaded. This page will not display
                  placeholder data.
                </span>
              </div>
              <button
                onClick={load}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold"
              >
                Retry Connection
              </button>
            </div>
          )}

          {!dbUnavailable && complaints && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-xl border-white/5 flex gap-3 items-center">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm text-slate-400">Total Grievances</h4>
                  <p className="text-lg font-black text-white mt-0.5">{complaints.total}</p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-xl border-white/5 flex gap-3 items-center">
                <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm text-slate-400">Resolved &amp; Closed</h4>
                  <p className="text-lg font-black text-white mt-0.5">{complaints.resolved}</p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-xl border-white/5 flex gap-3 items-center">
                <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm text-slate-400">In TPA Review</h4>
                  <p className="text-lg font-black text-white mt-0.5">{complaints.tpaReview}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status pipeline */}
          {!dbUnavailable && complaints && (
            <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  Grievance Lifecycle Distribution
                </span>
                <span className="text-[10px] text-slate-500">
                  Updated {new Date(data!.generatedAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="divide-y divide-white/5 text-xs">
                {[
                  { label: "Submitted (awaiting verification routing)", value: complaints.submitted },
                  { label: "Assigned to field officers", value: complaints.assigned },
                  { label: "In progress (field work underway)", value: complaints.inProgress },
                  { label: "Resolved / closed after confirmation", value: complaints.resolved },
                  { label: "Routed to third-party audit", value: complaints.tpaReview }
                ].map((row) => (
                  <div key={row.label} className="p-4 flex items-center justify-between text-slate-300">
                    <span>{row.label}</span>
                    <span className="font-mono font-black text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category breakdown */}
          {!dbUnavailable && (
            <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-blue-400" />
                  Grievances by Category
                </span>
              </div>
              {categories.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No grievances recorded yet. Categories will appear as citizens file verified reports.
                </div>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {categories.map((row) => (
                    <div key={row.category} className="p-4 flex items-center justify-between text-slate-300">
                      <span>{row.category}</span>
                      <span className="font-mono font-black text-white">{row.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="lg:col-span-5 space-y-6 text-left">

          {!dbUnavailable && verification && (
            <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Evidence Verification Integrity</h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  Aggregate output of the 13-stage verification engine across all submissions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Evidence Audited</span>
                  <span className="text-lg font-black font-mono text-white">{verification.evidenceAudited}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Avg Trust Score</span>
                  <span className="text-lg font-black font-mono text-indigo-400">{verification.avgTrustScore}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Duplicates Flagged</span>
                  <span className="text-lg font-black font-mono text-amber-400">{verification.duplicatesFlagged}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5">
                  <span className="text-[9px] font-mono uppercase text-slate-500 block">Manipulation Signals</span>
                  <span className="text-lg font-black font-mono text-rose-400">{verification.manipulationFlagged}</span>
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">How Verification Works</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Each submission passes through a 13-stage pipeline: file validation, image quality checks,
              EXIF metadata extraction, error-level analysis, GPS verification, GHMC boundary geofencing,
              timestamp consistency, OCR, object detection, duplicate detection (SHA-256 and perceptual
              hashing), context correlation, an evidence-based trust score, and an explainable report.
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              AI assists the assessment; it is not the authority. Manipulation signals are treated as
              indicators for human audit — never as automatic proof of fraud. Critical workflow decisions
              are governed by deterministic rules.
            </p>
          </div>

          {loading && (
            <div className="p-6 text-center text-xs text-slate-500 font-mono">Loading live ledger statistics…</div>
          )}

        </div>

      </main>
    </div>
  );
}
