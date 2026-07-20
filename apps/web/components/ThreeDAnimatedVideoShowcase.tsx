"use client";

import React, { useRef, useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Sparkles, 
  ShieldCheck, 
  Camera, 
  MapPin, 
  FileCheck, 
  Layers,
  CheckCircle2,
  Tv,
  Zap,
  Activity,
  Cpu
} from "lucide-react";

interface VideoPreset {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  videoUrl?: string; // Optional MP4/WebM URL
  posterImage: string;
  duration: string;
  stepDetails: {
    stage: string;
    description: string;
    metric: string;
  }[];
}

export default function ThreeDAnimatedVideoShowcase() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activePreset, setActivePreset] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [currentOverlayStep, setCurrentOverlayStep] = useState(0);

  const videoPresets: VideoPreset[] = [
    {
      id: "ai-photo-scan",
      title: "4K AI Photo Verification & EXIF Forensic Scan",
      subtitle: "Demonstrates photo ingestion, EXIF hardware validation & deepfake detection in real time.",
      badge: "4K HDR • 60 FPS",
      posterImage: "/pothole_ai_verification.png",
      duration: "00:15",
      stepDetails: [
        { stage: "01. RAW PHOTO INGESTION", description: "Extracting hardware serials & lens focal metadata", metric: "3.4MB EXIF Header" },
        { stage: "02. ANTI-FORGERY SCAN", description: "Checking quantization tables & Photoshop resampling", metric: "0% Tampering Detected" },
        { stage: "03. 100M GEOFENCE LOCK", description: "Matching GPS latitude/longitude against complaint spot", metric: "14.2m Radius (PASS)" },
        { stage: "04. TRUST SCORE GENERATION", description: "Calculating 0-100 multidimensional integrity rating", metric: "Score: 98.6 (VERIFIED)" }
      ]
    },
    {
      id: "city-geofence-twin",
      title: "4K 3D City Digital Twin & 100m Geofence Radar",
      subtitle: "Simulates officer arrival geofencing and spatial duplicate ticket aggregation across city wards.",
      badge: "4K ULTRA HD",
      posterImage: "/city_telemetry_audit_map.png",
      duration: "00:20",
      stepDetails: [
        { stage: "01. WARD GRID INDEXING", description: "Mapping 142 wards into 3D isometric spatial matrix", metric: "142 Active Wards" },
        { stage: "02. DUPLICATE CLUSTERING", description: "Grouping incidents within 50m into single Master Ticket", metric: "Clustered to #TK-1042" },
        { stage: "03. OFFICER GEOFENCE CHECK", description: "Validating resolution photos taken on-site by officer", metric: "Within 100m Boundary" }
      ]
    },
    {
      id: "municipal-command",
      title: "4K Municipal Control Room & TPA Arbitration Queue",
      subtitle: "Real-time visualization of supervisor escalation when citizen rejections require neutral audit.",
      badge: "4K PRO STUDIO",
      posterImage: "/municipal_control_room.png",
      duration: "00:18",
      stepDetails: [
        { stage: "01. REJECTION TRIGGER", description: "Citizen rejects officer resolution for 2nd time", metric: "TPA Lock Activated" },
        { stage: "02. EVIDENCE AUDIT", description: "Independent auditor reviews timestamped EXIF logs", metric: "Immutable Audit Trail" },
        { stage: "03. TICKET ARBITRATION", description: "Final binding resolution dispatched to municipal ledger", metric: "Escalation Closed" }
      ]
    }
  ];

  const preset = videoPresets[activePreset];

  // Animated procedural video canvas loop (renders high-tech 3D video simulation if HTML5 video has no MP4 stream)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let progress = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (isPlaying) {
        progress = (progress + 0.005) % 1;
        setVideoProgress(progress);
        
        // Cycle HUD Overlay steps
        const stepIdx = Math.floor(progress * preset.stepDetails.length);
        setCurrentOverlayStep(stepIdx);
      }

      const time = Date.now() * 0.0015;
      const cx = w / 2;
      const cy = h / 2;

      // Render Animated Video Background Grid & Particle Rays
      const bgGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, w * 0.6);
      bgGrad.addColorStop(0, "#030712");
      bgGrad.addColorStop(0.5, "#0b1329");
      bgGrad.addColorStop(1, "#02040a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Render 3D Scanning Ring Arrays (Video Graphics)
      for (let i = 1; i <= 4; i++) {
        const radius = 60 * i + Math.sin(time + i) * 10;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 - i * 0.06})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 12]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Moving High-Tech Laser Beam Sweep across video frame
      const scanY = (progress * h);
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      const laserGrad = ctx.createLinearGradient(0, scanY, w, scanY);
      laserGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
      laserGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.9)");
      laserGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 3;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Floating Holographic Photo Card in Video 3D Space
      const cardW = 340;
      const cardH = 200;
      const tiltX = Math.sin(time * 1.2) * 15;
      const tiltY = Math.cos(time * 0.9) * 10;

      ctx.save();
      ctx.translate(cx + tiltX, cy + tiltY);
      
      // Photo Frame Shadow Glow
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 30;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);
      ctx.shadowBlur = 0;

      // Inner Photo Card Fill
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(-cardW / 2 + 4, -cardH / 2 + 4, cardW - 8, cardH - 8);

      // Video Crosshair Markers
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      const chSize = 12;
      // Top Left Corner
      ctx.beginPath();
      ctx.moveTo(-cardW / 2 - 8, -cardH / 2 + chSize);
      ctx.lineTo(-cardW / 2 - 8, -cardH / 2 - 8);
      ctx.lineTo(-cardW / 2 + chSize, -cardH / 2 - 8);
      ctx.stroke();

      // Top Right Corner
      ctx.beginPath();
      ctx.moveTo(cardW / 2 + 8, -cardH / 2 + chSize);
      ctx.lineTo(cardW / 2 + 8, -cardH / 2 - 8);
      ctx.lineTo(cardW / 2 - chSize, -cardH / 2 - 8);
      ctx.stroke();

      // Floating Live Text Telemetry
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("AI PHOTO FORENSIC ENGINE • SCANNING", -cardW / 2 + 15, -cardH / 2 + 30);

      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
      ctx.fillText(`STAGE: ${preset.stepDetails[currentOverlayStep]?.stage || "SCANNING"}`, -cardW / 2 + 15, -cardH / 2 + 55);
      ctx.fillText(`METRIC: ${preset.stepDetails[currentOverlayStep]?.metric || "PROCESSING"}`, -cardW / 2 + 15, -cardH / 2 + 75);

      // Status Badge
      ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
      ctx.fillRect(-cardW / 2 + 15, cardH / 2 - 35, 130, 22);
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("VERIFIED • NO EDITS", -cardW / 2 + 25, cardH / 2 - 21);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, activePreset, preset.stepDetails, currentOverlayStep]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto rounded-3xl border border-cyan-500/25 bg-[#030712]/95 backdrop-blur-2xl p-6 md:p-8 overflow-hidden shadow-2xl shadow-cyan-950/50">
      
      {/* Decorative Grid & Glow Ambient Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.4) 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] bg-cyan-500/10 blur-[140px] pointer-events-none rounded-full" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/10 pb-6">
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              4K Video Animated Presentation
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {preset.badge}
            </span>
          </div>

          <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            {preset.title} <Tv className="h-6 w-6 text-cyan-400" />
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl font-mono">
            {preset.subtitle}
          </p>
        </div>

        {/* Preset Video Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 p-2 rounded-2xl border border-white/10">
          {videoPresets.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => { setActivePreset(idx); setVideoProgress(0); setIsPlaying(true); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                activePreset === idx
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 scale-105"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Demo #{idx + 1}
            </button>
          ))}
        </div>

      </div>

      {/* 4K Animated Video Player Stage & Cyber HUD Overlay */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 relative z-10">
        
        {/* Main 4K Animated Video Player Frame (8 Columns) */}
        <div className="lg:col-span-8 rounded-2xl border border-white/15 bg-slate-950 relative overflow-hidden group shadow-2xl min-h-[440px] flex flex-col justify-between">
          
          {/* HTML5 Video or Procedural 3D Canvas Fallback Video Stream */}
          <div className="absolute inset-0 w-full h-full">
            <canvas 
              ref={canvasRef} 
              width={960} 
              height={540} 
              className="w-full h-full object-cover block"
            />
            {preset.videoUrl && (
              <video
                ref={videoRef}
                src={preset.videoUrl}
                poster={preset.posterImage}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover absolute inset-0 opacity-90"
              />
            )}
          </div>

          {/* Top Video HUD Bar */}
          <div className="relative z-20 p-4 flex items-center justify-between pointer-events-none bg-gradient-to-b from-slate-950/80 to-transparent">
            <div className="flex items-center gap-2 font-mono text-[10px] text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <span>LIVE 4K ANIMATED STREAM</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md bg-slate-900/80 text-[10px] font-mono text-slate-300 border border-white/10">
                RES: 3840 x 2160 (4K)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-cyan-950/80 text-[10px] font-mono text-cyan-400 border border-cyan-500/30 font-bold">
                60.0 FPS
              </span>
            </div>
          </div>

          {/* Floating Cyber HUD Crosshair in Center of Video */}
          <div className="relative z-20 flex-1 flex items-center justify-center pointer-events-none">
            <div className="relative h-48 w-72 rounded-2xl border border-cyan-400/40 bg-slate-950/30 backdrop-blur-xs flex flex-col justify-between p-4 shadow-2xl animate-pulse">
              <div className="flex justify-between items-center text-[9px] font-mono text-cyan-400 font-bold">
                <span>[SCANNING FRAME]</span>
                <span>HUD v4.2</span>
              </div>
              <div className="text-center font-mono space-y-1">
                <div className="text-xs font-extrabold text-white uppercase tracking-wider">
                  {preset.stepDetails[currentOverlayStep]?.stage}
                </div>
                <div className="text-[10px] text-cyan-300">
                  {preset.stepDetails[currentOverlayStep]?.description}
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] font-mono text-emerald-400">
                <span>{preset.stepDetails[currentOverlayStep]?.metric}</span>
                <span>VERIFIED</span>
              </div>
            </div>
          </div>

          {/* Bottom Custom Video Player Control Bar */}
          <div className="relative z-20 p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent space-y-3">
            
            {/* Scrubber Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden cursor-pointer">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-100"
                style={{ width: `${videoProgress * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-slate-300">
              <div className="flex items-center gap-4">
                <button 
                  onClick={togglePlay}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all border border-white/10"
                >
                  {isPlaying ? <Pause className="h-4 w-4 text-cyan-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
                </button>

                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all border border-white/10"
                >
                  {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-cyan-400" />}
                </button>

                <span className="text-[11px] text-slate-400">
                  00:{Math.floor(videoProgress * 18).toString().padStart(2, '0')} / {preset.duration}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">4K Animated Video Stream</span>
              </div>
            </div>

          </div>

        </div>

        {/* Side Video Breakdown & Live Stage Steps (4 Columns) */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 h-full flex flex-col justify-between">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4" /> Animated Sequence Stages
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Step {currentOverlayStep + 1} of {preset.stepDetails.length}
                </span>
              </div>

              {/* Stage Checklist */}
              <div className="space-y-3 pt-1">
                {preset.stepDetails.map((step, idx) => {
                  const isActive = currentOverlayStep === idx;
                  return (
                    <div 
                      key={idx}
                      onClick={() => setCurrentOverlayStep(idx)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-300 ${
                        isActive
                          ? "bg-slate-950 border-cyan-500 shadow-md shadow-cyan-500/20 scale-[1.02]"
                          : "bg-slate-950/40 border-white/5 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-white mb-1">
                        <span>{step.stage}</span>
                        {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono leading-relaxed">{step.description}</p>
                      <div className="mt-2 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded w-fit border border-emerald-500/20">
                        {step.metric}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="pt-4 border-t border-white/10">
              <button 
                onClick={() => {
                  setActivePreset((prev) => (prev + 1) % videoPresets.length);
                  setVideoProgress(0);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <Zap className="h-4 w-4" /> Load Next 4K Video Sequence
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
