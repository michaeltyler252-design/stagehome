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


@pytest.mark.asyncio
async def test_refresh_rejects_a_revoked_session():
    from datetime import datetime, timedelta, timezone
    from app.core.security import hash_token, sign_refresh_token
    from app.models import UserSession
    from app.services import auth_service

    token, session_id = sign_refresh_token("user-1")
    revoked_session = UserSession(
        id=session_id, user_id="user-1", refresh_token=hash_token(token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        revoked_at=datetime.now(timezone.utc),
    )
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result(revoked_session)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.refresh(db, token)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rejects_a_token_that_does_not_match_the_stored_hash():
    from datetime import datetime, timedelta, timezone
    from app.core.security import hash_token, sign_refresh_token
    from app.models import UserSession
    from app.services import auth_service

    token, session_id = sign_refresh_token("user-1")
    session = UserSession(
        id=session_id, user_id="user-1", refresh_token=hash_token("a-completely-different-token"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1), revoked_at=None,
    )
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result(session)

    with pytest.raises(HTTPException) as exc_info:
        await auth_service.refresh(db, token)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_refresh_succeeds_and_rotates_the_session_for_a_valid_token():
    from datetime import datetime, timedelta, timezone
    from app.core.security import hash_token, sign_refresh_token
    from app.models import User, UserSession
    from app.services import auth_service

    token, session_id = sign_refresh_token("user-1")
    session = UserSession(
        id=session_id, user_id="user-1", refresh_token=hash_token(token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1), revoked_at=None,
    )
    db = AsyncMock()
    db.execute.side_effect = [
        _mock_scalar_result(session),
        _mock_scalar_result(User(id="user-1", email="a@example.com")),
        _mock_rows_result(["Tenant"]),
    ]

    new_access, new_refresh = await auth_service.refresh(db, token)

    assert new_access
    assert new_refresh
    assert new_refresh != token  # a genuinely new token, not the same one reused
    assert session.revoked_at is not None  # the old session was revoked (rotation)


@pytest.mark.asyncio
async def test_logout_revokes_the_session():
    from datetime import datetime, timedelta, timezone
    from app.core.security import hash_token, sign_refresh_token
    from app.models import UserSession
    from app.services import auth_service

    token, session_id = sign_refresh_token("user-1")
    session = UserSession(
        id=session_id, user_id="user-1", refresh_token=hash_token(token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1), revoked_at=None,
    )
    db = AsyncMock()
    db.execute.return_value = _mock_scalar_result(session)

    await auth_service.logout(db, token)

    assert session.revoked_at is not None


@pytest.mark.asyncio
async def test_logout_does_not_raise_for_an_already_invalid_token():
    from app.services import auth_service

    db = AsyncMock()
    # Must not raise — an already-invalid token is functionally already logged out.
    await auth_service.logout(db, "not-a-real-jwt-at-all")
