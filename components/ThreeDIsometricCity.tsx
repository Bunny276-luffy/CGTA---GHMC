"use client";

import React, { useRef, useEffect, useState } from "react";

interface Building {
  id: number;
  x: number;
  z: number;
  height: number;
  color: string;
  label: string;
  complaint?: {
    title: string;
    severity: "EMERGENCY" | "HIGH" | "STANDARD";
  };
}

export default function ThreeDIsometricCity() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [camera, setCamera] = useState({ yaw: 0.7, pitch: 0.6, zoom: 1.2 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);

  // Generate a mock city layout with buildings and complaint hotspots
  const buildings: Building[] = [
    { id: 1, x: -2, z: -2, height: 60, color: "#4f46e5", label: "Sector A - Ward 12" },
    { id: 2, x: -1, z: -2, height: 80, color: "#6366f1", label: "Sector B - Ward 14" },
    { id: 3, x: 1, z: -2, height: 120, color: "#8b5cf6", label: "Municipal Command", complaint: { title: "Drainage Overflow", severity: "EMERGENCY" } },
    { id: 4, x: 2, z: -2, height: 50, color: "#4f46e5", label: "Sector C - Ward 8" },
    
    { id: 5, x: -2, z: -1, height: 90, color: "#6366f1", label: "Sector D - Ward 15" },
    { id: 6, x: -1, z: -1, height: 110, color: "#a855f7", label: "Corporate Office", complaint: { title: "Road Pothole Cluster", severity: "HIGH" } },
    { id: 7, x: 1, z: -1, height: 70, color: "#6366f1", label: "Sector E - Ward 3" },
    { id: 8, x: 2, z: -1, height: 40, color: "#4f46e5", label: "Sector F - Ward 10" },

    { id: 9, x: -2, z: 1, height: 130, color: "#d946ef", label: "Public Park Terminal", complaint: { title: "Garbage Pileup", severity: "HIGH" } },
    { id: 10, x: -1, z: 1, height: 60, color: "#6366f1", label: "Sector G - Ward 18" },
    { id: 11, x: 1, z: 1, height: 95, color: "#8b5cf6", label: "Sector H - Ward 2" },
    { id: 12, x: 2, z: 1, height: 75, color: "#6366f1", label: "Sector I - Ward 11" },
  ];

  // 3D Isometric Projection Math
  const project = (x: number, y: number, z: number, yaw: number, pitch: number, zoom: number, width: number, height: number) => {
    // Rotation around Y (Yaw)
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    let xRot = x * cosY - z * sinY;
    let zRot = x * sinY + z * cosY;

    // Rotation around X (Pitch)
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    let yRot = y * cosP - zRot * sinP;
    let depth = y * sinP + zRot * cosP;

    // Camera Zoom and Scaling
    const scale = (zoom * 320) / (depth + 400); // Perspective factor
    
    return {
      x: width / 2 + xRot * scale,
      y: height / 2 - yRot * scale,
      depth,
      scale
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let currentYaw = camera.yaw;
    let currentPitch = camera.pitch;

    const drawBuildingBox = (b: Building, isHovered: boolean) => {
      const w = canvas.width;
      const h = canvas.height;
      const size = 35; // Size of building footprint

      // Elevate building slightly on hover
      const hoverOffset = isHovered ? 12 : 0;
      const bHeight = b.height + (isHovered ? 10 : 0);

      // Coordinates of the 3D Box vertices
      // Bottom face
      const p000 = project(b.x * 60, -hoverOffset, b.z * 60, currentYaw, currentPitch, camera.zoom, w, h);
      const p100 = project(b.x * 60 + size, -hoverOffset, b.z * 60, currentYaw, currentPitch, camera.zoom, w, h);
      const p101 = project(b.x * 60 + size, -hoverOffset, b.z * 60 + size, currentYaw, currentPitch, camera.zoom, w, h);
      const p001 = project(b.x * 60, -hoverOffset, b.z * 60 + size, currentYaw, currentPitch, camera.zoom, w, h);

      // Top face
      const p010 = project(b.x * 60, bHeight - hoverOffset, b.z * 60, currentYaw, currentPitch, camera.zoom, w, h);
      const p110 = project(b.x * 60 + size, bHeight - hoverOffset, b.z * 60, currentYaw, currentPitch, camera.zoom, w, h);
      const p111 = project(b.x * 60 + size, bHeight - hoverOffset, b.z * 60 + size, currentYaw, currentPitch, camera.zoom, w, h);
      const p011 = project(b.x * 60, bHeight - hoverOffset, b.z * 60 + size, currentYaw, currentPitch, camera.zoom, w, h);

      // 1. Draw Left Wall Face
      ctx.beginPath();
      ctx.moveTo(p000.x, p000.y);
      ctx.lineTo(p001.x, p001.y);
      ctx.lineTo(p011.x, p011.y);
      ctx.lineTo(p010.x, p010.y);
      ctx.closePath();
      ctx.fillStyle = isHovered ? "rgba(99, 102, 241, 0.75)" : "rgba(30, 41, 59, 0.85)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();

      // 2. Draw Right Wall Face
      ctx.beginPath();
      ctx.moveTo(p001.x, p001.y);
      ctx.lineTo(p101.x, p101.y);
      ctx.lineTo(p111.x, p111.y);
      ctx.lineTo(p011.x, p011.y);
      ctx.closePath();
      ctx.fillStyle = isHovered ? "rgba(139, 92, 246, 0.75)" : "rgba(15, 23, 42, 0.9)";
      ctx.fill();
      ctx.stroke();

      // 3. Draw Top Roof Face
      ctx.beginPath();
      ctx.moveTo(p010.x, p010.y);
      ctx.lineTo(p110.x, p110.y);
      ctx.lineTo(p111.x, p111.y);
      ctx.lineTo(p011.x, p011.y);
      ctx.closePath();
      ctx.fillStyle = isHovered ? "#d946ef" : b.color;
      ctx.fill();
      ctx.stroke();

      // 4. Draw Complaint Hotspot (3D Pulsing Column above roof center)
      if (b.complaint) {
        const topCenterX = (p010.x + p111.x) / 2;
        const topCenterY = (p010.y + p111.y) / 2;
        const colHeight = 35 + Math.sin(Date.now() * 0.007) * 8;

        const pulseColor = 
          b.complaint.severity === "EMERGENCY" 
            ? "244, 63, 94" // Rose
            : "249, 115, 22"; // Orange

        // Draw Vertical Translucent Core
        const gradient = ctx.createLinearGradient(topCenterX, topCenterY, topCenterX, topCenterY - colHeight);
        gradient.addColorStop(0, `rgba(${pulseColor}, 0.7)`);
        gradient.addColorStop(1, `rgba(${pulseColor}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(topCenterX - 2.5, topCenterY - colHeight, 5, colHeight);

        // Pulsing Sphere on Top
        ctx.fillStyle = `rgb(${pulseColor})`;
        ctx.shadowColor = `rgb(${pulseColor})`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(topCenterX, topCenterY - colHeight, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // Check mouse coordinates for hovering detection
      const testDist = Math.hypot(mouseX - (p010.x + p111.x) / 2, mouseY - (p010.y + p111.y) / 2);
      if (testDist < 25) {
        setHoveredBuilding(b);
      }
    };

    const drawGridFloor = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Draw isometric grid lines
      ctx.strokeStyle = "rgba(99, 102, 241, 0.04)";
      ctx.lineWidth = 1.5;
      
      for (let x = -3; x <= 3; x++) {
        const pStart = project(x * 60, -2, -3 * 60, currentYaw, currentPitch, camera.zoom, w, h);
        const pEnd = project(x * 60, -2, 3 * 60, currentYaw, currentPitch, camera.zoom, w, h);
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
      }

      for (let z = -3; z <= 3; z++) {
        const pStart = project(-3 * 60, -2, z * 60, currentYaw, currentPitch, camera.zoom, w, h);
        const pEnd = project(3 * 60, -2, z * 60, currentYaw, currentPitch, camera.zoom, w, h);
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isDragging) {
        currentYaw += 0.0006; // Slow automatic orbit rotation
      }

      drawGridFloor();

      // Sort buildings back-to-front (depth-buffered) using camera coordinates
      const sortedBuildings = [...buildings].map((b) => {
        const proj = project(b.x * 60, 0, b.z * 60, currentYaw, currentPitch, camera.zoom, canvas.width, canvas.height);
        return { building: b, depth: proj.depth };
      }).sort((a, b) => b.depth - a.depth); // Deepest first

      let activeFound = false;
      sortedBuildings.forEach((item) => {
        const isHovered = hoveredBuilding?.id === item.building.id;
        drawBuildingBox(item.building, isHovered);
        if (isHovered) activeFound = true;
      });

      if (!activeFound && mouseX !== 0) {
        setHoveredBuilding(null);
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
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        currentYaw += deltaX * 0.005;
        currentPitch += deltaY * 0.005;
        setDragStart({ x: e.clientX, y: e.clientY });
        setCamera({ yaw: currentYaw, pitch: currentPitch, zoom: camera.zoom });
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
  }, [isDragging, dragStart, camera, hoveredBuilding]);

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full">
      <div className="absolute inset-0 border border-indigo-500/10 pointer-events-none rounded-3xl" />
      
      <div className="absolute top-4 glass-panel px-4 py-2 rounded-full text-xs text-slate-300 border-white/5 flex items-center gap-2 animate-pulse bg-slate-950/80 shadow-md">
        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
        3D Isometric City Grid — Drag to Orbit
      </div>

      <canvas
        ref={canvasRef}
        width={450}
        height={400}
        className="cursor-grab active:cursor-grabbing max-w-full"
      />

      {hoveredBuilding ? (
        <div className="absolute bottom-4 glass-panel-glow px-4 py-3.5 rounded-2xl border-indigo-500/30 w-[85%] text-left transition-all duration-300 shadow-2xl bg-slate-950/95">
          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono">
            {hoveredBuilding.label}
          </p>
          {hoveredBuilding.complaint ? (
            <div className="mt-1 space-y-1.5">
              <h4 className="text-xs text-white font-extrabold leading-snug">
                {hoveredBuilding.complaint.title}
              </h4>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold ${
                hoveredBuilding.complaint.severity === "EMERGENCY"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                  : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              }`}>
                {hoveredBuilding.complaint.severity}
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-slate-450 mt-1">Status: Verification Clear. No open reports.</p>
          )}
        </div>
      ) : (
        <div className="absolute bottom-4 glass-panel px-4 py-3 rounded-xl border-white/5 w-[85%] text-center text-slate-500 text-[10px] font-mono">
          Hover over 3D structures to inspect local sensor feeds
        </div>
      )}
    </div>
  );
}
