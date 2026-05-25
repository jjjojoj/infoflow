import { useEffect, useState } from 'react';
import { FileText, Eye, Lightbulb, Radio } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getArticles, getSources } from '../../services/api';
import type { Article, DashboardStats } from '../../types';
import TrendChart from './TrendChart';
import { formatSourceName } from '../../utils/sourceDisplay';

const defaultStats: DashboardStats = {
  new_articles: 0,
  unread: 0,
  insights: 0,
  active_sources: 0,
};

const statCards = [
  { key: 'new_articles' as const, label: '新增文章', icon: FileText, color: '#6366f1' },
  { key: 'unread' as const, label: '未读文章', icon: Eye, color: '#f59e0b' },
  { key: 'insights' as const, label: '今日洞察', icon: Lightbulb, color: '#10b981' },
  { key: 'active_sources' as const, label: '活跃信息源', icon: Radio, color: '#818cf8' },
];

const tagColors: Record<string, string> = {
  '技术突破': '#6366f1',
  '产品影响': '#818cf8',
  '市场反应': '#f59e0b',
  '行业影响': '#10b981',
  '监管政策': '#ef4444',
  'cs.CV': '#6366f1',
  'cs.AI': '#818cf8',
  'cs.CL': '#10b981',
  'cs.LG': '#f59e0b',
  'arxiv': '#f59e0b',
  'github-trending': '#64748b',
  'ascend': '#ef4444',
  'huawei': '#f59e0b',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const keyword = searchParams.get('keyword') || '';

  useEffect(() => {
    async function fetchData() {
      try {
        const params: Record<string, any> = { limit: 10 };
        if (keyword) params.keyword = keyword;
        const [articlesRes, sourcesRes] = await Promise.all([
          getArticles(params),
          getSources(),
        ]);
        const items = articlesRes.data.items ?? [];
        const total = articlesRes.data.total ?? 0;
        const sources = Array.isArray(sourcesRes.data) ? sourcesRes.data : ((sourcesRes.data as any)?.items ?? []);
        setArticles(items);

        // Derive stats from real data
        setStats({
          new_articles: total,
          unread: items.filter((a: Article) => !a.is_read).length,
          insights: 0,
          active_sources: sources.filter((s: { enabled: boolean }) => s.enabled).length,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [keyword]);

  return (
    <section className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
                  {loading ? '...' : stats[card.key]}
                </p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <card.icon size={20} style={{ color: card.color }} />
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
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {keyword ? `搜索"${keyword}"的结果` : '最新文章'}
          </h2>
          <span className="text-sm text-[var(--color-text-muted)]">共 {stats.new_articles} 篇</span>
        </div>
        {loading ? (
          <div className="py-8 text-center text-[var(--color-text-muted)]">加载中...</div>
        ) : articles.length === 0 ? (
          <div className="py-8 text-center text-[var(--color-text-muted)]">暂无文章</div>
        ) : (
          <div className="space-y-2">
            {articles.map((article) => (
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
                    {(article.tags ?? []).slice(0, 3).map((tag) => (
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
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {new Date(article.created_at).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-muted)]">{formatSourceName(article.source_name)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
