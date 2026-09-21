"""
Critic Agent: The Quality Gatekeeper of the multi-agent system.
Audits Executor outputs against Correctness, Completeness, and Relevance.
Emits PASS / REJECT verdicts with actionable, structured feedback.
"""

from typing import Optional, List, Dict
import time
from rich.console import Console

from src.models.schemas import (
    PlanStep,
    StepOutput,
    CriticReview,
    CriticDecision,
    StepStatus,
    WorkflowState,
)
from src.llm.client import LLMGateway, LLMResponse

console = Console()

CRITIC_SYSTEM_PROMPT = """You are an exacting, rigorous Quality Assurance Auditor and Fact-Checking Critic.
Your mission is to rigorously evaluate an Executor's output for an assigned workflow step before it can propagate downstream.

### EVALUATION RUBRIC (Score 0.0 to 1.0):
1. **Correctness (0.0 - 1.0)**:
   - Are the factual claims, logic, technical assertions, and mathematical statements completely accurate?
   - Is there any hallucination, false assumption, or inverted reasoning?
2. **Completeness (0.0 - 1.0)**:
   - Did the Executor address every specific sub-question and objective stated in the step description?
   - Are the extracted `key_findings` genuinely informative and supported by the text?
3. **Relevance (0.0 - 1.0)**:
   - Is the content directly focused on the step objective, or is it padded with filler or tangential digressions?

### DECISION CRITERIA:
- **PASS**: Only emit PASS if Correctness, Completeness, and Relevance all meet high quality standards (typically >= 0.70 each) and there are NO serious factual errors or critical omissions.
- **REJECT**: Emit REJECT if there are any factual falsehoods, severe logical flaws, significant omissions, or if the output fails to solve the step objective.

### FEEDBACK REQUIREMENT:
If you REJECT the output, you MUST provide:
- A crystal-clear `critique` explaining exactly where and why the output failed.
- A list of actionable `suggested_fixes` describing what the Executor must correct upon retry.

You must output a valid JSON object strictly complying with the CriticReview schema.
"""


class CriticAgent:
    """
    Agent responsible for reviewing and gating step outputs.
    Ensures incorrect, incomplete, or hallucinated results never propagate.
    """

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        model: Optional[str] = None,
        pass_threshold: float = 0.70,
    ):
        self.gateway = gateway or LLMGateway()
        # The Critic should use the most capable reasoning model available
        self.model = model or getattr(self.gateway, "default_model", "openai/gpt-oss-120b")
        self.pass_threshold = pass_threshold

    def evaluate_output(
        self,
        step: PlanStep,
        output: StepOutput,
        task_objective: str,
        dependency_context: Optional[str] = None,
    ) -> LLMResponse[CriticReview]:
        """
        Audits a step's output and produces a structured CriticReview.

        Args:
            step: The PlanStep that was supposed to be executed.
            output: The StepOutput produced by the Executor.
            task_objective: The overall task of the workflow.
            dependency_context: Optional outputs from preceding steps that this step had access to.

        Returns:
            LLMResponse containing the validated CriticReview.
        """
        user_prompt = (
            f"### OVERALL TASK OBJECTIVE:\n{task_objective}\n\n"
            f"### STEP OBJECTIVE TO AUDIT:\n"
            f"Step ID: {step.step_id}\n"
            f"Title: {step.title}\n"
            f"Description: {step.description}\n\n"
        )

        if dependency_context:
            user_prompt += (
                f"### CONTEXT AVAILABLE TO EXECUTOR (DEPENDENCIES):\n"
                f"{dependency_context}\n\n"
            )

        findings_text = "\n".join(f"- {f}" for f in output.key_findings) if output.key_findings else "None provided"

        user_prompt += (
            f"### EXECUTOR SUBMITTED DELIVERABLE:\n"
            f"Content:\n{output.content}\n\n"
            f"Key Findings:\n{findings_text}\n\n"
            f"### YOUR AUDIT INSTRUCTIONS:\n"
            f"Evaluate the deliverable against Correctness, Completeness, and Relevance. "
            f"Determine whether it earns a PASS or REJECT verdict. If any dimension is below "
            f"{self.pass_threshold} or contains significant errors, you must REJECT it and explain why."
        )

        response: LLMResponse[CriticReview] = self.gateway.generate_structured(
            system_prompt=CRITIC_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=CriticReview,
            model=self.model,
            temperature=0.1,  # Low temperature for objective, deterministic evaluation
        )

        if response.parsed:
            response.parsed.step_id = step.step_id

            # Enforce deterministic gate check: if any score is below threshold, force REJECT
            min_score = min(
                response.parsed.correctness_score,
                response.parsed.completeness_score,
                response.parsed.relevance_score,
            )
            if min_score < self.pass_threshold and response.parsed.decision == CriticDecision.PASS:
                response.parsed.decision = CriticDecision.REJECT
                if not response.parsed.suggested_fixes:
                    response.parsed.suggested_fixes.append(
                        f"Overall score did not meet minimum threshold ({min_score:.2f} < {self.pass_threshold:.2f})."
                    )

        return response

    def evaluate_workflow_step(
        self,
        step_id: str,
        state: WorkflowState,
        dependency_context: Optional[str] = None,
    ) -> WorkflowState:
        """
        Audits a step directly within the central WorkflowState, recording the review
        and updating the step's lifecycle status.
        """
        if not state.plan:
            raise ValueError("Cannot evaluate step: Workflow has no plan.")

        target_step = next((s for s in state.plan.steps if s.step_id == step_id), None)
        if not target_step:
            raise ValueError(f"Step '{step_id}' not found in the workflow plan.")

        step_output = state.step_outputs.get(step_id)
        if not step_output:
            raise ValueError(f"No output found in state for step '{step_id}' to evaluate.")

        response = self.evaluate_output(
            step=target_step,
            output=step_output,
            task_objective=state.task,
            dependency_context=dependency_context,
        )

        review: CriticReview = response.parsed

        # Append to review history for this step
        if step_id not in state.critic_reviews:
            state.critic_reviews[step_id] = []
        state.critic_reviews[step_id].append(review)

        # Update step lifecycle status based on Critic verdict
        if review.decision == CriticDecision.PASS:
            target_step.status = StepStatus.PASSED
        else:
            target_step.status = StepStatus.FAILED  # Marked for retry or re-planning

        # Track telemetry
        state.total_tokens += response.total_tokens
        state.estimated_cost_usd += response.estimated_cost_usd

        return state
