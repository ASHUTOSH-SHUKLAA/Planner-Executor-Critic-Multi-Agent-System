"""
Base LLM Provider Abstraction.
Decouples agent logic (Planner, Executor, Critic, Synthesizer) from specific LLM vendors.
Supports Google Gemini, Groq, or future enterprise providers without agent refactoring.
"""

from abc import ABC, abstractmethod
from typing import Type, TypeVar, Optional, Generic, Dict, Any, List
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMResponse(BaseModel, Generic[T]):
    """Standardized response from any LLM provider with telemetry metadata."""
    raw_content: str
    parsed: Optional[T] = None
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_seconds: float = 0.0
    estimated_cost_usd: float = 0.0


class BaseLLMProvider(ABC):
    """Abstract interface that all LLM backends must implement."""

    @abstractmethod
    def generate_text(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2048,
    ) -> LLMResponse[None]:
        """Generate unstructured conversational or technical text."""
        pass

    @abstractmethod
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
        """Generate text guaranteed to validate against the provided Pydantic model schema."""
        pass
