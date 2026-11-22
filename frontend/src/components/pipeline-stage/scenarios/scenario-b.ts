/**
 * Scenario B: Critic Catches a Hallucination
 * S3's StepOutput contains an unverified warranty claim -> Critic emits REJECT (hallucination > 0).
 * Invariant badge "Must reject when hallucination > 0" visibly fires.
 * Executor retries with the critique and emits verified output -> PASS.
 */

import type { ScenarioDef } from "./types";
import type { PipelineEvent, PlanDef } from "../events";

const basePlan: PlanDef = {
  workflowId: "wf-sample-smartphones-b",
  task: "Best flagship smartphones for students under ₹50,000 with best camera and lowest price deals",
  modelBudget: "Standard",
  rationale: "Decompose into contender identification, parallel camera, benchmark, and deal analysis, with adversarial fact auditing.",
  steps: [
    {
      id: "S1",
      title: "Market Landscape & Contender Selection",
      shortTitle: "Contender Selection",
      dependencies: [],
      objective: "Filter 2025 flagship smartphones under ₹50,000 with tier-1 sensors.",
      assignedRole: "Planner Agent",
    },
    {
      id: "S2",
      title: "Technical Specifications & Camera Hardware Analysis",
      shortTitle: "Camera & Hardware",
      dependencies: ["S1"],
      objective: "Audit sensor dimensions, OIS, low-light portraits, and 4K recording capabilities.",
      assignedRole: "Executor Agent",
    },
    {
      id: "S3",
      title: "Real-World Benchmarks, Durability & Student Use Cases",
      shortTitle: "Benchmarks & Durability",
      dependencies: ["S1"],
      objective: "Gather sustained thermal metrics, battery life, IP ratings, and official warranty policies.",
      assignedRole: "Executor Agent",
    },
    {
      id: "S4",
      title: "Total Cost of Ownership, Warranty & Lowest Price Deals",
      shortTitle: "Pricing & Deals",
      dependencies: ["S1"],
      objective: "Aggregate active card discounts and student store verification.",
      assignedRole: "Executor Agent",
    },
    {
      id: "S5",
      title: "Definitive Segmented Recommendations & Decision Framework",
      shortTitle: "Synthesis & Verdict",
      dependencies: ["S2", "S3", "S4"],
      objective: "Synthesize all approved findings into Master Comparison Matrix.",
      assignedRole: "Synthesizer Agent",
    },
  ],
};

const events: PipelineEvent[] = [
  {
    type: "TASK_RECEIVED",
    timestamp: 100,
    task: "Best flagship smartphones for students under ₹50,000 with best camera and lowest price deals",
    modelBudget: "Standard",
    operationalContext: "Adversarial verification active · Zero hallucination tolerance on student discount terms.",
  },
  {
    type: "PLAN_CREATED",
    timestamp: 300,
    plan: basePlan,
    packet: {
      id: "pkt-b-plan",
      type: "PLAN",
      sourceStation: "INPUT",
      targetStation: "PLANNER",
      label: "DAG PLAN",
      summary: "5-Step DAG structured with parallel verification gates",
      data: { stepCount: 5, root: "S1", sink: "S5" },
    },
  },
  {
    type: "PLAN_VALIDATED",
    timestamp: 500,
    stepCount: 5,
    isAcyclic: true,
    topologicalOrder: ["S1", "S2", "S3", "S4", "S5"],
    invariantsChecked: [
      { id: "step_bounds", pass: true, label: "3–7 steps verified" },
      { id: "dag_acyclic", pass: true, label: "Topological order acyclic" },
    ],
  },
  // Step S1 passes
  {
    type: "STEP_STARTED",
    timestamp: 700,
    stepId: "S1",
    attempt: 1,
    activeDependencies: [],
  },
  {
    type: "STEP_OUTPUT_EMITTED",
    timestamp: 950,
    output: {
      stepId: "S1",
      attempt: 1,
      content: "Shortlisted Vivo V40 Pro, Google Pixel 8a, OnePlus 12R below ₹50,000.",
      keyFindings: ["Shortlisted 3 contenders with Sony LYT/IMX OIS sensors"],
      sourceCitations: [{ title: "Smartprix Index", domain: "smartprix.com", url: "https://smartprix.com" }],
      executionDurationMs: 380,
      hallucinationScore: 0.0,
    },
    packet: {
      id: "pkt-b-s1",
      type: "STEP_OUTPUT",
      sourceStation: "DAG",
      targetStation: "CRITIC",
      label: "STEP S1 OUTPUT",
      summary: "Contenders qualified",
      data: { contenders: ["Vivo V40 Pro", "Pixel 8a", "OnePlus 12R"] },
    },
  },
  {
    type: "CRITIC_REVIEW",
    timestamp: 1150,
    review: {
      stepId: "S1",
      attempt: 1,
      decision: "PASS",
      scores: { correctness: 0.95, completeness: 0.94, relevance: 0.96, composite: 0.95, hallucination: 0.0 },
      critiqueReason: "Verified contenders against primary retailer listings.",
    },
    packet: {
      id: "pkt-b-s1-pass",
      type: "CRITIC_REVIEW",
      sourceStation: "CRITIC",
      targetStation: "DAG",
      label: "CRITIC: PASS",
      summary: "Step S1 verified",
      data: { decision: "PASS", score: 0.95 },
    },
  },
  // S2, S3, S4 start in parallel
  {
    type: "STEP_STARTED",
    timestamp: 1350,
    stepId: "S2",
    attempt: 1,
    activeDependencies: ["S1"],
  },
  {
    type: "STEP_STARTED",
    timestamp: 1400,
    stepId: "S3",
    attempt: 1,
    activeDependencies: ["S1"],
  },
  {
    type: "STEP_STARTED",
    timestamp: 1450,
    stepId: "S4",
    attempt: 1,
    activeDependencies: ["S1"],
  },
  // S3 emits StepOutput with hallucination!
  {
    type: "TOOL_CALL",
    timestamp: 1650,
    toolCall: {
      stepId: "S3",
      toolName: "web_search",
      domain: "techforums-unverified.com",
      queryOrUrl: "pixel-8a-free-screen-replacement-student-id-india",
      status: "succeeded",
      durationMs: 410,
    },
  },
  {
    type: "STEP_OUTPUT_EMITTED",
    timestamp: 1950,
    output: {
      stepId: "S3",
      attempt: 1,
      content: "Pixel 8a provides 7 years of OS updates and includes complimentary 2-year free screen replacement for any student ID in India.",
      keyFindings: [
        "Pixel 8a: 7 years updates",
        "Includes 2-year free screen replacement for university students [UNVERIFIED CLAIM]",
      ],
      sourceCitations: [
        { title: "Forum Speculation Thread", domain: "techforums-unverified.com", url: "https://techforums-unverified.com/thread/1029" },
      ],
      executionDurationMs: 580,
      hallucinationScore: 0.35, // Hallucination > 0!
    },
    packet: {
      id: "pkt-b-s3-out1",
      type: "STEP_OUTPUT",
      sourceStation: "DAG",
      targetStation: "CRITIC",
      label: "STEP S3 OUTPUT (FLAWED)",
      summary: "Contains unverified 2-year screen replacement claim",
      data: { hallucinationScore: 0.35, claim: "Free 2yr screen replacement" },
    },
  },
  // Critic adversarial review fires REJECT!
  {
    type: "CRITIC_REVIEW",
    timestamp: 2250,
    review: {
      stepId: "S3",
      attempt: 1,
      decision: "REJECT",
      scores: {
        correctness: 0.52,
        completeness: 0.88,
        relevance: 0.90,
        composite: 0.58,
        hallucination: 0.35,
      },
      critiqueReason: "Unverified warranty claim: No primary retailer or Google Store India policy supports free 2-year screen replacement for student IDs.",
      actionableFeedback: "Strip the unverified screen replacement claim. Cross-reference official Google India warranty documentation (1-year standard limited warranty).",
    },
    packet: {
      id: "pkt-b-s3-reject",
      type: "CRITIC_REVIEW",
      sourceStation: "CRITIC",
      targetStation: "DAG",
      label: "CRITIC: REJECT",
      summary: "REJECT: Hallucination = 0.35 > 0 · Unverified warranty claim",
      data: { decision: "REJECT", reason: "Hallucination detected" },
    },
    firedInvariantId: "zero_hallucination",
  },
  // Executor retries S3
  {
    type: "STEP_RETRY",
    timestamp: 2550,
    stepId: "S3",
    attempt: 2,
    critique: "Strip unverified screen replacement claim. Anchor strictly to Google Store official 1-year limited warranty.",
  },
  {
    type: "TOOL_CALL",
    timestamp: 2800,
    toolCall: {
      stepId: "S3",
      toolName: "page_extract",
      domain: "store.google.com",
      queryOrUrl: "in/warranty/pixel-phones-limited-warranty-policy",
      status: "succeeded",
      durationMs: 310,
    },
  },
  {
    type: "SCRATCHPAD_WRITE",
    timestamp: 3050,
    stepId: "S3",
    keyFindings: [
      "Pixel 8a official warranty confirmed: Standard 1-year limited hardware warranty across India",
      "Screen damage is covered under paid Google Preferred Care, not complimentary student promotion",
    ],
    summaryToken: "S3-OFFICIAL-WARRANTY-VERIFIED",
  },
  {
    type: "STEP_OUTPUT_EMITTED",
    timestamp: 3300,
    output: {
      stepId: "S3",
      attempt: 2,
      content: "Pixel 8a provides 7 years of full OS and security updates. Hardware warranty is 1-year official limited warranty with authorized F1 Solutions service centers.",
      keyFindings: ["Pixel 8a: 7 years updates", "Standard 1-year official warranty verified"],
      sourceCitations: [
        { title: "Google Store India Official Warranty", domain: "store.google.com", url: "https://store.google.com/in/warranty" },
      ],
      executionDurationMs: 440,
      hallucinationScore: 0.0,
    },
    packet: {
      id: "pkt-b-s3-out2",
      type: "STEP_OUTPUT",
      sourceStation: "DAG",
      targetStation: "CRITIC",
      label: "STEP S3 OUTPUT (VERIFIED)",
      summary: "Corrected warranty specification with primary source citation",
      data: { hallucinationScore: 0.0, warranty: "1-year official" },
    },
  },
  {
    type: "CRITIC_REVIEW",
    timestamp: 3550,
    review: {
      stepId: "S3",
      attempt: 2,
      decision: "PASS",
      scores: { correctness: 0.97, completeness: 0.95, relevance: 0.96, composite: 0.96, hallucination: 0.0 },
      critiqueReason: "Hallucination resolved. Official Google Store warranty terms verified with primary documentation.",
    },
    packet: {
      id: "pkt-b-s3-pass",
      type: "CRITIC_REVIEW",
      sourceStation: "CRITIC",
      targetStation: "DAG",
      label: "CRITIC: PASS",
      summary: "Step S3 retry verified: composite score 0.96",
      data: { decision: "PASS", score: 0.96 },
    },
  },
  // S2 & S4 pass
  {
    type: "CRITIC_REVIEW",
    timestamp: 3800,
    review: {
      stepId: "S2",
      attempt: 1,
      decision: "PASS",
      scores: { correctness: 0.95, completeness: 0.93, relevance: 0.96, composite: 0.95, hallucination: 0.0 },
      critiqueReason: "Verified camera sensor data.",
    },
    packet: {
      id: "pkt-b-s2-pass",
      type: "CRITIC_REVIEW",
      sourceStation: "CRITIC",
      targetStation: "DAG",
      label: "CRITIC: PASS",
      summary: "Step S2 verified",
      data: { decision: "PASS", score: 0.95 },
    },
  },
  {
    type: "CRITIC_REVIEW",
    timestamp: 4000,
    review: {
      stepId: "S4",
      attempt: 1,
      decision: "PASS",
      scores: { correctness: 0.96, completeness: 0.94, relevance: 0.95, composite: 0.95, hallucination: 0.0 },
      critiqueReason: "Verified retailer pricing.",
    },
    packet: {
      id: "pkt-b-s4-pass",
      type: "CRITIC_REVIEW",
      sourceStation: "CRITIC",
      targetStation: "DAG",
      label: "CRITIC: PASS",
      summary: "Step S4 verified",
      data: { decision: "PASS", score: 0.95 },
    },
  },
  // S5 Synthesis
  {
    type: "STEP_STARTED",
    timestamp: 4250,
    stepId: "S5",
    attempt: 1,
    activeDependencies: ["S2", "S3", "S4"],
  },
  {
    type: "SYNTHESIS_STARTED",
    timestamp: 4450,
    approvedStepIds: ["S1", "S2", "S3", "S4"],
  },
  {
    type: "REPORT_SECTION_STREAMED",
    timestamp: 4700,
    sectionId: "matrix-b-1",
    title: "Master Comparison Matrix: Verified Longevity",
    contentSnippet: "All longevity and warranty claims rigorously audited: Pixel 8a leads with 7 years of OS updates and standard 1-year manufacturer warranty.",
    matrixRow: {
      spec: "Verified Warranty & Support",
      contenderA: "Pixel 8a: 7 yrs OS + 1 yr Official Warranty",
      contenderB: "Vivo V40 Pro: 3 yrs OS + 1 yr Official Warranty",
      contenderC: "OnePlus 12R: 3 yrs OS + 1 yr Official Warranty",
      verdict: "Pixel 8a (7-Year Guarantee)",
    },
    citation: {
      id: "cit-google-store",
      title: "Google Store Official Warranty Policy",
      domain: "store.google.com",
      url: "https://store.google.com/in/warranty",
      verified: true,
    },
  },
  {
    type: "WORKFLOW_COMPLETED",
    timestamp: 5050,
    reportSummary: "Adversarial verification caught and rectified 1 unverified claim. Final deliverable backed by 100% verified primary sources.",
    finalScore: 0.96,
    totalTokens: 16120,
    durationSeconds: 16.4,
  },
];

export const SCENARIO_B: ScenarioDef = {
  id: "B",
  code: "SCENARIO_B_CRITIC_HALLUCINATION",
  badge: "Scenario B · Critic Catches Hallucination",
  title: "Adversarial Quality Gate: Catching Hallucinations",
  shortTitle: "Critic Gate",
  subtitle: "Critic detects unverified claim on S3, triggers immediate REJECT, and requires retry before state commitment.",
  description: "Demonstrates the PRD invariant 'Must reject when hallucination > 0'. When S3 emits an unverified warranty claim, the Critic flags it, forces an Executor retry against primary OEM sources, and verifies the clean output.",
  events,
};
