import { useState } from 'react';
import { Search, Maximize2, Filter } from 'lucide-react';
import GraphView from './GraphView';

const communities = [
  { id: 'all', label: '全部', color: '#6366f1' },
  { id: 'ocr', label: 'OCR技术', color: '#6366f1' },
  { id: 'ascend', label: '昇腾开发', color: '#10b981' },
  { id: 'xinchuang', label: '信创环境', color: '#f59e0b' },
  { id: 'ai-ml', label: 'AI-ML', color: '#ec4899' },
  { id: 'opensource', label: '开源工具', color: '#06b6d4' },
];

export default function KnowledgeGraph() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <section className={`flex h-full flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0f1419]' : ''}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#2d3748] px-6 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-[#f1f5f9]">知识网络</h1>
          {/* Community Filters */}
          <div className="flex items-center gap-1">
            {communities.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCommunity(c.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors ${
                  selectedCommunity === c.id
                    ? 'bg-[#1e2d3d] text-[#f1f5f9] border border-[#2d3748]'
                    : 'text-[#64748b] hover:text-[#94a3b8]'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              placeholder="搜索节点..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 rounded-lg border border-[#2d3748] bg-[#1a2332] pl-8 pr-3 text-xs text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#6366f1]"
            />
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2d3748] text-[#94a3b8] hover:bg-[#1e2d3d] hover:text-[#f1f5f9] transition-colors">
            <Filter size={14} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2d3748] text-[#94a3b8] hover:bg-[#1e2d3d] hover:text-[#f1f5f9] transition-colors"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 min-h-0">
        <GraphView />
      </div>
    </section>
  );
}
