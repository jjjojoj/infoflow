import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getArticles } from '../../services/api';

interface TrendPoint {
  date: string;
  articles: number;
}

export default function TrendChart() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrend() {
      try {
        // Fetch up to 200 articles to aggregate daily counts
        const res = await getArticles({ limit: 200 });
        const items = res.data.items ?? [];

        // Group by date
        const counts: Record<string, number> = {};
        const now = new Date();

        // Ensure we have all 7 days even if 0
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
          counts[key] = 0;
        }

        items.forEach((a: { created_at: string }) => {
          const d = new Date(a.created_at);
          const key = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
          if (key in counts) {
            counts[key]++;
          }
        });

        const arr = Object.entries(counts).map(([date, articles]) => ({ date, articles }));
        setData(arr);
      } catch (err) {
        console.error('Failed to fetch trend data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTrend();
  }, []);

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#1a2332] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#f1f5f9]">采集趋势</h3>
        <span className="text-[11px] text-[#64748b]">过去 7 天</span>
      </div>
      <div className="h-[160px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-[#64748b]">加载中...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e2d3d',
                  border: '1px solid #2d3748',
                  borderRadius: '8px',
                  fontSize: 12,
                  color: '#f1f5f9',
                }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area
                type="monotone"
                dataKey="articles"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorArticles)"
                name="文章数"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
