import { useState, useEffect } from 'react';
import { Rss, RefreshCw, Loader2, CheckCircle, XCircle, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { getSources, fetchSource, createSource, deleteSource } from '../../services/api';
import type { Source } from '../../types';
import { formatSourceName, formatSourceType } from '../../utils/sourceDisplay';

const sourceTypeColors: Record<string, string> = {
  arxiv: '#6366f1', github_trending: '#818cf8', github: '#818cf8',
  crawler: '#6366f1', zhihu: '#f59e0b', huawei_ascend: '#10b981', rss: '#ec4899',
};

interface TestResult {
  sourceId?: number;
  success: boolean;
  message: string;
  articlesFound?: number;
}

export default function SourceManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});

  // Add source form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [testBeforeAdd, setTestBeforeAdd] = useState<TestResult | null>(null);
  const [testingNew, setTestingNew] = useState(false);

  const fetchSources = async () => {
    try {
      const res = await getSources();
      const data = res.data.items ?? [];
      setSources(data);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSources(); }, []);

  const handleFetch = async (id: number) => {
    setFetchingId(id);
    setTestResults(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const res = await fetchSource(id);
      const data = res.data as any;
      setTestResults(prev => ({ ...prev, [id]: { sourceId: id, success: true, message: `成功抓取 ${data.new_articles ?? 0} 篇新文章`, articlesFound: data.new_articles } }));
      await fetchSources();
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [id]: { sourceId: id, success: false, message: err?.response?.data?.detail || err?.message || '抓取失败' } }));
    } finally {
      setFetchingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个信息源吗？')) return;
    try {
      await deleteSource(id);
      setSources(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  // Test a URL before adding (creates source, fetches, shows result)
  const handleTestNew = async () => {
    if (!newUrl.trim()) return;
    setTestingNew(true);
    setTestBeforeAdd(null);
    try {
      // Create source first (disabled)
      const name = newName.trim() || new URL(newUrl).hostname.replace('www.', '');
      const res = await createSource({
        name,
        url: newUrl,
        source_type: 'rss',
        enabled: true,
      });
      const sourceId = (res.data as any).id;

      // Try fetching
      try {
        const fetchRes = await fetchSource(sourceId);
        const data = fetchRes.data as any;
        setTestBeforeAdd({ sourceId, success: true, message: `验证成功！抓取到 ${data.new_articles ?? 0} 篇新文章`, articlesFound: data.new_articles });
      } catch (fetchErr: any) {
        // Fetch failed — remove the bad source
        try { await deleteSource(sourceId); } catch {}
        setTestBeforeAdd({ sourceId: 0, success: false, message: `验证失败，未添加信息源: ${fetchErr?.response?.data?.detail || fetchErr?.message || ''}` });
      }
      await fetchSources();
    } catch (err: any) {
      setTestBeforeAdd({ success: false, message: `添加失败: ${err?.response?.data?.detail || err?.message || '请检查URL格式'}` });
    } finally {
      setTestingNew(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#f1f5f9]">信息源管理</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#818cf8]"
          >
            <Plus size={12} />
            添加信息源
          </button>
          <button
            onClick={fetchSources}
            className="flex items-center gap-1.5 rounded-lg bg-[#6366f1]/10 px-3 py-1.5 text-xs text-[#818cf8] hover:bg-[#6366f1]/20 transition-colors"
          >
            <RefreshCw size={12} />
            刷新
          </button>
        </div>
      </div>

      {/* Add Source Form */}
      {showAddForm && (
        <div className="rounded-xl border border-[#6366f1]/30 bg-[#1a2332] p-5 space-y-4">
          <h4 className="text-sm font-medium text-[#818cf8]">添加 RSS 信息源</h4>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-[#94a3b8]">名称（可选，默认取域名）</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full rounded-lg border border-[#2d3748] bg-[#1e2d3d] px-3 py-2 text-sm text-[#f1f5f9] outline-none focus:border-[#6366f1]"
                placeholder="例：InfoQ AI"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#94a3b8]">RSS 订阅地址 *</label>
              <input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                className="w-full rounded-lg border border-[#2d3748] bg-[#1e2d3d] px-3 py-2 text-sm text-[#f1f5f9] outline-none focus:border-[#6366f1]"
                placeholder="https://example.com/feed.xml"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestNew}
              disabled={testingNew || !newUrl.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-[#10b981]/10 px-4 py-2 text-xs font-medium text-[#10b981] transition hover:bg-[#10b981]/20 disabled:opacity-50"
            >
              {testingNew ? <Loader2 size={12} className="animate-spin" /> : <Rss size={12} />}
              {testingNew ? '验证中...' : '添加并测试'}
            </button>
            {testBeforeAdd && (
              <span className={`flex items-center gap-1 text-xs ${testBeforeAdd.success ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {testBeforeAdd.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {testBeforeAdd.message}
              </span>
            )}
          </div>
          {testBeforeAdd?.success && (
            <button
              onClick={() => { setShowAddForm(false); setNewName(''); setNewUrl(''); setTestBeforeAdd(null); }}
              className="text-xs text-[#64748b] hover:text-[#94a3b8]"
            >
              添加成功，关闭表单
            </button>
          )}
        </div>
      )}

      {/* Source List */}
      {sources.length === 0 ? (
        <div className="py-8 text-center text-sm text-[#64748b]">
          暂无信息源，点击上方「添加信息源」开始
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => {
            const color = sourceTypeColors[source.source_type || ''] || '#6366f1';
            const typeLabel = formatSourceType(source.source_type);
            const isFetching = fetchingId === source.id;
            const testResult = testResults[source.id];

            return (
              <div
                key={source.id}
                className="group rounded-lg border border-[#2d3748] bg-[#1a2332] p-4 transition-all hover:border-[#6366f1]/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      <Rss size={16} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-[#f1f5f9]">{formatSourceName(source.name)}</h4>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: `${color}15`, color }}
                        >
                          {typeLabel}
                        </span>
                      </div>

                      {source.url && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-[#64748b]">
                          <ExternalLink size={10} />
                          <span className="truncate max-w-[300px]">{source.url}</span>
                        </p>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-[#64748b]">
                        <span className="flex items-center gap-1">
                          {source.enabled ? (
                            <><CheckCircle size={10} className="text-[#10b981]" />活跃</>
                          ) : (
                            <><XCircle size={10} className="text-[#ef4444]" />未激活</>
                          )}
                        </span>
                        {source.last_fetched && (
                          <span>上次采集: {new Date(source.last_fetched).toLocaleString('zh-CN')}</span>
                        )}
                      </div>

                      {/* Test result */}
                      {testResult && (
                        <div className={`mt-2 flex items-center gap-1 text-[11px] ${testResult.success ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                          {testResult.success ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {testResult.message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFetch(source.id)}
                      disabled={isFetching}
                      className="flex items-center gap-1.5 rounded-lg bg-[#6366f1]/10 px-3 py-1.5 text-xs text-[#818cf8] hover:bg-[#6366f1]/20 disabled:opacity-50 transition-colors"
                    >
                      {isFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {isFetching ? '采集中...' : '测试采集'}
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="rounded-lg p-1.5 text-[#64748b] transition hover:bg-[#ef4444]/10 hover:text-[#ef4444]"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
