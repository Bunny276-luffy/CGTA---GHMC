"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, ChevronRight, CheckCircle2, AlertTriangle, Scan, Camera, MapPin, Eye, Copy, Award } from "lucide-react";
import AnimatedText from "../AnimatedText";
import TiltCard from "../TiltCard";

interface PipelineStep {
  name: string;
  icon: React.ReactNode;
  status: "success" | "warning" | "error" | "pending";
  detail: string;
  resultText: string;
}

export default function VerificationShowcase() {
  const [activeStep, setActiveStep] = useState(0);

  const pipeline: PipelineStep[] = [
    {
      name: "Image Upload",
      icon: <Camera className="h-4.5 w-4.5" />,
      status: "success",
      detail: "Receives raw image evidence file uploads from platform clients.",
      resultText: "PASSED // Binary stream buffer read successfully."
    },
    {
      name: "Metadata Analysis",
      icon: <Eye className="h-4.5 w-4.5" />,
      status: "success",
      detail: "Extracts software signature tags and original headers to scan for photo editor edits.",
      resultText: "PASSED // Device headers verified as raw output."
    },
    {
      name: "GPS Verification",
      icon: <MapPin className="h-4.5 w-4.5" />,
      status: "success",
      detail: "Calculates the Haversine distance offset between image GPS coordinates and reported points.",
      resultText: "PASSED // GPS match offset verified within 12m."
    },
    {
      name: "OCR Scan",
      icon: <Scan className="h-4.5 w-4.5" />,
      status: "success",
      detail: "Decodes signages, number plates, or landmarks inside the photo to cross-verify address text.",
      resultText: "PASSED // Decoded landmark tags align with address."
    },
    {
      name: "Object Detection",
      icon: <Scan className="h-4.5 w-4.5" />,
      status: "success",
      detail: "Runs computer vision checks to verify the reported category matches the photo contents.",
      resultText: "PASSED // Bounding box matched category [Road Pothole]."
    },
    {
      name: "Forgery Detection",
      icon: <ShieldCheck className="h-4.5 w-4.5" />,
      status: "success",
      detail: "Evaluates error level analysis (ELA) to identify localized compression anomalies.",
      resultText: "PASSED // Compression matrix verified uniform."
    },
    {
      name: "Duplicate Detection",
      icon: <Copy className="h-4.5 w-4.5" />,
      status: "success",
      detail: "Queries database for recent open tickets in proximity of same category to prevent duplicate work.",
      resultText: "PASSED // No matching category registered within 100m."
    },
    {
      name: "Trust Indexing",
      icon: <Award className="h-4.5 w-4.5" />,
      status: "success",
      detail: "Computes overall ledger integrity scores and seals audit reports on-ledger.",
      resultText: "SEALED // Complaint indexed at 98.4% Confidence Score."
    }
  ];

  // Rotate active steps periodically to simulate live scanning
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % pipeline.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="pipeline" className="py-32 border-t border-white/5 bg-transparent relative z-15">
      <div className="mx-auto max-w-7xl px-6 space-y-16">
        
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <AnimatedText
            tag="h2"
            text="AI Verification Showcase"
            className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans"
          />
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            Watch evidence pass through our automated checkpoints, mapping data integrity layers from capture to seal.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Vertically arranged pipeline checkpoints */}
          <div className="lg:col-span-6 space-y-3">
            {pipeline.map((step, idx) => (
              <div 
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`w-full p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex justify-between items-center ${
                  activeStep === idx 
                    ? "bg-slate-950/85 border-cyan-500/35 shadow-md shadow-cyan-500/5" 
                    : "bg-slate-950/20 border-white/5 hover:bg-slate-950/45 hover:border-white/10"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-all ${
                    activeStep === idx 
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
                      : "bg-slate-900 border-white/5 text-slate-500"
                  }`}>
                    {step.icon}
                  </div>
                  <div>
                    <h4 className={`text-xs font-mono font-bold uppercase transition-colors ${
                      activeStep === idx ? "text-white" : "text-slate-400"
                    }`}>
                      {step.name}
                    </h4>
                    <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest">
                      Node Checkpoint {idx + 1}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[8px] font-mono font-bold ${
                    activeStep === idx ? "text-cyan-400" : "text-slate-500"
                  }`}>
                    {activeStep === idx ? "SCANNING" : "STANDBY"}
                  </span>
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    activeStep === idx ? "bg-cyan-400 animate-ping" : "bg-slate-700"
                  }`} />
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Detailed inspection panel for the active step */}
          <div className="lg:col-span-6">
            <TiltCard className="h-full">
              <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-slate-950/40 text-left min-h-[380px] flex flex-col justify-between">
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Selected Core Module</span>
                      <h3 className="text-sm font-mono font-bold text-white uppercase mt-0.5">
                        {pipeline[activeStep].name}
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[8px] font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      ACTIVE SCAN
                    </span>
                  </div>

                  {/* High-fidelity verification image for visual check steps */}
                  {(activeStep === 3 || activeStep === 4 || activeStep === 5) && (
                    <div className="w-full relative overflow-hidden rounded-2xl border border-white/5 bg-black/45 animate-fade-in-up">
                      <img 
                        src="/pothole_ai_verification.png" 
                        alt="Computer Vision Object Detection Scanner" 
                        className="w-full h-32 object-cover opacity-95 hover:opacity-100 transition-opacity"
                      />
                    </div>
                  )}

                  <div className="space-y-4">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Functional Description:</span>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed">
                      {pipeline[activeStep].detail}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-white/5 mt-6">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Ledger Result Signature:</span>
                  <div className="p-3 bg-black/45 border border-white/5 rounded-xl text-[9px] font-mono text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 flex-shrink-0" />
                    <span className="truncate">{pipeline[activeStep].resultText}</span>
                  </div>
                </div>

              </div>
            </TiltCard>
          </div>

        </div>

      </div>
    </section>
  );
}
