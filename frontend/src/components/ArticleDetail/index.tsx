import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Share2, Bookmark, MoreHorizontal, Network, Clock, Maximize2 } from 'lucide-react';
import InsightPanel from './InsightPanel';
import GraphView from '../KnowledgeGraph/GraphView';
import Timeline from '../Timeline';
import { getArticle } from '../../services/api';
import type { Article } from '../../types';
import { formatSourceName } from '../../utils/sourceDisplay';

const tagColors: Record<string, string> = {
  '技术突破': '#6366f1',
  '产品影响': '#818cf8',
  '市场反应': '#f59e0b',
  '行业影响': '#10b981',
  '监管政策': '#ef4444',
  'cs.CV': '#6366f1',
  'cs.AI': '#818cf8',
  'cs.CL': '#10b981',
  'arxiv': '#f59e0b',
};

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'network' | 'timeline'>('network');
  const [showPanel, setShowPanel] = useState(true);

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
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Title & Meta */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {article.title}
            </h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
              <span>{timeAgo}</span>
              <span className="text-[var(--color-border-subtle)]">·</span>
              <span>{formatSourceName(article.source_name)}</span>
              {article.url && (
                <>
                  <span className="text-[var(--color-border-subtle)]">·</span>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent-light)] hover:underline"
                  >
                    原文链接
                  </a>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
              onClick={() => article.url && window.open(article.url, '_blank')}
            >
              <Share2 size={16} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors">
              <Bookmark size={16} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Summary */}
        {(article.summary || article.content) && (
          <div className="mt-6 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">摘要</h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {article.summary || article.content?.slice(0, 500)}
            </p>
          </div>
        )}

        {/* Full Content */}
        {article.content && (
          <div className="mt-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
            <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">正文</h3>
            <div className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap">
              {article.content}
            </div>
          </div>
        )}

        {/* Tags */}
        {(article.tags ?? []).length > 0 && (
          <div className="mt-4 flex items-center gap-3">
            {article.tags!.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: tagColors[tag] || '#6366f1' }}
                />
                <span className="text-[var(--color-text-secondary)]">{tag}</span>
              </span>
            ))}
          </div>
        )}

        {/* View Toggle */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] p-1">
            <button
              onClick={() => setActiveView('network')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeView === 'network'
                  ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <Network size={14} />
              网络视图
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeView === 'timeline'
                  ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <Clock size={14} />
              时间线视图
            </button>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors">
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Graph/Timeline View */}
        <div className="mt-4 h-[400px] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-hidden">
          {activeView === 'network' ? (
            <GraphView compact />
          ) : (
            <div className="flex h-full items-center p-6">
              <Timeline />
            </div>
          )}
        </div>

        {/* Timeline Preview */}
        <div className="mt-6">
          <Timeline />
        </div>
      </div>

      {/* Right Insight Panel */}
      {showPanel && (
        <InsightPanel articleId={String(article.id)} article={article} onClose={() => setShowPanel(false)} />
      )}
    </div>
  );
}
