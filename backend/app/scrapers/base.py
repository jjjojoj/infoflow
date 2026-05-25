"""Base scraper interface used by every site-specific scraper."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


# Tier-1 keywords: strong signal, any ONE match = relevant
CORE_KEYWORDS = [
    # OCR / 文档AI
    "OCR", "文字识别", "optical character recognition", "document AI",
    "text recognition", "document understanding",
    # 信创 / 昇腾 / NPU
    "昇腾", "鲲鹏", "信创", "CANN", "MindSpore", "国产化", "国产芯片",
    "ascend", "npu", "huawei ai",
    # OCR 具体工具
    "PaddleOCR", "paddleocr",
    # 模型部署 / 推理优化
    "模型部署", "onnx", "tensorrt", "模型量化",
    "inference optimization", "edge inference",
]

# Tier-2 keywords: weak signal alone, need >=2 different matches OR paired with tier-1
BROAD_KEYWORDS = [
    # 大模型
    "DeepSeek", "Qwen", "大模型", "LLM",
    # CV
    "计算机视觉", "computer vision", "目标检测", "object detection",
    "图像分割", "segmentation", "多模态", "multimodal",
    # 通用AI
    "PyTorch", "pytorch", "transformer", "量化", "quantiz",
    "蒸馏", "distill", "RAG", "agent", "微调", "fine-tun",
    "向量数据库", "vector database", "embedding",
]

# Combined list (for backward compat)
KEYWORDS = CORE_KEYWORDS + BROAD_KEYWORDS


@dataclass
class RawArticle:
    """Normalized article payload produced by every scraper."""

    title: str
    url: str
    content: str = ""
    source_name: str = ""
    source_type: str = "crawler"
    tags: list[str] = field(default_factory=list)
    published_at: datetime | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to a plain dict suitable for database insertion."""
        return {
            "title": self.title,
            "url": self.url,
            "content": self.content,
            "source_name": self.source_name,
            "source_type": self.source_type,
            "tags": self.tags,
            "published_at": self.published_at,
        }


class BaseScraper(ABC):
    """Common contract: ``fetch()`` returns normalized article dicts."""

    name: str = "base"
    source_type: str = "crawler"

    @abstractmethod
    async def fetch(self, **kwargs: Any) -> list[dict[str, Any]]:
        """Return a list of normalized article payloads."""

    @abstractmethod
    async def parse(self, raw_data: Any) -> list[dict[str, Any]]:
        """Parse raw fetched data into normalized article dicts."""

    def matches_keywords(self, text: str, extra_keywords: list[str] | None = None) -> bool:
        """Check whether text matches any of the predefined keywords."""
        if not text:
            return False
        text_lower = text.lower()
        keywords = KEYWORDS + (extra_keywords or [])
        return any(kw.lower() in text_lower for kw in keywords)
