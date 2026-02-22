import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import { ErrorCodes } from '../config/error-codes';

const authLimiter = new RateLimiterMemory({ points: 10, duration: 60 });
const queryLimiter = new RateLimiterMemory({ points: 100, duration: 60 });
const writeLimiter = new RateLimiterMemory({ points: 20, duration: 60 });
const generateLimiter = new RateLimiterMemory({ points: 10, duration: 60, blockDuration: 30 });

export function rateLimiter(req: Request, _res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';

  let limiter;
  if (req.path.includes('/auth/')) {
    limiter = authLimiter;
  } else if (req.path.includes('/generate')) {
    limiter = generateLimiter;
  } else if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    limiter = queryLimiter;
  } else {
    limiter = writeLimiter;
  }

  limiter
    .consume(key)
    .then(() => next())
    .catch((rej: any) => {
      const waitTime = Math.ceil((rej?.msBeforeNext || 1000) / 1000);
      const err = createError(`请求过于频繁，请${waitTime}秒后再试`, 429, ErrorCodes.TOO_MANY_REQUESTS);
      err.retryAfterSec = waitTime;
      next(err);
    });
}
