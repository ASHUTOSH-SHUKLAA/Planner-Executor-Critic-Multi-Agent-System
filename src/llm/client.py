"""
Central LLM Gateway with Provider Abstraction.
Decouples agent logic from specific LLM vendors.
Supports Google Gemini as primary, with fallback provider support.
"""

import os
from typing import Type, TypeVar, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

from src.llm.base import BaseLLMProvider, LLMResponse
from src.llm.gemini_provider import GeminiProvider, GEMINI_PRICING
from src.llm.groq_provider import GroqProvider, MODEL_PRICING as GROQ_MODEL_PRICING

MODEL_PRICING = {**GROQ_MODEL_PRICING, **GEMINI_PRICING}

load_dotenv()

T = TypeVar("T", bound=BaseModel)


class LLMGateway:
    """
    Unified Gateway for all agent LLM calls.
    Dispatches to the active BaseLLMProvider (Gemini by default).
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
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not set. Please create a .env file or pass api_key.")

        effective_gemini_key = api_key if (api_key and not api_key.startswith("gsk_")) else os.getenv("GEMINI_API_KEY")
        effective_groq_key = api_key if (api_key and api_key.startswith("gsk_")) else os.getenv("GROQ_API_KEY")

        selected_provider = provider or os.getenv("LLM_PROVIDER")
        if not selected_provider:
            if api_key and api_key.startswith("gsk_"):
                selected_provider = "groq"
            elif effective_gemini_key:
                selected_provider = "gemini"
            elif effective_groq_key:
                selected_provider = "groq"
            else:
                selected_provider = "gemini"
        selected_provider = selected_provider.lower()

        if selected_provider == "gemini":
            try:
                self.provider: BaseLLMProvider = GeminiProvider(
                    api_key=effective_gemini_key,
                    default_model=default_model or os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest"),
                )
                self.default_model = getattr(self.provider, "default_model", "gemini-flash-lite-latest")
                self.provider_name = "gemini"
            except Exception as e:
                # If Gemini key not available but Groq key is, fallback gracefully
                if effective_groq_key:
                    self.provider = GroqProvider(
                        api_key=effective_groq_key,
                        default_model=os.getenv("DEFAULT_MODEL", "openai/gpt-oss-120b"),
                    )
                    self.default_model = getattr(self.provider, "default_model", "openai/gpt-oss-120b")
                    self.provider_name = "groq"
                else:
                    raise ValueError("GROQ_API_KEY is not set. Please create a .env file or pass api_key.")
        else:
            self.provider = GroqProvider(
                api_key=effective_groq_key,
                default_model=default_model or os.getenv("DEFAULT_MODEL", "openai/gpt-oss-120b"),
            )
            self.default_model = getattr(self.provider, "default_model", "openai/gpt-oss-120b")
            self.provider_name = "groq"
        self.secondary_provider: Optional[BaseLLMProvider] = None
        if self.provider_name == "gemini" and effective_groq_key:
            try:
                self.secondary_provider = GroqProvider(api_key=effective_groq_key)
            except Exception:
                pass

    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate estimated cost in USD."""
        if hasattr(self.provider, "_calculate_cost"):
            return self.provider._calculate_cost(model, prompt_tokens, completion_tokens)
        rates = MODEL_PRICING.get(model, {"prompt": 0.50 / 1_000_000, "completion": 0.75 / 1_000_000})
        cost = (prompt_tokens * rates["prompt"]) + (completion_tokens * rates["completion"])
        return round(cost, 6)

    def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> LLMResponse[None]:
        try:
            return self.provider.generate_text(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=model or self.default_model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as e:
            if self.secondary_provider:
                return self.secondary_provider.generate_text(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
            raise e

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
        try:
            return self.provider.generate_structured(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                response_model=response_model,
                model=model or self.default_model,
                temperature=temperature,
                max_tokens=max_tokens,
                max_validation_retries=max_validation_retries,
            )
        except Exception as e:
            if self.secondary_provider:
                return self.secondary_provider.generate_structured(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    response_model=response_model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    max_validation_retries=max_validation_retries,
                )
            raise e


# Alias LLMProvider to LLMGateway for clean architectural naming
LLMProvider = LLMGateway
