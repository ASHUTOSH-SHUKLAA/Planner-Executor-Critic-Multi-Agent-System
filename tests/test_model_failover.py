"""
Tests for automatic model failover and resilience when models are busy or unavailable.
"""

import pytest
from unittest.mock import MagicMock, patch
from pydantic import BaseModel

from src.llm.gemini_provider import (
    GeminiProvider,
    normalize_gemini_model,
    SUPPORTED_GEMINI_MODELS,
    register_model_switch_listener,
    unregister_model_switch_listener,
)
from src.llm.client import LLMGateway
from src.models.schemas import Plan


class SimpleSchema(BaseModel):
    summary: str
    items: list[str]


def test_normalize_gemini_model():
    """Verify legacy or invalid model names are mapped to verified active Gemini models."""
    assert normalize_gemini_model("gemini-1.5-flash") == "gemini-3.5-flash"
    assert normalize_gemini_model("gemini-flash-lite-latest") == "gemini-3.5-flash-lite"
    assert normalize_gemini_model("gemini-2.0-flash-lite") == "gemini-3.5-flash-lite"
    assert normalize_gemini_model("gemini-1.5-pro") == "gemini-3.5-flash"
    assert normalize_gemini_model("gemini-2.5-flash") == "gemini-3.5-flash"
    assert normalize_gemini_model("gemini-2.0-flash") == "gemini-3.5-flash"
    assert normalize_gemini_model("gemini-3.5-flash-lite") == "gemini-3.5-flash-lite"
    assert normalize_gemini_model("gemini-2.5-pro") == "gemini-3.5-flash"
    assert normalize_gemini_model("gemini-3.5-flash") == "gemini-3.5-flash"
    assert normalize_gemini_model("gemini-3-flash-preview") == "gemini-3-flash-preview"
    assert normalize_gemini_model("gemini-3.6-flash") == "gemini-3.6-flash"
    assert normalize_gemini_model(None) == "gemini-3.5-flash"


def test_gateway_resolves_models():
    """Verify LLMGateway resolves requested models correctly to active models."""
    with patch.dict("os.environ", {"GEMINI_API_KEY": "test-key"}):
        gateway = LLMGateway()
        assert gateway._resolve_model("gemini-1.5-flash") == "gemini-3.5-flash"
        assert gateway._resolve_model("gemini-flash-lite-latest") == "gemini-3.5-flash-lite"
        assert gateway._resolve_model("gemini-2.0-flash-lite") == "gemini-3.5-flash-lite"
        assert gateway._resolve_model("gemini-2.5-flash") == "gemini-3.5-flash"
        assert gateway._resolve_model("gemini-2.0-flash") == "gemini-3.5-flash"
        assert gateway._resolve_model("gemini-3.5-flash-lite") == "gemini-3.5-flash-lite"
        assert gateway._resolve_model("gemini-2.5-pro") == "gemini-3.5-flash"
        assert gateway._resolve_model("gemini-3.5-flash") == "gemini-3.5-flash"
        assert gateway._resolve_model("gemini-3-flash-preview") == "gemini-3-flash-preview"
        assert gateway._resolve_model("gemini-3.6-flash") == "gemini-3.6-flash"


def test_auto_failover_when_model_is_busy():
    """
    Verify that when a model encounters a 429 / 503 / Resource Exhausted error,
    it automatically and immediately switches to the other model in the chain.
    """
    with patch.dict("os.environ", {"GEMINI_API_KEY": "test-key"}):
        provider = GeminiProvider(api_key="test-key")

        mock_busy_error = Exception("429 Resource has been exhausted (e.g. check quota).")
        mock_success_response = MagicMock()
        mock_success_response.text = '{"summary": "ok", "items": ["a"]}'
        mock_success_response.usage_metadata = MagicMock(
            prompt_token_count=10, candidates_token_count=20, total_token_count=30
        )

        # First model fails with 429, second model succeeds
        call_models = []

        def side_effect(model, contents, config):
            call_models.append(model)
            if model == "gemini-3.5-flash":
                raise mock_busy_error
            return mock_success_response

        provider.client.models.generate_content = MagicMock(side_effect=side_effect)

        # Track model switch notifications
        switches = []
        def listener(old_m, new_m, reason):
            switches.append((old_m, new_m, reason))

        register_model_switch_listener(listener)
        try:
            res = provider.generate_text(
                system_prompt="system",
                user_prompt="test",
                model="gemini-3.5-flash",
            )
            # Should have failed on gemini-3.5-flash and switched to gemini-3.5-flash-lite
            assert call_models[0] == "gemini-3.5-flash"
            assert call_models[1] == "gemini-3.5-flash-lite"
            assert res.model == "gemini-3.5-flash-lite"
            assert len(switches) >= 1
            assert switches[0][0] == "gemini-3.5-flash"
        finally:
            unregister_model_switch_listener(listener)


def test_auto_failover_when_model_not_found_404():
    """
    Verify that if a 404 NOT_FOUND error occurs,
    it immediately skips to the next valid model and successfully completes.
    """
    with patch.dict("os.environ", {"GEMINI_API_KEY": "test-key"}):
        provider = GeminiProvider(api_key="test-key")

        mock_404_error = Exception(
            "404 NOT_FOUND. {'error': {'code': 404, 'message': 'models/gemini-old is not found for API version v1beta, or is not supported for generateContent.'}}"
        )
        mock_success_response = MagicMock()
        mock_success_response.text = '{"summary": "ok", "items": ["item1"]}'
        mock_success_response.usage_metadata = MagicMock(
            prompt_token_count=15, candidates_token_count=25, total_token_count=40
        )

        call_models = []

        def side_effect(model, contents, config):
            call_models.append(model)
            if len(call_models) == 1:
                raise mock_404_error
            return mock_success_response

        provider.client.models.generate_content = MagicMock(side_effect=side_effect)

        res = provider.generate_structured(
            system_prompt="system",
            user_prompt="test",
            response_model=SimpleSchema,
            model="gemini-3.5-flash",
        )

        assert len(call_models) >= 2
        assert res.parsed.summary == "ok"
        assert res.parsed.items == ["item1"]
        assert res.model == call_models[1]


def test_auto_failover_when_schema_fails():
    """
    Verify that if a model outputs invalid JSON or non-conforming schema,
    it automatically fails over to the next candidate model and succeeds.
    """
    with patch.dict("os.environ", {"GEMINI_API_KEY": "test-key"}):
        provider = GeminiProvider(api_key="test-key")

        mock_bad_response = MagicMock()
        mock_bad_response.text = '{"bad_field": 123}'
        mock_bad_response.usage_metadata = MagicMock(
            prompt_token_count=10, candidates_token_count=10, total_token_count=20
        )

        mock_good_response = MagicMock()
        mock_good_response.text = '{"summary": "recovered", "items": ["resilience"]}'
        mock_good_response.usage_metadata = MagicMock(
            prompt_token_count=10, candidates_token_count=10, total_token_count=20
        )

        call_models = []

        def side_effect(model, contents, config):
            call_models.append(model)
            if model == "gemini-3.5-flash":
                return mock_bad_response
            return mock_good_response

        provider.client.models.generate_content = MagicMock(side_effect=side_effect)

        res = provider.generate_structured(
            system_prompt="system",
            user_prompt="test",
            response_model=SimpleSchema,
            model="gemini-3.5-flash",
            max_validation_retries=1,
        )

        assert "gemini-3.5-flash" in call_models
        assert "gemini-3.5-flash-lite" in call_models
        assert res.parsed.summary == "recovered"
        assert res.parsed.items == ["resilience"]
        assert res.model == "gemini-3.5-flash-lite"
