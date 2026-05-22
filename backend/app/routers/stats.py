"""Token usage statistics API endpoints."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter
from sqlalchemy import func, select

from ..database import AsyncSessionLocal
from ..models import LLMUsage

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/token-usage")
async def get_token_usage(days: int = 30):
    """获取最近 N 天的每日 Token 用量。"""
    since = (date.today() - timedelta(days=days)).isoformat()
    async with AsyncSessionLocal() as session:
        stmt = (
            select(LLMUsage)
            .where(LLMUsage.date >= since)
            .order_by(LLMUsage.date.desc(), LLMUsage.model)
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()
    return [
        {
            "date": r.date,
            "model": r.model,
            "prompt_tokens": r.prompt_tokens,
            "completion_tokens": r.completion_tokens,
            "total_tokens": r.total_tokens,
            "request_count": r.request_count,
            "cost_estimate": round(r.cost_estimate, 4),
        }
        for r in rows
    ]


@router.get("/token-usage/summary")
async def get_usage_summary():
    """获取使用量摘要。"""
    today_str = date.today().isoformat()

    async with AsyncSessionLocal() as session:
        # 今日 token
        stmt_today = select(
            func.coalesce(func.sum(LLMUsage.total_tokens), 0),
            func.coalesce(func.sum(LLMUsage.request_count), 0),
            func.coalesce(func.sum(LLMUsage.cost_estimate), 0),
        ).where(LLMUsage.date == today_str)
        today_result = await session.execute(stmt_today)
        today_row = today_result.one()

        # 总计
        stmt_total = select(
            func.coalesce(func.sum(LLMUsage.total_tokens), 0),
            func.coalesce(func.sum(LLMUsage.request_count), 0),
            func.coalesce(func.sum(LLMUsage.cost_estimate), 0),
        )
        total_result = await session.execute(stmt_total)
        total_row = total_result.one()

        # 使用的模型数
        stmt_models = select(func.count(func.distinct(LLMUsage.model)))
        models_result = await session.execute(stmt_models)
        models_count = models_result.scalar() or 0

        # 日均
        stmt_days = select(func.count(func.distinct(LLMUsage.date)))
        days_result = await session.execute(stmt_days)
        days_count = days_result.scalar() or 1

    return {
        "today_tokens": int(today_row[0]),
        "today_requests": int(today_row[1]),
        "today_cost": round(float(today_row[2]), 4),
        "total_tokens": int(total_row[0]),
        "total_requests": int(total_row[1]),
        "total_cost": round(float(total_row[2]), 4),
        "models_used": models_count,
        "daily_avg": round(int(total_row[0]) / max(days_count, 1)),
    }


@router.get("/token-usage/by-model")
async def get_usage_by_model():
    """按模型分组的用量统计。"""
    async with AsyncSessionLocal() as session:
        stmt = select(
            LLMUsage.model,
            func.sum(LLMUsage.total_tokens).label("total_tokens"),
            func.sum(LLMUsage.request_count).label("request_count"),
            func.sum(LLMUsage.cost_estimate).label("total_cost"),
        ).group_by(LLMUsage.model)
        result = await session.execute(stmt)
        rows = result.all()

    grand_total = sum(r.total_tokens or 0 for r in rows) or 1
    return [
        {
            "model": r.model,
            "total_tokens": int(r.total_tokens or 0),
            "request_count": int(r.request_count or 0),
            "total_cost": round(float(r.total_cost or 0), 4),
            "percentage": round((r.total_tokens or 0) / grand_total * 100, 1),
        }
        for r in rows
    ]
