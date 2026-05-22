"""SQLAlchemy ORM models for InfoFlow.

Defines the persistent entities used across the application: articles,
sources, interests, and AI-generated insights.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Article(Base):
    """A piece of content fetched from an external source."""

    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True, index=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_name: Mapped[str | None] = mapped_column(String(256), nullable=True, index=True)
    source_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), index=True
    )
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_bookmarked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    relevance_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    community: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)

    insights: Mapped[list["Insight"]] = relationship(
        "Insight", back_populates="article", cascade="all, delete-orphan"
    )


class Source(Base):
    """A data source: RSS feed, custom crawler, etc."""

    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False, unique=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)  # rss / crawler
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    fetch_interval: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    last_fetched: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    config: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True, default=dict)


class Interest(Base):
    """A user-declared interest keyword used to score article relevance."""

    __tablename__ = "interests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    keyword: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    weight: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Insight(Base):
    """An AI-generated insight tied to an article."""

    __tablename__ = "insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    insight_type: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    related_article_ids: Mapped[list[int] | None] = mapped_column(JSON, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    article: Mapped["Article"] = relationship("Article", back_populates="insights")
