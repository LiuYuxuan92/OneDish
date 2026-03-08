import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { jwtConfig, isProduction } from '../config/jwt';
import { tokenBlacklistService } from '../services/token-blacklist.service';

tokenBlacklistService.startCleanupJob();

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
            role: (user as any).role || 'user',
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
            role: (user as any).role || 'user',
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
      if (await tokenBlacklistService.isBlacklisted(refresh_token)) {
        return res.status(401).json({
          code: 401,
          message: 'token 已失效',
          data: null,
        });
      }

      // 使用正确的refresh secret验证
      const secret = isProduction ? jwtConfig.refreshSecret : (process.env.JWT_REFRESH_SECRET || jwtConfig.devRefreshSecret);
      const payload = jwt.verify(refresh_token, secret) as { user_id: string; username: string; exp?: number };

      // 刷新令牌轮换：已使用的 refresh token 立即作废，防止重放
      if (payload.exp) {
        await tokenBlacklistService.blacklistToken(refresh_token, new Date(payload.exp * 1000));
      }

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
        const decoded = jwt.decode(token) as { exp?: number } | null;
        if (decoded?.exp) {
          await tokenBlacklistService.blacklistToken(token, new Date(decoded.exp * 1000));
        }
      }

      const refreshToken = req.body?.refresh_token as string | undefined;
      if (refreshToken) {
        const decodedRefresh = jwt.decode(refreshToken) as { exp?: number } | null;
        if (decodedRefresh?.exp) {
          await tokenBlacklistService.blacklistToken(refreshToken, new Date(decodedRefresh.exp * 1000));
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

  // 微信小程序登录
  wechatLogin = async (req: Request, res: Response) => {
    try {
      const { code, userInfo } = req.body;

      if (!code) {
        return res.status(400).json({
          code: 400,
          message: 'code 不能为空',
          data: null,
        });
      }

      // 微信登录：生产环境调用微信 API 验证 code
      let openid: string;
      let session_key: string;

      if (isProduction && process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
        // 生产环境：调用微信服务器验证 code
        try {
          const wxRes = await axios.get<{
            errcode?: number;
            errmsg?: string;
            openid?: string;
            session_key?: string;
          }>('https://api.weixin.qq.com/sns/jscode2session', {
            params: {
              appid: process.env.WECHAT_APP_ID,
              secret: process.env.WECHAT_APP_SECRET,
              js_code: code,
              grant_type: 'authorization_code',
            },
          });

          if (wxRes.data.errcode) {
            logger.error('WeChat API error', { errcode: wxRes.data.errcode, errmsg: wxRes.data.errmsg });
            return res.status(400).json({
              code: 400,
              message: '微信登录验证失败',
              data: null,
            });
          }

          openid = wxRes.data.openid || '';
          session_key = wxRes.data.session_key || '';
          logger.info('WeChat code verified', { openid });
        } catch (error) {
          logger.error('WeChat API request failed', { error });
          return res.status(500).json({
            code: 500,
            message: '微信登录验证失败',
            data: null,
          });
        }
      } else {
        // 开发环境：直接用 code 作为用户标识（仅用于测试）
        openid = `wechat_${code}`;
        session_key = `session_${code}`;
        logger.info('WeChat login (dev mode)', { openid });
      }

      // 查找或创建微信用户
      let wechatUser = await this.authService.findByWechatOpenid(openid);

      if (!wechatUser) {
        // 创建新用户
        const username = userInfo?.nickName || `微信用户_${openid.slice(-6)}`;
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

        wechatUser = await this.authService.createWechatUser({
          username,
          openid,
          avatar_url: userInfo?.avatarUrl || null,
          password: randomPassword,
        });
        logger.info('Wechat user created', { userId: wechatUser.id, openid });
      }

      // 生成 Token
      const token = this.authService.generateToken(wechatUser);
      const refreshToken = this.authService.generateRefreshToken(wechatUser);

      res.json({
        code: 200,
        message: '微信登录成功',
        data: {
          user: {
            id: wechatUser.id,
            username: wechatUser.username,
            avatar_url: wechatUser.avatar_url,
            role: (wechatUser as any).role || 'user',
          },
          token,
          refresh_token: refreshToken,
        },
      });
    } catch (error) {
      logger.error('Failed to login via wechat', { error });
      res.status(500).json({
        code: 500,
        message: '微信登录失败',
        data: null,
      });
    }
  };

  // 游客登录（用于Web开发测试）
  guestLogin = async (req: Request, res: Response) => {
    try {
      const rawDeviceId = String(req.body?.device_id || req.headers['x-device-id'] || '').trim();
      const normalizedDeviceId = rawDeviceId || `anonymous_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const guestSeed = crypto.createHash('sha256').update(normalizedDeviceId).digest('hex').slice(0, 16);
      const guestUsername = `guest_${guestSeed}`;
      const guestEmail = `${guestUsername}@jianjiachu.local`;

      // 每台设备绑定独立 guest 账号，避免游客之间串号
      let guestUser = await this.authService.findByUsernameOrEmail(guestUsername, guestEmail);

      if (!guestUser) {
        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

        guestUser = await this.authService.createUser({
          username: guestUsername,
          email: guestEmail,
          password: randomPassword,
          preferences: {
            is_guest: true,
            guest_device_id: normalizedDeviceId,
          },
        });
        logger.info('Guest user created', { userId: guestUser.id, guestUsername });
      }

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
            role: (guestUser as any).role || 'user',
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
