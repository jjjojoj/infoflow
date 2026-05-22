import { useState } from 'react';
import { Zap, Brain, Moon, Sun, Globe, Trash2, Download, RotateCcw } from 'lucide-react';

export default function GeneralConfig() {
  const [deepMode, setDeepMode] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">通用设置</h2>

      {/* Deep mode */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {deepMode ? <Brain className="h-5 w-5 text-[var(--color-accent)]" /> : <Zap className="h-5 w-5 text-[var(--color-warning)]" />}
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text-primary)]">AI 分析深度</h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {deepMode ? '深度分析: 多角度解读，生成更详细的洞察' : '快速模式: 快速总结，节省 Token 消耗'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" checked={deepMode} onChange={() => setDeepMode(!deepMode)} className="peer sr-only" />
            <div className="h-6 w-11 rounded-full bg-[#374151] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--color-accent)] peer-checked:after:translate-x-full" />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <span className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${!deepMode ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'}`}>
            <Zap className="mr-1 inline h-3 w-3" />快速模式
          </span>
          <span className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${deepMode ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-light)]' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'}`}>
            <Brain className="mr-1 inline h-3 w-3" />深度分析
          </span>
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-3">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">主题设置</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition ${theme === 'dark' ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[#374151] hover:border-[var(--color-accent-light)]/50'}`}
          >
            <Moon className="h-4 w-4" />
            <span className="text-sm font-medium">暗色</span>
          </button>
          <button
            onClick={() => setTheme('light')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 transition ${theme === 'light' ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[#374151] hover:border-[var(--color-accent-light)]/50 opacity-50'}`}
          >
            <Sun className="h-4 w-4" />
            <span className="text-sm font-medium">亮色</span>
            <span className="text-[10px] text-[var(--color-text-muted)]">(即将支持)</span>
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-3">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">语言设置</h3>
        <div className="flex items-center gap-3">
          <Globe className="h-4 w-4 text-[var(--color-text-muted)]" />
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as 'zh' | 'en')}
            className="rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
          >
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {/* Data management */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">数据管理</h3>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-[#374151] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm text-[var(--color-text-primary)] transition hover:bg-[#2a3f52]">
            <Trash2 className="h-4 w-4" /> 清除缓存
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-[#374151] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm text-[var(--color-text-primary)] transition hover:bg-[#2a3f52]">
            <Download className="h-4 w-4" /> 导出数据
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-4 py-2 text-sm text-[var(--color-danger)] transition hover:bg-[var(--color-danger)]/10">
            <RotateCcw className="h-4 w-4" /> 重置设置
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">重置设置将清除所有自定义配置，恢复到默认状态。此操作不可逆。</p>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-2">
        <button className="rounded-lg border border-[#374151] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elevated)]">取消</button>
        <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)]">保存配置</button>
      </div>
    </div>
  );
}
