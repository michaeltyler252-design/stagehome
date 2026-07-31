"""
Real, executed test proving rate limiting actually blocks excess requests
— not just that the decorator is present in the source. Requires a real
Redis connection (slowapi's storage backend), consistent with this
project's existing pattern of testing Redis-dependent behavior against a
real local Redis instance where possible.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_otp_request_is_rate_limited_after_the_configured_threshold():
    """otp/request is limited to 3/minute. A 4th request within the same
    minute, from the same client, must be rejected with a real 429 —
    proven by actually firing more requests than the limit allows."""
    phone = "254700009999"
    statuses = []
    for _ in range(5):
        response = client.post("/api/v1/auth/otp/request", json={"phone": phone})
        statuses.append(response.status_code)

    assert 429 in statuses, f"Expected at least one 429 among {statuses} — rate limiting is not actually blocking excess requests."
