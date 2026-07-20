"use client";

import React, { useEffect, useRef } from "react";
import TiltCard from "./TiltCard";

interface StepData {
  id: number;
  title: string;
  tag: string;
  desc: string;
  color: string;
  borderColor: string;
}

export default function ThreeDWorkflowCards() {
  const steps: StepData[] = [
    {
      id: 0,
      title: "Citizen Uplink",
      tag: "EXIF FORENSICS",
      desc: "Validates original camera headers to verify authenticity of photos uploaded by citizens.",
      color: "rgba(229, 193, 88, ", // Gold
      borderColor: "#e5c158"
    },
    {
      id: 1,
      title: "Geofence Range Lock",
      tag: "GPS VERIFICATION",
      desc: "Validates GPS boundaries to ensure the complaint is reported at the true incident site.",
      color: "rgba(79, 70, 229, ", // Indigo
      borderColor: "#4f46e5"
    },
    {
      id: 2,
      title: "Duplicate Filter",
      tag: "SPATIAL INTERSECTION",
      desc: "Identifies and groups nearby duplicate reports to optimize municipal resolution response.",
      color: "rgba(229, 193, 88, ", // Gold
      borderColor: "#e5c158"
    },
    {
      id: 3,
      title: "Ledger Seal",
      tag: "IMMUTABLE AUDIT",
      desc: "Compares before-and-after resolution proof and logs the audit record to protect public funds.",
      color: "rgba(79, 70, 229, ", // Indigo
      borderColor: "#4f46e5"
    }
  ];

  // Self-contained Canvas renderer hook per card
  const CanvasRenderer = ({ stepId }: { stepId: number }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let animId: number;
      let angle = 0;

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const scale = 1.0;

        angle += 0.015; // rotation speed

        ctx.strokeStyle = stepId % 2 === 0 
          ? "rgba(229, 193, 88, 0.45)" // Gold
          : "rgba(79, 70, 229, 0.55)"; // Indigo
        ctx.lineWidth = 1.25;

        if (stepId === 0) {
          // Draw 3D wireframe Document/Plane
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const offset = i * 6 * scale;
            ctx.rect(cx - 15 * scale + offset, cy - 20 * scale + offset, 30 * scale, 40 * scale);
          }
          ctx.stroke();
        } else if (stepId === 1) {
          // Draw 3D Geofence Cylinder rings
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const cyOffset = -15 * scale + i * 10 * scale;
            ctx.ellipse(cx, cy + cyOffset, 22 * scale, 9 * scale, 0, 0, Math.PI * 2);
          }
          ctx.stroke();
        } else if (stepId === 2) {
          // Draw Spatial Grid
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const offset = -16 * scale + i * 8 * scale;
            ctx.moveTo(cx + offset, cy - 16 * scale);
            ctx.lineTo(cx + offset, cy + 16 * scale);
            ctx.moveTo(cx - 16 * scale, cy + offset);
            ctx.lineTo(cx + 16 * scale, cy + offset);
          }
          ctx.stroke();
        } else if (stepId === 3) {
          // Draw 3D wireframe Cube
          const pts: { x: number; y: number }[] = [];
          const size = 18 * scale;
          const corners = [
            { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
            { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
            { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 },
            { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }
          ];

          corners.forEach((c) => {
            // Rotate Y
            const rx = c.x * Math.cos(angle) - c.z * Math.sin(angle);
            const rz = c.x * Math.sin(angle) + c.z * Math.cos(angle);
            // Rotate X
            const ry = c.y * Math.cos(0.4) - rz * Math.sin(0.4);
            pts.push({
              x: cx + rx * size,
              y: cy - ry * size
            });
          });

          const connections = [
            [0, 1], [1, 2], [2, 3], [3, 0], // back
            [4, 5], [5, 6], [6, 7], [7, 4], // front
            [0, 4], [1, 5], [2, 6], [3, 7]  // pillars
          ];

          ctx.beginPath();
          connections.forEach(([u, v]) => {
            ctx.moveTo(pts[u].x, pts[u].y);
            ctx.lineTo(pts[v].x, pts[v].y);
          });
          ctx.stroke();
        }

        animId = requestAnimationFrame(draw);
      };
      draw();

      return () => cancelAnimationFrame(animId);
    }, [stepId]);

    return (
      <canvas 
        ref={canvasRef} 
        width={100} 
        height={80} 
        className="mx-auto block" 
      />
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-5xl mx-auto pt-6">
      {steps.map((step) => (
        <TiltCard key={step.id} className="h-full">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-950/75 text-left flex flex-col justify-between min-h-[260px] h-full relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500/20 to-cyan-500/20" />
              <div className="mb-4 flex justify-between">
                <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {step.tag}
                </span>
                <span className="text-xl font-bold font-mono text-slate-700">0{step.id + 1}</span>
              </div>

              {/* Unique 3D rotating visual inside each card */}
              <div className="py-2">
                <CanvasRenderer stepId={step.id} />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white uppercase font-mono">{step.title}</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                  {step.desc}
                </p>
              </div>
            </div>
          </div>
        </TiltCard>
      ))}
    </div>
  );
}
