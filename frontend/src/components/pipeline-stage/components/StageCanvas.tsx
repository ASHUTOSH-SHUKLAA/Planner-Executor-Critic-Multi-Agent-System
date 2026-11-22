"use client";

import { useMemo } from "react";
import { Check, X, Lock, RefreshCw, Cpu, GitBranch, ShieldCheck, FileText, AlertTriangle } from "lucide-react";
import type { PipelineState } from "../reducer";
import type { AgentRole } from "../pipelineSpec";
import { DAG_NODES, STATIONS, CONDUIT_PATHS } from "../layout";

interface StageCanvasProps {
  state: PipelineState;
  onSelectStation: (agent: AgentRole) => void;
  activeFocus: string | null;
}

export function StageCanvas({ state, onSelectStation, activeFocus }: StageCanvasProps) {
  const { plan, stepStates, activePacket, scratchpad, toolCalls, replanCount, maxReplans, synthesis, liveInvariants } = state;

  const stepsToRender = useMemo(() => {
    if (!plan) return [];
    return plan.steps;
  }, [plan]);

  const activeReview = state.criticReviews[0];
  const lastToolCall = toolCalls[0];
  const lastScratchpad = scratchpad[scratchpad.length - 1];

  const getStepStatus = (id: string) => {
    return stepStates[id]?.status || "pending";
  };

  const isStepLocked = (id: string) => {
    return Boolean(stepStates[id]?.isLocked);
  };

  return (
    <div className="pipeline-canvas-wrapper" role="region" aria-label="Interactive Live Pipeline Stage Canvas">
      <svg
        viewBox="0 0 1200 560"
        className="pipeline-svg-stage"
        role="img"
        aria-label="Multi-agent orchestration state machine diagram"
      >
        <defs>
          {/* Blueprint Dotted Grid */}
          <pattern id="stage-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="var(--border)" fillOpacity="0.45" />
          </pattern>

          {/* Marker Arrowheads */}
          <marker id="arrow-conduit" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--border-strong)" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--accent)" />
          </marker>
          <marker id="arrow-critic" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--critic)" />
          </marker>
          <marker id="arrow-success" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--success)" />
          </marker>

          {/* Gradients */}
          <linearGradient id="panel-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--surface)" stopOpacity="0.94" />
            <stop offset="100%" stopColor="var(--surface-hover)" stopOpacity="0.88" />
          </linearGradient>
          <linearGradient id="critic-pass-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--surface)" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="critic-reject-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--surface)" stopOpacity="0.9" />
          </linearGradient>
          <filter id="panel-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="var(--text)" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Background Canvas Grid */}
        <rect width="1200" height="560" rx="24" fill="var(--bg-elevated)" />
        <rect width="1200" height="560" rx="24" fill="url(#stage-grid)" />

        {/* ========================================================
            CONDUITS & CONNECTION TRAILS
        ======================================================== */}
        <g className="pipeline-conduits" aria-hidden="true">
          {/* Input -> Planner */}
          <path d={CONDUIT_PATHS.inputToPlanner} stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 4" />
          {/* Planner -> DAG S1 */}
          <path d={CONDUIT_PATHS.plannerToS1} stroke="var(--border-strong)" strokeWidth="2" markerEnd="url(#arrow-conduit)" />
          {/* S1 -> S2, S3, S4 */}
          <path d={CONDUIT_PATHS.s1ToS2} stroke="var(--border-strong)" strokeWidth="2" markerEnd="url(#arrow-conduit)" />
          <path d={CONDUIT_PATHS.s1ToS3} stroke="var(--border-strong)" strokeWidth="2" markerEnd="url(#arrow-conduit)" />
          <path d={CONDUIT_PATHS.s1ToS4} stroke="var(--border-strong)" strokeWidth="2" markerEnd="url(#arrow-conduit)" />
          {/* S2, S3, S4 -> Critic Gate */}
          <path d={CONDUIT_PATHS.s2ToCritic} stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="5 5" />
          <path d={CONDUIT_PATHS.s3ToCritic} stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="5 5" />
          <path d={CONDUIT_PATHS.s4ToCritic} stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="5 5" />
          {stepStates["S4b"] && (
            <path d={CONDUIT_PATHS.s4bToCritic} stroke="var(--critic)" strokeWidth="2" strokeDasharray="4 4" />
          )}
          {/* Critic PASS -> S5 */}
          <path d={CONDUIT_PATHS.criticToS5} stroke="var(--success)" strokeWidth="2" strokeDasharray="6 6" markerEnd="url(#arrow-success)" />
          {/* S5 -> Synthesizer */}
          <path d={CONDUIT_PATHS.s5ToSynthesizer} stroke="var(--planner)" strokeWidth="2" markerEnd="url(#arrow-active)" />
          {/* Critic REJECT -> Re-Planner */}
          <path d={CONDUIT_PATHS.criticToReplanner} stroke="var(--critic)" strokeWidth="2.5" strokeDasharray="6 6" markerEnd="url(#arrow-critic)" />
          {/* Re-Planner -> DAG Mutation Conduit */}
          <path d={CONDUIT_PATHS.replannerToDag} stroke="var(--critic)" strokeWidth="2" strokeDasharray="5 5" markerEnd="url(#arrow-critic)" />
        </g>

        {/* ========================================================
            STATION 0: INPUT CAPSULE
        ======================================================== */}
        <g
          className="stage-station station-input"
          transform={`translate(${STATIONS.inputCapsule.x}, ${STATIONS.inputCapsule.y})`}
        >
          <rect
            width={STATIONS.inputCapsule.width}
            height={STATIONS.inputCapsule.height}
            rx={STATIONS.inputCapsule.rx}
            fill="url(#panel-glass)"
            stroke="var(--border)"
            strokeWidth="1.5"
            filter="url(#panel-glow)"
          />
          <text x="14" y="21" fill="var(--text-faint)" fontSize="9" fontWeight="700" letterSpacing="0.08em">
            USER TASK INPUT
          </text>
          <text x="14" y="36" fill="var(--text)" fontSize="11" fontWeight="600" className="truncate">
            Smartphone Query <tspan fill="var(--text-muted)">· ₹50k</tspan>
          </text>
        </g>

        {/* ========================================================
            STATION 1: PLANNER AGENT
        ======================================================== */}
        <g
          className={`stage-station station-planner${activeFocus === "PLANNER" ? " is-focused" : ""}`}
          transform={`translate(${STATIONS.planner.x}, ${STATIONS.planner.y})`}
          onClick={() => onSelectStation("Planner Agent")}
          role="button"
          tabIndex={0}
          aria-label="Planner Agent Station"
        >
          <rect
            width={STATIONS.planner.width}
            height={STATIONS.planner.height}
            rx={STATIONS.planner.rx}
            fill="url(#panel-glass)"
            stroke="var(--border)"
            strokeWidth="1.5"
            filter="url(#panel-glow)"
          />
          <rect x="0" y="0" width={STATIONS.planner.width} height="4" rx="2" fill="var(--planner)" />

          {/* Header */}
          <g transform="translate(14, 16)">
            <rect width="28" height="28" rx="8" fill="color-mix(in srgb, var(--planner) 15%, transparent)" />
            <foreignObject x="4" y="4" width="20" height="20">
              <GitBranch className="w-5 h-5 text-[var(--planner)]" />
            </foreignObject>
            <text x="36" y="13" fill="var(--text)" fontSize="13" fontWeight="700">Planner Agent</text>
            <text x="36" y="25" fill="var(--planner)" fontSize="9" fontWeight="750" letterSpacing="0.08em">STAGE 01 · DAG</text>
          </g>

          {/* Planner Contract & Output summary */}
          <g transform="translate(14, 62)">
            <rect width="148" height="54" rx="8" fill="var(--bg)" stroke="var(--border)" />
            <text x="8" y="16" fill="var(--text-faint)" fontSize="9" fontWeight="700">DAG SPECIFICATION</text>
            <text x="8" y="32" fill="var(--text)" fontSize="11" fontWeight="600">3–7 discrete PlanSteps</text>
            <text x="8" y="46" fill="var(--success)" fontSize="9" fontWeight="700">Topological Sort ✓</text>
          </g>

          {/* Invariant status pill */}
          <g transform="translate(14, 128)">
            <rect width="148" height="28" rx="6" fill="color-mix(in srgb, var(--planner) 10%, var(--surface))" stroke="color-mix(in srgb, var(--planner) 30%, transparent)" />
            <text x="10" y="18" fill="var(--planner)" fontSize="10" fontWeight="650">
              {liveInvariants.dag_acyclic?.status === "verified" ? "Zero cyclic loops ✓" : "Decomposing task..."}
            </text>
          </g>

          {/* Status Indicator Dot */}
          <circle cx="160" cy="22" r="4" fill={state.activeAgent === "Planner Agent" ? "var(--planner)" : "var(--border-strong)"} />
        </g>

        {/* ========================================================
            STATION 2: EXECUTION ZONE & DAG CANVAS
        ======================================================== */}
        <g
          className={`stage-station station-dag${activeFocus === "DAG" ? " is-focused" : ""}`}
          transform={`translate(${STATIONS.dagArea.x}, ${STATIONS.dagArea.y})`}
          onClick={() => onSelectStation("Executor Agent")}
          role="button"
          tabIndex={0}
          aria-label="Executor DAG Execution Zone"
        >
          {/* DAG Container Panel */}
          <rect
            width={STATIONS.dagArea.width}
            height={STATIONS.dagArea.height}
            rx={STATIONS.dagArea.rx}
            fill="url(#panel-glass)"
            stroke="var(--border)"
            strokeWidth="1.5"
            filter="url(#panel-glow)"
          />
          <rect x="0" y="0" width={STATIONS.dagArea.width} height="4" rx="2" fill="var(--executor)" />

          {/* DAG Header */}
          <g transform="translate(16, 14)">
            <foreignObject x="0" y="0" width="18" height="18">
              <Cpu className="w-4 h-4 text-[var(--executor)]" />
            </foreignObject>
            <text x="24" y="13" fill="var(--text)" fontSize="12" fontWeight="700">
              Execution Zone · Sandboxed Parallel Executors
            </text>
            <text x="420" y="13" fill="var(--executor)" fontSize="9" fontWeight="750" letterSpacing="0.08em">
              STAGE 02 · CONCURRENT
            </text>
          </g>

          {/* DAG Step Nodes */}
          {stepsToRender.map((step) => {
            const pos = DAG_NODES[step.id];
            if (!pos) return null;

            // Offset inside dagArea
            const nx = pos.x - STATIONS.dagArea.x;
            const ny = pos.y - STATIONS.dagArea.y;
            const status = getStepStatus(step.id);
            const locked = isStepLocked(step.id);

            let nodeFill = "var(--surface)";
            let nodeStroke = "var(--border)";
            let statusBadge = "pending";

            if (locked) {
              nodeStroke = "var(--planner)";
              nodeFill = "color-mix(in srgb, var(--planner) 12%, var(--surface))";
              statusBadge = "locked";
            } else if (status === "passed") {
              nodeStroke = "var(--success)";
              nodeFill = "color-mix(in srgb, var(--success) 10%, var(--surface))";
              statusBadge = "passed";
            } else if (status === "rejected" || status === "exhausted") {
              nodeStroke = "var(--danger)";
              nodeFill = "color-mix(in srgb, var(--danger) 10%, var(--surface))";
              statusBadge = "rejected";
            } else if (status === "running") {
              nodeStroke = "var(--executor)";
              nodeFill = "color-mix(in srgb, var(--executor) 12%, var(--surface))";
              statusBadge = "running";
            } else if (status === "reviewing") {
              nodeStroke = "var(--critic)";
              nodeFill = "color-mix(in srgb, var(--critic) 12%, var(--surface))";
              statusBadge = "reviewing";
            }

            return (
              <g
                key={step.id}
                className={`pipeline-dag-node node-${status}${locked ? " is-locked" : ""}`}
                transform={`translate(${nx - pos.width / 2}, ${ny - pos.height / 2})`}
              >
                <rect
                  width={pos.width}
                  height={pos.height}
                  rx="10"
                  fill={nodeFill}
                  stroke={nodeStroke}
                  strokeWidth={status === "running" || locked ? "2" : "1.5"}
                />

                {/* Step ID Pill */}
                <rect x="6" y="6" width="24" height="16" rx="4" fill="var(--bg)" stroke="var(--border)" />
                <text x="18" y="18" textAnchor="middle" fill="var(--text)" fontSize="9" fontWeight="800">
                  {step.id}
                </text>

                {/* Step Title */}
                <text x="34" y="18" fill="var(--text)" fontSize="10" fontWeight="700">
                  {step.shortTitle.slice(0, 12)}
                </text>

                {/* Status Indicator Icon / Text */}
                <g transform="translate(6, 26)">
                  {statusBadge === "passed" && (
                    <g transform="translate(0, 0)">
                      <rect width="92" height="12" rx="3" fill="color-mix(in srgb, var(--success) 20%, transparent)" />
                      <text x="46" y="9" textAnchor="middle" fill="var(--success)" fontSize="8" fontWeight="800">
                        PASS ✓
                      </text>
                    </g>
                  )}
                  {statusBadge === "rejected" && (
                    <g transform="translate(0, 0)">
                      <rect width="92" height="12" rx="3" fill="color-mix(in srgb, var(--danger) 20%, transparent)" />
                      <text x="46" y="9" textAnchor="middle" fill="var(--danger)" fontSize="8" fontWeight="800">
                        REJECT ✕
                      </text>
                    </g>
                  )}
                  {statusBadge === "locked" && (
                    <g transform="translate(0, 0)">
                      <rect width="92" height="12" rx="3" fill="color-mix(in srgb, var(--planner) 20%, transparent)" />
                      <text x="46" y="9" textAnchor="middle" fill="var(--planner)" fontSize="8" fontWeight="800">
                        LOCKED 🔒
                      </text>
                    </g>
                  )}
                  {statusBadge === "running" && (
                    <g transform="translate(0, 0)">
                      <rect width="92" height="12" rx="3" fill="color-mix(in srgb, var(--executor) 20%, transparent)" />
                      <text x="46" y="9" textAnchor="middle" fill="var(--executor)" fontSize="8" fontWeight="800">
                        RUNNING ◌
                      </text>
                    </g>
                  )}
                  {statusBadge === "reviewing" && (
                    <g transform="translate(0, 0)">
                      <rect width="92" height="12" rx="3" fill="color-mix(in srgb, var(--critic) 20%, transparent)" />
                      <text x="46" y="9" textAnchor="middle" fill="var(--critic)" fontSize="8" fontWeight="800">
                        REVIEWING ✦
                      </text>
                    </g>
                  )}
                  {statusBadge === "pending" && (
                    <g transform="translate(0, 0)">
                      <rect width="92" height="12" rx="3" fill="color-mix(in srgb, var(--text-faint) 12%, transparent)" />
                      <text x="46" y="9" textAnchor="middle" fill="var(--text-faint)" fontSize="8" fontWeight="700">
                        PENDING
                      </text>
                    </g>
                  )}
                </g>
              </g>
            );
          })}
        </g>

        {/* ========================================================
            SHARED SCRATCHPAD BAR (under DAG)
        ======================================================== */}
        <g
          className="stage-station station-scratchpad"
          transform={`translate(${STATIONS.scratchpad.x}, ${STATIONS.scratchpad.y})`}
        >
          <rect
            width={STATIONS.scratchpad.width}
            height={STATIONS.scratchpad.height}
            rx={STATIONS.scratchpad.rx}
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth="1"
          />
          <text x="12" y="24" fill="var(--text-faint)" fontSize="9" fontWeight="800" letterSpacing="0.08em">
            SHARED SCRATCHPAD
          </text>
          <g transform="translate(130, 8)">
            {lastScratchpad ? (
              <rect width="390" height="24" rx="6" fill="color-mix(in srgb, var(--executor) 10%, var(--surface))" stroke="color-mix(in srgb, var(--executor) 25%, transparent)" />
            ) : (
              <rect width="390" height="24" rx="6" fill="var(--bg)" stroke="var(--border)" strokeDasharray="3 3" />
            )}
            <text x="12" y="16" fill="var(--text)" fontSize="10" fontWeight="600" className="truncate">
              {lastScratchpad
                ? `[${lastScratchpad.stepId}] ${lastScratchpad.findings[0]?.slice(0, 56)}...`
                : "Awaiting executor findings..."}
            </text>
          </g>
        </g>

        {/* ========================================================
            TOOLS TRAY (under Scratchpad)
        ======================================================== */}
        <g
          className="stage-station station-tools"
          transform={`translate(${STATIONS.toolsTray.x}, ${STATIONS.toolsTray.y})`}
        >
          <rect
            width={STATIONS.toolsTray.width}
            height={STATIONS.toolsTray.height}
            rx={STATIONS.toolsTray.rx}
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth="1"
          />
          <text x="12" y="24" fill="var(--text-faint)" fontSize="9" fontWeight="800" letterSpacing="0.08em">
            SANDBOXED TOOLS
          </text>
          <g transform="translate(130, 8)">
            {lastToolCall ? (
              <g>
                <rect
                  width="390"
                  height="24"
                  rx="6"
                  fill={lastToolCall.status === "failed" ? "color-mix(in srgb, var(--danger) 12%, var(--surface))" : "color-mix(in srgb, var(--executor) 8%, var(--surface))"}
                  stroke={lastToolCall.status === "failed" ? "var(--danger)" : "color-mix(in srgb, var(--executor) 25%, transparent)"}
                />
                <text x="12" y="16" fill={lastToolCall.status === "failed" ? "var(--danger)" : "var(--text)"} fontSize="10" fontWeight="650">
                  {lastToolCall.status === "failed" ? "✕ TOOL FAILURE: " : "✓ Tool: "}
                  {lastToolCall.toolName} ({lastToolCall.domain}) · {lastToolCall.queryOrUrl.slice(0, 36)}...
                </text>
              </g>
            ) : (
              <rect width="390" height="24" rx="6" fill="var(--bg)" stroke="var(--border)" strokeDasharray="3 3" />
            )}
          </g>
        </g>

        {/* ========================================================
            STATION 3: CRITIC GATE
        ======================================================== */}
        <g
          className={`stage-station station-critic${activeFocus === "CRITIC" ? " is-focused" : ""}`}
          transform={`translate(${STATIONS.criticGate.x}, ${STATIONS.criticGate.y})`}
          onClick={() => onSelectStation("Critic Agent")}
          role="button"
          tabIndex={0}
          aria-label="Critic Agent Quality Gate"
        >
          <rect
            width={STATIONS.criticGate.width}
            height={STATIONS.criticGate.height}
            rx={STATIONS.criticGate.rx}
            fill="url(#panel-glass)"
            stroke="var(--border)"
            strokeWidth="1.5"
            filter="url(#panel-glow)"
          />
          <rect x="0" y="0" width={STATIONS.criticGate.width} height="4" rx="2" fill="var(--critic)" />

          {/* Critic Header */}
          <g transform="translate(14, 16)">
            <rect width="28" height="28" rx="8" fill="color-mix(in srgb, var(--critic) 15%, transparent)" />
            <foreignObject x="4" y="4" width="20" height="20">
              <ShieldCheck className="w-5 h-5 text-[var(--critic)]" />
            </foreignObject>
            <text x="36" y="13" fill="var(--text)" fontSize="13" fontWeight="700">Critic Agent</text>
            <text x="36" y="25" fill="var(--critic)" fontSize="9" fontWeight="750" letterSpacing="0.08em">STAGE 03 · QUALITY GATE</text>
          </g>

          {/* Score Bars */}
          <g transform="translate(14, 58)">
            <text x="0" y="10" fill="var(--text-faint)" fontSize="9" fontWeight="700">CORRECTNESS</text>
            <rect x="0" y="14" width="140" height="6" rx="3" fill="var(--bg)" />
            <rect x="0" y="14" width={140 * (activeReview?.scores.correctness || 0.85)} height="6" rx="3" fill="var(--critic)" />

            <text x="0" y="32" fill="var(--text-faint)" fontSize="9" fontWeight="700">COMPOSITE GATE (&gt;= 0.70)</text>
            <rect x="0" y="36" width="140" height="6" rx="3" fill="var(--bg)" />
            <rect x="0" y="36" width={140 * (activeReview?.scores.composite || 0.8)} height="6" rx="3" fill={activeReview?.decision === "REJECT" ? "var(--danger)" : "var(--success)"} />
          </g>

          {/* Decision Stamp */}
          <g transform="translate(14, 122)">
            {activeReview ? (
              <g>
                <rect
                  width="140"
                  height="40"
                  rx="8"
                  fill={activeReview.decision === "PASS" ? "url(#critic-pass-grad)" : "url(#critic-reject-grad)"}
                  stroke={activeReview.decision === "PASS" ? "var(--success)" : "var(--danger)"}
                  strokeWidth="1.5"
                />
                <text
                  x="70"
                  y="25"
                  textAnchor="middle"
                  fill={activeReview.decision === "PASS" ? "var(--success)" : "var(--danger)"}
                  fontSize="14"
                  fontWeight="850"
                  letterSpacing="0.05em"
                >
                  {activeReview.decision === "PASS" ? "PASS ✓" : "REJECT ✕"}
                </text>
              </g>
            ) : (
              <rect width="140" height="40" rx="8" fill="var(--bg)" stroke="var(--border)" strokeDasharray="3 3" />
            )}
          </g>

          {/* Invariant badge */}
          <g transform="translate(14, 174)">
            <rect width="140" height="56" rx="6" fill="var(--bg)" stroke="var(--border)" />
            <text x="8" y="16" fill="var(--text-faint)" fontSize="8" fontWeight="700">CRITIQUE FEEDBACK</text>
            <text x="8" y="30" fill="var(--text)" fontSize="9.5" fontWeight="600">
              {activeReview ? activeReview.critiqueReason.slice(0, 24) + "..." : "Awaiting step output..."}
            </text>
            <text x="8" y="44" fill={activeReview?.scores.hallucination && activeReview.scores.hallucination > 0 ? "var(--danger)" : "var(--success)"} fontSize="8.5" fontWeight="750">
              Hallucination = {activeReview?.scores.hallucination || 0.0} ✓
            </text>
          </g>
        </g>

        {/* ========================================================
            STATION 4: DYNAMIC RE-PLANNER (RECOVERY LANE)
        ======================================================== */}
        <g
          className={`stage-station station-replanner${activeFocus === "REPLANNER" ? " is-focused" : ""}`}
          transform={`translate(${STATIONS.replannerLane.x}, ${STATIONS.replannerLane.y})`}
          onClick={() => onSelectStation("Dynamic Re-Planner")}
          role="button"
          tabIndex={0}
          aria-label="Dynamic Re-Planner Station"
        >
          <rect
            width={STATIONS.replannerLane.width}
            height={STATIONS.replannerLane.height}
            rx={STATIONS.replannerLane.rx}
            fill="url(#panel-glass)"
            stroke={replanCount > 0 ? "var(--critic)" : "var(--border)"}
            strokeWidth={replanCount > 0 ? "2" : "1.5"}
            filter="url(#panel-glow)"
          />
          <rect x="0" y="0" width={STATIONS.replannerLane.width} height="4" rx="2" fill="var(--critic)" />

          <g transform="translate(16, 16)">
            <rect width="28" height="28" rx="8" fill="color-mix(in srgb, var(--critic) 18%, var(--planner))" />
            <foreignObject x="4" y="4" width="20" height="20">
              <RefreshCw className="w-5 h-5 text-[var(--critic)]" />
            </foreignObject>
            <text x="36" y="13" fill="var(--text)" fontSize="13" fontWeight="700">Dynamic Re-Planner</text>
            <text x="36" y="25" fill="var(--critic)" fontSize="9" fontWeight="750" letterSpacing="0.08em">STAGE 04 · RECOVERY LANE</text>
          </g>

          {/* Re-Plan Meter */}
          <g transform="translate(320, 16)">
            <text x="0" y="10" fill="var(--text-faint)" fontSize="9" fontWeight="750">RE-PLAN BUDGET</text>
            <g transform="translate(0, 16)">
              {Array.from({ length: maxReplans }).map((_, idx) => (
                <rect
                  key={idx}
                  x={idx * 20}
                  y="0"
                  width="14"
                  height="14"
                  rx="4"
                  fill={idx < replanCount ? "var(--critic)" : "var(--bg)"}
                  stroke={idx < replanCount ? "var(--critic)" : "var(--border)"}
                />
              ))}
              <text x="48" y="11" fill="var(--text)" fontSize="10" fontWeight="700">
                {replanCount} / {maxReplans} events
              </text>
            </g>
          </g>

          {/* Mutated Plan Status */}
          <g transform="translate(16, 56)">
            <rect width="480" height="34" rx="8" fill="var(--bg)" stroke="var(--border)" />
            <text x="12" y="21" fill="var(--text)" fontSize="10.5" fontWeight="600">
              {replanCount > 0
                ? "Mutated in-flight DAG: Injected fallback S4b · Locked PASSED steps S1–S3"
                : "Active observer · Intercepts exhausted steps (bounded retries <= 2)"}
            </text>
          </g>
        </g>

        {/* ========================================================
            STATION 5: SYNTHESIZER AGENT
        ======================================================== */}
        <g
          className={`stage-station station-synthesizer${activeFocus === "SYNTHESIZER" ? " is-focused" : ""}`}
          transform={`translate(${STATIONS.synthesizer.x}, ${STATIONS.synthesizer.y})`}
          onClick={() => onSelectStation("Synthesizer Agent")}
          role="button"
          tabIndex={0}
          aria-label="Synthesizer Agent Station"
        >
          <rect
            width={STATIONS.synthesizer.width}
            height={STATIONS.synthesizer.height}
            rx={STATIONS.synthesizer.rx}
            fill="url(#panel-glass)"
            stroke="var(--border)"
            strokeWidth="1.5"
            filter="url(#panel-glow)"
          />
          <rect x="0" y="0" width={STATIONS.synthesizer.width} height="4" rx="2" fill="var(--accent)" />

          {/* Synthesizer Header */}
          <g transform="translate(14, 16)">
            <rect width="28" height="28" rx="8" fill="color-mix(in srgb, var(--accent) 15%, transparent)" />
            <foreignObject x="4" y="4" width="20" height="20">
              <FileText className="w-5 h-5 text-[var(--accent)]" />
            </foreignObject>
            <text x="36" y="13" fill="var(--text)" fontSize="13" fontWeight="700">Synthesizer Agent</text>
            <text x="36" y="25" fill="var(--accent)" fontSize="9" fontWeight="750" letterSpacing="0.08em">STAGE 05 · REPORT</text>
          </g>

          {/* Master Comparison Matrix Mini-View */}
          <g transform="translate(14, 60)">
            <text x="0" y="10" fill="var(--text-faint)" fontSize="9" fontWeight="800">MASTER COMPARISON MATRIX</text>
            <g transform="translate(0, 16)">
              {synthesis.matrixRows.length > 0 ? (
                synthesis.matrixRows.map((row, idx) => (
                  <g key={idx} transform={`translate(0, ${idx * 30})`}>
                    <rect width="164" height="24" rx="6" fill="var(--bg)" stroke="var(--border)" />
                    <text x="8" y="16" fill="var(--text)" fontSize="9" fontWeight="700">
                      {row.spec.slice(0, 20)}
                    </text>
                  </g>
                ))
              ) : (
                <rect width="164" height="64" rx="6" fill="var(--bg)" stroke="var(--border)" strokeDasharray="3 3" />
              )}
            </g>
          </g>

          {/* Citations counter */}
          <g transform="translate(14, 210)">
            <rect width="164" height="42" rx="8" fill="color-mix(in srgb, var(--accent) 8%, var(--surface))" stroke="color-mix(in srgb, var(--accent) 25%, transparent)" />
            <text x="10" y="18" fill="var(--accent)" fontSize="10" fontWeight="750">
              {synthesis.isCompleted ? "Report Finalized ✓" : "Synthesizing Deliverable"}
            </text>
            <text x="10" y="32" fill="var(--text-muted)" fontSize="9">
              {synthesis.citations.length} primary citations verified
            </text>
          </g>
        </g>

        {/* ========================================================
            IN-FLIGHT PACKET CAPSULES
        ======================================================== */}
        {activePacket && (
          <g className="pipeline-packet-capsule" aria-label={`Packet: ${activePacket.label}`}>
            <rect
              x="570"
              y="12"
              width="180"
              height="28"
              rx="14"
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="1.5"
              filter="url(#panel-glow)"
            />
            <circle cx="584" cy="26" r="4" fill="var(--accent)" />
            <text x="596" y="29" fill="var(--text)" fontSize="9.5" fontWeight="750" letterSpacing="0.04em">
              {activePacket.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
