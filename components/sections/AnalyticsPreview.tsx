"use client";

import React, { useState } from "react";
import { BarChart3, LineChart, PieChart, ShieldCheck } from "lucide-react";
import AnimatedText from "../AnimatedText";
import TiltCard from "../TiltCard";

export default function AnalyticsPreview() {
  const [activeTab, setActiveTab] = useState<"TRENDS" | "DEPARTMENTS" | "CATEGORIES">("TRENDS");

  return (
    <section id="analytics" className="py-32 border-t border-white/5 bg-transparent relative z-15">
      <div className="mx-auto max-w-7xl px-6 space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <AnimatedText
            tag="h2"
            text="Analytics Dashboard Preview"
            className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans"
          />
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            Audit compliance indices, category distributions, and department resolution speed metrics on dynamic graphs.
          </p>
        </div>

        {/* Tab Switcher and Chart Display */}
        <div className="space-y-8">
          <div className="flex justify-center gap-3 bg-slate-950/65 p-2 rounded-2xl border border-white/5 max-w-md mx-auto">
            {[
              { id: "TRENDS", label: "Complaint Trends", icon: <LineChart className="h-4 w-4" /> },
              { id: "DEPARTMENTS", label: "Ward Resolution", icon: <BarChart3 className="h-4 w-4" /> },
              { id: "CATEGORIES", label: "Categories", icon: <PieChart className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-bold uppercase font-mono border transition-all ${
                  activeTab === tab.id
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-slate-900/65 border-transparent text-slate-400 hover:text-white"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="max-w-4xl mx-auto">
            <TiltCard>
              <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-slate-950/40 text-left min-h-[380px] flex flex-col justify-between space-y-8">
                
                {/* Chart Header */}
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div>
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Platform Core Metric</span>
                    <h3 className="text-sm font-mono font-bold text-white uppercase mt-0.5">
                      {activeTab === "TRENDS" ? "Monthly Incident Verification Load" : activeTab === "DEPARTMENTS" ? "Ward Response Speeds (Hours)" : "Grievance Category Breakdown"}
                    </h3>
                  </div>
                  <ShieldCheck className="h-4.5 w-4.5 text-amber-400" />
                </div>

                {/* SVG Chart area */}
                <div className="h-64 w-full bg-black/35 rounded-2xl border border-white/5 flex items-center justify-center p-4">
                  {activeTab === "TRENDS" && (
                    <svg className="w-full h-full text-indigo-500" viewBox="0 0 100 40">
                      {/* Grid lines */}
                      <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="30" x2="100" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      
                      {/* Wave Line & Area */}
                      <path d="M 0 32 Q 10 20 20 28 T 40 14 T 60 22 T 80 10 L 100 5 L 100 40 L 0 40 Z" fill="rgba(99, 102, 241, 0.05)" />
                      <path d="M 0 32 Q 10 20 20 28 T 40 14 T 60 22 T 80 10 L 100 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      
                      {/* Gold Peak Highlight */}
                      <circle cx="100" cy="5" r="2" fill="#e5c158" />
                      
                      {/* Labels */}
                      <text x="5" y="38" className="text-[4px] font-mono fill-slate-500">Jan</text>
                      <text x="25" y="38" className="text-[4px] font-mono fill-slate-500">Mar</text>
                      <text x="45" y="38" className="text-[4px] font-mono fill-slate-500">May</text>
                      <text x="65" y="38" className="text-[4px] font-mono fill-slate-500">Jul</text>
                      <text x="85" y="38" className="text-[4px] font-mono fill-slate-500">Sep</text>
                    </svg>
                  )}

                  {activeTab === "DEPARTMENTS" && (
                    <svg className="w-full h-full text-indigo-500" viewBox="0 0 100 40">
                      {/* Grid lines */}
                      <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      <line x1="0" y1="30" x2="100" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                      
                      {/* Draw Columns */}
                      <g className="fill-indigo-500/80">
                        {/* Ward A */}
                        <rect x="10" y="10" width="8" height="25" rx="1.5" className="hover:fill-amber-400 transition-colors" />
                        {/* Ward B */}
                        <rect x="30" y="18" width="8" height="17" rx="1.5" className="hover:fill-amber-400 transition-colors" />
                        {/* Ward C */}
                        <rect x="50" y="24" width="8" height="11" rx="1.5" className="hover:fill-amber-400 transition-colors" />
                        {/* Ward D */}
                        <rect x="70" y="8" width="8" height="27" rx="1.5" className="hover:fill-amber-400 transition-colors" />
                      </g>

                      {/* Labels */}
                      <text x="14" y="38" className="text-[4px] font-mono fill-slate-500" textAnchor="middle">Ward 142</text>
                      <text x="34" y="38" className="text-[4px] font-mono fill-slate-500" textAnchor="middle">Ward 88</text>
                      <text x="54" y="38" className="text-[4px] font-mono fill-slate-500" textAnchor="middle">Ward 12</text>
                      <text x="74" y="38" className="text-[4px] font-mono fill-slate-500" textAnchor="middle">Ward 55</text>
                    </svg>
                  )}

                  {activeTab === "CATEGORIES" && (
                    <svg className="h-full max-w-[200px] text-indigo-500" viewBox="0 0 40 40">
                      {/* Donut sectors using stroke-dasharray */}
                      <circle cx="20" cy="20" r="12" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                      
                      {/* Sector 1: Roads (42%) */}
                      <circle cx="20" cy="20" r="12" fill="none" stroke="#e5c158" strokeWidth="4.5" strokeDasharray="31.6 75.3" strokeDashoffset="0" />
                      {/* Sector 2: Waste (28%) */}
                      <circle cx="20" cy="20" r="12" fill="none" stroke="#4f46e5" strokeWidth="4" strokeDasharray="21.1 75.3" strokeDashoffset="-31.6" />
                      {/* Sector 3: Lights (18%) */}
                      <circle cx="20" cy="20" r="12" fill="none" stroke="#06b6d4" strokeWidth="4" strokeDasharray="13.5 75.3" strokeDashoffset="-52.7" />
                      {/* Sector 4: Water (12%) */}
                      <circle cx="20" cy="20" r="12" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="9.1 75.3" strokeDashoffset="-66.2" />

                      {/* Center Label */}
                      <text x="20" y="22" textAnchor="middle" className="text-[4px] font-mono fill-white font-bold">CGTA</text>
                    </svg>
                  )}
                </div>

                <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                  <span>METRIC SCAN RATE: 100%</span>
                  <span className="text-emerald-400">AI MATCH VERIFIED</span>
                </div>

              </div>
            </TiltCard>
          </div>

        </div>

      </div>
    </section>
  );
}
