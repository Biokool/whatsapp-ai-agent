import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ThemeToggle from "./ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function setStorage(value: string | null) {
  const store: Record<string, string> = {};
  if (value !== null) store[THEME_STORAGE_KEY] = value;
  const storage = {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
  };
  vi.stubGlobal("localStorage", storage);
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    document.documentElement.className = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a button with aria-label in Spanish", () => {
    setStorage("system");
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: /cambiar tema/i });
    expect(btn).toBeInTheDocument();
  });

  it("applies stored dark scheme on mount", () => {
    setStorage("dark");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("scheme-dark")).toBe(true);
  });

  it("cycles to next preference and persists on click", () => {
    setStorage("light");
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button", { name: /cambiar tema/i }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("scheme-dark")).toBe(true);
  });
});
