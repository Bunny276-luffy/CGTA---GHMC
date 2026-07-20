"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import AnimatedText from "../AnimatedText";
import TiltCard from "../TiltCard";

interface FAQItem {
  q: string;
  a: string;
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      q: "What is Geofence Verification and how does it prevent fraud?",
      a: "When a citizen uploads a complaint, our engine extracts the GPS coordinates embedded in the image's EXIF header and computes the Haversine distance to the reported address. If the distance exceeds 100 meters, the complaint is flagged, preventing users from uploading old or downloaded internet images."
    },
    {
      q: "What happens if my camera strips EXIF metadata from photos?",
      a: "Some camera apps or messaging platforms strip EXIF metadata. In this case, the complaint is allowed but its Trust Score is degraded, and it is routed for manual geofence verification by a municipal officer."
    },
    {
      q: "How does the system identify duplicate complaints?",
      a: "The engine runs database spatial queries looking for active (unclosed) tickets within a 100-meter radius belonging to the same category. If an overlap is spotted, the system consolidates them to prevent municipal crews from being dispatched multiple times."
    },
    {
      q: "Can I track my complaint progress without an account?",
      a: "Yes. Every submitted complaint is assigned a public tracking ID (e.g. CGTA-2026-0001). Anyone can query this ID on the ledger tracking portal to audit GPS telemetry compliance and resolution milestones."
    }
  ];

  return (
    <section id="faq" className="py-32 border-t border-white/5 bg-transparent relative z-15">
      <div className="mx-auto max-w-4xl px-6 space-y-16">
        
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <AnimatedText
            tag="h2"
            text="Frequently Asked Questions"
            className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans"
          />
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            Have questions about geofencing, duplicate checks, or ledger entries? We have answers.
          </p>
        </div>

        <div className="space-y-4 text-left">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <TiltCard key={idx}>
                <div className={`glass-panel rounded-3xl border transition-all duration-300 ${
                  isOpen ? "bg-slate-950/80 border-amber-500/25" : "bg-slate-950/30 border-white/5"
                }`}>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-5 flex justify-between items-center text-left focus:outline-none"
                  >
                    <div className="flex items-center gap-3.5 pr-4">
                      <HelpCircle className={`h-4.5 w-4.5 flex-shrink-0 transition-colors ${isOpen ? "text-amber-400" : "text-slate-500"}`} />
                      <h4 className="text-xs font-mono font-bold text-white uppercase leading-normal">
                        {faq.q}
                      </h4>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${
                      isOpen ? "transform rotate-180 text-amber-400" : ""
                    }`} />
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-40 border-t border-white/5" : "max-h-0"
                  }`}>
                    <p className="p-6 text-[10px] text-slate-300 font-mono leading-relaxed bg-black/20">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>

      </div>
    </section>
  );
}
