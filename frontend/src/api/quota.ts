import { apiClient } from './client';

export interface QuotaStatus {
  user_id?: string;
  tier: 'free' | 'pro' | 'enterprise' | 'unknown';
  daily: {
    web_used: number;
    web_limit: number;
    ai_used: number;
    ai_limit: number;
  };
  reset_at?: string;
}

const emptyQuota: QuotaStatus = {
  tier: 'unknown',
  daily: {
    web_used: 0,
    web_limit: 0,
    ai_used: 0,
    ai_limit: 0,
  },
};

export const quotaApi = {
  async getStatus(): Promise<QuotaStatus> {
    try {
      const res = await apiClient.get<QuotaStatus>('/quota/status');
      return {
        ...emptyQuota,
        ...res.data,
        daily: {
          ...emptyQuota.daily,
          ...(res.data?.daily || {}),
        },
      };
    } catch {
      return emptyQuota;
    }
  },
};
