import { NextFunction, Request, Response } from 'express';

export function responseNormalizer(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = ((body: any) => {
    if (body && body.__raw === true) {
      return originalJson(body.payload);
    }

    const latency = Date.now() - (req.requestStartAt || Date.now());
    const meta = {
      request_id: req.requestId,
      route: res.locals.routeUsed || req.route?.path || req.path,
      latency_ms: latency,
      ...(body?.meta || {}),
    };

    if (body && typeof body === 'object' && 'code' in body && 'message' in body) {
      return originalJson({ ...body, meta: { ...meta, ...(body.meta || {}) } });
    }

    return originalJson({
      code: 200,
      message: 'success',
      data: body,
      meta,
    });
  }) as any;

  next();
}
