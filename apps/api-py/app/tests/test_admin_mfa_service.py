from unittest.mock import AsyncMock, patch

import pyotp
import pytest
from fastapi import HTTPException

from app.services import admin_mfa_service


@pytest.mark.asyncio
async def test_setup_returns_a_real_valid_base32_secret_and_provisioning_uri():
    fake_redis = AsyncMock()
    with patch("app.services.admin_mfa_service.get_redis_client", return_value=fake_redis):
        result = await admin_mfa_service.setup("admin-user-1")

    # A genuinely valid base32 TOTP secret — pyotp itself must accept it.
    totp = pyotp.TOTP(result["secret"])
    assert totp.now().isdigit() and len(totp.now()) == 6
    assert "otpauth://totp/" in result["provisioningUri"]
    assert "StageHome" in result["provisioningUri"]


@pytest.mark.asyncio
async def test_verify_rejects_when_no_setup_is_in_progress():
    fake_redis = AsyncMock()
    fake_redis.get.return_value = None

    with patch("app.services.admin_mfa_service.get_redis_client", return_value=fake_redis):
        with pytest.raises(HTTPException) as exc_info:
            await admin_mfa_service.verify("admin-user-1", "123456")

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_verify_rejects_an_incorrect_code():
    real_secret = pyotp.random_base32()
    fake_redis = AsyncMock()
    fake_redis.get.return_value = real_secret

    with patch("app.services.admin_mfa_service.get_redis_client", return_value=fake_redis):
        with pytest.raises(HTTPException) as exc_info:
            await admin_mfa_service.verify("admin-user-1", "000000")

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_verify_accepts_a_genuinely_correct_real_time_generated_code():
    """The real guarantee: an actual current TOTP code for the actual
    secret must verify successfully — this proves the algorithm
    round-trips correctly, not just that errors are raised correctly."""
    real_secret = pyotp.random_base32()
    real_current_code = pyotp.TOTP(real_secret).now()

    fake_redis = AsyncMock()
    fake_redis.get.side_effect = [None, real_secret, real_secret]  # active=None, pending=real_secret, re-check pending=real_secret

    with patch("app.services.admin_mfa_service.get_redis_client", return_value=fake_redis):
        result = await admin_mfa_service.verify("admin-user-1", real_current_code)

    assert result is True
