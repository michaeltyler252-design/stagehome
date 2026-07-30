"""
API-level tests using FastAPI's TestClient (Starlette's ASGI test
transport — no real network, no real database needed for these
particular checks: routing, validation, and auth-guarding all happen
before any database call).
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_stub_routes_return_501_with_a_clear_pointer_to_the_source_file():
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": "x"})
    assert response.status_code == 501
    assert "MIGRATION.md" in response.json()["detail"]


def test_register_rejects_an_invalid_email_and_a_too_short_password():
    response = client.post(
        "/api/v1/auth/register",
        json={
            "firstName": "Test",
            "lastName": "User",
            "email": "not-an-email",
            "password": "short",
        },
    )
    assert response.status_code == 422


def test_favourites_mine_requires_authentication():
    response = client.get("/api/v1/favourites/mine")
    assert response.status_code == 401


def test_notifications_mine_requires_authentication():
    response = client.get("/api/v1/notifications/mine")
    assert response.status_code == 401


def test_openapi_docs_are_served():
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "/api/v1/auth/register" in schema["paths"]
    assert "/api/v1/public/counties" in schema["paths"]
