import { useCallback, useMemo } from 'react';
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CenterNode from './nodes/CenterNode';
import CategoryNode from './nodes/CategoryNode';
import LeafNode from './nodes/LeafNode';

const nodeTypes = {
  centerNode: CenterNode,
  categoryNode: CategoryNode,
  leafNode: LeafNode,
};

// Category colors
const colors = {
  '技术突破': '#6366f1',
  '产品影响': '#818cf8',
  '市场反应': '#f59e0b',
  '行业影响': '#10b981',
  '监管政策': '#ec4899',
};

// Mock nodes - radial layout around center
const mockNodes: Node[] = [
  // Center node
  {
    id: 'center',
    type: 'centerNode',
    position: { x: 400, y: 300 },
    data: {
      label: 'OpenAI 发布 GPT-4o',
      subtitle: '多模态能力再突破',
      time: '2 小时前',
    },
  },
  // Category nodes (around center)
  {
    id: 'cat-tech',
    type: 'categoryNode',
    position: { x: 650, y: 100 },
    data: {
      label: '技术突破',
      subtitle: '多模态理解与生成能力提升',
      color: colors['技术突破'],
      insightCount: 6,
      icon: '技术突破',
    },
  },
  {
    id: 'cat-product',
    type: 'categoryNode',
    position: { x: 700, y: 320 },
    data: {
      label: '产品影响',
      subtitle: '现有产品线全面升级',
      color: colors['产品影响'],
      insightCount: 5,
      icon: '产品影响',
    },
  },
  {
    id: 'cat-market',
    type: 'categoryNode',
    position: { x: 100, y: 250 },
    data: {
      label: '市场反应',
      subtitle: '资本市场与投资者热议',
      color: colors['市场反应'],
      insightCount: 4,
      icon: '市场反应',
    },
  },
  {
    id: 'cat-industry',
    type: 'categoryNode',
    position: { x: 580, y: 520 },
    data: {
      label: '行业影响',
      subtitle: '推动多行业应用落地',
      color: colors['行业影响'],
      insightCount: 7,
      icon: '行业影响',
    },
  },
  {
    id: 'cat-policy',
    type: 'categoryNode',
    position: { x: 150, y: 480 },
    data: {
      label: '监管政策',
      subtitle: '全球监管加强与关注',
      color: colors['监管政策'],
      insightCount: 3,
      icon: '监管政策',
    },
  },
  // Leaf nodes for 技术突破
  {
    id: 'leaf-1',
    type: 'leafNode',
    position: { x: 870, y: 60 },
    data: { label: '图像理解能力增强', color: colors['技术突破'] },
  },
  {
    id: 'leaf-2',
    type: 'leafNode',
    position: { x: 880, y: 120 },
    data: { label: '实时语音交互', color: colors['技术突破'] },
  },
  {
    id: 'leaf-3',
    type: 'leafNode',
    position: { x: 860, y: 180 },
    data: { label: '多语言支持优化', color: colors['技术突破'] },
  },
  // Leaf nodes for 产品影响
  {
    id: 'leaf-4',
    type: 'leafNode',
    position: { x: 910, y: 290 },
    data: { label: 'ChatGPT 体验升级', color: colors['产品影响'] },
  },
  {
    id: 'leaf-5',
    type: 'leafNode',
    position: { x: 920, y: 350 },
    data: { label: 'API 能力更新', color: colors['产品影响'] },
  },
  {
    id: 'leaf-6',
    type: 'leafNode',
    position: { x: 900, y: 410 },
    data: { label: '企业版功能增强', color: colors['产品影响'] },
  },
  // Leaf nodes for 市场反应
  {
    id: 'leaf-7',
    type: 'leafNode',
    position: { x: -60, y: 200 },
    data: { label: '股价短期上涨', color: colors['市场反应'] },
  },
  {
    id: 'leaf-8',
    type: 'leafNode',
    position: { x: -70, y: 260 },
    data: { label: '投资机构观点', color: colors['市场反应'] },
  },
  {
    id: 'leaf-9',
    type: 'leafNode',
    position: { x: -50, y: 320 },
    data: { label: '市场情绪分析', color: colors['市场反应'] },
  },
  // Leaf nodes for 行业影响
  {
    id: 'leaf-10',
    type: 'leafNode',
    position: { x: 770, y: 510 },
    data: { label: '教育行业变革', color: colors['行业影响'] },
  },
  {
    id: 'leaf-11',
    type: 'leafNode',
    position: { x: 780, y: 570 },
    data: { label: '医疗行业应用', color: colors['行业影响'] },
  },
  {
    id: 'leaf-12',
    type: 'leafNode',
    position: { x: 760, y: 630 },
    data: { label: '内容创作升级', color: colors['行业影响'] },
  },
  // Leaf nodes for 监管政策
  {
    id: 'leaf-13',
    type: 'leafNode',
    position: { x: -10, y: 440 },
    data: { label: '欧盟 AI 法案影响', color: colors['监管政策'] },
  },
  {
    id: 'leaf-14',
    type: 'leafNode',
    position: { x: 0, y: 500 },
    data: { label: '美国监管动向', color: colors['监管政策'] },
  },
  {
    id: 'leaf-15',
    type: 'leafNode',
    position: { x: -20, y: 560 },
    data: { label: '数据隐私讨论', color: colors['监管政策'] },
  },
];

const edgeStyle = { stroke: '#2d3748', strokeWidth: 1.5 };
const animatedEdgeStyle = { stroke: '#6366f180', strokeWidth: 2 };

const mockEdges: Edge[] = [
  // Center to categories
  { id: 'e-c-tech', source: 'center', target: 'cat-tech', sourceHandle: 'right', style: animatedEdgeStyle, animated: true, label: '推动', labelStyle: { fill: '#94a3b8', fontSize: 10 }, labelBgStyle: { fill: '#0f1419', fillOpacity: 0.8 } },
  { id: 'e-c-product', source: 'center', target: 'cat-product', sourceHandle: 'right', targetHandle: 'left', style: animatedEdgeStyle, animated: true, label: '影响', labelStyle: { fill: '#94a3b8', fontSize: 10 }, labelBgStyle: { fill: '#0f1419', fillOpacity: 0.8 } },
  { id: 'e-c-market', source: 'center', target: 'cat-market', sourceHandle: 'left', targetHandle: 'right-in', style: animatedEdgeStyle, animated: true, label: '引发', labelStyle: { fill: '#94a3b8', fontSize: 10 }, labelBgStyle: { fill: '#0f1419', fillOpacity: 0.8 } },
  { id: 'e-c-industry', source: 'center', target: 'cat-industry', sourceHandle: 'bottom', targetHandle: 'top-in', style: animatedEdgeStyle, animated: true, label: '关联', labelStyle: { fill: '#94a3b8', fontSize: 10 }, labelBgStyle: { fill: '#0f1419', fillOpacity: 0.8 } },
  { id: 'e-c-policy', source: 'center', target: 'cat-policy', sourceHandle: 'left', targetHandle: 'right-in', style: animatedEdgeStyle, animated: true, label: '关注', labelStyle: { fill: '#94a3b8', fontSize: 10 }, labelBgStyle: { fill: '#0f1419', fillOpacity: 0.8 } },
  // Tech category to leaves
  { id: 'e-t1', source: 'cat-tech', target: 'leaf-1', sourceHandle: 'right', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-t2', source: 'cat-tech', target: 'leaf-2', sourceHandle: 'right', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-t3', source: 'cat-tech', target: 'leaf-3', sourceHandle: 'right', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  // Product category to leaves
  { id: 'e-p1', source: 'cat-product', target: 'leaf-4', sourceHandle: 'right', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-p2', source: 'cat-product', target: 'leaf-5', sourceHandle: 'right', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-p3', source: 'cat-product', target: 'leaf-6', sourceHandle: 'right', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  // Market category to leaves
  { id: 'e-m1', source: 'cat-market', target: 'leaf-7', sourceHandle: 'left', targetHandle: 'right-in', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-m2', source: 'cat-market', target: 'leaf-8', sourceHandle: 'left', targetHandle: 'right-in', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-m3', source: 'cat-market', target: 'leaf-9', sourceHandle: 'left', targetHandle: 'right-in', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  // Industry category to leaves
  { id: 'e-i1', source: 'cat-industry', target: 'leaf-10', sourceHandle: 'right', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-i2', source: 'cat-industry', target: 'leaf-11', sourceHandle: 'right', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-i3', source: 'cat-industry', target: 'leaf-12', sourceHandle: 'right', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  // Policy category to leaves
  { id: 'e-po1', source: 'cat-policy', target: 'leaf-13', sourceHandle: 'left', targetHandle: 'right-in', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-po2', source: 'cat-policy', target: 'leaf-14', sourceHandle: 'left', targetHandle: 'right-in', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  { id: 'e-po3', source: 'cat-policy', target: 'leaf-15', sourceHandle: 'left', targetHandle: 'right-in', style: edgeStyle, markerEnd: { type: MarkerType.ArrowClosed, color: '#2d3748', width: 10, height: 10 } },
  // Cross-category connections
  { id: 'e-cross-1', source: 'cat-tech', target: 'cat-industry', sourceHandle: 'bottom', targetHandle: 'top-in', style: { ...edgeStyle, strokeDasharray: '5 5' }, label: '促进', labelStyle: { fill: '#64748b', fontSize: 9 }, labelBgStyle: { fill: '#0f1419', fillOpacity: 0.8 } },
];

// Legend data
const legendItems = [
  { label: '技术突破', color: colors['技术突破'] },
  { label: '产品影响', color: colors['产品影响'] },
  { label: '市场反应', color: colors['市场反应'] },
  { label: '行业影响', color: colors['行业影响'] },
  { label: '监管政策', color: colors['监管政策'] },
];

interface GraphViewProps {
  compact?: boolean;
}

export default function GraphView({ compact = false }: GraphViewProps) {
  const [nodes, , onNodesChange] = useNodesState(mockNodes);
  const [edges, , onEdgesChange] = useEdgesState(mockEdges);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node.id, node.data);
  }, []);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={proOptions}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background color="#2d374830" gap={20} size={1} />
        {!compact && <Controls className="!bg-[#1a2332] !border-[#2d3748] !shadow-lg [&>button]:!bg-[#1a2332] [&>button]:!border-[#2d3748] [&>button]:!text-[#94a3b8] [&>button:hover]:!bg-[#1e2d3d]" />}
      </ReactFlow>

      {/* Legend */}
      {!compact && (
        <div className="absolute left-4 top-4 flex items-center gap-3 rounded-lg bg-[#0f1419]/80 px-3 py-2 backdrop-blur-sm">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-[#94a3b8]">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
