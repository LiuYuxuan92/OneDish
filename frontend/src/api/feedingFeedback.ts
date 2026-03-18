import axios from 'axios';
import { API_BASE_URL, apiClient, resolveMediaUrls } from './client';

function getWebToken() {
  const storage = (globalThis as typeof globalThis & {
    localStorage?: { getItem(key: string): string | null };
  }).localStorage;
  return storage?.getItem('access_token') || null;
}

async function createFeedingFeedbackRaw(params: CreateFeedingFeedbackParams) {
  const token = getWebToken();
  const response = await axios.post(`${API_BASE_URL}/feeding-feedbacks`, params, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
}

function normalizeError(error: any): never {
  throw {
    message: error?.response?.data?.message || error?.message || '请求失败',
    code: error?.response?.data?.code || error?.response?.status,
    http_status: error?.response?.status,
  };
}

function normalizeResponse<T>(response: any) {
  return {
    ...response,
    meta: response?.meta || null,
  };
}



export type FeedingAcceptedLevel = 'like' | 'ok' | 'reject';

export interface FeedingFeedbackItem {
  id: string;
  user_id: string;
  recipe_id: string;
  meal_plan_id?: string | null;
  baby_age_at_that_time?: number | null;
  accepted_level: FeedingAcceptedLevel;
  allergy_flag: boolean;
  note?: string | null;
  image_urls?: string[] | null;
  created_at: string;
  updated_at: string;
  recipe_name?: string | null;
  recipe_image_url?: string[] | null;
  actor_display_name?: string | null;
  actor_avatar_url?: string | null;
}

export interface CreateFeedingFeedbackParams {
  recipe_id: string;
  meal_plan_id?: string;
  baby_age_at_that_time?: number | null;
  accepted_level: FeedingAcceptedLevel;
  allergy_flag?: boolean;
  note?: string;
  image_urls?: string[];
}

function normalizeFeedbackItem(item: FeedingFeedbackItem): FeedingFeedbackItem {
  return {
    ...item,
    image_urls: resolveMediaUrls(item.image_urls),
    recipe_image_url: resolveMediaUrls(item.recipe_image_url),
    actor_avatar_url: resolveMediaUrls(item.actor_avatar_url)[0] || null,
  };
}

export const feedingFeedbackApi = {
  create: async (params: CreateFeedingFeedbackParams) => {
    try {
      const response = await createFeedingFeedbackRaw(params);
      const item = response?.data || response;
      return normalizeResponse({
        ...response,
        data: normalizeFeedbackItem(item),
      });
    } catch (error) {
      return normalizeError(error);
    }
  },

  recent: async (params?: { limit?: number; recipe_id?: string }) => {
    const response = await apiClient.get<{ items: FeedingFeedbackItem[] }>('/feeding-feedbacks/recent', { params });
    const payload = response?.data || response;
    return {
      ...response,
      data: {
        ...payload,
        items: Array.isArray(payload?.items) ? payload.items.map(normalizeFeedbackItem) : [],
      },
    };
  },
};
