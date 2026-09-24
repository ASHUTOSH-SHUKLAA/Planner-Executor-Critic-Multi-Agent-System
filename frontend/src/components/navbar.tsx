"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsModal } from "@/components/settings-modal";
import {
  Bot,
  LogOut,
  ArrowRight,
  LayoutDashboard,
  History,
  ShieldCheck,
  Sliders,
} from "lucide-react";

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
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
                  TriadFlow
                </span>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  AI Research
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 -mt-0.5">
                Planner • Executor • Critic
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-indigo-500" />
                  <span>Workspace</span>
                </Link>
                <Link
                  href="/history"
                  className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <History className="h-4 w-4 text-emerald-500" />
                  <span>History</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-semibold"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/#triad" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                  Multi-Agent Triad
                </Link>
                <Link href="/#architecture" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                  Architecture
                </Link>
                <Link href="/#features" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                  Features
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Group: Theme Toggle, Settings & Auth */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Studio Settings"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
            >
              <Sliders className="h-4 w-4" />
            </button>

            {/* Auth CTA Actions */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-1">
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">
                    {user.name || user.email}
                  </span>
                  {isAdmin && (
                    <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1 py-0.5 uppercase tracking-wide">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
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
