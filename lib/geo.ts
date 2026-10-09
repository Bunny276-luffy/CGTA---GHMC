import fs from "fs";
import path from "path";
import { getJurisdictionConfig } from "./config";

/**
 * Server-side geospatial helpers for jurisdiction and geofence checks.
 *
 * These are deterministic rule-based validators (no AI). Per the CivicTrust
 * design principle, deterministic validation remains authoritative; AI only
 * assists.
 */

export function gpsToleranceMeters(): number {
  try {
    return getJurisdictionConfig().verification.gpsToleranceMeters;
  } catch {
    return 100;
  }
}

/** Great-circle distance between two coordinates, in meters (Haversine). */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let boundaryCache: { exteriors: [number, number][][] } | null | undefined;

function loadBoundary(): { exteriors: [number, number][][] } | null {
  if (boundaryCache !== undefined) return boundaryCache;
  let loaded: { exteriors: [number, number][][] } | null = null;
  try {
    // The boundary dataset path comes from the jurisdiction deployment profile,
    // so each local body ships its own boundary file.
    const dataset = getJurisdictionConfig().deployment.boundaryDataset;
    const filePath = path.join(process.cwd(), dataset);
    if (fs.existsSync(filePath)) {
      loaded = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch {
    // Boundary unavailable — jurisdiction check will report "unknown".
  }
  boundaryCache = loaded;
  return loaded;
}

function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export type JurisdictionResult = "INSIDE" | "OUTSIDE" | "UNKNOWN";

/** Deterministic point-in-polygon check against the configured jurisdiction boundary. */
export function checkJurisdiction(lat: number, lng: number): JurisdictionResult {
  const boundary = loadBoundary();
  if (!boundary || !Array.isArray(boundary.exteriors) || boundary.exteriors.length === 0) {
    return "UNKNOWN";
  }
  for (const ring of boundary.exteriors) {
    if (pointInRing(lng, lat, ring)) return "INSIDE";
  }
  return "OUTSIDE";
}
