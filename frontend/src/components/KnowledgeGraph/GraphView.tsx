import { useEffect, useState, useMemo, useCallback } from 'react';
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  ConnectionMode,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CenterNode from './nodes/CenterNode';
import CategoryNode from './nodes/CategoryNode';
import LeafNode from './nodes/LeafNode';
import { getArticles } from '../../services/api';
import type { Article } from '../../types';
import { formatSourceName } from '../../utils/sourceDisplay';

const nodeTypes = {
  centerNode: CenterNode,
  categoryNode: CategoryNode,
  leafNode: LeafNode,
};

// Map arxiv categories to readable names
const CATEGORY_LABELS: Record<string, string> = {
  'cs.CV': '计算机视觉',
  'cs.AI': '人工智能',
  'cs.LG': '机器学习',
  'cs.CL': 'NLP',
  'cs.RO': '机器人',
  'cs.MM': '多媒体',
  'cs.HC': '人机交互',
  'cs.SE': '软件工程',
  'cs.CR': '密码安全',
  'cs.NE': '神经计算',
  arxiv: 'arXiv 论文',
  github: 'GitHub 热门',
  github_trending: 'GitHub 热门',
  zhihu: '知乎',
  huawei_ascend: '昇腾社区',
  rss: 'RSS',
  other: '其他',
};

// Build graph data from real articles - group by tags for richer visualization
function buildGraph(articles: Article[]): { nodes: Node[]; edges: Edge[] } {
  if (articles.length === 0) return { nodes: [], edges: [] };

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Center node: "InfoFlow" as hub
  nodes.push({
    id: 'center',
    type: 'centerNode',
    position: { x: 600, y: 450 },
    data: {
      label: 'InfoFlow',
      subtitle: `${articles.length} 篇文章`,
      time: new Date().toLocaleDateString('zh-CN'),
    },
  });

  // Skip generic tags like 'arxiv' - prefer specific topic tags
  const SKIP_TAGS = ['arxiv', 'github', 'other'];
  
  // Group articles by their first meaningful tag
  const groups: Record<string, Article[]> = {};
  articles.forEach((a) => {
    const tags: string[] = a.tags || [];
    let key = a.source_name || 'other';
    for (const t of tags) {
      if (CATEGORY_LABELS[t] && !SKIP_TAGS.includes(t)) {
        key = t;
        break;
      }
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  // Sort groups by size, take top 8
  const groupEntries = Object.entries(groups)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8);

  const colors = ['#6366f1', '#818cf8', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f97316', '#a78bfa'];

  // Adaptive radius based on number of groups and leaves
  const catRadius = Math.max(320, groupEntries.length * 50);
  const maxLeavesPerGroup = 3;

  groupEntries.forEach(([key, groupArticles], i) => {
    const angle = (i * 360 / groupEntries.length) * (Math.PI / 180) - Math.PI / 2;
    const cx = 600 + Math.cos(angle) * catRadius;
    const cy = 450 + Math.sin(angle) * catRadius;
    const color = colors[i % colors.length];
    const label = CATEGORY_LABELS[key] || key;

    nodes.push({
      id: `cat-${i}`,
      type: 'categoryNode',
      position: { x: cx, y: cy },
      data: {
        label,
        subtitle: `${groupArticles.length} 篇文章`,
        color,
        insightCount: groupArticles.length,
        icon: label,
      },
    });

    edges.push({
      id: `e-c-${i}`,
      source: 'center',
      target: `cat-${i}`,
      animated: true,
      style: { stroke: `${color}80`, strokeWidth: 2 },
      label: `${groupArticles.length}篇`,
      labelStyle: { fill: '#94a3b8', fontSize: 10 },
      labelBgStyle: { fill: '#0f1419', fillOpacity: 0.8 },
    });

    // Leaf nodes - spread wider to avoid overlap
    const leafCount = Math.min(maxLeavesPerGroup, groupArticles.length);
    const leafSpread = Math.max(0.5, leafCount * 0.25); // wider spread per leaf
    const leafRadius = catRadius + 220;

    groupArticles.slice(0, maxLeavesPerGroup).forEach((a, j) => {
      const leafAngle = angle + (j - (leafCount - 1) / 2) * leafSpread;
      const lx = 600 + Math.cos(leafAngle) * leafRadius;
      const ly = 450 + Math.sin(leafAngle) * leafRadius;

      const shortTitle = a.title.length > 20 ? a.title.slice(0, 20) + '...' : a.title;
      nodes.push({
        id: `leaf-${i}-${j}`,
        type: 'leafNode',
        position: { x: lx, y: ly },
        data: { label: shortTitle, color },
      });

      edges.push({
        id: `e-${i}-${j}`,
        source: `cat-${i}`,
        target: `leaf-${i}-${j}`,
        style: { stroke: `${color}40`, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: `${color}60`, width: 10, height: 10 },
      });
    });
  });

  console.log(`[GraphView] Built ${nodes.length} nodes, ${edges.length} edges from ${articles.length} articles, ${groupEntries.length} groups`);
  return { nodes, edges };
}

interface GraphViewProps {
  compact?: boolean;
}

export default function GraphView({ compact = false }: GraphViewProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const res = await getArticles({ limit: 50 });
        const items = res.data.items ?? [];
        console.log(`[GraphView] Fetched ${items.length} articles`);
        setArticles(items);
      } catch (err) {
        console.error('[GraphView] Failed to fetch articles:', err);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, []);

  // Sync built graph data into ReactFlow state
  useEffect(() => {
    const { nodes: builtNodes, edges: builtEdges } = buildGraph(articles);
    setNodes(builtNodes);
    setEdges(builtEdges);
  }, [articles, setNodes, setEdges]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  // Build legend from actual group data
  const legendItems = useMemo(() => {
    const skipTags = ['arxiv', 'github', 'other'];
    const groups: Record<string, string> = {};
    const colors = ['#6366f1', '#818cf8', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f97316', '#a78bfa'];
    articles.forEach((a) => {
      const tags: string[] = a.tags || [];
      let key = a.source_name || 'other';
      for (const t of tags) {
        if (CATEGORY_LABELS[t] && !skipTags.includes(t)) {
          key = t;
          break;
        }
      }
      if (!groups[key]) groups[key] = CATEGORY_LABELS[key] || formatSourceName(key);
    });
    return Object.entries(groups).map(([key, label], i) => ({
      label,
      color: colors[i % colors.length],
    }));
  }, [articles]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[#64748b] text-sm">
        加载中...
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[#64748b] text-sm">
        暂无文章数据，请先添加信息源并采集文章
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
      {!compact && legendItems.length > 0 && (
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
