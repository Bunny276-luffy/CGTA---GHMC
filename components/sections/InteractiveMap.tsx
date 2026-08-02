"use client";

import React, { useState } from "react";
import { MapPin, Search, ShieldCheck, Activity } from "lucide-react";
import AnimatedText from "../AnimatedText";
import TiltCard from "../TiltCard";

interface ZoneData {
  id: string;
  name: string;
  roadComplaints: number; // Integrity Checks
  wasteComplaints: number; // Duplicate Scans
  lightComplaints: number; // Ledger Audits
  waterComplaints: number; // Active Uplinks
  healthRate: number;
  avgResolution: string;
  coords: string;
  pos: { top: string; left: string };
  issues: string[];
}

export default function InteractiveMap() {
  const [activeZoneId, setActiveZoneId] = useState("NODE-HYD");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ZoneData[]>([]);

  const zones: ZoneData[] = [
    {
      id: "NODE-HYD",
      name: "ASIA-SOUTH // HYDERABAD, IND",
      roadComplaints: 2420,
      wasteComplaints: 1210,
      lightComplaints: 840,
      waterComplaints: 420,
      healthRate: 99.8,
      avgResolution: "1.2s",
      coords: "17.3850° N, 78.4867° E",
      pos: { top: "40.3%", left: "71.8%" },
      issues: [
        "EXIF Data Validation PASS",
        "Geofence Verification PASS",
        "Anti-Fraud Image Hash MATCHED",
        "Ledger Block #14092 SEALED"
      ]
    },
    {
      id: "NODE-NYC",
      name: "AMER-EAST // NEW YORK, USA",
      roadComplaints: 1850,
      wasteComplaints: 2210,
      lightComplaints: 1420,
      waterComplaints: 630,
      healthRate: 99.4,
      avgResolution: "1.5s",
      coords: "40.7128° N, 74.0060° W",
      pos: { top: "27.3%", left: "29.4%" },
      issues: [
        "Duplicate Submission INTERCEPTED",
        "Camera Metadata Verification PASS",
        "AI Object Triage MATCHED",
        "Ledger Block #14088 SEALED"
      ]
    },
    {
      id: "NODE-LDN",
      name: "EUROPE-WEST // LONDON, GBR",
      roadComplaints: 1540,
      wasteComplaints: 820,
      lightComplaints: 2510,
      waterComplaints: 340,
      healthRate: 98.9,
      avgResolution: "1.8s",
      coords: "51.5074° N, 0.1278° W",
      pos: { top: "21.3%", left: "49.9%" },
      issues: [
        "EXIF GPS Match PASS",
        "Ledger Sync COMPLETE",
        "AI Anomaly Filtering PASS",
        "Ledger Block #14085 SEALED"
      ]
    },
    {
      id: "NODE-TYO",
      name: "APAC-EAST // TOKYO, JPN",
      roadComplaints: 890,
      wasteComplaints: 1410,
      lightComplaints: 520,
      waterComplaints: 1910,
      healthRate: 99.7,
      avgResolution: "0.9s",
      coords: "35.6762° N, 139.6503° E",
      pos: { top: "30.1%", left: "88.7%" },
      issues: [
        "Camera Hash Verified MATCHED",
        "Fast-Path Resolution PIPELINE",
        "Ledger Block #14095 SEALED"
      ]
    },
    {
      id: "NODE-SYD",
      name: "APAC-SOUTH // SYDNEY, AUS",
      roadComplaints: 1120,
      wasteComplaints: 1940,
      lightComplaints: 1220,
      waterComplaints: 850,
      healthRate: 98.2,
      avgResolution: "2.1s",
      coords: "33.8688° S, 151.2093° E",
      pos: { top: "68.8%", left: "92.0%" },
      issues: [
        "Geofence Border Validation PASS",
        "AI Image Quality Score PASS",
        "Ledger Block #14079 SEALED"
      ]
    }
  ];

  const activeZone = zones.find(z => z.id === activeZoneId) || zones[0];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const matches = zones.filter(
      (z) =>
        z.name.toLowerCase().includes(query.toLowerCase()) ||
        z.id.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(matches);
  };

  const selectSearchResult = (z: ZoneData) => {
    setActiveZoneId(z.id);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <section id="map" className="py-32 border-t border-white/5 bg-transparent relative z-15">
      <div className="mx-auto max-w-7xl px-6 space-y-16">
        
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <AnimatedText
            tag="h2"
            text="Geological Telemetry Audit Map"
            className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-sans"
          />
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            Audit live coordinate telemetry, data integrity parameters, and AI-triage resolution metrics across real physical landmass nodes.
          </p>
        </div>

        {/* Global Hub layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Interactive Geological World Map */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-6 relative min-h-[460px]">
            
            {/* Search Bar */}
            <div className="absolute top-4 left-4 z-20 w-72">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Node Region (e.g. London, New York)..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full h-9 bg-slate-950/90 border border-white/10 rounded-xl px-3 pl-8 text-[10px] text-white font-sans placeholder-slate-500 focus:outline-none focus:border-blue-500/50 backdrop-blur-md"
                />
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                {searchResults.length > 0 && (
                  <div className="absolute top-10 left-0 right-0 bg-slate-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-30 font-sans text-[10px]">
                    {searchResults.map((z) => (
                      <button
                        key={z.id}
                        onClick={() => selectSearchResult(z)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-500/10 text-slate-350 hover:text-white border-b border-white/5 last:border-0 transition-colors uppercase cursor-pointer"
                      >
                        {z.name} ({z.id})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Geological Satellite Image Map with Overlays */}
            <div className="w-full h-full bg-[#030308] border border-white/10 rounded-3xl relative overflow-hidden min-h-[420px] aspect-[2/1] group flex items-center justify-center">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Equirectangular_projection_SW.jpg/1024px-Equirectangular_projection_SW.jpg" 
                alt="Geological Satellite World Map" 
                className="w-full h-full object-cover rounded-2xl opacity-60 group-hover:opacity-75 transition-opacity duration-300 pointer-events-none"
              />
              
              {/* Map coordinates indicators */}
              <div className="absolute bottom-4 left-4 bg-slate-950/75 px-3 py-1.5 rounded-lg border border-white/5 text-[8px] font-mono text-slate-400 z-10 pointer-events-none uppercase">
                Satellite Projection // EPSG:4326
              </div>

              {/* Hotspots matching coordinates on geological map */}
              {zones.map((zone) => {
                const isActive = activeZoneId === zone.id;

                return (
                  <button
                    key={zone.id}
                    onClick={() => setActiveZoneId(zone.id)}
                    className="absolute group/pin transition-all z-20 cursor-pointer"
                    style={{ top: zone.pos.top, left: zone.pos.left }}
                  >
                    <span className="relative flex h-8 w-8 items-center justify-center">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isActive ? "bg-cyan-400" : "bg-blue-500 group-hover/pin:bg-blue-400"
                      }`} style={{ animationDuration: "3s" }} />
                      <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border border-white/20 items-center justify-center shadow-lg ${
                        isActive ? "bg-cyan-500" : "bg-blue-600 group-hover/pin:bg-blue-500"
                      }`} />
                    </span>
                    <span className={`absolute top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[8px] font-mono border uppercase tracking-wider transition-opacity shadow-lg ${
                      isActive 
                        ? "bg-cyan-550 text-slate-950 border-cyan-400 font-bold" 
                        : "bg-slate-950/85 text-slate-300 border-white/5 opacity-0 group-hover/pin:opacity-100"
                    }`}>
                      {zone.id}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Right Column: Global Node Audit Details Panel */}
          <div className="lg:col-span-4">
            <TiltCard className="h-full">
              <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-950/40 text-left h-full flex flex-col justify-between min-h-[420px]">
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                      <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Global Telemetry Node</span>
                      <h3 className="text-xs font-mono font-bold text-white mt-0.5">{activeZone.name}</h3>
                      <span className="text-[9px] text-cyan-400 font-mono mt-0.5 block">{activeZone.coords}</span>
                    </div>
                    <MapPin className="h-4.5 w-4.5 text-blue-400 animate-pulse" />
                  </div>

                  {/* Grievance Metrics */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Node Verify Statistics (24h):</span>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-[8px] text-slate-500 uppercase block">Integrity Checks</span>
                        <span className="text-sm font-bold text-white mt-1 block">{activeZone.roadComplaints.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-[8px] text-slate-500 uppercase block">Duplicate Scans</span>
                        <span className="text-sm font-bold text-white mt-1 block">{activeZone.wasteComplaints.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-[8px] text-slate-500 uppercase block">Ledger Audits</span>
                        <span className="text-sm font-bold text-white mt-1 block">{activeZone.lightComplaints.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5">
                        <span className="text-[8px] text-slate-500 uppercase block">Active Uplinks</span>
                        <span className="text-sm font-bold text-white mt-1 block">{activeZone.waterComplaints.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Triage / Grievance Issues */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Live Node Triage Logs:</span>
                    <div className="space-y-1.5">
                      {activeZone.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[9px] font-mono text-slate-350 bg-black/35 px-2.5 py-1.5 rounded-lg border border-white/5">
                          <Activity className="h-3 w-3 text-cyan-400 shrink-0" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-white/5 mt-6">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">LEDGER SYNC RATE:</span>
                    <span className="text-emerald-400 font-bold">{activeZone.healthRate}%</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">AVG PIPELINE DELAY:</span>
                    <span className="text-blue-450 font-bold">{activeZone.avgResolution}</span>
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
