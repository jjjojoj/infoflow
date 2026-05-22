import { NavLink } from 'react-router-dom';
import {
  Home,
  Network,
  Lightbulb,
  Bookmark,
  Settings as SettingsIcon,
  Plus,
} from 'lucide-react';

const navItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/knowledge', label: '知识网络', icon: Network },
  { to: '/insights', label: '我的洞察', icon: Lightbulb },
  { to: '/read-later', label: '稍后阅读', icon: Bookmark },
  { to: '/settings', label: '设置', icon: SettingsIcon },
];

const historyInsights = [
  { id: 1, title: 'OpenAI 发布 GPT-4o...', time: '2 小时前', color: '#6366f1' },
  { id: 2, title: 'AI 监管趋严：全球动向', time: '昨天', color: '#10b981' },
  { id: 3, title: '特斯拉 FSD V12 升级', time: '2 天前', color: '#6366f1' },
  { id: 4, title: 'WWDC24 核心发布汇总', time: '3 天前', color: '#f59e0b' },
  { id: 5, title: 'AI 应用落地场景加速', time: '5 天前', color: '#ef4444' },
];

export default function Sidebar() {
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

      {/* History Insights */}
      <div className="border-t border-[var(--color-border-subtle)] px-4 py-4">
        <h3 className="mb-3 text-xs font-medium text-[var(--color-text-muted)]">历史洞察</h3>
        <div className="space-y-2">
          {historyInsights.map((item) => (
            <div
              key={item.id}
              className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-[var(--color-bg-elevated)]"
            >
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="truncate text-[var(--color-text-primary)]">{item.title}</div>
                <div className="text-[var(--color-text-muted)]">{item.time}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="mt-3 flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
          查看全部 <span className="text-xs">›</span>
        </button>
      </div>
    </aside>
  );
}
