import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, FileText, Clock, ChevronRight, Loader2, Search } from 'lucide-react';
import { getArticles } from '../services/api';
import type { Article } from '../types';
import { formatSourceName, formatSourceType } from '../utils/sourceDisplay';

const PAGE_SIZE = 20;

const sourceTypeColors: Record<string, string> = {
  arxiv: '#6366f1', crawler: '#6366f1',
  github_trending: '#818cf8', github: '#818cf8',
  zhihu: '#f59e0b', huawei_ascend: '#10b981', rss: '#ec4899',
};

export default function InsightsPage() {
  const navigate = useNavigate();
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getArticles({ limit: 500, skip: 0 });
        setAllArticles(res.data.items ?? []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Extract unique interest category tags from all articles
  const INTEREST_LABELS = ['OCR技术', '昇腾/NPU', '模型部署', '大模型', '工程化'];
  const availableTags = INTEREST_LABELS.filter(label =>
    allArticles.some(a => (a.tags || []).includes(label))
  );

  // Filter articles
  const filtered = allArticles.filter(a => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !(a.summary || '').toLowerCase().includes(q)) {
        return false;
      }
    }
    // Interest category tag filter
    if (activeTag !== 'all') {
      if (!(a.tags || []).includes(activeTag)) return false;
    }
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <section className="p-6 space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f9]">我的洞察</h1>
          <p className="mt-1 text-sm text-[#64748b]">共 {filtered.length} 篇文章</p>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            type="text"
            placeholder="搜索标题或摘要..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className="h-9 w-56 rounded-lg border border-[#2d3748] bg-[#1a2332] pl-9 pr-3 text-sm text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#6366f1]"
          />
        </div>
      </div>

      {/* Interest category tabs */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setActiveTag('all'); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs transition ${activeTag === 'all'
              ? 'bg-[#6366f1] text-white'
              : 'bg-[#1e2d3d] text-[#94a3b8] hover:text-white'}`}
          >
            全部
          </button>
          {availableTags.map(tag => (
            <button
              key={tag}
              onClick={() => { setActiveTag(tag); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs transition ${activeTag === tag
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#1e2d3d] text-[#94a3b8] hover:text-white'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Article Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {paged.map((article) => {
          const color = sourceTypeColors[article.source_type || ''] || '#6366f1';
          const category = article.fetch_method
            || (article.source_type === 'rss' ? '网页采集' : formatSourceType(article.source_name || article.source_type));
          return (
            <div
              key={article.id}
              onClick={() => navigate(`/articles/${article.id}`)}
              className="group cursor-pointer rounded-xl border border-[#2d3748] bg-[#1a2332] p-5 transition-all hover:border-[#6366f1]/40 hover:shadow-lg hover:shadow-[#6366f1]/5"
            >
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

              <h3 className="text-sm font-semibold text-[#f1f5f9] group-hover:text-[#818cf8] transition-colors line-clamp-2">
                {article.title}
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-[#94a3b8] line-clamp-2">
                {article.summary || '暂无摘要'}
              </p>

              <div className="mt-4 flex items-center gap-4 text-[11px] text-[#64748b]">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {new Date(article.created_at).toLocaleDateString('zh-CN')}
                </span>
                <span className="flex items-center gap-1">
                  <FileText size={11} />
                  {formatSourceName(article.source_name)}
                </span>
                {article.relevance_score > 0 && (
                  <span className="flex items-center gap-1">
                    <Lightbulb size={11} />
                    {Math.round(article.relevance_score * 100)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-[#64748b]">
          {searchQuery || activeTag !== 'all' ? '没有匹配的文章' : '暂无文章数据，请先添加信息源并采集文章'}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[#2d3748] px-3 py-1.5 text-xs text-[#94a3b8] hover:bg-[#1e2d3d] disabled:opacity-30"
          >
            上一页
          </button>
          <span className="text-xs text-[#64748b]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-[#2d3748] px-3 py-1.5 text-xs text-[#94a3b8] hover:bg-[#1e2d3d] disabled:opacity-30"
          >
            下一页
          </button>
        </div>
      )}
    </section>
  );
}
