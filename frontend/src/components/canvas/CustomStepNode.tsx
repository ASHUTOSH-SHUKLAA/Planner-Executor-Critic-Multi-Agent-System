"use client";

import React, { memo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { CheckCircle2, Clock, AlertTriangle, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { StepOutputData } from "@/lib/api";

export interface CustomStepNodeData extends Record<string, unknown> {
  step: StepOutputData;
  isSelected: boolean;
  onSelect: (stepId: string) => void;
}

export type CustomStepNodeType = Node<CustomStepNodeData, "customStep">;

export const CustomStepNode = memo(({ data }: NodeProps<CustomStepNodeType>) => {
  const step: StepOutputData = data.step;
  const isSelected: boolean = data.isSelected;

  const getStatusBadge = () => {
    switch (step.status) {
      case "PASSED":
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Passed</span>
          </span>
        );
      case "EXECUTING":
        return (
          <span className="flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-500/10 border border-sky-300 dark:border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400">
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-ping" />
            <span>Executing</span>
          </span>
        );
      case "CRITIC_REVIEW":
        return (
          <span className="flex items-center gap-1 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:text-purple-400">
            <ShieldCheck className="h-3 w-3" />
            <span>Auditing</span>
          </span>
        );
      case "RETRYING":
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Retry #{step.retry_count}</span>
          </span>
        );
      case "REPLANNED":
        return (
          <span className="flex items-center gap-1 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-400">
            <Sparkles className="h-3 w-3" />
            <span>Replanned</span>
          </span>
        );
      case "FAILED":
        return (
          <span className="flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const getBorderColor = () => {
    if (isSelected) return "border-indigo-600 ring-2 ring-indigo-500/40 shadow-indigo-500/20";
    switch (step.status) {
      case "PASSED":
        return "border-emerald-300 dark:border-emerald-500/30 hover:border-emerald-500/60";
      case "EXECUTING":
        return "border-sky-400 dark:border-sky-500/50 hover:border-sky-500 shadow-md shadow-sky-500/10";
      case "CRITIC_REVIEW":
        return "border-purple-400 dark:border-purple-500/50 hover:border-purple-500 shadow-md shadow-purple-500/10";
      case "RETRYING":
        return "border-amber-400 dark:border-amber-500/50 hover:border-amber-500";
      case "FAILED":
        return "border-red-400 dark:border-red-500/50";
      default:
        return "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700";
    }
  };

  return (
    <div
      onClick={() => data.onSelect(step.step_id)}
      className={`w-64 rounded-xl border bg-white/95 dark:bg-zinc-900/90 p-3.5 shadow-md dark:shadow-xl backdrop-blur-md cursor-pointer transition-all duration-200 ${getBorderColor()}`}
    >
      {/* React Flow Handles for DAG edges */}
      <Handle type="target" position={Position.Left} className="!bg-indigo-500 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !w-2.5 !h-2.5" />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {step.step_id}
        </span>
        {getStatusBadge()}
      </div>

      {/* Title */}
      <h6 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug mb-2">
        {step.title}
      </h6>

      {/* Critic review scores preview if available */}
      {step.critic_review && (
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
          <span
            className={`${
              step.critic_review.correctness >= 0.85
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
            title="Correctness"
          >
            Corr: {(step.critic_review.correctness * 100).toFixed(0)}%
          </span>
          <span
            className={`${
              step.critic_review.completeness >= 0.80
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
            title="Completeness"
          >
            Comp: {(step.critic_review.completeness * 100).toFixed(0)}%
          </span>
          <span
            className={`${
              step.critic_review.relevance >= 0.85
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
            title="Relevance"
          >
            Rel: {(step.critic_review.relevance * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
});

CustomStepNode.displayName = "CustomStepNode";
