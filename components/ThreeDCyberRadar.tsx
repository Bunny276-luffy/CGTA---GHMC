"use client";

import React, { useRef, useEffect, useState } from "react";
import { Terminal } from "lucide-react";

export default function ThreeDCyberRadar() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [yaw, setYaw] = useState(0.5);
  const [pitch, setPitch] = useState(0.4);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeIncident, setActiveIncident] = useState<{ id: string; label: string; offset: string } | null>(null);

  // Coordinate incident nodes
  const incidents = [
    { x: 0.6, y: -0.3, z: 0.5, id: "INC-8802", label: "Pothole Breach - Jubilee", offset: "14m" },
    { x: -0.5, y: 0.5, z: -0.4, id: "INC-4412", label: "Garbage Overflow - Bandra", offset: "48m" },
    { x: 0.2, y: 0.7, z: -0.6, id: "INC-9812", label: "Drainage Leak - Metro Spur", offset: "22m" }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let localYaw = yaw;
    let localPitch = pitch;

    const project = (x: number, y: number, z: number, w: number, h: number) => {
      // Rotation Y
      const cosY = Math.cos(localYaw);
      const sinY = Math.sin(localYaw);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      // Rotation X
      const cosP = Math.cos(localPitch);
      const sinP = Math.sin(localPitch);
      const y2 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;

      const scale = 250 / (z2 + 3);
      return {
        x: w / 2 + x1 * scale * 120,
        y: h / 2 - y2 * scale * 120,
        depth: z2,
        scale
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      if (!isDragging) {
        localYaw += 0.004; // auto orbit
      }

      // Draw concentric radar boundary rings (Gold-toned)
      ctx.strokeStyle = "rgba(229, 193, 88, 0.06)";
      ctx.lineWidth = 1;
      for (let r = 40; r <= 120; r += 40) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw 3D rotating rings (Gold & Indigo)
      ctx.lineWidth = 1.2;
      for (let r = 0; r < 3; r++) {
        ctx.strokeStyle = r === 0 
          ? "rgba(229, 193, 88, 0.38)" // Gold Primary
          : r === 1 
          ? "rgba(79, 70, 229, 0.28)"  // Indigo Secondary
          : "rgba(229, 193, 88, 0.15)"; // Amber Gold

        ctx.beginPath();
        const steps = 60;
        const radiusVal = 100 + r * 20;
        const ringAngleOffset = (Date.now() * 0.001 * (r + 1)) % (Math.PI * 2);

        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const rx = Math.sin(theta) * radiusVal * 0.008;
          const ry = r === 0 ? 0 : Math.cos(theta) * radiusVal * 0.008 * Math.sin(ringAngleOffset);
          const rz = Math.cos(theta) * radiusVal * 0.008 * (r === 0 ? 1 : Math.cos(ringAngleOffset));
          
          const pt = project(rx, ry, rz, w, h);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw coordinate crosshairs
      ctx.strokeStyle = "rgba(229, 193, 88, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 150, cy); ctx.lineTo(cx + 150, cy);
      ctx.moveTo(cx, cy - 150); ctx.lineTo(cx, cy + 150);
      ctx.stroke();

      // Render incident nodes
      let hovered: any = null;
      
      incidents.forEach((inc) => {
        const pt = project(inc.x, inc.y, inc.z, w, h);
        const alpha = Math.max(0.2, (1 - pt.depth / 4));

        // Connect beam line to core center (Indigo)
        ctx.strokeStyle = `rgba(79, 70, 229, ${alpha * 0.18})`;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();

        // Pulsing geofence circle around beacon (Gold)
        const pulse = 6 + Math.sin(Date.now() * 0.008) * 3;
        ctx.strokeStyle = `rgba(229, 193, 88, ${alpha * 0.22})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pulse * pt.scale, 0, Math.PI * 2);
        ctx.stroke();

        // Beacon dot (Gold)
        ctx.fillStyle = `rgba(229, 193, 88, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5 * pt.scale, 0, Math.PI * 2);
        ctx.fill();

        // Check hover
        const dist = Math.hypot(mouseX - pt.x, mouseY - pt.y);
        if (dist < 15) {
          hovered = inc;
        }
      });

      if (hovered) {
        setActiveIncident(hovered);
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
        const dy = e.clientY - dragStart.y;
        localYaw += dx * 0.005;
        localPitch += dy * 0.005;
        setDragStart({ x: e.clientX, y: e.clientY });
        setYaw(localYaw);
        setPitch(localPitch);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
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
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, yaw, pitch]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full bg-slate-950/45 p-6 rounded-3xl border border-emerald-500/10">
      <div className="absolute top-4 glass-panel px-4 py-2 rounded-full text-[9px] font-mono text-emerald-400 border-emerald-500/20 bg-emerald-500/5 tracking-wider flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
        Holographic Cyber-Radar Coordinates
      </div>

      <canvas
        ref={canvasRef}
        width={360}
        height={320}
        className="cursor-grab active:cursor-grabbing max-w-full"
      />

      {activeIncident ? (
        <div className="absolute bottom-4 p-4 bg-slate-950 border border-emerald-500/30 rounded-2xl w-[90%] text-left shadow-2xl">
          <p className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
            {activeIncident.id} Locked
          </p>
          <h4 className="text-xs font-bold text-white mt-0.5">{activeIncident.label}</h4>
          <p className="text-[9px] text-slate-500 mt-1 font-mono">Geofence Offset: {activeIncident.offset} (VERIFIED)</p>
        </div>
      ) : (
        <div className="absolute bottom-4 p-3 bg-slate-900/60 border border-white/5 rounded-xl w-[90%] text-center text-slate-500 text-[9px] font-mono uppercase tracking-wider">
          Drag to orbit. Hover beacons to lock coordinates.
        </div>
      )}
    </div>
  );
}
