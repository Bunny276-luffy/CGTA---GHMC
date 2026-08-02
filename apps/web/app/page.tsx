"use client";

import React, { useState } from "react";
import ThreeGlobe from "@/components/ThreeGlobe";
import RoleCardDeck from "@/components/RoleCardDeck";
import { 
  ShieldCheck, 
  MapPin, 
  Layers, 
  Sparkles, 
  BrainCircuit, 
  Users, 
  UserCheck, 
  Sliders, 
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileCheck2,
  Lock
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"citizen" | "officer" | "admin">("citizen");

  const pipelineStages = [
    {
      title: "EXIF Integrity Analyzer",
      description: "Extracts original camera hardware parameters and detects manipulation signatures from Photoshop, Lightroom, PicsArt, etc.",
      icon: <FileCheck2 className="h-5 w-5 text-cyan-400" />,
      tag: "Anti-Forgery"
    },
    {
      title: "Geographic Geofencing",
      description: "Matches officer resolution uploads against the exact coordinates of the citizen complaint using GPS coordinates within 100 meters.",
      icon: <MapPin className="h-5 w-5 text-emerald-400" />,
      tag: "Double-Verification"
    },
    {
      title: "Spatial Duplicate Engine",
      description: "Continuously tracks reports and aggregates complaints within a 50m radius to eliminate duplicates and construct Master Tickets.",
      icon: <Layers className="h-5 w-5 text-purple-400" />,
      tag: "Deduplication"
    },
    {
      title: "AI Explainable Trust Engine",
      description: "Processes textual severity, image context consistency, and validation checks to calculate a reliable Trust Score (0-100).",
      icon: <BrainCircuit className="h-5 w-5 text-amber-400" />,
      tag: "Decision Scoring"
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030308]">
      {/* Background Neon Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />
      
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#030308]/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600">
              <ShieldCheck className="h-5 w-5 text-white" />
              <div className="absolute inset-0 rounded-lg bg-cyan-400/20 blur-sm animate-pulse" />
            </div>
            <span className="text-lg font-black tracking-wider text-white text-glow">
              CIVIC<span className="text-cyan-400">TRUST</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-cyan-400 transition-colors">AI Pipeline</a>
            <a href="#roles" className="hover:text-cyan-400 transition-colors">Portals</a>
            <a href="#leaderboard" className="hover:text-cyan-400 transition-colors">Wards</a>
            <Link href="/public-stats" className="hover:text-cyan-400 transition-colors">Live Map</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-semibold text-cyan-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="relative group overflow-hidden rounded-lg px-4 py-2 text-sm font-bold text-white transition-all"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-300 group-hover:opacity-90" />
              <span className="relative flex items-center gap-1.5">
                Register <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-12 md:pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3 py-1 text-xs font-semibold text-cyan-400">
              <Sparkles className="h-3.5 w-3.5" />
              Next-Gen AI Trust Verification Framework
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl leading-[1.1]">
              Ensuring Integrity in <br />
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                Civic Governance
              </span>
            </h1>
            
            <p className="text-base md:text-lg text-slate-400 max-w-xl leading-relaxed">
              CivicTrust automatically audits, geofences, and filters out duplicate or manipulated grievances using multidimensional AI forensic modeling—delivering zero-fraud accountability directly to municipal authorities.
            </p>

            {/* Quick Gateways */}
            <div className="flex flex-wrap gap-4 mt-2">
              <Link 
                href="/login?role=citizen"
                className="glass-panel-glow hover:border-cyan-400/40 px-6 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-300 group"
              >
                <Users className="h-5 w-5 text-cyan-400" />
                <div className="text-left">
                  <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Citizen Gateway</p>
                  <p className="text-xs text-white font-bold group-hover:text-cyan-300">Submit Grievance</p>
                </div>
              </Link>

              <Link 
                href="/login?role=officer"
                className="glass-panel hover:border-emerald-500/20 px-6 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-300 group"
              >
                <UserCheck className="h-5 w-5 text-emerald-400" />
                <div className="text-left">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Field Officer</p>
                  <p className="text-xs text-white font-bold group-hover:text-emerald-300">Resolve Tasks</p>
                </div>
              </Link>

              <Link 
                href="/login?role=admin"
                className="glass-panel hover:border-purple-500/20 px-6 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-300 group"
              >
                <Sliders className="h-5 w-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Administrator</p>
                  <p className="text-xs text-white font-bold group-hover:text-purple-300">Manage System</p>
                </div>
              </Link>
            </div>

            {/* Stats Showcase */}
            <div className="grid grid-cols-3 gap-6 border-t border-white/5 pt-8 mt-4 max-w-lg">
              <div>
                <h3 className="text-2xl font-black text-white text-glow">99.8%</h3>
                <p className="text-xs text-slate-400 mt-1">Verification Accuracy</p>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white text-glow-green">100m</h3>
                <p className="text-xs text-slate-400 mt-1">Geofence Accuracy</p>
              </div>
              <div>
                <h3 className="text-2xl font-black text-white text-glow-amber">&lt; 24h</h3>
                <p className="text-xs text-slate-400 mt-1">Median Resolution</p>
              </div>
            </div>
          </div>

          {/* Right Hero - 3D Digital Twin Globe */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <ThreeGlobe />
          </div>

        </div>
      </section>

      {/* AI Pipeline Details */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-16 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white">
            AI-Driven Multi-Stage Trust Pipeline
          </h2>
          <p className="text-slate-400 mt-3 text-sm md:text-base">
            Every submission travels through sequential audits to prevent fraud and minimize administrative friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pipelineStages.map((stage, idx) => (
            <div 
              key={idx} 
              className="glass-panel hover:border-cyan-500/20 p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1"
            >
              <div>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-white/5 group-hover:border-cyan-500/20 transition-colors">
                  {stage.icon}
                </div>
                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                  {stage.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {stage.description}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between text-[10px]">
                <span className="px-2.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-white/5">
                  {stage.tag}
                </span>
                <span className="text-slate-500 font-bold">Stage 0{idx + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Role Consoles Card Deck */}
      <section id="roles" className="mx-auto max-w-7xl px-6 py-12 border-t border-white/5">
        <RoleCardDeck />
      </section>

      {/* Live Leaders / Ward Performance */}
      <section id="leaderboard" className="mx-auto max-w-7xl px-6 py-16 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 text-left flex flex-col gap-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
              Transparency Through Live Metrics
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              We publish real-time municipal ward metrics publicly. Municipalities compete on a live leaderboard ranking response times, trust ratings, and closure rates, preventing bureaucratic backlogs.
            </p>
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Publicly auditable blockchain-style logs</span>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Dynamic Ward performance leaderboards</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Auto-escalation parameters for unaddressed SLAs</span>
              </div>
            </div>
            <Link 
              href="/public-stats"
              className="mt-4 px-5 py-3 rounded-xl border border-cyan-500/10 text-cyan-400 hover:bg-cyan-500/5 transition-all text-xs font-bold w-fit flex items-center gap-2"
            >
              Access Transparency Portal <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>

          <div className="lg:col-span-7">
            <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/40">
                <span className="text-xs font-bold text-white tracking-wider uppercase">Ward Performance Registry</span>
                <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/20 border border-emerald-500/10 animate-pulse">Live</span>
              </div>
              
              <div className="divide-y divide-white/5 text-xs">
                <div className="p-4 grid grid-cols-12 gap-2 text-slate-400 font-bold bg-slate-950/30">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-4 text-left">Ward/Zone</div>
                  <div className="col-span-3 text-center">Avg Response</div>
                  <div className="col-span-2 text-center">Trust Rating</div>
                  <div className="col-span-2 text-right">Resolved</div>
                </div>

                {[
                  { rank: "01", name: "Ward 142 - Jubilee Hills, HYD", time: "11.2 Hrs", rating: "98.4%", resolved: "942" },
                  { rank: "02", name: "Ward 88 - Bandra West, BOM", time: "14.5 Hrs", rating: "96.1%", resolved: "1,208" },
                  { rank: "03", name: "Ward 12 - Indiranagar, BLR", time: "16.1 Hrs", rating: "94.8%", resolved: "819" },
                  { rank: "04", name: "Ward 55 - Adyar, CHN", time: "19.8 Hrs", rating: "91.2%", resolved: "630" },
                  { rank: "05", name: "Ward 21 - Connaught Place, DEL", time: "22.4 Hrs", rating: "89.5%", resolved: "511" },
                ].map((row, idx) => (
                  <div key={idx} className="p-4 grid grid-cols-12 gap-2 text-slate-200 hover:bg-white/[0.02] transition-colors items-center">
                    <div className="col-span-1 font-bold text-cyan-400">{row.rank}</div>
                    <div className="col-span-4 text-left font-semibold text-white">{row.name}</div>
                    <div className="col-span-3 text-center">{row.time}</div>
                    <div className="col-span-2 text-center text-emerald-400 font-bold">{row.rating}</div>
                    <div className="col-span-2 text-right font-medium text-slate-400">{row.resolved}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-slate-950/40 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-cyan-500" />
            <span className="text-sm font-bold text-white tracking-wider">CIVICTRUST</span>
          </div>
          <div>© {new Date().getFullYear()} CivicTrust (CGTA). Designed for municipal audits & high accountability.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security Audits</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
