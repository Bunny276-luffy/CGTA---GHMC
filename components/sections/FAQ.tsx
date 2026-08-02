"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles, ShieldCheck, MapPin, Layers, FileCheck2, Zap } from "lucide-react";
import AnimatedText from "../AnimatedText";

interface FAQItem {
  q: string;
  a: string;
  category: string;
  icon: React.ReactNode;
  glowColor: string;
  borderColor: string;
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      q: "What is Geofence Verification and how does it prevent fraud?",
      a: "When a citizen or officer uploads a complaint, our engine extracts the GPS coordinates embedded in the photo's EXIF header and calculates the Haversine distance to the reported address. If the distance exceeds 100 meters, the complaint is flagged automatically—preventing users from uploading old or downloaded internet photos.",
      category: "Geofence Audit",
      icon: <MapPin className="h-4.5 w-4.5 text-emerald-400" />,
      glowColor: "from-emerald-500/20 via-slate-950 to-slate-950",
      borderColor: "border-emerald-500/40"
    },
    {
      q: "What happens if a camera strips EXIF metadata from uploaded photos?",
      a: "Certain messaging platforms or camera apps strip EXIF headers. When this occurs, our EXIF scanner flags the file. The complaint is still accepted, but its Trust Score is degraded, and it is routed for mandatory double-verification by the assigned officer's GPS radar.",
      category: "EXIF Anti-Forgery",
      icon: <FileCheck2 className="h-4.5 w-4.5 text-cyan-400" />,
      glowColor: "from-cyan-500/20 via-slate-950 to-slate-950",
      borderColor: "border-cyan-500/40"
    },
    {
      q: "How does the Spatial Deduplication Engine consolidate reports?",
      a: "Our engine continuously runs spatial radius calculations looking for active tickets within a 50-meter radius in the same ward category. Matching complaints are automatically merged into a single Master Ticket to prevent duplicate municipal dispatches.",
      category: "Spatial Deduplication",
      icon: <Layers className="h-4.5 w-4.5 text-purple-400" />,
      glowColor: "from-purple-500/20 via-slate-950 to-slate-950",
      borderColor: "border-purple-500/40"
    },
    {
      q: "Can I track complaint progress and auditor logs without an account?",
      a: "Yes. Every grievance generates a unique tracking hash (e.g. #CGTA-2026-8802). Anyone can enter this ID on the public transparency portal to inspect GPS coordinate compliance, resolution timestamps, and immutable audit logs.",
      category: "Public Ledger",
      icon: <ShieldCheck className="h-4.5 w-4.5 text-amber-400" />,
      glowColor: "from-amber-500/20 via-slate-950 to-slate-950",
      borderColor: "border-amber-500/40"
    },
    {
      q: "What is Third-Party Arbitration (TPA) and when does it trigger?",
      a: "If a citizen rejects an officer's resolution twice due to incomplete work, the system automatically locks the ticket and triggers TPA arbitration. The case is escalated to an independent supervisor dashboard for binding audit and verification.",
      category: "TPA Escalation",
      icon: <Zap className="h-4.5 w-4.5 text-rose-400" />,
      glowColor: "from-rose-500/20 via-slate-950 to-slate-950",
      borderColor: "border-rose-500/40"
    }
  ];

  return (
    <section id="faq" className="py-32 border-t border-white/5 bg-transparent relative z-10 overflow-hidden">
      
      {/* Dynamic Glowing Background Effects */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[650px] bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-emerald-500/10 blur-[130px] pointer-events-none rounded-full" />
      
      {/* Decorative Grid Dot Matrix */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15" 
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.4) 1px, transparent 0)",
          backgroundSize: "36px 36px"
        }}
      />

      <div className="mx-auto max-w-4xl px-6 space-y-14 relative z-10">
        
        {/* Title Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <AnimatedText
            tag="h2"
            text="Frequently Asked Questions"
            className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-purple-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)] tracking-tight leading-tight font-sans"
          />
          <p className="text-sm text-slate-400 leading-relaxed font-sans">
            Clear answers about geofencing, EXIF metadata scanning, duplicate filtering, and public ledger tracking.
          </p>
        </div>

        {/* Simple & Elegant Ambient FAQ Accordion List */}
        <div className="space-y-4 text-left">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className={`relative rounded-3xl border transition-all duration-500 overflow-hidden backdrop-blur-xl ${
                  isOpen
                    ? `bg-slate-950/90 ${faq.borderColor} shadow-2xl shadow-cyan-950/40 scale-[1.01]`
                    : "bg-slate-950/50 border-white/10 hover:border-white/20 hover:bg-slate-900/60"
                }`}
              >
                {/* Glowing Ambient Light Line on Active Card */}
                {isOpen && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-500" />
                )}

                {/* Question Header Bar */}
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-6 py-5 flex justify-between items-center text-left focus:outline-none gap-4 group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-2xl border transition-colors ${
                      isOpen ? `${faq.borderColor} bg-slate-900/90` : "border-white/10 bg-slate-900/50 group-hover:border-white/20"
                    }`}>
                      {faq.icon}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                        {faq.category}
                      </span>
                      <h4 className="text-sm md:text-base font-mono font-bold text-white leading-snug group-hover:text-cyan-300 transition-colors">
                        {faq.q}
                      </h4>
                    </div>
                  </div>

                  <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                    isOpen ? "transform rotate-180 text-cyan-400" : "group-hover:text-white"
                  }`} />
                </button>

                {/* Animated Answer Body */}
                {isOpen && (
                  <div className="px-6 pb-6 pt-2 border-t border-white/5 space-y-3 animate-in fade-in duration-300">
                    <p className="text-xs md:text-sm text-slate-300 font-sans leading-relaxed pl-14">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
