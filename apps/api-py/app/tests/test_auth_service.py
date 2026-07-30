from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.core.security import hash_password
from app.models import User
from app.services import auth_service


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _mock_rows_result(rows):
    result = MagicMock()
    result.all.return_value = [(r,) for r in rows]
    return result


@pytest.mark.asyncio
async def test_register_rejects_a_duplicate_email():
    db = AsyncMock()
    existing_user = User(id="user-1", email="taken@example.com")
    db.execute.return_value = _mock_scalar_result(existing_user)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.register(db, "First", "Last", "taken@example.com", "SomePassword123", None)

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_login_rejects_an_unknown_email_with_generic_message():
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result(None)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login(db, "nobody@example.com", "whatever")

    assert exc_info.value.status_code == 401
    # Must not reveal whether the email exists or the password was wrong.
    assert "invalid email or password" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_login_rejects_a_wrong_password_with_the_same_generic_message():
    db = AsyncMock()
    real_user = User(
        id="user-1",
        email="someone@example.com",
        password_hash=hash_password("TheRealPassword123"),
    )
    db.execute.return_value = _mock_scalar_result(real_user)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login(db, "someone@example.com", "WrongPassword123")

    assert exc_info.value.status_code == 401
    assert "invalid email or password" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_login_succeeds_with_correct_credentials_and_issues_real_tokens():
    db = AsyncMock()
    real_user = User(
        id="user-1",
        email="someone@example.com",
        password_hash=hash_password("TheRealPassword123"),
    )

    # First execute() call: find the user. Second: load role names.
    db.execute.side_effect = [
        _mock_scalar_result(real_user),
        _mock_rows_result(["Tenant"]),
    ]

    access_token, refresh_token, user, roles = await auth_service.login(
        db, "someone@example.com", "TheRealPassword123"
    )

    assert access_token  # a real, non-empty JWT string
    assert refresh_token
    assert user.id == "user-1"
    assert roles == ["Tenant"]
    # A session row must have been persisted (hashed refresh token stored).
    db.add.assert_called_once()
    db.commit.assert_called_once()
