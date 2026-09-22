"""
Unit and Integration Tests for Parallel Execution (Module 8).
Fulfills PRD US-007 Acceptance Criteria:
- Step dependencies are represented.
- Independent steps are identified and executed concurrently.
- Dependent steps wait for required outputs.
- State integrity is preserved across concurrent updates.
- Latency comparison between sequential and parallel execution.
"""

import asyncio
import time
import pytest
from unittest.mock import MagicMock
from src.orchestrator.engine import OrchestrationEngine
from src.agents.planner import PlannerAgent
from src.agents.executor import ExecutorAgent
from src.agents.critic import CriticAgent
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


def test_topological_batch_identification():
    """US-007: Independent steps are identified for parallel execution."""
    engine = OrchestrationEngine(verbose=False)

    step1 = PlanStep(step_id="step_1", title="Research A", description="A", dependencies=[])
    step2 = PlanStep(step_id="step_2", title="Research B", description="B", dependencies=[])
    step3 = PlanStep(step_id="step_3", title="Research C", description="C", dependencies=[])
    step4 = PlanStep(step_id="step_4", title="Synthesis", description="Merge", dependencies=["step_1", "step_2", "step_3"])

    plan = Plan(task="Research A, B, C", rationale="Parallel fan-out then fan-in", steps=[step1, step2, step3, step4])
    state = WorkflowState(task="Research A, B, C", plan=plan)

    # Initial wave: step 1, 2, 3 should ALL be in the first parallel batch
    batch_1 = engine.get_executable_steps_batch(state, completed_step_ids=set())
    batch_1_ids = [s.step_id for s in batch_1]
    assert sorted(batch_1_ids) == ["step_1", "step_2", "step_3"]

    # Step 4 must NOT be in batch_1 because its dependencies have not completed
    assert "step_4" not in batch_1_ids

    # After step 1 and step 2 finish, step 3 is still pending, step 4 must still wait
    for s in [step1, step2]:
        s.status = StepStatus.PASSED
    batch_2 = engine.get_executable_steps_batch(state, completed_step_ids={"step_1", "step_2"})
    assert [s.step_id for s in batch_2] == ["step_3"]

    # Once step 3 finishes, step 4 is finally unlocked!
    step3.status = StepStatus.PASSED
    batch_3 = engine.get_executable_steps_batch(state, completed_step_ids={"step_1", "step_2", "step_3"})
    assert [s.step_id for s in batch_3] == ["step_4"]


def test_parallel_execution_speedup_and_state_integrity():
    """
    US-007: Concurrency reduces latency without corrupting shared state.
    Simulates 3 independent steps that each take 0.15s.
    Sequential would take ~0.45s, while Parallel completes in ~0.15s.
    """
    step1 = PlanStep(step_id="step_1", title="Task 1", description="1", dependencies=[])
    step2 = PlanStep(step_id="step_2", title="Task 2", description="2", dependencies=[])
    step3 = PlanStep(step_id="step_3", title="Task 3", description="3", dependencies=[])
    plan = Plan(task="Parallel Speedup Test", rationale="3 parallel tasks", steps=[step1, step2, step3])

    mock_planner = MagicMock(spec=PlannerAgent)
    mock_planner.plan_workflow.side_effect = lambda s: setattr(s, "plan", plan) or setattr(s, "status", WorkflowStatus.PLAN_READY) or s

    mock_executor = MagicMock(spec=ExecutorAgent)
    mock_executor.build_dependency_context.return_value = ""

    # Each step simulates 0.15s of work
    def delayed_execute(step, state, critic_feedback=None):
        time.sleep(0.15)
        mock_resp = MagicMock()
        mock_resp.parsed = StepOutput(
            step_id=step.step_id,
            content=f"Result for {step.step_id}",
            key_findings=[f"Finding {step.step_id}"],
        )
        mock_resp.total_tokens = 50
        mock_resp.estimated_cost_usd = 0.00005
        return mock_resp

    mock_executor.execute_step.side_effect = delayed_execute

    mock_critic = MagicMock(spec=CriticAgent)
    def instant_pass(step, output, task_objective, dependency_context=None):
        mock_resp = MagicMock()
        mock_resp.parsed = CriticReview(
            step_id=step.step_id,
            decision=CriticDecision.PASS,
            correctness_score=0.95,
            completeness_score=0.90,
            relevance_score=0.90,
            critique="Pass",
        )
        mock_resp.total_tokens = 20
        mock_resp.estimated_cost_usd = 0.00002
        return mock_resp

    mock_critic.evaluate_output.side_effect = instant_pass

    mock_synthesizer = MagicMock()
    mock_synthesizer.synthesize_workflow.side_effect = lambda s: setattr(s, "final_result", "Done") or s

    engine = OrchestrationEngine(
        planner=mock_planner,
        executor=mock_executor,
        critic=mock_critic,
        synthesizer=mock_synthesizer,
        verbose=False,
    )

    start_time = time.perf_counter()
    state = engine.run_parallel("Parallel Speedup Test")
    elapsed = time.perf_counter() - start_time

    # Verification 1: State integrity (all 3 steps completed without race conditions)
    assert state.status == WorkflowStatus.COMPLETED
    assert len(state.step_outputs) == 3
    assert set(state.step_outputs.keys()) == {"step_1", "step_2", "step_3"}
    assert len(state.critic_reviews) == 3

    # Verification 2: Concurrency speedup
    # Sequential would take > 0.45s. Parallel should complete in under 0.35s!
    assert elapsed < 0.35, f"Expected parallel speedup under 0.35s, but took {elapsed:.2f}s"
