"use client";

import React, { useRef, useEffect, useState } from "react";

interface Hotspot {
  lat: number;
  lng: number;
  label: string;
  severity: "EMERGENCY" | "HIGH" | "STANDARD";
  count: number;
}

export default function ThreeGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState({ yaw: 0.8, pitch: -0.2 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);

  const hotspots: Hotspot[] = [
    { lat: 17.385, lng: 78.4867, label: "Hyderabad (GHMC) - Sewerage Leakage", severity: "EMERGENCY", count: 18 },
    { lat: 18.975, lng: 72.8258, label: "Mumbai (BMC) - Pothole Cluster", severity: "HIGH", count: 24 },
    { lat: 28.6139, lng: 77.209, label: "Delhi (MCD) - Illegal Dumping", severity: "STANDARD", count: 12 },
    { lat: 12.9716, lng: 77.5946, label: "Bengaluru (BBMP) - Flooding", severity: "EMERGENCY", count: 31 },
    { lat: 13.0827, lng: 80.2707, label: "Chennai (CoC) - Streetlight Outage", severity: "STANDARD", count: 9 },
  ];

  const latLngToVector3 = (lat: number, lng: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    return {
      x: -(radius * Math.sin(phi) * Math.sin(theta)),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.cos(theta),
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let autoYaw = 0.0015;
    let autoPitch = 0.0003;
    let currentYaw = rotation.yaw;
    let currentPitch = rotation.pitch;

    const pointsCount = 550; // Higher density
    const spherePoints: { x: number; y: number; z: number }[] = [];
    const radius = 160;

    for (let i = 0; i < pointsCount; i++) {
      const y = 1 - (i / (pointsCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);

      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      const theta = 2 * Math.PI * i / goldenRatio;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      spherePoints.push({ x: x * radius, y: y * radius, z: z * radius });
    }

    const rotateX = (point: { x: number; y: number; z: number }, angle: number) => {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: point.x,
        y: point.y * cos - point.z * sin,
        z: point.y * sin + point.z * cos,
      };
    };

    const rotateY = (point: { x: number; y: number; z: number }, angle: number) => {
      const rad = angle;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: point.x * cos + point.z * sin,
        y: point.y,
        z: -point.x * sin + point.z * cos,
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      if (!isDragging) {
        currentYaw += autoYaw;
        currentPitch += autoPitch;
      }

      // 1. Draw Cosmic Deep Space Outer Glow Aura
      const auraGlow = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.4);
      auraGlow.addColorStop(0, "rgba(99, 102, 241, 0)");
      auraGlow.addColorStop(0.5, "rgba(99, 102, 241, 0.01)");
      auraGlow.addColorStop(0.85, "rgba(139, 92, 246, 0.08)");
      auraGlow.addColorStop(0.95, "rgba(217, 70, 239, 0.03)");
      auraGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = auraGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. Project Points
      const projectedPoints = spherePoints.map((p) => {
        let rotated = rotateY(p, currentYaw);
        rotated = rotateX(rotated, currentPitch);
        return {
          x: rotated.x + centerX,
          y: rotated.y + centerY,
          z: rotated.z,
          raw: p,
        };
      });

      // 3. Project Hotspots
      const projectedHotspots = hotspots.map((hs) => {
        const rawVec = latLngToVector3(hs.lat, hs.lng, radius);
        let rotated = rotateY(rawVec, currentYaw);
        rotated = rotateX(rotated, currentPitch);
        return {
          x: rotated.x + centerX,
          y: rotated.y + centerY,
          z: rotated.z,
          data: hs,
        };
      });

      // 4. Project Hub (Center Server Node near Delhi/Mumbai coordinate space)
      const hubVec = latLngToVector3(20.5937, 78.9629, radius);
      let rotatedHub = rotateY(hubVec, currentYaw);
      rotatedHub = rotateX(rotatedHub, currentPitch);
      const hubProjected = {
        x: rotatedHub.x + centerX,
        y: rotatedHub.y + centerY,
        z: rotatedHub.z,
      };

      // Z-Buffer Sorting
      const allObjects = [
        ...projectedPoints.map((p) => ({ type: "point", ...p })),
        ...projectedHotspots.map((h) => ({ type: "hotspot", ...h })),
      ].sort((a, b) => a.z - b.z);

      // Render Globe Points & Nodes
      allObjects.forEach((obj) => {
        const isBackSide = obj.z < 0;

        if (obj.type === "point") {
          const alpha = isBackSide ? 0.06 : 0.45;
          const size = isBackSide ? 0.9 : 1.7;

          // Mix of indigo and violet coordinates
          ctx.fillStyle = isBackSide 
            ? `rgba(139, 92, 246, ${alpha * 0.3})`
            : `rgba(99, 102, 241, ${alpha})`;
          
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, size, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === "hotspot") {
          const hs = obj as any;
          if (isBackSide) return;

          const color =
            hs.data.severity === "EMERGENCY"
              ? "244, 63, 94"  // Rose
              : hs.data.severity === "HIGH"
              ? "249, 115, 22" // Orange
              : "6, 182, 212";  // Cyan

          // Dynamic pulsing target ring
          const t = Date.now() * 0.005;
          const pulseRadius = 5 + Math.sin(t + hs.data.lat) * 3.5;

          ctx.strokeStyle = `rgba(${color}, 0.5)`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(hs.x, hs.y, pulseRadius + 4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = `rgba(${color}, 0.8)`;
          ctx.beginPath();
          ctx.arc(hs.x, hs.y, pulseRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Core Solid Point
          ctx.fillStyle = `rgb(${color})`;
          ctx.beginPath();
          ctx.arc(hs.x, hs.y, 3, 0, Math.PI * 2);
          ctx.fill();

          // 5. Draw Dynamic Curved Bezier Data Connection Paths to Central Hub Node
          if (hubProjected.z >= 0) {
            ctx.beginPath();
            ctx.moveTo(hs.x, hs.y);
            
            // Midpoint helper for arc curvature offset
            const midX = (hs.x + hubProjected.x) / 2;
            const midY = (hs.y + hubProjected.y) / 2 - 25; // lift curve
            
            ctx.quadraticCurveTo(midX, midY, hubProjected.x, hubProjected.y);
            
            ctx.strokeStyle = `rgba(${color}, 0.18)`;
            ctx.lineWidth = 1.0;
            ctx.stroke();

            // Pulsing packet traveling along the path
            const travelT = (Date.now() * 0.0008 + hs.data.lng) % 1.0;
            const pX = (1 - travelT) * (1 - travelT) * hs.x + 2 * (1 - travelT) * travelT * midX + travelT * travelT * hubProjected.x;
            const pY = (1 - travelT) * (1 - travelT) * hs.y + 2 * (1 - travelT) * travelT * midY + travelT * travelT * hubProjected.y;
            
            ctx.fillStyle = `rgb(${color})`;
            ctx.beginPath();
            ctx.arc(pX, pY, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Tooltip hover
          const dist = Math.hypot(mouseX - hs.x, mouseY - hs.y);
          if (dist < 12) {
            setActiveHotspot(hs.data);
            
            // Draw interactive target overlay bracket
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 1;
            ctx.strokeRect(hs.x - 8, hs.y - 8, 16, 16);
          }
        }
      });

      // Draw Central Server Node (Municipal Ledger Center)
      if (hubProjected.z >= 0) {
        ctx.fillStyle = "#8b5cf6";
        ctx.shadowColor = "#8b5cf6";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(hubProjected.x, hubProjected.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
        ctx.beginPath();
        ctx.arc(hubProjected.x, hubProjected.y, 9 + Math.sin(Date.now() * 0.004) * 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = "bold 8px monospace";
        ctx.fillText("MUNICIPAL HUB", hubProjected.x - 30, hubProjected.y - 12);
      }

      animationId = requestAnimationFrame(render);
    };

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;

      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        currentYaw += deltaX * 0.005;
        currentPitch += deltaY * 0.005;
        setDragStart({ x: e.clientX, y: e.clientY });
        setRotation({ yaw: currentYaw, pitch: currentPitch });
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
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, rotation]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      
      {/* HUD overlay grid borders */}
      <div className="absolute inset-0 border border-indigo-500/10 pointer-events-none rounded-3xl" />
      <div className="absolute top-4 left-4 font-mono text-[8px] text-indigo-500/60 uppercase tracking-widest pointer-events-none">
        Ledger Network: Active<br />
        Nodes: 5 synced
      </div>
      
      <div className="absolute top-4 glass-panel px-4 py-2 rounded-full text-xs text-slate-355 text-slate-300 border-white/5 flex items-center gap-2 animate-pulse bg-slate-950/80 shadow-md">
        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
        Interactive Digital Twin Globe
      </div>

      <canvas
        ref={canvasRef}
        width={450}
        height={450}
        className="cursor-grab active:cursor-grabbing max-w-full"
      />

      {activeHotspot ? (
        <div className="absolute bottom-4 glass-panel-glow px-4 py-3.5 rounded-2xl border-indigo-500/30 max-w-[290px] text-center transition-all duration-300 shadow-2xl bg-slate-950/90">
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono">
            Node Threat Coordinates
          </p>
          <h4 className="text-xs text-white font-extrabold mt-0.5 leading-snug">
            {activeHotspot.label}
          </h4>
          <div className="flex items-center justify-center gap-3 mt-2.5 text-[10px]">
            <span
              className={`px-2.5 py-0.5 rounded font-bold ${
                activeHotspot.severity === "EMERGENCY"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              }`}
            >
              {activeHotspot.severity}
            </span>
            <span className="text-slate-400 font-semibold">{activeHotspot.count} duplicates flagged</span>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 glass-panel px-4 py-3 rounded-xl border-white/5 max-w-[280px] text-center text-slate-500 text-[10px] font-mono">
          Hover over nodes to trace ledger geofence coordinates
        </div>
      )}
    </div>
  );
}
