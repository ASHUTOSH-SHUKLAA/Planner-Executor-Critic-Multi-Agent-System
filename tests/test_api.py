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


def test_workflows_list_endpoint_auth_enforcement():
    """Verify workflow listing requires authentication (401 without token, 200 with token)."""
    # 1. Unauthenticated request should fail with 401
    unauth_resp = client.get("/api/workflows")
    assert unauth_resp.status_code == 401

    # 2. Authenticated request with registered user should succeed
    test_email = f"wf_user_{pytest.importorskip('uuid').uuid4().hex[:6]}@example.com"
    reg_response = client.post(
        "/api/auth/register",
        json={"name": "Workflow Tester", "email": test_email, "password": "Password123!"},
    )
    assert reg_response.status_code == 200
    token = reg_response.json()["access_token"]

    auth_resp = client.get(
        "/api/workflows",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert auth_resp.status_code == 200
    assert isinstance(auth_resp.json(), list)


def test_rbac_admin_endpoints():
    """Verify RBAC: non-admin gets 403, seeded admin gets 200 on /api/admin/*."""
    import uuid
    # 1. Regular user registration
    user_email = f"regular_{uuid.uuid4().hex[:6]}@example.com"
    reg = client.post(
        "/api/auth/register",
        json={"name": "Regular User", "email": user_email, "password": "UserPass123!"},
    )
    user_token = reg.json()["access_token"]

    # 2. Regular user trying to access admin endpoints gets 403
    forbidden_resp = client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert forbidden_resp.status_code == 403
    assert "Administrative privileges required" in forbidden_resp.json()["detail"]

    # 3. Seeded Admin user logs in
    admin_login = client.post(
        "/api/auth/login",
        json={"email": "admin@triadflow.ai", "password": "AdminPass123!"},
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    assert admin_login.json()["user"]["role"] == "admin"

    # 4. Admin accessing /api/admin/stats gets 200
    stats_resp = client.get(
        "/api/admin/stats",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "total_users" in stats
    assert "total_tasks" in stats
    assert stats["total_users"] >= 1

    # 5. Admin accessing /api/admin/users gets 200
    users_resp = client.get(
        "/api/admin/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert users_resp.status_code == 200
    assert isinstance(users_resp.json(), list)

    # 6. Admin accessing /api/admin/workflows gets 200
    wf_resp = client.get(
        "/api/admin/workflows",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert wf_resp.status_code == 200
    assert isinstance(wf_resp.json(), list)


def test_workflow_download_and_ownership():
    """Verify download endpoint ownership checks and 404 handling."""
    import uuid
    from src.api.database import save_workflow_record

    user1_email = f"user1_{uuid.uuid4().hex[:6]}@example.com"
    reg1 = client.post(
        "/api/auth/register",
        json={"name": "User 1", "email": user1_email, "password": "Password123!"},
    )
    user1_id = reg1.json()["user"]["id"]
    token1 = reg1.json()["access_token"]

    user2_email = f"user2_{uuid.uuid4().hex[:6]}@example.com"
    reg2 = client.post(
        "/api/auth/register",
        json={"name": "User 2", "email": user2_email, "password": "Password123!"},
    )
    token2 = reg2.json()["access_token"]

    # Non-existent workflow download returns 404
    missing_resp = client.get(
        "/api/workflows/non-existent-wf-123/download",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert missing_resp.status_code == 404

    # Save a workflow belonging to user 1
    wf_id = f"wf_test_{uuid.uuid4().hex[:8]}"
    save_workflow_record(
        workflow_id=wf_id,
        user_id=user1_id,
        task="Compare EV and Diesel models",
        status="COMPLETED",
        total_tokens=1500,
        estimated_cost_usd=0.002,
        state_dict={
            "final_result": "# Research Report\n\nTata Nexon EV is great.",
            "sources": [{"title": "Tata Motors", "url": "https://tatamotors.com", "domain": "tatamotors.com"}],
        },
    )

    # User 2 tries to download User 1's workflow -> 404 (ownership protection)
    unauthorized_download = client.get(
        f"/api/workflows/{wf_id}/download",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert unauthorized_download.status_code == 404

    # User 1 downloads their own workflow in markdown -> 200
    md_download = client.get(
        f"/api/workflows/{wf_id}/download?format=md",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert md_download.status_code == 200
    assert "Tata Nexon EV is great" in md_download.text
    assert md_download.headers["content-type"].startswith("text/markdown")

    # User 1 downloads their own workflow in text -> 200
    txt_download = client.get(
        f"/api/workflows/{wf_id}/download?format=txt",
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert txt_download.status_code == 200
    assert "Tata Nexon EV is great" in txt_download.text


def test_workflow_request_accepts_both_task_and_goal():
    """Verify that both 'task' and 'goal' keys are valid and accepted by the schema."""
    from src.api.routes.workflows import RunWorkflowRequest
    
    req1 = RunWorkflowRequest(task="Conduct automobile research", mode="parallel")
    assert req1.task == "Conduct automobile research"

    req2 = RunWorkflowRequest(goal="Find best EV vs diesel under 5 lakh", mode="parallel")
    assert req2.task == "Find best EV vs diesel under 5 lakh"

    req3 = RunWorkflowRequest(task="Task text", goal="Goal text", mode="sequential")
    assert req3.task == "Task text"

