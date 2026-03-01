import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';

export type CoreEventName =
  | 'app_opened'
  | 'session_started'
  | 'recipe_searched'
  | 'recipe_list_viewed'
  | 'recipe_detail_viewed'
  | 'shopping_list_created'
  | 'shopping_item_added'
  | 'shopping_item_checked'
  | 'api_request_failed'
  | 'smart_recommendation_requested'
  | 'smart_recommendation_viewed'
  | 'share_link_created'
  | 'share_join_success'
  | 'shared_list_item_toggled'
  | 'shared_plan_viewed'
  | 'share_invite_revoked'
  | 'share_invite_regenerated'
  | 'share_member_removed'
  | 'home_view'
  | 'recommend_swap_click'
  | 'swap_success'
  | 'shopping_list_generate_click'
  | 'cooking_start_click'
  | 'recommend_quality_scored';

export interface TrackPayload {
  [key: string]: unknown;
}

const SESSION_KEY = '@onedish_session_id';
const ANON_KEY = '@onedish_anon_id';
let memorySessionId: string | null = null;
let memoryAnonId: string | null = null;

const nowISO = () => new Date().toISOString();
const rand = () => Math.random().toString(36).slice(2, 10);

async function getAnonId() {
  if (memoryAnonId) {
    return memoryAnonId;
  }
  const cached = await AsyncStorage.getItem(ANON_KEY);
  if (cached) {
    memoryAnonId = cached;
    return cached;
  }
  const id = `anon_${Date.now()}_${rand()}`;
  memoryAnonId = id;
  await AsyncStorage.setItem(ANON_KEY, id);
  return id;
}

async function getSessionId() {
  if (memorySessionId) {
    return memorySessionId;
  }
  const cached = await AsyncStorage.getItem(SESSION_KEY);
  if (cached) {
    memorySessionId = cached;
    return cached;
  }
  const sid = `s_${Date.now()}_${rand()}`;
  memorySessionId = sid;
  await AsyncStorage.setItem(SESSION_KEY, sid);
  return sid;
}

function getPageUrl() {
  const webWindow = (globalThis as any)?.window;
  if (Platform.OS === 'web' && webWindow?.location?.pathname) {
    return webWindow.location.pathname || '/';
  }
  return 'native://app';
}

export async function trackEvent(eventName: CoreEventName, payload: TrackPayload = {}) {
  try {
    const anonymousId = await getAnonId();
    const sessionId = await getSessionId();

    const event = {
      event_name: eventName,
      event_time: nowISO(),
      anonymous_id: anonymousId,
      session_id: sessionId,
      platform: Platform.OS === 'web' ? 'web' : 'h5',
      app_version: '1.0.0',
      page_id: String(payload.page_id || 'unknown'),
      page_url: String(payload.page_url || getPageUrl()),
      ...payload,
    };

    try {
      await apiClient.post('/metrics/events', event);
    } catch (err) {
      // v1 最小实现：上报失败不阻塞业务
      if (typeof console !== 'undefined') {
        console.warn('[metrics] post /metrics/events failed', {
          event_name: eventName,
          error: err,
        });
      }
    }

    // 本地兜底日志，便于调试与导出
    if (typeof console !== 'undefined') {
      console.log('[metrics]', event);
    }
  } catch {
    // swallow
  }
}

export async function trackSessionStart(entryPage: string) {
  memorySessionId = `s_${Date.now()}_${rand()}`;
  await AsyncStorage.setItem(SESSION_KEY, memorySessionId);
  await trackEvent('session_started', {
    page_id: entryPage,
    entry_page: entryPage,
  });
}
