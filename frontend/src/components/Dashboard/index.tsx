import { FileText, Eye, Lightbulb, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrendChart from './TrendChart';

const stats = [
  { label: '新增文章', value: 42, icon: FileText, color: '#6366f1' },
  { label: '未读文章', value: 18, icon: Eye, color: '#f59e0b' },
  { label: '今日洞察', value: 7, icon: Lightbulb, color: '#10b981' },
  { label: '活跃信息源', value: 12, icon: Radio, color: '#818cf8' },
];

const mockArticles = [
  {
    id: 1,
    title: 'OpenAI 发布 GPT-4o：多模态能力再突破',
    source_name: 'The Verge',
    tags: ['技术突破', '产品影响'],
    created_at: '2 小时前',
    relevance_score: 0.95,
    is_read: false,
  },
  {
    id: 2,
    title: 'AI 监管趋严：欧盟 AI 法案正式生效',
    source_name: 'Reuters',
    tags: ['监管政策', '行业影响'],
    created_at: '4 小时前',
    relevance_score: 0.88,
    is_read: false,
  },
  {
    id: 3,
    title: '特斯拉 FSD V12 升级：端到端神经网络驾驶',
    source_name: 'TechCrunch',
    tags: ['技术突破', '市场反应'],
    created_at: '6 小时前',
    relevance_score: 0.82,
    is_read: true,
  },
  {
    id: 4,
    title: 'WWDC24 核心发布汇总：Apple Intelligence 全面铺开',
    source_name: 'Apple Newsroom',
    tags: ['产品影响', '技术突破'],
    created_at: '昨天',
    relevance_score: 0.79,
    is_read: true,
  },
  {
    id: 5,
    title: 'Anthropic Claude 3.5 Sonnet 发布：性能超越 GPT-4o',
    source_name: 'Anthropic Blog',
    tags: ['技术突破', '市场反应'],
    created_at: '昨天',
    relevance_score: 0.76,
    is_read: false,
  },
];

const tagColors: Record<string, string> = {
  '技术突破': '#6366f1',
  '产品影响': '#818cf8',
  '市场反应': '#f59e0b',
  '行业影响': '#10b981',
  '监管政策': '#ef4444',
};

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <section className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trend Chart */}
      <TrendChart />

      {/* Article List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">最新文章</h2>
          <span className="text-sm text-[var(--color-text-muted)]">共 {mockArticles.length} 篇</span>
        </div>
        <div className="space-y-2">
          {mockArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => navigate(`/articles/${article.id}`)}
              className="group flex cursor-pointer items-center gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-elevated)]"
            >
              {/* Relevance Indicator */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: article.relevance_score > 0.9 ? '#10b981' : article.relevance_score > 0.8 ? '#f59e0b' : '#64748b',
                  }}
                />
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {Math.round(article.relevance_score * 100)}%
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-medium truncate ${article.is_read ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}>
                    {article.title}
                  </h3>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                      style={{
                        backgroundColor: `${tagColors[tag] || '#6366f1'}15`,
                        color: tagColors[tag] || '#6366f1',
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tagColors[tag] || '#6366f1' }} />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Meta */}
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">{article.created_at}</span>
                <span className="text-[11px] text-[var(--color-text-muted)]">{article.source_name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
