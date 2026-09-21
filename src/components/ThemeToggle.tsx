"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "fixmylife-theme";
type Mode = "dark" | "light";

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("dark");

  // The inline script in layout.tsx already applied the saved theme; read it back.
  useEffect(() => {
    setMode(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    setMode(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 items-center justify-center rounded-full border border-line px-4 text-xs font-medium tracking-wide transition-colors hover:bg-plastic"
    >
      {mode === "dark" ? "Light" : "Dark"}
    </button>
  );
}
