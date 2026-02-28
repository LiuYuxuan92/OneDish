import { createClient } from 'redis';
import { logger } from '../utils/logger';
import { metricsService } from './metrics.service';

class RedisService {
  private client: ReturnType<typeof createClient> | null = null;
  private connecting: Promise<ReturnType<typeof createClient> | null> | null = null;
  private mode: 'init' | 'ready' | 'fallback' | 'disabled' = 'init';

  private get redisUrl(): string {
    return process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`;
  }

  private get redisEnabled(): boolean {
    return process.env.REDIS_ENABLED !== 'false';
  }

  private shouldInjectFault(op: string): boolean {
    const mode = (process.env.REDIS_FAULT_INJECT_MODE || '').trim();
    if (!mode || mode === 'off') return false;
    if (mode === 'all') return true;
    return mode.split(',').map((v) => v.trim()).filter(Boolean).includes(op);
  }

  private maybeInjectFault(op: string): void {
    if (!this.shouldInjectFault(op)) return;
    throw new Error(`Injected Redis fault for op=${op}`);
  }

  async getClient(): Promise<ReturnType<typeof createClient> | null> {
    if (!this.redisEnabled) {
      this.mode = 'disabled';
      return null;
    }

    if (this.client?.isOpen) {
      return this.client;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = this.connect();
    const result = await this.connecting;
    this.connecting = null;
    return result;
  }

  private async connect(): Promise<ReturnType<typeof createClient> | null> {
    try {
      this.maybeInjectFault('connect');
      const client = createClient({
        url: this.redisUrl,
        socket: {
          reconnectStrategy: () => 1000,
        },
      });

      client.on('error', (error) => {
        this.enterFallback('redis_runtime_error', error);
      });

      client.on('end', () => {
        this.enterFallback('redis_connection_closed');
      });

      await client.connect();
      this.client = client;
      this.mode = 'ready';
      logger.info('Redis connected', { redis_url: this.redisUrl });
      return client;
    } catch (error) {
      this.enterFallback('redis_connect_failed', error);
      return null;
    }
  }

  private enterFallback(reason: string, error?: unknown): void {
    if (this.mode !== 'fallback') {
      logger.warn('Redis unavailable, fallback to in-memory mode', { reason, error: error instanceof Error ? error.message : String(error || '') });
    }
    this.mode = 'fallback';
    metricsService.inc('onedish_redis_fallback_total', { reason });
  }

  async getRaw(key: string): Promise<string | null> {
    try {
      this.maybeInjectFault('get');
      const client = await this.getClient();
      if (!client) return null;
      return await client.get(key);
    } catch (error) {
      this.enterFallback('redis_get_failed', error);
      return null;
    }
  }

  async setRaw(key: string, value: string, ttlSec: number): Promise<boolean> {
    try {
      this.maybeInjectFault('set');
      const client = await this.getClient();
      if (!client) return false;
      await client.set(key, value, { EX: ttlSec });
      return true;
    } catch (error) {
      this.enterFallback('redis_set_failed', error);
      return false;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.getRaw(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.enterFallback('redis_get_failed', error);
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSec: number): Promise<boolean> {
    return this.setRaw(key, JSON.stringify(value), ttlSec);
  }

  async mget(keys: string[]): Promise<(string | null)[] | null> {
    try {
      this.maybeInjectFault('mget');
      const client = await this.getClient();
      if (!client) return null;
      return await client.mGet(keys);
    } catch (error) {
      this.enterFallback('redis_mget_failed', error);
      return null;
    }
  }

  async evalQuotaConsume(keys: [string, string], limits: [number, number], ttlSec: number): Promise<{ allowed: boolean; reason?: 'user' | 'global' }> {
    const script = `
      local user_key = KEYS[1]
      local global_key = KEYS[2]
      local user_limit = tonumber(ARGV[1])
      local global_limit = tonumber(ARGV[2])
      local ttl = tonumber(ARGV[3])

      local user_used = tonumber(redis.call('GET', user_key) or '0')
      if user_used >= user_limit then
        return {0, 'user'}
      end

      local global_used = tonumber(redis.call('GET', global_key) or '0')
      if global_used >= global_limit then
        return {0, 'global'}
      end

      local new_user = redis.call('INCR', user_key)
      if new_user == 1 then
        redis.call('EXPIRE', user_key, ttl)
      end

      local new_global = redis.call('INCR', global_key)
      if new_global == 1 then
        redis.call('EXPIRE', global_key, ttl)
      end

      return {1, ''}
    `;

    try {
      this.maybeInjectFault('eval');
      const client = await this.getClient();
      if (!client) return { allowed: false, reason: 'global' };
      const result = (await client.eval(script, {
        keys,
        arguments: [String(limits[0]), String(limits[1]), String(ttlSec)],
      })) as [number, string];

      if (Number(result[0]) === 1) return { allowed: true };
      return { allowed: false, reason: result[1] === 'user' ? 'user' : 'global' };
    } catch (error) {
      this.enterFallback('redis_eval_failed', error);
      return { allowed: false, reason: 'global' };
    }
  }

  async evalIdempotencyBegin(
    key: string,
    fingerprint: string,
    ttlSec: number
  ): Promise<{ state: 'proceed' | 'replay' | 'conflict' }> {
    const script = `
      local idem_key = KEYS[1]
      local fp = ARGV[1]
      local ttl = tonumber(ARGV[2])

      local raw = redis.call('GET', idem_key)
      if not raw then
        local pending = cjson.encode({ status = 'pending', fp = fp })
        local ok = redis.call('SET', idem_key, pending, 'EX', ttl, 'NX')
        if ok then
          return {'proceed'}
        end

        raw = redis.call('GET', idem_key)
        if not raw then
          return {'conflict'}
        end
      end

      local data = cjson.decode(raw)
      if data.fp ~= fp then
        return {'conflict'}
      end

      if data.status == 'done' then
        return {'replay'}
      end

      return {'conflict'}
    `;

    try {
      this.maybeInjectFault('eval');
      const client = await this.getClient();
      if (!client) return { state: 'conflict' };
      const result = (await client.eval(script, {
        keys: [key],
        arguments: [fingerprint, String(ttlSec)],
      })) as [string];

      const state = (result?.[0] || 'conflict') as 'proceed' | 'replay' | 'conflict';
      return { state };
    } catch (error) {
      this.enterFallback('redis_eval_failed', error);
      return { state: 'conflict' };
    }
  }

  isRedisReady(): boolean {
    return this.mode === 'ready';
  }
}

export const redisService = new RedisService();
