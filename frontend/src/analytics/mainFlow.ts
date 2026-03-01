import { trackEvent } from './sdk';

export type MainFlowEventName =
  | 'home_view'
  | 'recommend_swap_click'
  | 'swap_success'
  | 'shopping_list_generate_click'
  | 'cooking_start_click'
  | 'recommend_quality_scored';

export interface MainFlowEventPayload {
  timestamp?: string;
  userId?: string | null;
  source?: string;
  screen?: string;
  recipeId?: string | null;
  [key: string]: unknown;
}

export interface MainFlowEventRecord {
  event: MainFlowEventName;
  timestamp: string;
  userId: string | null;
  source: string;
  screen: string;
  recipeId: string | null;
  extras?: Record<string, unknown>;
}

const eventBuffer: MainFlowEventRecord[] = [];

const nowISO = () => new Date().toISOString();

export function trackMainFlowEvent(event: MainFlowEventName, payload: MainFlowEventPayload = {}) {
  const timestamp = payload.timestamp || nowISO();
  const record: MainFlowEventRecord = {
    event,
    timestamp,
    userId: payload.userId ?? null,
    source: payload.source || payload.screen || 'home',
    screen: payload.screen || 'HomeScreen',
    recipeId: payload.recipeId ?? null,
  };

  const extras = Object.fromEntries(
    Object.entries(payload).filter(
      ([key]) => !['timestamp', 'userId', 'source', 'screen', 'recipeId'].includes(key),
    ),
  );

  if (Object.keys(extras).length > 0) {
    record.extras = extras;
  }

  eventBuffer.push(record);

  // 统一上报链路：主流程埋点进入 /metrics/events。
  // 失败时不阻塞主流程，降级为本地日志便于排查。
  trackEvent(event, {
    user_id: record.userId,
    page_id: record.screen,
    source: record.source,
    recipe_id: record.recipeId,
    timestamp: record.timestamp,
    ...(record.extras || {}),
  }).catch(() => {
    // trackEvent 内部已兜底，这里仅防止未处理 Promise 告警
  });

  // 本地兜底日志 + 内存缓存
  console.log('[main-flow]', record);
}

export function getMainFlowEvents() {
  return [...eventBuffer];
}

export function clearMainFlowEvents() {
  eventBuffer.length = 0;
}
