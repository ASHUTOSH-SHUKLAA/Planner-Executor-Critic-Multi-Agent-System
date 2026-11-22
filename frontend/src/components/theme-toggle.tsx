"use client";

import React from "react";
import { useTheme } from "@/lib/theme-context";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={
        className
          ? `relative inline-flex items-center justify-center transition-colors cursor-pointer ${className}`
          : "relative inline-flex items-center justify-center h-9 w-9 rounded-lg border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff]/70 dark:bg-[#1b2438]/80 text-[#1b2235] dark:text-[#ffffff] hover:bg-[#eef1f8] dark:hover:bg-[#1b2235] transition-colors shadow-sm cursor-pointer"
      }
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
      ) : (
        <Moon className="h-4 w-4 text-[#6259b5] dark:text-[#c6c2fa] hover:-rotate-12 transition-transform" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
