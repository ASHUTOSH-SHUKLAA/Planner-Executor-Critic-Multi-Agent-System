"""
Admin Management & System Monitoring Endpoints.
Guarded by require_admin RBAC dependency. Exposes real system metrics, users, and execution logs.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from src.api.auth import require_admin
from src.api.database import (
    get_admin_stats,
    list_all_users,
    list_all_workflows,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class AdminStatsResponse(BaseModel):
    total_users: int
    total_tasks: int
    completed_tasks: int
    failed_tasks: int
    running_tasks: int
    total_tokens: int
    total_cost_usd: float


class AdminUserItem(BaseModel):
    id: int
    email: str
    name: str
    role: str
    created_at: str
    total_tasks: int


class AdminWorkflowItem(BaseModel):
    workflow_id: str
    user_id: int
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    task: str
    status: str
    total_tokens: int
    estimated_cost_usd: float
    created_at: str


@router.get("/stats", response_model=AdminStatsResponse)
def get_system_stats(admin: Dict[str, Any] = Depends(require_admin)):
    """Fetches real-time system metrics computed directly from the SQLite database."""
    stats = get_admin_stats()
    return AdminStatsResponse(**stats)


@router.get("/users", response_model=List[AdminUserItem])
def get_users_list(admin: Dict[str, Any] = Depends(require_admin)):
    """Returns list of registered users and their task counts."""
    users = list_all_users()
    return [
        AdminUserItem(
            id=u["id"],
            email=u["email"],
            name=u["name"],
            role=u["role"],
            created_at=str(u["created_at"]),
            total_tasks=u["total_tasks"],
        )
        for u in users
    ]


@router.get("/workflows", response_model=List[AdminWorkflowItem])
def get_all_workflows(admin: Dict[str, Any] = Depends(require_admin)):
    """Returns system-wide execution history for monitoring."""
    records = list_all_workflows(limit=100)
    return [
        AdminWorkflowItem(
            workflow_id=r["workflow_id"],
            user_id=r["user_id"],
            user_email=r.get("user_email"),
            user_name=r.get("user_name"),
            task=r["task"],
            status=r["status"],
            total_tokens=r["total_tokens"],
            estimated_cost_usd=r["estimated_cost_usd"],
            created_at=str(r["created_at"]),
        )
        for r in records
    ]


@router.get("/server-logs")
def get_server_logs(admin: Dict[str, Any] = Depends(require_admin)):
    """Returns the persistent server audit log file content from logs/user_activity.log."""
    from src.api.audit_logger import get_server_log_content
    return {
        "log_file": "logs/user_activity.log",
        "content": get_server_log_content(max_lines=500),
    }
