"""Articles router - list, retrieve, bookmark and mark-as-read endpoints."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Article

router = APIRouter(prefix="/api/articles", tags=["articles"])


# --- Pydantic schemas ---

class ArticleResponse(BaseModel):
    """Serialized article for list responses."""
    id: int
    title: str
    url: str
    content: str | None = None
    summary: str | None = None
    source_name: str | None = None
    source_type: str | None = None
    tags: list[str] | None = None
    created_at: Any = None
    is_read: bool = False
    is_bookmarked: bool = False
    relevance_score: float = 0.0
    community: str | None = None

    model_config = {"from_attributes": True}


# --- Endpoints ---

@router.get("")
async def list_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    source: str | None = None,
    tag: str | None = None,
    keyword: str | None = None,
    is_read: bool | None = None,
    is_bookmarked: bool | None = None,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """List articles with optional filters: source, tag, keyword, read status, bookmark."""
    # Base query
    stmt = select(Article)

    # Apply filters
    if source:
        stmt = stmt.where(Article.source_name == source)
    if is_read is not None:
        stmt = stmt.where(Article.is_read == is_read)
    if is_bookmarked is not None:
        stmt = stmt.where(Article.is_bookmarked == is_bookmarked)
    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(
            Article.title.ilike(pattern) | Article.content.ilike(pattern)
        )
    if tag:
        # JSON array contains - SQLite compatible approach
        stmt = stmt.where(Article.tags.contains(tag))

    # Count total before pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await session.execute(count_stmt)
    total = total_result.scalar() or 0

    # Apply ordering and pagination
    stmt = stmt.order_by(Article.created_at.desc()).offset(skip).limit(limit)
    result = await session.execute(stmt)
    articles = result.scalars().all()

    return {
        "items": [ArticleResponse.model_validate(a).model_dump() for a in articles],
        "skip": skip,
        "limit": limit,
        "total": total,
    }


@router.get("/{article_id}")
async def get_article(
    article_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Retrieve a single article by id."""
    stmt = select(Article).where(Article.id == article_id)
    result = await session.execute(stmt)
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleResponse.model_validate(article).model_dump()


@router.post("/{article_id}/bookmark")
async def bookmark_article(
    article_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Toggle bookmark state for an article."""
    stmt = select(Article).where(Article.id == article_id)
    result = await session.execute(stmt)
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Toggle bookmark
    article.is_bookmarked = not article.is_bookmarked
    await session.commit()
    await session.refresh(article)
    return {"id": article_id, "is_bookmarked": article.is_bookmarked}


@router.post("/{article_id}/read")
async def mark_read(
    article_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Mark an article as read."""
    stmt = select(Article).where(Article.id == article_id)
    result = await session.execute(stmt)
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    article.is_read = True
    await session.commit()
    await session.refresh(article)
    return {"id": article_id, "is_read": True}
