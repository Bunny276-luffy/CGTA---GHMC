"use client";

import React, { useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Cpu } from "lucide-react";

interface PipelineStage {
  id: number;
  title: string;
  tag: string;
  description: string;
  formula: string;
  color: string;
}

export default function ThreeDHolobarrel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeStage, setActiveStage] = useState(0);
  const [targetYaw, setTargetYaw] = useState(0);
  const [currentYaw, setCurrentYaw] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);

  const stages: PipelineStage[] = [
    {
      id: 0,
      title: "EXIF Integrity Check",
      tag: "Header Forensic",
      description: "Extracts original device metadata logs to search for software headers from photoshop, Lightroom, Snapseed, or GIMP, auto-rejecting modified pixels.",
      formula: "IF metadata.software IN edited_signatures -> REJECT",
      color: "#6366f1" // Indigo
    },
    {
      id: 1,
      title: "Geofence Verification",
      tag: "Coordinate Lock",
      description: "Applies the Haversine equation to confirm the officer's camera coordinates match the complaint coordinate pin within 100 meters.",
      formula: "Distance = 2R * arcsin(sqrt(sin²(Δlat/2) + cos*cos*sin²))",
      color: "#14b8a6" // Teal
    },
    {
      id: 2,
      title: "Deduplication Engine",
      tag: "Spatial Consolidator",
      description: "Queries active local tickets using a PostgreSQL PostGIS ST_DWithin search to merge redundant reports inside a 50m radius.",
      formula: "SELECT id FROM complaints WHERE ST_DWithin(geom, $1, 50)",
      color: "#8b5cf6" // Violet
    },
    {
      id: 3,
      title: "Explainable Trust Scoring",
      tag: "Scoring Weight",
      description: "Aggregates Exif trust indices, geofence radius offsets, and category parameters to calculate a reliability score (0-100) for manual audit assignment.",
      formula: "Trust = 100 - geofence_offset - cluster_dup - edit_penalty",
      color: "#f43f5e" // Rose
    }
  ];

  // snappy snapper transition
  const rotateToStage = (direction: "left" | "right") => {
    let nextStage = activeStage;
    if (direction === "left") {
      nextStage = (activeStage - 1 + 4) % 4;
      setTargetYaw(targetYaw + Math.PI / 2);
    } else {
      nextStage = (activeStage + 1) % 4;
      setTargetYaw(targetYaw - Math.PI / 2);
    }
    setActiveStage(nextStage);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tempYaw = currentYaw;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 130;

      // Smooth interpolation to target rotation
      if (!isDragging) {
        tempYaw += (targetYaw - tempYaw) * 0.1;
        setCurrentYaw(tempYaw);
      }

      // Draw 3D wireframe rings of the barrel
      ctx.strokeStyle = "rgba(99, 102, 241, 0.08)";
      ctx.lineWidth = 1;
      for (let offset = -70; offset <= 70; offset += 70) {
        ctx.beginPath();
        ctx.ellipse(cx, cy + offset, radius, 35, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Project the 4 panels wrapping the cylinder
      const panels = stages.map((stage, idx) => {
        // Angles: 0, 90, 180, 270 degrees in radians
        const angle = tempYaw + (idx * Math.PI) / 2;
        
        // Circular Coordinates on cylinder face
        const x = Math.sin(angle) * radius;
        const z = Math.cos(angle) * radius; // Depth buffer
        
        return {
          stage,
          x: cx + x,
          y: cy,
          z,
          angle
        };
      }).sort((a, b) => b.z - a.z); // Render furthest panel first (depth-buffered)

      panels.forEach((p) => {
        const scale = 230 / (p.z + 230); // Perspective factor
        const isFacing = p.z < 0; // Front side of the barrel
        const alpha = isFacing ? 0.9 : 0.15;

        const panelWidth = 140 * scale;
        const panelHeight = 120 * scale;
        const px = p.x - panelWidth / 2;
        const py = p.y - panelHeight / 2;

        // Draw Panel Box
        ctx.fillStyle = isFacing ? "rgba(10, 15, 30, 0.9)" : "rgba(10, 15, 30, 0.4)";
        ctx.strokeStyle = isFacing ? `rgba(99, 102, 241, ${alpha})` : "rgba(255, 255, 255, 0.06)";
        ctx.lineWidth = isFacing ? 2 : 1;
        
        if (isFacing) {
          ctx.shadowColor = p.stage.color;
          ctx.shadowBlur = 10;
        }

        ctx.beginPath();
        ctx.roundRect(px, py, panelWidth, panelHeight, 10);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Draw Panel Content (Front side only)
        if (isFacing) {
          // Stage Title
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(11 * scale)}px system-ui`;
          ctx.fillText(p.stage.title, px + 10, py + 22);

          // Tag
          ctx.fillStyle = p.stage.color;
          ctx.font = `bold ${Math.round(8 * scale)}px monospace`;
          ctx.fillText(p.stage.tag.toUpperCase(), px + 10, py + 38);

          // Formula/Command line
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.font = `${Math.round(8 * scale)}px monospace`;
          const textW = panelWidth - 20;
          
          // Basic text wrapping
          const words = p.stage.formula.split(" ");
          let line = "";
          let yOffset = py + 55;
          
          words.forEach((w) => {
            const testLine = line + w + " ";
            if (ctx.measureText(testLine).width > textW) {
              ctx.fillText(line, px + 10, yOffset);
              line = w + " ";
              yOffset += 10 * scale;
            } else {
              line = testLine;
            }
          });
          ctx.fillText(line, px + 10, yOffset);

          // Stage index
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.font = `black ${Math.round(20 * scale)}px system-ui`;
          ctx.fillText(`0${p.stage.id + 1}`, px + panelWidth - 32, py + panelHeight - 12);
        } else {
          // Transparent index numbers on back side
          ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
          ctx.font = `black ${Math.round(18 * scale)}px system-ui`;
          ctx.fillText(`0${p.stage.id + 1}`, px + panelWidth / 2 - 10, py + panelHeight / 2 + 6);
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [targetYaw, currentYaw, isDragging]);


  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart;
    const nextYaw = currentYaw + deltaX * 0.005;
    setCurrentYaw(nextYaw);
    setTargetYaw(nextYaw);
    setDragStart(e.clientX);

    // snap active stage
    const angleIndex = Math.round((-nextYaw / (Math.PI / 2)) % 4 + 4) % 4;
    setActiveStage(angleIndex);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // snap to nearest 90-degree angle
    const snapYaw = Math.round(currentYaw / (Math.PI / 2)) * (Math.PI / 2);
    setTargetYaw(snapYaw);
  };

  return (
    <div className="glass-panel p-6 rounded-3xl border-white/5 relative overflow-hidden bg-slate-950/20 text-left">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Cpu className="h-4.5 w-4.5 text-indigo-400" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-white">3D Holographic Pipeline Dial</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => rotateToStage("left")} className="h-7 w-7 bg-slate-900 border border-white/5 hover:border-white/10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => rotateToStage("right")} className="h-7 w-7 bg-slate-900 border border-white/5 hover:border-white/10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <canvas ref={canvasRef} width={380} height={250} className="max-w-full" />
      </div>

      <div className="mt-4 p-4 bg-slate-900/60 border border-white/5 rounded-2xl">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-bold text-white uppercase">{stages[activeStage].title}</span>
          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase" style={{ backgroundColor: `${stages[activeStage].color}20`, color: stages[activeStage].color }}>
            {stages[activeStage].tag}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          {stages[activeStage].description}
        </p>
      </div>
    </div>
  );
}
