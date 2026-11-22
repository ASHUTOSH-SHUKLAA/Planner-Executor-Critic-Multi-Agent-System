"""
Unit tests for LLM Gateway cost calculation, initialization, and error handling with Google Gemini.
"""

import pytest
from src.llm.client import LLMGateway, MODEL_PRICING


def test_missing_api_key_raises_error(monkeypatch):
    """Verify that omitting the API key raises an instructive error."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ValueError) as exc:
        LLMGateway(api_key=None)
    assert "GEMINI_API_KEY is not set" in str(exc.value)


def test_cost_calculation_gemini_flash_lite():
    """Verify that token pricing math matches published Gemini Flash Lite rates."""
    gateway = LLMGateway(api_key="dummy_gemini_key_for_testing")
    
    # 1,000 prompt tokens @ $0.05/M = $0.00005
    # 2,000 completion tokens @ $0.20/M = $0.00040
    # Total = 0.000450
    cost = gateway._calculate_cost("gemini-flash-lite-latest", 1000, 2000)
    assert cost == 0.000450


def test_cost_calculation_gemini_pro():
    """Verify Gemini Pro pricing math."""
    gateway = LLMGateway(api_key="dummy_gemini_key_for_testing")
    
    # 1,000 prompt tokens @ $1.25/M = $0.00125
    # 1,000 completion tokens @ $5.00/M = $0.00500
    # Total = 0.006250
    cost = gateway._calculate_cost("gemini-2.5-pro", 1000, 1000)
    assert cost == 0.006250
