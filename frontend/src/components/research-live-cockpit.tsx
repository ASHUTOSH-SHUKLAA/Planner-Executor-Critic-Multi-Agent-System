"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  Clock,
  CircleDashed,
  GitBranch,
  ShieldCheck,
  RefreshCw,
  FileText,
  Search,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Terminal,
  Square,
  ArrowRight,
  Database,
  ChevronDown,
  ChevronUp,
  Activity,
  Radio,
  BookOpen,
  Filter,
  Check,
  BarChart3,
  Bot,
} from "lucide-react";
import { PlanStepData, StepOutputData, SourceCitation, WorkflowStateData } from "@/lib/api";
import { ResearchActivityItem, StageType } from "@/lib/research-context";

interface ResearchLiveCockpitProps {
  task: string;
  currentStage: StageType;
  planSteps?: PlanStepData[];
  stepOutputs?: Record<string, StepOutputData>;
  sources?: SourceCitation[];
  activities: ResearchActivityItem[];
  searchedDomains: string[];
  activeSearchQuery?: string | null;
  activePlatform?: string | null;
  elapsedSeconds: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  selectedModelName?: string;
  researchDepth?: "quick" | "standard" | "deep";
  onStop: () => void;
}

export function ResearchLiveCockpit({
  task,
  currentStage,
  planSteps = [],
  stepOutputs = {},
  sources = [],
  activities = [],
  searchedDomains = [],
  activeSearchQuery,
  activePlatform,
  elapsedSeconds,
  totalTokens = 0,
  estimatedCostUsd = 0,
  selectedModelName = "Gemini 3.5 Flash",
  researchDepth = "standard",
  onStop,
}: ResearchLiveCockpitProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(true);

  // The 5 core multi-agent stages
  const STAGES = [
    {
      id: "planning",
      num: "01",
      name: "Planning",
      agent: "Planner Agent",
      role: "Strategic DAG Decomposition",
      desc: "Decomposing question into structured, acyclic execution steps",
      icon: GitBranch,
      color: "var(--planner)",
      accentColor: "#765ecb",
      stageKey: "PLANNING",
    },
    {
      id: "researching",
      num: "02",
      name: "Researching",
      agent: "Executor Agent",
      role: "Parallel Tool & Web Grounding",
      desc: "Executing web queries and extracting empirical evidence",
      icon: Search,
      color: "var(--executor)",
      accentColor: "#167c75",
      stageKey: "RESEARCHING",
    },
    {
      id: "reviewing",
      num: "03",
      name: "Auditing",
      agent: "Critic Agent",
      role: "Adversarial Quality Gate",
      desc: "Verifying factual correctness, sources, and relevance (≥ 0.70)",
      icon: ShieldCheck,
      color: "var(--critic)",
      accentColor: "#a86724",
      stageKey: "VALIDATING",
    },
    {
      id: "refining",
      num: "04",
      name: "Self-Healing",
      agent: "Re-Planner",
      role: "Dynamic DAG Recovery",
      desc: "In-flight graph restructuring on repeated failure (max 2)",
      icon: RefreshCw,
      color: "#bc8048",
      accentColor: "#bc8048",
      stageKey: "REFINING",
    },
    {
      id: "synthesizing",
      num: "05",
      name: "Synthesis",
      agent: "Synthesizer Agent",
      role: "Publication Deliverable",
      desc: "Consolidating approved deliverables into authoritative report",
      icon: FileText,
      color: "var(--planner)",
      accentColor: "#765ecb",
      stageKey: "SYNTHESIZING",
    },
  ];

  const getStageIndex = () => {
    switch (currentStage) {
      case "PLANNING":
        return 0;
      case "RESEARCHING":
        return 1;
      case "VALIDATING":
        return 2;
      case "SYNTHESIZING":
        return 4;
      case "COMPLETED":
        return 5;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex();

  const completedStepsCount = Object.values(stepOutputs).filter(
    (s) => s.status === "PASSED"
  ).length;

  const totalStepsCount = planSteps.length || (Object.keys(stepOutputs).length || 4);

  // Auto-scroll terminal log on new events
  useEffect(() => {
    if (activities.length > 0 && terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activities.length]);

  const formatClock = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getAgentColor = (agentName: string = "") => {
    const ag = agentName.toUpperCase();
    if (ag.includes("PLANNER")) return "text-[#9d86ff] border-[#765ecb]/40 bg-[#765ecb]/15";
    if (ag.includes("EXECUTOR")) return "text-[#4ee2d4] border-[#167c75]/40 bg-[#167c75]/15";
    if (ag.includes("CRITIC")) return "text-[#f7ba63] border-[#a86724]/40 bg-[#a86724]/15";
    if (ag.includes("REPLANNER")) return "text-[#ff9f68] border-[#bc8048]/40 bg-[#bc8048]/15";
    if (ag.includes("SYNTHESIZER")) return "text-[#c280ff] border-[#8a42e6]/40 bg-[#8a42e6]/15";
    return "text-[#12B9D5] border-[#167c75]/40 bg-[#167c75]/15";
  };

  const getStageNarrative = () => {
    if (activeSearchQuery) {
      return `Executing live web search: "${activeSearchQuery}" via DuckDuckGo Lite`;
    }
    switch (currentStage) {
      case "PLANNING":
        return "Planner Agent decomposing research objective into multi-axis Directed Acyclic Graph (DAG)...";
      case "RESEARCHING":
        return `Executors actively retrieving empirical evidence across ${searchedDomains.length || 1} domains...`;
      case "VALIDATING":
        return "Critic Agent performing adversarial audit: scoring Correctness, Completeness, and Relevance...";
      case "SYNTHESIZING":
        return "Synthesizer compiling Master Comparison Matrix and embedding primary citation provenance...";
      case "COMPLETED":
        return "Autonomous deep research completed. Final report verified.";
      default:
        return "Orchestration engine initializing multi-agent triad...";
    }
  };

  return (
    <div className="research-cockpit w-full space-y-5 animate-in fade-in duration-300">
      {/* 1. HERO MISSION CONTROL CARD */}
      <section className="cockpit-hero-card relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#d5ccbc] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#121929] shadow-xl p-5 sm:p-7 backdrop-blur-md">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c6c2fa] via-[#12B9D5] to-[#F3B765] opacity-90" />

        <div className="flex flex-col gap-4">
          {/* Top Status & Telemetry Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e3d9] dark:border-[#25304b] pb-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Pulsing Live Beacon */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider font-bold">Live Research In Progress</span>
              </div>

              {/* Model Chip */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-hover)] border border-[#e8e3d9] dark:border-[#303b58] text-[11px] font-medium text-[var(--text)]">
                <Sparkles className="h-3 w-3 text-[#765ecb] dark:text-[#c6c2fa]" />
                <span className="font-semibold">{selectedModelName}</span>
              </span>

              {/* Concurrency Mode */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-hover)] border border-[#e8e3d9] dark:border-[#303b58] text-[11px] font-mono text-[var(--text-muted)] hidden md:inline-flex">
                <Zap className="h-3 w-3 text-[#167c75] dark:text-[#12B9D5]" />
                <span>Parallel Wave Execution</span>
              </span>

              {/* Adversarial Quality Gate */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-hover)] border border-[#e8e3d9] dark:border-[#303b58] text-[11px] font-mono text-[var(--text-muted)] hidden lg:inline-flex">
                <ShieldCheck className="h-3 w-3 text-[#a86724] dark:text-[#F3B765]" />
                <span>Critic Gate: ≥ 0.70</span>
              </span>
            </div>

            {/* Right Action: Live Clock + Stop Button */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--surface-hover)] border border-[#e8e3d9] dark:border-[#303b58] text-xs font-mono font-bold text-[var(--text)] shadow-xs">
                <Clock className="h-3.5 w-3.5 text-[#a86724] dark:text-[#F3B765] animate-pulse" />
                <span className="tabular-nums tracking-wider">{formatClock(elapsedSeconds)}</span>
              </div>

              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="Stop active research"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          </div>

          {/* Active Question Title */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono mb-1">
              Active Research Inquiry
            </div>
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-[var(--text)] leading-snug">
              {task}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1.5 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#765ecb] dark:bg-[#c6c2fa] animate-ping" />
              <span>{getStageNarrative()}</span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. MULTI-AGENT ORCHESTRATION PIPELINE STEPPER */}
      <section className="cockpit-stepper-card rounded-2xl border border-[#d5ccbc] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#121929] p-4 sm:p-5 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#765ecb] dark:text-[#c6c2fa]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] font-mono">
              Multi-Agent Orchestration Lifecycle
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Stage {Math.min(currentIndex + 1, 5)} of 5 · {completedStepsCount}/{totalStepsCount} Steps Verified
          </span>
        </div>

        {/* 5 Connected Pipeline Stations */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {STAGES.map((stg, idx) => {
            const isPassed = currentIndex > idx || currentStage === "COMPLETED";
            const isCurrent = currentIndex === idx && currentStage !== "COMPLETED";
            const StgIcon = stg.icon;

            return (
              <div
                key={stg.id}
                className={`relative p-3.5 rounded-xl border text-xs transition-all flex flex-col justify-between ${
                  isCurrent
                    ? "bg-[#765ecb]/10 dark:bg-[#765ecb]/20 border-[#765ecb] dark:border-[#c6c2fa] shadow-md ring-2 ring-[#765ecb]/25"
                    : isPassed
                    ? "bg-[var(--surface-hover)] border-[#e8e3d9] dark:border-[#25304b] text-[var(--text)]"
                    : "bg-[var(--bg)]/40 border-dashed border-[#e8e3d9] dark:border-[#25304b] opacity-60 text-[var(--text-muted)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-[var(--text-muted)]">
                      #{stg.num}
                    </span>
                    {isPassed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : isCurrent ? (
                      <CircleDashed className="h-4 w-4 text-[#765ecb] dark:text-[#c6c2fa] animate-spin" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text)]">
                    <StgIcon className="h-3.5 w-3.5 shrink-0" style={{ color: stg.accentColor }} />
                    <span className="truncate">{stg.name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 font-semibold truncate">
                    {stg.agent}
                  </div>
                </div>

                <div className="text-[10px] text-[var(--text-muted)] mt-2 line-clamp-2 leading-relaxed">
                  {stg.desc}
                </div>

                {isCurrent && (
                  <div className="mt-2.5 pt-2 border-t border-[#765ecb]/30 flex items-center gap-1.5 text-[10px] font-mono text-[#765ecb] dark:text-[#c6c2fa] font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#765ecb] dark:bg-[#c6c2fa] animate-ping" />
                    <span>Active Now</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. DYNAMIC TWO-COLUMN COCKPIT (Fills the entire remaining screen) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: TOPOLOGICAL EXECUTION PLAN & LIVE TELEMETRY LOG (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          {/* A. Planned DAG Steps Card */}
          <section className="rounded-2xl border border-[#d5ccbc] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#121929] shadow-md p-5">
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#e8e3d9] dark:border-[#25304b]">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-[#765ecb] dark:text-[#c6c2fa]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] font-mono">
                  Topological Execution Graph ({planSteps.length || "Planning..."})
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {completedStepsCount} passed
                </span>
                <span>/</span>
                <span>{planSteps.length || "?"} steps</span>
              </div>
            </div>

            {/* If still in planning and no steps available yet */}
            {planSteps.length === 0 ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-3 bg-[var(--surface-hover)]/50 rounded-xl border border-dashed border-[#e8e3d9] dark:border-[#25304b]">
                <div className="h-10 w-10 rounded-2xl bg-[#765ecb]/15 border border-[#765ecb]/30 flex items-center justify-center text-[#765ecb] dark:text-[#c6c2fa] animate-pulse">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h4 className="text-xs font-bold text-[var(--text)]">
                    Generating Topological Plan &amp; Dependency Matrix...
                  </h4>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    The Planner Agent is deconstructing your question into parallel execution waves with strict acyclicity verification.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-[#765ecb] dark:text-[#c6c2fa]">
                  <CircleDashed className="h-3 w-3 animate-spin" />
                  <span>Calculating DAG dependencies...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {planSteps.map((step, idx) => {
                  const out = stepOutputs[step.step_id];
                  const status = out?.status || step.status || "PENDING";
                  const isDone = status === "PASSED";
                  const isExec = status === "EXECUTING" || (currentStage === "RESEARCHING" && idx === completedStepsCount);

                  return (
                    <div
                      key={step.step_id}
                      onClick={() => setSelectedStepId(selectedStepId === step.step_id ? null : step.step_id)}
                      className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                        isExec
                          ? "bg-[#167c75]/10 dark:bg-[#167c75]/20 border-[#167c75] dark:border-[#12B9D5] shadow-sm ring-1 ring-[#167c75]/30"
                          : isDone
                          ? "bg-[var(--surface-hover)] border-[#e8e3d9] dark:border-[#25304b]"
                          : "bg-[var(--bg)]/50 border-[#e8e3d9] dark:border-[#25304b] opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[#e8e3d9] dark:border-[#303b58] text-[var(--text)]">
                              Step {idx + 1}
                            </span>
                            <span className="font-bold text-xs text-[var(--text)] truncate">
                              {step.title}
                            </span>
                          </div>

                          <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                            {step.description}
                          </p>

                          {step.dependencies && step.dependencies.length > 0 ? (
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-muted)] pt-0.5">
                              <span className="text-[var(--text-faint)]">Depends on:</span>
                              <span className="text-[#765ecb] dark:text-[#c6c2fa] font-bold">
                                {step.dependencies.join(", ")}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold pt-0.5">
                              Independent step · Wave 1 (Concurrent)
                            </div>
                          )}
                        </div>

                        {/* Status Chip */}
                        <div className="shrink-0">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                              <Check className="h-3 w-3" />
                              <span>Passed</span>
                            </span>
                          ) : isExec ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#167c75]/15 border border-[#167c75]/40 text-[#167c75] dark:text-[#12B9D5] font-mono text-[10px] font-bold uppercase tracking-wider">
                              <CircleDashed className="h-3 w-3 animate-spin" />
                              <span>Executing</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-hover)] border border-[#e8e3d9] dark:border-[#303b58] text-[var(--text-muted)] font-mono text-[10px]">
                              Queued
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Live Target Search Query Tag if active */}
                      {step.search_query && (
                        <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex items-center gap-1.5 text-[11px] text-[#167c75] dark:text-[#12B9D5] font-mono bg-[var(--surface)] px-2.5 py-1.5 rounded-lg border">
                          <Search className="h-3 w-3 shrink-0" />
                          <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Target Query:</span>
                          <span className="truncate font-medium">&quot;{step.search_query}&quot;</span>
                        </div>
                      )}

                      {/* Expanded Key Findings if Passed */}
                      {isDone && out?.key_findings && out.key_findings.length > 0 && selectedStepId === step.step_id && (
                        <div className="mt-3 pt-2.5 border-t border-[var(--border)] space-y-1.5 bg-[var(--surface)] p-2.5 rounded-lg">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
                            Verified Deliverable Findings:
                          </div>
                          <ul className="space-y-1 text-[11px] text-[var(--text)]">
                            {out.key_findings.map((f, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-1.5">
                                <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* B. Live Agent Telemetry Stream (AI Console) */}
          <section className="rounded-2xl border border-[#d5ccbc] dark:border-[#303b58] bg-[#0c1120] text-zinc-100 shadow-md p-5 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#12B9D5]" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-100">
                  Live Agent Reasoning &amp; Telemetry Stream
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SSE Stream Active</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {activities.length} events
                </span>
              </div>
            </div>

            {/* Scrollable Event Feed */}
            <div className="h-56 overflow-y-auto space-y-2 pr-1 font-mono text-[11px] text-zinc-300 no-scrollbar">
              {activities.length === 0 ? (
                <div className="py-10 text-center text-zinc-500 text-xs italic">
                  Initializing live event stream from FastAPI Orchestrator...
                </div>
              ) : (
                activities.map((act) => {
                  const timeFormatted = act.timestamp
                    ? new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                    : "00:00:00";
                  const agentTag = (act.agent || act.type || "SYSTEM").toUpperCase();

                  return (
                    <div
                      key={act.id}
                      className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-start gap-2.5 leading-relaxed"
                    >
                      <span className="text-[10px] text-zinc-500 shrink-0 pt-0.5">
                        {timeFormatted}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold shrink-0 ${getAgentColor(agentTag)}`}>
                        [{agentTag}]
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-zinc-200 break-words">{act.message}</p>
                        {act.query && (
                          <div className="mt-1 text-[10px] text-[#12B9D5] truncate">
                            Query: &quot;{act.query}&quot;
                          </div>
                        )}
                        {act.domains && act.domains.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] text-zinc-500">Domains:</span>
                            {act.domains.slice(0, 4).map((d, dIdx) => (
                              <span key={dIdx} className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
                                {d}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={terminalBottomRef} />
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: EVIDENCE GROUNDING HUB & TELEMETRY HUD (5 COLS) */}
        <div className="lg:col-span-5 space-y-5">
          {/* A. Verified Grounded Sources Card */}
          <section className="rounded-2xl border border-[#d5ccbc] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#121929] shadow-md p-5">
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#e8e3d9] dark:border-[#25304b]">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#167c75] dark:text-[#12B9D5]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] font-mono">
                  Verified Grounded Sources
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#167c75]/10 border border-[#167c75]/30 text-[#167c75] dark:text-[#12B9D5] text-[10px] font-mono font-bold">
                {sources.length} sources
              </span>
            </div>

            {/* Discovered Sources List */}
            {sources.length === 0 ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-2.5 bg-[var(--surface-hover)]/50 rounded-xl border border-dashed border-[#e8e3d9] dark:border-[#25304b]">
                <Globe className="h-8 w-8 text-[#167c75] dark:text-[#12B9D5] animate-pulse opacity-70" />
                <p className="text-xs font-semibold text-[var(--text)]">
                  Live Evidence Grounding Active
                </p>
                <p className="text-[11px] text-[var(--text-muted)] max-w-xs leading-relaxed">
                  As the Executor Agent queries DuckDuckGo Lite and official portals, verified citations and factual snippets will stream here in real time.
                </p>
                {activeSearchQuery && (
                  <div className="mt-1 px-3 py-1 rounded-lg bg-[var(--surface)] border border-[#e8e3d9] dark:border-[#303b58] text-[10px] font-mono text-[#167c75] dark:text-[#12B9D5] truncate max-w-full">
                    Searching: &quot;{activeSearchQuery}&quot;
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                {sources.map((src, idx) => (
                  <a
                    key={src.url || idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block p-3 rounded-xl border border-[#e8e3d9] dark:border-[#25304b] bg-[var(--surface)] hover:border-[#167c75] dark:hover:border-[#12B9D5] transition-all shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#167c75]/10 text-[#167c75] dark:text-[#12B9D5] border border-[#167c75]/25 truncate max-w-[170px]">
                        {src.domain || "Web Source"}
                      </span>
                      <ExternalLink className="h-3 w-3 text-[var(--text-muted)] group-hover:text-[#167c75] dark:group-hover:text-[#12B9D5] transition-colors" />
                    </div>
                    <h4 className="text-xs font-bold text-[var(--text)] line-clamp-2 group-hover:text-[#167c75] dark:group-hover:text-[#12B9D5] transition-colors">
                      {src.title}
                    </h4>
                    {src.snippet && (
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-1 italic border-l-2 border-[#167c75]/30 pl-2 leading-relaxed">
                        &quot;{src.snippet}&quot;
                      </p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* B. Live Telemetry & Metric HUD */}
          <section className="rounded-2xl border border-[#d5ccbc] dark:border-[#303b58] bg-[#ffffff] dark:bg-[#121929] shadow-md p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#e8e3d9] dark:border-[#25304b]">
              <Cpu className="h-4 w-4 text-[#765ecb] dark:text-[#c6c2fa]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] font-mono">
                System Telemetry &amp; Quotas
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[var(--surface-hover)] border border-[#e8e3d9] dark:border-[#25304b]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Execution Clock
                </div>
                <div className="text-base font-mono font-bold text-[var(--text)] mt-0.5 tabular-nums">
                  {formatClock(elapsedSeconds)}
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">Continuous runtime</div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-hover)] border border-[#e8e3d9] dark:border-[#25304b]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Tokens Ingested
                </div>
                <div className="text-base font-mono font-bold text-[var(--text)] mt-0.5 tabular-nums">
                  {totalTokens ? totalTokens.toLocaleString() : "Streaming..."}
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">Gemini 2.5 context</div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-hover)] border border-[#e8e3d9] dark:border-[#25304b]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Est. Cost
                </div>
                <div className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                  ${estimatedCostUsd.toFixed(5)}
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">USD inference rate</div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-hover)] border border-[#e8e3d9] dark:border-[#25304b]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                  Adversarial Gate
                </div>
                <div className="text-base font-mono font-bold text-[#a86724] dark:text-[#F3B765] mt-0.5">
                  PASS ≥ 0.70
                </div>
                <div className="text-[9px] text-[var(--text-muted)] mt-0.5">Critic threshold</div>
              </div>
            </div>
          </section>

          {/* C. Triad Agent Roster */}
          <section className="rounded-2xl border border-[#d5ccbc] dark:border-[#303b58] bg-[var(--surface-hover)] p-4 text-xs space-y-2">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Active Multi-Agent Ensembles
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[#e8e3d9] dark:border-[#25304b]">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#765ecb]" />
                  <span className="font-bold text-[11px] text-[var(--text)]">Planner Agent</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Acyclic DAG Decomposition</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[#e8e3d9] dark:border-[#25304b]">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#167c75]" />
                  <span className="font-bold text-[11px] text-[var(--text)]">Executor Agent</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Concurrent Web Search</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface)] border border-[#e8e3d9] dark:border-[#25304b]">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#a86724]" />
                  <span className="font-bold text-[11px] text-[var(--text)]">Critic Agent</span>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Adversarial Verification</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

