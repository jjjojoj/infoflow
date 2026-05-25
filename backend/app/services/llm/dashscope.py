"""阿里百练(DashScope/通义千问) LLM adapter (OpenAI-compatible API)."""
from __future__ import annotations

import json
import logging
from typing import Any

from openai import AsyncOpenAI

from .base import BaseLLM, LLMResponse

logger = logging.getLogger(__name__)


class DashScopeLLM(BaseLLM):
    """阿里百练 DashScope API 适配器 - 使用 OpenAI 兼容接口。"""

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: str = "qwen-plus",
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    async def chat(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        """发送对话请求到 DashScope API。"""
        try:
            response = await self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            choice = response.choices[0]
            usage = response.usage
            resp = LLMResponse(
                content=choice.message.content or "",
                model=response.model,
                usage={
                    "prompt_tokens": usage.prompt_tokens if usage else 0,
                    "completion_tokens": usage.completion_tokens if usage else 0,
                    "total_tokens": usage.total_tokens if usage else 0,
                },
            )
            await self._record_usage(
                resp.model,
                resp.usage.get("prompt_tokens", 0),
                resp.usage.get("completion_tokens", 0),
            )
            return resp
        except Exception as e:
            logger.error("DashScope API 调用失败: %s", e)
            return LLMResponse(content="", model=self.model, usage={})

    async def summarize(self, text: str, max_length: int = 200) -> str:
        """生成结构化 Markdown 摘要。"""
        messages = [
            {
                "role": "system",
                "content": (
                    "你是一个专业的技术内容摘要助手。"
                    "请用 Markdown 格式输出摘要，结构清晰，包含以下层级：\n"
                    "### 核心要点\n- 用 2-3 个 bullet 列出最重要的信息\n"
                    "### 技术细节\n- 列出关键技术点或方法（如有）\n"
                    "### 影响与趋势\n- 一句话总结行业影响或发展趋势\n\n"
                    "规则：\n"
                    "- 每个 bullet 不超过 40 字\n"
                    "- 不要使用加粗/斜体等额外格式\n"
                    "- 如果内容不涉及某部分，可以省略该标题\n"
                    "- 总字数控制在 300 字以内"
                ),
            },
            {
                "role": "user",
                "content": f"请生成以下内容的结构化摘要：\n\n{text}",
            },
        ]
        resp = await self.chat(messages, temperature=0.3, max_tokens=600)
        return resp.content.strip()

    async def extract_keywords(self, text: str, max_keywords: int = 10) -> list[str]:
        """提取关键词。"""
        messages = [
            {
                "role": "system",
                "content": "你是一个关键词提取助手，请以JSON数组格式返回关键词。",
            },
            {
                "role": "user",
                "content": (
                    f"从以下文本中提取最多{max_keywords}个关键词，"
                    f"以JSON数组格式返回（如 [\"关键词1\", \"关键词2\"]），不要包含其他文字：\n\n{text}"
                ),
            },
        ]
        resp = await self.chat(messages, temperature=0.2, max_tokens=300)
        return self._parse_keywords(resp.content)

    async def classify(self, text: str, categories: list[str]) -> dict:
        """文本分类。"""
        categories_str = ", ".join(categories)
        messages = [
            {
                "role": "system",
                "content": "你是一个文本分类助手，请以JSON格式返回分类结果。",
            },
            {
                "role": "user",
                "content": (
                    f"将以下文本分类到这些类别中: [{categories_str}]。\n"
                    f"返回JSON格式，键为类别名，值为置信度(0-1)，如 {{\"类别A\": 0.8, \"类别B\": 0.2}}。"
                    f"只返回JSON，不要包含其他文字：\n\n{text}"
                ),
            },
        ]
        resp = await self.chat(messages, temperature=0.2, max_tokens=300)
        return self._parse_classification(resp.content, categories)

    @staticmethod
    def _parse_keywords(raw: str) -> list[str]:
        """解析 LLM 返回的关键词 JSON。"""
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            result = json.loads(cleaned)
            if isinstance(result, list):
                return [str(k).strip() for k in result if k]
        except (json.JSONDecodeError, ValueError):
            logger.warning("关键词解析失败，尝试按行分割: %s", raw[:100])
            keywords = [k.strip().strip('"').strip("'") for k in raw.replace("\n", ",").split(",")]
            return [k for k in keywords if k and len(k) < 50][:10]
        return []

    @staticmethod
    def _parse_classification(raw: str, categories: list[str]) -> dict:
        """解析 LLM 返回的分类 JSON。"""
        try:
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            result = json.loads(cleaned)
            if isinstance(result, dict):
                return {k: float(v) for k, v in result.items() if k in categories}
        except (json.JSONDecodeError, ValueError):
            logger.warning("分类结果解析失败: %s", raw[:100])
        return {cat: 1.0 / len(categories) for cat in categories} if categories else {}
