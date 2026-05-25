import { useEffect, useState } from 'react';
import { Check, Trash2, Filter, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getArticles, bookmarkArticle, markRead } from '../../services/api';
import type { Article } from '../../types';
import { formatSourceName } from '../../utils/sourceDisplay';

const tagColors: Record<string, string> = {
  '技术突破': '#6366f1',
  '产品影响': '#818cf8',
  '市场反应': '#f59e0b',
  '行业影响': '#10b981',
  '监管政策': '#ef4444',
};

export default function ReadLater() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState('全部');

  useEffect(() => {
    async function fetchBookmarked() {
      try {
        const res = await getArticles({ is_bookmarked: true, limit: 100 });
        setArticles(res.data.items ?? []);
      } catch (err) {
        console.error('Failed to fetch bookmarked articles:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBookmarked();
  }, []);

  // Build tag list from actual data
  const allTags = ['全部', ...Array.from(new Set(articles.flatMap((a) => a.tags ?? [])))];

  const filteredArticles = filterTag === '全部'
    ? articles
    : articles.filter((a) => (a.tags ?? []).includes(filterTag));

  const toggleRead = async (article: Article) => {
    try {
      const res = await markRead(article.id);
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? res.data : a))
      );
    } catch (e) {
      console.error('Failed to toggle read:', e);
    }
  };

  const removeArticle = async (article: Article) => {
    try {
      const res = await bookmarkArticle(article.id);
      // If it was bookmarked, un-bookmark removes it from the list
      if (!res.data.is_bookmarked) {
        setArticles((prev) => prev.filter((a) => a.id !== article.id));
      }
    } catch (e) {
      console.error('Failed to remove bookmark:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <section className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">稍后阅读</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            已收藏 {articles.length} 篇文章，未读 {articles.filter((a) => !a.is_read).length} 篇
          </p>
        </div>
      </div>

      {/* Filter Tags */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[var(--color-text-muted)]" />
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilterTag(tag)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filterTag === tag
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Article List */}
      <div className="space-y-2">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            onClick={() => navigate(`/articles/${article.id}`)}
            className="flex items-center gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 transition-colors hover:border-[var(--color-accent)]/30 cursor-pointer"
          >
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-medium truncate ${article.is_read ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                {article.title}
              </h3>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">{formatSourceName(article.source_name)}</span>
                <span className="text-xs text-[var(--color-text-muted)]">·</span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {new Date(article.created_at).toLocaleDateString('zh-CN')}
                </span>
                {(article.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
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

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); toggleRead(article); }}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  article.is_read
                    ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
                }`}
                title={article.is_read ? '标记为未读' : '标记为已读'}
              >
                <Check size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); removeArticle(article); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger)]/10 hover:text-[var(--color-danger)] transition-colors"
                title="移除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {filteredArticles.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-10 text-center text-sm text-[var(--color-text-muted)]">
            暂无收藏文章
          </div>
        )}
      </div>
    </section>
  );
}
