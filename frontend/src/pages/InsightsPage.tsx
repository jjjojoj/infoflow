import { useNavigate } from 'react-router-dom';
import { Lightbulb, FileText, Clock, ChevronRight } from 'lucide-react';

const categoryColors: Record<string, string> = {
  '技术突破': '#6366f1',
  '产品影响': '#818cf8',
  '市场反应': '#f59e0b',
  '行业影响': '#10b981',
  '监管政策': '#ec4899',
};

const mockInsights = [
  {
    id: 1,
    title: 'OpenAI 发布 GPT-4o：多模态能力再突破',
    summary: 'GPT-4o 在文本、图像和音频处理能力上实现重大突破，响应速度更快，多模态理解更精准，为用户提供更自然实时的交互体验。',
    category: '技术突破',
    created_at: '2 小时前',
    related_articles: 28,
    insight_count: 12,
  },
  {
    id: 2,
    title: 'AI 监管趋严：欧盟 AI 法案全球动向',
    summary: '欧盟 AI 法案正式生效，美国、中国等国也相继出台监管框架，全球 AI 治理进入新阶段。企业合规成本上升，但也促进了负责任 AI 发展。',
    category: '监管政策',
    created_at: '昨天',
    related_articles: 15,
    insight_count: 8,
  },
  {
    id: 3,
    title: '特斯拉 FSD V12：端到端神经网络驾驶',
    summary: '特斯拉全自动驾驶系统 V12 版本完全基于端到端神经网络，抛弃传统规则编程，实现了更自然的驾驶行为。',
    category: '技术突破',
    created_at: '2 天前',
    related_articles: 12,
    insight_count: 6,
  },
  {
    id: 4,
    title: 'WWDC24：Apple Intelligence 全面铺开',
    summary: 'Apple 在 WWDC24 上发布 Apple Intelligence，将 AI 深度集成到 iOS、macOS 各项功能中，隐私计算是核心差异化。',
    category: '产品影响',
    created_at: '3 天前',
    related_articles: 20,
    insight_count: 9,
  },
  {
    id: 5,
    title: '开源大模型竞争加剧：Llama 3 vs Mixtral',
    summary: 'Meta 的 Llama 3 和 Mistral 的 Mixtral 在开源社区引发激烈讨论，性能对比测试表明两者各有优势。',
    category: '市场反应',
    created_at: '4 天前',
    related_articles: 18,
    insight_count: 7,
  },
  {
    id: 6,
    title: 'AI 在医疗行业的新突破',
    summary: '多家医疗 AI 公司获得 FDA 批准，AI 辅助诊断准确率已超过部分场景下的人类专家水平。',
    category: '行业影响',
    created_at: '5 天前',
    related_articles: 10,
    insight_count: 5,
  },
];

export default function InsightsPage() {
  const navigate = useNavigate();

  return (
    <section className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#f1f5f9]">我的洞察</h1>
          <p className="mt-1 text-sm text-[#64748b]">基于 AI 分析生成的深度洞察报告</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-[#6366f1]/10 px-3 py-1.5 text-xs text-[#818cf8]">
            <Lightbulb size={12} />
            共 {mockInsights.length} 条洞察
          </span>
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mockInsights.map((insight) => {
          const color = categoryColors[insight.category] || '#6366f1';
          return (
            <div
              key={insight.id}
              onClick={() => navigate(`/articles/${insight.id}`)}
              className="group cursor-pointer rounded-xl border border-[#2d3748] bg-[#1a2332] p-5 transition-all hover:border-[#6366f1]/40 hover:shadow-lg hover:shadow-[#6366f1]/5"
            >
              {/* Category Tag */}
              <div className="mb-3 flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {insight.category}
                </span>
                <ChevronRight size={14} className="text-[#64748b] opacity-0 transition-opacity group-hover:opacity-100" />
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-[#f1f5f9] group-hover:text-[#818cf8] transition-colors">
                {insight.title}
              </h3>

              {/* Summary */}
              <p className="mt-2 text-xs leading-relaxed text-[#94a3b8] line-clamp-2">
                {insight.summary}
              </p>

              {/* Meta */}
              <div className="mt-4 flex items-center gap-4 text-[11px] text-[#64748b]">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {insight.created_at}
                </span>
                <span className="flex items-center gap-1">
                  <FileText size={11} />
                  {insight.related_articles} 篇原文
                </span>
                <span className="flex items-center gap-1">
                  <Lightbulb size={11} />
                  {insight.insight_count} 个关联
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
