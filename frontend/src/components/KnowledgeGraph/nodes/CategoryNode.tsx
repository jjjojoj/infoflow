import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Zap, Package, TrendingUp, Globe, Shield, type LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  '技术突破': Zap,
  '产品影响': Package,
  '市场反应': TrendingUp,
  '行业影响': Globe,
  '监管政策': Shield,
};

export interface CategoryNodeData {
  label: string;
  subtitle?: string;
  color: string;
  insightCount?: number;
  icon?: string;
}

function CategoryNode({ data }: NodeProps<CategoryNodeData>) {
  const Icon = iconMap[data.icon || data.label] || Zap;
  const color = data.color || '#6366f1';

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="flex h-[110px] w-[130px] flex-col items-center justify-center rounded-2xl border shadow-md"
        style={{
          borderColor: `${color}40`,
          background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
          boxShadow: `0 4px 20px ${color}15`,
        }}
      >
        <div
          className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
        <span className="text-xs font-semibold text-[#f1f5f9]">{data.label}</span>
        {data.subtitle && (
          <span className="mt-0.5 max-w-[110px] text-center text-[10px] leading-tight text-[#94a3b8]">
            {data.subtitle}
          </span>
        )}
        {data.insightCount !== undefined && (
          <span
            className="mt-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {data.insightCount} 篇洞察
          </span>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-transparent !w-3 !h-3" />
      <Handle type="target" position={Position.Right} id="right-in" className="!bg-transparent !border-transparent !w-3 !h-3" />
      <Handle type="target" position={Position.Top} id="top-in" className="!bg-transparent !border-transparent !w-3 !h-3" />
      <Handle type="target" position={Position.Bottom} id="bottom-in" className="!bg-transparent !border-transparent !w-3 !h-3" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-transparent !w-3 !h-3" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-transparent !border-transparent !w-3 !h-3" />
      <Handle type="source" position={Position.Top} id="top" className="!bg-transparent !border-transparent !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-transparent !w-3 !h-3" />
    </div>
  );
}

export default memo(CategoryNode);
