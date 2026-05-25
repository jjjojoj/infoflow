import axios from 'axios';
import type { Article, Source, Insight, GraphData, Settings, Paginated, CreateSourceData, Interest, CreateInterestData, ObsidianStatus, DashboardStats } from '../types';

// In dev, Vite proxies /api → http://localhost:8000.
// In Docker, nginx proxies /api → backend:8000.
export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  },
);

// Dashboard
export const getDashboardStats = () =>
  api.get<DashboardStats>('/settings/dashboard');

// Articles
export const getArticles = (params?: { skip?: number; limit?: number; is_bookmarked?: boolean; is_read?: boolean }) =>
  api.get<Paginated<Article>>('/articles', { params });

export const getArticle = (id: number) =>
  api.get<Article>(`/articles/${id}`);

export const bookmarkArticle = (id: number) =>
  api.post<Article>(`/articles/${id}/bookmark`);

export const markRead = (id: number) =>
  api.post<Article>(`/articles/${id}/read`);

// Sources
export const getSources = () =>
  api.get<{ items: Source[]; total: number }>('/sources');

export const createSource = (data: CreateSourceData) =>
  api.post<Source>('/sources', data);

export const updateSource = (id: number, data: Partial<Source>) =>
  api.put<Source>(`/sources/${id}`, data);

export const deleteSource = (id: number) =>
  api.delete(`/sources/${id}`);

export const fetchSource = (id: number) =>
  api.post(`/sources/${id}/fetch`);

// Insights
export const getInsights = () =>
  api.get<Insight[]>('/insights');

export const getGraphData = () =>
  api.get<GraphData>('/insights/graph');

// Settings
export const getSettings = () =>
  api.get<Settings>('/settings');

export const updateSettings = (data: Partial<Settings>) =>
  api.put<Settings>('/settings', data);

// Interests
export const getInterests = () =>
  api.get<{ items: Interest[] }>('/settings/interests');

export const createInterest = (data: CreateInterestData) =>
  api.post<Interest>('/settings/interests', data);

export const updateInterest = (id: number, data: Partial<Interest>) =>
  api.put<Interest>(`/settings/interests/${id}`, data);

export const deleteInterest = (id: number) =>
  api.delete(`/settings/interests/${id}`);

// Obsidian
export const getObsidianStatus = () =>
  api.get<ObsidianStatus>('/obsidian/status');

export const triggerExport = (mode: 'full' | 'incremental') =>
  api.post('/obsidian/export', { mode });

export const updateMOCs = () =>
  api.post('/obsidian/update-mocs');

// LLM
export const testLLMConnection = () =>
  api.post('/settings/test-llm');

// 自然语言生成兴趣点
export const generateInterestsFromDescription = (description: string) =>
  api.post('/settings/interests/generate-from-description', { description });

// Token 用量统计
export const getTokenUsage = (days?: number) =>
  api.get('/stats/token-usage', { params: { days } });

export const getUsageSummary = () =>
  api.get('/stats/token-usage/summary');

export const getUsageByModel = () =>
  api.get('/stats/token-usage/by-model');

// Batch process: translate titles + generate summaries
export const batchProcessArticles = (data: { translate_titles?: boolean; generate_summaries?: boolean; limit?: number }) =>
  api.post('/articles/batch-process', data);

export default api;
