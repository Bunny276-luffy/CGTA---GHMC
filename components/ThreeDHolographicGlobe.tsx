"use client";

import React, { useState, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

interface Beacon {
  lat: number;
  lng: number;
  label: string;
  id: string;
  status: string;
}

export default function ThreeDHolographicGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-performance refs to animate smoothly at 60fps without React state trigger lags
  const yawRef = useRef(0.5);
  const pitchRef = useRef(0.4);
  const zoomRef = useRef(1.25);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [zoomState, setZoomState] = useState(1.25);
  const [geoJSONData, setGeoJSONData] = useState<any>(null);
  const [activeBeacon, setActiveBeacon] = useState<Beacon | null>(null);
  const [hoveredLatLng, setHoveredLatLng] = useState<{ lat: number; lng: number; label?: string } | null>(null);

  // Beacons pointing to India, USA, Russia, China, and other leading countries
  const beacons: Beacon[] = [
    { lat: 20.5937, lng: 78.9629, label: "INDIA", id: "NODE-IND", status: "ACTIVE" },
    { lat: 37.0902, lng: -95.7129, label: "UNITED STATES", id: "NODE-USA", status: "ACTIVE" },
    { lat: 61.5240, lng: 105.3188, label: "RUSSIA", id: "NODE-RUS", status: "ACTIVE" },
    { lat: 35.8617, lng: 104.1954, label: "CHINA", id: "NODE-CHN", status: "ACTIVE" },
    { lat: 55.3781, lng: -3.4360, label: "UNITED KINGDOM", id: "NODE-GBR", status: "ACTIVE" },
    { lat: -25.2744, lng: 133.7751, label: "AUSTRALIA", id: "NODE-AUS", status: "ACTIVE" },
    { lat: 36.2048, lng: 138.2529, label: "JAPAN", id: "NODE-JPN", status: "ACTIVE" }
  ];

  // Fetch World Boundaries GeoJSON for exact country borders
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load map data");
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.features)) {
          setGeoJSONData(data);
        } else {
          throw new Error("Invalid GeoJSON format");
        }
      })
      .catch((err) => console.warn("Using offline fallback continents:", err));
  }, []);

  // Simplified fallback continents in lat/lng coordinates
  const fallbackContinents = [
    // Africa
    [
      { lat: 35, lng: -10 }, { lat: 30, lng: 32 }, { lat: 10, lng: 50 }, { lat: -20, lng: 40 },
      { lat: -34, lng: 20 }, { lat: -30, lng: 15 }, { lat: 5, lng: 10 }, { lat: 15, lng: -15 }
    ],
    // Eurasia
    [
      { lat: 70, lng: -10 }, { lat: 75, lng: 60 }, { lat: 70, lng: 120 }, { lat: 60, lng: 170 },
      { lat: 35, lng: 140 }, { lat: 10, lng: 120 }, { lat: 5, lng: 80 }, { lat: 25, lng: 60 },
      { lat: 30, lng: 35 }, { lat: 45, lng: 15 }
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

  // Helper to resolve lat/lng from screen coordinate projection
  const getLatLngFromScreen = (mx: number, my: number, w: number, h: number, zoom: number) => {
    const screenRadius = 220 * zoom;
    const dx = (mx - w / 2) / screenRadius;
    const dy = -(my - h / 2) / screenRadius;
    
    const distSq = dx * dx + dy * dy;
    if (distSq > 1.0) return null; // Outside the sphere
    
    // Calculate z on front hemisphere (negative z2 / closer)
    const dz = -Math.sqrt(1.0 - distSq);
    
    // Reverse Pitch (X-rotation)
    const cosP = Math.cos(pitchRef.current);
    const sinP = Math.sin(pitchRef.current);
    const y = dy * cosP + dz * sinP;
    const z1 = -dy * sinP + dz * cosP;
    
    // Reverse Yaw (Y-rotation)
    const cosY = Math.cos(yawRef.current);
    const sinY = Math.sin(yawRef.current);
    const x = dx * cosY + z1 * sinY;
    const z = -dx * sinY + z1 * cosY;
    
    // Convert back to lat/lng in degrees
    const lat = Math.asin(y) * 180 / Math.PI;
    let lng = Math.atan2(x, z) * 180 / Math.PI;
    
    // Normalize lng to [-180, 180]
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;
    
    return { lat, lng };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let mouseX = 0;
    let mouseY = 0;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = Math.min(840, canvas.parentElement.clientWidth - 24);
      } else {
        canvas.width = 840;
      }
      canvas.height = 540;
    };
    window.addEventListener("resize", resize);
    resize();

    // Perspective Projection helper
    const project = (x: number, y: number, z: number, w: number, h: number) => {
      const cosY = Math.cos(yawRef.current);
      const sinY = Math.sin(yawRef.current);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      const cosP = Math.cos(pitchRef.current);
      const sinP = Math.sin(pitchRef.current);
      const y2 = y * cosP - z1 * sinP;
      const z2 = y * sinP + z1 * cosP;

      const distance = 2.2;
      const baseRadius = 220 * zoomRef.current;
      const scale = baseRadius / (z2 + distance);

      return {
        x: w / 2 + x1 * scale * distance,
        y: h / 2 - y2 * scale * distance,
        depth: z2,
        scale: scale / (baseRadius / distance)
      };
    };

    const getCartesian = (lat: number, lng: number, r: number) => {
      const latRad = (lat * Math.PI) / 180;
      const lngRad = (lng * Math.PI) / 180;
      return {
        x: r * Math.cos(latRad) * Math.sin(lngRad),
        y: r * Math.sin(latRad),
        z: r * Math.cos(latRad) * Math.cos(lngRad)
      };
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const radius = 1.0;

      if (!isDraggingRef.current) {
        // Continuous 360 degree spin around vertical Y axis
        yawRef.current += 0.0025;
        yawRef.current = yawRef.current % (Math.PI * 2);
      }

      const screenRadius = 220 * zoomRef.current;

      // 1. Draw glowing blue/cyan holographic sphere outline & aura
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, screenRadius, 0, Math.PI * 2);
      ctx.stroke();

      const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, screenRadius);
      grad.addColorStop(0, "rgba(59, 130, 246, 0.01)");
      grad.addColorStop(0.85, "rgba(59, 130, 246, 0.04)");
      grad.addColorStop(1, "rgba(6, 182, 212, 0.08)");
      ctx.fillStyle = grad;
      ctx.fill();

      // 2. Draw latitude rings
      ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
      ctx.lineWidth = 0.6;
      const latCount = 10;
      for (let j = 1; j < latCount; j++) {
        const phi = (j / latCount) * Math.PI - Math.PI / 2;
        ctx.beginPath();
        let isFirst = true;
        for (let i = 0; i <= 60; i++) {
          const theta = (i / 60) * Math.PI * 2;
          const x = radius * Math.cos(phi) * Math.sin(theta);
          const y = radius * Math.sin(phi);
          const z = radius * Math.cos(phi) * Math.cos(theta);
          const pt = project(x, y, z, w, h);

          if (pt.depth < 0) {
            if (isFirst) {
              ctx.moveTo(pt.x, pt.y);
              isFirst = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            isFirst = true;
          }
        }
        ctx.stroke();
      }

      // 3. Draw correct country boundaries (GeoJSON) or fallback contours
      if (geoJSONData && Array.isArray(geoJSONData.features)) {
        ctx.strokeStyle = "rgba(59, 130, 246, 0.28)"; 
        ctx.lineWidth = 0.75;

        geoJSONData.features.forEach((feature: any) => {
          if (!feature) return;
          const geom = feature.geometry;
          if (!geom || !geom.coordinates || !Array.isArray(geom.coordinates)) return;

          const drawPolygon = (coords: any) => {
            if (!coords || !Array.isArray(coords)) return;
            ctx.beginPath();
            let isFirst = true;
            let visibleCount = 0;

            coords.forEach((ptCoord: any) => {
              if (!ptCoord || !Array.isArray(ptCoord) || ptCoord.length < 2) return;
              const lng = ptCoord[0];
              const lat = ptCoord[1];
              if (typeof lng !== "number" || typeof lat !== "number") return;

              const c = getCartesian(lat, lng, radius);
              const pt = project(c.x, c.y, c.z, w, h);

              if (pt.depth < 0.15) {
                visibleCount++;
                if (isFirst) {
                  ctx.moveTo(pt.x, pt.y);
                  isFirst = false;
                } else {
                  ctx.lineTo(pt.x, pt.y);
                }
              } else {
                isFirst = true;
              }
            });

            if (visibleCount > 1) {
              ctx.stroke();
            }
          };

          if (geom.type === "Polygon") {
            drawPolygon(geom.coordinates[0]);
          } else if (geom.type === "MultiPolygon") {
            geom.coordinates.forEach((poly: any) => {
              if (poly && Array.isArray(poly)) {
                drawPolygon(poly[0]);
              }
            });
          }
        });
      } else {
        // Fallback simplified contours (always renders even if GeoJSON fetch fails or has bad format)
        ctx.strokeStyle = "rgba(59, 130, 246, 0.22)";
        ctx.lineWidth = 0.95;
        fallbackContinents.forEach((poly) => {
          ctx.beginPath();
          let isFirst = true;
          poly.forEach((ptCoord) => {
            const c = getCartesian(ptCoord.lat, ptCoord.lng, radius);
            const pt = project(c.x, c.y, c.z, w, h);
            if (pt.depth < 0.15) {
              if (isFirst) {
                ctx.moveTo(pt.x, pt.y);
                isFirst = false;
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
            } else {
              isFirst = true;
            }
          });
          ctx.closePath();
          ctx.stroke();
        });
      }

      // 4. Draw node connections
      ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
      ctx.lineWidth = 0.7;
      const projectedBeacons = beacons.map((b) => {
        const c = getCartesian(b.lat, b.lng, radius);
        return { pt: project(c.x, c.y, c.z, w, h), b };
      });

      for (let i = 0; i < projectedBeacons.length; i++) {
        for (let j = i + 1; j < projectedBeacons.length; j++) {
          const p1 = projectedBeacons[i];
          const p2 = projectedBeacons[j];
          if (p1.pt.depth < 0 && p2.pt.depth < 0) {
            ctx.beginPath();
            ctx.moveTo(p1.pt.x, p1.pt.y);
            ctx.lineTo(p2.pt.x, p2.pt.y);
            ctx.stroke();
          }
        }
      }

      // 5. Draw country pinpoint beacons
      let hovered: Beacon | null = null;
      projectedBeacons.forEach(({ pt, b }, index) => {
        if (pt.depth < 0.1) {
          const pulse = 4 + Math.sin(Date.now() * 0.007 + index) * 2.5;

          ctx.strokeStyle = "rgba(6, 182, 212, 0.65)";
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pulse * pt.scale, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = "#06b6d4";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5 * pt.scale, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.font = `bold ${Math.round(8.5 * pt.scale)}px sans-serif`;
          ctx.fillText(b.label, pt.x + 8, pt.y + 3);

          const dist = Math.hypot(mouseX - pt.x, mouseY - pt.y);
          if (dist < 12) {
            hovered = b;
          }
        }
      });

      if (hovered) {
        setActiveBeacon(hovered);
      }

      animId = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;

      const coords = getLatLngFromScreen(mouseX, mouseY, canvas.width, canvas.height, zoomRef.current);
      if (coords) {
        const closeBeacon = beacons.find((b) => {
          const dist = Math.hypot(b.lat - coords.lat, b.lng - coords.lng);
          return dist < 8.5;
        });

        setHoveredLatLng({
          lat: coords.lat,
          lng: coords.lng,
          label: closeBeacon ? closeBeacon.label : undefined
        });
      } else {
        setHoveredLatLng(null);
      }

      if (isDraggingRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        yawRef.current += dx * 0.0055;
        pitchRef.current += dy * 0.0055;

        pitchRef.current = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitchRef.current));
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.min(2.0, Math.max(0.4, zoomRef.current - e.deltaY * 0.0015));
      setZoomState(zoomRef.current);
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("wheel", handleWheel);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [zoomState, geoJSONData]);

  const zoomIn = () => {
    zoomRef.current = Math.min(2.0, zoomRef.current + 0.15);
    setZoomState(zoomRef.current);
  };

  const zoomOut = () => {
    zoomRef.current = Math.max(0.4, zoomRef.current - 0.15);
    setZoomState(zoomRef.current);
  };

  const formatCoord = (val: number, isLat: boolean) => {
    const abs = Math.abs(val).toFixed(1);
    if (isLat) return val >= 0 ? `${abs}° N` : `${abs}° S`;
    return val >= 0 ? `${abs}° E` : `${abs}° W`;
  };

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-3xl mx-auto bg-[#030308]/45 p-8 rounded-3xl border border-white/5 min-h-[600px]">
      
      {/* Floating Zoom Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={zoomIn}
          className="h-8 w-8 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="h-4.5 w-4.5" />
        </button>
        <button
          onClick={zoomOut}
          className="h-8 w-8 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="h-4.5 w-4.5" />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={840}
        height={500}
        className="cursor-grab active:cursor-grabbing max-w-full relative z-10"
      />

      {/* Centered Panel at the bottom of the Globe Box for hovered Lat/Lng, Countries & Controls */}
      <div className="w-[90%] min-h-[56px] mt-2 p-3 bg-slate-950/80 border border-white/5 rounded-2xl backdrop-blur-md text-center font-mono text-[9px] text-slate-400 flex flex-col items-center justify-center space-y-1 shadow-lg relative z-20">
        {hoveredLatLng ? (
          <div className="animate-fade-in text-center">
            {hoveredLatLng.label ? (
              <span className="text-cyan-400 font-bold block uppercase tracking-wider text-[10px]">
                📍 {hoveredLatLng.label} NODE ACTIVE
              </span>
            ) : (
              <span className="text-slate-500 block uppercase tracking-wider text-[7.5px]">
                📡 TRACING LIVE TELEMETRY
              </span>
            )}
            <span className="text-white font-semibold block mt-0.5">
              {formatCoord(hoveredLatLng.lat, true)} | {formatCoord(hoveredLatLng.lng, false)}
            </span>
          </div>
        ) : activeBeacon ? (
          <div className="animate-fade-in text-center">
            <span className="text-cyan-400 font-bold block uppercase tracking-wider text-[10px]">
              📍 {activeBeacon.label} NODE SELECTED
            </span>
            <span className="text-slate-350 block mt-0.5">
              STATUS: {activeBeacon.status} // LEDGERS SYNCHRONIZED
            </span>
          </div>
        ) : (
          <span className="text-slate-500 uppercase tracking-widest text-[8px] animate-pulse">
            DRAG TO ROTATE 360° // SCROLL TO ZOOM // HOVER TO TRACE COORDINATES
          </span>
        )}
      </div>

    </div>
  );
}
