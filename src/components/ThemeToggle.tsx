"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function themeForLocalTime(): Theme {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const apply = (next: Theme) => {
      setTheme(next);
      document.documentElement.dataset.theme = next;
    };
    apply(themeForLocalTime());
    const timer = window.setInterval(() => {
      const next = themeForLocalTime();
      if (document.documentElement.dataset.theme !== next) apply(next);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }
  return <button type="button" className="theme-toggle" onClick={toggle} aria-label={theme === "dark" ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي"}>{theme === "dark" ? "☀️ نهاري" : "🌙 ليلي"}</button>;
}
