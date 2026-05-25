"""Obsidian router - export articles into the local Obsidian vault."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_session
from ..models import Article
from ..services.obsidian_export import obsidian_exporter

router = APIRouter(prefix="/api/obsidian", tags=["obsidian"])


# ─── Request/Response Models ──────────────────────────────────────────────────


class ExportRequest(BaseModel):
    """批量导出请求"""
    mode: str = Field(default="incremental", description="导出模式: full / incremental")
    article_ids: list[int] | None = Field(default=None, description="指定文章 ID 列表（为空则导出全部）")


class ExportResponse(BaseModel):
    """导出结果"""
    success: bool
    exported_count: int
    skipped_count: int = 0
    exported_paths: list[str] = []
    message: str = ""


class SingleExportResponse(BaseModel):
    """单篇文章导出结果"""
    success: bool
    path: str = ""
    message: str = ""


class VaultStatus(BaseModel):
    """Vault 状态"""
    vault_path: str
    host_path: str = ""
    available: bool
    note_count: int
    inbox_count: int = 0
    areas: dict[str, int] = {}
    last_updated: str | None = None


# ─── API Endpoints ────────────────────────────────────────────────────────────


@router.post("/export", response_model=ExportResponse)
async def export_to_obsidian(
    payload: ExportRequest,
    session: AsyncSession = Depends(get_session),
) -> ExportResponse:
    """触发导出（支持全量或增量）

    - mode=incremental: 只导出未导出过的文章
    - mode=full: 全量导出（包含已导出的文章）
    """
    try:
        # 构建查询
        query = select(Article).order_by(Article.created_at.desc())
        if payload.article_ids:
            query = query.where(Article.id.in_(payload.article_ids))

        result = await session.execute(query)
        articles = result.scalars().all()

        if not articles:
            return ExportResponse(
                success=True,
                exported_count=0,
                message="没有找到需要导出的文章",
            )

        # 转换为 dict
        article_dicts = [
            {
                "id": art.id,
                "title": art.title,
                "url": art.url,
                "content": art.content,
                "summary": art.summary,
                "source_name": art.source_name,
                "source_type": art.source_type,
                "tags": art.tags or [],
                "created_at": art.created_at.isoformat() if art.created_at else "",
                "relevance_score": art.relevance_score,
                "content_hash": art.content_hash,
                "community": art.community,
            }
            for art in articles
        ]

        if payload.mode == "incremental":
            result_data = await obsidian_exporter.incremental_export(article_dicts)
        else:
            # 全量导出
            exported_paths = []
            for art_dict in article_dicts:
                path = await obsidian_exporter.export_article(art_dict)
                if path:
                    exported_paths.append(path)
            result_data = {
                "exported_count": len(exported_paths),
                "skipped_count": 0,
                "exported_paths": exported_paths,
            }

        # 导出后更新 MOC 和 INDEX
        for area in ["OCR技术", "昇腾开发", "信创环境", "AI-ML", "开源工具"]:
            await obsidian_exporter.update_moc(area)
        await obsidian_exporter.update_index()

        return ExportResponse(
            success=True,
            exported_count=result_data["exported_count"],
            skipped_count=result_data.get("skipped_count", 0),
            exported_paths=result_data.get("exported_paths", []),
            message=f"成功导出 {result_data['exported_count']} 篇文章",
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.post("/export/{article_id}", response_model=SingleExportResponse)
async def export_single_article(
    article_id: int,
    session: AsyncSession = Depends(get_session),
) -> SingleExportResponse:
    """导出单篇文章到 Obsidian vault"""
    try:
        result = await session.execute(
            select(Article).where(Article.id == article_id)
        )
        article = result.scalar_one_or_none()

        if not article:
            raise HTTPException(status_code=404, detail=f"文章不存在: id={article_id}")

        art_dict = {
            "id": article.id,
            "title": article.title,
            "url": article.url,
            "content": article.content,
            "summary": article.summary,
            "source_name": article.source_name,
            "source_type": article.source_type,
            "tags": article.tags or [],
            "created_at": article.created_at.isoformat() if article.created_at else "",
            "relevance_score": article.relevance_score,
            "content_hash": article.content_hash,
            "community": article.community,
        }

        path = await obsidian_exporter.export_article(art_dict)

        # 更新相关 MOC
        tags = article.tags or []
        community = article.community or ""
        area = obsidian_exporter._determine_area(tags, community)
        if area != "00-Inbox":
            await obsidian_exporter.update_moc(area)

        return SingleExportResponse(
            success=True,
            path=path,
            message=f"文章已导出到: {path}",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.get("/status", response_model=VaultStatus)
async def obsidian_status() -> VaultStatus:
    """获取 vault 状态（文件数、最近更新时间、各 area 文件统计）"""
    try:
        status = await obsidian_exporter.status()
        return VaultStatus(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取状态失败: {str(e)}")


@router.get("/graph")
async def get_graph_data(
    session: AsyncSession = Depends(get_session),
) -> dict:
    """获取 graph-data.json 内容（知识图谱数据）"""
    try:
        import json
        graph_path = obsidian_exporter.vault_path / "graph-data.json"
        if graph_path.exists():
            return json.loads(graph_path.read_text(encoding="utf-8"))
        return {"nodes": [], "edges": [], "communities": [], "last_updated": ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"读取图谱数据失败: {str(e)}")


@router.post("/update-mocs")
async def update_all_mocs() -> dict:
    """更新所有 MOC 文件和 INDEX"""
    try:
        areas = ["OCR技术", "昇腾开发", "信创环境", "AI-ML", "开源工具"]
        updated: list[str] = []

        for area in areas:
            await obsidian_exporter.update_moc(area)
            updated.append(area)

        await obsidian_exporter.update_index()

        return {
            "success": True,
            "updated_areas": updated,
            "message": f"已更新 {len(updated)} 个 Area 的 MOC 和主 INDEX",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新 MOC 失败: {str(e)}")
