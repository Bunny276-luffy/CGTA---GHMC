"use client";

import React, { useState, useEffect } from "react";
import ThreeDHolographicGlobe from "@/components/ThreeDHolographicGlobe";
import ThreeDPhotoVerificationSimulator from "@/components/ThreeDPhotoVerificationSimulator";
import ThreeDIsometricCity from "@/components/ThreeDIsometricCity";
import ThreeDCyberRadar from "@/components/ThreeDCyberRadar";
import ThreeDWorkflowCards from "@/components/ThreeDWorkflowCards";
import CivicAnalyticsPanel from "@/components/CivicAnalyticsPanel";
import CivicTracker from "@/components/CivicTracker";
import Floating3DGrid from "@/components/Floating3DGrid";
import AnimatedText from "@/components/AnimatedText";
import TiltCard from "@/components/TiltCard";
import { 
  ShieldCheck, 
  Sparkles, 
  Users, 
  UserCheck, 
  Sliders, 
  ArrowRight,
  Terminal,
  RefreshCw,
  Cpu
} from "lucide-react";
import Link from "next/link";

// Import Modular Sections
import HeroSection from "@/components/sections/Hero";
import MetricsSection from "@/components/sections/Metrics";

import AlternatingFeatures from "@/components/sections/AlternatingFeatures";
import FAQSection from "@/components/sections/FAQ";
import CallToAction from "@/components/sections/CallToAction";
import Footer from "@/components/sections/Footer";

// Custom Text Scramble for Kinetic Hover Feedback
function useTextScramble(originalText: string) {
  const [text, setText] = useState(originalText);
  const chars = "!@#$%^&*()_+~`|}{[]:;?><,./-=";
  
  const scramble = () => {
    let iteration = 0;
    const interval = setInterval(() => {
      setText(originalText
        .split("")
        .map((char, index) => {
          if (index < iteration) return originalText[index];
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join("")
      );
      if (iteration >= originalText.length) clearInterval(interval);
      iteration += 1 / 3;
    }, 25);
  };

  return { text, scramble };
}

function ScrambleLink({ href, label, className }: { href: string; label: string; className?: string }) {
  const { text, scramble } = useTextScramble(label);
  return (
    <Link 
      href={href} 
      onMouseEnter={scramble} 
      className={`${className} transition-all duration-300 relative group`}
    >
      <span className="relative z-10">{text}</span>
      <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-cyan-500 transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen bg-transparent text-slate-100 overflow-x-hidden selection:bg-blue-500/20 selection:text-cyan-250">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#030308]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-500 p-[1.5px]">
              <div className="h-full w-full rounded-md bg-[#030308] flex items-center justify-center">
                <ShieldCheck className="h-4.5 w-4.5 text-blue-400" />
              </div>
            </div>
            <span className="text-sm font-black tracking-wider text-white">
              CIVIC<span className="text-cyan-400">TRUST</span>
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-400">
            <ScrambleLink href="#how-it-works" label="How It Works" className="hover:text-white" />
            <ScrambleLink href="#map" label="Audit Map" className="hover:text-white" />
            <ScrambleLink href="#platform-capabilities" label="Capabilities" className="hover:text-white" />
            <ScrambleLink href="#previews" label="Portals" className="hover:text-white" />
            <ScrambleLink href="#faq" label="FAQ" className="hover:text-white" />
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-105 shadow-lg shadow-blue-500/20"
            >
              Join Platform
            </Link>
          </div>
        </div>
      </header>

      {/* Main Core Viewport */}
      <div className="relative z-10 bg-transparent">

        <HeroSection />

        <MetricsSection />

        {/* Standalone 3D Holographic Globe */}
        <section className="py-24 border-t border-white/5 bg-transparent flex justify-center items-center">
          <ThreeDHolographicGlobe />
        </section>

        {/* 3D Interactive Photo Verification Pipeline Simulator */}
        <section className="py-20 px-6 border-t border-white/5 bg-transparent flex justify-center items-center">
          <ThreeDPhotoVerificationSimulator />
        </section>

        <AlternatingFeatures />

        {/* Section 10: Workspace Preview Gateways (Attractive 3-Column Bento Grid with Illustrations) */}
        <section id="previews" className="py-36 border-t border-white/5 bg-transparent">
          <div className="mx-auto max-w-7xl px-6 space-y-16">
            
            <div className="text-center md:text-left space-y-4 max-w-2xl">
              <AnimatedText
                tag="h2"
                text="Role-Specific Consoles"
                className="text-3xl md:text-4xl font-extrabold text-white leading-tight font-sans"
              />
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                Review interfaces, geofence scanners, and diagnostic dashboards configured for each platform participant.
              </p>
            </div>

            {/* Downward Triangle Cards Arrangement */}
            <div className="space-y-8 pt-6">
              
              {/* Row 1: 2 Cards side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
                
                {/* Card 1: Citizen Node with Forensic Scanner Illustration */}
                <TiltCard className="h-full">
                  <div className="glass-panel p-6 rounded-3xl border border-cyan-500/20 bg-slate-950/75 min-h-[460px] text-left flex flex-col justify-between relative overflow-hidden h-full">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-cyan-400" />
                    
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">Citizen Node</span>
                        <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                      </div>

                      {/* Realistic illustration mockup */}
                      <div className="h-32 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <img 
                          src="/pothole_ai_verification.png" 
                          alt="Grievance Uplink" 
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500 pointer-events-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-white uppercase font-mono">Grievance Uplink</h3>
                        <p className="text-[11px] text-slate-350 leading-relaxed font-mono">
                          Upload complaints and parse EXIF metadata directly from camera headers. Automates ledger verification and neutral TPA escalation logs.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                      <Link 
                        href="/login?role=citizen" 
                        className="px-5 py-2.5 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all font-mono uppercase tracking-wider w-full justify-center"
                      >
                        Access Node <ArrowRight className="h-4 w-4 text-cyan-400" />
                      </Link>
                    </div>
                  </div>
                </TiltCard>

                {/* Card 2: Officer Console */}
                <TiltCard className="h-full">
                  <div className="glass-panel p-6 rounded-3xl border border-blue-500/20 bg-slate-950/75 min-h-[460px] text-left flex flex-col justify-between relative overflow-hidden h-full">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-400" />
                    
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest">Officer Console</span>
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      </div>

                      {/* Realistic illustration mockup */}
                      <div className="h-32 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <img 
                          src="/municipal_control_room.png" 
                          alt="Resolution Radar" 
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500 pointer-events-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-white uppercase font-mono">Resolution Radar</h3>
                        <p className="text-[11px] text-slate-350 leading-relaxed font-mono">
                          Verify on-site resolution using coordinate distance calculations. Restricts resolutions strictly within geofence boundaries.
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                      <Link 
                        href="/login?role=officer" 
                        className="px-5 py-2.5 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all font-mono uppercase tracking-wider w-full justify-center"
                      >
                        Access Radar <ArrowRight className="h-4 w-4 text-blue-400" />
                      </Link>
                    </div>
                  </div>
                </TiltCard>
              </div>
            </div>
            
            <div className="flex justify-center w-full pt-4">
              {/* Card 3: Admin Queue with Workflow Triage Illustration */}
              <TiltCard className="w-full max-w-lg">
                <div className="glass-panel p-6 rounded-3xl border border-emerald-500/15 bg-slate-950/75 min-h-[460px] text-left flex flex-col justify-between relative overflow-hidden h-full">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Supervisor Console</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    {/* Realistic illustration mockup */}
                    <div className="h-32 rounded-2xl border border-white/5 relative overflow-hidden group">
                      <img 
                        src="/secure_ledger_cryptography.png" 
                        alt="Arbitration Panel Ledger Cryptography" 
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-95 group-hover:scale-105 transition-all duration-500 pointer-events-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white uppercase font-mono">Arbitration Panel</h3>
                      <p className="text-[11px] text-slate-350 leading-relaxed font-mono">
                        Audit spatial duplicate complaints and manage system geofence thresholds. Resolve contested officer reports within TPA arbitration queues.
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Link 
                      href="/login?role=admin" 
                      className="px-5 py-2.5 rounded-xl bg-slate-900 border border-white/5 hover:border-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-all font-mono uppercase tracking-wider w-full justify-center"
                    >
                      Access Panel <ArrowRight className="h-4 w-4 text-emerald-400" />
                    </Link>
                  </div>
                </div>
              </TiltCard>
            </div>
          </div>
        </section>

        <FAQSection />

        <CallToAction />

      </div>

      <Footer />

    </div>
  );
}
