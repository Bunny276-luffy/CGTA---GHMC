"use client";

import React, { useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export default function ThreeDPrism() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    yaw: 0.4,
    pitch: 0.3,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    isHovered: false
  });

  // 3D coordinates for a double-ended prism (octahedron)
  const vertices: Point3D[] = [
    { x: 0, y: 1.2, z: 0 },    // Top vertex
    { x: 0.8, y: 0, z: 0.8 },  // Mid ring 1
    { x: -0.8, y: 0, z: 0.8 }, // Mid ring 2
    { x: -0.8, y: 0, z: -0.8 },// Mid ring 3
    { x: 0.8, y: 0, z: -0.8 }, // Mid ring 4
    { x: 0, y: -1.2, z: 0 }    // Bottom vertex
  ];

  // Vertices connection indices mapping
  const edges = [
    [0, 1], [0, 2], [0, 3], [0, 4], // Top caps
    [1, 2], [2, 3], [3, 4], [4, 1], // Mid ring loop
    [5, 1], [5, 2], [5, 3], [5, 4]  // Bottom caps
  ];

  // Refracted light coordinate points
  const refractions = [
    { x: 1.4, y: 0.6, z: 0.2, label: "EXIF Audit", color: "#e5c158" },
    { x: -1.5, y: -0.5, z: 0.5, label: "Geofence", color: "#4f46e5" },
    { x: 0.2, y: 1.5, z: -1.2, label: "Duplicates", color: "#e5c158" }
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const parentWidth = containerRef.current ? containerRef.current.clientWidth : 360;
      // Guarantee width is never negative or zero
      canvas.width = Math.max(280, Math.min(360, parentWidth - 48));
      canvas.height = 320;
    };
    window.addEventListener("resize", resize);
    resize();

    const project = (pt: Point3D, w: number, h: number) => {
      // Rotation Y (Yaw)
      const cosY = Math.cos(stateRef.current.yaw);
      const sinY = Math.sin(stateRef.current.yaw);
      const x1 = pt.x * cosY - pt.z * sinY;
      const z1 = pt.x * sinY + pt.z * cosY;

      // Rotation X (Pitch)
      const cosP = Math.cos(stateRef.current.pitch);
      const sinP = Math.sin(stateRef.current.pitch);
      const y2 = pt.y * cosP - z1 * sinP;
      const z2 = pt.y * sinP + z1 * cosP;

      const scale = 260 / (z2 + 3);
      return {
        x: w / 2 + x1 * scale * 110,
        y: h / 2 - y2 * scale * 110,
        scale,
        depth: z2
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Continuous auto orbit when not dragging
      if (!stateRef.current.isDragging) {
        stateRef.current.yaw += stateRef.current.isHovered ? 0.003 : 0.008;
      }

      // Draw refracting beams from Mid vertices
      refractions.forEach((ref) => {
        const refPt = project(ref, w, h);
        
        // Link to nearest prism nodes
        vertices.slice(1, 5).forEach((v) => {
          const vPt = project(v, w, h);
          const refractionAlpha = stateRef.current.isHovered ? 0.28 : 0.12;

          ctx.strokeStyle = ref.color === "#e5c158" 
            ? `rgba(229, 193, 88, ${refractionAlpha})`
            : `rgba(79, 70, 229, ${refractionAlpha})`;
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.moveTo(vPt.x, vPt.y);
          ctx.lineTo(refPt.x, refPt.y);
          ctx.stroke();
        });

        // Draw node endpoints
        ctx.fillStyle = ref.color;
        ctx.beginPath();
        ctx.arc(refPt.x, refPt.y, 4 * refPt.scale, 0, Math.PI * 2);
        ctx.fill();

        // Label text tags
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "8px monospace";
        ctx.fillText(ref.label.toUpperCase(), refPt.x + 8, refPt.y + 3);
      });

      // Project vertices to 2D
      const projected = vertices.map((v) => project(v, w, h));

      // Draw wireframe edges of the prism
      ctx.lineWidth = 1.35;
      edges.forEach(([u, v]) => {
        const p1 = projected[u];
        const p2 = projected[v];

        const avgDepth = (p1.depth + p2.depth) / 2;
        const alpha = Math.max(0.15, 1.1 - avgDepth / 2.5);

        // Gradient connector line
        const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
        grad.addColorStop(0, `rgba(229, 193, 88, ${alpha})`); // Gold
        grad.addColorStop(1, `rgba(79, 70, 229, ${alpha * 0.7})`); // Indigo

        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      // Draw vertex glowing dots
      projected.forEach((p) => {
        const alpha = Math.max(0.2, 1.2 - p.depth / 2.5);
        ctx.fillStyle = `rgba(229, 193, 88, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (stateRef.current.isDragging) {
        const dx = e.clientX - stateRef.current.dragStart.x;
        const dy = e.clientY - stateRef.current.dragStart.y;
        stateRef.current.yaw += dx * 0.005;
        stateRef.current.pitch += dy * 0.005;
        stateRef.current.dragStart = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      stateRef.current.isDragging = true;
      stateRef.current.dragStart = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      stateRef.current.isDragging = false;
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
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative flex flex-col items-center justify-center select-none w-full bg-slate-950/45 p-8 rounded-3xl border border-blue-500/10 min-h-[360px]"
      onMouseEnter={() => { stateRef.current.isHovered = true; }}
      onMouseLeave={() => { stateRef.current.isHovered = false; }}
    >
      <div className="absolute top-4 glass-panel px-4 py-2 rounded-full text-[9px] font-mono text-blue-400 border-blue-500/20 bg-blue-500/5 tracking-wider flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
        3D Audit Prism Verification Core
      </div>

      <canvas
        ref={canvasRef}
        width={360}
        height={320}
        className="cursor-grab active:cursor-grabbing max-w-full"
      />

      <div className="absolute bottom-4 p-3 bg-slate-900/60 border border-white/5 rounded-xl w-[90%] text-center text-slate-500 text-[9px] font-mono uppercase tracking-wider">
        Drag to rotate. Hover to focus light refraction.
      </div>
    </div>
  );
}
