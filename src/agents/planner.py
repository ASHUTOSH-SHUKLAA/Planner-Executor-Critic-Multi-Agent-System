"""
Planner Agent: Decomposes complex user tasks into a structured Directed Acyclic Graph (DAG) of steps.
Guarantees dependency validation and schema compliance via Pydantic.
"""

from typing import Optional, Dict, Any
from rich.console import Console

from src.models.schemas import Plan, WorkflowState, WorkflowStatus
from src.llm.client import LLMGateway, LLMResponse

console = Console()

PLANNER_SYSTEM_PROMPT = """You are an expert Chief Systems Architect and Strategic Task Decomposition Specialist.
Your job is to take a complex user objective and break it down into an optimal, highly-structured execution plan (a Directed Acyclic Graph - DAG).

### DECOMPOSITION PRINCIPLES:
1. **Atomic & Actionable**: Every step must have a clear, concrete objective with a verifiable deliverable.
2. **Identify Concurrency (Parallelism)**:
   - Identify which steps are independent of each other (e.g., researching two different subtopics simultaneously).
   - Independent steps MUST have an empty dependency list: `dependencies: []`.
3. **Explicit Data Flow**:
   - If a step requires analysis, synthesis, or comparison of previous steps, it MUST list those exact `step_id`s in its `dependencies`.
   - Never invent dependencies that do not exist.
   - Never create circular dependencies (A depends on B, B depends on A).
4. **Optimal Granularity**:
   - Avoid creating too few steps (e.g., 1 giant step that does everything).
   - Avoid creating too many trivial steps (e.g., 10 one-sentence tasks).
   - Typically, 3 to 6 well-scoped steps provide the ideal balance.
5. **Always End with Synthesis / Decision**:
   - The final step should synthesize findings, draw conclusions, or produce the requested final deliverable.

### OUTPUT REQUIREMENT:
You must output a valid JSON object strictly complying with the provided Plan schema.
"""


class PlannerAgent:
    """
    Agent responsible for analyzing tasks and generating structured execution plans.
    """

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        model: Optional[str] = None,
    ):
        self.gateway = gateway or LLMGateway()
        self.model = model or self.gateway.default_model

    def create_plan(
        self,
        task: str,
        context: Optional[str] = None,
    ) -> LLMResponse[Plan]:
        """
        Takes a natural-language task and produces a fully validated Plan object.

        Args:
            task: The user's input objective or question.
            context: Optional background information, user constraints, or domain rules.

        Returns:
            LLMResponse containing the validated Plan and execution telemetry (tokens, cost, latency).
        """
        user_prompt = f"### USER TASK TO DECOMPOSE:\n{task}\n"
        if context:
            user_prompt += f"\n### ADDITIONAL CONSTRAINTS & CONTEXT:\n{context}\n"

        user_prompt += (
            "\nGenerate a comprehensive, dependency-aware plan with clear step_ids (e.g., 'step_1', 'step_2'), "
            "actionable titles, detailed descriptions, and explicit dependencies."
        )

        response: LLMResponse[Plan] = self.gateway.generate_structured(
            system_prompt=PLANNER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=Plan,
            model=self.model,
            temperature=0.1,  # Low temperature for deterministic, logical planning
        )

        return response

    def plan_workflow(self, state: WorkflowState) -> WorkflowState:
        """
        Convenience method to execute planning directly on a WorkflowState object,
        transitioning its status and updating cost/token telemetry.
        """
        state.status = WorkflowStatus.PLANNING
        response = self.create_plan(task=state.task)

        # Update state with the validated plan and telemetry
        state.plan = response.parsed
        state.status = WorkflowStatus.PLAN_READY
        state.total_tokens += response.total_tokens
        state.estimated_cost_usd += response.estimated_cost_usd

        return state
