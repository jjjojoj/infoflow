import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Zap, Hash, BarChart3, DollarSign, Loader2 } from 'lucide-react';
import { getTokenUsage, getUsageSummary, getUsageByModel } from '../../services/api';

interface UsageRecord {
  date: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  request_count: number;
  cost_estimate: number;
}

interface Summary {
  today_tokens: number;
  today_requests: number;
  today_cost: number;
  total_tokens: number;
  total_requests: number;
  total_cost: number;
  models_used: number;
  daily_avg: number;
}

interface ModelUsage {
  model: string;
  total_tokens: number;
  request_count: number;
  total_cost: number;
  percentage: number;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function TokenUsage() {
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byModel, setByModel] = useState<ModelUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usageRes, summaryRes, modelRes] = await Promise.all([
          getTokenUsage(30),
          getUsageSummary(),
          getUsageByModel(),
        ]);
        setUsage(usageRes.data);
        setSummary(summaryRes.data);
        setByModel(modelRes.data);
      } catch (e) {
        console.error('Failed to fetch token usage', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Aggregate usage by date for chart
  const chartData = usage.reduce<Record<string, { date: string; prompt_tokens: number; completion_tokens: number; total: number }>>((acc, r) => {
    if (!acc[r.date]) {
      acc[r.date] = { date: r.date, prompt_tokens: 0, completion_tokens: 0, total: 0 };
    }
    acc[r.date].prompt_tokens += r.prompt_tokens;
    acc[r.date].completion_tokens += r.completion_tokens;
    acc[r.date].total += r.total_tokens;
    return acc;
  }, {});
  const chartArr = Object.values(chartData).sort((a, b) => a.date.localeCompare(b.date));

  const totalPages = Math.ceil(usage.length / pageSize);
  const pagedUsage = usage.slice(page * pageSize, (page + 1) * pageSize);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-[var(--color-text-primary)]">Token 用量统计</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Zap, label: '今日消耗', value: fmt(summary?.today_tokens ?? 0), sub: 'tokens' },
          { icon: Hash, label: '总请求次数', value: fmt(summary?.total_requests ?? 0), sub: '次' },
          { icon: BarChart3, label: '累计 Token', value: fmt(summary?.total_tokens ?? 0), sub: 'tokens' },
          { icon: DollarSign, label: '预估总费用', value: `¥${(summary?.total_cost ?? 0).toFixed(2)}`, sub: '元' },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-4">
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{c.label}</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">{c.value}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Daily usage area chart */}
      {chartArr.length > 0 && (
        <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5">
          <h3 className="mb-4 text-sm font-medium text-[var(--color-text-secondary)]">每日用量趋势</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartArr}>
              <defs>
                <linearGradient id="colorPrompt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={fmt} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="prompt_tokens" name="Prompt" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPrompt)" />
              <Area type="monotone" dataKey="completion_tokens" name="Completion" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCompletion)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Model distribution pie chart */}
      {byModel.length > 0 && (
        <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5">
          <h3 className="mb-4 text-sm font-medium text-[var(--color-text-secondary)]">模型使用分布</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={byModel}
                dataKey="total_tokens"
                nameKey="model"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ model, percentage }) => `${model} (${percentage}%)`}
                labelLine={{ stroke: '#6b7280' }}
              >
                {byModel.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] overflow-hidden">
        <h3 className="px-5 pt-4 pb-2 text-sm font-medium text-[var(--color-text-secondary)]">历史记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#374151] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-5 py-2">日期</th>
                <th className="px-3 py-2">模型</th>
                <th className="px-3 py-2 text-right">Prompt</th>
                <th className="px-3 py-2 text-right">Completion</th>
                <th className="px-3 py-2 text-right">总计</th>
                <th className="px-3 py-2 text-right">请求数</th>
                <th className="px-5 py-2 text-right">费用(¥)</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsage.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[var(--color-text-muted)]">暂无记录</td>
                </tr>
              ) : (
                pagedUsage.map((r, i) => (
                  <tr key={i} className="border-b border-[#374151]/50 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition">
                    <td className="px-5 py-2.5">{r.date}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-xs text-[var(--color-accent-light)]">
                        {r.model}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{r.prompt_tokens.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{r.completion_tokens.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-medium text-[var(--color-text-primary)]">{r.total_tokens.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">{r.request_count}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs">{r.cost_estimate.toFixed(4)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#374151] px-5 py-2">
            <span className="text-xs text-[var(--color-text-muted)]">共 {usage.length} 条</span>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="rounded px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] disabled:opacity-40"
              >
                上一页
              </button>
              <span className="px-2 py-1 text-xs text-[var(--color-text-muted)]">{page + 1}/{totalPages}</span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="rounded px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
