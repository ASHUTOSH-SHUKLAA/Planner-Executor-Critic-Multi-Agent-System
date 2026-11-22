"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Share2,
  Bookmark,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react";

export type ResearchTabType = "answer" | "sources" | "images";

interface ResearchTopBarProps {
  activeTab: ResearchTabType;
  onChangeTab: (tab: ResearchTabType) => void;
  sourcesCount: number;
  hasImages: boolean;
  onBack: () => void;
  onShare?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onNewResearch?: () => void;
  isRunning?: boolean;
  onStop?: () => void;
}

export function ResearchTopBar({
  activeTab,
  onChangeTab,
  sourcesCount,
  hasImages,
  onBack,
  onShare,
  isSaved = false,
  onToggleSave,
  onNewResearch,
  isRunning = false,
  onStop,
}: ResearchTopBarProps) {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="sticky top-0 z-30 h-14 sm:h-16 w-full border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 transition-colors"
      data-testid="research-top-bar"
    >
      {/* Left side: Back to home button & navigation tabs */}
      <div className="flex items-center gap-1 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to home"
          title="Back to home"
          className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Text tabs with underline on active */}
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-[13.5px] font-medium">
          {/* Answer Tab */}
          <button
            type="button"
            onClick={() => onChangeTab("answer")}
            className={`relative py-3.5 px-2.5 sm:px-3 text-center transition-colors cursor-pointer ${activeTab === "answer"
              ? "text-[var(--text)] font-semibold"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
          >
            <span>Answer</span>
            {activeTab === "answer" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full animate-in fade-in duration-150" />
            )}
          </button>

          {/* Sources Tab */}
          <button
            type="button"
            onClick={() => onChangeTab("sources")}
            className={`relative py-3.5 px-2.5 sm:px-3 text-center transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "sources"
              ? "text-[var(--text)] font-semibold"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
          >
            <span>Sources</span>
            {sourcesCount > 0 && (
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-[var(--surface-hover)] text-[var(--text-muted)]">
                {sourcesCount}
              </span>
            )}
            {activeTab === "sources" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full animate-in fade-in duration-150" />
            )}
          </button>

          {/* Images Tab (hidden if none) */}
          {hasImages && (
            <button
              type="button"
              onClick={() => onChangeTab("images")}
              className={`relative py-3.5 px-2.5 sm:px-3 text-center transition-colors cursor-pointer ${activeTab === "images"
                ? "text-[var(--text)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
            >
              <span>Images</span>
              {activeTab === "images" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)] rounded-full animate-in fade-in duration-150" />
              )}
            </button>
          )}
        </nav>
      </div>

      {/* Right side: Stop button (while running), Share, Export menu, Save bookmark icon button, and ⋯ menu */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {isRunning && onStop && (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold transition-all cursor-pointer shadow-2xs mr-1"
            title="Stop research"
            aria-label="Stop research"
          >
            <Square className="h-3 w-3 fill-current" />
            <span>Stop research</span>
          </button>
        )}

        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            title="Share research"
            aria-label="Share research"
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}

        {/* Bookmark save button */}
        {onToggleSave && (
          <button
            type="button"
            onClick={onToggleSave}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${isSaved
              ? "text-[var(--accent)] hover:bg-[var(--surface-hover)]"
              : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
              }`}
            title={isSaved ? "Remove from bookmarks" : "Save bookmark"}
            aria-label={isSaved ? "Remove from bookmarks" : "Save bookmark"}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </button>
        )}

        {/* ⋯ Overflow menu */}
        <div className="relative inline-block" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            title="More actions"
            aria-label="More actions"
            aria-expanded={isMoreMenuOpen}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMoreMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150">
              {onNewResearch && (
                <button
                  type="button"
                  onClick={() => {
                    onNewResearch();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                  <span>New research</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

