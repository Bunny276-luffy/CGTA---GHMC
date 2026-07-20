"use client";

import React, { useRef, useEffect } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

export default function ThreeDHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight || 620;
      } else {
        canvas.width = 1000;
        canvas.height = 620;
      }
    };
    window.addEventListener("resize", resize);
    resize();

    let time = 0;

    const render = () => {
      time += 0.0055; // Constant, smooth flow speed
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Stationary 3D rotation angles driven solely by time (No mouse tracking, No scroll parallax)
      const yaw = time * 0.45;
      const pitch = time * 0.35;
      const roll = time * 0.2;

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);
      const cosR = Math.cos(roll);
      const sinR = Math.sin(roll);

      // Projection mapping 3D to 2D
      const project = (pt: Point3D) => {
        // Rotate Yaw (Y-axis)
        let x1 = pt.x * cosY - pt.z * sinY;
        let z1 = pt.x * sinY + pt.z * cosY;

        // Rotate Pitch (X-axis)
        let y2 = pt.y * cosP - z1 * sinP;
        let z2 = pt.y * sinP + z1 * cosP;

        // Rotate Roll (Z-axis)
        let x3 = x1 * cosR - y2 * sinR;
        let y3 = x1 * sinR + y2 * cosR;

        const distance = 800;
        const scale = distance / (z2 + distance);
        return {
          x: w / 2 + x3 * scale,
          y: h / 2 - y3 * scale,
          depth: z2,
          scale
        };
      };

      // Mathematical generation of a 3D Torus Knot Ribbon (Trefoil Knot)
      const drawTorusKnot = (offsetPhase: number, colorStart: string, colorEnd: string, width: number) => {
        const pointsCount = 180;
        const projectedPoints: { x: number; y: number; depth: number; scale: number }[] = [];

        // Parameters for Trefoil Knot (p=3, q=2)
        const p = 3;
        const q = 2;
        const R = 180; // Major radius
        const r = 70;  // Minor radius

        for (let i = 0; i <= pointsCount; i++) {
          const t = (i / pointsCount) * Math.PI * 2 + offsetPhase;
          
          const knotX = (R + r * Math.cos(p * t)) * Math.cos(q * t);
          const knotY = (R + r * Math.cos(p * t)) * Math.sin(q * t);
          const knotZ = r * Math.sin(p * t);

          const pt = project({ x: knotX, y: knotY, z: knotZ });
          projectedPoints.push(pt);
        }

        // Draw the continuous ribbon
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Segmented rendering for depth gradient
        for (let i = 0; i < projectedPoints.length - 1; i++) {
          const pt1 = projectedPoints[i];
          const pt2 = projectedPoints[i + 1];

          const avgDepth = (pt1.depth + pt2.depth) / 2;
          const alpha = Math.max(0.04, 0.35 - (avgDepth + 150) * 0.0012);

          const grad = ctx.createLinearGradient(pt1.x, pt1.y, pt2.x, pt2.y);
          grad.addColorStop(0, colorStart.replace("ALPHA", alpha.toString()));
          grad.addColorStop(1, colorEnd.replace("ALPHA", alpha.toString()));

          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }
      };

      // Render flowing neon ribbons
      drawTorusKnot(time * 0.8, "rgba(6, 182, 212, ALPHA)", "rgba(59, 130, 246, ALPHA)", 2.4);  
      drawTorusKnot(time * 0.8 + Math.PI / 1.5, "rgba(59, 130, 246, ALPHA)", "rgba(16, 185, 129, ALPHA)", 1.8); 
      drawTorusKnot(time * 0.8 - Math.PI / 1.5, "rgba(16, 185, 129, ALPHA)", "rgba(6, 182, 212, ALPHA)", 1.4); 

      // Pulsing inner center light core
      const pulseRadius = 80 + Math.sin(time * 1.5) * 10;
      const coreGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, pulseRadius);
      coreGrad.addColorStop(0, "rgba(6, 182, 212, 0.12)");
      coreGrad.addColorStop(0.5, "rgba(59, 130, 246, 0.04)");
      coreGrad.addColorStop(1, "rgba(2, 2, 6, 0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-40 mix-blend-screen"
    />
  );
}
