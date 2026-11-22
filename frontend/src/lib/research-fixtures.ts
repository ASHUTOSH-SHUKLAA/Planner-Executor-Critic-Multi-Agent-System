import { ResearchViewModel, ResearchSourceViewModel, ResearchStepViewModel } from "./research-view-model";

const SAMPLE_SOURCES: ResearchSourceViewModel[] = [
  {
    id: "src-1",
    url: "https://jeeadv.ac.in/reports/cutoff-2024.html",
    domain: "jeeadv.ac.in",
    title: "Joint Entrance Examination (Advanced) 2024 - Official Seat Allocation & Closing Ranks",
    favicon: "https://www.google.com/s2/favicons?domain=jeeadv.ac.in&sz=64",
    snippet: "Official opening and closing ranks for academic year 2024-2025 across all 23 IITs.",
    type: "Official Portal",
  },
  {
    id: "src-2",
    url: "https://josaa.nic.in/counseling/closing-ranks-round-6.pdf",
    domain: "josaa.nic.in",
    title: "JoSAA Round 6 Final Cutoff Ranks: Computer Science and Engineering",
    favicon: "https://www.google.com/s2/favicons?domain=josaa.nic.in&sz=64",
    snippet: "IIT Bombay CSE closed at AIR 68 for open gender-neutral category in round 6.",
    type: "Counseling Authority",
  },
  {
    id: "src-3",
    url: "https://iitb.ac.in/academics/btech-admissions-summary",
    domain: "iitb.ac.in",
    title: "IIT Bombay Academic Senate: 2024 Admissions Statistics & Quotas",
    favicon: "https://www.google.com/s2/favicons?domain=iitb.ac.in&sz=64",
    snippet: "Statistical breakdown of top 100 JEE Advanced scorers admitted to CSE department.",
    type: "Institutional",
  },
  {
    id: "src-4",
    url: "https://iitd.ac.in/news/jee-closing-ranks-2024",
    domain: "iitd.ac.in",
    title: "IIT Delhi Admissions Portal: CSE and Mathematics & Computing Cutoffs",
    favicon: "https://www.google.com/s2/favicons?domain=iitd.ac.in&sz=64",
    snippet: "IIT Delhi CSE closed at rank 116 in the unreserved general quota.",
    type: "Institutional",
  },
  {
    id: "src-5",
    url: "https://iitm.ac.in/academics/curriculum-and-ranks",
    domain: "iitm.ac.in",
    title: "IIT Madras CSE Admissions Trends & Dual Degree Options (2020-2024)",
    favicon: "https://www.google.com/s2/favicons?domain=iitm.ac.in&sz=64",
    snippet: "Five-year closing rank trends indicate steady appreciation in CSE demand.",
    type: "Institutional",
  },
  {
    id: "src-6",
    url: "https://iitk.ac.in/doaa/admissions-report-2024",
    domain: "iitk.ac.in",
    title: "IIT Kanpur Dean of Academic Affairs: B.Tech Opening and Closing Marks",
    favicon: "https://www.google.com/s2/favicons?domain=iitk.ac.in&sz=64",
    snippet: "IIT Kanpur CSE closed at AIR 252 for general neutral category.",
    type: "Institutional",
  },
];

const SAMPLE_STEPS: ResearchStepViewModel[] = [
  {
    id: "step_1",
    title: "Retrieve JoSAA Round 6 official closing cutoffs for Computer Science",
    status: "passed",
    currentQuery: "JoSAA 2024 Round 6 closing ranks CSE IIT Bombay IIT Delhi IIT Madras",
    attempts: 1,
    plainDependencies: undefined,
  },
  {
    id: "step_2",
    title: "Extract electrical engineering & math computing closing ranks across top 7 IITs",
    status: "active",
    currentQuery: "IIT Bombay IIT Delhi electrical engineering closing rank cutoff JoSAA 2024",
    attempts: 1,
    plainDependencies: "Runs after step 1",
  },
  {
    id: "step_3",
    title: "Cross-validate seat allocation ratios and reserved category quotas",
    status: "pending",
    attempts: 1,
    plainDependencies: "Runs after step 2",
  },
  {
    id: "step_4",
    title: "Compile comparative matrix and five-year trend analysis",
    status: "pending",
    attempts: 1,
    plainDependencies: "Runs after step 3",
  },
];

const SAMPLE_MARKDOWN_ANSWER = `## Executive Summary

Based on the verified official seat allocation records from **JoSAA 2024 Round 6** and institutional admission senate reports, **Computer Science and Engineering (CSE)** remains the most competitive program across all Indian Institutes of Technology. 

For the **Open / Gender-Neutral Category**, the closing ranks for the top 5 premier IITs are summarized below:

### JoSAA 2024 Round 6 Closing Ranks (Computer Science)

| Institute | CSE Closing Rank (2024) | Electrical Eng. Closing Rank (2024) | Primary Source |
| :--- | :--- | :--- | :--- |
| **IIT Bombay** | **68** | **464** | [1] jeeadv.ac.in |
| **IIT Delhi** | **116** | **592** | [2] josaa.nic.in |
| **IIT Madras** | **159** | **832** | [3] iitm.ac.in |
| **IIT Kanpur** | **252** | **1,215** | [4] iitk.ac.in |
| **IIT Kharagpur** | **414** | **1,520** | [5] iitb.ac.in |

> **Key Observation**: Over 95% of candidates securing an All India Rank (AIR) within the top 100 chose Computer Science at IIT Bombay, followed by IIT Delhi [1].

### Historical Trend Analysis (2021–2024)

1. **IIT Bombay CSE**: Stabilized between AIR 61 (2022) and AIR 68 (2024), demonstrating absolute preference among single-digit rankers.
2. **IIT Delhi CSE**: Moved from rank 102 (2023) to 116 (2024), maintaining second position nationwide.
3. **Emergence of Interdisciplinary Options**: Programs like Mathematics and Computing (MnC) at IIT Delhi and Data Science at IIT Madras closed shortly after CSE, absorbing candidates ranked 120–250.
`;

/**
 * 1. Running State (Live Researching Phase)
 */
export const FIXTURE_RUNNING: ResearchViewModel = {
  task: "Compare JEE Advanced closing rank cutoffs for Computer Science and Electrical Engineering at top IITs",
  phase: "researching",
  statusText: "Searching the web · 6 sources",
  elapsedSeconds: 24,
  elapsedMs: 24000,
  formattedElapsed: "0:24",
  stepCount: { completed: 1, total: 4 },
  steps: SAMPLE_STEPS,
  sources: SAMPLE_SOURCES,
  liveSourceChips: SAMPLE_SOURCES.map((s) => ({
    domain: s.domain,
    url: s.url,
    favicon: s.favicon,
  })),
  answerMarkdown: null,
  citations: SAMPLE_SOURCES.map((s, idx) => ({
    id: idx + 1,
    domain: s.domain,
    url: s.url,
    title: s.title,
    snippet: s.snippet,
  })),
  relatedQuestions: [
    "What are the cutoff percentiles for reserved categories (OBC-NCL, EWS, SC, ST)?",
    "How do placement packages and median CTC compare between IIT Bombay and IIT Delhi CSE?",
    "What are the branch change rules and GPA requirements at IIT Bombay for non-CSE students?",
  ],
  images: [],
  process: {
    stages: [
      { id: "1", num: "1", name: "Planning", agent: "Planner", role: "DAG Decomposition", status: "completed" },
      { id: "2", num: "2", name: "Researching", agent: "Executor", role: "Web Grounding", status: "current" },
      { id: "3", num: "3", name: "Auditing", agent: "Critic", role: "Adversarial Audit", status: "pending" },
      { id: "4", num: "4", name: "Filling Gaps", agent: "Re-Planner", role: "Recovery", status: "pending" },
      { id: "5", num: "5", name: "Synthesis", agent: "Synthesizer", role: "Consolidation", status: "pending" },
    ],
    agents: [
      { id: "p", name: "Planner Agent", role: "DAG Plan", description: "Decomposes goals into steps", status: "Idle", lastActivity: "Created 4-step DAG" },
      { id: "e", name: "Executor Agent", role: "Web Search", description: "Parallel search & retrieval", status: "Active", lastActivity: "Searching: IIT Bombay closing ranks 2024" },
      { id: "c", name: "Critic Agent", role: "Adversarial Gate", description: "Audits factual claims", status: "Standby", lastActivity: "Waiting for step 2 output" },
      { id: "r", name: "Dynamic Re-Planner", role: "In-Flight Recovery", description: "Handles retries & mutations", status: "Standby", lastActivity: "0 retries used" },
      { id: "s", name: "Synthesizer Agent", role: "Report Compiler", description: "Compiles final deliverable", status: "Standby", lastActivity: "Waiting for all steps" },
    ],
    criticThreshold: 0.7,
    telemetry: [
      { timestamp: "00:02", agent: "Planner", message: "Generated 4-step research plan for JEE Advanced 2024 cutoffs" },
      { timestamp: "00:08", agent: "Executor", message: "Scraped official JoSAA closing ranks dataset from josaa.nic.in" },
      { timestamp: "00:15", agent: "Critic", message: "Audited step 1 output: score 0.94 (PASSED)" },
      { timestamp: "00:22", agent: "Executor", message: "Active query: electrical engineering ranks IIT Bombay" },
    ],
    model: "Gemini 2.5 Flash",
    mode: "standard",
    tokens: 4320,
    cost: 0.0014,
    activeSearchQuery: "electrical engineering ranks IIT Bombay",
  },
};

/**
 * 2. Complete State (Finished Report)
 */
export const FIXTURE_COMPLETE: ResearchViewModel = {
  ...FIXTURE_RUNNING,
  phase: "complete",
  statusText: "Researched 6 sources in 1m 18s",
  elapsedMs: 78000,
  formattedElapsed: "1:18",
  stepCount: { completed: 4, total: 4 },
  steps: SAMPLE_STEPS.map((s) => ({ ...s, status: "passed" })),
  answerMarkdown: SAMPLE_MARKDOWN_ANSWER,
  process: {
    ...FIXTURE_RUNNING.process,
    stages: FIXTURE_RUNNING.process.stages.map((stg) => ({ ...stg, status: "completed" })),
    agents: FIXTURE_RUNNING.process.agents.map((ag) => ({ ...ag, status: "Complete" })),
    telemetry: [
      ...(FIXTURE_RUNNING.process.telemetry || []),
      { timestamp: "00:45", agent: "Critic", message: "Audited step 3 outputs: score 0.88 (PASSED)" },
      { timestamp: "01:05", agent: "Synthesizer", message: "Compiled authoritative deliverable with 6 citations" },
      { timestamp: "01:18", agent: "System", message: "Workflow completed successfully" },
    ],
    tokens: 18450,
    cost: 0.0058,
    activeSearchQuery: null,
  },
};

/**
 * 3. Stopped State (User Clicked Stop)
 */
export const FIXTURE_STOPPED: ResearchViewModel = {
  ...FIXTURE_RUNNING,
  phase: "stopped",
  statusText: "Research stopped",
  answerMarkdown: null,
};

/**
 * 4. Error State (Network or Rate Limit)
 */
export const FIXTURE_ERROR: ResearchViewModel = {
  ...FIXTURE_RUNNING,
  phase: "error",
  statusText: "Research encountered an error: Upstream search provider timeout (HTTP 504)",
  answerMarkdown: null,
};

/**
 * 5. Critic-Rejected State (Adversarial Quality Gate Active)
 */
export const FIXTURE_CRITIC_REJECTED: ResearchViewModel = {
  ...FIXTURE_RUNNING,
  phase: "researching",
  statusText: "Verifying claims against sources…",
  steps: [
    SAMPLE_STEPS[0],
    SAMPLE_STEPS[1],
    {
      ...SAMPLE_STEPS[2],
      status: "retrying",
      criticNote: "Found a gap in step 3, searching again",
      attempts: 2,
    },
    SAMPLE_STEPS[3],
  ],
};

/**
 * 6. Re-Planned State (Dynamic In-Flight Recovery)
 */
export const FIXTURE_REPLANNED: ResearchViewModel = {
  ...FIXTURE_RUNNING,
  phase: "refining",
  statusText: "Filling gaps in the research…",
  steps: [
    SAMPLE_STEPS[0],
    SAMPLE_STEPS[1],
    {
      id: "step_3_mutated",
      title: "Targeted fallback search: NIRF 2024 institutional reports",
      status: "active",
      attempts: 1,
      plainDependencies: "Runs after step 2",
    },
    SAMPLE_STEPS[3],
  ],
};

/**
 * 7. Zero-Sources State (Early Planning Phase)
 */
export const FIXTURE_ZERO_SOURCES: ResearchViewModel = {
  ...FIXTURE_RUNNING,
  phase: "planning",
  statusText: "Planning your research…",
  sources: [],
  liveSourceChips: [],
  citations: [],
  steps: [],
  stepCount: { completed: 0, total: 4 },
  answerMarkdown: null,
};

export const ALL_RESEARCH_FIXTURES: Record<string, { title: string; data: ResearchViewModel }> = {
  running: { title: "1. Running (Searching live web)", data: FIXTURE_RUNNING },
  complete: { title: "2. Complete (Verified Cited Report)", data: FIXTURE_COMPLETE },
  stopped: { title: "3. Stopped (User interrupted)", data: FIXTURE_STOPPED },
  error: { title: "4. Error (Encountered failure)", data: FIXTURE_ERROR },
  criticRejected: { title: "5. Critic Rejected (Self-healing retry)", data: FIXTURE_CRITIC_REJECTED },
  rePlanned: { title: "6. Re-Planned (DAG mutated in flight)", data: FIXTURE_REPLANNED },
  zeroSources: { title: "7. Zero Sources (Early planning)", data: FIXTURE_ZERO_SOURCES },
};

