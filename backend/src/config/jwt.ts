/**
 * JWT 配置
 * 集中管理JWT密钥
 */

export const jwtConfig = {
  // JWT密钥 - 必须从环境变量读取
  get secret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }
    return secret;
  },

  // Refresh Token 密钥
  get refreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    if (secret.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
    }
    return secret;
  },

  // Token 过期时间
  accessTokenExpiry: '7d',
  refreshTokenExpiry: '30d',

  // 开发环境专用 - 仅用于开发测试
  devSecret: 'jianjiachu-dev-key-change-in-production',
  devRefreshSecret: 'jianjiachu-dev-refresh-key-change-in-production',
};

// 判断是否为生产环境
export const isProduction = process.env.NODE_ENV === 'production';
