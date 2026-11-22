"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Sliders } from "lucide-react";
import { GlanceStage } from "./components/GlanceStage";
import type { AgentRole } from "./pipelineSpec";

// Lazy-load Layer 3 Under the Hood so Layer 1 default view is ultra-light & fast
const UnderTheHoodPanel = dynamic(
  () => import("./components/UnderTheHoodPanel").then((mod) => mod.UnderTheHoodPanel),
  {
    loading: () => (
      <div className="under-hood-loading-skeleton" aria-live="polite">
        <span>Loading technical inspection engine...</span>
      </div>
    ),
    ssr: false,
  }
);

export interface PipelineStageProps {
  mode?: "landing" | "inspect";
}

export function PipelineStage({ mode = "landing" }: PipelineStageProps) {
  const [isUnderTheHoodOpen, setIsUnderTheHoodOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentRole>("Planner Agent");

  const handleOpenUnderTheHood = (agent?: AgentRole) => {
    if (agent) setSelectedAgent(agent);
    setIsUnderTheHoodOpen(true);
  };

  return (
    <div className={`pipeline-stage-container mode-${mode}`} role="region" aria-label="Deterministic Pipeline">
      {/* LAYER 1: GLANCE (Default, always visible, calm minimal animation) */}
      <GlanceStage onOpenUnderTheHood={handleOpenUnderTheHood} autoPlay={true} />

      {/* Progressive Disclosure Toggle for Layer 3 */}
      <div className="under-hood-toggle-wrapper">
        <button
          type="button"
          onClick={() => setIsUnderTheHoodOpen((prev) => !prev)}
          className={`under-hood-toggle-btn${isUnderTheHoodOpen ? " is-active" : ""}`}
          aria-expanded={isUnderTheHoodOpen}
          aria-controls="under-the-hood-section"
        >
          <Sliders className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
          <span>See how it works under the hood</span>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200${isUnderTheHoodOpen ? " rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* LAYER 3: UNDER THE HOOD (Opt-in, collapsed by default, lazy-loaded) */}
      {isUnderTheHoodOpen && (
        <div id="under-the-hood-section" className="under-hood-expanded-view">
          <UnderTheHoodPanel
            initialAgent={selectedAgent}
            onClose={() => setIsUnderTheHoodOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
