"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  WorkflowStateData,
  WorkflowListItem,
  SourceCitation,
  StepOutputData,
  SSEMessageEvent,
  streamWorkflowExecution,
  streamFollowUpExecution,
  apiGetWorkflow,
  apiDownloadWorkflow,
} from "@/lib/api";

export interface ResearchActivityItem {
  id: string;
  type: string;
  agent?: string;
  message: string;
  query?: string;
  platform?: string;
  domains?: string[];
  step_id?: string;
  timestamp: string;
}

export interface FollowUpItem {
  id: string;
  query: string;
  answer: string;
  sources?: SourceCitation[];
  suggested_questions?: string[];
  timestamp: string;
  status: "RUNNING" | "COMPLETED" | "FAILED";
}

export type StageType =
  | "IDLE"
  | "PLANNING"
  | "RESEARCHING"
  | "VALIDATING"
  | "SYNTHESIZING"
  | "COMPLETED"
  | "FAILED";

interface ResearchContextType {
  goal: string;
  setGoal: (goal: string) => void;
  isRunning: boolean;
  activeWorkflowId: string | null;
  setActiveWorkflowId: (id: string | null) => void;
  workflowState: WorkflowStateData | null;
  setWorkflowState: React.Dispatch<React.SetStateAction<WorkflowStateData | null>>;
  currentStage: StageType;
  setCurrentStage: (stage: StageType) => void;
  activities: ResearchActivityItem[];
  setActivities: React.Dispatch<React.SetStateAction<ResearchActivityItem[]>>;
  activeSearchQuery: string | null;
  activePlatform: string | null;
  elapsedSeconds: number;
  errorBanner: string | null;
  setErrorBanner: (err: string | null) => void;
  liveSidebarItem: WorkflowListItem | null;
  setLiveSidebarItem: (item: WorkflowListItem | null) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  researchDepth: "quick" | "standard" | "deep";
  setResearchDepth: (depth: "quick" | "standard" | "deep") => void;
  activeFocusMode: string;
  setActiveFocusMode: (mode: string) => void;
  followUps: FollowUpItem[];
  setFollowUps: React.Dispatch<React.SetStateAction<FollowUpItem[]>>;
  isFollowUpRunning: boolean;
  followUpQuery: string;
  setFollowUpQuery: (q: string) => void;
  downloadingFormat: string | null;
  copied: boolean;
  isLoadingWorkflow: boolean;
  handleRun: (customPrompt?: string) => Promise<void>;
  handleStop: () => void;
  handleNewResearch: () => void;
  handleFollowUpSubmit: (queryText?: string) => Promise<void>;
  handleSelectWorkflow: (wfId: string) => Promise<void>;
  handleDownloadReport: (format: "md" | "txt" | "pdf") => Promise<void>;
  handleCopyReport: () => void;
}

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, isAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [goal, setGoal] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const activeWorkflowIdRef = useRef<string | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowStateData | null>(null);
  const [currentStage, setCurrentStage] = useState<StageType>("IDLE");
  const [activities, setActivities] = useState<ResearchActivityItem[]>([]);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [liveSidebarItem, setLiveSidebarItem] = useState<WorkflowListItem | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash");
  const [researchDepth, setResearchDepth] = useState<"quick" | "standard" | "deep">("deep");
  const [activeFocusMode, setActiveFocusMode] = useState<string>("deep");
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [isFollowUpRunning, setIsFollowUpRunning] = useState(false);
  const [followUpQuery, setFollowUpQuery] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const followUpAbortControllerRef = useRef<AbortController | null>(null);

  // Timer persists continuously even when navigating between pages
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  // Cleanly isolate user sessions: reset active state when auth token changes
  const prevTokenRef = useRef<string | null>(token);
  useEffect(() => {
    if (prevTokenRef.current !== token) {
      prevTokenRef.current = token;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (followUpAbortControllerRef.current) {
        followUpAbortControllerRef.current.abort();
        followUpAbortControllerRef.current = null;
      }
      setIsRunning(false);
      setGoal("");
      setFollowUpQuery("");
      setWorkflowState(null);
      setCurrentStage("IDLE");
      setActiveWorkflowId(null);
      activeWorkflowIdRef.current = null;
      setActivities([]);
      setErrorBanner(null);
      setFollowUps([]);
      setIsFollowUpRunning(false);
      setLiveSidebarItem(null);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("workflow_id")) {
          url.searchParams.delete("workflow_id");
          window.history.replaceState({}, "", url.pathname);
        }
      }
    }
  }, [token]);

  const handleRun = useCallback(
    async (customPrompt?: string) => {
      const promptToRun = (customPrompt || goal).trim();
      if (!promptToRun || isRunning) return;

      if (isAdmin) {
        error(
          "Research execution is reserved for Researcher (User) accounts. Platform administrators govern the system from the Admin Console.",
          "Admin Restricted"
        );
        return;
      }
      if (!token) {
        error("Authentication required. Please sign in.", "Auth Required");
        router.push("/login");
        return;
      }

      if (customPrompt) {
        setGoal(customPrompt);
      }

      setIsRunning(true);
      setErrorBanner(null);
      setCurrentStage("PLANNING");
      setActivities([]);
      setActiveSearchQuery(null);
      setActivePlatform(null);
      setElapsedSeconds(0);

      const initialState: WorkflowStateData = {
        task: promptToRun,
        status: "PLANNING",
        step_outputs: {},
        sources: [],
        total_tokens: 0,
        estimated_cost_usd: 0,
        final_result: undefined,
      };
      setWorkflowState(initialState);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      await streamWorkflowExecution(
        promptToRun,
        "parallel",
        token,
        ({ event, data }: SSEMessageEvent) => {
          if (event === "workflow_started") {
            activeWorkflowIdRef.current = data.workflow_id;
            setActiveWorkflowId(data.workflow_id);
            setWorkflowState((prev) => ({
              ...(prev || initialState),
              workflow_id: data.workflow_id,
              status: "PLANNING",
            }));
            setLiveSidebarItem({
              workflow_id: data.workflow_id,
              task: promptToRun,
              status: "RUNNING",
              total_tokens: 0,
              estimated_cost_usd: 0,
              created_at: new Date().toISOString(),
            });
          } else if (event === "plan_generated" || event === "plan_created") {
            setCurrentStage("RESEARCHING");
            setWorkflowState((prev) => {
              if (!prev) return prev;
              const updatedSteps: Record<string, StepOutputData> = {};
              data.steps?.forEach((step: any) => {
                updatedSteps[step.step_id] = {
                  step_id: step.step_id,
                  title: step.title,
                  output: "",
                  key_findings: [],
                  sources: [],
                  status: "PENDING",
                };
              });
              return {
                ...prev,
                status: "EXECUTING",
                plan: { steps: data.steps },
                step_outputs: updatedSteps,
              };
            });
          } else if (event === "wave_started" || event === "step_started") {
            setCurrentStage("RESEARCHING");
            if (data.step_id) {
              setWorkflowState((prev) => {
                if (!prev) return prev;
                const updatedOutputs = { ...prev.step_outputs };
                if (updatedOutputs[data.step_id]) {
                  updatedOutputs[data.step_id] = {
                    ...updatedOutputs[data.step_id],
                    status: "EXECUTING",
                  };
                }
                return { ...prev, step_outputs: updatedOutputs };
              });
            }
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
          } else if (event === "critic_audit_started") {
            setCurrentStage("VALIDATING");
          } else if (event === "activity") {
            setActivities((prev) => [data, ...prev].slice(0, 60));
            if (data.type === "search_started" || data.type === "search") {
              setActiveSearchQuery(data.query || null);
              setActivePlatform(data.platform || "DuckDuckGo Lite");
            } else if (data.type === "sources_retrieved" || data.type === "step_completed") {
              setActiveSearchQuery(null);
            }
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
          } else if (event === "workflow_completed") {
            setCurrentStage("COMPLETED");
            setIsRunning(false);
            setActiveWorkflowId(data.workflow_id);
            activeWorkflowIdRef.current = data.workflow_id;
            setWorkflowState((prev) => ({
              ...(prev || initialState),
              workflow_id: data.workflow_id,
              status: "COMPLETED",
              final_result: data.final_result || prev?.final_result,
              sources: data.sources || prev?.sources || [],
              total_tokens: data.total_tokens || prev?.total_tokens || 0,
              estimated_cost_usd: data.estimated_cost_usd || prev?.estimated_cost_usd || 0,
            }));
            setLiveSidebarItem({
              workflow_id: data.workflow_id,
              task: promptToRun,
              status: "COMPLETED",
              total_tokens: data.total_tokens || 0,
              estimated_cost_usd: data.estimated_cost_usd || 0,
              created_at: new Date().toISOString(),
            });
          } else if (event === "workflow_failed") {
            setCurrentStage("FAILED");
            setIsRunning(false);
            setErrorBanner(data.error || "Workflow failed to complete.");
          } else if (event === "error") {
            setIsRunning(false);
            setCurrentStage("FAILED");
            setErrorBanner(data.message || "An execution error occurred.");
          }
        },
        (err: Error) => {
          setIsRunning(false);
          setCurrentStage("FAILED");
          setErrorBanner(err.message);
          error(err.message, "Execution Error");
        },
        async () => {
          setIsRunning(false);
          const wfId = activeWorkflowIdRef.current;
          if (wfId && token) {
            try {
              const record = await apiGetWorkflow(wfId, token);
              if (record && record.state) {
                const stateDict = record.state;
                if (stateDict.final_result) {
                  setWorkflowState((prev) => ({
                    ...(prev || initialState),
                    workflow_id: record.workflow_id,
                    status: record.status || "COMPLETED",
                    final_result: stateDict.final_result,
                    sources: stateDict.sources || prev?.sources || [],
                    total_tokens: record.total_tokens ?? prev?.total_tokens ?? 0,
                    estimated_cost_usd: record.estimated_cost_usd ?? prev?.estimated_cost_usd ?? 0,
                  }));
                  setCurrentStage("COMPLETED");
                }
              }
            } catch (e) {
              console.warn("Could not sync final workflow state from DB:", e);
            }
          }
        },
        abortController.signal,
        selectedModel
      );
    },
    [goal, isRunning, isAdmin, token, selectedModel, router, success, error]
  );

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsRunning(false);
    setCurrentStage("IDLE");
  }, []);

  const handleNewResearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (followUpAbortControllerRef.current) {
      followUpAbortControllerRef.current.abort();
      followUpAbortControllerRef.current = null;
    }
    setIsRunning(false);
    setGoal("");
    setFollowUpQuery("");
    setWorkflowState(null);
    setCurrentStage("IDLE");
    setActiveWorkflowId(null);
    activeWorkflowIdRef.current = null;
    setActivities([]);
    setErrorBanner(null);
    setFollowUps([]);
    setIsFollowUpRunning(false);
    setIsLoadingWorkflow(false);
    if (typeof window !== "undefined") {
      // Use history.replaceState to silently clear the URL without triggering
      // a Next.js navigation (which causes a visible page flash).
      const url = new URL(window.location.href);
      url.searchParams.delete("workflow_id");
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);

  const handleFollowUpSubmit = useCallback(
    async (queryText?: string) => {
      const q = (queryText || followUpQuery).trim();
      if (!q || isRunning || isFollowUpRunning || !token) return;

      setFollowUpQuery("");
      setIsFollowUpRunning(true);
      const followUpId = `fup_${Date.now()}`;
      const newFollowUp: FollowUpItem = {
        id: followUpId,
        query: q,
        answer: "",
        sources: [],
        timestamp: new Date().toISOString(),
        status: "RUNNING",
      };

      setFollowUps((prev) => [...prev, newFollowUp]);

      const abortController = new AbortController();
      followUpAbortControllerRef.current = abortController;

      try {
        await streamFollowUpExecution(
          {
            workflow_id: activeWorkflowId || undefined,
            task: workflowState?.task || goal,
            report_content: workflowState?.final_result || "",
            query: q,
            history: followUps.map((f) => ({ query: f.query, answer: f.answer })),
            model: selectedModel,
          },
          token,
          ({ event, data }: SSEMessageEvent) => {
            if (
              event === "synthesis_ready" ||
              event === "follow_up_completed" ||
              event === "workflow_completed"
            ) {
              const finalAns = data.final_result || data.answer;
              if (finalAns) {
                setFollowUps((prev) =>
                  prev.map((item) =>
                    item.id === followUpId
                      ? {
                          ...item,
                          answer: finalAns,
                          sources: data.sources || item.sources || [],
                          suggested_questions: data.suggested_questions || item.suggested_questions || [],
                          status: "COMPLETED",
                        }
                      : item
                  )
                );
              }
            } else if (event === "workflow_failed" || event === "error") {
              setFollowUps((prev) =>
                prev.map((item) =>
                  item.id === followUpId
                    ? {
                        ...item,
                        answer: data.error || data.message || "Failed to generate follow-up answer.",
                        status: "FAILED",
                      }
                    : item
                )
              );
            }
          },
          (err: Error) => {
            if (err.name === "AbortError") {
              setIsFollowUpRunning(false);
              return;
            }
            setFollowUps((prev) =>
              prev.map((item) =>
                item.id === followUpId
                  ? {
                      ...item,
                      answer: `Error: ${err.message}`,
                      status: "FAILED",
                    }
                  : item
              )
            );
            setIsFollowUpRunning(false);
          },
          () => {
            setIsFollowUpRunning(false);
          },
          abortController.signal
        );
      } catch (e: any) {
        setIsFollowUpRunning(false);
        setFollowUps((prev) =>
          prev.map((item) =>
            item.id === followUpId
              ? { ...item, answer: `Error executing follow-up: ${e.message}`, status: "FAILED" }
              : item
          )
        );
      }
    },
    [followUpQuery, isRunning, isFollowUpRunning, token, activeWorkflowId, workflowState, goal, followUps, selectedModel]
  );

  const handleSelectWorkflow = useCallback(
    async (wfId: string) => {
      if (!token) return;
      setActiveWorkflowId(wfId);
      activeWorkflowIdRef.current = wfId;
      setFollowUps([]);
      setIsFollowUpRunning(false);
      setIsLoadingWorkflow(true);
      setWorkflowState(null);
      try {
        const record = await apiGetWorkflow(wfId, token);
        if (record && record.state) {
          const stateDict = record.state;
          setGoal(record.task || "");
          setWorkflowState({
            workflow_id: record.workflow_id,
            task: record.task,
            status: record.status || "COMPLETED",
            final_result: stateDict.final_result,
            sources: stateDict.sources || [],
            total_tokens: record.total_tokens || 0,
            estimated_cost_usd: record.estimated_cost_usd || 0,
            step_outputs: stateDict.step_outputs || {},
            plan: stateDict.plan,
            follow_ups: stateDict.follow_ups,
          });
          setCurrentStage("COMPLETED");

          // Keep browser URL in sync so history navigation doesn't revert
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            if (url.searchParams.get("workflow_id") !== record.workflow_id) {
              url.searchParams.set("workflow_id", record.workflow_id);
              window.history.replaceState({}, "", url.toString());
            }
          }

          // Restore persisted follow-up inquiries if present
          if (Array.isArray(stateDict.follow_ups) && stateDict.follow_ups.length > 0) {
            setFollowUps(stateDict.follow_ups);
          } else {
            setFollowUps([]);
          }
        }
      } catch (e: any) {
        error(e.message || "Failed to load workflow", "Error");
      } finally {
        setIsLoadingWorkflow(false);
      }
    },
    [token, error]
  );

  const handleCopyReport = useCallback(() => {
    if (!workflowState?.final_result) return;
    navigator.clipboard.writeText(workflowState.final_result);
    setCopied(true);
    success("Verified research report copied to clipboard!", "Copied");
    setTimeout(() => setCopied(false), 2000);
  }, [workflowState, success]);

  const handleDownloadReport = useCallback(
    async (format: "md" | "txt" | "pdf") => {
      const wfId = activeWorkflowId || activeWorkflowIdRef.current;
      setDownloadingFormat(format);
      try {
        if (wfId && token) {
          const { blob, filename } = await apiDownloadWorkflow(wfId, format, token);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;

          // Ensure report-question-based slug is used if backend filename is missing or generic
          const rawTitle = workflowState?.task || "";
          const taskSlug = rawTitle
            .replace(/[^\w\s-]/g, "")
            .trim()
            .toLowerCase()
            .replace(/[-\s]+/g, "-")
            .slice(0, 55);
          const finalFilename =
            (!filename || filename.startsWith("synora_") || filename.startsWith("synora-")) && taskSlug
              ? `${taskSlug}.${format}`
              : (filename || `synora_report.${format}`);

          a.download = finalFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          success(`Report downloaded as ${format.toUpperCase()}`, "Download Complete");
          return;
        }
        if (workflowState?.final_result) {
          if (format === "pdf") {
            window.print();
            return;
          }
          const blob = new Blob([workflowState.final_result], {
            type: format === "md" ? "text/markdown" : "text/plain",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `synora_report.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          success(`Report downloaded as ${format.toUpperCase()}`, "Download Complete");
          return;
        }
        error("Report is not ready yet", "Download Failed");
      } catch (err: any) {
        error(err.message || "Failed to download report", "Download Error");
      } finally {
        setDownloadingFormat(null);
      }
    },
    [activeWorkflowId, token, workflowState, success, error]
  );

  const value: ResearchContextType = {
    goal,
    setGoal,
    isRunning,
    activeWorkflowId,
    setActiveWorkflowId,
    workflowState,
    setWorkflowState,
    currentStage,
    setCurrentStage,
    activities,
    setActivities,
    activeSearchQuery,
    activePlatform,
    elapsedSeconds,
    errorBanner,
    setErrorBanner,
    liveSidebarItem,
    setLiveSidebarItem,
    selectedModel,
    setSelectedModel,
    researchDepth,
    setResearchDepth,
    activeFocusMode,
    setActiveFocusMode,
    followUps,
    setFollowUps,
    isFollowUpRunning,
    followUpQuery,
    setFollowUpQuery,
    downloadingFormat,
    copied,
    isLoadingWorkflow,
    handleRun,
    handleStop,
    handleNewResearch,
    handleFollowUpSubmit,
    handleSelectWorkflow,
    handleDownloadReport,
    handleCopyReport,
  };

  return <ResearchContext.Provider value={value}>{children}</ResearchContext.Provider>;
}

export function useResearch() {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error("useResearch must be used within a ResearchProvider");
  }
  return context;
}
