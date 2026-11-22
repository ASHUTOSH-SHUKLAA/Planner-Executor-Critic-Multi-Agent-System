/**
 * Live Pipeline Stage Layout Blueprint
 * All coordinates strictly aligned to an 8px grid inside a fixed 1200 x 560 viewBox.
 */

export interface RectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface DagNodePosition {
  id: string;
  x: number; // center x
  y: number; // center y
  width: number;
  height: number;
  labelOffsetX: number;
  labelOffsetY: number;
}

export const STAGE_VIEWBOX = {
  width: 1200,
  height: 560,
  viewBox: "0 0 1200 560",
};

export const STATIONS: Record<string, RectBounds> = {
  inputCapsule: { x: 24, y: 24, width: 176, height: 48, rx: 12 },
  planner: { x: 24, y: 88, width: 176, height: 192, rx: 16 },
  dagArea: { x: 224, y: 24, width: 544, height: 296, rx: 16 },
  scratchpad: { x: 224, y: 328, width: 544, height: 40, rx: 10 },
  toolsTray: { x: 224, y: 376, width: 544, height: 40, rx: 10 },
  criticGate: { x: 792, y: 72, width: 168, height: 248, rx: 16 },
  synthesizer: { x: 984, y: 56, width: 192, height: 288, rx: 16 },
  replannerLane: { x: 448, y: 432, width: 512, height: 104, rx: 16 },
};

export const DAG_NODES: Record<string, DagNodePosition> = {
  S1: { id: "S1", x: 288, y: 136, width: 104, height: 48, labelOffsetX: 0, labelOffsetY: 36 },
  S2: { id: "S2", x: 456, y: 64, width: 112, height: 44, labelOffsetX: 0, labelOffsetY: 34 },
  S3: { id: "S3", x: 456, y: 136, width: 112, height: 44, labelOffsetX: 0, labelOffsetY: 34 },
  S4: { id: "S4", x: 456, y: 208, width: 112, height: 44, labelOffsetX: 0, labelOffsetY: 34 },
  S4b: { id: "S4b", x: 584, y: 248, width: 112, height: 44, labelOffsetX: 0, labelOffsetY: 34 },
  S5: { id: "S5", x: 688, y: 136, width: 112, height: 48, labelOffsetX: 0, labelOffsetY: 36 },
};

export const CONDUIT_PATHS = {
  // Input -> Planner
  inputToPlanner: "M112 72 L112 88",
  // Planner -> DAG Root (S1)
  plannerToS1: "M200 184 C216 184 216 136 236 136",
  // S1 -> S2, S3, S4 (Parallel fan-out)
  s1ToS2: "M340 136 C376 136 364 64 400 64",
  s1ToS3: "M340 136 L400 136",
  s1ToS4: "M340 136 C376 136 364 208 400 208",
  // S2, S3, S4 -> Critic Gate (StepOutputs)
  s2ToCritic: "M512 64 C648 64 680 120 792 120",
  s3ToCritic: "M512 136 C648 136 680 160 792 160",
  s4ToCritic: "M512 208 C648 208 680 200 792 200",
  s4bToCritic: "M640 248 C720 248 740 220 792 220",
  // Critic PASS -> S5
  criticToS5: "M792 196 C748 196 748 136 744 136",
  // S5 -> Synthesizer
  s5ToSynthesizer: "M744 136 C864 136 864 180 984 180",
  // Critic REJECT -> Re-Planner (recovery branch)
  criticToReplanner: "M876 320 C876 384 840 432 768 432",
  // Re-Planner -> DAG Mutation Conduit
  replannerToDag: "M480 432 C432 432 400 320 456 252",
};

/**
 * Pre-calculated path definitions for packet animations.
 */
export const PACKET_TRACKS: Record<string, string> = {
  PLAN_EMIT: "M112 184 C112 184 176 136 288 136",
  OUTPUT_S1: "M288 136 C360 136 640 140 792 140",
  OUTPUT_S2: "M456 64 C600 64 680 120 792 120",
  OUTPUT_S3: "M456 136 C600 136 680 160 792 160",
  OUTPUT_S4: "M456 208 C600 208 680 200 792 200",
  OUTPUT_S4B: "M584 248 C700 248 740 220 792 220",
  CRITIC_PASS: "M792 196 C748 196 748 136 688 136",
  CRITIC_REJECT_REPLAN: "M876 320 C876 384 840 432 768 432",
  MUTATED_PLAN_DEPLOY: "M480 432 C432 432 400 320 456 208",
  SYNTHESIS_DELIVERABLE: "M688 136 C864 136 864 180 984 180",
};
