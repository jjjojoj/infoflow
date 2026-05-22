import { useState, useEffect, useCallback } from 'react';
import type { Article, Paginated } from '../types';
import { getArticles, getArticle } from '../services/api';

export function useArticles(params?: { skip?: number; limit?: number; is_bookmarked?: boolean }) {
  const [data, setData] = useState<Paginated<Article> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getArticles(params);
      setData(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  }, [params?.skip, params?.limit, params?.is_bookmarked]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useArticle(id: number | string | undefined) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getArticle(Number(id))
      .then((res) => setArticle(res.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to fetch article'))
      .finally(() => setLoading(false));
  }, [id]);

  return { article, loading, error };
}
