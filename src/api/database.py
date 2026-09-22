"""
Database layer for FastAPI backend.
Uses SQLite for zero-configuration, robust local persistence of Users and Workflows.
"""

import sqlite3
import os
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app.db")


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the database schema if tables do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Workflows History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workflows (
        workflow_id TEXT PRIMARY KEY,
        user_id INTEGER,
        task TEXT NOT NULL,
        status TEXT NOT NULL,
        total_tokens INTEGER DEFAULT 0,
        estimated_cost_usd REAL DEFAULT 0.0,
        state_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    );
    """)

    conn.commit()
    conn.close()


# User CRUD Operations
def create_user(email: str, name: str, password_hash: str) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)",
        (email.lower().strip(), name.strip(), password_hash),
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": user_id, "email": email.lower().strip(), "name": name.strip()}


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


# Workflow History Operations
def save_workflow_record(
    workflow_id: str,
    user_id: Optional[int],
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


def list_user_workflows(user_id: Optional[int], limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute(
            "SELECT workflow_id, task, status, total_tokens, estimated_cost_usd, created_at FROM workflows WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        )
    else:
        cursor.execute(
            "SELECT workflow_id, task, status, total_tokens, estimated_cost_usd, created_at FROM workflows ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_workflow_record(workflow_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM workflows WHERE workflow_id = ?", (workflow_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        data = dict(row)
        data["state"] = json.loads(data["state_json"])
        return data
    return None
