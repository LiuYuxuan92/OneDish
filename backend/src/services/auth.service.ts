import { db } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../types';
import { jwtConfig, isProduction } from '../config/jwt';

export class AuthService {
  // 根据用户名或邮箱查找用户
  async findByUsernameOrEmail(username?: string, email?: string) {
    return db('users')
      .where(function () {
        if (username) {
          this.orWhere('username', username);
        }
        if (email) {
          this.orWhere('email', email);
        }
      })
      .first();
  }

  // 根据邮箱查找用户
  async findByEmail(email: string) {
    return db('users').where('email', email).first();
  }

  // 根据ID查找用户
  async findById(userId: string) {
    return db('users').where('id', userId).first();
  }

  // 根据微信openid查找用户
  async findByWechatOpenid(openid: string) {
    return db('users').where('wechat_openid', openid).first();
  }

  // 创建用户
  async createUser(data: {
    username: string;
    email?: string;
    password: string;
    phone?: string;
  }) {
    const { username, email, password, phone } = data;

    // 生成密码哈希
    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await db('users')
      .insert({
        username,
        email,
        password_hash,
        phone,
        family_size: 2,
        preferences: {},
      })
      .returning(['id', 'username', 'email', 'phone', 'created_at']);

    return user;
  }

  // 创建微信用户
  async createWechatUser(data: {
    username: string;
    openid: string;
    avatar_url?: string;
    password: string;
  }) {
    const { username, openid, avatar_url, password } = data;

    // 生成密码哈希
    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await db('users')
      .insert({
        username,
        wechat_openid: openid,
        avatar_url,
        password_hash,
        family_size: 2,
        preferences: {},
      })
      .returning(['id', 'username', 'email', 'wechat_openid', 'avatar_url', 'created_at']);

    return user;
  }

  // 生成Token
  generateToken(user: User) {
    const secret = isProduction ? jwtConfig.secret : (process.env.JWT_SECRET || jwtConfig.devSecret);

    return jwt.sign(
      {
        user_id: user.id,
        username: user.username,
        role: (user as any).role || 'user',
      },
      secret,
      { expiresIn: jwtConfig.accessTokenExpiry as SignOptions['expiresIn'] }
    );
  }

  // 生成RefreshToken
  generateRefreshToken(user: User) {
    const secret = isProduction ? jwtConfig.refreshSecret : (process.env.JWT_REFRESH_SECRET || jwtConfig.devRefreshSecret);

    return jwt.sign(
      {
        user_id: user.id,
        username: user.username,
        role: (user as any).role || 'user',
      },
      secret,
      { expiresIn: jwtConfig.refreshTokenExpiry as SignOptions['expiresIn'] }
    );
  }
}
