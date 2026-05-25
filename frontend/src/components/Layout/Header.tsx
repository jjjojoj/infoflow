import { useState } from 'react';
import { Search, Settings as SettingsIcon } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('keyword') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/?keyword=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-6">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative flex flex-1 items-center">
        <Search
          size={16}
          className="absolute left-3 text-[var(--color-text-muted)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索主题、事件、公司或关键词..."
          className="w-full max-w-2xl rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] py-2 pl-10 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none transition-colors"
        />
      </form>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Settings */}
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="settings"
        >
          <SettingsIcon size={18} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
