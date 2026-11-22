import type { PlanStepData, StepOutputData, SourceCitation, WorkflowStateData } from "./api";

export type StageType =
  | "IDLE"
  | "PLANNING"
  | "RESEARCHING"
  | "VALIDATING"
  | "SYNTHESIZING"
  | "COMPLETED"
  | "FAILED"
  | "REFINING";

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

export type ResearchPhase =
  | "planning"
  | "researching"
  | "reviewing"
  | "refining"
  | "synthesizing"
  | "complete"
  | "stopped"
  | "error";

export interface ResearchStepViewModel {
  id: string;
  title: string;
  status: "pending" | "active" | "running" | "passed" | "completed" | "failed" | "retrying";
  currentQuery?: string;
  activeQuery?: string;
  attempts?: number;
  criticNote?: string;
  plainDependencies?: string;
}

export interface ResearchSourceViewModel {
  id: string;
  url: string;
  domain: string;
  title: string;
  favicon?: string;
  faviconUrl?: string;
  snippet?: string;
  type?: string;
}

export type SourceItem = ResearchSourceViewModel;
export type ResearchStepItem = ResearchStepViewModel;
export type LiveSourceChipItem = { id?: string; domain: string; url: string; favicon?: string; faviconUrl?: string };

export interface ResearchCitationViewModel {
  id: number;
  domain: string;
  url: string;
  title: string;
  snippet?: string;
}

export interface ResearchProcessStage {
  id: string;
  num?: string;
  name: string;
  agent: string;
  role: string;
  status: "pending" | "current" | "completed";
  key?: StageType;
  label?: string;
  description?: string;
  isCurrent?: boolean;
  isPassed?: boolean;
}

export interface ResearchProcessAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: string;
  lastActivity: string;
  count?: number;
  colorToken?: string;
}

export interface ResearchTelemetryItem {
  timestamp: string;
  agent: string;
  message: string;
  type?: string;
  raw?: any;
}

export interface ProcessViewModel {
  stages: ResearchProcessStage[];
  steps?: ResearchStepViewModel[];
  agents: ResearchProcessAgent[];
  criticScore?: number;
  criticFeedback?: string;
  criticThreshold?: number;
  telemetry?: ResearchTelemetryItem[];
  activities?: ResearchActivityItem[];
  model?: string;
  mode?: "quick" | "standard" | "deep";
  tokens?: number;
  totalTokens?: number;
  cost?: number;
  elapsedSeconds?: number;
  activeSearchQuery?: string | null;
}

export interface ResearchViewModel {
  task: string;
  phase: ResearchPhase;
  statusText: string;
  elapsedSeconds: number;
  elapsedMs: number;
  formattedElapsed: string;
  stepCount: { completed: number; total: number };
  steps: ResearchStepViewModel[];
  sources: ResearchSourceViewModel[];
  liveSourceChips: LiveSourceChipItem[];
  answerMarkdown: string | null;
  citations: ResearchCitationViewModel[];
  relatedQuestions: string[];
  images: Array<{ url: string; alt?: string; caption?: string }>;
  process: ProcessViewModel;
}

export interface BuildViewModelOptions {
  task: string;
  currentStage: StageType | string;
  workflowState?: WorkflowStateData | null;
  activities?: ResearchActivityItem[];
  searchedDomains?: string[];
  activeSearchQuery?: string | null;
  activePlatform?: string | null;
  elapsedSeconds?: number;
  selectedModelName?: string;
  researchDepth?: "quick" | "standard" | "deep";
  isRunning?: boolean;
  isStopped?: boolean;
  errorMessage?: string | null;
}

/**
 * Derives a clean domain from a URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Returns Google Favicon service URL for a domain
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

/**
 * Formats seconds into "0:35" or "1m 40s"
 */
export function formatDuration(seconds: number, format: "clock" | "natural" = "clock"): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (format === "natural") {
    if (mins === 0) return `${secs}s`;
    return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Maps raw backend state into a decoupled, clean ResearchViewModel
 */
export function buildResearchViewModel(opts: BuildViewModelOptions): ResearchViewModel {
  const {
    task,
    currentStage,
    workflowState,
    activities = [],
    searchedDomains = [],
    activeSearchQuery,
    elapsedSeconds = 0,
    selectedModelName = "Gemini 3.5 Flash",
    researchDepth = "standard",
    isRunning = false,
    isStopped = false,
    errorMessage = null,
  } = opts;

  // Determine current phase
  let phase: ResearchPhase = "planning";
  if (errorMessage) {
    phase = "error";
  } else if (isStopped) {
    phase = "stopped";
  } else if (workflowState?.final_result || currentStage === "COMPLETED") {
    phase = "complete";
  } else {
    const stg = String(currentStage || "").toUpperCase();
    switch (stg) {
      case "PLANNING":
        phase = "planning";
        break;
      case "RESEARCHING":
      case "EXECUTING":
        phase = "researching";
        break;
      case "VALIDATING":
      case "CRITIQUE":
        phase = "reviewing";
        break;
      case "REFINING":
      case "REPLANNING":
        phase = "refining";
        break;
      case "SYNTHESIZING":
        phase = "synthesizing";
        break;
      default:
        phase = isRunning ? "researching" : "planning";
    }
  }

  // Raw plan steps & outputs
  const rawSteps: PlanStepData[] = workflowState?.plan?.steps || [];
  const rawOutputs: Record<string, StepOutputData> = workflowState?.step_outputs || {};
  const completedCount = Object.values(rawOutputs).filter((s) => s.status === "PASSED").length;
  const totalCount = rawSteps.length || (Object.keys(rawOutputs).length || 4);

  // Derive plain-language status line
  let statusText = "Planning your research…";
  const sourcesCount = workflowState?.sources?.length || searchedDomains.length;

  if (phase === "error") {
    statusText = errorMessage || "Research encountered an error";
  } else if (phase === "stopped") {
    statusText = "Research stopped";
  } else if (phase === "complete") {
    statusText = `Researched ${sourcesCount} source${sourcesCount === 1 ? "" : "s"} in ${formatDuration(elapsedSeconds, "natural")}`;
  } else if (phase === "planning") {
    if (rawSteps.length > 0) {
      statusText = `Breaking this into ${rawSteps.length} steps`;
    } else {
      statusText = "Planning your research…";
    }
  } else if (phase === "researching") {
    if (activeSearchQuery) {
      statusText = `Searching: ${activeSearchQuery}`;
    } else if (searchedDomains.length > 0) {
      const activeDomain = searchedDomains[searchedDomains.length - 1];
      statusText = `Reading ${activeDomain} · ${sourcesCount} sources`;
    } else {
      statusText = `Searching the web · ${sourcesCount} source${sourcesCount === 1 ? "" : "s"}`;
    }
  } else if (phase === "reviewing") {
    statusText = "Verifying claims against sources…";
  } else if (phase === "refining") {
    statusText = "Filling gaps in the research…";
  } else if (phase === "synthesizing") {
    statusText = "Writing your report…";
  }

  // Derive clean step view-models (no jargon)
  const steps: ResearchStepViewModel[] = rawSteps.map((step, idx) => {
    const out = rawOutputs[step.step_id];
    let stepStatus: ResearchStepViewModel["status"] = "pending";

    if (out?.status === "PASSED" || step.status === "PASSED") {
      stepStatus = "passed";
    } else if (out?.status === "FAILED") {
      stepStatus = "failed";
    } else if (
      out?.status === "EXECUTING" ||
      (phase === "researching" && idx === completedCount)
    ) {
      stepStatus = "active";
    }

    // Critic feedback if rejected
    let criticNote: string | undefined;
    if (out?.critic_review && (out.critic_review.action === "RETRY" || out.critic_review.action === "FAIL")) {
      criticNote = `Found a gap in step ${idx + 1}, searching again`;
      stepStatus = "retrying";
    } else if ((out as any)?.critic_eval && (out as any).critic_eval.score < 0.7) {
      criticNote = `Found a gap in step ${idx + 1}, searching again`;
      stepStatus = "retrying";
    }

    // Plain English dependency
    let plainDependencies: string | undefined;
    if (step.dependencies && step.dependencies.length > 0) {
      const depNumbers = step.dependencies
        .map((d) => {
          const depIdx = rawSteps.findIndex((s) => s.step_id === d);
          return depIdx >= 0 ? `step ${depIdx + 1}` : d;
        })
        .join(", ");
      plainDependencies = `Runs after ${depNumbers}`;
    }

    return {
      id: step.step_id,
      title: step.title,
      status: stepStatus,
      currentQuery: step.search_query || undefined,
      attempts: out?.retry_count || 1,
      criticNote,
      plainDependencies,
    };
  });

  // Normalized Sources (NO fake data; if 0 sources, array is empty)
  const sources: ResearchSourceViewModel[] = (workflowState?.sources || []).map((s, idx) => {
    const domain = s.domain || extractDomain(s.url);
    const favicon = getFaviconUrl(domain);
    return {
      id: s.url || `src-${idx}`,
      url: s.url,
      domain,
      title: s.title || domain,
      favicon,
      faviconUrl: favicon,
      snippet: s.snippet || undefined,
      type: "Web",
    };
  });

  // Live source chips: max 6 most recent, no placeholder
  const liveSourceChips: LiveSourceChipItem[] = sources.slice(-6).map((s) => ({
    id: s.id,
    domain: s.domain,
    url: s.url,
    favicon: s.favicon,
    faviconUrl: s.faviconUrl,
  }));

  // Citations mapping for inline chips
  const citations: ResearchCitationViewModel[] = sources.map((s, idx) => ({
    id: idx + 1,
    domain: s.domain,
    url: s.url,
    title: s.title,
    snippet: s.snippet,
  }));

  // Related questions (clean sentence-case)
  const relatedQuestions: string[] = [
    `What are the most critical trade-offs and alternatives to consider?`,
    `How does this compare against next-generation developments projected through 2027?`,
    `What are the verified real-world operational benchmarks and costs?`,
  ];

  // Images if present in markdown or state
  const images: Array<{ url: string; alt?: string; caption?: string }> = [];
  if (workflowState?.final_result) {
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match: RegExpExecArray | null;
    while ((match = imgRegex.exec(workflowState.final_result)) !== null) {
      if (match[2]) {
        images.push({
          url: match[2],
          alt: match[1] || "Research figure",
          caption: match[1] || undefined,
        });
      }
    }
  }

  // Technical process detail (strictly partitioned for the Process tab)
  const processStages: ResearchProcessStage[] = [
    {
      id: "planning",
      num: "1",
      name: "Planning",
      agent: "Planner Agent",
      role: "Strategic DAG Decomposition",
      status: phase === "planning" ? "current" : rawSteps.length > 0 ? "completed" : "pending",
    },
    {
      id: "researching",
      num: "2",
      name: "Researching",
      agent: "Executor Agent",
      role: "Tool & Web Grounding",
      status:
        phase === "researching"
          ? "current"
          : ["reviewing", "refining", "synthesizing", "complete"].includes(phase)
          ? "completed"
          : "pending",
    },
    {
      id: "reviewing",
      num: "3",
      name: "Auditing",
      agent: "Critic Agent",
      role: "Adversarial Quality Gate",
      status:
        phase === "reviewing"
          ? "current"
          : ["refining", "synthesizing", "complete"].includes(phase)
          ? "completed"
          : "pending",
    },
    {
      id: "refining",
      num: "4",
      name: "Filling Gaps",
      agent: "Re-Planner Agent",
      role: "Dynamic Failure Recovery",
      status:
        phase === "refining"
          ? "current"
          : ["synthesizing", "complete"].includes(phase)
          ? "completed"
          : "pending",
    },
    {
      id: "synthesizing",
      num: "5",
      name: "Synthesis",
      agent: "Synthesizer Agent",
      role: "Evidence Consolidation",
      status: phase === "synthesizing" ? "current" : phase === "complete" ? "completed" : "pending",
    },
  ];

  const processAgents: ResearchProcessAgent[] = [
    {
      id: "planner",
      name: "Planner Agent",
      role: "DAG Decomposition",
      description: "Translates human inquiry into 3–7 discrete, acyclic execution steps.",
      status: phase === "planning" ? "Active" : "Idle",
      lastActivity: rawSteps.length > 0 ? `Generated ${rawSteps.length} step DAG` : "Initializing",
    },
    {
      id: "executor",
      name: "Executor Agent",
      role: "Tool & Search Grounding",
      description: "Invokes live web search, extraction, and domain calculation in parallel waves.",
      status: phase === "researching" ? "Active" : "Idle",
      lastActivity: activeSearchQuery ? `Searching: "${activeSearchQuery}"` : `Extracted ${sources.length} sources`,
    },
    {
      id: "critic",
      name: "Critic Agent",
      role: "Adversarial Gatekeeper",
      description: "Verifies claims against evidence. Requires composite score ≥ 0.70 to commit.",
      status: phase === "reviewing" ? "Active" : "Idle",
      lastActivity: "Auditing factual correctness, relevance, and citations",
    },
    {
      id: "replanner",
      name: "Dynamic Re-Planner",
      role: "In-Flight Recovery",
      description: "Mutates execution graph on repeated failure to prevent cascading loops.",
      status: phase === "refining" ? "Active" : "Standby",
      lastActivity: "Monitoring step execution budget (max 2 retries)",
    },
    {
      id: "synthesizer",
      name: "Synthesizer Agent",
      role: "Report Compiler",
      description: "Consolidates all approved step outputs into an authoritative deliverable.",
      status: phase === "synthesizing" ? "Active" : phase === "complete" ? "Complete" : "Standby",
      lastActivity: workflowState?.final_result ? "Report compiled and citations embedded" : "Waiting for approved step outputs",
    },
  ];

  const telemetry: ResearchTelemetryItem[] = activities.map((act) => ({
    timestamp: act.timestamp,
    agent: act.agent || "System",
    message: act.message,
    type: act.type,
    raw: act,
  }));

  return {
    task,
    phase,
    statusText,
    elapsedSeconds,
    elapsedMs: elapsedSeconds * 1000,
    formattedElapsed: formatDuration(elapsedSeconds, "clock"),
    stepCount: { completed: completedCount, total: totalCount },
    steps,
    sources,
    liveSourceChips,
    answerMarkdown: workflowState?.final_result || null,
    citations,
    relatedQuestions,
    images,
    process: {
      stages: processStages,
      steps,
      agents: processAgents,
      criticThreshold: 0.7,
      telemetry,
      activities,
      model: selectedModelName,
      mode: researchDepth,
      tokens: workflowState?.total_tokens,
      totalTokens: workflowState?.total_tokens || 0,
      cost: workflowState?.estimated_cost_usd,
      elapsedSeconds,
      activeSearchQuery: activeSearchQuery || null,
    },
  };
}
