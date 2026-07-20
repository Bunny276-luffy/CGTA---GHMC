"use client";

import React, { useRef, useEffect } from "react";

export default function Floating3DGrid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = 220; // Horizon height
    };
    window.addEventListener("resize", resize);
    resize();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const horizonY = 10; // vanishing point height
      const vanishingX = w / 2;

      // 1. Draw radiating vertical grid lines from horizon center
      ctx.strokeStyle = "rgba(229, 193, 88, 0.04)";
      ctx.lineWidth = 1;
      const lineCount = 36;
      for (let i = 0; i <= lineCount; i++) {
        const targetX = (i / lineCount) * w * 2.2 - (w * 0.6); // fan out beyond width
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(targetX, h);
        ctx.stroke();
      }

      // 2. Draw moving horizontal grid lines
      offset += 0.45; // forward speed
      if (offset >= 45) offset = 0; // reset loop interval

      ctx.strokeStyle = "rgba(229, 193, 88, 0.05)";
      
      let currentDistance = offset;
      while (currentDistance < h) {
        // Apply perspective exponential expansion
        const y = horizonY + (currentDistance * currentDistance) / h;
        
        if (y > horizonY && y < h) {
          // Fade lines close to horizon vanishing point
          const alpha = ((y - horizonY) / h) * 0.4;
          ctx.strokeStyle = `rgba(229, 193, 88, ${alpha})`;
          ctx.lineWidth = 0.5 + ((y - horizonY) / h) * 1.5;

          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        
        currentDistance += 20; // spacing factor
      }

      // 3. Draw bottom fading overlay (smooth fade out)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(3, 3, 8, 1)"); // Solid black horizon
      grad.addColorStop(0.25, "rgba(3, 3, 8, 0)"); // Expose grid
      grad.addColorStop(0.85, "rgba(3, 3, 8, 0)");
      grad.addColorStop(1, "rgba(3, 3, 8, 1)"); // Fade out at screen base
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="w-full relative overflow-hidden h-[220px]">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
