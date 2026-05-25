// Shared TypeScript types for InfoFlow domain entities.

export interface Article {
  id: number;
  title: string;
  url: string;
  content?: string | null;
  summary?: string | null;
  source_name?: string | null;
  source_type?: string | null;
  tags?: string[];
  created_at: string;
  is_read: boolean;
  is_bookmarked: boolean;
  relevance_score: number;
  content_hash?: string | null;
  fetch_method?: string | null;
  community?: string | null;
}

export type SourceType = 'rss' | 'crawler' | 'github' | 'github_trending' | 'arxiv' | 'zhihu' | 'huawei_ascend' | 'custom';

export interface Source {
  id: number;
  name: string;
  url: string;
  source_type: SourceType;
  enabled: boolean;
  fetch_interval: number;
  last_fetched?: string | null;
  status?: 'idle' | 'fetching' | 'success' | 'error';
  config?: Record<string, unknown>;
}

export interface Interest {
  id: number;
  keyword: string;
  weight: number;
  category?: string | null;
  enabled: boolean;
}

export interface Insight {
  id: number;
  article_id: number;
  insight_type: string;
  content: string;
  related_article_ids?: number[];
  created_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'article' | 'tag' | 'source' | 'insight';
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DashboardStats {
  new_articles: number;
  unread: number;
  insights: number;
  active_sources: number;
}

export interface Settings {
  llm_provider?: 'deepseek' | 'openai' | 'ollama' | 'dashscope';
  llm_model?: string;
  llm_api_key?: string;
  llm_base_url?: string;
  llm_temperature?: number;
  llm_max_tokens?: number;
  fetch_interval?: number;
  fetch_mode?: 'continuous' | 'scheduled';
  fetch_start_hour?: number;
  fetch_end_hour?: number;
  scheduler_running?: boolean;
  obsidian_vault_path?: string;
  auto_export?: boolean;
  export_interval?: number;
  deep_mode?: boolean;
  theme?: 'dark' | 'light';
  language?: 'zh' | 'en';
  // Per-provider API keys (for LLM settings page)
  deepseek_api_key?: string;
  openai_api_key?: string;
  dashscope_api_key?: string;
  ollama_base_url?: string;
  ollama_model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface CreateSourceData {
  name: string;
  url: string;
  source_type: SourceType;
  enabled?: boolean;
  fetch_interval?: number;
  config?: Record<string, unknown>;
}

export interface CreateInterestData {
  keyword: string;
  weight: number;
  category: string;
}

export interface ObsidianStatus {
  vault_path: string;
  host_path: string;
  available: boolean;
  note_count: number;
  inbox_count: number;
  areas: Record<string, number>;
  last_updated: string | null;
}

export interface FetchHistory {
  time: string;
  result: 'success' | 'error';
  articles_count: number;
}

export interface Paginated<T> {
  items: T[];
  skip: number;
  limit: number;
  total: number;
}
