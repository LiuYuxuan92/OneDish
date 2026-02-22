import { Request, Response } from 'express';
import { db, generateUUID } from '../config/database';
import { logger } from '../utils/logger';
import { metricsService } from '../services/metrics.service';

const ALLOWED_EVENTS = new Set([
  'app_opened',
  'session_started',
  'recipe_searched',
  'recipe_list_viewed',
  'recipe_detail_viewed',
  'shopping_list_created',
  'shopping_item_added',
  'shopping_item_checked',
  'api_request_failed',
  'smart_recommendation_requested',
  'smart_recommendation_viewed',
]);

const ALLOWED_PLATFORMS = new Set(['web', 'h5']);

export class MetricsController {
  ingestEvent = async (req: Request, res: Response) => {
    try {
      const event = req.body || {};
      const eventName = String(event.event_name || '');

      if (!ALLOWED_EVENTS.has(eventName)) {
        return res.status(400).json({ code: 400, message: '不支持的事件名', data: null });
      }

      if (!event.anonymous_id || !event.session_id || !event.page_id || !event.page_url || !event.app_version) {
        return res.status(400).json({ code: 400, message: '缺少必要字段', data: null });
      }

      const platform = String(event.platform || '');
      if (!ALLOWED_PLATFORMS.has(platform)) {
        return res.status(400).json({ code: 400, message: '非法平台字段', data: null });
      }

      const eventTime = event.event_time ? new Date(event.event_time) : new Date();
      if (Number.isNaN(eventTime.getTime())) {
        return res.status(400).json({ code: 400, message: 'event_time 非法', data: null });
      }

      const payload = { ...event };
      delete payload.event_name;
      delete payload.event_time;
      delete payload.user_id;
      delete payload.anonymous_id;
      delete payload.session_id;
      delete payload.platform;
      delete payload.app_version;
      delete payload.page_id;
      delete payload.page_url;

      const userId = event.user_id || (req as any).user?.user_id || null;

      await db('metrics_events').insert({
        id: generateUUID(),
        event_name: eventName,
        event_time: eventTime.toISOString(),
        user_id: userId,
        anonymous_id: String(event.anonymous_id),
        session_id: String(event.session_id),
        platform,
        app_version: String(event.app_version),
        page_id: String(event.page_id),
        page_url: String(event.page_url),
        payload: JSON.stringify(payload),
      });

      metricsService.inc('onedish_product_events_total', {
        event_name: eventName,
        platform,
      });

      return res.json({ code: 200, message: 'success', data: { accepted: true } });
    } catch (error) {
      logger.error('Failed to ingest metrics event', { error });
      return res.status(500).json({ code: 500, message: '埋点上报失败', data: null });
    }
  };
}
