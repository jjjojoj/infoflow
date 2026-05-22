<p align="center">
  <h1 align="center">📡 InfoFlow</h1>
  <p align="center"><b>AI 信息洞察与知识网络</b></p>
  <p align="center">多源抓取  ·  AI 摘要  ·  知识图谱  ·  Obsidian 集成</p>
</p>

---

[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)](frontend/package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](frontend/tsconfig.json)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue?logo=python)](backend/Dockerfile)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](backend/requirements.txt)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](docker-compose.yml)
[![DashScope](https://img.shields.io/badge/LLM-DashScope_%2B_DeepSeek_%2B_Ollama-purple)]()
[![License MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> 面向开发者的个人 AI 信息聚合平台 — 从多源自动采集、AI 摘要翻译、到知识网络可视化与 Obsidian 知识库同步，一站式完成。

---

## 🔥 核心功能

<table>
<tr>
<td width="33%">

**📥 多源智能采集**  
arXiv 论文  ·  GitHub Trending  ·  知乎热榜  ·  华为昇腾社区  
RSS + Scrapling 智能爬虫双模式，支持自定义数据源

</td>
<td width="33%">

**🤖 AI 中文摘要**  
DashScope（通义千问）/ DeepSeek / OpenAI / Ollama 多模型  
自动摘要翻译、关键词提取、分类打标

</td>
<td width="33%">

**🗺️ 知识网络可视化**  
ReactFlow 力导向图，按主题自动分组  
中心−分类−叶子三层节点，交互式探索

</td>
</tr>
<tr>
<td width="33%">

**🧠 自然语言兴趣配置**  
输入兴趣描述 → LLM 自动生成结构化关键词  
权重可调、分类管理、开关控制

</td>
<td width="33%">

**📊 实时仪表盘**  
文章统计 / 未读计数 / 洞察概览 / 活跃信息源  
全部来自后端 DB，零 mock 数据

</td>
<td width="33%">

**📝 Obsidian 双链导出**  
按分类自动分发到 vault 子目录  
Markdown + frontmatter + wikilink，开箱即用

</td>
</tr>
</table>

---

## 🏗️ 系统架构

```
┌────────────────────────────────────────────────────┐
│                    用户浏览器                         │
│                  http://localhost:5173              │
└─────────────────────┬──────────────────────────────┘
                      │
    ┌─────────────────▼──────────────────────────┐
    │              Nginx (:5173)                  │
    │         /api → proxy_pass backend:8000       │
    └───────┬──────────────────────┬──────────────┘
            │                      │
    ┌───────▼──────┐      ┌───────▼──────────────┐
    │  React SPA   │      │   FastAPI (:8000)    │
    │  ReactFlow   │      │                      │
    │  Recharts    │      │  ┌─────────────────┐ │
    │  TailwindCSS │      │  │ Scheduler       │ │
    └──────────────┘      │  │ (定时抓取+分析)  │ │
                          │  └─────────────────┘ │
                          │  ┌─────────────────┐ │
                          │  │ LLM Adapter     │ │
                          │  │ DashScope/OAI等 │ │
                          │  └─────────────────┘ │
                          │  ┌─────────────────┐ │
                          │  │ SQLite DB       │ │
                          │  │ + Obsidian Vault│ │
                          │  └─────────────────┘ │
                          └──────────────────────┘
```

- **无外部服务依赖** — SQLite 本地数据库，Docker 一键启动
- **模型可插拔** — 换 LLM 只需改 `.env` 中一行 `LLM_PROVIDER`
- **前后端分离** — Nginx 反向代理，API 路径 `/api` 统一转发

---

## 🚀 快速开始

### 前提条件

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 或 Docker Engine + Docker Compose

### 一键部署

```bash
git clone https://github.com/jjjojoj/infoflow.git
cd infoflow

# 配置 LLM（至少填一个）
cp .env.example .env
# 编辑 .env，填入 API Key

# 启动
docker compose up -d
```

访问：
- **前端面板** → http://localhost:5173
- **API 文档** → http://localhost:8000/docs

```bash
# 查看日志
docker compose logs -f backend

# 停止
docker compose down
```

---

## ⚙️ 环境变量

| 变量 | 说明 | 可选值 |
|------|------|--------|
| `LLM_PROVIDER` | LLM 提供商 | `dashscope` · `deepseek` · `openai` · `ollama` |
| `DASHSCOPE_API_KEY` | 阿里百炼 API Key | `sk-...` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | `sk-...` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-...` |
| `OLLAMA_BASE_URL` | Ollama 地址 | `http://host.docker.internal:11434` |
| `FETCH_INTERVAL_MINUTES` | 自动抓取间隔 | 默认 `30` |
| `OBSIDIAN_VAULT_PATH` | Obsidian vault 路径 | 默认 `/app/data/obsidian_vault` |

> [!TIP]
> **推荐 DashScope**（通义千问 qwen-plus）：国内访问快、中文效果好、性价比高。
> 容器内访问宿主机 Ollama 使用 `host.docker.internal` 替代 `localhost`。

---

## 🎯 预置关注方向

InfoFlow 默认关注以下方向（可在设置页面通过自然语言描述重新生成）：

| 分类 | 关键词 | 权重 |
|------|--------|------|
| 核心技术 | OCR文字识别 · PyTorch | 0.90~0.95 |
| 平台环境 | 华为昇腾910B · 信创环境AI模型部署 | 0.85~0.90 |
| 工具框架 | DeepSeek · Qwen · Python | 0.75~0.90 |
| 学习成长 | — | — |

---

## 📂 项目结构

```
infoflow/
├── backend/
│   ├── app/
│   │   ├── routers/          # API 路由
│   │   │   ├── articles.py   #   文章 CRUD + 抓取触发
│   │   │   ├── sources.py    #   信息源管理
│   │   │   ├── settings.py   #   兴趣配置 + AI 生成 + 仪表盘
│   │   │   ├── insights.py   #   洞察分析
│   │   │   ├── obsidian.py   #   Obsidian 导出
│   │   │   └── stats.py      #   Token 用量统计
│   │   ├── services/
│   │   │   ├── crawler.py    #   爬虫调度（Scrapling）
│   │   │   ├── ai_analyzer.py #   AI 摘要/分类/打标
│   │   │   ├── dedup.py      #   三层去重（URL/内容/标题）
│   │   │   └── llm/          #   多模型适配器
│   │   │       ├── dashscope.py
│   │   │       ├── deepseek.py
│   │   │       ├── openai_adapter.py
│   │   │       └── ollama.py
│   │   ├── scrapers/         # 各站点爬虫
│   │   │   ├── arxiv.py
│   │   │   ├── github_trending.py
│   │   │   ├── zhihu.py
│   │   │   └── huawei_ascend.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py           # FastAPI 入口
│   │   └── models.py
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/        # 仪表盘 (统计卡片 + 趋势图)
│   │   │   ├── KnowledgeGraph/   # 知识图谱 (ReactFlow 自定义节点)
│   │   │   ├── ArticleDetail/    # 文章详情 + AI 洞察面板
│   │   │   ├── Timeline/         # 时间线
│   │   │   ├── ReadLater/        # 稍后阅读
│   │   │   ├── Settings/         # 设置 (兴趣/LLM/采集/Obsidian)
│   │   │   └── Layout/           # 侧边栏 + 搜索
│   │   ├── services/api.ts       # Axios API 客户端
│   │   └── types/index.ts
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🧪 本地开发

```bash
# 后端
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端（另一个终端）
cd frontend
npm install
npm run dev -- --port 5173
```

---

## 🔌 Obsidian 集成

前端"设置 → Obsidian配置"页可一键导出所有文章到 Obsidian vault：

```
vault/
├── 00-Inbox/     ← 待分类文章
├── 20-Areas/     ← 按领域分类（AI-ML / OCR技术 / 昇腾开发 / 信创环境 / 开源工具）
│   ├── AI-ML/
│   └── OCR技术/
├── 30-Insights/  ← 洞察汇总
└── 40-MOCs/      ← 内容地图（自动生成）
```

每篇文章生成完整的 Markdown 笔记：标题、中文摘要、标签、来源链接、发布时间，支持 Obsidian 的 wikilink 和 Dataview 查询。

---

## 📄 License

MIT © 2026 [@jjjojoj](https://github.com/jjjojoj)
