import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getStoredPreference,
  setStoredPreference,
  resolveScheme,
  getSystemScheme,
  applySchemeClass,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

const PREF = "biokool-theme";

function setStorage(value: string | null) {
  const store: Record<string, string> = {};
  if (value !== null) store[PREF] = value;
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
  });
}

describe("theme lib", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.className = "";
  });

  it("defaults to system when nothing is stored", () => {
    setStorage(null);
    expect(getStoredPreference()).toBe("system");
  });

  it("returns stored preference", () => {
    setStorage("dark");
    expect(getStoredPreference()).toBe("dark");
  });

  it("ignores invalid stored values", () => {
    setStorage("neon");
    expect(getStoredPreference()).toBe("system");
  });

  it("setStoredPreference persists the value", () => {
    setStorage(null);
    setStoredPreference("light");
    expect(localStorage.getItem(PREF)).toBe("light");
  });

  it("resolveScheme resolves system pref against system flag", () => {
    expect(resolveScheme("system", true)).toBe("dark");
    expect(resolveScheme("system", false)).toBe("light");
    expect(resolveScheme("dark", true)).toBe("dark");
    expect(resolveScheme("light", false)).toBe("light");
  });

  it("getSystemScheme reads matchMedia prefers-color-scheme", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    });
    expect(getSystemScheme()).toBe("dark");
  });

  it("getSystemScheme falls back to light without matchMedia", () => {
    vi.stubGlobal("window", {});
    expect(getSystemScheme()).toBe("light");
  });

  it("applySchemeClass adds scheme-* class and removes others", () => {
    document.documentElement.classList.add("scheme-dark");
    applySchemeClass("light");
    expect(document.documentElement.classList.contains("scheme-light")).toBe(true);
    expect(document.documentElement.classList.contains("scheme-dark")).toBe(false);
    expect(document.documentElement.classList.contains("scheme-light-dark")).toBe(false);
  });

  it("applySchemeClass uses scheme-light-dark for system", () => {
    applySchemeClass("system");
    expect(document.documentElement.classList.contains("scheme-light-dark")).toBe(true);
  });
});
