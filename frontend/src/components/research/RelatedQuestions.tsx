"use client";

import React, { useState, useEffect } from "react";
import { CornerDownRight, Sparkles, Loader2 } from "lucide-react";

interface RelatedQuestionsProps {
  questions: string[];
  onSelectQuestion: (question: string) => void;
  disabled?: boolean;
}

export function RelatedQuestions({
  questions,
  onSelectQuestion,
  disabled = false,
}: RelatedQuestionsProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  useEffect(() => {
    if (!disabled) {
      setSelectedQuestion(null);
    }
  }, [disabled]);

  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div
      className="space-y-3 pt-6 border-t border-[var(--border)]"
      data-testid="related-questions-section"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--accent)]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Related
        </h3>
      </div>

      <div className="space-y-2">
        {questions.map((promptText, idx) => {
          const isSelected = disabled && selectedQuestion === promptText;
          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSelectedQuestion(promptText);
                onSelectQuestion(promptText);
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] text-left text-xs sm:text-[13.5px] font-medium text-[var(--text)] transition-all shadow-2xs group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {isSelected ? (
                  <Loader2
                    className="h-3.5 w-3.5 text-[var(--accent)] animate-spin shrink-0"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                ) : (
                  <CornerDownRight className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                )}
                <span
                  className={`line-clamp-1 transition-colors ${
                    isSelected
                      ? "text-[var(--accent)] font-semibold"
                      : "group-hover:text-[var(--accent)]"
                  }`}
                >
                  {promptText}
                </span>
              </div>
              <span className="text-[11px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {isSelected ? "Researching…" : "Ask ↵"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

