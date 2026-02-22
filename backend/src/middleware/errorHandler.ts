import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorCodes, mapHttpStatusToErrorCode } from '../config/error-codes';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: number;
  retryAfterSec?: number;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  const latency = Date.now() - (req.requestStartAt || Date.now());

  logger.error('Error occurred', {
    message: err.message,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.requestId,
  });

  res.status(statusCode).json({
    code: err.code || mapHttpStatusToErrorCode(statusCode),
    message,
    error: {
      type: statusCode === 429 ? 'QUOTA_OR_RATE_LIMIT_EXCEEDED' : 'INTERNAL_ERROR',
      retry_after_sec: err.retryAfterSec,
    },
    meta: {
      request_id: req.requestId,
      route: res.locals.routeUsed || req.route?.path || req.path,
      latency_ms: latency,
    },
  });
}

export function createError(message: string, statusCode: number = 500, code?: number): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  error.code = code || (statusCode === 429 ? ErrorCodes.TOO_MANY_REQUESTS : undefined);
  return error;
}
