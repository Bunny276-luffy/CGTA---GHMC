"use client";

import React, { useState, useEffect } from "react";
import ThreeDHolographicGlobe from "@/components/ThreeDHolographicGlobe";
import RoleCardDeck from "@/components/RoleCardDeck";
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

        <AlternatingFeatures />

        {/* Section 10: Interactive Role Consoles (Expandable Vertical Card Deck) */}
        <section id="previews" className="py-24 border-t border-white/5 bg-transparent">
          <RoleCardDeck />
        </section>

        <FAQSection />

        <CallToAction />

      </div>

      <Footer />

    </div>
  );
}
