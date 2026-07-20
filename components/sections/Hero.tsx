"use client";

import React from "react";
import Link from "next/link";
import { Users, UserCheck, ArrowRight } from "lucide-react";
import AnimatedText from "../AnimatedText";
import ThreeDHeroBackground from "../ThreeDHeroBackground";

export default function HeroSection() {
  return (
    <section className="relative mx-auto max-w-5xl px-6 pt-36 pb-24 text-center min-h-[75vh] flex flex-col items-center justify-center bg-transparent z-10">
      
      {/* Center 3D Gyroscopic Reactor Background */}
      <ThreeDHeroBackground />

      {/* Ambient background glow centered behind hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-emerald-500/5 blur-3xl opacity-40 pointer-events-none" />

      <div className="space-y-8 w-full max-w-3xl flex flex-col items-center">
        
        {/* Headline - Premium, meaningful sans-serif text */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-tight max-w-3xl font-sans">
          Empowering Citizens. <br />
          <span className="relative inline-block bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent pb-1">
            Restoring Public Trust.
          </span>
        </h1>

        {/* Description - Clear, meaningful public-facing statement in sans-serif */}
        <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl font-sans">
          CivicTrust is a modern, transparent civic grievance platform that ensures every citizen's voice is heard, every community issue is verified by AI, and every municipal resolution is tracked in real-time.
        </p>

        {/* Centered CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link 
            href="/register" 
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition-all flex items-center gap-2 font-sans"
          >
            Report an Issue <ArrowRight className="h-4 w-4" />
          </Link>
          <a 
            href="#map" 
            className="px-8 py-4 bg-slate-900/60 border border-white/5 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all flex items-center gap-2 font-sans"
          >
            View Live Audits
          </a>
        </div>

        {/* Centered Quick Access Portal Buttons */}
        <div className="pt-8 border-t border-white/5 space-y-3 w-full max-w-lg">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-sans font-semibold">Quick Portal Access:</span>
          <div className="flex justify-center flex-wrap gap-4">
            <Link 
              href="/login?role=citizen"
              className="px-5 py-2.5 bg-slate-950/40 border border-white/5 rounded-lg text-xs text-slate-350 hover:text-cyan-400 hover:border-cyan-500/20 transition-all flex items-center gap-1.5 font-sans"
            >
              <Users className="h-4 w-4 text-slate-500" /> Citizen Portal
            </Link>
            <Link 
              href="/login?role=officer"
              className="px-5 py-2.5 bg-slate-950/40 border border-white/5 rounded-lg text-xs text-slate-350 hover:text-emerald-450 hover:border-emerald-500/20 transition-all flex items-center gap-1.5 font-sans"
            >
              <UserCheck className="h-4 w-4 text-slate-500" /> Officer Portal
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
