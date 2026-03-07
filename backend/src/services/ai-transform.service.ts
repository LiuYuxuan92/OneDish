/**
 * AI 智能食谱转换服务
 * 使用 AI 生成更精细的宝宝版食谱
 * 比规则引擎更智能的食材改编
 */

import { Recipe, BabyVersion, TransformResult, BabyNutritionInfo, SyncCookingInfo } from '../types';
import { RecipePairingEngine, getStageConfig, getStageByAge } from '../utils/recipe-pairing-engine';
import { NutritionCalculator } from '../utils/nutrition-calculator';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { UgcRiskService } from './ugc-risk.service';
import { AISearchAdapter } from '../adapters/ai.adapter';
import { metricsService } from './metrics.service';
import { aiConfigService, AIProvider, UserAIConfig } from './ai-config.service';

// ============================================
// 类型定义
// ============================================

export interface AITransformOptions {
  babyAgeMonths: number;
  familySize?: number;
  includeNutrition?: boolean;
  includeSyncCooking?: boolean;
}

export interface AITransformResult extends TransformResult {
  aiGenerated: boolean;
  costUsd?: number;
}

interface AIBabyVersion {
  age_range: string;
  stage: string;
  texture: string;
  ingredients: Array<{
    name: string;
    amount: string;
    note?: string;
   替代原因?: string;
  }>;
  steps: Array<{
    step: number;
    action: string;
    time: number;
    note?: string;
  }>;
  seasonings?: Array<{
    name: string;
    amount: string;
    note?: string;
  }>;
  nutrition_tips: string;
  allergy_alert: string;
  preparation_notes: string;
}

// ============================================
// 缓存配置
// ============================================

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7天

// 预估成本（基于 token 使用量）
const COST_PER_TRANSFORM = 0.002; // ~$0.002 per transformation

// ============================================
// 服务类
// ============================================

export class AITransformService {
  private aiAdapter: AISearchAdapter;
  private ugcRiskService: UgcRiskService;
  private userConfig: UserAIConfig | null = null;
  private systemProvider: 'minimax' | 'openai';

  /**
   * 创建 AI 转换服务
   * @param provider 系统默认 provider
   * @param userConfig 可选的用户自定义 AI 配置
   */
  constructor(provider: 'minimax' | 'openai' = 'minimax', userConfig?: UserAIConfig | null) {
    this.systemProvider = provider;
    this.aiAdapter = new AISearchAdapter(provider);
    this.ugcRiskService = new UgcRiskService();
    this.userConfig = userConfig || null;
  }

  /**
   * 创建带有用户配置的 AI 转换服务
   */
  static async createWithUserConfig(userId: string): Promise<AITransformService> {
    try {
      // 优先使用用户的活跃 AI 配置
      const userConfig = await aiConfigService.getActiveConfig(userId);
      
      if (userConfig) {
        const provider = mapProviderToSystem(userConfig.provider);
        const service = new AITransformService(provider, userConfig);
        logger.info('Using user custom AI config', { userId, provider: userConfig.provider });
        return service;
      } else {
        // 使用系统默认配置
        return new AITransformService();
      }
    } catch (error) {
      logger.warn('Failed to load user AI config, using system default', { userId, error });
      return new AITransformService();
    }
  }

  /**
   * 使用 AI 生成宝宝版食谱
   * @param adultRecipe 成人食谱
   * @param babyAgeMonths 宝宝月龄
   * @param options 可选参数
   * @returns AI 生成的宝宝版本结果
   */
  async generateBabyVersionWithAI(
    adultRecipe: Recipe,
    babyAgeMonths: number,
    options?: AITransformOptions
  ): Promise<AITransformResult> {
    const { familySize = 2, includeNutrition = true, includeSyncCooking = true } = options || {};

    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(adultRecipe.id, babyAgeMonths);

    try {
      // 1. 检查缓存
      const cached = await this.getCache(cacheKey);
      if (cached) {
        logger.info('Using cached AI transformation', { recipeId: adultRecipe.id, babyAgeMonths });
        return { ...cached, cached: true, aiGenerated: true };
      }

      // 2. 构建 AI Prompt
      const prompt = this.buildPrompt(adultRecipe, babyAgeMonths);

      // 3. 调用 AI 生成
      const aiResult = await this.callAI(prompt);

      if (!aiResult) {
        throw new Error('AI generation failed');
      }

      // 4. 验证安全性
      const riskCheck = this.ugcRiskService.evaluate(aiResult);
      if (!riskCheck.safeForSubmit) {
        const warnings = riskCheck.riskHits.map(h => h.reason).join('; ');
        logger.warn('AI generated content failed safety check', { recipeId: adultRecipe.id, warnings });
        throw new Error(`AI 生成内容包含风险: ${warnings}`);
      }

      // 5. 转换为 BabyVersion 格式
      const babyVersion = this.convertToBabyVersion(aiResult, babyAgeMonths);

      // 6. 计算营养信息
      let nutritionInfo: BabyNutritionInfo | undefined;
      if (includeNutrition) {
        nutritionInfo = NutritionCalculator.calculate(babyVersion.ingredients, babyAgeMonths);
      }

      // 7. 生成同步烹饪建议
      let syncCooking: SyncCookingInfo | undefined;
      if (includeSyncCooking) {
        syncCooking = RecipePairingEngine.generateSyncCookingTips(
          adultRecipe.adult_version.steps,
          babyVersion.steps
        );
      }

      // 8. 组装结果
      const result: AITransformResult = {
        success: true,
        adult_recipe: adultRecipe,
        baby_version: babyVersion,
        nutrition_info: nutritionInfo,
        sync_cooking: syncCooking,
        cached: false,
        aiGenerated: true,
        costUsd: COST_PER_TRANSFORM,
      };

      // 9. 保存缓存
      await this.setCache(cacheKey, result);

      // 10. 记录成本指标
      metricsService.inc('onedish_ai_cost_usd_total', {}, COST_PER_TRANSFORM);

      logger.info('AI transformation completed', { 
        recipeId: adultRecipe.id, 
        babyAgeMonths,
        duration: Date.now() - startTime,
        cost: COST_PER_TRANSFORM,
      });

      return result;
    } catch (error) {
      logger.error('AI transformation failed', { 
        recipeId: adultRecipe.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        adult_recipe: adultRecipe,
        error: error instanceof Error ? error.message : 'AI 转换失败',
        aiGenerated: true,
        costUsd: COST_PER_TRANSFORM,
      };
    }
  }

  /**
   * 构建 AI Prompt
   */
  private buildPrompt(adultRecipe: Recipe, babyAgeMonths: number): string {
    const stage = getStageConfig(babyAgeMonths);
    const adultVersion = adultRecipe.adult_version;

    const ingredientsList = adultVersion.ingredients
      .map(i => `${i.name} ${i.amount}${i.note ? ` (${i.note})` : ''}`)
      .join(', ');

    const stepsList = adultVersion.steps
      .map(s => `${s.step}. ${s.action} (${s.time}分钟)${s.note ? ` - ${s.note}` : ''}`)
      .join('\n');

    const seasoningsList = adultVersion.seasonings
      ?.map(s => `${s.name} ${s.amount}`)
      .join(', ') || '无';

    return `请将以下成人食谱改编为适合${babyAgeMonths}个月宝宝的辅食版本。

## 成人食谱信息
- 菜名: ${adultRecipe.name}
- 准备时间: ${adultRecipe.prep_time}分钟
- 难度: ${adultRecipe.difficulty}

## 食材列表
${ingredientsList}

## 调料列表
${seasoningsList}

## 烹饪步骤
${stepsList}

## 宝宝信息
- 月龄: ${babyAgeMonths}个月
- 发展阶段: ${stage.range}
- 质地要求: ${stage.texture}

## 输出要求
请返回 JSON 格式的宝宝版食谱，包含以下字段：
{
  "age_range": "适合的月龄范围",
  "stage": "阶段标识如 8-10m",
  "texture": "质地描述",
  "ingredients": [
    {
      "name": "食材名称",
      "amount": "用量",
      "note": "处理说明",
      "替代原因": "如有替代说明原因"
    }
  ],
  "steps": [
    {
      "step": 1,
      "action": "烹饪动作",
      "time": 烹饪时间分钟,
      "note": "特别说明"
    }
  ],
  "seasonings": [{"name": "调料", "amount": "用量", "note": "说明"}],
  "nutrition_tips": "营养要点",
  "allergy_alert": "过敏提醒（首次食用需少量尝试）",
  "preparation_notes": "准备要点"
}

请确保：
1. 食材要切碎为${stage.texture}
2. 去除所有可能导致窒息的食物（如整颗坚果）
3. 不添加盐、糖、味精等调料
4. 考虑宝宝的营养均衡
5. 给出食材替代建议（如用天然食材代替调料）
6. 确保烹饪方式安全（蒸、煮为主，避免煎炸）
`;
  }

  /**
   * 调用 AI 生成
   */
  private async callAI(prompt: string): Promise<AIBabyVersion | null> {
    try {
      // 使用 AI adapter 的搜索能力来生成内容
      // 这里我们直接构造一个专门的 prompt
      const results = await this.aiAdapter.search(`Generate baby recipe: ${prompt.slice(0, 200)}`);
      
      if (results.length === 0) {
        // 尝试直接调用
        return await this.callAIDirectly(prompt);
      }

      // 解析 AI 返回的结果
      const firstResult = results[0];
      if (firstResult.ingredients && firstResult.steps) {
        // 转换格式
        return {
          age_range: '',
          stage: '',
          texture: '',
          ingredients: firstResult.ingredients.map((i: string) => {
            const match = i.match(/^(.+?)([\d.]+(?:g|个|杯|勺)?)/);
            return {
              name: match ? match[1].trim() : i,
              amount: match ? match[2] : '适量',
              note: '',
            };
          }),
          steps: firstResult.steps.map((action: string, idx: number) => ({
            step: idx + 1,
            action,
            time: 10,
            note: '',
          })),
          seasonings: [],
          nutrition_tips: '',
          allergy_alert: '',
          preparation_notes: '',
        };
      }

      return null;
    } catch (error) {
      logger.error('AI call failed', { error });
      return null;
    }
  }

  /**
   * 直接调用 AI
   */
  private async callAIDirectly(prompt: string): Promise<AIBabyVersion | null> {
    try {
      const config = this.getAIConfig();
      if (!config.apiKey) {
        logger.warn('AI API key not configured');
        return null;
      }

      logger.info('Calling AI with provider', { provider: config.provider, hasUserConfig: !!this.userConfig });

      // 根据不同 provider 调用不同的 API
      if (config.provider === 'minimax') {
        return await this.callMinimaxAPI(prompt, config);
      } else if (config.provider === 'openai') {
        return await this.callOpenAICompatibleAPI(prompt, config);
      } else {
        // 默认使用 MiniMax
        return await this.callMinimaxAPI(prompt, config);
      }
    } catch (error) {
      logger.error('AI direct call failed', { error });
      return null;
    }
  }

  /**
   * 调用 MiniMax API
   */
  private async callMinimaxAPI(prompt: string, config: { apiKey: string; baseUrl: string; model: string }): Promise<AIBabyVersion | null> {
    try {
      const response = await fetch(`${config.baseUrl}/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: '你是一个专业的宝宝辅食营养师，擅长将成人食谱改编为适合宝宝的安全营养辅食。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        logger.error('MiniMax API error', { status: response.status });
        return null;
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content || '';

      return this.parseAIResponse(content);
    } catch (error) {
      logger.error('MiniMax API call failed', { error });
      return null;
    }
  }

  /**
   * 调用 OpenAI 兼容 API (包括 OpenAI, Claude, Gemini 等)
   */
  private async callOpenAICompatibleAPI(prompt: string, config: { apiKey: string; baseUrl: string; model: string }): Promise<AIBabyVersion | null> {
    try {
      // 检测是否是 Anthropic (Claude)
      if (config.baseUrl.includes('anthropic')) {
        const response = await fetch(`${config.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'user', content: prompt },
            ],
            max_tokens: 4096,
          }),
        });

        if (!response.ok) {
          logger.error('Anthropic API error', { status: response.status });
          return null;
        }

        const data = await response.json() as { content?: Array<{ text?: string }> };
        const content = data.content?.[0]?.text || '';

        return this.parseAIResponse(content);
      }

      // 其他 OpenAI 兼容 API
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: '你是一个专业的宝宝辅食营养师，擅长将成人食谱改编为适合宝宝的安全营养辅食。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        logger.error('OpenAI compatible API error', { status: response.status });
        return null;
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content || '';

      return this.parseAIResponse(content);
    } catch (error) {
      logger.error('OpenAI compatible API call failed', { error });
      return null;
    }
  }

  /**
   * 解析 AI 响应
   */
  private parseAIResponse(content: string): AIBabyVersion | null {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('No JSON found in AI response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // 验证必需字段
      if (!parsed.ingredients || !parsed.steps) {
        logger.error('Invalid AI response format');
        return null;
      }

      return parsed as AIBabyVersion;
    } catch (error) {
      logger.error('Parse AI response error', { error });
      return null;
    }
  }

  /**
   * 转换为 BabyVersion 格式
   */
  private convertToBabyVersion(aiResult: AIBabyVersion, babyAgeMonths: number): BabyVersion {
    const stage = getStageConfig(babyAgeMonths);

    return {
      age_range: aiResult.age_range || stage.range,
      stage: aiResult.stage as any || getStageByAge(babyAgeMonths),
      texture: aiResult.texture || stage.texture,
      ingredients: aiResult.ingredients.map(i => ({
        name: i.name,
        amount: i.amount,
        note: i.note || i.替代原因 || '',
      })),
      steps: aiResult.steps.map(s => ({
        step: s.step,
        action: s.action,
        time: s.time,
        note: s.note || '',
      })),
      seasonings: aiResult.seasonings?.map(s => ({
        name: s.name,
        amount: s.amount,
        note: s.note || '',
      })),
      nutrition_tips: aiResult.nutrition_tips || '',
      allergy_alert: aiResult.allergy_alert || '',
      preparation_notes: aiResult.preparation_notes || '',
    };
  }

  /**
   * 获取 AI 配置（优先使用用户自定义配置）
   */
  private getAIConfig(): { apiKey: string; baseUrl: string; model: string; provider: string } {
    // 如果有用户自定义配置，使用用户配置
    if (this.userConfig) {
      const apiKey = aiConfigService.getDecryptedApiKey(this.userConfig.api_key_encrypted);
      return {
        apiKey,
        baseUrl: this.userConfig.base_url || getDefaultBaseUrl(this.userConfig.provider),
        model: this.userConfig.model || getDefaultModel(this.userConfig.provider),
        provider: this.userConfig.provider,
      };
    }

    // 否则使用系统默认配置
    const provider = process.env.AI_PROVIDER || 'minimax';
    
    switch (provider) {
      case 'minimax':
        return {
          apiKey: process.env.MINIMAX_API_KEY || '',
          baseUrl: process.env.MINIMAX_BASE_URL?.replace('/v1', '') || 'https://api.minimax.chat/v1',
          model: process.env.MINIMAX_MODEL || 'MiniMax-M2.5',
          provider: 'minimax',
        };
      case 'openai':
        return {
          apiKey: process.env.OPENAI_API_KEY || '',
          baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          provider: 'openai',
        };
      default:
        return { apiKey: '', baseUrl: '', model: '', provider: '' };
    }
  }

  /**
   * 获取用户自定义配置信息（用于日志）
   */
  getUserConfigInfo(): { provider?: string; hasUserConfig: boolean } {
    return {
      provider: this.userConfig?.provider,
      hasUserConfig: !!this.userConfig,
    };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(recipeId: string, babyAgeMonths: number): string {
    const userPart = this.userConfig ? `:user_${this.userConfig.id}` : '';
    return `ai_transform:${recipeId}:${babyAgeMonths}${userPart}`;
  }

  /**
   * 获取缓存
   */
  private async getCache(key: string): Promise<AITransformResult | null> {
    try {
      const parts = key.split(':');
      const recipeId = parts[1];
      const babyAgeMonths = parseInt(parts[2], 10);

      const cached = await db('transform_cache')
        .where('recipe_id', recipeId)
        .where('baby_age_months', babyAgeMonths)
        .where('expires_at', '>', new Date().toISOString())
        .first();

      if (cached) {
        const result = JSON.parse(cached.result);
        return { ...result, cached: true };
      }
      return null;
    } catch (error) {
      logger.warn('Failed to read AI transform cache', { error });
      return null;
    }
  }

  /**
   * 设置缓存
   */
  private async setCache(key: string, data: AITransformResult): Promise<void> {
    try {
      const parts = key.split(':');
      const recipeId = parts[1];
      const babyAgeMonths = parseInt(parts[2], 10);
      const expiresAt = new Date(Date.now() + CACHE_TTL).toISOString();

      // 标记为 AI 生成
      const cacheData = { ...data, aiGenerated: true };

      // Upsert: 先删后插
      await db('transform_cache')
        .where('recipe_id', recipeId)
        .where('baby_age_months', babyAgeMonths)
        .delete();

      await db('transform_cache').insert({
        recipe_id: recipeId,
        baby_age_months: babyAgeMonths,
        result: JSON.stringify(cacheData),
        expires_at: expiresAt,
      });
    } catch (error) {
      logger.warn('Failed to write AI transform cache', { error });
    }
  }

  /**
   * 清除缓存
   */
  static async clearCache(recipeId?: string): Promise<void> {
    try {
      if (recipeId) {
        await db('transform_cache').where('recipe_id', recipeId).delete();
      }
    } catch (error) {
      logger.warn('Failed to clear AI transform cache', { error });
    }
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 将用户 AI provider 映射到系统 provider
 */
function mapProviderToSystem(provider: AIProvider): 'minimax' | 'openai' {
  const mapping: Record<string, 'minimax' | 'openai'> = {
    'minimax': 'minimax',
    'openai': 'openai',
    'claude': 'openai', // Claude 暂不支持，使用 OpenAI 兼容
    'gemini': 'openai', // Gemini 暂不支持，使用 OpenAI 兼容
    'doubao': 'openai', // 豆包暂不支持，使用 OpenAI 兼容
    'wenxin': 'openai', // 文心暂不支持，使用 OpenAI 兼容
    'tongyi': 'openai', // 通义暂不支持，使用 OpenAI 兼容
    'hunyuan': 'openai', // 腾讯混元暂不支持，使用 OpenAI 兼容
    'zhipu': 'openai', // 智谱暂不支持，使用 OpenAI 兼容
    'kimi': 'openai', // Kimi 暂不支持，使用 OpenAI 兼容
  };
  return mapping[provider] || 'minimax';
}

/**
 * 获取 provider 的默认 base URL
 */
function getDefaultBaseUrl(provider: AIProvider): string {
  const urls: Record<string, string> = {
    'openai': 'https://api.openai.com/v1',
    'claude': 'https://api.anthropic.com/v1',
    'gemini': 'https://generativelanguage.googleapis.com/v1',
    'minimax': 'https://api.minimax.chat/v1',
    'doubao': 'https://ark.cn-beijing.volces.com/api/v3',
    'wenxin': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    'tongyi': 'https://dashscope.aliyuncs.com/api/v1',
    'hunyuan': 'https://hunyuan.tencentcloudapi.com',
    'zhipu': 'https://open.bigmodel.cn/api/paas/v4',
    'kimi': 'https://api.moonshot.cn/v1',
  };
  return urls[provider] || 'https://api.minimax.chat/v1';
}

/**
 * 获取 provider 的默认模型
 */
function getDefaultModel(provider: AIProvider): string {
  const models: Record<string, string> = {
    'openai': 'gpt-3.5-turbo',
    'claude': 'claude-3-haiku-20240307',
    'gemini': 'gemini-pro',
    'minimax': 'MiniMax-M2.5',
    'doubao': 'doubao-lite-4k',
    'wenxin': 'ernie-lite-8k',
    'tongyi': 'qwen-turbo',
    'hunyuan': 'hunyuan',
    'zhipu': 'glm-4',
    'kimi': 'kimi-latest',
  };
  return models[provider] || 'MiniMax-M2.5';
}

// 导出单例
export const aiTransformService = new AITransformService();

export default AITransformService;
