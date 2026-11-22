"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  GitBranch,
  Cpu,
  ShieldCheck,
  RefreshCw,
  FileText,
  Check,
  Lock,
} from "lucide-react";
import { GLANCE_BEATS, type GlanceBeatDef } from "../beats";
import type { AgentRole } from "../pipelineSpec";
import { ExploreCard } from "./ExploreCard";

interface GlanceStageProps {
  onOpenUnderTheHood: (agent: AgentRole) => void;
  autoPlay?: boolean;
}

export function GlanceStage({ onOpenUnderTheHood, autoPlay = true }: GlanceStageProps) {
  const [currentBeatIndex, setCurrentBeatIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [exploreAgent, setExploreAgent] = useState<AgentRole | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentBeat: GlanceBeatDef = GLANCE_BEATS[currentBeatIndex] || GLANCE_BEATS[0];
  const isFinalBeat = currentBeatIndex === GLANCE_BEATS.length - 1;

  // Beat transition schedule
  const scheduleNextBeat = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isPlaying || isHovered || exploreAgent !== null) return;

    const beat = GLANCE_BEATS[currentBeatIndex];
    timerRef.current = setTimeout(() => {
      setCurrentBeatIndex((prev) => {
        if (prev >= GLANCE_BEATS.length - 1) {
          setIsPlaying(false); // Rest on final frame (no infinite loop)
          return prev;
        }
        return prev + 1;
      });
    }, beat.durationMs);
  }, [currentBeatIndex, isPlaying, isHovered, exploreAgent]);

  useEffect(() => {
    scheduleNextBeat();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleNextBeat]);

  // Autoplay observer: starts once when stage is >= 50% in view
  useEffect(() => {
    if (!containerRef.current || !autoPlay) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
          if (!isFinalBeat && exploreAgent === null) {
            setIsPlaying(true);
          }
        } else {
          setIsPlaying(false);
        }
      },
      { threshold: [0, 0.45, 0.8] }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [autoPlay, isFinalBeat, exploreAgent]);

  // Keyboard controls: Space = play/pause, Left/Right = previous/next beat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentBeatIndex((prev) => Math.max(0, prev - 1));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentBeatIndex((prev) => Math.min(GLANCE_BEATS.length - 1, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNodeClick = (role: AgentRole) => {
    setIsPlaying(false);
    setExploreAgent((prev) => (prev === role ? null : role));
  };

  const handleJumpToBeat = (index: number) => {
    setCurrentBeatIndex(index);
    if (index < GLANCE_BEATS.length - 1) {
      setIsPlaying(true);
    }
  };

  const handleReplay = () => {
    setCurrentBeatIndex(0);
    setExploreAgent(null);
    setIsPlaying(true);
  };

  return (
    <div
      ref={containerRef}
      className="glance-stage-card"
      role="region"
      aria-label="Glanceable Multi-Agent Pipeline Overview"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Corner "Sample run" quiet tag */}
      <div className="glance-tag-corner" title="Illustrative sample run based on PRD contracts">
        <span>Sample run</span>
      </div>

      {/* Main Single Rail Stage (16:7 aspect ratio on desktop) */}
      <div className="glance-rail-wrapper">
        <svg
          viewBox="0 0 960 380"
          className="glance-rail-svg"
          role="img"
          aria-label="Five agent orchestration line"
        >
          <defs>
            {/* Subtle glow filter */}
            <filter id="node-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="var(--text)" floodOpacity="0.1" />
            </filter>
            <marker id="rail-arrow" viewBox="0 0 8 8" refX="5" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 1 1 L 6 4 L 1 7 z" fill="var(--border-strong)" />
            </marker>
          </defs>

          {/* ========================================================
              RAIL CONNECTOR LINES (Flat 2D Blueprint)
          ======================================================== */}
          {/* Main Horizontal Line: (140, 140) to (820, 140) */}
          <line
            x1="140"
            y1="140"
            x2="820"
            y2="140"
            stroke="var(--border)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Active Segment Trace */}
          {currentBeatIndex === 0 && (
            <line x1="60" y1="140" x2="180" y2="140" stroke="var(--planner)" strokeWidth="3" strokeLinecap="round" />
          )}
          {currentBeatIndex === 1 && (
            <line x1="180" y1="140" x2="380" y2="140" stroke="var(--executor)" strokeWidth="3" strokeLinecap="round" />
          )}
          {currentBeatIndex === 2 && (
            <line x1="380" y1="140" x2="580" y2="140" stroke="var(--critic)" strokeWidth="3" strokeLinecap="round" />
          )}
          {currentBeatIndex === 3 && (
            <path d="M 580 140 Q 640 230 580 250 Q 520 230 580 140" fill="none" stroke="var(--critic)" strokeWidth="2.5" strokeDasharray="5 5" />
          )}
          {currentBeatIndex === 4 && (
            <line x1="580" y1="140" x2="780" y2="140" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          )}

          {/* Re-Planner Hanging Loop (below Critic node at x=580) */}
          <path
            d="M 580 176 C 580 216 580 216 580 240"
            fill="none"
            stroke={currentBeatIndex === 3 ? "var(--critic)" : "var(--border)"}
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* ========================================================
              TASK PACKET: TRAVELING USER QUESTION DOT
          ======================================================== */}
          <g className="glance-traveling-task" aria-hidden="true">
            {currentBeatIndex === 0 && (
              <g transform="translate(180, 140)">
                <circle r="7" fill="var(--planner)" />
                <circle r="13" fill="var(--planner)" opacity="0.2" className="animate-ping" />
              </g>
            )}
            {currentBeatIndex === 1 && (
              <g transform="translate(380, 140)">
                <circle r="7" fill="var(--executor)" />
                <circle r="13" fill="var(--executor)" opacity="0.2" className="animate-ping" />
              </g>
            )}
            {currentBeatIndex === 2 && (
              <g transform="translate(580, 140)">
                <circle r="7" fill="var(--critic)" />
                <circle r="13" fill="var(--critic)" opacity="0.2" className="animate-ping" />
              </g>
            )}
            {currentBeatIndex === 3 && (
              <g transform="translate(580, 270)">
                <circle r="7" fill="var(--critic)" />
                <circle r="13" fill="var(--critic)" opacity="0.2" className="animate-ping" />
              </g>
            )}
            {currentBeatIndex === 4 && (
              <g transform="translate(780, 140)">
                <circle r="7" fill="var(--accent)" />
                <circle r="13" fill="var(--accent)" opacity="0.2" className="animate-ping" />
              </g>
            )}
          </g>

          {/* Initial "Your question" badge at left */}
          {currentBeatIndex === 0 && (
            <g transform="translate(50, 100)" className="glance-question-pill">
              <rect width="84" height="24" rx="12" fill="var(--surface)" stroke="var(--border)" />
              <text x="42" y="16" textAnchor="middle" fill="var(--text-muted)" fontSize="13" fontWeight="600">
                Your question
              </text>
            </g>
          )}

          {/* ========================================================
              NODE 1: PLANNER AGENT (cx = 180, cy = 140)
          ======================================================== */}
          <g
            className={`glance-agent-node${currentBeatIndex === 0 ? " is-active" : " is-dimmed"}`}
            transform="translate(180, 140)"
            onClick={() => handleNodeClick("Planner Agent")}
            role="button"
            tabIndex={0}
            aria-label="Planner Agent: Makes the plan"
          >
            <circle
              r="28"
              fill={currentBeatIndex === 0 ? "var(--surface)" : "var(--surface-hover)"}
              stroke={currentBeatIndex === 0 ? "var(--planner)" : "var(--border)"}
              strokeWidth={currentBeatIndex === 0 ? "2.5" : "1.5"}
              filter="url(#node-glow)"
            />
            <foreignObject x="-12" y="-12" width="24" height="24">
              <GitBranch className="w-6 h-6 text-[var(--planner)]" aria-hidden="true" />
            </foreignObject>

            {/* Labels below with >= 12px clearance */}
            <text x="0" y="46" textAnchor="middle" fill="var(--text)" fontSize="16" fontWeight="700">
              Planner
            </text>
            <text x="0" y="66" textAnchor="middle" fill="var(--text-muted)" fontSize="13" fontWeight="500">
              Makes the plan
            </text>

            {/* Beat 1 visual: Fans into mini graph -> "5 steps" chip */}
            {currentBeatIndex === 0 && (
              <g transform="translate(-36, -56)" className="glance-beat-chip">
                <rect width="72" height="24" rx="12" fill="var(--surface)" stroke="var(--planner)" strokeWidth="1.5" />
                <text x="36" y="16" textAnchor="middle" fill="var(--planner)" fontSize="13" fontWeight="750">
                  5 steps
                </text>
              </g>
            )}
          </g>

          {/* ========================================================
              NODE 2: EXECUTOR AGENT (cx = 380, cy = 140)
          ======================================================== */}
          <g
            className={`glance-agent-node${currentBeatIndex === 1 ? " is-active" : " is-dimmed"}`}
            transform="translate(380, 140)"
            onClick={() => handleNodeClick("Executor Agent")}
            role="button"
            tabIndex={0}
            aria-label="Executor Agent: Gathers evidence"
          >
            <circle
              r="28"
              fill={currentBeatIndex === 1 ? "var(--surface)" : "var(--surface-hover)"}
              stroke={currentBeatIndex === 1 ? "var(--executor)" : "var(--border)"}
              strokeWidth={currentBeatIndex === 1 ? "2.5" : "1.5"}
              filter="url(#node-glow)"
            />
            <foreignObject x="-12" y="-12" width="24" height="24">
              <Cpu className="w-6 h-6 text-[var(--executor)]" aria-hidden="true" />
            </foreignObject>

            <text x="0" y="46" textAnchor="middle" fill="var(--text)" fontSize="16" fontWeight="700">
              Executor
            </text>
            <text x="0" y="66" textAnchor="middle" fill="var(--text-muted)" fontSize="13" fontWeight="500">
              Gathers evidence
            </text>

            {/* Beat 2 visual: 3 domain source chips pop up and fade */}
            {currentBeatIndex === 1 && (
              <g transform="translate(-100, -64)" className="glance-beat-domains">
                <g transform="translate(0, 0)">
                  <rect width="64" height="20" rx="10" fill="var(--surface)" stroke="var(--border)" />
                  <text x="32" y="14" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="600">amazon.in</text>
                </g>
                <g transform="translate(70, -8)">
                  <rect width="68" height="20" rx="10" fill="var(--surface)" stroke="var(--executor)" strokeWidth="1.5" />
                  <text x="34" y="14" textAnchor="middle" fill="var(--executor)" fontSize="11" fontWeight="700">smartprix</text>
                </g>
                <g transform="translate(144, 0)">
                  <rect width="62" height="20" rx="10" fill="var(--surface)" stroke="var(--border)" />
                  <text x="31" y="14" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="600">flipkart</text>
                </g>
              </g>
            )}
          </g>

          {/* ========================================================
              NODE 3: CRITIC AGENT (cx = 580, cy = 140)
          ======================================================== */}
          <g
            className={`glance-agent-node${currentBeatIndex === 2 ? " is-active" : " is-dimmed"}`}
            transform="translate(580, 140)"
            onClick={() => handleNodeClick("Critic Agent")}
            role="button"
            tabIndex={0}
            aria-label="Critic Agent: Checks every claim"
          >
            <circle
              r="28"
              fill={currentBeatIndex === 2 ? "var(--surface)" : "var(--surface-hover)"}
              stroke={currentBeatIndex === 2 ? "var(--critic)" : "var(--border)"}
              strokeWidth={currentBeatIndex === 2 ? "2.5" : "1.5"}
              filter="url(#node-glow)"
            />
            <foreignObject x="-12" y="-12" width="24" height="24">
              <ShieldCheck className="w-6 h-6 text-[var(--critic)]" aria-hidden="true" />
            </foreignObject>

            <text x="0" y="46" textAnchor="middle" fill="var(--text)" fontSize="16" fontWeight="700">
              Critic
            </text>
            <text x="0" y="66" textAnchor="middle" fill="var(--text-muted)" fontSize="13" fontWeight="500">
              Checks every claim
            </text>

            {/* Beat 3 visual: Quality gate with pass ✓ badge */}
            {currentBeatIndex === 2 && (
              <g transform="translate(-40, -56)" className="glance-beat-gate">
                <rect width="80" height="24" rx="12" fill="var(--surface)" stroke="var(--success)" strokeWidth="1.5" />
                <text x="40" y="16" textAnchor="middle" fill="var(--success)" fontSize="13" fontWeight="800">
                  Verified ✓
                </text>
              </g>
            )}
          </g>

          {/* ========================================================
              NODE 4: DYNAMIC RE-PLANNER (cx = 580, cy = 270)
              Hangs beneath the Critic with dashed outline & loop arrow
          ======================================================== */}
          <g
            className={`glance-agent-node node-replanner${currentBeatIndex === 3 ? " is-active" : " is-dimmed"}`}
            transform="translate(580, 270)"
            onClick={() => handleNodeClick("Dynamic Re-Planner")}
            role="button"
            tabIndex={0}
            aria-label="Dynamic Re-Planner: Fixes the plan (only when needed)"
          >
            <circle
              r="24"
              fill={currentBeatIndex === 3 ? "var(--surface)" : "var(--surface-hover)"}
              stroke={currentBeatIndex === 3 ? "var(--critic)" : "var(--border)"}
              strokeWidth={currentBeatIndex === 3 ? "2" : "1.5"}
              strokeDasharray="4 4"
              filter="url(#node-glow)"
            />
            <foreignObject x="-10" y="-10" width="20" height="20">
              <RefreshCw className="w-5 h-5 text-[var(--critic)]" aria-hidden="true" />
            </foreignObject>

            <text x="0" y="42" textAnchor="middle" fill="var(--text)" fontSize="15" fontWeight="700">
              Re-Planner
            </text>
            <text x="0" y="60" textAnchor="middle" fill="var(--text-muted)" fontSize="13" fontWeight="500">
              Fixes the plan
            </text>

            {/* Beat 4 visual: Rewritten dot + locked steps */}
            {currentBeatIndex === 3 && (
              <g transform="translate(-54, -48)" className="glance-beat-replan">
                <rect width="108" height="24" rx="12" fill="var(--surface)" stroke="var(--critic)" strokeWidth="1.5" />
                <text x="54" y="16" textAnchor="middle" fill="var(--critic)" fontSize="13" fontWeight="750">
                  DAG Mutated 🔒
                </text>
              </g>
            )}
          </g>

          {/* ========================================================
              NODE 5: SYNTHESIZER AGENT (cx = 780, cy = 140)
          ======================================================== */}
          <g
            className={`glance-agent-node${currentBeatIndex === 4 ? " is-active" : " is-dimmed"}`}
            transform="translate(780, 140)"
            onClick={() => handleNodeClick("Synthesizer Agent")}
            role="button"
            tabIndex={0}
            aria-label="Synthesizer Agent: Writes the report"
          >
            <circle
              r="28"
              fill={currentBeatIndex === 4 ? "var(--surface)" : "var(--surface-hover)"}
              stroke={currentBeatIndex === 4 ? "var(--accent)" : "var(--border)"}
              strokeWidth={currentBeatIndex === 4 ? "2.5" : "1.5"}
              filter="url(#node-glow)"
            />
            <foreignObject x="-12" y="-12" width="24" height="24">
              <FileText className="w-6 h-6 text-[var(--accent)]" aria-hidden="true" />
            </foreignObject>

            <text x="0" y="46" textAnchor="middle" fill="var(--text)" fontSize="16" fontWeight="700">
              Synthesizer
            </text>
            <text x="0" y="66" textAnchor="middle" fill="var(--text-muted)" fontSize="13" fontWeight="500">
              Writes the report
            </text>

            {/* Beat 5 visual: Compact report card rests */}
            {currentBeatIndex === 4 && (
              <g transform="translate(-48, -62)" className="glance-beat-report">
                <rect width="96" height="28" rx="8" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
                <text x="48" y="18" textAnchor="middle" fill="var(--accent)" fontSize="13" fontWeight="750">
                  Cited Report ✓
                </text>
              </g>
            )}
          </g>
        </svg>

        {/* Explore Popover Card (Layer 2) */}
        {exploreAgent && (
          <div className="explore-card-anchor">
            <ExploreCard
              agentRole={exploreAgent}
              onClose={() => {
                setExploreAgent(null);
                if (!isFinalBeat) setIsPlaying(true);
              }}
              onOpenUnderTheHood={onOpenUnderTheHood}
            />
          </div>
        )}
      </div>

      {/* ========================================================
          CENTERED CAPTION (Narrates current beat, <= 14 words, 20–24px)
      ======================================================== */}
      <div className="glance-caption-container" aria-live="polite">
        <p className="glance-caption-text">{currentBeat.caption}</p>
      </div>

      {/* ========================================================
          CONTROLS: PROGRESS DOTS + PLAY/PAUSE/REPLAY (Layer 1 only)
      ======================================================== */}
      <div className="glance-controls-row">
        {/* Play / Pause / Replay Action Button */}
        {isFinalBeat ? (
          <button
            type="button"
            onClick={handleReplay}
            className="glance-action-btn"
            aria-label="Replay animation"
            title="Replay from start"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Replay</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="glance-action-btn"
            aria-label={isPlaying ? "Pause animation" : "Play animation"}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>
        )}

        {/* Five Progress Dots (click to jump, current = filled, done = checked) */}
        <div className="glance-dots-group" role="tablist" aria-label="Animation beat selector">
          {GLANCE_BEATS.map((beat, idx) => {
            const isCurrent = idx === currentBeatIndex;
            const isDone = idx < currentBeatIndex;

            return (
              <button
                key={beat.id}
                type="button"
                role="tab"
                aria-selected={isCurrent}
                aria-label={`Jump to Beat ${idx + 1}: ${beat.shortName}`}
                className={`glance-progress-dot${isCurrent ? " is-current" : ""}${isDone ? " is-done" : ""}`}
                onClick={() => handleJumpToBeat(idx)}
              >
                {isDone ? <Check className="w-3 h-3 text-[var(--success)]" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
