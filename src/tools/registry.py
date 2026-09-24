"""
Central Tool Registry.
Registers, resolves, and manages all executable tools available to autonomous agents.
"""

from typing import Dict, List, Optional, Any
from src.tools.base import BaseTool, ToolResult
from src.tools.search import WebSearchTool
from src.tools.scraper import WebScraperTool


class ToolRegistry:
    """Registry maintaining available tools for agent invocation."""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        # Register standard default tools
        self.register(WebSearchTool())
        self.register(WebScraperTool())

    def register(self, tool: BaseTool):
        """Registers a tool instance by its name."""
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[BaseTool]:
        """Retrieves a registered tool by name."""
        return self._tools.get(name)

    def list_tools(self) -> List[Dict[str, str]]:
        """Returns descriptions of all registered tools."""
        return [
            {"name": tool.name, "description": tool.description}
            for tool in self._tools.values()
        ]

    def execute(self, name: str, **kwargs) -> ToolResult:
        """Executes a tool by name with keyword arguments."""
        tool = self.get(name)
        if not tool:
            return ToolResult(
                success=False,
                error=f"Tool '{name}' is not registered in the ToolRegistry.",
            )
        return tool.execute(**kwargs)


# Global default instance
default_tool_registry = ToolRegistry()
