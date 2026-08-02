"use client";

import React from "react";
import { ShieldCheck, Cpu, Database, BellRing } from "lucide-react";
import AnimatedText from "../AnimatedText";
import TiltCard from "../TiltCard";

export default function AlternatingFeatures() {
  return (
    <section id="platform-capabilities" className="py-32 border-t border-white/5 bg-transparent relative z-15">
      <div className="mx-auto max-w-7xl px-6 space-y-24">
        
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <AnimatedText
            tag="h2"
            text="Engineered for Scale"
            className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-purple-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)] tracking-tight leading-tight font-sans"
          />
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            Discover the technical features built directly into our grievance redressal engine.
          </p>
        </div>

        {/* Feature Row 1: AI Image Forensics (Text Left, Graphic Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
          <div className="lg:col-span-6 space-y-6">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-indigo-300 uppercase font-mono">
              AI-Powered Image Forensics
            </h3>
            <p className="text-xs text-slate-350 font-mono leading-relaxed">
              CivicTrust audits image metadata headers dynamically, extracting EXIF tags, coordinates, and software modifications. Manipulated files from Photoshop or Lightroom are automatically flagged and routed to manual review.
            </p>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md">
              <TiltCard>
                <div className="glass-panel rounded-2xl border border-white/10 bg-slate-950/65 overflow-hidden text-left font-mono text-[8px] h-64 flex flex-col justify-between">
                  <div className="bg-slate-900/60 px-4 py-2 border-b border-white/5 flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#ff5f56]" />
                    <div className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                    <div className="h-2 w-2 rounded-full bg-[#27c93f]" />
                    <span className="text-[7.5px] text-slate-500 uppercase ml-2 tracking-widest">metadata_integrity.json</span>
                  </div>
                  <div className="p-4 space-y-1 text-slate-400 overflow-y-auto select-none leading-relaxed">
                    <div><span className="text-cyan-400">"device_source"</span>: <span className="text-emerald-400">"Apple iPhone 15 Pro"</span>,</div>
                    <div><span className="text-cyan-400">"gps_coordinates"</span>: &#123;</div>
                    <div className="pl-4"><span className="text-cyan-400">"latitude"</span>: <span className="text-white">17.38504</span>,</div>
                    <div className="pl-4"><span className="text-cyan-400">"longitude"</span>: <span className="text-white">78.48671</span>,</div>
                    <div className="pl-4"><span className="text-cyan-400">"precision_meters"</span>: <span className="text-white">11.2</span></div>
                    <div>&#125;,</div>
                    <div><span className="text-cyan-400">"editing_software_tags"</span>: <span className="text-emerald-400">"NONE"</span>,</div>
                    <div><span className="text-cyan-400">"image_hash_verification"</span>: <span className="text-emerald-400">"VALID"</span>,</div>
                    <div><span className="text-cyan-400">"integrity_score"</span>: <span className="text-white">0.984</span></div>
                  </div>
                  <div className="bg-slate-900/40 px-4 py-2 border-t border-white/5 text-slate-500 flex justify-between">
                    <span>EXIF_SCANNER: OK</span>
                    <span className="text-emerald-400">HASH VERIFIED</span>
                  </div>
                </div>
              </TiltCard>
            </div>
          </div>
        </div>

        {/* Feature Row 2: Smart Routing (Graphic Left, Text Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
          
          <div className="lg:col-span-6 order-last lg:order-first flex justify-center">
            <div className="w-full max-w-md">
              <TiltCard>
                <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-950/65 h-64 flex flex-col justify-between font-mono text-[8.5px] text-left select-none">
                  <div className="border-b border-white/5 pb-2 flex justify-between text-slate-500">
                    <span>DISPATCH GATEWAY</span>
                  <span className="text-blue-400">ROUTER: ON</span>
                  </div>
                  <div className="space-y-3 my-auto py-2">
                    <div className="p-2.5 bg-slate-900/60 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-white font-bold">ROADS WARD NODE</span>
                      </div>
                      <span className="text-slate-550">← INCIDENT #142 [ASSIGNED]</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/60 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-white font-bold">WASTE WARD NODE</span>
                      </div>
                      <span className="text-slate-550">← INCIDENT #088 [CONSOLIDATED]</span>
                    </div>
                    <div className="p-2.5 bg-slate-900/60 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                        <span className="text-white font-bold">LIGHTS WARD NODE</span>
                      </div>
                      <span className="text-slate-550">← INCIDENT #012 [TRIAGE]</span>
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-2 text-[7.5px] text-slate-500">
                    CLASSIFICATION ACCURACY INDEX: 99.4%
                  </div>
                </div>
              </TiltCard>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="h-9 w-9 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <BellRing className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white uppercase font-mono">
              Smart Department Routing
            </h3>
            <p className="text-xs text-slate-350 font-mono leading-relaxed">
              Once complaints pass AI telemetry checks, our classification module routes the report directly to the respective ward engineer console (e.g. Roads, Waste, Lights) with zero manual delay.
            </p>
          </div>
        </div>

        {/* Feature Row 3: Secure Ledger Storage (Text Left, Graphic Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center text-left">
          <div className="lg:col-span-6 space-y-6">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-white uppercase font-mono">
              Secure Ledger &amp; Trust Audit
            </h3>
            <p className="text-xs text-slate-350 font-mono leading-relaxed">
              Each action, verification score, and resolution signature is anchored on an immutable, public audit ledger. This allows citizens and administrative supervisors to verify complaint lifecycles without logins.
            </p>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md">
              <TiltCard>
                <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-950/65 h-64 flex flex-col justify-between font-mono text-[8px] text-left select-none">
                  <div className="border-b border-white/5 pb-2 flex justify-between text-slate-500">
                    <span>AUDIT LEDGER STREAM</span>
                    <span className="text-emerald-400">CHAIN SYNCED</span>
                  </div>
                  <div className="space-y-2.5 my-auto py-2">
                    <div className="p-2 bg-black/45 border border-white/5 rounded-lg flex justify-between items-center relative">
                      <div>
                        <div className="text-[7px] text-slate-500">BLOCK #14281</div>
                        <div className="text-white font-bold mt-0.5">TX_HASH: 0x8f2d...b4e9</div>
                      </div>
                      <span className="px-2 py-0.5 rounded uppercase text-[6.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SEALED</span>
                    </div>
                    <div className="p-2 bg-black/45 border border-white/5 rounded-lg flex justify-between items-center">
                      <div>
                        <div className="text-[7px] text-slate-500">BLOCK #14280</div>
                        <div className="text-white font-bold mt-0.5">TX_HASH: 0x4a9c...7f3d</div>
                      </div>
                      <span className="px-2 py-0.5 rounded uppercase text-[6.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SEALED</span>
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-2 text-slate-500 flex justify-between text-[7px]">
                    <span>LEDGER CORE COMPLIANCE: 100%</span>
                    <span>TPA ACCREDITED</span>
                  </div>
                </div>
              </TiltCard>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
