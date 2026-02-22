export type QuotaType = 'web' | 'ai';

export class RedisKeyService {
  private env: string;

  constructor() {
    this.env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
  }

  userQuota(userId: string, yyyymmdd: string): string {
    return `onedish:${this.env}:quota:user:${userId}:${yyyymmdd}`;
  }

  globalQuota(yyyymmdd: string): string {
    return `onedish:${this.env}:quota:global:${yyyymmdd}`;
  }

  userRateLimit(userId: string, route: string): string {
    return `onedish:${this.env}:ratelimit:user:${userId}:${route}`;
  }

  cacheSearch(hash: string): string {
    return `onedish:${this.env}:cache:search:${hash}`;
  }

  cacheRecipe(recipeId: string): string {
    return `onedish:${this.env}:cache:recipe:${recipeId}`;
  }

  cacheShopping(userId: string, listId: string): string {
    return `onedish:${this.env}:cache:shopping:${userId}:${listId}`;
  }

  idempotency(namespace: string, key: string): string {
    return `onedish:${this.env}:idempotency:${namespace}:${key}`;
  }
}

export const redisKeyService = new RedisKeyService();
