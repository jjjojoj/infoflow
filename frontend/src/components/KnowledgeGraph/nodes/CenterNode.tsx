import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Brain } from 'lucide-react';

export interface CenterNodeData {
  label: string;
  subtitle?: string;
  time?: string;
}

function CenterNode({ data }: NodeProps<CenterNodeData>) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="flex h-[140px] w-[140px] flex-col items-center justify-center rounded-full border-2 border-[#6366f1] shadow-lg shadow-[#6366f1]/20"
        style={{ background: 'linear-gradient(135deg, #1e2d3d 0%, #1a2332 100%)' }}
      >
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#6366f1]/20">
          <Brain size={20} className="text-[#818cf8]" />
        </div>
        <span className="max-w-[100px] text-center text-xs font-semibold leading-tight text-[#f1f5f9]">
          {data.label}
        </span>
        {data.subtitle && (
          <span className="mt-1 max-w-[100px] text-center text-[10px] leading-tight text-[#94a3b8]">
            {data.subtitle}
          </span>
        )}
      </div>
      {data.time && (
        <span className="mt-2 rounded-full bg-[#1a2332] px-2 py-0.5 text-[10px] text-[#64748b]">
          {data.time}
        </span>
      )}
      <Handle type="source" position={Position.Top} className="!bg-[#6366f1] !border-[#1a2332] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-[#6366f1] !border-[#1a2332] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-[#6366f1] !border-[#1a2332] !w-2 !h-2" />
      <Handle type="source" position={Position.Left} id="left" className="!bg-[#6366f1] !border-[#1a2332] !w-2 !h-2" />
    </div>
  );
}

export default memo(CenterNode);
