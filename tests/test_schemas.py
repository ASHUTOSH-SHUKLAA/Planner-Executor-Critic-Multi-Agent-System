"""
Tests for Core Data Contracts and Schemas.
Verifies validation logic, DAG integrity checks, and schema enforcement.
"""

import pytest
from pydantic import ValidationError
from src.models.schemas import (
    StepStatus,
    CriticDecision,
    PlanStep,
    Plan,
    StepOutput,
    CriticReview,
    WorkflowState,
    WorkflowStatus,
)


def test_valid_plan_creation():
    """Verify that a well-formed DAG plan passes validation."""
    step1 = PlanStep(
        step_id="step_1",
        title="Literature Search",
        description="Search for papers on multi-agent architectures.",
        dependencies=[],
    )
    step2 = PlanStep(
        step_id="step_2",
        title="Analyze Findings",
        description="Analyze patterns found in literature.",
        dependencies=["step_1"],  # depends on step_1
    )

    plan = Plan(
        task="Research Multi-Agent Systems",
        rationale="Decomposed into search followed by analysis.",
        steps=[step1, step2],
    )

    assert len(plan.steps) == 2
    assert plan.steps[1].dependencies == ["step_1"]
    assert plan.plan_id.startswith("plan_")


def test_duplicate_step_id_rejected():
    """Verify that a plan with duplicate step_ids raises a validation error."""
    step1 = PlanStep(
        step_id="step_1",
        title="Step One",
        description="First action.",
    )
    step2 = PlanStep(
        step_id="step_1",  # DUPLICATE!
        title="Step Two with duplicate ID",
        description="Second action.",
    )

    with pytest.raises(ValidationError) as exc_info:
        Plan(
            task="Test Duplicate IDs",
            rationale="Testing validation.",
            steps=[step1, step2],
        )

    assert "Duplicate step_id found: 'step_1'" in str(exc_info.value)


def test_invalid_dependency_rejected():
    """Verify that a step depending on a non-existent step_id raises an error."""
    step1 = PlanStep(
        step_id="step_1",
        title="Step One",
        description="First action.",
        dependencies=["step_999"],  # Does NOT exist!
    )

    with pytest.raises(ValidationError) as exc_info:
        Plan(
            task="Test Broken Dependency",
            rationale="Testing dependency validation.",
            steps=[step1],
        )

    assert "depends on unknown step_id 'step_999'" in str(exc_info.value)


def test_self_dependency_rejected():
    """Verify that a step depending on itself raises an error."""
    step1 = PlanStep(
        step_id="step_1",
        title="Self Loop",
        description="Tries to depend on itself.",
        dependencies=["step_1"],  # Self loop!
    )

    with pytest.raises(ValidationError) as exc_info:
        Plan(
            task="Test Self Dependency",
            rationale="Testing self-loop detection.",
            steps=[step1],
        )

    assert "cannot depend on itself" in str(exc_info.value)


def test_critic_review_scores_bounded():
    """Verify that CriticReview enforces scores between 0.0 and 1.0."""
    # Valid review
    review = CriticReview(
        step_id="step_1",
        decision=CriticDecision.PASS,
        correctness_score=0.95,
        completeness_score=0.9,
        relevance_score=1.0,
        critique="Comprehensive and accurate analysis.",
    )
    assert review.decision == CriticDecision.PASS

    # Invalid review: score > 1.0
    with pytest.raises(ValidationError):
        CriticReview(
            step_id="step_1",
            decision=CriticDecision.PASS,
            correctness_score=1.5,  # Exceeds max 1.0!
            completeness_score=0.9,
            relevance_score=1.0,
            critique="Too high score.",
        )


def test_workflow_state_initialization():
    """Verify that WorkflowState initializes with clean defaults."""
    state = WorkflowState(task="Build an autonomous research report")

    assert state.status == WorkflowStatus.TASK_RECEIVED
    assert state.workflow_id.startswith("wf_")
    assert state.plan is None
    assert len(state.step_outputs) == 0
    assert len(state.critic_reviews) == 0
    assert state.total_tokens == 0
    assert state.estimated_cost_usd == 0.0
