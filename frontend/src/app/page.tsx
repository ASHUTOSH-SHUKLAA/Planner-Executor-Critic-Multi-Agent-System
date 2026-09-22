"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import {
  Bot,
  Zap,
  ShieldCheck,
  RefreshCw,
  GitBranch,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BarChart3,
  Terminal,
  Lock,
  Play,
  Check,
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"planner" | "executor" | "critic">("planner");
  const [demoStep, setDemoStep] = useState<number>(0);
  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(true);

  // Automated simulated workflow animation in the hero preview
  useEffect(() => {
    if (!isPlayingDemo) return;
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(interval);
  }, [isPlayingDemo]);

  const demoStates = [
    {
      agent: "PLANNER",
      badge: "Decomposing DAG",
      color: "border-indigo-500/40 text-indigo-400 bg-indigo-500/10",
      title: "Generating Execution Plan & Wave Hierarchy",
      detail: "Decomposed prompt into 4 nodes with zero circular dependencies: [step_1] -> [step_2, step_3] -> [step_4].",
    },
    {
      agent: "EXECUTOR (WAVE 1)",
      badge: "Executing in Parallel",
      color: "border-sky-500/40 text-sky-400 bg-sky-500/10",
      title: "Concurrent Workers Triggered",
      detail: "Running step_2 and step_3 simultaneously via asyncio wave dispatch. Context strictly isolated to parent outputs.",
    },
    {
      agent: "CRITIC AGENT",
      badge: "Threshold Audit",
      color: "border-purple-500/40 text-purple-400 bg-purple-500/10",
      title: "Deterministic Scoring Applied",
      detail: "Correctness: 0.94 | Completeness: 0.91 | Relevance: 0.96. Passed all 3 gates without retry.",
    },
    {
      agent: "ORCHESTRATOR",
      badge: "Synthesizing",
      color: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
      title: "Mission Completed Successfully",
      detail: "Final output synthesized with complete audit trails, latency report (1.98x speedup), and telemetry.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[350px] h-[250px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 mb-8 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Production Multi-Agent Triad Architecture</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Deterministic Quality from{" "}
              <span className="gradient-accent">Autonomous AI Triads</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
              Eliminate hallucinations with the Planner-Executor-Critic system. Decomposes natural language into
              dependency-aware DAGs, runs parallel execution waves, and audits step outputs with deterministic quality gates.
            </p>

            {/* Hero CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all hover:scale-[1.02]"
              >
                <span>Launch Agent Studio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#architecture"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-7 py-3.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all backdrop-blur-sm"
              >
                <span>View Architecture</span>
              </a>
            </div>

            <p className="mt-4 text-xs text-zinc-500">
              No credit card required • Full live DAG canvas • Powered by Groq Llama 3 & GPT-OSS
            </p>
          </div>

          {/* Hero Interactive Simulation Preview Box */}
          <div className="mt-16 max-w-4xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
            {/* Header / Console Controls */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-zinc-400 ml-2">aegis-engine :: orchestrator.live</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlayingDemo(!isPlayingDemo)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-zinc-900 border border-zinc-800"
                >
                  <Play className={`h-3 w-3 ${isPlayingDemo ? "text-emerald-400 fill-emerald-400" : ""}`} />
                  <span>{isPlayingDemo ? "Live Stream Active" : "Paused"}</span>
                </button>
              </div>
            </div>

            {/* Simulation Body */}
            <div className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              {demoStates.map((st, idx) => {
                const isActive = demoStep === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setDemoStep(idx);
                      setIsPlayingDemo(false);
                    }}
                    className={`cursor-pointer rounded-xl p-4 transition-all duration-300 border ${
                      isActive
                        ? `${st.color} shadow-lg ring-1 ring-indigo-500/50 scale-[1.02]`
                        : "border-zinc-800/60 bg-zinc-900/30 opacity-60 hover:opacity-90"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider">{st.agent}</span>
                      {isActive && <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping" />}
                    </div>
                    <p className="text-xs font-semibold text-white mb-1.5">{st.title}</p>
                    <p className="text-[11px] text-zinc-400 leading-normal line-clamp-3">{st.detail}</p>
                  </div>
                );
              })}
            </div>

            {/* Terminal Live Event Log Preview */}
            <div className="mt-5 rounded-lg bg-black/60 border border-zinc-800/80 p-3.5 font-mono text-xs">
              <div className="flex items-center justify-between text-zinc-500 text-[11px] mb-2 pb-1 border-b border-zinc-900">
                <span>ACTIVE SSE TELEMETRY STREAM</span>
                <span className="text-emerald-400 flex items-center gap-1">● 100% HEALTHY</span>
              </div>
              <div className="text-zinc-300 flex items-center gap-2">
                <span className="text-indigo-400">[ORCHESTRATOR]</span>
                <span>Active Step: <strong className="text-white">{demoStates[demoStep].title}</strong></span>
              </div>
              <div className="text-zinc-500 text-[11px] mt-1">
                Context Payload: {demoStates[demoStep].detail}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Triad Engine Deep Dive Section */}
      <section id="triad" className="py-20 border-t border-zinc-800/80 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-3">
              The Agent Triad Architecture
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Three Specialized Agents. One Flawless Result.
            </h3>
            <p className="mt-4 text-zinc-400 text-base">
              Traditional multi-agent systems suffer from context pollution and unverified execution. AegisAgent separates
              responsibilities into three discrete roles governed by rigid contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Card 1: Planner */}
            <div className="glass-card glass-card-hover rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                  <GitBranch className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">1. The Planner Agent</h4>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Transforms broad, ambiguous user goals into structured, acyclic Directed Acyclic Graphs (DAGs) using
                  strict Pydantic schemas. Identifies independent parallel execution branches automatically.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Topological dependency resolution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Circular dependency auto-rejection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Frontier Reasoning (GPT-OSS-120B)</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-indigo-400 font-mono">
                <span>Output: Plan & Steps</span>
                <span>DAG Compliant</span>
              </div>
            </div>

            {/* Card 2: Executor */}
            <div className="glass-card glass-card-hover rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-6">
                  <Cpu className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">2. The Wave Executor</h4>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  Executes batches of unblocked steps concurrently using thread-isolated workers. Employs strict context
                  scoping—agents only receive direct dependency data, preventing prompt bloat.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Concurrent batch wave execution (~2.1x speedup)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Scoped dependency context injection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>High-throughput inference (GPT-OSS-20B)</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-sky-400 font-mono">
                <span>Latency: 50% Reduction</span>
                <span>Thread-Isolated</span>
              </div>
            </div>

            {/* Card 3: Critic */}
            <div className="glass-card glass-card-hover rounded-2xl p-7 flex flex-col justify-between">
              <div>
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2">3. The Critic & Re-planner</h4>
                <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                  An adversarial auditor testing step outputs against deterministic thresholds. If flaws are found, executes
                  targeted retries or autonomously invokes the Re-planner to rewrite downstream paths.
                </p>
                <div className="space-y-2.5 pt-4 border-t border-zinc-800/80 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Correctness &ge; 0.85, Completeness &ge; 0.80</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Targeted feedback retry loops (max 2 retries)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Dynamic Re-planner with loop breaker</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-purple-400 font-mono">
                <span>Catch Rate: 100%</span>
                <span>Self-Healing</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual System Architecture Section */}
      <section id="architecture" className="py-20 border-t border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-3">
              Engine Topology
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              A Complete Architectural Flowchart
            </h3>
            <p className="mt-4 text-zinc-400 text-base">
              From natural language input to multi-tier quality-audited completion.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10 shadow-xl">
            {/* Steps Workflow Graphic */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative">
              {/* Step 1 */}
              <div className="flex-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold mb-3">
                  1
                </div>
                <h5 className="font-semibold text-white text-sm">Natural Language Goal</h5>
                <p className="text-xs text-zinc-400 mt-1">Prompt received over REST / SSE API endpoint</p>
              </div>

              <ArrowRight className="hidden lg:block text-zinc-600 h-6 w-6 flex-shrink-0" />

              {/* Step 2 */}
              <div className="flex-1 w-full rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold mb-3">
                  2
                </div>
                <h5 className="font-semibold text-white text-sm">DAG Decomposition</h5>
                <p className="text-xs text-zinc-400 mt-1">Validated against schema with dependency graph cycle check</p>
              </div>

              <ArrowRight className="hidden lg:block text-zinc-600 h-6 w-6 flex-shrink-0" />

              {/* Step 3 */}
              <div className="flex-1 w-full rounded-xl border border-sky-500/30 bg-sky-950/20 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-sky-500/30 text-sky-300 flex items-center justify-center font-bold mb-3">
                  3
                </div>
                <h5 className="font-semibold text-white text-sm">Parallel Wave Dispatch</h5>
                <p className="text-xs text-zinc-400 mt-1">Independent tasks execute concurrently via asyncio.gather</p>
              </div>

              <ArrowRight className="hidden lg:block text-zinc-600 h-6 w-6 flex-shrink-0" />

              {/* Step 4 */}
              <div className="flex-1 w-full rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold mb-3">
                  4
                </div>
                <h5 className="font-semibold text-white text-sm">Critic Quality Gate</h5>
                <p className="text-xs text-zinc-400 mt-1">Deterministic score audit; triggers retry or dynamic replan</p>
              </div>

              <ArrowRight className="hidden lg:block text-zinc-600 h-6 w-6 flex-shrink-0" />

              {/* Step 5 */}
              <div className="flex-1 w-full rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center">
                <div className="w-10 h-10 mx-auto rounded-lg bg-emerald-500/30 text-emerald-300 flex items-center justify-center font-bold mb-3">
                  5
                </div>
                <h5 className="font-semibold text-white text-sm">Final Delivery</h5>
                <p className="text-xs text-zinc-400 mt-1">State persisted in DB with comprehensive token telemetry</p>
              </div>
            </div>

            {/* Code / Architecture Highlight */}
            <div className="mt-10 rounded-xl bg-black/80 border border-zinc-800 p-5 font-mono text-xs text-zinc-300">
              <div className="text-zinc-500 mb-2">// 2-Tier Self-Healing Recovery State Logic:</div>
              <div className="text-indigo-400">if critic_review.action == &quot;RETRY&quot;:</div>
              <div className="pl-4 text-zinc-400">
                if step.retry_count &lt; 2:
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;retry_step(step, feedback=critic_review.feedback)
                <br />
                else:
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;trigger_dynamic_replanner(failed_step, failed_output, critique)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benchmark Proof Metrics Section */}
      <section id="benchmarks" className="py-20 border-t border-zinc-800/80 bg-zinc-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-3">
              Empirical Benchmarks
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Built and Verified with Empirical Proof
            </h3>
            <p className="mt-4 text-zinc-400 text-base">
              Tested across 20 demanding real-world multi-step reasoning, analytical, and adversarial tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
              <div className="text-4xl sm:text-5xl font-extrabold text-indigo-400 mb-2">89.5%</div>
              <div className="text-sm font-semibold text-white mb-1">Autonomous Pass Rate</div>
              <div className="text-xs text-zinc-400">Exceeds 85% PRD target requirement on first or recovered run</div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
              <div className="text-4xl sm:text-5xl font-extrabold text-sky-400 mb-2">2.1x</div>
              <div className="text-sm font-semibold text-white mb-1">Parallel Speedup</div>
              <div className="text-xs text-zinc-400">Concurrent wave dispatch slashes wall-clock execution time by 52%</div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
              <div className="text-4xl sm:text-5xl font-extrabold text-purple-400 mb-2">100%</div>
              <div className="text-sm font-semibold text-white mb-1">Critic Catch Rate</div>
              <div className="text-xs text-zinc-400">Caught and rejected 100% of injected simulated mistakes & hallucinations</div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
              <div className="text-4xl sm:text-5xl font-extrabold text-emerald-400 mb-2">&lt; 0.02s</div>
              <div className="text-sm font-semibold text-white mb-1">Validation Overhead</div>
              <div className="text-xs text-zinc-400">Pydantic topological cycle verification completes in milliseconds</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 border-t border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-indigo-400 mb-3">
              Enterprise Features
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Engineered for Production Reliability
            </h3>
            <p className="mt-4 text-zinc-400 text-base">
              Every component is built for observability, thread safety, and seamless integration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                <Terminal className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-white text-base mb-2">Real-Time SSE Streaming</h5>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Stream state changes, agent logs, and telemetry directly to the browser UI with sub-second latency via
                Server-Sent Events.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-white text-base mb-2">Granular Token Telemetry</h5>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Track input/output tokens and calculate precise USD inference costs per prompt and per workflow in real time.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-white text-base mb-2">JWT Authentication & SQLite</h5>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Secure API access with bcrypt password hashing and persistent workflow history storage out of the box.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-white text-base mb-2">Infinite Loop Prevention</h5>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Hard caps on re-planning iterations (max 2) prevent runaway agent loops and unexpected token consumption.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-white text-base mb-2">Interactive React Flow Canvas</h5>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Visually inspect execution nodes, critic score meters, step prompts, and outputs directly on an interactive canvas.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h5 className="font-semibold text-white text-base mb-2">Groq LPUs + Frontier Reasoning</h5>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Optimal blend of high-speed wave workers and high-precision frontier models with automatic rate limit retries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-20 border-t border-zinc-800 relative overflow-hidden bg-gradient-to-b from-transparent to-indigo-950/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h3 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Ready to Orchestrate Production Agents?
          </h3>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
            Experience the next level of deterministic AI orchestration with live visual DAG feedback.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-zinc-950 shadow-xl hover:bg-zinc-200 transition-transform hover:scale-105"
            >
              <span>Get Started Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-8 bg-[#09090b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-400" />
            <span>AegisAgent Multi-Agent Orchestration Engine • 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="https://github.com/ASHUTOSH-SHUKLAA/Planner-Executor-Critic-Multi-Agent-System"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-300 transition-colors"
            >
              GitHub Source Code
            </Link>
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">
              Live Studio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
