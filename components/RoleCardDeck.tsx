"use client";

import React, { useState } from "react";
import { 
  UserCheck, 
  ShieldCheck, 
  MapPin, 
  ArrowRight, 
  Sparkles
} from "lucide-react";
import Link from "next/link";

interface RoleCard {
  id: string;
  role: string;
  title: string;
  subtitle: string;
  description: string;
  borderColor: string;
  accentColor: string;
  badge: string;
  href: string;
  image: string;
  icon: React.ReactNode;
  metrics: {
    label: string;
    value: string;
  }[];
}

export default function RoleCardDeck() {
  const [activeId, setActiveId] = useState<string>("citizen");

  const roles: RoleCard[] = [
    {
      id: "citizen",
      role: "Citizen Node",
      title: "Grievance Uplink Portal",
      subtitle: "AI EXIF Metadata & Tamper Verification",
      description: "Upload complaints with automatic EXIF camera hardware validation to prevent deepfakes or Photoshop tampering.",
      borderColor: "border-cyan-500/50",
      accentColor: "text-cyan-400",
      badge: "EXIF Verified • Anti-Forgery",
      href: "/login?role=citizen",
      image: "/pothole_ai_verification.png",
      icon: <UserCheck className="h-6 w-6 text-cyan-400" />,
      metrics: [
        { label: "VERIFICATION ACCURACY", value: "99.8%" },
        { label: "DEDUPLICATION RADIUS", value: "50 Meters" }
      ]
    },
    {
      id: "officer",
      role: "Field Officer",
      title: "Resolution Radar HUD",
      subtitle: "GPS Geofenced Verification Scanner",
      description: "Officers receive assigned tickets on a 3D isometric map. Resolution uploads are verified to be within 100 meters.",
      borderColor: "border-blue-500/50",
      accentColor: "text-blue-400",
      badge: "100m GPS Geofence Lock",
      href: "/login?role=officer",
      image: "/municipal_control_room.png",
      icon: <MapPin className="h-6 w-6 text-blue-400" />,
      metrics: [
        { label: "MAX DISTANCE LIMIT", value: "100.0m" },
        { label: "AVG RESPONSE SLA", value: "14.2 Hrs" }
      ]
    },
    {
      id: "admin",
      role: "Supervisor Console",
      title: "TPA Arbitration Panel",
      subtitle: "Independent Audit & Escalation Router",
      description: "Supervisors monitor municipal ward performance metrics and resolve contested tickets escalated by neutral auditors.",
      borderColor: "border-emerald-500/50",
      accentColor: "text-emerald-400",
      badge: "TPA Lock • Immutable Audit",
      href: "/login?role=admin",
      image: "/secure_ledger_cryptography.png",
      icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />,
      metrics: [
        { label: "ACTIVE WARDS MONITORED", value: "142 Wards" },
        { label: "ARBITRATION LOCK", value: "2 Rejections" }
      ]
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4">
      
      {/* Section Title Header */}
      <div className="text-center md:text-left space-y-3 max-w-2xl mb-8">
        <h2 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-purple-300 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)] tracking-tight leading-tight">
          Role-Specific Workspace Portals
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed font-sans">
          Hover or point over any pillar to expand its full dashboard background and telemetry details.
        </p>
      </div>

      {/* ImpactLens AI Horizontal Slider Container (ALWAYS flex-row) */}
      <div className="w-full overflow-x-auto pb-4">
        <div className="flex flex-row h-[520px] min-w-[720px] md:min-w-0 w-full gap-3 md:gap-4">
          {roles.map((card) => {
            const isExpanded = activeId === card.id;

            return (
              <div
                key={card.id}
                onMouseEnter={() => setActiveId(card.id)}
                onClick={() => setActiveId(card.id)}
                className={`relative rounded-3xl border transition-all duration-500 ease-out cursor-pointer overflow-hidden backdrop-blur-xl flex flex-col justify-between select-none ${
                  isExpanded
                    ? `flex-[4] ${card.borderColor} shadow-2xl shadow-cyan-950/50`
                    : `flex-[1] border-white/10 hover:border-white/30 bg-slate-950/80`
                }`}
              >
                {/* Full Background Image (Filling the Entire Card Box) */}
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  <img 
                    src={card.image} 
                    alt={card.title} 
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      isExpanded ? "scale-105 opacity-35" : "opacity-15 grayscale"
                    }`}
                  />
                  
                  {/* Vignette Overlay Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${
                    isExpanded 
                      ? "from-[#030308] via-[#030308]/85 to-[#030308]/40" 
                      : "from-[#030308] via-[#030308]/90 to-[#030308]/80"
                  }`} />
                </div>

                {/* EXPANDED STATE (ImpactLens AI Expanded Card) */}
                {isExpanded ? (
                  <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-between animate-in fade-in duration-300">
                    
                    {/* Top Bar Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 backdrop-blur-md">
                          {card.icon}
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 block">
                            {card.role}
                          </span>
                          <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-tight font-mono">
                            {card.title}
                          </h3>
                        </div>
                      </div>

                      <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-950/80 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                        {card.badge}
                      </span>
                    </div>

                    {/* Subtitle & Description */}
                    <div className="space-y-2 max-w-xl my-auto py-4">
                      <p className={`text-xs font-mono font-bold uppercase tracking-wider ${card.accentColor}`}>
                        {card.subtitle}
                      </p>
                      <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans">
                        {card.description}
                      </p>
                    </div>

                    {/* Bottom Metric Cards & Action Gateway */}
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        {card.metrics.map((m, idx) => (
                          <div 
                            key={idx} 
                            className="p-3.5 rounded-2xl bg-slate-950/85 border border-white/10 backdrop-blur-md space-y-0.5"
                          >
                            <span className="text-[9px] font-mono font-bold text-slate-400 block tracking-wider">
                              {m.label}
                            </span>
                            <div className="text-lg md:text-2xl font-black font-mono text-white">
                              {m.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                          Direct Access to {card.role} Console
                        </span>
                        <Link
                          href={card.href}
                          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          Access Portal <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* COLLAPSED STATE (ImpactLens AI Slim Vertical Pillar) */
                  <div className="relative z-10 h-full p-4 flex flex-col justify-between items-center text-center">
                    
                    {/* Top Dot */}
                    <div className="h-2 w-2 rounded-full bg-cyan-400/60 animate-ping mt-2" />

                    {/* Clean Vertical Rotated Label Container (No Distortion) */}
                    <div className="flex items-center justify-center h-full my-auto">
                      <span className="block transform -rotate-90 whitespace-nowrap text-xs md:text-sm font-mono font-bold text-slate-300 uppercase tracking-widest transition-colors">
                        {card.role}
                      </span>
                    </div>

                    {/* Bottom Icon */}
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 backdrop-blur-md mb-2">
                      {card.icon}
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
