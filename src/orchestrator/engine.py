"""
Orchestration Engine: Central State Machine and Workflow Coordinator.
Manages state transitions:
TASK_RECEIVED -> PLANNING -> PLAN_READY -> EXECUTING -> CRITIC_REVIEW -> COMPLETED
Maintains the shared scratchpad across all agent interactions.
"""

from typing import Optional, List, Set, Callable
import time
from rich.console import Console

from src.models.schemas import (
    WorkflowState,
    WorkflowStatus,
    StepStatus,
    PlanStep,
    CriticDecision,
)
from src.agents.planner import PlannerAgent
from src.agents.planner import PlannerAgent
from src.agents.executor import ExecutorAgent
from src.agents.critic import CriticAgent
from src.agents.replanner import ReplannerAgent
from src.llm.client import LLMGateway

console = Console()


class OrchestrationEngine:
    """
    Central coordinator managing workflow execution, failure recovery, and agent handoffs.
    Enforces deterministic state transitions, bounded retries, and dynamic re-planning.
    """

    def __init__(
        self,
        planner: Optional[PlannerAgent] = None,
        executor: Optional[ExecutorAgent] = None,
        critic: Optional[CriticAgent] = None,
        replanner: Optional[ReplannerAgent] = None,
        gateway: Optional[LLMGateway] = None,
        max_step_retries: int = 2,
        max_workflow_replans: int = 2,
        verbose: bool = True,
    ):
        self.gateway = gateway or LLMGateway()
        self.planner = planner or PlannerAgent(gateway=self.gateway)
        self.executor = executor or ExecutorAgent(gateway=self.gateway)
        self.critic = critic or CriticAgent(gateway=self.gateway)
        self.replanner = replanner or ReplannerAgent(gateway=self.gateway)
        self.max_step_retries = max_step_retries
        self.max_workflow_replans = max_workflow_replans
        self.verbose = verbose

    def _log(self, message: str, style: str = "cyan"):
        if self.verbose:
            console.print(f"[{style}]{message}[/{style}]")

    def get_next_executable_step(
        self,
        state: WorkflowState,
        completed_step_ids: Set[str],
    ) -> Optional[PlanStep]:
        """
        Identifies the next pending step whose dependencies are completely satisfied.
        """
        if not state.plan:
            return None

        for step in state.plan.steps:
            if step.status == StepStatus.PENDING:
                # Check if all declared dependencies have been successfully completed
                if all(dep in completed_step_ids for dep in step.dependencies):
                    return step

        return None

    def run(self, task: str) -> WorkflowState:
        """
        Executes a complete workflow from task intake to final completion.

        US-001 Acceptance Criteria:
        - Natural-language task intake.
        - Unique Workflow ID generated.
        - Invalid/empty input rejected gracefully.
        - Passed to Planner.
        """
        # 1. Input Validation (US-001)
        if not task or not task.strip():
            raise ValueError("Task prompt cannot be empty or whitespace only.")

        # 2. State Initialization
        state = WorkflowState(task=task.strip())
        self._log(f"\n[WF: {state.workflow_id}] Initialized with status: {state.status.value}", "bold blue")

        # 3. Planning Phase
        self._log(f"[WF: {state.workflow_id}] Entering PLANNING phase...", "yellow")
        try:
            state = self.planner.plan_workflow(state)
            self._log(
                f"[WF: {state.workflow_id}] Plan generated with {len(state.plan.steps)} steps. "
                f"Status: {state.status.value}",
                "green",
            )
        except Exception as e:
            state.status = WorkflowStatus.FAILED
            self._log(f"[WF: {state.workflow_id}] Planning failed: {e}", "bold red")
            raise e

        # 4. Sequential Execution & Critic Review Loop
        completed_steps: Set[str] = set()
        total_steps = len(state.plan.steps)

        while len(completed_steps) < total_steps:
            step = self.get_next_executable_step(state, completed_steps)
            if not step:
                # If there are still pending steps but none are executable, we have a deadlocked graph
                pending = [s.step_id for s in state.plan.steps if s.status == StepStatus.PENDING]
                if pending:
                    state.status = WorkflowStatus.FAILED
                    raise RuntimeError(
                        f"Workflow deadlock: Pending steps {pending} have unsatisfied dependencies."
                    )
                break

            self._log(f"\n--- [Step: {step.step_id}] {step.title} ---", "bold yellow")

            # A. Execution Phase
            state.status = WorkflowStatus.EXECUTING
            self._log(f"[Step: {step.step_id}] Executing with scoped context...", "cyan")
            state = self.executor.execute_workflow_step(step.step_id, state)

            # B. Critic Review Phase
            state.status = WorkflowStatus.CRITIC_REVIEW
            self._log(f"[Step: {step.step_id}] Critic auditing deliverable...", "magenta")
            
            # Extract dependency context so the Critic can verify continuity
            dep_context = self.executor.build_dependency_context(step, state)
            state = self.critic.evaluate_workflow_step(step.step_id, state, dependency_context=dep_context)

            # Check verdict and handle Bounded Retries
            latest_review = state.critic_reviews[step.step_id][-1]
            while latest_review.decision == CriticDecision.REJECT:
                current_retries = state.retry_counts.get(step.step_id, 0)
                if current_retries < self.max_step_retries:
                    state.retry_counts[step.step_id] = current_retries + 1
                    state.status = WorkflowStatus.RETRYING
                    step.status = StepStatus.RETRYING
                    self._log(
                        f"[Step: {step.step_id}] REJECTED by Critic (Attempt {current_retries + 1}/{self.max_step_retries}). "
                        f"Retrying with targeted critique feedback...",
                        "yellow",
                    )
                    fixes_str = "; ".join(latest_review.suggested_fixes) if latest_review.suggested_fixes else "Address critique."
                    feedback = f"Critique: {latest_review.critique}\nFixes Needed: {fixes_str}"

                    # Re-execute with feedback
                    state = self.executor.execute_workflow_step(step.step_id, state, critic_feedback=feedback)
                    # Re-audit
                    state = self.critic.evaluate_workflow_step(step.step_id, state, dependency_context=dep_context)
                    latest_review = state.critic_reviews[step.step_id][-1]
                else:
                    # Retries exhausted for this step
                    break

            if latest_review.decision == CriticDecision.PASS:
                completed_steps.add(step.step_id)
                self._log(
                    f"[Step: {step.step_id}] Critic Verdict: PASS "
                    f"(Correctness: {latest_review.correctness_score:.2f}, "
                    f"Completeness: {latest_review.completeness_score:.2f})",
                    "bold green",
                )
            else:
                # Step failed after retries. Check if we can dynamic re-plan
                if len(state.replan_history) < self.max_workflow_replans:
                    self._log(
                        f"\n[WF: {state.workflow_id}] Step '{step.step_id}' failed after {self.max_step_retries} retries. "
                        f"Triggering Dynamic Re-planning (Replan {len(state.replan_history) + 1}/{self.max_workflow_replans})...",
                        "bold magenta",
                    )
                    state = self.replanner.replan_workflow(state, failed_step_id=step.step_id)
                    total_steps = len(state.plan.steps)
                    self._log(
                        f"[WF: {state.workflow_id}] Plan dynamically restructured into {total_steps} steps. Resuming execution...",
                        "bold green",
                    )
                    continue
                else:
                    self._log(
                        f"\n[WF: {state.workflow_id}] Maximum retries and re-plans exhausted. Workflow FAILED.",
                        "bold red",
                    )
                    step.status = StepStatus.FAILED
                    state.status = WorkflowStatus.FAILED
                    return state

        # 5. Workflow Completion
        state.status = WorkflowStatus.COMPLETED
        self._log(
            f"\n[WF: {state.workflow_id}] Workflow completed successfully! Status: {state.status.value}",
            "bold green",
        )
        self._log(
            f"[Telemetry] Tokens: {state.total_tokens} | Cost: ${state.estimated_cost_usd:.6f}",
            "dim white",
        )

        return state
