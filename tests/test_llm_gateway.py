"""
Unit tests for LLM Gateway cost calculation, initialization, and error handling.
"""

import pytest
from src.llm.client import LLMGateway, MODEL_PRICING


def test_missing_api_key_raises_error(monkeypatch):
    """Verify that omitting the API key raises an instructive error."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ValueError) as exc:
        LLMGateway(api_key=None)
    assert "is not set" in str(exc.value)


def test_cost_calculation_llama_70b():
    """Verify that token pricing math matches published rates."""
    gateway = LLMGateway(api_key="gsk_dummy_key_for_testing")
    
    # 1,000 prompt tokens @ $0.59/M = $0.00059
    # 2,000 completion tokens @ $0.79/M = $0.00158
    # Total = 0.002170
    cost = gateway._calculate_cost("llama-3.3-70b-versatile", 1000, 2000)
    assert cost == 0.002170


def test_cost_calculation_llama_8b():
    """Verify 8B pricing math."""
    gateway = LLMGateway(api_key="gsk_dummy_key_for_testing")
    
    # 1,000 prompt tokens @ $0.05/M = $0.00005
    # 1,000 completion tokens @ $0.08/M = $0.00008
    # Total = 0.000130
    cost = gateway._calculate_cost("llama-3.1-8b-instant", 1000, 1000)
    assert cost == 0.000130
