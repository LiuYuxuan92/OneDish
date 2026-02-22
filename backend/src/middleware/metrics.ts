import { NextFunction, Request, Response } from 'express';
import { metricsService } from '../services/metrics.service';

export function httpMetrics(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const route = (req.baseUrl || '') + (req.route?.path || req.path || 'unknown');
    const status = String(res.statusCode);
    const method = req.method;
    const duration = Date.now() - start;

    metricsService.inc('onedish_http_requests_total', { route, method, status });
    metricsService.observe('onedish_http_request_duration_ms', { route }, duration);
  });
  next();
}
