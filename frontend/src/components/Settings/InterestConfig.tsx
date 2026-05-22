import { useState, useEffect } from 'react';
import { Plus, X, Filter, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getInterests, createInterest, deleteInterest, updateInterest, generateInterestsFromDescription } from '../../services/api';
import type { Interest } from '../../types';

const CATEGORIES = ['全部', '核心技术', '平台环境', '工具框架', '学习成长'];

export default function InterestConfig() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('全部');
  const [description, setDescription] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('核心技术');
  const [newWeight, setNewWeight] = useState(0.5);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getInterests();
        const data = Array.isArray(res.data) ? res.data : ((res.data as any)?.items ?? []);
        setInterests(data);
      } catch {
        setInterests([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = filter === '全部' ? interests : interests.filter(i => i.category === filter);

  const handleAdd = async () => {
    if (!newKeyword.trim()) return;
    setSaving(true);
    try {
      const res = await createInterest({
        keyword: newKeyword.trim(),
        weight: newWeight,
        category: newCategory,
      });
      setInterests(prev => [...prev, res.data]);
      setNewKeyword('');
      setNewWeight(0.5);
    } catch (err) {
      console.error('Failed to create interest:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateFromDescription = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    try {
      const res = await generateInterestsFromDescription(description.trim());
      const generated = res.data?.items ?? [];
      if (generated.length > 0) {
        // Merge with existing, deduplicate by id
        const existingIds = new Set(interests.map(i => i.id));
        const merged = [...interests];
        for (const item of generated) {
          if (existingIds.has(item.id)) {
            // Update existing
            const idx = merged.findIndex(i => i.id === item.id);
            if (idx >= 0) merged[idx] = item;
          } else {
            merged.push(item);
          }
        }
        setInterests(merged);
        setDescription(''); // Clear after successful generation
      }
    } catch (err) {
      console.error('Failed to generate interests:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteInterest(id);
      setInterests(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Failed to delete interest:', err);
    }
  };

  const handleWeightChange = async (id: number, weight: number) => {
    setInterests(prev => prev.map(i => i.id === id ? { ...i, weight } : i));
    try {
      await updateInterest(id, { weight });
    } catch (err) {
      console.error('Failed to update interest weight:', err);
    }
  };

  const toggleEnabled = async (id: number) => {
    const item = interests.find(i => i.id === id);
    if (!item) return;
    const newEnabled = !item.enabled;
    setInterests(prev => prev.map(i => i.id === id ? { ...i, enabled: newEnabled } : i));
    try {
      await updateInterest(id, { enabled: newEnabled });
    } catch (err) {
      console.error('Failed to toggle interest:', err);
    }
  };

  const chartData = interests.filter(i => i.enabled).map(i => ({ name: i.keyword, weight: i.weight }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">兴趣关键词配置</h2>

      {/* Interest description */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm text-[var(--color-text-secondary)]">兴趣描述（自然语言）</label>
          <button
            onClick={handleGenerateFromDescription}
            disabled={generating || !description.trim()}
            className="flex items-center gap-1 rounded-lg bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-white transition hover:bg-[var(--color-accent-light)] disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> 生成中...</>
            ) : (
              <>✦ AI 生成</>
            )}
          </button>
        </div>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
          placeholder="描述你的兴趣方向..."
        />
      </div>

      {/* Add new keyword */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-4">
        <div className="flex-1 min-w-[150px]">
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">关键词</label>
          <input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
            placeholder="输入关键词"
          />
        </div>
        <div className="min-w-[120px]">
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">分类</label>
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="w-full rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
          >
            {CATEGORIES.filter(c => c !== '全部').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">权重: {newWeight.toFixed(2)}</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={newWeight}
            onChange={e => setNewWeight(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving}
          className="flex items-center gap-1 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          添加
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[var(--color-text-muted)]" />
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition ${filter === c ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Keyword cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(item => (
          <div key={item.id} className={`rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-3 transition ${!item.enabled ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.keyword}</span>
                <span className="rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] text-[var(--color-accent-light)]">{item.category || '未分类'}</span>
              </div>
              <button onClick={() => handleDelete(item.id)} className="rounded p-0.5 text-[var(--color-text-muted)] transition hover:text-[var(--color-danger)]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={item.weight}
                onChange={e => handleWeightChange(item.id, Number(e.target.value))}
                className="flex-1 accent-[var(--color-accent)]"
              />
              <span className="w-10 text-right text-xs text-[var(--color-text-muted)]">{item.weight.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-muted)]">权重</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={item.enabled} onChange={() => toggleEnabled(item.id)} className="peer sr-only" />
                <div className="h-5 w-9 rounded-full bg-[#374151] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--color-accent)] peer-checked:after:translate-x-full" />
              </label>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">暂无兴趣关键词，请添加</p>
      )}

      {/* Weight visualization */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-4">
          <h3 className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">权重分布</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
              <XAxis type="number" domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#f1f5f9' }}
              />
              <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={idx % 2 === 0 ? '#6366f1' : '#818cf8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
