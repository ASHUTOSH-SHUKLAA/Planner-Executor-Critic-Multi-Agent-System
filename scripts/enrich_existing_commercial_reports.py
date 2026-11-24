"""
Enrich Existing Commercial Reports Utility:
Updates past commercial product research reports in app.db (and optionally PostgreSQL)
to inject the Master Products Buying List & Lowest Price Deals Table, plus verified lowest price tags.
"""

import os
import sys
import json
import sqlite3
import argparse
from typing import Optional

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.agents.domain_classifier import classify_task_domain
from src.agents.synthesizer import SynthesizerAgent

synthesizer = SynthesizerAgent(gateway=object())

DEFAULT_SQLITE_PATH = os.path.join(PROJECT_ROOT, "app.db")


def enrich_sqlite(db_path: str = DEFAULT_SQLITE_PATH):
    if not os.path.exists(db_path):
        print(f"[!] SQLite DB not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT workflow_id, task, state_json FROM workflows WHERE state_json IS NOT NULL")
    rows = cursor.fetchall()

    print(f"[*] Scanning {len(rows)} research workflows in {db_path}...")
    updated_count = 0

    for workflow_id, task, state_json_str in rows:
        if not task or not state_json_str:
            continue

        try:
            s_data = json.loads(state_json_str)
        except Exception:
            continue

        final_result = s_data.get("final_result")
        if not final_result:
            continue

        domain_info = classify_task_domain(task)
        is_commercial = domain_info.get("is_commercial_product") is True

        non_commercial_cues = r"\b(colleges?|schools?|universit(?:y|ies)|iits?|nits?|iiits?|harvard|stanford|mit|oxford|cambridge|python|javascript|typescript|golang|rust|c\+\+|java|c#|algorithms?|databases?|postgresql|postgres|scylladb|docker|kubernetes|nomad|quantum computing|solid[- ]state)\b"
        import re
        if re.search(non_commercial_cues, task.lower()):
            is_commercial = False
        elif not is_commercial and domain_info.get("domain") not in ["ACADEMIC_INSTITUTION", "TECHNICAL_RESEARCH", "ENGINEERING_GUIDE", "FACT_CHECK_DEBUNK"]:
            product_cues = r"\b(smartphones?|phones?|iphones?|washing machines?|laptops?|macbooks?|cooktops?|air purifiers?|earbuds?|tws|headphones?|refrigerators?|smartwatches?|cameras?|cars?|electric vehicles?)\b"
            if re.search(product_cues, task.lower()):
                is_commercial = True

        if not is_commercial:
            continue

        enriched = synthesizer.enrich_report_with_product_images(final_result, task=task, is_commercial=True)
        if enriched != final_result:
            s_data["final_result"] = enriched
            new_state_json = json.dumps(s_data)
            cursor.execute(
                "UPDATE workflows SET state_json = ? WHERE workflow_id = ?",
                (new_state_json, workflow_id)
            )
            updated_count += 1
            print(f"  [+] Enriched commercial report: '{task[:60]}' (ID: {workflow_id[:8]})")

    conn.commit()
    conn.close()
    print(f"[OK] Successfully re-enriched {updated_count} commercial research reports in SQLite DB.\n")


def enrich_postgres(pg_url: str):
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("[!] psycopg2 not available, skipping Postgres.")
        return

    url = pg_url.strip()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]

    print(f"[*] Connecting to PostgreSQL...")
    conn = psycopg2.connect(url)
    cursor = conn.cursor()

    cursor.execute("SELECT workflow_id, task, state_json FROM workflows WHERE state_json IS NOT NULL")
    rows = cursor.fetchall()
    print(f"[*] Scanning {len(rows)} research workflows in PostgreSQL...")
    updated_count = 0

    for workflow_id, task, state_json_val in rows:
        if not task or not state_json_val:
            continue

        if isinstance(state_json_val, dict):
            s_data = state_json_val
        elif isinstance(state_json_val, str):
            try:
                s_data = json.loads(state_json_val)
            except Exception:
                continue
        else:
            continue

        final_result = s_data.get("final_result")
        if not final_result:
            continue

        domain_info = classify_task_domain(task)
        is_commercial = domain_info.get("is_commercial_product") is True

        non_commercial_cues = r"\b(colleges?|schools?|universit(?:y|ies)|iits?|nits?|iiits?|harvard|stanford|mit|oxford|cambridge|python|javascript|typescript|golang|rust|c\+\+|java|c#|algorithms?|databases?|postgresql|postgres|scylladb|docker|kubernetes|nomad|quantum computing|solid[- ]state)\b"
        import re
        if re.search(non_commercial_cues, task.lower()):
            is_commercial = False
        elif not is_commercial and domain_info.get("domain") not in ["ACADEMIC_INSTITUTION", "TECHNICAL_RESEARCH", "ENGINEERING_GUIDE", "FACT_CHECK_DEBUNK"]:
            product_cues = r"\b(smartphones?|phones?|iphones?|washing machines?|laptops?|macbooks?|cooktops?|air purifiers?|earbuds?|tws|headphones?|refrigerators?|smartwatches?|cameras?|cars?|electric vehicles?)\b"
            if re.search(product_cues, task.lower()):
                is_commercial = True

        if not is_commercial:
            continue

        enriched = synthesizer.enrich_report_with_product_images(final_result, task=task, is_commercial=True)
        if enriched != final_result:
            s_data["final_result"] = enriched
            new_state = psycopg2.extras.Json(s_data)

            cursor.execute(
                "UPDATE workflows SET state_json = %s WHERE workflow_id = %s",
                (new_state, workflow_id)
            )
            updated_count += 1
            print(f"  [+] Enriched Postgres report: '{task[:60]}' (ID: {workflow_id[:8]})")

    conn.commit()
    conn.close()
    print(f"[OK] Successfully re-enriched {updated_count} commercial research reports in PostgreSQL.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Re-enrich commercial reports with Master Products Buying List & Lowest Price Deals")
    parser.add_argument("--sqlite-path", default=DEFAULT_SQLITE_PATH, help="Path to local app.db")
    parser.add_argument("--pg-url", default=None, help="PostgreSQL connection URL")
    args = parser.parse_args()

    enrich_sqlite(args.sqlite_path)

    pg_target = args.pg_url or os.environ.get("DATABASE_URL")
    if pg_target:
        enrich_postgres(pg_target)
