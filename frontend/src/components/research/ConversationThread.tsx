"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Globe,
  Loader2,
  AlertCircle,
  CornerDownRight,
} from "lucide-react";
import { SourceCitation } from "@/lib/api";
import { AnswerBody } from "./AnswerBody";
import { extractDomain, getFaviconUrl } from "@/lib/research-view-model";

export interface ThreadTurnItem {
  id: string;
  query: string;
  answer: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  sources?: SourceCitation[];
  suggested_questions?: string[];
  timestamp: string;
}

interface ConversationThreadProps {
  turns: ThreadTurnItem[];
  onSelectQuestion?: (question: string) => void;
  disabled?: boolean;
}

export function ConversationThread({
  turns,
  onSelectQuestion,
  disabled = false,
}: ConversationThreadProps) {
  // Store expanded state for previous turns. The last turn is always expanded by default.
  const [expandedTurns, setExpandedTurns] = useState<Record<string, boolean>>({});
  const activeTurnRef = useRef<HTMLDivElement | null>(null);
  const isInitialMountRef = useRef(true);
  const prevTurnsLengthRef = useRef(turns?.length ?? 0);

  // Auto-scroll ONLY when a new turn is dynamically added during an active session
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevTurnsLengthRef.current = turns?.length ?? 0;
      return;
    }

    if (turns && turns.length > prevTurnsLengthRef.current) {
      prevTurnsLengthRef.current = turns.length;
      const scrollTimer = setTimeout(() => {
        if (activeTurnRef.current) {
          activeTurnRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 50);
      return () => clearTimeout(scrollTimer);
    } else {
      prevTurnsLengthRef.current = turns?.length ?? 0;
    }
  }, [turns?.length]);

  if (!turns || turns.length === 0) {
    return null;
  }

  const toggleTurn = (id: string) => {
    setExpandedTurns((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div
      className="space-y-4 pt-6 border-t border-[var(--border)]"
      data-testid="conversation-thread"
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Follow-Up Inquiries ({turns.length})
        </h3>
      </div>

      <div className="space-y-4">
        {turns.map((turn, idx) => {
          const isLast = idx === turns.length - 1;
          const isExpanded = expandedTurns[turn.id] ?? isLast;
          const sourcesCount = turn.sources?.length || 0;

          // Convert sources to SourceItem shape for AnswerBody
          const mappedSources = (turn.sources || []).map((s, sIdx) => {
            const domain = s.domain || extractDomain(s.url);
            return {
              id: `${turn.id}-src-${sIdx}`,
              url: s.url,
              title: s.title || domain,
              domain,
              snippet: s.snippet,
              faviconUrl: getFaviconUrl(domain),
            };
          });

          return (
            <div
              key={turn.id}
              ref={isLast ? activeTurnRef : null}
              className="scroll-mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs space-y-3 transition-colors"
            >
              {/* Turn Header */}
              <div
                onClick={() => !isLast && toggleTurn(turn.id)}
                className={`flex items-start justify-between gap-3 ${
                  !isLast ? "cursor-pointer" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-5 w-5 rounded-md bg-[var(--surface-hover)] text-[var(--accent)] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    Q{idx + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-[var(--text)] truncate">
                    {turn.query}
                  </h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {sourcesCount > 0 && (
                    <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                      {sourcesCount} sources
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">
                    {new Date(turn.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {!isLast && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTurn(turn.id);
                      }}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsed summary note for non-last turns */}
              {!isExpanded && !isLast && (
                <div className="text-xs text-[var(--text-muted)] pt-1 flex items-center justify-between">
                  <span>
                    Researched {sourcesCount} sources ·{" "}
                    <button
                      type="button"
                      onClick={() => toggleTurn(turn.id)}
                      className="text-[var(--accent)] hover:underline font-medium"
                    >
                      View report ⌄
                    </button>
                  </span>
                </div>
              )}

              {/* Expanded Content */}
              {isExpanded && (
                <div className="pt-2 border-t border-[var(--border)] space-y-3">
                  {turn.status === "RUNNING" && (
                    <div className="flex items-center gap-2.5 py-4 text-xs font-medium text-[var(--accent)]">
                      <Loader2
                        className="h-4 w-4 animate-spin shrink-0"
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                      <span>Synthesizing verified follow-up answer…</span>
                    </div>
                  )}

                  {turn.status === "FAILED" && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{turn.answer || "Follow-up research encountered an error."}</span>
                    </div>
                  )}

                  {turn.status === "COMPLETED" && (
                    <div className="space-y-4">
                      <AnswerBody
                        markdown={turn.answer}
                        sources={mappedSources}
                      />

                      {mappedSources.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[var(--border)]">
                          <span className="text-[11px] text-[var(--text-muted)] font-medium mr-1">
                            Sources:
                          </span>
                          {mappedSources.map((s) => (
                            <a
                              key={s.id}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] text-[10px] text-[var(--accent)] hover:underline"
                            >
                              <Globe className="h-2.5 w-2.5" />
                              <span>{s.domain}</span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Dynamic Related Follow-up Inquiries */}
                      {turn.suggested_questions && turn.suggested_questions.length > 0 && (
                        <div className="pt-3 border-t border-[var(--border)] space-y-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                            <CornerDownRight className="h-3.5 w-3.5 text-[var(--accent)]" />
                            <span>Related Follow-ups</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {turn.suggested_questions.map((sq, sqIdx) => (
                              <button
                                key={sqIdx}
                                type="button"
                                disabled={disabled}
                                onClick={() => onSelectQuestion && onSelectQuestion(sq)}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/60 hover:bg-[var(--surface-hover)] hover:border-[var(--accent)]/50 text-left text-xs font-medium text-[var(--text)] transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <CornerDownRight className="h-3 w-3 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 transition-colors" />
                                  <span className="line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                                    {sq}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  Ask ↵
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

