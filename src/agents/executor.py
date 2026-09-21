"""
Executor Agent: Executes individual steps from the Plan.
Features scoped dependency injection (context filtering), structured StepOutput production,
and critique-guided self-correction support.
"""

from typing import Optional, Dict, List
import time
from rich.console import Console

from src.models.schemas import (
    PlanStep,
    StepOutput,
    StepStatus,
    WorkflowState,
)
from src.llm.client import LLMGateway, LLMResponse

console = Console()

EXECUTOR_SYSTEM_PROMPT = """You are an expert Autonomous Execution Specialist.
Your role is to execute a specific atomic step from a broader project workflow with precision, depth, and factual rigor.

### EXECUTION GUIDELINES:
1. **Focus Strictly on the Objective**: Accomplish the exact task described in the step objective. Do not wander into out-of-scope topics.
2. **Utilize Dependency Context**: If outputs from preceding dependent steps are provided, incorporate their findings and build directly on top of them.
3. **Handle Critic Feedback**: If feedback from a previous rejected attempt is provided, directly address and correct the identified issues.
4. **Structured Deliverable**:
   - Provide comprehensive, clear, and well-structured `content`.
   - Distill the most critical facts, numbers, or conclusions into explicit `key_findings`.

### OUTPUT REQUIREMENT:
You must output a valid JSON object strictly complying with the StepOutput schema.
"""


class ExecutorAgent:
    """
    Agent responsible for executing individual plan steps.
    Enforces scoped context injection to prevent token waste and context pollution.
    """

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        model: Optional[str] = None,
    ):
        self.gateway = gateway or LLMGateway()
        # Default to the gateway's configured model (or fallback if mocked)
        self.model = model or getattr(self.gateway, "default_model", "openai/gpt-oss-120b")

    def build_dependency_context(
        self,
        step: PlanStep,
        state: WorkflowState,
    ) -> str:
        """
        Extracts ONLY the outputs of steps explicitly declared in step.dependencies.
        Prevents prompt bloat and context distraction by filtering out unrelated steps.
        """
        if not step.dependencies:
            return "No preceding dependencies required for this step. Execute independently."

        context_blocks: List[str] = []
        for dep_id in step.dependencies:
            dep_output = state.step_outputs.get(dep_id)
            if dep_output:
                # Find matching step title for clearer context
                step_title = dep_id
                if state.plan:
                    for s in state.plan.steps:
                        if s.step_id == dep_id:
                            step_title = s.title
                            break

                findings_str = ""
                if dep_output.key_findings:
                    findings_str = "\nKey Findings:\n" + "\n".join(
                        f"  - {f}" for f in dep_output.key_findings
                    )

                context_blocks.append(
                    f"--- OUTPUT FROM COMPLETED STEP: {dep_id} ({step_title}) ---\n"
                    f"{dep_output.content}\n"
                    f"{findings_str}"
                )
            else:
                context_blocks.append(
                    f"--- OUTPUT FROM COMPLETED STEP: {dep_id} ---\n[Output not available in state]"
                )

        return "\n\n".join(context_blocks)

    def execute_step(
        self,
        step: PlanStep,
        state: WorkflowState,
        critic_feedback: Optional[str] = None,
    ) -> LLMResponse[StepOutput]:
        """
        Executes a single plan step using scoped dependency context and optional critic feedback.

        Args:
            step: The specific PlanStep to execute.
            state: The shared WorkflowState (used to pull dependency outputs).
            critic_feedback: Optional critique/instructions if this step is being retried.

        Returns:
            LLMResponse containing the validated StepOutput.
        """
        # 1. Isolate relevant context
        dependency_context = self.build_dependency_context(step, state)

        # 2. Construct targeted prompt
        user_prompt = (
            f"### OVERALL WORKFLOW OBJECTIVE:\n{state.task}\n\n"
            f"### CURRENT STEP TO EXECUTE:\n"
            f"Step ID: {step.step_id}\n"
            f"Title: {step.title}\n"
            f"Objective: {step.description}\n\n"
            f"### PRECEDING STEP CONTEXT (DEPENDENCIES):\n{dependency_context}\n"
        )

        if critic_feedback:
            user_prompt += (
                f"\n### CRITIC FEEDBACK FROM PREVIOUS REJECTION (FIX THESE ISSUES):\n"
                f"{critic_feedback}\n"
            )

        user_prompt += (
            "\nExecute this step thoroughly. Produce rich, substantive content and "
            "extract the key actionable findings."
        )

        start_time = time.perf_counter()

        # 3. Call LLM with strict StepOutput schema
        response: LLMResponse[StepOutput] = self.gateway.generate_structured(
            system_prompt=EXECUTOR_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=StepOutput,
            model=self.model,
            temperature=0.2,
        )

        duration = time.perf_counter() - start_time

        # Ensure step_id and execution telemetry are correctly populated
        if response.parsed:
            response.parsed.step_id = step.step_id
            response.parsed.execution_time_seconds = round(duration, 3)
            response.parsed.tokens_used = response.total_tokens

        return response

    def execute_workflow_step(
        self,
        step_id: str,
        state: WorkflowState,
        critic_feedback: Optional[str] = None,
    ) -> WorkflowState:
        """
        Convenience method to execute a specific step in the workflow and record its result.
        """
        if not state.plan:
            raise ValueError("Cannot execute step: Workflow has no plan.")

        target_step = next((s for s in state.plan.steps if s.step_id == step_id), None)
        if not target_step:
            raise ValueError(f"Step '{step_id}' not found in the workflow plan.")

        target_step.status = StepStatus.IN_PROGRESS

        try:
            response = self.execute_step(
                step=target_step,
                state=state,
                critic_feedback=critic_feedback,
            )

            # Store the output in shared state
            state.step_outputs[step_id] = response.parsed
            target_step.status = StepStatus.IN_PROGRESS  # Awaits Critic review
            state.total_tokens += response.total_tokens
            state.estimated_cost_usd += response.estimated_cost_usd

        except Exception as e:
            target_step.status = StepStatus.FAILED
            raise e

        return state
