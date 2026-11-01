"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "khotwa-theme";

function preferredTheme(): Theme {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = preferredTheme();
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}>{theme === "dark" ? "☀️ الوضع النهاري" : "🌙 الوضع الليلي"}</button>;
}
