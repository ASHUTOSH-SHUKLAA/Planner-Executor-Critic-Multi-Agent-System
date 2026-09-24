"use client";

import React, { useEffect, useState } from "react";
import { WorkflowStateData } from "@/lib/api";
import {
  Clock,
  Zap,
  Coins,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
  FileText,
} from "lucide-react";

interface TelemetryBarProps {
  state: WorkflowStateData | null;
  isRunning: boolean;
  mode: "sequential" | "parallel";
  onViewSynthesis?: () => void;
}

export function TelemetryBar({
  state,
  isRunning,
  mode,
  onViewSynthesis,
}: TelemetryBarProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      const startTime = Date.now() - elapsedSeconds * 1000;
      timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  // Reset timer on new run initiation
  useEffect(() => {
    if (state?.status === "PLANNING") {
      setElapsedSeconds(0);
    }
  }, [state?.status]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = () => {
    if (!state) return null;
    switch (state.status) {
      case "COMPLETED":
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Completed</span>
          </span>
        );
      case "FAILED":
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Failed</span>
          </span>
        );
      case "REPLANNING":
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Re-planning</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-300 dark:border-indigo-500/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            <span>{state.status}</span>
          </span>
        );
    }
  };

  const stepCount = state?.plan?.steps.length || 0;
  const completedSteps = state
    ? Object.values(state.step_outputs).filter((s) => s.status === "PASSED").length
    : 0;

  const totalTokens = state?.total_tokens || state?.telemetry?.total_tokens || 0;
  const estimatedCost = state?.estimated_cost_usd || state?.telemetry?.estimated_cost_usd || 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 text-xs transition-colors">
      {/* Left: Status & Mode */}
      <div className="flex items-center gap-2.5">
        {state ? (
          getStatusBadge()
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500 font-mono">System Idle</span>
        )}
        <span className="rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
          Engine: <strong className="text-zinc-900 dark:text-zinc-200 uppercase">{mode}</strong>
        </span>
        {stepCount > 0 && (
          <span className="font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
            Steps: <strong className="text-zinc-900 dark:text-white">{completedSteps}</strong> / {stepCount}
          </span>
        )}
      </div>

      {/* Right: Telemetry & Synthesis shortcut */}
      <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 font-mono">
        <div className="flex items-center gap-1.5" title="Elapsed wall-clock time">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>

        <div className="flex items-center gap-1.5" title="Total Tokens Consumed">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span>{totalTokens.toLocaleString()} tokens</span>
        </div>

        <div className="flex items-center gap-1.5" title="Estimated Inference Cost">
          <Coins className="h-3.5 w-3.5 text-emerald-500" />
          <span>${estimatedCost.toFixed(5)}</span>
        </div>

        {state && (state.replan_count ?? 0) > 0 && (
          <div className="flex items-center gap-1 text-amber-500" title="Dynamic Re-plans Triggered">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Replans: {state.replan_count}</span>
          </div>
        )}

        {onViewSynthesis && (
          <button
            onClick={onViewSynthesis}
            className="flex items-center gap-1 text-[11px] font-sans font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pl-2 border-l border-zinc-200 dark:border-zinc-800"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Synthesis Report</span>
          </button>
        )}
      </div>
    </div>
  );
}
