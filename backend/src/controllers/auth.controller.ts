import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { jwtConfig, isProduction } from '../config/jwt';
import { db } from '../config/database';

// Token 黑名单（使用数据库存储）
const TOKEN_BLACKLIST_TABLE = 'token_blacklist';

// 检查 token 是否在黑名单中（数据库查询）
async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const result = await db(TOKEN_BLACKLIST_TABLE)
      .where('token', token)
      .first();
    return !!result;
  } catch {
    return false;
  }
}

// 将 token 加入黑名单
async function addTokenToBlacklist(token: string, expiresAt: Date): Promise<void> {
  try {
    await db(TOKEN_BLACKLIST_TABLE).insert({
      token,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to add token to blacklist', { error });
  }
}

// 清理过期token（定时任务）
async function cleanupExpiredTokens(): Promise<void> {
  try {
    await db(TOKEN_BLACKLIST_TABLE)
      .where('expires_at', '<', new Date().toISOString())
      .delete();
    logger.info('Expired tokens cleaned up');
  } catch (error) {
    logger.error('Failed to cleanup expired tokens', { error });
  }
}

// 每小时清理一次过期token
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // 用户注册
  register = async (req: Request, res: Response) => {
    try {
      const { username, email, password, phone } = req.body;

      // 验证输入
      if (!username || !password) {
        return res.status(400).json({
          code: 400,
          message: '用户名和密码不能为空',
          data: null,
        });
      }

      // 检查用户是否已存在
      const existingUser = await this.authService.findByUsernameOrEmail(username, email);
      if (existingUser) {
        return res.status(400).json({
          code: 400,
          message: '用户名或邮箱已存在',
          data: null,
        });
      }

      // 创建用户
      const user = await this.authService.createUser({
        username,
        email,
        password,
        phone,
      });

      // 生成Token
      const token = this.authService.generateToken(user);
      const refreshToken = this.authService.generateRefreshToken(user);

      res.json({
        code: 200,
        message: '注册成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
          refresh_token: refreshToken,
        },
      });
    } catch (error) {
      logger.error('Failed to register user', { error });
      res.status(500).json({
        code: 500,
        message: '注册失败',
        data: null,
      });
    }
  };

  // 用户登录
  login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          code: 400,
          message: '邮箱和密码不能为空',
          data: null,
        });
      }

      // 查找用户
      const user = await this.authService.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: '邮箱或密码错误',
          data: null,
        });
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          code: 401,
          message: '邮箱或密码错误',
          data: null,
        });
      }

      // 生成Token
      const token = this.authService.generateToken(user);
      const refreshToken = this.authService.generateRefreshToken(user);

      res.json({
        code: 200,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
          },
          token,
          refresh_token: refreshToken,
        },
      });
    } catch (error) {
      logger.error('Failed to login', { error });
      res.status(500).json({
        code: 500,
        message: '登录失败',
        data: null,
      });
    }
  };

  // 刷新Token
  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          code: 400,
          message: 'refresh_token 不能为空',
          data: null,
        });
      }

      // 检查 token 是否在黑名单中
      if (await isTokenBlacklisted(refresh_token)) {
        return res.status(401).json({
          code: 401,
          message: 'token 已失效',
          data: null,
        });
      }

      // 使用正确的refresh secret验证
      const secret = isProduction ? jwtConfig.refreshSecret : (process.env.JWT_REFRESH_SECRET || jwtConfig.devRefreshSecret);
      const payload = jwt.verify(refresh_token, secret) as { user_id: string; username: string };

      const user = await this.authService.findById(payload.user_id);
      if (!user) {
        return res.status(401).json({
          code: 401,
          message: '用户不存在',
          data: null,
        });
      }

      const token = this.authService.generateToken(user);
      const newRefreshToken = this.authService.generateRefreshToken(user);

      res.json({
        code: 200,
        message: 'success',
        data: {
          token,
          refresh_token: newRefreshToken,
        },
      });
    } catch (error) {
      logger.error('Failed to refresh token', { error });
      res.status(401).json({
        code: 401,
        message: 'refresh_token 无效或已过期',
        data: null,
      });
    }
  };

  // 退出登录
  logout = async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        // 计算token过期时间并加入黑名单
        const decoded = jwt.decode(token) as { exp?: number } | null;
        if (decoded?.exp) {
          const expiresAt = new Date(decoded.exp * 1000);
          await addTokenToBlacklist(token, expiresAt);
        }
      }

      res.json({
        code: 200,
        message: '退出成功',
        data: null,
      });
    } catch (error) {
      logger.error('Failed to logout', { error });
      res.status(500).json({
        code: 500,
        message: '退出失败',
        data: null,
      });
    }
  };

  // 游客登录（用于Web开发测试）
  guestLogin = async (req: Request, res: Response) => {
    try {
      // 查找或创建游客用户
      let guestUser = await this.authService.findByUsernameOrEmail('guest');

      if (!guestUser) {
        // 生成随机密码（16位，包含字母和数字）
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

        // 创建游客用户
        guestUser = await this.authService.createUser({
          username: 'guest',
          email: 'guest@jianjiachu.local',
          password: randomPassword,
        });
        logger.info('Guest user created', { userId: guestUser.id });
      }

      // 生成Token
      const token = this.authService.generateToken(guestUser);
      const refreshToken = this.authService.generateRefreshToken(guestUser);

      res.json({
        code: 200,
        message: '游客登录成功',
        data: {
          user: {
            id: guestUser.id,
            username: guestUser.username,
            email: guestUser.email,
            is_guest: true,
          },
          token,
          refresh_token: refreshToken,
        },
      });
    } catch (error) {
      logger.error('Failed to guest login', { error });
      res.status(500).json({
        code: 500,
        message: '游客登录失败',
        data: null,
      });
    }
  };
}
