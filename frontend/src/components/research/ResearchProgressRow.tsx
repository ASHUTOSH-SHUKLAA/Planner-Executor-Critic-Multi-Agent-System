"use client";

import React from "react";
import { Loader2, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, RotateCcw } from "lucide-react";
import { formatDuration } from "@/lib/research-view-model";

interface ResearchProgressRowProps {
  phase: "planning" | "researching" | "reviewing" | "refining" | "synthesizing" | "complete" | "stopped" | "error";
  statusText: string;
  elapsedSeconds: number;
  sourcesCount: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  hasSteps: boolean;
}

export function ResearchProgressRow({
  phase,
  statusText,
  elapsedSeconds,
  sourcesCount,
  isExpanded,
  onToggleExpanded,
  hasSteps,
}: ResearchProgressRowProps) {
  const isRunning =
    phase === "planning" ||
    phase === "researching" ||
    phase === "reviewing" ||
    phase === "refining" ||
    phase === "synthesizing";

  const isComplete = phase === "complete";
  const isStopped = phase === "stopped";
  const isError = phase === "error";

  // Clean status text so no sources mentions/counts appear below inquiry card
  const cleanStatusText = isComplete
    ? statusText.replace(/^Researched \d+ sources? in /, "Research completed in ")
    : statusText
        .replace(/ · \d+ sources?$/, "")
        .replace(/ · \d+ source$/, "");

  return (
    <div
      onClick={hasSteps ? onToggleExpanded : undefined}
      role={hasSteps ? "button" : undefined}
      tabIndex={hasSteps ? 0 : undefined}
      aria-expanded={hasSteps ? isExpanded : undefined}
      onKeyDown={(e) => {
        if (hasSteps && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggleExpanded();
        }
      }}
      className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-all ${hasSteps ? "cursor-pointer hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)]" : ""
        } ${isComplete ? "shadow-2xs" : ""}`}
      data-testid="research-progress-row"
    >
      {/* Left side: Animated glyph + plain language status */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {isRunning && (
          <span
            className="relative inline-flex items-center justify-center h-4 w-4 shrink-0 text-[var(--accent)] animate-spin"
            style={{ animation: "spin 1s linear infinite", transformOrigin: "center center" }}
          >
            <Loader2
              className="h-4 w-4 shrink-0"
              style={{ animation: "spin 1s linear infinite", transformOrigin: "center center" }}
              aria-hidden="true"
            />
          </span>
        )}
        {isComplete && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
        )}
        {isStopped && (
          <RotateCcw className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
        )}
        {isError && (
          <AlertCircle className="h-4 w-4 shrink-0 text-[var(--danger)]" />
        )}

        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="text-[14px] sm:text-[14.5px] font-medium text-[var(--text)] truncate transition-all duration-200">
            {cleanStatusText}
          </span>
        </div>
      </div>

      {/* Right side: Elapsed time + Toggle steps affordance */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-xs text-[var(--text-muted)] tracking-tight">
          {formatDuration(elapsedSeconds, "clock")}
        </span>

        {hasSteps && (
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
            <span className="hidden sm:inline font-sans">
              {isExpanded ? "Hide steps" : "Show steps"}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

