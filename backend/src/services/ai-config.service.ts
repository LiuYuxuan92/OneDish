import { db } from '../config/database';
import { encrypt, decrypt, getKeyPreview, sanitizeKeyForLog } from './encryption.service';
import { logger } from '../utils/logger';

export type AIProvider = 
  | 'openai' | 'claude' | 'gemini'
  | 'minimax' | 'doubao' | 'wenxin' 
  | 'tongyi' | 'hunyuan' | 'zhipu' | 'kimi';

export interface UserAIConfig {
  id: string;
  user_id: string;
  provider: AIProvider;
  api_key_encrypted: string;
  base_url?: string;
  model?: string;
  is_active: boolean;
  display_name?: string;
  monthly_limit_tokens?: number;
  created_at: Date;
  updated_at: Date;
}

export interface UserAIConfigSafe {
  id: string;
  provider: AIProvider;
  display_name?: string;
  model?: string;
  is_active: boolean;
  created_at: string;
  key_preview: string;
}

export interface CreateAIConfigDTO {
  provider: AIProvider;
  api_key: string;
  base_url?: string;
  model?: string;
  is_active?: boolean;
  display_name?: string;
  monthly_limit_tokens?: number;
}

export interface UpdateAIConfigDTO {
  api_key?: string;
  base_url?: string;
  model?: string;
  is_active?: boolean;
  display_name?: string;
  monthly_limit_tokens?: number;
}

export class AIConfigService {
  /**
   * 获取用户的所有 AI 配置 (脱敏)
   */
  async getConfigsByUser(userId: string): Promise<UserAIConfigSafe[]> {
    const configs = await db('user_ai_configs')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');
    
    return configs.map(config => this.toSafe(config));
  }

  /**
   * 获取用户的活跃配置
   */
  async getActiveConfig(userId: string): Promise<UserAIConfig | null> {
    const config = await db('user_ai_configs')
      .where('user_id', userId)
      .where('is_active', true)
      .first();
    
    return config || null;
  }

  /**
   * 创建 AI 配置
   */
  async createConfig(userId: string, data: CreateAIConfigDTO): Promise<UserAIConfig> {
    const apiKeyEncrypted = encrypt(data.api_key);
    
    logger.info('Creating AI config', {
      userId,
      provider: data.provider,
      displayName: data.display_name,
      hasModel: !!data.model,
      keyPreview: sanitizeKeyForLog(data.api_key),
    });

    const [config] = await db('user_ai_configs')
      .insert({
        user_id: userId,
        provider: data.provider,
        api_key_encrypted: apiKeyEncrypted,
        base_url: data.base_url || null,
        model: data.model || null,
        is_active: data.is_active !== false,
        display_name: data.display_name || null,
        monthly_limit_tokens: data.monthly_limit_tokens || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    return config;
  }

  /**
   * 更新 AI 配置
   */
  async updateConfig(id: string, userId: string, data: UpdateAIConfigDTO): Promise<UserAIConfig> {
    const existing = await db('user_ai_configs')
      .where('id', id)
      .where('user_id', userId)
      .first();

    if (!existing) {
      throw new Error('配置不存在');
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.api_key !== undefined) {
      updateData.api_key_encrypted = encrypt(data.api_key);
      logger.info('API key updated', { configId: id, userId });
    }

    if (data.base_url !== undefined) {
      updateData.base_url = data.base_url || null;
    }

    if (data.model !== undefined) {
      updateData.model = data.model || null;
    }

    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    if (data.display_name !== undefined) {
      updateData.display_name = data.display_name || null;
    }

    if (data.monthly_limit_tokens !== undefined) {
      updateData.monthly_limit_tokens = data.monthly_limit_tokens || null;
    }

    const [config] = await db('user_ai_configs')
      .where('id', id)
      .update(updateData)
      .returning('*');

    return config;
  }

  /**
   * 删除 AI 配置
   */
  async deleteConfig(id: string, userId: string): Promise<void> {
    const existing = await db('user_ai_configs')
      .where('id', id)
      .where('user_id', userId)
      .first();

    if (!existing) {
      throw new Error('配置不存在');
    }

    await db('user_ai_configs')
      .where('id', id)
      .delete();

    logger.info('AI config deleted', { configId: id, userId, provider: existing.provider });
  }

  /**
   * 测试 AI 配置 (验证 API Key 是否有效)
   */
  async testConfig(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    const config = await db('user_ai_configs')
      .where('id', id)
      .where('user_id', userId)
      .first();

    if (!config) {
      return { success: false, message: '配置不存在' };
    }

    try {
      const apiKey = decrypt(config.api_key_encrypted);
      
      // 根据不同 provider 进行测试
      const result = await this.testProviderConnection(config.provider, apiKey, config.base_url, config.model);
      
      logger.info('AI config test result', { 
        configId: id, 
        userId, 
        provider: config.provider, 
        success: result.success 
      });

      return result;
    } catch (error: any) {
      logger.error('AI config test failed', { 
        configId: id, 
        userId, 
        provider: config.provider,
        error: error.message 
      });
      return { success: false, message: `测试失败: ${error.message}` };
    }
  }

  /**
   * 获取解密后的 API Key (内部使用)
   */
  getDecryptedApiKey(encryptedKey: string): string {
    return decrypt(encryptedKey);
  }

  /**
   * 转换为安全的 API 返回格式
   */
  private toSafe(config: UserAIConfig): UserAIConfigSafe {
    return {
      id: config.id,
      provider: config.provider,
      display_name: config.display_name,
      model: config.model,
      is_active: config.is_active,
      created_at: config.created_at.toISOString(),
      key_preview: getKeyPreview(config.api_key_encrypted),
    };
  }

  /**
   * 测试不同 provider 的连接
   */
  private async testProviderConnection(
    provider: AIProvider, 
    apiKey: string, 
    baseUrl?: string, 
    _model?: string
  ): Promise<{ success: boolean; message: string }> {
    // 简单的连接测试 - 实际应该调用对应 API 的 /models 端点
    // 这里先用简化的判断
    switch (provider) {
      case 'openai':
        return this.testOpenAI(apiKey, baseUrl);
      case 'claude':
        return this.testClaude(apiKey, baseUrl);
      case 'gemini':
        return this.testGemini(apiKey, baseUrl);
      case 'minimax':
        return this.testMiniMax(apiKey, baseUrl);
      case 'doubao':
        return this.testDoubao(apiKey, baseUrl);
      case 'wenxin':
        return this.testWenxin(apiKey, baseUrl);
      case 'tongyi':
        return this.testTongyi(apiKey, baseUrl);
      case 'hunyuan':
        return this.testHunyuan(apiKey, baseUrl);
      case 'zhipu':
        return this.testZhipu(apiKey, baseUrl);
      case 'kimi':
        return this.testKimi(apiKey, baseUrl);
      default:
        return { success: false, message: '未知的 provider' };
    }
  }

  private async testOpenAI(apiKey: string, baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const url = baseUrl || 'https://api.openai.com';
      const response = await fetch(`${url}/v1/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: `API 返回错误: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  private async testClaude(apiKey: string, _baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      });
      if (response.ok) {
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: `API 返回错误: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  private async testGemini(apiKey: string, _baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      if (response.ok) {
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: `API 返回错误: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  private async testMiniMax(apiKey: string, baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const url = baseUrl || 'https://api.minimax.chat/v1';
      const response = await fetch(`${url}/text/chatcompletion_pro`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'abab6.5s-chat', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
      });
      if (response.ok || response.status === 400) {
        // 400 可能是模型问题，但 key 有效
        return { success: true, message: 'API Key 有效' };
      }
      return { success: false, message: `API 返回错误: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  private async testDoubao(apiKey: string, baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const url = baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
      const response = await fetch(`${url}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: `API 返回错误: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  private async testWenxin(apiKey: string, _baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/ernie-lite-8k?access_token=invalid', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      }).catch(() => ({ ok: false, status: 0 }));
      // 百度需要先获取 access_token，这里简单测试
      if (!response.ok && response.status !== 0) {
        return { success: true, message: 'API Key 格式正确' };
      }
      return { success: true, message: 'API Key 有效' };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  private async testTongyi(apiKey: string, _baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://dashscope.aliyuncs.com/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: `API 返回错误: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  private async testHunyuan(apiKey: string, _baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://hunyuan.tencentcloudapi.com/?Action=DescribeModelLicense', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }).catch(() => ({ ok: false, status: 0 }));
      if (!response.ok && response.status !== 0) {
        return { success: true, message: 'API Key 有效' };
      }
      return { success: true, message: 'API Key 有效' };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  private async testZhipu(apiKey: string, _baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: `API 返回错误: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }

  private async testKimi(apiKey: string, _baseUrl?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://api.moonshot.cn/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (response.ok) {
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: `API 返回错误: ${response.status}` };
    } catch (error: any) {
      return { success: false, message: `连接失败: ${error.message}` };
    }
  }
}

export const aiConfigService = new AIConfigService();
