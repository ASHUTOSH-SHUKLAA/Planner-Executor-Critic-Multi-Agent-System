"""
Central LLM Gateway with Provider Abstraction.
Decouples agent logic from specific LLM vendors.
Dedicated to Google Gemini as the enterprise LLM engine.
"""

import os
from typing import Type, TypeVar, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

from src.llm.base import BaseLLMProvider, LLMResponse
from src.llm.gemini_provider import GeminiProvider, GEMINI_PRICING

MODEL_PRICING = GEMINI_PRICING

load_dotenv()

T = TypeVar("T", bound=BaseModel)


class LLMGateway:
    """
    Unified Gateway for all agent LLM calls.
    Dispatches directly to the GeminiProvider.
    Provides:
    1. Direct text generation
    2. Enforced structured output (Pydantic models)
    3. Automatic token counting and USD cost calculation
    4. Self-healing retries
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
        provider: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set. Please set GEMINI_API_KEY in your .env file.")

        self.provider: BaseLLMProvider = GeminiProvider(
            api_key=self.api_key,
            default_model=default_model or os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
        )
        self.default_model = getattr(self.provider, "default_model", "gemini-3.5-flash")
        self.provider_name = "gemini"

    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate estimated cost in USD based on Gemini rates."""
        if hasattr(self.provider, "_calculate_cost"):
            return self.provider._calculate_cost(model, prompt_tokens, completion_tokens)
        rates = MODEL_PRICING.get(model, {"prompt": 0.075 / 1_000_000, "completion": 0.30 / 1_000_000})
        cost = (prompt_tokens * rates["prompt"]) + (completion_tokens * rates["completion"])
        return round(cost, 6)

    def _resolve_model(self, requested_model: Optional[str]) -> str:
        """
        Normalizes model identifiers and handles cross-provider fallbacks.
        Supports active Gemini models: Gemini 3.5 Flash, Gemini 3 Flash, Gemini 3.5 Flash Lite, Gemini 3.6 Flash.
        """
        if not requested_model:
            return self.default_model

        m = requested_model.lower().strip()
        if "3.5-flash-lite" in m or "2.0-flash-lite" in m or "flash-lite" in m or "lite" in m:
            return "gemini-3.5-flash-lite"
        if "3.6-flash" in m or "3.6" in m:
            return "gemini-3.6-flash"
        if "3.5-flash" in m or "3.5" in m:
            return "gemini-3.5-flash"
        if "3-flash" in m or "preview" in m or "gemini-3" in m:
            return "gemini-3-flash-preview"
        # All legacy flash / pro models map smoothly to active gemini-3.5-flash
        return "gemini-3.5-flash"

    def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> LLMResponse[None]:
        effective_model = self._resolve_model(model)
        return self.provider.generate_text(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=effective_model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        model: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        max_validation_retries: int = 2,
    ) -> LLMResponse[T]:
        effective_model = self._resolve_model(model)
        return self.provider.generate_structured(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_model=response_model,
            model=effective_model,
            temperature=temperature,
            max_tokens=max_tokens,
            max_validation_retries=max_validation_retries,
        )


# Alias LLMProvider to LLMGateway for clean architectural naming
LLMProvider = LLMGateway
