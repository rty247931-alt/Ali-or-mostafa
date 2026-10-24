"use client";

import { useEffect, useState } from "react";

export default function ThemeModeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = window.localStorage.getItem("store-theme-mode");
    const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.documentElement.classList.toggle("light-mode", !isDark);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark-mode", next);
    document.documentElement.classList.toggle("light-mode", !next);
    window.localStorage.setItem("store-theme-mode", next ? "dark" : "light");
  }
  return <button type="button" onClick={toggle} aria-label={dark ? "تفعيل وضع النهار" : "تفعيل وضع الليل"} title={dark ? "وضع النهار" : "وضع الليل"}
    className="rounded-full border border-current px-3 py-1 text-lg font-bold">{dark ? "☀️" : "🌙"}</button>;
}
