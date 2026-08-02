"use client";

import React from "react";
import Link from "next/link";
import { Users, UserCheck, ArrowRight } from "lucide-react";
import ThreeDHolographicGlobe from "../ThreeDHolographicGlobe";
import ThreeDHeroBackground from "../ThreeDHeroBackground";

export default function HeroSection() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-16 md:pt-24 pb-20 text-left min-h-[85vh] flex flex-col justify-center bg-transparent z-10 overflow-hidden">
      
      {/* Original 3D Gyroscopic Reactor Background */}
      <ThreeDHeroBackground />

      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-cyan-500/10 blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-3xl opacity-40 pointer-events-none" />

      {/* 2-Column Hero Grid: Left Text + Right 3D Globe */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10 w-full">
        
        {/* Left Column: Main Hero Headline & CTAs (6 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] font-sans">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-slate-200">
              Empowering Citizens.
            </span> <br />
            <span className="relative inline-block bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent pb-1 drop-shadow-[0_0_25px_rgba(56,189,248,0.5)]">
              Restoring Public Trust.
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl font-sans">
            CivicTrust is a modern, transparent civic grievance platform that ensures every citizen's voice is heard, every community issue is verified by AI, and every municipal resolution is tracked in real-time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Link 
              href="/register" 
              className="px-7 py-3.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition-all flex items-center gap-2 font-sans"
            >
              Report an Issue <ArrowRight className="h-4 w-4" />
            </Link>
            <a 
              href="#map" 
              className="px-7 py-3.5 bg-slate-900/80 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 font-sans"
            >
              View Live Audits
            </a>
          </div>

          {/* Quick Portal Access */}
          <div className="pt-6 border-t border-white/10 space-y-3 max-w-lg">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-sans font-semibold">Quick Portal Access:</span>
            <div className="flex flex-wrap gap-3">
              <Link 
                href="/login?role=citizen"
                className="px-4 py-2 bg-slate-900/80 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 font-sans"
              >
                <Users className="h-4 w-4 text-slate-400" /> Citizen Portal
              </Link>
              <Link 
                href="/login?role=officer"
                className="px-4 py-2 bg-slate-900/80 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all flex items-center gap-1.5 font-sans"
              >
                <UserCheck className="h-4 w-4 text-slate-400" /> Officer Portal
              </Link>
            </div>
          </div>

        </div>

        {/* Right Column: 3D Holographic Globe (5 cols) (Resizes dynamically with window) */}
        <div className="lg:col-span-5 flex justify-center items-center relative w-full h-[400px] sm:h-[500px] lg:h-[550px] overflow-hidden">
          <div className="w-full h-full transform scale-95 sm:scale-100 transition-all duration-300">
            <ThreeDHolographicGlobe />
          </div>
        </div>

      </div>
    </section>
  );
}
