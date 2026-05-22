"""Obsidian export service - writes Markdown notes into a local vault.

Implements a Graphify-inspired three-layer architecture:
  Layer 1 (00-Inbox): raw captured articles
  Layer 2 (20-Areas): curated wiki-like knowledge areas with MOCs
  Layer 3 (30-Insights): AI-generated connections, trends, daily/weekly digests
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from ..config import settings

logger = logging.getLogger(__name__)

# ─── Area 映射规则 ──────────────────────────────────────────────────────────────

AREA_TAG_MAPPING: dict[str, list[str]] = {
    "OCR技术": ["tech/ocr", "ocr", "文字识别", "光学字符识别"],
    "昇腾开发": ["tech/ascend", "tech/cann", "tech/mindspore", "昇腾", "ascend", "npu", "mindspore", "cann"],
    "信创环境": ["tech/kunpeng", "信创", "鲲鹏", "kunpeng", "国产化"],
    "AI-ML": ["ai", "ml", "机器学习", "深度学习", "大模型", "llm", "transformer", "neural"],
    "开源工具": ["开源", "github", "repo", "开源工具", "open-source"],
}

# ─── 目录结构定义 ──────────────────────────────────────────────────────────────

VAULT_DIRS = [
    "00-Inbox",
    "10-Learn/Papers",
    "10-Learn/Tutorials",
    "10-Learn/Courses",
    "10-Learn/Books",
    "20-Areas/OCR技术/Concepts",
    "20-Areas/OCR技术/Tools",
    "20-Areas/OCR技术/Synthesis",
    "20-Areas/OCR技术/Contradictions",
    "20-Areas/昇腾开发/Concepts",
    "20-Areas/昇腾开发/Deployment",
    "20-Areas/昇腾开发/Resources",
    "20-Areas/信创环境/鲲鹏平台",
    "20-Areas/信创环境/国产化适配",
    "20-Areas/信创环境/案例研究",
    "20-Areas/AI-ML/Concepts",
    "20-Areas/AI-ML/Tools",
    "20-Areas/开源工具/Repos",
    "30-Insights/Daily",
    "30-Insights/Weekly",
    "30-Insights/Connections",
    "30-Insights/Trends",
    "40-Projects",
    "50-ReadLater",
    "90-Meta/Templates",
    "99-Archive",
]

# ─── 模板内容 ──────────────────────────────────────────────────────────────────

TPL_ARTICLE = """\
---
title: "{title}"
type: article
created: {created}
source-url: "{source_url}"
source-name: "{source_name}"
tags: {tags}
related-notes: {related_notes}
summary: "{summary}"
confidence: {confidence}
relevance-score: {relevance_score}
community: "{community}"
---

# {title}

## 摘要
{summary}

## 关键要点
{key_points}

## 内容
{content}

## 相关笔记
{related_links}

## 原文链接
[原文]({source_url})
"""

TPL_PAPER = """\
---
title: "{title}"
type: paper
created: {created}
source-url: "{source_url}"
source-name: "{source_name}"
tags: {tags}
related-notes: {related_notes}
summary: "{summary}"
confidence: {confidence}
relevance-score: {relevance_score}
community: "{community}"
---

# {title}

## 摘要
{summary}

## 关键贡献
{key_points}

## 方法论
{content}

## 相关论文
{related_links}

## 原文链接
[原文]({source_url})
"""

TPL_CONCEPT = """\
---
title: "{title}"
type: concept
created: {created}
tags: {tags}
related-notes: {related_notes}
community: "{community}"
---

# {title}

## 定义
{content}

## 相关概念
{related_links}
"""

TPL_TOOL = """\
---
title: "{title}"
type: tool
created: {created}
source-url: "{source_url}"
tags: {tags}
related-notes: {related_notes}
community: "{community}"
---

# {title}

## 简介
{summary}

## 功能特点
{key_points}

## 使用方法
{content}

## 相关工具
{related_links}

## 链接
[项目主页]({source_url})
"""

TAG_SCHEMA_CONTENT = """\
# 标签体系规范 (Tag Schema)

## 技术领域 (tech/)
- `tech/ocr` - OCR 与文字识别技术
- `tech/ascend` - 华为昇腾 AI 处理器
- `tech/cann` - CANN 异构计算架构
- `tech/mindspore` - MindSpore / 昇思框架
- `tech/kunpeng` - 鲲鹏处理器与生态

## 内容类型 (type/)
- `type/paper` - 学术论文
- `type/tutorial` - 教程与入门指南
- `type/release` - 版本发布与更新
- `type/tool` - 工具介绍
- `type/news` - 新闻资讯

## 来源 (source/)
- `source/arxiv` - arXiv 论文
- `source/github` - GitHub 仓库/项目
- `source/zhihu` - 知乎
- `source/huawei` - 华为官方

## 状态 (status/)
- `status/inbox` - 待整理
- `status/processed` - 已整理
- `status/archived` - 已归档

---
Last Updated: {date}
"""

INDEX_TEMPLATE = """\
# 🧠 InfoFlow 知识库

> 自动聚合的技术信息知识库，基于 Graphify 三层架构组织。

## 📥 收件箱
- [[00-Inbox]] - 新捕获的原始内容

## 📚 学习资料
- [[10-Learn/Papers]] - 论文
- [[10-Learn/Tutorials]] - 教程
- [[10-Learn/Courses]] - 课程
- [[10-Learn/Books]] - 书籍

## 🗂️ 知识领域
{areas_section}

## 💡 AI 洞察
- [[30-Insights/Daily]] - 每日摘要
- [[30-Insights/Weekly]] - 每周综述
- [[30-Insights/Connections]] - 知识关联
- [[30-Insights/Trends]] - 趋势分析

## 🔨 项目
- [[40-Projects]]

## 📖 稍后阅读
- [[50-ReadLater]]

---
Last Updated: {date}
Total Notes: {total_notes}
"""


class ObsidianExporter:
    """Obsidian 知识库导出服务 - 借鉴 Graphify 三层架构"""

    def __init__(self, vault_path: str | None = None):
        self.vault_path = Path(vault_path or settings.OBSIDIAN_VAULT_PATH)
        self._exported_hashes: set[str] = set()
        self._ensure_vault_structure()

    def _ensure_vault_structure(self):
        """确保 Vault 目录结构存在"""
        for d in VAULT_DIRS:
            (self.vault_path / d).mkdir(parents=True, exist_ok=True)

        # 创建 MOC 文件（如果不存在）
        for area in AREA_TAG_MAPPING:
            moc_path = self.vault_path / "20-Areas" / area / f"MOC-{area}.md"
            if not moc_path.exists():
                moc_path.write_text(
                    f"# MOC: {area}\n\n> 自动生成的内容地图\n\n---\nLast Updated: {date.today().isoformat()}\n",
                    encoding="utf-8",
                )

        # 创建模板文件
        self._create_templates()

        # 创建 Tag-Schema.md
        tag_schema_path = self.vault_path / "90-Meta" / "Tag-Schema.md"
        if not tag_schema_path.exists():
            tag_schema_path.write_text(
                TAG_SCHEMA_CONTENT.format(date=date.today().isoformat()),
                encoding="utf-8",
            )

        # 创建 INDEX.md
        index_path = self.vault_path / "INDEX.md"
        if not index_path.exists():
            areas_section = "\n".join(
                f"- [[20-Areas/{area}/MOC-{area}|{area}]]" for area in AREA_TAG_MAPPING
            )
            index_path.write_text(
                INDEX_TEMPLATE.format(
                    areas_section=areas_section,
                    date=date.today().isoformat(),
                    total_notes=0,
                ),
                encoding="utf-8",
            )

        # 创建 graph-data.json
        graph_path = self.vault_path / "graph-data.json"
        if not graph_path.exists():
            graph_path.write_text(
                json.dumps({"nodes": [], "edges": [], "communities": [], "last_updated": ""}, ensure_ascii=False),
                encoding="utf-8",
            )

        # 加载已导出的哈希记录
        self._load_exported_hashes()

    def _create_templates(self):
        """创建模板文件"""
        tpl_dir = self.vault_path / "90-Meta" / "Templates"

        templates = {
            "tpl-article.md": TPL_ARTICLE,
            "tpl-paper.md": TPL_PAPER,
            "tpl-concept.md": TPL_CONCEPT,
            "tpl-tool.md": TPL_TOOL,
        }

        for filename, content in templates.items():
            tpl_path = tpl_dir / filename
            if not tpl_path.exists():
                tpl_path.write_text(content, encoding="utf-8")

    def _load_exported_hashes(self):
        """从元数据文件加载已导出的内容哈希"""
        meta_path = self.vault_path / "90-Meta" / "exported_hashes.json"
        if meta_path.exists():
            try:
                self._exported_hashes = set(json.loads(meta_path.read_text(encoding="utf-8")))
            except (json.JSONDecodeError, IOError):
                self._exported_hashes = set()

    def _save_exported_hashes(self):
        """保存已导出的内容哈希"""
        meta_path = self.vault_path / "90-Meta" / "exported_hashes.json"
        meta_path.write_text(
            json.dumps(list(self._exported_hashes), ensure_ascii=False),
            encoding="utf-8",
        )

    # ─── 核心导出方法 ──────────────────────────────────────────────────────────

    async def export_article(self, article: dict, analysis: dict | None = None) -> str:
        """导出单篇文章到 Obsidian vault

        Parameters
        ----------
        article : dict
            文章数据 (title, url, content, summary, source_name, tags, ...)
        analysis : dict | None
            AI 分析结果 (summary, keywords, categories, relevance_score, related_topics)

        Returns
        -------
        str
            写入的文件路径
        """
        title = article.get("title", "无标题")
        tags = article.get("tags") or []
        community = article.get("community") or ""

        # 确定存放位置
        if analysis and community:
            area = self._determine_area(tags, community)
        else:
            area = self._determine_area(tags, community)

        # 如果无法确定 area，放入 Inbox
        if area == "00-Inbox":
            today_str = date.today().isoformat()
            target_dir = self.vault_path / "00-Inbox" / today_str
        else:
            target_dir = self.vault_path / "20-Areas" / area

        target_dir.mkdir(parents=True, exist_ok=True)

        # 生成文件名
        filename = self._sanitize_filename(title) + ".md"
        filepath = target_dir / filename

        # 生成内容
        frontmatter = self._generate_frontmatter(article, analysis)
        markdown = self._generate_markdown(article, analysis)
        full_content = frontmatter + "\n" + markdown

        # 自动插入 wikilinks
        known_concepts = self._get_known_concepts()
        full_content = self._auto_wikilink(full_content, known_concepts)

        # 写入文件
        filepath.write_text(full_content, encoding="utf-8")

        # 记录已导出的哈希
        content_hash = article.get("content_hash") or self._compute_hash(
            article.get("content") or article.get("summary") or title
        )
        self._exported_hashes.add(content_hash)
        self._save_exported_hashes()

        logger.info("已导出文章到: %s", filepath)
        return str(filepath)

    def _generate_frontmatter(self, article: dict, analysis: dict | None = None) -> str:
        """生成 YAML frontmatter"""
        title = article.get("title", "无标题").replace('"', '\\"')
        source_url = article.get("url", "")
        source_name = article.get("source_name", "unknown")
        tags = article.get("tags") or []
        summary = (article.get("summary") or "")[:200].replace('"', '\\"')
        community = article.get("community") or ""
        relevance_score = article.get("relevance_score", 0.0)
        created = article.get("created_at", datetime.now().isoformat())

        if isinstance(created, datetime):
            created = created.isoformat()

        # 从分析结果中获取额外信息
        confidence = 0.0
        related_notes: list[str] = []
        if analysis:
            summary = analysis.get("summary", summary)[:200].replace('"', '\\"')
            confidence = analysis.get("relevance_score", 0.0)
            related_topics = analysis.get("related_topics", [])
            related_notes = [f"[[{t}]]" for t in related_topics[:5]]

        # 格式化 tags 为 YAML 列表
        tags_yaml = "\n".join(f"  - {t}" for t in tags) if tags else "  []"
        related_yaml = "\n".join(f"  - \"{n}\"" for n in related_notes) if related_notes else "  []"

        fm = f"""---
title: "{title}"
type: {self._determine_type(article, tags)}
created: {created}
source-url: "{source_url}"
source-name: "{source_name}"
tags:
{tags_yaml}
related-notes:
{related_yaml}
summary: "{summary}"
confidence: {confidence}
relevance-score: {relevance_score}
community: "{community}"
---"""
        return fm

    def _generate_markdown(self, article: dict, analysis: dict | None = None) -> str:
        """生成 Markdown 正文内容"""
        title = article.get("title", "无标题")
        content = article.get("content") or ""
        summary = article.get("summary") or ""
        source_url = article.get("url", "")
        source_name = article.get("source_name", "unknown")
        created_at = article.get("created_at", "")

        if isinstance(created_at, datetime):
            created_at = created_at.strftime("%Y-%m-%d %H:%M")

        # 从分析结果中获取摘要和关键要点
        key_points = ""
        if analysis:
            summary = analysis.get("summary", summary)
            keywords = analysis.get("keywords", [])
            related_topics = analysis.get("related_topics", [])
            if keywords:
                key_points = "\n".join(f"- {kw}" for kw in keywords[:10])

        if not key_points:
            key_points = "- 暂无关键要点提取"

        # 相关笔记链接
        related_links = ""
        if analysis and analysis.get("related_topics"):
            related_links = "\n".join(f"- [[{t}]]" for t in analysis["related_topics"][:5])
        else:
            related_links = "- 暂无相关笔记"

        md = f"""
# {title}

## 摘要
{summary or '暂无摘要'}

## 关键要点
{key_points}

## 内容
{content or '暂无正文内容'}

## 相关笔记
{related_links}

## 原文链接
[原文]({source_url})

## 元信息
- 来源: {source_name}
- 采集时间: {created_at}
"""
        return md

    def _auto_wikilink(self, content: str, known_concepts: list[str]) -> str:
        """自动将内容中出现的已知概念转换为 [[wikilink]]

        避免在代码块和已有 wikilink 中重复替换。
        """
        if not known_concepts:
            return content

        # 拆分代码块和普通文本
        parts = re.split(r"(```[\s\S]*?```|`[^`]+`)", content)
        linked_concepts: set[str] = set()

        for i, part in enumerate(parts):
            # 跳过代码块
            if part.startswith("`"):
                continue

            for concept in known_concepts:
                if concept in linked_concepts:
                    continue
                # 避免匹配已有的 [[concept]] 或 frontmatter 区域
                if f"[[{concept}]]" in part:
                    linked_concepts.add(concept)
                    continue
                # 使用 word boundary 替换（第一次出现）
                pattern = re.compile(re.escape(concept), re.IGNORECASE)
                if pattern.search(part):
                    # 只替换第一次出现
                    parts[i] = pattern.sub(f"[[{concept}]]", parts[i], count=1)
                    linked_concepts.add(concept)

        return "".join(parts)

    def _determine_area(self, tags: list[str], community: str) -> str:
        """根据标签和社区确定文章应该放在哪个 Area"""
        tags_lower = [t.lower() for t in tags]

        # 先检查 community
        if community:
            community_lower = community.lower()
            for area, keywords in AREA_TAG_MAPPING.items():
                if any(kw.lower() in community_lower for kw in keywords):
                    return area

        # 再检查 tags
        for area, keywords in AREA_TAG_MAPPING.items():
            for kw in keywords:
                if kw.lower() in tags_lower or any(kw.lower() in t for t in tags_lower):
                    return area

        return "00-Inbox"

    def _determine_type(self, article: dict, tags: list[str]) -> str:
        """确定文章类型"""
        tags_lower = [t.lower() for t in tags]

        if any("paper" in t or "arxiv" in t for t in tags_lower):
            return "paper"
        if any("tutorial" in t or "教程" in t for t in tags_lower):
            return "tutorial"
        if any("tool" in t or "工具" in t for t in tags_lower):
            return "tool"

        source_name = (article.get("source_name") or "").lower()
        if "arxiv" in source_name:
            return "paper"
        if "github" in source_name:
            return "tool"

        return "article"

    def _get_known_concepts(self) -> list[str]:
        """获取已有笔记中的概念名（文件名去除 .md 后缀）"""
        concepts: list[str] = []
        areas_path = self.vault_path / "20-Areas"
        if areas_path.exists():
            for md_file in areas_path.rglob("*.md"):
                name = md_file.stem
                if not name.startswith("MOC-") and len(name) > 2:
                    concepts.append(name)
        return concepts

    def _sanitize_filename(self, title: str) -> str:
        """清理文件名（移除不合法字符）"""
        # 移除 Windows/Mac/Linux 不允许的文件名字符
        sanitized = re.sub(r'[<>:"/\\|?*]', '', title)
        sanitized = sanitized.strip(". ")
        # 限制长度
        if len(sanitized) > 100:
            sanitized = sanitized[:100]
        return sanitized or "untitled"

    @staticmethod
    def _compute_hash(content: str) -> str:
        """计算内容哈希"""
        return hashlib.md5(content.encode("utf-8")).hexdigest()

    # ─── MOC 与 INDEX 更新 ───────────────────────────────────────────────────

    async def update_moc(self, area: str):
        """更新指定 Area 的 MOC (Map of Content)"""
        area_path = self.vault_path / "20-Areas" / area
        if not area_path.exists():
            logger.warning("Area 不存在: %s", area)
            return

        # 扫描 area 目录下所有 .md 文件
        md_files: list[Path] = [
            f for f in area_path.rglob("*.md") if not f.name.startswith("MOC-")
        ]

        # 按类型分组
        groups: dict[str, list[str]] = defaultdict(list)
        for f in md_files:
            note_type = self._detect_note_type(f)
            groups[note_type].append(f.stem)

        # 生成 MOC 内容
        sections: list[str] = []
        type_labels = {
            "concept": "概念",
            "tool": "工具",
            "article": "文章",
            "paper": "论文",
            "tutorial": "教程",
        }

        for note_type, label in type_labels.items():
            items = groups.get(note_type, [])
            if items:
                links = "\n".join(f"- [[{name}]]" for name in sorted(items))
                sections.append(f"## {label} ({len(items)})\n{links}")

        # 未分类
        other_types = set(groups.keys()) - set(type_labels.keys())
        for ot in other_types:
            items = groups[ot]
            if items:
                links = "\n".join(f"- [[{name}]]" for name in sorted(items))
                sections.append(f"## 其他 ({len(items)})\n{links}")

        moc_content = f"# MOC: {area}\n\n" + "\n\n".join(sections)
        moc_content += f"\n\n---\nLast Updated: {date.today().isoformat()}\n"

        moc_path = area_path / f"MOC-{area}.md"
        moc_path.write_text(moc_content, encoding="utf-8")
        logger.info("已更新 MOC: %s", moc_path)

    def _detect_note_type(self, filepath: Path) -> str:
        """从文件 frontmatter 中检测笔记类型"""
        try:
            content = filepath.read_text(encoding="utf-8")
            # 简单解析 frontmatter 中的 type 字段
            match = re.search(r"^type:\s*(\w+)", content, re.MULTILINE)
            if match:
                return match.group(1)
        except IOError:
            pass
        return "article"

    async def update_index(self):
        """更新 INDEX.md 主入口"""
        # 统计各 area 的笔记数
        areas_info: list[str] = []
        total_notes = 0

        for area in AREA_TAG_MAPPING:
            area_path = self.vault_path / "20-Areas" / area
            if area_path.exists():
                count = len(list(area_path.rglob("*.md")))
                total_notes += count
                areas_info.append(f"- [[20-Areas/{area}/MOC-{area}|{area}]] ({count} notes)")
            else:
                areas_info.append(f"- [[20-Areas/{area}/MOC-{area}|{area}]] (0 notes)")

        # 计算 Inbox 中的笔记数
        inbox_path = self.vault_path / "00-Inbox"
        if inbox_path.exists():
            inbox_count = len(list(inbox_path.rglob("*.md")))
            total_notes += inbox_count

        areas_section = "\n".join(areas_info)
        index_content = INDEX_TEMPLATE.format(
            areas_section=areas_section,
            date=date.today().isoformat(),
            total_notes=total_notes,
        )

        index_path = self.vault_path / "INDEX.md"
        index_path.write_text(index_content, encoding="utf-8")
        logger.info("已更新 INDEX.md, 总笔记数: %d", total_notes)

    # ─── 知识图谱数据导出 ─────────────────────────────────────────────────────

    async def export_graph_data(self, articles: list[dict], relations: list[dict]):
        """导出知识图谱数据为 graph-data.json

        Parameters
        ----------
        articles : list[dict]
            文章列表 (id, title, tags, community, relevance_score)
        relations : list[dict]
            关系列表 (source_id, target_id, relation_type, strength)
        """
        nodes = []
        for art in articles:
            nodes.append({
                "id": str(art.get("id", "")),
                "label": art.get("title", ""),
                "type": self._determine_type(art, art.get("tags") or []),
                "community": art.get("community", ""),
                "size": max(1, int((art.get("relevance_score", 0) or 0) * 10)),
            })

        edges = []
        for rel in relations:
            edges.append({
                "source": str(rel.get("source_id", rel.get("article_id", ""))),
                "target": str(rel.get("target_id", "")),
                "relation": rel.get("relation_type", "related"),
                "weight": rel.get("strength", 0.5),
            })

        # 社区统计
        community_counts: dict[str, int] = defaultdict(int)
        for node in nodes:
            if node["community"]:
                community_counts[node["community"]] += 1

        communities = [
            {"name": name, "node_count": count, "description": f"{name} 知识社区"}
            for name, count in community_counts.items()
        ]

        graph_data = {
            "nodes": nodes,
            "edges": edges,
            "communities": communities,
            "last_updated": datetime.now().isoformat(),
        }

        graph_path = self.vault_path / "graph-data.json"
        graph_path.write_text(
            json.dumps(graph_data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.info("已导出知识图谱数据: %d nodes, %d edges", len(nodes), len(edges))
        return graph_data

    # ─── 矛盾检测 ─────────────────────────────────────────────────────────────

    async def detect_contradictions(
        self, new_article: dict, existing_articles: list[dict]
    ) -> list[dict]:
        """检测新文章与已有知识的矛盾

        简单实现: 比较同一主题下不同文章的关键观点。
        """
        contradictions: list[dict] = []
        new_tags = set(new_article.get("tags") or [])
        new_community = new_article.get("community", "")
        new_title = new_article.get("title", "")
        new_summary = new_article.get("summary") or new_article.get("content", "")

        for existing in existing_articles:
            existing_tags = set(existing.get("tags") or [])
            existing_community = existing.get("community", "")

            # 只比较同一社区/领域的文章
            same_community = new_community and new_community == existing_community
            tag_overlap = new_tags & existing_tags

            if not same_community and not tag_overlap:
                continue

            existing_summary = existing.get("summary") or existing.get("content", "")

            # 简单矛盾检测：检查是否存在明显对立词汇
            contradiction_signals = [
                ("推荐", "不推荐"),
                ("优于", "劣于"),
                ("最佳", "避免"),
                ("已废弃", "推荐使用"),
                ("deprecated", "recommended"),
            ]

            for positive, negative in contradiction_signals:
                if (positive in new_summary and negative in existing_summary) or \
                   (negative in new_summary and positive in existing_summary):
                    contradictions.append({
                        "article_id": existing.get("id"),
                        "article_title": existing.get("title", ""),
                        "contradiction_type": "opposing_stance",
                        "description": f"新文章《{new_title}》与《{existing.get('title', '')}》"
                                       f"在相同主题上可能存在对立观点",
                    })
                    break

            # 时间矛盾检测：同一主题下更新的信息可能让旧信息过时
            new_created = new_article.get("created_at")
            existing_created = existing.get("created_at")
            if new_created and existing_created and same_community:
                if isinstance(new_created, str):
                    try:
                        new_created = datetime.fromisoformat(new_created)
                    except ValueError:
                        new_created = None
                if isinstance(existing_created, str):
                    try:
                        existing_created = datetime.fromisoformat(existing_created)
                    except ValueError:
                        existing_created = None

                if new_created and existing_created:
                    days_diff = (new_created - existing_created).days
                    if days_diff > 180:  # 超过半年的同主题文章可能已过时
                        contradictions.append({
                            "article_id": existing.get("id"),
                            "article_title": existing.get("title", ""),
                            "contradiction_type": "temporal_outdated",
                            "description": f"《{existing.get('title', '')}》发布于 "
                                           f"{days_diff} 天前，同主题的新文章可能包含更新信息",
                        })

        return contradictions

    # ─── 社区检测 ─────────────────────────────────────────────────────────────

    async def community_detection(self, articles: list[dict]) -> dict:
        """简化版社区检测 - 基于标签共现频率的简单聚类

        Returns
        -------
        dict
            {community_name: [article_ids]}
        """
        if not articles:
            return {}

        communities: dict[str, list[int]] = defaultdict(list)

        for article in articles:
            article_id = article.get("id")
            tags = article.get("tags") or []
            assigned = False

            # 基于标签映射到社区
            for tag in tags:
                tag_lower = tag.lower()
                for area, keywords in AREA_TAG_MAPPING.items():
                    if any(kw.lower() in tag_lower or tag_lower in kw.lower() for kw in keywords):
                        communities[area].append(article_id)
                        assigned = True
                        break
                if assigned:
                    break

            # 如果无法通过标签映射，使用标题关键词
            if not assigned:
                title = (article.get("title") or "").lower()
                for area, keywords in AREA_TAG_MAPPING.items():
                    if any(kw.lower() in title for kw in keywords):
                        communities[area].append(article_id)
                        assigned = True
                        break

            # 仍然无法分类的放入 "未分类" 社区
            if not assigned:
                communities["未分类"].append(article_id)

        return dict(communities)

    # ─── 增量导出 ─────────────────────────────────────────────────────────────

    async def incremental_export(self, articles: list[dict]) -> dict:
        """增量导出 - 只导出新增或更新的文章

        Returns
        -------
        dict
            {exported_count, skipped_count, exported_paths}
        """
        exported_paths: list[str] = []
        skipped = 0

        for article in articles:
            content_hash = article.get("content_hash") or self._compute_hash(
                article.get("content") or article.get("summary") or article.get("title", "")
            )

            # 跳过已导出的
            if content_hash in self._exported_hashes:
                skipped += 1
                continue

            path = await self.export_article(article)
            if path:
                exported_paths.append(path)

        return {
            "exported_count": len(exported_paths),
            "skipped_count": skipped,
            "exported_paths": exported_paths,
        }

    # ─── Vault 状态 ───────────────────────────────────────────────────────────

    async def status(self) -> dict:
        """返回 vault 状态信息"""
        if not self.vault_path.exists():
            return {
                "vault_path": str(self.vault_path),
                "available": False,
                "note_count": 0,
                "areas": {},
                "last_updated": None,
            }

        # 统计各 area 的文件数
        areas_stats: dict[str, int] = {}
        total_notes = 0

        for area in AREA_TAG_MAPPING:
            area_path = self.vault_path / "20-Areas" / area
            if area_path.exists():
                count = len([f for f in area_path.rglob("*.md") if not f.name.startswith("MOC-")])
                areas_stats[area] = count
                total_notes += count

        # Inbox 统计
        inbox_path = self.vault_path / "00-Inbox"
        inbox_count = 0
        if inbox_path.exists():
            inbox_count = len(list(inbox_path.rglob("*.md")))
            total_notes += inbox_count

        # 最近更新时间
        last_updated = None
        all_md = list(self.vault_path.rglob("*.md"))
        if all_md:
            latest_file = max(all_md, key=lambda f: f.stat().st_mtime)
            last_updated = datetime.fromtimestamp(latest_file.stat().st_mtime).isoformat()

        return {
            "vault_path": str(self.vault_path),
            "available": True,
            "note_count": total_notes,
            "inbox_count": inbox_count,
            "areas": areas_stats,
            "last_updated": last_updated,
        }


# 模块级单例
obsidian_exporter = ObsidianExporter()
