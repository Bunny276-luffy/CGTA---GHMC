"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Github, Twitter, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#030308]/60 backdrop-blur-md relative z-15 text-left py-16">
      <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-12 gap-10">
        
        {/* Brand Column (Spans 4 columns) */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-500 p-[1px]">
              <div className="h-full w-full rounded-md bg-[#030308] flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <span className="text-xs font-black tracking-wider text-white font-mono uppercase">
              CIVIC<span className="text-cyan-400">TRUST</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-relaxed max-w-xs">
            Autonomous municipal audit core mapping grievance coordinate telemetry, photo EXIF compliance, and resolution proof on public ledgers.
          </p>
        </div>

        {/* Links Column 1: Platform (Spans 2 columns) */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-500 font-bold uppercase tracking-widest block">Platform</span>
          <ul className="space-y-2 text-slate-400">
            <li><a href="#map" className="hover:text-cyan-400 transition-colors">Audit Map</a></li>
            <li><a href="#pipeline" className="hover:text-cyan-400 transition-colors">AI Pipeline</a></li>
            <li><a href="#tracker" className="hover:text-cyan-400 transition-colors">Ledger Tracker</a></li>
            <li><a href="#analytics" className="hover:text-cyan-400 transition-colors">Analytics</a></li>
          </ul>
        </div>

        {/* Links Column 2: Resources (Spans 2 columns) */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-500 font-bold uppercase tracking-widest block">Resources</span>
          <ul className="space-y-2 text-slate-400">
            <li><a href="#faq" className="hover:text-cyan-400 transition-colors">F.A.Q</a></li>
            <li><Link href="/login" className="hover:text-cyan-400 transition-colors">Officer login</Link></li>
            <li><Link href="/register" className="hover:text-cyan-400 transition-colors">Citizen registration</Link></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">API Docs</a></li>
          </ul>
        </div>

        {/* Links Column 3: Legal (Spans 2 columns) */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-500 font-bold uppercase tracking-widest block">Legal</span>
          <ul className="space-y-2 text-slate-400">
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Ledger Rules</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Disclosures</a></li>
          </ul>
        </div>

        {/* Social / Contact (Spans 2 columns) */}
        <div className="md:col-span-2 space-y-3 font-mono text-[9px]">
          <span className="text-slate-500 font-bold uppercase tracking-widest block">Connect</span>
          <div className="flex gap-3 text-slate-400">
            <a href="#" className="hover:text-cyan-400 transition-all hover:scale-110">
              <Github className="h-4.5 w-4.5" />
            </a>
            <a href="#" className="hover:text-cyan-400 transition-all hover:scale-110">
              <Twitter className="h-4.5 w-4.5" />
            </a>
            <a href="#" className="hover:text-cyan-400 transition-all hover:scale-110">
              <Globe className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>

      </div>

      <div className="mx-auto max-w-7xl px-6 border-t border-white/5 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center text-[8px] font-mono text-slate-500 uppercase tracking-wider gap-4">
        <span>© 2026 CivicTrust (CGTA) Ledger Project. All rights reserved.</span>
        <span>Secure cryptographic geofencing.</span>
      </div>
    </footer>
  );
}
