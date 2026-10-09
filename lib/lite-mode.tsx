"use client";

import React, { useEffect, useState } from "react";

/**
 * Lite Mode (low-bandwidth / reduced-motion operation)
 *
 * Disables decorative 3D backgrounds and cursor effects so the civic workflow
 * stays fast on low-end devices and weak connections. Defaults to ON when the
 * user's OS requests reduced motion. Preference is persisted per device.
 */

const LITE_KEY = "ct_lite_mode";

export function isLiteMode(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(LITE_KEY);
  if (stored !== null) return stored === "1";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setLiteMode(on: boolean) {
  localStorage.setItem(LITE_KEY, on ? "1" : "0");
}

export function useLiteMode(): [boolean, (on: boolean) => void] {
  const [lite, setLite] = useState<boolean>(true); // SSR-safe default
  useEffect(() => setLite(isLiteMode()), []);
  const update = (on: boolean) => {
    setLiteMode(on);
    setLite(on);
  };
  return [lite, update];
}

/**
 * Renders heavy decorative effects only when Lite Mode is OFF.
 * Server renders nothing (no flash, no cost on low-bandwidth connections).
 */
export default function DecorativeEffects({
  children
}: {
  children: React.ReactNode;
}) {
  const [lite, setLiteState] = useState<boolean>(true);
  useEffect(() => setLiteState(isLiteMode()), []);
  if (lite) return null;
  return <>{children}</>;
}

export function LiteModeToggle({ className = "" }: { className?: string }) {
  const [lite, update] = useLiteMode();
  return (
    <label className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={lite}
        onChange={(e) => update(e.target.checked)}
        className="h-3.5 w-3.5 accent-indigo-600"
        aria-label="Lite mode: disable decorative animations"
      />
      <span title="Disables decorative animations for faster, low-bandwidth operation">Lite</span>
    </label>
  );
}
