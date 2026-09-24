"""
Orchestration Engine: Central State Machine and Workflow Coordinator.
Manages state transitions:
TASK_RECEIVED -> PLANNING -> PLAN_READY -> EXECUTING -> CRITIC_REVIEW -> COMPLETED
Maintains the shared scratchpad across all agent interactions.
"""

import os
import asyncio
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
from src.agents.replanner import ReplannerAgent
from src.agents.synthesizer import SynthesizerAgent
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
        synthesizer: Optional[SynthesizerAgent] = None,
        gateway: Optional[LLMGateway] = None,
        max_step_retries: int = 2,
        max_workflow_replans: int = 2,
        verbose: bool = True,
    ):
        self.gateway = gateway or LLMGateway()
        fast_model = os.getenv("FAST_MODEL") or getattr(self.gateway, "default_model", "gemini-3.6-flash")
        reasoning_model = os.getenv("DEFAULT_MODEL") or getattr(self.gateway, "default_model", "gemini-3.6-flash")

        self.planner = planner or PlannerAgent(gateway=self.gateway, model=reasoning_model)
        self.executor = executor or ExecutorAgent(gateway=self.gateway, model=fast_model)
        self.critic = critic or CriticAgent(gateway=self.gateway, model=fast_model)
        self.replanner = replanner or ReplannerAgent(gateway=self.gateway, model=reasoning_model)
        self.synthesizer = synthesizer or SynthesizerAgent(gateway=self.gateway, model=reasoning_model)
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

        # 5. Synthesis Phase
        state.status = WorkflowStatus.SYNTHESIZING
        self._log(f"\n[WF: {state.workflow_id}] Entering SYNTHESIS phase...", "bold magenta")
        try:
            state = self.synthesizer.synthesize_workflow(state)
            self._log(f"[WF: {state.workflow_id}] Synthesis report produced successfully.", "green")
        except Exception as e:
            self._log(f"[WF: {state.workflow_id}] Synthesis notice: {e}. Falling back to combined steps.", "yellow")
            state.final_result = "\n\n".join(f"## {s.title}\n{s.output}" for s in state.step_outputs.values())

        # 6. Workflow Completion
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

    def get_executable_steps_batch(
        self,
        state: WorkflowState,
        completed_step_ids: Set[str],
    ) -> List[PlanStep]:
        """
        US-007: Identifies ALL independent steps currently eligible for execution.
        A step is eligible if it is PENDING and all its dependencies have PASSED.
        """
        if not state.plan:
            return []

        ready_steps: List[PlanStep] = []
        for step in state.plan.steps:
            if step.status == StepStatus.PENDING:
                if all(dep in completed_step_ids for dep in step.dependencies):
                    ready_steps.append(step)

        return ready_steps

    async def _execute_and_audit_step_async(
        self,
        step: PlanStep,
        state: WorkflowState,
        lock: asyncio.Lock,
    ) -> bool:
        """
        Executes a single step and performs Critic audit concurrently in a thread pool.
        Uses lock when writing to shared state to prevent race conditions.
        """
        self._log(f"[Step: {step.step_id}] Executing concurrently in background thread...", "cyan")

        async with lock:
            dep_context = self.executor.build_dependency_context(step, state)
            step.status = StepStatus.IN_PROGRESS

        # 1. Execute Step concurrently
        exec_response = await asyncio.to_thread(
            self.executor.execute_step,
            step=step,
            state=state,
        )

        async with lock:
            state.step_outputs[step.step_id] = exec_response.parsed
            state.total_tokens += exec_response.total_tokens
            state.estimated_cost_usd += exec_response.estimated_cost_usd

        # 2. Critic Audit concurrently
        self._log(f"[Step: {step.step_id}] Auditing deliverable concurrently...", "magenta")
        critic_response = await asyncio.to_thread(
            self.critic.evaluate_output,
            step=step,
            output=exec_response.parsed,
            task_objective=state.task,
            dependency_context=dep_context,
        )

        latest_review = critic_response.parsed

        async with lock:
            if step.step_id not in state.critic_reviews:
                state.critic_reviews[step.step_id] = []
            state.critic_reviews[step.step_id].append(latest_review)
            state.total_tokens += critic_response.total_tokens
            state.estimated_cost_usd += critic_response.estimated_cost_usd

        # 3. Bounded Retry loop if rejected
        while latest_review.decision == CriticDecision.REJECT:
            async with lock:
                current_retries = state.retry_counts.get(step.step_id, 0)
                if current_retries < self.max_step_retries:
                    state.retry_counts[step.step_id] = current_retries + 1
                    step.status = StepStatus.RETRYING
                    self._log(
                        f"[Step: {step.step_id}] REJECTED by Critic (Attempt {current_retries + 1}/{self.max_step_retries}). "
                        f"Retrying with targeted critique feedback...",
                        "yellow",
                    )
                    fixes_str = "; ".join(latest_review.suggested_fixes) if latest_review.suggested_fixes else "Address critique."
                    feedback = f"Critique: {latest_review.critique}\nFixes Needed: {fixes_str}"
                else:
                    break

            # Re-execute in worker thread
            exec_response = await asyncio.to_thread(
                self.executor.execute_step,
                step=step,
                state=state,
                critic_feedback=feedback,
            )
            async with lock:
                state.step_outputs[step.step_id] = exec_response.parsed
                state.total_tokens += exec_response.total_tokens
                state.estimated_cost_usd += exec_response.estimated_cost_usd

            # Re-audit in worker thread
            critic_response = await asyncio.to_thread(
                self.critic.evaluate_output,
                step=step,
                output=exec_response.parsed,
                task_objective=state.task,
                dependency_context=dep_context,
            )
            latest_review = critic_response.parsed
            async with lock:
                state.critic_reviews[step.step_id].append(latest_review)
                state.total_tokens += critic_response.total_tokens
                state.estimated_cost_usd += critic_response.estimated_cost_usd

        async with lock:
            if latest_review.decision == CriticDecision.PASS:
                step.status = StepStatus.PASSED
                self._log(
                    f"[Step: {step.step_id}] Critic Verdict: PASS "
                    f"(Correctness: {latest_review.correctness_score:.2f}, "
                    f"Completeness: {latest_review.completeness_score:.2f})",
                    "bold green",
                )
                return True
            else:
                step.status = StepStatus.FAILED
                self._log(f"[Step: {step.step_id}] Critic Verdict: REJECT after retries.", "bold red")
                return False

    async def run_parallel_async(self, task: str) -> WorkflowState:
        """
        US-007: Executes independent steps concurrently using topological wave execution.
        """
        if not task or not task.strip():
            raise ValueError("Task prompt cannot be empty or whitespace only.")

        state = WorkflowState(task=task.strip())
        self._log(f"\n[WF: {state.workflow_id}] Initialized in PARALLEL mode. Status: {state.status.value}", "bold blue")

        # 1. Planning Phase
        self._log(f"[WF: {state.workflow_id}] Entering PLANNING phase...", "yellow")
        try:
            state = await asyncio.to_thread(self.planner.plan_workflow, state)
            self._log(
                f"[WF: {state.workflow_id}] Plan generated with {len(state.plan.steps)} steps. "
                f"Status: {state.status.value}",
                "green",
            )
        except Exception as e:
            state.status = WorkflowStatus.FAILED
            self._log(f"[WF: {state.workflow_id}] Planning failed: {e}", "bold red")
            raise e

        # 2. Parallel Wave Execution Loop
        completed_steps: Set[str] = set()
        total_steps = len(state.plan.steps)
        lock = asyncio.Lock()

        while len(completed_steps) < total_steps:
            batch = self.get_executable_steps_batch(state, completed_steps)
            if not batch:
                pending = [s.step_id for s in state.plan.steps if s.status == StepStatus.PENDING]
                if pending:
                    state.status = WorkflowStatus.FAILED
                    raise RuntimeError(
                        f"Workflow deadlock: Pending steps {pending} have unsatisfied dependencies."
                    )
                break

            # Execute the wave
            if len(batch) > 1:
                self._log(
                    f"\n[PARALLEL WAVE] Launching {len(batch)} independent steps concurrently: "
                    f"{[s.step_id for s in batch]}",
                    "bold cyan",
                )
            else:
                self._log(f"\n--- [Step: {batch[0].step_id}] {batch[0].title} ---", "bold yellow")

            state.status = WorkflowStatus.EXECUTING

            # Run all steps in the current frontier concurrently
            results = await asyncio.gather(
                *(self._execute_and_audit_step_async(step, state, lock) for step in batch)
            )

            # Process wave outcomes
            wave_all_passed = True
            for step, passed in zip(batch, results):
                if passed:
                    completed_steps.add(step.step_id)
                else:
                    wave_all_passed = False
                    failed_step = step

            if not wave_all_passed:
                # Handle dynamic re-planning on wave failure
                if len(state.replan_history) < self.max_workflow_replans:
                    self._log(
                        f"\n[WF: {state.workflow_id}] Step '{failed_step.step_id}' failed in parallel wave. "
                        f"Triggering Dynamic Re-planning...",
                        "bold magenta",
                    )
                    state = await asyncio.to_thread(
                        self.replanner.replan_workflow, state, failed_step_id=failed_step.step_id
                    )
                    total_steps = len(state.plan.steps)
                    self._log(
                        f"[WF: {state.workflow_id}] Plan restructured into {total_steps} steps. Resuming parallel waves...",
                        "bold green",
                    )
                    continue
                else:
                    self._log(
                        f"\n[WF: {state.workflow_id}] Maximum retries and re-plans exhausted. Workflow FAILED.",
                        "bold red",
                    )
                    state.status = WorkflowStatus.FAILED
                    return state

        # 3. Synthesis Phase
        state.status = WorkflowStatus.SYNTHESIZING
        self._log(f"\n[WF: {state.workflow_id}] Entering SYNTHESIS phase...", "bold magenta")
        try:
            state = await asyncio.to_thread(self.synthesizer.synthesize_workflow, state)
            self._log(f"[WF: {state.workflow_id}] Synthesis report produced successfully.", "green")
        except Exception as e:
            self._log(f"[WF: {state.workflow_id}] Synthesis notice: {e}. Falling back to combined steps.", "yellow")
            state.final_result = "\n\n".join(f"## {s.title}\n{s.output}" for s in state.step_outputs.values())

        # 4. Workflow Completion
        state.status = WorkflowStatus.COMPLETED
        self._log(
            f"\n[WF: {state.workflow_id}] Parallel workflow completed successfully! Status: {state.status.value}",
            "bold green",
        )
        self._log(
            f"[Telemetry] Tokens: {state.total_tokens} | Cost: ${state.estimated_cost_usd:.6f}",
            "dim white",
        )

        return state

    async def run_workflow_async(self, task: str, mode: str = "parallel") -> WorkflowState:
        """
        Unified asynchronous entrypoint for running workflows in either 'parallel' or 'sequential' mode.
        """
        if mode == "parallel":
            return await self.run_parallel_async(task)
        else:
            return await asyncio.to_thread(self.run, task)

    def run_parallel(self, task: str) -> WorkflowState:
        """
        Synchronous entrypoint for parallel execution.
        """
        return asyncio.run(self.run_parallel_async(task))

