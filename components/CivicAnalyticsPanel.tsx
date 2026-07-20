"use client";

import React, { useState } from "react";
import { BarChart3, Clock, AlertTriangle, ShieldCheck, Activity } from "lucide-react";
import TiltCard from "./TiltCard";

interface CategoryData {
  name: string;
  percentage: number;
  count: number;
  requirement: string;
}

interface ActivityLog {
  time: string;
  location: string;
  type: string;
  status: string;
}

export default function CivicAnalyticsPanel() {
  const [selectedCategory, setSelectedCategory] = useState<number>(0);

  const categories: CategoryData[] = [
    { name: "Road Repair", percentage: 42, count: 5242, requirement: "Strict 15m GPS Geofence + Camera EXIF check" },
    { name: "Waste Disposal", percentage: 28, count: 3494, requirement: "Concentric duplicate grid check (50m bounds)" },
    { name: "Streetlights", percentage: 18, count: 2246, requirement: "Single coordinate validation + Night photo verification" },
    { name: "Water Supply", percentage: 12, count: 1497, requirement: "Pressure telemetry + Closed-loop officer signoff" }
  ];

  const recentAudits: ActivityLog[] = [
    { time: "Just now", location: "Gachibowli Sector-4", type: "Pothole Resolved", status: "VERIFIED" },
    { time: "2 mins ago", location: "Madhapur Block C", type: "Waste Bin Cleared", status: "VERIFIED" },
    { time: "5 mins ago", location: "Banjara Hills Rd-12", type: "Streetlight Restored", status: "VERIFIED" },
    { time: "12 mins ago", location: "Jubilee Hills Complex", type: "Water Leak Repaired", status: "VERIFIED" },
    { time: "18 mins ago", location: "Kondapur Junction", type: "Pothole Verified", status: "IN COMPLIANCE" }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch w-full max-w-7xl mx-auto">
      
      {/* Left Column: Interactive Category Breakdown & Statistics */}
      <div className="lg:col-span-7">
        <TiltCard className="h-full">
          <div className="glass-panel p-8 rounded-3xl border border-amber-500/10 bg-slate-950/40 h-full flex flex-col justify-between space-y-8 text-left">
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <BarChart3 className="h-4.5 w-4.5 text-amber-400" />
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-amber-400 font-bold">
                  Municipal Category Distribution
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Click a category below to inspect its anti-fraud validation parameters.
              </p>
            </div>

            {/* Interactive SVG Bar Chart */}
            <div className="space-y-5">
              {categories.map((cat, idx) => (
                <div 
                  key={cat.name}
                  onClick={() => setSelectedCategory(idx)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    selectedCategory === idx 
                      ? "bg-amber-500/10 border-amber-500/35 shadow-lg shadow-amber-500/5" 
                      : "bg-slate-900/40 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-mono mb-2">
                    <span className="text-white font-bold">{cat.name}</span>
                    <span className="text-amber-400 font-bold">{cat.percentage}% ({cat.count} files)</span>
                  </div>
                  {/* Progress track */}
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedCategory === idx ? "bg-amber-500" : "bg-slate-700"
                      }`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Dynamic Validation Parameter details */}
            <div className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider block">
                Selected Checkpoint Protocol:
              </span>
              <p className="text-xs font-bold text-white mt-1 font-mono">
                {categories[selectedCategory].requirement}
              </p>
            </div>

          </div>
        </TiltCard>
      </div>

      {/* Right Column: Live Audit Activity Ledger Feed */}
      <div className="lg:col-span-5">
        <TiltCard className="h-full">
          <div className="glass-panel p-8 rounded-3xl border border-white/5 bg-slate-950/20 h-full flex flex-col justify-between space-y-6">
            
            <div className="space-y-2 text-left">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <Activity className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-indigo-450 text-indigo-400 font-bold">
                  Real-Time Audit Ledger Feed
                </span>
              </div>
              <p className="text-[9px] text-slate-500">Live verification transactions logged on-chain.</p>
            </div>

            {/* List of recent audits */}
            <div className="space-y-4 h-[260px] overflow-y-auto pr-1">
              {recentAudits.map((audit, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-slate-900/55 border border-white/5 rounded-xl flex justify-between items-center text-left"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-[10px] font-mono font-bold">{audit.type}</span>
                      <span className="text-[8px] text-slate-500 font-mono">({audit.time})</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono">{audit.location}</p>
                  </div>
                  
                  <span className="px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {audit.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Overall stats counters */}
            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
              <div className="text-left">
                <span className="text-[8px] font-mono text-slate-500 uppercase">Verification Rate</span>
                <h4 className="text-lg font-black text-white font-mono mt-0.5">99.1%</h4>
              </div>
              <div className="text-left">
                <span className="text-[8px] font-mono text-slate-500 uppercase">Avg Resolution</span>
                <h4 className="text-lg font-black text-white font-mono mt-0.5">18.4 Hrs</h4>
              </div>
            </div>

          </div>
        </TiltCard>
      </div>

    </div>
  );
}
