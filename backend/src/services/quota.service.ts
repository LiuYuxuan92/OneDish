import { createHash } from 'crypto';
import { redisKeyService, QuotaType } from './redis-key.service';
import { redisService } from './redis.service';

type Tier = 'free' | 'pro' | 'enterprise';

interface DailyQuota {
  web_limit: number;
  ai_limit: number;
}

interface QuotaRecord {
  web_used: number;
  ai_used: number;
  web_limit: number;
  ai_limit: number;
  reset_at: string;
}

class QuotaService {
  private userDaily = new Map<string, QuotaRecord>();
  private globalDaily = new Map<string, { web_used: number; ai_used: number }>();

  private tierQuota: Record<Tier, DailyQuota> = {
    free: { web_limit: 50, ai_limit: 5 },
    pro: { web_limit: 500, ai_limit: 120 },
    enterprise: { web_limit: 5000, ai_limit: 1000 },
  };

  private globalLimit: DailyQuota = {
    web_limit: Number(process.env.QUOTA_GLOBAL_WEB_LIMIT || 200000),
    ai_limit: Number(process.env.QUOTA_GLOBAL_AI_LIMIT || 50000),
  };

  async getStatus(userId: string, tier: Tier = 'free') {
    const dateKey = this.currentDateKey();
    const tierConf = this.tierQuota[tier] || this.tierQuota.free;
    const resetAt = this.nextUtcMidnight();

    const redisUserWeb = `${redisKeyService.userQuota(userId, dateKey)}:web`;
    const redisUserAi = `${redisKeyService.userQuota(userId, dateKey)}:ai`;
    const redisGlobalWeb = `${redisKeyService.globalQuota(dateKey)}:web`;
    const redisGlobalAi = `${redisKeyService.globalQuota(dateKey)}:ai`;

    const values = await redisService.mget([redisUserWeb, redisUserAi, redisGlobalWeb, redisGlobalAi]);

    if (values) {
      return {
        user_id: userId,
        tier,
        daily: {
          web_used: Number(values[0] || 0),
          web_limit: tierConf.web_limit,
          ai_used: Number(values[1] || 0),
          ai_limit: tierConf.ai_limit,
        },
        global_daily: {
          web_used: Number(values[2] || 0),
          web_limit: this.globalLimit.web_limit,
          ai_used: Number(values[3] || 0),
          ai_limit: this.globalLimit.ai_limit,
        },
        reset_at: resetAt,
        redis_keys: {
          user_quota: redisKeyService.userQuota(userId, dateKey),
          global_quota: redisKeyService.globalQuota(dateKey),
        },
      };
    }

    const record = this.getOrInitUserQuota(userId, tier, dateKey);
    const global = this.getOrInitGlobalQuota(dateKey);
    return {
      user_id: userId,
      tier,
      daily: {
        web_used: record.web_used,
        web_limit: record.web_limit,
        ai_used: record.ai_used,
        ai_limit: record.ai_limit,
      },
      global_daily: {
        web_used: global.web_used,
        web_limit: this.globalLimit.web_limit,
        ai_used: global.ai_used,
        ai_limit: this.globalLimit.ai_limit,
      },
      reset_at: record.reset_at,
      redis_keys: {
        user_quota: redisKeyService.userQuota(userId, dateKey),
        global_quota: redisKeyService.globalQuota(dateKey),
      },
    };
  }

  async consume(userId: string, tier: Tier, type: QuotaType): Promise<{ allowed: boolean; reason?: 'user' | 'global'; retry_after_sec?: number }> {
    const dateKey = this.currentDateKey();
    const retryAfter = this.secondsToMidnight();

    const userKey = `${redisKeyService.userQuota(userId, dateKey)}:${type}`;
    const globalKey = `${redisKeyService.globalQuota(dateKey)}:${type}`;

    const tierConf = this.tierQuota[tier] || this.tierQuota.free;
    const userLimit = type === 'web' ? tierConf.web_limit : tierConf.ai_limit;
    const globalLimit = type === 'web' ? this.globalLimit.web_limit : this.globalLimit.ai_limit;

    if (redisService.isRedisReady() || process.env.REDIS_ENABLED !== 'false') {
      const redisResult = await redisService.evalQuotaConsume([userKey, globalKey], [userLimit, globalLimit], retryAfter);
      if (redisResult.allowed) {
        return { allowed: true };
      }
      if (redisService.isRedisReady()) {
        return { allowed: false, reason: redisResult.reason || 'global', retry_after_sec: retryAfter };
      }
    }

    const user = this.getOrInitUserQuota(userId, tier, dateKey);
    const global = this.getOrInitGlobalQuota(dateKey);

    const userUsed = type === 'web' ? user.web_used : user.ai_used;
    if (userUsed >= userLimit) {
      return { allowed: false, reason: 'user', retry_after_sec: retryAfter };
    }

    const globalUsed = type === 'web' ? global.web_used : global.ai_used;
    if (globalUsed >= globalLimit) {
      return { allowed: false, reason: 'global', retry_after_sec: retryAfter };
    }

    if (type === 'web') {
      user.web_used += 1;
      global.web_used += 1;
    } else {
      user.ai_used += 1;
      global.ai_used += 1;
    }

    this.userDaily.set(redisKeyService.userQuota(userId, dateKey), user);
    this.globalDaily.set(redisKeyService.globalQuota(dateKey), global);

    return { allowed: true };
  }

  makeSearchCacheKey(query: string, context: unknown, tier: Tier): string {
    const normalized = JSON.stringify({ query: query.trim().toLowerCase(), context, tier });
    return redisKeyService.cacheSearch(createHash('sha1').update(normalized).digest('hex'));
  }

  private getOrInitUserQuota(userId: string, tier: Tier, dateKey: string): QuotaRecord {
    const key = redisKeyService.userQuota(userId, dateKey);
    const existing = this.userDaily.get(key);
    if (existing) return existing;
    const tierConf = this.tierQuota[tier] || this.tierQuota.free;
    const record: QuotaRecord = {
      web_used: 0,
      ai_used: 0,
      web_limit: tierConf.web_limit,
      ai_limit: tierConf.ai_limit,
      reset_at: this.nextUtcMidnight(),
    };
    this.userDaily.set(key, record);
    return record;
  }

  private getOrInitGlobalQuota(dateKey: string) {
    const key = redisKeyService.globalQuota(dateKey);
    const existing = this.globalDaily.get(key);
    if (existing) return existing;
    const record = { web_used: 0, ai_used: 0 };
    this.globalDaily.set(key, record);
    return record;
  }

  private currentDateKey(): string {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }

  private nextUtcMidnight(): string {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    return next.toISOString();
  }

  private secondsToMidnight(): number {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
    return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
  }
}

export const quotaService = new QuotaService();
