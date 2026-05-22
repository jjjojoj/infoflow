import { useState } from 'react';
import { Plus, Pencil, Trash2, Play, Power, PowerOff, Loader2 } from 'lucide-react';
import type { Source, SourceType } from '../../types';

const MOCK_SOURCES: Source[] = [
  { id: 1, name: 'Hacker News', url: 'https://hnrss.org/frontpage', source_type: 'rss', enabled: true, fetch_interval: 60, last_fetched: '2026-05-22 10:30', status: 'success' },
  { id: 2, name: 'GitHub Trending', url: 'https://github.com/trending', source_type: 'github', enabled: true, fetch_interval: 120, last_fetched: '2026-05-22 09:15', status: 'success' },
  { id: 3, name: 'arXiv AI', url: 'https://arxiv.org/list/cs.AI/recent', source_type: 'arxiv', enabled: true, fetch_interval: 360, last_fetched: '2026-05-22 08:00', status: 'idle' },
  { id: 4, name: '知乎热榜', url: 'https://www.zhihu.com/hot', source_type: 'zhihu', enabled: false, fetch_interval: 30, last_fetched: '2026-05-21 18:00', status: 'error' },
  { id: 5, name: '华为昇腾社区', url: 'https://www.hiascend.com', source_type: 'huawei_ascend', enabled: true, fetch_interval: 180, last_fetched: '2026-05-22 07:00', status: 'success' },
];

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  rss: 'RSS',
  github: 'GitHub',
  arxiv: 'arXiv',
  zhihu: '知乎',
  huawei_ascend: '华为昇腾',
  custom: '自定义',
};

interface SourceFormData {
  name: string;
  url: string;
  source_type: SourceType;
  fetch_interval: number;
}

export default function SourceManager() {
  const [sources, setSources] = useState<Source[]>(MOCK_SOURCES);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [form, setForm] = useState<SourceFormData>({ name: '', url: '', source_type: 'rss', fetch_interval: 60 });

  const openAdd = () => {
    setEditingSource(null);
    setForm({ name: '', url: '', source_type: 'rss', fetch_interval: 60 });
    setShowModal(true);
  };

  const openEdit = (s: Source) => {
    setEditingSource(s);
    setForm({ name: s.name, url: s.url, source_type: s.source_type, fetch_interval: s.fetch_interval });
    setShowModal(true);
  };

  const handleSave = () => {
    if (editingSource) {
      setSources(prev => prev.map(s => s.id === editingSource.id ? { ...s, ...form } : s));
    } else {
      const newSource: Source = { id: Date.now(), ...form, enabled: true, last_fetched: null, status: 'idle' };
      setSources(prev => [...prev, newSource]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const toggleEnabled = (id: number) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleFetch = (id: number) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'fetching' } : s));
    setTimeout(() => {
      setSources(prev => prev.map(s => s.id === id ? { ...s, status: 'success', last_fetched: new Date().toLocaleString() } : s));
    }, 2000);
  };

  const statusIndicator = (status?: string) => {
    switch (status) {
      case 'success': return <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-success)]" />;
      case 'error': return <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-danger)]" />;
      case 'fetching': return <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-accent)]" />;
      default: return <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-text-muted)]" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">信息源管理</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)]">
          <Plus className="h-4 w-4" /> 添加信息源
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#374151] bg-[var(--color-bg-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#374151] text-left text-[var(--color-text-secondary)]">
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">启用</th>
              <th className="px-4 py-3 font-medium">上次采集</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(s => (
              <tr key={s.id} className="border-b border-[#374151]/50 transition hover:bg-[var(--color-bg-elevated)]">
                <td className="px-4 py-3">{statusIndicator(s.status)}</td>
                <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">{s.name}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-[var(--color-text-muted)]">{s.url}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-[var(--color-accent-soft)] px-2 py-0.5 text-xs text-[var(--color-accent-light)]">
                    {SOURCE_TYPE_LABELS[s.source_type]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleEnabled(s.id)} className={`rounded p-1 transition ${s.enabled ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                    {s.enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                  </button>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-muted)]">{s.last_fetched || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleFetch(s.id)} disabled={s.status === 'fetching'} className="rounded p-1.5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-accent-light)] disabled:opacity-40" title="立即采集">
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => openEdit(s)} className="rounded p-1.5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-accent-light)]" title="编辑">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="rounded p-1.5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-danger)]" title="删除">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-medium">{editingSource ? '编辑信息源' : '添加信息源'}</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">名称</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]" placeholder="输入信息源名称" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">URL</label>
                <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">类型</label>
                <select value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value as SourceType }))} className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]">
                  {Object.entries(SOURCE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">采集频率 (分钟)</label>
                <input type="number" value={form.fetch_interval} onChange={e => setForm(f => ({ ...f, fetch_interval: Number(e.target.value) }))} className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]" min={5} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-[#374151] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elevated)]">取消</button>
              <button onClick={handleSave} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)]">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
