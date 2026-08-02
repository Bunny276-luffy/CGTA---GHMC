"use client";

import React, { useState, useEffect, useRef } from "react";

export default function ThreeDHolographicGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [geoJSONData, setGeoJSONData] = useState<any>(null);

  // High-performance animation refs for smooth 60fps rendering
  const yawRef = useRef(1.5);
  const pitchRef = useRef(0.25);
  const zoomRef = useRef(1.0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Fetch Simplified High-Performance World GeoJSON Dataset
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
      .then((res) => {
        if (!res.ok) throw new Error("Network response error");
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.features)) {
          setGeoJSONData(data);
        }
      })
      .catch((err) => console.warn("Using offline performance continents:", err));
  }, []);

  // Simplified Continents Fallback
  const fallbackContinents = [
    // Africa
    [
      { lat: 35, lng: -10 }, { lat: 37, lng: 10 }, { lat: 33, lng: 35 }, { lat: 12, lng: 44 },
      { lat: 10, lng: 51 }, { lat: -12, lng: 40 }, { lat: -34, lng: 20 }, { lat: -30, lng: 15 },
      { lat: 5, lng: 10 }, { lat: 15, lng: -17 }, { lat: 28, lng: -13 }
    ],
    // Eurasia
    [
      { lat: 70, lng: -10 }, { lat: 75, lng: 60 }, { lat: 70, lng: 120 }, { lat: 60, lng: 170 },
      { lat: 35, lng: 140 }, { lat: 22, lng: 120 }, { lat: 10, lng: 105 }, { lat: 8, lng: 77 },
      { lat: 25, lng: 60 }, { lat: 30, lng: 35 }, { lat: 40, lng: 28 }, { lat: 45, lng: 15 }
    ],
    // India
    [
      { lat: 35.5, lng: 77 }, { lat: 31, lng: 78.5 }, { lat: 27, lng: 88.5 }, { lat: 28, lng: 96 },
      { lat: 23, lng: 92 }, { lat: 21.5, lng: 87 }, { lat: 13, lng: 80 }, { lat: 8, lng: 77.5 },
      { lat: 15, lng: 73.5 }, { lat: 23, lng: 68.5 }, { lat: 30, lng: 71 }
    ],
    // North America
    [
      { lat: 75, lng: -160 }, { lat: 70, lng: -100 }, { lat: 50, lng: -60 }, { lat: 25, lng: -80 },
      { lat: 15, lng: -90 }, { lat: 20, lng: -110 }, { lat: 30, lng: -120 }, { lat: 50, lng: -130 },
      { lat: 60, lng: -160 }
    ],
    // South America
    [
      { lat: 10, lng: -75 }, { lat: -5, lng: -80 }, { lat: -35, lng: -72 }, { lat: -54, lng: -68 },
      { lat: -40, lng: -50 }, { lat: -20, lng: -40 }, { lat: -5, lng: -35 }
    ],
    // Australia
    [
      { lat: -12, lng: 130 }, { lat: -20, lng: 115 }, { lat: -35, lng: 115 }, { lat: -38, lng: 145 },
      { lat: -33, lng: 151 }, { lat: -15, lng: 145 }
    ]
  ];

  // Optimized 3D Spherical Projection Math
  const project3D = (lat: number, lng: number, yaw: number, pitch: number, zoom: number, w: number, h: number) => {
    const baseRadius = Math.min(w, h) * 0.38;
    const radius = baseRadius * zoom;

    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    // Yaw & Pitch Rotation
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const y2 = y * cosP - z1 * sinP;
    const z2 = y * sinP + z1 * cosP;

    const screenX = w / 2 + x1;
    const screenY = h / 2 - y2;

    return { x: screenX, y: screenY, z: z2, isVisible: z2 > 0 };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;

    const resizeCanvas = () => {
      if (!container || !canvas) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight || 500;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Mouse Interaction Handlers
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      yawRef.current += dx * 0.004;
      pitchRef.current -= dy * 0.004;
      pitchRef.current = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitchRef.current));

      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * -0.001;
      zoomRef.current = Math.min(Math.max(0.7, zoomRef.current + zoomDelta), 2.0);
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    // Ultra-Fast 60FPS Render Pipeline
    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (!isDraggingRef.current) {
        yawRef.current += 0.0025;
      }

      const yaw = yawRef.current;
      const pitch = pitchRef.current;
      const zoom = zoomRef.current;

      const globeRadius = Math.min(w, h) * 0.38 * zoom;

      // 1. Atmosphere Glow Ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, globeRadius * 1.02, 0, Math.PI * 2);
      const glowGradient = ctx.createRadialGradient(
        w / 2, h / 2, globeRadius * 0.85,
        w / 2, h / 2, globeRadius * 1.18
      );
      glowGradient.addColorStop(0, "rgba(56, 189, 248, 0.2)");
      glowGradient.addColorStop(0.7, "rgba(56, 189, 248, 0.06)");
      glowGradient.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.fillStyle = glowGradient;
      ctx.fill();
      ctx.restore();

      // 2. Translucent Dark Sphere Base
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, globeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(3, 7, 18, 0.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 3. Glowing Cyan Grid Mesh (Parallels & Meridians)
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.16)";
      ctx.lineWidth = 0.75;

      for (let lat = -75; lat <= 75; lat += 20) {
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 180; lng += 8) {
          const pt = project3D(lat, lng, yaw, pitch, zoom, w, h);
          if (pt.isVisible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      for (let lng = -180; lng < 180; lng += 20) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 8) {
          const pt = project3D(lat, lng, yaw, pitch, zoom, w, h);
          if (pt.isVisible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }
      ctx.restore();

      // 4. Country Borders (Optimized Drawing Loop)
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
      ctx.fillStyle = "rgba(14, 116, 144, 0.2)";
      ctx.lineWidth = 1.2;

      if (geoJSONData && Array.isArray(geoJSONData.features)) {
        geoJSONData.features.forEach((feature: any) => {
          const geometry = feature.geometry;
          if (!geometry) return;

          const renderPolygon = (coordinates: any[]) => {
            ctx.beginPath();
            let first = true;
            // Step size = 2 for ultra-fast performance without sacrificing border shape detail
            const step = coordinates.length > 200 ? 2 : 1;

            for (let i = 0; i < coordinates.length; i += step) {
              const coord = coordinates[i];
              const lng = coord[0];
              const lat = coord[1];
              const pt = project3D(lat, lng, yaw, pitch, zoom, w, h);
              if (pt.isVisible) {
                if (first) {
                  ctx.moveTo(pt.x, pt.y);
                  first = false;
                } else {
                  ctx.lineTo(pt.x, pt.y);
                }
              } else {
                first = true;
              }
            }

            ctx.stroke();
            ctx.fill();
          };

          if (geometry.type === "Polygon") {
            geometry.coordinates.forEach((ring: any[]) => renderPolygon(ring));
          } else if (geometry.type === "MultiPolygon") {
            geometry.coordinates.forEach((polygon: any[]) => {
              polygon.forEach((ring: any[]) => renderPolygon(ring));
            });
          }
        });
      } else {
        // Fallback Continents
        fallbackContinents.forEach((continent) => {
          ctx.beginPath();
          let first = true;

          continent.forEach((coord) => {
            const pt = project3D(coord.lat, coord.lng, yaw, pitch, zoom, w, h);
            if (pt.isVisible) {
              if (first) {
                ctx.moveTo(pt.x, pt.y);
                first = false;
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
            }
          });

          ctx.closePath();
          ctx.stroke();
          ctx.fill();
        });
      }
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
      cancelAnimationFrame(animId);
    };
  }, [geoJSONData]);

  return (
    <div ref={containerRef} className="relative flex items-center justify-center select-none w-full h-full min-h-[400px] sm:min-h-[500px] bg-transparent overflow-hidden">
      <canvas
        ref={canvasRef}
        className="cursor-grab active:cursor-grabbing w-full h-full block bg-transparent"
      />
    </div>
  );
}
