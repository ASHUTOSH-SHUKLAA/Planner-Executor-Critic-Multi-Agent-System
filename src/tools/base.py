"""
Base Tool Interface and ToolResult Contracts.
Defines the uniform execution protocol for all agent tools.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class ToolResult(BaseModel):
    """Standardized output produced by any tool execution."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    execution_time_seconds: float = 0.0


class BaseTool(ABC):
    """Abstract base class for all callable tools."""
    name: str
    description: str

    @abstractmethod
    def execute(self, **kwargs) -> ToolResult:
        """Executes the tool with keyword arguments and returns a ToolResult."""
        pass
