"""
Google Gemini LLM Provider.
Integrates with the official google-genai SDK for Gemini 3.5 Flash, Gemini 3 Flash,
Gemini 3.5 Flash Lite, and Gemini 3.6 Flash.
Supports native structured outputs, automatic instant model failover when a model is busy/overloaded,
and comprehensive token/cost telemetry.
"""

import os
import json
import time
import re
import logging
from typing import Type, TypeVar, Optional, Dict, Any, List, Callable, Tuple
from pydantic import BaseModel, ValidationError
from dotenv import load_dotenv

from google import genai
from google.genai import types
from google.genai.errors import APIError

from src.llm.base import BaseLLMProvider, LLMResponse

load_dotenv()
logger = logging.getLogger("triadflow.llm.gemini")

T = TypeVar("T", bound=BaseModel)

# Supported official Google Gemini models (empirically tested and active)
SUPPORTED_GEMINI_MODELS: List[str] = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
]

# Gemini Official Rates per million tokens
GEMINI_PRICING: Dict[str, Dict[str, float]] = {
    "gemini-3.5-flash": {
        "prompt": 0.075 / 1_000_000,
        "completion": 0.30 / 1_000_000,
    },
    "gemini-3.1-pro-preview": {
        "prompt": 1.25 / 1_000_000,
        "completion": 5.00 / 1_000_000,
    },
    "gemini-3-flash-preview": {
        "prompt": 0.075 / 1_000_000,
        "completion": 0.30 / 1_000_000,
    },
    "gemini-3.5-flash-lite": {
        "prompt": 0.05 / 1_000_000,
        "completion": 0.20 / 1_000_000,
    },
    "gemini-3.6-flash": {
        "prompt": 0.075 / 1_000_000,
        "completion": 0.30 / 1_000_000,
    },
    # Historical aliases for telemetry calculation
    "gemini-flash-lite-latest": {
        "prompt": 0.05 / 1_000_000,
        "completion": 0.20 / 1_000_000,
    },
    "gemini-2.5-pro": {
        "prompt": 1.25 / 1_000_000,
        "completion": 5.00 / 1_000_000,
    },
}

DEFAULT_GEMINI_PRICING = {"prompt": 0.075 / 1_000_000, "completion": 0.30 / 1_000_000}

# Global listeners for model failover events
_MODEL_SWITCH_LISTENERS: List[Callable[[str, str, str], None]] = []


def register_model_switch_listener(callback: Callable[[str, str, str], None]) -> None:
    """Registers a callback(old_model, new_model, reason) called whenever a model failover occurs."""
    if callback not in _MODEL_SWITCH_LISTENERS:
        _MODEL_SWITCH_LISTENERS.append(callback)


def unregister_model_switch_listener(callback: Callable[[str, str, str], None]) -> None:
    """Removes a registered model switch listener callback."""
    if callback in _MODEL_SWITCH_LISTENERS:
        _MODEL_SWITCH_LISTENERS.remove(callback)


def normalize_gemini_model(model_name: Optional[str]) -> str:
    """
    Normalizes any requested model identifier to an active, supported Gemini model.
    Maps legacy/deprecated names to verified active Gemini models.
    """
    if not model_name:
        return "gemini-3.5-flash"
    m = model_name.lower().strip()
    if "3.5-flash-lite" in m or "2.0-flash-lite" in m or "flash-lite" in m or "lite" in m:
        return "gemini-3.5-flash-lite"
    if "3.6-flash" in m or "3.6" in m:
        return "gemini-3.6-flash"
    if "3-flash" in m or "preview" in m:
        return "gemini-3-flash-preview"
    if "3.5-flash" in m or "2.5-flash" in m or "2.0-flash" in m or "1.5-flash" in m:
        return "gemini-3.5-flash"
    if "pro" in m:
        return "gemini-3.5-flash"
    return "gemini-3.5-flash"


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini Provider for text generation, native JSON structured schema enforcement,
    automatic model failover when busy or rate-limited, and token/cost telemetry.
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
        self.client = genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(
                api_version="v1beta",
                retry_options=types.HttpRetryOptions(attempts=1),
                timeout=25000,
            ),
        )
        self.default_model = normalize_gemini_model(
            default_model or os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"
        )

    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate estimated cost in USD based on Gemini pricing."""
        rates = GEMINI_PRICING.get(model, DEFAULT_GEMINI_PRICING)
        cost = (prompt_tokens * rates["prompt"]) + (completion_tokens * rates["completion"])
        return round(cost, 6)

    def _call_with_retry(
        self,
        model: str,
        contents: Any,
        config: types.GenerateContentConfig,
    ) -> Tuple[types.GenerateContentResponse, str]:
        """
        Executes model call with automatic, instant failover to other available Gemini models
        whenever a model is busy (429, 503, high demand, resource exhausted), unavailable (500, 502, 504),
        or unsupported/not found (404, 400).
        Returns a tuple of (response, actual_model_used).
        """
        primary_model = normalize_gemini_model(model or self.default_model)

        # Build prioritized candidate list: primary model first, then remaining supported models
        candidate_models: List[str] = [primary_model]
        for fallback in SUPPORTED_GEMINI_MODELS:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        last_error = None
        for idx, current_model in enumerate(candidate_models):
            try:
                response = self.client.models.generate_content(
                    model=current_model,
                    contents=contents,
                    config=config,
                )
                if current_model != primary_model:
                    reason_msg = f"Primary model '{primary_model}' was busy or unavailable."
                    logger.info(
                        f"[GeminiProvider] ⚡ Automatically switched to '{current_model}' ({reason_msg})"
                    )
                    self.default_model = current_model
                    for listener in list(_MODEL_SWITCH_LISTENERS):
                        try:
                            listener(primary_model, current_model, reason_msg)
                        except Exception:
                            pass
                return response, current_model

            except Exception as err:
                last_error = err
                status_code = getattr(err, "code", None) or getattr(err, "status_code", None)
                err_str = str(err).lower()

                # If the error is schema-related for this specific model, retry once without response_schema
                if getattr(config, "response_schema", None) and (
                    "schema" in err_str or status_code == 400
                ):
                    try:
                        fallback_config = types.GenerateContentConfig(
                            system_instruction=config.system_instruction,
                            temperature=config.temperature,
                            max_output_tokens=config.max_output_tokens,
                            response_mime_type="application/json",
                        )
                        response = self.client.models.generate_content(
                            model=current_model,
                            contents=contents,
                            config=fallback_config,
                        )
                        return response, current_model
                    except Exception as inner_err:
                        last_error = inner_err
                        err_str = str(inner_err).lower()

                # Identify if model is busy, overloaded, rate-limited, or not found
                is_busy = (
                    status_code in (429, 500, 502, 503, 504)
                    or "429" in err_str
                    or "503" in err_str
                    or "500" in err_str
                    or "resource_exhausted" in err_str
                    or "resource exhausted" in err_str
                    or "quota" in err_str
                    or "rate limit" in err_str
                    or "rate_limit" in err_str
                    or "rate-limit" in err_str
                    or "overloaded" in err_str
                    or "high demand" in err_str
                    or "unavailable" in err_str
                    or "busy" in err_str
                    or "timeout" in err_str
                    or "deadline" in err_str
                )
                is_not_found = (
                    status_code == 404
                    or "404" in err_str
                    or "not_found" in err_str
                    or "not found" in err_str
                    or "not supported" in err_str
                    or "unsupported" in err_str
                    or "is not found for api version" in err_str
                    or "no longer available" in err_str
                    or "is no longer available" in err_str
                )

                fail_reason = (
                    "Model is busy / rate-limited"
                    if is_busy
                    else ("Model not found / unsupported" if is_not_found else "API request error")
                )

                # Determine next candidate model for logging/telemetry
                next_model = (
                    candidate_models[idx + 1] if idx + 1 < len(candidate_models) else None
                )
                if next_model:
                    logger.warning(
                        f"[GeminiProvider] ⚠️ Model '{current_model}' encountered error ({fail_reason}: {err}). "
                        f"Automatically changing to '{next_model}'..."
                    )
                    for listener in list(_MODEL_SWITCH_LISTENERS):
                        try:
                            listener(
                                current_model,
                                next_model,
                                f"{fail_reason}: {type(err).__name__}",
                            )
                        except Exception:
                            pass
                else:
                    logger.error(
                        f"[GeminiProvider] All candidate models exhausted. Last error on '{current_model}': {err}"
                    )

                # Instant failover to the next model in the pool without hanging
                continue

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
        """Executes a standard conversational or textual Gemini call with auto-model-failover."""
        selected_model = normalize_gemini_model(model or self.default_model)

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        start_time = time.perf_counter()
        response, actual_model = self._call_with_retry(
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

        cost = self._calculate_cost(actual_model, prompt_tokens, completion_tokens)
        raw_text = response.text or ""

        return LLMResponse(
            raw_content=raw_text,
            parsed=None,
            model=actual_model,
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
        max_validation_retries: int = 1,
    ) -> LLMResponse[T]:
        """
        Executes a call and guarantees output matches the given Pydantic response_model.
        Uses native JSON schema enforcement with automatic failover to another model on any error
        (API busy, rate limit, timeout, or schema parsing failure).
        """
        primary_model = normalize_gemini_model(model or self.default_model)

        candidate_models: List[str] = [primary_model]
        for fallback in SUPPORTED_GEMINI_MODELS:
            if fallback not in candidate_models:
                candidate_models.append(fallback)

        schema_json = json.dumps(response_model.model_json_schema())
        augmented_system_prompt = (
            f"{system_prompt}\n\n"
            f"Respond ONLY with a valid JSON object adhering strictly to schema: {schema_json}"
        )

        config = types.GenerateContentConfig(
            system_instruction=augmented_system_prompt,
            temperature=temperature,
            max_output_tokens=max_tokens,
            response_mime_type="application/json",
            response_schema=response_model,
        )

        total_prompt_tokens = 0
        total_completion_tokens = 0
        start_time = time.perf_counter()
        last_error: Optional[Exception] = None

        for model_idx, current_model in enumerate(candidate_models):
            current_user_prompt = user_prompt
            actual_model_used = current_model

            for attempt in range(max_validation_retries + 1):
                try:
                    response, actual_model_used = self._call_with_retry(
                        model=current_model,
                        contents=current_user_prompt,
                        config=config,
                    )
                except Exception as api_err:
                    last_error = api_err
                    break

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
                except (ValidationError, json.JSONDecodeError):
                    # Attempt automated closure of truncated JSON if LLM reached max tokens
                    repaired_text = clean_text
                    if not repaired_text.endswith("}"):
                        num_quotes = repaired_text.count('"') - repaired_text.count(r'\"')
                        if num_quotes % 2 != 0:
                            repaired_text += '"'
                        open_brackets = repaired_text.count("[") - repaired_text.count("]")
                        if open_brackets > 0:
                            repaired_text += "]" * open_brackets
                        open_braces = repaired_text.count("{") - repaired_text.count("}")
                        if open_braces > 0:
                            repaired_text += "}" * open_braces
                    try:
                        parsed_obj = response_model.model_validate_json(repaired_text)
                    except Exception:
                        parsed_obj = None

                if parsed_obj is not None:
                    latency = time.perf_counter() - start_time
                    cost = self._calculate_cost(
                        actual_model_used, total_prompt_tokens, total_completion_tokens
                    )
                    if actual_model_used != primary_model:
                        self.default_model = actual_model_used

                    return LLMResponse[T](
                        raw_content=raw_text,
                        parsed=parsed_obj,
                        model=actual_model_used,
                        prompt_tokens=total_prompt_tokens,
                        completion_tokens=total_completion_tokens,
                        total_tokens=total_prompt_tokens + total_completion_tokens,
                        latency_seconds=round(latency, 3),
                        estimated_cost_usd=cost,
                    )
                else:
                    # Raise validation error to trigger retry or model failover
                    try:
                        response_model.model_validate_json(clean_text)
                    except (ValidationError, json.JSONDecodeError) as val_err:
                        last_error = val_err
                        if attempt < max_validation_retries:
                            current_user_prompt = (
                                f"{user_prompt}\n\n"
                                f"Your previous response failed JSON schema validation:\n"
                                f"{str(val_err)}\n\n"
                                f"Previous output:\n{raw_text}\n\n"
                                "Please correct the JSON and return the valid JSON object strictly matching the schema."
                            )
                        else:
                            next_model = (
                                candidate_models[model_idx + 1]
                                if model_idx + 1 < len(candidate_models)
                                else None
                            )
                            if next_model:
                                reason_msg = f"Model '{current_model}' failed schema validation ({type(val_err).__name__}). Switching to '{next_model}'..."
                                logger.warning(f"[GeminiProvider] ⚠️ {reason_msg}")
                                for listener in list(_MODEL_SWITCH_LISTENERS):
                                    try:
                                        listener(current_model, next_model, reason_msg)
                                    except Exception:
                                        pass
                            break

        raise ValueError(
            f"Failed to produce valid {response_model.__name__} after exhausting candidate models: {last_error}"
        )
