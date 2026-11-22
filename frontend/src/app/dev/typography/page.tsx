"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TYPOGRAPHY_PAIRINGS,
  TypographyPairing,
  ACTIVE_TYPOGRAPHY_PAIRING,
} from "@/lib/typography-config";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sparkles,
  ArrowRight,
  Cpu,
  GraduationCap,
  ShoppingBag,
  ExternalLink,
  Check,
  ChevronDown,
  Mic,
  Copy,
  CheckCircle2,
} from "lucide-react";

export default function TypographyPreviewPage() {
  const [selectedPairing, setSelectedPairing] = useState<TypographyPairing>(ACTIVE_TYPOGRAPHY_PAIRING);
  const [viewMode, setViewMode] = useState<"interactive" | "side-by-side">("interactive");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const pairing = TYPOGRAPHY_PAIRINGS[selectedPairing];

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(`export const ACTIVE_TYPOGRAPHY_PAIRING: TypographyPairing = "${selectedPairing}";`);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className={`min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200 ${pairing.cssClass}`}>
      {/* Sticky Dev Control Bar */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity">
            <BrandMark className="h-6 w-6 shrink-0" />
            <span>Synora</span>
          </Link>
          <span className="text-[var(--text-muted)] text-xs">/</span>
          <span className="px-2 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">
            Dev Typography Lab
          </span>
        </div>

        {/* Pairing Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-xs">
          {(["A", "B", "C"] as TypographyPairing[]).map((key) => {
            const p = TYPOGRAPHY_PAIRINGS[key];
            const isSelected = selectedPairing === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPairing(key)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[var(--surface)] text-[var(--accent)] shadow-xs font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {p.name.split(":")[0]}
                {key === ACTIVE_TYPOGRAPHY_PAIRING && (
                  <span className="ml-1.5 px-1 py-0.2 rounded text-[10px] bg-[var(--accent)] text-white">Default</span>
                )}
              </button>
            );
          })}
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[var(--border)] overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setViewMode("interactive")}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                viewMode === "interactive" ? "bg-[var(--accent)] text-white font-medium" : "hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
              }`}
            >
              Interactive Mode
            </button>
            <button
              type="button"
              onClick={() => setViewMode("side-by-side")}
              className={`px-3 py-1.5 transition-colors cursor-pointer ${
                viewMode === "side-by-side" ? "bg-[var(--accent)] text-white font-medium" : "hover:bg-[var(--surface-hover)] text-[var(--text-muted)]"
              }`}
            >
              Side-by-Side (A / B / C)
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyConfig}
            title="Copy one-line config for ACTIVE_TYPOGRAPHY_PAIRING"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer shadow-xs"
          >
            {copiedSnippet ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedSnippet ? "Copied!" : "Copy Config"}</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* Pairing Summary Header */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                Active Selection: {pairing.name}
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] mt-1">
                {pairing.subtitle}
              </h1>
            </div>
            <div className="px-3 py-1 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] text-[var(--success)] text-xs font-semibold">
              {pairing.badge}
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-3xl">
            {pairing.description}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs text-[var(--text-muted)] border-t border-[var(--border)]">
            <div>
              <strong className="text-[var(--text)]">UI / Body Font:</strong> {pairing.uiFont}
            </div>
            <div>
              <strong className="text-[var(--text)]">Headline Font:</strong> {pairing.headlineFont}
            </div>
            <div>
              <strong className="text-[var(--text)]">Monospace:</strong> {pairing.monoFont}
            </div>
          </div>
        </div>

        {viewMode === "interactive" ? (
          <>
            {/* SECTION 1: GLYPH DISAMBIGUATION SPECIMEN */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                    1. Glyph Disambiguation &amp; Optical Clarity Specimen
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Rigorous verification of capital &quot;I&quot; vs lowercase &quot;l&quot;, numeral zero &quot;0&quot; vs uppercase &quot;O&quot;, and &quot;rn&quot; vs &quot;m&quot;.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Disambiguation Test Card */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Disambiguation Test Row (Il1 O0 rn m)
                  </div>
                  <div className="text-4xl font-semibold tracking-normal text-[var(--text)] space-x-4 bg-[var(--bg)] p-4 rounded-xl text-center select-all">
                    <span>I</span>
                    <span className="text-[var(--accent)]">l</span>
                    <span className="text-[var(--critic)]">1</span>
                    <span className="text-[var(--border)]">|</span>
                    <span>O</span>
                    <span className="text-[var(--executor)]">0</span>
                    <span className="text-[var(--border)]">|</span>
                    <span>rn</span>
                    <span className="text-[var(--planner)]">m</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] leading-relaxed space-y-1">
                    <p>
                      <strong>Capital I:</strong> In Inter Variable with <code className="text-xs font-mono bg-[var(--surface-hover)] px-1 py-0.5 rounded">cv05</code> enabled, uppercase I features serif crossbars.
                    </p>
                    <p>
                      <strong>Lowercase l:</strong> Features a subtle curved tail (<code className="text-xs font-mono bg-[var(--surface-hover)] px-1 py-0.5 rounded">cv08</code>) to completely eliminate confusion with numeral 1.
                    </p>
                  </div>
                </div>

                {/* Real Problem Sentence Test */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Target Query: Pronoun &quot;I&quot; vs Letter &quot;l&quot;
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--bg)] space-y-2">
                    <div className="text-xs font-semibold text-[var(--success)] flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      <span>Disambiguated (Current Type System):</span>
                    </div>
                    <p className="text-base text-[var(--text)] font-normal leading-relaxed">
                      &quot;When should <strong className="text-[var(--accent)] underline decoration-[var(--accent)] decoration-2">I</strong> choose PostgreSQL over ScyllaDB?&quot;
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Notice: The pronoun &quot;I&quot; possesses distinct top and bottom serifs, preventing misreading as &quot;should l choose&quot;.
                    </p>
                  </div>
                </div>
              </div>

              {/* Multi-Script Fallback Test */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Multi-Script &amp; Indian Regional Language Verification
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 rounded-xl bg-[var(--bg)] space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Hindi / Devanagari</span>
                    <p className="text-base text-[var(--text)] leading-relaxed">
                      भारत में कंप्यूटर साइंस और इंजीनियरिंग के लिए शीर्ष संस्थान कौन से हैं?
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[var(--bg)] space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">Kannada</span>
                    <p className="text-base text-[var(--text)] leading-relaxed">
                      ಭಾರತದಲ್ಲಿ ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಎಂಜಿನಿಯರಿಂಗ್‌ಗೆ ಉತ್ತಮ ಕಾಲೇಜುಗಳು ಯಾವುವು?
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2: THE 11 SEMANTIC TOKENS SPECIMEN */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                  2. Semantic Type System Scale (11 Tokens)
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Standardized tokens replacing 40 ad-hoc sizes, 19 weights, and 36 letter-spacing values.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        <th className="p-3.5">Token Name</th>
                        <th className="p-3.5">Size / Line-Height</th>
                        <th className="p-3.5">Weight</th>
                        <th className="p-3.5">Tracking</th>
                        <th className="p-3.5">Live Rendered Specimen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] text-xs">
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-display</td>
                        <td className="p-3.5 text-[var(--text-muted)]">clamp(30px, 40px) / 1.2</td>
                        <td className="p-3.5 font-mono">600</td>
                        <td className="p-3.5 font-mono">-0.02em</td>
                        <td className="p-3.5 text-display text-[var(--text)]">Start with a question.</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-title</td>
                        <td className="p-3.5 text-[var(--text-muted)]">20px / 1.3</td>
                        <td className="p-3.5 font-mono">600</td>
                        <td className="p-3.5 font-mono">-0.01em</td>
                        <td className="p-3.5 text-title text-[var(--text)]">Executive Research Synthesis</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-lead</td>
                        <td className="p-3.5 text-[var(--text-muted)]">16px / 1.6</td>
                        <td className="p-3.5 font-mono">400</td>
                        <td className="p-3.5 font-mono">0</td>
                        <td className="p-3.5 text-lead text-[var(--text-muted)]">Get a source-backed answer you can inspect, compare, and refine.</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-input</td>
                        <td className="p-3.5 text-[var(--text-muted)]">17px / 1.55</td>
                        <td className="p-3.5 font-mono">400</td>
                        <td className="p-3.5 font-mono">0</td>
                        <td className="p-3.5 text-input text-[var(--text)]">How do today&apos;s leading AI models compare for deep research?</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-heading-sm</td>
                        <td className="p-3.5 text-[var(--text-muted)]">15px / 1.35</td>
                        <td className="p-3.5 font-mono">600</td>
                        <td className="p-3.5 font-mono">0</td>
                        <td className="p-3.5 text-heading-sm text-[var(--text)]">Ideas to explore</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-body</td>
                        <td className="p-3.5 text-[var(--text-muted)]">15px / 1.6</td>
                        <td className="p-3.5 font-mono">400</td>
                        <td className="p-3.5 font-mono">0</td>
                        <td className="p-3.5 text-body text-[var(--text)]">Multi-agent orchestration transforms ambiguous human goals into structured acyclic execution plans.</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-control</td>
                        <td className="p-3.5 text-[var(--text-muted)]">14px / 1.2</td>
                        <td className="p-3.5 font-mono">500</td>
                        <td className="p-3.5 font-mono">0</td>
                        <td className="p-3.5 text-control text-[var(--text)]">Deep Research · Gemini 2.5 Flash</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-small</td>
                        <td className="p-3.5 text-[var(--text-muted)]">13.5px / 1.5</td>
                        <td className="p-3.5 font-mono">400</td>
                        <td className="p-3.5 font-mono">0</td>
                        <td className="p-3.5 text-small text-[var(--text-muted)]">Verified against official Joint Seat Allocation Authority archives (IIT Delhi, IIT Madras, and IIT Kanpur).</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-caption</td>
                        <td className="p-3.5 text-[var(--text-muted)]">13px / 1.4</td>
                        <td className="p-3.5 font-mono">500</td>
                        <td className="p-3.5 font-mono">+0.01em</td>
                        <td className="p-3.5 text-caption text-[var(--text-muted)]">Academic Research · Gadgets &amp; Deals</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--text-micro</td>
                        <td className="p-3.5 text-[var(--text-muted)]">12px / 1.4</td>
                        <td className="p-3.5 font-mono">400</td>
                        <td className="p-3.5 font-mono">+0.01em</td>
                        <td className="p-3.5 text-micro text-[var(--text-faint)]">Updated 2 minutes ago · 48,219 tokens processed</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-mono text-[var(--accent)] font-semibold">--font-mono</td>
                        <td className="p-3.5 text-[var(--text-muted)]">13px / 1.5</td>
                        <td className="p-3.5 font-mono">400</td>
                        <td className="p-3.5 font-mono">0</td>
                        <td className="p-3.5 font-mono text-[var(--text)]">TASK_ID_797B · STEP_02_PASSED · $0.0042</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* SECTION 3: REAL HOME SCREEN COMPONENT PREVIEW */}
            <section className="space-y-6 pt-4">
              <div className="border-b border-[var(--border)] pb-3">
                <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                  3. Live Home Screen Component Preview
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Live verification of Hero headline, subhead, search composer, non-clipped chips, and suggestion cards.
                </p>
              </div>

              {/* Home Hero Preview */}
              <div className="workspace-home-hero flex flex-col items-center text-center py-6">
                <BrandMark className="h-10 w-10 mb-4" />
                <h1 className="workspace-hero-title text-display">
                  Start with a question.
                </h1>
                <p className="workspace-hero-subtitle text-lead text-[var(--text-muted)] mt-3">
                  Get a source-backed answer you can inspect, compare, and refine.
                </p>
              </div>

              {/* Composer Preview */}
              <div className="max-w-[820px] mx-auto w-full p-4 sm:p-5 rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-card space-y-4">
                <textarea
                  readOnly
                  rows={2}
                  value="When should I choose PostgreSQL over ScyllaDB?"
                  className="w-full bg-transparent resize-none border-0 outline-none text-input text-[var(--text)] leading-relaxed font-sans"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]/60">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-[var(--accent)] text-control font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                      <span>Deep Research</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface-hover)] text-control text-[var(--text)] font-semibold flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-[var(--accent)]" />
                      <span>Gemini 2.5 Flash</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </div>
                    <div className="p-2 rounded-full border border-[var(--border)] text-[var(--text-muted)]">
                      <Mic className="h-4 w-4" />
                    </div>
                    <div className="h-8 w-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ideas to Explore & Cards */}
              <div className="max-w-[820px] mx-auto w-full space-y-4 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h2 className="text-heading-sm text-[var(--text)] font-semibold">Ideas to explore</h2>
                    <p className="text-small text-[var(--text-muted)]">Verified research benchmarks from technical and academic sources</p>
                  </div>
                  {/* Category Chips - With smooth horizontal overflow prevention */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <button type="button" className="px-3 py-1 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] text-caption font-semibold text-[var(--text)]">
                      All
                    </button>
                    <button type="button" className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-caption font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
                      Academic
                    </button>
                    <button type="button" className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-caption font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
                      Architecture
                    </button>
                    <button type="button" className="px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-caption font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
                      Gadgets &amp; Deals
                    </button>
                  </div>
                </div>

                {/* Cards Grid: Solves Title Collision & Descender Clipping */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between min-h-[140px] shadow-xs space-y-3">
                    <div className="space-y-1.5">
                      <div className="text-caption text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
                        <GraduationCap className="h-3.5 w-3.5 text-[var(--accent)]" />
                        <span>Academic Research</span>
                      </div>
                      <h3 className="text-heading-sm font-semibold text-[var(--text)] leading-snug line-clamp-2" style={{ textWrap: "balance" }}>
                        JEE Advanced Closing Cutoffs for Computer Science
                      </h3>
                    </div>
                    <p className="text-small text-[var(--text-muted)] leading-normal line-clamp-2 pb-0.5">
                      Verified against official Joint Seat Allocation Authority archives (IIT Delhi, IIT Madras, and IIT Kanpur).
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 flex flex-col justify-between min-h-[140px] shadow-xs space-y-3">
                    <div className="space-y-1.5">
                      <div className="text-caption text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
                        <Cpu className="h-3.5 w-3.5 text-[var(--executor)]" />
                        <span>Hardware Benchmarks</span>
                      </div>
                      <h3 className="text-heading-sm font-semibold text-[var(--text)] leading-snug line-clamp-2" style={{ textWrap: "balance" }}>
                        Apple M4 Max vs Intel Core Ultra 9 Architecture
                      </h3>
                    </div>
                    <p className="text-small text-[var(--text-muted)] leading-normal line-clamp-2 pb-0.5">
                      Direct side-by-side IPC, thermal TDP, and unified memory bandwidth matrix with empirical benchmarks.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          /* SECTION 4: 3-WAY SIDE-BY-SIDE COMPARISON */
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                Side-by-Side Pairing Comparison (Options A, B, C)
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Compare letterforms, x-height, glyph disambiguation, and hierarchy across all three pairings simultaneously.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(["A", "B", "C"] as TypographyPairing[]).map((key) => {
                const p = TYPOGRAPHY_PAIRINGS[key];
                return (
                  <div key={key} className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-5 ${p.cssClass}`}>
                    <div className="border-b border-[var(--border)] pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{key}: {p.name.split(":")[1]}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-hover)] font-medium">{p.badge}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{p.subtitle}</p>
                    </div>

                    {/* Headline Specimen */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-[var(--text-faint)] font-mono uppercase">Headline</span>
                      <h3 className="text-display text-[var(--text)]">Start with a question.</h3>
                      <p className="text-lead text-[var(--text-muted)]">Get a source-backed answer you can inspect.</p>
                    </div>

                    {/* Disambiguation specimen */}
                    <div className="p-3 rounded-xl bg-[var(--bg)] space-y-1">
                      <span className="text-[10px] text-[var(--text-faint)] font-mono uppercase">Disambiguation Specimen</span>
                      <div className="text-xl font-semibold tracking-normal text-[var(--text)] space-x-3">
                        <span>I</span>
                        <span className="text-[var(--accent)]">l</span>
                        <span className="text-[var(--critic)]">1</span>
                        <span>O</span>
                        <span className="text-[var(--executor)]">0</span>
                        <span>rn</span>
                        <span className="text-[var(--planner)]">m</span>
                      </div>
                      <p className="text-xs text-[var(--text)] pt-1">
                        &quot;When should <strong className="text-[var(--accent)]">I</strong> choose PostgreSQL?&quot;
                      </p>
                    </div>

                    {/* Sample Card */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-2">
                      <div className="text-caption text-[var(--text-muted)] font-medium">Academic Research</div>
                      <h4 className="text-heading-sm font-semibold text-[var(--text)]">
                        JEE Advanced Closing Cutoffs for Computer Science
                      </h4>
                      <p className="text-small text-[var(--text-muted)] line-clamp-2">
                        Verified against official Joint Seat Allocation Authority archives (IIT Delhi, IIT Madras, and IIT Kanpur).
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
