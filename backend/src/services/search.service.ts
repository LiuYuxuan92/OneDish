import { SearchResult, UnifiedSearchResult } from '../adapters/search.adapter';
import { LocalSearchAdapter } from '../adapters/local.adapter';
import { TianxingSearchAdapter } from '../adapters/tianxing.adapter';
import { AISearchAdapter, AIProvider } from '../adapters/ai.adapter';
import { logger } from '../utils/logger';
import { quotaService } from './quota.service';
import { metricsService } from './metrics.service';
import { redisService } from './redis.service';

export interface ResolveRequest {
  query: string;
  intent_type?: string;
  freshness_required?: boolean;
  user_tier?: 'free' | 'pro' | 'enterprise';
  context?: unknown;
  force_refresh?: boolean;
  user_id?: string;
}

export class SearchService {
  private localAdapter: LocalSearchAdapter;
  private tianxingAdapter: TianxingSearchAdapter;
  private aiAdapter: AISearchAdapter;
  private cache = new Map<string, { data: SearchResult[]; expiresAt: number }>();

  constructor() {
    this.localAdapter = new LocalSearchAdapter();
    this.tianxingAdapter = new TianxingSearchAdapter();
    this.aiAdapter = new AISearchAdapter('minimax');
  }

  async resolve(req: ResolveRequest): Promise<{ items: SearchResult[]; route_used: 'local' | 'cache' | 'web' | 'ai'; cache_hit: boolean; degrade_level: number }> {
    const query = (req.query || '').trim();
    const tier = req.user_tier || 'free';
    const userId = req.user_id || 'anonymous';

    if (!query) {
      return { items: [], route_used: 'local', cache_hit: false, degrade_level: 0 };
    }

    const cacheKey = quotaService.makeSearchCacheKey(query, req.context, tier);
    const cacheStart = Date.now();
    const cached = req.force_refresh ? null : await this.getCache(cacheKey);
    if (cached) {
      metricsService.inc('onedish_cache_hit_total', { layer: 'l2', key_type: 'search' });
      metricsService.observe('onedish_cache_latency_ms', { layer: 'l2', op: 'get' }, Date.now() - cacheStart);
      metricsService.inc('onedish_router_route_total', { route_used: 'cache', intent_type: req.intent_type || 'unknown' });
      return { items: cached, route_used: 'cache', cache_hit: true, degrade_level: 0 };
    }
    metricsService.inc('onedish_cache_miss_total', { layer: 'l2', key_type: 'search' });
    metricsService.observe('onedish_cache_latency_ms', { layer: 'l2', op: 'get' }, Date.now() - cacheStart);

    const localResults = await this.localAdapter.search(query);
    if (localResults.length > 0) {
      metricsService.inc('onedish_router_route_total', { route_used: 'local', intent_type: req.intent_type || 'unknown' });
      await this.setCache(cacheKey, localResults, 30 * 60 * 1000);
      return { items: localResults, route_used: 'local', cache_hit: false, degrade_level: 0 };
    }

    const webQuota = await quotaService.consume(userId, tier, 'web');
    if (webQuota.allowed) {
      const webStart = Date.now();
      const webResults = await this.tianxingAdapter.search(query);
      metricsService.inc('onedish_quota_user_used_total', { channel: 'search', type: 'web', tier });
      metricsService.inc('onedish_quota_global_used_total', { type: 'web' });
      metricsService.inc('onedish_upstream_requests_total', { provider: 'tianxing', endpoint: 'search', status: String(webResults.length > 0 ? 200 : 204) });
      metricsService.observe('onedish_upstream_latency_ms', { provider: 'tianxing', endpoint: 'search' }, Date.now() - webStart);
      if (webResults.length > 0) {
        metricsService.inc('onedish_router_route_total', { route_used: 'web', intent_type: req.intent_type || 'unknown' });
        await this.setCache(cacheKey, webResults, 10 * 60 * 1000);
        return { items: webResults, route_used: 'web', cache_hit: false, degrade_level: 0 };
      }
    } else {
      metricsService.inc('onedish_quota_reject_total', { level: webQuota.reason || 'user', user_tier: tier, type: 'web' });
    }

    const aiQuota = await quotaService.consume(userId, tier, 'ai');
    if (aiQuota.allowed) {
      const aiStart = Date.now();
      const aiResults = await this.aiAdapter.search(query);
      metricsService.inc('onedish_quota_user_used_total', { channel: 'search', type: 'ai', tier });
      metricsService.inc('onedish_quota_global_used_total', { type: 'ai' });
      metricsService.inc('onedish_upstream_requests_total', { provider: 'ai', endpoint: 'search', status: String(aiResults.length > 0 ? 200 : 204) });
      metricsService.observe('onedish_upstream_latency_ms', { provider: 'ai', endpoint: 'search' }, Date.now() - aiStart);
      if (aiResults.length > 0) {
        metricsService.inc('onedish_router_route_total', { route_used: 'ai', intent_type: req.intent_type || 'unknown' });
        await this.setCache(cacheKey, aiResults, 30 * 60 * 1000);
        return { items: aiResults, route_used: 'ai', cache_hit: false, degrade_level: 0 };
      }
    } else {
      metricsService.inc('onedish_quota_reject_total', { level: aiQuota.reason || 'user', user_tier: tier, type: 'ai' });
    }

    metricsService.inc('onedish_router_degrade_total', { degrade_level: '2', reason: 'no_route_or_quota' });
    return { items: [], route_used: 'local', cache_hit: false, degrade_level: 2 };
  }

  async search(keyword: string): Promise<UnifiedSearchResult> {
    const result = await this.resolve({ query: keyword, intent_type: 'search', user_tier: 'free', user_id: 'anonymous' });
    return {
      results: result.items,
      source: result.route_used === 'web' ? 'tianxing' : result.route_used,
      total: result.items.length,
    } as UnifiedSearchResult;
  }

  async searchFromSource(keyword: string, source: 'local' | 'tianxing' | 'ai'): Promise<SearchResult[]> {
    const trimmedKeyword = keyword.trim();

    switch (source) {
      case 'local':
        return await this.localAdapter.search(trimmedKeyword);
      case 'tianxing':
        return await this.tianxingAdapter.search(trimmedKeyword);
      case 'ai':
        return await this.aiAdapter.search(trimmedKeyword);
      default:
        return [];
    }
  }

  setAIProvider(provider: AIProvider): void {
    this.aiAdapter = new AISearchAdapter(provider);
  }

  private async getCache(key: string): Promise<SearchResult[] | null> {
    const redisCached = await redisService.getJson<SearchResult[]>(key);
    if (redisCached) {
      return redisCached;
    }

    const memoryCached = this.cache.get(key);
    if (memoryCached && memoryCached.expiresAt > Date.now()) {
      return memoryCached.data;
    }

    if (memoryCached && memoryCached.expiresAt <= Date.now()) {
      this.cache.delete(key);
    }

    return null;
  }

  private async setCache(key: string, data: SearchResult[], ttlMs: number): Promise<void> {
    const ttlSec = Math.max(1, Math.floor(ttlMs / 1000));
    const redisSet = await redisService.setJson(key, data, ttlSec);
    if (!redisSet) {
      this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    }
    metricsService.observe('onedish_cache_latency_ms', { layer: 'l2', op: 'set' }, 1);
  }
}

export const searchService = new SearchService();
