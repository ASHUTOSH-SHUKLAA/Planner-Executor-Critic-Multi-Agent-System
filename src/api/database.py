"""
Database layer for FastAPI backend.
Supports both PostgreSQL (production on Render) and SQLite (local dev & testing).
Dynamically activates PostgreSQL when DATABASE_URL is set, with graceful fallback to SQLite.
Implements strict resource ownership, passwordless OTP, and admin analytics.
"""

import os
import json
import sqlite3
import bcrypt
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

logger = logging.getLogger("synora.database")

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "app.db")

try:
    import psycopg2
    import psycopg2.extras
    from psycopg2 import pool
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False


def is_postgres() -> bool:
    """Detects whether PostgreSQL is configured via DATABASE_URL."""
    db_url = os.getenv("DATABASE_URL", "").strip()
    return db_url.startswith("postgres://") or db_url.startswith("postgresql://")


def get_postgres_url() -> str:
    """Normalizes postgres:// to postgresql:// for psycopg2 compatibility."""
    url = os.getenv("DATABASE_URL", "").strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


def get_db_path() -> str:
    """Returns the active SQLite database file path (supports test database isolation)."""
    return os.getenv("DATABASE_PATH", DEFAULT_DB_PATH)


# Global PostgreSQL connection pool (initialized lazily)
_pg_pool: Optional[Any] = None


def get_pg_pool():
    global _pg_pool
    if _pg_pool is None and is_postgres() and PSYCOPG2_AVAILABLE:
        try:
            url = get_postgres_url()
            _pg_pool = pool.ThreadedConnectionPool(minconn=1, maxconn=10, dsn=url)
            logger.info("[Database] Initialized PostgreSQL connection pool.")
        except Exception as e:
            logger.error(f"[Database] Failed to initialize PostgreSQL pool: {e}")
            _pg_pool = None
    return _pg_pool


def get_db_connection():
    """
    Returns a raw database connection.
    For PostgreSQL, returns a connection from the pool.
    For SQLite, returns a standard sqlite3.Connection with Row factory.
    """
    if is_postgres() and PSYCOPG2_AVAILABLE:
        pg_pool = get_pg_pool()
        if pg_pool:
            return pg_pool.getconn()
        return psycopg2.connect(get_postgres_url())
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_db():
    """
    Context manager providing a unified (conn, cursor) tuple.
    Handles cursor cleanup and pool release automatically.
    """
    if is_postgres() and PSYCOPG2_AVAILABLE:
        pg_pool = get_pg_pool()
        conn = pg_pool.getconn() if pg_pool else psycopg2.connect(get_postgres_url())
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                yield conn, cur
        finally:
            if pg_pool:
                pg_pool.putconn(conn)
            else:
                conn.close()
    else:
        conn = sqlite3.connect(get_db_path())
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        try:
            yield conn, cur
        finally:
            conn.close()


def _exec(cursor, sql: str, params: tuple = ()):
    """
    Normalizes parameter placeholders: converts SQLite '?' to PostgreSQL '%s' when running on Postgres.
    """
    if is_postgres():
        pg_sql = sql.replace("?", "%s")
        cursor.execute(pg_sql, params)
    else:
        cursor.execute(sql, params)


def check_db_health() -> tuple[bool, str]:
    """Tests connectivity to the active database engine."""
    try:
        with get_db() as (conn, cursor):
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        engine_name = "PostgreSQL" if is_postgres() else "SQLite"
        return True, f"{engine_name} connected"
    except Exception as e:
        return False, str(e)


def init_db():
    """Initializes database schema and default admin seed for both PostgreSQL and SQLite."""
    with get_db() as (conn, cursor):
        if is_postgres():
            # 1. PostgreSQL Schema
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(50) DEFAULT 'user' NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS workflows (
                workflow_id VARCHAR(100) PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                task TEXT NOT NULL,
                status VARCHAR(50) NOT NULL,
                total_tokens INTEGER DEFAULT 0,
                estimated_cost_usd DOUBLE PRECISION DEFAULT 0.0,
                state_json TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS verification_codes (
                email VARCHAR(255) PRIMARY KEY,
                code VARCHAR(20) NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                attempts INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """)
            conn.commit()
        else:
            # 1. SQLite Schema
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

            cursor.execute("PRAGMA table_info(users);")
            columns = [col["name"] for col in cursor.fetchall()]
            if "role" not in columns:
                cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' NOT NULL;")

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

        # Seed Default Admin User if no admin exists
        cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1;")
        admin = cursor.fetchone()
        if not admin:
            admin_email = "admin@triadflow.ai"
            _exec(cursor, "SELECT id FROM users WHERE email = ?;", (admin_email,))
            existing = cursor.fetchone()
            if not existing:
                salt = bcrypt.gensalt()
                pw_hash = bcrypt.hashpw("AdminPass123!".encode("utf-8"), salt).decode("utf-8")
                _exec(
                    cursor,
                    "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?);",
                    (admin_email, "System Administrator", pw_hash, "admin"),
                )
                conn.commit()


# User CRUD Operations
def create_user(email: str, name: str, password_hash: str, role: str = "user") -> Dict[str, Any]:
    with get_db() as (conn, cursor):
        clean_email = email.lower().strip()
        clean_name = name.strip()
        if is_postgres():
            cursor.execute(
                "INSERT INTO users (email, name, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING id;",
                (clean_email, clean_name, password_hash, role),
            )
            user_id = cursor.fetchone()["id"]
        else:
            cursor.execute(
                "INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?);",
                (clean_email, clean_name, password_hash, role),
            )
            user_id = cursor.lastrowid
        conn.commit()

    return {
        "id": user_id,
        "email": clean_email,
        "name": clean_name,
        "role": role,
    }


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    with get_db() as (conn, cursor):
        _exec(cursor, "SELECT * FROM users WHERE email = ?;", (email.lower().strip(),))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    with get_db() as (conn, cursor):
        _exec(cursor, "SELECT * FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None


def set_user_role(user_id: int, role: str):
    """Updates a user's role (e.g. promoting to admin)."""
    with get_db() as (conn, cursor):
        _exec(cursor, "UPDATE users SET role = ? WHERE id = ?;", (role, user_id))
        conn.commit()


def update_user_name(user_id: int, name: str) -> bool:
    """Updates a user's authentic display name."""
    clean_name = (name or "").strip()
    if not clean_name:
        return False
    with get_db() as (conn, cursor):
        _exec(cursor, "UPDATE users SET name = ? WHERE id = ?;", (clean_name, user_id))
        rows_affected = cursor.rowcount
        conn.commit()
    return rows_affected > 0


# Passwordless OTP Verification Operations
def save_verification_code(email: str, code: str, expires_in_minutes: int = 10):
    """Stores or updates a 6-digit verification code with an expiration window."""
    from datetime import timedelta
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)
    with get_db() as (conn, cursor):
        _exec(
            cursor,
            """
            INSERT INTO verification_codes (email, code, expires_at, attempts, created_at)
            VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
            ON CONFLICT(email) DO UPDATE SET
                code = excluded.code,
                expires_at = excluded.expires_at,
                attempts = 0,
                created_at = CURRENT_TIMESTAMP;
            """,
            (email.lower().strip(), code.strip(), expires_at.isoformat()),
        )
        conn.commit()


def verify_code_match(email: str, input_code: str) -> tuple[bool, str]:
    """Validates the OTP code against expiration and attempts threshold."""
    with get_db() as (conn, cursor):
        _exec(
            cursor,
            "SELECT code, expires_at, attempts FROM verification_codes WHERE email = ?;",
            (email.lower().strip(),),
        )
        row = cursor.fetchone()
        if not row:
            return False, "No active verification code found for this email. Please request a new code."

        now = datetime.now(timezone.utc)
        raw_expires = row["expires_at"]
        try:
            if isinstance(raw_expires, datetime):
                expires_at = raw_expires
            else:
                expires_at = datetime.fromisoformat(str(raw_expires))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
        except Exception:
            expires_at = now

        if now > expires_at:
            _exec(cursor, "DELETE FROM verification_codes WHERE email = ?;", (email.lower().strip(),))
            conn.commit()
            return False, "Verification code has expired. Please request a new code."

        if row["attempts"] >= 5:
            _exec(cursor, "DELETE FROM verification_codes WHERE email = ?;", (email.lower().strip(),))
            conn.commit()
            return False, "Too many failed attempts. Security lock engaged. Please request a new code."

        if row["code"].strip() != input_code.strip():
            _exec(
                cursor,
                "UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ?;",
                (email.lower().strip(),),
            )
            conn.commit()
            return False, "Invalid verification code. Please check the code and try again."

        # Successful match: delete the OTP to prevent replay
        _exec(cursor, "DELETE FROM verification_codes WHERE email = ?;", (email.lower().strip(),))
        conn.commit()
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
    with get_db() as (conn, cursor):
        state_json = json.dumps(state_dict, default=str)
        _exec(
            cursor,
            """
            INSERT INTO workflows (workflow_id, user_id, task, status, total_tokens, estimated_cost_usd, state_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(workflow_id) DO UPDATE SET
                status = excluded.status,
                total_tokens = excluded.total_tokens,
                estimated_cost_usd = excluded.estimated_cost_usd,
                state_json = excluded.state_json;
            """,
            (workflow_id, user_id, task, status, total_tokens, estimated_cost_usd, state_json),
        )
        conn.commit()


def list_user_workflows(user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """Enforces resource ownership: users can only see their own tasks."""
    with get_db() as (conn, cursor):
        _exec(
            cursor,
            "SELECT workflow_id, task, status, total_tokens, estimated_cost_usd, created_at FROM workflows WHERE user_id = ? ORDER BY created_at DESC LIMIT ?;",
            (user_id, limit),
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def get_workflow_record(
    workflow_id: str,
    user_id: Optional[int] = None,
    is_admin: bool = False,
) -> Optional[Dict[str, Any]]:
    """Fetches a workflow record with strict resource ownership verification."""
    with get_db() as (conn, cursor):
        if is_admin or user_id is None:
            _exec(cursor, "SELECT * FROM workflows WHERE workflow_id = ?;", (workflow_id,))
        else:
            _exec(
                cursor,
                "SELECT * FROM workflows WHERE workflow_id = ? AND user_id = ?;",
                (workflow_id, user_id),
            )

        row = cursor.fetchone()
        if row:
            data = dict(row)
            try:
                data["state"] = json.loads(data["state_json"])
            except Exception:
                data["state"] = {}
            return data
    return None


def delete_workflow_record(workflow_id: str, user_id: int) -> bool:
    """Deletes a workflow record owned strictly by the requesting user."""
    with get_db() as (conn, cursor):
        _exec(cursor, "DELETE FROM workflows WHERE workflow_id = ? AND user_id = ?;", (workflow_id, user_id))
        affected = cursor.rowcount > 0
        conn.commit()
    return affected


# Admin System Operations
def get_admin_stats() -> Dict[str, Any]:
    """Computes real system-level analytics directly from the database (no mock data)."""
    with get_db() as (conn, cursor):
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'user';")
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

        return {
            "total_users": total_users,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "failed_tasks": failed_tasks,
            "running_tasks": running_tasks,
            "total_tokens": usage_row["tokens"],
            "total_cost_usd": round(float(usage_row["cost"]), 5),
        }


def list_all_users() -> List[Dict[str, Any]]:
    """Returns all registered users with their task counts for admin view."""
    with get_db() as (conn, cursor):
        cursor.execute("""
            SELECT u.id, u.email, u.name, u.role, u.created_at,
                   COUNT(w.workflow_id) as total_tasks
            FROM users u
            LEFT JOIN workflows w ON u.id = w.user_id
            GROUP BY u.id, u.email, u.name, u.role, u.created_at
            ORDER BY u.created_at DESC;
        """)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]


def list_all_workflows(limit: int = 100, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Returns system-wide workflows with user details for admin monitoring, optionally filtered by user_id."""
    with get_db() as (conn, cursor):
        if user_id is not None:
            _exec(
                cursor,
                """
                SELECT w.workflow_id, w.user_id, u.email as user_email, u.name as user_name,
                       w.task, w.status, w.total_tokens, w.estimated_cost_usd, w.created_at
                FROM workflows w
                LEFT JOIN users u ON w.user_id = u.id
                WHERE w.user_id = ?
                ORDER BY w.created_at DESC
                LIMIT ?;
                """,
                (user_id, limit),
            )
        else:
            _exec(
                cursor,
                """
                SELECT w.workflow_id, w.user_id, u.email as user_email, u.name as user_name,
                       w.task, w.status, w.total_tokens, w.estimated_cost_usd, w.created_at
                FROM workflows w
                LEFT JOIN users u ON w.user_id = u.id
                ORDER BY w.created_at DESC
                LIMIT ?;
                """,
                (limit,),
            )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
