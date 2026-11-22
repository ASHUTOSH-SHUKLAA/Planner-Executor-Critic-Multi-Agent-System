import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testBuildDir = path.join(root, "scripts/.test-build-vm");

const fileVm = path.join(root, "src/lib/research-view-model.ts");
const fileFixtures = path.join(root, "src/lib/research-fixtures.ts");

execSync(
  `npx tsc "${fileVm}" "${fileFixtures}" --outDir "${testBuildDir}" --module commonjs --target es2022 --moduleResolution node --skipLibCheck`,
  { cwd: root, stdio: "inherit" }
);

const { buildResearchViewModel, formatDuration, extractDomain } = require(path.join(testBuildDir, "research-view-model.js"));
const {
  FIXTURE_RUNNING,
  FIXTURE_COMPLETE,
  FIXTURE_STOPPED,
  FIXTURE_ERROR,
  FIXTURE_CRITIC_REJECTED,
  FIXTURE_REPLANNED,
  FIXTURE_ZERO_SOURCES,
} = require(path.join(testBuildDir, "research-fixtures.js"));

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
    passedTests++;
  }
}

console.log("=== AegisFlow Research View-Model Unit Test Suite ===\n");

// 1. Domain extraction & duration formatting
console.log("[Test 1] Helper functions (extractDomain & formatDuration)");
assert(extractDomain("https://www.google.com/path?q=test") === "google.com", "extractDomain strips www and protocol");
assert(extractDomain("https://jeeadv.ac.in/reports") === "jeeadv.ac.in", "extractDomain handles academic domains");
assert(formatDuration(35, "clock") === "0:35", "formatDuration formats clock time 0:35");
assert(formatDuration(100, "natural") === "1m 40s", "formatDuration formats natural time 1m 40s");

// 2. Planning phase mapping
console.log("\n[Test 2] Planning phase mapping");
const planningVm = buildResearchViewModel({
  task: "Compare JEE Advanced cutoffs",
  currentStage: "PLANNING",
  workflowState: {
    task: "Compare JEE Advanced cutoffs",
    status: "PLANNING",
    plan: {
      steps: [
        { step_id: "s1", title: "Find cutoffs", status: "PENDING", description: "", dependencies: [] },
        { step_id: "s2", title: "Compare seats", status: "PENDING", description: "", dependencies: ["s1"] },
      ],
    },
  },
  isRunning: true,
});
assert(planningVm.phase === "planning", "Phase is 'planning'");
assert(planningVm.statusText === "Breaking this into 2 steps", "Planning statusText announces step count in plain language");
assert(planningVm.steps[1].plainDependencies === "Runs after step 1", "Dependencies formatted into plain English ('Runs after step 1')");

// 3. Researching phase mapping
console.log("\n[Test 3] Researching phase mapping");
const researchingVm = buildResearchViewModel({
  task: "Compare JEE Advanced cutoffs",
  currentStage: "RESEARCHING",
  workflowState: {
    task: "Compare JEE Advanced cutoffs",
    status: "RESEARCHING",
    sources: [
      { url: "https://josaa.nic.in", domain: "josaa.nic.in", title: "JoSAA Cutoffs" },
    ],
  },
  activeSearchQuery: "JEE Advanced 2024 closing ranks",
  elapsedSeconds: 25,
  isRunning: true,
});
assert(researchingVm.phase === "researching", "Phase is 'researching'");
assert(researchingVm.statusText === "Searching: JEE Advanced 2024 closing ranks", "Active query mapped to 'Searching: <query>'");
assert(researchingVm.liveSourceChips.length === 1, "Live source chips populated from verified sources");

// 4. Zero sources handling
console.log("\n[Test 4] Zero sources handling (no fake data)");
const zeroSourcesVm = buildResearchViewModel({
  task: "Compare JEE Advanced cutoffs",
  currentStage: "PLANNING",
  workflowState: null,
  isRunning: true,
});
assert(zeroSourcesVm.sources.length === 0, "Sources array is strictly empty when no sources retrieved");
assert(zeroSourcesVm.liveSourceChips.length === 0, "No live source chips rendered when sources count is 0");

// 5. Critic rejection handling
console.log("\n[Test 5] Critic rejection handling");
const criticRejectedVm = buildResearchViewModel({
  task: "Compare JEE Advanced cutoffs",
  currentStage: "RESEARCHING",
  workflowState: {
    task: "Compare JEE Advanced cutoffs",
    status: "RESEARCHING",
    plan: {
      steps: [
        { step_id: "s1", title: "Find cutoffs", status: "PENDING", description: "", dependencies: [] },
      ],
    },
    step_outputs: {
      s1: {
        step_id: "s1",
        status: "FAILED",
        critic_eval: {
          score: 0.55,
          hallucination: 1,
          critique: "Sources missing for 2024 data",
        },
      },
    },
  },
  isRunning: true,
});
assert(criticRejectedVm.steps[0].status === "retrying", "Step status marked as retrying on Critic rejection");
assert(criticRejectedVm.steps[0].criticNote === "Found a gap in step 1, searching again", "Critic note converted to plain language");

// 6. Complete phase mapping
console.log("\n[Test 6] Complete phase mapping");
const completeVm = buildResearchViewModel({
  task: "Compare JEE Advanced cutoffs",
  currentStage: "COMPLETED",
  workflowState: {
    task: "Compare JEE Advanced cutoffs",
    status: "COMPLETED",
    final_result: "# Research Report\n\nVerified findings.",
    sources: [
      { url: "https://josaa.nic.in", domain: "josaa.nic.in", title: "JoSAA Cutoffs" },
      { url: "https://iitb.ac.in", domain: "iitb.ac.in", title: "IIT Bombay" },
    ],
  },
  elapsedSeconds: 95,
  isRunning: false,
});
assert(completeVm.phase === "complete", "Phase is 'complete'");
assert(completeVm.statusText === "Researched 2 sources in 1m 35s", "Complete statusText formatted to summary line");
assert(completeVm.answerMarkdown !== null, "Answer markdown present in complete state");

// 7. Fixtures integrity
console.log("\n[Test 7] All 7 Fixtures Integrity");
assert(FIXTURE_RUNNING.phase === "researching", "FIXTURE_RUNNING is valid");
assert(FIXTURE_COMPLETE.phase === "complete", "FIXTURE_COMPLETE is valid");
assert(FIXTURE_STOPPED.phase === "stopped", "FIXTURE_STOPPED is valid");
assert(FIXTURE_ERROR.phase === "error", "FIXTURE_ERROR is valid");
assert(FIXTURE_CRITIC_REJECTED.steps[2].status === "retrying", "FIXTURE_CRITIC_REJECTED is valid");
assert(FIXTURE_REPLANNED.phase === "refining", "FIXTURE_REPLANNED is valid");
assert(FIXTURE_ZERO_SOURCES.sources.length === 0, "FIXTURE_ZERO_SOURCES is valid");

console.log(`\n========================================`);
console.log(`View-Model Test Summary: ${passedTests}/${totalTests} passed`);
console.log(`========================================\n`);
