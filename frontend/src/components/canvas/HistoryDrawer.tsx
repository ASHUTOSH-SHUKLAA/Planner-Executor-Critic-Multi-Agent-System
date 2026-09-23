"use client";

import React from "react";
import { WorkflowStateData } from "@/lib/api";
import { X, History, CheckCircle2, AlertOctagon, Trash2, ArrowRight } from "lucide-react";

export interface HistoryRunItem {
  id: string;
  timestamp: string;
  goal: string;
  mode: "sequential" | "parallel";
  state: WorkflowStateData;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  history: HistoryRunItem[];
  onSelectRun: (run: HistoryRunItem) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export function HistoryDrawer({
  isOpen,
  history,
  onSelectRun,
  onClearHistory,
  onClose,
}: HistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col text-zinc-900 dark:text-zinc-100 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-sm">Session Execution History</h3>
            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
              {history.length} runs
            </span>
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={onClearHistory}
                title="Clear History"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List of Runs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-zinc-400 p-6">
              <History className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-xs">No previous workflows recorded yet in this session.</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Completed workflow runs will automatically appear here for one-click re-inspection.
              </p>
            </div>
          ) : (
            history.map((item) => {
              const isSuccess = item.state.status === "COMPLETED";
              const stepCount = item.state.plan?.steps.length || 0;
              const passedCount = Object.values(item.state.step_outputs).filter(
                (s) => s.status === "PASSED"
              ).length;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectRun(item);
                    onClose();
                  }}
                  className="group cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3.5 hover:border-indigo-500/50 hover:bg-white dark:hover:bg-zinc-900 transition-all duration-200 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-500 font-mono">{item.timestamp}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase bg-zinc-200/80 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400">
                        {item.mode}
                      </span>
                      {isSuccess ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Passed</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500">
                          <AlertOctagon className="h-3 w-3" />
                          <span>{item.state.status}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.goal}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80">
                    <span>
                      Steps: {passedCount}/{stepCount}
                    </span>
                    <span>
                      {(item.state.total_tokens || 0).toLocaleString()} tokens
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
