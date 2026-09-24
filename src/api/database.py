"""
Database layer for FastAPI backend.
Uses SQLite for robust local persistence of Users, Roles, Workflows, and Citations.
Implements strict resource ownership and admin analytics.
"""

import sqlite3
import os
import json
import bcrypt
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the database schema and performs schema migrations."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Check if 'role' column exists in users table (migration for existing DBs)
    cursor.execute("PRAGMA table_info(users);")
    columns = [col["name"] for col in cursor.fetchall()]
    if "role" not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' NOT NULL;")

    # 2. Workflows History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workflows (
        workflow_id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        task TEXT NOT NULL,
        status TEXT NOT NULL,
        total_tokens INTEGER DEFAULT 0,
        estimated_cost_usd REAL DEFAULT 0.0,
        state_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    # 3. Passwordless OTP Verification Codes Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS verification_codes (
        email TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempts INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()

    # 3. Seed Default Admin User if no admin exists
    cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1;")
    admin = cursor.fetchone()
    if not admin:
        admin_email = "admin@triadflow.ai"
        cursor.execute("SELECT id FROM users WHERE email = ?;", (admin_email,))
        existing = cursor.fetchone()
        if not existing:
            salt = bcrypt.gensalt()
            pw_hash = bcrypt.hashpw("AdminPass123!".encode("utf-8"), salt).decode("utf-8")
            cursor.execute(
                "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)",
                (admin_email, "System Administrator", pw_hash, "admin"),
            )
            conn.commit()

    conn.close()


# User CRUD Operations
def create_user(email: str, name: str, password_hash: str, role: str = "user") -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)",
        (email.lower().strip(), name.strip(), password_hash, role),
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {
        "id": user_id,
        "email": email.lower().strip(),
        "name": name.strip(),
        "role": role,
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


# Passwordless OTP Verification Operations
def save_verification_code(email: str, code: str, expires_in_minutes: int = 10):
    """Stores or updates a 6-digit verification code with a strict expiration window."""
    from datetime import timedelta
    conn = get_db_connection()
    cursor = conn.cursor()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
    cursor.execute("""
        INSERT INTO verification_codes (email, code, expires_at, attempts, created_at)
        VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
        ON CONFLICT(email) DO UPDATE SET
            code = excluded.code,
            expires_at = excluded.expires_at,
            attempts = 0,
            created_at = CURRENT_TIMESTAMP
    """, (email.lower().strip(), code.strip(), expires_at.isoformat()))
    conn.commit()
    conn.close()


def verify_code_match(email: str, input_code: str) -> tuple[bool, str]:
    """
    Validates the provided OTP code against the database:
    - Verifies existence
    - Enforces expiry window (10 mins)
    - Enforces maximum failed attempts (rate limit to prevent brute force)
    - Clears the code upon success to prevent replay attacks
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT code, expires_at, attempts FROM verification_codes WHERE email = ?",
        (email.lower().strip(),),
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False, "No active verification code found for this email. Please request a new code."

    now = datetime.now(timezone.utc)
    try:
        expires_at = datetime.fromisoformat(row["expires_at"])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
    except Exception:
        expires_at = now

    if now > expires_at:
        cursor.execute("DELETE FROM verification_codes WHERE email = ?", (email.lower().strip(),))
        conn.commit()
        conn.close()
        return False, "Verification code has expired. Please request a new code."

    if row["attempts"] >= 5:
        cursor.execute("DELETE FROM verification_codes WHERE email = ?", (email.lower().strip(),))
        conn.commit()
        conn.close()
        return False, "Too many failed attempts. Security lock engaged. Please request a new code."

    if row["code"].strip() != input_code.strip():
        cursor.execute(
            "UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ?",
            (email.lower().strip(),),
        )
        conn.commit()
        conn.close()
        return False, "Invalid verification code. Please check the code and try again."

    # Successful match: delete the OTP to prevent replay
    cursor.execute("DELETE FROM verification_codes WHERE email = ?", (email.lower().strip(),))
    conn.commit()
    conn.close()
    return True, "Verification successful."


# Workflow History & Ownership Operations
def save_workflow_record(
    workflow_id: str,
    user_id: int,
    task: str,
    status: str,
    total_tokens: int,
    estimated_cost_usd: float,
    state_dict: Dict[str, Any],
):
    conn = get_db_connection()
    cursor = conn.cursor()
    state_json = json.dumps(state_dict, default=str)
    cursor.execute(
        """
        INSERT INTO workflows (workflow_id, user_id, task, status, total_tokens, estimated_cost_usd, state_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(workflow_id) DO UPDATE SET
            status = excluded.status,
            total_tokens = excluded.total_tokens,
            estimated_cost_usd = excluded.estimated_cost_usd,
            state_json = excluded.state_json
        """,
        (workflow_id, user_id, task, status, total_tokens, estimated_cost_usd, state_json),
    )
    conn.commit()
    conn.close()


def list_user_workflows(user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """Enforces resource ownership: users can only see their own tasks."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT workflow_id, task, status, total_tokens, estimated_cost_usd, created_at FROM workflows WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_workflow_record(
    workflow_id: str,
    user_id: Optional[int] = None,
    is_admin: bool = False,
) -> Optional[Dict[str, Any]]:
    """
    Fetches a workflow record with strict resource ownership verification.
    Normal users can ONLY fetch workflows they own. Admins can fetch any workflow.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    if is_admin or user_id is None:
        cursor.execute("SELECT * FROM workflows WHERE workflow_id = ?", (workflow_id,))
    else:
        cursor.execute(
            "SELECT * FROM workflows WHERE workflow_id = ? AND user_id = ?",
            (workflow_id, user_id),
        )

    row = cursor.fetchone()
    conn.close()
    if row:
        data = dict(row)
        try:
            data["state"] = json.loads(data["state_json"])
        except Exception:
            data["state"] = {}
        return data
    return None


# Admin System Operations
def get_admin_stats() -> Dict[str, Any]:
    """Computes real system-level analytics directly from the database (no mock data)."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as count FROM users;")
    total_users = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM workflows;")
    total_tasks = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM workflows WHERE status = 'COMPLETED';")
    completed_tasks = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM workflows WHERE status = 'FAILED';")
    failed_tasks = cursor.fetchone()["count"]

    cursor.execute("SELECT COUNT(*) as count FROM workflows WHERE status NOT IN ('COMPLETED', 'FAILED');")
    running_tasks = cursor.fetchone()["count"]

    cursor.execute("SELECT COALESCE(SUM(total_tokens), 0) as tokens, COALESCE(SUM(estimated_cost_usd), 0.0) as cost FROM workflows;")
    usage_row = cursor.fetchone()

    conn.close()

    return {
        "total_users": total_users,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "failed_tasks": failed_tasks,
        "running_tasks": running_tasks,
        "total_tokens": usage_row["tokens"],
        "total_cost_usd": round(usage_row["cost"], 5),
    }


def list_all_users() -> List[Dict[str, Any]]:
    """Returns all registered users with their task counts for admin view."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.email, u.name, u.role, u.created_at,
               COUNT(w.workflow_id) as total_tasks
        FROM users u
        LEFT JOIN workflows w ON u.id = w.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC;
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def list_all_workflows(limit: int = 100) -> List[Dict[str, Any]]:
    """Returns system-wide workflows with user details for admin monitoring."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT w.workflow_id, w.user_id, u.email as user_email, u.name as user_name,
               w.task, w.status, w.total_tokens, w.estimated_cost_usd, w.created_at
        FROM workflows w
        LEFT JOIN users u ON w.user_id = u.id
        ORDER BY w.created_at DESC
        LIMIT ?;
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
