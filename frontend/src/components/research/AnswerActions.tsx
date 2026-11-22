"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Copy,
  Check,
  Share2,
  MoreHorizontal,
  RotateCw,
  Globe,
  Bookmark,
} from "lucide-react";
import { SourceItem } from "@/lib/research-view-model";

interface AnswerActionsProps {
  sourcesCount: number;
  sources?: SourceItem[];
  onOpenSources?: () => void;
  onCopyAnswer?: () => void;
  onShare?: () => void;
  onRegenerate?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}

export function AnswerActions({
  sourcesCount,
  sources = [],
  onOpenSources,
  onCopyAnswer,
  onShare,
  onRegenerate,
  isSaved,
  onToggleSave,
}: AnswerActionsProps) {
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleCopy = () => {
    if (onCopyAnswer) {
      onCopyAnswer();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const topSources = sources.slice(0, 3);

  return (
    <div
      className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)]"
      data-testid="answer-actions-row"
    >
      {/* Left side actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text)] transition-colors cursor-pointer"
          title="Copy markdown answer"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[var(--success)]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline font-medium">
            {copied ? "Copied" : "Copy"}
          </span>
        </button>

        {/* Share button */}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text)] transition-colors cursor-pointer"
            title="Share report"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-medium">Share</span>
          </button>
        )}

        {/* Bookmark / Save */}
        {onToggleSave && (
          <button
            type="button"
            onClick={onToggleSave}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${
              isSaved ? "text-[var(--accent)] font-semibold" : "text-[var(--text)]"
            }`}
            title={isSaved ? "Saved in bookmarks" : "Save report"}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
            <span className="hidden sm:inline font-medium">
              {isSaved ? "Saved" : "Save"}
            </span>
          </button>
        )}

        {/* Note: Thumbs up / down hidden until backend persistence exists: TODO(backend) */}
      </div>

      {/* Right side: Stacked favicons + Sources button, and ⋯ More menu */}
      <div className="flex items-center gap-2">
        {sourcesCount > 0 && onOpenSources && (
          <button
            type="button"
            onClick={onOpenSources}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text)] transition-colors cursor-pointer shadow-2xs group"
            title="Inspect all cited sources"
          >
            {/* Stacked up to 3 favicons */}
            <div className="flex -space-x-1.5 items-center">
              {topSources.map((s, idx) =>
                s.faviconUrl ? (
                  <img
                    key={idx}
                    src={s.faviconUrl}
                    alt=""
                    className="h-3.5 w-3.5 rounded-full ring-1 ring-[var(--surface)] bg-[var(--surface)] object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <Globe
                    key={idx}
                    className="h-3.5 w-3.5 rounded-full ring-1 ring-[var(--surface)] bg-[var(--surface)] text-[var(--text-muted)]"
                  />
                )
              )}
            </div>
            <span className="font-semibold text-xs text-[var(--text)]">
              {sourcesCount} sources
            </span>
          </button>
        )}

        {/* ⋯ Overflow menu */}
        <div className="relative inline-block" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            title="More actions"
            aria-expanded={isMenuOpen}
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 shadow-xl z-30 animate-in fade-in zoom-in-95 duration-100">
              {onRegenerate && (
                <button
                  type="button"
                  onClick={() => {
                    onRegenerate();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                  <span>Regenerate research</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

