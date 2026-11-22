"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Share2,
  FileDown,
  Bookmark,
} from "lucide-react";

interface ReportActionsPanelProps {
  onCopy?: () => void;
  onShare?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onExportPDF?: () => void;
}

export function ReportActionsPanel({
  onCopy,
  onShare,
  isSaved = false,
  onToggleSave,
  onExportPDF,
}: ReportActionsPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="report-actions-panel shrink-0 pt-2.5 pb-1 border-t border-[var(--border)]/70 space-y-2"
      data-testid="report-actions-panel"
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
          Actions
        </span>
      </div>

      {/* Row 1: Copy, Share, Save */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Copy */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text)] transition-colors cursor-pointer shadow-2xs"
          title="Copy report markdown"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[var(--success)]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span className="font-medium text-[11.5px]">{copied ? "Copied" : "Copy"}</span>
        </button>

        {/* Share */}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text)] transition-colors cursor-pointer shadow-2xs"
            title="Share report URL"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="font-medium text-[11.5px]">Share</span>
          </button>
        )}

        {/* Save */}
        {onToggleSave && (
          <button
            type="button"
            onClick={onToggleSave}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs transition-colors cursor-pointer shadow-2xs ${
              isSaved ? "text-[var(--accent)] font-semibold" : "text-[var(--text)]"
            }`}
            title={isSaved ? "Saved in bookmarks" : "Save report"}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
            <span className="font-medium text-[11.5px]">{isSaved ? "Saved" : "Save"}</span>
          </button>
        )}
      </div>

      {/* Row 2: Export as PDF */}
      {onExportPDF && (
        <button
          type="button"
          onClick={onExportPDF}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs text-[var(--text)] transition-colors cursor-pointer shadow-2xs"
          title="Export as PDF (.pdf)"
        >
          <FileDown className="h-3.5 w-3.5 text-rose-500" />
          <span className="text-[11.5px] font-medium">Export as PDF (.pdf)</span>
        </button>
      )}
    </div>
  );
}

