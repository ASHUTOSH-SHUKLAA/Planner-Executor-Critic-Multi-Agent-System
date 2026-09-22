"""
Unit tests for Module 10: SynthesizerAgent.
Verifies multi-step output aggregation, report generation, and telemetry integration.
"""

import pytest
from unittest.mock import MagicMock

from src.agents.synthesizer import SynthesizerAgent
from src.models.schemas import (
    WorkflowState,
    WorkflowStatus,
    StepOutput,
    StepStatus,
)
from src.llm.client import LLMResponse


def test_synthesizer_empty_state():
    """Verify synthesizer handles workflows with no outputs gracefully."""
    agent = SynthesizerAgent(gateway=MagicMock())
    state = WorkflowState(task="Empty test")
    
    result_state = agent.synthesize_workflow(state)
    assert result_state.final_result is not None
    assert "No step deliverables" in result_state.final_result


def test_synthesizer_success():
    """Verify synthesizer formats all step deliverables and calls the LLM."""
    mock_gateway = MagicMock()
    mock_gateway.default_model = "openai/gpt-oss-120b"
    mock_gateway.generate_text.return_value = LLMResponse(
        raw_content="# Comprehensive System Design\n\nExecutive Summary of findings.",
        model="openai/gpt-oss-120b",
        prompt_tokens=400,
        completion_tokens=250,
        total_tokens=650,
        latency_seconds=1.2,
        estimated_cost_usd=0.0004,
    )

    agent = SynthesizerAgent(gateway=mock_gateway)

    state = WorkflowState(
        task="Design a rate limiter",
        step_outputs={
            "step_1": StepOutput(
                step_id="step_1",
                content="Step 1: Analyzed token bucket requirements.",
                key_findings=["10,000 req/sec peak", "Redis cluster chosen"],
                status=StepStatus.PASSED,
            ),
            "step_2": StepOutput(
                step_id="step_2",
                content="Step 2: Designed Lua atomic script.",
                key_findings=["Single round-trip eval", "TTL renewal"],
                status=StepStatus.PASSED,
            ),
        },
    )

    result_state = agent.synthesize_workflow(state)

    assert result_state.final_result == "# Comprehensive System Design\n\nExecutive Summary of findings."
    assert result_state.total_tokens == 650
    assert result_state.estimated_cost_usd == pytest.approx(0.0004)

    # Check prompt passed to LLM
    call_kwargs = mock_gateway.generate_text.call_args[1]
    assert "Design a rate limiter" in call_kwargs["user_prompt"]
    assert "step_1" in call_kwargs["user_prompt"]
    assert "step_2" in call_kwargs["user_prompt"]
    assert "10,000 req/sec peak" in call_kwargs["user_prompt"]
