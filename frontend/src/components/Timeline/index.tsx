import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface TimelineEvent {
  date: string;
  title: string;
  isActive: boolean;
}

const mockEvents: TimelineEvent[] = [
  { date: '5月12日', title: 'OpenAI 预告 GPT-4o', isActive: false },
  { date: '5月13日', title: '技术细节泄露', isActive: false },
  { date: '5月14日', title: '媒体评测解禁', isActive: false },
  { date: '5月15日', title: '正式发布 GPT-4o', isActive: true },
  { date: '5月16日', title: '市场热议发酵', isActive: false },
  { date: '5月17日', title: '行业影响扩大', isActive: false },
  { date: '5月18日', title: '监管讨论升温', isActive: false },
];

interface TimelineProps {
  events?: TimelineEvent[];
  collapsible?: boolean;
}

export default function Timeline({ events = mockEvents, collapsible = true }: TimelineProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-[#2d3748] bg-[#1a2332] p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[#64748b]" />
          <span className="text-sm text-[#94a3b8]">时间线视图</span>
        </div>
        {collapsible && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors"
          >
            {expanded ? '收起时间线' : '展开时间线'}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Timeline */}
      {expanded && (
        <div className="relative px-4">
          {/* Horizontal line */}
          <div className="absolute left-4 right-4 top-[9px] h-[2px] bg-[#2d3748]" />

          {/* Active segment (animated) */}
          <div
            className="absolute top-[9px] h-[2px] bg-gradient-to-r from-[#6366f1] to-[#818cf8]"
            style={{
              left: `${(events.findIndex((e) => e.isActive) / (events.length - 1)) * 80 + 10}%`,
              width: '5%',
            }}
          />

          {/* Event points */}
          <div className="relative flex items-start justify-between">
            {events.map((event, i) => (
              <div key={i} className="flex flex-col items-center gap-2" style={{ minWidth: 70 }}>
                {/* Dot */}
                <div className="relative">
                  {event.isActive && (
                    <div className="absolute -inset-1.5 animate-pulse rounded-full bg-[#6366f1]/30" />
                  )}
                  <div
                    className={`relative h-[18px] w-[18px] rounded-full border-2 transition-all ${
                      event.isActive
                        ? 'border-[#6366f1] bg-[#6366f1] shadow-lg shadow-[#6366f1]/40'
                        : 'border-[#2d3748] bg-[#1e2d3d]'
                    }`}
                  >
                    {event.isActive && (
                      <div className="absolute inset-1 rounded-full bg-white/80" />
                    )}
                  </div>
                </div>

                {/* Date */}
                <span
                  className={`text-[11px] font-medium ${
                    event.isActive ? 'text-[#818cf8]' : 'text-[#64748b]'
                  }`}
                >
                  {event.date}
                </span>

                {/* Title */}
                <span
                  className={`max-w-[80px] text-center text-[10px] leading-tight ${
                    event.isActive ? 'text-[#f1f5f9]' : 'text-[#64748b]'
                  }`}
                >
                  {event.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
