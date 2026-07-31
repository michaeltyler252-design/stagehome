import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_exchange_rejects_an_unknown_or_expired_code():
    fake_redis = AsyncMock()
    fake_redis.getdel.return_value = None

    with patch("app.core.redis_client.get_redis_client", return_value=fake_redis):
        response = client.post("/api/v1/auth/google/exchange", json={"code": "nonexistent-code"})

    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()


def test_exchange_succeeds_with_a_real_code_and_is_single_use():
    """The real guarantee this exists for: the code trades for real
    tokens exactly once (getdel deletes on read), so it can never be
    replayed even if it leaked into logs or browser history somehow."""
    fake_redis = AsyncMock()
    stored_payload = json.dumps({
        "access_token": "real-access-token",
        "refresh_token": "real-refresh-token",
        "user": {"id": "user-1", "email": "a@example.com", "phone": None, "roles": ["Tenant"]},
    })
    fake_redis.getdel.return_value = stored_payload

    with patch("app.core.redis_client.get_redis_client", return_value=fake_redis):
        response = client.post("/api/v1/auth/google/exchange", json={"code": "real-one-time-code"})

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"] == "real-access-token"
    assert body["refresh_token"] == "real-refresh-token"
    assert body["user"]["email"] == "a@example.com"
    # getdel (not get) was used — the code is atomically consumed.
    fake_redis.getdel.assert_called_once_with("oauth-exchange:real-one-time-code")
