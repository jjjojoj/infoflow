"""AI analyzer service - summarization, tagging, classification and insight generation."""
from __future__ import annotations

import hashlib
import json
import logging
from collections import OrderedDict
from typing import Any

from .llm import get_llm_provider
from .llm.base import BaseLLM

logger = logging.getLogger(__name__)

# ─── 简单 LRU 缓存（避免重复 LLM 调用） ───────────────────────────────────────
_CACHE_MAX_SIZE = 256


class _LRUCache(OrderedDict):
    """简易 LRU 缓存，基于 OrderedDict 实现。"""

    def __init__(self, max_size: int = _CACHE_MAX_SIZE):
        super().__init__()
        self._max_size = max_size

    def get_cached(self, key: str) -> Any | None:
        if key in self:
            self.move_to_end(key)
            return self[key]
        return None

    def put(self, key: str, value: Any) -> None:
        if key in self:
            self.move_to_end(key)
        self[key] = value
        while len(self) > self._max_size:
            self.popitem(last=False)


# ─── 标签体系 ────────────────────────────────────────────────────────────────
TAG_MAPPING = {
    "OCR": "tech/ocr",
    "光学字符识别": "tech/ocr",
    "文字识别": "tech/ocr",
    "昇腾": "tech/ascend",
    "Ascend": "tech/ascend",
    "NPU": "tech/ascend",
    "鲲鹏": "tech/kunpeng",
    "Kunpeng": "tech/kunpeng",
    "ARM": "tech/kunpeng",
    "MindSpore": "tech/mindspore",
    "昇思": "tech/mindspore",
    "CANN": "tech/cann",
    "异构计算": "tech/cann",
    "论文": "type/paper",
    "paper": "type/paper",
    "arxiv": "type/paper",
    "教程": "type/tutorial",
    "tutorial": "type/tutorial",
    "入门": "type/tutorial",
    "发布": "type/release",
    "release": "type/release",
    "更新": "type/release",
    "版本": "type/release",
}

# ─── 分类维度 ────────────────────────────────────────────────────────────────
CONTENT_CATEGORIES = [
    "OCR技术",
    "昇腾开发",
    "信创环境",
    "AI-ML",
    "开源工具",
]


def _content_hash(text: str) -> str:
    """计算文本内容的短哈希，用于缓存键。"""
    return hashlib.md5(text[:2000].encode("utf-8")).hexdigest()[:16]


class AIAnalyzer:
    """AI 内容分析服务 - 整合 LLM 能力进行文章分析、分类、关联。"""

    def __init__(self) -> None:
        self._llm: BaseLLM | None = None
        self._cache = _LRUCache()

    @property
    def llm(self) -> BaseLLM:
        """延迟初始化 LLM 实例。"""
        if self._llm is None:
            self._llm = get_llm_provider()
        return self._llm

    def reset_llm(self) -> None:
        """重置 LLM 实例（配置变更时调用）。"""
        self._llm = None

    # ─── 核心分析方法 ──────────────────────────────────────────────────────

    async def analyze_article(self, article: dict) -> dict:
        """对单篇文章进行完整 AI 分析。

        Parameters
        ----------
        article : dict
            需包含 title, content (或 summary) 字段

        Returns
        -------
        dict
            {summary, keywords, categories, relevance_score, related_topics}
        """
        title = article.get("title", "")
        content = article.get("content") or article.get("summary") or title
        text = f"标题：{title}\n\n内容：{content[:3000]}"

        # 并行进行多项分析（串行调用以避免 API 限流）
        summary = await self.generate_summary(text)
        keywords = await self.extract_keywords(text)
        categories = await self.classify_content(text)

        # 计算默认相关度（无用户兴趣时）
        relevance_score = max(categories.values()) if categories else 0.0

        # 提取相关主题
        related_topics = [cat for cat, score in categories.items() if score > 0.3]

        return {
            "summary": summary,
            "keywords": keywords,
            "categories": categories,
            "relevance_score": round(relevance_score, 3),
            "related_topics": related_topics,
        }

    async def generate_summary(self, content: str) -> str:
        """生成内容摘要，带缓存。"""
        cache_key = f"summary:{_content_hash(content)}"
        cached = self._cache.get_cached(cache_key)
        if cached is not None:
            return cached

        try:
            result = await self.llm.summarize(content, max_length=200)
            if result:
                self._cache.put(cache_key, result)
            return result
        except Exception as e:
            logger.error("生成摘要失败: %s", e)
            # 降级：取前200字作为摘要
            return content[:200].strip() + "..."

    async def extract_keywords(self, content: str) -> list[str]:
        """提取关键词并映射到标签体系。"""
        cache_key = f"keywords:{_content_hash(content)}"
        cached = self._cache.get_cached(cache_key)
        if cached is not None:
            return cached

        try:
            raw_keywords = await self.llm.extract_keywords(content, max_keywords=10)
            # 映射到标签体系
            mapped_tags = set()
            for kw in raw_keywords:
                for trigger, tag in TAG_MAPPING.items():
                    if trigger.lower() in kw.lower():
                        mapped_tags.add(tag)
                        break

            # 合并原始关键词和映射标签
            result = list(mapped_tags) + [k for k in raw_keywords if k not in mapped_tags]
            self._cache.put(cache_key, result)
            return result
        except Exception as e:
            logger.error("提取关键词失败: %s", e)
            return []

    async def classify_content(self, content: str) -> dict:
        """内容分类。"""
        cache_key = f"classify:{_content_hash(content)}"
        cached = self._cache.get_cached(cache_key)
        if cached is not None:
            return cached

        try:
            result = await self.llm.classify(content, CONTENT_CATEGORIES)
            if result:
                self._cache.put(cache_key, result)
            return result
        except Exception as e:
            logger.error("内容分类失败: %s", e)
            return {}

    async def compute_relevance(
        self, content: str, interests: list[dict]
    ) -> float:
        """计算文章与用户兴趣的相关度评分 (0-1)。

        Parameters
        ----------
        content : str
            文章内容
        interests : list[dict]
            用户兴趣列表 [{keyword, weight, category}]
        """
        if not interests:
            return 0.0

        # 基于关键词匹配计算基础分
        content_lower = content.lower()
        total_weight = sum(i.get("weight", 1.0) for i in interests)
        matched_weight = 0.0

        for interest in interests:
            keyword = interest.get("keyword", "").lower()
            weight = interest.get("weight", 1.0)
            if keyword and keyword in content_lower:
                matched_weight += weight

        keyword_score = matched_weight / total_weight if total_weight > 0 else 0.0

        # 使用 LLM 进行语义相关度评估（仅在关键词匹配度适中时）
        if 0.1 < keyword_score < 0.8:
            try:
                interest_keywords = [i.get("keyword", "") for i in interests[:5]]
                messages = [
                    {
                        "role": "system",
                        "content": "你是一个内容相关度评估助手。请返回一个0到1之间的数字表示相关程度。",
                    },
                    {
                        "role": "user",
                        "content": (
                            f"评估以下内容与这些兴趣关键词的相关程度：\n"
                            f"兴趣关键词：{', '.join(interest_keywords)}\n"
                            f"内容摘要：{content[:500]}\n\n"
                            f"只返回一个0到1之间的数字，不要其他文字："
                        ),
                    },
                ]
                resp = await self.llm.chat(messages, temperature=0.1, max_tokens=10)
                try:
                    semantic_score = float(resp.content.strip())
                    semantic_score = max(0.0, min(1.0, semantic_score))
                except ValueError:
                    semantic_score = keyword_score

                # 综合评分：关键词匹配 40% + 语义相似度 60%
                return round(keyword_score * 0.4 + semantic_score * 0.6, 3)
            except Exception as e:
                logger.warning("语义相关度计算失败，使用关键词匹配分: %s", e)

        return round(keyword_score, 3)

    async def find_related_articles(
        self, article: dict, existing_articles: list[dict]
    ) -> list[dict]:
        """找出与当前文章相关的已有文章，用于知识图谱。

        Returns
        -------
        list[dict]
            [{article_id, relation_type, strength}]
            relation_type: "same_topic", "extends", "contradicts", "references"
        """
        if not existing_articles:
            return []

        current_title = article.get("title", "")
        current_tags = article.get("tags", []) or []
        current_community = article.get("community", "")

        related = []

        # 先通过标签和社区进行快速匹配
        for other in existing_articles[:50]:  # 限制比较数量
            if other.get("id") == article.get("id"):
                continue

            other_tags = other.get("tags", []) or []
            other_community = other.get("community", "")

            # 计算标签重叠度
            common_tags = set(current_tags) & set(other_tags)
            if not common_tags and current_community != other_community:
                continue

            tag_overlap = len(common_tags) / max(len(set(current_tags) | set(other_tags)), 1)
            same_community = current_community == other_community and current_community

            strength = tag_overlap * 0.7 + (0.3 if same_community else 0.0)

            if strength > 0.2:
                relation_type = "same_topic" if tag_overlap > 0.5 else "extends"
                related.append({
                    "article_id": other.get("id"),
                    "relation_type": relation_type,
                    "strength": round(strength, 3),
                })

        # 如果快速匹配不足，尝试 LLM 语义匹配（限制为前5篇候选）
        if len(related) < 3 and existing_articles:
            candidates = [
                a for a in existing_articles[:20]
                if a.get("id") != article.get("id") and a.get("id") not in {r["article_id"] for r in related}
            ][:5]

            if candidates:
                try:
                    candidates_text = "\n".join(
                        f"- ID:{c.get('id')} 标题:《{c.get('title', '')}》"
                        for c in candidates
                    )
                    messages = [
                        {
                            "role": "system",
                            "content": "你是一个文章关联分析助手，请以JSON数组格式返回相关文章。",
                        },
                        {
                            "role": "user",
                            "content": (
                                f"当前文章标题：《{current_title}》\n\n"
                                f"候选文章列表：\n{candidates_text}\n\n"
                                f"找出与当前文章相关的文章，返回JSON数组，格式如：\n"
                                f'[{{"article_id": 1, "relation_type": "same_topic", "strength": 0.8}}]\n'
                                f"relation_type可选: same_topic, extends, contradicts, references\n"
                                f"strength为0-1之间的数字。如果没有相关文章，返回空数组[]："
                            ),
                        },
                    ]
                    resp = await self.llm.chat(messages, temperature=0.2, max_tokens=500)
                    llm_related = self._parse_related(resp.content)
                    related.extend(llm_related)
                except Exception as e:
                    logger.warning("LLM 关联分析失败: %s", e)

        # 按强度排序，取前10
        related.sort(key=lambda x: x["strength"], reverse=True)
        return related[:10]

    async def generate_insight(self, articles: list[dict]) -> dict:
        """基于多篇文章生成洞察报告。

        Parameters
        ----------
        articles : list[dict]
            文章列表，每篇需包含 title, summary/content

        Returns
        -------
        dict
            {title, summary, key_points, connections, trend}
        """
        if not articles:
            return {
                "title": "无可用文章",
                "summary": "",
                "key_points": [],
                "connections": [],
                "trend": "",
            }

        # 构造文章摘要列表
        articles_text = "\n\n".join(
            f"【{i+1}】{a.get('title', '无标题')}\n"
            f"摘要：{(a.get('summary') or a.get('content', ''))[:200]}"
            for i, a in enumerate(articles[:10])
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "你是一个专业的技术趋势分析师，擅长从多篇文章中发现共性、趋势和深层联系。"
                    "请以JSON格式返回分析结果。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"请基于以下{len(articles[:10])}篇文章生成一份洞察报告：\n\n"
                    f"{articles_text}\n\n"
                    f"以JSON格式返回，包含以下字段：\n"
                    f'{{"title": "洞察标题", '
                    f'"summary": "100字以内的总结", '
                    f'"key_points": ["要点1", "要点2", ...], '
                    f'"connections": ["文章间联系1", ...], '
                    f'"trend": "趋势判断"}}\n'
                    f"只返回JSON，不要其他文字："
                ),
            },
        ]

        try:
            resp = await self.llm.chat(messages, temperature=0.5, max_tokens=1000)
            return self._parse_insight(resp.content)
        except Exception as e:
            logger.error("生成洞察报告失败: %s", e)
            return {
                "title": "分析暂时不可用",
                "summary": "LLM 服务暂时不可用，请稍后重试。",
                "key_points": [],
                "connections": [],
                "trend": "",
            }

    # ─── 私有解析方法 ──────────────────────────────────────────────────────

    @staticmethod
    def _parse_related(raw: str) -> list[dict]:
        """解析 LLM 返回的关联文章 JSON。"""
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            result = json.loads(cleaned)
            if isinstance(result, list):
                valid = []
                for item in result:
                    if isinstance(item, dict) and "article_id" in item:
                        valid.append({
                            "article_id": item["article_id"],
                            "relation_type": item.get("relation_type", "same_topic"),
                            "strength": min(1.0, max(0.0, float(item.get("strength", 0.5)))),
                        })
                return valid
        except (json.JSONDecodeError, ValueError, TypeError):
            logger.warning("关联文章解析失败: %s", raw[:100])
        return []

    @staticmethod
    def _parse_insight(raw: str) -> dict:
        """解析 LLM 返回的洞察报告 JSON。"""
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            result = json.loads(cleaned)
            if isinstance(result, dict):
                return {
                    "title": result.get("title", "未命名洞察"),
                    "summary": result.get("summary", ""),
                    "key_points": result.get("key_points", []),
                    "connections": result.get("connections", []),
                    "trend": result.get("trend", ""),
                }
        except (json.JSONDecodeError, ValueError):
            logger.warning("洞察报告解析失败: %s", raw[:100])
        return {
            "title": "解析失败",
            "summary": raw[:200] if raw else "",
            "key_points": [],
            "connections": [],
            "trend": "",
        }


# 模块级单例
ai_analyzer = AIAnalyzer()
