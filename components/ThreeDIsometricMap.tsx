"use client";

import React, { useState, useEffect, useRef } from "react";

interface Building {
  x: number;
  y: number;
  w: number;
  l: number;
  h: number;
  label: string;
}

interface IncidentPin {
  x: number;
  y: number;
  id: string;
  category: string;
  status: string;
  offset: string;
}

export default function ThreeDIsometricMap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [yaw, setYaw] = useState(0.4);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0 });
  const [activePin, setActivePin] = useState<IncidentPin | null>(null);

  const buildings: Building[] = [
    { x: -100, y: -100, w: 50, l: 50, h: 60, label: "Metro Station" },
    { x: 60, y: -90, w: 40, l: 40, h: 80, label: "Civic Center" },
    { x: -90, y: 50, w: 45, l: 45, h: 50, label: "HQ Complex" },
    { x: 50, y: 40, w: 50, l: 50, h: 90, label: "Tech Hub" }
  ];

  const incidents: IncidentPin[] = [
    { x: 0, y: -60, id: "G-102", category: "Pothole Resolved", status: "VERIFIED", offset: "12m GPS offset" },
    { x: -50, y: 0, id: "G-104", category: "Garbage Cleared", status: "VERIFIED", offset: "24m GPS offset" },
    { x: 30, y: -10, id: "G-106", category: "Streetlight Fixed", status: "PENDING TPA", offset: "85m GPS offset" },
    { x: 0, y: 80, id: "G-108", category: "Water Leakage", status: "VERIFIED", offset: "18m GPS offset" }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let localYaw = yaw;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = Math.min(360, canvas.parentElement.clientWidth - 48);
      } else {
        canvas.width = 360;
      }
      canvas.height = 320;
    };
    window.addEventListener("resize", resize);
    resize();

    const project = (x: number, y: number, z: number, w: number, h: number) => {
      const cosY = Math.cos(localYaw);
      const sinY = Math.sin(localYaw);
      const rx = x * cosY - y * sinY;
      const ry = x * sinY + y * cosY;

      // Isometric projection projection
      const isoX = w / 2 + (rx - ry) * Math.cos(Math.PI / 6);
      const isoY = h / 2 + (rx + ry) * Math.sin(Math.PI / 6) - z;

      return { x: isoX, y: isoY };
    };

    const drawBuilding = (b: Building, w: number, h: number) => {
      const pts = [
        project(b.x, b.y, 0, w, h),                 // 0
        project(b.x + b.w, b.y, 0, w, h),           // 1
        project(b.x + b.w, b.y + b.l, 0, w, h),     // 2
        project(b.x, b.y + b.l, 0, w, h),           // 3
        project(b.x, b.y, b.h, w, h),               // 4
        project(b.x + b.w, b.y, b.h, w, h),         // 5
        project(b.x + b.w, b.y + b.l, b.h, w, h),   // 6
        project(b.x, b.y + b.l, b.h, w, h)          // 7
      ];

      // Draw Glass Filled building sides for 3D Hologram depth
      ctx.fillStyle = "rgba(79, 70, 229, 0.03)";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[5].x, pts[5].y);
      ctx.lineTo(pts[4].x, pts[4].y);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(pts[1].x, pts[1].y);
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[6].x, pts[6].y);
      ctx.lineTo(pts[5].x, pts[5].y);
      ctx.closePath();
      ctx.fill();

      // Building wireframe pillars
      ctx.strokeStyle = "rgba(79, 70, 229, 0.22)";
      ctx.lineWidth = 0.85;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[i + 4].x, pts[i + 4].y);
        ctx.stroke();
      }

      // Glowing roof outlines (Gold)
      ctx.strokeStyle = "rgba(229, 193, 88, 0.45)";
      ctx.beginPath();
      ctx.moveTo(pts[4].x, pts[4].y);
      for (let i = 5; i < 8; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.stroke();
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      if (!isDragging) {
        localYaw += 0.0025;
      }

      // Ground grids (Hologram style)
      ctx.strokeStyle = "rgba(229, 193, 88, 0.06)";
      ctx.lineWidth = 0.75;
      const gridSize = 160;
      for (let step = -gridSize; step <= gridSize; step += 40) {
        const p1 = project(-gridSize, step, 0, w, h);
        const p2 = project(gridSize, step, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const p3 = project(step, -gridSize, 0, w, h);
        const p4 = project(step, gridSize, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
      }

      // Draw buildings
      buildings.forEach((b) => drawBuilding(b, w, h));

      // Draw active incident pins
      let hovered: IncidentPin | null = null;

      incidents.forEach((pin) => {
        const pt = project(pin.x, pin.y, 0, w, h);

        // Holographic vertical laser line rising up from pin base
        ctx.strokeStyle = pin.status === "VERIFIED" 
          ? "rgba(229, 193, 88, 0.15)"
          : "rgba(239, 68, 68, 0.22)";
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x, pt.y - 45);
        ctx.stroke();

        // Pulsing geofence circles at the pin base
        const pulse = 10 + Math.sin(Date.now() * 0.007) * 4;
        ctx.strokeStyle = pin.status === "VERIFIED"
          ? "rgba(229, 193, 88, 0.3)"
          : "rgba(239, 68, 68, 0.35)";
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, pulse * 1.5, pulse * 0.75, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Pin top point
        ctx.fillStyle = pin.status === "VERIFIED" ? "#e5c158" : "#ef4444";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 18, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Hover checking
        const dist = Math.hypot(mouseX - pt.x, mouseY - (pt.y - 18));
        if (dist < 14) {
          hovered = pin;
        }
      });

      if (hovered) {
        setActivePin(hovered);
      }

      animId = requestAnimationFrame(render);
    };

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;

      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        localYaw += dx * 0.004;
        setDragStart({ x: e.clientX });
        setYaw(localYaw);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, yaw]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full bg-slate-950/45 p-6 rounded-3xl border border-emerald-500/10 min-h-[360px]">
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-blue-500/5 to-transparent pointer-events-none rounded-3xl" />

      <canvas
        ref={canvasRef}
        width={360}
        height={320}
        className="cursor-grab active:cursor-grabbing max-w-full relative z-10"
      />

      {activePin ? (
        <div className="absolute bottom-4 p-4 bg-slate-950/90 border border-emerald-500/30 rounded-2xl w-[90%] text-left shadow-2xl z-25 backdrop-blur animate-fade-in-up">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              {activePin.id} LOCKED
            </span>
            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase font-mono ${activePin.status === "VERIFIED" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-red-500/15 text-red-400 border-red-500/25"} border`}>
              {activePin.status}
            </span>
          </div>
          <h4 className="text-xs font-bold text-white mt-1">{activePin.category}</h4>
          <p className="text-[9px] text-slate-500 mt-1 font-mono">{activePin.offset}</p>
        </div>
      ) : (
        <div className="absolute bottom-4 p-3 bg-slate-900/60 border border-white/5 rounded-xl w-[90%] text-center text-slate-500 text-[9px] font-mono uppercase tracking-wider z-20">
          Drag to spin grid. Hover nodes to read telemetry.
        </div>
      )}
    </div>
  );
}
