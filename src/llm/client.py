"""
Central LLM Gateway with Telemetry, Structured Outputs, and Cost Tracking.
Interfaces with Groq models (Llama 3.3 70B, Llama 3.1 8B, etc.).
"""

import os
import json
import time
from typing import Type, TypeVar, Optional, Generic, Dict, Any
from pydantic import BaseModel, ValidationError
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

T = TypeVar("T", bound=BaseModel)

# Pricing per million tokens (Groq reference rates)
MODEL_PRICING: Dict[str, Dict[str, float]] = {
    "openai/gpt-oss-120b": {
        "prompt": 0.50 / 1_000_000,
        "completion": 0.75 / 1_000_000,
    },
    "openai/gpt-oss-20b": {
        "prompt": 0.15 / 1_000_000,
        "completion": 0.20 / 1_000_000,
    },
    "qwen/qwen3.8-27b": {
        "prompt": 0.20 / 1_000_000,
        "completion": 0.30 / 1_000_000,
    },
    "llama-3.3-70b-versatile": {
        "prompt": 0.59 / 1_000_000,
        "completion": 0.79 / 1_000_000,
    },
    "llama-3.1-8b-instant": {
        "prompt": 0.05 / 1_000_000,
        "completion": 0.08 / 1_000_000,
    },
}

# Default fallback pricing if a new model is used
DEFAULT_PRICING = {"prompt": 0.50 / 1_000_000, "completion": 0.75 / 1_000_000}


class LLMResponse(BaseModel, Generic[T]):
    """Standardized response from the LLM Gateway with telemetry metadata."""
    raw_content: str
    parsed: Optional[T] = None
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_seconds: float = 0.0
    estimated_cost_usd: float = 0.0


class LLMGateway:
    """
    Unified Gateway for all agent LLM calls.
    Provides:
    1. Direct text generation
    2. Enforced structured output (Pydantic models) via JSON mode
    3. Automatic token counting and USD cost calculation
    4. Self-healing retries if the LLM produces invalid JSON
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
    ):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError(
                "GROQ_API_KEY is not set. Please create a .env file or pass api_key."
            )
        self.client = Groq(api_key=self.api_key)
        self.default_model = (
            default_model
            or os.getenv("DEFAULT_MODEL")
            or "openai/gpt-oss-120b"
        )

    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate estimated cost in USD based on model pricing."""
        rates = MODEL_PRICING.get(model, DEFAULT_PRICING)
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
        """Executes a standard conversational or textual LLM call."""
        selected_model = model or self.default_model

        start_time = time.perf_counter()
        completion = self.client.chat.completions.create(
            model=selected_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        latency = time.perf_counter() - start_time

        usage = completion.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0
        total_tokens = usage.total_tokens if usage else 0
        cost = self._calculate_cost(selected_model, prompt_tokens, completion_tokens)
        raw_text = completion.choices[0].message.content or ""

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
        Uses Groq's JSON mode + schema injection + automatic recovery retry.
        """
        selected_model = model or self.default_model

        # Generate the JSON schema of the target Pydantic model
        schema_json = json.dumps(response_model.model_json_schema(), indent=2)

        augmented_system_prompt = (
            f"{system_prompt}\n\n"
            "CRITICAL INSTRUCTION:\n"
            "You MUST respond ONLY with a valid JSON object matching this exact JSON Schema:\n"
            f"```json\n{schema_json}\n```\n"
            "Do NOT include any commentary, greetings, or markdown code fences outside the JSON."
        )

        current_user_prompt = user_prompt
        total_prompt_tokens = 0
        total_completion_tokens = 0
        start_time = time.perf_counter()

        for attempt in range(max_validation_retries + 1):
            completion = self.client.chat.completions.create(
                model=selected_model,
                messages=[
                    {"role": "system", "content": augmented_system_prompt},
                    {"role": "user", "content": current_user_prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )

            usage = completion.usage
            if usage:
                total_prompt_tokens += usage.prompt_tokens
                total_completion_tokens += usage.completion_tokens

            raw_text = completion.choices[0].message.content or "{}"

            try:
                # Attempt to validate the JSON against the Pydantic model
                parsed_obj = response_model.model_validate_json(raw_text)
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

            except ValidationError as val_err:
                # If validation fails, provide feedback to LLM to self-heal
                if attempt < max_validation_retries:
                    current_user_prompt = (
                        f"{user_prompt}\n\n"
                        f"Your previous response failed validation with errors:\n"
                        f"{str(val_err)}\n\n"
                        f"Previous invalid output:\n{raw_text}\n\n"
                        "Please correct the JSON and return the valid JSON object."
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
