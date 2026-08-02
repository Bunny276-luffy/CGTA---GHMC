"use client";

import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, ArrowLeft, BarChart3, Map, TrendingUp, Users, CheckCircle, ShieldAlert, Award } from "lucide-react";
import Link from "next/link";

interface LeaderboardRow {
  rank: string;
  ward: string;
  response: string;
  trust: string;
  resolved: number;
}

export default function PublicStatsPage() {
  const [activeMetric, setActiveMetric] = useState<"response" | "trust" | "volume">("response");
  
  // Custom Heatmap rendering on Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const leaderboard: LeaderboardRow[] = [
    { rank: "01", ward: "Ward 142 - Jubilee Hills, HYD", response: "11.2 Hrs", trust: "98.4%", resolved: 942 },
    { rank: "02", ward: "Ward 88 - Bandra West, BOM", response: "14.5 Hrs", trust: "96.1%", resolved: 1208 },
    { rank: "03", ward: "Ward 12 - Indiranagar, BLR", response: "16.1. Hrs", trust: "94.8%", resolved: 819 },
    { rank: "04", ward: "Ward 55 - Adyar, CHN", response: "19.8 Hrs", trust: "91.2%", resolved: 630 },
    { rank: "05", ward: "Ward 21 - Connaught Place, DEL", response: "22.4 Hrs", trust: "89.5%", resolved: 511 },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    
    // Grid hotspots representing geographic coordinates
    const nodes = [
      { x: 90, y: 120, size: 30, value: 0.8, name: "Sub-Zone A" },
      { x: 180, y: 70, size: 45, value: 0.95, name: "Sub-Zone B" },
      { x: 260, y: 160, size: 25, value: 0.6, name: "Sub-Zone C" },
      { x: 140, y: 220, size: 50, value: 0.85, name: "Sub-Zone D" },
    ];

    const drawHeatmap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw map background grids
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      for (let i = 20; i < w; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
      }

      // Draw contour limits
      ctx.strokeStyle = "rgba(0, 240, 255, 0.1)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 60);
      ctx.quadraticCurveTo(150, 20, 240, 80);
      ctx.quadraticCurveTo(340, 120, 300, 220);
      ctx.quadraticCurveTo(240, 260, 120, 240);
      ctx.quadraticCurveTo(20, 200, 40, 60);
      ctx.stroke();

      // Render glowing Heatmap spots
      nodes.forEach((node) => {
        const pulse = 1 + Math.sin(Date.now() * 0.003 + node.x) * 0.08;
        const radius = node.size * pulse;

        // Visual radial gradient to represent thermographic heat
        const grad = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, radius);
        
        // Heat values mapping
        if (node.value > 0.9) {
          // Extreme hot
          grad.addColorStop(0, "rgba(239, 68, 68, 0.55)");
          grad.addColorStop(0.3, "rgba(239, 68, 68, 0.25)");
          grad.addColorStop(0.7, "rgba(245, 158, 11, 0.08)");
          grad.addColorStop(1, "rgba(245, 158, 11, 0)");
        } else {
          // Moderate
          grad.addColorStop(0, "rgba(245, 158, 11, 0.5)");
          grad.addColorStop(0.4, "rgba(245, 158, 11, 0.2)");
          grad.addColorStop(0.8, "rgba(0, 240, 255, 0.05)");
          grad.addColorStop(1, "rgba(0, 240, 255, 0)");
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Node center marker
        ctx.fillStyle = node.value > 0.9 ? "rgba(239, 68, 68, 0.7)" : "rgba(245, 158, 11, 0.7)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "8px monospace";
        ctx.fillText(`${node.name}`, node.x - 20, node.y - 8);
      });

      animId = requestAnimationFrame(drawHeatmap);
    };

    drawHeatmap();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#030308] text-slate-100 flex flex-col">
      {/* Background orbs */}
      <div className="absolute top-[10%] left-[5%] h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] h-[500px] w-[500px] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="border-b border-white/5 bg-[#030308]/70 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="h-9 w-9 bg-slate-900 border border-white/5 hover:border-cyan-500/20 text-slate-400 hover:text-white rounded-lg flex items-center justify-center transition-all"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center">
                <ShieldCheck className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-sm font-black tracking-wider text-white">
                CIVIC<span className="text-cyan-400">TRUST</span>
              </span>
            </div>
          </div>
          <span className="text-xs text-emerald-400 font-bold bg-emerald-950/20 px-3 py-1 rounded-full border border-emerald-500/10">
            Open Civic Data Ledger
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow mx-auto max-w-7xl px-6 py-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Stats cards & Leaderboard */}
        <div className="lg:col-span-7 space-y-8 text-left">
          
          {/* Headline */}
          <div>
            <h2 className="text-2xl font-black text-white text-glow">Civic Transparency Metrics</h2>
            <p className="text-xs text-slate-500 mt-1">Real-time public performance tracking of municipal zones</p>
          </div>

          {/* Core metrics counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-xl border-white/5 flex gap-3 items-center">
              <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm text-slate-400">Ledgers Closed</h4>
                <p className="text-lg font-black text-white mt-0.5">3,780</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border-white/5 flex gap-3 items-center">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm text-slate-400">Avg Resolution</h4>
                <p className="text-lg font-black text-white mt-0.5">14.8 Hrs</p>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-xl border-white/5 flex gap-3 items-center">
              <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm text-slate-400">Anomaly Detections</h4>
                <p className="text-lg font-black text-white mt-0.5">248</p>
              </div>
            </div>
          </div>

          {/* Performance Leaderboard */}
          <div className="glass-panel rounded-2xl border-white/5 overflow-hidden">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Award className="h-4.5 w-4.5 text-cyan-400" />
                Inter-Municipal Ward Standings
              </span>
              <span className="text-[10px] text-slate-400">Daily Update cycle</span>
            </div>

            <div className="divide-y divide-white/5 text-xs">
              <div className="p-4 grid grid-cols-12 gap-2 text-slate-500 font-bold bg-slate-950/40">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4 text-left">Ward Details</div>
                <div className="col-span-3 text-center">Resolution Target</div>
                <div className="col-span-2 text-center">AI Trust Score</div>
                <div className="col-span-2 text-right">Closed</div>
              </div>

              {leaderboard.map((row, idx) => (
                <div key={idx} className="p-4 grid grid-cols-12 gap-2 text-slate-200 hover:bg-white/[0.01] transition-colors items-center">
                  <div className="col-span-1 font-extrabold text-cyan-400">{row.rank}</div>
                  <div className="col-span-4 text-left font-bold text-white">{row.ward}</div>
                  <div className="col-span-3 text-center">{row.response}</div>
                  <div className="col-span-2 text-center text-emerald-400 font-bold">{row.trust}</div>
                  <div className="col-span-2 text-right font-medium text-slate-400">{row.resolved}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Geocoding heatmap display */}
        <div className="lg:col-span-5 space-y-6 text-left">
          
          <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-4">
            <div className="border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Predictive Infrastructure Heatmap</h3>
              <p className="text-[10px] text-slate-500 mt-1">Thermographical representation of active structural decays (potholes, pipeline bursts)</p>
            </div>

            {/* Canvas map widget */}
            <div className="flex justify-center bg-slate-950/40 border border-white/5 rounded-xl p-4">
              <canvas ref={canvasRef} width={320} height={280} className="max-w-full" />
            </div>

            <div className="space-y-2.5 text-[10px] text-slate-400 leading-relaxed">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span><strong className="text-white">Red hotspots:</strong> High severity/frequency failure zones (&gt; 3 incidents)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span><strong className="text-white">Amber hotspots:</strong> Standard warning zones (recent reports under evaluation)</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Why Trust CivicTrust?</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every complaint is certified by independent cryptographic checks. Photos require unaltered EXIF parameters matching the exact geographic coordinates, eliminating duplicate or malicious reports and ensuring public funding resolves real structural problems.
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}
