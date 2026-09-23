"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  WorkflowStateData,
  StepOutputData,
  SSEEvent,
  streamWorkflowExecution,
} from "@/lib/api";
import { DAGCanvas } from "@/components/canvas/DAGCanvas";
import { StepInspector } from "@/components/canvas/StepInspector";
import { TelemetryBar } from "@/components/canvas/TelemetryBar";
import { LiveConsole, LogEntry } from "@/components/canvas/LiveConsole";
import { HistoryDrawer, HistoryRunItem } from "@/components/canvas/HistoryDrawer";
import { SynthesisModal } from "@/components/canvas/SynthesisModal";
import {
  Play,
  Square,
  Sparkles,
  Zap,
  ArrowRight,
  Layers,
  ListOrdered,
  AlertCircle,
  History,
  Download,
  FileText,
  FileCode,
} from "lucide-react";

const PRESET_GOALS = [
  {
    title: "Quantum vs RSA Analysis",
    prompt:
      "Analyze the cryptographic vulnerabilities introduced by quantum computing (Shor's algorithm) to standard RSA-2048 and outline post-quantum replacement strategies.",
  },
  {
    title: "Microservices Auth Architecture",
    prompt:
      "Design a production-grade authentication and authorization architecture for a distributed microservices system using OAuth2, JWTs, and mTLS.",
  },
  {
    title: "PyTorch vs JAX Benchmarking",
    prompt:
      "Compare PyTorch 2.0 with JAX for large-scale distributed training of transformer models in terms of compiler optimizations, throughput, and developer experience.",
  },
  {
    title: "Agent Framework Teardown",
    prompt:
      "Perform a deep architectural teardown of LangGraph, CrewAI, and AutoGen, highlighting failure modes in hallucination recovery and context leakage.",
  },
];

const HISTORY_STORAGE_KEY = "aegis_session_history";

export default function DashboardPage() {
  const { token, user } = useAuth();
  const { success, error, info } = useToast();

  const [goal, setGoal] = useState("");
  const [mode, setMode] = useState<"sequential" | "parallel">("parallel");
  const [isRunning, setIsRunning] = useState(false);
  const [workflowState, setWorkflowState] = useState<WorkflowStateData | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Modals and Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSynthesisOpen, setIsSynthesisOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRunItem[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load session history:", e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (completedState: WorkflowStateData) => {
    const newItem: HistoryRunItem = {
      id: `run_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      goal: completedState.goal,
      mode,
      state: completedState,
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev.slice(0, 19)]; // Keep last 20 runs
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Failed to persist history:", e);
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    success("Execution history cleared", "History Reset");
  };

  const handleSelectHistoryRun = (item: HistoryRunItem) => {
    setWorkflowState(item.state);
    setGoal(item.goal);
    setMode(item.mode);
    setSelectedStepId(null);
    info(`Loaded workflow run: "${item.goal.slice(0, 40)}..."`, "Run Restored");
  };

  // Keyboard shortcut listener (Ctrl+Enter to run, Esc to close drawers)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (!isRunning && goal.trim()) {
          e.preventDefault();
          handleRun();
        }
      } else if (e.key === "Escape") {
        setSelectedStepId(null);
        setIsSynthesisOpen(false);
        setIsHistoryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goal, isRunning, mode, token]);

  const handleRun = async () => {
    if (!goal.trim() || isRunning) return;

    setIsRunning(true);
    setErrorBanner(null);
    setSelectedStepId(null);
    setLogs([]);

    // Initialize local placeholder state
    const initialState: WorkflowStateData = {
      goal,
      status: "PLANNING",
      step_outputs: {},
      replan_count: 0,
      total_tokens: 0,
      total_cost: 0,
    };
    setWorkflowState(initialState);

    info(`Launching multi-agent workflow in ${mode.toUpperCase()} mode...`, "Engine Active");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const addLog = (agent: string, message: string) => {
      const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false });
      setLogs((prev) => [...prev, { timestamp: timeStr, agent, message }]);
    };

    addLog("ORCHESTRATOR", `Starting workflow in ${mode.toUpperCase()} mode...`);
    addLog("PLANNER", `Decomposing goal into dependency DAG...`);

    let latestState = initialState;

    await streamWorkflowExecution(
      goal,
      mode,
      token,
      (event: SSEEvent) => {
        if (event.event === "state_update" && event.state) {
          latestState = event.state;
          setWorkflowState(event.state);

          // Auto-select current step if user hasn't selected another
          if (event.state.current_step_id) {
            setSelectedStepId(event.state.current_step_id);
          }
        } else if (event.event === "log" && event.log) {
          const timeStr = event.log.timestamp || new Date().toLocaleTimeString("en-US", { hour12: false });
          setLogs((prev) => [
            ...prev,
            {
              timestamp: timeStr,
              agent: event.log!.agent,
              message: event.log!.message,
              level: event.log!.level,
            },
          ]);
        } else if (event.event === "error") {
          setErrorBanner(event.error || "Execution encountered an error.");
          error(event.error || "Workflow error encountered.", "Execution Alert");
          addLog("ERROR", event.error || "Workflow error encountered.");
        }
      },
      (err: Error) => {
        setErrorBanner(err.message);
        error(err.message, "Execution Error");
        addLog("ERROR", err.message);
        setIsRunning(false);
      },
      () => {
        setIsRunning(false);
        addLog("ORCHESTRATOR", "Workflow execution completed.");
        success("Multi-agent workflow successfully completed and audited!", "Mission Accomplished");
        saveToHistory(latestState);
      },
      abortController.signal
    );
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsRunning(false);
      info("Workflow execution stopped by user.", "Halted");
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          agent: "ORCHESTRATOR",
          message: "Execution stopped by user.",
        },
      ]);
    }
  };

  // Export Workflow as Markdown
  const handleExportMarkdown = () => {
    if (!workflowState) return;

    const mdLines = [
      `# TriadFlow Workflow Execution Report`,
      `**Objective:** ${workflowState.goal}`,
      `**Status:** ${workflowState.status}`,
      `**Engine Mode:** ${mode.toUpperCase()}`,
      `**Total Tokens:** ${(workflowState.total_tokens || 0).toLocaleString()}`,
      `**Estimated Cost:** $${(workflowState.total_cost || 0).toFixed(5)} USD\n`,
      `---\n`,
      `## Executive Synthesis`,
      workflowState.final_result || "No synthesized report generated.",
      `\n---\n`,
      `## Step Deliverables Breakdown\n`,
    ];

    Object.values(workflowState.step_outputs).forEach((step) => {
      mdLines.push(`### Step: ${step.title} (${step.step_id})`);
      mdLines.push(`**Status:** ${step.status} | **Retries:** ${step.retry_count}`);
      if (step.critic_review) {
        mdLines.push(
          `**Critic Scores:** Correctness: ${(step.critic_review.correctness * 100).toFixed(0)}% | Completeness: ${(step.critic_review.completeness * 100).toFixed(0)}% | Relevance: ${(step.critic_review.relevance * 100).toFixed(0)}%`
        );
        if (step.critic_review.feedback) {
          mdLines.push(`*Critic Feedback:* ${step.critic_review.feedback}`);
        }
      }
      mdLines.push(`\n**Prompt:**\n\`\`\`\n${step.prompt}\n\`\`\``);
      mdLines.push(`\n**Output Deliverable:**\n${step.output}\n\n---\n`);
    });

    const blob = new Blob([mdLines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workflow_report_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success("Complete workflow exported as Markdown (.md)", "Export Complete");
  };

  // Export Workflow as JSON
  const handleExportJSON = () => {
    if (!workflowState) return;
    const jsonStr = JSON.stringify(workflowState, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workflow_state_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success("Raw telemetry and DAG state exported as JSON", "Export Complete");
  };

  // Extract steps array for DAG canvas
  const stepsList: StepOutputData[] = workflowState
    ? Object.values(workflowState.step_outputs)
    : [];

  const selectedStep =
    selectedStepId && workflowState?.step_outputs
      ? workflowState.step_outputs[selectedStepId] || null
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 gap-5">
        {/* Top Control Header Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/80 p-5 shadow-lg dark:shadow-xl backdrop-blur-md transition-colors">
          <div className="flex flex-col gap-4">
            {/* Input textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Agent Objective / Prompt</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-500 hidden sm:inline">
                    Press <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-mono">Ctrl+Enter</kbd> to launch
                  </span>
                  <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>History ({history.length})</span>
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Enter a complex objective (e.g. Conduct a comprehensive security audit of OAuth2 vs SAML, compare token flows, and draft mitigation strategies)..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-3.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors font-sans"
              />
            </div>

            {/* Quick Preset Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 flex-shrink-0">
                Presets:
              </span>
              {PRESET_GOALS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setGoal(preset.prompt)}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-white transition-colors flex-shrink-0"
                >
                  {preset.title}
                </button>
              ))}
            </div>

            {/* Mode selection & Run Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Execution Engine:
                </span>
                <div className="inline-flex rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/60 p-1">
                  <button
                    onClick={() => setMode("parallel")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      mode === "parallel"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Parallel Waves (~2.1x)</span>
                  </button>
                  <button
                    onClick={() => setMode("sequential")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      mode === "sequential"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200"
                    }`}
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                    <span>Sequential</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Run / Stop & Export */}
              <div className="flex items-center gap-2.5">
                {workflowState && (
                  <div className="flex items-center gap-1.5 mr-2">
                    <button
                      onClick={handleExportMarkdown}
                      title="Download complete workflow report as Markdown"
                      className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
                    >
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      <span>.MD</span>
                    </button>
                    <button
                      onClick={handleExportJSON}
                      title="Export telemetry and DAG state as JSON"
                      className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs"
                    >
                      <FileCode className="h-3.5 w-3.5 text-sky-500" />
                      <span>.JSON</span>
                    </button>
                  </div>
                )}

                {isRunning ? (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-500 transition-colors"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    <span>Stop Execution</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRun}
                    disabled={!goal.trim()}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02]"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    <span>Run Multi-Agent Triad</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorBanner && (
          <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-600 dark:text-red-300 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-500 hover:text-red-700 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Canvas + Inspector Split View */}
        <div className="flex-1 flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/80 overflow-hidden shadow-xl dark:shadow-2xl min-h-[560px] transition-colors">
          {/* Telemetry Bar */}
          <TelemetryBar
            state={workflowState}
            isRunning={isRunning}
            mode={mode}
            onViewSynthesis={
              workflowState?.final_result ? () => setIsSynthesisOpen(true) : undefined
            }
          />

          {/* Canvas & Inspector Body */}
          <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
            {/* React Flow Visual DAG Canvas */}
            <div className="flex-1 h-full min-h-[420px] relative">
              <DAGCanvas
                steps={stepsList}
                selectedStepId={selectedStepId}
                onSelectStep={(id) => setSelectedStepId(id)}
              />
            </div>

            {/* Step Inspector Sidebar Drawer */}
            <div className="w-full lg:w-96 h-full min-h-[300px] lg:min-h-0 border-t lg:border-t-0 lg:border-l border-zinc-200 dark:border-zinc-800 flex-shrink-0">
              <StepInspector
                step={selectedStep}
                onClose={() => setSelectedStepId(null)}
              />
            </div>
          </div>

          {/* Live Console Drawer */}
          <LiveConsole logs={logs} onClear={() => setLogs([])} />
        </div>
      </main>

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        history={history}
        onSelectRun={handleSelectHistoryRun}
        onClearHistory={handleClearHistory}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Synthesis Modal */}
      <SynthesisModal
        isOpen={isSynthesisOpen}
        onClose={() => setIsSynthesisOpen(false)}
        markdownContent={workflowState?.final_result || null}
        taskTitle={workflowState?.goal || ""}
      />
    </div>
  );
}
