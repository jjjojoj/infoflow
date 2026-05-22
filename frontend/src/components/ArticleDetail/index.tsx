import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Share2, Bookmark, MoreHorizontal, Network, Clock, Maximize2 } from 'lucide-react';
import InsightPanel from './InsightPanel';
import GraphView from '../KnowledgeGraph/GraphView';
import Timeline from '../Timeline';

const tagColors: Record<string, string> = {
  '技术突破': '#6366f1',
  '产品影响': '#818cf8',
  '市场反应': '#f59e0b',
  '行业影响': '#10b981',
  '监管政策': '#ef4444',
};

const mockArticle = {
  id: 1,
  title: 'OpenAI 发布 GPT-4o：多模态能力再突破',
  created_at: '2 小时前',
  related_insights: 12,
  source_count: 28,
  summary:
    'OpenAI 发布 GPT-4o，在文本、图像和音频处理能力上实现重大突破，进一步推动 AI 助手向更自然、实时和多模态的方向发展，对 AI 应用生态和相关行业带来深远影响。',
  tags: ['技术突破', '产品影响', '市场反应', '行业影响', '监管政策'],
};

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeView, setActiveView] = useState<'network' | 'timeline'>('network');
  const [showPanel, setShowPanel] = useState(true);

  // Use id for display (mock data regardless)
  const _articleId = id || '1';

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Title & Meta */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              {mockArticle.title}
            </h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
              <span>{mockArticle.created_at}</span>
              <span className="text-[var(--color-border-subtle)]">·</span>
              <span>{mockArticle.related_insights} 个关联洞察</span>
              <span className="text-[var(--color-border-subtle)]">·</span>
              <span>{mockArticle.source_count} 篇原文</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors">
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
        <div className="mt-6 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5">
          <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {mockArticle.summary}
          </p>
        </div>

        {/* Tags */}
        <div className="mt-4 flex items-center gap-3">
          {mockArticle.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 text-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: tagColors[tag] }}
              />
              <span className="text-[var(--color-text-secondary)]">{tag}</span>
            </span>
          ))}
        </div>

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
              <Timeline collapsible={false} />
            </div>
          )}
        </div>

        {/* Timeline Preview (always shown at bottom) */}
        <div className="mt-6">
          <Timeline />
        </div>
      </div>

      {/* Right Insight Panel */}
      {showPanel && (
        <InsightPanel articleId={_articleId} onClose={() => setShowPanel(false)} />
      )}
    </div>
  );
}
