"use client";

import React from "react";

export function AnswerSkeleton() {
  return (
    <div
      className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 space-y-4 shadow-xs"
      data-testid="answer-skeleton"
      aria-label="Generating answer"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="h-4 w-28 rounded-md bg-[var(--surface-hover)] animate-pulse" />
      </div>

      <div className="space-y-3">
        <div className="h-4 w-full rounded-md bg-[var(--surface-hover)] animate-pulse" />
        <div className="h-4 w-[92%] rounded-md bg-[var(--surface-hover)] animate-pulse" />
        <div className="h-4 w-[78%] rounded-md bg-[var(--surface-hover)] animate-pulse" />
        <div className="h-4 w-[60%] rounded-md bg-[var(--surface-hover)] animate-pulse" />
      </div>

      <div className="pt-2 flex items-center gap-2">
        <div className="h-3.5 w-20 rounded-md bg-[var(--surface-hover)] animate-pulse" />
        <div className="h-3.5 w-16 rounded-md bg-[var(--surface-hover)] animate-pulse" />
      </div>
    </div>
  );
}

