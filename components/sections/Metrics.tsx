"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartHandshake, Building2, ShieldCheck, ArrowRight } from "lucide-react";
import { CivicTrustAssets } from "../../data/images";

interface ImpactItem {
  id: string;
  badge: string;
  title: string;
  description: string;
  metric: string;
  metricSub: string;
  color: string;
  glowColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

export default function ServiceToSocietySection() {
  const [activeId, setActiveId] = useState<string | null>("infra");
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  // Verified Local High-Resolution Municipal & Infrastructure Visual Assets
  const realWorldSocialServiceImages = [
    CivicTrustAssets.pothole,
    CivicTrustAssets.controlRoom,
    CivicTrustAssets.citizenReporting,
    CivicTrustAssets.dashboard,
    CivicTrustAssets.ledger
  ];

  // Auto-switch background image slideshow every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIdx((prev) => (prev + 1) % realWorldSocialServiceImages.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [realWorldSocialServiceImages.length]);

  // 5-Second Auto-Disappear Timer for Detail Text Box
  useEffect(() => {
    if (!activeId) return;

    const timer = setTimeout(() => {
      setActiveId(null); // Detail text box automatically closes after 5 seconds!
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeId]);

  const items: ImpactItem[] = [
    {
      id: "infra",
      badge: "100m GPS Geofence Rule",
      title: "Deterministic Geofencing",
      description: "Resolution claims are checked server-side against a deterministic 100 m geofence rule using the officer's on-site GPS. Evidence outside tolerance is routed to audit instead of being accepted.",
      metric: "Rule-Based Validation",
      metricSub: "Fail-Closed Design",
      color: "text-indigo-400",
      glowColor: "shadow-indigo-500/40 border-indigo-500/70 bg-indigo-950/90",
      borderColor: "border-indigo-500/40 bg-black/90",
      icon: <Building2 className="h-6 w-6 text-indigo-400" />
    },
    {
      id: "empower",
      badge: "EXIF & Duplicate Signals",
      title: "Evidence Quality Signals",
      description: "Camera metadata, error-level analysis, and SHA-256 / perceptual-hash duplicate checks give reviewers evidence-based signals about each submission. Signals inform review — they never auto-reject a citizen.",
      metric: "Explainable Assessment",
      metricSub: "Signals, Not Verdicts",
      color: "text-amber-400",
      glowColor: "shadow-amber-500/40 border-amber-500/70 bg-amber-950/90",
      borderColor: "border-amber-500/40 bg-black/90",
      icon: <HeartHandshake className="h-6 w-6 text-amber-400" />
    },
    {
      id: "audit",
      badge: "TPA Audit Trail",
      title: "Auditable Accountability",
      description: "Every status change, assignment, and disputed resolution is recorded in the audit ledger with the actor, timestamp, and verification facts. Disputed resolutions escalate to third-party audit review.",
      metric: "Complete Audit Trail",
      metricSub: "Every Action Recorded",
      color: "text-emerald-400",
      glowColor: "shadow-emerald-500/40 border-emerald-500/70 bg-emerald-950/90",
      borderColor: "border-emerald-500/40 bg-black/90",
      icon: <ShieldCheck className="h-6 w-6 text-emerald-400" />
    }
  ];

  const activeItem = items.find((i) => i.id === activeId);

  return (
    <section className="py-28 border-y border-white/10 bg-black relative z-10 overflow-hidden my-12 shadow-2xl min-h-[580px]">

      {/* High Visibility Background Image Slideshow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImageIdx}
            src={realWorldSocialServiceImages[currentImageIdx]}
            alt="Real-World Social Service"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 0.55, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/60" />
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 relative z-10 space-y-14">

        {/* BIG Title (Fully Visible, No Descender Clipping) */}
        <div className="text-center space-y-4 max-w-full mx-auto px-4 py-2 overflow-visible">
          <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight font-sans text-center leading-normal pb-3 block w-full whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-indigo-300 to-emerald-300 overflow-visible">
            Empowering Service to Society
          </h2>
        </div>

        {/* Vertical Sphere Column (Left) + Detail Box beside it (Right - Auto-Closes in 5 Seconds!) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center max-w-5xl mx-auto min-h-[240px]">

          {/* Left: Vertical Sphere Buttons Column */}
          <div className="md:col-span-5 flex md:flex-col justify-center items-start gap-6">
            {items.map((item) => {
              const isSelected = activeId === item.id;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveId(item.id)}
                  onClick={() => setActiveId(item.id)}
                  className="flex items-center gap-4 cursor-pointer group"
                >
                  {/* Glowing Sphere Button */}
                  <div
                    className={`h-16 w-16 rounded-full flex items-center justify-center transition-all duration-300 border shadow-2xl flex-shrink-0 ${
                      isSelected
                        ? `${item.glowColor} scale-110`
                        : "bg-black/90 border-white/20 text-slate-400 hover:border-white/50 hover:scale-105"
                    }`}
                  >
                    {item.icon}
                  </div>

                  {/* Button Text in Sans-Serif Heading Font */}
                  <span className={`text-sm sm:text-base font-sans font-bold tracking-tight transition-colors ${
                    isSelected ? item.color : "text-slate-300 group-hover:text-white"
                  }`}>
                    {item.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Expandable Detail Text Box (Auto-Disappears after 5 Seconds!) */}
          <div
            className="md:col-span-7 h-full flex items-center"
            onMouseLeave={() => setActiveId(null)}
          >
            <AnimatePresence mode="wait">
              {activeItem && (
                <motion.div
                  key={activeItem.id}
                  initial={{ opacity: 0, x: 15, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -15, scale: 0.97 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`w-full p-7 rounded-3xl border ${activeItem.borderColor} backdrop-blur-2xl shadow-2xl space-y-4 bg-black/95`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-black border border-white/10">
                        {activeItem.icon}
                      </div>
                      <div>
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${activeItem.color}`}>
                          {activeItem.badge}
                        </span>
                        <h3 className="text-lg font-bold text-white font-sans">{activeItem.title}</h3>
                      </div>
                    </div>

                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      {activeItem.metricSub}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                    {activeItem.description}
                  </p>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between font-mono">
                    <span className="text-xs text-slate-400 font-sans">Auto-closing in 5s...</span>
                    <span className={`text-xs sm:text-sm font-bold ${activeItem.color} flex items-center gap-1.5`}>
                      {activeItem.metric} <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
}
