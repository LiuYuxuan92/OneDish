import { SearchAdapter, SearchResult } from './search.adapter';
import { RecipeService } from '../services/recipe.service';
import { logger } from '../utils/logger';

export class LocalSearchAdapter implements SearchAdapter {
  private recipeService: RecipeService;

  constructor() {
    this.recipeService = new RecipeService();
  }

  async search(keyword: string): Promise<SearchResult[]> {
    try {
      const result = await this.recipeService.searchRecipes({
        keyword,
        page: 1,
        limit: 20,
      });

      return result.items.map((item) => ({
        id: item.id,
        name: this.fixEncoding(item.name),
        source: 'local' as const,
        prep_time: item.prep_time,
        image_url: item.image_url, // 保持数组格式
      }));
    } catch (error) {
      logger.error('Local search error:', error);
      return [];
    }
  }

  private fixEncoding(text: string | undefined): string {
    if (!text) return '';
    
    // 先解码 URL 编码
    try {
      text = decodeURIComponent(text);
    } catch (e) {
      // 如果解码失败，保持原值
      logger.warn('Failed to decode URI:', e);
    }
    
    // 修复常见的编码问题：替换乱码字符
    // 例如："番茄" -> "番茄"
    return text
      .replace(//g, '')  // 移除乱码字符
      .replace(/\uFFFD/g, '')  // 移除替换字符
      .trim();
  }
}
