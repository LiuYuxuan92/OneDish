import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler';
import { JwtPayload } from '../types';
import { jwtConfig, isProduction } from '../config/jwt';
import { tokenBlacklistService } from '../services/token-blacklist.service';

export async function authenticate(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = _req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('未提供认证令牌', 401));
  }

  const token = authHeader.substring(7);

  try {
    if (await tokenBlacklistService.isBlacklisted(token)) {
      return next(createError('认证令牌无效或已过期', 401));
    }

    const secret = isProduction ? jwtConfig.secret : (process.env.JWT_SECRET || jwtConfig.devSecret);
    const payload = jwt.verify(token, secret) as JwtPayload;
    _req.user = payload as any;
    return next();
  } catch (_error) {
    return next(createError('认证令牌无效或已过期', 401));
  }
}

export async function optionalAuth(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = _req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    if (await tokenBlacklistService.isBlacklisted(token)) {
      return next();
    }

    const secret = isProduction ? jwtConfig.secret : (process.env.JWT_SECRET || jwtConfig.devSecret);
    const payload = jwt.verify(token, secret) as JwtPayload;
    _req.user = payload as any;
  } catch {
    // ignore invalid/expired token for optional auth
  }

  return next();
}
