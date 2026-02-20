import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { JwtPayload } from '../types';
import { jwtConfig, isProduction } from '../config/jwt';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(_req: Request, _res: Response, next: NextFunction) {
  const authHeader = _req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('未提供认证令牌', 401));
  }

  const token = authHeader.substring(7);

  try {
    // 生产环境必须设置环境变量
    const secret = isProduction ? jwtConfig.secret : (process.env.JWT_SECRET || jwtConfig.devSecret);
    const payload = jwt.verify(token, secret) as JwtPayload;
    _req.user = payload;
    next();
  } catch (error) {
    next(createError('认证令牌无效或已过期', 401));
  }
}

// 可选认证（不强制要求登录）
export function optionalAuth(_req: Request, _res: Response, next: NextFunction) {
  const authHeader = _req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 无 token 时不设置 user，让需要认证的接口自行处理
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const secret = isProduction ? jwtConfig.secret : (process.env.JWT_SECRET || jwtConfig.devSecret);
    const payload = jwt.verify(token, secret) as JwtPayload;
    _req.user = payload;
  } catch {
    // 忽略错误，继续处理请求
  }

  next();
}
