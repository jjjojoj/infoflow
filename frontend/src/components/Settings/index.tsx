import { useState } from 'react';
import { Rss, Star, Bot, Clock, BookOpen, Settings2, BarChart3 } from 'lucide-react';
import SourceManager from './SourceManager';
import InterestConfig from './InterestConfig';
import LLMConfig from './LLMConfig';
import ScheduleConfig from './ScheduleConfig';
import ObsidianConfig from './ObsidianConfig';
import GeneralConfig from './GeneralConfig';
import TokenUsage from './TokenUsage';

const TABS = [
  { key: 'sources', label: '信息源管理', icon: Rss },
  { key: 'interests', label: '兴趣配置', icon: Star },
  { key: 'llm', label: 'LLM设置', icon: Bot },
  { key: 'schedule', label: '采集设置', icon: Clock },
  { key: 'obsidian', label: 'Obsidian配置', icon: BookOpen },
  { key: 'usage', label: '用量统计', icon: BarChart3 },
  { key: 'general', label: '通用设置', icon: Settings2 },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabKey>('sources');

  const renderContent = () => {
    switch (activeTab) {
      case 'sources': return <SourceManager />;
      case 'interests': return <InterestConfig />;
      case 'llm': return <LLMConfig />;
      case 'schedule': return <ScheduleConfig />;
      case 'obsidian': return <ObsidianConfig />;
      case 'usage': return <TokenUsage />;
      case 'general': return <GeneralConfig />;
    }
  };

  return (
    <div className="flex h-full">
      {/* Left sidebar tabs */}
      <nav className="w-48 shrink-0 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-3">
        <h1 className="mb-4 px-3 text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">设置</h1>
        <ul className="space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <li key={tab.key}>
                <button
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-light)] font-medium' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Right content area */}
      <div className="flex-1 overflow-auto p-6">
        {renderContent()}
      </div>
    </div>
  );
}
