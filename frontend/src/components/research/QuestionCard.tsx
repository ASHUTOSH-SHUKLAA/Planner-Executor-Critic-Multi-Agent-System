"use client";

import React, { useState } from "react";
import { Copy, Check, Pencil, RotateCw, Square } from "lucide-react";

interface QuestionCardProps {
  question: string;
  onEdit?: (newQuestion: string) => void;
  onRerun?: (question: string) => void;
  isReadOnly?: boolean;
  isRunning?: boolean;
  onStop?: () => void;
}

export function QuestionCard({
  question,
  onEdit,
  onRerun,
  isReadOnly = false,
  isRunning = false,
  onStop,
}: QuestionCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(question);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(question);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  };

  const handleSaveEdit = () => {
    if (draft.trim() && onEdit) {
      onEdit(draft.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className="group relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs transition-colors hover:border-[var(--border-strong)]"
      data-testid="research-question-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium tracking-wide uppercase text-[var(--text-muted)] block mb-1.5 font-sans">
            Research inquiry
          </span>
          {isEditing ? (
            <div className="space-y-2 mt-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-2.5 text-[15px] sm:text-[16px] text-[var(--text)] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Save &amp; Research
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(question);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h2 className="text-[16px] sm:text-[17px] font-semibold text-[var(--text)] leading-snug sm:leading-relaxed tracking-tight">
              {question}
            </h2>
          )}
        </div>

        {/* Hover / Focus Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
            {isRunning && onStop && (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-all cursor-pointer shadow-2xs mr-1 opacity-100"
                title="Stop research"
                aria-label="Stop research"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Stop research</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              title="Copy inquiry"
              aria-label="Copy inquiry"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[var(--success)]" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            {!isReadOnly && onEdit && (
              <button
                type="button"
                onClick={() => {
                  setDraft(question);
                  setIsEditing(true);
                }}
                title="Edit inquiry"
                aria-label="Edit inquiry"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {!isReadOnly && onRerun && (
              <button
                type="button"
                onClick={() => onRerun(question)}
                title="Re-run research"
                aria-label="Re-run research"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

