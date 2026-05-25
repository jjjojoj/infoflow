"""Articles router - list, retrieve, bookmark, mark-as-read and batch-process endpoints."""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Article

router = APIRouter(prefix="/api/articles", tags=["articles"])

logger = logging.getLogger(__name__)


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
    fetch_method: str | None = None
    community: str | None = None

    model_config = {"from_attributes": True}


# --- Helpers ---

def _is_predominantly_english(text: str) -> bool:
    """Return True when ASCII letters dominate the text."""
    if not text:
        return False
    return len(re.findall(r"[a-zA-Z]", text)) > len(text) * 0.5


DISPLAY_NAMES = {
    "arxiv": "arXiv 论文",
    "github_trending": "GitHub 热门",
    "zhihu": "知乎",
    "huawei_ascend": "昇腾社区",
}


# --- Endpoints ---

@router.get("")
async def list_articles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=1000),
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
        stmt = stmt.where(text("EXISTS (SELECT 1 FROM json_each(articles.tags) WHERE json_each.value = :tag)")).params(tag=tag)

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


class BatchProcessRequest(BaseModel):
    """Request body for batch processing."""
    translate_titles: bool = True
    generate_summaries: bool = True
    limit: int = 50


@router.post("/batch-process")
async def batch_process_articles(
    body: BatchProcessRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Batch translate English titles to Chinese and/or generate summaries.

    Processes articles that have English titles or missing summaries.
    """
    from ..services.ai_analyzer import ai_analyzer

    stmt = select(Article).order_by(Article.created_at.desc()).limit(body.limit)
    result = await session.execute(stmt)
    articles = result.scalars().all()

    translated = 0
    summarized = 0
    errors = 0

    for article in articles:
        try:
            # Translate English titles
            if body.translate_titles and _is_predominantly_english(article.title):
                display_name = DISPLAY_NAMES.get(article.source_name or "", article.source_name or "")
                clean_title = re.sub(r"^\[[^\]]+\]\s*", "", article.title).strip()

                messages = [
                    {"role": "system", "content": "你是技术文章标题翻译助手。只返回简洁、准确的中文标题。"},
                    {"role": "user", "content": (
                        "请将下面的英文技术标题翻译成中文，保留必要英文术语，不要解释。\n"
                        f"标题：{clean_title}\n"
                        f"内容线索：{(article.content or '')[:500]}"
                    )},
                ]
                resp = await asyncio.wait_for(
                    ai_analyzer.llm.chat(messages, temperature=0.2, max_tokens=120),
                    timeout=20,
                )
                translated_title = resp.content.strip().strip('"').strip("'")
                translated_title = re.sub(r"^【[^】]+】\s*", "", translated_title).strip()
                if translated_title:
                    article.title = f"【{display_name}】{translated_title}"[:512]
                    translated += 1

            # Generate summaries for articles without one
            if body.generate_summaries and not article.summary and article.content:
                content_text = article.content[:3000]
                text = f"标题：{article.title}\n\n内容：{content_text}"
                summary = await asyncio.wait_for(
                    ai_analyzer.generate_summary(text),
                    timeout=30,
                )
                if summary:
                    article.summary = summary
                    summarized += 1

            # Commit every article individually to avoid losing all on error
            if translated > 0 or summarized > 0:
                await session.commit()

        except asyncio.TimeoutError:
            logger.warning("Batch process timeout for article id=%d", article.id)
            errors += 1
            await session.rollback()
        except Exception as e:
            logger.error("Batch process error for article id=%d: %s", article.id, e)
            errors += 1
            await session.rollback()

    return {
        "processed": len(articles),
        "translated": translated,
        "summarized": summarized,
        "errors": errors,
    }
