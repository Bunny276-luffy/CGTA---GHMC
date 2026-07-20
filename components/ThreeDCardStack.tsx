"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, Cpu } from "lucide-react";

interface PipelineStage {
  id: number;
  title: string;
  tag: string;
  desc: string;
  color: string;
  borderColor: string;
}

export default function ThreeDCardStack() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const stages: PipelineStage[] = [
    {
      id: 0,
      title: "Citizen Upload Audit",
      tag: "EXIF Forensic Check",
      desc: "Validates original camera headers to verify authenticity of photos uploaded by citizens.",
      color: "rgba(229, 193, 88, ", // Gold
      borderColor: "#e5c158"
    },
    {
      id: 1,
      title: "Geofence Location Lock",
      tag: "Anti-Fraud geofencing",
      desc: "Validates GPS boundaries to ensure the complaint is reported at the true incident site.",
      color: "rgba(79, 70, 229, ", // Indigo
      borderColor: "#4f46e5"
    },
    {
      id: 2,
      title: "Spatial Duplicate Filter",
      tag: "Consolidation Engine",
      desc: "Identifies and groups nearby duplicate reports to optimize municipal resolution response.",
      color: "rgba(229, 193, 88, ", // Gold
      borderColor: "#e5c158"
    },
    {
      id: 3,
      title: "Immutable Ledger Seal",
      tag: "Trust Score Finalized",
      desc: "Compares before-and-after resolution proof and logs the audit record to protect public funds.",
      color: "rgba(79, 70, 229, ", // Indigo
      borderColor: "#4f46e5"
    }
  ];

  const handleNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTransitionProgress(0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let localProgress = transitionProgress;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = Math.min(340, canvas.parentElement.clientWidth - 48);
      } else {
        canvas.width = 340;
      }
      canvas.height = 200;
    };
    window.addEventListener("resize", resize);
    resize();

    // Draw stylized 3D wireframe illustration inside a card
    const drawIllustration = (id: number, px: number, py: number, w: number, h: number, scale: number, alpha: number) => {
      const cx = px + w - 50 * scale;
      const cy = py + h / 2;
      const t = Date.now() * 0.0015;

      ctx.strokeStyle = id % 2 === 0 
        ? `rgba(229, 193, 88, ${alpha * 0.4})` 
        : `rgba(79, 70, 229, ${alpha * 0.4})`;
      ctx.lineWidth = 1;

      if (id === 0) {
        // Draw 3D wireframe Document
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const z = i * 4 * scale;
          ctx.rect(cx - 15 * scale + z, cy - 20 * scale + z, 30 * scale, 40 * scale);
        }
        ctx.stroke();
      } else if (id === 1) {
        // Draw 3D wireframe Geofence Cylinder
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const cyOffset = -15 * scale + i * 8 * scale;
          ctx.ellipse(cx, cy + cyOffset, 18 * scale, 8 * scale, 0, 0, Math.PI * 2);
        }
        ctx.stroke();
      } else if (id === 2) {
        // Draw Intersecting Grid planes
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const xOffset = -15 * scale + i * 10 * scale;
          ctx.moveTo(cx + xOffset, cy - 18 * scale);
          ctx.lineTo(cx + xOffset, cy + 18 * scale);
          ctx.moveTo(cx - 15 * scale, cy + xOffset);
          ctx.lineTo(cx + 15 * scale, cy + xOffset);
        }
        ctx.stroke();
      } else if (id === 3) {
        // Draw 3D wireframe ledger Cube block
        const rotationAngle = t;
        const pts = [];
        const size = 16 * scale;
        
        // Cube corners
        const corners = [
          { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
          { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
          { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 },
          { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }
        ];

        // Project Cube
        corners.forEach((c) => {
          // Rotate Y
          const rx = c.x * Math.cos(rotationAngle) - c.z * Math.sin(rotationAngle);
          const rz = c.x * Math.sin(rotationAngle) + c.z * Math.cos(rotationAngle);
          // Rotate X
          const ry = c.y * Math.cos(0.4) - rz * Math.sin(0.4);
          
          pts.push({
            x: cx + rx * size,
            y: cy - ry * size
          });
        });

        // Draw connections
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 0], // back face
          [4, 5], [5, 6], [6, 7], [7, 4], // front face
          [0, 4], [1, 5], [2, 6], [3, 7]  // pillars
        ];
        
        ctx.beginPath();
        connections.forEach(([u, v]) => {
          ctx.moveTo(pts[u].x, pts[u].y);
          ctx.lineTo(pts[v].x, pts[v].y);
        });
        ctx.stroke();
      }
    };

    const drawCard = (stage: PipelineStage, stackPos: number, progressOffset: number) => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      let currentStackPos = stackPos - progressOffset;
      if (currentStackPos < 0) {
        currentStackPos = 0;
      }

      const zDepth = currentStackPos * 140;
      const scale = 300 / (zDepth + 300);
      
      const width = 240 * scale;
      const height = 150 * scale;
      
      let xOffset = 0;
      let yOffset = -currentStackPos * 18 * scale;
      let alpha = (1 - currentStackPos * 0.24);

      if (stackPos === 0 && isTransitioning) {
        const t = progressOffset;
        xOffset = Math.sin(t * Math.PI) * 160;
        yOffset = -Math.sin(t * Math.PI) * 40;
        alpha = 1 - t;
      }

      const px = cx + xOffset - width / 2;
      const py = cy + yOffset - height / 2 + 10;

      if (currentStackPos === 0 && !isTransitioning) {
        ctx.shadowColor = stage.borderColor;
        ctx.shadowBlur = 12;
      }

      ctx.fillStyle = `rgba(10, 10, 20, ${alpha * 0.95})`;
      ctx.strokeStyle = `rgba(229, 193, 88, ${alpha * 0.08})`;
      ctx.lineWidth = currentStackPos === 0 ? 1.5 : 1;
      
      ctx.beginPath();
      ctx.roundRect(px, py, width, height, 12);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (alpha > 0.15) {
        // Title
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = `bold ${Math.round(11 * scale)}px monospace`;
        ctx.fillText(stage.title, px + 15 * scale, py + 30 * scale);

        // Tag
        ctx.fillStyle = `${stage.color}${alpha})`;
        ctx.font = `bold ${Math.round(8 * scale)}px monospace`;
        ctx.fillText(stage.tag.toUpperCase(), px + 15 * scale, py + 46 * scale);

        // Description text wrapped
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.65})`;
        ctx.font = `${Math.round(7.5 * scale)}px monospace`;
        
        // Take up 65% width to avoid overlapping illustration
        const textW = width * 0.6;
        const words = stage.desc.split(" ");
        let line = "";
        let yLine = py + 68 * scale;
        
        words.forEach((w) => {
          const test = line + w + " ";
          if (ctx.measureText(test).width > textW) {
            ctx.fillText(line, px + 15 * scale, yLine);
            line = w + " ";
            yLine += 10 * scale;
          } else {
            line = test;
          }
        });
        ctx.fillText(line, px + 15 * scale, yLine);

        // Render 3D illustration inside the card space
        drawIllustration(stage.id, px, py, width, height, scale, alpha);

        // Index
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.12})`;
        ctx.font = `black ${Math.round(32 * scale)}px monospace`;
        ctx.fillText(`0${stage.id + 1}`, px + width - 42 * scale, py + height - 12 * scale);
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isTransitioning) {
        localProgress += 0.05;
        setTransitionProgress(localProgress);
        if (localProgress >= 1) {
          setIsTransitioning(false);
          setActiveIndex((prev) => (prev + 1) % 4);
          setTransitionProgress(0);
          localProgress = 0;
        }
      }

      for (let i = 3; i >= 0; i--) {
        const stageIndex = (activeIndex + i) % 4;
        const stage = stages[stageIndex];
        drawCard(stage, i, localProgress);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [activeIndex, isTransitioning, transitionProgress]);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-cyan-500/10 relative overflow-hidden bg-slate-950/45 text-left flex flex-col justify-between h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-4.5 w-4.5 text-cyan-500 animate-pulse" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-white">3D Holographic Step Deck</h3>
        </div>
        <button
          onClick={handleNext}
          disabled={isTransitioning}
          className="h-8 px-4 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-500 text-[10px] font-bold uppercase font-mono tracking-wider transition-all"
        >
          Cycle Deck <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-center relative flex-grow min-h-[220px]">
        <canvas ref={canvasRef} width={340} height={200} className="max-w-full" />
      </div>

      <div className="mt-4 p-4 bg-slate-900/60 border border-white/5 rounded-2xl">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-mono font-bold text-white uppercase">{stages[activeIndex].title}</span>
          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase font-mono bg-cyan-500/15 text-cyan-500 border border-cyan-500/25">
            Active Check
          </span>
        </div>
        <p className="text-[9px] text-slate-400 leading-relaxed font-mono">
          {stages[activeIndex].desc}
        </p>
      </div>
    </div>
  );
}
