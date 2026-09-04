"use client";

import React, { useState } from "react";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import {
  ShieldCheck,
  Menu,
  Sparkles
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-transparent text-slate-100 overflow-x-hidden selection:bg-blue-500/20 selection:text-cyan-250">

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-cyan-500/15 bg-[#030308]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">

          {/* Logo & Government Title */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-500 p-[1.5px]">
              <div className="h-full w-full rounded-md bg-[#030308] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-wider text-white">
                  CIVIC<span className="text-cyan-400">TRUST</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-mono font-bold text-cyan-300">
                  CGTA
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-mono hidden sm:block">Greater Hyderabad Municipal Corporation</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
            <ScrambleLink href="#how-it-works" label="How It Works" className="hover:text-cyan-400" />
            <ScrambleLink href="#map" label="Audit Map" className="hover:text-cyan-400" />
            <ScrambleLink href="#platform-capabilities" label="Capabilities" className="hover:text-cyan-400" />
            <ScrambleLink href="#faq" label="FAQ" className="hover:text-cyan-400" />
          </nav>

          {/* Action CTAs & Mobile Hamburger */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 px-3.5 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-105 shadow-lg shadow-cyan-500/20"
            >
              File Grievance
            </Link>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all"
              aria-label="Open Mobile Navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      <MobileNavDrawer
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main Core Viewport */}
      <div className="relative z-10 bg-transparent">

        <HeroSection />

        <MetricsSection />

        <AlternatingFeatures />

        <FAQSection />

        <CallToAction />

      </div>

      <Footer />

    </div>
  );
}
