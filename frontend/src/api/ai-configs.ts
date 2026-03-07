import { apiClient } from './client';

// ============================================
// 类型定义
// ============================================

export type AIProvider = 
  | 'openai' | 'claude' | 'gemini'
  | 'minimax' | 'doubao' | 'wenxin' 
  | 'tongyi' | 'hunyuan' | 'zhipu' | 'kimi';

export interface AIConfigFormData {
  provider: AIProvider;
  display_name: string;
  api_key: string;
  base_url?: string;
  model?: string;
}

export interface AIConfigSafe {
  id: string;
  provider: AIProvider;
  display_name: string;
  model?: string;
  is_active: boolean;
  created_at: string;
  key_preview: string;
}

export interface TestConfigResult {
  success: boolean;
  message: string;
}

// ============================================
// 提供商映射
// ============================================

export const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', icon: '🔵' },
  { value: 'claude', label: 'Claude', icon: '🟣' },
  { value: 'gemini', label: 'Gemini', icon: '🔷' },
  { value: 'minimax', label: 'MiniMax', icon: '🟢' },
  { value: 'doubao', label: '豆包', icon: '🟠' },
  { value: 'wenxin', label: '文心一言', icon: '🔴' },
  { value: 'tongyi', label: '通义千问', icon: '⚪' },
  { value: 'hunyuan', label: '混元', icon: '🟣' },
  { value: 'zhipu', label: '智谱', icon: '🟡' },
  { value: 'kimi', label: 'Kimi', icon: '🩵' },
] as const;

export const getProviderInfo = (provider: string) => {
  return AI_PROVIDERS.find(p => p.value === provider) || { value: provider, label: provider, icon: '❓' };
};

// ============================================
// API 函数
// ============================================

export const aiConfigsApi = {
  // 获取用户所有 AI 配置
  getConfigs: () => {
    return apiClient.get<AIConfigSafe[]>('/ai-configs');
  },

  // 创建新配置
  createConfig: (data: AIConfigFormData) => {
    return apiClient.post<AIConfigSafe>('/ai-configs', data);
  },

  // 更新配置
  updateConfig: (id: string, data: Partial<AIConfigFormData>) => {
    return apiClient.put<AIConfigSafe>(`/ai-configs/${id}`, data);
  },

  // 删除配置
  deleteConfig: (id: string) => {
    return apiClient.delete<void>(`/ai-configs/${id}`);
  },

  // 测试配置
  testConfig: (id: string) => {
    return apiClient.post<TestConfigResult>(`/ai-configs/${id}/test`);
  },
};
