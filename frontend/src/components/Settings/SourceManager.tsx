import { Rss, RefreshCw, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { getSources, fetchSource } from '../../services/api';
import type { Source } from '../../types';
import { useEffect, useState } from 'react';

const sourceTypeColors: Record<string, string> = {
  arxiv: '#6366f1',
  github: '#818cf8',
  zhihu: '#f59e0b',
  huawei_ascend: '#10b981',
  rss: '#ec4899',
};

const sourceTypeLabels: Record<string, string> = {
  arxiv: 'arXiv',
  github: 'GitHub Trending',
  zhihu: '知乎',
  huawei_ascend: '昇腾社区',
  rss: 'RSS',
};

export default function SourceManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingId, setFetchingId] = useState<number | null>(null);

  const fetchSources = async () => {
    try {
      const res = await getSources();
      const data = Array.isArray(res.data) ? res.data : ((res.data as any)?.items ?? []);
      setSources(data);
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleFetch = async (id: number) => {
    setFetchingId(id);
    try {
      await fetchSource(id);
      await fetchSources();
    } catch (err) {
      console.error('Failed to trigger fetch:', err);
    } finally {
      setFetchingId(null);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#f1f5f9]">信息源管理</h3>
        <button
          onClick={fetchSources}
          className="flex items-center gap-1.5 rounded-lg bg-[#6366f1]/10 px-3 py-1.5 text-xs text-[#818cf8] hover:bg-[#6366f1]/20 transition-colors"
        >
          <RefreshCw size={12} />
          刷新列表
        </button>
      </div>

      {sources.length === 0 ? (
        <div className="py-8 text-center text-sm text-[#64748b]">
          暂无信息源，请通过 API 或后端添加
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => {
            const color = sourceTypeColors[source.source_type || ''] || '#6366f1';
            const typeLabel = sourceTypeLabels[source.source_type || ''] || source.source_type || '未知';
            const isFetching = fetchingId === source.id;

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
                        <h4 className="text-sm font-medium text-[#f1f5f9]">{source.name}</h4>
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
                            <>
                              <CheckCircle size={10} className="text-[#10b981]" />
                              活跃
                            </>
                          ) : (
                            <>
                              <XCircle size={10} className="text-[#ef4444]" />
                              未激活
                            </>
                          )}
                        </span>
                        {source.last_fetched && (
                          <span>
                            上次采集: {new Date(source.last_fetched).toLocaleString('zh-CN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFetch(source.id)}
                      disabled={isFetching}
                      className="flex items-center gap-1.5 rounded-lg bg-[#6366f1]/10 px-3 py-1.5 text-xs text-[#818cf8] hover:bg-[#6366f1]/20 disabled:opacity-50 transition-colors"
                    >
                      {isFetching ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      {isFetching ? '采集中...' : '立即采集'}
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
