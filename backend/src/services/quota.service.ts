import { createHash } from 'crypto';
import { redisKeyService, QuotaType } from './redis-key.service';

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

  getStatus(userId: string, tier: Tier = 'free') {
    const dateKey = this.currentDateKey();
    const record = this.getOrInitUserQuota(userId, tier, dateKey);
    return {
      user_id: userId,
      tier,
      daily: {
        web_used: record.web_used,
        web_limit: record.web_limit,
        ai_used: record.ai_used,
        ai_limit: record.ai_limit,
      },
      reset_at: record.reset_at,
      redis_keys: {
        user_quota: redisKeyService.userQuota(userId, dateKey),
        global_quota: redisKeyService.globalQuota(dateKey),
      },
    };
  }

  consume(userId: string, tier: Tier, type: QuotaType): { allowed: boolean; reason?: 'user' | 'global'; retry_after_sec?: number } {
    const dateKey = this.currentDateKey();
    const user = this.getOrInitUserQuota(userId, tier, dateKey);
    const global = this.getOrInitGlobalQuota(dateKey);

    const userLimit = type === 'web' ? user.web_limit : user.ai_limit;
    const userUsed = type === 'web' ? user.web_used : user.ai_used;
    if (userUsed >= userLimit) {
      return { allowed: false, reason: 'user', retry_after_sec: this.secondsToMidnight() };
    }

    const globalLimit = type === 'web' ? this.globalLimit.web_limit : this.globalLimit.ai_limit;
    const globalUsed = type === 'web' ? global.web_used : global.ai_used;
    if (globalUsed >= globalLimit) {
      return { allowed: false, reason: 'global', retry_after_sec: this.secondsToMidnight() };
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
