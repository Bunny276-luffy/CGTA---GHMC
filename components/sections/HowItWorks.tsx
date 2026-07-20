"use client";

import React, { useState } from "react";
import { User, UploadCloud, Cpu, Send, CheckCircle, ChevronRight } from "lucide-react";
import AnimatedText from "../AnimatedText";
import TiltCard from "../TiltCard";

interface StepData {
  number: string;
  icon: React.ReactNode;
  title: string;
  shortDesc: string;
  fullDetail: string;
}

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps: StepData[] = [
    {
      number: "01",
      icon: <User className="h-5 w-5" />,
      title: "Citizen Report",
      shortDesc: "Incident Spotted",
      fullDetail: "A citizen spots a municipal issue (e.g. pothole or open waste) and logs details via the portal, capturing a live image directly using a mobile camera."
    },
    {
      number: "02",
      icon: <UploadCloud className="h-5 w-5" />,
      title: "Evidence Upload",
      shortDesc: "Ledger Registration",
      fullDetail: "The photo is uploaded. The system extracts GPS EXIF header tags and files are recorded to an encrypted, tamper-proof storage network."
    },
    {
      number: "03",
      icon: <Cpu className="h-5 w-5" />,
      title: "AI Verification",
      shortDesc: "Automated Checks",
      fullDetail: "The pipeline inspects image manipulation flags, cross-references location metadata with report coordinates, and searches local nodes for duplicates."
    },
    {
      number: "04",
      icon: <Send className="h-5 w-5" />,
      title: "Smart Routing",
      shortDesc: "Auto Department",
      fullDetail: "Verified complaints are instantly cataloged and routed to the corresponding ward department queue, alert notifications are sent to the field officers."
    },
    {
      number: "05",
      icon: <CheckCircle className="h-5 w-5" />,
      title: "Resolution Seal",
      shortDesc: "Sealed On-Chain",
      fullDetail: "The assigned officer uploads an after-repair resolution photo. Once citizen confirmation matches, the ticket is marked closed and sealed on-ledger."
    }
  ];

  return (
    <section id="how-it-works" className="py-32 border-t border-white/5 bg-transparent relative z-15">
      <div className="mx-auto max-w-7xl px-6 space-y-16">
        
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/5 px-3 py-1 text-xs font-bold text-blue-400 font-mono">
            02 // PLATFORM WORKFLOW
          </div>
          <AnimatedText
            tag="h2"
            text="How CivicTrust Works"
            className="text-3xl md:text-5xl font-black text-white uppercase font-mono leading-tight"
          />
          <p className="text-xs text-slate-350 leading-relaxed font-mono">
            A secure, automated protocol ensuring accountability at every stage of civic redressal.
          </p>
        </div>

        {/* Horizontal Timeline Track */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch relative">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              onClick={() => setActiveStep(idx)}
              className="cursor-pointer group h-full"
            >
              <TiltCard className="h-full">
                <div className={`glass-panel p-6 rounded-3xl border transition-all duration-300 h-full flex flex-col justify-between min-h-[220px] text-left relative ${
                  activeStep === idx 
                    ? "bg-slate-950/80 border-blue-500/40 shadow-lg shadow-blue-500/5" 
                    : "bg-slate-950/30 border-white/5 hover:border-white/10"
                }`}>
                  {/* Step Connector Line for Large Screens */}
                  {idx < 4 && (
                    <ChevronRight className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-650 z-20" />
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`text-[8px] font-mono uppercase tracking-widest ${activeStep === idx ? "text-blue-400 font-bold" : "text-slate-500"}`}>
                        STEP {step.number}
                      </span>
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center border transition-all ${
                        activeStep === idx 
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                          : "bg-slate-900 border-white/5 text-slate-500 group-hover:text-white"
                      }`}>
                        {step.icon}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-mono font-bold text-white uppercase">{step.title}</h4>
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">
                        {step.shortDesc}
                      </span>
                    </div>
                  </div>

                  <p className={`text-[9px] font-mono leading-relaxed mt-4 border-t border-white/5 pt-3 transition-colors ${
                    activeStep === idx ? "text-slate-350" : "text-slate-500"
                  }`}>
                    {step.fullDetail}
                  </p>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
