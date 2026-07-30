from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models import User
from app.services import otp_service


def _mock_scalar_result(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


@pytest.mark.asyncio
async def test_verify_otp_rejects_when_no_code_was_requested():
    db = AsyncMock()
    fake_redis = AsyncMock()
    fake_redis.get.return_value = None

    with patch("app.services.otp_service.get_redis_client", return_value=fake_redis):
        with pytest.raises(HTTPException) as exc_info:
            await otp_service.verify_otp(db, "254700000000", "123456")

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_verify_otp_rejects_an_incorrect_code():
    db = AsyncMock()
    fake_redis = AsyncMock()
    fake_redis.get.return_value = otp_service._hash_code("999999")
    fake_redis.incr.return_value = 1

    with patch("app.services.otp_service.get_redis_client", return_value=fake_redis):
        with pytest.raises(HTTPException) as exc_info:
            await otp_service.verify_otp(db, "254700000000", "123456")

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_verify_otp_rate_limits_after_too_many_attempts():
    db = AsyncMock()
    fake_redis = AsyncMock()
    fake_redis.get.return_value = otp_service._hash_code("999999")
    fake_redis.incr.return_value = otp_service.OTP_MAX_ATTEMPTS + 1

    with patch("app.services.otp_service.get_redis_client", return_value=fake_redis):
        with pytest.raises(HTTPException) as exc_info:
            await otp_service.verify_otp(db, "254700000000", "123456")

    assert exc_info.value.status_code == 429


@pytest.mark.asyncio
async def test_verify_otp_succeeds_with_the_correct_code_and_marks_phone_verified():
    db = AsyncMock()
    user = User(id="user-1", phone="254700000000", phone_verified=False)
    db.execute.return_value = _mock_scalar_result(user)

    fake_redis = AsyncMock()
    fake_redis.get.return_value = otp_service._hash_code("123456")
    fake_redis.incr.return_value = 1

    with patch("app.services.otp_service.get_redis_client", return_value=fake_redis):
        await otp_service.verify_otp(db, "254700000000", "123456")

    assert user.phone_verified is True
