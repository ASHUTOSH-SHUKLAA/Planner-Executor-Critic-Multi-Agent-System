"""
Workflow Execution & Streaming Endpoints.
Provides REST and Server-Sent Events (SSE) streaming for real-time DAG visualizations.
"""

import json
import asyncio
from typing import Optional, List, Dict, Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from src.models.schemas import (
    WorkflowState,
    WorkflowStatus,
    StepStatus,
    CriticDecision,
)
from src.orchestrator.engine import OrchestrationEngine
from src.api.auth import get_optional_current_user, get_current_user
from src.api.database import (
    save_workflow_record,
    list_user_workflows,
    get_workflow_record,
)

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])


class RunWorkflowRequest(BaseModel):
    task: str = Field(min_length=3, max_length=2000, description="The user task to execute")
    mode: Literal["parallel", "sequential"] = "parallel"


class WorkflowSummaryResponse(BaseModel):
    workflow_id: str
    task: str
    status: str
    total_tokens: int
    estimated_cost_usd: float
    created_at: str


@router.get("", response_model=List[WorkflowSummaryResponse])
def get_user_workflows(
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
    limit: int = Query(default=20, ge=1, le=100),
):
    user_id = current_user["id"] if current_user else None
    records = list_user_workflows(user_id=user_id, limit=limit)
    return [
        WorkflowSummaryResponse(
            workflow_id=r["workflow_id"],
            task=r["task"],
            status=r["status"],
            total_tokens=r["total_tokens"],
            estimated_cost_usd=r["estimated_cost_usd"],
            created_at=str(r["created_at"]),
        )
        for r in records
    ]


@router.get("/{workflow_id}")
def get_workflow(workflow_id: str):
    record = get_workflow_record(workflow_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Workflow '{workflow_id}' not found.")
    return record


@router.post("/run-stream")
async def run_workflow_stream(
    req: RunWorkflowRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """
    Executes a workflow and streams real-time Server-Sent Events (SSE) to the browser.
    Powers the live React Flow DAG visualizer in the Next.js frontend!
    """
    user_id = current_user["id"] if current_user else None

    async def event_generator():
        # Bridge queue to capture internal agent events
        queue: asyncio.Queue = asyncio.Queue()
        engine = OrchestrationEngine(verbose=False)

        async def worker():
            try:
                # 1. Task Intake
                state = WorkflowState(task=req.task.strip())
                await queue.put({
                    "event": "workflow_started",
                    "data": {
                        "workflow_id": state.workflow_id,
                        "task": state.task,
                        "status": state.status.value,
                    }
                })

                # 2. Planning Phase
                await queue.put({"event": "status_change", "data": {"status": "PLANNING"}})
                state = await asyncio.to_thread(engine.planner.plan_workflow, state)
                await queue.put({
                    "event": "plan_generated",
                    "data": {
                        "plan_id": state.plan.plan_id,
                        "rationale": state.plan.rationale,
                        "steps": [s.model_dump() for s in state.plan.steps],
                        "status": state.status.value,
                    }
                })

                # 3. Wave Execution Loop
                completed_steps = set()
                total_steps = len(state.plan.steps)
                lock = asyncio.Lock()

                while len(completed_steps) < total_steps:
                    batch = engine.get_executable_steps_batch(state, completed_steps)
                    if not batch:
                        pending = [s.step_id for s in state.plan.steps if s.status == StepStatus.PENDING]
                        if pending:
                            raise RuntimeError(f"Workflow deadlock: Pending steps {pending} have unmet dependencies.")
                        break

                    # Announce wave
                    await queue.put({
                        "event": "wave_started",
                        "data": {
                            "step_ids": [s.step_id for s in batch],
                            "mode": req.mode,
                        }
                    })

                    # Helper for single step with live event dispatching
                    async def run_single_step(step):
                        await queue.put({
                            "event": "step_executing",
                            "data": {"step_id": step.step_id, "title": step.title}
                        })

                        # Execute
                        dep_context = engine.executor.build_dependency_context(step, state)
                        exec_res = await asyncio.to_thread(engine.executor.execute_step, step=step, state=state)
                        
                        async with lock:
                            state.step_outputs[step.step_id] = exec_res.parsed
                            state.total_tokens += exec_res.total_tokens
                            state.estimated_cost_usd += exec_res.estimated_cost_usd

                        await queue.put({
                            "event": "step_executed",
                            "data": {
                                "step_id": step.step_id,
                                "output": exec_res.parsed.model_dump(),
                                "duration": exec_res.parsed.execution_time_seconds,
                            }
                        })

                        # Critic Audit
                        await queue.put({
                            "event": "critic_reviewing",
                            "data": {"step_id": step.step_id}
                        })

                        critic_res = await asyncio.to_thread(
                            engine.critic.evaluate_output,
                            step=step,
                            output=exec_res.parsed,
                            task_objective=state.task,
                            dependency_context=dep_context,
                        )
                        latest_rev = critic_res.parsed

                        async with lock:
                            if step.step_id not in state.critic_reviews:
                                state.critic_reviews[step.step_id] = []
                            state.critic_reviews[step.step_id].append(latest_rev)
                            state.total_tokens += critic_res.total_tokens
                            state.estimated_cost_usd += critic_res.estimated_cost_usd

                        # Handle retries if rejected
                        while latest_rev.decision == CriticDecision.REJECT:
                            current_retries = state.retry_counts.get(step.step_id, 0)
                            if current_retries < engine.max_step_retries:
                                state.retry_counts[step.step_id] = current_retries + 1
                                step.status = StepStatus.RETRYING
                                await queue.put({
                                    "event": "step_retrying",
                                    "data": {
                                        "step_id": step.step_id,
                                        "attempt": current_retries + 1,
                                        "critique": latest_rev.critique,
                                        "suggested_fixes": latest_rev.suggested_fixes,
                                    }
                                })
                                feedback = f"Critique: {latest_rev.critique}\nFixes: {'; '.join(latest_rev.suggested_fixes)}"
                                exec_res = await asyncio.to_thread(engine.executor.execute_step, step=step, state=state, critic_feedback=feedback)
                                async with lock:
                                    state.step_outputs[step.step_id] = exec_res.parsed
                                    state.total_tokens += exec_res.total_tokens
                                    state.estimated_cost_usd += exec_res.estimated_cost_usd

                                critic_res = await asyncio.to_thread(engine.critic.evaluate_output, step=step, output=exec_res.parsed, task_objective=state.task, dependency_context=dep_context)
                                latest_rev = critic_res.parsed
                                async with lock:
                                    state.critic_reviews[step.step_id].append(latest_rev)
                                    state.total_tokens += critic_res.total_tokens
                                    state.estimated_cost_usd += critic_res.estimated_cost_usd
                            else:
                                break

                        # Step verdict
                        passed = latest_rev.decision == CriticDecision.PASS
                        step.status = StepStatus.PASSED if passed else StepStatus.FAILED
                        await queue.put({
                            "event": "step_verdict",
                            "data": {
                                "step_id": step.step_id,
                                "decision": latest_rev.decision.value,
                                "scores": {
                                    "correctness": latest_rev.correctness_score,
                                    "completeness": latest_rev.completeness_score,
                                    "relevance": latest_rev.relevance_score,
                                },
                                "critique": latest_rev.critique,
                            }
                        })
                        return passed, step

                    # Dispatch wave (concurrently if parallel mode, or sequentially)
                    if req.mode == "parallel":
                        results = await asyncio.gather(*(run_single_step(step) for step in batch))
                    else:
                        results = []
                        for step in batch:
                            res = await run_single_step(step)
                            results.append(res)

                    # Check wave results
                    wave_passed = True
                    for passed, step in results:
                        if passed:
                            completed_steps.add(step.step_id)
                        else:
                            wave_passed = False
                            failed_step = step

                    if not wave_passed:
                        # Dynamic re-planning
                        if len(state.replan_history) < engine.max_workflow_replans:
                            await queue.put({
                                "event": "replan_triggered",
                                "data": {"failed_step_id": failed_step.step_id}
                            })
                            state = await asyncio.to_thread(engine.replanner.replan_workflow, state, failed_step_id=failed_step.step_id)
                            total_steps = len(state.plan.steps)
                            await queue.put({
                                "event": "plan_regenerated",
                                "data": {
                                    "steps": [s.model_dump() for s in state.plan.steps],
                                    "rationale": state.plan.rationale,
                                }
                            })
                            continue
                        else:
                            state.status = WorkflowStatus.FAILED
                            await queue.put({
                                "event": "workflow_failed",
                                "data": {"error": "Maximum retries and re-plans exhausted."}
                            })
                            save_workflow_record(
                                workflow_id=state.workflow_id,
                                user_id=user_id,
                                task=state.task,
                                status=state.status.value,
                                total_tokens=state.total_tokens,
                                estimated_cost_usd=state.estimated_cost_usd,
                                state_dict=state.model_dump(),
                            )
                            await queue.put(None)
                            return

                # Workflow complete
                state.status = WorkflowStatus.COMPLETED
                save_workflow_record(
                    workflow_id=state.workflow_id,
                    user_id=user_id,
                    task=state.task,
                    status=state.status.value,
                    total_tokens=state.total_tokens,
                    estimated_cost_usd=state.estimated_cost_usd,
                    state_dict=state.model_dump(),
                )
                await queue.put({
                    "event": "workflow_completed",
                    "data": {
                        "workflow_id": state.workflow_id,
                        "status": state.status.value,
                        "total_tokens": state.total_tokens,
                        "estimated_cost_usd": state.estimated_cost_usd,
                        "steps": [s.model_dump() for s in state.plan.steps],
                        "outputs": {k: v.model_dump() for k, v in state.step_outputs.items()},
                    }
                })

            except Exception as e:
                await queue.put({"event": "error", "data": {"message": str(e)}})
            finally:
                await queue.put(None)  # Sentinel to end stream

        # Start background execution
        task_coro = asyncio.create_task(worker())

        # Yield events to SSE client
        while True:
            item = await queue.get()
            if item is None:
                break
            yield {
                "event": item["event"],
                "data": json.dumps(item["data"]),
            }

    return EventSourceResponse(event_generator())
