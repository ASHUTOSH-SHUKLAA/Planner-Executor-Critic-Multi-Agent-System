/**
 * Pipeline Specification - Single Source of Truth
 * Derived strictly from the Multi-Agent Orchestration Platform PRD (Architecture & Engineering Specification).
 */

export type AgentRole =
  | "Planner Agent"
  | "Executor Agent"
  | "Critic Agent"
  | "Dynamic Re-Planner"
  | "Synthesizer Agent";

export type InAppStageName =
  | "Planning"
  | "Researching"
  | "Reviewing"
  | "Refining"
  | "Synthesizing";

/** Mapping from internal in-app stages to PRD Agent Roles */
export const STAGE_TO_AGENT_MAP: Record<InAppStageName, AgentRole> = {
  Planning: "Planner Agent",
  Researching: "Executor Agent",
  Reviewing: "Critic Agent",
  Refining: "Dynamic Re-Planner",
  Synthesizing: "Synthesizer Agent",
};

/** TODO(prd): Bounded retry limit per step before marked as STEP_EXHAUSTED */
export const MAX_STEP_ATTEMPTS = 2;

/** TODO(prd): Maximum dynamic re-plan events permitted per workflow lifecycle */
export const MAX_REPLANS = 2;

export const MIN_PLAN_STEPS = 3;
export const MAX_PLAN_STEPS = 7;
export const CRITIC_PASS_THRESHOLD = 0.70;

export interface InvariantDefinition {
  id: string;
  label: string;
  description: string;
  badge: string;
}

export interface AgentContract {
  role: AgentRole;
  stageName: InAppStageName;
  number: string;
  shortName: string;
  tagline: string;
  inputContract: string;
  primaryOutputArtifact: string;
  behavioralInvariants: string[];
  invariants: InvariantDefinition[];
  colorToken: "planner" | "executor" | "critic" | "replanner" | "synthesizer";
}

export const AGENT_CONTRACTS: Record<AgentRole, AgentContract> = {
  "Planner Agent": {
    role: "Planner Agent",
    stageName: "Planning",
    number: "01",
    shortName: "Planner",
    tagline: "Translates human intent into validated DAG steps",
    inputContract: "User Task string, model budget, operational context",
    primaryOutputArtifact: "Plan object: ordered PlanStep items, dependencies, rationale",
    behavioralInvariants: [
      "Must generate 3–7 discrete steps",
      "Cannot execute steps",
      "DAG must have no cycles",
    ],
    invariants: [
      { id: "step_bounds", label: "3–7 steps", description: "Must generate between 3 and 7 discrete steps", badge: "3–7 steps ✓" },
      { id: "no_execution", label: "No direct execution", description: "Decomposes goals but cannot execute tool calls directly", badge: "Strict isolation ✓" },
      { id: "dag_acyclic", label: "DAG acyclic", description: "Graph must possess a valid topological sort with zero cycles", badge: "DAG acyclic ✓" },
    ],
    colorToken: "planner",
  },
  "Executor Agent": {
    role: "Executor Agent",
    stageName: "Researching",
    number: "02",
    shortName: "Executor",
    tagline: "Executes plan steps deterministically with sandboxed tools",
    inputContract: "Single PlanStep, relevant dependency outputs, shared scratchpad view",
    primaryOutputArtifact: "StepOutput: content, key_findings, source citations, execution metadata",
    behavioralInvariants: [
      "Idempotent execution",
      "Never hallucinates sources",
      "Marks failed tool calls explicitly",
      "Cannot skip steps",
    ],
    invariants: [
      { id: "idempotency", label: "Idempotent output", description: "Same step and dependency state produces deterministic findings", badge: "Idempotent ✓" },
      { id: "no_source_hallucination", label: "Verified sources", description: "Only emits citations from verified network fetches", badge: "Live sources ✓" },
      { id: "explicit_failures", label: "Explicit tool failures", description: "Tool crashes and HTTP errors are recorded explicitly", badge: "Zero silent drops ✓" },
      { id: "sequential_prereqs", label: "Dependency resolution", description: "Cannot execute until all upstream dependencies have PASSED", badge: "Dependencies met ✓" },
    ],
    colorToken: "executor",
  },
  "Critic Agent": {
    role: "Critic Agent",
    stageName: "Reviewing",
    number: "03",
    shortName: "Critic",
    tagline: "Adversarial validation checking correctness and relevance",
    inputContract: "Current StepOutput, step objective, dependency context",
    primaryOutputArtifact: "CriticReview: decision (PASS/REJECT), scores (0.0–1.0), structured critique reason",
    behavioralInvariants: [
      "Adversarial mindset",
      "Disqualifies unverified claims",
      "Must reject when hallucination > 0",
    ],
    invariants: [
      { id: "adversarial_posture", label: "Adversarial quality gate", description: "Rigorous inspection across correctness, completeness, and relevance", badge: "Quality gate ✓" },
      { id: "composite_score_gate", label: "Threshold >= 0.70", description: "Requires composite quality score >= 0.70 to emit PASS", badge: "Score ≥ 0.70 ✓" },
      { id: "zero_hallucination", label: "Hallucination = 0", description: "Disqualifies claims without evidence; must REJECT if hallucination > 0", badge: "Hallucination = 0 ✓" },
    ],
    colorToken: "critic",
  },
  "Dynamic Re-Planner": {
    role: "Dynamic Re-Planner",
    stageName: "Refining",
    number: "04",
    shortName: "Dynamic Re-Planner",
    tagline: "In-flight graph mutation upon repeated execution failure",
    inputContract: "Exhausted failed step, critique history, current workflow state",
    primaryOutputArtifact: "Mutated Plan: updated step descriptions, injected fallback steps, revised DAG",
    behavioralInvariants: [
      "Preserves already PASSED steps",
      "Max 2 re-planning events per workflow (prevents infinite loops)",
    ],
    invariants: [
      { id: "preserve_passed", label: "PASSED steps preserved", description: "Already committed outputs remain immutable and locked", badge: "PASSED preserved ✓" },
      { id: "bounded_replanning", label: "Re-plans <= 2", description: "Enforces max 2 re-planning events per workflow run to prevent loops", badge: "Re-plans ≤ 2 ✓" },
      { id: "in_flight_mutation", label: "DAG mutation", description: "Splits sub-tasks and injects fallback steps to recover execution", badge: "Adaptive DAG ✓" },
    ],
    colorToken: "replanner",
  },
  "Synthesizer Agent": {
    role: "Synthesizer Agent",
    stageName: "Synthesizing",
    number: "05",
    shortName: "Synthesizer",
    tagline: "Evidence-anchored consolidation into final deliverable",
    inputContract: "All approved StepOutput records, original objective, citations",
    primaryOutputArtifact: "Final Markdown Report, Master Comparison Matrix, verified citation list",
    behavioralInvariants: [
      "Never exposes internal agent pipeline syntax",
      "Authoritative tone",
    ],
    invariants: [
      { id: "approved_inputs_only", label: "Approved outputs only", description: "Consolidates strictly PASSED StepOutputs into the final deliverable", badge: "100% verified ✓" },
      { id: "clean_presentation", label: "No pipeline syntax leak", description: "Never exposes internal agent chatter or step IDs in final text", badge: "Clean syntax ✓" },
      { id: "comparison_matrix", label: "Master Matrix", description: "Builds structured multi-variable comparison matrix with citation anchors", badge: "Master Matrix ✓" },
    ],
    colorToken: "synthesizer",
  },
};
