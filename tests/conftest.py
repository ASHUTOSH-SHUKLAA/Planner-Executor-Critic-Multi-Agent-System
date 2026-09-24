"""
Pytest configuration for TriadFlow test suite.
Isolates tests to an ephemeral test database (triadflow_test.db) so that test runs
NEVER pollute the production/development database (app.db).
"""

import os
import tempfile
import pytest

TEST_DB_FILE = os.path.join(tempfile.gettempdir(), "triadflow_test.db")

# Point all test database operations to an isolated test SQLite file
os.environ["DATABASE_PATH"] = TEST_DB_FILE


@pytest.fixture(scope="session", autouse=True)
def setup_test_database_session():
    """Initializes schema on the isolated test database and cleans up after tests."""
    from src.api.database import init_db

    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

    init_db()
    yield

    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass
