"use client";

import React, { useRef, useEffect } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface ShapeInstance {
  type: "cube" | "octahedron" | "pyramid" | "torus";
  xOffset: number; // Offset from screen center
  yOffset: number;
  scale: number;
  yawSpeed: number;
  pitchSpeed: number;
  rollSpeed: number;
  color: string;
}

export default function ThreeDAuthBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    // 3D Vertices Definition for basic shapes
    const cubeVertices: Point3D[] = [
      { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
      { x: -1, y: -1, z: 1 },  { x: 1, y: -1, z: 1 },  { x: 1, y: 1, z: 1 },  { x: -1, y: 1, z: 1 }
    ];
    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // Back face
      [4, 5], [5, 6], [6, 7], [7, 4], // Front face
      [0, 4], [1, 5], [2, 6], [3, 7]  // Connectors
    ];

    const octaVertices: Point3D[] = [
      { x: 0, y: 1.2, z: 0 },
      { x: 0.8, y: 0, z: 0.8 }, { x: -0.8, y: 0, z: 0.8 },
      { x: -0.8, y: 0, z: -0.8 }, { x: 0.8, y: 0, z: -0.8 },
      { x: 0, y: -1.2, z: 0 }
    ];
    const octaEdges = [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 2], [2, 3], [3, 4], [4, 1],
      [5, 1], [5, 2], [5, 3], [5, 4]
    ];

    const pyramidVertices: Point3D[] = [
      { x: 0, y: 1, z: 0 },
      { x: -0.8, y: -0.8, z: -0.8 },
      { x: 0.8, y: -0.8, z: -0.8 },
      { x: 0.8, y: -0.8, z: 0.8 },
      { x: -0.8, y: -0.8, z: 0.8 }
    ];
    const pyramidEdges = [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 2], [2, 3], [3, 4], [4, 1]
    ];

    // Generate Torus (Ring) 3D coordinate vertices
    const torusVertices: Point3D[] = [];
    const torusEdges: number[][] = [];
    const torusSegments = 16;
    for (let i = 0; i < torusSegments; i++) {
      const theta = (i / torusSegments) * Math.PI * 2;
      torusVertices.push({
        x: Math.cos(theta),
        y: Math.sin(theta),
        z: 0
      });
      torusEdges.push([i, (i + 1) % torusSegments]);
    }

    // Configure 4 floating 3D shapes at stationary, offset background coordinates
    const shapes: ShapeInstance[] = [
      { type: "cube", xOffset: -340, yOffset: -180, scale: 45, yawSpeed: 0.006, pitchSpeed: 0.004, rollSpeed: 0.002, color: "rgba(6, 182, 212, ALPHA)" },
      { type: "octahedron", xOffset: 340, yOffset: 160, scale: 50, yawSpeed: 0.005, pitchSpeed: 0.007, rollSpeed: 0.003, color: "rgba(99, 102, 241, ALPHA)" },
      { type: "pyramid", xOffset: 320, yOffset: -160, scale: 45, yawSpeed: 0.008, pitchSpeed: 0.003, rollSpeed: 0.005, color: "rgba(16, 185, 129, ALPHA)" },
      { type: "torus", xOffset: -320, yOffset: 160, scale: 50, yawSpeed: 0.004, pitchSpeed: 0.005, rollSpeed: 0.008, color: "rgba(6, 182, 212, ALPHA)" }
    ];

    let time = 0;

    const render = () => {
      time += 1;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // Render each 3D shape at its stationary background position
      shapes.forEach((shape) => {
        // Compute 3D rotation angles based on time
        const yaw = time * shape.yawSpeed;
        const pitch = time * shape.pitchSpeed;
        const roll = time * shape.rollSpeed;

        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        const cosP = Math.cos(pitch);
        const sinP = Math.sin(pitch);
        const cosR = Math.cos(roll);
        const sinR = Math.sin(roll);

        // Map vertices & edges depending on shape type
        let verts: Point3D[] = [];
        let edges: number[][] = [];

        if (shape.type === "cube") {
          verts = cubeVertices;
          edges = cubeEdges;
        } else if (shape.type === "octahedron") {
          verts = octaVertices;
          edges = octaEdges;
        } else if (shape.type === "pyramid") {
          verts = pyramidVertices;
          edges = pyramidEdges;
        } else if (shape.type === "torus") {
          verts = torusVertices;
          edges = torusEdges;
        }

        // Project 3D points to 2D centered on the shape's offset position
        const projectedPoints = verts.map((v) => {
          // Rotate Y
          let x1 = v.x * cosY - v.z * sinY;
          let z1 = v.x * sinY + v.z * cosY;

          // Rotate X
          let y2 = v.y * cosP - z1 * sinP;
          let z2 = v.y * sinP + z1 * cosP;

          // Rotate Z
          let x3 = x1 * cosR - y2 * sinR;
          let y3 = x1 * sinR + y2 * cosR;

          // Perspective scaling
          const distance = 5;
          const scale = distance / (z2 + distance);
          
          return {
            x: cx + shape.xOffset + x3 * shape.scale * scale,
            y: cy + shape.yOffset - y3 * shape.scale * scale,
            depth: z2
          };
        });

        // Draw edges
        edges.forEach(([u, v]) => {
          const p1 = projectedPoints[u];
          const p2 = projectedPoints[v];

          const avgDepth = (p1.depth + p2.depth) / 2;
          const alpha = Math.max(0.08, 0.28 - avgDepth * 0.08);

          ctx.strokeStyle = shape.color.replace("ALPHA", alpha.toFixed(3));
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        });
      });

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
