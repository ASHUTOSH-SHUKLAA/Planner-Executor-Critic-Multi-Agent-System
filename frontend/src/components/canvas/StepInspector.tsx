"use client";

import React from "react";
import { StepOutputData } from "@/lib/api";
import { X, ShieldCheck, Cpu, Terminal, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface StepInspectorProps {
  step: StepOutputData | null;
  onClose: () => void;
}

export function StepInspector({ step, onClose }: StepInspectorProps) {
  if (!step) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
        <Cpu className="h-10 w-10 text-zinc-700 mb-2" />
        <p className="text-xs">Select any node on the DAG canvas to inspect its output, prompts, and Critic audit scores.</p>
      </div>
    );
  }

  const review = step.critic_review;

  return (
    <div className="h-full flex flex-col bg-zinc-950/90 border-l border-zinc-800 text-zinc-200 overflow-y-auto">
      {/* Top Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-indigo-400 uppercase">{step.step_id}</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              {step.status}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white mt-1 line-clamp-1">{step.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Dependencies */}
        <div>
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
            Dependencies
          </h4>
          {step.depends_on && step.depends_on.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {step.depends_on.map((dep) => (
                <span
                  key={dep}
                  className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-mono text-indigo-300"
                >
                  {dep}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-zinc-500 italic">Root step (no dependencies)</span>
          )}
        </div>

        {/* Critic Audit Section */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <span>Critic Quality Audit</span>
            </div>
            {review ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  review.action === "PASS"
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                }`}
              >
                {review.action}
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500">Audit pending...</span>
            )}
          </div>

          {review ? (
            <div className="space-y-3">
              {/* Score Meters */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Correctness (Gate &ge; 0.85)</span>
                    <span className={`font-mono font-bold ${review.correctness >= 0.85 ? "text-emerald-400" : "text-amber-400"}`}>
                      {(review.correctness * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${review.correctness >= 0.85 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, review.correctness * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Completeness (Gate &ge; 0.80)</span>
                    <span className={`font-mono font-bold ${review.completeness >= 0.80 ? "text-emerald-400" : "text-amber-400"}`}>
                      {(review.completeness * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${review.completeness >= 0.80 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, review.completeness * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-zinc-400">Relevance (Gate &ge; 0.85)</span>
                    <span className={`font-mono font-bold ${review.relevance >= 0.85 ? "text-emerald-400" : "text-amber-400"}`}>
                      {(review.relevance * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${review.relevance >= 0.85 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, review.relevance * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Feedback text */}
              {review.feedback && (
                <div className="pt-2 text-xs text-zinc-300 bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800">
                  <span className="font-semibold text-purple-300 block mb-1">Critic Feedback:</span>
                  <p className="text-zinc-400 leading-relaxed">{review.feedback}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Waiting for Executor completion before running Critic review.</p>
          )}
        </div>

        {/* Output Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Generated Output
            </h4>
            {step.output && (
              <span className="text-[10px] text-zinc-500 font-mono">
                {step.output.length} characters
              </span>
            )}
          </div>
          {step.output ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs text-zinc-200 font-mono leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
              {step.output}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
              Output will appear once the Executor Agent completes this step.
            </div>
          )}
        </div>

        {/* Prompt Section */}
        <div>
          <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
            Executor Prompt
          </h4>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400 font-mono leading-relaxed">
            {step.prompt}
          </div>
        </div>
      </div>
    </div>
  );
}
