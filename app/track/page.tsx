"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Search } from "lucide-react";
import CivicTracker from "../../components/CivicTracker";

/**
 * Public grievance tracking page. Anyone with a tracking ID
 * (CGTA-YYYY-XXXX) can follow a grievance's verified lifecycle here —
 * no account required. Signed-in citizens manage their grievances
 * from the citizen portal.
 */
export default function TrackPage() {
  return (
    <div className="relative min-h-screen bg-[#0A0F1E] text-slate-100 flex flex-col">
      <div className="absolute top-[10%] left-[10%] h-[420px] w-[420px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <header className="border-b border-white/5 bg-[#0A0F1E]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="h-9 w-9 bg-slate-900 border border-white/5 hover:border-indigo-500/20 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all shadow-sm"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-indigo-600 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-black tracking-wider text-white">
                CIVIC<span className="text-indigo-400">TRUST</span>
              </span>
            </div>
          </div>
          <Link
            href="/citizen"
            className="ct-btn ct-btn-outline !min-h-0 py-2 text-[10px]"
          >
            <Search className="h-3.5 w-3.5" /> My Grievances
          </Link>
        </div>
      </header>

      <main className="flex-grow mx-auto max-w-5xl px-6 py-14 w-full space-y-10">
        <div className="space-y-3 text-left">
          <h1 className="text-2xl md:text-3xl font-black text-white">Track a Grievance</h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Enter the tracking ID issued when a grievance was filed (for example{" "}
            <span className="font-mono text-indigo-300">CGTA-2026-0000</span>) to see its verified
            lifecycle — status, evidence verdict, and audit details. Tracking is public and needs no
            account. To file or manage grievances, sign in to the citizen portal.
          </p>
        </div>

        <CivicTracker />
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-[10px] font-mono text-slate-500 uppercase tracking-wider">
        CivicTrust (CGTA) — project implementation. Not affiliated with GHMC.
      </footer>
    </div>
  );
}
