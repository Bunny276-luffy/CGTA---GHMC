"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, PhoneCall, Building2, Award, Lock, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-cyan-500/20 bg-[#020207] relative z-15 text-left py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">

        {/* Brand & Government Authority Column (Spans 4 columns) */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-500 p-[1px]">
              <div className="h-full w-full rounded-md bg-[#030308] flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="text-xs font-black tracking-wider text-white font-mono uppercase block">
                CIVIC<span className="text-cyan-400">TRUST</span> (CGTA)
              </span>
              <span className="text-[9px] text-slate-400 font-mono">Government of Telangana • GHMC Portal</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-mono leading-relaxed max-w-xs">
            Official Municipal Grievance & Geofenced Anti-Fraud Audit System powered by AI verification,
            verifying 150 GHMC municipal wards under the Municipal Administration & Urban Development Department.
          </p>

          <div className="pt-2 flex items-center gap-2 text-[9.5px] font-mono text-cyan-400">
            <Award className="h-3.5 w-3.5" />
            <span>STQC & NIC Security Certified Portal</span>
          </div>
        </div>

        {/* Links Column 1: Citizen Access */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest block border-b border-white/5 pb-1">Citizen Access</span>
          <ul className="space-y-2 text-slate-300">
            <li><Link href="/login" className="hover:text-cyan-400 transition-colors">Citizen Sign In</Link></li>
            <li><Link href="/register" className="hover:text-cyan-400 transition-colors">Create Account</Link></li>
            <li><Link href="/public-stats" className="hover:text-cyan-400 transition-colors">Public Statistics</Link></li>
          </ul>
        </div>

        {/* Links Column 2: Public Resources */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest block border-b border-white/5 pb-1">Resources</span>
          <ul className="space-y-2 text-slate-300">
            <li><a href="#map" className="hover:text-cyan-400 transition-colors">Live Ward Map</a></li>
            <li><a href="#how-it-works" className="hover:text-cyan-400 transition-colors">AI Audit Process</a></li>
            <li><a href="#faq" className="hover:text-cyan-400 transition-colors">Government FAQ</a></li>
            <li><Link href="/register" className="hover:text-cyan-400 transition-colors">File Grievance</Link></li>
          </ul>
        </div>

        {/* Links Column 3: Legal & Governance */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest block border-b border-white/5 pb-1">Governance</span>
          <ul className="space-y-2 text-slate-300">
            <li><a href="#" className="hover:text-cyan-400 transition-colors">GHMC Charter</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Right to Information (RTI)</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Data Privacy Policy</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Audit Disclosures</a></li>
          </ul>
        </div>

        {/* Emergency & Contact */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-400 font-bold uppercase tracking-widest block border-b border-white/5 pb-1">Helpline</span>
          <div className="space-y-2 text-slate-300">
            <p className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <PhoneCall className="h-3.5 w-3.5" /> 1100 (Toll-Free)
            </p>
            <p className="text-slate-400">040-21111111 (GHMC Control Room)</p>
            <p className="text-slate-500">CC Complex, Tank Bund Road, Hyderabad</p>
          </div>
        </div>

      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-slate-500 uppercase tracking-wider gap-3">
        <span>© 2026 Greater Hyderabad Municipal Corporation (GHMC). All rights reserved.</span>
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-cyan-400" /> SSL 256-Bit Encrypted Government Portal
        </span>
      </div>
    </footer>
  );
}
