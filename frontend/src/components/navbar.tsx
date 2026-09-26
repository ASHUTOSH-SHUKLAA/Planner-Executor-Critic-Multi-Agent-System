"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute email's first letter for user avatar
  const userInitial = (user?.email || user?.name || "U").trim().charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo - Sleek & Professional without clutter */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
              TriadFlow
            </span>
          </Link>

          {/* Center Navigation Links - Cleaned (History moved to right toolbar & user menu) */}
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

          {/* Right Action Group: History, Theme Toggle, Settings & Initial Avatar */}
          <div className="flex items-center gap-2">
            {/* History Shortcut */}
            {isAuthenticated && (
              <Link
                href="/history"
                title="Research History"
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
              >
                <History className="h-4 w-4 text-emerald-500" />
              </Link>
            )}

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

            {/* User Profile: Email's First Letter Avatar */}
            {isAuthenticated && user ? (
              <div className="relative pl-1" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  title={user.email || user.name}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-sm uppercase ring-2 ring-indigo-500/20 hover:ring-indigo-500/50 shadow-sm transition-all cursor-pointer focus:outline-none"
                >
                  {userInitial}
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 shadow-2xl backdrop-blur-xl z-50">
                    <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                          {userInitial}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {user.name || "Researcher"}
                          </div>
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        {isAdmin ? "Administrator" : "Researcher"}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4 text-indigo-500" />
                        <span>Workspace</span>
                      </Link>

                      <Link
                        href="/history"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                      >
                        <History className="h-4 w-4 text-emerald-500" />
                        <span>Research History</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>Admin Console</span>
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800/80 mt-1 pt-1">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
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
