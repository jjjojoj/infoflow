import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

export interface LeafNodeData {
  label: string;
  color?: string;
}

function LeafNode({ data }: NodeProps<LeafNodeData>) {
  const color = data.color || '#6366f1';

  return (
    <div className="relative flex items-center">
      <div
        className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-sm"
        style={{
          borderColor: `${color}30`,
          background: `${color}08`,
        }}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="whitespace-nowrap text-[11px] text-[#e2e8f0]">
          {data.label}
        </span>
      </div>
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-transparent !w-2 !h-2" />
      <Handle type="target" position={Position.Bottom} id="bottom-in" className="!bg-transparent !border-transparent !w-2 !h-2" />
      <Handle type="target" position={Position.Top} id="top-in" className="!bg-transparent !border-transparent !w-2 !h-2" />
      <Handle type="target" position={Position.Right} id="right-in" className="!bg-transparent !border-transparent !w-2 !h-2" />
    </div>
  );
}

export default memo(LeafNode);
