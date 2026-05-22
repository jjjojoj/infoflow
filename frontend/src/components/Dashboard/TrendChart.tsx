import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const mockData = [
  { date: '周一', articles: 12, insights: 3 },
  { date: '周二', articles: 19, insights: 5 },
  { date: '周三', articles: 15, insights: 4 },
  { date: '周四', articles: 28, insights: 7 },
  { date: '周五', articles: 22, insights: 6 },
  { date: '周六', articles: 35, insights: 9 },
  { date: '周日', articles: 42, insights: 11 },
];

export default function TrendChart() {
  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#1a2332] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#f1f5f9]">采集趋势</h3>
        <span className="text-[11px] text-[#64748b]">过去 7 天</span>
      </div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorArticles" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInsights" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
            <Area
              type="monotone"
              dataKey="insights"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorInsights)"
              name="洞察数"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
