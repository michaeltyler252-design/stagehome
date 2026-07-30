"""
Direct port of apps/worker/src/index.ts.

Milestone-1-equivalent scope, matching the original exactly: process
scaffold only. Real queues (booking-hold expiry, payment-callback
reconciliation, notification dispatch, media processing) are introduced
alongside the milestones that own them — none of that logic exists in
the original NestJS worker either, so there is nothing to port yet
beyond this scaffold.
"""

import os

from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

celery_app = Celery("stagehome_worker", broker=REDIS_URL, backend=REDIS_URL)

print("Worker process scaffolded. No queues are registered yet (Milestone 1).")

if __name__ == "__main__":
    celery_app.start()
