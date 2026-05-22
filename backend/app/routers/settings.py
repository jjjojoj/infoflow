"""Settings router - read/update interest keywords and runtime preferences."""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("")
async def get_settings() -> dict:
    """Return current settings (interests, llm provider, intervals). TODO."""
    return {
        "llm_provider": None,
        "fetch_interval_minutes": None,
        "interests": [],
    }


@router.put("")
async def update_settings(payload: dict) -> dict:
    """Update settings. TODO: implement persistence."""
    return {"updated": True, **payload}
