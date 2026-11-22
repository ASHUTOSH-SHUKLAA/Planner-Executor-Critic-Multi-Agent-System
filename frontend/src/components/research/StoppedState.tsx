"use client";

import React from "react";
import { AlertCircle, RotateCw, Pencil } from "lucide-react";

interface StoppedStateProps {
  onEditQuestion: () => void;
  onRerun: () => void;
}

export function StoppedState({ onEditQuestion, onRerun }: StoppedStateProps) {
  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
      data-testid="research-stopped-state"
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-[var(--surface-hover)] flex items-center justify-center shrink-0">
          <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--text)]">
            Research stopped
          </h4>
          <p className="text-xs text-[var(--text-muted)]">
            Edit your question or try again. Partial findings remain available.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <button
          type="button"
          onClick={onEditQuestion}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-medium text-[var(--text)] transition-colors cursor-pointer"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span>Edit question</span>
        </button>
        <button
          type="button"
          onClick={onRerun}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 text-xs font-semibold transition-opacity cursor-pointer"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>Run again</span>
        </button>
      </div>
    </div>
  );
}

