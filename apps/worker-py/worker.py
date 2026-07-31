"""
StageHome Celery worker.

Milestone-1-equivalent scope: process scaffold only. Real queues
(booking-hold expiry, payment-callback reconciliation, notification
dispatch, media processing) are introduced alongside the milestones that
own them — this matches the project's actual current state; no queue
logic has been built yet in either language this project has used.
"""

import os

from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

celery_app = Celery("stagehome_worker", broker=REDIS_URL, backend=REDIS_URL)

print("Worker process scaffolded. No queues are registered yet (Milestone 1).")

if __name__ == "__main__":
    celery_app.start()
