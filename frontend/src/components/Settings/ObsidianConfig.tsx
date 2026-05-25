import { useState, useEffect } from 'react';
import { FolderOpen, Download, RefreshCw, CheckCircle2, XCircle, Loader2, ExternalLink, Save } from 'lucide-react';
import { getObsidianStatus, triggerExport, updateMOCs, updateSettings } from '../../services/api';
import type { ObsidianStatus } from '../../types';

export default function ObsidianConfig() {
  const [autoExport, setAutoExport] = useState(false);
  const [exportInterval, setExportInterval] = useState(60);
  const [exportMode, setExportMode] = useState<'full' | 'incremental'>('incremental');
  const [exporting, setExporting] = useState(false);
  const [updatingMOC, setUpdatingMOC] = useState(false);
  const [status, setStatus] = useState<ObsidianStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

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

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateSettings({ auto_export: autoExport, export_interval: exportInterval } as any);
      setSaveMsg('已保存');
      const res = await getObsidianStatus();
      setStatus(res.data);
    } catch {
      setSaveMsg('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const res = await triggerExport(exportMode);
      const data = res.data;
      if (data.exported_count === 0 && data.skipped_count > 0) {
        setExportMsg(`所有 ${data.skipped_count} 篇均已导出过，无需重复导出。切换到「全量导出」可强制重新导出。`);
      } else {
        setExportMsg(`成功导出 ${data.exported_count} 篇${data.skipped_count ? `，跳过 ${data.skipped_count} 篇（已存在）` : ''}`);
      }
      const statusRes = await getObsidianStatus();
      setStatus(statusRes.data);
    } catch (err) {
      setExportMsg('导出失败');
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

  const handleSelectFolder = async () => {
    // File System Access API — 仅 Chromium 浏览器支持
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        // showDirectoryPicker 只返回 name（文件夹名），不返回完整路径
        // 所以作为提示展示给用户，让用户手动确认完整路径
        const folderName = dirHandle.name;
        const userInput = prompt(
          `浏览器安全限制无法获取完整路径。\n\n` +
          `你选择的文件夹名: ${folderName}\n\n` +
          `请输入完整的 Obsidian Vault 路径\n` +
          `（例如 D:\\工作知识库\\信息助手Vault）:`,
          `D:\\${folderName}`
        );
        if (userInput) {
          await updateSettings({ obsidian_vault_path: userInput } as any);
          setSaveMsg('路径已更新，重启后端生效');
        }
      } else {
        // Fallback: 用旧式 input 目录选择
        const input = document.createElement('input');
        input.type = 'file';
        // @ts-ignore webkitdirectory 是非标准属性
        input.webkitdirectory = true;
        input.onchange = () => {
          const files = input.files;
          if (files && files.length > 0) {
            const relativePath = files[0].webkitRelativePath;
            const rootDir = relativePath.split('/')[0];
            const userInput = prompt(
              `浏览器安全限制无法获取完整路径。\n\n` +
              `你选择的文件夹名: ${rootDir}\n\n` +
              `请输入完整的 Obsidian Vault 路径\n` +
              `（例如 D:\\工作知识库\\信息助手Vault）:`,
              `D:\\${rootDir}`
            );
            if (userInput) {
              updateSettings({ obsidian_vault_path: userInput } as any);
              setSaveMsg('路径已更新，重启后端生效');
            }
          }
        };
        input.click();
      }
    } catch (err) {
      // 用户取消选择
      console.log('Folder selection cancelled or failed:', err);
    }
  };

  const hostPath = status?.host_path || '';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Obsidian 配置</h2>

      {/* Vault path */}
      <div className="rounded-xl border border-[#374151] bg-[var(--color-bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">Vault 路径</h3>

        {/* Obsidian 打开路径（Windows/宿主机） */}
        <div className="space-y-2">
          <label className="text-xs text-[var(--color-text-muted)]">
            Obsidian 打开路径（本机路径）
          </label>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            <div className="flex-1 rounded-lg border border-[#374151] bg-[#1e2d3d] px-3 py-2 text-sm text-[var(--color-text-primary)]">
              {hostPath || '未配置'}
            </div>
            <button
              onClick={handleSelectFolder}
              className="shrink-0 rounded-lg border border-[#374151] bg-[var(--color-bg-elevated)] px-3 py-2 text-xs font-medium text-[var(--color-text-primary)] transition hover:bg-[#2a3f52]"
            >
              浏览...
            </button>
          </div>
        {hostPath && (
          <p className="text-xs text-[var(--color-text-muted)]">
            在 Obsidian 中「打开库」时选择此路径
          </p>
        )}
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
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 text-center">
                {status?.available ? (
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
                  {status?.note_count ?? 0}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">笔记总数</div>
              </div>
              <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 text-center">
                <div className="text-xs text-[var(--color-text-primary)]">
                  {status?.last_updated
                    ? new Date(status.last_updated).toLocaleString('zh-CN')
                    : '从未导出'}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">最近更新</div>
              </div>
            </div>

            {/* Areas breakdown */}
            {status?.areas && Object.keys(status.areas).length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs text-[var(--color-text-muted)]">各知识领域:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(status.areas).map(([area, count]) => (
                    <span key={area} className="rounded-lg bg-[var(--color-bg-elevated)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
                      {area}: {count}
                    </span>
                  ))}
                  {status.inbox_count > 0 && (
                    <span className="rounded-lg bg-[var(--color-bg-elevated)] px-3 py-1 text-xs text-[var(--color-text-secondary)]">
                      收件箱: {status.inbox_count}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Open in Obsidian hint */}
            {hostPath && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--color-accent-soft)] p-3">
                <ExternalLink className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                <span className="text-xs text-[var(--color-text-primary)]">
                  用 Obsidian 打开: <code className="font-mono">{hostPath}</code>
                </span>
              </div>
            )}
          </>
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
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
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
        </div>
        {exportMsg && (
          <div className={`text-xs ${exportMsg.startsWith('成功') ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
            {exportMsg}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-light)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存配置
        </button>
        {saveMsg && <span className={`text-xs ${saveMsg === '已保存' || saveMsg.includes('已更新') ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>{saveMsg}</span>}
      </div>
    </div>
  );
}
