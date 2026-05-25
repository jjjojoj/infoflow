import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, FileText, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { getArticles } from '../services/api';
import type { Article } from '../types';
import { formatSourceName, formatSourceType } from '../utils/sourceDisplay';

const sourceTypeColors: Record<string, string> = {
  arxiv: '#6366f1',
  crawler: '#6366f1',
  github_trending: '#818cf8',
  github: '#818cf8',
  zhihu: '#f59e0b',
  huawei_ascend: '#10b981',
  rss: '#ec4899',
};

export default function InsightsPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getArticles({ limit: 50 });
        setArticles(res.data.items ?? []);
      } catch (err) {
        console.error('Failed to fetch articles for insights:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <section className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f9]">我的洞察</h1>
          <p className="mt-1 text-sm text-[#64748b]">基于 AI 分析生成的深度洞察报告</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-[#6366f1]/10 px-3 py-1.5 text-xs text-[#818cf8]">
            <Lightbulb size={12} />
            共 {articles.length} 篇文章
          </span>
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {articles.map((article) => {
          const color = sourceTypeColors[article.source_type || ''] || '#6366f1';
          const category = article.source_type === 'rss'
            ? formatSourceName(article.source_name)
            : formatSourceType(article.source_name || article.source_type);
          return (
            <div
              key={article.id}
              onClick={() => navigate(`/articles/${article.id}`)}
              className="group cursor-pointer rounded-xl border border-[#2d3748] bg-[#1a2332] p-5 transition-all hover:border-[#6366f1]/40 hover:shadow-lg hover:shadow-[#6366f1]/5"
            >
              {/* Category Tag */}
              <div className="mb-3 flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {category}
                </span>
                <ChevronRight size={14} className="text-[#64748b] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-[#f1f5f9] group-hover:text-[#818cf8] transition-colors">
                {article.title}
              </h3>

              {/* Summary */}
              <p className="mt-2 text-xs leading-relaxed text-[#94a3b8] line-clamp-2">
                {article.summary || '暂无摘要'}
              </p>

              {/* Meta */}
              <div className="mt-4 flex items-center gap-4 text-[11px] text-[#64748b]">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {new Date(article.created_at).toLocaleDateString('zh-CN')}
                </span>
                <span className="flex items-center gap-1">
                  <FileText size={11} />
                  {formatSourceName(article.source_name)}
                </span>
                <span className="flex items-center gap-1">
                  <Lightbulb size={11} />
                  相关度 {Math.round(article.relevance_score * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {articles.length === 0 && (
        <div className="py-12 text-center text-sm text-[#64748b]">
          暂无文章数据，请先添加信息源并采集文章
        </div>
      )}
    </section>
  );
}
