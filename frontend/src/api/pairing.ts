import { apiClient } from './client';

// AI 宝宝版本生成结果类型
export interface AIBabyVersionResult {
  success: boolean;
  recipe_id: string;
  baby_age_months: number;
  // 配料替换
  ingredient_replacements: Array<{
    original: string;
    replacement: string;
    reason: string;
  }>;
  // 质地调整
  texture_adjustments: Array<{
    original: string;
    adjustment: string;
    reason: string;
  }>;
  // 过敏提醒
  allergy_alerts: string[];
  // 调整后的步骤
  adjusted_steps: Array<{
    step: number;
    action: string;
    time: number;
    note?: string;
  }>;
  // 营养提示
  nutrition_tips: string;
  // 总结
  summary: string;
  // 错误信息
  error?: string;
}

// API 参数
export interface GenerateAIBabyVersionParams {
  recipe_id: string;
  baby_age_months: number;
  use_ai?: boolean;
}

export const pairingApi = {
  // AI 生成宝宝版本
  generateAIBabyVersion: (
    recipe_id: string,
    baby_age_months: number,
    use_ai: boolean = true
  ) =>
    apiClient.post<AIBabyVersionResult>('/pairing/generate-ai', {
      recipe_id,
      baby_age_months,
      use_ai,
    }),
};

export default pairingApi;
