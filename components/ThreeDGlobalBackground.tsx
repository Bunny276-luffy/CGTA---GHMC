"use client";

import React, { useRef, useEffect } from "react";

interface NetworkNode {
  x: number;
  y: number;
  z: number;
  baseSize: number;
  color: string;
}

export default function ThreeDGlobalBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = e.clientX;
      mouseRef.current.targetY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Initial mouse coordinates
    mouseRef.current.targetX = window.innerWidth / 2;
    mouseRef.current.targetY = window.innerHeight / 2;
    mouseRef.current.x = window.innerWidth / 2;
    mouseRef.current.y = window.innerHeight / 2;

    // Drifting ambient color spotlights matching Royal Blue / Cyan theme
    const auroras = [
      { x: 0.15, y: 0.2, targetX: 0.15, targetY: 0.2, r: 600, color: "rgba(30, 58, 138, 0.12)", speed: 0.0004 },  // Deep Blue
      { x: 0.85, y: 0.25, targetX: 0.85, targetY: 0.25, r: 650, color: "rgba(6, 182, 212, 0.08)", speed: 0.0003 }, // Cyan
      { x: 0.5, y: 0.75, targetX: 0.5, targetY: 0.75, r: 700, color: "rgba(99, 102, 241, 0.07)", speed: 0.0002 }   // Indigo
    ];

    // Initialize 3D Constellation Sphere Nodes (Digital Network Topology)
    const constellationNodes: NetworkNode[] = [];
    const sphereRadius = 380;
    const nodeCount = 55;

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      // Distribute evenly across sphere surface using spherical coordinates
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = sphereRadius * (0.85 + Math.random() * 0.3); // add slight radial thickness variations

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const color = Math.random() > 0.45 ? "rgba(6, 182, 212, 0.3)" : "rgba(59, 130, 246, 0.2)";

      const baseSize = Math.random() * 2.2 + 0.8;
      const node = { x, y, z, baseSize, color };
      constellationNodes.push(node);
    }

    // Drifting background stars
    const backgroundStars: { x: number; y: number; z: number; size: number }[] = [];
    for (let i = 0; i < 35; i++) {
      backgroundStars.push({
        x: (Math.random() - 0.5) * window.innerWidth * 1.5,
        y: (Math.random() - 0.5) * window.innerHeight * 1.5,
        z: Math.random() * 1.8 + 0.2,
        size: Math.random() * 1.2 + 0.4
      });
    }

    let time = 0;

    const render = () => {
      time += 0.0035;
      const w = canvas.width;
      const h = canvas.height;

      // 1. Deep solid space backdrop
      ctx.fillStyle = "#020206";
      ctx.fillRect(0, 0, w, h);

      // Smooth mouse tracking
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.04;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.04;

      // 2. Draw drifting ambient spotlights (Auroras)
      auroras.forEach((aurora, idx) => {
        const angle = time * aurora.speed * 200 + idx * Math.PI / 3;
        aurora.x = w * (0.5 + Math.cos(angle) * 0.28);
        aurora.y = h * (0.5 + Math.sin(angle) * 0.18);

        const radial = ctx.createRadialGradient(
          aurora.x, aurora.y, 0,
          aurora.x, aurora.y, aurora.r
        );
        radial.addColorStop(0, aurora.color);
        radial.addColorStop(1, "rgba(2, 2, 6, 0)");

        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(aurora.x, aurora.y, aurora.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw drifting ambient stars (deep space background)
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      const cx = w / 2;
      const cy = h / 2;
      backgroundStars.forEach((star) => {
        star.z -= 0.0006;
        if (star.z <= 0.1) {
          star.z = 2.0;
        }

        const scale = 220 / star.z;
        const px = cx + star.x * scale * 0.0025;
        const py = cy + star.y * scale * 0.0025;

        if (px >= 0 && px < w && py >= 0 && py < h) {
          const size = star.size * scale * 0.01;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.4, size), 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Project and Draw 3D Constellation Sphere (Cyber Network Grid)
      const scrollY = typeof window !== "undefined" ? window.scrollY : 0;
      
      // Calculate rotation angles from time + mouse + scroll parallax
      const angleY = time * 0.022 + (mouseRef.current.x - w / 2) * 0.00004;
      const angleX = time * 0.015 + scrollY * 0.0004 + (mouseRef.current.y - h / 2) * 0.00004;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      // Project all 3D nodes to 2D coordinates
      const projectedNodes = constellationNodes.map((n) => {
        // Rotate Y-axis
        const x1 = n.x * cosY - n.z * sinY;
        const z1 = n.x * sinY + n.z * cosY;

        // Rotate X-axis
        const y2 = n.y * cosX - z1 * sinX;
        const z2 = n.y * sinX + z1 * cosX;

        // Perspective division projection
        const dist = 600;
        const scale = dist / (z2 + dist);
        const px = cx + x1 * scale;
        // Parallax push relative to scrolling height
        const py = cy + y2 * scale - scrollY * 0.08;

        return { px, py, pz: z2, scale, node: n };
      });

      // Draw Connection Lines between close nodes (Network Topology lines)
      ctx.lineWidth = 0.45;
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = projectedNodes[i];
          const n2 = projectedNodes[j];

          // Compute 3D distance between nodes
          const dist3D = Math.hypot(
            n1.node.x - n2.node.x,
            n1.node.y - n2.node.y,
            n1.node.z - n2.node.z
          );

          if (dist3D < 190) {
            // Line opacity fades based on proximity and depth (further back features are fainter)
            const fade = (1.0 - dist3D / 190) * 0.22;
            const lineOpacity = Math.max(0, fade * (n1.pz > 0 ? 0.35 : 1.0));

            ctx.strokeStyle = `rgba(6, 182, 212, ${lineOpacity})`;
            ctx.beginPath();
            ctx.moveTo(n1.px, n1.py);
            ctx.lineTo(n2.px, n2.py);
            ctx.stroke();
          }
        }
      }

      // Draw sphere points
      projectedNodes.forEach((n) => {
        if (n.px >= 0 && n.px < w && n.py >= 0 && n.py < h) {
          const pointRadius = n.node.baseSize * n.scale * 1.15;
          
          // Glow effect for front nodes
          if (n.pz < 0) {
            ctx.shadowBlur = 4;
            ctx.shadowColor = "#06b6d4";
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.fillStyle = n.node.color;
          ctx.beginPath();
          ctx.arc(n.px, n.py, Math.max(0.6, pointRadius), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.shadowBlur = 0; // Reset shadow

      // 5. Subtle reactive mouse spotlight overlay
      const textHighlight = ctx.createRadialGradient(
        mouseRef.current.x, mouseRef.current.y, 0,
        mouseRef.current.x, mouseRef.current.y, 160
      );
      textHighlight.addColorStop(0, "rgba(255, 255, 255, 0.015)");
      textHighlight.addColorStop(1, "rgba(2, 2, 6, 0)");
      ctx.fillStyle = textHighlight;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
