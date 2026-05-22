import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Network,
  Lightbulb,
  Bookmark,
  Settings as SettingsIcon,
  Plus,
  Loader2,
} from 'lucide-react';
import { getArticles } from '../../services/api';
import type { Article } from '../../types';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/knowledge', label: '知识网络', icon: Network },
  { to: '/insights', label: '我的洞察', icon: Lightbulb },
  { to: '/read-later', label: '稍后阅读', icon: Bookmark },
  { to: '/settings', label: '设置', icon: SettingsIcon },
];

const sourceTypeColors: Record<string, string> = {
  arxiv: '#6366f1',
  github: '#818cf8',
  zhihu: '#f59e0b',
  huawei_ascend: '#10b981',
  rss: '#ec4899',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-CN');
}

export default function Sidebar() {
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const res = await getArticles({ limit: 5 });
        setRecentArticles(res.data.items ?? []);
      } catch {
        setRecentArticles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRecent();
  }, []);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-accent)] text-[var(--color-accent)]">
            <Network size={16} />
          </div>
          <div>
            <div className="text-lg font-bold text-[var(--color-text-primary)]">InfoFlow</div>
          </div>
        </div>
        <div className="mt-1 text-xs text-[var(--color-text-secondary)]">
          AI 信息洞察与知识网络
        </div>
      </div>

      {/* New Insight Button */}
      <div className="px-4 pb-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-light)]">
          <Plus size={16} />
          <span>新建洞察</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-light)] font-medium'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]',
              ].join(' ')
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Recent Articles (replaces mock historyInsights) */}
      <div className="border-t border-[var(--color-border-subtle)] px-4 py-4">
        <h3 className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">最近文章</h3>
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : recentArticles.length === 0 ? (
          <p className="text-[10px] text-[var(--color-text-muted)]">暂无文章</p>
        ) : (
          <div className="space-y-2">
            {recentArticles.map((article) => (
              <NavLink
                key={article.id}
                to={`/articles/${article.id}`}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-[var(--color-bg-elevated)]"
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: sourceTypeColors[article.source_type || ''] || '#6366f1' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[var(--color-text-primary)]">{article.title}</div>
                  <div className="text-[var(--color-text-muted)]">{timeAgo(article.created_at)}</div>
                </div>
              </NavLink>
            ))}
          </div>
        )}
        {recentArticles.length > 0 && (
          <NavLink
            to="/insights"
            className="mt-3 flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            查看全部 <span className="text-xs">›</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
}
