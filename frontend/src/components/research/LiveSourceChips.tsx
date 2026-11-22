"use client";

import React from "react";
import { Globe } from "lucide-react";
import { LiveSourceChipItem } from "@/lib/research-view-model";

interface LiveSourceChipsProps {
  chips: LiveSourceChipItem[];
  totalSourcesCount: number;
  onSourceClick?: (domain: string) => void;
}

export function LiveSourceChips({
  chips,
  totalSourcesCount,
  onSourceClick,
}: LiveSourceChipsProps) {
  // If no sources exist yet, show nothing (no empty "0 sources" placeholder)
  if (!chips || chips.length === 0) {
    return null;
  }

  const overflowCount = Math.max(0, totalSourcesCount - chips.length);

  return (
    <div
      className="flex items-center gap-1.5 flex-wrap pt-0.5 animate-in fade-in duration-200"
      data-testid="live-source-chips"
    >
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onSourceClick?.(chip.domain)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-all shadow-2xs cursor-pointer group"
          title={`Source domain: ${chip.domain}`}
        >
          {chip.faviconUrl ? (
            <img
              src={chip.faviconUrl}
              alt=""
              className="h-3 w-3 rounded-xs shrink-0 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <Globe className="h-3 w-3 text-[var(--text-muted)] shrink-0" />
          )}
          <span className="font-mono text-[11px] truncate max-w-[130px] sm:max-w-[170px]">
            {chip.domain}
          </span>
        </button>
      ))}

      {overflowCount > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-hover)] font-mono text-[11px] text-[var(--text-muted)]">
          +{overflowCount}
        </span>
      )}
    </div>
  );
}

