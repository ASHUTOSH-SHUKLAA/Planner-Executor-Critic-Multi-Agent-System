"use client";

import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, AlertCircle } from "lucide-react";
import type { PlaybackSpeed } from "../timeline";
import type { ScenarioId } from "../scenarios";
import { SCENARIOS } from "../scenarios";

interface ControlBarProps {
  currentScenario: ScenarioId;
  onSelectScenario: (id: ScenarioId) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  speed: PlaybackSpeed;
  onChangeSpeed: (speed: PlaybackSpeed) => void;
  currentIndex: number;
  totalEvents: number;
  onSeek: (index: number) => void;
  replanCount: number;
  maxReplans: number;
  elapsedSeconds: number;
  isScrollScrub: boolean;
  onToggleScrollScrub: () => void;
}

export function ControlBar({
  currentScenario,
  onSelectScenario,
  isPlaying,
  onTogglePlay,
  onStepBackward,
  onStepForward,
  speed,
  onChangeSpeed,
  currentIndex,
  totalEvents,
  onSeek,
  replanCount,
  maxReplans,
  elapsedSeconds,
  isScrollScrub,
  onToggleScrollScrub,
}: ControlBarProps) {
  const scenarioOptions: Array<{ id: ScenarioId; label: string; tag: string }> = [
    { id: "A", label: "A · Happy Path", tag: "Parallel & Strict Gates" },
    { id: "B", label: "B · Hallucination Gate", tag: "Critic Rejection & Retry" },
    { id: "C", label: "C · Dynamic Re-Plan", tag: "Exhaustion & DAG Mutation" },
  ];

  const formatClock = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}.${ms}`;
  };

  return (
    <div className="pipeline-control-bar" role="toolbar" aria-label="Pipeline simulation playback controls">
      {/* Top row: Scenarios + Badge + Metas */}
      <div className="pipeline-control-top">
        <div className="pipeline-scenario-segment" role="radiogroup" aria-label="Simulation scenario">
          {scenarioOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={currentScenario === opt.id}
              className={`pipeline-scenario-btn${currentScenario === opt.id ? " is-active" : ""}`}
              onClick={() => onSelectScenario(opt.id)}
              title={SCENARIOS[opt.id].subtitle}
            >
              <span className="pipeline-scenario-badge">{opt.id}</span>
              <span className="pipeline-scenario-text">{opt.label.split(" · ")[1]}</span>
            </button>
          ))}
        </div>

        <div className="pipeline-meta-group">
          {/* Re-Plan Budget Meter */}
          <div className="pipeline-replan-meter" title={`Re-Plan Events: ${replanCount} used of ${maxReplans} maximum`}>
            <span className="pipeline-meter-label">Re-Plans</span>
            <div className="pipeline-meter-pips">
              {Array.from({ length: maxReplans }).map((_, idx) => (
                <div
                  key={idx}
                  className={`pipeline-meter-pip${idx < replanCount ? " is-filled" : ""}`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="pipeline-meter-count">{replanCount}/{maxReplans}</span>
          </div>

          {/* Workflow Clock */}
          <div className="pipeline-clock" title="Simulated execution elapsed time">
            <span className="pipeline-clock-dot" />
            <span className="pipeline-clock-text">{formatClock(elapsedSeconds)}</span>
          </div>

          {/* Illustrative sample run badge */}
          <div className="pipeline-sample-badge" title="Grounded in real production run shape; numbers and delays are illustrative">
            <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 text-[var(--text-faint)]" />
            <span>Illustrative sample run</span>
          </div>
        </div>
      </div>

      {/* Bottom row: Playback Buttons + Scrubber + Speed */}
      <div className="pipeline-control-bottom">
        <div className="pipeline-playback-actions">
          <button
            type="button"
            className="pipeline-btn pipeline-btn-play"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>

          <button
            type="button"
            className="pipeline-btn pipeline-btn-icon"
            onClick={onStepBackward}
            disabled={currentIndex === 0}
            aria-label="Previous step"
            title="Step backward (Left arrow)"
          >
            <ChevronLeft aria-hidden="true" />
          </button>

          <button
            type="button"
            className="pipeline-btn pipeline-btn-icon"
            onClick={onStepForward}
            disabled={currentIndex >= totalEvents}
            aria-label="Next step"
            title="Step forward (Right arrow)"
          >
            <ChevronRight aria-hidden="true" />
          </button>

          <button
            type="button"
            className="pipeline-btn pipeline-btn-icon"
            onClick={() => onSeek(0)}
            aria-label="Reset simulation"
            title="Reset to beginning"
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>

        {/* Scrubber Track with Event Ticks */}
        <div className="pipeline-scrubber-container">
          <input
            type="range"
            min={0}
            max={totalEvents}
            value={currentIndex}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="pipeline-scrubber"
            aria-label="Event timeline scrubber"
            title={`Step ${currentIndex} of ${totalEvents}`}
          />
          <div className="pipeline-scrubber-progress" style={{ width: `${(currentIndex / Math.max(1, totalEvents)) * 100}%` }} />
          <div className="pipeline-scrubber-info">
            <span>Event {currentIndex} / {totalEvents}</span>
          </div>
        </div>

        {/* Speed Selector */}
        <div className="pipeline-speed-selector" role="group" aria-label="Playback speed">
          {([0.5, 1, 2] as PlaybackSpeed[]).map((s) => (
            <button
              key={s}
              type="button"
              className={`pipeline-speed-btn${speed === s ? " is-active" : ""}`}
              onClick={() => onChangeSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Desktop Scroll-Scrub Mode Toggle */}
        <button
          type="button"
          onClick={onToggleScrollScrub}
          className={`pipeline-scrub-toggle${isScrollScrub ? " is-active" : ""}`}
          title="Scroll-scrub mode: syncs pipeline playback to viewport scroll position"
        >
          {isScrollScrub ? "Scroll: ON" : "Scroll-Scrub"}
        </button>
      </div>
    </div>
  );
}
