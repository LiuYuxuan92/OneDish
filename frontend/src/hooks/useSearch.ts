import { useQuery } from '@tanstack/react-query';
import { searchApi, SearchResult, UnifiedSearchResult } from '../api/search';
import { trackEvent } from '../analytics/sdk';

// 统一搜索（联网搜索）
export function useUnifiedSearch(keyword?: string) {
  return useQuery<UnifiedSearchResult>({
    queryKey: ['search', 'unified', keyword],
    queryFn: async () => {
      try {
        const result = await searchApi.search(keyword!);

        if (result.code && result.code !== 200) {
          console.error('[useUnifiedSearch] API error:', result.message);
          return { results: [], source: 'local', route_source: 'local', total: 0 };
        }

        const data = result.data || { results: [], source: 'local', route_source: 'local', total: 0 };
        return data;
      } catch (error: any) {
        console.error('[useUnifiedSearch] Error:', error);
        trackEvent('api_request_failed', {
          page_id: 'search',
          api_name: 'GET /search',
          http_status: error?.http_status,
          error_code: error?.code,
        });
        return { results: [], source: 'local', route_source: 'local', total: 0, error: String(error) };
      }
    },
    enabled: !!keyword && keyword.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5分钟
    retry: 2,
  });
}

// 指定来源搜索
export function useSourceSearch(keyword?: string, source?: 'local' | 'tianxing' | 'ai') {
  return useQuery({
    queryKey: ['search', source, keyword],
    queryFn: async () => {
      try {
        const result = await searchApi.searchFromSource(keyword!, source!);

        if (result.code && result.code !== 200) {
          console.error('[useSourceSearch] API error:', result.message);
          return { results: [], source: source || 'local', route_source: source || 'local', total: 0 };
        }

        const data = result.data || { results: [], source: source || 'local', route_source: source || 'local', total: 0 };
        return data;
      } catch (error: any) {
        console.error('[useSourceSearch] Error:', error);
        trackEvent('api_request_failed', {
          page_id: 'search',
          api_name: `GET /search/source/${source || 'unknown'}`,
          http_status: error?.http_status,
          error_code: error?.code,
        });
        return { results: [], source: source || 'local', route_source: source || 'local', total: 0, error: String(error) };
      }
    },
    enabled: !!keyword && !!source && keyword.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
