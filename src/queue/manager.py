"""
Redis Job Queue & Pub/Sub Manager for Synora.
Supports task queuing on Render Key Value and event pub/sub for live client streaming.
Includes an in-memory queue fallback for local development without Redis.
"""

import os
import json
import logging
from typing import Optional, Dict, Any, AsyncGenerator

logger = logging.getLogger("synora.queue")

REDIS_URL = os.getenv("REDIS_URL")
QUEUE_NAME = "synora:research_jobs"


class QueueManager:
    """Manages research task dispatch and live execution event broadcasting."""

    def __init__(self):
        self.redis_url = REDIS_URL
        self.redis_client = None

        if self.redis_url:
            try:
                import redis
                self.redis_client = redis.Redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_timeout=5.0,
                    retry_on_timeout=True,
                )
                logger.info(f"[QueueManager] Connected to Redis queue at '{self.redis_url.split('@')[-1]}'")
            except Exception as e:
                logger.warning(f"[QueueManager] Failed to connect to Redis: {e}. Running in local mode.")
                self.redis_client = None
        else:
            logger.info("[QueueManager] REDIS_URL not configured. Running in local in-process mode.")

    def is_connected(self) -> bool:
        if self.redis_client:
            try:
                return bool(self.redis_client.ping())
            except Exception:
                return False
        return False

    def enqueue_job(self, job_data: Dict[str, Any]) -> str:
        """Pushes a research task to the queue."""
        workflow_id = job_data.get("workflow_id")
        payload = json.dumps(job_data)

        if self.redis_client:
            try:
                self.redis_client.rpush(QUEUE_NAME, payload)
                logger.info(f"[QueueManager] Enqueued job '{workflow_id}' to Redis queue '{QUEUE_NAME}'")
                return workflow_id
            except Exception as e:
                logger.error(f"[QueueManager] Failed to enqueue job to Redis: {e}")

        # Local fallback warning
        logger.warning(f"[QueueManager] Job '{workflow_id}' handled via local executor.")
        return workflow_id

    def publish_event(self, workflow_id: str, event_data: Dict[str, Any]):
        """Publishes a live execution event to the workflow channel."""
        channel = f"synora:events:{workflow_id}"
        payload = json.dumps(event_data)

        if self.redis_client:
            try:
                self.redis_client.publish(channel, payload)
            except Exception as e:
                logger.error(f"[QueueManager] Failed to publish event to channel '{channel}': {e}")

    async def stream_workflow_events(self, workflow_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Subscribes to the workflow event channel and yields events as they arrive.
        Terminates cleanly when a completion, failure, or terminal error event is received.
        """
        if not self.redis_url:
            return

        try:
            import redis.asyncio as aioredis
            client = aioredis.from_url(self.redis_url, decode_responses=True)
            pubsub = client.pubsub()
            channel = f"synora:events:{workflow_id}"
            await pubsub.subscribe(channel)
            logger.info(f"[QueueManager] Subscribed to pub/sub channel '{channel}' for SSE streaming.")

            try:
                async for message in pubsub.listen():
                    if message and message.get("type") == "message":
                        raw_data = message.get("data")
                        if raw_data:
                            try:
                                payload = json.loads(raw_data) if isinstance(raw_data, str) else raw_data
                                yield payload
                                event_name = payload.get("event")
                                if event_name in ("workflow_completed", "workflow_failed", "error"):
                                    logger.info(f"[QueueManager] Terminal event '{event_name}' received for '{workflow_id}'. Closing subscription.")
                                    break
                            except Exception as e:
                                logger.error(f"[QueueManager] Failed to parse message from '{channel}': {e}")
            finally:
                try:
                    await pubsub.unsubscribe(channel)
                    await client.close()
                except Exception:
                    pass
        except Exception as conn_err:
            logger.error(f"[QueueManager] Async Redis subscription error: {conn_err}")


# Global queue manager singleton
_queue_manager: Optional[QueueManager] = None


def get_queue_manager() -> QueueManager:
    global _queue_manager
    if _queue_manager is None:
        _queue_manager = QueueManager()
    return _queue_manager
