"use client";

import { useState } from "react";
import { Check, ShieldAlert, Sparkles, Terminal, FileCode2, BookOpen, Layers } from "lucide-react";
import type { PipelineState } from "../reducer";
import { AGENT_CONTRACTS, type AgentRole } from "../pipelineSpec";

interface InspectorPanelProps {
  state: PipelineState;
  activeAgent: AgentRole;
  onSelectAgent: (agent: AgentRole) => void;
}

export function InspectorPanel({ state, activeAgent, onSelectAgent }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<"contract" | "artifact" | "log">("contract");
  const [synthesizerView, setSynthesizerView] = useState<"internal" | "user">("user");
  const [isLogHovered, setIsLogHovered] = useState(false);

  const contract = AGENT_CONTRACTS[activeAgent] || AGENT_CONTRACTS["Planner Agent"];
  const currentPacket = state.activePacket;

  const currentPayloadObj = currentPacket ? currentPacket.data : state.plan || { status: "Awaiting task..." };

  return (
    <div className="pipeline-inspector" role="region" aria-label="Behind the scenes agent inspector">
      {/* Inspector Section Header */}
      <div className="pipeline-inspector-header">
        <div className="pipeline-inspector-title">
          <Layers className="w-4 h-4 text-[var(--accent)]" aria-hidden="true" />
          <span>Behind the Scenes: <strong>{contract.role}</strong></span>
        </div>

        {/* Responsive Tabs on tablet/mobile */}
        <div className="pipeline-inspector-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "contract"}
            className={`inspector-tab-btn${activeTab === "contract" ? " is-active" : ""}`}
            onClick={() => setActiveTab("contract")}
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>PRD Contract</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "artifact"}
            className={`inspector-tab-btn${activeTab === "artifact" ? " is-active" : ""}`}
            onClick={() => setActiveTab("artifact")}
          >
            <FileCode2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Live Artifact</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "log"}
            className={`inspector-tab-btn${activeTab === "log" ? " is-active" : ""}`}
            onClick={() => setActiveTab("log")}
          >
            <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Event Log</span>
          </button>
        </div>
      </div>

      {/* 3-Column Panels (or single tab on small screens) */}
      <div className="pipeline-inspector-grid">
        {/* PANEL 1: PRD CONTRACT & LIVE INVARIANTS */}
        <section
          className={`inspector-panel panel-contract${activeTab === "contract" ? " tab-visible" : ""}`}
          aria-labelledby="heading-contract"
        >
          <div className="panel-inner-head">
            <h3 id="heading-contract">Immutable Contract</h3>
            <span className={`agent-role-pill tone-${contract.colorToken}`}>{contract.number} · {contract.shortName}</span>
          </div>

          <div className="contract-specs">
            <div className="spec-row">
              <span className="spec-label">Input Contract</span>
              <p className="spec-value">{contract.inputContract}</p>
            </div>
            <div className="spec-row">
              <span className="spec-label">Output Artifact</span>
              <p className="spec-value">{contract.primaryOutputArtifact}</p>
            </div>
          </div>

          <div className="invariants-group">
            <span className="spec-label">Live Invariant Verification</span>
            <div className="invariants-list">
              {contract.invariants.map((inv) => {
                const liveStatus = state.liveInvariants[inv.id];
                const isFiring = liveStatus?.status === "firing";
                const isVerified = liveStatus?.status === "verified";
                const isViolated = liveStatus?.status === "violated";

                return (
                  <div
                    key={inv.id}
                    className={`invariant-badge-card${isFiring ? " is-firing" : ""}${isVerified ? " is-verified" : ""}${isViolated ? " is-violated" : ""}`}
                  >
                    <div className="invariant-badge-top">
                      <span className="invariant-badge-title">
                        {isVerified && <Check className="w-3.5 h-3.5 text-[var(--success)]" aria-hidden="true" />}
                        {isFiring && <ShieldAlert className="w-3.5 h-3.5 text-[var(--danger)] animate-bounce" aria-hidden="true" />}
                        {inv.badge}
                      </span>
                      <span className="invariant-status-text">
                        {isVerified ? "PASS" : isFiring ? "TRIGGERED" : isViolated ? "FAULT" : "IDLE"}
                      </span>
                    </div>
                    <p className="invariant-desc">{inv.description}</p>
                    {liveStatus?.explanation && (
                      <p className="invariant-explanation">{liveStatus.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PANEL 2: LIVE ARTIFACT (TYPED JSON WITH SYNTAX HIGHLIGHTING) */}
        <section
          className={`inspector-panel panel-artifact${activeTab === "artifact" ? " tab-visible" : ""}`}
          aria-labelledby="heading-artifact"
        >
          <div className="panel-inner-head">
            <h3 id="heading-artifact">Live In-Flight Artifact</h3>
            {currentPacket ? (
              <span className="packet-type-pill">{currentPacket.type}</span>
            ) : (
              <span className="packet-type-pill">IDLE</span>
            )}
          </div>

          {activeAgent === "Synthesizer Agent" && (
            <div className="synthesizer-view-toggle">
              <button
                type="button"
                className={`toggle-option${synthesizerView === "internal" ? " is-active" : ""}`}
                onClick={() => setSynthesizerView("internal")}
              >
                Internal Chatter
              </button>
              <button
                type="button"
                className={`toggle-option${synthesizerView === "user" ? " is-active" : ""}`}
                onClick={() => setSynthesizerView("user")}
              >
                User View (No Syntax)
              </button>
            </div>
          )}

          {activeAgent === "Synthesizer Agent" && synthesizerView === "user" ? (
            <div className="user-synthesis-report">
              <div className="user-report-title">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <h4>Best Flagship Smartphones Under ₹50,000</h4>
              </div>
              <p className="user-report-summary">
                {state.synthesis.reportSummary || "Consolidating approved step findings into an authoritative report..."}
              </p>
              {state.synthesis.matrixRows.length > 0 && (
                <div className="user-report-matrix">
                  <table className="user-matrix-table">
                    <thead>
                      <tr>
                        <th>Specification</th>
                        <th>Pixel 8a</th>
                        <th>Vivo V40 Pro</th>
                        <th>Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.synthesis.matrixRows.map((row, i) => (
                        <tr key={i}>
                          <td>{row.spec}</td>
                          <td>{row.contenderA}</td>
                          <td>{row.contenderB}</td>
                          <td className="matrix-verdict">{row.verdict}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="code-viewer-container">
              <pre className="syntax-code-block">
                <code>{JSON.stringify(currentPayloadObj, null, 2)}</code>
              </pre>
            </div>
          )}
        </section>

        {/* PANEL 3: STRUCTURED EVENT LOG (HUMAN READABLE) */}
        <section
          className={`inspector-panel panel-log${activeTab === "log" ? " tab-visible" : ""}`}
          aria-labelledby="heading-log"
          onMouseEnter={() => setIsLogHovered(true)}
          onMouseLeave={() => setIsLogHovered(false)}
        >
          <div className="panel-inner-head">
            <h3 id="heading-log">Structured Event Stream</h3>
            <span className="log-count-pill">{state.eventLog.length} events {isLogHovered && "· Paused"}</span>
          </div>

          <div className="event-stream-container" role="feed" aria-busy={!isLogHovered}>
            {state.eventLog.length === 0 ? (
              <p className="event-empty-msg">Waiting for pipeline events...</p>
            ) : (
              state.eventLog.map((ev) => (
                <article key={ev.id} className="event-stream-card">
                  <div className="event-card-header">
                    <span className="event-timestamp">+{(ev.timestamp / 1000).toFixed(1)}s</span>
                    <span className="event-agent-tag">{ev.agent.replace(" Agent", "")}</span>
                    <span className="event-type-name">{ev.type}</span>
                  </div>
                  <strong className="event-summary">{ev.summary}</strong>
                  <p className="event-details">{ev.details}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
