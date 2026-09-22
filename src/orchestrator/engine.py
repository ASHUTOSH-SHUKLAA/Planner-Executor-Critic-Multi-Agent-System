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
from src.agents.executor import ExecutorAgent
from src.agents.critic import CriticAgent
from src.llm.client import LLMGateway

console = Console()


class OrchestrationEngine:
    """
    Central coordinator managing workflow execution and agent handoffs.
    Enforces deterministic state transitions and dependency-ordered execution.
    """

    def __init__(
        self,
        planner: Optional[PlannerAgent] = None,
        executor: Optional[ExecutorAgent] = None,
        critic: Optional[CriticAgent] = None,
        gateway: Optional[LLMGateway] = None,
        verbose: bool = True,
    ):
        self.gateway = gateway or LLMGateway()
        self.planner = planner or PlannerAgent(gateway=self.gateway)
        self.executor = executor or ExecutorAgent(gateway=self.gateway)
        self.critic = critic or CriticAgent(gateway=self.gateway)
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

            # Check verdict
            latest_review = state.critic_reviews[step.step_id][-1]
            if latest_review.decision == CriticDecision.PASS:
                completed_steps.add(step.step_id)
                self._log(
                    f"[Step: {step.step_id}] Critic Verdict: PASS "
                    f"(Correctness: {latest_review.correctness_score:.2f}, "
                    f"Completeness: {latest_review.completeness_score:.2f})",
                    "bold green",
                )
            else:
                self._log(
                    f"[Step: {step.step_id}] Critic Verdict: REJECT - {latest_review.critique}",
                    "bold red",
                )
                # In Module 6 (sequential baseline), a rejection marks step FAILED
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
