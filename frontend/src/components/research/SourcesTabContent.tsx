"use client";

import React, { useState, useMemo } from "react";
import { Search, Globe } from "lucide-react";
import { SourceItem } from "@/lib/research-view-model";
import { SourceCard } from "./SourceCard";

interface SourcesTabContentProps {
  sources: SourceItem[];
}

export function SourcesTabContent({ sources }: SourcesTabContentProps) {
  const [search, setSearch] = useState("");

  const filteredSources = useMemo(() => {
    if (!search.trim()) return sources;
    const q = search.toLowerCase();
    return sources.filter(
      (s) =>
        s.domain.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        (s.snippet && s.snippet.toLowerCase().includes(q))
    );
  }, [sources, search]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2" data-testid="sources-tab-content">
      {/* Header & Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">
            Verified Sources ({sources.length})
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Empirical citations retrieved during this research inquiry
          </p>
        </div>

        {/* Filter input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter sources…"
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Sources Grid */}
      {filteredSources.length === 0 ? (
        <div className="p-8 text-center text-xs text-[var(--text-muted)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          {sources.length === 0
            ? "No sources cited in this report yet."
            : "No sources match your filter."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  );
}

