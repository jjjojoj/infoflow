# InfoFlow - AI 信息洞察与知识网络

> 面向算法工程师的自动化信息聚合平台，集成 AI 分析、知识图谱可视化和 Obsidian 知识库

## 功能特性

- **多源信息采集**: RSS + 智能爬虫(Scrapling)，覆盖 GitHub Trending、arXiv、知乎、华为昇腾社区
- **AI 智能分析**: 多模型支持(DeepSeek/OpenAI/Ollama)，自动摘要、关键词提取、分类打标
- **三层内容去重**: URL哈希 + 内容指纹 + 标题相似度
- **知识网络可视化**: ReactFlow 实现的知识图谱，关联分析，时间线视图
- **Obsidian 集成**: 三层架构导出(Graphify 风格)，自动 MOC、双向链接、社区检测
- **可调整兴趣方向**: 关键词权重配置 + 自然语言描述
- **定时自动化**: APScheduler 驱动，可配置采集频率

## 预置关注方向

- 昇腾910B / CANN / MindSpore
- 鲲鹏 / 信创环境
- OCR / PaddleOCR / 文字识别
- 模型部署 / 国产化适配
- 开源工具 / AI-ML 前沿

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS |
| 可视化 | ReactFlow + Recharts |
| 后端 | Python 3.11 + FastAPI + APScheduler |
| 数据库 | SQLite (aiosqlite) |
| 爬虫 | Scrapling + feedparser + httpx |
| AI | DeepSeek / OpenAI / Ollama (多模型适配) |
| 部署 | Docker Compose |

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/YOUR_USERNAME/infoflow.git
cd infoflow
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入你的 API Key
```

### 3. Docker 一键启动

```bash
docker-compose up -d
```

### 4. 访问

- 前端面板: http://localhost:5173
- 后端 API: http://localhost:8000/docs

## 本地开发

### 后端

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate  # Windows
# source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## Obsidian 集成

1. 在设置页面配置 Obsidian Vault 路径
2. 点击"导出到 Obsidian"或开启自动导出
3. 在 Obsidian 中打开对应 Vault 目录
4. 推荐安装插件: Dataview, Templater, Omnisearch

## 项目结构

```
.
├── backend/
│   ├── app/
│   │   ├── routers/          # API 路由 (articles, insights, obsidian, settings, sources)
│   │   ├── scrapers/         # 信息源爬虫 (arXiv, GitHub, 知乎, 昇腾)
│   │   ├── services/         # 业务逻辑 (AI分析, 去重, 调度, Obsidian导出)
│   │   │   └── llm/          # 多模型LLM适配 (DeepSeek, OpenAI, Ollama)
│   │   ├── config.py         # 配置管理
│   │   ├── database.py       # 数据库连接
│   │   ├── main.py           # FastAPI 入口
│   │   └── models.py         # 数据模型
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # UI 组件
│   │   │   ├── Dashboard/    # 仪表盘
│   │   │   ├── KnowledgeGraph/ # 知识图谱 (ReactFlow)
│   │   │   ├── Timeline/     # 时间线
│   │   │   ├── ArticleDetail/ # 文章详情 + 洞察面板
│   │   │   ├── Settings/     # 设置页面
│   │   │   ├── ReadLater/    # 稍后阅读
│   │   │   └── Layout/       # 布局组件
│   │   ├── services/api.ts   # API 客户端
│   │   ├── types/index.ts    # TypeScript 类型定义
│   │   └── App.tsx           # 应用入口
│   ├── Dockerfile
│   ├── nginx.conf            # Nginx 配置 (API代理 + SPA路由)
│   └── package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

## 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `LLM_PROVIDER` | LLM 提供商 | `deepseek` |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | - |
| `OPENAI_API_KEY` | OpenAI API Key | - |
| `OLLAMA_BASE_URL` | Ollama 服务地址 | `http://localhost:11434` |
| `FETCH_INTERVAL_MINUTES` | 采集间隔(分钟) | `30` |
| `OBSIDIAN_VAULT_PATH` | Obsidian Vault 路径 | `/app/data/obsidian_vault` |
| `DATABASE_URL` | 数据库连接 | `sqlite+aiosqlite:///./data/infoflow.db` |

## License

MIT
