import { useState, useEffect } from 'react';
import { Play, Pause, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { getSettings, updateSettings, getSources } from '../../services/api';
import type { Settings, Source } from '../../types';

export default function ScheduleConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interval, setInterval_] = useState(90);
  const [unit, setUnit] = useState<'minutes' | 'hours'>('minutes');
  const [mode, setMode] = useState<'continuous' | 'scheduled'>('continuous');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [running, setRunning] = useState(true);
  const [sources, setSources] = useState<Source[]>([]);

  // Load settings from backend
  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, sourcesRes] = await Promise.all([
          getSettings(),
          getSources(),
        ]);
        const s = settingsRes.data;
        setInterval_(s.fetch_interval || 90);
        setMode(s.fetch_mode || 'continuous');
        setStartHour(s.fetch_start_hour ?? 8);
        setEndHour(s.fetch_end_hour ?? 22);
        setRunning(s.scheduler_running ?? true);
        if (s.fetch_interval && s.fetch_interval >= 60) {
          setUnit('minutes');
        }
        const srcData = sourcesRes.data.items ?? [];
        setSources(srcData);
      } catch {
        // Use defaults if settings endpoint not available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        fetch_interval: interval,
        fetch_mode: mode,
        fetch_start_hour: startHour,
        fetch_end_hour: endHour,
        scheduler_running: running,
      });
    } catch (err) {
      console.error('Failed to save schedule config:', err);
    } finally {
      setSaving(false);
    }
  };

  const nextExecution = () => {
    const now = new Date();
    const mins = unit === 'hours' ? interval * 60 : interval;
    now.setMinutes(now.getMinutes() + mins);
    return now.toLocaleString('zh-CN');
  };

  // Build recent history from sources' last_fetched
  const fetchHistory = sources
    .filter(s => s.last_fetched)
    .sort((a, b) => new Date(b.last_fetched!).getTime() - new Date(a.last_fetched!).getTime())
    .slice(0, 5)
    .map(s => ({
      time: new Date(s.last_fetched!).toLocaleString('zh-CN'),
      result: s.status === 'error' ? 'error' as const : 'success' as const,
      sourceName: s.name,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">采集频率设置</h2>

      {/* Global interval */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">全局采集间隔</h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={interval}
            onChange={e => setInterval_(Number(e.target.value))}
            className="w-24 rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
            min={1}
          />
          <select
            value={unit}
            onChange={e => setUnit(e.target.value as 'minutes' | 'hours')}
            className="rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
          >
            <option value="minutes">分钟</option>
            <option value="hours">小时</option>
          </select>
        </div>
      </div>

      {/* Fetch mode */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">采集模式</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setMode('continuous')}
            className={`flex-1 rounded-lg border p-3 text-left transition ${mode === 'continuous' ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[#374151] hover:border-[var(--color-accent-light)]/50'}`}
          >
            <span className="text-sm font-medium text-[var(--color-text-primary)]">连续采集</span>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">全天候自动采集</p>
          </button>
          <button
            onClick={() => setMode('scheduled')}
            className={`flex-1 rounded-lg border p-3 text-left transition ${mode === 'scheduled' ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[#374151] hover:border-[var(--color-accent-light)]/50'}`}
          >
            <span className="text-sm font-medium text-[var(--color-text-primary)]">固定时间段</span>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">仅在指定时间范围内采集</p>
          </button>
        </div>
        {mode === 'scheduled' && (
          <div className="flex items-center gap-2 pt-2">
            <span className="text-sm text-[var(--color-text-muted)]">从</span>
            <input
              type="number"
              value={startHour}
              onChange={e => setStartHour(Number(e.target.value))}
              className="w-16 rounded-lg border border-[#374151] bg-[#1e2d3d] px-2 py-1.5 text-center text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
              min={0}
              max={23}
            />
            <span className="text-sm text-[var(--color-text-muted)]">:00 到</span>
            <input
              type="number"
              value={endHour}
              onChange={e => setEndHour(Number(e.target.value))}
              className="w-16 rounded-lg border border-[#374151] bg-[#1e2d3d] px-2 py-1.5 text-center text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
              min={0}
              max={23}
            />
            <span className="text-sm text-[var(--color-text-muted)]">:00</span>
          </div>
        )}
      </div>

      {/* Scheduler status */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">调度状态</h3>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${running ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-[var(--color-success)] animate-pulse' : 'bg-[var(--color-warning)]'}`} />
              {running ? '运行中' : '已暂停'}
            </span>
            <button
              onClick={() => setRunning(!running)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${running ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20' : 'bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20'}`}
            >
              {running ? <><Pause className="h-3.5 w-3.5" /> 暂停</> : <><Play className="h-3.5 w-3.5" /> 启动</>}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Clock className="h-4 w-4" />
          <span>下次执行时间: {running ? nextExecution() : '—'}</span>
        </div>
      </div>

      {/* Recent fetch history (from real source data) */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5">
        <h3 className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">最近采集历史</h3>
        {fetchHistory.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">暂无采集记录</p>
        ) : (
          <div className="space-y-2">
            {fetchHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-[var(--color-bg-elevated)] px-3 py-2">
                <div className="flex items-center gap-2">
                  {h.result === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                  ) : (
                    <XCircle className="h-4 w-4 text-[var(--color-danger)]" />
                  )}
                  <span className="text-sm text-[var(--color-text-primary)]">{h.time}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">({h.sourceName})</span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {h.result === 'success' ? '采集成功' : '采集失败'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end gap-2">
        <button className="rounded-lg border border-[#374151] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elevated)]">取消</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)] disabled:opacity-50"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          保存配置
        </button>
      </div>
    </div>
  );
}
