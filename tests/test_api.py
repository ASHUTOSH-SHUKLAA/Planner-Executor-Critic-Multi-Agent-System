"""
Unit and Integration Tests for FastAPI Endpoints (Phase A).
Tests Health, Authentication (Register, Login, Me), and Workflow listing.
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.database import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Ensure database schema is ready before each test."""
    init_db()


def test_health_check():
    """Verify health check endpoint returns 200 and status healthy."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_system_info():
    """Verify system info endpoint returns supported models and features."""
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert "default_model" in data
    assert "supported_models" in data
    assert len(data["features"]) >= 4


def test_auth_registration_and_login_flow():
    """Verify user registration, duplicate prevention, and login."""
    test_email = f"engineer_{pytest.importorskip('uuid').uuid4().hex[:6]}@example.com"
    test_password = "SecurePassword123!"

    # 1. Register new user
    reg_response = client.post(
        "/api/auth/register",
        json={
            "name": "Lead AI Engineer",
            "email": test_email,
            "password": test_password,
        },
    )
    assert reg_response.status_code == 200
    reg_data = reg_response.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == test_email
    token = reg_data["access_token"]

    # 2. Duplicate registration should fail
    dup_response = client.post(
        "/api/auth/register",
        json={
            "name": "Duplicate User",
            "email": test_email,
            "password": test_password,
        },
    )
    assert dup_response.status_code == 400

    # 3. Successful Login
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": test_email,
            "password": test_password,
        },
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()

    # 4. Bad Password Login should fail
    bad_login = client.post(
        "/api/auth/login",
        json={
            "email": test_email,
            "password": "WrongPassword999",
        },
    )
    assert bad_login.status_code == 401

    # 5. Access Protected Profile /me with Bearer token
    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == test_email


def test_workflows_list_endpoint():
    """Verify workflow listing returns 200 list."""
    response = client.get("/api/workflows")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
