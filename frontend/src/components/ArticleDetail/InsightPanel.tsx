import { X, ExternalLink, BookmarkPlus, FileText } from 'lucide-react';
import type { Article } from '../../types';
import { formatSourceName } from '../../utils/sourceDisplay';

interface InsightPanelProps {
  articleId: string;
  article: Article;
  onClose: () => void;
}

export default function InsightPanel({ article: art, onClose }: InsightPanelProps) {
  const createdDate = new Date(art.created_at);
  const timeAgo = (() => {
    const diff = Date.now() - createdDate.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  })();

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">洞察详情</h2>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 px-5 pb-5 space-y-5">
        {/* Category Tag */}
        {(art.tags ?? []).length > 0 && (
          <div>
            <span className="inline-block rounded-md bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-accent-light)]">
              {art.tags![0]}
            </span>
          </div>
        )}

        {/* Title & Time */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] leading-snug">
            {art.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{timeAgo}</p>
        </div>

        {/* Core Analysis */}
        {art.summary && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">核心解读</h4>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {art.summary}
            </p>
          </div>
        )}

        {/* Tags as related insights */}
        {(art.tags ?? []).length > 1 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">相关标签</h4>
            <div className="space-y-2">
              {art.tags!.map((tag) => (
                <div key={tag} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: '#6366f1' }}
                  />
                  <span className="text-[var(--color-text-secondary)]">{tag}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source Link */}
        {art.url && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">原文链接</h4>
            <div
              className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
              onClick={() => window.open(art.url!, '_blank')}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📄</span>
                <span className="text-sm text-[var(--color-text-primary)]">{formatSourceName(art.source_name)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">{timeAgo}</span>
                <ExternalLink size={12} className="text-[var(--color-text-muted)]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-[var(--color-border-subtle)] p-4 flex items-center gap-3">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[var(--color-border-subtle)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors">
          <BookmarkPlus size={16} />
          加入稍后读
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-accent-light)] transition-colors">
          <FileText size={16} />
          生成洞察报告
        </button>
      </div>
    </aside>
  );
}
