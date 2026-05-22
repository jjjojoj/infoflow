"""Settings router - read/update interest keywords and runtime preferences."""
from __future__ import annotations

import json
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Article, Source, Interest

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ---------------------------------------------------------------------------
# Pydantic schemas for interests
# ---------------------------------------------------------------------------

class InterestCreate(BaseModel):
    keyword: str
    weight: float = 0.5
    category: str | None = None
    enabled: bool = True


class InterestUpdate(BaseModel):
    keyword: str | None = None
    weight: float | None = None
    category: str | None = None
    enabled: bool | None = None


class InterestResponse(BaseModel):
    id: int
    keyword: str
    weight: float
    category: str | None = None
    enabled: bool
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Generic settings
# ---------------------------------------------------------------------------

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


@router.get("/dashboard")
async def dashboard_stats(session: AsyncSession = Depends(get_session)) -> dict:
    """Return real-time dashboard statistics from the database."""
    total_articles = (await session.execute(
        select(func.count(Article.id))
    )).scalar() or 0

    unread = (await session.execute(
        select(func.count(Article.id)).where(Article.is_read == False)  # noqa: E712
    )).scalar() or 0

    active_sources = (await session.execute(
        select(func.count(Source.id)).where(Source.enabled == True)  # noqa: E712
    )).scalar() or 0

    # Insights count (articles with summary)
    insights = (await session.execute(
        select(func.count(Article.id)).where(Article.summary.isnot(None))
    )).scalar() or 0

    return {
        "new_articles": total_articles,
        "unread": unread,
        "insights": insights,
        "active_sources": active_sources,
    }


# ---------------------------------------------------------------------------
# Interests CRUD
# ---------------------------------------------------------------------------

@router.get("/interests")
async def list_interests(session: AsyncSession = Depends(get_session)):
    stmt = select(Interest).order_by(Interest.id)
    result = await session.execute(stmt)
    interests = result.scalars().all()
    return {"items": [InterestResponse.model_validate(i).model_dump() for i in interests]}


@router.post("/interests", status_code=201)
async def create_interest(payload: InterestCreate, session: AsyncSession = Depends(get_session)):
    interest = Interest(**payload.model_dump())
    session.add(interest)
    await session.commit()
    await session.refresh(interest)
    return InterestResponse.model_validate(interest).model_dump()


@router.put("/interests/{interest_id}")
async def update_interest(interest_id: int, payload: InterestUpdate, session: AsyncSession = Depends(get_session)):
    stmt = select(Interest).where(Interest.id == interest_id)
    result = await session.execute(stmt)
    interest = result.scalar_one_or_none()
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(interest, field, value)
    await session.commit()
    await session.refresh(interest)
    return InterestResponse.model_validate(interest).model_dump()


@router.delete("/interests/{interest_id}")
async def delete_interest(interest_id: int, session: AsyncSession = Depends(get_session)):
    stmt = select(Interest).where(Interest.id == interest_id)
    result = await session.execute(stmt)
    interest = result.scalar_one_or_none()
    if not interest:
        raise HTTPException(status_code=404, detail="Interest not found")
    await session.delete(interest)
    await session.commit()
    return {"id": interest_id, "deleted": True}


# ---------------------------------------------------------------------------
# LLM test endpoint
# ---------------------------------------------------------------------------

@router.post("/test-llm")
async def test_llm():
    """Test LLM connection by generating a simple response."""
    try:
        from ..services.llm import get_llm_provider
        provider = get_llm_provider()
        resp = await provider.chat(
            messages=[{"role": "user", "content": "请用一句话介绍你自己。"}],
            max_tokens=100,
        )
        return {"success": True, "response": resp.content[:100], "model": resp.model}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Natural-language interest generation
# ---------------------------------------------------------------------------

@router.post("/interests/generate-from-description")
async def generate_interests_from_description(payload: dict, session: AsyncSession = Depends(get_session)):
    """Use LLM to parse natural language description into structured interest keywords."""
    description = payload.get("description", "")
    if not description:
        raise HTTPException(status_code=400, detail="Description is required")

    from ..services.llm import get_llm_provider
    provider = get_llm_provider()

    prompt = f"""根据以下用户的兴趣描述，提取出结构化的兴趣关键词列表。
每个关键词需要包含：keyword（关键词）、weight（权重0-1）、category（分类：核心技术/平台环境/工具框架/学习成长之一）

用户描述：{description}

请以JSON数组格式返回，例如：
[{{"keyword": "OCR技术", "weight": 0.9, "category": "核心技术"}}]

只返回JSON数组，不要其他内容。"""

    resp = await provider.chat(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1000,
    )
    result = resp.content

    # Parse JSON from response
    json_match = re.search(r'\[.*\]', result, re.DOTALL)
    if not json_match:
        raise HTTPException(status_code=500, detail="Failed to parse LLM response")

    try:
        items = json.loads(json_match.group())
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON from LLM")

    # Upsert interest records (update existing, create new)
    created = []
    updated = 0
    for item in items:
        kw = item.get("keyword", "").strip()
        if not kw:
            continue
        # Check if keyword already exists
        existing_stmt = select(Interest).where(Interest.keyword == kw)
        existing_result = await session.execute(existing_stmt)
        existing = existing_result.scalar_one_or_none()
        if existing:
            existing.weight = item.get("weight", existing.weight)
            existing.category = item.get("category", existing.category)
            created.append(InterestResponse.model_validate(existing).model_dump())
            updated += 1
        else:
            interest = Interest(
                keyword=kw,
                weight=item.get("weight", 0.5),
                category=item.get("category", "核心技术"),
                enabled=True,
            )
            session.add(interest)
            await session.flush()
            created.append(InterestResponse.model_validate(interest).model_dump())

    await session.commit()
    return {"items": created, "count": len(created), "new": len(created) - updated, "updated": updated}
