"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
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
import {
  Play,
  Square,
  Sparkles,
  Zap,
  ArrowRight,
  Layers,
  ListOrdered,
  AlertCircle,
  HelpCircle,
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

export default function DashboardPage() {
  const { token, user } = useAuth();

  const [goal, setGoal] = useState("");
  const [mode, setMode] = useState<"sequential" | "parallel">("parallel");
  const [isRunning, setIsRunning] = useState(false);
  const [workflowState, setWorkflowState] = useState<WorkflowStateData | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleRun = async () => {
    if (!goal.trim() || isRunning) return;

    setIsRunning(true);
    setErrorBanner(null);
    setSelectedStepId(null);
    setLogs([]);

    // Initialize local placeholder state
    setWorkflowState({
      goal,
      status: "PLANNING",
      step_outputs: {},
      replan_count: 0,
      total_tokens: 0,
      total_cost: 0,
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const addLog = (agent: string, message: string) => {
      const timeStr = new Date().toLocaleTimeString("en-US", { hour12: false });
      setLogs((prev) => [...prev, { timestamp: timeStr, agent, message }]);
    };

    addLog("ORCHESTRATOR", `Starting workflow in ${mode.toUpperCase()} mode...`);
    addLog("PLANNER", `Decomposing goal into dependency DAG...`);

    await streamWorkflowExecution(
      goal,
      mode,
      token,
      (event: SSEEvent) => {
        if (event.event === "state_update" && event.state) {
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
          addLog("ERROR", event.error || "Workflow error encountered.");
        }
      },
      (err: Error) => {
        setErrorBanner(err.message);
        addLog("ERROR", err.message);
        setIsRunning(false);
      },
      () => {
        setIsRunning(false);
        addLog("ORCHESTRATOR", "Workflow execution completed.");
      },
      abortController.signal
    );
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsRunning(false);
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

  // Extract steps array for DAG canvas
  const stepsList: StepOutputData[] = workflowState
    ? Object.values(workflowState.step_outputs)
    : [];

  const selectedStep =
    selectedStepId && workflowState?.step_outputs
      ? workflowState.step_outputs[selectedStepId] || null
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100">
      <Navbar />

      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 gap-5">
        {/* Top Control Header Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-4">
            {/* Input textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Agent Objective / Prompt</span>
                </label>
                <span className="text-[11px] text-zinc-500">
                  Decomposes into DAG nodes & parallel execution waves
                </span>
              </div>
              <textarea
                rows={3}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Enter a complex objective (e.g. Conduct a comprehensive security audit of OAuth2 vs SAML, compare token flows, and draft mitigation strategies)..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors font-sans"
              />
            </div>

            {/* Quick Preset Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[11px] font-mono text-zinc-500 flex-shrink-0">Presets:</span>
              {PRESET_GOALS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setGoal(preset.prompt)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-300 hover:border-indigo-500/40 hover:text-white transition-colors flex-shrink-0"
                >
                  {preset.title}
                </button>
              ))}
            </div>

            {/* Mode selection & Run Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium">Execution Engine:</span>
                <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-1">
                  <button
                    onClick={() => setMode("parallel")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      mode === "parallel"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Parallel Waves (~2.1x)</span>
                  </button>
                  <button
                    onClick={() => setMode("sequential")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      mode === "sequential"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                    <span>Sequential</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
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
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-xs text-red-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-red-400 hover:text-red-200 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Canvas + Inspector Split View */}
        <div className="flex-1 flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-2xl min-h-[560px]">
          {/* Telemetry Bar */}
          <TelemetryBar state={workflowState} isRunning={isRunning} mode={mode} />

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
            <div className="w-full lg:w-96 h-full min-h-[300px] lg:min-h-0 border-t lg:border-t-0 lg:border-l border-zinc-800 flex-shrink-0">
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
    </div>
  );
}
