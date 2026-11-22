"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "aegis_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  // Synchronously update HTML root classes in 0ms with zero render delay
  const applyThemeToDOM = (active: "dark" | "light") => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (active === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  };

  useEffect(() => {
    // Read persisted theme or default to system/dark
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || "dark";
    let active: "dark" | "light" = "dark";
    if (stored === "system") {
      active = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      active = stored === "light" ? "light" : "dark";
    }
    applyThemeToDOM(active);
    setThemeState(stored);
    setResolvedTheme(active);
    setMounted(true);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      const currentStored = localStorage.getItem(THEME_STORAGE_KEY);
      if (currentStored === "system") {
        const sysActive = mediaQuery.matches ? "dark" : "light";
        applyThemeToDOM(sysActive);
        setResolvedTheme(sysActive);
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, []);

  // Instant synchronous toggle with zero delay
  const toggleTheme = useCallback(() => {
    const nextTheme: "dark" | "light" = resolvedTheme === "dark" ? "light" : "dark";
    applyThemeToDOM(nextTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {}
    setResolvedTheme(nextTheme);
    setThemeState(nextTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    let active: "dark" | "light" = "dark";
    if (newTheme === "system") {
      active = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      active = newTheme === "light" ? "light" : "dark";
    }
    applyThemeToDOM(active);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
    setResolvedTheme(active);
    setThemeState(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
