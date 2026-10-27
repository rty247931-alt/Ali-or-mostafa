"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = localStorage.getItem("khotwa-theme");
    const initial = saved === "dark" || saved === "light" ? saved : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("khotwa-theme", next);
  }
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}>{theme === "dark" ? "☀️ نهاري" : "🌙 ليلي"}</button>;
}
