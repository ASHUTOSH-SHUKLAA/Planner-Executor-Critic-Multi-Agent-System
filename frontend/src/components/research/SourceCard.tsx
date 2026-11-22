"use client";

import React from "react";
import { ExternalLink, Globe } from "lucide-react";
import { SourceItem } from "@/lib/research-view-model";

interface SourceCardProps {
  source: SourceItem;
  isHighlighted?: boolean;
  onHover?: (domain: string | null) => void;
}

export function SourceCard({
  source,
  isHighlighted = false,
  onHover,
}: SourceCardProps) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => onHover?.(source.domain)}
      onMouseLeave={() => onHover?.(null)}
      className={`group block p-3.5 rounded-xl border bg-[var(--surface)] transition-all shadow-2xs hover:shadow-xs hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] ${isHighlighted
        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-[var(--surface-hover)]"
        : "border-[var(--border)]"
        }`}
      data-testid="source-card"
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {source.faviconUrl ? (
            <img
              src={source.faviconUrl}
              alt=""
              className="h-3.5 w-3.5 rounded-xs shrink-0 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Globe className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
          )}
          <span className="text-[11px] font-mono text-[var(--text-muted)] truncate max-w-[170px]">
            {source.domain}
          </span>
        </div>
        <ExternalLink className="h-3 w-3 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
      </div>

      <h4 className="text-xs font-semibold text-[var(--text)] line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
        {source.title}
      </h4>

      {source.snippet && (
        <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-1 leading-normal italic">
          &quot;{source.snippet}&quot;
        </p>
      )}
    </a>
  );
}

