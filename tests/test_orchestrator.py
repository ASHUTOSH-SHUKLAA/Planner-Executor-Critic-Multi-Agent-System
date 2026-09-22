"""
Unit and Integration Tests for the Orchestration Engine.
Verifies state machine transitions, dependency-ordered handoffs,
and end-to-end execution.
"""

import os
import pytest
from unittest.mock import MagicMock
from src.orchestrator.engine import OrchestrationEngine
from src.models.schemas import (
    Plan,
    PlanStep,
    StepOutput,
    StepStatus,
    CriticReview,
    CriticDecision,
    WorkflowState,
    WorkflowStatus,
)
from src.agents.planner import PlannerAgent
from src.agents.executor import ExecutorAgent
from src.agents.critic import CriticAgent
from src.llm.client import LLMResponse


def test_empty_or_whitespace_task_rejected():
    """US-001: Invalid or empty input is rejected gracefully."""
    engine = OrchestrationEngine(verbose=False)
    with pytest.raises(ValueError) as exc:
        engine.run("")
    assert "cannot be empty" in str(exc.value)

    with pytest.raises(ValueError):
        engine.run("   \n\t  ")


def test_orchestration_state_transitions_mocked():
    """
    Verify complete state transition lifecycle:
    TASK_RECEIVED -> PLANNING -> PLAN_READY -> EXECUTING -> CRITIC_REVIEW -> COMPLETED
    """
    mock_planner = MagicMock(spec=PlannerAgent)
    mock_executor = MagicMock(spec=ExecutorAgent)
    mock_critic = MagicMock(spec=CriticAgent)

    step1 = PlanStep(step_id="step_1", title="Step 1", description="Do Step 1", dependencies=[])
    step2 = PlanStep(step_id="step_2", title="Step 2", description="Do Step 2", dependencies=["step_1"])
    plan = Plan(task="Mock Workflow", rationale="Sequential test", steps=[step1, step2])

    def mock_plan_workflow(state: WorkflowState):
        state.plan = plan
        state.status = WorkflowStatus.PLAN_READY
        return state

    mock_planner.plan_workflow.side_effect = mock_plan_workflow

    # Mock Executor behavior
    def mock_execute_step(step_id, state):
        state.step_outputs[step_id] = StepOutput(
            step_id=step_id,
            content=f"Output for {step_id}",
            key_findings=[f"Key finding {step_id}"],
        )
        return state

    mock_executor.execute_workflow_step.side_effect = mock_execute_step
    mock_executor.build_dependency_context.return_value = "Mock context"

    # Mock Critic behavior (PASS on all steps)
    def mock_evaluate_step(step_id, state, dependency_context=None):
        if step_id not in state.critic_reviews:
            state.critic_reviews[step_id] = []
        state.critic_reviews[step_id].append(
            CriticReview(
                step_id=step_id,
                decision=CriticDecision.PASS,
                correctness_score=0.9,
                completeness_score=0.9,
                relevance_score=0.9,
                critique="Great output.",
            )
        )
        target = next(s for s in state.plan.steps if s.step_id == step_id)
        target.status = StepStatus.PASSED
        return state

    mock_critic.evaluate_workflow_step.side_effect = mock_evaluate_step

    mock_synthesizer = MagicMock()
    mock_synthesizer.synthesize_workflow.side_effect = lambda s: setattr(s, "final_result", "Synthesized report") or s

    engine = OrchestrationEngine(
        planner=mock_planner,
        executor=mock_executor,
        critic=mock_critic,
        synthesizer=mock_synthesizer,
        verbose=False,
    )

    final_state = engine.run("Mock Workflow Task")

    assert final_state.status == WorkflowStatus.COMPLETED
    assert final_state.workflow_id.startswith("wf_")
    assert len(final_state.step_outputs) == 2
    assert "step_1" in final_state.step_outputs
    assert "step_2" in final_state.step_outputs
    assert final_state.plan.steps[0].status == StepStatus.PASSED
    assert final_state.plan.steps[1].status == StepStatus.PASSED


@pytest.mark.skipif(
    not os.getenv("GROQ_API_KEY"),
    reason="Live Groq API test requires GROQ_API_KEY",
)
def test_live_end_to_end_sequential_workflow():
    """Live integration test: execute full end-to-end workflow on Groq."""
    engine = OrchestrationEngine(verbose=True)
    task = "Explain two key differences between synchronous and asynchronous programming in Python."

    state = engine.run(task)

    assert state.status == WorkflowStatus.COMPLETED
    assert state.plan is not None
    assert len(state.plan.steps) >= 2
    assert len(state.step_outputs) == len(state.plan.steps)
    assert state.total_tokens > 0
    assert state.estimated_cost_usd > 0.0
