"use client";

import React from "react";
import Link from "next/link";
import { Users, UserCheck, ArrowRight, ShieldCheck, Sparkles, MapPin, Building2 } from "lucide-react";
import ThreeDHeroBackground from "../ThreeDHeroBackground";

export default function HeroSection() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-12 md:pt-20 pb-16 md:pb-24 text-left min-h-[85vh] flex flex-col justify-center bg-transparent z-10 overflow-hidden">

      {/* 3D Gyroscopic Reactor Background */}
      <ThreeDHeroBackground />

      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[550px] h-[350px] sm:h-[550px] rounded-full bg-cyan-500/10 blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] rounded-full bg-blue-500/10 blur-3xl opacity-40 pointer-events-none" />

      {/* Main Hero Headline & CTAs */}
      <div className="flex flex-col gap-5 sm:gap-6 text-left max-w-4xl mx-auto items-center md:items-start relative z-10 w-full mt-8 md:mt-0">

        <div className="flex flex-col gap-5 sm:gap-6 text-left">

          {/* Government Official Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold font-mono uppercase tracking-wider">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              GHMC Ward Geofenced Grievance Engine
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live 150 Wards Active
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.1] font-sans">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-slate-200">
              Empowering Citizens.
            </span> <br />
            <span className="relative inline-block bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent pb-1 drop-shadow-[0_0_25px_rgba(56,189,248,0.5)]">
              Restoring Public Trust.
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed max-w-xl font-sans">
            Official Greater Hyderabad Municipal Corporation (GHMC) AI-powered civic grievance platform.
            Cryptographically validates photo evidence, prevents duplicate filings, and enforces
            transparent municipal accountability across all 6 zones and 150 municipal wards.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3 sm:gap-4 pt-1 sm:pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto text-center px-6 sm:px-7 py-3.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 font-sans"
            >
              Report a Civic Issue <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#map"
              className="w-full sm:w-auto text-center px-6 sm:px-7 py-3.5 bg-slate-900/90 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-300 hover:bg-slate-800 hover:text-white hover:border-cyan-500/30 transition-all flex items-center justify-center gap-2 font-sans"
            >
              <MapPin className="h-4 w-4 text-cyan-400" /> View Live GHMC Audit Map
            </a>
          </div>

          {/* Quick Citizen Access */}
          <div className="pt-5 border-t border-white/10 space-y-2.5 max-w-lg">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-sans font-bold">Quick Access:</span>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href="/login"
                className="px-3.5 py-2 bg-slate-900/80 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 font-sans"
              >
                <Users className="h-3.5 w-3.5 text-cyan-400" /> Citizen Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-2 bg-slate-900/80 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 font-sans"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Create Account
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
