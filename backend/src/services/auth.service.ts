import { db } from '../config/database';
import { cosService } from './cos.service';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Knex } from 'knex';
import { User } from '../types';
import { jwtConfig, isProduction } from '../config/jwt';

export class AuthService {
  private table(trx?: Knex.Transaction) {
    return (trx || db)('users');
  }

  // 根据用户名或邮箱查找用户
  async findByUsernameOrEmail(username?: string, email?: string, trx?: Knex.Transaction) {
    return this.table(trx)
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
  async findByEmail(email: string, trx?: Knex.Transaction) {
    return this.table(trx).where('email', email).first();
  }

  // 根据ID查找用户
  async findById(userId: string, trx?: Knex.Transaction) {
    return this.table(trx).where('id', userId).first();
  }

  // 根据微信openid查找用户
  async findByWechatOpenid(openid: string, trx?: Knex.Transaction) {
    return this.table(trx).where('wechat_openid', openid).first();
  }

  // 创建用户
  async createUser(data: {
    username: string;
    email?: string;
    password: string;
    phone?: string;
    preferences?: Record<string, any>;
  }, trx?: Knex.Transaction) {
    const { username, email, password, phone, preferences } = data;

    // 生成密码哈希
    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await this.table(trx)
      .insert({
        username,
        email,
        password_hash,
        phone,
        family_size: 2,
        preferences: preferences || {},
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
  }, trx?: Knex.Transaction) {
    const { username, openid, avatar_url, password } = data;

    // 生成密码哈希
    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await this.table(trx)
      .insert({
        username,
        wechat_openid: openid,
        avatar_url: cosService.toStoredUrl(avatar_url),
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
