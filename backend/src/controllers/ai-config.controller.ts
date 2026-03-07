import { Request, Response } from 'express';
import { aiConfigService, CreateAIConfigDTO, UpdateAIConfigDTO, AIProvider } from '../services/ai-config.service';
import { logger } from '../utils/logger';

const VALID_PROVIDERS: AIProvider[] = [
  'openai', 'claude', 'gemini', 'minimax', 'doubao',
  'wenxin', 'tongyi', 'hunyuan', 'zhipu', 'kimi',
];

export class AIController {
  /**
   * 获取用户的所有 AI 配置
   */
  getConfigs = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const configs = await aiConfigService.getConfigsByUser(userId);

      res.json({
        code: 200,
        message: 'success',
        data: configs,
      });
    } catch (error: any) {
      logger.error('Failed to get AI configs', { error: error.message });
      res.status(500).json({
        code: 500,
        message: '获取 AI 配置失败',
        data: null,
      });
    }
  };

  /**
   * 创建 AI 配置
   */
  createConfig = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { provider, api_key, base_url, model, is_active, display_name, monthly_limit_tokens } = req.body;

      if (!provider || !api_key) {
        return res.status(400).json({
          code: 400,
          message: 'provider 和 api_key 是必填项',
          data: null,
        });
      }

      // 验证 provider
      if (!VALID_PROVIDERS.includes(provider)) {
        return res.status(400).json({
          code: 400,
          message: `无效的 provider，支持: ${VALID_PROVIDERS.join(', ')}`,
          data: null,
        });
      }

      const dto: CreateAIConfigDTO = {
        provider,
        api_key,
        base_url,
        model,
        is_active,
        display_name,
        monthly_limit_tokens,
      };

      const config = await aiConfigService.createConfig(userId, dto);

      // 返回脱敏后的配置
      const safeConfigs = await aiConfigService.getConfigsByUser(userId);
      const newConfig = safeConfigs.find(c => c.id === config.id);

      res.json({
        code: 200,
        message: '创建成功',
        data: newConfig,
      });
    } catch (error: any) {
      logger.error('Failed to create AI config', { error: error.message });
      
      if (error.message.includes('duplicate') || error.message.includes('UNIQUE')) {
        return res.status(400).json({
          code: 400,
          message: '该 provider 的配置已存在',
          data: null,
        });
      }

      res.status(500).json({
        code: 500,
        message: '创建 AI 配置失败',
        data: null,
      });
    }
  };

  /**
   * 更新 AI 配置
   */
  updateConfig = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { id } = req.params;
      const { api_key, base_url, model, is_active, display_name, monthly_limit_tokens } = req.body;

      const dto: UpdateAIConfigDTO = {
        api_key,
        base_url,
        model,
        is_active,
        display_name,
        monthly_limit_tokens,
      };

      // 移除 undefined 值
      Object.keys(dto).forEach(key => {
        if (dto[key as keyof UpdateAIConfigDTO] === undefined) {
          delete dto[key as keyof UpdateAIConfigDTO];
        }
      });

      await aiConfigService.updateConfig(id, userId, dto);

      // 返回更新后的配置
      const safeConfigs = await aiConfigService.getConfigsByUser(userId);
      const updatedConfig = safeConfigs.find(c => c.id === id);

      res.json({
        code: 200,
        message: '更新成功',
        data: updatedConfig,
      });
    } catch (error: any) {
      logger.error('Failed to update AI config', { error: error.message });
      
      if (error.message === '配置不存在') {
        return res.status(404).json({
          code: 404,
          message: '配置不存在',
          data: null,
        });
      }

      res.status(500).json({
        code: 500,
        message: '更新 AI 配置失败',
        data: null,
      });
    }
  };

  /**
   * 删除 AI 配置
   */
  deleteConfig = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { id } = req.params;

      await aiConfigService.deleteConfig(id, userId);

      res.json({
        code: 200,
        message: '删除成功',
        data: null,
      });
    } catch (error: any) {
      logger.error('Failed to delete AI config', { error: error.message });
      
      if (error.message === '配置不存在') {
        return res.status(404).json({
          code: 404,
          message: '配置不存在',
          data: null,
        });
      }

      res.status(500).json({
        code: 500,
        message: '删除 AI 配置失败',
        data: null,
      });
    }
  };

  /**
   * 测试 AI 配置
   */
  testConfig = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.user_id;
      const { id } = req.params;

      const result = await aiConfigService.testConfig(id, userId);

      res.json({
        code: result.success ? 200 : 400,
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to test AI config', { error: error.message });
      
      if (error.message === '配置不存在') {
        return res.status(404).json({
          code: 404,
          message: '配置不存在',
          data: null,
        });
      }

      res.status(500).json({
        code: 500,
        message: '测试 AI 配置失败',
        data: null,
      });
    }
  };
}

export const aiController = new AIController();
