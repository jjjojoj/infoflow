import { X, ExternalLink, BookmarkPlus, FileText } from 'lucide-react';

interface InsightPanelProps {
  articleId: string;
  onClose: () => void;
}

const relatedInsights = [
  { label: '技术突破', detail: '多模态理解与生成能力提升', color: '#6366f1' },
  { label: '产品影响', detail: 'ChatGPT 体验升级', color: '#818cf8' },
  { label: '行业影响', detail: '教育行业变革', color: '#10b981' },
];

const sourceLinks = [
  { name: 'The Verge', time: '2 小时前', icon: '🟣' },
  { name: 'OpenAI 官网', time: '2 小时前', icon: '🟢' },
  { name: 'Twitter @OpenAI', time: '2 小时前', icon: '🔵' },
];

export default function InsightPanel({ articleId: _articleId, onClose }: InsightPanelProps) {
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
        <div>
          <span className="inline-block rounded-md bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-accent-light)]">
            技术突破
          </span>
        </div>

        {/* Title & Time */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] leading-snug">
            OpenAI 发布 GPT-4o：多模态能力再突破
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">2 小时前</p>
        </div>

        {/* Core Analysis */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">核心解读</h4>
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            GPT-4o 在文本、图像和音频处理能力上实现重大突破，响应速度更快，多模态理解更精准，为用户提供更自然实时的交互体验。这标志着 AI 助手向通用智能迈出重要一步。
          </p>
        </div>

        {/* Key Impacts */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">关键影响</h4>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
              AI 助手将更自然地融入日常工作与生活
            </li>
            <li className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
              多模态能力将催生更多创新应用场景
            </li>
            <li className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
              对算力和数据提出更高需求，行业竞争加剧
            </li>
          </ul>
        </div>

        {/* Related Insights */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">相关洞察</h4>
          <div className="space-y-2">
            {relatedInsights.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[var(--color-text-secondary)]">
                  {item.label}  ·  {item.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Source Links */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
            原文链接 (28)
          </h4>
          <div className="space-y-2">
            {sourceLinks.map((link) => (
              <div
                key={link.name}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{link.icon}</span>
                  <span className="text-sm text-[var(--color-text-primary)]">{link.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">{link.time}</span>
                  <ExternalLink size={12} className="text-[var(--color-text-muted)]" />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
            查看更多 (25)
          </button>
        </div>
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
