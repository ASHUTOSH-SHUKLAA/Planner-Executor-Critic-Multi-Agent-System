"""
Server Audit Logger.
Maintains persistent, timestamped log files in the codebase server for all users and activities:
- Registration, login, and authentication events
- Research workflow executions, step telemetry, and token costs
- Report downloads and system queries

Log File: `logs/user_activity.log`
"""

import os
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any

# Root directory of the repository
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
LOGS_DIR = ROOT_DIR / "logs"
ACTIVITY_LOG_FILE = LOGS_DIR / "user_activity.log"
WORKFLOWS_JSONL_FILE = LOGS_DIR / "user_workflows.jsonl"

_log_lock = threading.Lock()

def _ensure_logs_dir():
    """Ensure logs directory exists."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

def log_user_event(
    action: str,
    user_id: Optional[int] = None,
    email: Optional[str] = None,
    role: Optional[str] = "user",
    details: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
):
    """
    Appends a formatted user activity line to logs/user_activity.log
    and a structured record to logs/user_workflows.jsonl.
    """
    _ensure_logs_dir()
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    uid_str = str(user_id) if user_id is not None else "ANONYMOUS"
    email_str = email or "unknown"
    role_str = role or "user"
    details_str = f" - {details}" if details else ""

    extra_parts = []
    if extra:
        for k, v in extra.items():
            extra_parts.append(f"{k}={v}")
    extra_str = (" | " + ", ".join(extra_parts)) if extra_parts else ""

    log_line = (
        f"[{now_utc}] [USER:{uid_str}] [EMAIL:{email_str}] [ROLE:{role_str}] "
        f"[ACTION:{action}]{details_str}{extra_str}\n"
    )

    json_record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "email": email,
        "role": role,
        "action": action,
        "details": details,
        **(extra or {}),
    }

    with _log_lock:
        try:
            with open(ACTIVITY_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(log_line)
            with open(WORKFLOWS_JSONL_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(json_record) + "\n")
        except Exception as e:
            # Non-blocking fallback
            print(f"[AuditLogger Error] Failed to write log: {e}")

def get_server_log_content(max_lines: int = 500) -> str:
    """Reads the last N lines from the server user_activity.log file."""
    _ensure_logs_dir()
    if not ACTIVITY_LOG_FILE.exists():
        return "No server log records created yet."

    with _log_lock:
        try:
            with open(ACTIVITY_LOG_FILE, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
                return "".join(lines[-max_lines:])
        except Exception as e:
            return f"Error reading server log file: {e}"
