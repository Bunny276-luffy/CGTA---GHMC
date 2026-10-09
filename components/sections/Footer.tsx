"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Building2, Award, Lock } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-indigo-500/20 bg-[#070C18] relative z-15 text-left py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">

        {/* Brand & Government Authority Column (Spans 4 columns) */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <div className="h-full w-full rounded-md bg-[#0A0F1E] flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-xs font-black tracking-wider text-white font-mono uppercase block">
                CIVIC<span className="text-indigo-400">TRUST</span> (CGTA)
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Civic Grievance &amp; Accountability Platform</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-mono leading-relaxed max-w-xs">
            An evidence-backed civic grievance and accountability system with a 13-stage verification
            engine, role-based workflows, and a complete audit trail. Modelled on the current GHMC
            6-zone / 30-circle / 150-ward administrative structure.
          </p>

          <div className="pt-2 flex items-start gap-2 text-[9.5px] font-mono text-amber-400/90 max-w-xs">
            <Award className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>Prototype / project implementation — not an official GHMC or Government of Telangana deployment, and not certified by STQC or NIC.</span>
          </div>
        </div>

        {/* Links Column 1: Citizen Access */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest block border-b border-white/5 pb-1">Citizen Access</span>
          <ul className="space-y-2 text-slate-300">
            <li><Link href="/login" className="hover:text-indigo-400 transition-colors">Citizen Sign In</Link></li>
            <li><Link href="/register" className="hover:text-indigo-400 transition-colors">Create Account</Link></li>
            <li><Link href="/public-stats" className="hover:text-indigo-400 transition-colors">Public Statistics</Link></li>
          </ul>
        </div>

        {/* Links Column 2: Public Resources */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest block border-b border-white/5 pb-1">Resources</span>
          <ul className="space-y-2 text-slate-300">
            <li><Link href="/public-stats" className="hover:text-indigo-400 transition-colors">Public Statistics</Link></li>
            <li><Link href="/#platform-capabilities" className="hover:text-indigo-400 transition-colors">Verification Pipeline</Link></li>
            <li><Link href="/#faq" className="hover:text-indigo-400 transition-colors">Platform FAQ</Link></li>
            <li><Link href="/register" className="hover:text-indigo-400 transition-colors">File Grievance</Link></li>
          </ul>
        </div>

        {/* Links Column 3: Platform */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest block border-b border-white/5 pb-1">Platform</span>
          <ul className="space-y-2 text-slate-300">
            <li><Link href="/public-stats" className="hover:text-indigo-400 transition-colors">Public Statistics Ledger</Link></li>
            <li><Link href="/track" className="hover:text-indigo-400 transition-colors">Track a Grievance</Link></li>
            <li><Link href="/#platform-capabilities" className="hover:text-indigo-400 transition-colors">Verification Pipeline</Link></li>
            <li><Link href="/#faq" className="hover:text-indigo-400 transition-colors">Platform FAQ</Link></li>
          </ul>
        </div>

        {/* Legal & Support */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest block border-b border-white/5 pb-1">Legal & Support</span>
          <ul className="space-y-2 text-slate-300">
            <li><Link href="/privacy" className="hover:text-indigo-400 transition-colors">Privacy Notice</Link></li>
            <li><Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms of Use</Link></li>
            <li><Link href="/#faq" className="hover:text-indigo-400 transition-colors">Help & FAQ</Link></li>
          </ul>
          <p className="text-slate-500 leading-relaxed">
            For genuine municipal emergencies, use official government channels. This prototype does not operate an emergency helpline.
          </p>
        </div>

      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-slate-500 uppercase tracking-wider gap-3">
        <span>CivicTrust (CGTA) — project implementation. Not affiliated with GHMC.</span>
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-indigo-400" /> HttpOnly Session Auth • Role-Based Access • Audit Logged
        </span>
      </div>
    </footer>
  );
}
