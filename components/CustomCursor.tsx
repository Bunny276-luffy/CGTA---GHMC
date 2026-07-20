"use client";

import React, { useState, useEffect, useRef } from "react";

export default function CustomCursor() {
  const [hidden, setHidden] = useState(true);
  const [hovered, setHovered] = useState(false);
  const cursorRef = useRef<{ x: number; y: number; targetX: number; targetY: number }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
  });

  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Disable custom cursor on touch/mobile devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    setHidden(false);

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current.targetX = e.clientX;
      cursorRef.current.targetY = e.clientY;
    };

    const handleMouseEnter = () => setHidden(false);
    const handleMouseLeave = () => setHidden(true);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Track hover states globally on interactive nodes
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest('[role="button"]') ||
        target.classList.contains("cursor-pointer")
      ) {
        setHovered(true);
      } else {
        setHovered(false);
      }
    };
    document.addEventListener("mouseover", handleMouseOver);

    // Easing positioning loop
    let animId: number;
    const updatePosition = () => {
      const dot = dotRef.current;
      const ring = ringRef.current;

      if (dot && ring) {
        // Linear interpolation (Lerp) for smooth trailing
        cursorRef.current.x += (cursorRef.current.targetX - cursorRef.current.x) * 0.25;
        cursorRef.current.y += (cursorRef.current.targetY - cursorRef.current.y) * 0.25;

        // Apply fast translate3d transformations
        dot.style.transform = `translate3d(${cursorRef.current.targetX - 3}px, ${cursorRef.current.targetY - 3}px, 0)`;
        ring.style.transform = `translate3d(${cursorRef.current.x - 12}px, ${cursorRef.current.y - 12}px, 0)`;
      }

      animId = requestAnimationFrame(updatePosition);
    };
    updatePosition();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  if (hidden) return null;

  return (
    <>
      {/* Inner solid gold dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 h-1.5 w-1.5 bg-amber-500 rounded-full pointer-events-none z-50 transition-transform duration-75 ease-out"
        style={{ mixBlendMode: "difference" }}
      />
      {/* Outer glowing ring */}
      <div
        ref={ringRef}
        className={`fixed top-0 left-0 rounded-full pointer-events-none z-50 border transition-all duration-300 ${
          hovered 
            ? "h-8 w-8 bg-amber-500/10 border-amber-400 scale-110 shadow-[0_0_15px_rgba(229,193,88,0.35)]" 
            : "h-6 w-6 border-amber-500/35 bg-transparent"
        }`}
        style={{
          transitionProperty: "width, height, background-color, border-color, box-shadow"
        }}
      />
    </>
  );
}
