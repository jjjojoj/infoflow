import { useState } from 'react';
import { Search, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const [deepMode, setDeepMode] = useState(false);

  return (
    <header className="flex h-14 items-center gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-6">
      {/* Search Bar */}
      <div className="relative flex flex-1 items-center">
        <Search
          size={16}
          className="absolute left-3 text-[var(--color-text-muted)]"
        />
        <input
          type="text"
          placeholder="搜索主题、事件、公司或关键词..."
          className="w-full max-w-2xl rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] py-2 pl-10 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
        />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Deep Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">深度模式</span>
          <button
            type="button"
            onClick={() => setDeepMode(!deepMode)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              deepMode ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-subtle)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                deepMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Settings */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="settings"
        >
          <SettingsIcon size={18} strokeWidth={1.75} />
        </button>

        {/* User Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-light)] text-xs font-medium text-white">
          U
        </div>
      </div>
    </header>
  );
}
