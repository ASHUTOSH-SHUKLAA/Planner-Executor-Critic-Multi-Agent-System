"use client";

import React from "react";
import { Globe, Loader2 } from "lucide-react";
import { SourceItem } from "@/lib/research-view-model";
import { SourceCard } from "./SourceCard";

interface SourcesPanelProps {
  sources: SourceItem[];
  isRunning?: boolean;
  highlightedDomain?: string | null;
  onHoverDomain?: (domain: string | null) => void;
}

export function SourcesPanel({
  sources = [],
  isRunning = false,
  highlightedDomain,
  onHoverDomain,
}: SourcesPanelProps) {
  const topSources = sources.slice(0, 3);

  return (
    <aside
      className="sources-sidebar-panel w-full sm:w-[320px] lg:w-[340px] shrink-0 space-y-3"
      data-testid="sources-side-panel"
      aria-label="Verified research sources"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
            Sources
          </h3>
          {sources.length > 0 && (
            <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[var(--surface-hover)] text-[var(--text-muted)] font-semibold">
              {sources.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Stack of up to 3 favicons */}
          {sources.length > 0 ? (
            <div className="flex -space-x-1.5 items-center">
              {topSources.map((s, idx) =>
                s.faviconUrl ? (
                  <img
                    key={idx}
                    src={s.faviconUrl}
                    alt=""
                    className="h-4 w-4 rounded-full ring-2 ring-[var(--surface)] bg-[var(--surface)] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <Globe
                    key={idx}
                    className="h-4 w-4 rounded-full ring-2 ring-[var(--surface)] bg-[var(--surface)] text-[var(--text-muted)]"
                  />
                )
              )}
            </div>
          ) : isRunning ? (
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span
                className="inline-flex items-center justify-center h-3.5 w-3.5 shrink-0 text-[var(--accent)] animate-spin"
                style={{ animation: "spin 1s linear infinite", transformOrigin: "center center" }}
              >
                <Loader2
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ animation: "spin 1s linear infinite", transformOrigin: "center center" }}
                  aria-hidden="true"
                />
              </span>
              <span className="text-[11px]">Finding sources…</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Sources List or Early State Skeleton */}
      {sources.length === 0 ? (
        isRunning ? (
          <div className="space-y-2.5 pt-2">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2 animate-pulse"
              >
                <div className="h-3 w-24 rounded bg-[var(--surface-hover)]" />
                <div className="h-3.5 w-full rounded bg-[var(--surface-hover)]" />
                <div className="h-3.5 w-3/4 rounded bg-[var(--surface-hover)]" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)] py-4 text-center">
            No sources gathered for this inquiry.
          </p>
        )
      ) : (
        <div className="space-y-2.5 max-h-[calc(100vh-220px)] overflow-y-auto no-scrollbar pr-0.5">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              isHighlighted={
                highlightedDomain
                  ? source.domain.toLowerCase() === highlightedDomain.toLowerCase()
                  : false
              }
              onHover={onHoverDomain}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

