"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "@/lib/cn";
import { THEME_EVENT, THEME_KEY, applyTheme, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "system", label: "Match system theme", Icon: Monitor },
  { value: "dark", label: "Dark theme", Icon: Moon },
];

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "system";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system");

  // Follow the OS while the choice is "system".
  useEffect(() => {
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);

  function choose(next: Theme) {
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="border-border bg-surface inline-flex rounded-md border p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            "text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded transition-colors",
            theme === value && "bg-surface-raised text-foreground shadow-sm",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
