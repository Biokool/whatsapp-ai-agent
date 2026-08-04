"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const active: Pref = (pref as Pref) || "system";
  const shown: Pref = mounted ? active : "system";
  const next: Pref = ORDER[(ORDER.indexOf(active) + 1) % ORDER.length];
  const Icon = ICONS[shown];

  return (
    <button
      onClick={() => setPref(next)}
      title={`Tema: ${LABELS[shown]}. Clic para cambiar.`}
      aria-label="Cambiar tema"
      className="relative inline-flex items-center justify-center h-9 w-9 rounded-full bg-surface-shade text-primary transition-colors duration-300 hover:bg-surface-hover"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
