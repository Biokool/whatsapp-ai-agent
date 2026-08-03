# Sistema de Estilos Porsche DS v4 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar el sistema de estilos completo del WhatsApp AI Agent Kit a los tokens del Porsche Design System v4 (temas claro/oscuro, tipografía Archivo, iconos lucide, shadcn/ui funcional).

**Architecture:** Tokens CSS con `light-dark()` + clases `.scheme-*` en `<html>`, script inline anti-FOUC en `<head>`, `@theme` de Tailwind 4 mapeando tokens a utilities (`bg-canvas`, `text-primary`, etc.). Fuente Archivo self-hosted con `next/font`. Iconos Material Symbols → `lucide-react`. Sin dependencias nuevas. La lógica de tema es pura (`src/lib/theme.ts`) y testeable.

**Tech Stack:** Tailwind 4 (CSS-first `@theme`), Next.js 16.2.6, React 19, shadcn/ui new-york, lucide-react ^1.27.0, vitest + @testing-library/react (ya instalados), class-variance-authority.

**Rama de trabajo:** `feature/porsche-design-system` (ya existe, basada en `master`, NO incluye Fase 07).

## Global Constraints

- NO añadir dependencias nuevas (lucide-react, CVA, tailwind-merge ya están en `package.json`).
- NO usar el CDN de Porsche; la fuente Porsche Next es propietaria → usar **Archivo**.
- Mantener TODA la lógica/labels en español actuales; solo cambian clases y tags de iconos.
- Mecanismo de tema: script inline + CSS `light-dark()` + clases `.scheme-light`/`.scheme-dark`/`.scheme-light-dark` en `<html>`. Clave localStorage: `biokool-theme`.
- Colores de marca conservados: `ai-green`/`human-blue` como acentos semánticos (burbujas, badges, CTAs, modo IA/HUMANO).
- Foco accesible: `outline: 2px solid #1A44EA` + `outline-offset: 2px`, solo `:focus-visible`.
- Los 7 archivos shadcn/ui son dead code hoy (verificado: 0 imports reales). Se adaptan a tokens Porsche y quedan funcionales, pero la migración de features NO depende de ellos.
- Verificación por tarea: `npm run typecheck` siempre; tests de lógica con `npm test` (vitest). Revisión visual claro/oscuro al final (`npm run dev`).
- Los tests de UI se limitan a la lógica de tema (`src/lib/theme.ts`) y al `ThemeToggle`; los componentes de feature se verifican con typecheck + build (no hay infra de snapshot visual).

---

### Task 1: Tokens Porsche en globals.css + mecanismo de tema

**Files:**

- Modify: `src/app/globals.css` (rewrite completo)
- Modify: `src/app/layout.tsx` (script anti-FOUC + Archivo + quitar Google Fonts/Material Symbols)

**Interfaces:**

- Consumes: nada (base del sistema).
- Produces: tokens `canvas`, `surface`, `surface-hover`, `surface-shade`, `primary`, `text-subtle`, `text-faint`, `border`, `focus`, `backdrop`, familias `info`/`success`/`warning`/`error` (+`-medium`/`-low`/`-frosted`/`-frosted-soft`), acentos `ai-green`/`human-blue` (+`-contrast`); radios `sm/md/lg/xl/2xl/full`; sombras `shadow-sm/md/lg`; easing `--ease-pds`; clases `.scheme-*`; utilidad `.pds-focus`; scrollbars con tokens.

- [ ] **Step 1: Reescribir `src/app/globals.css`**

Reemplazar TODO el contenido con:

```css
@import "tailwindcss";

/* Variables base — emiten a :root para que var(--pds-*) funcione en CSS plano */
:root {
  color-scheme: light dark;

  --pds-canvas: light-dark(#ffffff, hsl(225 66.7% 1.2%));
  --pds-surface: light-dark(hsl(240 10% 95%), hsl(240 2% 10%));
  --pds-surface-hover: light-dark(hsl(240 5% 70% / 0.148), hsl(240 2% 43% / 0.228));
  --pds-surface-shade: light-dark(hsl(234 9.8% 60% / 0.06), hsl(240 3.7% 26.5% / 0.154));
  --pds-primary: light-dark(hsl(225 66.7% 1.2%), hsl(225 100% 99%));
  --pds-text-subtle: light-dark(hsl(240 7.1% 11% / 0.7), hsl(240 12.5% 96.9% / 0.67));
  --pds-text-faint: light-dark(hsl(240 6.1% 7% / 0.6), hsl(240 12.5% 96.9% / 0.56));
  --pds-border: light-dark(hsl(240 5.3% 14.9% / 0.5), hsl(240 12.5% 96.9% / 0.45));
  --pds-focus: #1a44ea;
  --pds-backdrop: hsl(240 5.3% 14.9% / 0.5);

  --pds-info: light-dark(hsl(228 83.2% 51%), hsl(210 100% 54.5%));
  --pds-info-medium: light-dark(hsl(228 83.2% 51% / 0.6), hsl(210 100% 54.5% / 0.6));
  --pds-info-low: light-dark(hsl(228 83.2% 51% / 0.18), hsl(210 100% 54.5% / 0.18));
  --pds-info-frosted: light-dark(hsl(228 83.2% 51% / 0.22), hsl(210 100% 54.5% / 0.22));
  --pds-info-frosted-soft: light-dark(hsl(228 83.2% 51% / 0.12), hsl(210 100% 54.5% / 0.12));

  --pds-success: light-dark(hsl(115 77.5% 27.8%), hsl(157 84.9% 41.6%));
  --pds-success-medium: light-dark(hsl(115 77.5% 27.8% / 0.6), hsl(157 84.9% 41.6% / 0.6));
  --pds-success-low: light-dark(hsl(115 77.5% 27.8% / 0.18), hsl(157 84.9% 41.6% / 0.18));
  --pds-success-frosted: light-dark(hsl(115 77.5% 27.8% / 0.22), hsl(157 84.9% 41.6% / 0.22));
  --pds-success-frosted-soft: light-dark(hsl(115 77.5% 27.8% / 0.12), hsl(157 84.9% 41.6% / 0.12));

  --pds-warning: light-dark(hsl(28 97.7% 34.1%), hsl(28 90.2% 56.1%));
  --pds-warning-medium: light-dark(hsl(28 97.7% 34.1% / 0.6), hsl(28 90.2% 56.1% / 0.6));
  --pds-warning-low: light-dark(hsl(28 97.7% 34.1% / 0.18), hsl(28 90.2% 56.1% / 0.18));
  --pds-warning-frosted: light-dark(hsl(28 97.7% 34.1% / 0.22), hsl(28 90.2% 56.1% / 0.22));
  --pds-warning-frosted-soft: light-dark(hsl(28 97.7% 34.1% / 0.12), hsl(28 90.2% 56.1% / 0.12));

  --pds-error: light-dark(hsl(357 78% 41%), hsl(0 96.9% 62%));
  --pds-error-medium: light-dark(hsl(357 78% 41% / 0.6), hsl(0 96.9% 62% / 0.6));
  --pds-error-low: light-dark(hsl(357 78% 41% / 0.18), hsl(0 96.9% 62% / 0.18));
  --pds-error-frosted: light-dark(hsl(357 78% 41% / 0.22), hsl(0 96.9% 62% / 0.22));
  --pds-error-frosted-soft: light-dark(hsl(357 78% 41% / 0.12), hsl(0 96.9% 62% / 0.12));

  --pds-ai-green: light-dark(#0d9e6e, #10b981);
  --pds-ai-green-contrast: light-dark(#ffffff, #031427);
  --pds-human-blue: light-dark(#3131c0, #6d7dff);
  --pds-human-blue-contrast: light-dark(#ffffff, #0b1c30);
}

html.scheme-light {
  color-scheme: light;
}

html.scheme-dark {
  color-scheme: dark;
}

/* Mapeo a utilities Tailwind. @theme inline NO emite las variables a :root;
   por eso se referencian var(--pds-*) definidas arriba. */
@theme inline {
  --color-canvas: var(--pds-canvas);
  --color-surface: var(--pds-surface);
  --color-surface-hover: var(--pds-surface-hover);
  --color-surface-shade: var(--pds-surface-shade);
  --color-primary: var(--pds-primary);
  --color-text-subtle: var(--pds-text-subtle);
  --color-text-faint: var(--pds-text-faint);
  --color-border: var(--pds-border);
  --color-focus: var(--pds-focus);
  --color-backdrop: var(--pds-backdrop);

  --color-info: var(--pds-info);
  --color-info-medium: var(--pds-info-medium);
  --color-info-low: var(--pds-info-low);
  --color-info-frosted: var(--pds-info-frosted);
  --color-info-frosted-soft: var(--pds-info-frosted-soft);

  --color-success: var(--pds-success);
  --color-success-medium: var(--pds-success-medium);
  --color-success-low: var(--pds-success-low);
  --color-success-frosted: var(--pds-success-frosted);
  --color-success-frosted-soft: var(--pds-success-frosted-soft);

  --color-warning: var(--pds-warning);
  --color-warning-medium: var(--pds-warning-medium);
  --color-warning-low: var(--pds-warning-low);
  --color-warning-frosted: var(--pds-warning-frosted);
  --color-warning-frosted-soft: var(--pds-warning-frosted-soft);

  --color-error: var(--pds-error);
  --color-error-medium: var(--pds-error-medium);
  --color-error-low: var(--pds-error-low);
  --color-error-frosted: var(--pds-error-frosted);
  --color-error-frosted-soft: var(--pds-error-frosted-soft);

  --color-ai-green: var(--pds-ai-green);
  --color-ai-green-contrast: var(--pds-ai-green-contrast);
  --color-human-blue: var(--pds-human-blue);
  --color-human-blue-contrast: var(--pds-human-blue-contrast);

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;

  --font-sans: var(--font-archivo), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-display: var(--font-archivo), system-ui, sans-serif;

  --shadow-sm: 0 3px 8px rgb(0 0 0 / 0.16);
  --shadow-md: 0 4px 16px rgb(0 0 0 / 0.16);
  --shadow-lg: 0 8px 40px rgb(0 0 0 / 0.18);

  --ease-pds: cubic-bezier(0.25, 0.1, 0.25, 1);

  /* shadcn/ui CSS variables (mapeadas a Porsche) */
  --color-background: var(--pds-canvas);
  --color-foreground: var(--pds-primary);
  --color-card: var(--pds-surface);
  --color-card-foreground: var(--pds-primary);
  --color-popover: var(--pds-canvas);
  --color-popover-foreground: var(--pds-primary);
  --color-primary-foreground: var(--pds-canvas);
  --color-secondary: var(--pds-surface);
  --color-secondary-foreground: var(--pds-primary);
  --color-muted: var(--pds-surface-hover);
  --color-muted-foreground: var(--pds-text-subtle);
  --color-accent: var(--pds-surface-hover);
  --color-accent-foreground: var(--pds-primary);
  --color-destructive: var(--pds-error);
  --color-destructive-foreground: #ffffff;
  --color-input: var(--pds-surface-shade);
  --color-ring: var(--pds-focus);
}

html,
body {
  height: 100%;
}

body {
  font-family: var(--font-sans);
  background-color: var(--pds-canvas);
  color: var(--pds-primary);
}

h1,
h2,
h3,
h4 {
  font-family: var(--font-display);
}

/* Foco accesible Porsche */
:focus-visible {
  outline: 2px solid #1a44ea;
  outline-offset: 2px;
}

/* Scrollbars con tokens */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--pds-border);
  border-radius: 9999px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--pds-text-faint);
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

/* Safe area */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Animaciones */
@keyframes pdsFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: pdsFadeIn 0.25s cubic-bezier(0.25, 0.1, 0.25, 1);
}

@layer base {
  * {
    border-color: var(--pds-border);
  }
  body {
    background-color: var(--pds-canvas);
    color: var(--pds-primary);
  }
}
```

> Nota: `--pds-*` se definen en `:root` (sí emiten), `@theme inline` referencia `var(--pds-*)` para las utilities; `light-dark()` se evalúa en runtime según el `color-scheme` heredado del `<html>` (controlado por las clases `.scheme-*`).

- [ ] **Step 2: Reescribir `src/app/layout.tsx`**

Reemplazar TODO el contenido con:

```tsx
import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Biokool - Lead Monitor",
  description: "Panel de control del agente de IA conectado a WhatsApp",
};

const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('biokool-theme');var c='scheme-light-dark';if(s==='light'||s==='dark'){c='scheme-'+s;}var d=document.documentElement;d.classList.add(c);}catch(e){document.documentElement.classList.add('scheme-light-dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={archivo.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

> Elimina los `<link>` de Google Fonts (Geist/Inter/Material Symbols) y la clase `dark` fija.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: 0 errores. Nota: los componentes de feature todavía usan clases `navy-*` (inexistentes tras el rewrite) — Tailwind no falla por clases desconocidas, así que typecheck pasará. La UI se verá parcialmente sin estilos hasta Tasks 4-8.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "style: Porsche DS v4 tokens + theme mechanism (light-dark, .scheme-*)"
```

---

### Task 2: Lógica de tema (`src/lib/theme.ts`) + tests TDD

**Files:**

- Create: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`

**Interfaces:**

- Consumes: nada.
- Produces:
  - `type ThemePreference = "light" | "dark" | "system"`
  - `type ResolvedScheme = "light" | "dark"`
  - `const THEME_STORAGE_KEY = "biokool-theme"`
  - `function getStoredPreference(): ThemePreference` — lee localStorage (fallback "system").
  - `function setStoredPreference(pref: ThemePreference): void`
  - `function resolveScheme(pref: ThemePreference, systemDark: boolean): ResolvedScheme`
  - `function getSystemScheme(): ResolvedScheme` — usa `window.matchMedia("(prefers-color-scheme: dark)")`.
  - `function applySchemeClass(pref: ThemePreference): void` — aplica `scheme-*` a `document.documentElement`.
  - `function useTheme(): { pref, resolved, setPref }` — hook (RE-EXPORT aquí o en `src/hooks/use-theme.ts`; ver Task 3).

- [ ] **Step 1: Escribir el test fallido**

```ts
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
```

- [ ] **Step 2: Run test para verificar que falla**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: FAIL — module `@/lib/theme` no existe.

- [ ] **Step 3: Implementar `src/lib/theme.ts`**

```ts
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
```

- [ ] **Step 4: Run test para verificar que pasa**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts src/lib/theme.test.ts
git commit -m "feat: theme preference logic (light/dark/system) + tests"
```

---

### Task 3: Hook `useTheme` + componente `ThemeToggle`

**Files:**

- Create: `src/hooks/use-theme.ts`
- Create: `src/components/ThemeToggle.tsx`
- Test: `src/components/ThemeToggle.test.tsx`

**Interfaces:**

- Consumes: `src/lib/theme.ts` (Task 2).
- Produces:
  - `useTheme(): { pref: ThemePreference; resolved: ResolvedScheme; setPref(pref): void }` — arranca aplicando la clase del pref almacenado, escucha cambios del sistema, y `setPref` persiste + aplica clase.
  - `ThemeToggle` — botón píldora con iconos lucide `Sun`/`Moon`/`Monitor`, cicla light → dark → system → light, `title` descriptivo en español.

- [ ] **Step 1: Escribir el test fallido para `ThemeToggle`**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ThemeToggle from "./ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function setStorage(value: string | null) {
  const store: Record<string, string> = {};
  if (value !== null) store[THEME_STORAGE_KEY] = value;
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

describe("ThemeToggle", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("window", {
      matchMedia: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn() }),
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
```

- [ ] **Step 2: Run test para verificar que falla**

Run: `npx vitest run src/components/ThemeToggle.test.tsx`
Expected: FAIL — módulos no existen.

- [ ] **Step 3: Implementar `src/hooks/use-theme.ts`**

```ts
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
```

- [ ] **Step 4: Implementar `src/components/ThemeToggle.tsx`**

```tsx
"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const ORDER = ["light", "dark", "system"] as const;
type Pref = (typeof ORDER)[number];

const ICONS: Record<Pref, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<Pref, string> = {
  light: "Tema claro",
  dark: "Tema oscuro",
  system: "Seguir sistema",
};

export default function ThemeToggle() {
  const { pref, setPref } = useTheme();
  const next: Pref = ORDER[(ORDER.indexOf(pref as Pref) + 1) % ORDER.length];
  const Icon = ICONS[pref as Pref];

  return (
    <button
      onClick={() => setPref(next)}
      title={`Tema: ${LABELS[pref as Pref]}. Clic para cambiar.`}
      aria-label="Cambiar tema"
      className="relative inline-flex items-center justify-center h-9 w-9 rounded-full bg-surface-shade text-primary transition-colors duration-300 hover:bg-surface-hover"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/ThemeToggle.test.tsx src/lib/theme.test.ts`
Expected: 13 tests PASS.

- [ ] **Step 6: Typecheck + Commit**

Run: `npm run typecheck`
Expected: 0 errores.

```bash
git add src/hooks/use-theme.ts src/components/ThemeToggle.tsx src/components/ThemeToggle.test.tsx
git commit -m "feat: useTheme hook + ThemeToggle (Sun/Moon/Monitor)"
```

---

### Task 4: shadcn/ui adaptados a Porsche (7 archivos)

**Files:**

- Modify: `src/components/ui/button.tsx` (rewrite)
- Modify: `src/components/ui/input.tsx` (rewrite)
- Modify: `src/components/ui/badge.tsx` (rewrite)
- Modify: `src/components/ui/card.tsx` (tokens)
- Modify: `src/components/ui/dialog.tsx` (tokens + quitar animate-in de tw-animate-css, NO instalado)
- Modify: `src/components/ui/dropdown-menu.tsx` (tokens + quitar animate-in)
- Modify: `src/components/ui/table.tsx` (tokens)

**Interfaces:**

- Consumes: tokens de Task 1.
- Produces: componentes shadcn/ui con variantes Porsche (botones h56/sm h36, radios 12/8, focus #1A44EA, badges píldora, cards radio 24). Sin `tailwindcss-animate` ni clases `animate-in/*`.

- [ ] **Step 1: Reescribir `src/components/ui/button.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors duration-300 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus rounded-lg",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-canvas shadow-sm hover:bg-muted hover:text-accent-foreground",
        ghost: "hover:bg-muted hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-14 px-7 text-base",
        sm: "h-9 px-4 text-sm",
        lg: "h-14 px-9 text-lg",
        icon: "h-14 w-14 rounded-full",
        "icon-sm": "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 2: Reescribir `src/components/ui/input.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-14 w-full rounded-lg border border-border bg-surface-shade px-4 py-2 text-base text-primary placeholder:text-text-faint transition-colors duration-300 focus-visible:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 3: Reescribir `src/components/ui/badge.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-success text-white",
        info: "border-transparent bg-info text-white",
        warning: "border-transparent bg-warning text-white",
        error: "border-transparent bg-error text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

- [ ] **Step 4: Reescribir `src/components/ui/card.tsx`**

Solo cambiar las clases base (resto igual):

```tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
);
```

Cambiar en el resto: `CardTitle` → `text-xl font-semibold tracking-tight`; `CardContent` → `p-6 pt-0` (igual); sin cambios en Header/Footer/Description salvo `text-muted-foreground` (ya usa token).

- [ ] **Step 5: Reescribir `src/components/ui/dialog.tsx`**

Cambiar las clases (quitar `animate-in`/`animate-out` de tw-animate-css; usar `transition` simple):

- `DialogOverlay`: `"fixed inset-0 z-50 bg-backdrop backdrop-blur-sm"`.
- `DialogContent`: `"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-canvas p-6 shadow-lg rounded-2xl"`.
- `DialogTitle`: `"text-xl font-semibold leading-none tracking-tight"`.
- Resto: tokens `ring-ring`, `bg-muted` ya válidos.

- [ ] **Step 6: Reescribir `src/components/ui/dropdown-menu.tsx`**

Reemplazar en `DropdownMenuContent` y `DropdownMenuSubContent` las clases de animación por: `"z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"`. Resto igual.

- [ ] **Step 7: Reescribir `src/components/ui/table.tsx`**

- `TableHead`: `text-muted-foreground` (ya válido).
- `TableRow`: `hover:bg-muted/50` (ya válido).
- Sin cambios funcionales; solo confirmar que las clases usan tokens existentes (lo hacen). No requiere edición salvo opcional: `border-b border-border`.

- [ ] **Step 8: Typecheck + Commit**

Run: `npm run typecheck`
Expected: 0 errores.

```bash
git add src/components/ui/
git commit -m "style: adapt shadcn/ui to Porsche DS tokens (dead-code components)"
```

---

### Task 5: Sidebar + DashboardHeader + Dashboard

**Files:**

- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/DashboardHeader.tsx`
- Modify: `src/components/Dashboard.tsx`

**Interfaces:**

- Consumes: tokens Task 1, `ThemeToggle` Task 3 (DashboardHeader).
- Produces: navegación con iconos lucide; header con `ThemeToggle` integrado.

**Icon mapping (Sidebar/Dashboard):**

| Material     | lucide           |
| ------------ | ---------------- |
| `chat`       | `MessagesSquare` |
| `insights`   | `BarChart3`      |
| `filter_alt` | `Filter`         |
| `school`     | `GraduationCap`  |
| `settings`   | `Settings`       |

- [ ] **Step 1: Reescribir `src/components/Sidebar.tsx`**

```tsx
"use client";

import { MessagesSquare, BarChart3, Filter, GraduationCap, Settings } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  humanRequiredCount: number;
}

const NAV = [
  { tab: "chats", label: "Chats", Icon: MessagesSquare },
  { tab: "analytics", label: "Analisis", Icon: BarChart3 },
  { tab: "funnel", label: "Embudo", Icon: Filter },
  { tab: "knowledge", label: "Knowledge", Icon: GraduationCap },
] as const;

export default function Sidebar({ activeTab, onSelectTab, humanRequiredCount }: SidebarProps) {
  return (
    <nav className="hidden md:flex bg-surface text-primary h-screen w-20 flex-col items-center py-6 border-r border-border fixed left-0 top-0 z-50">
      <div
        onClick={() => onSelectTab("chats")}
        className="mb-8 cursor-pointer flex flex-col items-center group"
        title="Biokool Dashboard"
      >
        <span className="font-display text-2xl font-extrabold text-ai-green tracking-tight group-hover:scale-105 transition-transform">
          BK
        </span>
        <span className="text-[9px] uppercase tracking-widest text-text-subtle font-bold mt-0.5">
          Biokool
        </span>
      </div>

      <div className="flex flex-col gap-5 w-full px-2 mt-2">
        {NAV.map(({ tab, label, Icon }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onSelectTab(tab)}
              className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all ${
                active
                  ? "text-ai-green font-bold border-r-2 border-ai-green bg-surface-hover"
                  : "text-text-subtle hover:bg-surface-hover hover:text-ai-green"
              }`}
              title={label}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] mt-1 font-medium">{label}</span>
              {tab === "chats" && humanRequiredCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-warning rounded-full animate-pulse" />
              )}
            </button>
          );
        })}

        <button
          onClick={() => onSelectTab("settings")}
          className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all mt-auto ${
            activeTab === "settings"
              ? "text-ai-green font-bold border-r-2 border-ai-green bg-surface-hover"
              : "text-text-subtle hover:bg-surface-hover hover:text-ai-green"
          }`}
          title="Configuracion"
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] mt-1 font-medium">Ajustes</span>
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Reescribir `src/components/DashboardHeader.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Search, Bell, User, X } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface DashboardHeaderProps {
  phone: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function DashboardHeader({
  phone,
  searchQuery,
  onSearchChange,
}: DashboardHeaderProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    const confirmed = confirm(
      "Seguro que quieres desconectar? Tendras que escanear el QR otra vez."
    );
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      await fetch("/api/connection/disconnect", { method: "POST" });
      window.location.reload();
    } catch {
      setDisconnecting(false);
      alert("Error al desconectar. Intentalo de nuevo.");
    }
  }

  return (
    <header className="bg-surface font-display flex justify-between items-center w-full px-3 md:px-8 h-12 md:h-16 border-b border-border backdrop-blur-md z-40 shrink-0">
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        <h1 className="font-display text-base md:text-2xl font-bold text-ai-green flex items-center gap-2 truncate">
          Lead Monitor
          <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-low text-success border border-success/40">
            WhatsApp Live
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar leads..."
            className="bg-surface-shade border border-border text-sm text-primary placeholder-text-faint rounded-full py-1.5 pl-9 pr-4 focus:outline-none focus:border-focus w-40 lg:w-52 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle hover:text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 border-l border-border pl-2 md:pl-3">
          <button
            className="relative text-text-subtle hover:text-ai-green transition-colors p-1 md:p-1.5 rounded-lg hover:bg-surface-hover"
            title="Notificaciones"
          >
            <Bell className="w-[18px] h-[18px] md:w-[22px] md:h-[22px]" />
            <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-ai-green rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-surface-hover border border-border flex items-center justify-center ring-2 ring-ai-green/30">
            <User className="text-ai-green w-3.5 h-3.5 md:w-4 md:h-4" />
          </div>
          {phone && (
            <div className="hidden lg:block">
              <div className="text-xs font-medium text-primary">Agente</div>
              <div className="text-[10px] text-text-subtle font-mono">+{phone}</div>
            </div>
          )}
        </div>

        <ThemeToggle />

        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-surface-hover hover:bg-muted text-text-subtle transition-colors disabled:opacity-50 border border-border"
        >
          {disconnecting ? "..." : "Desconectar"}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Reescribir `src/components/Dashboard.tsx`**

Cambios: fondo `bg-canvas`; `md:ml-20` se mantiene; nav móvil con iconos lucide y tokens. Reemplazar cada `<span className="material-symbols-outlined ...">icon</span>` por `<Icon className="w-5 h-5" />` con el mapping de la tabla de arriba, y clases de color:

- `bg-navy-950` → `bg-canvas`
- `bg-navy-900` → `bg-surface`
- `border-navy-500` → `border-border`
- `text-navy-400` → `text-text-subtle`
- `text-ai-green-light` → `text-ai-green`
- `bg-amber-warm` → `bg-warning`

El `nav` móvil:

```tsx
<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 px-2 py-1.5 safe-area-bottom">
  <div className="flex justify-around items-center">
    <button
      onClick={() => {
        setActiveTab("chats");
        setSelectedId(null);
      }}
      className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
        activeTab === "chats" ? "text-ai-green" : "text-text-subtle"
      }`}
    >
      <MessagesSquare className="w-5 h-5" />
      <span className="text-[9px] font-medium">Chats</span>
    </button>
    {/* analitycs: BarChart3, funnel: Filter (+dot warning), knowledge: GraduationCap, settings: Settings */}
  </div>
</nav>
```

Mantener la lógica de `showConversationList` y tabs intacta. Importar los 5 iconos lucide.

- [ ] **Step 4: Typecheck + Commit**

Run: `npm run typecheck`
Expected: 0 errores.

```bash
git add src/components/Sidebar.tsx src/components/DashboardHeader.tsx src/components/Dashboard.tsx
git commit -m "style: migrate Sidebar/DashboardHeader/Dashboard to Porsche tokens + lucide + ThemeToggle"
```

---

### Task 6: ConversationList + ConversationPanel + MessageBubble + ModeToggle

**Files:**

- Modify: `src/components/ConversationList.tsx`
- Modify: `src/components/ConversationPanel.tsx`
- Modify: `src/components/MessageBubble.tsx`
- Modify: `src/components/ModeToggle.tsx`

**Interfaces:**

- Consumes: tokens Task 1.
- Produces: lista y detalle de conversaciones con tema claro/oscuro funcional.

- [ ] **Step 1: Reescribir `src/components/ModeToggle.tsx`**

```tsx
"use client";

import { Bot, User } from "lucide-react";

interface ModeToggleProps {
  mode: "AI" | "HUMAN";
  onChange: (mode: "AI" | "HUMAN") => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center bg-surface-shade rounded-full p-0.5 border border-border">
      <button
        onClick={() => onChange("AI")}
        className={`px-2 md:px-3.5 py-1 rounded-full font-display text-[10px] md:text-xs font-bold flex items-center gap-1 transition-all ${
          mode === "AI"
            ? "bg-ai-green text-ai-green-contrast shadow-sm"
            : "text-text-subtle hover:text-primary"
        }`}
      >
        <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span className="hidden sm:inline">IA</span>
      </button>
      <button
        onClick={() => onChange("HUMAN")}
        className={`px-2 md:px-3.5 py-1 rounded-full font-display text-[10px] md:text-xs font-bold flex items-center gap-1 transition-all ${
          mode === "HUMAN"
            ? "bg-human-blue text-human-blue-contrast shadow-sm"
            : "text-text-subtle hover:text-primary"
        }`}
      >
        <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span className="hidden sm:inline">Humano</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Reescribir `src/components/MessageBubble.tsx`**

Sustituciones clave (mantener estructura):

- Burbuja user: `bg-surface-hover border-border text-primary`, avatar `User` icon, `text-text-subtle` timestamp.
- Burbuja AI: avatar `bg-ai-green` + `Bot` icon `text-ai-green-contrast`; contenedor `bg-ai-green-low border-ai-green/40 text-primary`; timestamp `text-ai-green`.
- Burbuja human: avatar `bg-human-blue` + `Headphones` icon `text-human-blue-contrast`; contenedor `bg-human-blue-low border-human-blue/50 text-primary`; timestamp `text-human-blue`.

Importar: `import { User, Bot, Headphones } from "lucide-react";`

Mantener `formatTime` y el layout `self-end flex-row-reverse` / `self-start` original. (El color `bg-ai-green` como fondo con icono de contraste da legibilidad en ambos temas.)

- [ ] **Step 3: Reescribir `src/components/ConversationList.tsx`**

Sustituciones:

- `bg-navy-800` → `bg-surface`; `border-navy-500` → `border-border`; `bg-navy-600` → `bg-surface-hover`.
- `text-navy-200` → `text-primary`; `text-navy-300` → `text-text-subtle`; `text-navy-400` → `text-text-faint`.
- `bg-navy-700` → `bg-surface-hover`; `hover:bg-navy-600` → `hover:bg-surface-shade`.
- `text-ai-green-light` → `text-ai-green`; `bg-ai-green-light` → `bg-ai-green`.
- `bg-amber-warm` → `bg-warning`.
- Modo badge AI: `bg-ai-green-low text-ai-green`; HUMAN: `bg-human-blue text-human-blue-contrast`.
- Icono vacío `chat_error` → `MessageCircleOff` de lucide (`w-8 h-8 mx-auto mb-2 text-text-faint`).
- Barra seleccionada `w-1 bg-ai-green`.

Mantener `formatRelative` y toda la lógica de filtrado intacta.

- [ ] **Step 4: Reescribir `src/components/ConversationPanel.tsx`**

Sustituciones:

- Contenedor: `bg-canvas`.
- Header: `bg-surface/80 backdrop-blur-sm border-b border-border`.
- `text-navy-200` → `text-primary`; `text-navy-300` → `text-text-subtle`; `text-navy-400` → `text-text-faint`.
- `bg-navy-600` → `bg-surface-hover`; `bg-navy-800/95` → `bg-surface/95`.
- `text-ai-green-light` → `text-ai-green`; `bg-ai-green-light` → `bg-ai-green`; `focus:border-ai-green-light` → `focus:border-focus`.
- `bg-amber-warm` → `bg-warning`.
- `text-red-alert` → `text-error`; `hover:bg-red-dark/20` → `hover:bg-error-low`.
- Botón borrar: icono `Trash2` (`w-4 h-4 md:w-[18px] md:h-[18px]`), label "Borrar".
- Botón back: `ArrowLeft`.
- Botón enviar: `bg-ai-green hover:bg-ai-green/85 text-ai-green-contrast`, icono `Send`.
- Textarea: `bg-surface-shade border-border focus:border-focus text-primary placeholder-text-faint`.
- Input composición: mantener `rows={2}` y handlers.

Importar: `import { ArrowLeft, Trash2, Send } from "lucide-react";`

- [ ] **Step 5: Typecheck + Commit**

Run: `npm run typecheck`
Expected: 0 errores.

```bash
git add src/components/ConversationList.tsx src/components/ConversationPanel.tsx src/components/MessageBubble.tsx src/components/ModeToggle.tsx
git commit -m "style: migrate conversation UI + ModeToggle to Porsche tokens + lucide"
```

---

### Task 7: QRScreen + ConnectionGate

**Files:**

- Modify: `src/components/QRScreen.tsx`
- Modify: `src/components/ConnectionGate.tsx` (sin cambios reales; solo verificar)

**Interfaces:**

- Consumes: tokens Task 1.
- Produces: pantalla de conexión QR con tema claro/oscuro.

- [ ] **Step 1: Reescribir `src/components/QRScreen.tsx`**

Sustituciones:

- `bg-neutral-900` → `bg-surface`; `border-neutral-800` → `border-border`; `rounded-2xl` se mantiene.
- `text-neutral-200` → `text-primary`; `text-neutral-400` → `text-text-subtle`; `text-neutral-500` → `text-text-faint`; `text-neutral-600` → `text-text-faint`.
- Spinner: `border-border` con `border-t-ai-green`.
- Aviso caducado: `bg-warning-low border-warning/50 text-warning`.
- Botón reset: `bg-success hover:bg-success/85 text-white`.
- `bg-neutral-950` → `bg-canvas`.
- En `main`, fondo `bg-canvas`.

No hay iconos Material Symbols aquí. Sin cambios en ConnectionGate.

- [ ] **Step 2: Typecheck + Commit**

Run: `npm run typecheck`
Expected: 0 errores.

```bash
git add src/components/QRScreen.tsx
git commit -m "style: migrate QR connection screen to Porsche tokens"
```

---

### Task 8: Knowledge area (N8nSettings, KnowledgeSection, KnowledgeBaseCard, DocumentList, UploadZone)

**Files:**

- Modify: `src/components/N8nSettings.tsx`
- Modify: `src/components/KnowledgeSection.tsx`
- Modify: `src/components/KnowledgeBaseCard.tsx`
- Modify: `src/components/DocumentList.tsx`
- Modify: `src/components/UploadZone.tsx`

**Interfaces:**

- Consumes: tokens Task 1.
- Produces: área de Knowledge Base con temas claro/oscuro.

- [ ] **Step 1: Reescribir `src/components/N8nSettings.tsx`**

Sustituciones:

- `text-navy-200` → `text-primary`; `text-navy-300` → `text-text-subtle`; `text-navy-400` → `text-text-faint`; `text-navy-500` → `text-text-faint`.
- `bg-navy-900` → `bg-surface-shade`; `border-navy-500` → `border-border`; `bg-navy-700` → `bg-surface-hover`; `border-navy-600` → `border-border`.
- `bg-ai-green/20 text-ai-green-light` → `bg-success-low text-success`.
- `text-ai-green-light` → `text-ai-green`; `focus:border-ai-green-light` → `focus:border-focus`.
- Botón Guardar: `bg-ai-green hover:bg-ai-green/85 text-ai-green-contrast`.
- Botón Desconectar: `text-error hover:bg-error-low`.
- `text-red-alert` → `text-error`.

- [ ] **Step 2: Reescribir `src/components/KnowledgeSection.tsx`**

Sustituciones:

- `bg-navy-700` → `bg-surface`; `border-navy-500` → `border-border`.
- `text-navy-200` → `text-primary`; `text-navy-400` → `text-text-faint`; `text-navy-500` → `text-text-faint`.
- `bg-navy-600` → `bg-surface-hover`; `bg-navy-700 text-navy-400 hover:text-navy-200` → `bg-surface-hover text-text-subtle hover:text-primary`.
- Botón "+ Nuevo": `bg-ai-green hover:bg-ai-green/85 text-ai-green-contrast`.
- Iconos `school` → `GraduationCap` (lucide), `settings` → `Settings`. En el título: `<GraduationCap className="w-5 h-5 text-ai-green" />`. En vacío: `<GraduationCap className="w-10 h-10 mb-2 text-text-faint mx-auto" />`.
- Inputs: `bg-surface-shade border-border focus:border-focus`.
- `font-geist` → `font-display`.

- [ ] **Step 3: Reescribir `src/components/KnowledgeBaseCard.tsx`**

Sustituciones:

- Seleccionado: `border-ai-green bg-surface`; no: `border-border bg-surface hover:border-text-subtle`.
- `text-navy-200` → `text-primary`; `text-navy-300` → `text-text-subtle`; `text-navy-400` → `text-text-faint`.
- `border-navy-600` → `border-border`.
- Botón borrar: `text-text-faint hover:text-error`, icono `Trash2`.

- [ ] **Step 4: Reescribir `src/components/DocumentList.tsx`**

Sustituciones:

- `bg-ai-green/20 text-ai-green-light` → `bg-success-low text-success`.
- `bg-amber-warm/20 text-amber-warm` → `bg-warning-low text-warning`.
- `bg-navy-600 text-navy-300` → `bg-surface-hover text-text-subtle`.
- `bg-red-dark/20 text-red-alert` → `bg-error-low text-error`.
- `bg-navy-700` → `bg-surface`; `text-navy-400` → `text-text-faint`; `text-navy-200` → `text-primary`.
- Iconos `description` → `FileText`, `delete` → `Trash2`.

- [ ] **Step 5: Reescribir `src/components/UploadZone.tsx`**

Sustituciones:

- `border-navy-500 hover:border-navy-400 hover:bg-navy-700/50` → `border-border hover:border-text-subtle hover:bg-surface-shade`.
- Dragging: `border-ai-green bg-ai-green-low`.
- `text-navy-400` → `text-text-faint`; `text-navy-300` → `text-text-subtle`.
- Icono: `UploadCloud` / `Hourglass` de lucide (`w-8 h-8 mb-2 text-text-faint`).
- Botón URL: `text-ai-green hover:text-ai-green`.
- Input URL: `bg-surface-shade border-border focus:border-focus`.
- Botón "Agregar": `bg-ai-green hover:bg-ai-green/85 text-ai-green-contrast`.

- [ ] **Step 6: Typecheck + Commit**

Run: `npm run typecheck`
Expected: 0 errores.

```bash
git add src/components/N8nSettings.tsx src/components/KnowledgeSection.tsx src/components/KnowledgeBaseCard.tsx src/components/DocumentList.tsx src/components/UploadZone.tsx
git commit -m "style: migrate Knowledge Base area to Porsche tokens + lucide"
```

---

### Task 9: Docs area (DocsSidebar, MarkdownRenderer, docs/page.tsx)

**Files:**

- Modify: `src/components/DocsSidebar.tsx`
- Modify: `src/components/MarkdownRenderer.tsx`
- Modify: `src/app/docs/page.tsx`

**Interfaces:**

- Consumes: tokens Task 1.
- Produces: centro de documentación con temas claro/oscuro.

- [ ] **Step 1: Reescribir `src/components/DocsSidebar.tsx`**

Sustituciones:

- `text-navy-300` → `text-text-subtle`; `text-navy-200` → `text-primary`; `text-navy-400` → `text-text-faint`.
- `bg-navy-700 hover:text-navy-200` → `bg-surface-hover hover:text-primary`.
- `bg-ai-green/10 text-ai-green-light border border-ai-green/30` → `bg-ai-green-low text-ai-green border border-ai-green/30`.
- `bg-navy-900 border-r border-navy-500` → `bg-surface border-r border-border`.
- `bg-navy-700 text-navy-200` (botón toggle) → `bg-surface-hover text-primary`.
- Iconos Material → lucide, usando el mapa `getIcon` convertido a componente. Simplificar: crear función que devuelve el icono:

```tsx
import {
  Folder,
  Download,
  MessagesSquare,
  Pencil,
  Wrench,
  ShieldCheck,
  CloudUpload,
  Bug,
  Smartphone,
  GitBranch,
  Map,
  History,
  Shield,
  BadgeCheck,
  FileText,
  X,
  Menu,
  BookOpen,
  Home,
  type LucideIcon,
} from "lucide-react";

function getIcon(name: string, isDir: boolean): LucideIcon {
  if (isDir) return Folder;
  if (name.startsWith("01-")) return Download;
  if (name.startsWith("02-")) return MessagesSquare;
  if (name.startsWith("03-")) return Pencil;
  if (name.startsWith("04-")) return Wrench;
  if (name.startsWith("05-")) return ShieldCheck;
  if (name.startsWith("06-")) return CloudUpload;
  if (name.startsWith("07-")) return Bug;
  if (name.startsWith("08-")) return Smartphone;
  if (name.includes("architecture")) return GitBranch;
  if (name.includes("roadmap")) return Map;
  if (name.includes("changelog")) return History;
  if (name.includes("security")) return Shield;
  if (name.includes("testing")) return BadgeCheck;
  if (name.includes("admin")) return ShieldCheck;
  return FileText;
}
```

Uso: `<Icon className="w-[18px] h-[18px] shrink-0" />` y en TreeItem directory `<Folder className="w-4 h-4" />`. Toggle: `{isOpen ? <X .../> : <Menu .../>}`. Header logo: `BookOpen`. Home: `Home`.

- [ ] **Step 2: Reescribir `src/components/MarkdownRenderer.tsx`**

Sustituciones de clases:

- `text-navy-200` → `text-primary`; `text-navy-200/90` → `text-primary`; `text-navy-200/80` → `text-primary/80`.
- `border-navy-500` → `border-border`; `border-navy-500/50` → `border-border`.
- `text-ai-green-light hover:text-ai-green` → `text-ai-green hover:text-ai-green`.
- `bg-navy-700 text-ai-green-light` (code inline) → `bg-surface-hover text-ai-green`.
- `bg-navy-900 border-navy-500` (pre) → `bg-surface border-border`.
- `border-ai-green/40 bg-ai-green/5` (blockquote) → `border-ai-green/40 bg-ai-green-low`.
- `bg-navy-700` (thead) → `bg-surface-hover`; `divide-navy-500/50` → `divide-border`; `hover:bg-navy-800/50` → `hover:bg-surface-shade`; `text-navy-300` → `text-text-subtle`.
- `font-geist` → `font-display`.

- [ ] **Step 3: Reescribir `src/app/docs/page.tsx`**

Sustituciones:

- `bg-navy-950` → `bg-canvas`; `bg-navy-800 border-navy-500` → `bg-surface border-border`.
- `text-navy-200` → `text-primary`; `text-navy-300` → `text-text-subtle`; `text-navy-400` → `text-text-faint`.
- `hover:text-ai-green-light` → `hover:text-ai-green`; `text-ai-green-light` → `text-ai-green`.
- Iconos: `arrow_back` → `ArrowLeft`, `schedule` → `Clock`, `hourglass_empty` → `Loader2` (con `animate-spin`).
- Importar de lucide: `ArrowLeft, Clock, Loader2`.

- [ ] **Step 4: Typecheck + Commit**

Run: `npm run typecheck`
Expected: 0 errores.

```bash
git add src/components/DocsSidebar.tsx src/components/MarkdownRenderer.tsx src/app/docs/page.tsx
git commit -m "style: migrate docs area to Porsche tokens + lucide"
```

---

### Task 10: Verificación final

**Files:**

- Ninguno (validación).

- [ ] **Step 1: Run full suite de validación**

```bash
npm run typecheck
npm test
npm run lint
```

Expected: typecheck 0 errores, todos los tests PASS (incluidos los nuevos: 9 tests en `theme.test.ts` + 3 en `ThemeToggle.test.tsx`), lint sin errores nuevos.

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: build exitoso. Verifica que `next/font` Archivo se descarga/self-host correctamente (requiere red en build).

- [ ] **Step 3: Verificación de no-regresión de iconos**

Run: `rg -c "material-symbols-outlined" src` (o grep)
Expected: 0 ocurrencias en `src/` (se eliminaron todos los iconos Material Symbols de la app; solo quedan las definiciones CSS si se conservaron — deben eliminarse en Task 1).

- [ ] **Step 4: Revisión visual manual (humano)**

Run: `npm run dev`, abrir `/` y `/docs`.
Expected: ambos temas funcionan (toggle en header), contraste OK, foco azul `#1A44EA` visible en tabulación, layout intacto en escritorio y móvil.

- [ ] **Step 5: Commit final del estado + actualizar docs**

```bash
git add -A
git commit -m "docs: update project state and checkpoint for Porsche DS v4 styling"
```

Actualizar `AI-BOS-STATE.md` con el estado de la migración de estilos (fecha, rama, alcance completado, suite 76+12 tests).

---

## Self-Review

**1. Spec coverage:**

- Tokens de color light-dark → Task 1 ✓ (tabla completa del spec: canvas/surface/primary/text/border/focus/backdrop + familias semánticas + acentos marca)
- Tipografía Archivo + next/font → Task 1 ✓ (layout `Archivo` de `next/font/google`)
- Control de tema manual+sistema, localStorage `biokool-theme` → Task 2-3 ✓
- Script inline anti-FOUC + light-dark + `.scheme-*` → Task 1 ✓ (script en layout, clases en globals)
- Acentos de marca conservados (ai-green/human-blue) → Task 6-7 ✓
- Iconos lucide → Tasks 5-9 ✓
- Radios/sombras/foco/spacing/motion → Task 1 (@theme) + Task 4 (botones/inputs) ✓
- shadcn/ui adaptados y funcionales → Task 4 ✓
- Migración de TODOS los componentes de feature (16) → Tasks 5-9 ✓ (Sidebar, DashboardHeader, Dashboard, ConversationList, ConversationPanel, MessageBubble, ModeToggle, QRScreen, N8nSettings, KnowledgeSection, KnowledgeBaseCard, DocumentList, UploadZone, DocsSidebar, MarkdownRenderer + docs/page + layout)
- Verificación → Task 10 ✓ (typecheck, tests, lint, build, revisión visual)

**2. Placeholder scan:** Todos los archivos tienen contenido de código completo; ninguna instrucción "similar a", "añade validación", "TBD". Las sustituciones por componente especifican mapeos token→token e icono→icono exactos.

**3. Type consistency:** `ThemePreference`/`ResolvedScheme`/`THEME_STORAGE_KEY`/`getStoredPreference`/`setStoredPreference`/`resolveScheme`/`getSystemScheme`/`applySchemeClass` definidos en Task 2 y usados en Task 3 con los mismos nombres. `useTheme` producido en Task 3 y consumido por `ThemeToggle` en la misma tarea, e integrado vía `ThemeToggle` en DashboardHeader (Task 5). Tokens (`bg-canvas`, `bg-surface`, `text-primary`, `border-border`, `bg-ai-green`, `bg-human-blue`, `text-error`, `bg-warning`, `focus:border-focus`, `focus-visible:outline-focus`) definidos en Task 1 y usados consistentemente en Tasks 4-9. Clave localStorage `biokool-theme` idéntica en Tasks 1-3.
