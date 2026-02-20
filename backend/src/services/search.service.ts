import { SearchResult, UnifiedSearchResult } from '../adapters/search.adapter';
import { LocalSearchAdapter } from '../adapters/local.adapter';
import { TianxingSearchAdapter } from '../adapters/tianxing.adapter';
import { AISearchAdapter, AIProvider } from '../adapters/ai.adapter';
import { logger } from '../utils/logger';

export class SearchService {
  private localAdapter: LocalSearchAdapter;
  private tianxingAdapter: TianxingSearchAdapter;
  private aiAdapter: AISearchAdapter;

  constructor() {
    this.localAdapter = new LocalSearchAdapter();
    this.tianxingAdapter = new TianxingSearchAdapter();
    // 默认使用MiniMax
    this.aiAdapter = new AISearchAdapter('minimax');
  }

  async search(keyword: string): Promise<UnifiedSearchResult> {
    if (!keyword || keyword.trim() === '') {
      return {
        results: [],
        source: 'local',
        total: 0,
      };
    }

    const trimmedKeyword = keyword.trim();

    // 1. 先查本地数据库
    const localResults = await this.localAdapter.search(trimmedKeyword);
    if (localResults.length > 0) {
      logger.debug(`Local search found ${localResults.length} results for "${trimmedKeyword}"`);
      return {
        results: localResults,
        source: 'local',
        total: localResults.length,
      };
    }

    // 2. 本地无结果，查天行数据API
    const tianxingResults = await this.tianxingAdapter.search(trimmedKeyword);
    if (tianxingResults.length > 0) {
      logger.debug(`Tianxing search found ${tianxingResults.length} results for "${trimmedKeyword}"`);
      return {
        results: tianxingResults,
        source: 'tianxing',
        total: tianxingResults.length,
      };
    }

    // 3. API无结果，AI生成
    const aiResults = await this.aiAdapter.search(trimmedKeyword);
    if (aiResults.length > 0) {
      logger.debug(`AI search found ${aiResults.length} results for "${trimmedKeyword}"`);
      return {
        results: aiResults,
        source: 'ai',
        total: aiResults.length,
      };
    }

    // 4. 都没有结果
    logger.debug(`No results found for "${trimmedKeyword}"`);
    return {
      results: [],
      source: 'ai',
      total: 0,
    };
  }

  // 单独搜索某个来源
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

  // 切换AI供应商
  setAIProvider(provider: AIProvider): void {
    this.aiAdapter = new AISearchAdapter(provider);
  }
}

export const searchService = new SearchService();
