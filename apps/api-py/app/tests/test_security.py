import time

import pytest

from app.core.security import (
    hash_password,
    hash_token,
    sign_access_token,
    sign_refresh_token,
    verify_access_token,
    verify_password,
    verify_refresh_token,
    JWTError,
)


def test_password_hash_and_verify_roundtrip():
    h = hash_password("CorrectHorseBatteryStaple123!")
    assert verify_password(h, "CorrectHorseBatteryStaple123!") is True
    assert verify_password(h, "wrong-password") is False


def test_password_verify_never_raises_on_malformed_hash():
    # Must return False, not throw — matches the original's try/catch.
    assert verify_password("not-a-real-argon2-hash", "anything") is False


def test_hash_token_is_deterministic_sha256():
    assert hash_token("some-refresh-token") == hash_token("some-refresh-token")
    assert hash_token("token-a") != hash_token("token-b")
    # SHA-256 hex digest is always 64 characters.
    assert len(hash_token("x")) == 64


def test_access_token_roundtrip_preserves_claims():
    token = sign_access_token("user-123", "someone@example.com", ["Tenant", "Manager"], "org-1")
    payload = verify_access_token(token)
    assert payload["sub"] == "user-123"
    assert payload["email"] == "someone@example.com"
    assert payload["roles"] == ["Tenant", "Manager"]
    assert payload["organisationId"] == "org-1"


def test_refresh_token_roundtrip_preserves_session_id():
    token, session_id = sign_refresh_token("user-123")
    payload = verify_refresh_token(token)
    assert payload["sub"] == "user-123"
    assert payload["sessionId"] == session_id


def test_access_and_refresh_secrets_are_not_interchangeable():
    access_token = sign_access_token("user-123", None, [])
    with pytest.raises(JWTError):
        verify_refresh_token(access_token)
