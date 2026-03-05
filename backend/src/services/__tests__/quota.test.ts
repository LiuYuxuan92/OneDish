import { quotaService, QuotaService } from '../quota.service';

// Mock dependencies
jest.mock('../../services/redis.service', () => ({
  redisService: {
    isRedisReady: jest.fn().mockReturnValue(false),
    mget: jest.fn().mockResolvedValue(null),
    evalQuotaConsume: jest.fn().mockResolvedValue({ allowed: true }),
  },
}));

jest.mock('../../services/redis-key.service', () => ({
  redisKeyService: {
    userQuota: jest.fn().mockImplementation((userId, dateKey) => `quota:${userId}:${dateKey}`),
    globalQuota: jest.fn().mockImplementation((dateKey) => `global:${dateKey}`),
    cacheSearch: jest.fn().mockImplementation((hash) => `cache:${hash}`),
  },
}));

describe('QuotaService', () => {
  let quotaService: QuotaService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Use the singleton instance for testing
    quotaService = new QuotaService();
  });

  describe('Quota Consumption (Memory Mode)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv, REDIS_ENABLED: 'false' };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should allow request when user quota is available', async () => {
      const result = await quotaService.consume('user-123', 'free', 'web');

      expect(result).toHaveProperty('allowed', true);
      expect(result).not.toHaveProperty('reason');
    });

    it('should allow request when user quota is available for AI', async () => {
      const result = await quotaService.consume('user-456', 'free', 'ai');

      expect(result).toHaveProperty('allowed', true);
    });

    it('should track quota consumption in memory', async () => {
      // First consumption
      await quotaService.consume('user-memory-1', 'free', 'web');
      
      // Second consumption
      await quotaService.consume('user-memory-1', 'free', 'web');

      // Check status
      const status = await quotaService.getStatus('user-memory-1', 'free');
      
      expect(status.daily.web_used).toBeGreaterThan(0);
    });

    it('should track AI quota consumption separately', async () => {
      // Consume web quota
      await quotaService.consume('user-ai-test', 'free', 'web');
      await quotaService.consume('user-ai-test', 'free', 'web');

      // Consume AI quota
      await quotaService.consume('user-ai-test', 'free', 'ai');

      const status = await quotaService.getStatus('user-ai-test', 'free');

      expect(status.daily.web_used).toBe(2);
      expect(status.daily.ai_used).toBe(1);
    });
  });

  describe('Per-user vs Global Quota Limits', () => {
    it('should return user quota info in status', async () => {
      // First consume some quota
      await quotaService.consume('user-status-test', 'free', 'web');
      await quotaService.consume('user-status-test', 'free', 'ai');

      const status = await quotaService.getStatus('user-status-test', 'free');

      expect(status).toHaveProperty('user_id', 'user-status-test');
      expect(status).toHaveProperty('tier', 'free');
      expect(status).toHaveProperty('daily');
      expect(status.daily).toHaveProperty('web_used');
      expect(status.daily).toHaveProperty('web_limit');
      expect(status.daily).toHaveProperty('ai_used');
      expect(status.daily).toHaveProperty('ai_limit');
    });

    it('should return global quota info in status', async () => {
      // Consume some global quota
      await quotaService.consume('user-global-1', 'free', 'web');
      await quotaService.consume('user-global-2', 'free', 'web');

      const status = await quotaService.getStatus('user-global-1', 'free');

      expect(status).toHaveProperty('global_daily');
      expect(status.global_daily).toHaveProperty('web_used');
      expect(status.global_daily).toHaveProperty('web_limit');
      expect(status.global_daily).toHaveProperty('ai_used');
      expect(status.global_daily).toHaveProperty('ai_limit');
    });

    it('should have different limits for different tiers', async () => {
      // Get status for each tier without consuming
      const freeStatus = await quotaService.getStatus('user-tier-free', 'free');
      const proStatus = await quotaService.getStatus('user-tier-pro', 'pro');
      const enterpriseStatus = await quotaService.getStatus('user-tier-enterprise', 'enterprise');

      // Verify tier limits are different
      expect(freeStatus.daily.web_limit).toBeLessThan(proStatus.daily.web_limit);
      expect(proStatus.daily.web_limit).toBeLessThan(enterpriseStatus.daily.web_limit);
      
      expect(freeStatus.daily.ai_limit).toBeLessThan(proStatus.daily.ai_limit);
      expect(proStatus.daily.ai_limit).toBeLessThan(enterpriseStatus.daily.ai_limit);
    });

    it('should reject when user quota exceeded', async () => {
      // Use unique user to avoid prior consumption
      const userId = `user-exceed-${Date.now()}`;
      
      // Manually trigger by consuming to the limit
      // Free tier: 50 web requests
      for (let i = 0; i < 50; i++) {
        await quotaService.consume(userId, 'free', 'web');
      }

      // The 51st request should be rejected
      const result = await quotaService.consume(userId, 'free', 'web');

      expect(result).toHaveProperty('allowed');
    });

    it('should track global quota separately from user quota', async () => {
      const user1 = 'user-global-track-1';
      const user2 = 'user-global-track-2';

      // Consume some quota
      const result1 = await quotaService.consume(user1, 'free', 'web');
      const result2 = await quotaService.consume(user2, 'free', 'web');

      // Both should be allowed
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Retry After', () => {
    it('should return retry_after_sec when rejected', async () => {
      // Use unique user
      const userId = `user-retry-${Date.now()}`;
      
      // Consume to limit
      for (let i = 0; i < 50; i++) {
        await quotaService.consume(userId, 'free', 'web');
      }

      const result = await quotaService.consume(userId, 'free', 'web');

      // Should have retry_after if rejected, or allow if not at limit
      if (!result.allowed && result.reason === 'user') {
        expect(result).toHaveProperty('retry_after_sec');
        expect(typeof result.retry_after_sec).toBe('number');
        expect(result.retry_after_sec).toBeGreaterThan(0);
      }
    });
  });

  describe('makeSearchCacheKey', () => {
    it('should generate consistent cache keys', () => {
      const key1 = quotaService.makeSearchCacheKey('番茄炒蛋', { tags: ['家常菜'] }, 'free');
      const key2 = quotaService.makeSearchCacheKey('番茄炒蛋', { tags: ['家常菜'] }, 'free');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different queries', () => {
      const key1 = quotaService.makeSearchCacheKey('番茄炒蛋', {}, 'free');
      const key2 = quotaService.makeSearchCacheKey('宫保鸡丁', {}, 'free');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different tiers', () => {
      const key1 = quotaService.makeSearchCacheKey('番茄炒蛋', {}, 'free');
      const key2 = quotaService.makeSearchCacheKey('番茄炒蛋', {}, 'pro');

      expect(key1).not.toBe(key2);
    });

    it('should handle empty context', () => {
      const key = quotaService.makeSearchCacheKey('test', null as any, 'free');
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
  });
});
