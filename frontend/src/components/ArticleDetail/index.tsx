import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Bookmark, Clock, Tag } from 'lucide-react';
import { getArticle, bookmarkArticle } from '../../services/api';
import type { Article } from '../../types';
import { formatSourceName } from '../../utils/sourceDisplay';
import MarkdownRenderer from '../common/MarkdownRenderer';

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function fetchArticle() {
      try {
        const res = await getArticle(Number(id));
        setArticle(res.data);
      } catch (err) {
        console.error('Failed to fetch article:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [id]);

  const toggleBookmark = async () => {
    if (!article) return;
    try {
      const res = await bookmarkArticle(article.id);
      setArticle({ ...article, is_bookmarked: res.data.is_bookmarked });
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
        加载中...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
        文章未找到
      </div>
    );
  }

  const timeAgo = (() => {
    const diff = Date.now() - new Date(article.created_at).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  })();

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] leading-tight">
        {article.title}
      </h1>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
        <span className="flex items-center gap-1">
          <Clock size={14} />
          {timeAgo}
        </span>
        <span className="text-[var(--color-border-subtle)]">·</span>
        <span>{formatSourceName(article.source_name)}</span>
        <span className="text-[var(--color-border-subtle)]">·</span>
        <span>相关度 {Math.round(article.relevance_score * 100)}%</span>

        {/* Bookmark */}
        <button
          onClick={toggleBookmark}
          className={`ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors ${
            article.is_bookmarked
              ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent-light)]'
              : 'border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <Bookmark size={13} fill={article.is_bookmarked ? 'currentColor' : 'none'} />
          {article.is_bookmarked ? '已收藏' : '收藏'}
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
        <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">AI 摘要</h3>
        <MarkdownRenderer
          content={article.summary || ''}
          className="text-sm leading-relaxed text-[var(--color-text-secondary)]"
        />
        {!article.summary && (
          <p className="text-sm text-[var(--color-text-muted)]">暂无摘要</p>
        )}
      </div>

      {/* Tags */}
      {(article.tags ?? []).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={14} className="text-[var(--color-text-muted)]" />
          {article.tags!.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#6366f1]/10 px-2.5 py-1 text-xs text-[#818cf8]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Original Link */}
      {article.url && (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent-light)]">
                <ExternalLink size={18} />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-light)] transition-colors">
                  阅读原文
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {formatSourceName(article.source_name)} · {new URL(article.url).hostname}
                </div>
              </div>
            </div>
            <span className="text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-light)] transition-colors">
              前往 →
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
