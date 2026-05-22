"""Sources router - CRUD over RSS / crawler data sources."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Source
from ..services.crawler import crawler_service

router = APIRouter(prefix="/api/sources", tags=["sources"])


# --- Pydantic schemas ---

class SourceCreate(BaseModel):
    """Payload for creating a new source."""
    name: str
    url: str
    source_type: str = "rss"  # rss | crawler
    enabled: bool = True
    fetch_interval: int = 30
    config: dict[str, Any] | None = None


class SourceUpdate(BaseModel):
    """Payload for updating a source (all fields optional)."""
    name: str | None = None
    url: str | None = None
    source_type: str | None = None
    enabled: bool | None = None
    fetch_interval: int | None = None
    config: dict[str, Any] | None = None


class SourceResponse(BaseModel):
    """Serialized source for API responses."""
    id: int
    name: str
    url: str
    source_type: str
    enabled: bool
    fetch_interval: int
    last_fetched: datetime | None = None
    config: dict[str, Any] | None = None

    model_config = {"from_attributes": True}


# --- Endpoints ---

@router.get("")
async def list_sources(session: AsyncSession = Depends(get_session)) -> dict:
    """List all sources."""
    stmt = select(Source).order_by(Source.id)
    result = await session.execute(stmt)
    sources = result.scalars().all()
    return {
        "items": [SourceResponse.model_validate(s).model_dump() for s in sources],
        "total": len(sources),
    }


@router.post("", status_code=201)
async def create_source(
    payload: SourceCreate,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Create a new source."""
    source = Source(
        name=payload.name,
        url=payload.url,
        source_type=payload.source_type,
        enabled=payload.enabled,
        fetch_interval=payload.fetch_interval,
        config=payload.config or {},
    )
    session.add(source)
    await session.commit()
    await session.refresh(source)
    return SourceResponse.model_validate(source).model_dump()


@router.get("/{source_id}")
async def get_source(
    source_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get a single source by id."""
    stmt = select(Source).where(Source.id == source_id)
    result = await session.execute(stmt)
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return SourceResponse.model_validate(source).model_dump()


@router.put("/{source_id}")
async def update_source(
    source_id: int,
    payload: SourceUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Update an existing source."""
    stmt = select(Source).where(Source.id == source_id)
    result = await session.execute(stmt)
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)

    await session.commit()
    await session.refresh(source)
    return SourceResponse.model_validate(source).model_dump()


@router.delete("/{source_id}")
async def delete_source(
    source_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Delete a source."""
    stmt = select(Source).where(Source.id == source_id)
    result = await session.execute(stmt)
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    await session.delete(source)
    await session.commit()
    return {"id": source_id, "deleted": True}


@router.post("/{source_id}/fetch")
async def fetch_source(
    source_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Manually trigger a fetch for a single source."""
    # Verify source exists
    stmt = select(Source).where(Source.id == source_id)
    result = await session.execute(stmt)
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    new_count = await crawler_service.run_source(source_id)
    return {
        "source_id": source_id,
        "source_name": source.name,
        "new_articles": new_count,
    }
