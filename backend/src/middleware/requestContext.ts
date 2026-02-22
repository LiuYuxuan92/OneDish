import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header('x-request-id') || `req_${randomUUID()}`;
  req.requestId = requestId;
  req.requestStartAt = Date.now();
  res.setHeader('x-request-id', requestId);
  next();
}
