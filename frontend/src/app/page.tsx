"use client";

import Link from "next/link";
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import {
  Bot,
  Zap,
  ShieldCheck,
  RefreshCw,
  GitBranch,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  BarChart3,
  Globe,
  Lock,
  Check,
  FileText,
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<number>(0);

  const workflowStages = [
    {
      agent: "PLANNER AGENT",
      icon: GitBranch,
      badge: "DAG Decomposition",
      color: "border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10",
      title: "Topological Dependency Planning",
      detail:
        "Deconstructs complex research tasks into discrete, acyclic execution steps with explicit dependency tracking and zero cycle risk.",
    },
    {
      agent: "EXECUTOR + WEB SEARCH",
      icon: Globe,
      badge: "Live Evidence Gathering",
      color: "border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-500/10",
      title: "Real Web Scraping & Tool Calling",
      detail:
        "Executes targeted DuckDuckGo live web searches and extracts readable web snippets, collecting genuine source URLs and domains.",
    },
    {
      agent: "CRITIC AGENT",
      icon: ShieldCheck,
      badge: "Evidence Fact-Checking",
      color: "border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-500/10",
      title: "Adversarial Quality Gate",
      detail:
        "Audits each step output against gathered evidence. Verifies correctness, completeness, and relevance, rejecting unsubstantiated claims.",
    },
    {
      agent: "SYNTHESIZER",
      icon: FileText,
      badge: "Grounded Deliverable",
      color: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10",
      title: "Final Report & Verified Citations",
      detail:
        "Produces clean Markdown comparison tables, actionable conclusions, and interactive citations ready for instant export.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-14 pb-20 md:pt-22 md:pb-28">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[380px] bg-indigo-500/10 dark:bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[350px] h-[250px] bg-purple-500/10 dark:bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/80 dark:bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-6 backdrop-blur-sm shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Grounded Multi-Agent Research Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.1]">
              Grounded Intelligence with{" "}
              <span className="gradient-accent">Autonomous AI Triads</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              TriadFlow pairs Planner, Executor, and Critic agents to decompose complex research goals,
              search the live web, rigorously fact-check findings, and deliver verified reports with real citations.
            </p>

            {/* Hero CTAs */}
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/signup"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all hover:scale-[1.02]"
              >
                <span>Start Researching</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#architecture"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-7 py-3.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all backdrop-blur-sm shadow-xs"
              >
                <span>View Architecture</span>
              </a>
            </div>

            <p className="mt-4 text-xs text-zinc-500">
              Powered by Google Gemini 3.6 Flash • Real Web Searches • Zero Mock Data
            </p>
          </div>

          {/* Interactive Workflow Stage Showcase */}
          <div className="mt-14 max-w-4xl mx-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/70 p-4 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Autonomous Research Lifecycle
                </span>
              </div>
              <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                Click a stage to inspect
              </span>
            </div>

            {/* Tabs */}
            <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {workflowStages.map((st, idx) => {
                const IconComponent = st.icon;
                const isActive = activeTab === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    className={`text-left rounded-xl p-4 transition-all duration-200 border cursor-pointer ${
                      isActive
                        ? `${st.color} shadow-md ring-1 ring-indigo-500/50 scale-[1.01]`
                        : "border-zinc-200/80 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider">{st.agent}</span>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white mb-1">{st.badge}</p>
                  </button>
                );
              })}
            </div>

            {/* Detail Box for Selected Stage */}
            <div className="mt-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                <span>{workflowStages[activeTab].title}</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {workflowStages[activeTab].detail}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Triad Engine Deep Dive Section */}
      <section id="triad" className="py-20 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
              The Agent Triad Architecture
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Three Specialized Agents. Grounded Results.
            </h3>
            <p className="mt-3.5 text-zinc-600 dark:text-zinc-400 text-sm sm:text-base">
              Traditional multi-agent systems suffer from context pollution and hallucinated sources. TriadFlow separates
              responsibilities into three discrete roles governed by rigid data contracts and live web verification.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1: Planner */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                  <GitBranch className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">1. The Planner Agent</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                  Transforms broad, ambiguous user queries into structured, acyclic Directed Acyclic Graphs (DAGs) using
                  strict Pydantic schemas. Flags steps requiring live external research and synthesizes search queries.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Topological dependency resolution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Circular dependency auto-rejection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Gemini 3.6 Flash structured reasoning</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                <span>Output: Plan & Steps</span>
                <span>DAG Compliant</span>
              </div>
            </div>

            {/* Card 2: Executor */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-6">
                  <Cpu className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">2. The Wave Executor</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                  Executes unblocked steps concurrently using thread-isolated workers. Executes real DuckDuckGo web searches,
                  extracts snippets from actual websites, and captures clean source citations.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Concurrent batch wave execution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>DuckDuckGo live search & scraping tools</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Scoped dependency context injection</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-mono">
                <span>Live Evidence Tooling</span>
                <span>Thread-Isolated</span>
              </div>
            </div>

            {/* Card 3: Critic */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-zinc-950 dark:text-white mb-2">3. The Critic & Re-planner</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
                  An adversarial auditor evaluating step outputs against deterministic quality gates. Verifies grounding against
                  collected web sources, triggering targeted retries or autonomous replanning when evidence is insufficient.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Correctness &ge; 0.85, Completeness &ge; 0.80</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Source citation verification & grounding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Dynamic Re-planner with infinite loop prevention</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-mono">
                <span>Deterministic Scoring</span>
                <span>Self-Healing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual System Architecture Section */}
      <section id="architecture" className="py-20 border-t border-zinc-200 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
              System Pipeline
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white tracking-tight">
              End-to-End Orchestration Pipeline
            </h3>
            <p className="mt-3.5 text-zinc-600 dark:text-zinc-400 text-sm sm:text-base">
              From natural language input to multi-tier quality-audited completion.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-10 shadow-lg dark:shadow-xl">
            {/* Steps Workflow Graphic */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-5 relative">
              {/* Step 1 */}
              <div className="flex-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold mb-3">
                  1
                </div>
                <h5 className="font-semibold text-zinc-900 dark:text-white text-sm">Research Objective</h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Prompt received over authenticated REST / SSE API endpoint</p>
              </div>

              <ArrowRight className="hidden lg:block text-zinc-400 dark:text-zinc-600 h-6 w-6 flex-shrink-0" />

              {/* Step 2 */}
              <div className="flex-1 w-full rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold mb-3">
                  2
                </div>
                <h5 className="font-semibold text-zinc-900 dark:text-white text-sm">DAG Decomposition</h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Validated against Pydantic schema with cycle check</p>
              </div>

              <ArrowRight className="hidden lg:block text-zinc-400 dark:text-zinc-600 h-6 w-6 flex-shrink-0" />

              {/* Step 3 */}
              <div className="flex-1 w-full rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-sky-500/20 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold mb-3">
                  3
                </div>
                <h5 className="font-semibold text-zinc-900 dark:text-white text-sm">Parallel Wave & Search</h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Independent tasks execute web search and scrape tools</p>
              </div>

              <ArrowRight className="hidden lg:block text-zinc-400 dark:text-zinc-600 h-6 w-6 flex-shrink-0" />

              {/* Step 4 */}
              <div className="flex-1 w-full rounded-xl border border-purple-200 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold mb-3">
                  4
                </div>
                <h5 className="font-semibold text-zinc-900 dark:text-white text-sm">Critic Quality Gate</h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Scores outputs and verifies grounding against real sources</p>
              </div>

              <ArrowRight className="hidden lg:block text-zinc-400 dark:text-zinc-600 h-6 w-6 flex-shrink-0" />

              {/* Step 5 */}
              <div className="flex-1 w-full rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold mb-3">
                  5
                </div>
                <h5 className="font-semibold text-zinc-900 dark:text-white text-sm">Synthesis & Citations</h5>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Generates formatted report with clickable verified citations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
              Platform Features
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Engineered for Grounded Reliability
            </h3>
            <p className="mt-3.5 text-zinc-600 dark:text-zinc-400 text-sm sm:text-base">
              Every component is built for observability, strict security, and genuine research synthesis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-6 shadow-xs">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Globe className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-zinc-900 dark:text-white text-base mb-2">Live Web Search & Scraping</h5>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Integrated DuckDuckGo tool calling extracts real-time internet data, preserving valid source URLs and domain metadata.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-6 shadow-xs">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-zinc-900 dark:text-white text-base mb-2">Granular Token Telemetry</h5>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Track input/output tokens and calculate precise USD inference costs per prompt and per workflow in real time.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-6 shadow-xs">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-zinc-900 dark:text-white text-base mb-2">Strict Authentication & RBAC</h5>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Bcrypt password hashing and JWT tokens enforce role-based access (user/admin) and strict task ownership.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-6 shadow-xs">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-zinc-900 dark:text-white text-base mb-2">Infinite Loop Prevention</h5>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Hard caps on re-planning iterations (max 2) prevent runaway agent loops and runaway token consumption.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-6 shadow-xs">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-zinc-900 dark:text-white text-base mb-2">Visual DAG Inspector</h5>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Inspect execution nodes, critic score meters, step prompts, and live outputs on a collapsible React Flow canvas.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-6 shadow-xs">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-zinc-900 dark:text-white text-base mb-2">Google Gemini 3.6 Integration</h5>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                High-speed native structured outputs with automatic schema enforcement and multi-provider fallback.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-20 border-t border-zinc-200 dark:border-zinc-800 relative overflow-hidden bg-gradient-to-b from-transparent to-indigo-50/50 dark:to-indigo-950/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h3 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Ready for Grounded AI Research?
          </h3>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Experience verified research generation with real web evidence, adversarial quality checks, and real-time streaming.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-xl bg-zinc-950 dark:bg-white px-8 py-3.5 text-sm font-bold text-white dark:text-zinc-950 shadow-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-transform hover:scale-105"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-8 bg-white dark:bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>TriadFlow Multi-Agent Research Platform • 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="https://github.com/ASHUTOSH-SHUKLAA/Planner-Executor-Critic-Multi-Agent-System"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
            >
              GitHub Source Code
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
