"""
Migration Utility: SQLite (Local app.db) -> PostgreSQL (Render Production)
Migrates all users, research workflows, and verification codes from local SQLite to PostgreSQL.
Preserves user associations, full research state JSONs, token metrics, and timestamps.
"""

import os
import sys
import json
import sqlite3
import argparse
from typing import Dict, Any

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

DEFAULT_SQLITE_PATH = os.path.join(PROJECT_ROOT, "app.db")


def normalize_postgres_url(url: str) -> str:
    """Normalizes postgres:// scheme to postgresql:// for psycopg2."""
    url = url.strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


def migrate(sqlite_path: str, pg_url: str):
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("[ERROR] psycopg2 is not installed. Run: pip install psycopg2-binary")
        sys.exit(1)

    if not os.path.exists(sqlite_path):
        print(f"[ERROR] SQLite database not found at {sqlite_path}")
        sys.exit(1)

    normalized_url = normalize_postgres_url(pg_url)
    # Mask password for display
    masked_url = normalized_url
    if "@" in masked_url:
        prefix, host = masked_url.split("@", 1)
        if ":" in prefix:
            proto_user = prefix.split(":", 2)[:2]
            masked_url = f"{':'.join(proto_user)}:****@{host}"

    print(f"\n=======================================================")
    print(f" Synora Database Migration: SQLite -> PostgreSQL")
    print(f"=======================================================")
    print(f" Source SQLite : {sqlite_path}")
    print(f" Target PG     : {masked_url}")
    print(f"-------------------------------------------------------")

    # Connect to SQLite
    print("[1/5] Reading data from local SQLite database...")
    sq_conn = sqlite3.connect(sqlite_path)
    sq_conn.row_factory = sqlite3.Row
    sq_cur = sq_conn.cursor()

    # Read users
    sq_cur.execute("SELECT id, email, name, password_hash, role, created_at FROM users ORDER BY id ASC")
    sqlite_users = [dict(r) for r in sq_cur.fetchall()]
    print(f"      Found {len(sqlite_users)} users in SQLite.")

    # Read workflows
    sq_cur.execute("""
        SELECT workflow_id, user_id, task, status, total_tokens, estimated_cost_usd, state_json, created_at
        FROM workflows ORDER BY created_at ASC
    """)
    sqlite_workflows = [dict(r) for r in sq_cur.fetchall()]
    print(f"      Found {len(sqlite_workflows)} workflows in SQLite.")

    # Read verification codes
    try:
        sq_cur.execute("SELECT email, code, expires_at, attempts, created_at FROM verification_codes")
        sqlite_codes = [dict(r) for r in sq_cur.fetchall()]
    except Exception:
        sqlite_codes = []
    print(f"      Found {len(sqlite_codes)} verification codes in SQLite.")

    # Connect to PostgreSQL
    print("\n[2/5] Connecting to target PostgreSQL database...")
    try:
        pg_conn = psycopg2.connect(normalized_url)
        pg_conn.autocommit = False
        pg_cur = pg_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        print("      PostgreSQL connection established successfully!")
    except Exception as e:
        print(f"[ERROR] Failed to connect to PostgreSQL: {e}")
        sys.exit(1)

    # Initialize tables if needed
    print("\n[3/5] Verifying PostgreSQL schema...")
    try:
        pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(50) DEFAULT 'user' NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """)

        pg_cur.execute("""
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

        pg_cur.execute("""
        CREATE TABLE IF NOT EXISTS verification_codes (
            email VARCHAR(255) PRIMARY KEY,
            code VARCHAR(20) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            attempts INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """)
        pg_conn.commit()
        print("      Schema verified.")
    except Exception as e:
        pg_conn.rollback()
        print(f"[ERROR] Schema verification failed: {e}")
        sys.exit(1)

    # Migrate Users
    print("\n[4/5] Migrating Users...")
    user_id_map: Dict[int, int] = {}
    users_migrated = 0

    for u in sqlite_users:
        sq_id = u["id"]
        email = u["email"].strip().lower()
        name = u["name"]
        password_hash = u["password_hash"]
        role = u["role"]
        created_at = u["created_at"]

        # Check if user already exists by email
        pg_cur.execute("SELECT id FROM users WHERE email = %s;", (email,))
        existing = pg_cur.fetchone()

        if existing:
            pg_id = existing["id"]
            pg_cur.execute(
                "UPDATE users SET name = %s, role = %s WHERE id = %s;",
                (name, role, pg_id),
            )
            user_id_map[sq_id] = pg_id
            print(f"      [SYNC] User {email} already exists (PG id={pg_id}). Updated info.")
        else:
            # Insert preserving SQLite id if possible
            try:
                pg_cur.execute(
                    """
                    INSERT INTO users (id, email, name, password_hash, role, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id;
                    """,
                    (sq_id, email, name, password_hash, role, created_at),
                )
                new_id = pg_cur.fetchone()["id"]
                user_id_map[sq_id] = new_id
                users_migrated += 1
                print(f"      [INSERT] User {email} inserted with id={new_id}.")
            except Exception as e:
                pg_conn.rollback()
                # Fallback: insert without explicit id
                pg_cur.execute(
                    """
                    INSERT INTO users (email, name, password_hash, role, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id;
                    """,
                    (email, name, password_hash, role, created_at),
                )
                new_id = pg_cur.fetchone()["id"]
                user_id_map[sq_id] = new_id
                users_migrated += 1
                print(f"      [INSERT] User {email} inserted with assigned id={new_id}.")

    # Reset sequence so future user registrations won't conflict
    try:
        pg_cur.execute("SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));")
        pg_conn.commit()
    except Exception as e:
        print(f"      [WARN] Could not update users_id_seq: {e}")
        pg_conn.commit()

    # Migrate Workflows
    print(f"\n[5/5] Migrating {len(sqlite_workflows)} Workflows...")
    workflows_migrated = 0
    workflows_skipped = 0

    for idx, wf in enumerate(sqlite_workflows, 1):
        sq_user_id = wf["user_id"]
        pg_user_id = user_id_map.get(sq_user_id)

        if not pg_user_id:
            print(f"      [SKIP] Workflow {wf['workflow_id']}: User ID {sq_user_id} not mapped.")
            workflows_skipped += 1
            continue

        wf_id = wf["workflow_id"]
        task = wf["task"]
        status = wf["status"]
        total_tokens = wf.get("total_tokens") or 0
        cost = wf.get("estimated_cost_usd") or 0.0
        state_json = wf["state_json"]
        created_at = wf["created_at"]

        pg_cur.execute(
            """
            INSERT INTO workflows (workflow_id, user_id, task, status, total_tokens, estimated_cost_usd, state_json, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (workflow_id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                task = EXCLUDED.task,
                status = EXCLUDED.status,
                total_tokens = EXCLUDED.total_tokens,
                estimated_cost_usd = EXCLUDED.estimated_cost_usd,
                state_json = EXCLUDED.state_json,
                created_at = EXCLUDED.created_at;
            """,
            (wf_id, pg_user_id, task, status, total_tokens, cost, state_json, created_at),
        )
        workflows_migrated += 1

        if idx % 20 == 0 or idx == len(sqlite_workflows):
            print(f"      Progress: {idx}/{len(sqlite_workflows)} workflows processed...")

    pg_conn.commit()

    # Verification Query
    print("\n-------------------------------------------------------")
    print(" Post-Migration Verification on PostgreSQL:")
    pg_cur.execute("SELECT count(*) as total_users FROM users;")
    pg_total_users = pg_cur.fetchone()["total_users"]
    pg_cur.execute("SELECT count(*) as total_workflows FROM workflows;")
    pg_total_workflows = pg_cur.fetchone()["total_workflows"]

    print(f" Total Users in Postgres     : {pg_total_users}")
    print(f" Total Workflows in Postgres : {pg_total_workflows}")
    print("\n Workflows per User Breakdown:")
    pg_cur.execute("""
        SELECT u.email, count(w.workflow_id) as count
        FROM users u
        LEFT JOIN workflows w ON u.id = w.user_id
        GROUP BY u.email
        ORDER BY count DESC;
    """)
    for r in pg_cur.fetchall():
        print(f"   - {r['email']:<45} : {r['count']} workflows")

    pg_cur.close()
    pg_conn.close()
    sq_conn.close()

    print("=======================================================")
    print(" Migration Complete! All research history is now live in PostgreSQL.")
    print("=======================================================\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate Synora SQLite to PostgreSQL on Render")
    parser.add_argument(
        "--pg-url",
        type=str,
        default=os.getenv("DATABASE_URL") or os.getenv("RENDER_DATABASE_URL"),
        help="PostgreSQL connection string (External Database URL from Render)",
    )
    parser.add_argument(
        "--sqlite-path",
        type=str,
        default=DEFAULT_SQLITE_PATH,
        help="Path to local app.db (defaults to project root app.db)",
    )
    args = parser.parse_args()

    if not args.pg_url:
        print("[ERROR] PostgreSQL connection string is required.")
        print("Please provide it via --pg-url or by setting the DATABASE_URL environment variable.")
        print("\nExample:")
        print("  python scripts/migrate_sqlite_to_postgres.py --pg-url \"postgresql://user:pass@dpg-xxx.oregon-postgres.render.com/dbname\"")
        sys.exit(1)

    migrate(sqlite_path=args.sqlite_path, pg_url=args.pg_url)
