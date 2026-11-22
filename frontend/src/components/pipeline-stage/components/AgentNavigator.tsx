"use client";

import { GitBranch, Cpu, ShieldCheck, RefreshCw, FileText } from "lucide-react";
import type { PipelineState } from "../reducer";
import { AGENT_CONTRACTS, type AgentRole } from "../pipelineSpec";

interface AgentNavigatorProps {
  state: PipelineState;
  activeAgent: AgentRole;
  onSelectAgent: (agent: AgentRole) => void;
}

export function AgentNavigator({ state, activeAgent, onSelectAgent }: AgentNavigatorProps) {
  const agentRoles: AgentRole[] = [
    "Planner Agent",
    "Executor Agent",
    "Critic Agent",
    "Dynamic Re-Planner",
    "Synthesizer Agent",
  ];

  const getAgentStatus = (role: AgentRole): { status: "idle" | "working" | "done"; countText: string } => {
    switch (role) {
      case "Planner Agent": {
        const isWorking = state.activeAgent === "Planner Agent";
        const isDone = Boolean(state.plan);
        return {
          status: isWorking ? "working" : isDone ? "done" : "idle",
          countText: isDone ? `${state.plan?.steps.length || 5} steps` : "Idle",
        };
      }
      case "Executor Agent": {
        const running = Object.values(state.stepStates).filter((s) => s.status === "running").length;
        const passed = Object.values(state.stepStates).filter((s) => s.status === "passed").length;
        return {
          status: running > 0 ? "working" : passed > 0 ? "done" : "idle",
          countText: running > 0 ? `${running} running` : passed > 0 ? `${passed} passed` : "Idle",
        };
      }
      case "Critic Agent": {
        const reviews = state.criticReviews.length;
        const rejected = state.criticReviews.filter((r) => r.decision === "REJECT").length;
        return {
          status: state.activeAgent === "Critic Agent" ? "working" : reviews > 0 ? "done" : "idle",
          countText: reviews > 0 ? `${reviews} reviews${rejected > 0 ? ` (${rejected} rej)` : ""}` : "Idle",
        };
      }
      case "Dynamic Re-Planner": {
        return {
          status: state.activeAgent === "Dynamic Re-Planner" ? "working" : state.replanCount > 0 ? "done" : "idle",
          countText: state.replanCount > 0 ? `${state.replanCount}/2 re-plans` : "0 re-plans",
        };
      }
      case "Synthesizer Agent": {
        return {
          status: state.activeAgent === "Synthesizer Agent" ? "working" : state.synthesis.isCompleted ? "done" : "idle",
          countText: state.synthesis.isCompleted ? "Completed ✓" : `${state.synthesis.citations.length} sources`,
        };
      }
    }
  };

  const icons: Record<AgentRole, typeof GitBranch> = {
    "Planner Agent": GitBranch,
    "Executor Agent": Cpu,
    "Critic Agent": ShieldCheck,
    "Dynamic Re-Planner": RefreshCw,
    "Synthesizer Agent": FileText,
  };

  return (
    <nav className="pipeline-navigator" aria-label="Pipeline agent navigator and legend">
      <div className="pipeline-navigator-grid">
        {agentRoles.map((role) => {
          const contract = AGENT_CONTRACTS[role];
          const { status, countText } = getAgentStatus(role);
          const isSelected = activeAgent === role;
          const Icon = icons[role];

          return (
            <button
              key={role}
              type="button"
              className={`navigator-card tone-${contract.colorToken}${isSelected ? " is-active" : ""}`}
              onClick={() => onSelectAgent(role)}
              aria-pressed={isSelected}
              aria-label={`${contract.role}, status: ${status}, ${countText}`}
            >
              <div className="navigator-card-top">
                <span className="navigator-number">{contract.number}</span>
                <span className={`navigator-led status-${status}`} aria-hidden="true" />
              </div>

              <div className="navigator-card-icon">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>

              <div className="navigator-card-body">
                <h4 className="navigator-name">{contract.role}</h4>
                <p className="navigator-role-tag">{contract.shortName} Stage</p>
                <div className="navigator-count-pill">
                  <span>{countText}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
