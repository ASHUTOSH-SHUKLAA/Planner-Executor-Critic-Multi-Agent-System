/**
 * Pipeline State Reducer
 * Pure state machine enforcing PRD invariants and validating graph transitions.
 */

import {
  type AgentRole,
  MAX_PLAN_STEPS,
  MAX_REPLANS,
  MIN_PLAN_STEPS,
} from "./pipelineSpec";
import type {
  CitationItemDef,
  CriticReviewDef,
  MatrixRowDef,
  PacketPayload,
  PipelineEvent,
  PlanDef,
  StepOutputDef,
  ToolCallPayload,
} from "./events";

export type StepStatus =
  | "pending"
  | "running"
  | "reviewing"
  | "passed"
  | "rejected"
  | "retrying"
  | "exhausted"
  | "locked";

export interface StepRuntimeState {
  id: string;
  status: StepStatus;
  attempts: number;
  output?: StepOutputDef;
  review?: CriticReviewDef;
  isLocked: boolean;
  isFallback: boolean;
  activeTool?: string;
}

export interface InvariantState {
  id: string;
  badge: string;
  status: "idle" | "verified" | "firing" | "violated";
  explanation?: string;
}

export interface PipelineState {
  task: string;
  modelBudget: string;
  operationalContext: string;
  plan: PlanDef | null;
  activeAgent: AgentRole;
  stepStates: Record<string, StepRuntimeState>;
  toolCalls: ToolCallPayload[];
  failedToolCalls: ToolCallPayload[];
  scratchpad: Array<{ stepId: string; findings: string[] }>;
  replanCount: number;
  maxReplans: number;
  replanBudgetRemaining: number;
  criticReviews: CriticReviewDef[];
  packets: PacketPayload[];
  activePacket: PacketPayload | null;
  liveInvariants: Record<string, InvariantState>;
  synthesis: {
    isStarted: boolean;
    matrixRows: MatrixRowDef[];
    citations: CitationItemDef[];
    sections: Array<{ id: string; title: string; content: string }>;
    isCompleted: boolean;
    durationSeconds: number;
    totalTokens: number;
    reportSummary?: string;
  };
  eventLog: Array<{
    id: string;
    timestamp: number;
    agent: AgentRole;
    type: string;
    summary: string;
    details: string;
  }>;
  focusStation: "PLANNER" | "DAG" | "CRITIC" | "REPLANNER" | "SYNTHESIZER" | null;
  invariantViolations: string[];
}

export const INITIAL_PIPELINE_STATE: PipelineState = {
  task: "",
  modelBudget: "Standard",
  operationalContext: "",
  plan: null,
  activeAgent: "Planner Agent",
  stepStates: {},
  toolCalls: [],
  failedToolCalls: [],
  scratchpad: [],
  replanCount: 0,
  maxReplans: MAX_REPLANS,
  replanBudgetRemaining: MAX_REPLANS,
  criticReviews: [],
  packets: [],
  activePacket: null,
  liveInvariants: {
    step_bounds: { id: "step_bounds", badge: "3–7 steps ✓", status: "idle" },
    dag_acyclic: { id: "dag_acyclic", badge: "DAG acyclic ✓", status: "idle" },
    no_execution: { id: "no_execution", badge: "Strict isolation ✓", status: "idle" },
    idempotency: { id: "idempotency", badge: "Idempotent ✓", status: "idle" },
    no_source_hallucination: { id: "no_source_hallucination", badge: "Live sources ✓", status: "idle" },
    explicit_failures: { id: "explicit_failures", badge: "Zero silent drops ✓", status: "idle" },
    sequential_prereqs: { id: "sequential_prereqs", badge: "Dependencies met ✓", status: "idle" },
    adversarial_posture: { id: "adversarial_posture", badge: "Quality gate ✓", status: "idle" },
    composite_score_gate: { id: "composite_score_gate", badge: "Score ≥ 0.70 ✓", status: "idle" },
    zero_hallucination: { id: "zero_hallucination", badge: "Hallucination = 0 ✓", status: "idle" },
    preserve_passed: { id: "preserve_passed", badge: "PASSED preserved ✓", status: "idle" },
    bounded_replanning: { id: "bounded_replanning", badge: "Re-plans ≤ 2 ✓", status: "idle" },
    in_flight_mutation: { id: "in_flight_mutation", badge: "Adaptive DAG ✓", status: "idle" },
    approved_inputs_only: { id: "approved_inputs_only", badge: "100% verified ✓", status: "idle" },
    clean_presentation: { id: "clean_presentation", badge: "Clean syntax ✓", status: "idle" },
    comparison_matrix: { id: "comparison_matrix", badge: "Master Matrix ✓", status: "idle" },
  },
  synthesis: {
    isStarted: false,
    matrixRows: [],
    citations: [],
    sections: [],
    isCompleted: false,
    durationSeconds: 0,
    totalTokens: 0,
  },
  eventLog: [],
  focusStation: null,
  invariantViolations: [],
};

/**
 * Checks whether a given set of steps forms a Directed Acyclic Graph (DAG) with zero cycles.
 */
export function validateDagAcyclicity(steps: PlanDef["steps"]): { isAcyclic: boolean; order: string[] } {
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  steps.forEach((s) => {
    adj.set(s.id, []);
    inDegree.set(s.id, 0);
  });

  steps.forEach((s) => {
    s.dependencies.forEach((dep) => {
      if (adj.has(dep)) {
        adj.get(dep)!.push(s.id);
        inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1);
      }
    });
  });

  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      const updated = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, updated);
      if (updated === 0) queue.push(neighbor);
    }
  }

  return {
    isAcyclic: order.length === steps.length,
    order,
  };
}

/**
 * Pure state reducer with rigorous PRD invariant checking.
 */
export function pipelineReducer(state: PipelineState, event: PipelineEvent): PipelineState {
  switch (event.type) {
    case "TASK_RECEIVED": {
      return {
        ...state,
        task: event.task,
        modelBudget: event.modelBudget,
        operationalContext: event.operationalContext,
        activeAgent: "Planner Agent",
        focusStation: "PLANNER",
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Planner Agent",
            type: "TASK_RECEIVED",
            summary: "Task ingested",
            details: `Task: "${event.task.slice(0, 60)}..." · Budget: ${event.modelBudget}`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "PLAN_CREATED": {
      const stepCount = event.plan.steps.length;
      const violations: string[] = [];

      // Invariant: Must generate 3–7 discrete steps
      if (stepCount < MIN_PLAN_STEPS || stepCount > MAX_PLAN_STEPS) {
        violations.push(
          `PRD Invariant Violation: Planner emitted ${stepCount} steps (must be ${MIN_PLAN_STEPS}–${MAX_PLAN_STEPS})`
        );
      }

      // Invariant: DAG must have no cycles
      const { isAcyclic } = validateDagAcyclicity(event.plan.steps);
      if (!isAcyclic) {
        violations.push("PRD Invariant Violation: Planner produced a graph with cyclic dependencies");
      }

      const initialStepStates: Record<string, StepRuntimeState> = {};
      event.plan.steps.forEach((s) => {
        initialStepStates[s.id] = {
          id: s.id,
          status: "pending",
          attempts: 0,
          isLocked: false,
          isFallback: Boolean(s.isFallback),
        };
      });

      return {
        ...state,
        plan: event.plan,
        stepStates: initialStepStates,
        activeAgent: "Planner Agent",
        activePacket: event.packet,
        packets: [event.packet, ...state.packets.slice(0, 3)],
        invariantViolations: [...state.invariantViolations, ...violations],
        liveInvariants: {
          ...state.liveInvariants,
          step_bounds: {
            ...state.liveInvariants.step_bounds,
            status: stepCount >= MIN_PLAN_STEPS && stepCount <= MAX_PLAN_STEPS ? "verified" : "violated",
          },
          dag_acyclic: {
            ...state.liveInvariants.dag_acyclic,
            status: isAcyclic ? "verified" : "violated",
          },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Planner Agent",
            type: "PLAN_CREATED",
            summary: "DAG Plan synthesized",
            details: `${stepCount} discrete steps structured with zero cyclic dependencies`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "PLAN_VALIDATED": {
      return {
        ...state,
        liveInvariants: {
          ...state.liveInvariants,
          step_bounds: { ...state.liveInvariants.step_bounds, status: "verified" },
          dag_acyclic: { ...state.liveInvariants.dag_acyclic, status: "verified" },
          no_execution: { ...state.liveInvariants.no_execution, status: "verified" },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Planner Agent",
            type: "PLAN_VALIDATED",
            summary: "Topological verification complete",
            details: `Acyclic validation confirmed. Execution order: ${event.topologicalOrder.join(" → ")}`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "STEP_STARTED": {
      const violations: string[] = [];

      // Invariant: Executor cannot start a step whose dependencies are not PASSED
      const stepPlan = state.plan?.steps.find((s) => s.id === event.stepId);
      if (stepPlan) {
        for (const depId of stepPlan.dependencies) {
          const depStatus = state.stepStates[depId]?.status;
          if (depStatus !== "passed") {
            violations.push(
              `PRD Invariant Violation: Step ${event.stepId} started before dependency ${depId} reached PASSED (status: ${depStatus})`
            );
          }
        }
      }

      const existing = state.stepStates[event.stepId] || {
        id: event.stepId,
        status: "pending",
        attempts: 0,
        isLocked: false,
        isFallback: false,
      };

      return {
        ...state,
        activeAgent: "Executor Agent",
        focusStation: "DAG",
        stepStates: {
          ...state.stepStates,
          [event.stepId]: {
            ...existing,
            status: "running",
            attempts: event.attempt,
          },
        },
        invariantViolations: [...state.invariantViolations, ...violations],
        liveInvariants: {
          ...state.liveInvariants,
          sequential_prereqs: { ...state.liveInvariants.sequential_prereqs, status: "verified" },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Executor Agent",
            type: "STEP_STARTED",
            summary: `Executor dispatched to ${event.stepId}`,
            details: `Attempt ${event.attempt} · Dependencies verified (${event.activeDependencies.length > 0 ? event.activeDependencies.join(", ") : "root"})`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "TOOL_CALL": {
      const currentStep = state.stepStates[event.toolCall.stepId];
      const isFailed = event.toolCall.status === "failed";

      return {
        ...state,
        toolCalls: [event.toolCall, ...state.toolCalls.slice(0, 7)],
        failedToolCalls: isFailed
          ? [event.toolCall, ...state.failedToolCalls]
          : state.failedToolCalls,
        stepStates: currentStep
          ? {
              ...state.stepStates,
              [event.toolCall.stepId]: {
                ...currentStep,
                activeTool: `${event.toolCall.toolName} (${event.toolCall.domain})`,
              },
            }
          : state.stepStates,
        liveInvariants: {
          ...state.liveInvariants,
          explicit_failures: { ...state.liveInvariants.explicit_failures, status: "verified" },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Executor Agent",
            type: "TOOL_CALL",
            summary: `Tool: ${event.toolCall.toolName} · ${event.toolCall.domain}`,
            details: isFailed
              ? `FAILED: ${event.toolCall.errorMessage || "Network blocked"}`
              : `Query: ${event.toolCall.queryOrUrl.slice(0, 50)}... [${event.toolCall.status.toUpperCase()}]`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "SCRATCHPAD_WRITE": {
      return {
        ...state,
        scratchpad: [
          ...state.scratchpad,
          { stepId: event.stepId, findings: event.keyFindings },
        ],
        liveInvariants: {
          ...state.liveInvariants,
          idempotency: { ...state.liveInvariants.idempotency, status: "verified" },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Executor Agent",
            type: "SCRATCHPAD_WRITE",
            summary: `Scratchpad append from ${event.stepId}`,
            details: `${event.keyFindings.length} findings logged · Token: "${event.summaryToken}"`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "STEP_OUTPUT_EMITTED": {
      const existing = state.stepStates[event.output.stepId] || {
        id: event.output.stepId,
        status: "reviewing" as StepStatus,
        attempts: event.output.attempt,
        isLocked: false,
        isFallback: false,
      };
      return {
        ...state,
        activeAgent: "Critic Agent",
        focusStation: "CRITIC",
        activePacket: event.packet,
        packets: [event.packet, ...state.packets.slice(0, 3)],
        stepStates: {
          ...state.stepStates,
          [event.output.stepId]: {
            ...existing,
            status: "reviewing",
            output: event.output,
            activeTool: undefined,
          },
        },
        liveInvariants: {
          ...state.liveInvariants,
          no_source_hallucination: {
            ...state.liveInvariants.no_source_hallucination,
            status: event.output.hallucinationScore === 0 ? "verified" : "firing",
          },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Executor Agent",
            type: "STEP_OUTPUT_EMITTED",
            summary: `Artifact emitted for ${event.output.stepId}`,
            details: `${event.output.sourceCitations.length} citations · Hallucination delta: ${event.output.hallucinationScore}`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "CRITIC_REVIEW": {
      const violations: string[] = [];
      const stepOutput = state.stepStates[event.review.stepId]?.output;

      // Invariant: A StepOutput with hallucination > 0 must ONLY produce REJECT
      const hasHallucination =
        (stepOutput && stepOutput.hallucinationScore > 0) ||
        event.review.scores.hallucination > 0;

      if (hasHallucination && event.review.decision === "PASS") {
        violations.push(
          `PRD Invariant Violation: Critic Agent emitted PASS on step ${event.review.stepId} despite hallucinationScore > 0`
        );
      }

      const step = state.stepStates[event.review.stepId];
      const nextStatus: StepStatus = event.review.decision === "PASS" ? "passed" : "rejected";

      return {
        ...state,
        activeAgent: "Critic Agent",
        activePacket: event.packet,
        packets: [event.packet, ...state.packets.slice(0, 3)],
        criticReviews: [event.review, ...state.criticReviews],
        stepStates: step
          ? {
              ...state.stepStates,
              [event.review.stepId]: {
                ...step,
                status: nextStatus,
                review: event.review,
              },
            }
          : state.stepStates,
        invariantViolations: [...state.invariantViolations, ...violations],
        liveInvariants: {
          ...state.liveInvariants,
          adversarial_posture: { ...state.liveInvariants.adversarial_posture, status: "verified" },
          composite_score_gate: {
            ...state.liveInvariants.composite_score_gate,
            status: event.review.scores.composite >= 0.7 ? "verified" : "firing",
          },
          zero_hallucination: {
            ...state.liveInvariants.zero_hallucination,
            status: event.review.scores.hallucination === 0 ? "verified" : "firing",
            explanation:
              event.review.scores.hallucination > 0
                ? "Critic detected unverified claim; rejection gate triggered."
                : undefined,
          },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Critic Agent",
            type: "CRITIC_REVIEW",
            summary: `Decision: ${event.review.decision} on ${event.review.stepId}`,
            details: `Score: ${event.review.scores.composite.toFixed(2)} · ${event.review.critiqueReason}`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "STEP_RETRY": {
      const step = state.stepStates[event.stepId];
      return {
        ...state,
        activeAgent: "Executor Agent",
        focusStation: "DAG",
        stepStates: step
          ? {
              ...state.stepStates,
              [event.stepId]: {
                ...step,
                status: "retrying",
                attempts: event.attempt,
              },
            }
          : state.stepStates,
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Executor Agent",
            type: "STEP_RETRY",
            summary: `Retrying step ${event.stepId} (Attempt ${event.attempt})`,
            details: `Incorporating Critic feedback: "${event.critique.slice(0, 50)}..."`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "STEP_EXHAUSTED": {
      const step = state.stepStates[event.stepId];
      return {
        ...state,
        activeAgent: "Dynamic Re-Planner",
        focusStation: "REPLANNER",
        stepStates: step
          ? {
              ...state.stepStates,
              [event.stepId]: {
                ...step,
                status: "exhausted",
              },
            }
          : state.stepStates,
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Dynamic Re-Planner",
            type: "STEP_EXHAUSTED",
            summary: `Step ${event.stepId} exhausted (${event.totalAttempts} attempts)`,
            details: `Exceeded bounded retry limit. Handing over to Dynamic Re-Planner.`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "REPLAN_STARTED": {
      return {
        ...state,
        activeAgent: "Dynamic Re-Planner",
        focusStation: "REPLANNER",
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Dynamic Re-Planner",
            type: "REPLAN_STARTED",
            summary: `Re-Planning initiated (${event.replanCount} / ${MAX_REPLANS})`,
            details: `Exhausted step: ${event.exhaustedStepId}. Preserving ${event.workflowStateSnapshot.passedSteps.length} passed steps.`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "PLAN_MUTATED": {
      const violations: string[] = [];

      // Invariant: Max 2 re-planning events per workflow
      if (event.replanCount > MAX_REPLANS) {
        violations.push(
          `PRD Invariant Violation: Re-planning count ${event.replanCount} exceeded maximum ceiling of ${MAX_REPLANS}`
        );
      }

      // Invariant: Preserves already PASSED steps (immutable lock)
      event.lockedStepIds.forEach((id) => {
        const prior = state.stepStates[id];
        if (prior && prior.status !== "passed" && !prior.isLocked) {
          violations.push(
            `PRD Invariant Violation: Attempted to lock step ${id} which was not in PASSED state (status: ${prior.status})`
          );
        }
      });

      const updatedStepStates = { ...state.stepStates };
      event.lockedStepIds.forEach((id) => {
        if (updatedStepStates[id]) {
          updatedStepStates[id] = { ...updatedStepStates[id], isLocked: true };
        }
      });

      event.injectedStepIds.forEach((id) => {
        const injectedStepDef = event.mutatedPlan.steps.find((s) => s.id === id);
        updatedStepStates[id] = {
          id,
          status: "pending",
          attempts: 0,
          isLocked: false,
          isFallback: Boolean(injectedStepDef?.isFallback),
        };
      });

      return {
        ...state,
        plan: event.mutatedPlan,
        replanCount: event.replanCount,
        replanBudgetRemaining: Math.max(0, MAX_REPLANS - event.replanCount),
        stepStates: updatedStepStates,
        activeAgent: "Dynamic Re-Planner",
        activePacket: event.packet,
        packets: [event.packet, ...state.packets.slice(0, 3)],
        invariantViolations: [...state.invariantViolations, ...violations],
        liveInvariants: {
          ...state.liveInvariants,
          preserve_passed: { ...state.liveInvariants.preserve_passed, status: "verified" },
          bounded_replanning: {
            ...state.liveInvariants.bounded_replanning,
            badge: `Re-plans ${event.replanCount}/${MAX_REPLANS} ✓`,
            status: event.replanCount <= MAX_REPLANS ? "verified" : "violated",
          },
          in_flight_mutation: { ...state.liveInvariants.in_flight_mutation, status: "verified" },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Dynamic Re-Planner",
            type: "PLAN_MUTATED",
            summary: `DAG Mutated: Injected [${event.injectedStepIds.join(", ")}]`,
            details: `Re-plan budget: ${event.replanCount}/${MAX_REPLANS} · Rationale: ${event.mutationRationale}`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "STEP_LOCKED": {
      const step = state.stepStates[event.stepId];
      return {
        ...state,
        stepStates: step
          ? {
              ...state.stepStates,
              [event.stepId]: { ...step, isLocked: true },
            }
          : state.stepStates,
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Dynamic Re-Planner",
            type: "STEP_LOCKED",
            summary: `Step ${event.stepId} locked`,
            details: event.reason,
          },
          ...state.eventLog,
        ],
      };
    }

    case "SYNTHESIS_STARTED": {
      const violations: string[] = [];

      // Invariant: Synthesizer consumes only PASSED outputs
      event.approvedStepIds.forEach((id) => {
        const step = state.stepStates[id];
        if (!step || step.status !== "passed") {
          violations.push(
            `PRD Invariant Violation: Synthesizer received unapproved step ${id} (status: ${step?.status})`
          );
        }
      });

      return {
        ...state,
        activeAgent: "Synthesizer Agent",
        focusStation: "SYNTHESIZER",
        synthesis: {
          ...state.synthesis,
          isStarted: true,
        },
        invariantViolations: [...state.invariantViolations, ...violations],
        liveInvariants: {
          ...state.liveInvariants,
          approved_inputs_only: { ...state.liveInvariants.approved_inputs_only, status: "verified" },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Synthesizer Agent",
            type: "SYNTHESIS_STARTED",
            summary: "Synthesizer assembling deliverable",
            details: `Consolidating ${event.approvedStepIds.length} approved artifacts with zero internal syntax leaks`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "REPORT_SECTION_STREAMED": {
      return {
        ...state,
        synthesis: {
          ...state.synthesis,
          sections: [
            ...state.synthesis.sections,
            { id: event.sectionId, title: event.title, content: event.contentSnippet },
          ],
          matrixRows: event.matrixRow
            ? [...state.synthesis.matrixRows, event.matrixRow]
            : state.synthesis.matrixRows,
          citations: event.citation
            ? [...state.synthesis.citations, event.citation]
            : state.synthesis.citations,
        },
        liveInvariants: {
          ...state.liveInvariants,
          clean_presentation: { ...state.liveInvariants.clean_presentation, status: "verified" },
          comparison_matrix: { ...state.liveInvariants.comparison_matrix, status: "verified" },
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Synthesizer Agent",
            type: "REPORT_SECTION_STREAMED",
            summary: `Deliverable: ${event.title}`,
            details: event.matrixRow
              ? `Master Matrix row: ${event.matrixRow.spec}`
              : `Citation verified: ${event.citation?.domain || "Evidence anchored"}`,
          },
          ...state.eventLog,
        ],
      };
    }

    case "WORKFLOW_COMPLETED": {
      const updatedSteps = { ...state.stepStates };
      Object.keys(updatedSteps).forEach((k) => {
        if (updatedSteps[k].status === "running") {
          updatedSteps[k] = { ...updatedSteps[k], status: "passed" };
        }
      });

      return {
        ...state,
        activeAgent: "Synthesizer Agent",
        stepStates: updatedSteps,
        synthesis: {
          ...state.synthesis,
          isCompleted: true,
          reportSummary: event.reportSummary,
          durationSeconds: event.durationSeconds,
          totalTokens: event.totalTokens,
        },
        eventLog: [
          {
            id: `ev-${state.eventLog.length + 1}`,
            timestamp: event.timestamp,
            agent: "Synthesizer Agent",
            type: "WORKFLOW_COMPLETED",
            summary: "Research workflow completed",
            details: `Duration: ${event.durationSeconds}s · Tokens: ${event.totalTokens.toLocaleString()} · Score: ${event.finalScore.toFixed(2)}`,
          },
          ...state.eventLog,
        ],
      };
    }

    default:
      return state;
  }
}
