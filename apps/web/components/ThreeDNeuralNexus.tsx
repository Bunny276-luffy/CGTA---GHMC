"use client";

import React, { useRef, useEffect, useState } from "react";
import { Brain, Cpu, ShieldCheck, Zap, Activity, Radio, Target, Sparkles } from "lucide-react";

interface Node3D {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  color: string;
  label: string;
  type: "AI_NODE" | "GEOFENCE" | "EXIF_PARSER" | "VERIFIER";
  status: "ACTIVE" | "SCANNING" | "LOCKED";
  latency: number;
  accuracy: number;
}

export default function ThreeDNeuralNexus() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoveredNode, setHoveredNode] = useState<Node3D | null>(null);
  const [activeTab, setActiveTab] = useState<"NEURAL" | "RADAR" | "TELEMETRY">("NEURAL");
  const [systemStats, setSystemStats] = useState({
    activeNodes: 64,
    aiConfidence: 99.4,
    geofencePassRate: 98.7,
    scanSpeedMs: 14,
  });

  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isHovered: false });
  const rotRef = useRef({ rotX: 0, rotY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    // Handle high DPI displays
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

    // Generate 3D Neural Nodes
    const nodeTypes: Array<Node3D["type"]> = ["AI_NODE", "GEOFENCE", "EXIF_PARSER", "VERIFIER"];
    const colors = ["#38bdf8", "#818cf8", "#c084fc", "#34d399", "#f43f5e"];
    const labels = [
      "FastAPI EXIF Parser",
      "Haversine 100m Geofence Engine",
      "Deduplication Spatial Cluster",
      "Deepfake Integrity Scanner",
      "Citizen Hash Ledger",
      "TPA Escalation Router",
      "GPS Telemetry Matrix",
      "Prisma ORM Node Sync",
      "Optical Flow Verifier",
      "Municipal Command Gateway",
      "Real-time Heatmap Indexer",
      "Spatial Radius Filter"
    ];

    const nodes: Node3D[] = Array.from({ length: 42 }).map((_, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = 110 + Math.random() * 90;

      return {
        id: i,
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        radius: 3 + Math.random() * 4,
        color: colors[i % colors.length],
        label: labels[i % labels.length],
        type: nodeTypes[i % nodeTypes.length],
        status: i % 3 === 0 ? "LOCKED" : i % 2 === 0 ? "SCANNING" : "ACTIVE",
        latency: Math.floor(8 + Math.random() * 18),
        accuracy: +(98 + Math.random() * 1.9).toFixed(1),
      };
    });

    let scannerAngle = 0;

    // Main 60fps render loop
    const render = () => {
      if (!canvas || !containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      ctx.clearRect(0, 0, width, height);

      // Smooth camera rotation based on mouse movement
      rotRef.current.rotX += (mouseRef.current.targetY * 0.0005 - rotRef.current.rotX) * 0.05;
      rotRef.current.rotY += (mouseRef.current.targetX * 0.0005 - rotRef.current.rotY) * 0.05;

      const autoRotateAngle = Date.now() * 0.0003;
      const totalRotY = rotRef.current.rotY + autoRotateAngle;
      const totalRotX = rotRef.current.rotX;

      const cosY = Math.cos(totalRotY);
      const sinY = Math.sin(totalRotY);
      const cosX = Math.cos(totalRotX);
      const sinX = Math.sin(totalRotX);

      const projectedNodes: Array<{
        node: Node3D;
        px: number;
        py: number;
        pz: number;
        scale: number;
      }> = [];

      // 3D Perspective Projection
      const fov = 380;
      const centerX = width / 2;
      const centerY = height / 2;

      nodes.forEach((node) => {
        // Subtle drift movement
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        const dist = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z);
        if (dist > 210 || dist < 80) {
          node.vx *= -1;
          node.vy *= -1;
          node.vz *= -1;
        }

        // Apply Rotations
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.x * sinY + node.z * cosY;

        let y2 = node.y * cosX - z1 * sinX;
        let z2 = node.y * sinX + z1 * cosX;

        const scale = fov / (fov + z2 + 250);
        const px = centerX + x1 * scale;
        const py = centerY + y2 * scale;

        projectedNodes.push({ node, px, py, pz: z2, scale });
      });

      // Sort by depth (z-index)
      projectedNodes.sort((a, b) => b.pz - a.pz);

      // Draw Central Holographic Core
      const coreScale = fov / (fov + 250);
      const coreRadius = 45 * coreScale;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 1.5);
      coreGrad.addColorStop(0, "rgba(56, 189, 248, 0.4)");
      coreGrad.addColorStop(0.5, "rgba(129, 140, 248, 0.15)");
      coreGrad.addColorStop(1, "rgba(3, 7, 18, 0)");
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Core Wireframe Ring 1
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, coreRadius * 1.2, coreRadius * 0.4, autoRotateAngle * 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Core Wireframe Ring 2
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, coreRadius * 1.4, coreRadius * 0.5, -autoRotateAngle * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(192, 132, 252, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Draw Inter-node Connections (Neural Synapses)
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = projectedNodes[i];
          const n2 = projectedNodes[j];

          const dx = n1.node.x - n2.node.x;
          const dy = n1.node.y - n2.node.y;
          const dz = n1.node.z - n2.node.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 85) {
            const alpha = (1 - dist / 85) * 0.35 * Math.min(n1.scale, n2.scale);
            ctx.beginPath();
            ctx.moveTo(n1.px, n1.py);
            ctx.lineTo(n2.px, n2.py);

            const connectionGrad = ctx.createLinearGradient(n1.px, n1.py, n2.px, n2.py);
            connectionGrad.addColorStop(0, n1.node.color);
            connectionGrad.addColorStop(1, n2.node.color);

            ctx.strokeStyle = connectionGrad;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = 0.9;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      // Draw Laser Scanner Ring Sweep
      scannerAngle += 0.02;
      const scanY = centerY + Math.sin(scannerAngle) * (height * 0.3);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX - width * 0.4, scanY);
      ctx.lineTo(centerX + width * 0.4, scanY);
      const scanGrad = ctx.createLinearGradient(centerX - width * 0.4, scanY, centerX + width * 0.4, scanY);
      scanGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
      scanGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.6)");
      scanGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.strokeStyle = scanGrad;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();

      // Render Nodes & Hover Detection
      let currentHover: Node3D | null = null;

      projectedNodes.forEach(({ node, px, py, scale }) => {
        const drawRadius = node.radius * scale * 1.3;

        // Check Mouse Proximity
        const mouseDx = mouseRef.current.x - px;
        const mouseDy = mouseRef.current.y - py;
        const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

        const isHovered = mouseDist < drawRadius + 12;
        if (isHovered) currentHover = node;

        ctx.save();

        // Node Glow Ring
        if (isHovered || node.status === "LOCKED") {
          ctx.beginPath();
          ctx.arc(px, py, drawRadius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${node.color}33`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(px, py, drawRadius * 2.8, 0, Math.PI * 2);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Inner Node Pulse
        ctx.beginPath();
        ctx.arc(px, py, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? "#ffffff" : node.color;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = isHovered ? 15 : 8;
        ctx.fill();

        // Node Label on Hover or Key Nodes
        if (isHovered || node.id % 7 === 0) {
          ctx.font = "600 10px monospace";
          ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
          ctx.fillText(node.label, px + drawRadius + 8, py + 3);

          ctx.font = "500 8px monospace";
          ctx.fillStyle = node.color;
          ctx.fillText(`[${node.type} • ${node.accuracy}%]`, px + drawRadius + 8, py + 14);
        }

        ctx.restore();
      });

      setHoveredNode(currentHover);
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mouseRef.current.x = x;
    mouseRef.current.y = y;
    mouseRef.current.targetX = x - rect.width / 2;
    mouseRef.current.targetY = y - rect.height / 2;
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto rounded-3xl border border-cyan-500/20 bg-[#030308]/90 backdrop-blur-xl p-6 md:p-8 overflow-hidden shadow-2xl shadow-cyan-950/40">
      
      {/* Decorative Grid Mesh Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.3) 1px, transparent 0)",
          backgroundSize: "28px 28px"
        }}
      />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              Live Cyber Visualizer
            </span>
            <span className="text-[10px] font-mono text-slate-400">ENGINE v2.4</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            AI Neural Telemetry Matrix <Brain className="h-6 w-6 text-cyan-400" />
          </h3>
          <p className="text-xs text-slate-400 max-w-xl font-mono">
            Interactive 3D representation of EXIF verification threads, spatial geofence clusters, and real-time municipal trust metrics.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10">
          {(["NEURAL", "RADAR", "TELEMETRY"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider transition-all duration-300 ${
                activeTab === tab
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Visualizer Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-6 relative z-10">
        
        {/* 3D Canvas Viewport (3 Columns) */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          className="lg:col-span-3 h-[480px] w-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#060e20]/80 to-[#02050c]/90 relative overflow-hidden group cursor-crosshair"
        >
          {/* Canvas */}
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Canvas Overlay HUD Corner Elements */}
          <div className="absolute top-4 left-4 pointer-events-none space-y-1 font-mono text-[10px] text-cyan-400/80">
            <div className="flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
              <span>SPATIAL CLUSTER: ACTIVE [RADIUS: 50M]</span>
            </div>
            <div className="text-slate-500">EXIF INTEGRITY SCANNER: ONLINE</div>
          </div>

          <div className="absolute top-4 right-4 pointer-events-none font-mono text-[10px] text-emerald-400/80 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <span>FPS: 60 • LATENCY: {systemStats.scanSpeedMs}ms</span>
          </div>

          <div className="absolute bottom-4 left-4 pointer-events-none font-mono text-[10px] text-slate-400 flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-400 animate-spin" />
            <span>DRAG OR MOVE MOUSE TO TILT 3D MATRIX VIEWPORT</span>
          </div>

          {/* Hovered Node Info Overlay */}
          {hoveredNode && (
            <div className="absolute bottom-4 right-4 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 backdrop-blur-md max-w-xs space-y-2 pointer-events-none shadow-xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hoveredNode.color }} />
                  {hoveredNode.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                <div>
                  <span className="text-slate-400">Node Type:</span>
                  <div className="text-cyan-300 font-bold">{hoveredNode.type}</div>
                </div>
                <div>
                  <span className="text-slate-400">Accuracy:</span>
                  <div className="text-emerald-400 font-bold">{hoveredNode.accuracy}%</div>
                </div>
                <div>
                  <span className="text-slate-400">Latency:</span>
                  <div className="text-amber-300">{hoveredNode.latency}ms</div>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <div className="text-purple-300">{hoveredNode.status}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Telemetry Sidebar (1 Column) */}
        <div className="space-y-4 flex flex-col justify-between">
          
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-cyan-400" /> System Metrics
            </div>

            {/* Metric Card 1 */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition-all space-y-1 group">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>AI Confidence Score</span>
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono flex items-baseline gap-1">
                {systemStats.aiConfidence}%
                <span className="text-xs text-emerald-400 font-normal">+0.4%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" style={{ width: `${systemStats.aiConfidence}%` }} />
              </div>
            </div>

            {/* Metric Card 2 */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-blue-500/40 transition-all space-y-1 group">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Geofence Pass Rate</span>
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono flex items-baseline gap-1">
                {systemStats.geofencePassRate}%
                <span className="text-xs text-cyan-400 font-normal">100m radius</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full" style={{ width: `${systemStats.geofencePassRate}%` }} />
              </div>
            </div>

            {/* Metric Card 3 */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-purple-500/40 transition-all space-y-1 group">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>EXIF Integrity Threads</span>
                <Zap className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold text-white font-mono flex items-baseline gap-1">
                {systemStats.activeNodes} Nodes
                <span className="text-xs text-purple-400 font-normal">Active</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: "85%" }} />
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="pt-2">
            <button 
              onClick={() => setSystemStats(s => ({ ...s, scanSpeedMs: Math.floor(10 + Math.random() * 10) }))}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 text-white font-mono font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <Cpu className="h-4 w-4" /> Trigger Telemetry Scan
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
