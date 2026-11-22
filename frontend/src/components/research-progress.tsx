"use client";

import React, { useState } from "react";
import {
  Globe,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  CircleDashed,
  GitBranch,
  ShieldCheck,
  RefreshCw,
  FileText,
  Search,
  AlertCircle,
} from "lucide-react";
import { PlanStepData, StepOutputData } from "@/lib/api";

interface ResearchProgressProps {
  currentStage: "IDLE" | "PLANNING" | "RESEARCHING" | "VALIDATING" | "SYNTHESIZING" | "COMPLETED" | "FAILED";
  planSteps?: PlanStepData[];
  stepOutputs?: Record<string, StepOutputData>;
  sourcesCount: number;
  searchedDomains: string[];
  activeSearchQuery?: string | null;
  elapsedSeconds: number;
  isRunning: boolean;
}

export function ResearchProgress({
  currentStage,
  planSteps = [],
  stepOutputs = {},
  sourcesCount,
  searchedDomains,
  activeSearchQuery,
  elapsedSeconds,
  isRunning,
}: ResearchProgressProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // The 5 core multi-agent stages
  const STAGES = [
    {
      id: "planning",
      name: "Planning",
      desc: "Decomposing question into structured research steps",
      owner: "Planner",
      ownerClass: "planner-owner",
      icon: GitBranch,
      stageKey: "PLANNING",
    },
    {
      id: "researching",
      name: "Researching",
      desc: "Executing web queries and gathering factual evidence",
      owner: "Executor",
      ownerClass: "executor-owner",
      icon: Search,
      stageKey: "RESEARCHING",
    },
    {
      id: "reviewing",
      name: "Reviewing",
      desc: "Critic verifying factual correctness and source relevance",
      owner: "Critic",
      ownerClass: "critic-owner",
      icon: ShieldCheck,
      stageKey: "VALIDATING",
    },
    {
      id: "refining",
      name: "Refining",
      desc: "Self-healing re-planning and bounded retries",
      owner: "Critic · Planner",
      ownerClass: "critic-owner",
      icon: RefreshCw,
      stageKey: "REFINING",
    },
    {
      id: "synthesizing",
      name: "Synthesizing",
      desc: "Compiling grounded, long-form research deliverable",
      owner: "Executor · Writer",
      ownerClass: "executor-owner",
      icon: FileText,
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

  const getStatusSummary = () => {
    if (activeSearchQuery) {
      return `Searching: "${activeSearchQuery}"`;
    }
    switch (currentStage) {
      case "PLANNING":
        return "Decomposing research objective into multi-axis plan...";
      case "RESEARCHING":
        return `Gathering live evidence across ${searchedDomains.length || 1} domains...`;
      case "VALIDATING":
        return "Auditing claims against retrieved evidence...";
      case "SYNTHESIZING":
        return "Synthesizing publication-grade report with citations...";
      case "COMPLETED":
        return "Research synthesis verified and complete.";
      case "FAILED":
        return "Research workflow halted.";
      default:
        return "Initializing autonomous research...";
    }
  };

  if (currentStage === "IDLE") return null;

  return (
    <div className="progress-orchestration w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-md backdrop-blur-md transition-all overflow-hidden">
      {/* Compact Main Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
            {isRunning ? (
              <CircleDashed className="h-5 w-5 animate-spin" />
            ) : currentStage === "COMPLETED" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-500" />
            )}
            {isRunning && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-hover)] text-[var(--text)] font-mono border border-[var(--border)]">
                {currentStage === "COMPLETED"
                  ? "Completed"
                  : `Stage ${Math.min(currentIndex + 1, 5)}/5: ${STAGES[Math.min(currentIndex, 4)].name}`}
              </span>
              {isRunning && (
                <span className="text-xs text-[var(--text-muted)] font-mono hidden sm:inline">
                  • {completedStepsCount}/{totalStepsCount} steps
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-[var(--text)] truncate mt-1">
              {getStatusSummary()}
            </p>
          </div>
        </div>

        {/* Right Metadata & Expand Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-mono">
            {sourcesCount > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)]">
                <Globe className="h-3.5 w-3.5 text-[#167c75] dark:text-[#12B9D5]" />
                <span className="font-semibold text-[var(--text)]">{sourcesCount}</span>
                <span>sources</span>
              </span>
            )}
            {elapsedSeconds > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)]">
                <Clock className="h-3.5 w-3.5 text-[#a86724] dark:text-[#F3B765]" />
                <span className="tabular-nums font-bold text-[var(--text)]">
                  {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, "0")}
                </span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[var(--surface-hover)] border border-[var(--border)] text-xs font-semibold text-[var(--text)] transition-colors cursor-pointer shadow-2xs"
          >
            <span>{isExpanded ? "Hide Details" : "Inspect Progress"}</span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Live Discovered Sources Domain Pills */}
      {searchedDomains.length > 0 && (
        <div className="px-5 pb-3 flex items-center flex-wrap gap-1.5 border-t border-[var(--border)] pt-2.5">
          <span className="text-[11px] text-[var(--text-muted)] font-medium mr-1">
            Grounded from:
          </span>
          {searchedDomains.slice(0, 7).map((dom, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--surface-hover)] text-[10px] font-mono text-[var(--text)] border border-[var(--border)]"
            >
              <Globe className="h-2.5 w-2.5 text-[#167c75] dark:text-[#12B9D5] shrink-0" />
              <span className="truncate max-w-[130px]">{dom}</span>
            </span>
          ))}
          {searchedDomains.length > 7 && (
            <span className="text-[10px] text-[var(--text-muted)] font-mono">
              +{searchedDomains.length - 7} more
            </span>
          )}
        </div>
      )}

      {/* Expanded Multi-Agent Workflow Details */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-hover)]/40 p-5 space-y-5 animate-in slide-in-from-top-2 duration-150">
          {/* 5-Stage Visual Stepper */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono mb-3">
              Multi-Agent Orchestration Lifecycle
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {STAGES.map((stg, idx) => {
                const isPassed = currentIndex > idx || currentStage === "COMPLETED";
                const isCurrent = currentIndex === idx && currentStage !== "COMPLETED";
                const StgIcon = stg.icon;

                return (
                  <div
                    key={stg.id}
                    className={`stage-tile p-3 rounded-xl border text-xs transition-all ${
                      isCurrent
                        ? "bg-[#765ecb]/10 dark:bg-[#765ecb]/20 border-[#765ecb] dark:border-[#c6c2fa] text-[var(--text)] shadow-sm ring-1 ring-[#765ecb]/30"
                        : isPassed
                        ? "bg-[var(--surface)] border-[var(--border)] text-[var(--text)]"
                        : "bg-[var(--bg)]/40 border-dashed border-[var(--border)] text-[var(--text-muted)] opacity-70"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <StgIcon
                        className={`h-4 w-4 ${
                          isCurrent
                            ? "text-[#765ecb] dark:text-[#c6c2fa] animate-pulse"
                            : isPassed
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-[var(--text-muted)]"
                        }`}
                      />
                      {isPassed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : isCurrent ? (
                        <CircleDashed className="h-3.5 w-3.5 text-[#765ecb] dark:text-[#c6c2fa] animate-spin" />
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          #{idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-[11px] truncate text-[var(--text)]">{stg.name}</div>
                    <div className={`stage-owner ${stg.ownerClass}`}>{stg.owner}</div>
                    <div className="text-[10px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-snug">
                      {stg.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discrete Planned DAG Steps */}
          {planSteps.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono mb-2.5">
                Topological Execution Steps ({planSteps.length})
              </div>
              <div className="plan-timeline space-y-2 pr-1">
                {planSteps.map((step) => {
                  const out = stepOutputs[step.step_id];
                  const status = out?.status || step.status || "PENDING";
                  const isDone = status === "PASSED";
                  const isExec = status === "EXECUTING";

                  return (
                    <div
                      key={step.step_id}
                      className={`plan-step-card p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-start justify-between gap-3 text-xs ${isExec ? "plan-step-active ring-1 ring-[#167c75]/30" : ""}`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[var(--text-muted)] font-semibold">
                            [{step.step_id}]
                          </span>
                          <span className="font-semibold text-[var(--text)] truncate">
                            {step.title}
                          </span>
                        </div>
                        {step.search_query && (
                          <p className="text-[11px] text-[#626b82] dark:text-[#a9b2c6] truncate">
                            Query: &quot;{step.search_query}&quot;
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider font-mono ${
                          isDone
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                            : isExec
                            ? "bg-[#167c75]/15 text-[#167c75] dark:text-[#12B9D5] border border-[#167c75]/40 animate-pulse"
                            : "bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]"
                        }`}
                      >
                        {isDone ? "Passed" : isExec ? "Executing" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
