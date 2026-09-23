"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsModal } from "@/components/settings-modal";
import {
  Bot,
  Sparkles,
  LogOut,
  ArrowRight,
  LayoutDashboard,
  Sliders,
} from "lucide-react";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                  AegisAgent
                </span>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  Triad Engine
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 -mt-0.5">
                Planner • Executor • Critic
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="/#triad" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Triad System
            </Link>
            <Link href="/#architecture" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Architecture
            </Link>
            <Link href="/#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/#benchmarks" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
              Benchmarks
            </Link>
            <Link
              href="https://github.com/ASHUTOSH-SHUKLAA/Planner-Executor-Critic-Multi-Agent-System"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>GitHub</span>
            </Link>
          </nav>

          {/* Right Action Group: Theme Toggle, Settings & Auth */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Studio Settings"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <Sliders className="h-4 w-4" />
            </button>

            {/* Auth CTA Actions */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-1">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Studio</span>
                </Link>
                <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                    @{user.username}
                  </span>
                  <button
                    onClick={logout}
                    title="Sign out"
                    className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-900 dark:bg-white px-3.5 py-2 text-xs font-semibold text-white dark:text-zinc-950 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  <span>Launch</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
