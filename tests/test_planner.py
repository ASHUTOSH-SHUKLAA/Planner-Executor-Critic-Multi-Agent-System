"""
Unit and Integration Tests for the Planner Agent.
"""

import os
import pytest
from unittest.mock import MagicMock
from src.agents.planner import PlannerAgent
from src.models.schemas import Plan, PlanStep, WorkflowState, WorkflowStatus
from src.llm.client import LLMGateway, LLMResponse


def test_planner_initialization():
    """Verify PlannerAgent initializes properly with custom or default gateway."""
    mock_gateway = MagicMock(spec=LLMGateway)
    mock_gateway.default_model = "test-model"

    planner = PlannerAgent(gateway=mock_gateway)
    assert planner.model == "test-model"
    assert planner.gateway == mock_gateway


def test_plan_workflow_state_transition():
    """Verify that plan_workflow updates WorkflowState correctly."""
    mock_gateway = MagicMock(spec=LLMGateway)
    mock_gateway.default_model = "test-model"

    # Create dummy valid plan
    dummy_plan = Plan(
        task="Test Task",
        rationale="Logical 2-step sequence",
        steps=[
            PlanStep(step_id="step_1", title="Gather Data", description="Fetch data", dependencies=[]),
            PlanStep(step_id="step_2", title="Analyze Data", description="Analyze", dependencies=["step_1"]),
        ]
    )

    mock_gateway.generate_structured.return_value = LLMResponse(
        raw_content="{}",
        parsed=dummy_plan,
        model="test-model",
        prompt_tokens=150,
        completion_tokens=100,
        total_tokens=250,
        latency_seconds=1.2,
        estimated_cost_usd=0.00015,
    )

    planner = PlannerAgent(gateway=mock_gateway)
    initial_state = WorkflowState(task="Test Task")
    assert initial_state.status == WorkflowStatus.TASK_RECEIVED

    updated_state = planner.plan_workflow(initial_state)

    # Verify state transitions and properties
    assert updated_state.status == WorkflowStatus.PLAN_READY
    assert updated_state.plan == dummy_plan
    assert updated_state.total_tokens == 250
    assert updated_state.estimated_cost_usd == 0.00015


@pytest.mark.skipif(
    not os.getenv("GROQ_API_KEY"),
    reason="Live Groq API test requires GROQ_API_KEY",
)
def test_live_planner_dag_generation():
    """Live integration test: verifies real Groq model generates a valid DAG."""
    planner = PlannerAgent()
    task = (
        "Compare SQL vs NoSQL databases for a high-throughput social media application "
        "and recommend the optimal data architecture."
    )

    response = planner.create_plan(task=task)

    assert response.parsed is not None
    plan: Plan = response.parsed

    assert len(plan.steps) >= 3
    assert plan.task == task
    assert len(plan.rationale) > 10

    # Verify step IDs are all distinct
    step_ids = [s.step_id for s in plan.steps]
    assert len(step_ids) == len(set(step_ids))

    # At least one step should be independent (candidate for parallel execution)
    independent_steps = [s for s in plan.steps if len(s.dependencies) == 0]
    assert len(independent_steps) >= 1

    # The final step should be dependent on earlier steps (synthesis)
    final_step = plan.steps[-1]
    assert len(final_step.dependencies) >= 1
