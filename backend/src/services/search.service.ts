import { SearchResult, UnifiedSearchResult } from '../adapters/search.adapter';
import { LocalSearchAdapter } from '../adapters/local.adapter';
import { TianxingSearchAdapter } from '../adapters/tianxing.adapter';
import { AISearchAdapter, AIProvider } from '../adapters/ai.adapter';
import { logger } from '../utils/logger';
import { quotaService } from './quota.service';
import { metricsService } from './metrics.service';
import { redisService } from './redis.service';
import { searchRankingService } from './search-ranking.service';
import { feedingFeedbackService } from './feedingFeedback.service';
import { feedingExplanationGenerator, FeedingExplanation } from './feeding-explanation-generator.service';

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

  private async withTimeout<T>(task: Promise<T>, timeoutMs: number, fallbackValue: T, label: string): Promise<T> {
    let timer: NodeJS.Timeout | null = null;
    try {
      return await Promise.race([
        task,
        new Promise<T>((resolve) => {
          timer = setTimeout(() => {
            logger.warn(`${label} timed out`, { timeout_ms: timeoutMs });
            resolve(fallbackValue);
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
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
      const webResults = await this.withTimeout(
        this.tianxingAdapter.search(query),
        Number(process.env.SEARCH_WEB_TIMEOUT_MS || 1500),
        [],
        'Tianxing search'
      );
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
      const aiResults = await this.withTimeout(
        this.aiAdapter.search(query),
        Number(process.env.SEARCH_AI_TIMEOUT_MS || 1800),
        [],
        'AI search'
      );
      metricsService.inc('onedish_quota_user_used_total', { channel: 'search', type: 'ai', tier });
      metricsService.inc('onedish_quota_global_used_total', { type: 'ai' });
      // 最小可行预算指标：按每次 AI 请求估算固定成本（USD）
      metricsService.inc('onedish_ai_cost_usd_total', { provider: 'ai', endpoint: 'search', tier }, 0.002);
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

  async search(keyword: string, options?: { userId?: string; inventoryIngredients?: string[]; scenario?: string }): Promise<UnifiedSearchResult> {
    const result = await this.resolve({ query: keyword, intent_type: 'search', user_tier: 'free', user_id: options?.userId || 'anonymous' });
    const ranked = await searchRankingService.rank(result.items, {
      userId: options?.userId,
      keyword,
      inventoryIngredients: options?.inventoryIngredients,
      scenario: options?.scenario,
      source: result.route_used,
    });

    // 注入 feeding_explanation（可降级）
    const enriched = await this.enrichWithFeedingExplanation(ranked, options?.userId);

    return {
      results: enriched,
      source: result.route_used === 'web' ? 'tianxing' : result.route_used,
      route_source: result.route_used,
      total: enriched.length,
    } as UnifiedSearchResult;
  }

  async searchFromSource(keyword: string, source: 'local' | 'tianxing' | 'ai', options?: { userId?: string; inventoryIngredients?: string[]; scenario?: string }): Promise<SearchResult[]> {
    const trimmedKeyword = keyword.trim();
    let results: SearchResult[] = [];

    switch (source) {
      case 'local':
        results = await this.localAdapter.search(trimmedKeyword);
        break;
      case 'tianxing':
        results = await this.withTimeout(
          this.tianxingAdapter.search(trimmedKeyword),
          Number(process.env.SEARCH_WEB_TIMEOUT_MS || 1500),
          [],
          'Tianxing search'
        );
        break;
      case 'ai':
        results = await this.withTimeout(
          this.aiAdapter.search(trimmedKeyword),
          Number(process.env.SEARCH_AI_TIMEOUT_MS || 1800),
          [],
          'AI search'
        );
        break;
      default:
        results = [];
    }

    const ranked = await searchRankingService.rank(results, {
      userId: options?.userId,
      keyword,
      inventoryIngredients: options?.inventoryIngredients,
      scenario: options?.scenario,
      source,
    });

    // 注入 feeding_explanation（可降级）
    return await this.enrichWithFeedingExplanation(ranked, options?.userId);
  }

  /**
   * 为搜索结果注入喂养反馈解释
   * 批量获取 feeding summary 并生成 explanation
   * 降级策略：服务异常时不阻断搜索主流程
   */
  private async enrichWithFeedingExplanation(
    results: SearchResult[],
    userId?: string
  ): Promise<SearchResult[]> {
    // 无用户ID或无结果，直接返回
    if (!userId || !results.length) {
      return results;
    }

    // 提取 recipe_id 列表（支持 id 或 recipe_id 字段）
    const recipeIds = results
      .map((r) => r.id || (r as any).recipe_id)
      .filter((id): id is string => Boolean(id))
      .slice(0, 50); // 最多50个

    if (!recipeIds.length) {
      return results;
    }

    // 尝试批量获取 feeding summary（500ms 超时降级）
    let feedingSummaryMap: Map<string, any> = new Map();
    try {
      const timeoutMs = 500;
      feedingSummaryMap = await Promise.race([
        feedingFeedbackService.batchGetRecipeSummaries({ user_id: userId, recipe_ids: recipeIds }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
        ),
      ]);
    } catch (error) {
      logger.warn('Failed to get feeding summary, fallback to no explanation', {
        error: error?.message,
        recipeCount: results.length,
        userId,
      });
      // 降级：返回无 feeding_explanation 的结果
      return results;
    }

    // 为每个结果生成 feeding_explanation
    return results.map((recipe) => {
      const recipeId = recipe.id || (recipe as any).recipe_id;
      const summary = recipeId ? feedingSummaryMap.get(recipeId) || null : null;
      const explanation: FeedingExplanation | null = summary
        ? feedingExplanationGenerator.generate(summary)
        : null;

      return {
        ...recipe,
        // feeding_explanation: null 表示无历史数据，undefined 表示服务降级
        // 为保持一致，明确返回 null 而非 undefined
        feeding_explanation: explanation === null ? null : explanation,
      };
    });
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
