"""Direct port of apps/api/src/health/health.controller.ts."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "info": {}, "error": {}, "details": {}}
