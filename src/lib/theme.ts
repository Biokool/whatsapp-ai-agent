export type ThemePreference = "light" | "dark" | "system";
export type ResolvedScheme = "light" | "dark";

export const THEME_STORAGE_KEY = "biokool-theme";

const PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

function isPreference(value: string | null): value is ThemePreference {
  return value !== null && (PREFERENCES as string[]).includes(value);
}

export function getStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function setStoredPreference(pref: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // noop
  }
}

export function resolveScheme(pref: ThemePreference, systemDark: boolean): ResolvedScheme {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}

export function getSystemScheme(): ResolvedScheme {
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
  ) {
    return "dark";
  }
  return "light";
}

export function applySchemeClass(pref: ThemePreference): void {
  const root = document.documentElement;
  root.classList.remove("scheme-light", "scheme-dark", "scheme-light-dark");
  const cls = pref === "system" ? "scheme-light-dark" : `scheme-${pref}`;
  root.classList.add(cls);
}
