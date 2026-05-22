"""Insights router - exposes AI-generated insights and knowledge graph."""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Article, Insight, Interest
from ..services.ai_analyzer import ai_analyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("")
async def list_insights(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    insight_type: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """获取洞察列表，支持按类型筛选。"""
    query = select(Insight).order_by(Insight.created_at.desc())

    if insight_type:
        query = query.where(Insight.insight_type == insight_type)

    # 获取总数
    count_query = select(func.count()).select_from(Insight)
    if insight_type:
        count_query = count_query.where(Insight.insight_type == insight_type)
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    # 分页
    query = query.offset(skip).limit(limit)
    result = await session.execute(query)
    insights = result.scalars().all()

    return {
        "items": [
            {
                "id": ins.id,
                "article_id": ins.article_id,
                "insight_type": ins.insight_type,
                "content": ins.content,
                "related_article_ids": ins.related_article_ids or [],
                "created_at": ins.created_at.isoformat() if ins.created_at else None,
            }
            for ins in insights
        ],
        "skip": skip,
        "limit": limit,
        "total": total,
    }


@router.get("/graph")
async def get_knowledge_graph(
    limit: int = Query(100, ge=1, le=500),
    community: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """获取知识图谱数据（节点和边）。

    返回格式：
    {
      "nodes": [{id, label, type, community, size}],
      "edges": [{source, target, relation, weight}]
    }
    """
    # 查询文章
    query = select(Article).order_by(Article.created_at.desc()).limit(limit)
    if community:
        query = query.where(Article.community == community)

    result = await session.execute(query)
    articles = result.scalars().all()

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    keyword_nodes: dict[str, dict] = {}  # 关键词去重

    for article in articles:
        # 文章节点
        article_node_id = f"article_{article.id}"
        nodes.append({
            "id": article_node_id,
            "label": article.title[:50] if article.title else "无标题",
            "type": "article",
            "community": article.community or "未分类",
            "size": max(5, min(20, int((article.relevance_score or 0) * 20))),
        })

        # 标签/关键词节点和边
        tags = article.tags or []
        for tag in tags:
            tag_node_id = f"keyword_{tag.replace('/', '_')}"
            if tag_node_id not in keyword_nodes:
                # 根据标签前缀确定社区
                tag_community = _tag_to_community(tag)
                keyword_nodes[tag_node_id] = {
                    "id": tag_node_id,
                    "label": tag,
                    "type": "keyword",
                    "community": tag_community,
                    "size": 10,  # 初始大小，后续根据连接数调整
                }

            # 文章 -> 关键词边
            edges.append({
                "source": article_node_id,
                "target": tag_node_id,
                "relation": "has_keyword",
                "weight": 0.8,
            })

    # 根据连接数调整关键词节点大小
    keyword_connection_count: dict[str, int] = {}
    for edge in edges:
        if edge["target"].startswith("keyword_"):
            keyword_connection_count[edge["target"]] = keyword_connection_count.get(edge["target"], 0) + 1

    for node_id, node in keyword_nodes.items():
        count = keyword_connection_count.get(node_id, 1)
        node["size"] = min(30, 8 + count * 3)

    nodes.extend(keyword_nodes.values())

    # 同社区文章之间建立边
    community_articles: dict[str, list[str]] = {}
    for article in articles:
        comm = article.community or "未分类"
        if comm not in community_articles:
            community_articles[comm] = []
        community_articles[comm].append(f"article_{article.id}")

    for comm, article_ids in community_articles.items():
        # 同社区文章两两连接（限制数量避免过多边）
        for i in range(min(len(article_ids), 10)):
            for j in range(i + 1, min(len(article_ids), 10)):
                edges.append({
                    "source": article_ids[i],
                    "target": article_ids[j],
                    "relation": "same_topic",
                    "weight": 0.5,
                })

    return {"nodes": nodes, "edges": edges}


@router.get("/{insight_id}")
async def get_insight(
    insight_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """获取单个洞察详情。"""
    result = await session.execute(select(Insight).where(Insight.id == insight_id))
    insight = result.scalar_one_or_none()

    if not insight:
        raise HTTPException(status_code=404, detail="洞察不存在")

    return {
        "id": insight.id,
        "article_id": insight.article_id,
        "insight_type": insight.insight_type,
        "content": insight.content,
        "related_article_ids": insight.related_article_ids or [],
        "created_at": insight.created_at.isoformat() if insight.created_at else None,
    }


@router.post("/generate")
async def generate_insights(
    article_ids: list[int] | None = None,
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """手动触发洞察生成。

    如果提供 article_ids，则对指定文章生成洞察；
    否则对最新的 limit 篇未分析文章生成。
    """
    # 获取待分析文章
    if article_ids:
        query = select(Article).where(Article.id.in_(article_ids))
    else:
        # 选择没有洞察记录的最新文章
        subquery = select(Insight.article_id).distinct()
        query = (
            select(Article)
            .where(Article.id.notin_(subquery))
            .order_by(Article.created_at.desc())
            .limit(limit)
        )

    result = await session.execute(query)
    articles = result.scalars().all()

    if not articles:
        return {"message": "没有需要分析的文章", "generated": 0, "insights": []}

    # 获取用户兴趣（用于相关度计算）
    interests_result = await session.execute(
        select(Interest).where(Interest.enabled == True)  # noqa: E712
    )
    interests = [
        {"keyword": i.keyword, "weight": i.weight, "category": i.category}
        for i in interests_result.scalars().all()
    ]

    generated_insights = []

    for article in articles:
        try:
            article_dict = {
                "id": article.id,
                "title": article.title,
                "content": article.content,
                "summary": article.summary,
                "tags": article.tags,
                "community": article.community,
            }

            # 执行 AI 分析
            analysis = await ai_analyzer.analyze_article(article_dict)

            # 更新文章字段
            if analysis.get("summary") and not article.summary:
                article.summary = analysis["summary"]
            if analysis.get("keywords"):
                article.tags = analysis["keywords"]
            if analysis.get("relevance_score"):
                article.relevance_score = analysis["relevance_score"]
            if analysis.get("related_topics"):
                article.community = analysis["related_topics"][0] if analysis["related_topics"] else None

            # 计算与用户兴趣的相关度
            if interests:
                content = article.content or article.summary or article.title
                relevance = await ai_analyzer.compute_relevance(content, interests)
                article.relevance_score = relevance

            # 创建洞察记录
            insight_content = json.dumps(analysis, ensure_ascii=False)
            insight = Insight(
                article_id=article.id,
                insight_type="analysis",
                content=insight_content,
                related_article_ids=[],
            )
            session.add(insight)
            generated_insights.append({
                "article_id": article.id,
                "article_title": article.title,
                "summary": analysis.get("summary", ""),
                "keywords": analysis.get("keywords", []),
                "categories": analysis.get("categories", {}),
            })

        except Exception as e:
            logger.error("文章 %d 分析失败: %s", article.id, e)
            continue

    await session.commit()

    # 如果有多篇文章，额外生成跨文章洞察
    if len(articles) >= 3:
        try:
            articles_for_insight = [
                {
                    "title": a.title,
                    "summary": a.summary or (a.content or "")[:200],
                    "tags": a.tags,
                }
                for a in articles[:10]
            ]
            cross_insight = await ai_analyzer.generate_insight(articles_for_insight)

            # 保存跨文章洞察（关联到第一篇文章）
            cross_insight_record = Insight(
                article_id=articles[0].id,
                insight_type="cross_article",
                content=json.dumps(cross_insight, ensure_ascii=False),
                related_article_ids=[a.id for a in articles[:10]],
            )
            session.add(cross_insight_record)
            await session.commit()
        except Exception as e:
            logger.warning("跨文章洞察生成失败: %s", e)

    return {
        "message": f"成功分析 {len(generated_insights)} 篇文章",
        "generated": len(generated_insights),
        "insights": generated_insights,
    }


def _tag_to_community(tag: str) -> str:
    """将标签映射到社区名称。"""
    community_map = {
        "tech/ocr": "OCR技术",
        "tech/ascend": "昇腾开发",
        "tech/kunpeng": "信创环境",
        "tech/mindspore": "AI-ML",
        "tech/cann": "昇腾开发",
        "type/paper": "学术研究",
        "type/tutorial": "教程资源",
        "type/release": "版本发布",
        "type/article": "技术文章",
    }
    return community_map.get(tag, "其他")

