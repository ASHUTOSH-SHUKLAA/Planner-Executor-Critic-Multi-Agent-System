"use client";

import { useEffect, useRef } from "react";
import { X, ArrowRight, ArrowDownLeft, FileCheck, ShieldAlert } from "lucide-react";
import { EXPLORE_CARDS } from "../beats";
import type { AgentRole } from "../pipelineSpec";

interface ExploreCardProps {
  agentRole: AgentRole;
  onClose: () => void;
  onOpenUnderTheHood: (agent: AgentRole) => void;
  anchorPosition?: { x: number; y: number } | null;
}

export function ExploreCard({
  agentRole,
  onClose,
  onOpenUnderTheHood,
}: ExploreCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cardData = EXPLORE_CARDS[agentRole] || EXPLORE_CARDS["Planner Agent"];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={cardRef}
      className="explore-popover-card"
      role="dialog"
      aria-label={`${cardData.role} details`}
      tabIndex={-1}
    >
      <div className="explore-card-header">
        <div className="explore-card-title-group">
          <span className="explore-agent-badge">{cardData.shortName}</span>
          <h4 className="explore-card-title">{cardData.role}</h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="explore-card-close"
          aria-label="Close explore card"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="explore-card-rows">
        {/* Row 1: Gets */}
        <div className="explore-row">
          <div className="explore-row-label">
            <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--text-faint)]" aria-hidden="true" />
            <span>Gets</span>
          </div>
          <p className="explore-row-value">{cardData.gets}</p>
        </div>

        {/* Row 2: Makes */}
        <div className="explore-row">
          <div className="explore-row-label">
            <FileCheck className="w-3.5 h-3.5 text-[var(--success)]" aria-hidden="true" />
            <span>Makes</span>
          </div>
          <p className="explore-row-value">{cardData.makes}</p>
        </div>

        {/* Row 3: Rule */}
        <div className="explore-row">
          <div className="explore-row-label">
            <ShieldAlert className="w-3.5 h-3.5 text-[var(--critic)]" aria-hidden="true" />
            <span>Rule</span>
          </div>
          <p className="explore-row-value explore-rule-text">{cardData.rule}</p>
        </div>
      </div>

      <div className="explore-card-footer">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenUnderTheHood(agentRole);
          }}
          className="explore-link-btn"
        >
          <span>See it under the hood</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
