/**
 * Scenarios Registry
 */

import { SCENARIO_A } from "./scenario-a";
import { SCENARIO_B } from "./scenario-b";
import { SCENARIO_C } from "./scenario-c";
import type { ScenarioDef, ScenarioId } from "./types";

export * from "./types";
export { SCENARIO_A } from "./scenario-a";
export { SCENARIO_B } from "./scenario-b";
export { SCENARIO_C } from "./scenario-c";

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  A: SCENARIO_A,
  B: SCENARIO_B,
  C: SCENARIO_C,
};

export const SCENARIO_LIST: ScenarioDef[] = [SCENARIO_A, SCENARIO_B, SCENARIO_C];
