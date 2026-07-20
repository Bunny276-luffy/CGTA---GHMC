"use client";

import React, { useRef, useEffect, useState } from "react";
import { 
  Camera, 
  ShieldCheck, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Cpu, 
  FileCheck, 
  Crosshair,
  ArrowRight,
  Zap,
  Lock
} from "lucide-react";

interface VerificationStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tag: string;
  color: string;
  details: {
    label: string;
    value: string;
    status: "PASS" | "WARN" | "INFO";
  }[];
}

export default function ThreeDPhotoVerificationSimulator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedSample, setSelectedSample] = useState(0);

  const samplePhotos = [
    {
      title: "Pothole Issue - Ward 142",
      image: "/pothole_ai_verification.png",
      lat: 17.4401,
      lng: 78.3489,
      camera: "iPhone 15 Pro (Apple iOS 17.2)",
      software: "Original Hardware (No Edits)",
      distance: "14.2 meters",
      duplicates: "0 Nearby (Unique Ticket)",
      trustScore: 98.6,
      status: "APPROVED"
    },
    {
      title: "Drainage Overflow - Ward 88",
      image: "/city_telemetry_audit_map.png",
      lat: 19.0760,
      lng: 72.8777,
      camera: "Samsung Galaxy S24 Ultra",
      software: "Original Hardware",
      distance: "32.8 meters",
      duplicates: "2 Incidents (Clustered to Master #1042)",
      trustScore: 94.2,
      status: "CLUSTERED"
    },
    {
      title: "Control Room Audit - Ward 12",
      image: "/municipal_control_room.png",
      lat: 12.9716,
      lng: 77.5946,
      camera: "Google Pixel 8 Pro",
      software: "Photoshop CS6 (MODIFIED)",
      distance: "142.5 meters (OUTSIDE GEOFENCE)",
      duplicates: "0 Nearby",
      trustScore: 31.0,
      status: "REJECTED"
    }
  ];

  const currentSample = samplePhotos[selectedSample];

  const steps: VerificationStep[] = [
    {
      id: 0,
      title: "1. Photo Ingestion & Parsing",
      subtitle: "Extract raw EXIF headers & camera hardware tags",
      icon: <Camera className="h-5 w-5 text-cyan-400" />,
      tag: "Raw Ingestion",
      color: "#38bdf8",
      details: [
        { label: "Camera Hardware", value: currentSample.camera, status: "PASS" },
        { label: "Coordinates Captured", value: `${currentSample.lat}° N, ${currentSample.lng}° E`, status: "INFO" },
        { label: "Metadata Stream", value: "3.4 MB Uncompressed RAW", status: "PASS" }
      ]
    },
    {
      id: 1,
      title: "2. EXIF & Deepfake Scanner",
      subtitle: "Detect manipulation, Photoshop, or AI generation",
      icon: <FileCheck className="h-5 w-5 text-purple-400" />,
      tag: "Anti-Forgery",
      color: currentSample.status === "REJECTED" ? "#f43f5e" : "#c084fc",
      details: [
        { label: "Software Header", value: currentSample.software, status: currentSample.status === "REJECTED" ? "WARN" : "PASS" },
        { label: "Quantization Table", value: currentSample.status === "REJECTED" ? "Non-standard Manipulation" : "Hardware Standard Matching", status: currentSample.status === "REJECTED" ? "WARN" : "PASS" },
        { label: "Pixel Noise Distribution", value: currentSample.status === "REJECTED" ? "Resampling Artifacts Found" : "Uniform Sensor Noise", status: currentSample.status === "REJECTED" ? "WARN" : "PASS" }
      ]
    },
    {
      id: 2,
      title: "3. 100m GPS Geofence Lock",
      subtitle: "Verify on-site location against citizen report",
      icon: <MapPin className="h-5 w-5 text-emerald-400" />,
      tag: "Spatial Verification",
      color: currentSample.status === "REJECTED" ? "#f43f5e" : "#34d399",
      details: [
        { label: "Distance Offset", value: currentSample.distance, status: currentSample.status === "REJECTED" ? "WARN" : "PASS" },
        { label: "Geofence Radius Limit", value: "100.0 Meters", status: "INFO" },
        { label: "GPS Satellites Locked", value: "12 Satellites (High Precision)", status: "PASS" }
      ]
    },
    {
      id: 3,
      title: "4. Spatial Deduplication Filter",
      subtitle: "Check 50m radius for existing reports",
      icon: <Layers className="h-5 w-5 text-amber-400" />,
      tag: "Cluster Engine",
      color: "#fbbf24",
      details: [
        { label: "Duplicate Status", value: currentSample.duplicates, status: "INFO" },
        { label: "Clustering Algorithm", value: "Haversine Spatial Matrix", status: "PASS" },
        { label: "Master Ticket ID", value: "#TK-88942", status: "PASS" }
      ]
    },
    {
      id: 4,
      title: "5. Trust Score & Routing",
      subtitle: "Generate Trust Rating (0-100) & dispatch officer",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
      tag: "Verification Complete",
      color: currentSample.status === "REJECTED" ? "#f43f5e" : "#10b981",
      details: [
        { label: "Final Trust Score", value: `${currentSample.trustScore} / 100`, status: currentSample.status === "REJECTED" ? "WARN" : "PASS" },
        { label: "Verification Status", value: currentSample.status, status: currentSample.status === "REJECTED" ? "WARN" : "PASS" },
        { label: "Officer Queue", value: currentSample.status === "REJECTED" ? "Flagged for Admin Review" : "Dispatched to Zone Officer #14", status: "PASS" }
      ]
    }
  ];

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  // 3D Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resizeCanvas = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let scanProgress = 0;
    let particles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; color: string }> = [];

    const img = new Image();
    img.src = currentSample.image;

    const render = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const time = Date.now() * 0.002;
      const cx = w / 2;
      const cy = h / 2;

      // Draw Grid Floor Perspective
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      for (let x = -w; x < w * 2; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(cx + (x - cx) * 0.4, cy);
        ctx.stroke();
      }
      for (let y = cy; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();

      // Step 0 & 1: 3D Photo Card with Scanning Laser Beam
      const cardW = 320;
      const cardH = 220;
      const cardX = cx - cardW / 2;
      const cardY = cy - cardH / 2 - 15;

      // 3D Card Tilt Math
      const tiltAngle = Math.sin(time * 0.8) * 0.05;

      ctx.save();
      ctx.translate(cx, cy - 15);
      ctx.rotate(tiltAngle);

      // Photo Card Shadow Glow
      ctx.shadowColor = steps[currentStep].color;
      ctx.shadowBlur = 25;

      // Draw Outer Frame
      ctx.strokeStyle = steps[currentStep].color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);

      // Draw Background Image
      if (img.complete && img.naturalWidth !== 0) {
        ctx.drawImage(img, -cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH - 12);
      } else {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH - 12);
      }

      // Scanner Laser Line (Active in Step 0, 1, 2)
      scanProgress = (scanProgress + 0.015) % 1;
      const laserY = -cardH / 2 + scanProgress * cardH;

      ctx.beginPath();
      ctx.moveTo(-cardW / 2, laserY);
      ctx.lineTo(cardW / 2, laserY);
      ctx.strokeStyle = steps[currentStep].color;
      ctx.lineWidth = 3;
      ctx.shadowColor = steps[currentStep].color;
      ctx.shadowBlur = 15;
      ctx.stroke();

      // Laser Spark Particles
      if (Math.random() > 0.4) {
        particles.push({
          x: (Math.random() - 0.5) * cardW,
          y: laserY,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 2,
          alpha: 1,
          color: steps[currentStep].color
        });
      }

      // Render Particles
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      particles = particles.filter(p => p.alpha > 0);

      // Render Floating 3D Metadata Nodes depending on current step
      if (currentStep === 0 || currentStep === 1) {
        // Floating EXIF Tags
        const tags = [
          { text: `CAM: ${currentSample.camera.split("(")[0]}`, offX: -cardW / 2 - 90, offY: -60 },
          { text: `GPS: ${currentSample.lat.toFixed(2)}°, ${currentSample.lng.toFixed(2)}°`, offX: cardW / 2 + 20, offY: -30 },
          { text: `INTEGRITY: ${currentSample.status === "REJECTED" ? "TAMPERED" : "VALID"}`, offX: -cardW / 2 - 90, offY: 50 }
        ];

        tags.forEach(t => {
          ctx.font = "bold 10px monospace";
          ctx.fillStyle = currentSample.status === "REJECTED" ? "#f43f5e" : "#38bdf8";
          ctx.fillText(t.text, t.offX, t.offY);

          // Connecting Leader Lines
          ctx.beginPath();
          ctx.moveTo(t.offX + (t.offX < 0 ? 110 : -10), t.offY - 3);
          ctx.lineTo(t.offX < 0 ? -cardW / 2 : cardW / 2, t.offY - 3);
          ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      } else if (currentStep === 2) {
        // Step 2: 100m Geofence Rings Animation
        const ringRadius = 80 + Math.sin(time * 3) * 15;
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = currentSample.status === "REJECTED" ? "rgba(244, 63, 94, 0.8)" : "rgba(52, 211, 153, 0.8)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Outer 100m Boundary
        ctx.beginPath();
        ctx.arc(0, 0, 110, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = "bold 10px monospace";
        ctx.fillStyle = currentSample.status === "REJECTED" ? "#f43f5e" : "#34d399";
        ctx.fillText(`GEOFENCE RADIUS: ${currentSample.distance}`, -60, 130);
      } else if (currentStep === 3) {
        // Step 3: Spatial Cluster Nodes
        const clusterNodes = [
          { x: -70, y: -50, label: "Ticket #1041 (12m)" },
          { x: 80, y: 60, label: "Ticket #1042 (24m)" }
        ];

        clusterNodes.forEach(n => {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#fbbf24";
          ctx.fill();

          ctx.font = "9px monospace";
          ctx.fillStyle = "#fef08a";
          ctx.fillText(n.label, n.x + 12, n.y + 3);

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(n.x, n.y);
          ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      } else if (currentStep === 4) {
        // Step 4: Final Trust Badge Overlay
        ctx.beginPath();
        ctx.arc(0, 0, 55, 0, Math.PI * 2);
        ctx.fillStyle = currentSample.status === "REJECTED" ? "rgba(244, 63, 94, 0.9)" : "rgba(16, 185, 129, 0.9)";
        ctx.fill();

        ctx.font = "black 18px font-mono";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(`${currentSample.trustScore}`, 0, -2);

        ctx.font = "bold 9px monospace";
        ctx.fillText(currentSample.status, 0, 16);
        ctx.textAlign = "left";
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animId);
    };
  }, [currentStep, selectedSample]);

  return (
    <div className="relative w-full max-w-7xl mx-auto rounded-3xl border border-cyan-500/20 bg-[#030712]/95 backdrop-blur-xl p-6 md:p-8 overflow-hidden shadow-2xl shadow-cyan-950/40">
      
      {/* Background Neon Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15" 
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.4) 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />

      {/* Title & Controls Bar */}
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/10 pb-6">
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              Interactive 3D Verification Pipeline
            </span>
            <span className="text-[10px] font-mono text-slate-400">ENGINE v3.0</span>
          </div>

          <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            Photo Audit & Forensic Scanner <Sparkles className="h-6 w-6 text-cyan-400" />
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl font-mono">
            Simulates the step-by-step automated workflow when a citizen uploads a complaint photo—from EXIF anti-forgery scanning to 100m GPS geofencing and spatial deduplication.
          </p>
        </div>

        {/* Sample Photo Selector & Simulator Play Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-2 rounded-2xl border border-white/10">
          
          <div className="flex items-center gap-1.5">
            {samplePhotos.map((s, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedSample(idx); setCurrentStep(0); }}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all ${
                  selectedSample === idx
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Sample #{idx + 1}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all"
            title={isPlaying ? "Pause Simulation" : "Play Simulation"}
          >
            {isPlaying ? <Pause className="h-4 w-4 text-cyan-400" /> : <Play className="h-4 w-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => setCurrentStep(0)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            title="Restart Step 1"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

        </div>

      </div>

      {/* Step Tracker Pipeline Stepper */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-6 relative z-10">
        {steps.map((step) => {
          const isActive = currentStep === step.id;
          const isPassed = currentStep > step.id;

          return (
            <button
              key={step.id}
              onClick={() => { setCurrentStep(step.id); setIsPlaying(false); }}
              className={`p-3 rounded-2xl border text-left transition-all duration-300 relative overflow-hidden ${
                isActive
                  ? "bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-500/20 scale-[1.02]"
                  : isPassed
                  ? "bg-slate-950/80 border-cyan-500/30 text-slate-300"
                  : "bg-slate-950/40 border-white/5 text-slate-500 hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div 
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  {step.icon}
                </div>
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400">
                  Step {step.id + 1}
                </span>
              </div>

              <div className="text-xs font-bold text-white truncate font-mono">{step.title}</div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{step.tag}</div>

              {/* Progress Line Bar */}
              {isActive && (
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-400 to-purple-500 animate-pulse"
                  style={{ width: "100%" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Visualizer Stage & Live Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 relative z-10">
        
        {/* 3D Canvas Visualizer Viewport (8 Columns) */}
        <div
          ref={containerRef}
          className="lg:col-span-7 h-[420px] w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#060e20]/90 to-[#02050c]/95 relative overflow-hidden group shadow-inner"
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Canvas HUD Status Overlay */}
          <div className="absolute top-4 left-4 font-mono text-[10px] space-y-1 text-cyan-400/90 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-cyan-500/20">
              <Crosshair className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
              <span>ACTIVE STAGE: {steps[currentStep].title}</span>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 font-mono text-[10px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-white/10 pointer-events-none">
            <span>SAMPLE: {currentSample.title}</span>
          </div>

          <div className="absolute bottom-4 right-4 font-mono text-[10px] text-emerald-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-emerald-500/20 pointer-events-none">
            <span>PIPELINE FPS: 60 • LATENCY: 12ms</span>
          </div>

        </div>

        {/* Live Step Inspector & Diagnostics Drawer (5 Columns) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4 h-full flex flex-col justify-between">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: `${steps[currentStep].color}20` }}
                  >
                    {steps[currentStep].icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-mono">{steps[currentStep].title}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">{steps[currentStep].subtitle}</p>
                  </div>
                </div>

                <span 
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase"
                  style={{ 
                    backgroundColor: `${steps[currentStep].color}20`,
                    color: steps[currentStep].color,
                    border: `1px solid ${steps[currentStep].color}40`
                  }}
                >
                  {steps[currentStep].tag}
                </span>
              </div>

              {/* Diagnostic Checklist Output */}
              <div className="space-y-2.5 pt-2">
                {steps[currentStep].details.map((detail, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between font-mono text-xs">
                    <span className="text-slate-400">{detail.label}</span>
                    <span className={`font-bold flex items-center gap-1.5 ${
                      detail.status === "PASS" ? "text-emerald-400" : detail.status === "WARN" ? "text-rose-400" : "text-cyan-300"
                    }`}>
                      {detail.status === "PASS" && <CheckCircle2 className="h-3.5 w-3.5" />}
                      {detail.status === "WARN" && <AlertTriangle className="h-3.5 w-3.5" />}
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step Navigation Controls */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <button
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-mono text-xs font-bold transition-all"
              >
                Previous Step
              </button>

              <div className="text-xs font-mono font-bold text-slate-400">
                {currentStep + 1} / {steps.length}
              </div>

              <button
                disabled={currentStep === steps.length - 1}
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 disabled:opacity-40 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5"
              >
                Next Step <ArrowRight className="h-4 w-4" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
