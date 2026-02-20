import { SearchAdapter, SearchResult } from './search.adapter';
import { logger } from '../utils/logger';

// 每日免费次数限制
const DAILY_LIMIT = 100;
let dailyUsage = 0;

// 动态获取配置（延迟加载）
function getTianxingConfig() {
  return {
    apiKey: process.env.TIANXING_API_KEY || '',
    baseUrl: 'https://apis.tianapi.com',
    enabled: process.env.TIANXING_ENABLED !== 'false',
  };
}

export class TianxingSearchAdapter implements SearchAdapter {
  async search(keyword: string): Promise<SearchResult[]> {
    // 延迟获取配置
    const config = getTianxingConfig();

    // 检查是否启用
    if (!config.enabled) {
      logger.debug('Tianxing API is disabled');
      return [];
    }

    // 检查API Key是否配置
    if (!config.apiKey) {
      logger.debug('Tianxing API key not configured');
      return [];
    }

    // 检查每日次数限制
    if (dailyUsage >= DAILY_LIMIT) {
      logger.debug('Tianxing API daily limit reached');
      return [];
    }

    try {
      // 使用天行数据菜谱查询API
      const url = `${config.baseUrl}/caipu/index`;
      const params = new URLSearchParams({
        key: config.apiKey,
        word: keyword,
        num: '10',
      });

      const response = await fetch(`${url}?${params}`);

      if (!response.ok) {
        logger.warn('Tianxing API HTTP error:', response.status);
        return [];
      }

      const data = await response.json() as {
        code: number;
        msg?: string;
        result?: {
          list?: any[];
        };
      };

      // 检查 API 返回状态
      if (data.code !== 200) {
        logger.warn('Tianxing API returned non-200 code:', data.code, data.msg);
        return [];
      }

      dailyUsage++;

      // 转换API结果为统一格式
      return this.convertResults(data.result?.list || []);
    } catch (error) {
      logger.error('Tianxing search error:', error);
      return [];
    }
  }

  private convertResults(list: any[]): SearchResult[] {
    return list.map((item, index) => ({
      id: `tianxing_${item.id}_${Date.now()}`,
      name: this.fixEncoding(item.cp_name || item.name || item.title || '未知菜谱'),
      source: 'tianxing' as const,
      type: this.mapType(item.type_name),
      prep_time: item.time || undefined,
      difficulty: this.mapDifficulty(item.diff),
      image_url: item.picurl || item.imgurl ? [item.picurl || item.imgurl] : undefined, // 改为数组格式
      description: item.texing || item.message || item.content || item.description || undefined,
      tags: item.type_name ? [item.type_name] : undefined,
    }));
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

  private mapType(typeStr?: string): string | undefined {
    if (!typeStr) return undefined;
    const type = typeStr.toLowerCase();
    if (type.includes('早餐')) return 'breakfast';
    if (type.includes('午餐') || type.includes('中餐')) return 'lunch';
    if (type.includes('晚餐')) return 'dinner';
    return undefined;
  }

  private mapDifficulty(diffStr?: string | number): string | undefined {
    if (!diffStr) return undefined;
    const diff = String(diffStr).toLowerCase();
    if (diff.includes('简单') || diff === '1') return '简单';
    if (diff.includes('中等') || diff === '2') return '中等';
    if (diff.includes('困难') || diff === '3') return '困难';
    return undefined;
  }

  // 获取当日使用次数（用于监控）
  static getDailyUsage(): number {
    return dailyUsage;
  }

  // 重置每日计数（每天调用一次）
  static resetDailyUsage(): void {
    dailyUsage = 0;
  }
}
