"""
Unit and Integration Tests for the Critic Agent.
Includes the critical PRD Acceptance Criteria test (US-004):
Detecting and rejecting a genuine Executor mistake.
"""

import os
import pytest
from unittest.mock import MagicMock
from src.agents.critic import CriticAgent
from src.models.schemas import (
    Plan,
    PlanStep,
    StepOutput,
    StepStatus,
    CriticReview,
    CriticDecision,
    WorkflowState,
)
from src.llm.client import LLMGateway, LLMResponse


def test_critic_pass_state_transition():
    """Verify that a PASS decision updates step status to PASSED and records review."""
    mock_gateway = MagicMock(spec=LLMGateway)
    mock_gateway.default_model = "test-model"

    mock_review = CriticReview(
        step_id="step_1",
        decision=CriticDecision.PASS,
        correctness_score=0.95,
        completeness_score=0.90,
        relevance_score=0.92,
        critique="Output is rigorous and factually sound.",
        suggested_fixes=[],
    )

    mock_gateway.generate_structured.return_value = LLMResponse(
        raw_content="{}",
        parsed=mock_review,
        model="test-model",
        prompt_tokens=150,
        completion_tokens=60,
        total_tokens=210,
        latency_seconds=0.8,
        estimated_cost_usd=0.0001,
    )

    critic = CriticAgent(gateway=mock_gateway)

    step = PlanStep(step_id="step_1", title="Test Step", description="Do research", dependencies=[])
    plan = Plan(task="Overall Task", rationale="Testing", steps=[step])
    state = WorkflowState(task="Overall Task", plan=plan)
    state.step_outputs["step_1"] = StepOutput(
        step_id="step_1",
        content="Valid research output.",
        key_findings=["Fact A", "Fact B"],
    )

    updated_state = critic.evaluate_workflow_step("step_1", state)

    # Verify status changed to PASSED
    assert step.status == StepStatus.PASSED
    assert len(updated_state.critic_reviews["step_1"]) == 1
    assert updated_state.critic_reviews["step_1"][0].decision == CriticDecision.PASS


def test_threshold_enforcement_forces_reject():
    """
    Verify that if any score falls below pass_threshold,
    the Critic deterministically overrides/forces the decision to REJECT.
    """
    mock_gateway = MagicMock(spec=LLMGateway)
    mock_gateway.default_model = "test-model"

    # LLM mistakenly marked PASS even though correctness is only 0.45
    sub_threshold_review = CriticReview(
        step_id="step_1",
        decision=CriticDecision.PASS,
        correctness_score=0.45,  # Below 0.70 threshold!
        completeness_score=0.85,
        relevance_score=0.90,
        critique="Some issues present.",
        suggested_fixes=[],
    )

    mock_gateway.generate_structured.return_value = LLMResponse(
        raw_content="{}",
        parsed=sub_threshold_review,
        model="test-model",
    )

    critic = CriticAgent(gateway=mock_gateway, pass_threshold=0.70)
    step = PlanStep(step_id="step_1", title="Step 1", description="Objective", dependencies=[])
    output = StepOutput(step_id="step_1", content="Content", key_findings=[])

    response = critic.evaluate_output(step=step, output=output, task_objective="Task")

    # The agent logic should have forced REJECT
    assert response.parsed.decision == CriticDecision.REJECT


@pytest.mark.skipif(
    not os.getenv("GROQ_API_KEY"),
    reason="Live Groq API test requires GROQ_API_KEY",
)
def test_live_critic_detects_genuine_executor_mistake():
    """
    PRD US-004 ACCEPTANCE CRITERIA:
    'At least one test demonstrates a genuine Executor mistake being detected.'
    
    Here we intentionally present the Critic with an Executor deliverable containing
    glaring factual and mathematical falsehoods about algorithmic complexity.
    """
    critic = CriticAgent(pass_threshold=0.70)

    step = PlanStep(
        step_id="step_alg_1",
        title="Search Complexity in Data Structures",
        description=(
            "Calculate and contrast the worst-case time complexity of searching "
            "for an element in a balanced Binary Search Tree (BST) versus an unsorted array of N elements."
        ),
        dependencies=[],
    )

    # Deliberately inverted, erroneous Executor output:
    flawed_output = StepOutput(
        step_id="step_alg_1",
        content=(
            "Searching in a balanced Binary Search Tree (BST) has a time complexity of O(N^2) "
            "because the tree rebalances itself on every lookup and compares all nodes with each other. "
            "On the other hand, searching in an unsorted array of N elements takes O(1) constant time "
            "because you can instantly retrieve any element without inspecting the rest of the array."
        ),
        key_findings=[
            "Balanced BST search is O(N^2)",
            "Unsorted array search is O(1)",
        ],
    )

    response = critic.evaluate_output(
        step=step,
        output=flawed_output,
        task_objective="Algorithm Complexity Benchmark",
    )

    review: CriticReview = response.parsed

    # Assertions validating that the Critic successfully caught the error:
    assert review.decision == CriticDecision.REJECT, (
        f"Critic failed to reject glaring mistake! Review: {review.critique}"
    )
    assert review.correctness_score < 0.60, (
        f"Correctness score too high ({review.correctness_score}) for flawed answer!"
    )
    assert len(review.critique) > 20
    assert len(review.suggested_fixes) >= 1

    # Verify critique notes the algorithmic mistake
    critique_lower = (review.critique + " " + " ".join(review.suggested_fixes)).lower()
    assert any(term in critique_lower for term in ["log", "o(n)", "constant", "o(1)", "incorrect", "false", "linear", "bst"])
