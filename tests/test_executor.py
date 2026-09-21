"""
Unit and Integration Tests for the Executor Agent.
"""

import os
import pytest
from unittest.mock import MagicMock
from src.agents.executor import ExecutorAgent
from src.models.schemas import (
    Plan,
    PlanStep,
    StepOutput,
    StepStatus,
    WorkflowState,
)
from src.llm.client import LLMGateway, LLMResponse


def test_scoped_dependency_context_filtering():
    """
    CRITICAL TEST: Verify that the Executor only includes outputs from
    declared dependencies, filtering out unrelated steps to prevent context bloat.
    """
    executor = ExecutorAgent(gateway=MagicMock(spec=LLMGateway))

    state = WorkflowState(task="Build multi-tier cloud application")
    state.step_outputs["step_1"] = StepOutput(
        step_id="step_1",
        content="Step 1 Analysis: Redis cache recommended.",
        key_findings=["In-memory caching reduces DB latency by 80%."],
    )
    state.step_outputs["step_2"] = StepOutput(
        step_id="step_2",
        content="Step 2 Analysis: OAuth2 authentication chosen.",
        key_findings=["JWT tokens used for stateless sessions."],
    )
    state.step_outputs["step_3"] = StepOutput(
        step_id="step_3",
        content="Step 3 Analysis: PostgreSQL selected for relational storage.",
        key_findings=["ACID compliance needed for financial records."],
    )

    # Step 4 ONLY depends on step_1 and step_3 (it does NOT depend on step_2)
    step_4 = PlanStep(
        step_id="step_4",
        title="Database Optimization",
        description="Optimize database access using cache.",
        dependencies=["step_1", "step_3"],
    )

    context = executor.build_dependency_context(step_4, state)

    # Verify step_1 and step_3 ARE in the injected context
    assert "Redis cache recommended" in context
    assert "PostgreSQL selected" in context

    # Verify step_2 IS NOT in the injected context (scoped isolation!)
    assert "OAuth2 authentication chosen" not in context
    assert "JWT tokens" not in context


def test_independent_step_context():
    """Verify that a step with no dependencies produces a clean independent context."""
    executor = ExecutorAgent(gateway=MagicMock(spec=LLMGateway))
    state = WorkflowState(task="Independent research")

    root_step = PlanStep(
        step_id="step_1",
        title="Initial Research",
        description="Perform basic search.",
        dependencies=[],
    )

    context = executor.build_dependency_context(root_step, state)
    assert "No preceding dependencies required" in context


def test_execute_workflow_step_mocked():
    """Verify state updates when a step is executed."""
    mock_gateway = MagicMock(spec=LLMGateway)
    mock_gateway.default_model = "test-model"

    mock_output = StepOutput(
        step_id="step_1",
        content="Detailed execution findings on microservices.",
        key_findings=["Independent deployability", "Fault isolation"],
        execution_time_seconds=1.5,
        tokens_used=300,
    )

    mock_gateway.generate_structured.return_value = LLMResponse(
        raw_content="{}",
        parsed=mock_output,
        model="test-model",
        prompt_tokens=200,
        completion_tokens=100,
        total_tokens=300,
        latency_seconds=1.5,
        estimated_cost_usd=0.0002,
    )

    executor = ExecutorAgent(gateway=mock_gateway)

    plan = Plan(
        task="Test Microservices",
        rationale="Single step plan",
        steps=[
            PlanStep(step_id="step_1", title="Research", description="Analyze pros", dependencies=[])
        ]
    )
    state = WorkflowState(task="Test Microservices", plan=plan)

    updated_state = executor.execute_workflow_step("step_1", state)

    assert "step_1" in updated_state.step_outputs
    assert updated_state.step_outputs["step_1"].content == "Detailed execution findings on microservices."
    assert updated_state.total_tokens == 300
    assert updated_state.estimated_cost_usd == 0.0002


@pytest.mark.skipif(
    not os.getenv("GROQ_API_KEY"),
    reason="Live Groq API test requires GROQ_API_KEY",
)
def test_live_executor_step_execution():
    """Live integration test: verifies real Groq model produces structured StepOutput."""
    executor = ExecutorAgent()
    state = WorkflowState(task="Analyze Container Orchestration")

    step = PlanStep(
        step_id="step_1",
        title="Kubernetes Core Architecture",
        description="Analyze the role of kube-apiserver, etcd, and kubelet in a Kubernetes cluster.",
        dependencies=[],
    )

    response = executor.execute_step(step=step, state=state)

    assert response.parsed is not None
    output: StepOutput = response.parsed

    assert output.step_id == "step_1"
    assert len(output.content) > 50
    assert len(output.key_findings) >= 1
    assert any("kube-apiserver" in output.content.lower() or "etcd" in output.content.lower() for _ in [1])
    assert output.execution_time_seconds > 0.0
    assert output.tokens_used > 0
