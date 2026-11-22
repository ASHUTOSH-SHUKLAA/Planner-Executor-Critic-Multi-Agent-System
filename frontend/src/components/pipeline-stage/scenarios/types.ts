/**
 * Scenario Types & Interface
 */

import type { PipelineEvent } from "../events";

export type ScenarioId = "A" | "B" | "C";

export interface ScenarioDef {
  id: ScenarioId;
  code: string;
  badge: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  description: string;
  events: PipelineEvent[];
}
