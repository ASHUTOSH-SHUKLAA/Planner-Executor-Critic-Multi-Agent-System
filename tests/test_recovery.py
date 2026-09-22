"""
Unit and Integration Tests for Failure Recovery and Dynamic Re-planning (Module 7).
Fulfills PRD US-005 Acceptance Criteria:
- Bounded retries on Critic rejection.
- Dynamic re-planning triggered on repeated failures.
- Failure context provided to Re-planner.
- Prevention of infinite retry loops.
"""

import os
import pytest
from unittest.mock import MagicMock
from src.orchestrator.engine import OrchestrationEngine
from src.agents.planner import PlannerAgent
from src.agents.executor import ExecutorAgent
from src.agents.critic import CriticAgent
from src.agents.replanner import ReplannerAgent
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


def test_bounded_retry_recovers_successfully():
    """
    US-005: Reject -> Retry -> Pass.
    Verifies that when Critic rejects Attempt 1, Executor receives feedback and
    Attempt 2 succeeds, updating retry_counts and completing the workflow.
    """
    mock_planner = MagicMock(spec=PlannerAgent)
    mock_executor = MagicMock(spec=ExecutorAgent)
    mock_critic = MagicMock(spec=CriticAgent)
    mock_replanner = MagicMock(spec=ReplannerAgent)

    step1 = PlanStep(step_id="step_1", title="Math Step", description="Calculate stats", dependencies=[])
    plan = Plan(task="Calculate statistics", rationale="Single step", steps=[step1])

    mock_planner.plan_workflow.side_effect = lambda s: setattr(s, "plan", plan) or setattr(s, "status", WorkflowStatus.PLAN_READY) or s

    # Executor outputs
    mock_executor.execute_workflow_step.side_effect = lambda sid, s, critic_feedback=None: (
        s.step_outputs.update({sid: StepOutput(step_id=sid, content="Output")}) or s
    )
    mock_executor.build_dependency_context.return_value = "No context"

    # Critic: Reject attempt 1, Pass attempt 2
    critic_call_count = 0
    def mock_critic_evaluate(sid, s, dependency_context=None):
        nonlocal critic_call_count
        critic_call_count += 1
        if sid not in s.critic_reviews:
            s.critic_reviews[sid] = []

        if critic_call_count == 1:
            # First attempt: REJECT
            s.critic_reviews[sid].append(
                CriticReview(
                    step_id=sid,
                    decision=CriticDecision.REJECT,
                    correctness_score=0.4,
                    completeness_score=0.6,
                    relevance_score=0.9,
                    critique="Calculation omitted standard deviation.",
                    suggested_fixes=["Add standard deviation formula."],
                )
            )
        else:
            # Second attempt: PASS
            s.critic_reviews[sid].append(
                CriticReview(
                    step_id=sid,
                    decision=CriticDecision.PASS,
                    correctness_score=0.95,
                    completeness_score=0.95,
                    relevance_score=1.0,
                    critique="Fully corrected.",
                )
            )
            step1.status = StepStatus.PASSED
        return s

    mock_critic.evaluate_workflow_step.side_effect = mock_critic_evaluate

    engine = OrchestrationEngine(
        planner=mock_planner,
        executor=mock_executor,
        critic=mock_critic,
        replanner=mock_replanner,
        max_step_retries=2,
        verbose=False,
    )

    final_state = engine.run("Calculate statistics")

    assert final_state.status == WorkflowStatus.COMPLETED
    assert final_state.retry_counts["step_1"] == 1
    assert len(final_state.critic_reviews["step_1"]) == 2
    assert final_state.critic_reviews["step_1"][-1].decision == CriticDecision.PASS


def test_repeated_failure_triggers_replanning():
    """
    US-005: Repeated failures trigger dynamic re-planning.
    Verifies that when retries exceed max_step_retries, ReplannerAgent is invoked,
    replan_history is updated, and the workflow recovers with the new plan.
    """
    mock_planner = MagicMock(spec=PlannerAgent)
    mock_executor = MagicMock(spec=ExecutorAgent)
    mock_critic = MagicMock(spec=CriticAgent)
    mock_replanner = MagicMock(spec=ReplannerAgent)

    initial_step = PlanStep(step_id="step_impossible", title="Impossible Task", description="Blocked task", dependencies=[])
    initial_plan = Plan(task="Complex Mission", rationale="Initial strategy", steps=[initial_step])

    mock_planner.plan_workflow.side_effect = lambda s: setattr(s, "plan", initial_plan) or setattr(s, "status", WorkflowStatus.PLAN_READY) or s
    mock_executor.execute_workflow_step.side_effect = lambda sid, s, critic_feedback=None: (
        s.step_outputs.update({sid: StepOutput(step_id=sid, content="Output")}) or s
    )
    mock_executor.build_dependency_context.return_value = ""

    # Critic rejects step_impossible every time, but passes alternative_step
    def mock_critic_evaluate(sid, s, dependency_context=None):
        if sid not in s.critic_reviews:
            s.critic_reviews[sid] = []

        if sid == "step_impossible":
            s.critic_reviews[sid].append(
                CriticReview(
                    step_id=sid,
                    decision=CriticDecision.REJECT,
                    correctness_score=0.2,
                    completeness_score=0.3,
                    relevance_score=0.5,
                    critique="Impossible requirement.",
                    suggested_fixes=["Pivot strategy."],
                )
            )
        else:
            s.critic_reviews[sid].append(
                CriticReview(
                    step_id=sid,
                    decision=CriticDecision.PASS,
                    correctness_score=0.95,
                    completeness_score=0.95,
                    relevance_score=0.95,
                    critique="Alternative path successful.",
                )
            )
            for st in s.plan.steps:
                if st.step_id == sid:
                    st.status = StepStatus.PASSED
        return s

    mock_critic.evaluate_workflow_step.side_effect = mock_critic_evaluate

    # Re-planner provides alternative viable step
    revised_step = PlanStep(step_id="step_alternative", title="Alternative Viable Path", description="Feasible approach", dependencies=[])
    revised_plan = Plan(task="Complex Mission", rationale="Restructured plan", steps=[revised_step])

    def mock_replan_workflow(s, failed_step_id):
        s.replan_history.append(f"plan_v_1:{s.plan.plan_id}")
        s.plan = revised_plan
        s.status = WorkflowStatus.PLAN_READY
        return s

    mock_replanner.replan_workflow.side_effect = mock_replan_workflow

    engine = OrchestrationEngine(
        planner=mock_planner,
        executor=mock_executor,
        critic=mock_critic,
        replanner=mock_replanner,
        max_step_retries=1,      # Fail fast: 1 retry max
        max_workflow_replans=1,
        verbose=False,
    )

    final_state = engine.run("Complex Mission")

    assert final_state.status == WorkflowStatus.COMPLETED
    assert len(final_state.replan_history) == 1
    assert "step_alternative" in final_state.step_outputs


def test_infinite_retry_loop_prevented():
    """
    US-005: Infinite retry loops are prevented.
    Verifies that when both max_step_retries and max_workflow_replans are reached,
    the workflow cleanly terminates in FAILED status rather than looping forever.
    """
    mock_planner = MagicMock(spec=PlannerAgent)
    mock_executor = MagicMock(spec=ExecutorAgent)
    mock_critic = MagicMock(spec=CriticAgent)
    mock_replanner = MagicMock(spec=ReplannerAgent)

    step = PlanStep(step_id="step_perpetual_fail", title="Fail", description="Always fails", dependencies=[])
    plan = Plan(task="Failure test", rationale="Test", steps=[step])

    mock_planner.plan_workflow.side_effect = lambda s: setattr(s, "plan", plan) or setattr(s, "status", WorkflowStatus.PLAN_READY) or s
    mock_executor.execute_workflow_step.side_effect = lambda sid, s, critic_feedback=None: (
        s.step_outputs.update({sid: StepOutput(step_id=sid, content="Output")}) or s
    )
    mock_executor.build_dependency_context.return_value = ""

    # Critic rejects unconditionally
    def mock_critic_reject(sid, s, dependency_context=None):
        if sid not in s.critic_reviews:
            s.critic_reviews[sid] = []
        s.critic_reviews[sid].append(
            CriticReview(
                step_id=sid,
                decision=CriticDecision.REJECT,
                correctness_score=0.1,
                completeness_score=0.1,
                relevance_score=0.1,
                critique="Permanent rejection.",
            )
        )
        return s

    mock_critic.evaluate_workflow_step.side_effect = mock_critic_reject

    engine = OrchestrationEngine(
        planner=mock_planner,
        executor=mock_executor,
        critic=mock_critic,
        replanner=mock_replanner,
        max_step_retries=2,
        max_workflow_replans=0,  # Zero replans allowed -> must fail after retries
        verbose=False,
    )

    final_state = engine.run("Failure test")

    assert final_state.status == WorkflowStatus.FAILED
    assert final_state.retry_counts["step_perpetual_fail"] == 2
