"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  WorkflowStateData,
  StepOutputData,
  SourceCitation,
  SSEMessageEvent,
  streamWorkflowExecution,
  apiDownloadWorkflow,
} from "@/lib/api";
import {
  Play,
  Sparkles,
  AlertCircle,
  Download,
  FileText,
  FileCode,
  Globe,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  ExternalLink,
  BookOpen,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error, info } = useToast();

  const [goal, setGoal] = useState("");
  const [mode, setMode] = useState<"sequential" | "parallel">("parallel");
  const [isRunning, setIsRunning] = useState(false);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);

  // Workflow State & Telemetry
  const [workflowState, setWorkflowState] = useState<WorkflowStateData | null>(null);
  const [currentStage, setCurrentStage] = useState<
    "IDLE" | "PLANNING" | "RESEARCHING" | "VALIDATING" | "SYNTHESIZING" | "COMPLETED" | "FAILED"
  >("IDLE");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Strict Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Keyboard shortcut (Ctrl+Enter to submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (!isRunning && goal.trim() && token) {
          e.preventDefault();
          handleRun();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goal, isRunning, mode, token]);

  const addLog = (_agent: string, _message: string, _level: string = "info") => {
    // telemetry stream
  };

  const handleRun = async () => {
    if (!goal.trim() || isRunning) return;
    if (!token) {
      error("Authentication required. Please sign in.", "Auth Required");
      router.push("/login");
      return;
    }

    setIsRunning(true);
    setErrorBanner(null);
    setCurrentStage("PLANNING");

    const initialState: WorkflowStateData = {
      task: goal.trim(),
      status: "PLANNING",
      step_outputs: {},
      sources: [],
      total_tokens: 0,
      estimated_cost_usd: 0,
    };
    setWorkflowState(initialState);

    addLog("ORCHESTRATOR", `Initiating autonomous research workflow in ${mode.toUpperCase()} mode...`);
    addLog("PLANNER", `Decomposing research objective into dependency DAG and search steps...`);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    await streamWorkflowExecution(
      goal.trim(),
      mode,
      token,
      (msg: SSEMessageEvent) => {
        const { event, data } = msg;

        if (event === "workflow_started") {
          setActiveWorkflowId(data.workflow_id);
          setWorkflowState((prev) => ({
            ...(prev || initialState),
            workflow_id: data.workflow_id,
          }));
          addLog("ORCHESTRATOR", `Workflow assigned ID: ${data.workflow_id}`);
        } else if (event === "status_change") {
          if (data.status === "PLANNING") setCurrentStage("PLANNING");
          else if (data.status === "SYNTHESIZING") setCurrentStage("SYNTHESIZING");
        } else if (event === "plan_generated") {
          setCurrentStage("RESEARCHING");
          setWorkflowState((prev) => ({
            ...(prev || initialState),
            plan: {
              plan_id: data.plan_id,
              rationale: data.rationale,
              steps: data.steps,
            },
          }));
          addLog("PLANNER", `Plan generated with ${data.steps?.length || 0} discrete steps.`);
        } else if (event === "wave_started") {
          addLog("EXECUTOR", `Launching execution wave for steps: [${data.step_ids.join(", ")}]`);
        } else if (event === "step_started") {
          addLog(
            "EXECUTOR",
            `Running step '${data.title}'${data.requires_research ? " (with live web search)" : ""}`
          );
        } else if (event === "step_completed") {
          setWorkflowState((prev) => {
            if (!prev) return prev;
            const updatedOutputs = { ...prev.step_outputs };
            updatedOutputs[data.step_id] = {
              step_id: data.step_id,
              title: data.title,
              output: data.output,
              key_findings: data.key_findings,
              sources: data.sources,
              status: "PASSED",
              latency: data.latency,
            };

            // Merge sources cleanly without duplicates
            const existingUrls = new Set((prev.sources || []).map((s) => s.url));
            const newSources = [...(prev.sources || [])];
            (data.sources || []).forEach((src: SourceCitation) => {
              if (!existingUrls.has(src.url)) {
                newSources.push(src);
                existingUrls.add(src.url);
              }
            });

            return {
              ...prev,
              step_outputs: updatedOutputs,
              sources: newSources,
            };
          });
          addLog(
            "EXECUTOR",
            `Step '${data.title}' delivered output. Found ${data.sources?.length || 0} source citations.`
          );
        } else if (event === "critic_audit_started") {
          setCurrentStage("VALIDATING");
          addLog("CRITIC", `Auditing step '${data.step_id}' against evidence and quality thresholds...`);
        } else if (event === "step_retry") {
          addLog(
            "CRITIC",
            `Step '${data.step_id}' rejected (attempt ${data.attempt}). Critique: ${data.critique}`,
            "warning"
          );
        } else if (event === "step_verdict") {
          addLog(
            "CRITIC",
            `Audit completed for '${data.step_id}'. Decision: ${data.decision} (Scores: Corr=${(data.scores?.correctness * 100).toFixed(0)}%, Comp=${(data.scores?.completeness * 100).toFixed(0)}%)`
          );
        } else if (event === "synthesis_ready") {
          setCurrentStage("SYNTHESIZING");
          setWorkflowState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              final_result: data.final_result,
              sources: data.sources || prev.sources,
            };
          });
          addLog("SYNTHESIZER", "Synthesizer compiled final grounded report with real citations.");
        } else if (event === "workflow_completed") {
          setCurrentStage("COMPLETED");
          setIsRunning(false);
          setActiveWorkflowId(data.workflow_id);
          setWorkflowState((prev) => ({
            ...(prev || initialState),
            workflow_id: data.workflow_id,
            status: "COMPLETED",
            final_result: data.final_result,
            sources: data.sources || [],
            total_tokens: data.total_tokens || 0,
            estimated_cost_usd: data.estimated_cost_usd || 0,
          }));
          addLog("ORCHESTRATOR", "Workflow successfully completed and verified!");
          success("Research workflow completed with verified sources!", "Research Complete");
        } else if (event === "workflow_failed") {
          setCurrentStage("FAILED");
          setIsRunning(false);
          setErrorBanner(data.error || "Workflow failed to complete.");
          addLog("ORCHESTRATOR", `Workflow failed: ${data.error}`, "error");
        } else if (event === "error") {
          setErrorBanner(data.message || "An execution error occurred.");
          addLog("ERROR", data.message || "An execution error occurred.", "error");
        }
      },
      (err: Error) => {
        setIsRunning(false);
        setCurrentStage("FAILED");
        setErrorBanner(err.message);
        addLog("ERROR", err.message, "error");
        error(err.message, "Execution Error");
      },
      () => {
        setIsRunning(false);
      },
      abortController.signal
    );
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsRunning(false);
      info("Workflow execution stopped.", "Halted");
      addLog("ORCHESTRATOR", "Execution halted by user.");
    }
  };

  const handleDownloadReport = async (format: "md" | "txt") => {
    if (!activeWorkflowId || !token) {
      error("Workflow ID not available yet", "Download Failed");
      return;
    }
    setDownloadingFormat(format);
    try {
      const { blob, filename } = await apiDownloadWorkflow(activeWorkflowId, format, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success(`Report downloaded as ${format.toUpperCase()}`, "Download Complete");
    } catch (err: any) {
      error(err.message || "Failed to download report", "Download Error");
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        {/* Research Input & Configuration Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/80 p-5 sm:p-6 shadow-xl dark:shadow-2xl backdrop-blur-md transition-colors">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Research Objective & Query</span>
                </label>
              </div>

              <textarea
                rows={3}
                value={goal}
                disabled={isRunning}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Conduct a research in the automobile industry and list out the best car model under 10 lakh in EV vs Diesel."
                className={`w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-3.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors font-sans ${
                  isRunning ? "opacity-60 cursor-not-allowed" : ""
                }`}
              />
            </div>

            {/* Execution Controls */}
            <div className="flex items-center justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                onClick={handleRun}
                disabled={isRunning || !goal.trim()}
                className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-lg transition-all ${
                  isRunning
                    ? "bg-indigo-600/70 cursor-not-allowed opacity-90 shadow-none ring-2 ring-indigo-500/30"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25 hover:scale-[1.02] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {isRunning ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Researching & Grounding Results...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-white" />
                    <span>Run Multi-Agent Research</span>
                  </>
                )}
              </button>
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
              className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4-Stage Research Stepper */}
        {(isRunning || currentStage !== "IDLE") && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/80 p-4 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Stage 1: Planning */}
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  currentStage === "PLANNING"
                    ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                    : currentStage !== "IDLE"
                    ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400"
                    : "border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-400">
                  1
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>1. DAG Planning</span>
                    {currentStage === "PLANNING" && (
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500">Decomposing goal</div>
                </div>
              </div>

              {/* Stage 2: Researching */}
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  currentStage === "RESEARCHING"
                    ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/30 ring-1 ring-sky-500"
                    : ["VALIDATING", "SYNTHESIZING", "COMPLETED"].includes(currentStage)
                    ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400"
                    : "border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center font-bold text-xs text-sky-600 dark:text-sky-400">
                  2
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>2. Web Search</span>
                    {currentStage === "RESEARCHING" && (
                      <span className="h-2 w-2 rounded-full bg-sky-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500">Live evidence collection</div>
                </div>
              </div>

              {/* Stage 3: Validating */}
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  currentStage === "VALIDATING"
                    ? "border-purple-500 bg-purple-50/60 dark:bg-purple-950/30 ring-1 ring-purple-500"
                    : ["SYNTHESIZING", "COMPLETED"].includes(currentStage)
                    ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400"
                    : "border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center font-bold text-xs text-purple-600 dark:text-purple-400">
                  3
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>3. Critic Audit</span>
                    {currentStage === "VALIDATING" && (
                      <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500">Fact-checking & quality</div>
                </div>
              </div>

              {/* Stage 4: Synthesizing */}
              <div
                className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                  currentStage === "SYNTHESIZING"
                    ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                    : currentStage === "COMPLETED"
                    ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                    : "border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  4
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>4. Final Synthesis</span>
                    {currentStage === "SYNTHESIZING" && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    )}
                    {currentStage === "COMPLETED" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500">Deliverable & citations</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Research Report View */}
        {workflowState?.final_result && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/90 shadow-xl overflow-hidden">
            {/* Report Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Verified Research Report
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Grounded with {workflowState.sources?.length || 0} external sources • Tokens:{" "}
                    {workflowState.total_tokens.toLocaleString()} • Cost: $
                    {workflowState.estimated_cost_usd.toFixed(4)} USD
                  </p>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadReport("md")}
                  disabled={downloadingFormat === "md"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Download .MD</span>
                </button>
                <button
                  onClick={() => handleDownloadReport("txt")}
                  disabled={downloadingFormat === "txt"}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .TXT</span>
                </button>
              </div>
            </div>

            {/* Markdown Report Body */}
            <div className="p-6 sm:p-8 font-sans text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed space-y-4">
              <div className="prose dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-6 mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-white mt-5 mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mt-4 mb-1">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300 divide-y divide-zinc-200 dark:divide-zinc-800">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-zinc-100 dark:bg-zinc-900 font-semibold">{children}</thead>
                    ),
                    th: ({ children }) => <th className="p-3 font-semibold">{children}</th>,
                    td: ({ children }) => <td className="p-3 border-t border-zinc-200 dark:border-zinc-800">{children}</td>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 italic bg-zinc-50 dark:bg-zinc-900/40 rounded-r-lg my-3">
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-0.5"
                      >
                        <span>{children}</span>
                        <ExternalLink className="h-3 w-3 inline ml-0.5" />
                      </a>
                    ),
                  }}
                >
                  {workflowState.final_result}
                </ReactMarkdown>
              </div>
            </div>

            {/* Interactive Verified Sources Grid */}
            {workflowState.sources && workflowState.sources.length > 0 && (
              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-sky-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Live Web Citations ({workflowState.sources.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {workflowState.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-3.5 hover:border-indigo-500/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 truncate max-w-[160px]">
                            {src.domain}
                          </span>
                          <ExternalLink className="h-3 w-3 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {src.title}
                        </h4>
                        {src.snippet && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 italic">
                            &quot;{src.snippet}&quot;
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
