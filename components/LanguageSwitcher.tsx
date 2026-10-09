"use client";

import React from "react";
import { Languages } from "lucide-react";
import { useI18n } from "../lib/use-i18n";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "हिन्दी",
  te: "తెలుగు"
};

/**
 * Language selector. Languages come from the deployment profile's
 * multilingual configuration (see INTEGRATIONS.md for BHASHINI slot).
 */
export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, enabled } = useI18n();

  if (compact) {
    return (
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Select language"
        className="bg-slate-900/80 border border-white/10 rounded-lg text-xs text-slate-300 px-2 py-2 outline-none focus:border-indigo-500"
      >
        {enabled.map(code => (
          <option key={code} value={code}>{LANGUAGE_LABELS[code] ?? code}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label="Select language"
        className="bg-slate-900/80 border border-white/10 rounded-lg text-xs text-slate-300 px-2 py-2 outline-none focus:border-indigo-500"
      >
        {enabled.map(code => (
          <option key={code} value={code}>{LANGUAGE_LABELS[code] ?? code}</option>
        ))}
      </select>
    </div>
  );
}
