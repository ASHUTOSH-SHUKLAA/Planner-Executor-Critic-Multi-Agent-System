"use client";

import React from "react";
import {
  ArrowUpRight,
  GraduationCap,
  Cpu,
  ShoppingBag,
  FlaskConical,
  Sparkles,
} from "lucide-react";

function getCategoryIcon(category: string) {
  const norm = category.toLowerCase();
  if (norm.includes("academic") || norm.includes("college") || norm.includes("school")) {
    return <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (norm.includes("tech") || norm.includes("ai") || norm.includes("data")) {
    return <Cpu className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (norm.includes("gadget") || norm.includes("deal") || norm.includes("product") || norm.includes("shop")) {
    return <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (norm.includes("science") || norm.includes("chem") || norm.includes("bio") || norm.includes("physics")) {
    return <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />;
}

export function Composer({
  variant,
  className = "",
  children,
}: {
  variant: "hero" | "followup";
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`workspace-composer workspace-composer-${variant} ${className}`}>{children}</div>;
}

export function WorkspaceIconButton({
  label,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-label={label}
      className={`workspace-icon-button ${className}`}
    >
      {children}
    </button>
  );
}

export function WorkspaceChip({
  selected = false,
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      aria-pressed={selected}
      className={`workspace-chip${selected ? " is-selected" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function SegmentedControl({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className={`workspace-segmented-control ${className}`}>
      {children}
    </div>
  );
}

export function SuggestionCard({
  category,
  title,
  description,
  metadata,
  onClick,
}: {
  category: string;
  title: string;
  description?: string;
  metadata?: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="workspace-suggestion-card group"
      title={`${title} · Click to load question`}
    >
      <span className="workspace-suggestion-card-top">
        <span className="workspace-suggestion-category">
          {getCategoryIcon(category)}
          <span>{category}</span>
        </span>
        <ArrowUpRight aria-hidden="true" className="workspace-suggestion-arrow" />
      </span>
      <strong>{title}</strong>
      {description && <span className="workspace-suggestion-description">{description}</span>}
      {metadata && <span className="workspace-suggestion-metadata sr-only">{metadata}</span>}
    </button>
  );
}
