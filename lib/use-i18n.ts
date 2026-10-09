"use client";

import { useCallback, useEffect, useState } from "react";
import { loadTranslations, translate } from "./i18n";

const LANG_STORAGE_KEY = "ct_language";
export const ENABLED_LANGUAGES = ["en", "hi", "te"]; // mirrored from the deployment profile
const FALLBACK = "en";

/**
 * Shared language store: every component using useI18n() subscribes to the
 * same module-level state, so switching the language in one place (e.g. the
 * header switcher) re-renders the whole page.
 */
let currentLang = FALLBACK;
let initialised = false;
const listeners = new Set<(lang: string) => void>();

async function initLanguage() {
  if (initialised) return;
  initialised = true;
  const stored = typeof window !== "undefined" ? localStorage.getItem(LANG_STORAGE_KEY) : null;
  currentLang = stored && ENABLED_LANGUAGES.includes(stored) ? stored : FALLBACK;
  await loadTranslations(currentLang);
  document.documentElement.lang = currentLang;
  listeners.forEach((l) => l(currentLang));
}

export function useI18n() {
  const [lang, setLangState] = useState(currentLang);

  useEffect(() => {
    const listener = (l: string) => setLangState(l);
    listeners.add(listener);
    initLanguage();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setLang = useCallback((next: string) => {
    if (!ENABLED_LANGUAGES.includes(next)) return;
    localStorage.setItem(LANG_STORAGE_KEY, next);
    loadTranslations(next).then(() => {
      currentLang = next;
      document.documentElement.lang = next;
      listeners.forEach((l) => l(next));
    });
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );

  return { lang, setLang, t, enabled: ENABLED_LANGUAGES };
}
