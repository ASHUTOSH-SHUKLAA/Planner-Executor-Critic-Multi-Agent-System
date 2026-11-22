/**
 * Automated Test Suite for Live Pipeline Stage & PRD Invariants
 * Run via: node scripts/test-pipeline-stage.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testBuildDir = path.join(root, "scripts/.test-build");

if (!fs.existsSync(testBuildDir) || !fs.existsSync(path.join(testBuildDir, "reducer.js"))) {
  execSync(
    "npx tsc src/components/pipeline-stage/reducer.ts src/components/pipeline-stage/pipelineSpec.ts src/components/pipeline-stage/events.ts src/components/pipeline-stage/scenarios/scenario-a.ts src/components/pipeline-stage/scenarios/scenario-b.ts src/components/pipeline-stage/scenarios/scenario-c.ts --outDir scripts/.test-build --module commonjs --target es2022 --moduleResolution node",
    { cwd: root, stdio: "ignore" }
  );
}

const {
  pipelineReducer,
  INITIAL_PIPELINE_STATE,
  validateDagAcyclicity,
} = require("./.test-build/reducer.js");
const { SCENARIO_A } = require("./.test-build/scenarios/scenario-a.js");
const { SCENARIO_B } = require("./.test-build/scenarios/scenario-b.js");
const { SCENARIO_C } = require("./.test-build/scenarios/scenario-c.js");
const {
  MAX_PLAN_STEPS,
  MIN_PLAN_STEPS,
  MAX_REPLANS,
  MAX_STEP_ATTEMPTS,
} = require("./.test-build/pipelineSpec.js");

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failedCount++;
    throw new Error(message);
  } else {
    console.log(`PASS: ${message}`);
    passedCount++;
  }
}

console.log("=== Live Pipeline Stage & PRD Invariants Test Suite ===\n");

// [Test 1] Plan Step Bounds Invariant (3–7 steps)
console.log("[Test 1] Plan Step Bounds Invariant (3–7 steps)");
{
  assert(MIN_PLAN_STEPS === 3, "Minimum plan step bound is 3");
  assert(MAX_PLAN_STEPS === 7, "Maximum plan step bound is 7");
  assert(MAX_STEP_ATTEMPTS === 2, "Max step attempts constant is 2");
  assert(MAX_REPLANS === 2, "Max replan events constant is 2");

  // Under-bounded plan (< 3 steps)
  const smallPlan = {
    workflowId: "wf-small",
    task: "Task",
    modelBudget: "Standard",
    rationale: "Rationale",
    steps: [
      { id: "S1", title: "Step 1", shortTitle: "S1", dependencies: [], objective: "Obj", assignedRole: "Planner Agent" },
      { id: "S2", title: "Step 2", shortTitle: "S2", dependencies: ["S1"], objective: "Obj", assignedRole: "Executor Agent" },
    ],
  };

  const state1 = pipelineReducer(INITIAL_PIPELINE_STATE, {
    type: "PLAN_CREATED",
    timestamp: 100,
    plan: smallPlan,
    packet: { id: "p1", type: "PLAN", sourceStation: "INPUT", targetStation: "PLANNER", label: "PLAN", summary: "", data: {} },
  });
  assert(
    state1.invariantViolations.some((v) => v.includes("3–7")),
    "Reducer records invariant violation when plan has < 3 steps"
  );

  // Over-bounded plan (> 7 steps)
  const largePlan = {
    workflowId: "wf-large",
    task: "Task",
    modelBudget: "Standard",
    rationale: "Rationale",
    steps: Array.from({ length: 8 }, (_, i) => ({
      id: `S${i + 1}`,
      title: `Step ${i + 1}`,
      shortTitle: `S${i + 1}`,
      dependencies: i === 0 ? [] : [`S${i}`],
      objective: "Obj",
      assignedRole: "Executor Agent",
    })),
  };

  const state2 = pipelineReducer(INITIAL_PIPELINE_STATE, {
    type: "PLAN_CREATED",
    timestamp: 100,
    plan: largePlan,
    packet: { id: "p2", type: "PLAN", sourceStation: "INPUT", targetStation: "PLANNER", label: "PLAN", summary: "", data: {} },
  });
  assert(
    state2.invariantViolations.some((v) => v.includes("3–7")),
    "Reducer records invariant violation when plan has > 7 steps"
  );
}

// [Test 2] DAG Acyclicity & Cycle Detection
console.log("\n[Test 2] DAG Acyclicity & Topological Sort Invariant");
{
  const validSteps = [
    { id: "S1", dependencies: [] },
    { id: "S2", dependencies: ["S1"] },
    { id: "S3", dependencies: ["S1"] },
    { id: "S4", dependencies: ["S2", "S3"] },
  ];
  const validCheck = validateDagAcyclicity(validSteps);
  assert(validCheck.isAcyclic === true, "Valid diamond DAG is correctly detected as acyclic");
  assert(validCheck.order.indexOf("S1") < validCheck.order.indexOf("S4"), "Topological order is valid");

  const cyclicSteps = [
    { id: "S1", dependencies: ["S3"] },
    { id: "S2", dependencies: ["S1"] },
    { id: "S3", dependencies: ["S2"] }, // Cycle: S1 -> S2 -> S3 -> S1
  ];
  const cyclicCheck = validateDagAcyclicity(cyclicSteps);
  assert(cyclicCheck.isAcyclic === false, "Cycle S1 -> S2 -> S3 -> S1 is detected and flagged as non-acyclic");
}

// [Test 3] Hallucination Invariant (Must reject when hallucination > 0)
console.log("\n[Test 3] Critic Hallucination Invariant (Zero hallucination tolerance)");
{
  let state = pipelineReducer(INITIAL_PIPELINE_STATE, {
    type: "STEP_OUTPUT_EMITTED",
    timestamp: 100,
    output: {
      stepId: "S3",
      attempt: 1,
      content: "Unverified claim",
      keyFindings: ["Claim"],
      sourceCitations: [],
      executionDurationMs: 300,
      hallucinationScore: 0.45, // Hallucination > 0!
    },
    packet: { id: "pkt", type: "STEP_OUTPUT", sourceStation: "DAG", targetStation: "CRITIC", label: "", summary: "", data: {} },
  });

  // Attempting PASS on hallucinated output must be flagged as violation
  state = pipelineReducer(state, {
    type: "CRITIC_REVIEW",
    timestamp: 200,
    review: {
      stepId: "S3",
      attempt: 1,
      decision: "PASS", // Illegal PASS!
      scores: { correctness: 0.8, completeness: 0.8, relevance: 0.8, composite: 0.8, hallucination: 0.45 },
      critiqueReason: "Illegal pass attempt",
    },
    packet: { id: "pkt-rev", type: "CRITIC_REVIEW", sourceStation: "CRITIC", targetStation: "DAG", label: "", summary: "", data: {} },
  });

  assert(
    state.invariantViolations.some((v) => v.includes("hallucinationScore")),
    "Reducer records invariant violation if Critic attempts PASS on hallucination > 0"
  );
}

// [Test 4] Sequential Dependency Prerequisites Invariant
console.log("\n[Test 4] Sequential Dependency Prerequisites Invariant");
{
  let state = INITIAL_PIPELINE_STATE;
  state = pipelineReducer(state, {
    type: "PLAN_CREATED",
    timestamp: 100,
    plan: SCENARIO_A.events[1].plan,
    packet: SCENARIO_A.events[1].packet,
  });

  // Starting S2 before S1 has reached PASSED
  state = pipelineReducer(state, {
    type: "STEP_STARTED",
    timestamp: 200,
    stepId: "S2",
    attempt: 1,
    activeDependencies: ["S1"],
  });

  assert(
    state.invariantViolations.some((v) => v.includes("reached PASSED")),
    "Reducer forbids starting dependent step before upstream dependency is PASSED"
  );
}

// [Test 5] Re-Plan Budget & Immutability of Passed Steps
console.log("\n[Test 5] Re-Plan Budget & Immutability of Passed Steps");
{
  let state = INITIAL_PIPELINE_STATE;
  // Set S1 to passed
  state = {
    ...state,
    stepStates: {
      S1: { id: "S1", status: "passed", attempts: 1, isLocked: false, isFallback: false },
    },
  };

  const planMutatedEvent = SCENARIO_C.events.find((e) => e.type === "PLAN_MUTATED");
  assert(Boolean(planMutatedEvent), "Found PLAN_MUTATED event in Scenario C");

  // Mutated plan with locked step S1
  state = pipelineReducer(state, {
    type: "PLAN_MUTATED",
    timestamp: 300,
    replanCount: 1,
    mutatedPlan: planMutatedEvent.mutatedPlan,
    injectedStepIds: ["S4b"],
    lockedStepIds: ["S1"],
    mutationRationale: "Test mutation",
    packet: planMutatedEvent.packet,
  });

  assert(state.stepStates["S1"].isLocked === true, "PASSED step S1 is locked upon plan mutation");
  assert(state.replanCount === 1, "Re-plan count tracks 1");
  assert(state.replanBudgetRemaining === 1, "Re-plan budget remaining is 1 (out of 2)");

  // Attempting to exceed max replans (> 2)
  state = pipelineReducer(state, {
    type: "PLAN_MUTATED",
    timestamp: 400,
    replanCount: 3, // Exceeds MAX_REPLANS = 2!
    mutatedPlan: planMutatedEvent.mutatedPlan,
    injectedStepIds: [],
    lockedStepIds: ["S1"],
    mutationRationale: "Illegal second replan",
    packet: planMutatedEvent.packet,
  });

  assert(
    state.invariantViolations.some((v) => v.includes("exceeded maximum ceiling")),
    "Reducer records invariant violation when replanCount > 2"
  );
}

// [Test 6] Tool Crash & Explicit Failure Accounting
console.log("\n[Test 6] Tool Crash & Explicit Failure Accounting");
{
  let state = INITIAL_PIPELINE_STATE;
  state = pipelineReducer(state, {
    type: "TOOL_CALL",
    timestamp: 100,
    toolCall: {
      stepId: "S4",
      toolName: "web_search",
      domain: "cashify.in",
      queryOrUrl: "test-query",
      status: "failed",
      errorMessage: "HTTP 403 Forbidden",
    },
  });

  assert(state.failedToolCalls.length === 1, "Failed tool call explicitly added to failedToolCalls log");
  assert(state.failedToolCalls[0].errorMessage === "HTTP 403 Forbidden", "Failure error message preserved");
}

// [Test 7] Full Simulation of Scenario A (Happy Path)
console.log("\n[Test 7] Full Simulation: Scenario A (Happy Path)");
{
  let state = INITIAL_PIPELINE_STATE;
  for (const ev of SCENARIO_A.events) {
    state = pipelineReducer(state, ev);
  }

  assert(state.invariantViolations.length === 0, "Scenario A executes with 0 PRD invariant violations");
  assert(state.synthesis.isCompleted === true, "Scenario A reaches WORKFLOW_COMPLETED");
  assert(state.synthesis.matrixRows.length === 3, "Scenario A compiles 3 Master Comparison Matrix rows");
  assert(state.stepStates["S5"].status === "passed", "Final convergent step S5 PASSED");
}

// [Test 8] Full Simulation of Scenario B (Critic Catches Hallucination)
console.log("\n[Test 8] Full Simulation: Scenario B (Critic Catches Hallucination)");
{
  let state = INITIAL_PIPELINE_STATE;
  let sawReject = false;
  let sawRetry = false;

  for (const ev of SCENARIO_B.events) {
    if (ev.type === "CRITIC_REVIEW" && ev.review.decision === "REJECT") sawReject = true;
    if (ev.type === "STEP_RETRY") sawRetry = true;
    state = pipelineReducer(state, ev);
  }

  assert(sawReject === true, "Scenario B triggers Critic REJECT on hallucination");
  assert(sawRetry === true, "Scenario B triggers Executor retry with critique feedback");
  assert(state.invariantViolations.length === 0, "Scenario B completes with 0 PRD invariant violations");
  assert(state.synthesis.isCompleted === true, "Scenario B reaches WORKFLOW_COMPLETED");
}

// [Test 9] Full Simulation of Scenario C (Exhausted Step -> Dynamic Re-Plan)
console.log("\n[Test 9] Full Simulation: Scenario C (Dynamic Re-Plan)");
{
  let state = INITIAL_PIPELINE_STATE;
  let sawExhausted = false;
  let sawPlanMutated = false;

  for (const ev of SCENARIO_C.events) {
    if (ev.type === "STEP_EXHAUSTED") sawExhausted = true;
    if (ev.type === "PLAN_MUTATED") sawPlanMutated = true;
    state = pipelineReducer(state, ev);
  }

  assert(sawExhausted === true, "Scenario C triggers STEP_EXHAUSTED on S4");
  assert(sawPlanMutated === true, "Scenario C triggers PLAN_MUTATED");
  assert(state.replanCount === 1, "Scenario C uses exactly 1 of 2 replan events");
  assert(state.stepStates["S1"].isLocked === true, "Scenario C locks passed step S1");
  assert(state.stepStates["S4b"] !== undefined, "Scenario C successfully injects fallback step S4b");
  assert(state.invariantViolations.length === 0, "Scenario C completes with 0 PRD invariant violations");
  assert(state.synthesis.isCompleted === true, "Scenario C reaches WORKFLOW_COMPLETED");
}

console.log(`\n========================================`);
console.log(`Pipeline Stage Test Summary: ${passedCount} passed, ${failedCount} failed`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
