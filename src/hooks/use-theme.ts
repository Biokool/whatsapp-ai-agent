"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getStoredPreference,
  setStoredPreference,
  applySchemeClass,
  getSystemScheme,
  resolveScheme,
  type ThemePreference,
  type ResolvedScheme,
} from "@/lib/theme";

export function useTheme(): {
  pref: ThemePreference;
  resolved: ResolvedScheme;
  setPref: (pref: ThemePreference) => void;
} {
  const [pref, setPrefState] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : getStoredPreference()
  );
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    applySchemeClass(pref);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSystemDark(getSystemScheme() === "dark");
  }, [pref]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setPref = useCallback((next: ThemePreference) => {
    setPrefState(next);
    setStoredPreference(next);
    applySchemeClass(next);
  }, []);

  return { pref, resolved: resolveScheme(pref, systemDark), setPref };
}
