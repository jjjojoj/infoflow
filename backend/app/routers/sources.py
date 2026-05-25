"""Sources router - CRUD over RSS / crawler data sources."""
from __future__ import annotations

import ipaddress
import logging
import socket
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, AnyHttpUrl, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Source

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sources", tags=["sources"])


class SourceCreate(BaseModel):
    name: str
    url: str
    source_type: str = "rss"

    @field_validator("url")
    @classmethod
    def block_private_hosts(cls, v: str) -> str:
        """Prevent SSRF: reject URLs pointing to private/internal networks."""
        try:
            parsed = urlparse(v)
            host = parsed.hostname
            if not host:
                raise ValueError("Invalid URL: no hostname")
            # Resolve hostname to check IP
            for addr in socket.getaddrinfo(host, None):
                ip = ipaddress.ip_address(addr[4][0])
                if ip.is_private or ip.is_loopback or ip.is_link_local:
                    raise ValueError("Private/internal network URLs are not allowed")
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Cannot resolve URL host: {e}") from e
        return v
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
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Source name or URL already exists")
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
