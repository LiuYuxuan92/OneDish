import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

// 不同类型的限流配置
const authLimiter = new RateLimiterMemory({
  points: 10, // 10次请求
  duration: 60, // 每分钟
});

const queryLimiter = new RateLimiterMemory({
  points: 100, // 100次请求
  duration: 60, // 每分钟
});

const writeLimiter = new RateLimiterMemory({
  points: 20, // 20次请求
  duration: 60, // 每分钟
});

// 生成计划的专用限流器（更宽松，因为这是用户主动操作）
const generateLimiter = new RateLimiterMemory({
  points: 10, // 每分钟最多10次生成请求
  duration: 60, // 每分钟
  blockDuration: 30, // 超出限制后阻塞30秒
});

/**
 * 通用限流中间件
 *
 * 限制规则：
 * - 认证接口: 10次/分钟
 * - 查询接口: 100次/分钟
 * - 写入接口: 20次/分钟
 * - 生成计划接口: 10次/分钟（独立计算，更宽松）
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || 'unknown';

  // 根据请求方法和路径选择限流器
  let limiter;
  if (req.path.includes('/auth/')) {
    limiter = authLimiter;
  } else if (req.path.includes('/generate')) {
    // 生成计划接口使用独立的限流器
    limiter = generateLimiter;
  } else if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    limiter = queryLimiter;
  } else {
    limiter = writeLimiter;
  }

  limiter
    .consume(key)
    .then(() => {
      next();
    })
    .catch((rej: any) => {
      // 计算需要等待的时间（秒）
      const waitTime = Math.ceil(rej.msBeforeNext / 1000);
      throw createError(
        `请求过于频繁，请${waitTime}秒后再试`,
        429
      );
    });
}
