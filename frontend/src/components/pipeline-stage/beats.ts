/**
 * Glance Beats Specification (Layer 1)
 * Enforces the simplicity budget:
 * - 5 beats (one per agent)
 * - Caption <= 14 words
 * - Large font (20–24px)
 * - Single moving element / beat
 */

import type { AgentRole } from "./pipelineSpec";

export interface GlanceBeatDef {
  id: number;
  agentRole: AgentRole;
  shortName: string;
  subtitle: string; // <= 3 words
  caption: string;  // <= 14 words
  wordCount: number;
  durationMs: number;
}

export const GLANCE_BEATS: GlanceBeatDef[] = [
  {
    id: 0,
    agentRole: "Planner Agent",
    shortName: "Planner",
    subtitle: "Makes the plan",
    caption: "The Planner breaks your question into a short plan.",
    wordCount: 9,
    durationMs: 4800,
  },
  {
    id: 1,
    agentRole: "Executor Agent",
    shortName: "Executor",
    subtitle: "Gathers evidence",
    caption: "Executors research each step, side by side.",
    wordCount: 7,
    durationMs: 4800,
  },
  {
    id: 2,
    agentRole: "Critic Agent",
    shortName: "Critic",
    subtitle: "Checks every claim",
    caption: "The Critic checks every claim. Nothing unverified gets through.",
    wordCount: 9,
    durationMs: 5200,
  },
  {
    id: 3,
    agentRole: "Dynamic Re-Planner",
    shortName: "Re-Planner",
    subtitle: "Fixes the plan",
    caption: "If a step keeps failing, the plan is rewritten. Verified steps stay.",
    wordCount: 12,
    durationMs: 5000,
  },
  {
    id: 4,
    agentRole: "Synthesizer Agent",
    shortName: "Synthesizer",
    subtitle: "Writes the report",
    caption: "Only verified findings become your final, cited report.",
    wordCount: 9,
    durationMs: 5200,
  },
];

export interface ExploreCardContent {
  role: AgentRole;
  shortName: string;
  gets: string;
  makes: string;
  rule: string;
}

export const EXPLORE_CARDS: Record<AgentRole, ExploreCardContent> = {
  "Planner Agent": {
    role: "Planner Agent",
    shortName: "Planner",
    gets: "Your question and budget",
    makes: "A 3–7 step plan",
    rule: "Never runs the steps itself",
  },
  "Executor Agent": {
    role: "Executor Agent",
    shortName: "Executor",
    gets: "One step plus earlier findings",
    makes: "Findings with cited sources",
    rule: "Never invents sources; flags failed lookups",
  },
  "Critic Agent": {
    role: "Critic Agent",
    shortName: "Critic",
    gets: "A step's findings",
    makes: "Pass or reject, with a score and reason",
    rule: "Rejects any unverified claim",
  },
  "Dynamic Re-Planner": {
    role: "Dynamic Re-Planner",
    shortName: "Re-Planner",
    gets: "The stuck step and what went wrong",
    makes: "A revised plan with fallback steps",
    rule: "Keeps verified steps; max 2 rewrites",
  },
  "Synthesizer Agent": {
    role: "Synthesizer Agent",
    shortName: "Synthesizer",
    gets: "All verified findings",
    makes: "Final report, comparison table, citations",
    rule: "Never shows internal agent chatter",
  },
};
