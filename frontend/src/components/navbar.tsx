"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-mark";
import {
  LogOut,
  ArrowRight,
  LayoutDashboard,
  History,
  Sliders,
  Search,
  Menu,
  X,
} from "lucide-react";

export function Navbar({ minimalLanding = false }: { minimalLanding?: boolean }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !isAuthenticated) {
        event.preventDefault();
        setIsPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setIsPaletteOpen(false);
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAuthenticated]);

  // Compute display name or email first letter for user avatar
  const userInitial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();
  const landingCommands = [
    { label: "Five-agent architecture", href: "#architecture", terms: "planner executor critic re-planner synthesizer agents" },
    { label: "Research workflow", href: "#workflow", terms: "workflow process lifecycle" },
    { label: "Explore platform features", href: "#features", terms: "features sources reports" },
    { label: "Start with a question", href: "/signup", terms: "start sign up launch research" },
  ];
  const filteredLandingCommands = landingCommands.filter((item) => `${item.label} ${item.terms}`.toLowerCase().includes(paletteQuery.toLowerCase()));

  return (
    <>
      <header className="site-navbar sticky top-0 z-40 w-full border-b border-[#dce2ee] dark:border-[#303b58] bg-[#f4f6fb]/90 dark:bg-[#0c1120]/90 backdrop-blur-md transition-colors duration-150">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Official Synora brand */}
          <Link href="/" className="inline-flex items-center gap-2.5 group my-auto">
            <BrandMark className="h-9 w-9 shrink-0 group-hover:scale-105 transition-transform my-auto" />
            <div className="text-base font-bold tracking-tight text-[#1b2235] dark:text-[#ffffff] leading-none my-auto">Synora</div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#626b82] dark:text-[#a9b2c6]">
            {isAuthenticated ? (
              isAdmin ? (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 text-[#6259b5] dark:text-[#c6c2fa] hover:text-[#51489d] transition-colors font-semibold text-xs sm:text-sm"
                  title="Admin Console"
                >
                  <Sliders className="h-4 w-4" />
                  <span>Admin Console</span>
                </Link>
              ) : null
            ) : (
              <>
                <Link href={minimalLanding ? "#product" : "/#product"} className="hover:text-[#1b2235] dark:hover:text-[#ffffff] transition-colors">
                  Product
                </Link>
                <Link href={minimalLanding ? "#architecture" : "/#architecture"} className="hover:text-[#1b2235] dark:hover:text-[#ffffff] transition-colors">
                  Architecture
                </Link>
                <Link href={minimalLanding ? "#workflow" : "/#workflow"} className="hover:text-[#1b2235] dark:hover:text-[#ffffff] transition-colors">
                  Workflow
                </Link>
                <Link href={minimalLanding ? "#features" : "/#features"} className="hover:text-[#1b2235] dark:hover:text-[#ffffff] transition-colors">
                  Features
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Group: History, Theme Toggle, Settings & Initial Avatar */}
          <div className="flex items-center gap-2">
            {!isAuthenticated && !minimalLanding && (
              <button type="button" className="landing-search-trigger" onClick={() => setIsPaletteOpen(true)} aria-label="Search Synora sections">
                <Search className="h-4 w-4" /><span>Search</span><kbd>Ctrl K</kbd>
              </button>
            )}
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile: Email's First Letter Avatar */}
            {isAuthenticated && user ? (
              <div className="relative pl-1" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  title={user.email || user.name}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#6259b5] text-white font-bold text-sm uppercase ring-2 ring-[#6259b5]/20 hover:ring-[#6259b5]/50 shadow-sm transition-all cursor-pointer focus:outline-none"
                >
                  {userInitial}
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-[#dce2ee] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#1b2438] p-2 shadow-2xl backdrop-blur-xl z-50">
                    <div className="px-3 py-2.5 border-b border-[#dce2ee]/60 dark:border-[#303b58] mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6259b5] text-white font-bold text-xs shrink-0">
                          {userInitial}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-semibold text-[#1b2235] dark:text-[#ffffff] truncate">
                            {user.name || "User"}
                          </div>
                          <div className="text-[11px] text-[#626b82] dark:text-[#a9b2c6] truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      {!isAdmin && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[#efedff] dark:bg-[#8980d8]/30 text-[#6259b5] dark:text-[#c6c2fa] border border-[#6259b5]/30 mt-2">
                          Researcher
                        </span>
                      )}
                    </div>

                    {!isAdmin && (
                      <div className="space-y-0.5 mb-1">
                        <Link
                          href="/"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1b2235] dark:text-[#ffffff] rounded-xl hover:bg-[#eef1f8] dark:hover:bg-[#0c1120] transition-colors"
                        >
                          <LayoutDashboard className="h-4 w-4 text-[#6259b5]" />
                          <span>Workspace</span>
                        </Link>

                        <Link
                          href="/history"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#1b2235] dark:text-[#ffffff] rounded-xl hover:bg-[#eef1f8] dark:hover:bg-[#0c1120] transition-colors"
                        >
                          <History className="h-4 w-4 text-[#6259b5]" />
                          <span>Research History</span>
                        </Link>
                      </div>
                    )}

                    <div className={!isAdmin ? "border-t border-[#dce2ee]/60 dark:border-[#303b58] pt-1" : "pt-0.5"}>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#D62832] rounded-xl hover:bg-[#D62832]/10 transition-colors cursor-pointer"
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
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#626b82] dark:text-[#a9b2c6] hover:text-[#1b2235] dark:hover:text-[#ffffff] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-1.5 rounded-lg bg-[#6259b5] hover:bg-[#51489d] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
                >
                  <span>{minimalLanding ? "Launch workspace" : "Launch"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
            {!isAuthenticated && (
              <button type="button" className="landing-mobile-trigger" onClick={() => setIsMobileMenuOpen((open) => !open)} aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={isMobileMenuOpen}>
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
        {!isAuthenticated && isMobileMenuOpen && (
          <nav className="landing-mobile-menu" aria-label="Mobile navigation">
            <Link href="#product" onClick={() => setIsMobileMenuOpen(false)}>Product</Link>
            <Link href="#architecture" onClick={() => setIsMobileMenuOpen(false)}>Architecture</Link>
            <Link href="#workflow" onClick={() => setIsMobileMenuOpen(false)}>Research workflow</Link>
            <Link href="#features" onClick={() => setIsMobileMenuOpen(false)}>Features</Link>
            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Sign in</Link>
            <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>Launch workspace <ArrowRight className="h-4 w-4" /></Link>
          </nav>
        )}
      </header>

      {!isAuthenticated && isPaletteOpen && (
        <div className="landing-command-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsPaletteOpen(false); }}>
          <section className="landing-command-dialog" role="dialog" aria-modal="true" aria-labelledby="landing-command-title">
            <label className="landing-command-input" htmlFor="landing-command-search">
              <Search aria-hidden="true" />
              <input id="landing-command-search" autoFocus value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} placeholder="Search sections or actions…" />
              <kbd>ESC</kbd>
            </label>
            <p id="landing-command-title" className="landing-command-label">Explore Synora</p>
            <div className="landing-command-results">
              {filteredLandingCommands.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => { setIsPaletteOpen(false); setPaletteQuery(""); }}>
                  <span>{item.label}</span><ArrowRight aria-hidden="true" />
                </Link>
              ))}
              {filteredLandingCommands.length === 0 && <p className="landing-command-empty">No matching section. Try “workflow” or “sources”.</p>}
            </div>
            <div className="landing-command-footer"><span>Navigate to a section</span><span><kbd>Ctrl</kbd><kbd>K</kbd> to open</span></div>
          </section>
        </div>
      )}
    </>
  );
}
