"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import AnimatedText from "../AnimatedText";
import TiltCard from "../TiltCard";

export default function CallToAction() {
  return (
    <section className="py-32 border-t border-white/5 bg-transparent relative z-15 text-center">
      <div className="mx-auto max-w-5xl px-6">
        
        <TiltCard>
          <div className="glass-panel p-12 rounded-3xl border border-blue-500/20 bg-slate-950/75 relative overflow-hidden space-y-8 flex flex-col items-center">
            
            {/* Visual ambient glows inside card */}
            <div className="absolute -left-1/4 -top-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -right-1/4 -bottom-1/2 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />

            <div className="h-9 w-9 rounded-xl bg-blue-500/5 border border-blue-500/25 flex items-center justify-center text-blue-400 relative z-10">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>

            <div className="space-y-4 max-w-2xl relative z-10">
              <AnimatedText
                tag="h2"
                text="Build Smarter Cities with CivicTrust"
                className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-purple-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)] uppercase font-mono leading-tight"
              />
              <p className="text-xs text-slate-350 leading-relaxed font-mono">
                Join thousands of citizens and municipal administrators securing public accountability on an automated ledger.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 relative z-10 pt-4">
              <Link 
                href="/register" 
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-500/25 hover:scale-105 transition-all flex items-center gap-2"
              >
                Join Platform <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                href="/login" 
                className="px-8 py-4 bg-slate-900 border border-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all"
              >
                Sign In
              </Link>
            </div>

          </div>
        </TiltCard>

      </div>
    </section>
  );
}
