"use client";

import React from "react";
import { Circle, Loader2, CheckCircle2, RotateCw, ArrowRight } from "lucide-react";
import { ResearchStepItem } from "@/lib/research-view-model";

interface StepsChecklistProps {
  steps: ResearchStepItem[];
}

export function StepsChecklist({ steps }: StepsChecklistProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-200"
      data-testid="steps-checklist"
    >
      <div className="space-y-2.5">
        {steps.map((step) => {
          const isPending = step.status === "pending";
          const isRunning = step.status === "running" || step.status === "active";
          const isCompleted = step.status === "completed" || step.status === "passed";
          const isRetrying = step.status === "retrying";
          const currentSearch = step.activeQuery || step.currentQuery;

          return (
            <div
              key={step.id}
              className="flex items-start gap-3 text-xs sm:text-[13.5px] leading-snug group"
            >
              {/* Status Icon */}
              <div className="pt-0.5 shrink-0">
                {isPending && (
                  <Circle className="h-4 w-4 text-[var(--border-strong)]" strokeWidth={1.5} />
                )}
                {isRunning && (
                  <Loader2
                    className="h-4 w-4 text-[var(--accent)] animate-spin"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                )}
                {isCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-[var(--success)]" strokeWidth={2} />
                )}
                {isRetrying && (
                  <RotateCw
                    className="h-4 w-4 text-[var(--warning)] animate-spin"
                    style={{ animation: "spin 1s linear infinite" }}
                    strokeWidth={2}
                  />
                )}
              </div>

              {/* Title & dynamic plain message */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <span
                  className={`font-medium ${
                    isCompleted
                      ? "text-[var(--text-muted)] line-through/20"
                      : isRunning
                      ? "text-[var(--text)] font-semibold"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {step.title}
                </span>

                {/* Active search or executing message */}
                {isRunning && currentSearch && (
                  <p className="text-[12px] text-[var(--text-muted)] font-mono truncate">
                    Searching: {currentSearch}
                  </p>
                )}

                {/* Critic note if rejected / gap found */}
                {step.criticNote && (
                  <p className="text-[12px] text-[var(--warning)] font-medium">
                    {step.criticNote}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
