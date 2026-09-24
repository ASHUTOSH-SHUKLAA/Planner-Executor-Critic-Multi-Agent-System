"""
Workflow Execution, Streaming, and Download Endpoints.
Provides REST and Server-Sent Events (SSE) streaming for real-time AI research workflows.
Enforces strict JWT authentication, resource ownership, and validated report exports.
"""

import json
import asyncio
from typing import Optional, List, Dict, Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from pydantic import BaseModel, Field, model_validator
from sse_starlette.sse import EventSourceResponse

from src.models.schemas import (
    WorkflowState,
    WorkflowStatus,
    StepStatus,
    CriticDecision,
    SourceCitation,
)
from src.orchestrator.engine import OrchestrationEngine
from src.api.auth import get_current_user
from src.api.database import (
    save_workflow_record,
    list_user_workflows,
    get_workflow_record,
)

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])


class RunWorkflowRequest(BaseModel):
    task: Optional[str] = Field(default=None, description="The user task to execute")
    goal: Optional[str] = Field(default=None, description="Alternative alias for task")
    mode: Literal["parallel", "sequential"] = "parallel"

    @model_validator(mode="after")
    def resolve_task_prompt(self):
        prompt = self.task or self.goal
        if not prompt or len(prompt.strip()) < 3:
            raise ValueError("Task prompt must be at least 3 characters.")
        self.task = prompt.strip()
        return self


class WorkflowSummaryResponse(BaseModel):
    workflow_id: str
    task: str
    status: str
    total_tokens: int
    estimated_cost_usd: float
    created_at: str


@router.get("", response_model=List[WorkflowSummaryResponse])
def get_user_workflows(
    current_user: Dict[str, Any] = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=100),
):
    """Fetches workflows belonging strictly to the authenticated user."""
    records = list_user_workflows(user_id=current_user["id"], limit=limit)
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
def get_workflow(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Enforces resource ownership: user can only view their own tasks, or admin can view any."""
    is_admin = current_user.get("role") == "admin"
    record = get_workflow_record(
        workflow_id=workflow_id,
        user_id=current_user["id"],
        is_admin=is_admin,
    )
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"Workflow '{workflow_id}' not found or access denied.",
        )
    return record


@router.get("/{workflow_id}/download")
def download_workflow_report(
    workflow_id: str,
    format: Literal["md", "txt"] = "md",
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Downloads the actual generated result report with full citations and metadata.
    Validates that the final report exists and is non-empty before downloading.
    """
    is_admin = current_user.get("role") == "admin"
    record = get_workflow_record(
        workflow_id=workflow_id,
        user_id=current_user["id"],
        is_admin=is_admin,
    )
    if not record:
        raise HTTPException(status_code=404, detail="Workflow not found.")

    state_dict = record.get("state", {})
    final_result = state_dict.get("final_result")
    if not final_result or not final_result.strip():
        raise HTTPException(
            status_code=400,
            detail="Cannot download: Final report has not been generated for this workflow.",
        )

    task_title = record.get("task", "Research Task")
    created_at = record.get("created_at", "")
    sources = state_dict.get("sources", [])

    # Format document
    lines = [
        f"# TriadFlow Research Report: {task_title}",
        f"**Date:** {created_at}",
        f"**Workflow ID:** `{workflow_id}`",
        f"**Tokens Consumed:** {record.get('total_tokens', 0):,}",
        f"**Status:** {record.get('status', 'COMPLETED')}",
        "\n---\n",
        "## Executive Summary & Findings\n",
        final_result.strip(),
    ]

    if sources:
        lines.append("\n\n---\n## Verified Sources & Evidence\n")
        for idx, src in enumerate(sources, start=1):
            title = src.get("title", f"Source {idx}")
            url = src.get("url", "#")
            domain = src.get("domain", "")
            snippet = src.get("snippet", "").strip()
            lines.append(f"{idx}. **[{title}]({url})** — *{domain}*")
            if snippet:
                lines.append(f"   > \"{snippet}\"\n")

    content = "\n".join(lines)
    from src.api.audit_logger import log_user_event
    log_user_event(
        action="REPORT_DOWNLOADED",
        user_id=current_user["id"],
        email=current_user.get("email"),
        role=current_user.get("role"),
        details=f"Downloaded report format='{format}'",
        extra={"workflow_id": workflow_id},
    )

    filename = f"triadflow_{workflow_id}.{format}"
    media_type = "text/markdown" if format == "md" else "text/plain"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/run-stream")
async def run_workflow_stream(
    req: RunWorkflowRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Executes an autonomous research workflow and streams real-time Server-Sent Events (SSE).
    Guaranteed JWT authentication, live tool execution, citations capture, and synthesis delivery.
    """
    user_id = current_user["id"]

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()
        engine = OrchestrationEngine(verbose=False)

        async def worker():
            try:
                # 1. Task Intake
                state = WorkflowState(task=req.task.strip(), user_id=user_id)
                from src.api.audit_logger import log_user_event
                log_user_event(
                    action="WORKFLOW_STARTED",
                    user_id=user_id,
                    email=current_user.get("email"),
                    role=current_user.get("role"),
                    details=f"Goal: '{state.task[:100]}'",
                    extra={"workflow_id": state.workflow_id, "mode": req.mode},
                )
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
                            "count": len(batch),
                        }
                    })

                    async def run_single_step(step):
                        async with lock:
                            step.status = StepStatus.IN_PROGRESS
                        await queue.put({
                            "event": "step_started",
                            "data": {
                                "step_id": step.step_id,
                                "title": step.title,
                                "requires_research": getattr(step, "requires_research", False),
                            }
                        })

                        # Execute step in worker thread (with live web search if needed)
                        exec_resp = await asyncio.to_thread(
                            engine.executor.execute_step,
                            step=step,
                            state=state,
                        )

                        async with lock:
                            state.step_outputs[step.step_id] = exec_resp.parsed
                            state.total_tokens += exec_resp.total_tokens
                            state.estimated_cost_usd += exec_resp.estimated_cost_usd

                            # Accumulate new sources
                            if exec_resp.parsed and exec_resp.parsed.sources:
                                existing_urls = {s.url for s in state.sources}
                                for src in exec_resp.parsed.sources:
                                    if src.url not in existing_urls:
                                        state.sources.append(src)
                                        existing_urls.add(src.url)

                        # Notify frontend of deliverable & gathered sources
                        await queue.put({
                            "event": "step_completed",
                            "data": {
                                "step_id": step.step_id,
                                "title": step.title,
                                "output": exec_resp.parsed.content if exec_resp.parsed else "",
                                "key_findings": exec_resp.parsed.key_findings if exec_resp.parsed else [],
                                "sources": [s.model_dump() for s in (exec_resp.parsed.sources or [])],
                                "latency": exec_resp.latency_seconds,
                            }
                        })

                        # Critic Audit
                        await queue.put({
                            "event": "critic_audit_started",
                            "data": {"step_id": step.step_id}
                        })
                        dep_context = engine.executor.build_dependency_context(step, state)
                        critic_resp = await asyncio.to_thread(
                            engine.critic.evaluate_output,
                            step=step,
                            output=exec_resp.parsed,
                            task_objective=state.task,
                            dependency_context=dep_context,
                        )

                        latest_rev = critic_resp.parsed
                        async with lock:
                            if step.step_id not in state.critic_reviews:
                                state.critic_reviews[step.step_id] = []
                            state.critic_reviews[step.step_id].append(latest_rev)
                            state.total_tokens += critic_resp.total_tokens
                            state.estimated_cost_usd += critic_resp.estimated_cost_usd

                        # Bounded Retry Loop if rejected
                        while latest_rev.decision == CriticDecision.REJECT:
                            current_retries = state.retry_counts.get(step.step_id, 0)
                            if current_retries < engine.max_step_retries:
                                state.retry_counts[step.step_id] = current_retries + 1
                                step.status = StepStatus.RETRYING
                                await queue.put({
                                    "event": "step_retry",
                                    "data": {
                                        "step_id": step.step_id,
                                        "attempt": current_retries + 1,
                                        "critique": latest_rev.critique,
                                        "suggested_fixes": latest_rev.suggested_fixes,
                                    }
                                })
                                feedback = f"Critique: {latest_rev.critique}\nFixes: {'; '.join(latest_rev.suggested_fixes)}"
                                retry_resp = await asyncio.to_thread(
                                    engine.executor.execute_step,
                                    step=step,
                                    state=state,
                                    critic_feedback=feedback,
                                )
                                async with lock:
                                    state.step_outputs[step.step_id] = retry_resp.parsed
                                    state.total_tokens += retry_resp.total_tokens
                                    state.estimated_cost_usd += retry_resp.estimated_cost_usd

                                # Re-audit
                                critic_resp = await asyncio.to_thread(
                                    engine.critic.evaluate_output,
                                    step=step,
                                    output=retry_resp.parsed,
                                    task_objective=state.task,
                                    dependency_context=dep_context,
                                )
                                latest_rev = critic_resp.parsed
                                async with lock:
                                    state.critic_reviews[step.step_id].append(latest_rev)
                                    state.total_tokens += critic_resp.total_tokens
                                    state.estimated_cost_usd += critic_resp.estimated_cost_usd
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

                    # Dispatch wave
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

                # 4. Synthesis Phase
                state.status = WorkflowStatus.SYNTHESIZING
                await queue.put({"event": "status_change", "data": {"status": "SYNTHESIZING"}})
                try:
                    state = await asyncio.to_thread(engine.synthesizer.synthesize_workflow, state)
                    await queue.put({
                        "event": "synthesis_ready",
                        "data": {
                            "final_result": state.final_result,
                            "sources": [s.model_dump() for s in state.sources],
                        }
                    })
                except Exception as e:
                    state.final_result = "\n\n".join(f"## {s.title}\n{s.output}" for s in state.step_outputs.values())

                # 5. Workflow Complete
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

                from src.api.audit_logger import log_user_event
                log_user_event(
                    action="WORKFLOW_COMPLETED",
                    user_id=user_id,
                    email=current_user.get("email"),
                    role=current_user.get("role"),
                    details="Autonomous research finished successfully",
                    extra={
                        "workflow_id": state.workflow_id,
                        "total_tokens": state.total_tokens,
                        "cost_usd": f"${state.estimated_cost_usd:.5f}",
                        "sources_count": len(state.sources),
                    },
                )
                await queue.put({
                    "event": "workflow_completed",
                    "data": {
                        "workflow_id": state.workflow_id,
                        "status": state.status.value,
                        "final_result": state.final_result,
                        "sources": [s.model_dump() for s in state.sources],
                        "total_tokens": state.total_tokens,
                        "estimated_cost_usd": state.estimated_cost_usd,
                        "steps": [s.model_dump() for s in state.plan.steps],
                        "outputs": {k: v.model_dump() for k, v in state.step_outputs.items()},
                    }
                })

            except Exception as e:
                await queue.put({"event": "error", "data": {"message": str(e)}})
            finally:
                await queue.put(None)

        task_coro = asyncio.create_task(worker())

        while True:
            item = await queue.get()
            if item is None:
                break
            yield {
                "event": item["event"],
                "data": json.dumps(item["data"]),
            }

    return EventSourceResponse(event_generator())
