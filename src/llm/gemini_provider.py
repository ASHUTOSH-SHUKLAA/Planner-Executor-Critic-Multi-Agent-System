"""
Google Gemini LLM Provider.
Integrates with the official google-genai SDK for Gemini 2.5 Flash, Gemini 2.5 Pro, and Gemini 1.5 Flash.
Supports native structured outputs, robust exponential backoff, and token/cost telemetry.
"""

import os
import json
import time
import re
from typing import Type, TypeVar, Optional, Dict, Any
from pydantic import BaseModel, ValidationError
from dotenv import load_dotenv

from google import genai
from google.genai import types
from google.genai.errors import APIError

from src.llm.base import BaseLLMProvider, LLMResponse

load_dotenv()

T = TypeVar("T", bound=BaseModel)

# Gemini Official Rates per million tokens
GEMINI_PRICING: Dict[str, Dict[str, float]] = {
    "gemini-flash-lite-latest": {
        "prompt": 0.05 / 1_000_000,
        "completion": 0.20 / 1_000_000,
    },
    "gemini-3.5-flash-lite": {
        "prompt": 0.05 / 1_000_000,
        "completion": 0.20 / 1_000_000,
    },
    "gemini-3.6-flash": {
        "prompt": 0.075 / 1_000_000,
        "completion": 0.30 / 1_000_000,
    },
    "gemini-2.5-flash": {
        "prompt": 0.075 / 1_000_000,
        "completion": 0.30 / 1_000_000,
    },
    "gemini-1.5-flash": {
        "prompt": 0.075 / 1_000_000,
        "completion": 0.30 / 1_000_000,
    },
    "gemini-2.5-pro": {
        "prompt": 1.25 / 1_000_000,
        "completion": 5.00 / 1_000_000,
    },
    "gemini-1.5-pro": {
        "prompt": 1.25 / 1_000_000,
        "completion": 5.00 / 1_000_000,
    },
    "llama-3.3-70b-versatile": {
        "prompt": 0.59 / 1_000_000,
        "completion": 0.79 / 1_000_000,
    },
    "llama-3.1-8b-instant": {
        "prompt": 0.05 / 1_000_000,
        "completion": 0.08 / 1_000_000,
    },
    "openai/gpt-oss-120b": {
        "prompt": 0.50 / 1_000_000,
        "completion": 0.75 / 1_000_000,
    },
    "openai/gpt-oss-20b": {
        "prompt": 0.15 / 1_000_000,
        "completion": 0.20 / 1_000_000,
    },
}

DEFAULT_GEMINI_PRICING = {"prompt": 0.05 / 1_000_000, "completion": 0.20 / 1_000_000}


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini Provider for text generation, native JSON structured schema enforcement,
    and token/cost telemetry.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set. Please add GEMINI_API_KEY=your_key to your .env file."
            )
        self.client = genai.Client(api_key=self.api_key)
        self.default_model = (
            default_model
            or os.getenv("GEMINI_MODEL")
            or "gemini-flash-lite-latest"
        )

    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate estimated cost in USD based on Gemini pricing."""
        rates = GEMINI_PRICING.get(model, DEFAULT_GEMINI_PRICING)
        cost = (prompt_tokens * rates["prompt"]) + (completion_tokens * rates["completion"])
        return round(cost, 6)

    def _call_with_retry(self, model: str, contents: str, config: types.GenerateContentConfig):
        """
        Executes model call with exponential backoff on transient errors (500, 503).
        Falls back immediately to active Gemini candidate models if rate-limited (429) or quota exhausted.
        """
        candidate_models = [model]
        for fallback in ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-3.6-flash"]:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        last_error = None
        for current_model in candidate_models:
            max_retries = 2
            base_delay = 1.5
            for attempt in range(max_retries):
                try:
                    return self.client.models.generate_content(
                        model=current_model,
                        contents=contents,
                        config=config,
                    )
                except Exception as err:
                    last_error = err
                    status_code = getattr(err, "code", None) or getattr(err, "status_code", None)
                    err_str = str(err).lower()

                    # If quota exhausted (429) or rate limited, immediately failover to next candidate model
                    if (
                        status_code == 429
                        or "429" in err_str
                        or "resource exhausted" in err_str
                        or "quota" in err_str
                    ):
                        break

                    is_transient = (
                        status_code in (500, 502, 503, 504)
                        or "503" in err_str
                        or "unavailable" in err_str
                        or "high demand" in err_str
                        or "timeout" in err_str
                    )
                    if is_transient and attempt < max_retries - 1:
                        delay = base_delay * (1.8 ** attempt)
                        time.sleep(delay)
                        continue
                    break

        if last_error:
            raise last_error

    def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> LLMResponse[None]:
        """Executes a standard conversational or textual Gemini call."""
        selected_model = model or self.default_model

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        start_time = time.perf_counter()
        response = self._call_with_retry(
            model=selected_model,
            contents=user_prompt,
            config=config,
        )
        latency = time.perf_counter() - start_time

        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        if response.usage_metadata:
            prompt_tokens = response.usage_metadata.prompt_token_count or 0
            completion_tokens = response.usage_metadata.candidates_token_count or 0
            total_tokens = response.usage_metadata.total_token_count or (prompt_tokens + completion_tokens)

        cost = self._calculate_cost(selected_model, prompt_tokens, completion_tokens)
        raw_text = response.text or ""

        return LLMResponse(
            raw_content=raw_text,
            parsed=None,
            model=selected_model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency_seconds=round(latency, 3),
            estimated_cost_usd=cost,
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
        """
        Executes a call and guarantees output matches the given Pydantic response_model.
        Uses native JSON schema enforcement with automatic self-healing retry on validation failure.
        """
        selected_model = model or self.default_model

        # Use native Gemini structured schema if supported, plus prompt guidance
        schema_json = json.dumps(response_model.model_json_schema(), indent=2)
        augmented_system_prompt = (
            f"{system_prompt}\n\n"
            "CRITICAL INSTRUCTION:\n"
            "You MUST respond ONLY with a valid JSON object matching this exact schema:\n"
            f"```json\n{schema_json}\n```\n"
            "Do NOT include any commentary, greetings, or markdown code fences outside the JSON."
        )

        config = types.GenerateContentConfig(
            system_instruction=augmented_system_prompt,
            temperature=temperature,
            max_output_tokens=max_tokens,
            response_mime_type="application/json",
            response_schema=response_model,
        )

        current_user_prompt = user_prompt
        total_prompt_tokens = 0
        total_completion_tokens = 0
        start_time = time.perf_counter()

        for attempt in range(max_validation_retries + 1):
            response = self._call_with_retry(
                model=selected_model,
                contents=current_user_prompt,
                config=config,
            )

            if response.usage_metadata:
                total_prompt_tokens += response.usage_metadata.prompt_token_count or 0
                total_completion_tokens += response.usage_metadata.candidates_token_count or 0

            raw_text = response.text or "{}"

            # Strip markdown fences if present
            clean_text = raw_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            elif clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()

            try:
                parsed_obj = response_model.model_validate_json(clean_text)
                latency = time.perf_counter() - start_time
                cost = self._calculate_cost(
                    selected_model, total_prompt_tokens, total_completion_tokens
                )

                return LLMResponse[T](
                    raw_content=raw_text,
                    parsed=parsed_obj,
                    model=selected_model,
                    prompt_tokens=total_prompt_tokens,
                    completion_tokens=total_completion_tokens,
                    total_tokens=total_prompt_tokens + total_completion_tokens,
                    latency_seconds=round(latency, 3),
                    estimated_cost_usd=cost,
                )

            except (ValidationError, json.JSONDecodeError) as val_err:
                if attempt < max_validation_retries:
                    current_user_prompt = (
                        f"{user_prompt}\n\n"
                        f"Your previous response failed JSON schema validation:\n"
                        f"{str(val_err)}\n\n"
                        f"Previous output:\n{raw_text}\n\n"
                        "Please correct the JSON and return the valid JSON object strictly matching the schema."
                    )
                else:
                    latency = time.perf_counter() - start_time
                    cost = self._calculate_cost(
                        selected_model, total_prompt_tokens, total_completion_tokens
                    )
                    raise ValueError(
                        f"Failed to produce valid {response_model.__name__} after "
                        f"{max_validation_retries + 1} attempts. Last error: {val_err}"
                    )
