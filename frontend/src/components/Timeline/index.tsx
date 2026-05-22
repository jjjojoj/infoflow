import { useEffect, useState } from 'react';
import { Hash, Clock, Loader2 } from 'lucide-react';
import { getArticles } from '../../services/api';
import type { Article } from '../../types';

export default function Timeline() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const res = await getArticles({ limit: 7 });
        setArticles(res.data.items ?? []);
      } catch (err) {
        console.error('Failed to fetch timeline articles:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-[#6366f1]" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-xs text-[#64748b]">
        暂无近期文章
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {articles.map((article, idx) => {
        const date = new Date(article.created_at);
        const isToday = new Date().toDateString() === date.toDateString();

        return (
          <div key={article.id} className="group flex gap-3 px-3 py-2 rounded-lg hover:bg-[#1a2332] transition-colors">
            {/* Time indicator */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-medium text-[#64748b]">
                {isToday ? '今天' : date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[10px] text-[#4a5568]">
                {date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Dot */}
            <div className="flex flex-col items-center pt-1">
              <div className={`h-2 w-2 rounded-full ${idx === 0 ? 'bg-[#6366f1]' : 'bg-[#2d3748]'}`} />
              {idx < articles.length - 1 && <div className="mt-1 h-full w-px bg-[#2d3748]" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#f1f5f9] truncate group-hover:text-[#818cf8] transition-colors">
                {article.title}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#64748b]">
                <span>{article.source_name || ''}</span>
                {article.tags && article.tags.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Hash size={8} />
                    {article.tags[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
