import { useState, useEffect } from 'react';
import { FolderOpen, Download, RefreshCw, CheckCircle2, XCircle, Loader2, FileText } from 'lucide-react';
import { getObsidianStatus, triggerExport, updateMOCs } from '../../services/api';
import type { ObsidianStatus } from '../../types';

export default function ObsidianConfig() {
  const [vaultPath, setVaultPath] = useState('');
  const [autoExport, setAutoExport] = useState(false);
  const [exportInterval, setExportInterval] = useState(60);
  const [exportMode, setExportMode] = useState<'full' | 'incremental'>('incremental');
  const [categories, setCategories] = useState({
    core_tech: true,
    platform: true,
    tools: true,
    learning: false,
  });
  const [exporting, setExporting] = useState(false);
  const [updatingMOC, setUpdatingMOC] = useState(false);
  const [status, setStatus] = useState<ObsidianStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await getObsidianStatus();
        setStatus(res.data);
      } catch {
        setStatus(null);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await triggerExport(exportMode);
      // Refresh status after export
      const res = await getObsidianStatus();
      setStatus(res.data);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleUpdateMOC = async () => {
    setUpdatingMOC(true);
    try {
      await updateMOCs();
    } catch (err) {
      console.error('Update MOC failed:', err);
    } finally {
      setUpdatingMOC(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Obsidian 配置</h2>

      {/* Vault path */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">Vault 路径</h3>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-[var(--color-text-muted)]" />
          <input
            value={vaultPath}
            onChange={e => setVaultPath(e.target.value)}
            className="flex-1 rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
            placeholder="D:\\ObsidianVault\\..."
          />
        </div>
      </div>

      {/* Vault status */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5">
        <h3 className="mb-3 text-sm font-medium text-[var(--color-text-secondary)]">Vault 状态</h3>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent)]" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 text-center">
              {status?.connected ? (
                <div className="flex items-center justify-center gap-1.5 text-[var(--color-success)]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">已连接</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 text-[var(--color-text-muted)]">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">未连接</span>
                </div>
              )}
            </div>
            <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 text-center">
              <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                {status?.file_count ?? 0}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">文件数</div>
            </div>
            <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 text-center">
              <div className="text-xs text-[var(--color-text-primary)]">
                {status?.last_export
                  ? new Date(status.last_export).toLocaleString('zh-CN')
                  : '从未导出'}
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">最近导出</div>
            </div>
          </div>
        )}
      </div>

      {/* Auto export toggle */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">自动导出</h3>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">新文章自动同步到 Obsidian Vault</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input type="checkbox" checked={autoExport} onChange={() => setAutoExport(!autoExport)} className="peer sr-only" />
            <div className="h-6 w-11 rounded-full bg-[#374151] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--color-accent)] peer-checked:after:translate-x-full" />
          </label>
        </div>
        {autoExport && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">导出频率:</span>
            <input
              type="number"
              value={exportInterval}
              onChange={e => setExportInterval(Number(e.target.value))}
              className="w-20 rounded-lg border border-[#374151] bg-[#1e2d3d] px-2 py-1.5 text-center text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
              min={5}
            />
            <span className="text-sm text-[var(--color-text-muted)]">分钟</span>
          </div>
        )}
      </div>

      {/* Export options */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">导出选项</h3>
        <div className="flex gap-3">
          <button
            onClick={() => setExportMode('incremental')}
            className={`flex-1 rounded-lg border p-3 text-left transition ${exportMode === 'incremental' ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[#374151] hover:border-[var(--color-accent-light)]/50'}`}
          >
            <span className="text-sm font-medium text-[var(--color-text-primary)]">增量导出</span>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">仅导出新内容</p>
          </button>
          <button
            onClick={() => setExportMode('full')}
            className={`flex-1 rounded-lg border p-3 text-left transition ${exportMode === 'full' ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[#374151] hover:border-[var(--color-accent-light)]/50'}`}
          >
            <span className="text-sm font-medium text-[var(--color-text-primary)]">全量导出</span>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">导出全部文章</p>
          </button>
        </div>

        <div>
          <span className="mb-2 block text-xs text-[var(--color-text-muted)]">选择导出分类:</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categories).map(([key, val]) => {
              const labels: Record<string, string> = { core_tech: '核心技术', platform: '平台环境', tools: '工具框架', learning: '学习成长' };
              return (
                <button
                  key={key}
                  onClick={() => setCategories(prev => ({ ...prev, [key]: !val }))}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${val ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                >
                  {labels[key]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)] disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          立即导出到 Obsidian
        </button>
        <button
          onClick={handleUpdateMOC}
          disabled={updatingMOC}
          className="flex items-center gap-2 rounded-lg border border-[#374151] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[#2a3f52] disabled:opacity-50"
        >
          {updatingMOC ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          更新 MOC
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-[#374151] bg-[var(--color-bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[#2a3f52]">
          <FileText className="h-4 w-4" />
          查看日志
        </button>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-2">
        <button className="rounded-lg border border-[#374151] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-elevated)]">取消</button>
        <button className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)]">保存配置</button>
      </div>
    </div>
  );
}
