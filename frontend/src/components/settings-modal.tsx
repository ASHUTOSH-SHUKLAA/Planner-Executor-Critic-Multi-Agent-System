"use client";

import React, { useState } from "react";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import {
  X,
  Sliders,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Cpu,
  Shield,
  Layers,
  Sparkles,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { success } = useToast();

  const [strictness, setStrictness] = useState<"standard" | "strict">("standard");
  const [telemetryVerbosity, setTelemetryVerbosity] = useState<"standard" | "detailed">("detailed");

  if (!isOpen) return null;

  const handleSave = () => {
    success("Execution and display preferences saved", "Settings Updated");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Studio Configuration</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Customize agent engine thresholds and workspace appearance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="py-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Theme Option */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              Appearance & Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  theme === "light"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 ring-1 ring-indigo-500"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  theme === "dark"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 ring-1 ring-indigo-500"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  theme === "system"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 ring-1 ring-indigo-500"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                <Laptop className="h-4 w-4 text-zinc-400" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Critic Gating Strictness */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-purple-500" />
                <span>Critic Quality Thresholds</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setStrictness("standard")}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  strictness === "standard"
                    ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 ring-1 ring-indigo-500"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Standard Gating</span>
                  {strictness === "standard" && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Correctness &ge; 0.85, Completeness &ge; 0.80, Relevance &ge; 0.85. Balanced for high throughput.
                </p>
              </div>

              <div
                onClick={() => setStrictness("strict")}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  strictness === "strict"
                    ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 ring-1 ring-indigo-500"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">High Precision</span>
                  {strictness === "strict" && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Correctness &ge; 0.90, Completeness &ge; 0.88, Relevance &ge; 0.90. Maximizes rigorous auditing.
                </p>
              </div>
            </div>
          </div>

          {/* Model Status Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3.5 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-500" />
                <span>Active Google Gemini Engine</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
            <div className="space-y-1.5 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
              <div className="flex justify-between">
                <span>Primary Agent Model:</span>
                <strong className="text-zinc-900 dark:text-zinc-200">gemini-flash-lite-latest</strong>
              </div>
              <div className="flex justify-between">
                <span>Failover Cascade:</span>
                <strong className="text-zinc-900 dark:text-zinc-200">gemini-3.5-flash-lite / 3.6-flash</strong>
              </div>
              <div className="flex justify-between">
                <span>Live Grounding Tool:</span>
                <strong className="text-zinc-900 dark:text-zinc-200">DuckDuckGo Web Search</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
