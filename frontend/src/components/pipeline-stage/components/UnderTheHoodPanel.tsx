"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TimelineController, type TimelineState } from "../timeline";
import { SCENARIOS, type ScenarioId } from "../scenarios";
import type { AgentRole } from "../pipelineSpec";
import { ControlBar } from "./ControlBar";
import { StageCanvas } from "./StageCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { ChevronDown, FileText, X } from "lucide-react";

interface UnderTheHoodPanelProps {
  initialAgent?: AgentRole;
  onClose: () => void;
}

export function UnderTheHoodPanel({ initialAgent = "Planner Agent", onClose }: UnderTheHoodPanelProps) {
  const [currentScenarioId, setCurrentScenarioId] = useState<ScenarioId>("A");
  const [timelineState, setTimelineState] = useState<TimelineState | null>(null);
  const [focusedAgent, setFocusedAgent] = useState<AgentRole>(initialAgent);
  const [focusedStation, setFocusedStation] = useState<string | null>(null);
  const [isScrollScrub, setIsScrollScrub] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const timelineRef = useRef<TimelineController | null>(null);

  useEffect(() => {
    const scenario = SCENARIOS[currentScenarioId];
    const controller = new TimelineController(scenario.events, true, 1);
    timelineRef.current = controller;

    const unsubscribe = controller.subscribe((state) => {
      setTimelineState(state);
      if (state.currentState.activeAgent) {
        setFocusedAgent(state.currentState.activeAgent);
      }
    });

    return () => {
      unsubscribe();
      controller.destroy();
    };
  }, [currentScenarioId]);

  const handleSelectScenario = useCallback((id: ScenarioId) => {
    setCurrentScenarioId(id);
    setFocusedStation(null);
  }, []);

  const handleSelectAgent = useCallback((agent: AgentRole) => {
    setFocusedAgent(agent);
    const stationMap: Record<AgentRole, string> = {
      "Planner Agent": "PLANNER",
      "Executor Agent": "DAG",
      "Critic Agent": "CRITIC",
      "Dynamic Re-Planner": "REPLANNER",
      "Synthesizer Agent": "SYNTHESIZER",
    };
    setFocusedStation(stationMap[agent]);
  }, []);

  if (!timelineState) {
    return <div className="under-hood-loading">Initializing technical inspection...</div>;
  }

  const { currentState, currentIndex, totalEvents, isPlaying, speed } = timelineState;
  const elapsedSec = (currentState.eventLog[0]?.timestamp || 0) / 1000;

  return (
    <div className="under-the-hood-container" role="region" aria-label="Under the hood technical engine">
      <div className="under-hood-header">
        <div>
          <span className="under-hood-eyebrow">Technical Architecture</span>
          <h3 className="under-hood-title">Under the Hood: Directed Acyclic Graph & Invariants</h3>
          <p className="under-hood-subtitle">
            Inspect the real event-sourced state machine, sandboxed tool calls, and PRD contracts in action.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="under-hood-close-btn"
          aria-label="Collapse under the hood panel"
        >
          <X className="w-4 h-4" aria-hidden="true" />
          <span>Collapse</span>
        </button>
      </div>

      {/* Control Bar */}
      <ControlBar
        currentScenario={currentScenarioId}
        onSelectScenario={handleSelectScenario}
        isPlaying={isPlaying}
        onTogglePlay={() => timelineRef.current?.togglePlayPause()}
        onStepBackward={() => timelineRef.current?.stepBackward()}
        onStepForward={() => timelineRef.current?.stepForward()}
        speed={speed}
        onChangeSpeed={(s) => timelineRef.current?.setSpeed(s)}
        currentIndex={currentIndex}
        totalEvents={totalEvents}
        onSeek={(idx) => timelineRef.current?.seek(idx)}
        replanCount={currentState.replanCount}
        maxReplans={currentState.maxReplans}
        elapsedSeconds={elapsedSec}
        isScrollScrub={isScrollScrub}
        onToggleScrollScrub={() => setIsScrollScrub((prev) => !prev)}
      />

      {/* Technical Blueprint SVG Canvas */}
      <StageCanvas
        state={currentState}
        onSelectStation={handleSelectAgent}
        activeFocus={focusedStation}
      />

      {/* 3-Panel Inspector (PRD Contract, Live Typed JSON Artifact, Structured Event Log) */}
      <InspectorPanel
        state={currentState}
        activeAgent={focusedAgent}
        onSelectAgent={handleSelectAgent}
      />

      {/* Accessible "Read as text" transcript */}
      <div className="pipeline-transcript-toggle">
        <button
          type="button"
          className="transcript-accordion-btn"
          onClick={() => setShowTranscript((prev) => !prev)}
          aria-expanded={showTranscript}
        >
          <FileText className="w-4 h-4 text-[var(--text-faint)]" aria-hidden="true" />
          <span>Read Simulation as Ordered Transcript</span>
          <ChevronDown
            className={`w-4 h-4 text-[var(--text-faint)] transition-transform duration-200${
              showTranscript ? " rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {showTranscript && (
          <div className="transcript-accordion-content" role="region" aria-label="Text transcript">
            <ol className="transcript-list">
              {SCENARIOS[currentScenarioId].events.map((ev, idx) => (
                <li key={idx} className="transcript-item">
                  <span className="transcript-step-idx">{idx + 1}.</span>
                  <span className="transcript-step-type">[{ev.type}]</span>
                  <span className="transcript-step-desc">
                    {ev.type === "TASK_RECEIVED" && `User tasked pipeline with "${ev.task}" under ${ev.modelBudget} budget.`}
                    {ev.type === "PLAN_CREATED" && `Planner Agent decomposed goal into ${ev.plan.steps.length} validated DAG steps.`}
                    {ev.type === "STEP_STARTED" && `Executor Agent started step ${ev.stepId} (Attempt ${ev.attempt}).`}
                    {ev.type === "TOOL_CALL" && `Executor dispatched tool ${ev.toolCall.toolName} to domain ${ev.toolCall.domain} [${ev.toolCall.status}].`}
                    {ev.type === "SCRATCHPAD_WRITE" && `Findings recorded to shared scratchpad for step ${ev.stepId}.`}
                    {ev.type === "STEP_OUTPUT_EMITTED" && `Step ${ev.output.stepId} emitted output artifact with hallucination delta ${ev.output.hallucinationScore}.`}
                    {ev.type === "CRITIC_REVIEW" && `Critic Agent issued decision ${ev.review.decision} on step ${ev.review.stepId} (Score: ${ev.review.scores.composite.toFixed(2)}).`}
                    {ev.type === "STEP_RETRY" && `Executor retrying step ${ev.stepId} addressing critique.`}
                    {ev.type === "STEP_EXHAUSTED" && `Step ${ev.stepId} exhausted maximum retry limit.`}
                    {ev.type === "REPLAN_STARTED" && `Dynamic Re-Planner triggered to recover workflow.`}
                    {ev.type === "PLAN_MUTATED" && `DAG mutated: Injected fallback steps while preserving already PASSED steps.`}
                    {ev.type === "SYNTHESIS_STARTED" && `Synthesizer compiling Master Comparison Matrix from approved outputs.`}
                    {ev.type === "REPORT_SECTION_STREAMED" && `Synthesizer streamed section "${ev.title}".`}
                    {ev.type === "WORKFLOW_COMPLETED" && `Research workflow successfully completed without internal syntax leaks.`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
