/**
 * Live Pipeline Stage Events
 * Event-sourced discriminated union for deterministic simulation and playback.
 */

import type { AgentRole } from "./pipelineSpec";

export interface PlanStepDef {
  id: string;
  title: string;
  shortTitle: string;
  dependencies: string[];
  objective: string;
  assignedRole: AgentRole;
  isFallback?: boolean;
}

export interface PlanDef {
  workflowId: string;
  task: string;
  modelBudget: "Standard" | "High Performance" | "Economy";
  steps: PlanStepDef[];
  rationale: string;
}

export interface ToolCallPayload {
  stepId: string;
  toolName: "web_search" | "page_extract" | "price_tracker" | "benchmark_fetch";
  domain: string;
  queryOrUrl: string;
  status: "started" | "succeeded" | "failed";
  durationMs?: number;
  errorMessage?: string;
}

export interface StepOutputDef {
  stepId: string;
  attempt: number;
  content: string;
  keyFindings: string[];
  sourceCitations: Array<{ title: string; domain: string; url: string }>;
  executionDurationMs: number;
  hallucinationScore: number; // 0.0 to 1.0 (must be 0.0 to PASS)
}

export interface CriticReviewScores {
  correctness: number; // 0.0 to 1.0
  completeness: number; // 0.0 to 1.0
  relevance: number; // 0.0 to 1.0
  composite: number; // weighted composite
  hallucination: number; // 0.0 = pure factual alignment
}

export interface CriticReviewDef {
  stepId: string;
  attempt: number;
  decision: "PASS" | "REJECT";
  scores: CriticReviewScores;
  critiqueReason: string;
  actionableFeedback?: string;
}

export interface MatrixRowDef {
  spec: string;
  contenderA: string;
  contenderB: string;
  contenderC: string;
  verdict: string;
}

export interface CitationItemDef {
  id: string;
  title: string;
  domain: string;
  url: string;
  verified: boolean;
}

export interface PacketPayload {
  id: string;
  type: "PLAN" | "STEP_OUTPUT" | "CRITIC_REVIEW" | "MUTATED_PLAN" | "REPORT";
  sourceStation: "INPUT" | "PLANNER" | "DAG" | "CRITIC" | "REPLANNER" | "SYNTHESIZER";
  targetStation: "PLANNER" | "DAG" | "CRITIC" | "REPLANNER" | "SYNTHESIZER" | "OUTPUT";
  label: string;
  summary: string;
  data: Record<string, unknown>;
}

export type PipelineEvent =
  | {
      type: "TASK_RECEIVED";
      timestamp: number;
      task: string;
      modelBudget: "Standard" | "High Performance" | "Economy";
      operationalContext: string;
    }
  | {
      type: "PLAN_CREATED";
      timestamp: number;
      plan: PlanDef;
      packet: PacketPayload;
    }
  | {
      type: "PLAN_VALIDATED";
      timestamp: number;
      stepCount: number;
      isAcyclic: boolean;
      topologicalOrder: string[];
      invariantsChecked: Array<{ id: string; pass: boolean; label: string }>;
    }
  | {
      type: "STEP_STARTED";
      timestamp: number;
      stepId: string;
      attempt: number;
      activeDependencies: string[];
    }
  | {
      type: "TOOL_CALL";
      timestamp: number;
      toolCall: ToolCallPayload;
    }
  | {
      type: "SCRATCHPAD_WRITE";
      timestamp: number;
      stepId: string;
      keyFindings: string[];
      summaryToken: string;
    }
  | {
      type: "STEP_OUTPUT_EMITTED";
      timestamp: number;
      output: StepOutputDef;
      packet: PacketPayload;
    }
  | {
      type: "CRITIC_REVIEW";
      timestamp: number;
      review: CriticReviewDef;
      packet: PacketPayload;
      firedInvariantId?: string;
    }
  | {
      type: "STEP_RETRY";
      timestamp: number;
      stepId: string;
      attempt: number;
      critique: string;
    }
  | {
      type: "STEP_EXHAUSTED";
      timestamp: number;
      stepId: string;
      totalAttempts: number;
      reason: string;
    }
  | {
      type: "REPLAN_STARTED";
      timestamp: number;
      exhaustedStepId: string;
      replanCount: number;
      workflowStateSnapshot: { passedSteps: string[]; pendingSteps: string[] };
    }
  | {
      type: "PLAN_MUTATED";
      timestamp: number;
      replanCount: number;
      mutatedPlan: PlanDef;
      injectedStepIds: string[];
      lockedStepIds: string[];
      mutationRationale: string;
      packet: PacketPayload;
    }
  | {
      type: "STEP_LOCKED";
      timestamp: number;
      stepId: string;
      reason: string;
    }
  | {
      type: "SYNTHESIS_STARTED";
      timestamp: number;
      approvedStepIds: string[];
    }
  | {
      type: "REPORT_SECTION_STREAMED";
      timestamp: number;
      sectionId: string;
      title: string;
      contentSnippet: string;
      matrixRow?: MatrixRowDef;
      citation?: CitationItemDef;
    }
  | {
      type: "WORKFLOW_COMPLETED";
      timestamp: number;
      reportSummary: string;
      finalScore: number;
      totalTokens: number;
      durationSeconds: number;
    };
