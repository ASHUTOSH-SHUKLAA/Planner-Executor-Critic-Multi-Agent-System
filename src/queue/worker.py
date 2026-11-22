"""
Render Background Worker Entrypoint for Synora.
Consumes autonomous research tasks from Redis, executes the multi-agent DAG pipeline
independently of HTTP requests, publishes live progress events, and persists intermediate states.
"""

import os
import sys
import json
import time
import signal
import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv()

from src.orchestrator.engine import OrchestrationEngine
from src.models.schemas import WorkflowState, WorkflowStatus
from src.api.database import (
    init_db,
    save_workflow_record,
    get_workflow_record,
)
from src.queue.manager import get_queue_manager, QUEUE_NAME

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("synora.worker")


class ResearchBackgroundWorker:
    """Production background worker for executing long-running multi-agent research tasks."""

    def __init__(self):
        self.running = True
        self.queue_mgr = get_queue_manager()

    def stop(self, *args):
        logger.info("[Worker] Graceful shutdown signal received. Finishing active tasks...")
        self.running = False

    async def execute_task(self, job_data: Dict[str, Any]):
        workflow_id = job_data.get("workflow_id")
        task_prompt = job_data.get("task")
        user_id = job_data.get("user_id")
        mode = job_data.get("mode", "parallel")
        model = job_data.get("model", "gemini-3.5-flash-lite")

        logger.info(f"[Worker] Starting research task '{workflow_id}': {task_prompt[:80]}...")

        engine = OrchestrationEngine(verbose=False, model=model)

        def publish(event_name: str, payload: Dict[str, Any]):
            event_obj = {
                "event": event_name,
                "data": payload,
                "workflow_id": workflow_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            self.queue_mgr.publish_event(workflow_id, event_obj)

        publish("workflow_started", {
            "workflow_id": workflow_id,
            "task": task_prompt,
            "status": "PLANNING",
            "model": engine.model,
        })

        try:
            state = WorkflowState(workflow_id=workflow_id, task=task_prompt, user_id=user_id)

            # 1. Planning Phase
            publish("status_change", {"status": "PLANNING"})
            publish("activity", {
                "type": "planning",
                "agent": "Planner",
                "message": "Decomposing research objective into multi-axis DAG plan...",
            })

            state = await asyncio.to_thread(engine.planner.plan_workflow, state)

            publish("plan_generated", {
                "plan_id": state.plan.plan_id,
                "rationale": state.plan.rationale,
                "steps": [s.model_dump() for s in state.plan.steps],
                "status": state.status.value,
            })

            # Incremental checkpoint save to PostgreSQL
            save_workflow_record(
                workflow_id=workflow_id,
                user_id=user_id,
                task=task_prompt,
                status=state.status.value,
                total_tokens=state.total_tokens,
                estimated_cost_usd=state.estimated_cost_usd,
                state_dict=state.model_dump(),
            )

            # 2. Execution Phase
            publish("status_change", {"status": "EXECUTING"})

            def on_activity(event_type: str, data: Dict[str, Any]):
                publish("activity", {"type": event_type, **data})

            # Execute wave execution
            state = await engine.run_workflow_async(task_prompt, mode=mode)

            # 3. Final DB State Save (State, findings & citations persisted to PostgreSQL)
            save_workflow_record(
                workflow_id=workflow_id,
                user_id=user_id,
                task=task_prompt,
                status=state.status.value,
                total_tokens=state.total_tokens,
                estimated_cost_usd=state.estimated_cost_usd,
                state_dict=state.model_dump(),
            )

            publish("workflow_completed", {
                "workflow_id": workflow_id,
                "status": state.status.value,
                "final_result": state.final_result,
                "sources": [s.model_dump() if hasattr(s, "model_dump") else s for s in state.sources],
                "total_tokens": state.total_tokens,
                "estimated_cost_usd": state.estimated_cost_usd,
            })
            logger.info(f"[Worker] Task '{workflow_id}' successfully COMPLETED in background.")

        except Exception as e:
            logger.error(f"[Worker] Task '{workflow_id}' failed with exception: {e}", exc_info=True)
            publish("workflow_failed", {
                "workflow_id": workflow_id,
                "status": "FAILED",
                "error": str(e),
            })
            save_workflow_record(
                workflow_id=workflow_id,
                user_id=user_id,
                task=task_prompt,
                status="FAILED",
                total_tokens=0,
                estimated_cost_usd=0.0,
                state_dict={"error": str(e), "task": task_prompt},
            )

    async def run(self):
        logger.info("==================================================")
        logger.info("Synora Autonomous Research Background Worker Started")
        logger.info(f"Target Queue: '{QUEUE_NAME}'")
        logger.info("==================================================")

        init_db()

        while self.running:
            if not self.queue_mgr.redis_client:
                # If Redis is unconfigured, sleep briefly and retry
                await asyncio.sleep(2)
                continue

            try:
                # Block for up to 3 seconds waiting for a job
                item = self.queue_mgr.redis_client.blpop(QUEUE_NAME, timeout=3)
                if item:
                    _, raw_payload = item
                    job_data = json.loads(raw_payload)
                    await self.execute_task(job_data)
                else:
                    await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"[Worker] Error polling Redis queue: {e}")
                await asyncio.sleep(2)


def main():
    worker = ResearchBackgroundWorker()
    signal.signal(signal.SIGINT, worker.stop)
    signal.signal(signal.SIGTERM, worker.stop)
    asyncio.run(worker.run())


if __name__ == "__main__":
    main()
