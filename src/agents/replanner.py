"""
Re-planner Agent: Adapts and restructures execution plans when steps fail repeatedly.
Preserves completed steps, analyzes failure reasons, and rewires the remaining DAG.
"""

from typing import Optional, List, Dict
from rich.console import Console

from src.models.schemas import (
    Plan,
    PlanStep,
    StepStatus,
    WorkflowState,
    WorkflowStatus,
)
from src.llm.client import LLMGateway, LLMResponse

console = Console()

REPLANNER_SYSTEM_PROMPT = """You are an expert Strategic Re-planning and Failure Recovery Specialist.
An ongoing multi-agent workflow encountered repeated failures on a specific step and could not proceed.
Your objective is to revise the execution plan so the workflow can recover and successfully achieve the original user goal.

### RE-PLANNING PRINCIPLES:
1. **PRESERVE COMPLETED STEPS**:
   - Any step that has already PASSED with validated output MUST remain in the plan.
   - Do NOT modify or remove completed steps.
2. **DIAGNOSE THE ROOT CAUSE**:
   - Analyze the Critic's rejection critiques and suggested fixes.
   - Understand why the Executor failed (e.g., step was too broad, requested impossible data, or had conflicting requirements).
3. **RESTRUCTURE REMAINING STEPS**:
   - Replace or break down the failed step into simpler, more specific sub-steps, or propose an alternative path to the goal.
   - Ensure subsequent dependent steps point to valid step_ids.
4. **VALID DIRECTED ACYCLIC GRAPH (DAG)**:
   - All step_ids must be unique.
   - Dependencies must refer only to known steps (either already completed or newly added).
   - No circular dependencies.

### OUTPUT REQUIREMENT:
You must output a valid JSON object strictly complying with the Plan schema.
"""


class ReplannerAgent:
    """
    Agent responsible for dynamic plan adaptation following repeated step failures.
    """

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        model: Optional[str] = None,
    ):
        self.gateway = gateway or LLMGateway()
        self.model = model or getattr(self.gateway, "default_model", "gemini-3.6-flash")

    def build_replan_context(
        self,
        state: WorkflowState,
        failed_step_id: str,
    ) -> str:
        """
        Gathers complete context of what succeeded and what failed for the Re-planner.
        """
        # Completed steps summary
        completed_lines: List[str] = []
        for step in state.plan.steps:
            if step.status == StepStatus.PASSED:
                out = state.step_outputs.get(step.step_id)
                findings = ", ".join(out.key_findings[:2]) if out and out.key_findings else "Completed"
                completed_lines.append(f"- {step.step_id} ({step.title}): {findings}")

        completed_str = "\n".join(completed_lines) if completed_lines else "None yet."

        # Failed step details
        failed_step = next((s for s in state.plan.steps if s.step_id == failed_step_id), None)
        failed_title = failed_step.title if failed_step else failed_step_id
        failed_desc = failed_step.description if failed_step else "N/A"

        # Rejection history
        reviews = state.critic_reviews.get(failed_step_id, [])
        critique_history: List[str] = []
        for idx, rev in enumerate(reviews, 1):
            fixes = "; ".join(rev.suggested_fixes) if rev.suggested_fixes else "None provided"
            critique_history.append(
                f"Attempt {idx} (Correctness: {rev.correctness_score:.2f}):\n"
                f"  Critique: {rev.critique}\n"
                f"  Fixes: {fixes}"
            )

        critique_str = "\n".join(critique_history) if critique_history else "Repeated execution failures."

        return (
            f"### COMPLETED STEPS (DO NOT CHANGE THESE):\n{completed_str}\n\n"
            f"### FAILED STEP ENCOUNTERED:\n"
            f"Step ID: {failed_step_id}\n"
            f"Title: {failed_title}\n"
            f"Description: {failed_desc}\n\n"
            f"### CRITIC REJECTION HISTORY:\n{critique_str}\n"
        )

    def replan(
        self,
        state: WorkflowState,
        failed_step_id: str,
    ) -> LLMResponse[Plan]:
        """
        Generates an adapted, restructured Plan to recover from the failure.
        """
        replan_context = self.build_replan_context(state, failed_step_id)

        user_prompt = (
            f"### ORIGINAL OVERALL TASK:\n{state.task}\n\n"
            f"### CURRENT PLAN RATIONALE:\n{state.plan.rationale}\n\n"
            f"{replan_context}\n"
            "### RE-PLANNING INSTRUCTION:\n"
            "Produce an updated plan that keeps the already-completed steps intact, "
            "remedies the blocker by restructuring or replacing the failed step and remaining steps, "
            "and ensures the user task can be successfully completed."
        )

        response: LLMResponse[Plan] = self.gateway.generate_structured(
            system_prompt=REPLANNER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=Plan,
            model=self.model,
            temperature=0.1,
        )

        return response

    def replan_workflow(
        self,
        state: WorkflowState,
        failed_step_id: str,
    ) -> WorkflowState:
        """
        Updates the WorkflowState with the new adapted plan, preserving completed step outputs.
        """
        state.status = WorkflowStatus.REPLANNING

        # Archive old plan ID into history
        if state.plan:
            state.replan_history.append(f"plan_v_{len(state.replan_history)+1}:{state.plan.plan_id}")

        response = self.replan(state, failed_step_id)
        new_plan: Plan = response.parsed

        # Ensure previously completed steps maintain PASSED status in the new plan
        for step in new_plan.steps:
            if step.step_id in state.step_outputs:
                step.status = StepStatus.PASSED

        state.plan = new_plan
        state.status = WorkflowStatus.PLAN_READY
        state.total_tokens += response.total_tokens
        state.estimated_cost_usd += response.estimated_cost_usd

        return state
