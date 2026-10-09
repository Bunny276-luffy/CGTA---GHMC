"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Accessibility controls (GIGW/WCAG 2.1 AA baseline)
 * - text scaling: normal / large / x-large (html.text-scale-*)
 * - high contrast mode (html.gov-high-contrast)
 * Preferences persist per device. CSS support ships in globals.css.
 */

const TEXT_SCALE_KEY = "ct_text_scale";
const CONTRAST_KEY = "ct_high_contrast";

export type TextScale = "normal" | "large" | "xlarge";

function applyTextScale(scale: TextScale) {
  const root = document.documentElement;
  root.classList.remove("text-scale-normal", "text-scale-large", "text-scale-xlarge");
  root.classList.add(`text-scale-${scale}`);
}

function applyContrast(on: boolean) {
  const root = document.documentElement;
  root.classList.toggle("gov-high-contrast", on);
}

export function useAccessibility() {
  const [scale, setScaleState] = useState<TextScale>("normal");
  const [contrast, setContrastState] = useState(false);

  useEffect(() => {
    const storedScale = (localStorage.getItem(TEXT_SCALE_KEY) as TextScale) || "normal";
    const storedContrast = localStorage.getItem(CONTRAST_KEY) === "1";
    setScaleState(storedScale);
    setContrastState(storedContrast);
    applyTextScale(storedScale);
    applyContrast(storedContrast);
  }, []);

  const setScale = useCallback((next: TextScale) => {
    localStorage.setItem(TEXT_SCALE_KEY, next);
    applyTextScale(next);
    setScaleState(next);
  }, []);

  const setContrast = useCallback((on: boolean) => {
    localStorage.setItem(CONTRAST_KEY, on ? "1" : "0");
    applyContrast(on);
    setContrastState(on);
  }, []);

  return { scale, setScale, contrast, setContrast };
}

export default function AccessibilityControls() {
  const { scale, setScale, contrast, setContrast } = useAccessibility();

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Accessibility controls: text size and contrast"
    >
      {/* Text size: A / A+ / A++ */}
      <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
        {(["normal", "large", "xlarge"] as TextScale[]).map((s, i) => (
          <button
            key={s}
            onClick={() => setScale(s)}
            aria-pressed={scale === s}
            aria-label={`Text size: ${s}`}
            className={`px-2 py-1.5 text-[10px] font-bold transition-colors ${
              scale === s
                ? "bg-indigo-600 text-white"
                : "bg-slate-900/80 text-slate-400 hover:text-white"
            }`}
          >
            {["A", "A+", "A++"][i]}
          </button>
        ))}
      </div>

      {/* High contrast */}
      <button
        onClick={() => setContrast(!contrast)}
        aria-pressed={contrast}
        aria-label="Toggle high contrast mode"
        title="High contrast"
        className={`px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-colors ${
          contrast
            ? "bg-amber-500 border-amber-400 text-black"
            : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"
        }`}
      >
        ◐
      </button>
    </div>
  );
}
