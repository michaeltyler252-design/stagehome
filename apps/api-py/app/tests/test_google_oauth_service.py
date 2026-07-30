from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models import Role, User
from app.services import google_oauth_service


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


@pytest.mark.asyncio
async def test_find_or_create_returns_existing_user_without_creating_a_duplicate():
    db = AsyncMock()
    existing_user = User(id="user-1", email="someone@gmail.com")
    db.execute.return_value = _mock_scalar_result(existing_user)

    result = await google_oauth_service.find_or_create_user_from_google_profile(db, "someone@gmail.com")

    assert result.id == "user-1"
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_find_or_create_creates_a_new_pre_verified_user_with_tenant_role():
    db = AsyncMock()
    tenant_role = Role(id="role-1", name="Tenant")
    db.execute.side_effect = [
        _mock_scalar_result(None),  # no existing user
        _mock_scalar_result(tenant_role),  # Tenant role lookup
    ]

    user = await google_oauth_service.find_or_create_user_from_google_profile(db, "new@gmail.com")

    assert user.email == "new@gmail.com"
    assert user.email_verified is True  # Google already verified it
    # Two adds: the User row and the UserRole row.
    assert db.add.call_count == 2


def test_is_configured_reflects_real_settings():
    from app.core.config import settings

    # In this test environment, no real Google credentials are set —
    # confirms the honest "unconfigured" state is correctly detected,
    # same pattern as every other integration in this project.
    assert google_oauth_service.is_configured() == bool(settings.google_client_id and settings.google_client_secret)
