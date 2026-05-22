import { useState } from 'react';
import { Check, Trash2, Filter } from 'lucide-react';

interface BookmarkedArticle {
  id: number;
  title: string;
  source_name: string;
  tags: string[];
  created_at: string;
  is_read: boolean;
}

const tagColors: Record<string, string> = {
  '技术突破': '#6366f1',
  '产品影响': '#818cf8',
  '市场反应': '#f59e0b',
  '行业影响': '#10b981',
  '监管政策': '#ef4444',
};

const mockBookmarked: BookmarkedArticle[] = [
  {
    id: 1,
    title: 'OpenAI 发布 GPT-4o：多模态能力再突破',
    source_name: 'The Verge',
    tags: ['技术突破'],
    created_at: '2 小时前',
    is_read: false,
  },
  {
    id: 2,
    title: 'AI 监管趋严：欧盟 AI 法案正式生效',
    source_name: 'Reuters',
    tags: ['监管政策'],
    created_at: '4 小时前',
    is_read: false,
  },
  {
    id: 3,
    title: '特斯拉 FSD V12 升级：端到端神经网络驾驶',
    source_name: 'TechCrunch',
    tags: ['技术突破', '市场反应'],
    created_at: '昨天',
    is_read: true,
  },
  {
    id: 4,
    title: 'WWDC24 核心发布汇总：Apple Intelligence 全面铺开',
    source_name: 'Apple Newsroom',
    tags: ['产品影响'],
    created_at: '2 天前',
    is_read: true,
  },
  {
    id: 5,
    title: 'Anthropic Claude 3.5 Sonnet：对比评测',
    source_name: 'Anthropic Blog',
    tags: ['技术突破'],
    created_at: '3 天前',
    is_read: false,
  },
];

const allTags = ['全部', '技术突破', '产品影响', '市场反应', '行业影响', '监管政策'];

export default function ReadLater() {
  const [articles, setArticles] = useState(mockBookmarked);
  const [filterTag, setFilterTag] = useState('全部');

  const filteredArticles = filterTag === '全部'
    ? articles
    : articles.filter((a) => a.tags.includes(filterTag));

  const toggleRead = (id: number) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: !a.is_read } : a))
    );
  };

  const removeArticle = (id: number) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

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
            className="flex items-center gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4 transition-colors hover:border-[var(--color-accent)]/30"
          >
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm font-medium truncate ${article.is_read ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'}`}>
                {article.title}
              </h3>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">{article.source_name}</span>
                <span className="text-xs text-[var(--color-text-muted)]">·</span>
                <span className="text-xs text-[var(--color-text-muted)]">{article.created_at}</span>
                {article.tags.map((tag) => (
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
                onClick={() => toggleRead(article.id)}
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
                onClick={() => removeArticle(article.id)}
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
