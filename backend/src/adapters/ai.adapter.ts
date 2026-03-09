import { SearchAdapter, SearchResult } from './search.adapter';
import { logger } from '../utils/logger';

// 动态获取AI供应商配置（延迟加载，确保dotenv已加载）
function getAIProviderConfig(provider: string) {
  switch (provider) {
    case 'minimax':
      return {
        apiKey: process.env.MINIMAX_API_KEY || '',
        baseUrl: process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
        // 使用 Anthropic 兼容模式
        anthropicBaseUrl: 'https://api.minimax.chat/v1',
        model: process.env.MINIMAX_MODEL || 'MiniMax-M2.5',
      };
    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      };
    case 'wenxin':
      return {
        apiKey: process.env.WENXIN_API_KEY || '',
        baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
        model: process.env.WENXIN_MODEL || 'ernie-bot',
      };
    default:
      return { apiKey: '', baseUrl: '', model: '' };
  }
}

export type AIProvider = 'minimax' | 'openai' | 'wenxin';

export class AISearchAdapter implements SearchAdapter {
  private provider: AIProvider;

  constructor(provider: AIProvider = 'minimax') {
    this.provider = provider;
  }

  // 延迟获取配置
  private getConfig() {
    return getAIProviderConfig(this.provider);
  }

  private createTimeoutSignal(timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return {
      signal: controller.signal,
      clear: () => clearTimeout(timeout),
    };
  }

  async search(keyword: string): Promise<SearchResult[]> {
    // 延迟获取配置
    const config = this.getConfig();
  
    // 检查 API Key 是否配置
    if (!config.apiKey) {
      logger.debug('AI API key not configured');
      return [];
    }
  
    logger.info(`🤖 AI 开始搜索：${keyword}`);
    const startTime = Date.now();
  
    try {
      const prompt = this.buildPrompt(keyword);
  
      if (this.provider === 'minimax') {
        logger.debug('调用 MiniMax API...');
        const result = await this.searchWithMinimax(prompt, config);
        logger.info(`✅ AI 搜索完成，耗时：${Date.now() - startTime}ms，找到 ${result.length} 个结果`);
        return result;
      } else if (this.provider === 'openai') {
        logger.debug('调用 OpenAI API...');
        const result = await this.searchWithOpenAI(prompt, config);
        logger.info(`✅ AI 搜索完成，耗时：${Date.now() - startTime}ms，找到 ${result.length} 个结果`);
        return result;
      } else {
        // 暂不支持其他供应商
        return [];
      }
    } catch (error) {
      logger.error('AI search error:', error);
      logger.warn(`⚠️ AI 搜索失败，耗时：${Date.now() - startTime}ms`);
      return [];
    }
  }

  private buildPrompt(keyword: string): string {
    return `请根据"${keyword}"推荐3-5道适合家庭烹饪的菜谱。

请以JSON数组格式返回，每道菜谱包含以下字段：
- name: 菜谱名称
- type: 餐次类型（breakfast早餐、lunch午餐、dinner晚餐）
- prep_time: 准备时间（分钟）
- difficulty: 难度（简单/中等/困难）
- description: 简要描述
- ingredients: 主要食材列表（数组，每项如"鸡蛋2个"）
- steps: 制作步骤列表（数组，每项是一个完整的步骤描述）
- tags: 标签（数组）

只返回JSON数组，不要其他文字。例如：
[{"name":"番茄炒蛋","type":"lunch","prep_time":15,"difficulty":"简单","description":"家常快手菜","ingredients":["鸡蛋2个","番茄1个","盐少许","糖少许"],"steps":["番茄洗净切块，鸡蛋打散备用","热锅下油，先炒鸡蛋至半熟盛出","再下番茄翻炒，加少许盐和糖","放入鸡蛋一起翻炒均匀即可出锅"],"tags":["家常菜","快手菜"]}]`;
  }

  private async searchWithMinimax(prompt: string, config: { apiKey: string; baseUrl: string; model: string; anthropicBaseUrl?: string }): Promise<SearchResult[]> {
    try {
      // 使用 Anthropic 兼容模式
      const baseUrl = config.anthropicBaseUrl || config.baseUrl;

      const request = this.createTimeoutSignal(Number(process.env.SEARCH_AI_TIMEOUT_MS || 1800));
      const response = await fetch(`${baseUrl}/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: '你是一个专业的菜谱推荐助手，擅长推荐适合家庭烹饪的菜谱。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
        signal: request.signal,
      }).finally(() => request.clear());

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('MiniMax API error:', response.status, errorText);
        return [];
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };

      if (data.choices && data.choices[0]) {
        const content = data.choices[0].message?.content || '';
        return this.parseAIResponse(content);
      }

      return [];
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        logger.warn('MiniMax search timeout');
        return [];
      }
      logger.error('MiniMax search error:', error);
      return [];
    }
  }

  private async searchWithOpenAI(prompt: string, config: { apiKey: string; baseUrl: string; model: string }): Promise<SearchResult[]> {
    try {
      const request = this.createTimeoutSignal(Number(process.env.SEARCH_AI_TIMEOUT_MS || 1800));
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: '你是一个专业的菜谱推荐助手，擅长推荐适合家庭烹饪的菜谱。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
        signal: request.signal,
      }).finally(() => request.clear());

      if (!response.ok) {
        logger.error('OpenAI API error:', response.status);
        return [];
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };

      if (data.choices && data.choices[0]) {
        const content = data.choices[0].message?.content || '';
        return this.parseAIResponse(content);
      }

      return [];
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        logger.warn('OpenAI search timeout');
        return [];
      }
      logger.error('OpenAI search error:', error);
      return [];
    }
  }

  private parseAIResponse(content: string): SearchResult[] {
    try {
      // 尝试提取JSON数组
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.error('No JSON array found in AI response');
        return [];
      }

      const recipes = JSON.parse(jsonMatch[0]);

      return recipes.map((item: any, index: number) => ({
        id: `ai_${index}_${Date.now()}`,
        name: this.fixEncoding(item.name || '未知菜谱'),
        source: 'ai' as const,
        type: item.type,
        prep_time: item.prep_time,
        difficulty: item.difficulty,
        description: item.description,
        ingredients: item.ingredients,
        steps: item.steps,
        tags: item.tags,
      }));
    } catch (error) {
      logger.error('Parse AI response error:', error);
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
